import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/server";

import { StructureManager, type Section } from "./structure-manager";

export default async function StructurePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doc_sections")
    .select("id, parent_id, title, slug, description, is_published, sort_order")
    .order("sort_order")
    .order("id");

  if (error) throw new Error("ไม่สามารถโหลดโครงสร้างหมวดได้");

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><div className="mb-7"><p className="text-sm font-medium text-muted-foreground">ผู้ดูแลระบบ</p><h1 className="mt-1 text-3xl font-semibold">จัดการโครงสร้างคู่มือ</h1><p className="mt-2 text-muted-foreground">สร้างหมวดหลัก หมวดย่อย และกำหนดลำดับสำหรับ Sidebar</p></div><StructureManager sections={(data ?? []) as Section[]} /></main>;
}
