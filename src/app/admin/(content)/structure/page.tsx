import { DocumentList } from "@/components/admin/explorer/document-list";
import { sectionMode } from "@/components/admin/explorer/section-mode";
import { SectionPanel } from "@/components/admin/explorer/section-panel";
import { MediaCleanupBanner } from "@/components/admin/media-cleanup-banner";
import { resolveAdminSectionId } from "@/lib/docs/admin-explorer";
import { loadAdminExplorerData } from "@/lib/docs/admin-explorer-server";

export default async function StructurePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  const data = await loadAdminExplorerData();
  const requested = typeof query.section === "string" ? query.section : undefined;
  const selectedId = resolveAdminSectionId(data.sections, requested);
  const mode = sectionMode(query.mode);
  const operationKey = data.pendingSectionOperations.map((operation) => operation.operationId).join(":");
  const invalidSelection = query.section !== undefined && selectedId === null;

  return (
    <>
      {invalidSelection && (
        <p role="alert" className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-6xl rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 sm:w-[calc(100%-3rem)]">
          ไม่พบหมวดที่เลือก จึงแสดงคู่มือทั้งหมด
        </p>
      )}
      {data.cleanupOperation && (
        <div className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6">
          <MediaCleanupBanner initialOperation={data.cleanupOperation} />
        </div>
      )}
      <SectionPanel key={operationKey} selectedSectionId={selectedId} mode={mode} explorer={data} />
      {mode !== "reorder" && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <DocumentList
            key={selectedId ?? "virtual-root"}
            documents={data.documents}
            sections={data.sections}
            selectedSectionId={selectedId}
          />
        </div>
      )}
    </>
  );
}
