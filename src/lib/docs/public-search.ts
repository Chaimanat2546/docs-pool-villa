import "server-only";

import { createClient } from "@supabase/supabase-js";

import { pathFromSection } from "@/lib/docs/public-model";
import type { PublicNavigationItem, PublicSection } from "@/lib/docs/public-types";

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
  const [{ data: sectionRows, error: sectionsError }, { data: documentRows, error: documentsError, count }] = await Promise.all([
    supabase.from("doc_sections").select("id, parent_id, title, slug, sort_order"),
    query ? documentQuery.ilike("title", `%${escapeLikePattern(query)}%`) : documentQuery,
  ]);
  if (sectionsError || documentsError) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");

  const sections = new Map((sectionRows as DbSection[] ?? []).map((row) => {
    const section = toSection(row);
    return [section.id, section] as const;
  }));
  const items = (documentRows as DbDocument[] ?? []).map((document) => {
    const section = sections.get(document.section_id);
    const parent = section?.parentId ? sections.get(section.parentId) : undefined;
    if (!section) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");
    return {
      id: document.id,
      sectionId: document.section_id,
      title: document.title,
      slug: document.slug,
      excerpt: document.excerpt,
      updatedAt: document.updated_at,
      sortOrder: document.sort_order,
      path: pathFromSection(section, parent, document.slug),
      sectionTitle: section.title,
      parentTitle: parent?.title ?? null,
    } satisfies PublicNavigationItem;
  });
  const total = count ?? 0;
  return { items, total, page, pageCount: pageCountForTotal(total) };
}
