import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { collectPersistedMedia } from "@/lib/media/content-media";
import { readMediaOperation } from "@/lib/media/lifecycle";
import { createClient } from "@/lib/server";

import { DocumentForm, type DocumentRecord, type SectionOption } from "../document-form";

export default async function EditDocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ section?: string | string[]; stage?: string | string[] }> }) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: document, error: documentError }, { data: sectionRows, error: sectionsError }, { data: media, error: mediaError }, { data: freeze, error: freezeError }] = await Promise.all([
    supabase.from("doc_documents").select("id, section_id, title, slug, excerpt, content, status, sort_order, version").eq("id", id).maybeSingle(),
    supabase.from("doc_sections").select("id, title, parent_id, sort_order").order("sort_order").order("title"),
    supabase.from("doc_media").select("id, object_key").eq("document_id", id).order("id"),
    supabase.from("doc_media_operation_documents").select("operation_id").eq("document_id", id).maybeSingle(),
  ]);
  if (documentError || sectionsError || mediaError || freezeError) throw new Error("ไม่สามารถโหลดเอกสารสำหรับแก้ไขได้");
  if (!document) notFound();
  const sections = (sectionRows ?? []).map((section) => ({ id: section.id, title: section.title, parentId: section.parent_id, sortOrder: section.sort_order })) as SectionOption[];
  const record: DocumentRecord = { id: document.id, sectionId: document.section_id, title: document.title, slug: document.slug, excerpt: document.excerpt, content: document.content, status: document.status, sortOrder: document.sort_order, version: Number(document.version) };
  const references = collectPersistedMedia(record.content);
  const labels = new Map(references.ok ? references.references.map((reference) => [reference.mediaId, reference.displayLabel]) : []);
  const hardDeleteFiles = (media ?? []).map((item) => labels.get(item.id) ?? item.object_key.split("/").at(-1) ?? "unknown.webp");
  const pendingOperation = freeze?.operation_id ? await readMediaOperation(freeze.operation_id) : null;
  const stage = query.stage === "review" ? "review" : "content";
  const canonical = `/admin/documents/${record.id}?section=${encodeURIComponent(record.sectionId)}&stage=${stage}`;
  if (query.section !== record.sectionId || (query.stage !== "content" && query.stage !== "review")) redirect(canonical);
  return <DocumentForm key={`${record.id}:${record.version}`} document={record} sections={sections} initialStage={stage} returnHref={`/admin/structure?section=${encodeURIComponent(record.sectionId)}`} pendingOperation={pendingOperation} hardDeleteFiles={hardDeleteFiles} />;
}
