/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { FolderTree } from "./folder-tree";

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
  {
    id: "second-root",
    parentId: null,
    title: "ทั่วไป",
    slug: "general",
    isPublished: false,
    sortOrder: 1,
    directDocumentCount: 0,
  },
];

afterEach(cleanup);

it("renders a static all-documents heading outside the tree", () => {
  const navigate = vi.fn();
  render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);

  expect(screen.getByText("คู่มือทั้งหมด · 3 เอกสาร")).not.toBeNull();
  expect(screen.queryByRole("treeitem", { name: /คู่มือทั้งหมด/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /คู่มือทั้งหมด/ })).toBeNull();
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("treeitem", { name: /เริ่มต้น.*1/ }).getAttribute("aria-level")).toBe("1");
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-level")).toBe("2");
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).hasAttribute("aria-expanded")).toBe(false);
});

it("reveals child creation only when its root is expanded", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  const disclosure = root.querySelector<HTMLElement>("[data-tree-disclosure]");
  expect(disclosure).not.toBeNull();
  expect(screen.queryByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" })).toBeNull();
  expect(screen.queryByRole("button", { name: "สร้างหมวดย่อยใน ทั่วไป" })).toBeNull();
  await user.click(disclosure!);

  const firstRootAction = screen.getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" });
  expect(firstRootAction).not.toBeNull();
  expect(firstRootAction.textContent).toContain("＋ เพิ่มหมวดย่อย");
  expect(screen.queryByRole("button", { name: "สร้างหมวดย่อยใน ทั่วไป" })).toBeNull();
  const emptyRoot = screen.getByRole("treeitem", { name: /ทั่วไป/ });
  const emptyDisclosure = emptyRoot.querySelector<HTMLElement>("[data-tree-disclosure]");
  expect(emptyDisclosure).not.toBeNull();
  await user.click(emptyDisclosure!);
  const emptyRootAction = screen.getByRole("button", { name: "สร้างหมวดย่อยใน ทั่วไป" });
  expect(screen.queryByRole("button", { name: /สร้างหมวดย่อยใน การจอง/ })).toBeNull();
  expect(screen.getByRole("button", { name: "สร้างหมวดหลัก" })).not.toBeNull();
  expect(firstRootAction.closest('[role="tree"]')).toBe(screen.getByRole("tree", { name: "หมวดคู่มือ" }));
  expect(emptyRootAction.closest('[role="tree"]')).toBe(screen.getByRole("tree", { name: "หมวดคู่มือ" }));
  expect(firstRootAction.previousElementSibling).toBe(screen.getByRole("treeitem", { name: /การจอง/ }));
  expect(emptyRootAction.previousElementSibling).toBe(screen.getByRole("treeitem", { name: /ทั่วไป/ }));

  await user.click(firstRootAction);
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root&mode=create-child");
  expect(navigate).not.toHaveBeenCalledWith("/admin/structure?section=root");

  await user.click(screen.getByRole("button", { name: "สร้างหมวดหลัก" }));
  expect(navigate).toHaveBeenCalledWith("/admin/structure?mode=create-root");
  expect(navigate).not.toHaveBeenCalledWith("/admin/structure");
  expect(screen.getByRole("button", { name: "สร้างหมวดหลัก" }).closest('[role="tree"]')).toBeNull();

  const tree = screen.getByRole("tree", { name: "หมวดคู่มือ" });
  expect(tree.querySelectorAll('[role="treeitem"]')).toHaveLength(screen.getAllByRole("treeitem").length);
  expect(screen.getByRole("button", { name: "สร้างหมวดหลัก" }).closest('[role="tree"]')).toBeNull();
});

it("uses secondary visual treatment for child actions and hides zero document counts", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId="root" onNavigate={navigate} />);

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  expect(root.className).toContain("aria-selected:shadow-[inset_3px_0_0_hsl(var(--primary))]");
  expect(within(root).getByText("1").className).toContain("rounded-full");
  expect(screen.queryByText("0")).toBeNull();

  await user.click(root.querySelector<HTMLElement>("[data-tree-disclosure]")!);
  const childAction = screen.getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" });
  expect(childAction.className).toContain("text-muted-foreground");
  expect(screen.getByRole("button", { name: "สร้างหมวดหลัก" }).parentElement?.className).toContain("border-t");
});

it("prevents pointer drags on a folder row from selecting its label", () => {
  const navigate = vi.fn();
  render(<FolderTree sections={sections} selectedSectionId="root" onNavigate={navigate} />);

  expect(screen.getByRole("treeitem", { name: /เริ่มต้น/ }).className).toContain("select-none");
});

it("keeps creation actions keyboard reachable and submits with Enter and Space", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const rootAction = screen.getByRole("button", { name: "สร้างหมวดหลัก" });
  rootAction.focus();
  await user.keyboard("{Enter}");
  await user.keyboard(" ");

  expect(navigate).toHaveBeenNthCalledWith(1, "/admin/structure?mode=create-root");
  expect(navigate).toHaveBeenNthCalledWith(2, "/admin/structure?mode=create-root");
});

it("disables both creation actions while media operations are pending", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} creationBlocked onNavigate={navigate} />);

  const rootAction = screen.getByRole("button", { name: "สร้างหมวดหลัก" });
  expect((rootAction as HTMLButtonElement).disabled).toBe(true);
  expect(rootAction.getAttribute("title")).toBe("กำลังจัดการรูปภาพที่ค้างอยู่");

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  await user.click(root.querySelector<HTMLElement>("[data-tree-disclosure]")!);
  const childAction = screen.getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" });
  expect((childAction as HTMLButtonElement).disabled).toBe(true);
  expect(childAction.getAttribute("title")).toBe("กำลังจัดการรูปภาพที่ค้างอยู่");
  await user.click(rootAction);
  expect(navigate).not.toHaveBeenCalled();
});

it("supports Arrow keys, Home, End, expand, collapse, and Enter", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  root.focus();
  await user.keyboard("{ArrowRight}");
  expect(root.getAttribute("aria-expanded")).toBe("true");

  await user.keyboard("{ArrowDown}{Enter}");
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=child");

  await user.keyboard("{Home}");
  expect(document.activeElement).toBe(root);

  await user.keyboard("{End}");
  expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: /ทั่วไป/ }));
  await user.keyboard("{ArrowUp}{ArrowLeft}{ArrowLeft}");
  expect(document.activeElement).toBe(root);
  expect(root.getAttribute("aria-expanded")).toBe("false");
});

it("keeps the all-documents heading non-interactive", () => {
  const navigate = vi.fn();
  render(<FolderTree sections={sections} selectedSectionId="root" onNavigate={navigate} />);

  expect(screen.getByText("คู่มือทั้งหมด · 3 เอกสาร")).not.toBeNull();
  expect(navigate).not.toHaveBeenCalled();
});

it("toggles a parent from its pointer and touch disclosure target without selecting it", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  const disclosure = root.querySelector<HTMLElement>("[data-tree-disclosure]");
  expect(disclosure).not.toBeNull();
  expect(disclosure!.className).toContain("size-11");
  expect(within(root).queryByRole("button")).toBeNull();

  await user.pointer([
    { keys: "[MouseLeft>]", target: disclosure! },
    { keys: "[/MouseLeft]", target: disclosure! },
  ]);

  expect(root.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByRole("treeitem", { name: /การจอง/ })).not.toBeNull();
  expect(navigate).not.toHaveBeenCalled();

  await user.pointer([
    { keys: "[TouchA>]", target: disclosure! },
    { keys: "[/TouchA]", target: disclosure! },
  ]);

  expect(root.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByRole("treeitem", { name: /การจอง/ })).toBeNull();
  expect(navigate).not.toHaveBeenCalled();

  await user.click(root);

  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root");
  expect(root.getAttribute("aria-expanded")).toBe("false");
});

it("provides one Tab entry into the tree followed by root creation when no root is expanded", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <button type="button">ก่อนต้นไม้</button>
      <FolderTree sections={sections} selectedSectionId="root" onNavigate={navigate} />
      <button type="button">หลังต้นไม้</button>
    </>,
  );
  const before = screen.getByRole("button", { name: "ก่อนต้นไม้" });
  const after = screen.getByRole("button", { name: "หลังต้นไม้" });
  const selected = screen.getByRole("treeitem", { name: /เริ่มต้น/ });

  before.focus();
  await user.tab();
  expect(document.activeElement).toBe(selected);
  expect(screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0)).toEqual([selected]);

  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "สร้างหมวดหลัก" }));
  await user.tab();
  expect(document.activeElement).toBe(after);
});

it("moves the tab stop and focus to a visible selected section when the focused section is removed", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);
  screen.getByRole("treeitem", { name: /การจอง/ }).focus();

  rerender(<FolderTree sections={sections.filter((section) => section.id !== "child")} selectedSectionId="root" onNavigate={navigate} />);

  const selectedRoot = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  expect(screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0)).toEqual([selectedRoot]);
  expect(document.activeElement).toBe(selectedRoot);
  await user.keyboard("{Enter}");
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root");
});

it("moves the tab stop and focus to the first root when no selected section remains", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);
  screen.getByRole("treeitem", { name: /การจอง/ }).focus();

  rerender(<FolderTree sections={sections.filter((section) => section.id !== "child")} selectedSectionId="missing" onNavigate={navigate} />);

  const firstRoot = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  expect(screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0)).toEqual([firstRoot]);
  expect(document.activeElement).toBe(firstRoot);
  await user.keyboard("{Enter}");
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root");
});
