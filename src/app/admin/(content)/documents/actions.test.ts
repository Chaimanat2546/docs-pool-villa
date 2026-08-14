import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, runDocumentSave } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  runDocumentSave: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/docs/content", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/docs/content")>(),
  validateDocumentContent: vi.fn((content) => ({ ok: true, content })),
}));
vi.mock("@/lib/docs/public-cache", () => ({ revalidatePublicDocs: vi.fn() }));
vi.mock("@/lib/media/lifecycle", () => ({
  prepareAndDeleteDocument: vi.fn(),
  retryMediaCleanup: vi.fn(),
  rollbackUploadedMedia: vi.fn(),
  runDocumentSave,
  resumeMediaOperation: vi.fn(),
}));

import { createDocumentDraft, saveDocument } from "./actions";

const documentId = "11111111-1111-4111-8111-111111111111";
const sectionId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";

describe("saveDocument", () => {
  beforeEach(() => {
    Reflect.set(process.env, "NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL", "https://media.example.test");
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(undefined);
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

  it("normalizes YouTube URLs before forwarding content to the persistence lifecycle", async () => {
    await saveDocument({
      id: documentId,
      sectionId,
      title: "เริ่มต้น",
      slug: "start",
      excerpt: "",
      content: {
        type: "doc",
        content: [{ type: "youtube", attrs: { src: "https://youtu.be/AtuNIJ9uZkc?si=P83kSC7fh3VZACeQ" } }],
      },
      status: "published",
      sortOrder: 0,
      expectedVersion: 1,
      media: [],
    });

    expect(runDocumentSave).toHaveBeenCalledWith(expect.objectContaining({
      content: {
        type: "doc",
        content: [{ type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/AtuNIJ9uZkc" } }],
      },
    }));
  });

  it("does not start the save lifecycle when admin access redirects to the admin-only page", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;/auth/admin-only",
    });
    requireAdmin.mockRejectedValue(redirectError);

    await expect(saveDocument({
      id: documentId,
      sectionId,
      title: "เริ่มต้น",
      slug: "start",
      excerpt: "",
      content: { type: "doc", content: [] },
      status: "draft",
      sortOrder: 0,
      expectedVersion: null,
      media: [],
    })).rejects.toBe(redirectError);

    expect(runDocumentSave).not.toHaveBeenCalled();
  });
});

describe("createDocumentDraft", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockResolvedValue(undefined);
    runDocumentSave.mockReset();
  });

  it("creates a draft through the validated save lifecycle", async () => {
    runDocumentSave.mockResolvedValue({
      success: true,
      kind: "save",
      targetId: documentId,
      version: 1,
      path: "/start/new-doc",
    });

    await expect(createDocumentDraft({
      id: documentId,
      sectionId,
      title: "เอกสารใหม่",
      slug: "new-doc",
    })).resolves.toEqual({
      success: true,
      id: documentId,
      version: 1,
      path: "/start/new-doc",
    });
    expect(runDocumentSave).toHaveBeenCalledWith(expect.objectContaining({
      id: documentId,
      sectionId,
      title: "เอกสารใหม่",
      slug: "new-doc",
      status: "draft",
      sortOrder: 0,
      expectedVersion: null,
      media: [],
    }));
  });

  it("rejects a missing or malformed section before the lifecycle call", async () => {
    await expect(createDocumentDraft({
      id: documentId,
      sectionId: "",
      title: "เอกสารใหม่",
      slug: "new-doc",
    })).resolves.toEqual({ error: "ข้อมูลเอกสารไม่ถูกต้อง" });
    expect(runDocumentSave).not.toHaveBeenCalled();
  });
});
