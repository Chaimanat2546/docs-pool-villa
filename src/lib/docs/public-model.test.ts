import { describe, expect, it } from "vitest";

import { buildPublicIndex, parsePublicPath } from "./public-model";

const sections = [
  { id: "root", parentId: null, title: "Root", slug: "root", sortOrder: 2 },
  { id: "empty", parentId: null, title: "Empty", slug: "empty", sortOrder: 1 },
  { id: "child", parentId: "root", title: "Child", slug: "child", sortOrder: 1 },
];

const documents = [
  { id: "two", sectionId: "root", title: "Two", slug: "two", excerpt: null, updatedAt: "2026-08-12T00:00:00.000Z", sortOrder: 2 },
  { id: "one", sectionId: "root", title: "One", slug: "one", excerpt: null, updatedAt: "2026-08-11T00:00:00.000Z", sortOrder: 1 },
  { id: "child-doc", sectionId: "child", title: "Child doc", slug: "child-doc", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1 },
];

describe("public documentation model", () => {
  it("accepts only canonical root and child document paths", () => {
    expect(parsePublicPath(["guides", "start"])).toEqual(["guides", "start"]);
    expect(parsePublicPath(["guides", "setup", "start"])).toEqual(["guides", "setup", "start"]);
    expect(parsePublicPath(["guides", "too", "deep", "route"])).toBeNull();
    expect(parsePublicPath(["guides", "Not-valid"])).toBeNull();
  });

  it("removes empty branches and keeps one order for navigation, start and previous/next", () => {
    const index = buildPublicIndex(sections, documents);
    expect(index.sections.map((section) => section.id)).toEqual(["root"]);
    expect(index.documents.map((document) => document.path)).toEqual(["/root/one", "/root/two", "/root/child/child-doc"]);
    expect(index.recentUpdates.map((document) => document.id)).toEqual(["child-doc", "two", "one"]);
  });
});
