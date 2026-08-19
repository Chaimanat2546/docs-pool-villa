import { DocumentSetupForm } from "@/components/admin/explorer/document-setup-form";
import { resolveAdminSectionId } from "@/lib/docs/admin-explorer";
import { loadAdminExplorerData } from "@/lib/docs/admin-explorer-server";

type NewDocumentPageProps = {
  searchParams: Promise<{ section?: string | string[] }>;
};

export default async function NewDocumentPage({
  searchParams,
}: NewDocumentPageProps) {
  const [query, data] = await Promise.all([
    searchParams,
    loadAdminExplorerData(),
  ]);
  const requestedSection =
    typeof query.section === "string" ? query.section : undefined;
  const selectedSectionId = resolveAdminSectionId(
    data.sections,
    requestedSection,
  );

  if (!selectedSectionId) {
    return (
      <section
        aria-labelledby="choose-section"
        className="rounded-xl border bg-card p-8 text-center shadow-sm"
      >
        <h1 id="choose-section" className="text-2xl font-semibold">
          เลือกหมวดก่อนสร้างเอกสาร
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          เลือกหมวดจากรายการด้านซ้าย แล้วกด “สร้างเอกสารในหมวดนี้”
        </p>
      </section>
    );
  }

  return (
    <DocumentSetupForm
      sections={data.sections}
      selectedSectionId={selectedSectionId}
    />
  );
}
