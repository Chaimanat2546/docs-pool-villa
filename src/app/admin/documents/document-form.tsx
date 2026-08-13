"use client";

import type { JSONContent } from "@tiptap/core";
import { Eye, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DocumentEditor } from "@/components/editor/document-editor";
import { EditorPreview } from "@/components/editor/editor-preview";
import type { PendingImage, UploadedPendingImage } from "@/components/editor/pending-images";
import { uploadPendingImage } from "@/components/editor/pending-images";
import { createMediaUploadTicket } from "@/app/admin/editor/actions";

import { cleanupUploadedMedia, deleteDocument, saveDocument } from "./actions";

export type SectionOption = { id: string; title: string; parentId: string | null; sortOrder: number };
export type DocumentRecord = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: JSONContent;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  version: number;
};

type FormState = Omit<DocumentRecord, "id" | "version" | "content">;

const emptyContent: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "เริ่มเขียนคู่มือ หรือพิมพ์ / เพื่อเปิดคำสั่ง" }] }] };

function permanentMediaUrl(objectKey: string): string {
  const base = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  if (!base) return "";
  return new URL(`/objects/${objectKey.split("/").map(encodeURIComponent).join("/")}`, base).toString();
}

function replacePendingImages(value: JSONContent, uploaded: Map<string, UploadedPendingImage>): JSONContent {
  const visit = (node: JSONContent): JSONContent => {
    const attrs = node.attrs ? { ...node.attrs } : undefined;
    if (node.type === "image" && typeof attrs?.pendingId === "string") {
      const image = uploaded.get(attrs.pendingId);
      if (image) {
        delete attrs.pendingId;
        attrs.mediaId = image.mediaId;
        attrs.src = permanentMediaUrl(image.objectKey);
      }
    }
    return { ...node, ...(attrs ? { attrs } : {}), ...(node.content ? { content: node.content.map(visit) } : {}) };
  };
  return visit(value);
}

function snapshot(form: FormState, content: JSONContent): string {
  return JSON.stringify({ form, content });
}

export function DocumentForm({ document, sections }: { document: DocumentRecord | null; sections: SectionOption[] }) {
  const router = useRouter();
  const idRef = useRef(document?.id ?? crypto.randomUUID());
  const [form, setForm] = useState<FormState>({
    sectionId: document?.sectionId ?? sections[0]?.id ?? "",
    title: document?.title ?? "",
    slug: document?.slug ?? "",
    excerpt: document?.excerpt ?? "",
    status: document?.status ?? "draft",
    sortOrder: document?.sortOrder ?? 0,
  });
  const [content, setContent] = useState<JSONContent>(document?.content ?? emptyContent);
  const [contentRevision, setContentRevision] = useState(0);
  const [version, setVersion] = useState<number | null>(document?.version ?? null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot({
    sectionId: document?.sectionId ?? sections[0]?.id ?? "", title: document?.title ?? "", slug: document?.slug ?? "",
    excerpt: document?.excerpt ?? "", status: document?.status ?? "draft", sortOrder: document?.sortOrder ?? 0,
  }, document?.content ?? emptyContent));
  const dirty = useMemo(() => snapshot(form, content) !== savedSnapshot || pendingImages.length > 0, [form, content, pendingImages.length, savedSnapshot]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const uploaded = new Map<string, UploadedPendingImage>();
    try {
      for (const image of pendingImages) {
        const result = await uploadPendingImage(idRef.current, image, () => undefined, createMediaUploadTicket);
        uploaded.set(image.id, result);
      }
      const persistedContent = replacePendingImages(content, uploaded);
      const result = await saveDocument({
        id: idRef.current, sectionId: form.sectionId, title: form.title, slug: form.slug, excerpt: form.excerpt,
        content: persistedContent, status: form.status, sortOrder: Number(form.sortOrder), expectedVersion: version,
        media: [...uploaded.values()],
      });
      if ("error" in result) {
        if (uploaded.size > 0) await cleanupUploadedMedia(idRef.current, [...uploaded.values()].map((item) => item.objectKey));
        setMessage(result.error);
        return;
      }
      setContent(persistedContent);
      setContentRevision((current) => current + 1);
      setVersion(result.version);
      setPendingImages([]);
      setSavedSnapshot(snapshot(form, persistedContent));
      setMessage("บันทึกเอกสารสำเร็จ");
      if (!document) router.replace(`/admin/documents/${result.id}`);
    } catch (error) {
      if (uploaded.size > 0) await cleanupUploadedMedia(idRef.current, [...uploaded.values()].map((item) => item.objectKey));
      setMessage(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!document || saving || !window.confirm(`ลบเอกสาร “${document.title}” ถาวรใช่หรือไม่?`)) return;
    setSaving(true);
    setMessage(null);
    const result = await deleteDocument(document.id, version);
    setSaving(false);
    if ("error" in result) { setMessage(result.error); return; }
    router.push("/admin/documents");
  }

  if (sections.length === 0) return <main className="mx-auto max-w-3xl px-4 py-8"><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">กรุณาสร้างหมวดก่อนสร้างเอกสาร</p></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">{document ? "แก้ไขเอกสาร" : "สร้างเอกสาร"}</h1><p className="mt-1 text-sm text-muted-foreground">บันทึกด้วยตนเองเท่านั้น {dirty ? "• มีการแก้ไขที่ยังไม่บันทึก" : ""}</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium"><Eye size={16} aria-hidden="true" />ดูตัวอย่าง</button><button type="button" disabled={saving} onClick={save} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Save size={16} aria-hidden="true" />{saving ? "กำลังบันทึก" : "บันทึก"}</button></div></div>
      {message && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      <div className="mb-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">ชื่อเอกสาร<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
        <label className="text-sm font-medium">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-mono" /></label>
        <label className="text-sm font-medium">หมวด<select value={form.sectionId} onChange={(event) => setForm({ ...form, sectionId: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3">{sections.map((section) => <option key={section.id} value={section.id}>{section.parentId ? "↳ " : ""}{section.title}</option>)}</select></label>
        <label className="text-sm font-medium">สถานะ<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="mt-1 h-11 w-full rounded-md border bg-background px-3"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-medium">ลำดับ<input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">คำเกริ่น<textarea value={form.excerpt ?? ""} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>
      </div>
      <DocumentEditor content={content} contentRevision={contentRevision} onChange={(nextContent, nextPending) => { setContent(nextContent); setPendingImages(nextPending); }} />
      {document && <div className="mt-6"><button type="button" disabled={saving} onClick={remove} className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />ลบเอกสารถาวร</button></div>}
      <EditorPreview content={content} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </main>
  );
}
