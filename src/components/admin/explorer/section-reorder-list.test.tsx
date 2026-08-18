/** @vitest-environment jsdom */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { SectionReorderList } from "./section-reorder-list";

const { reorderSections, showLoading, update } = vi.hoisted(() => ({
  reorderSections: vi.fn(),
  showLoading: vi.fn(() => "toast-1"),
  update: vi.fn(),
}));

vi.mock("@/app/admin/(content)/structure/actions", () => ({ reorderSections }));
vi.mock("@/components/admin/admin-toast", () => ({
  useAdminToast: () => ({ showLoading, update, showError: vi.fn(), showSuccess: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: unknown) => void }) => <><button onClick={() => onDragEnd({ active: { id: "section-a" }, over: { id: "section-b" } })}>จำลองการลาก</button>{children}</>,
  KeyboardSensor: class KeyboardSensor {}, MouseSensor: class MouseSensor {}, TouchSensor: class TouchSensor {},
  useSensor: vi.fn(), useSensors: vi.fn(),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  arrayMove: <T,>(items: T[], from: number, to: number) => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: undefined }),
  verticalListSortingStrategy: vi.fn(),
}));

const parentId = "11111111-1111-4111-8111-111111111111";
const sections: AdminExplorerSection[] = [
  { id: "section-a", parentId, title: "หมวด A", slug: "a", isPublished: true, sortOrder: 0, directDocumentCount: 0 },
  { id: "section-b", parentId, title: "หมวด B", slug: "b", isPublished: true, sortOrder: 1, directDocumentCount: 1 },
];

afterEach(() => vi.clearAllMocks());

it("keeps a drag local and saves the complete sibling group once", async () => {
  const user = userEvent.setup();
  reorderSections.mockResolvedValue({ success: true });
  render(<SectionReorderList parentId={parentId} sections={sections} onCancel={vi.fn()} onSaved={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "จำลองการลาก" }));
  expect(within(screen.getByRole("list", { name: "เรียงลำดับหมวด" })).getAllByRole("listitem").map((item) => item.textContent)).toEqual([expect.stringContaining("หมวด B"), expect.stringContaining("หมวด A")]);
  expect(reorderSections).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "บันทึกลำดับ" }));
  await waitFor(() => expect(reorderSections).toHaveBeenCalledWith({ parentId, sectionIds: ["section-b", "section-a"] }));
  expect(showLoading).toHaveBeenCalledWith("กำลังบันทึกลำดับหมวด");
  expect(update).toHaveBeenCalledWith("toast-1", "success", "บันทึกลำดับหมวดสำเร็จ");
});
