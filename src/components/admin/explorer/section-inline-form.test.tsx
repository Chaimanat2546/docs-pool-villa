/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { SectionInlineForm } from "./section-inline-form";

const { refresh, replace, saveSection } = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  saveSection: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));
vi.mock("@/app/admin/(content)/structure/actions", () => ({ saveSection }));

const root: AdminExplorerSection = {
  id: "11111111-1111-4111-8111-111111111111",
  parentId: null,
  title: "เริ่มต้น",
  slug: "getting-started",
  isPublished: true,
  sortOrder: 2,
  directDocumentCount: 1,
};

const child: AdminExplorerSection = {
  id: "22222222-2222-4222-8222-222222222222",
  parentId: root.id,
  title: "การจอง",
  slug: "booking",
  isPublished: false,
  sortOrder: 3,
  directDocumentCount: 2,
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SectionInlineForm", () => {
  it("focuses the title when root creation opens and keeps values beside a failed save message", async () => {
    const user = userEvent.setup();
    saveSection.mockResolvedValue({ error: "Slug หรือ Route นี้ถูกใช้งานแล้ว" });
    render(<SectionInlineForm mode="create-root" section={null} parent={null} rootSections={[root]} onCancel={vi.fn()} />);

    const title = screen.getByRole("textbox", { name: "ชื่อหมวด" }) as HTMLInputElement;
    expect(document.activeElement).toBe(title);
    await user.type(title, "การชำระเงิน");
    await user.type(screen.getByRole("textbox", { name: "Slug" }), "payment");
    await user.click(screen.getByRole("button", { name: "บันทึกหมวด" }));

    const form = screen.getByRole("form", { name: "สร้างหมวดหลัก" });
    expect(within(form).getByRole("alert").textContent).toContain("Slug หรือ Route นี้ถูกใช้งานแล้ว");
    expect(title.value).toBe("การชำระเงิน");
    expect((screen.getByRole("textbox", { name: "Slug" }) as HTMLInputElement).value).toBe("payment");
  });

  it("identifies and fixes the selected parent for child creation", () => {
    render(<SectionInlineForm mode="create-child" section={null} parent={root} rootSections={[root]} onCancel={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "ชื่อหมวด" }));
    expect(screen.getByText(/หมวดแม่:/).textContent).toContain(root.title);
    expect(screen.queryByRole("combobox", { name: "หมวดแม่" })).toBeNull();
  });

  it("replaces the URL with the saved section id and refreshes", async () => {
    const user = userEvent.setup();
    saveSection.mockResolvedValue({ success: true, id: child.id });
    render(<SectionInlineForm mode="create-child" section={null} parent={root} rootSections={[root]} onCancel={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: "ชื่อหมวด" }), child.title);
    await user.type(screen.getByRole("textbox", { name: "Slug" }), child.slug);
    await user.click(screen.getByRole("button", { name: "บันทึกหมวด" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/admin/structure?section=${child.id}`));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("prefills every active field for rename and editing without a description field", () => {
    render(<SectionInlineForm mode="edit" section={child} parent={root} rootSections={[root]} onCancel={vi.fn()} />);

    expect((screen.getByRole("textbox", { name: "ชื่อหมวด" }) as HTMLInputElement).value).toBe(child.title);
    expect((screen.getByRole("textbox", { name: "Slug" }) as HTMLInputElement).value).toBe(child.slug);
    expect(screen.queryByRole("textbox", { name: "คำอธิบาย" })).toBeNull();
    expect((screen.getByRole("spinbutton", { name: "ลำดับ" }) as HTMLInputElement).value).toBe(String(child.sortOrder));
    expect((screen.getByRole("checkbox", { name: /แสดงหมวดนี้/ }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("combobox", { name: "หมวดแม่" }) as HTMLSelectElement).value).toBe(root.id);
  });
});
