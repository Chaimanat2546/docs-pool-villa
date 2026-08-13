import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/server";

import { DocumentForm, type DocumentRecord, type SectionOption } from "../document-form";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: document }, { data: sectionRows }] = await Promise.all([
    supabase.from("doc_documents").select("id, section_id, title, slug, excerpt, content, status, sort_order, version").eq("id", id).maybeSingle(),
    supabase.from("doc_sections").select("id, title, parent_id, sort_order").order("sort_order").order("title"),
  ]);
  if (!document) notFound();
  const sections = (sectionRows ?? []).map((section) => ({ id: section.id, title: section.title, parentId: section.parent_id, sortOrder: section.sort_order })) as SectionOption[];
  const record: DocumentRecord = { id: document.id, sectionId: document.section_id, title: document.title, slug: document.slug, excerpt: document.excerpt, content: document.content, status: document.status, sortOrder: document.sort_order, version: Number(document.version) };
  return <DocumentForm document={record} sections={sections} />;
}
