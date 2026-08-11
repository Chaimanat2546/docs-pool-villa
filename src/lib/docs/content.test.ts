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
});
