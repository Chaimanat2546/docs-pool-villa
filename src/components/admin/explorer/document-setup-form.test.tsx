/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

const { createDocumentDraft, replace } = vi.hoisted(() => ({
  createDocumentDraft: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/app/admin/(content)/documents/actions", () => ({ createDocumentDraft }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { DocumentSetupForm } from "./document-setup-form";

const documentId = "11111111-1111-4111-8111-111111111111";
const rootId = "22222222-2222-4222-8222-222222222222";
const sectionId = "33333333-3333-4333-8333-333333333333";
const sections: AdminExplorerSection[] = [
  {
    id: rootId,
    parentId: null,
    title: "เริ่มต้น",
    slug: "getting-started",
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 0,
  },
  {
    id: sectionId,
    parentId: rootId,
    title: "การจอง",
    slug: "booking",
    isPublished: true,
    sortOrder: 0,
    directDocumentCount: 0,
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(documentId as `${string}-${string}-${string}-${string}-${string}`);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DocumentSetupForm", () => {
  it("shows the three-step document workflow with setup as the current step", () => {
    render(<DocumentSetupForm sections={sections} selectedSectionId={sectionId} />);

    const workflow = screen.getByRole("list", { name: "ขั้นตอนจัดทำเอกสาร" });
    const page = screen.getByRole("main");
    expect(workflow.textContent).toContain("1. ข้อมูลเอกสาร");
    expect(workflow.textContent).toContain("2. เขียนเนื้อหา");
    expect(workflow.textContent).toContain("3. ตรวจและเผยแพร่");
    expect(screen.getByText("1. ข้อมูลเอกสาร").closest("li")?.getAttribute("aria-current")).toBe("step");
    expect(page.className).toContain("max-w-6xl");
    expect(page.className).toContain("py-8");
  });

  it("shows the explicit section path and focuses the title field", async () => {
    render(<DocumentSetupForm sections={sections} selectedSectionId={sectionId} />);

    expect(screen.getByText("เริ่มต้น › การจอง", { selector: "span" })).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "ชื่อเอกสาร" })).toBe(document.activeElement));
  });

  it("uses a changed section for draft creation and opens the selected context", async () => {
    const user = userEvent.setup();
    createDocumentDraft.mockResolvedValue({ success: true, id: documentId, version: 1, path: "/getting-started/new-doc" });
    render(<DocumentSetupForm sections={sections} selectedSectionId={sectionId} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "หมวดเอกสาร" }), rootId);
    await user.type(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }), "เอกสารใหม่");
    await user.type(screen.getByRole("textbox", { name: "Slug" }), "new-doc");
    await user.click(screen.getByRole("button", { name: "สร้างฉบับร่างและเขียนต่อ" }));

    await waitFor(() => expect(createDocumentDraft).toHaveBeenCalledWith({
      id: documentId,
      sectionId: rootId,
      title: "เอกสารใหม่",
      slug: "new-doc",
    }));
    expect(replace).toHaveBeenCalledWith(`/admin/documents/${documentId}?section=${rootId}&stage=content`);
  });

  it("shows a pending label and prevents duplicate submissions", async () => {
    const result = deferred<{ success: true; id: string; version: number; path: string }>();
    createDocumentDraft.mockReturnValue(result.promise);
    render(<DocumentSetupForm sections={sections} selectedSectionId={sectionId} />);

    await userEvent.type(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }), "เอกสารใหม่");
    await userEvent.type(screen.getByRole("textbox", { name: "Slug" }), "new-doc");
    const form = screen.getByRole("form", { name: "ข้อมูลเอกสาร" });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(screen.getByRole("button", { name: "กำลังสร้างฉบับร่าง" }).hasAttribute("disabled")).toBe(true);
    expect(createDocumentDraft).toHaveBeenCalledTimes(1);

    result.resolve({ success: true, id: documentId, version: 1, path: "/getting-started/booking/new-doc" });
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });

  it("preserves entered values and section selection when creation fails", async () => {
    const user = userEvent.setup();
    createDocumentDraft.mockResolvedValue({ error: "Slug นี้ถูกใช้แล้ว" });
    render(<DocumentSetupForm sections={sections} selectedSectionId={sectionId} />);

    await user.type(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }), "เอกสารใหม่");
    await user.type(screen.getByRole("textbox", { name: "Slug" }), "new-doc");
    await user.click(screen.getByRole("button", { name: "สร้างฉบับร่างและเขียนต่อ" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Slug นี้ถูกใช้แล้ว");
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "ชื่อเอกสาร" }).value).toBe("เอกสารใหม่");
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Slug" }).value).toBe("new-doc");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "หมวดเอกสาร" }).value).toBe(sectionId);
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps long selected paths inside the responsive setup pane and preserves 44px actions", () => {
    const longTitle = "การตั้งค่าการจองและการรับชำระเงินสำหรับผู้ดูแลที่มีชื่อหมวดยาวมาก";
    render(
      <DocumentSetupForm
        sections={sections.map((section) => section.id === sectionId ? { ...section, title: longTitle } : section)}
        selectedSectionId={sectionId}
      />,
    );

    const page = screen.getByRole("main");
    expect(page.className).toContain("min-w-0");
    expect(page.className).toContain("w-full");
    expect(screen.getByText(`เริ่มต้น › ${longTitle}`, { selector: "span" }).className).toContain("break-words");
    expect(screen.getByRole("link", { name: "ยกเลิก" }).className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "สร้างฉบับร่างและเขียนต่อ" }).className).toContain("min-h-11");
  });
});
