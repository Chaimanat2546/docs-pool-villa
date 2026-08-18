"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PendingImage } from "./pending-images";

export type ImagePreparationQueueItem = {
  id: string;
  file?: File;
  fileName: string;
  status: "pending" | "converting" | "ready" | "failed";
  error?: string;
  ordinal: number;
  total: number;
  prepared?: PendingImage;
};

type ImagePreparationQueueOptions = {
  prepare: (file: File, signal?: AbortSignal) => Promise<PendingImage>;
  onBatchChange?: (event: ImagePreparationBatchEvent) => void;
};

export type ImagePreparationBatchEvent =
  | { status: "started"; total: number }
  | {
      status: "completed";
      total: number;
      succeeded: number;
      failed: number;
    };

type ActivePreparation = {
  id: string;
  controller: AbortController;
};

type ImagePreparationBatch = {
  itemIds: Set<string>;
  succeeded: Set<string>;
  failed: Set<string>;
};

export function useImagePreparationQueue({
  prepare,
  onBatchChange,
}: ImagePreparationQueueOptions) {
  const [items, setItems] = useState<ImagePreparationQueueItem[]>([]);
  const itemsRef = useRef(items);
  const activeRef = useRef<ActivePreparation | null>(null);
  const mountedRef = useRef(true);
  const batchRef = useRef<ImagePreparationBatch | null>(null);
  const onBatchChangeRef = useRef(onBatchChange);

  useEffect(() => {
    onBatchChangeRef.current = onBatchChange;
  }, [onBatchChange]);

  const beginBatch = useCallback((itemIds: string[]) => {
    let batch = batchRef.current;
    if (!batch) {
      batch = {
        itemIds: new Set(),
        succeeded: new Set(),
        failed: new Set(),
      };
      batchRef.current = batch;
    }
    for (const id of itemIds) batch.itemIds.add(id);
    onBatchChangeRef.current?.({
      status: "started",
      total: batch.itemIds.size,
    });
  }, []);

  const settleBatchItem = useCallback(
    (id: string, outcome: "succeeded" | "failed") => {
      const batch = batchRef.current;
      if (!batch?.itemIds.has(id)) return;
      batch.succeeded.delete(id);
      batch.failed.delete(id);
      batch[outcome].add(id);
      if (batch.succeeded.size + batch.failed.size !== batch.itemIds.size)
        return;

      onBatchChangeRef.current?.({
        status: "completed",
        total: batch.itemIds.size,
        succeeded: batch.succeeded.size,
        failed: batch.failed.size,
      });
      batchRef.current = null;
    },
    [],
  );

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
      const added = incoming.map((file) => ({
        id: crypto.randomUUID(),
        file,
      }));
      beginBatch(added.map((item) => item.id));

      updateItems((current) => {
        const previousTotal = current.length === 0 ? 0 : current[0]!.total;
        const total = previousTotal + incoming.length;
        const existing = current.map((item) => ({ ...item, total }));
        const queued = added.map(({ id, file }, index) => ({
          id,
          file,
          fileName: file.name,
          status: "pending" as const,
          ordinal: previousTotal + index + 1,
          total,
        }));
        return [...existing, ...queued];
      });
    },
    [beginBatch, updateItems],
  );

  const retry = useCallback(
    (id: string) => {
      const failed = itemsRef.current.find(
        (item) => item.id === id && item.status === "failed",
      );
      if (!failed) return;
      const activeBatch = batchRef.current;
      if (activeBatch?.itemIds.has(id)) {
        activeBatch.failed.delete(id);
        activeBatch.succeeded.delete(id);
      } else {
        beginBatch([id]);
      }
      updateItems((current) =>
        current.map((item) =>
          item.id === id && item.status === "failed"
            ? { ...item, status: "pending", error: undefined }
            : item,
        ),
      );
    },
    [beginBatch, updateItems],
  );

  const remove = useCallback(
    (id: string) => {
      const active = activeRef.current;
      if (active?.id === id) {
        activeRef.current = null;
        active.controller.abort();
        settleBatchItem(id, "failed");
      }

      updateItems((current) => {
        const removed = current.find((item) => item.id === id);
        if (removed?.prepared) URL.revokeObjectURL(removed.prepared.previewUrl);
        return current.filter((item) => item.id !== id);
      });
    },
    [settleBatchItem, updateItems],
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
    const sourceFile = next.file;
    if (!sourceFile) return;

    const controller = new AbortController();
    activeRef.current = { id: next.id, controller };
    updateItems((current) =>
      current.map((item) =>
        item.id === next.id ? { ...item, status: "converting" } : item,
      ),
    );

    void prepare(sourceFile, controller.signal).then(
      (prepared) => {
        if (!mountedRef.current || activeRef.current?.id !== next.id) {
          URL.revokeObjectURL(prepared.previewUrl);
          return;
        }

        activeRef.current = null;
        settleBatchItem(next.id, "succeeded");
        updateItems((current) => {
          if (!current.some((item) => item.id === next.id)) {
            URL.revokeObjectURL(prepared.previewUrl);
            return current;
          }
          const retained: PendingImage = {
            id: prepared.id,
            fileName: prepared.fileName,
            blob: prepared.blob,
            previewUrl: prepared.previewUrl,
            width: prepared.width,
            height: prepared.height,
            status: prepared.status,
            progress: prepared.progress,
            error: prepared.error,
          };
          return current.map((item) => {
            if (item.id !== next.id) return item;
            const released = { ...item };
            delete released.file;
            return {
              ...released,
              status: "ready",
              prepared: retained,
              error: undefined,
            };
          });
        });
      },
      (error: unknown) => {
        if (activeRef.current?.id !== next.id) return;
        activeRef.current = null;
        if (!mountedRef.current || controller.signal.aborted) return;
        settleBatchItem(next.id, "failed");
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
  }, [items, prepare, settleBatchItem, updateItems]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeRef.current?.controller.abort();
      activeRef.current = null;
      for (const item of itemsRef.current) {
        if (item.prepared) URL.revokeObjectURL(item.prepared.previewUrl);
      }
    };
  }, []);

  const isPreparing = items.some(
    (item) => item.status === "pending" || item.status === "converting",
  );

  return { items, isPreparing, enqueue, retry, remove, takeReady };
}
