/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentContent, getTableOfContents } from "./document-content";

const content = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "เริ่มต้นใช้งาน" }] },
    { type: "paragraph", content: [{ type: "text", text: "ข้อความ ", marks: [{ type: "bold" }] }, { type: "text", text: "พร้อมลิงก์", marks: [{ type: "link", attrs: { href: "https://example.test" } }] }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "รายละเอียด" }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "เริ่มต้นใช้งาน" }] },
  ],
};

describe("public document content", () => {
  it("creates deterministic TOC IDs for Thai and duplicate headings", () => {
    expect(getTableOfContents(content)).toEqual([
      { id: "เริ่มต้นใช้งาน", level: 2, text: "เริ่มต้นใช้งาน" },
      { id: "รายละเอียด", level: 3, text: "รายละเอียด" },
      { id: "เริ่มต้นใช้งาน-2", level: 2, text: "เริ่มต้นใช้งาน" },
    ]);
  });

  it("renders allowed marks safely and uses matching heading anchors", () => {
    render(<DocumentContent content={content} />);
    expect(screen.getAllByRole("heading", { name: "เริ่มต้นใช้งาน", level: 2 })[0].id).toBe("เริ่มต้นใช้งาน");
    expect(screen.getByRole("link", { name: "พร้อมลิงก์" }).getAttribute("rel")).toBe("noreferrer");
    expect(screen.getByText("ข้อความ").tagName).toBe("STRONG");
  });

  it("omits legacy table headings from the TOC and rendered heading IDs", () => {
    const legacyTableContent = {
      type: "doc",
      content: [
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อที่ถูกซ่อน" }] }] }] }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อปกติ" }] },
      ],
    };

    expect(getTableOfContents(legacyTableContent)).toEqual([
      { id: "หัวข้อปกติ", level: 2, text: "หัวข้อปกติ" },
    ]);

    render(<DocumentContent content={legacyTableContent} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: "หัวข้อที่ถูกซ่อน" })).toBeNull();
    expect(screen.getByRole("heading", { name: "หัวข้อปกติ" }).id).toBe("หัวข้อปกติ");
  });

  it("does not render unsafe link URLs", () => {
    render(<DocumentContent content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "unsafe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }} />);
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull();
    expect(screen.getByText("unsafe")).not.toBeNull();
  });

  it("renders every supported structural node and rejects malformed embeds", () => {
    render(<DocumentContent content={{ type: "doc", content: [
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "bullet" }] }] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "ordered" }] }] }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quote" }] }] },
      { type: "codeBlock", content: [{ type: "text", text: "const value = 1" }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "text", text: "header" }] }, { type: "tableCell", content: [{ type: "text", text: "cell" }] }] }] },
      { type: "callout", attrs: { kind: "tip" }, content: [{ type: "paragraph", content: [{ type: "text", text: "tip" }] }] },
      { type: "image", attrs: { src: "https://images.example.test/a.webp", alt: "ภาพตัวอย่าง" } },
      { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/video-id" } },
      { type: "image", attrs: { src: "https://images.example.test/missing-alt.webp" } },
      { type: "youtube", attrs: { src: "https://www.youtube.com/embed/not-allowed" } },
    ] }} />);
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByAltText("ภาพตัวอย่าง")).not.toBeNull();
    expect(screen.getByTitle("วิดีโอ YouTube")).not.toBeNull();
    expect(screen.queryByAltText("")).toBeNull();
  });
});
