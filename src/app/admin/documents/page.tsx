import Link from "next/link";
import { Plus } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";
import { createClient } from "@/lib/server";
import { MediaCleanupBanner } from "@/components/admin/media-cleanup-banner";

type DocumentListItem = { id: string; title: string; status: string; slug: string; version: number; updated_at: string; sort_order: number };

export default async function DocumentsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data, error: documentsError }, { data: cleanupRows, error: cleanupError }] = await Promise.all([
    supabase.from("doc_documents").select("id, title, status, slug, version, updated_at, sort_order").order("sort_order").order("title"),
    supabase.from("doc_media_cleanup").select("id, document_id, display_label, attempt_count, last_error").order("created_at").limit(100),
  ]);
  if (documentsError || cleanupError) throw new Error("ไม่สามารถโหลดรายการเอกสารได้");
  const documents = (data ?? []) as DocumentListItem[];
  const cleanupOperation: MediaOperationView | null = cleanupRows?.length ? { operationId: cleanupRows[0].id, kind: "cleanup", targetId: cleanupRows[0].document_id, files: cleanupRows.map((row) => row.display_label), attemptCount: Math.max(...cleanupRows.map((row) => row.attempt_count)), message: cleanupRows[0].last_error } : null;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">เอกสาร</h1><p className="mt-1 text-sm text-muted-foreground">จัดการ Draft, Published และ Archived</p></div><Link href="/admin/documents/new" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus size={16} aria-hidden="true" />สร้างเอกสาร</Link></div>{cleanupOperation && <MediaCleanupBanner initialOperation={cleanupOperation} />}<section aria-label="รายการเอกสาร" className="overflow-hidden rounded-xl border bg-card">{documents.length === 0 ? <p className="p-6 text-sm text-muted-foreground">ยังไม่มีเอกสาร</p> : <ul>{documents.map((document) => <li key={document.id} className="border-b last:border-0"><Link href={`/admin/documents/${document.id}`} className="flex min-h-14 items-center justify-between gap-4 px-4 hover:bg-muted"><span className="min-w-0"><span className="block truncate font-medium">{document.title}</span><span className="block truncate font-mono text-xs text-muted-foreground">{document.slug}</span></span><span className="rounded-full bg-muted px-2 py-1 text-xs">{document.status}</span></Link></li>)}</ul>}</section></main>;
}
