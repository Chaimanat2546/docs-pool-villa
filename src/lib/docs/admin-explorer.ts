export type AdminDocumentStatus = "draft" | "published" | "archived";

export type AdminExplorerDocument = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  status: AdminDocumentStatus;
  updatedAt: string;
  sortOrder: number;
  version: number;
};

export type AdminExplorerSection = {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  isPublished: boolean;
  sortOrder: number;
  directDocumentCount: number;
};

type AdminSectionRow = {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  is_published: boolean;
  sort_order: number;
};

type AdminDocumentRow = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  status: AdminDocumentStatus;
  updated_at: string;
  sort_order: number;
  version: number;
};

export function resolveAdminSectionId(sections: AdminExplorerSection[], requestedId: string | undefined): string | null {
  return requestedId && sections.some((section) => section.id === requestedId) ? requestedId : null;
}

export function getAdminSectionPath(sections: AdminExplorerSection[], sectionId: string): AdminExplorerSection[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const current = byId.get(sectionId);
  if (!current) return [];
  return current.parentId && byId.has(current.parentId) ? [byId.get(current.parentId)!, current] : [current];
}

export function filterAdminDocuments(
  documents: AdminExplorerDocument[],
  selectedSectionId: string | null,
  query: string,
  status: AdminDocumentStatus | "all",
): AdminExplorerDocument[] {
  const normalized = query.trim().toLocaleLowerCase("th");
  return documents.filter((document) =>
    (selectedSectionId === null || document.sectionId === selectedSectionId) &&
    (status === "all" || document.status === status) &&
    (!normalized || `${document.title} ${document.slug}`.toLocaleLowerCase("th").includes(normalized)),
  );
}

export function mapAdminDocuments(rows: AdminDocumentRow[]): AdminExplorerDocument[] {
  return rows.map((row) => ({
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    version: Number(row.version),
  }));
}

export function buildAdminExplorerSections(rows: AdminSectionRow[], documents: AdminExplorerDocument[]): AdminExplorerSection[] {
  const counts = new Map<string, number>();
  for (const document of documents) counts.set(document.sectionId, (counts.get(document.sectionId) ?? 0) + 1);
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    slug: row.slug,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    directDocumentCount: counts.get(row.id) ?? 0,
  }));
}
