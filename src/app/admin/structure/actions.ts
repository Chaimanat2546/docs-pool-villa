"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePublicDocs } from "@/lib/docs/public-cache";
import { prepareAndDeleteSection, resumeMediaOperation } from "@/lib/media/lifecycle";
import type { LifecycleResult } from "@/lib/media/lifecycle-types";
import { createClient } from "@/lib/server";

export type StructureActionResult = { error?: string; success?: true };
export type DeleteSectionResult = StructureActionResult | Extract<LifecycleResult, { pending: true }>;
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
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSectionInput(value: unknown): SectionInput | null {
  if (!isRecord(value)) return null;
  const { id, title, slug, description, parentId, sortOrder, isPublished } = value;
  if (
    (id !== undefined && (typeof id !== "string" || !uuidPattern.test(id))) ||
    typeof title !== "string" ||
    typeof slug !== "string" ||
    typeof description !== "string" ||
    (parentId !== null && (typeof parentId !== "string" || !uuidPattern.test(parentId))) ||
    typeof sortOrder !== "number" || !Number.isInteger(sortOrder) ||
    typeof isPublished !== "boolean"
  ) return null;

  return { id, title, slug, description, parentId, sortOrder, isPublished };
}

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

export async function saveSection(input: unknown): Promise<StructureActionResult> {
  await requireAdmin();
  const parsedInput = parseSectionInput(input);
  if (!parsedInput) return { error: "ข้อมูลหมวดไม่ถูกต้อง" };

  const validationError = validateSection(parsedInput);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const payload = {
    title: parsedInput.title.trim(),
    slug: parsedInput.slug,
    description: parsedInput.description.trim() || null,
    parent_id: parsedInput.parentId,
    sort_order: parsedInput.sortOrder,
    is_published: parsedInput.isPublished,
  };

  const result = parsedInput.id
    ? await supabase.from("doc_sections").update(payload).eq("id", parsedInput.id)
    : await supabase.from("doc_sections").insert(payload);

  if (result.error) return { error: userSafeError(result.error.code) };

  revalidatePath("/admin/structure");
  revalidatePublicDocs();
  return { success: true };
}

export async function deleteSection(
  sectionId: unknown,
  confirmedName: unknown,
): Promise<DeleteSectionResult> {
  await requireAdmin();
  if (typeof sectionId !== "string" || !uuidPattern.test(sectionId) || typeof confirmedName !== "string") {
    return { error: "ข้อมูลการลบหมวดไม่ถูกต้อง" };
  }
  const result = await prepareAndDeleteSection(sectionId, confirmedName);
  if (!("success" in result)) return result;

  revalidatePath("/admin/structure");
  revalidatePublicDocs();
  return { success: true };
}

export async function getDeletePreview(sectionId: unknown): Promise<DeletePreview | StructureActionResult> {
  await requireAdmin();
  if (typeof sectionId !== "string" || !uuidPattern.test(sectionId)) {
    return { error: "ข้อมูลหมวดไม่ถูกต้อง" };
  }
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

export async function retrySectionMediaOperation(operationId: unknown): Promise<LifecycleResult> {
  await requireAdmin();
  if (typeof operationId !== "string" || !uuidPattern.test(operationId)) return { error: "ข้อมูลงานลบหมวดไม่ถูกต้อง" };
  const result = await resumeMediaOperation(operationId);
  if ("success" in result) {
    revalidatePath("/admin/structure");
    revalidatePublicDocs();
  }
  return result;
}
