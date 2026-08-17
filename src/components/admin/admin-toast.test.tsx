/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { AdminToastProvider, useAdminToast } from "./admin-toast";

function ToastHarness() {
  const { showError, showSuccess } = useAdminToast();

  return (
    <>
      <button type="button" onClick={() => showSuccess("บันทึกสำเร็จ")}>
        success
      </button>
      <button type="button" onClick={() => showError("บันทึกไม่สำเร็จ")}>
        error
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("dismisses a success status after 3 seconds", async () => {
  vi.useFakeTimers();
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "success" }));
  expect(screen.getByRole("status").textContent).toContain("บันทึกสำเร็จ");

  await act(() => vi.advanceTimersByTimeAsync(3_000));

  expect(screen.queryByRole("status")).toBeNull();
});

it("keeps an error alert until its close button is pressed", async () => {
  const user = userEvent.setup();
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  await user.click(screen.getByRole("button", { name: "error" }));
  expect(screen.getByRole("alert").textContent).toContain("บันทึกไม่สำเร็จ");

  await user.click(
    screen.getByRole("button", { name: "ปิดข้อความแจ้งเตือน" })
  );

  expect(screen.queryByRole("alert")).toBeNull();
});
