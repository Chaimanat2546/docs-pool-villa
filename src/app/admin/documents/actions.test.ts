import { beforeEach, describe, expect, it, vi } from "vitest";

const { runDocumentSave } = vi.hoisted(() => ({ runDocumentSave: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/docs/content", () => ({ validateDocumentContent: vi.fn((content) => ({ ok: true, content })) }));
vi.mock("@/lib/docs/public-cache", () => ({ revalidatePublicDocs: vi.fn() }));
vi.mock("@/lib/media/lifecycle", () => ({
  prepareAndDeleteDocument: vi.fn(),
  retryMediaCleanup: vi.fn(),
  rollbackUploadedMedia: vi.fn(),
  runDocumentSave,
  resumeMediaOperation: vi.fn(),
}));

import { saveDocument } from "./actions";

const documentId = "11111111-1111-4111-8111-111111111111";
const sectionId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";

describe("saveDocument", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL = "https://media.example.test";
    runDocumentSave.mockReset();
    runDocumentSave.mockResolvedValue({ success: true, kind: "save_remove", targetId: documentId, version: 1, path: "/guides/start" });
  });

  it("forwards Worker-verified media metadata to the lifecycle owner", async () => {
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

    expect(runDocumentSave).toHaveBeenCalledWith(expect.objectContaining({
      media: [expect.objectContaining({
        mediaId,
        mimeType: "image/webp",
        sizeBytes: 26,
        width: 1,
        height: 1,
      })],
    }));
  });
});
