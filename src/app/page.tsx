import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, FolderOpen } from "lucide-react";

import { PublicHeader } from "@/components/public/public-header";
import { getPublicDocsIndex } from "@/lib/docs/public";
import type { PublicNavigationItem, PublicNavigationSection } from "@/lib/docs/public-types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function documentsForCard(section: PublicNavigationSection): PublicNavigationItem[] {
  return [...section.documents, ...section.children.flatMap(documentsForCard)].slice(0, 4);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

export default async function Home() {
  const index = await getPublicDocsIndex();
  const startPath = index.documents[0]?.path;
  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="font-[family-name:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif]"
      >
        <section className="relative overflow-hidden border-b bg-[#fbfcfe] px-4 py-14 sm:px-6 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(147,197,253,0.3),transparent_55%),linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:auto,32px_32px,32px_32px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground shadow-sm">
              Baan Pool Villa Docs
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              คู่มือสำหรับเว็บ Baan Pool Villa
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              ค้นหาวิธีใช้งานและคำแนะนำที่จำเป็นสำหรับการจัดการเว็บไซต์ของคุณ
            </p>
            {startPath ? (
              <Link
                href={startPath}
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <BookOpen size={17} aria-hidden="true" />
                เริ่มต้นใช้งาน
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-7 text-sm text-muted-foreground">กำลังจัดเตรียมคู่มือสำหรับคุณ</p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">เรียกดูตามหมวดหมู่</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">เลือกหัวข้อที่ต้องการ</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">เลือกคู่มือเพื่อเริ่มต้นได้ทันที</p>
          </div>

          {index.sections.length ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {index.sections.map((section) => {
                const documents = documentsForCard(section);
                return (
                  <article
                    key={section.id}
                    className="rounded-xl border bg-card p-2 shadow-sm transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 px-3 pb-3 pt-2">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/60 text-foreground">
                        <FolderOpen size={19} aria-hidden="true" />
                      </span>
                      <h3 className="text-base font-semibold tracking-tight">{section.title}</h3>
                    </div>
                    <ul className="border-t pt-1">
                      {documents.map((document) => (
                        <li key={document.id}>
                          <Link
                            href={document.path}
                            className="group flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <span className="truncate">{document.title}</span>
                            <ArrowRight
                              size={16}
                              aria-hidden="true"
                              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed bg-muted/25 px-5 py-6 text-sm text-muted-foreground">
              ยังไม่มีคู่มือที่เผยแพร่
            </p>
          )}
        </section>

        {index.recentUpdates.length > 0 && (
          <section className="border-t bg-muted/25">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <div className="flex items-center gap-2">
                <Clock3 size={19} aria-hidden="true" className="text-muted-foreground" />
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">อัปเดตล่าสุด</h2>
              </div>
              <ul className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
                {index.recentUpdates.map((document) => (
                  <li key={document.id} className="border-b last:border-b-0">
                    <Link
                      href={document.path}
                      className="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{document.title}</span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                          {document.parentTitle ? `${document.parentTitle} / ` : ""}
                          {document.sectionTitle}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
                        <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
