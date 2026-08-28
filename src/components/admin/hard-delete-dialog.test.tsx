/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { HardDeleteDialog } from "./hard-delete-dialog";

it("returns focus to the delete trigger after Escape", async () => {
  const user = userEvent.setup();
  render(<HardDeleteDialog title="ลบเอกสารถาวร" targetName="เริ่มต้น" files={["ภาพตัวอย่าง"]} onConfirm={vi.fn()} />);
  const trigger = screen.getByRole("button", { name: "ลบเอกสารถาวร" });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).not.toBeNull();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
