import type {
  PublicDocumentSummary,
  PublicDocsIndex,
  PublicNavigationItem,
  PublicNavigationSection,
  PublicSection,
} from "@/lib/docs/public-types";

export const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function comparePublicOrder<T extends { sortOrder: number; id: string }>(left: T, right: T) {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

export function pathFromSection(section: PublicSection, parent: PublicSection | undefined, documentSlug: string) {
  return parent ? `/${parent.slug}/${section.slug}/${documentSlug}` : `/${section.slug}/${documentSlug}`;
}

export function parsePublicPath(slugs: readonly string[]): string[] | null {
  if ((slugs.length !== 2 && slugs.length !== 3) || slugs.some((slug) => !publicSlugPattern.test(slug))) return null;
  return [...slugs];
}

export function buildPublicIndex(sectionRows: PublicSection[], documentRows: PublicDocumentSummary[]): PublicDocsIndex {
  const sections = [...sectionRows].sort(comparePublicOrder);
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const documentsBySection = new Map<string, PublicDocumentSummary[]>();

  for (const document of [...documentRows].sort(comparePublicOrder)) {
    const sectionDocuments = documentsBySection.get(document.sectionId) ?? [];
    sectionDocuments.push(document);
    documentsBySection.set(document.sectionId, sectionDocuments);
  }

  const buildSection = (section: PublicSection): PublicNavigationSection | null => {
    const parent = section.parentId ? sectionsById.get(section.parentId) : undefined;
    const documents = (documentsBySection.get(section.id) ?? []).map((document) => ({
      ...document,
      path: pathFromSection(section, parent, document.slug),
      sectionTitle: section.title,
      parentTitle: parent?.title ?? null,
    }));
    const children = sections
      .filter((child) => child.parentId === section.id)
      .map(buildSection)
      .filter((child): child is PublicNavigationSection => child !== null);
    if (!documents.length && !children.length) return null;
    return { ...section, children, documents };
  };

  const rootSections = sections
    .filter((section) => section.parentId === null)
    .map(buildSection)
    .filter((section): section is PublicNavigationSection => section !== null);
  const documents = rootSections.flatMap(function flatten(section): PublicNavigationItem[] {
    return [...section.documents, ...section.children.flatMap(flatten)];
  });

  return {
    sections: rootSections,
    documents,
    recentUpdates: [...documents].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)).slice(0, 5),
  };
}
