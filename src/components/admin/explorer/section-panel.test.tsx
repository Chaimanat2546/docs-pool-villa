/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminExplorerData } from "@/lib/docs/admin-explorer-server";

import { SectionPanel } from "./section-panel";

const { deleteSection, getDeletePreview, refresh, replace, retrySectionMediaOperation, saveSection } = vi.hoisted(() => ({
  deleteSection: vi.fn(),
  getDeletePreview: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  retrySectionMediaOperation: vi.fn(),
  saveSection: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));
vi.mock("@/app/admin/(content)/structure/actions", () => ({
  deleteSection,
  getDeletePreview,
  retrySectionMediaOperation,
  saveSection,
}));

const rootId = "11111111-1111-4111-8111-111111111111";
const childId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";

const explorer: AdminExplorerData = {
  sections: [
    {
      id: rootId,
      parentId: null,
      title: "เริ่มต้น",
      slug: "getting-started",
      isPublished: true,
      sortOrder: 0,
      directDocumentCount: 1,
    },
    {
      id: childId,
      parentId: rootId,
      title: "การจอง",
      slug: "booking",
      isPublished: true,
      sortOrder: 0,
      directDocumentCount: 1,
    },
  ],
  documents: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      sectionId: childId,
      title: "วิธีจองพูลวิลล่า",
      slug: "how-to-book",
      status: "draft",
      updatedAt: "2026-08-14T00:00:00.000Z",
      sortOrder: 0,
      version: 1,
    },
  ],
  pendingSectionOperations: [],
  cleanupOperation: null,
};

function withPendingOperation(): AdminExplorerData {
  return {
    ...explorer,
    pendingSectionOperations: [{
      operationId,
      kind: "section_delete",
      targetId: childId,
      files: ["ภาพการจอง.webp"],
      attemptCount: 1,
      message: "ลบรูปไม่สำเร็จ",
    }],
  };
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SectionPanel", () => {
  it("routes root and child creation into focused inline modes", () => {
    const { rerender } = render(<SectionPanel selectedSectionId={rootId} mode="view" explorer={explorer} />);

    expect(screen.getByRole("link", { name: "เพิ่มหมวดหลัก" }).getAttribute("href")).toBe("/admin/structure?mode=create-root");
    expect(screen.getByRole("link", { name: "เพิ่มหมวดย่อย" }).getAttribute("href")).toBe(`/admin/structure?section=${rootId}&mode=create-child`);

    rerender(<SectionPanel selectedSectionId={rootId} mode="create-child" explorer={explorer} />);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "ชื่อหมวด" }));
    expect(screen.getByText(/หมวดแม่:/).textContent).toContain("เริ่มต้น");
  });

  it("prefills new root and child sections after their own highest sibling order", async () => {
    const user = userEvent.setup();
    const explorerWithSiblings: AdminExplorerData = {
      ...explorer,
      sections: [
        ...explorer.sections,
        {
          id: "55555555-5555-4555-8555-555555555555",
          parentId: null,
          title: "หมวดหลักอีกหมวด",
          slug: "another-root",
          isPublished: true,
          sortOrder: 5,
          directDocumentCount: 0,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          parentId: rootId,
          title: "หมวดย่อยอีกหมวด",
          slug: "another-child",
          isPublished: true,
          sortOrder: 8,
          directDocumentCount: 0,
        },
      ],
    };
    const { rerender } = render(<SectionPanel selectedSectionId={null} mode="create-root" explorer={explorerWithSiblings} />);

    await user.click(screen.getByText("ตั้งค่าเพิ่มเติม"));
    expect((screen.getByRole("spinbutton", { name: "ลำดับ" }) as HTMLInputElement).value).toBe("6");

    rerender(<SectionPanel selectedSectionId={rootId} mode="create-child" explorer={explorerWithSiblings} />);
    await user.click(screen.getByText("ตั้งค่าเพิ่มเติม"));
    expect((screen.getByRole("spinbutton", { name: "ลำดับ" }) as HTMLInputElement).value).toBe("9");
  });

  it("prefills a new root section with zero when no root siblings exist", async () => {
    const user = userEvent.setup();
    render(<SectionPanel selectedSectionId={null} mode="create-root" explorer={{ ...explorer, sections: [], documents: [] }} />);

    await user.click(screen.getByText("ตั้งค่าเพิ่มเติม"));
    expect((screen.getByRole("spinbutton", { name: "ลำดับ" }) as HTMLInputElement).value).toBe("0");
  });

  it("disables third-level creation with a visible explanation", () => {
    render(<SectionPanel selectedSectionId={childId} mode="view" explorer={explorer} />);

    const createChild = screen.getByRole("button", { name: "เพิ่มหมวดย่อย" }) as HTMLButtonElement;
    expect(createChild.disabled).toBe(true);
    const explanationId = createChild.getAttribute("aria-describedby");
    expect(explanationId).not.toBeNull();
    expect(document.getElementById(explanationId ?? "")?.textContent).toBe("รองรับหมวดไม่เกิน 2 ระดับ");
  });

  it("does not render the retired section-details card when a section is selected", () => {
    render(<SectionPanel selectedSectionId={childId} mode="view" explorer={explorer} />);

    expect(screen.queryByRole("heading", { name: "รายละเอียดหมวด" })).toBeNull();
  });

  it("allows long Thai section titles to shrink and wrap without widening the workspace", () => {
    const longTitle = "การตั้งค่าการรับชำระเงินและการแจ้งเตือนสำหรับผู้ดูแลพูลวิลล่าที่มีชื่อหมวดยาวมาก";
    render(<SectionPanel
      selectedSectionId={childId}
      mode="view"
      explorer={{
        ...explorer,
        sections: explorer.sections.map((section) => section.id === childId ? { ...section, title: longTitle } : section),
      }}
    />);

    const heading = screen.getByRole("heading", { name: longTitle });
    expect(heading.className).toContain("break-words");
    expect(heading.parentElement?.className).toContain("min-w-0");
  });

  it("links rename to edit mode and prefills the selected child", () => {
    const { rerender } = render(<SectionPanel selectedSectionId={childId} mode="view" explorer={explorer} />);

    expect(screen.getByRole("link", { name: "เปลี่ยนชื่อและตั้งค่า" }).getAttribute("href")).toBe(`/admin/structure?section=${childId}&mode=edit`);
    rerender(<SectionPanel selectedSectionId={childId} mode="edit" explorer={explorer} />);
    expect((screen.getByRole("textbox", { name: "ชื่อหมวด" }) as HTMLInputElement).value).toBe("การจอง");
  });

  it.each([
    { mode: "create-root" as const, selectedSectionId: null, triggerName: "เพิ่มหมวดหลัก", cancelHref: "/admin/structure" },
    { mode: "create-child" as const, selectedSectionId: rootId, triggerName: "เพิ่มหมวดย่อย", cancelHref: `/admin/structure?section=${rootId}` },
    { mode: "edit" as const, selectedSectionId: childId, triggerName: "เปลี่ยนชื่อและตั้งค่า", cancelHref: `/admin/structure?section=${childId}` },
  ])("returns focus to the exact $triggerName trigger when cancel removes URL mode", async ({ mode, selectedSectionId, triggerName, cancelHref }) => {
    const user = userEvent.setup();
    render(<SectionPanel selectedSectionId={selectedSectionId} mode={mode} explorer={explorer} />);
    const trigger = screen.getByRole("link", { name: triggerName });

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(replace).toHaveBeenCalledWith(cancelHref);
    expect(document.activeElement).toBe(trigger);
  });

  it("previews deletion, requires the exact name, retains pending media work, and retries", async () => {
    const user = userEvent.setup();
    getDeletePreview.mockResolvedValue({
      childSectionCount: 0,
      documentCount: 1,
      mediaCount: 1,
      documentTitles: ["วิธีจองพูลวิลล่า"],
    });
    deleteSection.mockResolvedValue({
      pending: true,
      operation: {
        operationId,
        kind: "section_delete",
        targetId: childId,
        files: ["ภาพการจอง.webp"],
        attemptCount: 1,
        message: "ลบรูปไม่สำเร็จ",
      },
    });
    retrySectionMediaOperation.mockResolvedValue({ success: true, kind: "section_delete", targetId: childId });
    render(<SectionPanel selectedSectionId={childId} mode="view" explorer={explorer} />);

    await user.click(screen.getByRole("button", { name: "ลบหมวด" }));
    const dialog = await screen.findByRole("dialog", { name: "ยืนยันการลบหมวด" });
    expect(within(dialog).getByText("วิธีจองพูลวิลล่า")).not.toBeNull();
    const permanentDelete = await within(dialog).findByRole("button", { name: "ลบถาวร" });
    expect((permanentDelete as HTMLButtonElement).disabled).toBe(true);
    await user.type(within(dialog).getByRole("textbox", { name: /พิมพ์.*การจอง.*เพื่อยืนยัน/ }), "การจอง");
    expect((permanentDelete as HTMLButtonElement).disabled).toBe(false);
    await user.click(permanentDelete);

    expect(await screen.findByText("ภาพการจอง.webp")).not.toBeNull();
    expect(screen.getByRole("link", { name: "เพิ่มหมวดหลัก" }).getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByRole("button", { name: "ลองลบรูปอีกครั้ง" }));
    await waitFor(() => expect(retrySectionMediaOperation).toHaveBeenCalledWith(operationId));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("starts fail-closed while a section media operation remains pending", () => {
    render(<SectionPanel selectedSectionId={childId} mode="view" explorer={withPendingOperation()} />);

    expect((screen.getByRole("button", { name: "เพิ่มหมวดย่อย" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "เปลี่ยนชื่อและตั้งค่า" }).getAttribute("aria-disabled")).toBe("true");
    expect((screen.getByRole("button", { name: "ลบหมวด" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("ภาพการจอง.webp")).not.toBeNull();
  });

  it("keeps the selected section and explains a failed deletion", async () => {
    const user = userEvent.setup();
    getDeletePreview.mockResolvedValue({ childSectionCount: 0, documentCount: 0, mediaCount: 0, documentTitles: [] });
    deleteSection.mockResolvedValue({ error: "ลบหมวดไม่สำเร็จ กรุณาลองอีกครั้ง" });
    render(<SectionPanel selectedSectionId={childId} mode="view" explorer={explorer} />);

    await user.click(screen.getByRole("button", { name: "ลบหมวด" }));
    const dialog = await screen.findByRole("dialog", { name: "ยืนยันการลบหมวด" });
    await user.type(within(dialog).getByRole("textbox", { name: /พิมพ์.*การจอง.*เพื่อยืนยัน/ }), "การจอง");
    await user.click(within(dialog).getByRole("button", { name: "ลบถาวร" }));

    expect((await within(dialog).findByRole("alert")).textContent).toContain("ลบหมวดไม่สำเร็จ กรุณาลองอีกครั้ง");
    await user.click(within(dialog).getByRole("button", { name: "ยกเลิก" }));
    expect(screen.getByRole("heading", { name: "การจอง" })).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
