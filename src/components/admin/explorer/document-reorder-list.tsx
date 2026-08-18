"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";

import { reorderDocuments } from "@/app/admin/(content)/documents/actions";
import { useAdminToast } from "@/components/admin/admin-toast";
import type { AdminDocumentStatus, AdminExplorerDocument } from "@/lib/docs/admin-explorer";

type DocumentReorderListProps = {
  sectionId: string;
  documents: AdminExplorerDocument[];
  onCancel: () => void;
  onSaved: () => void;
};

const statusLabels: Record<AdminDocumentStatus, string> = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่แล้ว",
  archived: "เก็บถาวร",
};

const statusStyles: Record<AdminDocumentStatus, string> = {
  draft: "bg-amber-100 text-amber-900",
  published: "bg-emerald-100 text-emerald-900",
  archived: "bg-slate-200 text-slate-800",
};

export function DocumentReorderList({
  sectionId,
  documents,
  onCancel,
  onSaved,
}: DocumentReorderListProps) {
  const [orderedDocuments, setOrderedDocuments] = useState(() => [...documents]);
  const { showLoading, update } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = orderedDocuments.findIndex((document) => document.id === active.id);
    const overIndex = orderedDocuments.findIndex((document) => document.id === over.id);
    if (activeIndex < 0 || overIndex < 0) return;

    setOrderedDocuments((current) => arrayMove(current, activeIndex, overIndex));
  }

  function saveOrder() {
    startTransition(async () => {
      const toastId = showLoading("กำลังบันทึกลำดับเอกสาร");
      try {
        const result = await reorderDocuments({
          sectionId,
          documentIds: orderedDocuments.map(({ id }) => id),
        });
        if ("error" in result) {
          update(toastId, "error", result.error);
          return;
        }
        update(toastId, "success", "บันทึกลำดับเอกสารสำเร็จ");
        onSaved();
      } catch {
        update(toastId, "error", "บันทึกลำดับเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    });
  }

  return (
    <section aria-labelledby="document-reorder-title" className="w-full rounded-xl border bg-card shadow-sm">
      <div className="border-b p-5">
        <h2 id="document-reorder-title" className="text-lg font-semibold">จัดลำดับเอกสาร</h2>
        <p className="mt-1 text-sm text-muted-foreground">ลากเอกสารเพื่อเปลี่ยนลำดับภายในหมวดนี้</p>
      </div>


      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: "ใช้เมาส์หรือนิ้วลากปุ่มจับเพื่อเปลี่ยนลำดับเอกสาร",
          },
          announcements: {
            onDragStart({ active }) {
              return `เริ่มลาก ${orderedDocuments.find((document) => document.id === active.id)?.title ?? "เอกสาร"}`;
            },
            onDragOver({ active, over }) {
              const activeTitle = orderedDocuments.find((document) => document.id === active.id)?.title ?? "เอกสาร";
              const overTitle = orderedDocuments.find((document) => document.id === over?.id)?.title;
              return overTitle ? `กำลังลาก ${activeTitle} ไปที่ ${overTitle}` : `กำลังลาก ${activeTitle}`;
            },
            onDragEnd({ active, over }) {
              const activeTitle = orderedDocuments.find((document) => document.id === active.id)?.title ?? "เอกสาร";
              const overTitle = orderedDocuments.find((document) => document.id === over?.id)?.title;
              return overTitle ? `วาง ${activeTitle} ที่ ${overTitle}` : `วาง ${activeTitle}`;
            },
            onDragCancel({ active }) {
              return `ยกเลิกการลาก ${orderedDocuments.find((document) => document.id === active.id)?.title ?? "เอกสาร"}`;
            },
          },
        }}
      >
        <SortableContext items={orderedDocuments.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <ul aria-label="เรียงลำดับเอกสาร" className="divide-y">
            {orderedDocuments.map((document) => (
              <SortableDocumentRow key={document.id} document={document} disabled={isPending} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="grid gap-3 border-t p-4 sm:flex sm:justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="min-h-11 rounded-full border px-4 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={saveOrder}
          className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "กำลังบันทึก" : "บันทึกลำดับ"}
        </button>
      </div>
    </section>
  );
}

function SortableDocumentRow({ document, disabled }: { document: AdminExplorerDocument; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: document.id, disabled });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3 p-4">
      <button
        type="button"
        aria-label={`ลาก ${document.title}`}
        disabled={disabled}
        style={{ touchAction: "none" }}
        className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words font-medium">{document.title}</h3>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[document.status]}`}>
            {statusLabels[document.status]}
          </span>
        </div>
      </div>
    </li>
  );
}
