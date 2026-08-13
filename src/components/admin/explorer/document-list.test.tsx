/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UnsavedNavigationProvider } from "@/components/admin/unsaved-navigation";
import type { AdminExplorerDocument, AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { DocumentList } from "./document-list";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const sections: AdminExplorerSection[] = [
  {
    id: "root",
    parentId: null,
    title: "เริ่มต้น",
    slug: "getting-started",
    description: null,
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 1,
  },
  {
    id: "child",
    parentId: "root",
    title: "การจอง",
    slug: "booking",
    description: null,
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 3,
  },
  {
    id: "empty",
    parentId: "root",
    title: "การชำระเงิน",
    slug: "payment",
    description: null,
    isPublished: true,
    sortOrder: 1,
    directDocumentCount: 0,
  },
];

const documents: AdminExplorerDocument[] = [
  {
    id: "overview",
    sectionId: "root",
    title: "ภาพรวม",
    slug: "overview",
    status: "published",
    updatedAt: "2026-08-12T12:00:00.000Z",
    sortOrder: 0,
    version: 1,
  },
  {
    id: "create-booking",
    sectionId: "child",
    title: "สร้างการจอง",
    slug: "create-booking",
    status: "draft",
    updatedAt: "2026-08-13T12:00:00.000Z",
    sortOrder: 0,
    version: 1,
  },
  {
    id: "edit-booking",
    sectionId: "child",
    title: "แก้ไขการจอง",
    slug: "edit-booking",
    status: "published",
    updatedAt: "2026-08-13T13:00:00.000Z",
    sortOrder: 1,
    version: 2,
  },
  {
    id: "old-booking",
    sectionId: "child",
    title: "วิธีจองแบบเดิม",
    slug: "old-booking",
    status: "archived",
    updatedAt: "2026-08-13T14:00:00.000Z",
    sortOrder: 2,
    version: 3,
  },
];

function renderList(selectedSectionId: string | null, sourceDocuments = documents) {
  return render(
    <UnsavedNavigationProvider>
      <DocumentList documents={sourceDocuments} sections={sections} selectedSectionId={selectedSectionId} />
    </UnsavedNavigationProvider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DocumentList", () => {
  it("shows only direct documents for a selected section", () => {
    renderList("child");

    expect(screen.getByRole("link", { name: /แก้ไข สร้างการจอง/ })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /แก้ไข ภาพรวม/ })).toBeNull();
  });

  it("shows all documents and their section paths at the virtual root", () => {
    renderList(null);

    expect(screen.getAllByText("เริ่มต้น › การจอง")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /แก้ไข ภาพรวม/ })).not.toBeNull();
  });

  it("distinguishes an empty folder from empty search results", async () => {
    const user = userEvent.setup();
    const { rerender } = renderList("empty");

    expect(screen.getByText("หมวดนี้ยังไม่มีเอกสาร")).not.toBeNull();

    rerender(
      <UnsavedNavigationProvider>
        <DocumentList documents={documents} sections={sections} selectedSectionId="child" />
      </UnsavedNavigationProvider>,
    );
    await user.type(screen.getByRole("searchbox", { name: "ค้นหาเอกสารในหมวดนี้" }), "ไม่พบ");
    expect(screen.getByText("ไม่พบเอกสารที่ตรงกับการค้นหา")).not.toBeNull();
  });

  it("distinguishes an empty status filter from an empty section", async () => {
    const user = userEvent.setup();
    renderList("child", documents.filter((document) => document.status === "draft"));

    await user.selectOptions(screen.getByRole("combobox", { name: "กรองตามสถานะ" }), "published");

    expect(screen.getByText("ไม่พบเอกสารที่ตรงกับสถานะที่เลือก")).not.toBeNull();
    expect(screen.queryByText("หมวดนี้ยังไม่มีเอกสาร")).toBeNull();
  });

  it("filters by status and keeps Thai text labels visible", async () => {
    const user = userEvent.setup();
    renderList("child");

    const list = screen.getByRole("list", { name: "รายการเอกสาร" });
    expect(within(list).getByText("ฉบับร่าง")).not.toBeNull();
    expect(within(list).getByText("เผยแพร่แล้ว")).not.toBeNull();
    expect(within(list).getByText("เก็บถาวร")).not.toBeNull();

    await user.selectOptions(screen.getByRole("combobox", { name: "กรองตามสถานะ" }), "published");
    expect(screen.getByRole("link", { name: /แก้ไข แก้ไขการจอง/ })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /แก้ไข สร้างการจอง/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /แก้ไข วิธีจองแบบเดิม/ })).toBeNull();
  });

  it("offers contextual create, edit, and preview actions with 44px targets", () => {
    renderList("child");

    expect(screen.getByRole("link", { name: "สร้างเอกสารในหมวดนี้" }).getAttribute("href"))
      .toBe("/admin/documents/new?section=child");

    const edit = screen.getByRole("link", { name: "แก้ไข สร้างการจอง" });
    const preview = screen.getByRole("link", { name: "ดูตัวอย่าง สร้างการจอง" });
    expect(edit.getAttribute("href")).toBe("/admin/documents/create-booking?section=child");
    expect(preview.getAttribute("href")).toBe("/admin/documents/create-booking?section=child&stage=review");
    expect(preview.getAttribute("target")).toBeNull();
    expect(edit.className).toContain("min-h-11");
    expect(preview.className).toContain("min-h-11");
  });

  it("requires a real section before showing the create action", () => {
    renderList(null);

    expect(screen.queryByRole("link", { name: "สร้างเอกสารในหมวดนี้" })).toBeNull();
    expect(screen.getByText("เลือกหมวดจากรายการด้านซ้ายก่อนสร้างเอกสาร")).not.toBeNull();
  });

  it("contains long titles, section paths, and slugs inside the responsive pane", () => {
    const longTitle = "วิธีจัดการการจองพูลวิลล่าสำหรับคำขอพิเศษที่มีรายละเอียดภาษาไทยยาวมาก";
    const longSlug = "create-a-booking-with-a-very-long-descriptive-slug-that-must-not-overflow-the-page";
    const longSectionTitle = "การจัดการคำขอพิเศษและการชำระเงินที่มีชื่อหมวดยาวมาก";
    renderList(null, [{
      ...documents[0],
      sectionId: "child",
      title: longTitle,
      slug: longSlug,
    }]);

    const list = screen.getByRole("list", { name: "รายการเอกสาร" });
    const title = within(list).getByRole("heading", { name: longTitle });
    expect(title.className).toContain("truncate");
    expect(title.closest("div.min-w-0")).not.toBeNull();
    expect(within(list).getByText(longSlug).className).toContain("break-all");

    const view = render(
      <UnsavedNavigationProvider>
        <DocumentList
          documents={[{ ...documents[0], sectionId: "empty" }]}
          sections={sections.map((section) => section.id === "empty" ? { ...section, title: longSectionTitle } : section)}
          selectedSectionId={null}
        />
      </UnsavedNavigationProvider>,
    );
    expect(within(view.container).getByText(`เริ่มต้น › ${longSectionTitle}`).className).toContain("break-words");
  });
});
