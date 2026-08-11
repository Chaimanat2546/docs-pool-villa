"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronRight, FileWarning, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteSection, getDeletePreview, saveSection, type DeletePreview } from "./actions";

export type Section = {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  sort_order: number;
};

type SectionForm = {
  title: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isPublished: boolean;
};

const emptyForm: SectionForm = {
  title: "",
  slug: "",
  description: "",
  parentId: "",
  sortOrder: "0",
  isPublished: true,
};

function toForm(section: Section): SectionForm {
  return {
    title: section.title,
    slug: section.slug,
    description: section.description ?? "",
    parentId: section.parent_id ?? "",
    sortOrder: String(section.sort_order),
    isPublished: section.is_published,
  };
}

export function StructureManager({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [form, setForm] = useState<SectionForm>(() => (sections[0] ? toForm(sections[0]) : emptyForm));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [confirmedName, setConfirmedName] = useState("");
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const byParent = useMemo(() => {
    const result = new Map<string | null, Section[]>();
    for (const section of sections) {
      const children = result.get(section.parent_id) ?? [];
      children.push(section);
      result.set(section.parent_id, children);
    }
    return result;
  }, [sections]);

  const selected = sections.find((section) => section.id === selectedId) ?? null;
  const rootSections = byParent.get(null) ?? [];

  useEffect(() => {
    if (deleteTarget) deleteInputRef.current?.focus();
  }, [deleteTarget]);

  function chooseSection(section: Section) {
    setSelectedId(section.id);
    setForm(toForm(section));
    setMessage(null);
  }

  function createSection(parentId = "") {
    setSelectedId(null);
    setForm({ ...emptyForm, parentId });
    setMessage(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveSection({
        id: selectedId ?? undefined,
        title: form.title,
        slug: form.slug,
        description: form.description,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder),
        isPublished: form.isPublished,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("บันทึกหมวดแล้ว");
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteSection(deleteTarget.id, confirmedName);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setDeleteTarget(null);
      setConfirmedName("");
      setSelectedId(null);
      setForm(emptyForm);
      setMessage("ลบหมวดแล้ว");
      router.refresh();
    });
  }

  function requestDelete(section: Section) {
    setMessage(null);
    startTransition(async () => {
      const result = await getDeletePreview(section.id);
      if (!("childSectionCount" in result)) {
        setMessage(result.error ?? "ไม่สามารถตรวจสอบข้อมูลก่อนลบได้");
        return;
      }
      setDeleteTarget(section);
      setDeletePreview(result);
      setConfirmedName("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section aria-label="โครงสร้างหมวด" className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">โครงสร้างคู่มือ</h2>
            <p className="text-sm text-muted-foreground">เรียงจากลำดับน้อยไปมาก</p>
          </div>
          <button type="button" onClick={() => createSection()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={16} aria-hidden="true" /> เพิ่มหมวดหลัก
          </button>
        </div>

        {rootSections.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">ยังไม่มีหมวด สร้างหมวดหลักแรกเพื่อเริ่มต้น</p>
        ) : (
          <ul className="space-y-2">
            {rootSections.map((root) => (
              <li key={root.id}>
                <TreeItem section={root} selected={selectedId === root.id} onSelect={chooseSection} />
                <ul className="ml-5 mt-1 space-y-1 border-l pl-3">
                  {(byParent.get(root.id) ?? []).map((child) => (
                    <li key={child.id}><TreeItem section={child} selected={selectedId === child.id} onSelect={chooseSection} /></li>
                  ))}
                </ul>
                <button type="button" onClick={() => createSection(root.id)} className="ml-5 mt-2 inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus size={15} aria-hidden="true" /> เพิ่มหมวดย่อย
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{selected ? "แก้ไขหมวด" : "สร้างหมวด"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">หมวดย่อยอยู่ได้ใต้หมวดหลักเท่านั้น</p>
        {message && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <Field label="ชื่อหมวด" htmlFor="section-title">
            <input id="section-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-11 w-full rounded-md border bg-background px-3" />
          </Field>
          <Field label="Slug" htmlFor="section-slug" hint="เช่น getting-started">
            <input id="section-slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="h-11 w-full rounded-md border bg-background px-3 font-mono" />
          </Field>
          <Field label="หมวดแม่" htmlFor="section-parent">
            <select id="section-parent" value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })} className="h-11 w-full rounded-md border bg-background px-3">
              <option value="">ไม่มี (หมวดหลัก)</option>
              {rootSections.filter((root) => root.id !== selectedId).map((root) => <option key={root.id} value={root.id}>{root.title}</option>)}
            </select>
          </Field>
          <Field label="ลำดับ" htmlFor="section-order" hint="ตัวเลขน้อยจะแสดงก่อน">
            <input id="section-order" type="number" min="0" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="h-11 w-full rounded-md border bg-background px-3" />
          </Field>
          <Field label="คำอธิบาย" htmlFor="section-description">
            <textarea id="section-description" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-md border bg-background px-3 py-2" />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-md border p-3 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />
            แสดงหมวดนี้ในหน้า Public เมื่อมีเอกสาร Published
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {selected ? <button type="button" disabled={isPending} onClick={() => requestDelete(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 size={16} aria-hidden="true" /> ลบหมวด</button> : <span />}
            <button disabled={isPending} type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"><Save size={16} aria-hidden="true" /> {isPending ? "กำลังบันทึก" : "บันทึกหมวด"}</button>
          </div>
        </form>
      </section>

      {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
          <div className="flex items-start gap-3"><FileWarning className="mt-1 text-destructive" aria-hidden="true" /><div><h2 id="delete-title" className="text-lg font-semibold">ยืนยันการลบหมวด</h2><p className="mt-1 text-sm text-muted-foreground">การลบเป็นแบบถาวร เอกสารและหมวดย่อยที่ไม่มีรูปจะถูกลบด้วย</p></div></div>
          {deletePreview && <div className="mt-4 rounded-lg bg-muted p-3 text-sm"><p>หมวดย่อย: {deletePreview.childSectionCount} หมวด · เอกสาร: {deletePreview.documentCount} รายการ · รูป: {deletePreview.mediaCount} รูป</p>{deletePreview.documentTitles.length > 0 && <ul className="mt-2 list-disc pl-5 text-muted-foreground">{deletePreview.documentTitles.map((title, index) => <li key={`${title}-${index}`}>{title}</li>)}</ul>}{deletePreview.mediaCount > 0 && <p className="mt-2 text-destructive">ระบบจะไม่ลบข้อมูลจนกว่าจะลบรูปจาก R2 สำเร็จ</p>}</div>}
          <label className="mt-5 block text-sm font-medium" htmlFor="confirm-name">พิมพ์ “{deleteTarget.title}” เพื่อยืนยัน</label>
          <input ref={deleteInputRef} id="confirm-name" value={confirmedName} onChange={(event) => setConfirmedName(event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-background px-3" />
          <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isPending} onClick={() => { setDeleteTarget(null); setDeletePreview(null); }} className="min-h-10 rounded-full px-4 text-sm hover:bg-muted">ยกเลิก</button><button type="button" disabled={isPending || confirmedName !== deleteTarget.title} onClick={confirmDelete} className="min-h-10 rounded-full bg-destructive px-4 text-sm font-medium text-white disabled:opacity-50">{isPending ? "กำลังลบ" : "ลบถาวร"}</button></div>
        </div>
      </div>}
    </div>
  );
}

function TreeItem({ section, selected, onSelect }: { section: Section; selected: boolean; onSelect: (section: Section) => void }) {
  return <button type="button" onClick={() => onSelect(section)} className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm ${selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><ChevronRight size={15} aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{section.title}</span>{!section.is_published && <span className="text-xs opacity-75">ซ่อน</span>}</button>;
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium" htmlFor={htmlFor}>{label}</label>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}<div className="mt-2">{children}</div></div>;
}
