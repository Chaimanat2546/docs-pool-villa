"use client";

import { Eye, FilePlus2, Pencil } from "lucide-react";
import { useState } from "react";

import { GuardedAdminLink } from "@/components/admin/unsaved-navigation";
import {
  filterAdminDocuments,
  getAdminSectionPath,
  type AdminDocumentStatus,
  type AdminExplorerDocument,
  type AdminExplorerSection,
} from "@/lib/docs/admin-explorer";

type DocumentListProps = {
  documents: AdminExplorerDocument[];
  sections: AdminExplorerSection[];
  selectedSectionId: string | null;
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

const dateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });
const documentsPerPage = 4;

export function DocumentList({ documents, sections, selectedSectionId }: DocumentListProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminDocumentStatus | "all">("all");
  const [page, setPage] = useState(1);
  const filteredDocuments = filterAdminDocuments(documents, selectedSectionId, query, status);
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const pageStart = (currentPage - 1) * documentsPerPage;
  const visibleDocuments = filteredDocuments.slice(pageStart, pageStart + documentsPerPage);
  const hasQuery = query.trim().length > 0;
  const hasStatusFilter = status !== "all";

  function resetPage(update: () => void) {
    update();
    setPage(1);
  }

  return (
    <section aria-labelledby="document-list-title" className="min-w-0 w-full rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 id="document-list-title" className="text-lg font-semibold">เอกสารในหมวด</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedSectionId === null ? "แสดงเอกสารทุกหมวด" : "แสดงเฉพาะเอกสารที่อยู่ในหมวดนี้โดยตรง"}
          </p>
        </div>
        {selectedSectionId === null ? (
          <p className="max-w-xs text-sm text-muted-foreground">เลือกหมวดจากรายการด้านซ้ายก่อนสร้างเอกสาร</p>
        ) : (
          <GuardedAdminLink
            href={`/admin/documents/new?section=${encodeURIComponent(selectedSectionId)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <FilePlus2 className="size-4" aria-hidden="true" />
            สร้างเอกสารในหมวดนี้
          </GuardedAdminLink>
        )}
      </div>

      <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="grid gap-1 text-sm font-medium" htmlFor="document-search">
          ค้นหาเอกสารในหมวดนี้
          <input
            id="document-search"
            type="search"
            value={query}
            onChange={(event) => resetPage(() => setQuery(event.target.value))}
            placeholder="ค้นหาจากชื่อหรือ slug"
            className="min-h-11 rounded-md border bg-background px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor="document-status">
          กรองตามสถานะ
          <select
            id="document-status"
            value={status}
            onChange={(event) => resetPage(() => setStatus(event.target.value as AdminDocumentStatus | "all"))}
            className="min-h-11 rounded-md border bg-background px-3 font-normal"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="published">เผยแพร่แล้ว</option>
            <option value="archived">เก็บถาวร</option>
          </select>
        </label>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          hasQuery={hasQuery}
          hasStatusFilter={hasStatusFilter}
          selectedSectionId={selectedSectionId}
        />
      ) : (
        <ul aria-label="รายการเอกสาร" className="divide-y">
          {visibleDocuments.map((document) => {
            const sectionPath = getAdminSectionPath(sections, document.sectionId);
            const documentHref = `/admin/documents/${document.id}?section=${encodeURIComponent(document.sectionId)}`;

            return (
              <li key={document.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium">{document.title}</h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[document.status]}`}>
                      {statusLabels[document.status]}
                    </span>
                  </div>
                  {selectedSectionId === null && sectionPath.length > 0 && (
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {sectionPath.map((section) => section.title).join(" › ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    อัปเดตล่าสุด {dateFormatter.format(new Date(document.updatedAt))} · <span className="break-all font-mono">{document.slug}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GuardedAdminLink
                    href={documentHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium hover:bg-muted"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    แก้ไข
                  </GuardedAdminLink>
                  <GuardedAdminLink
                    href={`${documentHref}&stage=review`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium hover:bg-muted"
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    ดูตัวอย่าง
                  </GuardedAdminLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {totalPages > 1 && (
        <nav aria-label="แบ่งหน้าเอกสาร" className="flex items-center justify-between gap-3 border-t p-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            หน้าก่อนหน้า
          </button>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            หน้า {currentPage} จาก {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            หน้าถัดไป
          </button>
        </nav>
      )}
    </section>
  );
}

function EmptyState({
  hasQuery,
  hasStatusFilter,
  selectedSectionId,
}: {
  hasQuery: boolean;
  hasStatusFilter: boolean;
  selectedSectionId: string | null;
}) {
  const message = hasQuery
    ? "ไม่พบเอกสารที่ตรงกับการค้นหา"
    : hasStatusFilter
      ? "ไม่พบเอกสารที่ตรงกับสถานะที่เลือก"
      : selectedSectionId === null
        ? "ยังไม่มีเอกสารในคู่มือ"
        : "หมวดนี้ยังไม่มีเอกสาร";

  return <p className="p-8 text-center text-sm text-muted-foreground">{message}</p>;
}
