/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { SectionReorderHub } from "./section-reorder-hub";

vi.mock("./section-reorder-list", () => ({
  SectionReorderList: ({ parentId }: { parentId: string | null }) => (
    <div>รายการจัดลำดับ: {parentId ?? "หมวดหลัก"}</div>
  ),
}));

const rootId = "11111111-1111-4111-8111-111111111111";
const sections: AdminExplorerSection[] = [
  { id: rootId, parentId: null, title: "เริ่มต้น", slug: "start", isPublished: true, sortOrder: 0, directDocumentCount: 0 },
  { id: "22222222-2222-4222-8222-222222222222", parentId: rootId, title: "การจอง", slug: "booking", isPublished: true, sortOrder: 0, directDocumentCount: 0 },
  { id: "33333333-3333-4333-8333-333333333333", parentId: rootId, title: "การชำระเงิน", slug: "payment", isPublished: true, sortOrder: 1, directDocumentCount: 0 },
  { id: "44444444-4444-4444-8444-444444444444", parentId: null, title: "ทั่วไป", slug: "general", isPublished: true, sortOrder: 1, directDocumentCount: 0 },
];

it("enables child reordering only after selecting a root category", async () => {
  const user = userEvent.setup();
  render(<SectionReorderHub sections={sections} onClose={vi.fn()} onSaved={vi.fn()} />);

  const reorderChildren = screen.getByRole("button", { name: "จัดลำดับหมวดย่อย" }) as HTMLButtonElement;
  expect(reorderChildren.disabled).toBe(true);
  expect(screen.getByRole("list", { name: "หมวดย่อยของ เริ่มต้น" })).not.toBeNull();

  await user.click(screen.getByRole("button", { name: "เริ่มต้น" }));
  expect(reorderChildren.disabled).toBe(false);

  await user.click(reorderChildren);
  expect(screen.getByText(`รายการจัดลำดับ: ${rootId}`)).not.toBeNull();
});
