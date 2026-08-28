/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { MediaOperationBanner } from "./media-operation-banner";

it("announces failed files and retries once", async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<MediaOperationBanner operation={{ operationId: "11111111-1111-4111-8111-111111111111", kind: "document_delete", targetId: "22222222-2222-4222-8222-222222222222", files: ["ภาพหน้าเข้าสู่ระบบ"], attemptCount: 1, message: "ลบรูปไม่สำเร็จ" }} onRetry={onRetry} />);
  expect(screen.getByRole("alert").textContent).toContain("ภาพหน้าเข้าสู่ระบบ");
  await user.click(screen.getByRole("button", { name: "ลองลบรูปอีกครั้ง" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
