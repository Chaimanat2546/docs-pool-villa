"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createDocumentDraft } from "@/app/admin/(content)/documents/actions";
import { getAdminSectionPath, type AdminExplorerSection } from "@/lib/docs/admin-explorer";

type DocumentSetupFormProps = {
  sections: AdminExplorerSection[];
  selectedSectionId: string;
};

export function DocumentSetupForm({ sections, selectedSectionId }: DocumentSetupFormProps) {
  const router = useRouter();
  const documentIdRef = useRef(crypto.randomUUID());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [sectionId, setSectionId] = useState(selectedSectionId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const selectedPath = getAdminSectionPath(sections, sectionId);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsPending(true);
    setMessage(null);
    try {
      const result = await createDocumentDraft({
        id: documentIdRef.current,
        sectionId,
        title,
        slug,
      });

      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      if ("pending" in result) {
        setMessage(result.operation.message);
        return;
      }

      router.replace(`/admin/documents/${result.id}?section=${encodeURIComponent(sectionId)}&stage=content`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถสร้างฉบับร่างได้");
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <section aria-labelledby="document-setup-title" className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">ขั้นที่ 1 จาก 3 · ข้อมูลเอกสาร</p>
      <h1 id="document-setup-title" className="mt-1 text-2xl font-semibold">สร้างเอกสาร</h1>
      <p className="mt-2 text-sm text-muted-foreground">กำหนดข้อมูลเริ่มต้นก่อนเปิดหน้าเขียนเนื้อหา</p>

      {message && (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {message}
        </p>
      )}

      <form aria-label="ข้อมูลเอกสาร" className="mt-6 space-y-5" onSubmit={submit}>
        <Field label="ชื่อเอกสาร" htmlFor="document-title">
          <input
            ref={titleInputRef}
            id="document-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3"
          />
        </Field>

        <Field label="Slug" htmlFor="document-slug" hint="เช่น create-booking">
          <input
            id="document-slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 font-mono"
          />
        </Field>

        <Field label="หมวดเอกสาร" htmlFor="document-section">
          <select
            id="document-section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {getAdminSectionPath(sections, section.id).map((item) => item.title).join(" › ")}
              </option>
            ))}
          </select>
          <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
            ตำแหน่ง: <span className="font-medium text-foreground">{selectedPath.map((section) => section.title).join(" › ")}</span>
          </p>
        </Field>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Link
            href={`/admin/structure?section=${encodeURIComponent(sectionId)}`}
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-muted"
          >
            ยกเลิก
          </Link>
          <button
            disabled={isPending}
            type="submit"
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "กำลังสร้างฉบับร่าง" : "สร้างฉบับร่างและเขียนต่อ"}
          </button>
        </div>
      </form>
    </section>
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
