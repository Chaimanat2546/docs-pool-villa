/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PendingImage } from "./pending-images";
import { useImagePreparationQueue } from "./use-image-preparation-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function prepared(file: File, id: string): PendingImage {
  return {
    id,
    fileName: file.name,
    blob: new Blob([id], { type: "image/webp" }),
    previewUrl: `blob:${id}`,
    width: 800,
    height: 600,
    status: "ready",
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useImagePreparationQueue", () => {
  it("starts one file at a time and waits for the ready item to be taken", async () => {
    const firstFile = new File(["first"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["second"], "second.png", { type: "image/png" });
    const first = deferred<PendingImage>();
    const second = deferred<PendingImage>();
    const prepare = vi
      .fn<(file: File, signal?: AbortSignal) => Promise<PendingImage>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => useImagePreparationQueue({ prepare }));

    act(() => result.current.enqueue([firstFile, secondFile]));

    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    expect(prepare.mock.calls[0]?.[0]).toBe(firstFile);
    expect(result.current.items.map((item) => item.status)).toEqual([
      "converting",
      "pending",
    ]);

    await act(async () => first.resolve(prepared(firstFile, "first-ready")));
    await waitFor(() => expect(result.current.items[0]?.status).toBe("ready"));
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(result.current.items[0]).toMatchObject({
      fileName: "first.jpg",
      status: "ready",
    });
    expect(result.current.items[0]).not.toHaveProperty("file");
    expect(result.current.items[0]?.prepared).not.toHaveProperty("file");

    const transferred: { value: PendingImage | null } = { value: null };
    act(() => {
      transferred.value = result.current.takeReady();
    });
    expect(transferred.value?.id).toBe("first-ready");
    expect(transferred.value).not.toHaveProperty("file");
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    expect(prepare.mock.calls[1]?.[0]).toBe(secondFile);
    expect(result.current.items[0]).toMatchObject({
      file: secondFile,
      status: "converting",
      ordinal: 2,
      total: 2,
    });

    await act(async () => second.resolve(prepared(secondFile, "second-ready")));
  });

  it("keeps a failed file actionable while allowing the next file to convert", async () => {
    const broken = new File(["broken"], "broken.jpg", { type: "image/jpeg" });
    const next = new File(["next"], "next.jpg", { type: "image/jpeg" });
    const nextResult = deferred<PendingImage>();
    const prepare = vi
      .fn<(file: File, signal?: AbortSignal) => Promise<PendingImage>>()
      .mockRejectedValueOnce(new Error("อ่านรูปไม่ได้"))
      .mockImplementationOnce(() => nextResult.promise)
      .mockResolvedValueOnce(prepared(broken, "retried"));
    const { result } = renderHook(() => useImagePreparationQueue({ prepare }));

    act(() => result.current.enqueue([broken, next]));

    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    expect(result.current.items).toEqual([
      expect.objectContaining({ file: broken, status: "failed", error: "อ่านรูปไม่ได้" }),
      expect.objectContaining({ file: next, status: "converting" }),
    ]);

    const failedId = result.current.items[0]!.id;
    act(() => result.current.retry(failedId));
    expect(result.current.items[0]).toMatchObject({ status: "pending" });

    await act(async () => nextResult.resolve(prepared(next, "next-ready")));
    act(() => {
      result.current.takeReady();
    });
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(3));
    expect(prepare.mock.calls[2]?.[0]).toBe(broken);
  });

  it("aborts active work and revokes unclaimed ready previews", async () => {
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const activeFile = new File(["active"], "active.jpg", { type: "image/jpeg" });
    const readyFile = new File(["ready"], "ready.jpg", { type: "image/jpeg" });
    const active = deferred<PendingImage>();
    const unmounting = deferred<PendingImage>();
    const prepare = vi
      .fn<(file: File, signal?: AbortSignal) => Promise<PendingImage>>()
      .mockImplementationOnce(() => active.promise)
      .mockResolvedValueOnce(prepared(readyFile, "ready"))
      .mockImplementationOnce(() => unmounting.promise);
    const { result, unmount } = renderHook(() => useImagePreparationQueue({ prepare }));

    act(() => result.current.enqueue([activeFile, readyFile]));
    await waitFor(() => expect(prepare).toHaveBeenCalledOnce());
    const signal = prepare.mock.calls[0]?.[1];
    const activeId = result.current.items[0]!.id;
    act(() => result.current.remove(activeId));

    expect(signal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.items[0]?.status).toBe("ready"));
    const readyId = result.current.items[0]!.id;
    act(() => result.current.remove(readyId));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:ready");

    act(() => result.current.enqueue([activeFile]));
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(3));
    const unmountSignal = prepare.mock.calls[2]?.[1];
    unmount();
    expect(unmountSignal?.aborted).toBe(true);
  });
});
