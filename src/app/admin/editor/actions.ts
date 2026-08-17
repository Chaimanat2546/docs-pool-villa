"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getDocsMediaRuntimeConfig } from "@/lib/media/runtime-config";
import { signMediaUploadTicket } from "@/lib/media/upload-ticket";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MediaUploadTicketResult =
  | { error: string }
  | { uploadUrl: string; ticket: string; mediaId: string; objectKey: string; expiresAt: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function createMediaUploadTicket(input: unknown): Promise<MediaUploadTicketResult> {
  await requireAdmin();
  if (!isRecord(input)) return { error: "ข้อมูลรูปไม่ถูกต้อง" };
  const { documentId, byteSize, width, height } = input;
  if (
    typeof documentId !== "string" || !uuidPattern.test(documentId) ||
    typeof byteSize !== "number" || !Number.isInteger(byteSize) || byteSize <= 0 || byteSize > 10 * 1024 * 1024 ||
    typeof width !== "number" || !Number.isInteger(width) || width <= 0 || width > 1920 ||
    typeof height !== "number" || !Number.isInteger(height) || height <= 0 || height > 1920
  ) {
    return { error: "ข้อมูลรูปไม่ถูกต้อง" };
  }
  const { workerUrl, secret } = await getDocsMediaRuntimeConfig();
  if (!workerUrl || !secret) return { error: "ยังไม่ได้ตั้งค่า Docs Media Worker" };

  const mediaId = crypto.randomUUID();
  const objectKey = `docs/${documentId}/${mediaId}.webp`;
  const expiresAt = Date.now() + 5 * 60 * 1_000;
  const ticket = await signMediaUploadTicket({
    documentId,
    mediaId,
    objectKey,
    contentType: "image/webp",
    byteSize,
    width,
    height,
    expiresAt,
  }, secret);
  return { uploadUrl: new URL("/uploads", workerUrl).toString(), ticket, mediaId, objectKey, expiresAt };
}
