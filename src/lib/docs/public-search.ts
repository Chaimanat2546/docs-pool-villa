import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getDocumentHeadings } from "@/lib/docs/headings";
import { pathFromSection } from "@/lib/docs/public-model";
import type { PublicDocumentSummary, PublicNavigationItem, PublicSection } from "@/lib/docs/public-types";

export const PUBLIC_SEARCH_PAGE_SIZE = 10;

type PublicSearchParams = { q?: string | string[]; page?: string | string[] };

type DbSection = {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  sort_order: number;
};

type DbDocument = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  updated_at: string;
  sort_order: number;
};

type DbSearchableDocument = DbDocument & {
  content: unknown;
  status: string;
};

export type SearchableDocument = PublicDocumentSummary & {
  content: unknown;
  status: string;
};

export type PublicSearchItem = PublicNavigationItem & (
  | { kind: "document"; href: string }
  | { kind: "heading"; href: string; heading: string; headingLevel: 2 | 3 }
);

export function normalizePublicSearchParams(input: PublicSearchParams) {
  const query = typeof input.q === "string" ? input.q.trim().slice(0, 200) : "";
  const pageValue = typeof input.page === "string" && /^[1-9]\d*$/.test(input.page) ? Number(input.page) : 1;
  return { query, page: Number.isSafeInteger(pageValue) ? pageValue : 1 };
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function pageCountForTotal(total: number) {
  return Math.ceil(total / PUBLIC_SEARCH_PAGE_SIZE);
}

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
}

function toSection(row: DbSection): PublicSection {
  return { id: row.id, parentId: row.parent_id, title: row.title, slug: row.slug, sortOrder: row.sort_order };
}

function compareDocuments(left: Pick<PublicDocumentSummary, "id" | "title">, right: Pick<PublicDocumentSummary, "id" | "title">) {
  return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

function toNavigationItem(document: PublicDocumentSummary, sections: Map<string, PublicSection>): PublicNavigationItem {
  const section = sections.get(document.sectionId);
  const parent = section?.parentId ? sections.get(section.parentId) : undefined;
  if (!section) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");
  return {
    ...document,
    path: pathFromSection(section, parent, document.slug),
    sectionTitle: section.title,
    parentTitle: parent?.title ?? null,
  };
}

function toSearchableDocument(row: DbSearchableDocument): SearchableDocument {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    status: row.status,
    content: row.content,
  };
}

function toDocumentSearchItem(document: PublicDocumentSummary, sections: Map<string, PublicSection>): PublicSearchItem {
  const item = toNavigationItem(document, sections);
  return { ...item, kind: "document", href: item.path };
}

export function buildPublicSearchItems({
  titleDocuments,
  headingDocuments,
  sections: sectionList,
  query,
}: {
  titleDocuments: SearchableDocument[];
  headingDocuments: SearchableDocument[];
  sections: PublicSection[];
  query: string;
}): PublicSearchItem[] {
  if (!query) return [];

  const sections = new Map(sectionList.map((section) => [section.id, section] as const));
  const normalizedQuery = query.toLocaleLowerCase();
  const titleItems = titleDocuments
    .filter((document) => document.status === "published")
    .sort(compareDocuments)
    .map((document) => toDocumentSearchItem(document, sections));
  const headingItems = headingDocuments
    .filter((document) => document.status === "published")
    .sort(compareDocuments)
    .flatMap((document) => {
      const item = toNavigationItem(document, sections);
      return getDocumentHeadings(document.content)
        .filter((heading) => heading.text.toLocaleLowerCase().includes(normalizedQuery))
        .map((heading) => ({
          ...item,
          kind: "heading" as const,
          heading: heading.text,
          headingLevel: heading.level,
          href: `${item.path}#${heading.id}`,
        }));
    });

  return [...titleItems, ...headingItems];
}

export function paginatePublicSearchItems<T>(items: T[], page: number) {
  const from = (page - 1) * PUBLIC_SEARCH_PAGE_SIZE;
  return items.slice(from, from + PUBLIC_SEARCH_PAGE_SIZE);
}

export async function getPublicSearchResults({ query, page }: { query: string; page: number }) {
  const supabase = createPublicClient();
  const from = (page - 1) * PUBLIC_SEARCH_PAGE_SIZE;
  const documentQuery = supabase
    .from("doc_documents")
    .select("id, section_id, title, slug, excerpt, updated_at, sort_order", { count: "exact" })
    .eq("status", "published")
    .order("title")
    .order("id")
    .range(from, from + PUBLIC_SEARCH_PAGE_SIZE - 1);
  const sectionsQuery = supabase.from("doc_sections").select("id, parent_id, title, slug, sort_order");

  if (!query) {
    const [{ data: sectionRows, error: sectionsError }, { data: documentRows, error: documentsError, count }] = await Promise.all([
      sectionsQuery,
      documentQuery.range(from, from + PUBLIC_SEARCH_PAGE_SIZE - 1),
    ]);
    if (sectionsError || documentsError) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");
    const sections = new Map((sectionRows as DbSection[] ?? []).map((row) => {
      const section = toSection(row);
      return [section.id, section] as const;
    }));
    const items = (documentRows as DbDocument[] ?? []).map((row) => toDocumentSearchItem({
      id: row.id,
      sectionId: row.section_id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      updatedAt: row.updated_at,
      sortOrder: row.sort_order,
    }, sections));
    const total = count ?? 0;
    return { items, total, page, pageCount: pageCountForTotal(total) };
  }

  const titleQuery = supabase
    .from("doc_documents")
    .select("id, section_id, title, slug, excerpt, updated_at, sort_order, content, status")
    .eq("status", "published")
    .ilike("title", `%${escapeLikePattern(query)}%`)
    .order("title")
    .order("id");
  const headingQuery = supabase
    .from("doc_documents")
    .select("id, section_id, title, slug, excerpt, updated_at, sort_order, content, status")
    .eq("status", "published")
    .order("title")
    .order("id");
  const [sectionsResult, titlesResult, headingsResult] = await Promise.all([sectionsQuery, titleQuery, headingQuery]);
  if (sectionsResult.error || titlesResult.error || headingsResult.error) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");

  const sections = (sectionsResult.data as DbSection[] ?? []).map(toSection);
  const allItems = buildPublicSearchItems({
    titleDocuments: (titlesResult.data as DbSearchableDocument[] ?? []).map(toSearchableDocument),
    headingDocuments: (headingsResult.data as DbSearchableDocument[] ?? []).map(toSearchableDocument),
    sections,
    query,
  });
  const total = allItems.length;
  return { items: paginatePublicSearchItems(allItems, page), total, page, pageCount: pageCountForTotal(total) };
}
