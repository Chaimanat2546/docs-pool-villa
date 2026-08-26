"use client";

import { useState } from "react";

import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { SectionReorderList } from "./section-reorder-list";
import { ArrowDownUp } from "lucide-react";

type ReorderTarget = "root" | "child" | null;

type SectionReorderHubProps = {
  sections: AdminExplorerSection[];
  onClose: () => void;
  onSaved: () => void;
};

export function SectionReorderHub({ sections, onClose, onSaved }: SectionReorderHubProps) {
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [target, setTarget] = useState<ReorderTarget>(null);
  const roots = sections.filter((section) => section.parentId === null);
  const children = selectedRootId
    ? sections.filter((section) => section.parentId === selectedRootId)
    : [];
  const handleSaved = () => {
    setTarget(null);
    setSelectedRootId(null);
    onSaved();
  };

  if (target === "root") {
    return <SectionReorderList parentId={null} sections={roots} onCancel={() => setTarget(null)} onSaved={handleSaved} />;
  }

  if (target === "child" && selectedRootId) {
    return <SectionReorderList parentId={selectedRootId} sections={children} onCancel={() => setTarget(null)} onSaved={handleSaved} />;
  }

  return (
    <section aria-labelledby="section-reorder-hub-title" className="mt-6 rounded-xl border bg-card shadow-sm">
      <div className="border-b p-5">
        <h2 id="section-reorder-hub-title" className="text-lg font-semibold">จัดลำดับหมวดหมู่</h2>
        <p className="mt-1 text-sm text-muted-foreground">เลือกหมวดหลักเพื่อเปิดการจัดลำดับหมวดย่อย</p>
      </div>
      <ul aria-label="รายการหมวดหมู่" className="divide-y">
        {roots.map((root) => {
          const rootChildren = sections.filter((section) => section.parentId === root.id);

          return (
            <li key={root.id}>
              <button
                type="button"
                aria-pressed={selectedRootId === root.id}
                onClick={() => setSelectedRootId(root.id)}
                className="flex min-h-11 w-full items-center px-5 text-left font-medium hover:bg-muted aria-pressed:bg-muted"
              >
                {root.title}
              </button>
              {rootChildren.length > 0 && (
                <ul aria-label={`หมวดย่อยของ ${root.title}`} className="border-t">
                  {rootChildren.map((child) => (
                    <li key={child.id} className="min-h-11 border-b px-9 py-3 text-sm text-muted-foreground last:border-b-0">
                      {child.title}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="grid gap-3 border-t p-4 sm:flex sm:justify-end">
        <button
          type="button"
          disabled={roots.length < 2}
          onClick={() => setTarget("root")}
          className="min-h-11 rounded-full border px-4 text-sm font-medium disabled:opacity-50"
        >
          จัดลำดับหมวดหลัก
        </button>
        <button
          type="button"
          disabled={!selectedRootId || children.length < 2}
          onClick={() => setTarget("child")}
          className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          จัดลำดับหมวดย่อย
        </button>
      </div>
    </section>
  );
}
