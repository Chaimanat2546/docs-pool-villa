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
  it("leads with the first published document and category entry points without a Hero search", async () => {
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
          excerpt: null,
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
        excerpt: null,
        updatedAt: "2026-08-18T10:00:00.000Z",
        sortOrder: 0,
        path: "/getting-started/getting-started",
        sectionTitle: "เริ่มต้น",
        parentTitle: null,
      }],
    });

    render(await Home());

    expect(screen.queryByTestId("home-search-palette")).toBeNull();
    const hero = screen.getByRole("heading", { name: "คู่มือสำหรับเว็บ Baan Pool Villa", level: 1 }).closest("section");
    expect(hero).not.toBeNull();
    expect(within(hero!).getByRole("link", { name: "เริ่มต้นใช้งาน" }).getAttribute("href")).toBe("/getting-started/getting-started");
    expect(screen.getByRole("heading", { name: "เริ่มต้น", level: 3 })).not.toBeNull();
    const categoryDocumentLink = within(screen.getByRole("article")).getByRole("link", { name: "เริ่มต้นใช้งาน" });
    expect(categoryDocumentLink.getAttribute("href")).toBe("/getting-started/getting-started");
    expect(categoryDocumentLink.className).toContain("min-h-11");
    expect(screen.getByRole("heading", { name: "อัปเดตล่าสุด", level: 2 })).not.toBeNull();
  });

  it("explains that guides are being prepared when there is no published document", async () => {
    getPublicDocsIndex.mockResolvedValue({ documents: [], sections: [], recentUpdates: [] });

    render(await Home());

    expect(screen.getByText("กำลังจัดเตรียมคู่มือสำหรับคุณ")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "เริ่มต้นใช้งาน" })).toBeNull();
  });
});
