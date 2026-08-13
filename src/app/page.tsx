import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Search } from "lucide-react";

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
  return <>
    <PublicHeader />
    <main id="main-content">
      <section className="border-b bg-[linear-gradient(180deg,#87a8c8_0%,#f5e9d8_100%)] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-medium">Baan Pool Villa</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">คู่มือสำหรับเว็บ Baan Pool Villa</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-foreground/80">ค้นหาวิธีใช้งานและคำแนะนำที่จำเป็นสำหรับการจัดการเว็บไซต์ของคุณ</p>
          <form action="/search" className="mx-auto mt-8 flex max-w-xl items-center rounded-full border bg-background p-1 shadow-sm">
            <Search size={18} aria-hidden="true" className="ml-3 text-muted-foreground" />
            <label htmlFor="home-search" className="sr-only">ค้นหาคู่มือ</label>
            <input id="home-search" name="q" type="search" className="h-11 min-w-0 flex-1 bg-transparent px-3 outline-none" placeholder="ค้นหาคู่มือ" />
            <button className="min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">ค้นหา</button>
          </form>
          {startPath ? <Link href={startPath} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"><BookOpen size={17} aria-hidden="true" />เริ่มต้นใช้งาน</Link> : <p className="mt-6 text-sm text-foreground/70">กำลังจัดเตรียมคู่มือสำหรับคุณ</p>}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><h2 className="text-2xl font-semibold">เลือกหัวข้อที่ต้องการ</h2>
        {index.sections.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{index.sections.map((section) => {
          const documents = documentsForCard(section);
          return <article key={section.id} className="rounded-xl border bg-card p-6"><h3 className="text-lg font-semibold">{section.title}</h3>{section.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>}<ul className="mt-5 space-y-1">{documents.map((document) => <li key={document.id}><Link href={document.path} className="flex min-h-10 items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-muted"><span className="truncate">{document.title}</span><ArrowRight size={15} aria-hidden="true" /></Link></li>)}</ul></article>;
        })}</div> : <p className="mt-4 text-muted-foreground">ยังไม่มีคู่มือที่เผยแพร่</p>}
      </section>
      {index.recentUpdates.length > 0 && <section className="border-t bg-muted/40"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><h2 className="text-2xl font-semibold">อัปเดตล่าสุด</h2><ul className="mt-5 divide-y rounded-xl border bg-card">{index.recentUpdates.map((document) => <li key={document.id}><Link href={document.path} className="flex min-h-14 items-center justify-between gap-4 px-4 hover:bg-muted"><span className="min-w-0"><span className="block truncate font-medium">{document.title}</span><span className="block truncate text-sm text-muted-foreground">{document.parentTitle ? `${document.parentTitle} / ` : ""}{document.sectionTitle}</span></span><time className="shrink-0 text-sm text-muted-foreground" dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time></Link></li>)}</ul></div></section>}
    </main>
  </>;
}
