import Link from "next/link";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header";
import { getPublicSearchResults, normalizePublicSearchParams } from "@/lib/docs/public-search";

export const metadata: Metadata = { title: "ค้นหาคู่มือ", robots: { index: false, follow: false } };

function searchHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/search?${params}` : "/search";
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const input = normalizePublicSearchParams(await searchParams);
  const results = await getPublicSearchResults(input);
  const heading = input.query ? `ผลการค้นหาสำหรับ “${input.query}”` : "เอกสารทั้งหมด";
  return <><PublicHeader /><main id="main-content" className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><h1 className="text-3xl font-semibold">{heading}</h1><p className="mt-3 text-muted-foreground">{results.total ? input.query ? `พบ ${results.total} ผลลัพธ์` : `พบ ${results.total} เอกสาร` : input.query ? `ไม่พบผลลัพธ์ที่ตรงกับ “${input.query}”` : "ยังไม่มีเอกสารที่เผยแพร่"}</p>{results.items.length > 0 && <ol className="mt-6 divide-y rounded-xl border bg-card">{results.items.map((result) => <li key={`${result.kind}-${result.id}-${result.href}`}><Link href={result.href} aria-label={result.title} className="block px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="block font-medium">{result.title}</span>{result.kind === "heading" && <span className="mt-1 block text-sm text-muted-foreground">หัวข้อ: {result.heading}</span>}<span className="mt-1 block text-sm text-muted-foreground">{result.parentTitle ? `${result.parentTitle} / ` : ""}{result.sectionTitle}</span>{result.excerpt && <span className="mt-2 block text-sm text-muted-foreground">{result.excerpt}</span>}</Link></li>)}</ol>}{results.pageCount > 1 && <nav className="mt-6 flex items-center justify-between gap-4" aria-label="เปลี่ยนหน้าผลการค้นหา">{results.page > 1 ? <Link href={searchHref(input.query, results.page - 1)} className="min-h-11 content-center rounded-full border px-4 text-sm font-medium">หน้าก่อนหน้า</Link> : <span />}{results.page < results.pageCount ? <Link href={searchHref(input.query, results.page + 1)} className="min-h-11 content-center rounded-full border px-4 text-sm font-medium">หน้าถัดไป</Link> : <span />}</nav>}</main></>;
}
