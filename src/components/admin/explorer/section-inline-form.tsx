"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveSection } from "@/app/admin/(content)/structure/actions";
import type { AdminExplorerSection } from "@/lib/docs/admin-explorer";

import type { SectionMode } from "./section-mode";

type EditableSectionMode = Exclude<SectionMode, "view">;

type SectionInlineFormProps = {
  mode: EditableSectionMode;
  section: AdminExplorerSection | null;
  parent: AdminExplorerSection | null;
  rootSections: AdminExplorerSection[];
};

type SectionFormState = {
  title: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isPublished: boolean;
};

function initialFormState(mode: EditableSectionMode, section: AdminExplorerSection | null, parent: AdminExplorerSection | null): SectionFormState {
  if (mode === "edit" && section) {
    return {
      title: section.title,
      slug: section.slug,
      description: section.description ?? "",
      parentId: section.parentId ?? "",
      sortOrder: String(section.sortOrder),
      isPublished: section.isPublished,
    };
  }

  return {
    title: "",
    slug: "",
    description: "",
    parentId: mode === "create-child" ? parent?.id ?? "" : "",
    sortOrder: "0",
    isPublished: true,
  };
}

function modeLabel(mode: EditableSectionMode): string {
  if (mode === "create-root") return "สร้างหมวดหลัก";
  if (mode === "create-child") return "สร้างหมวดย่อย";
  return "แก้ไขหมวด";
}

export function SectionInlineForm({ mode, section, parent, rootSections }: SectionInlineFormProps) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => initialFormState(mode, section, parent));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const label = modeLabel(mode);
  const cancelHref = mode === "create-root"
    ? "/admin/structure"
    : `/admin/structure?section=${encodeURIComponent(section?.id ?? parent?.id ?? "")}`;

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveSection({
        id: mode === "edit" ? section?.id : undefined,
        title: form.title,
        slug: form.slug,
        description: form.description,
        parentId: mode === "create-root" ? null : form.parentId || null,
        sortOrder: Number(form.sortOrder),
        isPublished: form.isPublished,
      });

      if ("error" in result) {
        setMessage(result.error);
        return;
      }

      router.replace(`/admin/structure?section=${encodeURIComponent(result.id)}`);
      router.refresh();
    });
  }

  const advancedFields = (
    <div className="space-y-4">
      {mode === "edit" && (
        <Field label="หมวดแม่" htmlFor="section-parent">
          <select
            id="section-parent"
            aria-label="หมวดแม่"
            value={form.parentId}
            onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
            className="h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="">ไม่มี (หมวดหลัก)</option>
            {rootSections.map((root) => <option key={root.id} value={root.id}>{root.title}</option>)}
          </select>
        </Field>
      )}
      <Field label="คำอธิบาย" htmlFor="section-description">
        <textarea
          id="section-description"
          rows={3}
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </Field>
      <Field label="ลำดับ" htmlFor="section-order" hint="ตัวเลขน้อยจะแสดงก่อน">
        <input
          id="section-order"
          type="number"
          min="0"
          step="1"
          value={form.sortOrder}
          onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
          className="h-11 w-full rounded-md border bg-background px-3"
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3 rounded-md border p-3 text-sm">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))}
        />
        แสดงหมวดนี้ในหน้า Public เมื่อมีเอกสาร Published
      </label>
    </div>
  );

  return (
    <form aria-label={label} className="rounded-xl border bg-card p-5 shadow-sm" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{label}</h2>
      {mode === "create-child" && parent && (
        <p className="mt-1 text-sm text-muted-foreground">หมวดแม่: <span className="font-medium text-foreground">{parent.title}</span></p>
      )}
      {message && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      <div className="mt-5 space-y-4">
        <Field label="ชื่อหมวด" htmlFor="section-title">
          <input
            ref={titleInputRef}
            id="section-title"
            required
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="h-11 w-full rounded-md border bg-background px-3"
          />
        </Field>
        <Field label="Slug" htmlFor="section-slug" hint="เช่น getting-started">
          <input
            id="section-slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            className="h-11 w-full rounded-md border bg-background px-3 font-mono"
          />
        </Field>
        {mode === "edit" ? advancedFields : (
          <details className="rounded-lg border p-4">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">ตั้งค่าเพิ่มเติม</summary>
            <div className="pt-4">{advancedFields}</div>
          </details>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-muted">ยกเลิก</Link>
        <button disabled={isPending} type="submit" className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isPending ? "กำลังบันทึก" : "บันทึกหมวด"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={htmlFor}>{label}</label>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
