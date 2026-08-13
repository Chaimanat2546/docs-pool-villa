import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, readMediaOperation, requireAdmin } = vi.hoisted(() => ({
  createClient: vi.fn(),
  readMediaOperation: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/media/lifecycle", () => ({ readMediaOperation }));
vi.mock("@/lib/server", () => ({ createClient }));

import { loadAdminExplorerDataUncached } from "./admin-explorer-server";

const sectionId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";

type QueryResult = { data: unknown[] | null; error: unknown };

function query(result: QueryResult) {
  const request = Promise.resolve(result) as Promise<QueryResult> & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
  request.select = vi.fn(() => request);
  request.order = vi.fn(() => request);
  request.eq = vi.fn(() => request);
  request.limit = vi.fn(() => request);
  return request;
}

function mockQueries(results: QueryResult[]) {
  const from = vi.fn();
  for (const result of results) from.mockReturnValueOnce(query(result));
  createClient.mockResolvedValue({ from });
}

describe("admin explorer server loader", () => {
  beforeEach(() => {
    createClient.mockReset();
    readMediaOperation.mockReset();
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(undefined);
  });

  it("authorizes once and maps database rows into explorer data", async () => {
    mockQueries([
      { data: [{ id: sectionId, parent_id: null, title: "เริ่มต้น", slug: "start", description: null, is_published: true, sort_order: 0 }], error: null },
      { data: [{ id: documentId, section_id: sectionId, title: "ภาพรวม", slug: "overview", status: "draft", updated_at: "2026-08-14", sort_order: 3, version: "1" }], error: null },
      { data: [{ id: operationId }], error: null },
      { data: [{ id: "cleanup-1", document_id: documentId, display_label: "ภาพตัวอย่าง", attempt_count: 2, last_error: "ลบรูปไม่สำเร็จ" }], error: null },
    ]);
    readMediaOperation.mockResolvedValue({ operationId, kind: "section_delete", targetId: sectionId, files: ["เก่า.webp"], attemptCount: 1, message: "กำลังลบรูป" });

    await expect(loadAdminExplorerDataUncached()).resolves.toEqual({
      sections: [{ id: sectionId, parentId: null, title: "เริ่มต้น", slug: "start", description: null, isPublished: true, sortOrder: 0, directDocumentCount: 1 }],
      documents: [{ id: documentId, sectionId, title: "ภาพรวม", slug: "overview", status: "draft", updatedAt: "2026-08-14", sortOrder: 3, version: 1 }],
      pendingSectionOperations: [{ operationId, kind: "section_delete", targetId: sectionId, files: ["เก่า.webp"], attemptCount: 1, message: "กำลังลบรูป" }],
      cleanupOperation: { operationId: "cleanup-1", kind: "cleanup", targetId: documentId, files: ["ภาพตัวอย่าง"], attemptCount: 2, message: "ลบรูปไม่สำเร็จ" },
    });
    expect(requireAdmin).toHaveBeenCalledTimes(1);
  });

  it.each(["sections", "documents"])("rejects when the %s query fails", async (failedQuery) => {
    mockQueries([
      { data: [], error: failedQuery === "sections" ? { message: "failed" } : null },
      { data: [], error: failedQuery === "documents" ? { message: "failed" } : null },
      { data: [], error: null },
      { data: [], error: null },
    ]);

    await expect(loadAdminExplorerDataUncached()).rejects.toThrow("ไม่สามารถโหลดพื้นที่จัดการเนื้อหาได้");
  });
});
