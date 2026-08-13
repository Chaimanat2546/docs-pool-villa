"use client";

import type { MediaOperationView } from "@/lib/media/lifecycle-types";

export function MediaOperationBanner({ operation, onRetry, pending = false }: { operation: MediaOperationView; onRetry: () => void; pending?: boolean }) {
  const action = operation.kind === "cleanup" ? "ลองล้างรูปอีกครั้ง" : "ลองลบรูปอีกครั้ง";
  return <section role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
    <p className="font-medium">{operation.message}</p>
    <p className="mt-1">ครั้งที่พยายาม: {operation.attemptCount}</p>
    {operation.files.length > 0 && <ul className="mt-2 list-disc pl-5">{operation.files.map((file) => <li key={file}>{file}</li>)}</ul>}
    <button type="button" disabled={pending} onClick={onRetry} className="mt-3 min-h-10 rounded-full border border-destructive/40 px-4 font-medium disabled:opacity-50">{pending ? "กำลังลองอีกครั้ง" : action}</button>
  </section>;
}
