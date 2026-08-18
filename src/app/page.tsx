import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Box,
  Code2,
} from "lucide-react";

import { PublicHeader } from "@/components/public/public-header";
import { getPublicDocsIndex } from "@/lib/docs/public";
import type {
  PublicNavigationItem,
  PublicNavigationSection,
} from "@/lib/docs/public-types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function documentsForCard(
  section: PublicNavigationSection,
): PublicNavigationItem[] {
  return [
    ...section.documents,
    ...section.children.flatMap(documentsForCard),
  ].slice(0, 4) as PublicNavigationItem[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default async function Home() {
  const index = await getPublicDocsIndex();
  const startPath = index.documents[0]?.path;
  const gettingStartedDocuments = index.sections[0]?.documents.slice(0, 3) ?? [];
  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="font-[family-name:var(--font-geist-sans),ui-sans-serif,system-ui,sans-serif]"
      >
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:pt-20">
          <div>
            <h1
              aria-label="Documentation for Baan Pool Villa"
              className="mt-6 max-w-xl text-5xl font-bold leading-[1.08] tracking-[-0.055em] text-slate-950 sm:text-6xl"
            >
              <span className="block">Documentation</span>
              <span className="block">for Baan Pool Villa</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              คู่มือที่ครบถ้วนสำหรับการใช้งานระบบ
              <br className="hidden sm:block" />{" "}
              ตั้งแต่เริ่มต้นไปจนถึงการใช้งานขั้นสูง
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {startPath ? (
                <Link
                  href={startPath}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  เริ่มต้นใช้งาน <ArrowRight size={16} />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  กำลังจัดเตรียมคู่มือสำหรับคุณ
                </p>
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="flex h-80">
              <div className="w-36 shrink-0 border-r bg-white p-4 text-[10px] text-slate-700">
                <div className="mb-5 text-lg text-muted-foreground">☰</div>
                {[
                  "Introduction",
                  "Getting Started",
                  "Installation",
                  "Project Structure",
                  "Routing",
                  "Data Fetching",
                  "Rendering",
                  "Functions",
                  "API Routes",
                ].map((item, i) => (
                  <div
                    key={item}
                    className={`mb-2 rounded px-2 py-1 ${i === 0 ? "bg-muted font-medium" : ""}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-7">
                <h2 className="text-xl font-bold">Introduction</h2>
                <div className="mt-5 space-y-2">
                  <div className="h-2 w-3/4 rounded bg-slate-200" />
                  <div className="h-2 w-4/5 rounded bg-slate-200" />
                  <div className="h-2 w-1/2 rounded bg-slate-200" />
                </div>
                <h3 className="mt-9 text-sm font-bold">Quick example</h3>
                <pre className="mt-4 overflow-hidden rounded-lg border bg-slate-50 p-4 text-[10px] leading-6 text-slate-600">
                  <code>{`import Link from 'next/link'\n\nexport default function Home() {\n  return (\n    <main>\n      <h1>Welcome to Baan Pool Villa</h1>`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t" id="getting-started">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Getting started
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              เริ่มต้นใช้งานระบบในไม่กี่ขั้นตอน
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {gettingStartedDocuments.length ? gettingStartedDocuments.map((document, i) => (
                <Link
                  key={document.id}
                  href={document.path}
                  className="group flex min-h-52 flex-col rounded-lg border p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="mb-5 grid size-11 place-items-center rounded-xl border bg-muted/30 text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{document.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {document.excerpt?.trim() || "เรียนรู้พื้นฐานและภาพรวมของระบบสำหรับผู้เริ่มต้น"}
                    </p>
                  </div>
                </Link>
              )) : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">ยังไม่มีเอกสารในหมวดเริ่มต้น</p>}
            </div>
          </div>
        </section>

        <section className="border-t" id="explore">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Explore documentation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              เลือกหัวข้อที่คุณต้องการเรียนรู้
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border">
              {index.sections.length ? (
                index.sections.slice(0, 5).map((section, i) => {
                  const docs = documentsForCard(section);
                  const Icon =
                    i % 3 === 0 ? BookOpen : i % 3 === 1 ? Box : Code2;
                  return (
                    <Link
                      key={section.id}
                      href={docs[0]?.path ?? "#"}
                      className="group flex items-center gap-4 border-b p-4 transition-colors last:border-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-xl ${i % 3 === 0 ? "bg-blue-50 text-blue-700" : i % 3 === 1 ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}
                      >
                        <Icon size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{section.title}</h3>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {docs[0]?.excerpt ??
                            "คู่มือการใช้งานระบบแบบทีละขั้นตอน ตั้งแต่พื้นฐานจนถึงการใช้งานที่ซับซ้อน"}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  ยังไม่มีคู่มือที่เผยแพร่
                </p>
              )}
            </div>
          </div>
        </section>

        {index.recentUpdates.length > 0 && (
          <section className="border-t" id="latest-updates">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Latest updates
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    การเปลี่ยนแปลงและคู่มือล่าสุด
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {index.recentUpdates.slice(0, 3).map((document) => (
                  <li
                    key={document.id}
                    className="grid grid-cols-[92px_52px_1fr_20px] items-center gap-3 text-sm"
                  >
                    <time
                      className="text-muted-foreground"
                      dateTime={document.updatedAt}
                    >
                      {formatDate(document.updatedAt)}
                    </time>
                    <span className="w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      ใหม่
                    </span>
                    <Link
                      className="truncate hover:underline"
                      href={document.path}
                    >
                      {document.title}
                    </Link>
                    <ArrowRight size={15} className="text-muted-foreground" />
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
