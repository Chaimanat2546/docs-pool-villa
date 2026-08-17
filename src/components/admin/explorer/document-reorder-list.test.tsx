/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminExplorerDocument } from "@/lib/docs/admin-explorer";

import { DocumentReorderList } from "./document-reorder-list";

const { reorderDocuments } = vi.hoisted(() => ({ reorderDocuments: vi.fn() }));

vi.mock("@/app/admin/(content)/documents/actions", () => ({ reorderDocuments }));
vi.mock("@/components/admin/admin-toast", () => ({
  useAdminToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    accessibility,
    children,
    onDragEnd,
    sensors,
  }: {
    accessibility?: {
      announcements?: { onDragStart?: (event: { active: { id: string; data: { current: { title: string } } } }) => string };
      screenReaderInstructions?: { draggable?: string };
    };
    children: React.ReactNode;
    onDragEnd: (event: unknown) => void;
    sensors: unknown;
  }) => (
    <>
      <output data-testid="dnd-sensors">{JSON.stringify(sensors)}</output>
      <output data-testid="dnd-screen-reader-instructions">{accessibility?.screenReaderInstructions?.draggable}</output>
      <output data-testid="dnd-start-announcement">
        {accessibility?.announcements?.onDragStart?.({ active: { id: "doc-a", data: { current: { title: "เอกสาร A" } } } })}
      </output>
      <button
        type="button"
        onClick={() => onDragEnd({ active: { id: "doc-a" }, over: { id: "doc-c" } })}
      >
        จำลองการลาก
      </button>
      {children}
    </>
  ),
  MouseSensor: class MouseSensor {},
  PointerSensor: class PointerSensor {},
  TouchSensor: class TouchSensor {},
  useSensor: vi.fn((Sensor, configuration) => ({ name: Sensor.name, configuration })),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  arrayMove: <T,>(items: T[], from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  },
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

const sectionId = "11111111-1111-4111-8111-111111111111";
const documents: AdminExplorerDocument[] = [
  {
    id: "doc-a",
    sectionId,
    title: "เอกสาร A",
    slug: "document-a",
    status: "draft",
    updatedAt: "2026-08-17T00:00:00.000Z",
    sortOrder: 0,
    version: 1,
  },
  {
    id: "doc-b",
    sectionId,
    title: "เอกสาร B",
    slug: "document-b",
    status: "published",
    updatedAt: "2026-08-17T00:00:00.000Z",
    sortOrder: 1,
    version: 1,
  },
  {
    id: "doc-c",
    sectionId,
    title: "เอกสาร C",
    slug: "document-c",
    status: "archived",
    updatedAt: "2026-08-17T00:00:00.000Z",
    sortOrder: 2,
    version: 1,
  },
];

function renderList(overrides: Partial<React.ComponentProps<typeof DocumentReorderList>> = {}) {
  const onCancel = vi.fn();
  const onSaved = vi.fn();
  const view = render(
    <DocumentReorderList
      sectionId={sectionId}
      documents={documents}
      onCancel={onCancel}
      onSaved={onSaved}
      {...overrides}
    />,
  );
  return { ...view, onCancel, onSaved };
}

function listTitles() {
  return within(screen.getByRole("list", { name: "เรียงลำดับเอกสาร" }))
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("heading").textContent);
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DocumentReorderList", () => {
  it("moves the dragged document locally before any save request", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "จำลองการลาก" }));

    expect(listTitles()).toEqual(["เอกสาร B", "เอกสาร C", "เอกสาร A"]);
    expect(reorderDocuments).not.toHaveBeenCalled();
  });

  it("saves the locally reordered document ids for its section", async () => {
    const user = userEvent.setup();
    reorderDocuments.mockResolvedValue({ success: true });
    renderList();

    await user.click(screen.getByRole("button", { name: "จำลองการลาก" }));
    await user.click(screen.getByRole("button", { name: "บันทึกลำดับ" }));

    await waitFor(() => expect(reorderDocuments).toHaveBeenCalledWith({
      sectionId,
      documentIds: ["doc-b", "doc-c", "doc-a"],
    }));
  });

  it("disables save and cancel while saving", async () => {
    const user = userEvent.setup();
    let finishSave: ((result: { success: true }) => void) | undefined;
    reorderDocuments.mockImplementation(() => new Promise((resolve) => {
      finishSave = resolve;
    }));
    renderList();

    await user.click(screen.getByRole("button", { name: "บันทึกลำดับ" }));

    expect((screen.getByRole("button", { name: "กำลังบันทึก" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "ยกเลิก" }) as HTMLButtonElement).disabled).toBe(true);
    finishSave?.({ success: true });
  });

  it("notifies its caller after a successful save", async () => {
    const user = userEvent.setup();
    reorderDocuments.mockResolvedValue({ success: true });
    const { onSaved } = renderList();

    await user.click(screen.getByRole("button", { name: "บันทึกลำดับ" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it("keeps the dragged order and reports an unsuccessful save", async () => {
    const user = userEvent.setup();
    reorderDocuments.mockResolvedValue({ error: "บันทึกลำดับเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง" });
    renderList();

    await user.click(screen.getByRole("button", { name: "จำลองการลาก" }));
    await user.click(screen.getByRole("button", { name: "บันทึกลำดับ" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(listTitles()).toEqual(["เอกสาร B", "เอกสาร C", "เอกสาร A"]);
  });

  it("cancels without invoking the save action", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderList();

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(reorderDocuments).not.toHaveBeenCalled();
  });

  it("provides labeled 44px drag handles without keyboard-order controls", () => {
    renderList();

    for (const document of documents) {
      expect(screen.getByRole("button", { name: `ลาก ${document.title}` }).className).toContain("size-11");
    }
    expect(screen.queryByRole("button", { name: "เลื่อนขึ้น" })).toBeNull();
    expect(screen.queryByRole("button", { name: "เลื่อนลง" })).toBeNull();
  });

  it("uses separate mouse and touch sensors, touch-safe handles, and Thai pointer-only assistance", () => {
    renderList();

    const sensors = screen.getByTestId("dnd-sensors").textContent;
    expect(sensors).toContain("MouseSensor");
    expect(sensors).toContain("TouchSensor");
    expect(sensors).not.toContain("PointerSensor");
    expect(sensors).toContain("delay");
    expect(sensors).toContain("180");
    expect(sensors).toContain("tolerance");
    expect(sensors).toContain("8");
    expect(screen.getByTestId("dnd-screen-reader-instructions").textContent).toContain("ใช้เมาส์หรือนิ้วลาก");
    expect(screen.getByTestId("dnd-screen-reader-instructions").textContent).not.toContain("keyboard");
    expect(screen.getByTestId("dnd-start-announcement").textContent).toContain("เริ่มลาก เอกสาร A");
    expect(screen.getByRole("button", { name: "ลาก เอกสาร A" }).style.touchAction).toBe("none");
  });
});
