import { describe, expect, it } from "vitest";

import { toYouTubeNoCookieUrl, validateDocumentContent } from "./content";

describe("document content validation", () => {
  it("rejects raw HTML-shaped or unsafe URL content", () => {
    expect(validateDocumentContent({ type: "doc", content: [{ type: "iframe" }] }, "persisted").ok).toBe(false);
    expect(validateDocumentContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }, "persisted").ok).toBe(false);
  });

  it("allows only temporary blob image sources in preview mode", () => {
    const content = { type: "doc", content: [{ type: "image", attrs: { src: "blob:test", alt: "ภาพตัวอย่าง" } }] };
    expect(validateDocumentContent(content, "preview").ok).toBe(true);
    expect(validateDocumentContent(content, "persisted").ok).toBe(false);
  });

  it("normalizes valid YouTube URLs to youtube-nocookie", () => {
    expect(toYouTubeNoCookieUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(toYouTubeNoCookieUrl("https://example.com/video")).toBeNull();
  });

  it("rejects persisted table content", () => {
    expect(validateDocumentContent({ type: "doc", content: [{ type: "table", content: [] }] }, "persisted").ok).toBe(false);
  });

  it("accepts the youtube-nocookie embed URL stored by the editor", () => {
    const content = {
      type: "doc",
      content: [{ type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/s3a4OQR-10M" } }],
    };

    expect(validateDocumentContent(content, "persisted").ok).toBe(true);
  });

  it("accepts the callout structure stored by the editor", () => {
    const content = {
      type: "doc",
      content: [{
        type: "callout",
        attrs: { kind: "info" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อมูลสำคัญ" }] }],
      }],
    };

    expect(validateDocumentContent(content, "persisted").ok).toBe(true);
  });

  it("rejects structurally invalid document trees", () => {
    expect(validateDocumentContent({ type: "doc", content: [{ type: "text", text: "root text" }] }, "persisted").ok).toBe(false);
    expect(validateDocumentContent({ type: "doc", content: [{ type: "image", attrs: { src: "https://example.test/image.webp", alt: "ภาพ", mediaId: "11111111-1111-4111-8111-111111111111" }, content: [] }] }, "persisted").ok).toBe(false);
  });

  it("rejects content that exceeds the maximum nesting depth", () => {
    let nested: Record<string, unknown> = { type: "paragraph", content: [{ type: "text", text: "x" }] };
    for (let index = 0; index < 65; index += 1) nested = { type: "blockquote", content: [nested] };
    expect(validateDocumentContent({ type: "doc", content: [nested] }, "persisted").ok).toBe(false);
  });
});
