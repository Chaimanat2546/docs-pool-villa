/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

const { createClient, refresh, replace, signOut } = vi.hoisted(() => {
  const signOut = vi.fn().mockResolvedValue({ error: null });

  return {
    createClient: vi.fn(() => ({ auth: { signOut } })),
    refresh: vi.fn(),
    replace: vi.fn(),
    signOut,
  };
});

vi.mock("@/lib/client", () => ({ createClient }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/documents",
  useRouter: () => ({ replace, refresh }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
});

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

it("closes the mobile drawer when a navigation link is clicked", async () => {
  const user = userEvent.setup();
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  await user.click(screen.getByRole("button", { name: "เมนูผู้ดูแล" }));

  const dialog = screen.getByRole("dialog");
  const editorLink = within(dialog).getByRole("link", { name: "Editor" });
  editorLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
  await user.click(editorLink);

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("signs out and returns to the login page", async () => {
  const user = userEvent.setup();
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it("disables logout until sign out completes", async () => {
  const user = userEvent.setup();
  let resolveSignOut: (value: { error: null }) => void;
  signOut.mockImplementation(() => new Promise((resolve) => { resolveSignOut = resolve; }));
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  const button = screen.getByRole("button", { name: "ออกจากระบบ" }) as HTMLButtonElement;
  await user.click(button);

  expect(button.disabled).toBe(true);
  resolveSignOut!({ error: null });
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"));
});

it("shows a safe error and re-enables logout when sign out returns an error", async () => {
  const user = userEvent.setup();
  signOut.mockResolvedValue({ error: new Error("network") });
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

  const alert = await screen.findByRole("alert");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(alert.textContent).toBe("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  expect((screen.getByRole("button", { name: "ออกจากระบบ" }) as HTMLButtonElement).disabled).toBe(false);
});

it("shows a safe error and re-enables logout when sign out rejects", async () => {
  const user = userEvent.setup();
  signOut.mockRejectedValue(new Error("network"));
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

  const alert = await screen.findByRole("alert");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(alert.textContent).toBe("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  expect((screen.getByRole("button", { name: "ออกจากระบบ" }) as HTMLButtonElement).disabled).toBe(false);
});
