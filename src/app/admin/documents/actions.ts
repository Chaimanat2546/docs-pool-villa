"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { validateDocumentContent } from "@/lib/docs/content";
import { revalidatePublicDocs } from "@/lib/docs/public-cache";
import { signMediaDeleteTicket } from "@/lib/media/upload-ticket";
import { createClient } from "@/lib/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const statuses = new Set(["draft", "published", "archived"]);

type DocumentMediaInput = {
  mediaId: string;
  objectKey: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

type DocumentSaveInput = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: unknown;
  status: string;
  sortOrder: number;
  expectedVersion: number | null;
  media: DocumentMediaInput[];
};

export type DocumentActionResult =
  | { error: string }
  | { success: true; id: string; version: number; path: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMedia(value: unknown): DocumentMediaInput[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const parsed: DocumentMediaInput[] = [];
  for (const item of value) {
    if (!isRecord(item) ||
      typeof item.mediaId !== "string" || !uuidPattern.test(item.mediaId) ||
      typeof item.objectKey !== "string" || item.objectKey !== `docs/${(item.objectKey.split("/")[1] ?? "")}/${item.mediaId}.webp` ||
      typeof item.mimeType !== "string" || item.mimeType !== "image/webp" ||
      typeof item.sizeBytes !== "number" || !Number.isInteger(item.sizeBytes) || item.sizeBytes <= 0 || item.sizeBytes > 10 * 1024 * 1024 ||
      typeof item.width !== "number" || !Number.isInteger(item.width) || item.width <= 0 || item.width > 1920 ||
      typeof item.height !== "number" || !Number.isInteger(item.height) || item.height <= 0 || item.height > 1920
    ) return null;
    parsed.push({
      mediaId: item.mediaId, objectKey: item.objectKey, mimeType: item.mimeType,
      sizeBytes: item.sizeBytes, width: item.width, height: item.height,
    });
  }
  return new Set(parsed.map((item) => item.mediaId)).size === parsed.length ? parsed : null;
}

function parseDocumentInput(value: unknown): DocumentSaveInput | null {
  if (!isRecord(value)) return null;
  const media = parseMedia(value.media);
  if (
    typeof value.id !== "string" || !uuidPattern.test(value.id) ||
    typeof value.sectionId !== "string" || !uuidPattern.test(value.sectionId) ||
    typeof value.title !== "string" || typeof value.slug !== "string" || typeof value.excerpt !== "string" ||
    typeof value.status !== "string" || !statuses.has(value.status) ||
    typeof value.sortOrder !== "number" || !Number.isInteger(value.sortOrder) || value.sortOrder < 0 ||
    (value.expectedVersion !== null && (typeof value.expectedVersion !== "number" || !Number.isInteger(value.expectedVersion) || value.expectedVersion < 1)) ||
    media === null
  ) return null;
  return {
    id: value.id, sectionId: value.sectionId, title: value.title, slug: value.slug, excerpt: value.excerpt,
    content: value.content, status: value.status, sortOrder: value.sortOrder, expectedVersion: value.expectedVersion, media,
  };
}

function mediaPublicUrl(objectKey: string): string | null {
  const workerUrl = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  if (!workerUrl) return null;
  const path = objectKey.split("/").map(encodeURIComponent).join("/");
  return new URL(`/objects/${path}`, workerUrl).toString();
}

function userSafeError(code?: string): string {
  if (code === "P0001") return "เอกสารถูกแก้ไขจากที่อื่น กรุณา Reload ก่อนบันทึกอีกครั้ง";
  if (code === "P0002") return "ไม่พบเอกสารที่ต้องการ";
  if (code === "23505") return "Slug หรือ Route นี้ถูกใช้งานแล้ว";
  if (code === "23503" || code === "23514") return "ข้อมูลเอกสารไม่เป็นไปตามกติกา";
  return "บันทึกเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง";
}

async function deleteObjects(documentId: string, objectKeys: string[]): Promise<string | null> {
  if (objectKeys.length === 0) return null;
  const workerUrl = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  const secret = process.env.DOCS_MEDIA_UPLOAD_SECRET;
  if (!workerUrl || !secret) return "ยังไม่ได้ตั้งค่า Docs Media Worker";
  const ticket = await signMediaDeleteTicket({ operation: "delete", documentId, objectKeys, expiresAt: Date.now() + 5 * 60_000 }, secret);
  try {
    const response = await fetch(new URL("/objects", workerUrl), {
      method: "DELETE", headers: { "X-Docs-Media-Ticket": ticket }, cache: "no-store",
    });
    return response.ok ? null : "ลบรูปจาก R2 ไม่สำเร็จ";
  } catch {
    return "เชื่อมต่อ Docs Media Worker ไม่สำเร็จ";
  }
}

async function recordCleanup(documentId: string, objectKeys: string[], reason: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("doc_media_cleanup").upsert(
    objectKeys.map((objectKey) => ({ document_id: documentId, object_key: objectKey, reason })),
    { onConflict: "object_key", ignoreDuplicates: true },
  );
}

export async function cleanupUploadedMedia(documentId: unknown, objectKeys: unknown): Promise<void> {
  await requireAdmin();
  if (!isValidDocumentId(documentId) || !Array.isArray(objectKeys) || objectKeys.some((key) => typeof key !== "string" || !key.startsWith(`docs/${documentId}/`))) return;
  const cleanupError = await deleteObjects(documentId, objectKeys);
  if (cleanupError) await recordCleanup(documentId, objectKeys, cleanupError);
}

function isValidDocumentId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export async function saveDocument(value: unknown): Promise<DocumentActionResult> {
  await requireAdmin();
  const input = parseDocumentInput(value);
  if (!input) return { error: "ข้อมูลเอกสารไม่ถูกต้อง" };
  if (!input.title.trim()) return { error: "กรุณาระบุชื่อเอกสาร" };
  if (!slugPattern.test(input.slug)) return { error: "Slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น" };
  const content = validateDocumentContent(input.content, "persisted");
  if (!content.ok) return { error: content.error };

  if (input.media.some((item) => !item.objectKey.startsWith(`docs/${input.id}/`))) return { error: "ข้อมูลรูปไม่ถูกต้อง" };
  const mediaPayload = input.media.map((item) => {
    const publicUrl = mediaPublicUrl(item.objectKey);
    return publicUrl ? { id: item.mediaId, object_key: item.objectKey, public_url: publicUrl } : null;
  });
  if (mediaPayload.some((item) => item === null)) return { error: "ยังไม่ได้ตั้งค่า Docs Media Worker" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_save_document", {
    p_id: input.id,
    p_section_id: input.sectionId,
    p_title: input.title,
    p_slug: input.slug,
    p_excerpt: input.excerpt,
    p_content: content.content,
    p_status: input.status,
    p_sort_order: input.sortOrder,
    p_expected_version: input.expectedVersion,
    p_media: mediaPayload,
  });
  if (error || !data?.[0]) {
    const cleanupError = await deleteObjects(input.id, input.media.map((item) => item.objectKey));
    if (cleanupError) await recordCleanup(input.id, input.media.map((item) => item.objectKey), cleanupError);
    return { error: userSafeError(error?.code) };
  }

  const saved = data[0] as { document_id: string; version: number; path: string };
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${saved.document_id}`);
  if (input.status === "published") revalidatePath("/");
  revalidatePublicDocs();
  return { success: true, id: saved.document_id, version: Number(saved.version), path: saved.path };
}

export async function deleteDocument(documentId: unknown, expectedVersion: unknown): Promise<DocumentActionResult> {
  await requireAdmin();
  if (typeof documentId !== "string" || !uuidPattern.test(documentId) || typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion)) {
    return { error: "ข้อมูลการลบเอกสารไม่ถูกต้อง" };
  }
  const supabase = await createClient();
  const { data: prepared, error: prepareError } = await supabase.rpc("doc_prepare_document_delete", {
    p_document_id: documentId, p_expected_version: expectedVersion,
  });
  const manifest = prepared?.[0] as { version: number; object_keys: string[] } | undefined;
  if (prepareError || !manifest) return { error: userSafeError(prepareError?.code) };
  const mediaError = await deleteObjects(documentId, manifest.object_keys ?? []);
  if (mediaError) return { error: `${mediaError} กรุณาลองอีกครั้ง` };
  const { error: finalizeError } = await supabase.rpc("doc_finalize_document_delete", {
    p_document_id: documentId, p_expected_version: manifest.version,
  });
  if (finalizeError) return { error: userSafeError(finalizeError.code) };
  revalidatePath("/admin/documents");
  revalidatePath("/");
  revalidatePublicDocs();
  return { success: true, id: documentId, version: expectedVersion, path: "" };
}
