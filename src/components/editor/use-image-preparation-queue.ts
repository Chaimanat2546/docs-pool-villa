"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PendingImage } from "./pending-images";

export type ImagePreparationQueueItem = {
  id: string;
  file: File;
  status: "pending" | "converting" | "ready" | "failed";
  error?: string;
  ordinal: number;
  total: number;
  prepared?: PendingImage;
};

type ImagePreparationQueueOptions = {
  prepare: (file: File, signal?: AbortSignal) => Promise<PendingImage>;
};

type ActivePreparation = {
  id: string;
  controller: AbortController;
};

export function useImagePreparationQueue({
  prepare,
}: ImagePreparationQueueOptions) {
  const [items, setItems] = useState<ImagePreparationQueueItem[]>([]);
  const itemsRef = useRef(items);
  const activeRef = useRef<ActivePreparation | null>(null);
  const mountedRef = useRef(true);

  const updateItems = useCallback(
    (
      update: (
        current: ImagePreparationQueueItem[],
      ) => ImagePreparationQueueItem[],
    ) => {
      setItems((current) => {
        const next = update(current);
        itemsRef.current = next;
        return next;
      });
    },
    [],
  );

  const enqueue = useCallback(
    (files: Iterable<File>) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      updateItems((current) => {
        const previousTotal = current.length === 0 ? 0 : current[0]!.total;
        const total = previousTotal + incoming.length;
        const existing = current.map((item) => ({ ...item, total }));
        const added = incoming.map((file, index) => ({
          id: crypto.randomUUID(),
          file,
          status: "pending" as const,
          ordinal: previousTotal + index + 1,
          total,
        }));
        return [...existing, ...added];
      });
    },
    [updateItems],
  );

  const retry = useCallback(
    (id: string) => {
      updateItems((current) =>
        current.map((item) =>
          item.id === id && item.status === "failed"
            ? { ...item, status: "pending", error: undefined }
            : item,
        ),
      );
    },
    [updateItems],
  );

  const remove = useCallback(
    (id: string) => {
      const active = activeRef.current;
      if (active?.id === id) {
        activeRef.current = null;
        active.controller.abort();
      }

      updateItems((current) => {
        const removed = current.find((item) => item.id === id);
        if (removed?.prepared) URL.revokeObjectURL(removed.prepared.previewUrl);
        return current.filter((item) => item.id !== id);
      });
    },
    [updateItems],
  );

  const takeReady = useCallback(() => {
    const ready = itemsRef.current.find((item) => item.status === "ready");
    if (!ready?.prepared) return null;

    updateItems((current) => current.filter((item) => item.id !== ready.id));
    return ready.prepared;
  }, [updateItems]);

  useEffect(() => {
    if (activeRef.current) return;
    if (items.some((item) => item.status === "ready")) return;
    const next = items.find((item) => item.status === "pending");
    if (!next) return;

    const controller = new AbortController();
    activeRef.current = { id: next.id, controller };
    updateItems((current) =>
      current.map((item) =>
        item.id === next.id ? { ...item, status: "converting" } : item,
      ),
    );

    void prepare(next.file, controller.signal).then(
      (prepared) => {
        if (!mountedRef.current || activeRef.current?.id !== next.id) {
          URL.revokeObjectURL(prepared.previewUrl);
          return;
        }

        activeRef.current = null;
        updateItems((current) => {
          if (!current.some((item) => item.id === next.id)) {
            URL.revokeObjectURL(prepared.previewUrl);
            return current;
          }
          return current.map((item) =>
            item.id === next.id
              ? { ...item, status: "ready", prepared, error: undefined }
              : item,
          );
        });
      },
      (error: unknown) => {
        if (activeRef.current?.id !== next.id) return;
        activeRef.current = null;
        if (!mountedRef.current || controller.signal.aborted) return;
        updateItems((current) =>
          current.map((item) =>
            item.id === next.id
              ? {
                  ...item,
                  status: "failed",
                  error:
                    error instanceof Error
                      ? error.message
                      : "เตรียมรูปไม่สำเร็จ",
                }
              : item,
          ),
        );
      },
    );
  }, [items, prepare, updateItems]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      activeRef.current?.controller.abort();
      activeRef.current = null;
      for (const item of itemsRef.current) {
        if (item.prepared) URL.revokeObjectURL(item.prepared.previewUrl);
      }
    },
    [],
  );

  const isPreparing = items.some(
    (item) => item.status === "pending" || item.status === "converting",
  );

  return { items, isPreparing, enqueue, retry, remove, takeReady };
}
