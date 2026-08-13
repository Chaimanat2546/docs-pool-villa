import { beforeEach, describe, expect, it, vi } from "vitest";

const { clientSectionMode, loadAdminExplorerData } = vi.hoisted(() => ({
  clientSectionMode: vi.fn(() => {
    throw new Error("Cannot call a Client Component export from the server");
  }),
  loadAdminExplorerData: vi.fn(),
}));

vi.mock("@/components/admin/explorer/section-panel", () => ({
  SectionPanel: () => null,
  sectionMode: clientSectionMode,
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

describe("StructurePage server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAdminExplorerData.mockResolvedValue(explorer);
  });

  it("parses supported modes on the server without calling a Client Component export", async () => {
    const page = await StructurePage({ searchParams: Promise.resolve({ section: sectionId, mode: "edit" }) });

    expect(page.props.selectedSectionId).toBe(sectionId);
    expect(page.props.mode).toBe("edit");
    expect(clientSectionMode).not.toHaveBeenCalled();
  });

  it("falls back to view for unsupported or array modes on the server", async () => {
    const unsupported = await StructurePage({ searchParams: Promise.resolve({ mode: "remove" }) });
    const arrayMode = await StructurePage({ searchParams: Promise.resolve({ mode: ["edit"] }) });

    expect(unsupported.props.mode).toBe("view");
    expect(arrayMode.props.mode).toBe("view");
    expect(clientSectionMode).not.toHaveBeenCalled();
  });
});
