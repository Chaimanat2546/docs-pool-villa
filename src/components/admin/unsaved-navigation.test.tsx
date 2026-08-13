/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";

import {
  GuardedAdminLink,
  UnsavedNavigationProvider,
  useUnsavedNavigation,
} from "./unsaved-navigation";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function DirtyRegistration({ dirty }: { dirty: boolean }) {
  const { registerDirty } = useUnsavedNavigation();

  useEffect(() => {
    registerDirty(dirty);
    return () => registerDirty(false);
  }, [dirty, registerDirty]);

  return null;
}

function Harness({ dirty }: { dirty: boolean }) {
  return (
    <UnsavedNavigationProvider>
      <DirtyRegistration dirty={dirty} />
      <GuardedAdminLink href="/admin/editor">Editor</GuardedAdminLink>
    </UnsavedNavigationProvider>
  );
}

function ClearAndNavigate() {
  const { registerDirty, requestNavigation } = useUnsavedNavigation();
  return (
    <button
      type="button"
      onClick={() => {
        registerDirty(false);
        requestNavigation("/admin/structure?section=saved");
      }}
    >
      บันทึกแล้วกลับรายการ
    </button>
  );
}

it("asks before same-tab Admin navigation when dirty and returns focus on cancel", async () => {
  const user = userEvent.setup();
  render(<Harness dirty />);
  const link = screen.getByRole("link", { name: "Editor" });

  await user.click(link);

  const dialog = screen.getByRole("dialog", { name: "ออกจากหน้านี้หรือไม่" });
  await user.click(within(dialog).getByRole("button", { name: "แก้ไขต่อ" }));

  await waitFor(() => expect(document.activeElement).toBe(link));
  expect(push).not.toHaveBeenCalled();
});

it("navigates only after confirming discard", async () => {
  const user = userEvent.setup();
  render(<Harness dirty />);

  await user.click(screen.getByRole("link", { name: "Editor" }));
  await user.click(screen.getByRole("button", { name: "ออกโดยไม่บันทึก" }));

  expect(push).toHaveBeenCalledWith("/admin/editor");
});

it("closes with Escape, restores the trigger, and keeps the current page", async () => {
  const user = userEvent.setup();
  render(<Harness dirty />);
  const link = screen.getByRole("link", { name: "Editor" });

  await user.click(link);
  await user.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(link));
  expect(push).not.toHaveBeenCalled();
});

it("navigates immediately when there are no unsaved changes", async () => {
  const user = userEvent.setup();
  render(<Harness dirty={false} />);

  await user.click(screen.getByRole("link", { name: "Editor" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).toHaveBeenCalledWith("/admin/editor");
});

it("navigates immediately when save clears dirty state in the same event", async () => {
  const user = userEvent.setup();
  render(
    <UnsavedNavigationProvider>
      <DirtyRegistration dirty />
      <ClearAndNavigate />
    </UnsavedNavigationProvider>,
  );

  await user.click(screen.getByRole("button", { name: "บันทึกแล้วกลับรายการ" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).toHaveBeenCalledWith("/admin/structure?section=saved");
});

it("registers beforeunload protection only while dirty", () => {
  const { rerender } = render(<Harness dirty />);
  const dirtyEvent = new Event("beforeunload", { cancelable: true });

  expect(window.dispatchEvent(dirtyEvent)).toBe(false);

  rerender(<Harness dirty={false} />);
  const cleanEvent = new Event("beforeunload", { cancelable: true });
  expect(window.dispatchEvent(cleanEvent)).toBe(true);
});

it("leaves new-tab clicks to native browser behavior", async () => {
  const user = userEvent.setup();
  render(
    <UnsavedNavigationProvider>
      <DirtyRegistration dirty />
      <GuardedAdminLink href="/admin/editor" target="_blank">เปิด Editor แท็บใหม่</GuardedAdminLink>
    </UnsavedNavigationProvider>,
  );

  await user.click(screen.getByRole("link", { name: "เปิด Editor แท็บใหม่" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).not.toHaveBeenCalled();
});

it("leaves modified clicks to native browser behavior", async () => {
  render(<Harness dirty />);
  document.addEventListener("click", (event) => event.preventDefault(), { once: true });

  fireEvent.click(screen.getByRole("link", { name: "Editor" }), { ctrlKey: true });

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).not.toHaveBeenCalled();
});

it("leaves external destinations to native browser behavior", async () => {
  const user = userEvent.setup();
  render(
    <UnsavedNavigationProvider>
      <DirtyRegistration dirty />
      <GuardedAdminLink href="https://example.com" target="_blank">เว็บไซต์ภายนอก</GuardedAdminLink>
    </UnsavedNavigationProvider>,
  );

  await user.click(screen.getByRole("link", { name: "เว็บไซต์ภายนอก" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(push).not.toHaveBeenCalled();
});
