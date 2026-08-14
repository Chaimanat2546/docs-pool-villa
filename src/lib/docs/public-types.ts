export type PublicSection = {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  sortOrder: number;
};

export type PublicDocumentSummary = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  updatedAt: string;
  sortOrder: number;
};

export type PublicDocument = PublicDocumentSummary & { content: unknown };

export type PublicNavigationItem = PublicDocumentSummary & {
  path: string;
  sectionTitle: string;
  parentTitle: string | null;
};

export type PublicNavigationSection = PublicSection & {
  children: PublicNavigationSection[];
  documents: PublicNavigationItem[];
};

export type PublicDocsIndex = {
  sections: PublicNavigationSection[];
  documents: PublicNavigationItem[];
  recentUpdates: PublicNavigationItem[];
};
