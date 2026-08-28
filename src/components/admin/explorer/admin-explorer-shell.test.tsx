/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { UnsavedNavigationProvider, useUnsavedNavigation } from "@/components/admin/unsaved-navigation";
import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";
import type { AdminExplorerData } from "@/lib/docs/admin-explorer-server";

import ContentError from "@/app/admin/(content)/error";
import ContentLoading from "@/app/admin/(content)/loading";

import { AdminExplorerShell, AdminExplorerTree } from "./admin-explorer-shell";
import { SectionPanel } from "./section-panel";

const { deleteSection, getDeletePreview, push, refresh, replace, retrySectionMediaOperation, saveSection, sectionQuery } = vi.hoisted(() => ({
  deleteSection: vi.fn(),
  getDeletePreview: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  retrySectionMediaOperation: vi.fn(),
  saveSection: vi.fn(),
  sectionQuery: { value: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, replace }),
  useSearchParams: () => ({ get: (key: string) => key === "section" ? sectionQuery.value : null }),
}));
vi.mock("@/app/admin/(content)/structure/actions", () => ({
  deleteSection,
  getDeletePreview,
  retrySectionMediaOperation,
  saveSection,
}));

const sections: AdminExplorerSection[] = [
  {
    id: "root",
    parentId: null,
    title: "เริ่มต้น",
    slug: "start",
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
    directDocumentCount: 2,
  },
];

const explorer: AdminExplorerData = {
  sections,
  documents: [],
  pendingSectionOperations: [],
  cleanupOperation: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sectionQuery.value = null;
});

function DirtyRegistration({ dirty }: { dirty: boolean }) {
  const { registerDirty } = useUnsavedNavigation();

  useEffect(() => {
    registerDirty(dirty);
    return () => registerDirty(false);
  }, [dirty, registerDirty]);

  return null;
}

function ExplorerHarness({ dirty = false }: { dirty?: boolean }) {
  return (
    <UnsavedNavigationProvider>
      <DirtyRegistration dirty={dirty} />
      <AdminExplorerShell
        mobileTree={<AdminExplorerTree sections={sections} closeDrawer />}
        desktopTree={<AdminExplorerTree sections={sections} />}
      >
        <p>รายการเอกสาร</p>
      </AdminExplorerShell>
    </UnsavedNavigationProvider>
  );
}

function CreationHarness({ mode, selectedSectionId = null }: { mode: "view" | "create-root" | "create-child"; selectedSectionId?: string | null }) {
  return (
    <UnsavedNavigationProvider>
      <AdminExplorerShell
        mobileTree={<AdminExplorerTree sections={sections} closeDrawer />}
        desktopTree={<AdminExplorerTree sections={sections} />}
      >
        <SectionPanel selectedSectionId={selectedSectionId} mode={mode} explorer={explorer} />
      </AdminExplorerShell>
    </UnsavedNavigationProvider>
  );
}

it("traps mobile drawer focus and returns it to เลือกหมวด", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness />);

  const trigger = screen.getByRole("button", { name: "เลือกหมวด" });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).not.toBeNull();
  await user.keyboard("{Escape}");

  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("renders one mobile section trigger and constrains its modal drawer to the viewport", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness />);

  const triggers = screen.getAllByRole("button", { name: "เลือกหมวด" });
  expect(triggers).toHaveLength(1);
  expect(triggers[0].className).toContain("min-h-11");
  expect(triggers[0].parentElement?.className).toContain("xl:hidden");

  await user.click(triggers[0]);
  const drawer = screen.getByRole("dialog", { name: "หมวดคู่มือ" });
  expect(drawer.getAttribute("aria-modal")).toBe("true");
  expect(drawer.className).toContain("max-w-[calc(100vw-2rem)]");
  expect(within(drawer).getByRole("button", { name: "ปิดรายการหมวด" }).className).toContain("size-11");
});

it("provides a bounded desktop-only keyboard resize control", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness />);

  const slider = screen.getByRole("slider", { name: "ปรับความกว้างรายการหมวด" }) as HTMLInputElement;
  expect(slider.min).toBe("224");
  expect(slider.max).toBe("384");
  expect(slider.step).toBe("16");
  expect(slider.value).toBe("288");
  expect(slider.classList.contains("hidden")).toBe(true);
  expect(slider.classList.contains("xl:block")).toBe(true);
  expect(screen.getByRole("main").parentElement?.style.gridTemplateColumns).toBe("288px minmax(0,1fr)");
  expect(screen.getByRole("main").className).toContain("min-w-0");

  slider.focus();
  await user.keyboard("{ArrowRight}");
  expect(slider.value).toBe("304");
});

it("renders a stable right-pane loading state without duplicating the folder tree", () => {
  render(<ContentLoading />);

  const loading = screen.getByLabelText("กำลังโหลดพื้นที่จัดการเนื้อหา");
  expect(loading.getAttribute("aria-busy")).toBe("true");
  expect(screen.queryByRole("tree")).toBeNull();
  expect(loading.className).toContain("min-w-0");
});

it("renders a safe recoverable route error and resets exactly once", async () => {
  const user = userEvent.setup();
  const reset = vi.fn();
  render(<ContentError error={new Error("database-password-leak")} reset={reset} />);

  const alert = screen.getByRole("alert");
  expect(alert.textContent).toContain("โหลดพื้นที่จัดการเนื้อหาไม่สำเร็จ");
  expect(alert.textContent).not.toContain("database-password-leak");
  const retry = screen.getByRole("button", { name: "ลองใหม่" });
  expect(retry.className).toContain("min-h-11");
  await user.click(retry);
  expect(reset).toHaveBeenCalledOnce();
});

it("validates the requested section before marking a tree item selected", () => {
  sectionQuery.value = "missing";
  const { rerender } = render(<ExplorerHarness />);

  expect(screen.getAllByRole("treeitem").every((item) => item.getAttribute("aria-selected") === "false")).toBe(true);

  sectionQuery.value = "child";
  rerender(<ExplorerHarness />);

  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-selected")).toBe("true");
});

it("routes tree navigation through the App Router", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness />);

  await user.click(screen.getByRole("treeitem", { name: /เริ่มต้น/ }));

  expect(push).toHaveBeenCalledWith("/admin/structure?section=root");
});

it("keeps the mobile folder drawer and tree trigger mounted when dirty navigation is canceled with Escape", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness dirty />);

  await user.click(screen.getByRole("button", { name: "เลือกหมวด" }));
  const drawer = screen.getByRole("dialog", { name: "หมวดคู่มือ" });
  const sectionTrigger = within(drawer).getByRole("treeitem", { name: /เริ่มต้น/ });

  await user.click(sectionTrigger);
  expect(screen.getByRole("dialog", { name: "ออกจากหน้านี้หรือไม่" })).not.toBeNull();
  await user.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "ออกจากหน้านี้หรือไม่" })).toBeNull());
  expect(screen.getByRole("dialog", { name: "หมวดคู่มือ" })).toBe(drawer);
  expect(sectionTrigger.isConnected).toBe(true);
  await waitFor(() => expect(document.activeElement).toBe(sectionTrigger));
  expect(push).not.toHaveBeenCalled();
});

it("closes the mobile folder drawer after clean navigation is approved", async () => {
  const user = userEvent.setup();
  render(<ExplorerHarness />);

  await user.click(screen.getByRole("button", { name: "เลือกหมวด" }));
  const drawer = screen.getByRole("dialog", { name: "หมวดคู่มือ" });
  await user.click(within(drawer).getByRole("treeitem", { name: /เริ่มต้น/ }));

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "หมวดคู่มือ" })).toBeNull());
  expect(push).toHaveBeenCalledWith("/admin/structure?section=root");
});

it("returns cancel focus to the exact desktop sidebar creation action", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<CreationHarness mode="view" />);
  const desktopSidebar = screen.getByRole("complementary", { name: "หมวดคู่มือ" });
  const root = within(desktopSidebar).getByRole("treeitem", { name: /เริ่มต้น/ });
  await user.click(root.querySelector<HTMLElement>("[data-tree-disclosure]")!);
  const origin = within(desktopSidebar).getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" });

  await user.click(origin);
  expect(push).toHaveBeenCalledWith("/admin/structure?section=root&mode=create-child");
  sectionQuery.value = "root";
  rerender(<CreationHarness mode="create-child" selectedSectionId="root" />);
  await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

  expect(document.activeElement).toBe(origin);
});

it("uses the mobile drawer trigger as the safe cancel-focus fallback after creation closes the drawer", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<CreationHarness mode="view" />);
  const drawerTrigger = screen.getByRole("button", { name: "เลือกหมวด" });
  await user.click(drawerTrigger);
  const drawer = screen.getByRole("dialog", { name: "หมวดคู่มือ" });
  const origin = within(drawer).getByRole("button", { name: "สร้างหมวดหลัก" });

  await user.click(origin);
  await waitFor(() => expect(origin.isConnected).toBe(false));
  sectionQuery.value = null;
  rerender(<CreationHarness mode="create-root" />);
  await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

  expect(document.activeElement).toBe(drawerTrigger);
});

it("disables desktop and mobile creation actions immediately when deletion becomes pending", async () => {
  const user = userEvent.setup();
  getDeletePreview.mockResolvedValue({ childSectionCount: 1, documentCount: 0, mediaCount: 1, documentTitles: [] });
  deleteSection.mockResolvedValue({
    pending: true,
    operation: {
      operationId: "operation-1",
      kind: "section_delete",
      targetId: "root",
      files: ["pending.webp"],
      attemptCount: 1,
      message: "ลบรูปไม่สำเร็จ",
    },
  });
  sectionQuery.value = "root";
  render(<CreationHarness mode="view" selectedSectionId="root" />);

  await user.click(screen.getByRole("button", { name: "ลบหมวด" }));
  const dialog = await screen.findByRole("dialog", { name: "ยืนยันการลบหมวด" });
  await user.type(within(dialog).getByRole("textbox", { name: /พิมพ์.*เริ่มต้น.*เพื่อยืนยัน/ }), "เริ่มต้น");
  await user.click(within(dialog).getByRole("button", { name: "ลบถาวร" }));

  const desktopSidebar = screen.getByRole("complementary", { name: "หมวดคู่มือ" });
  await waitFor(() => expect((within(desktopSidebar).getByRole("button", { name: "สร้างหมวดหลัก" }) as HTMLButtonElement).disabled).toBe(true));
  await user.click(within(desktopSidebar).getByRole("treeitem", { name: /เริ่มต้น/ }).querySelector<HTMLElement>("[data-tree-disclosure]")!);
  expect((within(desktopSidebar).getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "เลือกหมวด" }));
  const mobileDrawer = screen.getByRole("dialog", { name: "หมวดคู่มือ" });
  expect((within(mobileDrawer).getByRole("button", { name: "สร้างหมวดหลัก" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(within(mobileDrawer).getByRole("treeitem", { name: /เริ่มต้น/ }).querySelector<HTMLElement>("[data-tree-disclosure]")!);
  expect((within(mobileDrawer).getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" }) as HTMLButtonElement).disabled).toBe(true);
});
