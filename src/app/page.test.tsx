/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getPublicDocsIndex = vi.hoisted(() => vi.fn());

vi.mock("@/components/public/public-header", () => ({ PublicHeader: () => <header /> }));
vi.mock("@/components/public/public-search-palette", () => ({
  PublicSearchPalette: ({ variant }: { variant?: string }) => <div data-testid="home-search-palette" data-variant={variant} />,
}));
vi.mock("@/lib/docs/public", () => ({
  getPublicDocsIndex,
}));

import Home from "./page";

afterEach(cleanup);

describe("Home", () => {
  it("presents a Baan Pool Villa welcome hero, stats, and category entry points", async () => {
    getPublicDocsIndex.mockResolvedValue({
      documents: [{
        id: "document-getting-started",
        sectionId: "section-getting-started",
        title: "เริ่มต้นใช้งาน",
        slug: "getting-started",
        excerpt: null,
        updatedAt: "2026-08-18T10:00:00.000Z",
        sortOrder: 0,
        path: "/getting-started/getting-started",
        sectionTitle: "เริ่มต้น",
        parentTitle: null,
      }],
      sections: [{
        id: "section-getting-started",
        parentId: null,
        title: "เริ่มต้น",
        slug: "getting-started",
        sortOrder: 0,
        documents: [{
          id: "document-getting-started",
          sectionId: "section-getting-started",
          title: "เริ่มต้นใช้งาน",
          slug: "getting-started",
          excerpt: "ภาพรวมการใช้งานระบบสำหรับผู้เริ่มต้น",
          updatedAt: "2026-08-18T10:00:00.000Z",
          sortOrder: 0,
          path: "/getting-started/getting-started",
          sectionTitle: "เริ่มต้น",
          parentTitle: null,
        }],
        children: [],
      }],
      recentUpdates: [{
        id: "document-getting-started",
        sectionId: "section-getting-started",
        title: "เริ่มต้นใช้งาน",
        slug: "getting-started",
          excerpt: "ภาพรวมการใช้งานระบบสำหรับผู้เริ่มต้น",
        updatedAt: "2026-08-18T10:00:00.000Z",
        sortOrder: 0,
        path: "/getting-started/getting-started",
        sectionTitle: "เริ่มต้น",
        parentTitle: null,
      }],
    });

    render(await Home());

    expect(screen.queryByTestId("home-search-palette")).toBeNull();
    const hero = screen.getByRole("heading", { name: "Documentation for Baan Pool Villa", level: 1 }).closest("section");
    expect(hero).not.toBeNull();
    expect(within(hero!).getByRole("link", { name: "เริ่มต้นใช้งาน" }).getAttribute("href")).toBe("/getting-started/getting-started");
    expect(screen.getByRole("heading", { name: "เริ่มใช้งาน Baan Pool Villa", level: 2 })).not.toBeNull();
    expect(screen.getAllByText("ภาพรวมการใช้งานระบบสำหรับผู้เริ่มต้น")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "อ่านต่อ" })).toBeNull();
    expect(screen.getAllByRole("link").some((link) => link.className.includes("group"))).toBe(true);
    expect(screen.getByRole("heading", { name: "Explore documentation", level: 2 })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Latest updates", level: 2 })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "ดูอัปเดตทั้งหมด" })).toBeNull();
    expect(screen.getByRole("heading", { name: "เริ่มต้น", level: 3 })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "เปิดหมวด เริ่มต้น" })).toBeNull();
    const categoryDocumentLink = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/getting-started/getting-started" && link.className.includes("group"));
    expect(categoryDocumentLink).not.toBeNull();
    expect(categoryDocumentLink!.getAttribute("href")).toBe("/getting-started/getting-started");
    expect(categoryDocumentLink).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Latest updates", level: 2 })).not.toBeNull();
  });

  it("limits explore documentation to five categories", async () => {
    const sections = Array.from({ length: 6 }, (_, index) => ({
      id: `section-${index}`,
      parentId: null,
      title: `หมวด ${index + 1}`,
      slug: `section-${index}`,
      sortOrder: index,
      documents: [],
      children: [],
    }));
    getPublicDocsIndex.mockResolvedValue({ documents: [], sections, recentUpdates: [] });

    render(await Home());

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
    expect(screen.queryByRole("heading", { name: "หมวด 6" })).toBeNull();
  });

  it.each([true, false])("uses only the Baan Pool Villa tree, including child documents (present: %s)", async (present) => {
    const document = (id: string, sectionId: string, path: string) => ({
      id, sectionId, path, title: id, slug: id, excerpt: null,
      updatedAt: "2026-09-16T00:00:00.000Z", sortOrder: 0,
      sectionTitle: "เริ่มใช้งาน", parentTitle: null,
    });
    const other = document("WeBooks intro", "webook", "/webook/start/getting-started");
    const baanDocuments = Array.from({ length: 4 }, (_, i) =>
      document(`Baan ${i + 1}`, "baan-start", `/baan-pool-villa/start/guide-${i + 1}`));
    const otherSection = { id: "webook", parentId: null, title: "WeBooks", slug: "webook", sortOrder: 0, documents: [other], children: [] };
    const baan = { id: "baan", parentId: null, title: "คู่มือ Baan Pool Villa", slug: "baan-pool-villa", sortOrder: 1, documents: [], children: [
      { id: "baan-start", parentId: "baan", title: "เริ่มใช้งาน", slug: "start", sortOrder: 0, documents: baanDocuments, children: [] },
    ] };
    getPublicDocsIndex.mockResolvedValue({ documents: [other, ...baanDocuments], sections: present ? [otherSection, baan] : [otherSection], recentUpdates: [] });
    render(await Home());
    const section = screen.getByRole("heading", { name: "เริ่มใช้งาน Baan Pool Villa", level: 2 }).closest("section")!;
    expect(within(section).queryByText("WeBooks intro")).toBeNull();
    if (present) {
      expect(within(section).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual([
        "/baan-pool-villa/start/guide-1", "/baan-pool-villa/start/guide-2", "/baan-pool-villa/start/guide-3",
      ]);
      expect(within(section).queryByText("Baan 4")).toBeNull();
    } else {
      expect(within(section).queryAllByRole("link")).toHaveLength(0);
      expect(within(section).getByText("ยังไม่มีคู่มือ Baan Pool Villa ที่เผยแพร่")).not.toBeNull();
    }
  });

  it("explains that guides are being prepared when there is no published document", async () => {
    getPublicDocsIndex.mockResolvedValue({ documents: [], sections: [], recentUpdates: [] });

    render(await Home());

    expect(screen.getByText("กำลังจัดเตรียมคู่มือสำหรับคุณ")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "เริ่มต้นใช้งาน" })).toBeNull();
  });
});
