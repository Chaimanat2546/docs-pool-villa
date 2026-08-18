/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { AdminToastProvider, useAdminToast } from "./admin-toast";

function ToastHarness() {
  const { dismiss, show, showError, showLoading, showSuccess, update } = useAdminToast();
  const loadingToastId = useRef("");

  return (
    <>
      <button type="button" onClick={() => showSuccess("บันทึกสำเร็จ")}>
        success
      </button>
      <button type="button" onClick={() => showError("บันทึกไม่สำเร็จ")}>
        error
      </button>
      <button type="button" onClick={() => show("info", "ข้อมูลเพิ่มเติม")}>
        info
      </button>
      <button type="button" onClick={() => show("warning", "ตรวจสอบข้อมูล")}>
        warning
      </button>
      <button
        type="button"
        onClick={() => {
          loadingToastId.current = showLoading("กำลังบันทึก");
        }}
      >
        loading
      </button>
      <button
        type="button"
        onClick={() => update(loadingToastId.current, "success", "บันทึกสำเร็จ")}
      >
        update loading
      </button>
      <button type="button" onClick={() => dismiss(loadingToastId.current)}>
        dismiss loading
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("dismisses success and info statuses after 3 seconds", async () => {
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

  fireEvent.click(screen.getByRole("button", { name: "info" }));
  expect(screen.getByRole("status").textContent).toContain("ข้อมูลเพิ่มเติม");

  await act(() => vi.advanceTimersByTimeAsync(3_000));

  expect(screen.queryByRole("status")).toBeNull();
});

it("dismisses a warning alert after 5 seconds", async () => {
  vi.useFakeTimers();
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "warning" }));
  expect(screen.getByRole("alert").textContent).toContain("ตรวจสอบข้อมูล");

  await act(() => vi.advanceTimersByTimeAsync(4_999));
  expect(screen.getByRole("alert")).not.toBeNull();

  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(screen.queryByRole("alert")).toBeNull();
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

it("dismisses a visible success toast when its focused close button receives Enter", async () => {
  const user = userEvent.setup();
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  await user.click(screen.getByRole("button", { name: "success" }));
  const closeButton = screen.getByRole("button", { name: "ปิดข้อความแจ้งเตือน" });
  closeButton.focus();
  expect(document.activeElement).toBe(closeButton);

  await user.keyboard("{Enter}");

  expect(screen.queryByRole("status")).toBeNull();
});

it("keeps a loading status until it is updated or dismissed", async () => {
  vi.useFakeTimers();
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "loading" }));
  expect(screen.getByRole("status").textContent).toContain("กำลังบันทึก");

  await act(() => vi.advanceTimersByTimeAsync(10_000));
  expect(screen.getByRole("status")).not.toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "update loading" }));
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status").textContent).toContain("บันทึกสำเร็จ");

  await act(() => vi.advanceTimersByTimeAsync(3_000));
  expect(screen.queryByRole("status")).toBeNull();
});

it("lets a loading status be dismissed explicitly", () => {
  render(
    <AdminToastProvider>
      <ToastHarness />
    </AdminToastProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: "loading" }));
  fireEvent.click(screen.getByRole("button", { name: "dismiss loading" }));

  expect(screen.queryByRole("status")).toBeNull();
});
