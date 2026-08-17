import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { collectPersistedMedia, groupDeleteBatches, replacePendingImages } from "./content-media";

const documentId = "11111111-1111-4111-8111-111111111111";
const firstMediaId = "22222222-2222-4222-8222-222222222222";
const secondMediaId = "33333333-3333-4333-8333-333333333333";

describe("content media contract", () => {
  it("collects a nested persisted image with its accessible label", () => {
    const content: JSONContent = {
      type: "doc",
      content: [{ type: "blockquote", content: [{ type: "image", attrs: { mediaId: firstMediaId, src: "https://media.test/one.webp", alt: "ภาพหน้าเข้าสู่ระบบ" } }] }],
    };

    expect(collectPersistedMedia(content)).toEqual({
      ok: true,
      references: [{ mediaId: firstMediaId, displayLabel: "ภาพหน้าเข้าสู่ระบบ" }],
    });
  });

  it("rejects a persisted media id used twice", () => {
    const image = { type: "image", attrs: { mediaId: firstMediaId, src: "https://media.test/one.webp", alt: "ภาพ" } };

    expect(collectPersistedMedia({ type: "doc", content: [image, image] })).toEqual({
      ok: false,
      error: "พบรูปเดิมซ้ำในเอกสาร",
    });
  });

  it("replaces pending image attributes without mutating the source content", () => {
    const content: JSONContent = {
      type: "doc",
      content: [{ type: "image", attrs: { pendingId: "pending-1", src: "blob:one", alt: "ภาพ" } }],
    };

    const result = replacePendingImages(
      content,
      new Map([["pending-1", {
        mediaId: firstMediaId,
        objectKey: `docs/${documentId}/${firstMediaId}.webp`,
        mimeType: "image/webp",
        sizeBytes: 10,
        width: 1,
        height: 1,
      }]]),
      (objectKey) => `https://media.test/${objectKey}`,
    );

    expect(result.content?.[0]?.attrs).toMatchObject({
      mediaId: firstMediaId,
      src: `https://media.test/docs/${documentId}/${firstMediaId}.webp`,
    });
    expect(result.content?.[0]?.attrs?.pendingId).toBeUndefined();
    expect(content.content?.[0]?.attrs?.pendingId).toBe("pending-1");
    expect(content.content?.[0]?.attrs?.src).toBe("blob:one");
  });

  it("groups exact keys by document into batches of at most 1,000", () => {
    const items = Array.from({ length: 1001 }, (_, index) => ({
      documentId,
      objectKey: `docs/${documentId}/${String(index).padStart(32, "0")}-0000-4000-8000-000000000000.webp`,
      displayLabel: `ภาพ ${index}`,
    }));

    expect(groupDeleteBatches(items)).toEqual([
      expect.objectContaining({ documentId, objectKeys: expect.arrayContaining([items[0].objectKey]), displayLabels: expect.arrayContaining([items[0].displayLabel]) }),
      expect.objectContaining({ documentId, objectKeys: [items[1000].objectKey], displayLabels: [items[1000].displayLabel] }),
    ]);
    expect(groupDeleteBatches(items).map((batch) => batch.objectKeys.length)).toEqual([1000, 1]);
    expect(groupDeleteBatches([{ ...items[0], documentId: secondMediaId }], 1)[0]).toMatchObject({ documentId: secondMediaId });
  });
});
