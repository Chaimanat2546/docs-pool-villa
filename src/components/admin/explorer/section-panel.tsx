"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FileWarning } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useRef, useState, useTransition } from "react";

import {
  deleteSection,
  getDeletePreview,
  retrySectionMediaOperation,
  type DeletePreview,
} from "@/app/admin/(content)/structure/actions";
import { MediaOperationBanner } from "@/components/admin/media-operation-banner";
import {
  getAdminSectionPath,
  type AdminExplorerSection,
} from "@/lib/docs/admin-explorer";
import type { AdminExplorerData } from "@/lib/docs/admin-explorer-server";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";

import { SectionInlineForm } from "./section-inline-form";
import { useCreationNavigation } from "./admin-explorer-shell";
import type { SectionMode } from "./section-mode";

type SectionPanelProps = {
  selectedSectionId: string | null;
  mode: SectionMode;
  explorer: AdminExplorerData;
};

function nextSectionSortOrder(
  sections: AdminExplorerSection[],
  parentId: string | null
): number {
  const siblingOrders = sections
    .filter((section) => section.parentId === parentId)
    .map((section) => section.sortOrder);
  return siblingOrders.length === 0 ? 0 : Math.max(...siblingOrders) + 1;
}

export function SectionPanel({
  selectedSectionId,
  mode,
  explorer,
}: SectionPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [operations, setOperations] = useState(
    explorer.pendingSectionOperations
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminExplorerSection | null>(
    null
  );
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(
    null
  );
  const [confirmedName, setConfirmedName] = useState("");
  const [isPending, startTransition] = useTransition();
  const { restoreCreationFocus, setCreationBlocked } = useCreationNavigation();
  const createRootTriggerRef = useRef<HTMLAnchorElement>(null);
  const createChildTriggerRef = useRef<HTMLAnchorElement>(null);
  const editTriggerRef = useRef<HTMLAnchorElement>(null);

  const selectedSection =
    explorer.sections.find((section) => section.id === selectedSectionId) ??
    null;
  const sectionPath = selectedSection
    ? getAdminSectionPath(explorer.sections, selectedSection.id)
    : [];
  const parent = selectedSection?.parentId
    ? explorer.sections.find(
        (section) => section.id === selectedSection.parentId
      ) ?? null
    : null;
  const rootSections = explorer.sections.filter(
    (section) => section.parentId === null
  );
  const selectedHasChildren = selectedSection
    ? explorer.sections.some(
        (section) => section.parentId === selectedSection.id
      )
    : false;
  const availableEditParents = selectedHasChildren
    ? []
    : rootSections.filter((section) => section.id !== selectedSection?.id);
  const mutationsBlocked = operations.length > 0;
  const mayCreateChild = selectedSection?.parentId === null;
  const rootNextSortOrder = nextSectionSortOrder(explorer.sections, null);
  const childNextSortOrder = selectedSection
    ? nextSectionSortOrder(explorer.sections, selectedSection.id)
    : 0;

  function cancelForm(
    href: string,
    trigger: React.RefObject<HTMLAnchorElement | null>
  ) {
    router.replace(href);
    if (!restoreCreationFocus()) trigger.current?.focus();
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeletePreview(null);
    setConfirmedName("");
  }

  function requestDelete() {
    if (!selectedSection || mutationsBlocked) return;
    setMessage(null);
    startTransition(async () => {
      const result = await getDeletePreview(selectedSection.id);
      if (!("childSectionCount" in result)) {
        setMessage(result.error);
        return;
      }
      setDeleteTarget(selectedSection);
      setDeletePreview(result);
      setConfirmedName("");
    });
  }

  function confirmDelete() {
    if (!deleteTarget || confirmedName !== deleteTarget.title) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteSection(deleteTarget.id, confirmedName);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      if ("pending" in result) {
        setCreationBlocked(true);
        setOperations((current) => [
          ...current.filter(
            (operation) =>
              operation.operationId !== result.operation.operationId
          ),
          result.operation,
        ]);
        closeDeleteDialog();
        return;
      }

      closeDeleteDialog();
      router.replace("/admin/structure");
      router.refresh();
    });
  }

  function retryOperation(operation: MediaOperationView) {
    setMessage(null);
    startTransition(async () => {
      const result = await retrySectionMediaOperation(operation.operationId);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      if ("pending" in result) {
        setOperations((current) =>
          current.map((candidate) =>
            candidate.operationId === result.operation.operationId
              ? result.operation
              : candidate
          )
        );
        return;
      }

      setOperations((current) =>
        current.filter(
          (candidate) => candidate.operationId !== operation.operationId
        )
      );
      router.refresh();
    });
  }

  const form =
    !mutationsBlocked && mode === "create-root" ? (
      <SectionInlineForm
        key="create-root"
        mode="create-root"
        section={null}
        parent={null}
        rootSections={rootSections}
        initialSortOrder={rootNextSortOrder}
        onCancel={() => cancelForm("/admin/structure", createRootTriggerRef)}
      />
    ) : !mutationsBlocked && mode === "create-child" && mayCreateChild ? (
      <SectionInlineForm
        key={`create-child:${selectedSection.id}`}
        mode="create-child"
        section={null}
        parent={selectedSection}
        rootSections={rootSections}
        initialSortOrder={childNextSortOrder}
        onCancel={() =>
          cancelForm(
            `/admin/structure?section=${encodeURIComponent(
              selectedSection.id
            )}`,
            createChildTriggerRef
          )
        }
      />
    ) : !mutationsBlocked && mode === "edit" && selectedSection ? (
      <SectionInlineForm
        key={`edit:${selectedSection.id}`}
        mode="edit"
        section={selectedSection}
        parent={parent}
        rootSections={availableEditParents}
        onCancel={() =>
          cancelForm(
            `/admin/structure?section=${encodeURIComponent(
              selectedSection.id
            )}`,
            editTriggerRef
          )
        }
      />
    ) : null;

  return (
    <div className="mx-auto min-w-0 w-full max-w-6xl px-4 py-6 sm:px-6">
      <nav
        aria-label="ตำแหน่งหมวด"
        className="mb-3 min-w-0 break-words text-sm text-muted-foreground"
      >
        <span>คู่มือทั้งหมด</span>
        {sectionPath.map((section) => (
          <span key={section.id}> / {section.title}</span>
        ))}
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            จัดการโครงสร้างและเอกสาร
          </p>
          <h1 className="mt-1 min-w-0 break-words text-3xl font-semibold">
            {selectedSection?.title ?? "คู่มือทั้งหมด"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionLink
            ref={createRootTriggerRef}
            href="/admin/structure?mode=create-root"
            disabled={mutationsBlocked}
          >
            เพิ่มหมวดหลัก
          </ActionLink>
          {selectedSection &&
            (mayCreateChild ? (
              <ActionLink
                ref={createChildTriggerRef}
                href={`/admin/structure?section=${encodeURIComponent(
                  selectedSection.id
                )}&mode=create-child`}
                disabled={mutationsBlocked}
              >
                เพิ่มหมวดย่อย
              </ActionLink>
            ) : (
              <button
                type="button"
                disabled
                aria-describedby="section-depth-limit"
                className="min-h-11 rounded-full border px-4 text-sm font-medium disabled:opacity-50"
              >
                เพิ่มหมวดย่อย
              </button>
            ))}
          {selectedSection && (
            <ActionLink
              ref={editTriggerRef}
              href={`/admin/structure?section=${encodeURIComponent(
                selectedSection.id
              )}&mode=edit`}
              disabled={mutationsBlocked}
            >
              เปลี่ยนชื่อและตั้งค่า
            </ActionLink>
          )}
          {selectedSection && (
            <button
              type="button"
              disabled={isPending || mutationsBlocked}
              onClick={requestDelete}
              className=" border border-destructive/10 cursor-pointer min-h-11 rounded-full px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              ลบหมวด
            </button>
          )}
        </div>
      </header>


      {mutationsBlocked && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          จัดการหมวดต่อได้หลังงานลบรูปเสร็จสมบูรณ์
        </p>
      )}
      {message && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {message}
        </p>
      )}

      {operations.length > 0 && (
        <section aria-label="งานลบรูปที่รอดำเนินการ" className="mt-5">
          {operations.map((operation) => (
            <MediaOperationBanner
              key={operation.operationId}
              operation={operation}
              pending={isPending}
              onRetry={() => retryOperation(operation)}
            />
          ))}
        </section>
      )}

      {(form || !selectedSection) && (
        <div className="mt-6">
          {form ?? null}
        </div>
      )}

      <Dialog.Root
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-xl outline-none">
            <div className="flex items-start gap-3">
              <FileWarning
                className="mt-1 text-destructive"
                aria-hidden="true"
              />
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  ยืนยันการลบหมวด
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  การลบเป็นแบบถาวร เอกสารและหมวดย่อยที่ไม่มีรูปจะถูกลบด้วย
                </Dialog.Description>
              </div>
            </div>
            {deletePreview && (
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                <p>
                  หมวดย่อย: {deletePreview.childSectionCount} หมวด · เอกสาร:{" "}
                  {deletePreview.documentCount} รายการ · รูป:{" "}
                  {deletePreview.mediaCount} รูป
                </p>
                {deletePreview.documentTitles.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                    {deletePreview.documentTitles.map((title, index) => (
                      <li key={`${title}-${index}`}>{title}</li>
                    ))}
                  </ul>
                )}
                {deletePreview.mediaCount > 0 && (
                  <p className="mt-2 text-destructive">
                    ระบบจะไม่ลบข้อมูลจนกว่าจะลบรูปจาก R2 สำเร็จ
                  </p>
                )}
              </div>
            )}
            {message && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {message}
              </p>
            )}
            <label
              className="mt-5 block text-sm font-medium"
              htmlFor="confirm-section-name"
            >
              พิมพ์ “{deleteTarget?.title ?? ""}” เพื่อยืนยัน
            </label>
            <input
              autoFocus
              id="confirm-section-name"
              value={confirmedName}
              onChange={(event) => setConfirmedName(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border bg-background px-3"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close
                disabled={isPending}
                className="min-h-11 rounded-full px-4 text-sm hover:bg-muted disabled:opacity-50"
              >
                ยกเลิก
              </Dialog.Close>
              <button
                type="button"
                disabled={
                  isPending ||
                  !deleteTarget ||
                  confirmedName !== deleteTarget.title
                }
                onClick={confirmDelete}
                className="min-h-11 rounded-full bg-destructive px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "กำลังลบ" : "ลบถาวร"}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

const ActionLink = forwardRef<
  HTMLAnchorElement,
  { href: string; disabled: boolean; children: React.ReactNode }
>(function ActionLink({ href, disabled, children }, ref) {
  return (
    <Link
      ref={ref}
      href={href}
      aria-disabled={disabled ? "true" : undefined}
      tabIndex={disabled ? -1 : undefined}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium ${
        disabled ? "pointer-events-none opacity-50" : "hover:bg-muted"
      }`}
    >
      {children}
    </Link>
  );
});
