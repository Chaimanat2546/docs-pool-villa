"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { validateDocumentContent } from "@/lib/docs/content";
import { revalidatePublicDocs } from "@/lib/docs/public-cache";
import { prepareAndDeleteDocument, retryMediaCleanup as runCleanupRetry, rollbackUploadedMedia as runRollback, runDocumentSave, resumeMediaOperation } from "@/lib/media/lifecycle";
import type { LifecycleResult, UploadedMediaCommand } from "@/lib/media/lifecycle-types";

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
  | { success: true; id: string; version: number; path: string }
  | Extract<LifecycleResult, { pending: true }>;

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

function toUploadedMedia(items: DocumentMediaInput[]): UploadedMediaCommand[] {
  return items.map((item) => ({ ...item, displayLabel: `${item.mediaId}.webp` }));
}

export async function rollbackUploadedMedia(documentId: unknown, items: unknown): Promise<void> {
  await requireAdmin();
  if (!isValidDocumentId(documentId) || !Array.isArray(items)) return;
  const parsed = parseMedia(items);
  if (!parsed || parsed.some((item) => !item.objectKey.startsWith(`docs/${documentId}/`))) return;
  await runRollback(documentId, toUploadedMedia(parsed));
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
  const result = await runDocumentSave({ ...input, content: content.content, status: input.status as "draft" | "published" | "archived", media: toUploadedMedia(input.media) });
  if (!("success" in result)) return result;
  revalidateAfterMediaFinalize(result);
  return { success: true, id: result.targetId, version: result.version ?? 1, path: result.path ?? "" };
}

export async function deleteDocument(documentId: unknown, expectedVersion: unknown): Promise<DocumentActionResult> {
  await requireAdmin();
  if (typeof documentId !== "string" || !uuidPattern.test(documentId) || typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion)) {
    return { error: "ข้อมูลการลบเอกสารไม่ถูกต้อง" };
  }
  const result = await prepareAndDeleteDocument(documentId, expectedVersion);
  if (!("success" in result)) return result;
  revalidateAfterMediaFinalize(result);
  return { success: true, id: documentId, version: expectedVersion, path: "" };
}

function revalidateAfterMediaFinalize(result: Extract<LifecycleResult, { success: true }>) {
  revalidatePath("/admin/documents");
  revalidatePath(`/admin/documents/${result.targetId}`);
  revalidatePath("/admin/structure");
  revalidatePath("/");
  revalidatePublicDocs();
}

export async function retryMediaOperation(operationId: unknown): Promise<LifecycleResult> {
  await requireAdmin();
  if (!isValidDocumentId(operationId)) return { error: "ข้อมูลงานลบรูปไม่ถูกต้อง" };
  const result = await resumeMediaOperation(operationId);
  if ("success" in result) revalidateAfterMediaFinalize(result);
  return result;
}

export async function retryMediaCleanup(documentId?: unknown) {
  await requireAdmin();
  if (documentId !== undefined && documentId !== null && !isValidDocumentId(documentId)) return { status: "error" as const, error: "ข้อมูลเอกสารไม่ถูกต้อง" };
  return runCleanupRetry(documentId as string | undefined);
}
