import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/server", () => ({ createClient: vi.fn(async () => ({ rpc })) }));
vi.mock("@/lib/media/upload-ticket", () => ({ signMediaDeleteTicket: vi.fn(async () => "ticket") }));
vi.mock("server-only", () => ({}));

import { resumeMediaOperation } from "./lifecycle";

const documentId = "11111111-1111-4111-8111-111111111111";
const operationId = "22222222-2222-4222-8222-222222222222";

describe("media lifecycle", () => {
  beforeEach(() => {
    rpc.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL = "https://media.example.test";
    process.env.DOCS_MEDIA_UPLOAD_SECRET = "test-secret";
  });

  it("keeps the operation pending when R2 deletion fails", async () => {
    rpc.mockResolvedValueOnce({ data: [{
      operation_id: operationId,
      kind: "document_delete",
      target_id: documentId,
      attempt_count: 0,
      last_error: null,
      items: [{ documentId, objectKey: `docs/${documentId}/33333333-3333-4333-8333-333333333333.webp`, displayLabel: "ภาพตัวอย่าง" }],
    }], error: null });
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "ลบรูปไม่สำเร็จ" }), { status: 500 }));

    await expect(resumeMediaOperation(operationId)).resolves.toMatchObject({
      pending: true,
      operation: { operationId, files: ["ภาพตัวอย่าง"] },
    });
    expect(rpc).toHaveBeenCalledWith("doc_mark_media_operation_failed", expect.objectContaining({ p_operation_id: operationId }));
    expect(rpc).not.toHaveBeenCalledWith("doc_finalize_document_delete", expect.anything());
  });
});
