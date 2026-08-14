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

it("renders the virtual root and direct document counts", () => {
  const navigate = vi.fn();
  render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);

  expect(screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ })).not.toBeNull();
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("treeitem", { name: /เริ่มต้น.*1/ }).getAttribute("aria-level")).toBe("2");
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-level")).toBe("3");
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).hasAttribute("aria-expanded")).toBe(false);
});

it("offers a child creation action for every root without selecting it", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  const disclosure = root.querySelector<HTMLElement>("[data-tree-disclosure]");
  expect(disclosure).not.toBeNull();
  await user.click(disclosure!);

  const firstRootAction = screen.getByRole("button", { name: "สร้าง Sub-topic ใน เริ่มต้น" });
  const emptyRootAction = screen.getByRole("button", { name: "สร้าง Sub-topic ใน ทั่วไป" });
  expect(firstRootAction).not.toBeNull();
  expect(emptyRootAction).not.toBeNull();
  expect(screen.queryByRole("button", { name: /สร้าง Sub-topic ใน การจอง/ })).toBeNull();
  expect(screen.getByRole("button", { name: "สร้าง Topic" })).not.toBeNull();
  expect(firstRootAction.previousElementSibling).toBe(screen.getByRole("treeitem", { name: /การจอง/ }));
  expect(emptyRootAction.previousElementSibling).toBe(screen.getByRole("treeitem", { name: /ทั่วไป/ }));

  await user.click(firstRootAction);
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root&mode=create-child");
  expect(navigate).not.toHaveBeenCalledWith("/admin/structure?section=root");

  await user.click(screen.getByRole("button", { name: "สร้าง Topic" }));
  expect(navigate).toHaveBeenCalledWith("/admin/structure?mode=create-root");
  expect(navigate).not.toHaveBeenCalledWith("/admin/structure");
  expect(screen.getByRole("button", { name: "สร้าง Topic" }).closest('[role="tree"]')).toBeNull();
  expect(firstRootAction.closest('[role="tree"]')).toBeNull();

  const tree = screen.getByRole("tree", { name: "หมวดคู่มือ" });
  const ownedIds = new Set((tree.getAttribute("aria-owns") ?? "").split(" "));
  expect(screen.getAllByRole("treeitem").every((item) => item.id && ownedIds.has(item.id))).toBe(true);
  expect(ownedIds.has(firstRootAction.id)).toBe(false);
  expect(ownedIds.has(emptyRootAction.id)).toBe(false);
});

it("keeps creation actions keyboard reachable and submits with Enter and Space", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);

  const rootAction = screen.getByRole("button", { name: "สร้าง Topic" });
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

  const rootAction = screen.getByRole("button", { name: "สร้าง Topic" });
  expect((rootAction as HTMLButtonElement).disabled).toBe(true);
  expect(rootAction.getAttribute("title")).toBe("กำลังจัดการรูปภาพที่ค้างอยู่");

  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  await user.click(root.querySelector<HTMLElement>("[data-tree-disclosure]")!);
  const childAction = screen.getByRole("button", { name: "สร้าง Sub-topic ใน เริ่มต้น" });
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
  expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ }));

  await user.keyboard("{End}");
  expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: /ทั่วไป/ }));
  await user.keyboard("{ArrowUp}{ArrowLeft}{ArrowLeft}");
  expect(document.activeElement).toBe(root);
  expect(root.getAttribute("aria-expanded")).toBe("false");
});

it("navigates the virtual root without a section query", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId="root" onNavigate={navigate} />);

  const virtualRoot = screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ });
  virtualRoot.focus();
  await user.keyboard("{Enter}");

  expect(navigate).toHaveBeenCalledWith("/admin/structure");
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

it("provides one Tab entry into the tree followed by contextual creation actions", async () => {
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
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "สร้าง Sub-topic ใน เริ่มต้น" }));
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "สร้าง Sub-topic ใน ทั่วไป" }));
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "สร้าง Topic" }));
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

it("moves the tab stop and focus to the virtual root when no selected section remains", async () => {
  const navigate = vi.fn();
  const user = userEvent.setup();
  const { rerender } = render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);
  screen.getByRole("treeitem", { name: /การจอง/ }).focus();

  rerender(<FolderTree sections={sections.filter((section) => section.id !== "child")} selectedSectionId="missing" onNavigate={navigate} />);

  const virtualRoot = screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ });
  expect(screen.getAllByRole("treeitem").filter((item) => item.tabIndex === 0)).toEqual([virtualRoot]);
  expect(document.activeElement).toBe(virtualRoot);
  await user.keyboard("{Enter}");
  expect(navigate).toHaveBeenCalledWith("/admin/structure");
});
