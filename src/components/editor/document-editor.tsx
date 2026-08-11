"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Bold, Code2, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Table2, Undo2, Redo2, Video } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { docsExtensions } from "./extensions";
import { preparePendingImage, type PendingImage } from "./pending-images";
import { toYouTubeNoCookieUrl } from "@/lib/docs/content";

export type DocumentEditorProps = {
  content: JSONContent;
  onChange: (content: JSONContent, pendingImages: PendingImage[]) => void;
};

export function DocumentEditor({ content, onChange }: DocumentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const descriptionId = useId();
  const editor = useEditor({
    extensions: docsExtensions,
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "docs-editor-content", "aria-describedby": descriptionId },
      handlePaste: (_view, event) => {
        const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
        if (!image) return false;
        void addImage(image);
        return true;
      },
    },
    onUpdate: ({ editor: updatedEditor }) => reconcilePendingImages(updatedEditor.getJSON()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      bold: current.isActive("bold"), italic: current.isActive("italic"), bulletList: current.isActive("bulletList"), orderedList: current.isActive("orderedList"), codeBlock: current.isActive("codeBlock"),
    } : null,
  });
  const toolbarState = state ?? { bold: false, italic: false, bulletList: false, orderedList: false, codeBlock: false };

  useEffect(() => { pendingImagesRef.current = pendingImages; }, [pendingImages]);
  useEffect(() => () => pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), []);

  async function addImage(file: File) {
    if (!editor) return;
    setMessage(null);
    try {
      const pending = await preparePendingImage(file);
      const alt = window.prompt("คำอธิบายภาพสำหรับผู้อ่านหน้าจอ");
      if (!alt?.trim()) { URL.revokeObjectURL(pending.previewUrl); setMessage("กรุณาระบุคำอธิบายภาพ"); return; }
      const nextImages = [...pendingImagesRef.current, pending];
      pendingImagesRef.current = nextImages;
      setPendingImages(nextImages);
      editor.chain().focus().insertContent({ type: "image", attrs: { src: pending.previewUrl, alt: alt.trim(), pendingId: pending.id } }).run();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เตรียมรูปไม่สำเร็จ");
    }
  }

  function reconcilePendingImages(nextContent: JSONContent) {
    const pendingIds = new Set<string>();
    collectPendingImageIds(nextContent, pendingIds);
    const images = pendingImagesRef.current;
    const next = images.filter((image) => pendingIds.has(image.id));
    for (const removed of images) {
      if (!pendingIds.has(removed.id)) URL.revokeObjectURL(removed.previewUrl);
    }
    pendingImagesRef.current = next;
    if (next.length !== images.length) setPendingImages(next);
    onChange(nextContent, next);
  }

  function addLink() {
    if (!editor) return;
    const href = window.prompt("URL (http, https หรือ mailto)");
    if (!href) return;
    try {
      const url = new URL(href);
      if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error();
      editor.chain().focus().setLink({ href }).run();
    } catch {
      setMessage("URL ไม่ปลอดภัยหรือไม่รองรับ");
    }
  }

  function addYouTube() {
    if (!editor) return;
    const source = window.prompt("YouTube URL");
    if (!source) return;
    const normalized = toYouTubeNoCookieUrl(source);
    if (!normalized) { setMessage("รองรับเฉพาะลิงก์ youtube.com หรือ youtu.be"); return; }
    editor.chain().focus().insertContent({ type: "youtube", attrs: { src: normalized } }).run();
  }

  if (!editor) return null;
  return (
    <section aria-label="ตัวแก้ไขเนื้อหา" className="rounded-xl border bg-card">
      <p id={descriptionId} className="sr-only">ใช้ Toolbar หรือพิมพ์เครื่องหมายทับเพื่อเพิ่มเนื้อหา</p>
      <div className="flex flex-wrap gap-1 border-b p-2" role="toolbar" aria-label="เครื่องมือจัดรูปแบบ">
        <ToolbarButton label="ตัวหนา" active={toolbarState.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
        <ToolbarButton label="ตัวเอียง" active={toolbarState.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
        <ToolbarButton label="รายการหัวข้อ" active={toolbarState.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
        <ToolbarButton label="รายการตัวเลข" active={toolbarState.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
        <ToolbarButton label="ลิงก์" onClick={addLink}><Link2 size={16} /></ToolbarButton>
        <ToolbarButton label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
        <ToolbarButton label="Code block" active={toolbarState.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /></ToolbarButton>
        <ToolbarButton label="ตาราง" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} /></ToolbarButton>
        <ToolbarButton label="YouTube" onClick={addYouTube}><Video size={16} /></ToolbarButton>
        <ToolbarButton label="เพิ่มรูป" onClick={() => fileInputRef.current?.click()}><ImagePlus size={16} /></ToolbarButton>
        <ToolbarButton label="ย้อนกลับ" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton label="ทำซ้ำ" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addImage(file); event.currentTarget.value = ""; }} />
      {message && <p role="alert" className="m-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      <EditorContent editor={editor} />
      {pendingImages.length > 0 && <p className="border-t px-4 py-3 text-sm text-muted-foreground">รูป {pendingImages.length} รูปเก็บชั่วคราวในเบราว์เซอร์ และจะยังไม่อัปโหลดจนกดบันทึก</p>}
    </section>
  );
}

export function ToolbarButton({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted aria-pressed:bg-muted">{children}</button>;
}

function collectPendingImageIds(content: JSONContent, ids: Set<string>) {
  if (content.type === "image" && typeof content.attrs?.pendingId === "string") ids.add(content.attrs.pendingId);
  for (const child of content.content ?? []) collectPendingImageIds(child, ids);
}
