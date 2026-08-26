"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createDocumentDraft } from "@/app/admin/(content)/documents/actions";
import { DocumentProgressStepper } from "@/components/admin/document-progress-stepper";
import { useAdminToast } from "@/components/admin/admin-toast";
import {
  getAdminSectionPath,
  type AdminExplorerSection,
} from "@/lib/docs/admin-explorer";

type DocumentSetupFormProps = {
  sections: AdminExplorerSection[];
  selectedSectionId: string;
};

export function DocumentSetupForm({
  sections,
  selectedSectionId,
}: DocumentSetupFormProps) {
  const router = useRouter();
  const { showLoading, update } = useAdminToast();
  const documentIdRef = useRef(crypto.randomUUID());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [sectionId, setSectionId] = useState(selectedSectionId);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
    const toastId = showLoading("กำลังสร้างฉบับร่าง");
    try {
      const result = await createDocumentDraft({
        id: documentIdRef.current,
        sectionId,
        title,
        slug,
      });

      if ("error" in result) {
        update(toastId, "error", result.error);
        return;
      }
      if ("pending" in result) {
        update(toastId, "error", result.operation.message);
        return;
      }

      update(toastId, "success", "สร้างฉบับร่างสำเร็จ");

      router.replace(
        `/admin/documents/${result.id}?section=${encodeURIComponent(
          sectionId
        )}&stage=content`
      );
    } catch (error) {
      update(
        toastId,
        "error",
        error instanceof Error ? error.message : "ไม่สามารถสร้างฉบับร่างได้"
      );
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1
          id="document-setup-title"
          className="break-words text-2xl font-semibold"
        >
          สร้างเอกสาร
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          กำหนดข้อมูลเริ่มต้นก่อนเปิดหน้าเขียนเนื้อหา
        </p>
      </header>

      <DocumentProgressStepper currentStep="setup" />

      <section aria-labelledby="document-setup-heading">
        <form aria-label="ข้อมูลเอกสาร" className="space-y-5" onSubmit={submit}>
          <div className="mb-6">
            <h2 id="document-setup-heading" className="text-xl font-semibold">
              ข้อมูลเอกสาร
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ระบุชื่อ URL และหมวดของเอกสารฉบับร่าง
            </p>
          </div>
          <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
            <Field label="ชื่อเอกสาร" htmlFor="document-title">
              <input
                ref={titleInputRef}
                id="document-title"
                required
                placeholder="ชื่อเอกสาร"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3"
              />
            </Field>

            <Field
              label="Slug"
              htmlFor="document-slug"
            >
              <input
                id="document-slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={slug}
                placeholder="เช่น create-booking"
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
                    {getAdminSectionPath(sections, section.id)
                      .map((item) => item.title)
                      .join(" › ")}
                  </option>
                ))}
              </select>
              <p
                aria-live="polite"
                className="mt-2 min-w-0 break-words text-sm text-muted-foreground"
              >
                ตำแหน่ง:{" "}
                <span className="break-words font-medium text-foreground">
                  {selectedPath.map((section) => section.title).join(" › ")}
                </span>
              </p>
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
            <Link
              href={`/admin/structure?section=${encodeURIComponent(sectionId)}`}
              className="inline-flex border border-input min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-muted"
            >
              ยกเลิก
            </Link>
            <button
              disabled={isPending}
              type="submit"
              className=" cursor-pointer min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "กำลังสร้างฉบับร่าง" : "สร้างฉบับร่างและเขียนต่อ"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
