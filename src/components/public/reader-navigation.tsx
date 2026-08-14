"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";

import type { PublicNavigationSection } from "@/lib/docs/public-types";
import type { TocItem } from "./document-content";

function SubsectionDisclosure({ section, currentPath, isOpen, onNavigate, onToggle }: { section: PublicNavigationSection; currentPath: string; isOpen: boolean; onNavigate?: () => void; onToggle: () => void }) {
  return <li className="pt-2">
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={`section-${section.id}-documents`}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium hover:bg-muted"
    >
      {section.title}
      <ChevronRight aria-hidden="true" className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
    </button>
    {isOpen ? <ul id={`section-${section.id}-documents`} className="ml-3 mt-1 space-y-1 border-l pl-2">
      {section.documents.map((document) => <li key={document.id}><Link href={document.path} onClick={onNavigate} aria-current={document.path === currentPath ? "page" : undefined} className={`flex min-h-11 items-center rounded-md px-3 text-sm ${document.path === currentPath ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{document.title}</Link></li>)}
    </ul> : null}
  </li>;
}

function NavigationTree({ sections, currentPath, onNavigate }: { sections: PublicNavigationSection[]; currentPath: string; onNavigate?: () => void }) {
  const activeSectionIds = sections.flatMap((section) => section.children.filter((child) => child.documents.some((document) => document.path === currentPath)).map((child) => child.id));
  const [expandedSectionIds, setExpandedSectionIds] = useState(() => new Set(activeSectionIds));

  return <nav aria-label="สารบัญเอกสาร" className="space-y-4">
    {sections.map((section) => <section key={section.id}>
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
      <ul className="mt-1 space-y-1">
        {section.documents.map((document) => <li key={document.id}><Link href={document.path} onClick={onNavigate} aria-current={document.path === currentPath ? "page" : undefined} className={`flex min-h-11 items-center rounded-md px-3 text-sm ${document.path === currentPath ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{document.title}</Link></li>)}
        {section.children.map((child) => <SubsectionDisclosure key={child.id} section={child} currentPath={currentPath} isOpen={activeSectionIds.includes(child.id) || expandedSectionIds.has(child.id)} onNavigate={onNavigate} onToggle={() => setExpandedSectionIds((ids) => {
          const nextIds = new Set(ids);
          if (nextIds.has(child.id)) nextIds.delete(child.id);
          else nextIds.add(child.id);
          return nextIds;
        })} />)}
      </ul>
    </section>)}
  </nav>;
}

function Toc({ items, mobile = false }: { items: TocItem[]; mobile?: boolean }) {
  if (!items.length) return null;
  const links = <ul className="space-y-2">{items.map((item) => <li key={item.id} className={item.level === 3 ? "pl-3" : ""}><a href={`#${item.id}`} className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">{item.text}</a></li>)}</ul>;
  if (mobile) return <details className="mb-8 rounded-xl border p-4 xl:hidden"><summary className="flex min-h-11 cursor-pointer items-center font-medium">หัวข้อในหน้านี้</summary><div className="mt-4">{links}</div></details>;
  return <nav aria-label="หัวข้อในหน้านี้" className="border-l pl-4"><p className="mb-3 text-sm font-medium">ในหน้านี้</p>{links}</nav>;
}

export function ReaderNavigation({ children, currentPath, sections, toc }: { children: React.ReactNode; currentPath: string; sections: PublicNavigationSection[]; toc: TocItem[] }) {
  const [open, setOpen] = useState(false);
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm xl:hidden"><Menu size={18} aria-hidden="true" />เมนูคู่มือ</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 xl:hidden" />
        <Dialog.Popup aria-label="เมนูคู่มือ" className="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto border-r bg-background p-4 outline-none xl:hidden">
          <div className="mb-4 flex items-center justify-between"><Dialog.Title className="font-medium">คู่มือ</Dialog.Title><Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full border" aria-label="ปิดเมนู"><X size={18} aria-hidden="true" /></Dialog.Close></div>
          <NavigationTree sections={sections} currentPath={currentPath} onNavigate={() => setOpen(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <div className="mx-auto grid gap-10 xl:w-[74rem] xl:max-w-full xl:grid-cols-[15rem_42rem_12rem]">
      <aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"><NavigationTree sections={sections} currentPath={currentPath} /></aside>
      <main id="main-content" className="min-w-0"><Toc items={toc} mobile />{children}</main>
      <aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"><Toc items={toc} /></aside>
    </div>
  </div>;
}
