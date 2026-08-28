import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { buildPublicIndex, parsePublicPath } from "@/lib/docs/public-model";

import type {
  PublicDocument,
  PublicDocumentSummary,
  PublicDocsIndex,
  PublicSection,
} from "@/lib/docs/public-types";

export type { PublicDocument, PublicDocumentSummary, PublicDocsIndex, PublicNavigationItem, PublicNavigationSection, PublicSection } from "@/lib/docs/public-types";

export const PUBLIC_DOCS_CACHE_TAG = "public-docs";

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

function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
}

function toSection(row: DbSection): PublicSection {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    slug: row.slug,
    sortOrder: row.sort_order,
  };
}

function toDocument(row: DbDocument): PublicDocumentSummary {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
  };
}

export { parsePublicPath, pathFromSection } from "@/lib/docs/public-model";

async function loadPublicIndex(): Promise<PublicDocsIndex> {
  const supabase = createPublicClient();
  const [{ data: sectionRows, error: sectionsError }, { data: documentRows, error: documentsError }] = await Promise.all([
    supabase.from("doc_sections").select("id, parent_id, title, slug, sort_order").order("sort_order").order("id"),
    supabase.from("doc_documents").select("id, section_id, title, slug, excerpt, updated_at, sort_order").order("sort_order").order("id"),
  ]);
  if (sectionsError || documentsError) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารสาธารณะได้");
  return buildPublicIndex((sectionRows ?? []).map(toSection) as PublicSection[], (documentRows ?? []).map(toDocument) as PublicDocumentSummary[]);
}

const getCachedPublicIndex = unstable_cache(loadPublicIndex, ["public-docs-index"], {
  revalidate: 5,
  tags: [PUBLIC_DOCS_CACHE_TAG],
});

export const getPublicDocsIndex = cache(getCachedPublicIndex);

async function loadPublicDocument(id: string): Promise<PublicDocument | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("doc_documents")
    .select("id, section_id, title, slug, excerpt, updated_at, sort_order, content")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("ไม่สามารถโหลดเอกสารสาธารณะได้");
  if (!data) return null;
  const row = data as DbDocument & { content: unknown };
  return { ...toDocument(row), content: row.content };
}

const getCachedPublicDocument = unstable_cache(loadPublicDocument, ["public-docs-document"], {
  revalidate: 5,
  tags: [PUBLIC_DOCS_CACHE_TAG],
});

export const getPublicDocument = cache(getCachedPublicDocument);

export const findPublicDocumentByPath = cache(async (slugs: readonly string[]) => {
  const parsed = parsePublicPath(slugs);
  if (!parsed) return null;
  const index = await getPublicDocsIndex();
  return index.documents.find((document) => document.path === `/${parsed.join("/")}`) ?? null;
});

export const findPublicRedirect = cache(async (path: string) => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("doc_route_redirects")
    .select("target_path, document_id")
    .eq("old_path", path)
    .maybeSingle();
  if (error) throw new Error("ไม่สามารถตรวจสอบเส้นทางเดิมได้");
  if (!data?.document_id) return null;
  return data.target_path as string;
});

export function getPublicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_DOCS_SITE_URL;
  try {
    const url = new URL(configured ?? "http://localhost:3000");
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL protocol");
    return url;
  } catch {
    return new URL("http://localhost:3000");
  }
}
