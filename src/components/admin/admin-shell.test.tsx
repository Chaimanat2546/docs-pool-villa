/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";
import { useUnsavedNavigation } from "./unsaved-navigation";

const { createClient, pathname, push, refresh, replace, signOut } = vi.hoisted(() => {
  const signOut = vi.fn().mockResolvedValue({ error: null });

  return {
    createClient: vi.fn(() => ({ auth: { signOut } })),
    pathname: { value: "/admin/documents" },
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    signOut,
  };
});

vi.mock("@/lib/client", () => ({ createClient }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ push, replace, refresh }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pathname.value = "/admin/documents";
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
});

function DirtyPage() {
  const { registerDirty } = useUnsavedNavigation();

  useEffect(() => {
    registerDirty(true);
    return () => registerDirty(false);
  }, [registerDirty]);

  return <p>เนื้อหาที่ยังไม่บันทึก</p>;
}

it("renders the admin navigation with the current page", () => {
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  const contentLink = screen.getByRole("link", { name: "จัดการเนื้อหา" });
  expect(contentLink.getAttribute("href")).toBe("/admin/structure");
  expect(contentLink.getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Editor Sandbox" }).getAttribute("href")).toBe("/admin/editor");
  expect(screen.queryByRole("link", { name: "โครงสร้าง" })).toBeNull();
  expect(screen.queryByRole("link", { name: "เอกสาร" })).toBeNull();
  expect(screen.getByRole("link", { name: "กลับหน้าคู่มือ" }).getAttribute("href")).toBe("/");
});

it.each([
  "/admin/structure",
  "/admin/documents",
  "/admin/documents/new",
  "/admin/documents/11111111-1111-4111-8111-111111111111",
])("marks unified content navigation active at %s", (currentPathname) => {
  pathname.value = currentPathname;
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  expect(screen.getByRole("link", { name: "จัดการเนื้อหา" }).getAttribute("aria-current")).toBe("page");
});

it("does not mark a route that only shares a content-route prefix as active", () => {
  pathname.value = "/admin/documents-archive";
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  expect(screen.getByRole("link", { name: "จัดการเนื้อหา" }).getAttribute("aria-current")).toBeNull();
});

it("lets the child page own the single main landmark", () => {
  const { container } = render(<AdminShell><main>เนื้อหาผู้ดูแล</main></AdminShell>);

  expect(container.querySelectorAll("main")).toHaveLength(1);
  expect(container.querySelector("#main-content")?.tagName).toBe("DIV");
});

it("moves focus into the mobile drawer and returns it to the trigger after Escape", async () => {
  const user = userEvent.setup();
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  const trigger = screen.getByRole("button", { name: "เมนูผู้ดูแล" });
  await user.click(trigger);

  const dialog = screen.getByRole("dialog");
  expect(dialog).not.toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole("link", { name: "จัดการเนื้อหา" })));

  await user.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("closes the mobile drawer when a navigation link is clicked", async () => {
  const user = userEvent.setup();
  render(<AdminShell><p>เนื้อหาผู้ดูแล</p></AdminShell>);

  await user.click(screen.getByRole("button", { name: "เมนูผู้ดูแล" }));

  const dialog = screen.getByRole("dialog");
  const editorLink = within(dialog).getByRole("link", { name: "Editor Sandbox" });
  await user.click(editorLink);

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("keeps the mobile drawer and dirty navigation trigger mounted when canceling", async () => {
  const user = userEvent.setup();
  render(<AdminShell><DirtyPage /></AdminShell>);

  await user.click(screen.getByRole("button", { name: "เมนูผู้ดูแล" }));
  const drawer = screen.getByRole("dialog", { name: "เมนูผู้ดูแล" });
  const editorLink = within(drawer).getByRole("link", { name: "Editor Sandbox" });

  await user.click(editorLink);
  await user.click(screen.getByRole("button", { name: "แก้ไขต่อ" }));

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "ออกจากหน้านี้หรือไม่" })).toBeNull());
  expect(screen.getByRole("dialog", { name: "เมนูผู้ดูแล" })).toBe(drawer);
  expect(editorLink.isConnected).toBe(true);
  await waitFor(() => expect(document.activeElement).toBe(editorLink));
  expect(push).not.toHaveBeenCalled();
});

it("closes the mobile drawer only after dirty navigation is confirmed", async () => {
  const user = userEvent.setup();
  render(<AdminShell><DirtyPage /></AdminShell>);

  await user.click(screen.getByRole("button", { name: "เมนูผู้ดูแล" }));
  const drawer = screen.getByRole("dialog", { name: "เมนูผู้ดูแล" });
  await user.click(within(drawer).getByRole("link", { name: "Editor Sandbox" }));

  expect(drawer.isConnected).toBe(true);
  expect(push).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "ออกโดยไม่บันทึก" }));

  await waitFor(() => expect(screen.queryByRole("dialog", { name: "เมนูผู้ดูแล" })).toBeNull());
  expect(push).toHaveBeenCalledWith("/admin/editor");
});

it("provides an internal close control that closes the drawer and returns focus", async () => {
  const user = userEvent.setup();
  render(<AdminShell><main>เนื้อหาผู้ดูแล</main></AdminShell>);

  const trigger = screen.getByRole("button", { name: "เมนูผู้ดูแล" });
  await user.click(trigger);

  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "ปิดเมนูผู้ดูแล" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("keeps every mobile drawer action at least 44 pixels high", async () => {
  const user = userEvent.setup();
  render(<AdminShell><main>เนื้อหาผู้ดูแล</main></AdminShell>);

  const trigger = screen.getByRole("button", { name: "เมนูผู้ดูแล" });
  expect(trigger.classList.contains("min-h-11")).toBe(true);
  await user.click(trigger);

  const dialog = screen.getByRole("dialog");
  for (const link of within(dialog).getAllByRole("link")) {
    expect(link.classList.contains("min-h-11")).toBe(true);
  }
  expect(within(dialog).getByRole("button", { name: "ปิดเมนูผู้ดูแล" }).classList.contains("size-11")).toBe(true);
  expect(within(dialog).getByRole("button", { name: "ออกจากระบบ" }).classList.contains("min-h-11")).toBe(true);
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
