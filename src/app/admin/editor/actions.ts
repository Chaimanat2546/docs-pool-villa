"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { signMediaUploadTicket } from "@/lib/media/upload-ticket";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MediaUploadTicketResult =
  | { error: string }
  | { uploadUrl: string; ticket: string; mediaId: string; objectKey: string; expiresAt: number };

export async function createMediaUploadTicket(input: { documentId: string; byteSize: number }): Promise<MediaUploadTicketResult> {
  await requireAdmin();
  if (!uuidPattern.test(input.documentId) || !Number.isInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > 10 * 1024 * 1024) {
    return { error: "ข้อมูลรูปไม่ถูกต้อง" };
  }
  const workerUrl = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  const secret = process.env.DOCS_MEDIA_UPLOAD_SECRET;
  if (!workerUrl || !secret) return { error: "ยังไม่ได้ตั้งค่า Docs Media Worker" };

  const mediaId = crypto.randomUUID();
  const objectKey = `docs/${input.documentId}/${mediaId}.webp`;
  const expiresAt = Date.now() + 5 * 60 * 1_000;
  const ticket = await signMediaUploadTicket({ documentId: input.documentId, mediaId, objectKey, contentType: "image/webp", byteSize: input.byteSize, expiresAt }, secret);
  return { uploadUrl: new URL("/uploads", workerUrl).toString(), ticket, mediaId, objectKey, expiresAt };
}
