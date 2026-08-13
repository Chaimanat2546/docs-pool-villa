/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { clientSectionMode, loadAdminExplorerData } = vi.hoisted(() => ({
  clientSectionMode: vi.fn(() => {
    throw new Error("Cannot call a Client Component export from the server");
  }),
  loadAdminExplorerData: vi.fn(),
}));

vi.mock("@/components/admin/explorer/document-list", () => ({
  DocumentList: ({ selectedSectionId }: { selectedSectionId: string | null }) => (
    <div data-testid="document-list" data-selected-section={selectedSectionId ?? "virtual-root"} />
  ),
}));
vi.mock("@/components/admin/explorer/section-panel", () => ({
  SectionPanel: ({ mode, selectedSectionId }: { mode: string; selectedSectionId: string | null }) => (
    <div data-testid="section-panel" data-mode={mode} data-selected-section={selectedSectionId ?? "virtual-root"} />
  ),
  sectionMode: clientSectionMode,
}));
vi.mock("@/components/admin/media-cleanup-banner", () => ({
  MediaCleanupBanner: () => <div data-testid="cleanup-banner" />,
}));
vi.mock("@/lib/docs/admin-explorer-server", () => ({ loadAdminExplorerData }));

import StructurePage from "./page";

const sectionId = "11111111-1111-4111-8111-111111111111";
const explorer = {
  sections: [{
    id: sectionId,
    parentId: null,
    title: "เริ่มต้น",
    slug: "getting-started",
    description: null,
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 0,
  }],
  documents: [],
  pendingSectionOperations: [],
  cleanupOperation: null,
};

afterEach(cleanup);

describe("StructurePage server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAdminExplorerData.mockResolvedValue(explorer);
  });

  it("parses supported modes on the server without calling a Client Component export", async () => {
    render(await StructurePage({ searchParams: Promise.resolve({ section: sectionId, mode: "edit" }) }));

    const panel = screen.getByTestId("section-panel");
    expect(panel.getAttribute("data-selected-section")).toBe(sectionId);
    expect(panel.getAttribute("data-mode")).toBe("edit");
    expect(clientSectionMode).not.toHaveBeenCalled();
  });

  it("falls back to view for unsupported or array modes on the server", async () => {
    const unsupported = await StructurePage({ searchParams: Promise.resolve({ mode: "remove" }) });
    const arrayMode = await StructurePage({ searchParams: Promise.resolve({ mode: ["edit"] }) });

    const { rerender } = render(unsupported);
    expect(screen.getByTestId("section-panel").getAttribute("data-mode")).toBe("view");
    rerender(arrayMode);
    expect(screen.getByTestId("section-panel").getAttribute("data-mode")).toBe("view");
    expect(clientSectionMode).not.toHaveBeenCalled();
  });

  it("renders the canonical document list for the selected section", async () => {
    render(await StructurePage({ searchParams: Promise.resolve({ section: sectionId }) }));

    expect(screen.getByTestId("document-list").getAttribute("data-selected-section")).toBe(sectionId);
  });

  it("uses the virtual root and explains an invalid requested section", async () => {
    render(await StructurePage({ searchParams: Promise.resolve({ section: "missing" }) }));

    expect(screen.getByRole("alert").textContent).toBe("ไม่พบหมวดที่เลือก จึงแสดงคู่มือทั้งหมด");
    expect(screen.getByTestId("section-panel").getAttribute("data-selected-section")).toBe("virtual-root");
    expect(screen.getByTestId("document-list").getAttribute("data-selected-section")).toBe("virtual-root");
  });

  it("treats repeated section parameters as an invalid selection", async () => {
    render(await StructurePage({ searchParams: Promise.resolve({ section: [sectionId, "missing"] }) }));

    expect(screen.getByRole("alert").textContent).toBe("ไม่พบหมวดที่เลือก จึงแสดงคู่มือทั้งหมด");
    expect(screen.getByTestId("document-list").getAttribute("data-selected-section")).toBe("virtual-root");
  });

  it("keeps pending cleanup visible above the canonical list", async () => {
    loadAdminExplorerData.mockResolvedValue({
      ...explorer,
      cleanupOperation: {
        operationId: "22222222-2222-4222-8222-222222222222",
        kind: "cleanup",
        targetId: "33333333-3333-4333-8333-333333333333",
        files: ["รูปตกค้าง.webp"],
        attemptCount: 1,
        message: "ลบรูปไม่สำเร็จ",
      },
    });

    render(await StructurePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("cleanup-banner")).not.toBeNull();
    expect(screen.getByTestId("document-list")).not.toBeNull();
  });
});
