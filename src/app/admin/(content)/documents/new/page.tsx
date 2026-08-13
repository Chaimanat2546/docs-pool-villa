import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/server";

import { DocumentForm, type SectionOption } from "../document-form";

export default async function NewDocumentPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("doc_sections").select("id, title, parent_id, sort_order").order("sort_order").order("title");
  const sections = (data ?? []).map((section) => ({ id: section.id, title: section.title, parentId: section.parent_id, sortOrder: section.sort_order })) as SectionOption[];
  return <DocumentForm document={null} sections={sections} />;
}
