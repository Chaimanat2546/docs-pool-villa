/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rootId = "22222222-2222-4222-8222-222222222222";
const sectionId = "33333333-3333-4333-8333-333333333333";
const sections = [
  {
    id: rootId,
    parentId: null,
    title: "เริ่มต้น",
    slug: "getting-started",
    description: null,
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 0,
  },
  {
    id: sectionId,
    parentId: rootId,
    title: "การจอง",
    slug: "booking",
    description: null,
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 0,
  },
];

const { loadAdminExplorerData } = vi.hoisted(() => ({
  loadAdminExplorerData: vi.fn(),
}));

vi.mock("@/lib/docs/admin-explorer-server", () => ({ loadAdminExplorerData }));
vi.mock("@/app/admin/(content)/documents/actions", () => ({ createDocumentDraft: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import NewDocumentPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  loadAdminExplorerData.mockResolvedValue({ sections, documents: [], pendingSectionOperations: [], cleanupOperation: null });
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("11111111-1111-4111-8111-111111111111");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NewDocumentPage", () => {
  it.each([
    ["missing", {}],
    ["invalid", { section: "not-a-real-section" }],
  ])("asks for a real section when the request is %s", async (_label, query) => {
    render(await NewDocumentPage({ searchParams: Promise.resolve(query) }));

    expect(screen.getByRole("heading", { name: "เลือกหมวดก่อนสร้างเอกสาร" })).not.toBeNull();
    expect(screen.queryByRole("form", { name: "ข้อมูลเอกสาร" })).toBeNull();
  });

  it("preselects the requested real section without falling back to the first section", async () => {
    render(await NewDocumentPage({ searchParams: Promise.resolve({ section: sectionId }) }));

    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "หมวดเอกสาร" }).value).toBe(sectionId);
    expect(screen.getByText("เริ่มต้น › การจอง", { selector: "span" })).not.toBeNull();
  });
});
