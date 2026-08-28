/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UnsavedNavigationProvider } from "@/components/admin/unsaved-navigation";
import type { AdminExplorerDocument, AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { DocumentList } from "./document-list";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("./document-reorder-list", () => ({
  DocumentReorderList: ({
    documents: reorderedDocuments,
    onCancel,
    onSaved,
  }: {
    documents: AdminExplorerDocument[];
    onCancel: () => void;
    onSaved: () => void;
  }) => (
    <div>
      <p data-testid="reorder-document-ids">{reorderedDocuments.map((document) => document.id).join(",")}</p>
      <button type="button" onClick={onCancel}>ยกเลิกการจัดลำดับจำลอง</button>
      <button type="button" onClick={onSaved}>บันทึกลำดับจำลอง</button>
    </div>
  ),
}));

const sections: AdminExplorerSection[] = [
  {
    id: "root",
    parentId: null,
    title: "เริ่มต้น",
    slug: "getting-started",
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 1,
  },
  {
    id: "child",
    parentId: "root",
    title: "การจอง",
    slug: "booking",
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 3,
  },
  {
    id: "empty",
    parentId: "root",
    title: "การชำระเงิน",
    slug: "payment",
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

const sevenBookingDocuments: AdminExplorerDocument[] = Array.from({ length: 7 }, (_, index) => ({
  ...documents[1],
  id: `booking-${index + 1}`,
  title: `เอกสารการจอง ${index + 1}`,
  slug: `booking-${index + 1}`,
  sortOrder: index,
  status: index === 6 ? "published" : "draft",
}));

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

    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(3);
    expect(screen.queryByRole("link", { name: /แก้ไข สร้างการจอง/ })).toBeNull();
  });

  it("shows all documents and their section paths at the virtual root", () => {
    renderList(null);

    expect(screen.getAllByText("เริ่มต้น › การจอง")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(4);
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
    expect(screen.getByRole("link", { name: "แก้ไข" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /แก้ไข แก้ไขการจอง/ })).toBeNull();
  });

  it("paginates filtered documents four at a time and returns to the first page when filters change", async () => {
    const user = userEvent.setup();
    renderList("child", sevenBookingDocuments);

    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(4);
    expect(screen.getByText("หน้า 1 จาก 2")).not.toBeNull();
    expect(screen.queryByText("เอกสารการจอง 6")).toBeNull();

    await user.click(screen.getByRole("button", { name: "หน้าถัดไป" }));
    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(3);
    expect(screen.getByText("เอกสารการจอง 6")).not.toBeNull();
    expect(screen.getByText("หน้า 2 จาก 2")).not.toBeNull();

    await user.selectOptions(screen.getByRole("combobox", { name: "กรองตามสถานะ" }), "draft");
    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(4);
    expect(screen.getByText("หน้า 1 จาก 2")).not.toBeNull();
    expect(screen.queryByText("เอกสารการจอง 6")).toBeNull();
  });

  it("scrolls to the document list when changing pages", async () => {
    const user = userEvent.setup();
    renderList("child", sevenBookingDocuments);
    const documentList = screen.getByRole("region", { name: "เอกสารในหมวด" });
    const scrollIntoView = vi.fn();
    Object.defineProperty(documentList, "scrollIntoView", { value: scrollIntoView });

    await user.click(screen.getByRole("button", { name: "หน้าถัดไป" }));

    expect(screen.getByText("หน้า 2 จาก 2")).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("enters reorder mode with every direct document while normal mode remains paginated", async () => {
    const user = userEvent.setup();
    renderList("child", sevenBookingDocuments);

    expect(screen.getAllByRole("link", { name: "แก้ไข" })).toHaveLength(4);
    expect(screen.getByText("หน้า 1 จาก 2")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "จัดลำดับเอกสาร" }));

    expect(screen.getByTestId("reorder-document-ids").textContent).toBe(
      "booking-1,booking-2,booking-3,booking-4,booking-5,booking-6,booking-7",
    );
    expect(screen.queryByRole("navigation", { name: "แบ่งหน้าเอกสาร" })).toBeNull();
  });

  it("does not offer reorder at the virtual root", () => {
    renderList(null, sevenBookingDocuments);

    expect(screen.queryByRole("button", { name: "จัดลำดับเอกสาร" })).toBeNull();
  });

  it("disables reorder while filtering and explains why", async () => {
    const user = userEvent.setup();
    renderList("child", sevenBookingDocuments);

    await user.type(screen.getByRole("searchbox", { name: "ค้นหาเอกสารในหมวดนี้" }), "1");
    expect((screen.getByRole("button", { name: "จัดลำดับเอกสาร" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("ล้างการค้นหาหรือตัวกรองก่อนจัดลำดับเอกสาร")).not.toBeNull();

    await user.clear(screen.getByRole("searchbox", { name: "ค้นหาเอกสารในหมวดนี้" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "กรองตามสถานะ" }), "draft");
    expect((screen.getByRole("button", { name: "จัดลำดับเอกสาร" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("ล้างการค้นหาหรือตัวกรองก่อนจัดลำดับเอกสาร")).not.toBeNull();
  });

  it("disables reorder when the selected section has fewer than two documents", () => {
    renderList("child", [documents[1]]);

    expect((screen.getByRole("button", { name: "จัดลำดับเอกสาร" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("หมวดนี้ต้องมีเอกสารอย่างน้อย 2 รายการจึงจะจัดลำดับได้")).not.toBeNull();
  });

  it("restores the existing page when reorder is cancelled or saved", async () => {
    const user = userEvent.setup();
    renderList("child", sevenBookingDocuments);

    await user.click(screen.getByRole("button", { name: "หน้าถัดไป" }));
    expect(screen.getByText("หน้า 2 จาก 2")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "จัดลำดับเอกสาร" }));
    await user.click(screen.getByRole("button", { name: "ยกเลิกการจัดลำดับจำลอง" }));
    expect(screen.getByText("หน้า 2 จาก 2")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "จัดลำดับเอกสาร" }));
    await user.click(screen.getByRole("button", { name: "บันทึกลำดับจำลอง" }));
    expect(screen.getByText("หน้า 2 จาก 2")).not.toBeNull();
  });

  it("offers contextual create, edit, and status actions with 44px targets", () => {
    renderList("child", [documents[1]]);

    expect(screen.getByRole("link", { name: "สร้างเอกสารในหมวดนี้" }).getAttribute("href"))
      .toBe("/admin/documents/new?section=child");

    const edit = screen.getByRole("link", { name: "แก้ไข" });
    const status = screen.getByRole("link", { name: "แก้ไขสถานะ" });
    expect(screen.queryByRole("link", { name: /สร้างการจอง/ })).toBeNull();
    expect(edit.getAttribute("href")).toBe("/admin/documents/create-booking?section=child");
    expect(status.getAttribute("href")).toBe("/admin/documents/create-booking?section=child&stage=review");
    expect(edit.className).toContain("min-h-11");
    expect(status.className).toContain("min-h-11");
  });

  it("requires a real section before showing the create action", () => {
    renderList(null);

    expect(screen.queryByRole("link", { name: "สร้างเอกสารในหมวดนี้" })).toBeNull();
    expect(screen.getByText("เลือกหมวดจากรายการด้านซ้ายก่อนสร้างเอกสาร")).not.toBeNull();
  });

  it("contains long titles and section paths inside the responsive pane", () => {
    const longTitle = "วิธีจัดการการจองพูลวิลล่าสำหรับคำขอพิเศษที่มีรายละเอียดภาษาไทยยาวมาก";
    const longSectionTitle = "การจัดการคำขอพิเศษและการชำระเงินที่มีชื่อหมวดยาวมาก";
    renderList(null, [{
      ...documents[0],
      sectionId: "child",
      title: longTitle,
      slug: "create-a-booking-with-a-very-long-descriptive-slug-that-must-not-overflow-the-page",
    }]);

    const list = screen.getByRole("list", { name: "รายการเอกสาร" });
    const title = within(list).getByRole("heading", { name: longTitle });
    expect(title.className).toContain("truncate");
    expect(title.closest("div.min-w-0")).not.toBeNull();

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
