import "server-only";

import { groupDeleteBatches, type MediaDeleteItem } from "@/lib/media/content-media";
import { signMediaDeleteTicket } from "@/lib/media/upload-ticket";
import { createClient } from "@/lib/server";

import type { CleanupRetryResult, DocumentSaveCommand, LifecycleResult, MediaOperationKind, MediaOperationView, UploadedMediaCommand } from "./lifecycle-types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const operationKinds = new Set<MediaOperationKind>(["save_remove", "document_delete", "section_delete"]);
const finalizeRpc: Record<MediaOperationKind, string> = {
  save_remove: "doc_finalize_document_save",
  document_delete: "doc_finalize_document_delete",
  section_delete: "doc_finalize_section_delete",
};

type OperationRow = {
  operation_id: string;
  kind: string;
  target_id: string;
  attempt_count: number;
  last_error: string | null;
  items: unknown;
};

function parseItems(value: unknown): MediaDeleteItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: MediaDeleteItem[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    if (typeof item.documentId !== "string" || !uuidPattern.test(item.documentId) || typeof item.objectKey !== "string" || typeof item.displayLabel !== "string" || !item.displayLabel.trim()) return null;
    if (!new RegExp(`^docs/${item.documentId}/[0-9a-f-]{36}\\.webp$`, "i").test(item.objectKey)) return null;
    items.push({ documentId: item.documentId, objectKey: item.objectKey, displayLabel: item.displayLabel.trim() });
  }
  return items;
}

function toView(row: OperationRow, items: MediaDeleteItem[]): MediaOperationView | null {
  if (!operationKinds.has(row.kind as MediaOperationKind) || !uuidPattern.test(row.operation_id) || !uuidPattern.test(row.target_id)) return null;
  return { operationId: row.operation_id, kind: row.kind as MediaOperationKind, targetId: row.target_id, files: items.map((item) => item.displayLabel), attemptCount: Number(row.attempt_count) || 0, message: row.last_error ?? "กำลังรอลบรูปจาก R2" };
}

async function loadOperation(operationId: string): Promise<{ row: OperationRow; items: MediaDeleteItem[] } | null> {
  if (!uuidPattern.test(operationId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_get_media_operation", { p_operation_id: operationId });
  if (error || !Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== "object") return null;
  const row = data[0] as OperationRow;
  const items = parseItems(row.items);
  return items ? { row, items } : null;
}

async function deleteWorkerBatch(input: { operationId: string; operationType: MediaOperationKind | "cleanup"; documentId: string; objectKeys: string[]; displayLabels: string[] }): Promise<{ message: string; files: string[] } | null> {
  const workerUrl = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  const secret = process.env.DOCS_MEDIA_UPLOAD_SECRET;
  if (!workerUrl || !secret) return { message: "ยังไม่ได้ตั้งค่า Docs Media Worker", files: input.displayLabels };
  const ticket = await signMediaDeleteTicket({ operation: "delete", operationId: input.operationId, operationType: input.operationType, documentId: input.documentId, objectKeys: input.objectKeys, expiresAt: Date.now() + 5 * 60_000 }, secret);
  try {
    const response = await fetch(new URL("/objects", workerUrl), { method: "DELETE", headers: { "X-Docs-Media-Ticket": ticket }, cache: "no-store" });
    if (response.ok) return null;
    return { message: "ลบรูปจาก R2 ไม่สำเร็จ", files: input.displayLabels };
  } catch {
    return { message: "เชื่อมต่อ Docs Media Worker ไม่สำเร็จ", files: input.displayLabels };
  }
}

export async function readMediaOperation(operationId: string): Promise<MediaOperationView | null> {
  const loaded = await loadOperation(operationId);
  return loaded ? toView(loaded.row, loaded.items) : null;
}

export async function resumeMediaOperation(operationId: string): Promise<LifecycleResult> {
  const loaded = await loadOperation(operationId);
  if (!loaded) return { error: "ไม่พบงานลบรูปที่ต้องลองอีกครั้ง" };
  const { row, items } = loaded;
  const view = toView(row, items);
  if (!view || !operationKinds.has(row.kind as MediaOperationKind)) return { error: "ข้อมูลงานลบรูปไม่ถูกต้อง" };
  const kind = row.kind as MediaOperationKind;
  const supabase = await createClient();
  for (const batch of groupDeleteBatches(items)) {
    const failure = await deleteWorkerBatch({ operationId, operationType: kind, ...batch });
    if (failure) {
      await supabase.rpc("doc_mark_media_operation_failed", { p_operation_id: operationId, p_error: failure.message });
      return { pending: true, operation: { ...view, attemptCount: view.attemptCount + 1, message: failure.message, files: failure.files } };
    }
  }
  const { data, error } = await supabase.rpc(finalizeRpc[kind], { p_operation_id: operationId });
  if (error) {
    const message = "ลบรูปแล้วแต่ยังบันทึกฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง";
    await supabase.rpc("doc_mark_media_operation_failed", { p_operation_id: operationId, p_error: message });
    return { pending: true, operation: { ...view, attemptCount: view.attemptCount + 1, message } };
  }
  const result = Array.isArray(data) && data[0] && typeof data[0] === "object" ? data[0] as Record<string, unknown> : {};
  return { success: true, kind, targetId: view.targetId, ...(typeof result.version === "number" ? { version: result.version } : {}), ...(typeof result.path === "string" ? { path: result.path } : {}) };
}

function cleanupItems(items: UploadedMediaCommand[]): { object_key: string; display_label: string }[] {
  return items.map((item) => ({ object_key: item.objectKey, display_label: item.displayLabel }));
}

export async function rollbackUploadedMedia(documentId: string, items: UploadedMediaCommand[]): Promise<void> {
  if (!uuidPattern.test(documentId) || items.length === 0) return;
  const supabase = await createClient();
  for (const batch of groupDeleteBatches(items.map((item) => ({ documentId, objectKey: item.objectKey, displayLabel: item.displayLabel })))) {
    const failure = await deleteWorkerBatch({ operationId: crypto.randomUUID(), operationType: "cleanup", ...batch });
    if (failure) await supabase.rpc("doc_record_media_cleanup", { p_document_id: documentId, p_items: cleanupItems(items.filter((item) => batch.objectKeys.includes(item.objectKey))), p_error: failure.message });
  }
}

export async function retryMediaCleanup(documentId?: string): Promise<CleanupRetryResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_claim_media_cleanup", { p_document_id: documentId ?? null, p_limit: 100 });
  if (error) return { status: "error", error: "ไม่สามารถเริ่มงานล้างรูปได้ กรุณาลองอีกครั้ง" };
  if (!Array.isArray(data) || data.length === 0) return { status: "complete" };
  const rows = data as { claim_token: string; document_id: string; object_key: string; display_label: string; attempt_count: number }[];
  const claimToken = rows[0]?.claim_token;
  if (!claimToken || !uuidPattern.test(claimToken)) return { status: "error", error: "ข้อมูลงานล้างรูปไม่ถูกต้อง" };
  const completedObjectKeys = new Set<string>();
  for (const batch of groupDeleteBatches(rows.map((row) => ({ documentId: row.document_id, objectKey: row.object_key, displayLabel: row.display_label })))) {
    const failure = await deleteWorkerBatch({ operationId: claimToken, operationType: "cleanup", ...batch });
    if (failure) {
      const remaining = rows.filter((row) => !completedObjectKeys.has(row.object_key) && !batch.objectKeys.includes(row.object_key));
      const failed = rows.filter((row) => batch.objectKeys.includes(row.object_key));
      await supabase.rpc("doc_fail_media_cleanup", { p_claim_token: claimToken, p_object_keys: [...failed, ...remaining].map((row) => row.object_key), p_error: failure.message });
      return { status: "pending", remaining: [{ operationId: claimToken, kind: "cleanup", targetId: batch.documentId, files: [...failed, ...remaining].map((row) => row.display_label), attemptCount: Math.max(...rows.map((row) => Number(row.attempt_count))) + 1, message: failure.message }] };
    }
    const { error: completeError } = await supabase.rpc("doc_complete_media_cleanup", { p_claim_token: claimToken, p_object_keys: batch.objectKeys });
    if (completeError) return { status: "error", error: "ลบรูปแล้วแต่ยังปิดงาน Cleanup ไม่สำเร็จ กรุณาลองอีกครั้ง" };
    for (const objectKey of batch.objectKeys) completedObjectKeys.add(objectKey);
  }
  return { status: "complete" };
}

export async function runDocumentSave(command: DocumentSaveCommand): Promise<LifecycleResult> {
  await retryMediaCleanup(command.id);
  const workerUrl = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  if (!workerUrl) {
    await rollbackUploadedMedia(command.id, command.media);
    return { error: "ยังไม่ได้ตั้งค่า Docs Media Worker" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_prepare_document_save", {
    p_id: command.id, p_section_id: command.sectionId, p_title: command.title, p_slug: command.slug, p_excerpt: command.excerpt,
    p_content: command.content, p_status: command.status, p_sort_order: command.sortOrder, p_expected_version: command.expectedVersion,
    p_media: command.media.map((item) => ({ id: item.mediaId, object_key: item.objectKey, public_url: new URL(`/objects/${item.objectKey}`, workerUrl).toString(), mime_type: item.mimeType, size_bytes: item.sizeBytes, width: item.width, height: item.height })),
  });
  if (error || !Array.isArray(data) || !data[0]) {
    await rollbackUploadedMedia(command.id, command.media);
    return { error: error?.code === "P0001" ? "เอกสารถูกแก้ไขจากที่อื่น กรุณา Reload ก่อนบันทึกอีกครั้ง" : "บันทึกเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
  const prepared = data[0] as Record<string, unknown>;
  if (prepared.finalized === true && typeof prepared.document_id === "string") return { success: true, kind: "save_remove", targetId: prepared.document_id, ...(typeof prepared.version === "number" ? { version: prepared.version } : {}), ...(typeof prepared.path === "string" ? { path: prepared.path } : {}) };
  return typeof prepared.operation_id === "string" ? resumeMediaOperation(prepared.operation_id) : { error: "ไม่สามารถเตรียมงานบันทึกรูปได้" };
}

export async function prepareAndDeleteDocument(documentId: string, expectedVersion: number): Promise<LifecycleResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_prepare_document_delete", { p_document_id: documentId, p_expected_version: expectedVersion });
  const operationId = Array.isArray(data) && data[0] && typeof data[0] === "object" ? (data[0] as Record<string, unknown>).operation_id : null;
  return error || typeof operationId !== "string" ? { error: "ไม่สามารถเตรียมการลบเอกสารได้" } : resumeMediaOperation(operationId);
}

export async function prepareAndDeleteSection(sectionId: string, confirmedTitle: string): Promise<LifecycleResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_prepare_section_delete", { p_section_id: sectionId, p_confirmed_title: confirmedTitle });
  const operationId = Array.isArray(data) && data[0] && typeof data[0] === "object" ? (data[0] as Record<string, unknown>).operation_id : null;
  return error || typeof operationId !== "string" ? { error: "ไม่สามารถเตรียมการลบหมวดได้" } : resumeMediaOperation(operationId);
}
