import { describe, expect, it } from "vitest";

import { getDocumentHeadings } from "./headings";

describe("getDocumentHeadings", () => {
  it("creates stable anchors for H2 and H3 headings", () => {
    expect(getDocumentHeadings({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ตั้งค่า" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "รายละเอียด" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ตั้งค่า" }] },
      ],
    })).toEqual([
      { id: "ตั้งค่า", level: 2, text: "ตั้งค่า" },
      { id: "รายละเอียด", level: 3, text: "รายละเอียด" },
      { id: "ตั้งค่า-2", level: 2, text: "ตั้งค่า" },
    ]);
  });

  it("ignores headings nested inside tables", () => {
    expect(getDocumentHeadings({
      type: "doc",
      content: [
        { type: "table", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ซ่อน" }] }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "แสดง" }] },
      ],
    })).toEqual([{ id: "แสดง", level: 2, text: "แสดง" }]);
  });
});
