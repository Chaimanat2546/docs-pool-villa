/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
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
    directDocumentCount: 2,
  },
  {
    id: "second-root",
    parentId: null,
    title: "ทั่วไป",
    slug: "general",
    description: null,
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
