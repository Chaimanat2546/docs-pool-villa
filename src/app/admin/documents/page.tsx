import Link from "next/link";
import { Plus } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/server";

type DocumentListItem = { id: string; title: string; status: string; slug: string; version: number; updated_at: string; sort_order: number };

export default async function DocumentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("doc_documents").select("id, title, status, slug, version, updated_at, sort_order").order("sort_order").order("title");
  const documents = (data ?? []) as DocumentListItem[];
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">เอกสาร</h1><p className="mt-1 text-sm text-muted-foreground">จัดการ Draft, Published และ Archived</p></div><Link href="/admin/documents/new" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} aria-hidden="true" />สร้างเอกสาร</Link></div><section aria-label="รายการเอกสาร" className="overflow-hidden rounded-xl border bg-card">{documents.length === 0 ? <p className="p-6 text-sm text-muted-foreground">ยังไม่มีเอกสาร</p> : <ul>{documents.map((document) => <li key={document.id} className="border-b last:border-0"><Link href={`/admin/documents/${document.id}`} className="flex min-h-14 items-center justify-between gap-4 px-4 hover:bg-muted"><span className="min-w-0"><span className="block truncate font-medium">{document.title}</span><span className="block truncate font-mono text-xs text-muted-foreground">{document.slug}</span></span><span className="rounded-full bg-muted px-2 py-1 text-xs">{document.status}</span></Link></li>)}</ul>}</section></main>;
}
