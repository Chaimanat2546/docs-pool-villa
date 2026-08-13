import { requireAdmin } from "@/lib/auth/require-admin";
import { readMediaOperation } from "@/lib/media/lifecycle";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";
import { createClient } from "@/lib/server";

import { StructureManager, type Section } from "./structure-manager";

export default async function StructurePage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data, error }, { data: operationRows, error: operationError }] = await Promise.all([
    supabase
    .from("doc_sections")
    .select("id, parent_id, title, slug, description, is_published, sort_order")
    .order("sort_order")
    .order("id"),
    supabase.from("doc_media_operations").select("id").eq("kind", "section_delete").order("created_at"),
  ]);

  if (error || operationError) throw new Error("ไม่สามารถโหลดโครงสร้างหมวดได้");
  const pendingOperations = (await Promise.all((operationRows ?? []).map((operation) => readMediaOperation(operation.id)))).filter((operation): operation is MediaOperationView => operation !== null);

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><div className="mb-7"><p className="text-sm font-medium text-muted-foreground">ผู้ดูแลระบบ</p><h1 className="mt-1 text-3xl font-semibold">จัดการโครงสร้างคู่มือ</h1><p className="mt-2 text-muted-foreground">สร้างหมวดหลัก หมวดย่อย และกำหนดลำดับสำหรับ Sidebar</p></div><StructureManager sections={(data ?? []) as Section[]} pendingOperations={pendingOperations} /></main>;
}
