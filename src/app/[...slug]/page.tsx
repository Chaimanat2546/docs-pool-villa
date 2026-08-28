import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { DocumentContent, getTableOfContents } from "@/components/public/document-content";
import { PublicHeader } from "@/components/public/public-header";
import { ReaderNavigation } from "@/components/public/reader-navigation";
import { findPublicDocumentByPath, findPublicRedirect, getPublicDocsIndex, getPublicDocument, parsePublicPath } from "@/lib/docs/public";

type Props = { params: Promise<{ slug: string[] }> };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(value));
}

async function getResolvedDocument(slugs: string[]) {
  const summary = await findPublicDocumentByPath(slugs);
  if (!summary) return null;
  const document = await getPublicDocument(summary.id);
  return document ? { summary, document } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parsePublicPath(slug);
  if (!parsed) return { robots: { index: false, follow: false } };
  const resolved = await getResolvedDocument(parsed);
  if (!resolved) return { robots: { index: false, follow: false } };
  const path = resolved.summary.path;
  return { title: resolved.document.title, description: resolved.document.excerpt ?? undefined, alternates: { canonical: path } };
}

export default async function DocumentPage({ params }: Props) {
  const { slug } = await params;
  const parsed = parsePublicPath(slug);
  if (!parsed) notFound();
  const path = `/${parsed.join("/")}`;
  const resolved = await getResolvedDocument(parsed);
  if (!resolved) {
    const target = await findPublicRedirect(path);
    if (target) permanentRedirect(target);
    notFound();
  }
  const index = await getPublicDocsIndex();
  const currentIndex = index.documents.findIndex((document) => document.id === resolved.summary.id);
  const previous = currentIndex > 0 ? index.documents[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < index.documents.length - 1 ? index.documents[currentIndex + 1] : null;
  const toc = getTableOfContents(resolved.document.content);
  return <>
    <PublicHeader />
    <ReaderNavigation currentPath={resolved.summary.path} sections={index.sections} toc={toc}>
      <article className="mx-auto max-w-3xl"><nav aria-label="เส้นทาง" className="mb-6 text-sm text-muted-foreground">{resolved.summary.parentTitle && <><span>{resolved.summary.parentTitle}</span><span aria-hidden="true"> / </span></>}<span>{resolved.summary.sectionTitle}</span></nav>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{resolved.document.title}</h1>
        {resolved.document.excerpt && <p className="mt-4 text-lg leading-8 text-muted-foreground">{resolved.document.excerpt}</p>}
        <p className="mt-5 text-sm text-muted-foreground">อัปเดตเมื่อ <time dateTime={resolved.document.updatedAt}>{formatDate(resolved.document.updatedAt)}</time></p>
        <DocumentContent content={resolved.document.content} />
        <nav aria-label="เอกสารก่อนหน้าและถัดไป" className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2">{previous ? <Link href={previous.path} className="min-h-16 rounded-xl border p-4 hover:bg-muted"><span className="block text-sm text-muted-foreground">ก่อนหน้า</span><span className="mt-1 block font-medium">{previous.title}</span></Link> : <div />}{next ? <Link href={next.path} className="min-h-16 rounded-xl border p-4 text-left hover:bg-muted sm:text-right"><span className="block text-sm text-muted-foreground">ถัดไป</span><span className="mt-1 block font-medium">{next.title}</span></Link> : null}</nav>
      </article>
    </ReaderNavigation>
  </>;
}
