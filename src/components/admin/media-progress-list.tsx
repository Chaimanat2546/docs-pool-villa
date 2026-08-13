"use client";

import type { PendingImage } from "@/components/editor/pending-images";

export function MediaProgressList({ images }: { images: PendingImage[] }) {
  if (images.length === 0) return null;
  return <ul aria-label="สถานะการอัปโหลดรูป" className="my-4 space-y-2 rounded-xl border p-3 text-sm">
    {images.map((image) => <li key={image.id} className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 truncate">{image.file.name}</span>{image.status === "error" ? <span role="alert" className="text-destructive">{image.error ?? "อัปโหลดรูปไม่สำเร็จ"}</span> : <span role="status">{image.status === "uploading" ? `กำลังอัปโหลด ${image.progress ?? 0}%` : "พร้อมอัปโหลด"}</span>}</li>)}
  </ul>;
}
