"use client";

import type { JSONContent } from "@tiptap/core";
import { Eye, Save } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { DocumentEditor } from "@/components/editor/document-editor";
import { EditorPreview } from "@/components/editor/editor-preview";
import type {
  PendingImage,
  UploadedPendingImage,
} from "@/components/editor/pending-images";
import { uploadPendingImage } from "@/components/editor/pending-images";
import { HardDeleteDialog } from "@/components/admin/hard-delete-dialog";
import { DocumentProgressStepper } from "@/components/admin/document-progress-stepper";
import { MediaOperationBanner } from "@/components/admin/media-operation-banner";
import { MediaProgressList } from "@/components/admin/media-progress-list";
import { useAdminToast } from "@/components/admin/admin-toast";
import { useUnsavedNavigation } from "@/components/admin/unsaved-navigation";
import { createMediaUploadTicket } from "@/app/admin/editor/actions";
import { replacePendingImages } from "@/lib/media/content-media";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";

import {
  deleteDocument,
  retryMediaOperation,
  rollbackUploadedMedia,
  saveDocument,
} from "./actions";

export type SectionOption = {
  id: string;
  title: string;
  parentId: string | null;
  sortOrder: number;
};
export type DocumentRecord = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: JSONContent;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  version: number;
};

type FormState = Omit<DocumentRecord, "id" | "version" | "content">;
type DocumentStage = "content" | "review";
type FieldErrors = Partial<
  Record<"title" | "slug" | "sectionId", string>
>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function permanentMediaUrl(objectKey: string): string {
  const base = process.env.NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL;
  if (!base) return "";
  return new URL(
    `/objects/${objectKey.split("/").map(encodeURIComponent).join("/")}`,
    base
  ).toString();
}

function snapshot(form: FormState, content: JSONContent): string {
  return JSON.stringify({ form, content });
}

function sectionPath(sections: SectionOption[], sectionId: string): string {
  const section = sections.find((candidate) => candidate.id === sectionId);
  if (!section) return "ไม่พบหมวด";
  const parent = section.parentId
    ? sections.find((candidate) => candidate.id === section.parentId)
    : null;
  return parent ? `${parent.title} › ${section.title}` : section.title;
}

export function DocumentForm({
  document,
  sections,
  initialStage,
  returnHref,
  pendingOperation = null,
  hardDeleteFiles = [],
}: {
  document: DocumentRecord;
  sections: SectionOption[];
  initialStage: DocumentStage;
  returnHref: string;
  pendingOperation?: MediaOperationView | null;
  hardDeleteFiles?: string[];
}) {
  const router = useRouter();
  const { dismiss, showError, showLoading, update } = useAdminToast();
  const { registerDirty, requestNavigation } = useUnsavedNavigation();
  const idRef = useRef(document.id);
  const [stage, setStage] = useState<DocumentStage>(initialStage);
  const [form, setForm] = useState<FormState>({
    sectionId: document.sectionId,
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt ?? "",
    status: document.status,
    sortOrder: document.sortOrder,
  });
  const [content, setContent] = useState<JSONContent>(document.content);
  const [contentRevision, setContentRevision] = useState(0);
  const [version, setVersion] = useState<number>(document.version);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [operation, setOperation] = useState<MediaOperationView | null>(
    pendingOperation
  );
  const [savedSectionId, setSavedSectionId] = useState(document.sectionId);
  const [retrying, startRetry] = useTransition();
  const retriedOperationRef = useRef<string | null>(null);
  const retryInFlightRef = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const sectionInputRef = useRef<HTMLSelectElement>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot(
      {
        sectionId: document.sectionId,
        title: document.title,
        slug: document.slug,
        excerpt: document.excerpt ?? "",
        status: document.status,
        sortOrder: document.sortOrder,
      },
      document.content
    )
  );
  const dirty = useMemo(
    () =>
      snapshot(form, content) !== savedSnapshot ||
      pendingImages.length > 0 ||
      isPreparingImages,
    [form, content, isPreparingImages, pendingImages.length, savedSnapshot]
  );

  useEffect(() => {
    registerDirty(dirty);
    return () => registerDirty(false);
  }, [dirty, registerDirty]);

  const retryOperation = useCallback(
    (currentOperation: MediaOperationView) => {
      if (retryInFlightRef.current === currentOperation.operationId) return;
      retryInFlightRef.current = currentOperation.operationId;
      startRetry(async () => {
        try {
          const result = await retryMediaOperation(
            currentOperation.operationId
          );
          if ("success" in result) {
            setOperation(null);
            if (currentOperation.kind === "document_delete") {
              registerDirty(false);
              requestNavigation(returnHref);
            } else {
              router.refresh();
            }
          } else if ("pending" in result) setOperation(result.operation);
          else showError(result.error);
        } catch (error) {
          showError(
            error instanceof Error ? error.message : "ไม่สามารถลองลบรูปอีกครั้ง"
          );
        } finally {
          if (retryInFlightRef.current === currentOperation.operationId)
            retryInFlightRef.current = null;
        }
      });
    },
    [registerDirty, requestNavigation, returnHref, router, showError, startRetry]
  );

  useEffect(() => {
    if (!operation || retriedOperationRef.current === operation.operationId)
      return;
    retriedOperationRef.current = operation.operationId;
    retryOperation(operation);
  }, [operation, retryOperation]);

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (!form.title.trim()) errors.title = "กรุณากรอกชื่อเอกสาร";
    if (!slugPattern.test(form.slug))
      errors.slug = "Slug ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น";
    if (!sections.some((section) => section.id === form.sectionId))
      errors.sectionId = "กรุณาเลือกหมวดที่ถูกต้อง";
    setFieldErrors(errors);

    const firstInvalid = errors.title
      ? titleInputRef.current
      : errors.slug
      ? slugInputRef.current
      : errors.sectionId
      ? sectionInputRef.current
      : null;
    firstInvalid?.focus();
    return Object.keys(errors).length === 0;
  }

  async function persist(): Promise<boolean> {
    if (saving || operation || isPreparingImages || !validateFields())
      return false;
    setSaving(true);
    const batchSize = pendingImages.length;
    const toastId = showLoading(
      batchSize > 0
        ? `กำลังอัปโหลดรูป ${batchSize} รูปและบันทึกเอกสาร`
        : "กำลังบันทึกเอกสาร"
    );
    const uploaded = new Map<string, UploadedPendingImage>();
    const uploadFailures: string[] = [];
    let saveSubmitted = false;
    try {
      for (const image of pendingImages) {
        setPendingImages((current) =>
          current.map((candidate) =>
            candidate.id === image.id
              ? { ...candidate, status: "uploading", progress: 0 }
              : candidate
          )
        );
        try {
          const result = await uploadPendingImage(
            idRef.current,
            image,
            (progress) =>
              setPendingImages((current) =>
                current.map((candidate) =>
                  candidate.id === image.id
                    ? { ...candidate, status: "uploading", progress }
                    : candidate
                )
              ),
            createMediaUploadTicket
          );
          uploaded.set(image.id, result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ";
          uploadFailures.push(message);
          setPendingImages((current) =>
            current.map((candidate) =>
              candidate.id === image.id
                ? { ...candidate, status: "error", error: message }
                : candidate
            )
          );
        }
      }
      if (uploadFailures.length > 0) {
        if (uploaded.size > 0) {
          try {
            await rollbackUploadedMedia(
              idRef.current,
              [...uploaded.values()].map((item) => ({
                ...item,
                displayLabel: `${item.mediaId}.webp`,
              }))
            );
          } catch {
            // The per-file upload errors remain the user-facing recovery path.
          }
          setPendingImages((current) =>
            current.map((candidate) =>
              uploaded.has(candidate.id)
                ? { ...candidate, status: "ready", progress: undefined }
                : candidate
            )
          );
        }
        update(
          toastId,
          uploaded.size > 0 ? "warning" : "error",
          uploaded.size > 0
            ? `อัปโหลดรูปสำเร็จ ${uploaded.size} จาก ${batchSize} รูป กรุณาลองบันทึกอีกครั้ง`
            : "ไม่สามารถอัปโหลดรูปได้ กรุณาลองบันทึกอีกครั้ง"
        );
        return false;
      }
      const persistedContent = replacePendingImages(
        content,
        uploaded,
        permanentMediaUrl
      );
      // Once the prepared-save RPC starts, it owns any newly uploaded media:
      // failures are recorded durably for retry rather than cleaned up here.
      saveSubmitted = true;
      const result = await saveDocument({
        id: idRef.current,
        sectionId: form.sectionId,
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: persistedContent,
        status: form.status,
        sortOrder: Number(form.sortOrder),
        expectedVersion: version,
        media: [...uploaded.values()],
      });
      if ("error" in result) {
        update(toastId, "error", result.error);
        return false;
      }
      if ("pending" in result) {
        dismiss(toastId);
        setOperation(result.operation);
        return false;
      }
      setContent(persistedContent);
      setContentRevision((current) => current + 1);
      setVersion(result.version);
      setPendingImages([]);
      setSavedSnapshot(snapshot(form, persistedContent));
      setSavedSectionId(form.sectionId);
      registerDirty(false);
      update(toastId, "success", "บันทึกเอกสารสำเร็จ");
      return true;
    } catch (error) {
      if (!saveSubmitted && uploaded.size > 0) {
        try {
          await rollbackUploadedMedia(
            idRef.current,
            [...uploaded.values()].map((item) => ({
              ...item,
              displayLabel: `${item.mediaId}.webp`,
            }))
          );
        } catch {
          // The original upload failure remains the user-facing result.
        }
      }
      update(
        toastId,
        "error",
        error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ"
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndReview(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!(await persist())) return;
    setStage("review");
    router.replace(
      `/admin/documents/${document.id}?section=${encodeURIComponent(
        form.sectionId
      )}&stage=review`
    );
  }

  async function finalSave() {
    if (!(await persist())) return;
    requestNavigation(
      `/admin/structure?section=${encodeURIComponent(form.sectionId)}`
    );
  }

  function returnToContent() {
    setStage("content");
    router.replace(
      `/admin/documents/${document.id}?section=${encodeURIComponent(
        savedSectionId
      )}&stage=content`
    );
  }

  async function remove() {
    if (saving || operation) return;
    setSaving(true);
    const toastId = showLoading("กำลังลบเอกสาร");
    try {
      const result = await deleteDocument(document.id, version);
      if ("error" in result) {
        update(toastId, "error", result.error);
        return;
      }
      if ("pending" in result) {
        dismiss(toastId);
        setOperation(result.operation);
        return;
      }
      registerDirty(false);
      update(toastId, "success", "ลบเอกสารสำเร็จ");
      requestNavigation(
        `/admin/structure?section=${encodeURIComponent(savedSectionId)}`
      );
    } catch (error) {
      update(
        toastId,
        "error",
        error instanceof Error ? error.message : "ลบเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง"
      );
    } finally {
      setSaving(false);
    }
  }

  const savedReturnHref =
    savedSectionId === document.sectionId
      ? returnHref
      : `/admin/structure?section=${encodeURIComponent(savedSectionId)}`;

  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">แก้ไขเอกสาร</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          บันทึกด้วยตนเองเท่านั้น {dirty ? "• มีการแก้ไขที่ยังไม่บันทึก" : ""}
        </p>
      </header>

      <DocumentProgressStepper currentStep={stage} />

      {operation && (
        <MediaOperationBanner
          operation={operation}
          pending={retrying}
          onRetry={() => retryOperation(operation)}
        />
      )}

      {stage === "content" ? (
        <section aria-labelledby="content-stage-heading">
          <form noValidate onSubmit={saveAndReview}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 id="content-stage-heading" className="text-xl font-semibold">
                เขียนเนื้อหา
              </h2>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium cursor-pointer"
              >
                <Eye size={16} aria-hidden="true" />
                ดูตัวอย่าง
              </button>
            </div>
            <div className="mb-6 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
              <label className="text-sm font-medium" htmlFor="document-title">
                ชื่อเอกสาร
                <input
                  ref={titleInputRef}
                  id="document-title"
                  required
                  aria-invalid={fieldErrors.title ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.title ? "document-title-error" : undefined
                  }
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className="mt-1 h-11 w-full rounded-md border bg-background px-3"
                />
                {fieldErrors.title && (
                  <span
                    id="document-title-error"
                    className="mt-1 block text-xs text-destructive"
                  >
                    {fieldErrors.title}
                  </span>
                )}
              </label>
              <label className="text-sm font-medium" htmlFor="document-slug">
                Slug
                <input
                  ref={slugInputRef}
                  id="document-slug"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  aria-invalid={fieldErrors.slug ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.slug ? "document-slug-error" : undefined
                  }
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value })
                  }
                  className="mt-1 h-11 w-full rounded-md border bg-background px-3 font-mono"
                />
                {fieldErrors.slug && (
                  <span
                    id="document-slug-error"
                    className="mt-1 block text-xs text-destructive"
                  >
                    {fieldErrors.slug}
                  </span>
                )}
              </label>
              <label className="text-sm font-medium" htmlFor="document-section">
                หมวด
                <select
                  ref={sectionInputRef}
                  id="document-section"
                  aria-invalid={fieldErrors.sectionId ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.sectionId ? "document-section-error" : undefined
                  }
                  value={form.sectionId}
                  onChange={(event) =>
                    setForm({ ...form, sectionId: event.target.value })
                  }
                  className="mt-1 h-11 w-full rounded-md border bg-background px-3"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.parentId ? "↳ " : ""}
                      {section.title}
                    </option>
                  ))}
                </select>
                {fieldErrors.sectionId && (
                  <span
                    id="document-section-error"
                    className="mt-1 block text-xs text-destructive"
                  >
                    {fieldErrors.sectionId}
                  </span>
                )}
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                คำเกริ่น
                <textarea
                  value={form.excerpt ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, excerpt: event.target.value })
                  }
                  rows={2}
                  placeholder="เช่น คำอธิบายเอกสาร"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                />
              </label>
            </div>
            <DocumentEditor
              content={content}
              contentRevision={contentRevision}
              onChange={(nextContent, nextPending) => {
                setContent(nextContent);
                setPendingImages(nextPending);
              }}
              onPreparationChange={setIsPreparingImages}
            />
            {isPreparingImages && (
              <p role="alert" className="mt-3 text-sm text-amber-700">
                กรุณารอให้เตรียมรูปเสร็จก่อนบันทึก
              </p>
            )}
            <MediaProgressList images={pendingImages} />
            <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap justify-end gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur sm:bottom-4 sm:p-3">
              <button
                type="button"
                onClick={() => requestNavigation(savedReturnHref)}
                className="min-h-11 rounded-full border px-4 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving || Boolean(operation) || isPreparingImages}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Save size={16} aria-hidden="true" />
                {saving ? "กำลังบันทึก" : "บันทึกและตรวจต่อ"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section
          aria-labelledby="review-stage-heading"
          className="rounded-xl border bg-card p-4 sm:p-6"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                {sectionPath(sections, savedSectionId)}
              </p>
              <h2
                id="review-stage-heading"
                className="mt-2 text-xl font-semibold"
              >
                ตรวจและเผยแพร่
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ตรวจตัวอย่างและเลือกสถานะก่อนบันทึกขั้นสุดท้าย
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium cursor-pointer"
            >
              <Eye size={16} aria-hidden="true" />
              ดูตัวอย่าง
            </button>
          </div>

          <label className="mt-6 block text-sm font-medium">
            สถานะ{" "}
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as FormState["status"],
                })
              }
              className="mt-1 h-11 w-full rounded-md border bg-background px-3 sm:max-w-sm"
            >
              <option value="draft">ฉบับร่าง</option>
              <option value="published">เผยแพร่</option>
              <option value="archived">เก็บถาวร</option>
            </select>
          </label>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={returnToContent}
              className="min-h-11 rounded-full border px-4 text-sm font-medium"
            >
              แก้ไขเนื้อหา
            </button>
            <button
              type="button"
              onClick={() => requestNavigation(savedReturnHref)}
              className="min-h-11 rounded-full border px-4 text-sm font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={saving || Boolean(operation) || isPreparingImages}
              onClick={finalSave}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Save size={16} aria-hidden="true" />
              {saving ? "กำลังบันทึก" : "บันทึกและกลับรายการ"}
            </button>
          </div>
        </section>
      )}

      <div className="mt-6 border-t pt-4">
        <HardDeleteDialog
          title="ลบเอกสารถาวร"
          targetName={document.title}
          files={hardDeleteFiles}
          pending={saving}
          disabled={Boolean(operation)}
          onConfirm={remove}
        />
      </div>
      <EditorPreview
        content={content}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </main>
  );
}
