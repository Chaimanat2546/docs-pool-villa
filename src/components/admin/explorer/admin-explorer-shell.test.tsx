/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { AdminExplorerShell } from "./admin-explorer-shell";

const { push, sectionQuery } = vi.hoisted(() => ({
  push: vi.fn(),
  sectionQuery: { value: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({ get: (key: string) => key === "section" ? sectionQuery.value : null }),
}));

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
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  sectionQuery.value = null;
});

it("traps mobile drawer focus and returns it to เลือกหมวด", async () => {
  const user = userEvent.setup();
  render(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);

  const trigger = screen.getByRole("button", { name: "เลือกหมวด" });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).not.toBeNull();
  await user.keyboard("{Escape}");

  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("provides a bounded desktop-only keyboard resize control", async () => {
  const user = userEvent.setup();
  render(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);

  const slider = screen.getByRole("slider", { name: "ปรับความกว้างรายการหมวด" }) as HTMLInputElement;
  expect(slider.min).toBe("224");
  expect(slider.max).toBe("384");
  expect(slider.step).toBe("16");
  expect(slider.value).toBe("288");
  expect(slider.classList.contains("hidden")).toBe(true);
  expect(slider.classList.contains("lg:block")).toBe(true);

  slider.focus();
  await user.keyboard("{ArrowRight}");
  expect(slider.value).toBe("304");
});

it("validates the requested section before marking a tree item selected", () => {
  sectionQuery.value = "missing";
  const { rerender } = render(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);

  expect(screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ }).getAttribute("aria-selected")).toBe("true");

  sectionQuery.value = "child";
  rerender(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);

  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-selected")).toBe("true");
});

it("routes tree navigation through the App Router", async () => {
  const user = userEvent.setup();
  render(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);

  await user.click(screen.getByRole("treeitem", { name: /เริ่มต้น/ }));

  expect(push).toHaveBeenCalledWith("/admin/structure?section=root");
});
