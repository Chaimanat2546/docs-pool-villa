import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PublicSection } from "./public-types";
import {
  buildPublicSearchItems,
  escapeLikePattern,
  normalizePublicSearchParams,
  pageCountForTotal,
  paginatePublicSearchItems,
  type SearchableDocument,
} from "./public-search";

const sections: PublicSection[] = [
  { id: "guides", parentId: null, title: "คู่มือ", slug: "guides", sortOrder: 0 },
];

const documents: SearchableDocument[] = [
  {
    id: "settings", sectionId: "guides", title: "ตั้งค่าระบบ", slug: "settings", excerpt: null,
    updatedAt: "2026-08-17T00:00:00.000Z", sortOrder: 0, status: "published",
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ไม่มีหัวข้อที่ตรง" }] }] },
  },
  {
    id: "account", sectionId: "guides", title: "คู่มือบัญชี", slug: "account", excerpt: null,
    updatedAt: "2026-08-17T00:00:00.000Z", sortOrder: 1, status: "published",
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ตั้งค่าบัญชี" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "ตั้งค่าการแจ้งเตือน" }] },
      { type: "paragraph", content: [{ type: "text", text: "ตั้งค่าในย่อหน้า" }] },
      { type: "table", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ตั้งค่าที่ตาราง" }] }] },
    ] },
  },
  {
    id: "draft", sectionId: "guides", title: "ร่างตั้งค่า", slug: "draft", excerpt: null,
    updatedAt: "2026-08-17T00:00:00.000Z", sortOrder: 2, status: "draft",
    content: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ตั้งค่าร่าง" }] }] },
  },
];

describe("public title-search query helpers", () => {
  it("trims a single title query and accepts a positive integer page", () => {
    expect(normalizePublicSearchParams({ q: "  ล็อก  ", page: "2" })).toEqual({ query: "ล็อก", page: 2 });
  });

  it("rejects multi-value queries and invalid page values", () => {
    expect(normalizePublicSearchParams({ q: ["one", "two"], page: "-1" })).toEqual({ query: "", page: 1 });
    expect(normalizePublicSearchParams({ q: "title", page: "1.5" })).toEqual({ query: "title", page: 1 });
  });

  it("limits a query to 200 characters", () => {
    expect(normalizePublicSearchParams({ q: "ก".repeat(201) }).query).toHaveLength(200);
  });

  it("escapes SQL ILIKE wildcard characters", () => {
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });

  it("calculates pages at the ten-item boundary", () => {
    expect(pageCountForTotal(0)).toBe(0);
    expect(pageCountForTotal(10)).toBe(1);
    expect(pageCountForTotal(11)).toBe(2);
  });

  it("returns title matches before every matching heading anchor", () => {
    expect(buildPublicSearchItems({
      titleDocuments: [documents[0]],
      headingDocuments: documents,
      sections,
      query: "ตั้ง",
    })).toMatchObject([
      { kind: "document", title: "ตั้งค่าระบบ", href: "/guides/settings" },
      { kind: "heading", title: "คู่มือบัญชี", heading: "ตั้งค่าบัญชี", headingLevel: 2, href: "/guides/account#ตั้งค่าบัญชี" },
      { kind: "heading", title: "คู่มือบัญชี", heading: "ตั้งค่าการแจ้งเตือน", headingLevel: 3, href: "/guides/account#ตั้งค่าการแจ้งเตือน" },
    ]);
  });

  it("excludes draft and non-heading content from heading matches", () => {
    expect(buildPublicSearchItems({
      titleDocuments: [],
      headingDocuments: documents,
      sections,
      query: "ร่าง",
    })).toEqual([]);
    expect(buildPublicSearchItems({
      titleDocuments: [],
      headingDocuments: documents,
      sections,
      query: "ย่อหน้า",
    })).toEqual([]);
    expect(buildPublicSearchItems({
      titleDocuments: [],
      headingDocuments: documents,
      sections,
      query: "ตาราง",
    })).toEqual([]);
  });

  it("keeps literal heading matches and paginates combined results", () => {
    const literalDocument: SearchableDocument = {
      ...documents[1],
      content: { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ส่วนลด 50%" }] }] },
    };
    const literalResults = buildPublicSearchItems({ titleDocuments: [], headingDocuments: [literalDocument], sections, query: "%" });
    const elevenResults = Array.from({ length: 11 }, (_, index) => ({ ...literalResults[0], id: String(index) }));

    expect(literalResults).toMatchObject([{ kind: "heading", heading: "ส่วนลด 50%" }]);
    expect(paginatePublicSearchItems(elevenResults, 2)).toHaveLength(1);
  });

  it("does not create heading results for an empty query", () => {
    expect(buildPublicSearchItems({ titleDocuments: [], headingDocuments: documents, sections, query: "" })).toEqual([]);
  });
});
