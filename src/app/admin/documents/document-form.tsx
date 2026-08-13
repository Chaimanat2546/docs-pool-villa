"use client";

import type { JSONContent } from "@tiptap/core";
import { Eye, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DocumentEditor } from "@/components/editor/document-editor";
import { EditorPreview } from "@/components/editor/editor-preview";
import type { PendingImage, UploadedPendingImage } from "@/components/editor/pending-images";
import { uploadPendingImage } from "@/components/editor/pending-images";
import { HardDeleteDialog } from "@/components/admin/hard-delete-dialog";
import { MediaOperationBanner } from "@/components/admin/media-operation-banner";
import { MediaProgressList } from "@/components/admin/media-progress-list";
import { createMediaUploadTicket } from "@/app/admin/editor/actions";
import { replacePendingImages } from "@/lib/media/content-media";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";

import { deleteDocument, retryMediaOperation, rollbackUploadedMedia, saveDocument } from "./actions";

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

function snapshot(form: FormState, content: JSONContent): string {
  return JSON.stringify({ form, content });
}

export function DocumentForm({ document, sections, pendingOperation = null, hardDeleteFiles = [] }: { document: DocumentRecord | null; sections: SectionOption[]; pendingOperation?: MediaOperationView | null; hardDeleteFiles?: string[] }) {
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
  const [operation, setOperation] = useState<MediaOperationView | null>(pendingOperation);
  const [retrying, startRetry] = useTransition();
  const retriedOperationRef = useRef<string | null>(null);
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

  useEffect(() => {
    if (!operation || retriedOperationRef.current === operation.operationId) return;
    retriedOperationRef.current = operation.operationId;
    startRetry(async () => {
      const result = await retryMediaOperation(operation.operationId);
      if ("success" in result) router.refresh();
      else if ("pending" in result) setOperation(result.operation);
      else setMessage(result.error);
    });
  }, [operation, router]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const uploaded = new Map<string, UploadedPendingImage>();
    let saveSubmitted = false;
    try {
      for (const image of pendingImages) {
        setPendingImages((current) => current.map((candidate) => candidate.id === image.id ? { ...candidate, status: "uploading", progress: 0 } : candidate));
        const result = await uploadPendingImage(idRef.current, image, (progress) => setPendingImages((current) => current.map((candidate) => candidate.id === image.id ? { ...candidate, status: "uploading", progress } : candidate)), createMediaUploadTicket);
        uploaded.set(image.id, result);
      }
      const persistedContent = replacePendingImages(content, uploaded, permanentMediaUrl);
      // Once the prepared-save RPC starts, it owns any newly uploaded media:
      // failures are recorded durably for retry rather than cleaned up here.
      saveSubmitted = true;
      const result = await saveDocument({
        id: idRef.current, sectionId: form.sectionId, title: form.title, slug: form.slug, excerpt: form.excerpt,
        content: persistedContent, status: form.status, sortOrder: Number(form.sortOrder), expectedVersion: version,
        media: [...uploaded.values()],
      });
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      if ("pending" in result) { setOperation(result.operation); return; }
      setContent(persistedContent);
      setContentRevision((current) => current + 1);
      setVersion(result.version);
      setPendingImages([]);
      setSavedSnapshot(snapshot(form, persistedContent));
      setMessage("บันทึกเอกสารสำเร็จ");
      if (!document) router.replace(`/admin/documents/${result.id}`);
    } catch (error) {
      if (!saveSubmitted && uploaded.size > 0) await rollbackUploadedMedia(idRef.current, [...uploaded.values()].map((item) => ({ ...item, displayLabel: `${item.mediaId}.webp` })));
      setMessage(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!document || saving || operation) return;
    setSaving(true);
    setMessage(null);
    const result = await deleteDocument(document.id, version);
    setSaving(false);
    if ("error" in result) { setMessage(result.error); return; }
    if ("pending" in result) { setOperation(result.operation); return; }
    router.push("/admin/documents");
  }

  if (sections.length === 0) return <main className="mx-auto max-w-3xl px-4 py-8"><p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">กรุณาสร้างหมวดก่อนสร้างเอกสาร</p></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">{document ? "แก้ไขเอกสาร" : "สร้างเอกสาร"}</h1><p className="mt-1 text-sm text-muted-foreground">บันทึกด้วยตนเองเท่านั้น {dirty ? "• มีการแก้ไขที่ยังไม่บันทึก" : ""}</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium"><Eye size={16} aria-hidden="true" />ดูตัวอย่าง</button><button type="button" disabled={saving || Boolean(operation)} onClick={save} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"><Save size={16} aria-hidden="true" />{saving ? "กำลังบันทึก" : "บันทึก"}</button></div></div>
      {message && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      {operation && <MediaOperationBanner operation={operation} pending={retrying} onRetry={() => startRetry(async () => { const result = await retryMediaOperation(operation.operationId); if ("success" in result) router.refresh(); else if ("pending" in result) setOperation(result.operation); else setMessage(result.error); })} />}
      <div className="mb-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">ชื่อเอกสาร<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
        <label className="text-sm font-medium">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-mono" /></label>
        <label className="text-sm font-medium">หมวด<select value={form.sectionId} onChange={(event) => setForm({ ...form, sectionId: event.target.value })} className="mt-1 h-11 w-full rounded-md border bg-background px-3">{sections.map((section) => <option key={section.id} value={section.id}>{section.parentId ? "↳ " : ""}{section.title}</option>)}</select></label>
        <label className="text-sm font-medium">สถานะ<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })} className="mt-1 h-11 w-full rounded-md border bg-background px-3"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-medium">ลำดับ<input type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
        <label className="text-sm font-medium sm:col-span-2">คำเกริ่น<textarea value={form.excerpt ?? ""} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2" /></label>
      </div>
      <DocumentEditor content={content} contentRevision={contentRevision} onChange={(nextContent, nextPending) => { setContent(nextContent); setPendingImages(nextPending); }} />
      <MediaProgressList images={pendingImages} />
      {document && <div className="mt-6"><HardDeleteDialog title="ลบเอกสารถาวร" targetName={document.title} files={hardDeleteFiles} pending={saving} disabled={Boolean(operation)} onConfirm={remove} /></div>}
      <EditorPreview content={content} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </main>
  );
}
