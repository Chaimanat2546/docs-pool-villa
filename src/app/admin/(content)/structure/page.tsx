import { SectionPanel, sectionMode } from "@/components/admin/explorer/section-panel";
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
  const operationKey = data.pendingSectionOperations.map((operation) => operation.operationId).join(":");

  return <SectionPanel key={operationKey} selectedSectionId={selectedId} mode={sectionMode(query.mode)} explorer={data} />;
}
