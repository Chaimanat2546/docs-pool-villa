"use client";

import type { JSONContent } from "@tiptap/core";
import { Eye } from "lucide-react";
import { useState } from "react";

import { DocumentEditor } from "@/components/editor/document-editor";
import { EditorPreview } from "@/components/editor/editor-preview";
import type { PendingImage } from "@/components/editor/pending-images";
import { validateDocumentContent } from "@/lib/docs/content";

const initialContent: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "เริ่มเขียนคู่มือ หรือพิมพ์ / เพื่อเปิดคำสั่ง" }] }] };

export function EditorSandbox() {
  const [content, setContent] = useState<JSONContent>(initialContent);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function preview() {
    const validation = validateDocumentContent(content, "preview");
    if (!validation.ok) { setMessage(validation.error); return; }
    setMessage(null);
    setPreviewOpen(true);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">Editor Core</h1><p className="mt-1 text-sm text-muted-foreground">พื้นที่ตรวจรับ M03 — การบันทึกเอกสารจริงจะเชื่อมใน M04</p></div><button type="button" onClick={preview} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><Eye size={16} /> ดูตัวอย่าง</button></div>
      {message && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      <DocumentEditor content={content} onChange={(nextContent, nextPendingImages) => { setContent(nextContent); setPendingImages(nextPendingImages); }} />
      {pendingImages.length > 0 && <p className="mt-3 text-sm text-muted-foreground">สถานะรูปชั่วคราว: พร้อมบันทึก {pendingImages.filter((image) => image.status === "ready").length}/{pendingImages.length}</p>}
      <EditorPreview content={content} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </main>
  );
}
