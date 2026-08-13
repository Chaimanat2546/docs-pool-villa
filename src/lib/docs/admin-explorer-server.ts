import "server-only";

import { cache } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { readMediaOperation } from "@/lib/media/lifecycle";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";
import { createClient } from "@/lib/server";

import {
  buildAdminExplorerSections,
  mapAdminDocuments,
  type AdminExplorerDocument,
  type AdminExplorerSection,
} from "./admin-explorer";

export type AdminExplorerData = {
  sections: AdminExplorerSection[];
  documents: AdminExplorerDocument[];
  pendingSectionOperations: MediaOperationView[];
  cleanupOperation: MediaOperationView | null;
};

export async function loadAdminExplorerDataUncached(): Promise<AdminExplorerData> {
  await requireAdmin();
  const supabase = await createClient();
  const [sectionsResult, documentsResult, operationRowsResult, cleanupRowsResult] = await Promise.all([
    supabase.from("doc_sections").select("id, parent_id, title, slug, description, is_published, sort_order").order("sort_order").order("id"),
    supabase.from("doc_documents").select("id, section_id, title, slug, status, updated_at, sort_order, version").order("sort_order").order("title"),
    supabase.from("doc_media_operations").select("id").eq("kind", "section_delete").order("created_at"),
    supabase.from("doc_media_cleanup").select("id, document_id, display_label, attempt_count, last_error").order("created_at").limit(100),
  ]);

  if (sectionsResult.error || documentsResult.error || operationRowsResult.error || cleanupRowsResult.error) {
    throw new Error("ไม่สามารถโหลดพื้นที่จัดการเนื้อหาได้");
  }

  const documents = mapAdminDocuments(documentsResult.data ?? []);
  const pendingSectionOperations = (await Promise.all((operationRowsResult.data ?? []).map((row) => readMediaOperation(row.id))))
    .filter((operation): operation is MediaOperationView => operation !== null);
  const cleanupRows = cleanupRowsResult.data ?? [];
  const cleanupOperation = cleanupRows.length === 0 ? null : {
    operationId: cleanupRows[0].id,
    kind: "cleanup" as const,
    targetId: cleanupRows[0].document_id,
    files: cleanupRows.map((row) => row.display_label),
    attemptCount: Math.max(...cleanupRows.map((row) => row.attempt_count)),
    message: cleanupRows[0].last_error,
  };

  return {
    sections: buildAdminExplorerSections(sectionsResult.data ?? [], documents),
    documents,
    pendingSectionOperations,
    cleanupOperation,
  };
}

export const loadAdminExplorerData = cache(loadAdminExplorerDataUncached);
