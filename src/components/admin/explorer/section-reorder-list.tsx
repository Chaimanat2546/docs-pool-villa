"use client";

import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";

import { reorderSections } from "@/app/admin/(content)/structure/actions";
import { useAdminToast } from "@/components/admin/admin-toast";
import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

type SectionReorderListProps = {
  parentId: string | null;
  sections: AdminExplorerSection[];
  onCancel: () => void;
  onSaved: () => void;
};

export function SectionReorderList({ parentId, sections, onCancel, onSaved }: SectionReorderListProps) {
  const [orderedSections, setOrderedSections] = useState(() => [...sections]);
  const [isPending, startTransition] = useTransition();
  const { showLoading, update } = useAdminToast();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const activeIndex = orderedSections.findIndex((section) => section.id === event.active.id);
    const overIndex = orderedSections.findIndex((section) => section.id === event.over?.id);
    if (activeIndex < 0 || overIndex < 0) return;
    setOrderedSections((current) => arrayMove(current, activeIndex, overIndex));
  }

  function saveOrder() {
    startTransition(async () => {
      const toastId = showLoading("กำลังบันทึกลำดับหมวด");
      try {
        const result = await reorderSections({ parentId, sectionIds: orderedSections.map(({ id }) => id) });
        if ("error" in result) {
          update(toastId, "error", result.error);
          return;
        }
        update(toastId, "success", "บันทึกลำดับหมวดสำเร็จ");
        onSaved();
      } catch {
        update(toastId, "error", "บันทึกลำดับหมวดไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    });
  }

  return (
    <section aria-labelledby="section-reorder-title" className="mt-6 w-full rounded-xl border bg-card shadow-sm">
      <div className="border-b p-5">
        <h2 id="section-reorder-title" className="text-lg font-semibold">จัดลำดับหมวด</h2>
        <p className="mt-1 text-sm text-muted-foreground">ลากหมวดเพื่อเปลี่ยนลำดับภายในกลุ่มนี้</p>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} accessibility={{ screenReaderInstructions: { draggable: "ใช้เมาส์ นิ้ว หรือแป้นพิมพ์ลากปุ่มจับเพื่อเปลี่ยนลำดับหมวด" } }}>
        <SortableContext items={orderedSections.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <ul aria-label="เรียงลำดับหมวด" className="divide-y">
            {orderedSections.map((section) => <SortableSectionRow key={section.id} section={section} disabled={isPending} />)}
          </ul>
        </SortableContext>
      </DndContext>
      <div className="grid gap-3 border-t p-4 sm:flex sm:justify-end">
        <button type="button" disabled={isPending} onClick={onCancel} className="min-h-11 rounded-full border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">ยกเลิก</button>
        <button type="button" disabled={isPending} onClick={saveOrder} className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{isPending ? "กำลังบันทึก" : "บันทึกลำดับ"}</button>
      </div>
    </section>
  );
}

function SortableSectionRow({ section, disabled }: { section: AdminExplorerSection; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id, disabled });
  return (
    <li ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 p-4">
      <button type="button" aria-label={`ลาก ${section.title}`} disabled={disabled} style={{ touchAction: "none" }} className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" {...attributes} {...listeners}><GripVertical className="size-5" aria-hidden="true" /></button>
      <div className="min-w-0"><h3 className="break-words font-medium">{section.title}</h3></div>
    </li>
  );
}
