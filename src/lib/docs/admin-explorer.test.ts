import { describe, expect, it } from "vitest";
import {
  buildAdminExplorerSections,
  filterAdminDocuments,
  getAdminSectionPath,
  resolveAdminSectionId,
} from "./admin-explorer";

const sectionRows = [
  { id: "root", parent_id: null, title: "เริ่มต้น", slug: "start", is_published: true, sort_order: 0 },
  { id: "child", parent_id: "root", title: "การจอง", slug: "booking", is_published: true, sort_order: 0 },
];
const documents = [
  { id: "a", sectionId: "root", title: "ภาพรวม", slug: "overview", status: "published" as const, updatedAt: "2026-08-14", sortOrder: 0, version: 1 },
  { id: "b", sectionId: "child", title: "สร้างการจอง", slug: "create-booking", status: "draft" as const, updatedAt: "2026-08-14", sortOrder: 0, version: 1 },
];

describe("admin explorer model", () => {
  it("counts direct documents and resolves only real section ids", () => {
    const sections = buildAdminExplorerSections(sectionRows, documents);
    expect(sections.map((section) => [section.id, section.directDocumentCount])).toEqual([["root", 1], ["child", 1]]);
    expect(resolveAdminSectionId(sections, "child")).toBe("child");
    expect(resolveAdminSectionId(sections, "missing")).toBeNull();
  });

  it("builds a root-to-child breadcrumb", () => {
    expect(getAdminSectionPath(buildAdminExplorerSections(sectionRows, documents), "child").map((item) => item.title)).toEqual(["เริ่มต้น", "การจอง"]);
  });

  it("filters direct documents, while null means the virtual root", () => {
    expect(filterAdminDocuments(documents, "child", "สร้าง", "draft").map((item) => item.id)).toEqual(["b"]);
    expect(filterAdminDocuments(documents, null, "", "all").map((item) => item.id)).toEqual(["a", "b"]);
  });
});
