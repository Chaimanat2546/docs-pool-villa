// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/docs/public-search", () => ({
  getPublicSearchResults: vi.fn(async () => ({
    items: [
      { kind: "document", href: "/guides/login", id: "doc", sectionId: "section", title: "คู่มือล็อกอิน", slug: "login", excerpt: "เข้าสู่ระบบ", updatedAt: "2026-08-17T00:00:00.000Z", sortOrder: 0, path: "/guides/login", sectionTitle: "คู่มือ", parentTitle: null },
      { kind: "heading", href: "/guides/account#ตั้งค่าการแจ้งเตือน", id: "heading", sectionId: "section", title: "คู่มือบัญชี", slug: "account", excerpt: null, updatedAt: "2026-08-17T00:00:00.000Z", sortOrder: 1, path: "/guides/account", sectionTitle: "คู่มือ", parentTitle: null, heading: "ตั้งค่าการแจ้งเตือน", headingLevel: 3 },
    ],
    total: 11,
    page: 2,
    pageCount: 2,
  })),
  normalizePublicSearchParams: (input: { q?: string | string[]; page?: string | string[] }) => ({ query: typeof input.q === "string" ? input.q : "", page: 2 }),
}));

vi.mock("@/components/public/public-header", () => ({ PublicHeader: () => <header /> }));

import SearchPage from "./page";

describe("SearchPage", () => {
  it("renders document and heading results with their destinations", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: "ล็อก", page: "2" }) }));

    expect(screen.getByRole("heading", { name: "ผลการค้นหาสำหรับ “ล็อก”" })).toBeTruthy();
    expect(screen.getByText("พบ 11 ผลลัพธ์")).toBeTruthy();
    expect(screen.getByRole("link", { name: "คู่มือล็อกอิน" }).getAttribute("href")).toBe("/guides/login");
    expect(screen.getByRole("link", { name: "คู่มือบัญชี" }).getAttribute("href")).toBe("/guides/account#ตั้งค่าการแจ้งเตือน");
    expect(screen.getByText("หัวข้อ: ตั้งค่าการแจ้งเตือน")).toBeTruthy();
    expect(screen.getAllByText("คู่มือ")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "หน้าก่อนหน้า" }).getAttribute("href")).toBe("/search?q=%E0%B8%A5%E0%B9%87%E0%B8%AD%E0%B8%81");
  });
});
