import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/docs/content", () => ({ validateDocumentContent: vi.fn((content) => ({ ok: true, content })) }));
vi.mock("@/lib/docs/public-cache", () => ({ revalidatePublicDocs: vi.fn() }));
vi.mock("@/lib/media/upload-ticket", () => ({ signMediaDeleteTicket: vi.fn() }));
vi.mock("@/lib/server", () => ({ createClient: vi.fn(async () => ({ rpc, from: vi.fn() })) }));

import { saveDocument } from "./actions";

const documentId = "11111111-1111-4111-8111-111111111111";
const sectionId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";

describe("saveDocument", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL = "https://media.example.test";
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [{ document_id: documentId, version: 1, path: "/guides/start" }], error: null });
  });

  it("forwards Worker-verified media metadata to the document save RPC", async () => {
    await saveDocument({
      id: documentId,
      sectionId,
      title: "เริ่มต้น",
      slug: "start",
      excerpt: "",
      content: { type: "doc", content: [] },
      status: "draft",
      sortOrder: 0,
      expectedVersion: null,
      media: [{
        mediaId,
        objectKey: `docs/${documentId}/${mediaId}.webp`,
        mimeType: "image/webp",
        sizeBytes: 26,
        width: 1,
        height: 1,
      }],
    });

    expect(rpc).toHaveBeenCalledWith("doc_save_document", expect.objectContaining({
      p_media: [expect.objectContaining({
        id: mediaId,
        mime_type: "image/webp",
        size_bytes: 26,
        width: 1,
        height: 1,
      })],
    }));
  });
});
