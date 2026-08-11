"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/server";

export type StructureActionResult = { error?: string; success?: true };
export type DeletePreview = {
  childSectionCount: number;
  documentCount: number;
  mediaCount: number;
  documentTitles: string[];
};

type SectionInput = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  isPublished: boolean;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSection(input: SectionInput): string | null {
  if (!input.title.trim()) return "กรุณาระบุชื่อหมวด";
  if (!slugPattern.test(input.slug)) return "Slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น";
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return "ลำดับต้องเป็นจำนวนเต็มตั้งแต่ 0";
  }
  return null;
}

function userSafeError(code?: string): string {
  if (code === "23505") return "Slug หรือ Route นี้ถูกใช้งานแล้ว";
  if (code === "23514") return "ข้อมูลหมวดไม่เป็นไปตามกติกาโครงสร้างหรือ Slug";
  if (code === "23503") return "ไม่พบหมวดแม่ที่เลือก";
  return "บันทึกหมวดไม่สำเร็จ กรุณาลองอีกครั้ง";
}

export async function saveSection(input: SectionInput): Promise<StructureActionResult> {
  const validationError = validateSection(input);
  if (validationError) return { error: validationError };

  await requireAdmin();
  const supabase = await createClient();
  const payload = {
    title: input.title.trim(),
    slug: input.slug,
    description: input.description.trim() || null,
    parent_id: input.parentId,
    sort_order: input.sortOrder,
    is_published: input.isPublished,
  };

  const result = input.id
    ? await supabase.from("doc_sections").update(payload).eq("id", input.id)
    : await supabase.from("doc_sections").insert(payload);

  if (result.error) return { error: userSafeError(result.error.code) };

  revalidatePath("/admin/structure");
  return { success: true };
}

export async function deleteSection(
  sectionId: string,
  confirmedName: string,
): Promise<StructureActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: section, error: sectionError } = await supabase
    .from("doc_sections")
    .select("title")
    .eq("id", sectionId)
    .single();

  if (sectionError || !section) return { error: "ไม่พบหมวดที่ต้องการลบ" };
  if (confirmedName.trim() !== section.title) return { error: "ชื่อที่พิมพ์ไม่ตรงกับชื่อหมวด" };

  const { error } = await supabase.rpc("doc_delete_section", { p_section_id: sectionId });
  if (error) {
    if (error.code === "P0001") {
      return { error: "ยังลบหมวดนี้ไม่ได้ เพราะมีรูปที่ต้องลบจาก R2 ให้สำเร็จก่อน" };
    }
    return { error: "ลบหมวดไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }

  revalidatePath("/admin/structure");
  return { success: true };
}

export async function getDeletePreview(sectionId: string): Promise<DeletePreview | StructureActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_section_delete_preview", { p_section_id: sectionId });
  const preview = data?.[0];
  if (error || !preview) return { error: "ไม่สามารถตรวจสอบข้อมูลก่อนลบได้" };

  return {
    childSectionCount: Number(preview.child_section_count),
    documentCount: Number(preview.document_count),
    mediaCount: Number(preview.media_count),
    documentTitles: preview.document_titles ?? [],
  };
}
