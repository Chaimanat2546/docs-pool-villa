/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/documents",
}));

afterEach(cleanup);

it("renders the admin navigation with the current page", () => {
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  expect(screen.getByRole("link", { name: "โครงสร้าง" }).getAttribute("href")).toBe("/admin/structure");
  expect(screen.getByRole("link", { name: "เอกสาร" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Editor" }).getAttribute("href")).toBe("/admin/editor");
  expect(screen.getByRole("link", { name: "กลับหน้าคู่มือ" }).getAttribute("href")).toBe("/");
});

it("moves focus into the mobile drawer and returns it to the trigger after Escape", async () => {
  const user = userEvent.setup();
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  const trigger = screen.getByRole("button", { name: "เมนูผู้ดูแล" });
  await user.click(trigger);

  const dialog = screen.getByRole("dialog");
  expect(dialog).not.toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("link", { name: "โครงสร้าง" })));

  await user.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
