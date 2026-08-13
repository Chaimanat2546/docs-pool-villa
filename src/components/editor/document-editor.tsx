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
  /** Changes only after the parent has committed persisted content successfully. */
  contentRevision?: number;
  onChange: (content: JSONContent, pendingImages: PendingImage[]) => void;
};

type EditorDialog = "image" | "link" | "youtube" | null;

export function DocumentEditor({ content, contentRevision, onChange }: DocumentEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const dialogInputRef = useRef<HTMLInputElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const appliedContentRevisionRef = useRef(contentRevision);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [imageDraft, setImageDraft] = useState<PendingImage | null>(null);
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
  useEffect(() => { if (dialog) dialogInputRef.current?.focus(); }, [dialog]);
  useEffect(() => {
    if (!editor || contentRevision === undefined || appliedContentRevisionRef.current === contentRevision) return;

    // Set the permanent source before revoking previews so the rendered image never
    // briefly points at a revoked blob URL. Suppressing onUpdate also avoids marking
    // a successful Save as a new unsaved edit.
    editor.commands.setContent(content, { emitUpdate: false });
    appliedContentRevisionRef.current = contentRevision;
    for (const image of pendingImagesRef.current) URL.revokeObjectURL(image.previewUrl);
    pendingImagesRef.current = [];
    setPendingImages([]);
  }, [content, contentRevision, editor]);

  async function addImage(file: File) {
    if (!editor) return;
    setMessage(null);
    try {
      const pending = await preparePendingImage(file);
      setImageDraft(pending);
      openDialog("image");
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
    openDialog("link");
  }

  function addYouTube() {
    openDialog("youtube");
  }

  function openDialog(nextDialog: Exclude<EditorDialog, null>) {
    dialogTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialogError(null);
    setDialogValue("");
    setDialog(nextDialog);
  }

  function closeDialog() {
    const trigger = dialogTriggerRef.current;
    if (dialog === "image" && imageDraft) URL.revokeObjectURL(imageDraft.previewUrl);
    setImageDraft(null);
    setDialog(null);
    setDialogError(null);
    trigger?.focus();
    dialogTriggerRef.current = null;
  }

  function submitDialog() {
    if (!editor || !dialog) return;
    const value = dialogValue.trim();
    if (!value) { setDialogError("กรุณากรอกข้อมูล"); return; }

    if (dialog === "image") {
      if (!imageDraft) { closeDialog(); return; }
      const nextImages = [...pendingImagesRef.current, imageDraft];
      pendingImagesRef.current = nextImages;
      setPendingImages(nextImages);
      editor.chain().focus().insertContent({ type: "image", attrs: { src: imageDraft.previewUrl, alt: value, pendingId: imageDraft.id } }).run();
      setImageDraft(null);
      setDialog(null);
      return;
    }

    if (dialog === "link") {
      try {
        const url = new URL(value);
        if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error();
        editor.chain().focus().setLink({ href: value }).run();
      } catch {
        setDialogError("URL ไม่ปลอดภัยหรือไม่รองรับ");
        return;
      }
    } else {
      const normalized = toYouTubeNoCookieUrl(value);
      if (!normalized) { setDialogError("รองรับเฉพาะลิงก์ youtube.com หรือ youtu.be"); return; }
      editor.chain().focus().insertContent({ type: "youtube", attrs: { src: normalized } }).run();
    }
    setDialog(null);
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
      {dialog && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="editor-dialog-title" aria-describedby="editor-dialog-description" className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg" onKeyDown={(event) => { if (event.key === "Escape") closeDialog(); }}>
          <h2 id="editor-dialog-title" className="text-lg font-semibold">{dialog === "image" ? "คำอธิบายภาพ" : dialog === "link" ? "เพิ่มลิงก์" : "เพิ่มวิดีโอ YouTube"}</h2>
          <p id="editor-dialog-description" className="mt-1 text-sm text-muted-foreground">{dialog === "image" ? "ระบุคำอธิบายภาพสำหรับผู้อ่านหน้าจอ" : dialog === "link" ? "รองรับ http, https หรือ mailto" : "รองรับ youtube.com หรือ youtu.be"}</p>
          <label className="mt-4 block text-sm font-medium" htmlFor="editor-dialog-value">{dialog === "image" ? "Alt text" : "URL"}</label>
          <input ref={dialogInputRef} id="editor-dialog-value" value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitDialog(); } }} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
          {dialogError && <p role="alert" className="mt-2 text-sm text-destructive">{dialogError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className="rounded-md border px-3 py-2 text-sm">ยกเลิก</button>
            <button type="button" onClick={submitDialog} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">ยืนยัน</button>
          </div>
        </div>
      </div>}
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
