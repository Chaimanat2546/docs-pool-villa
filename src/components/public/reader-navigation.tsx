"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { useId, useState } from "react";

import type { PublicNavigationSection } from "@/lib/docs/public-types";
import type { TocItem } from "./document-content";

function SubsectionDisclosure({ section, currentPath, isOpen, onNavigate, onToggle, panelId }: { section: PublicNavigationSection; currentPath: string; isOpen: boolean; onNavigate?: () => void; onToggle: () => void; panelId: string }) {
  return <li className="pt-2">
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between rounded-md pl-5 pr-3 text-left text-sm font-medium hover:bg-muted"
    >
      {section.title}
      <ChevronRight aria-hidden="true" className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
    </button>
    {isOpen ? <ul id={panelId} className="ml-5 mt-1 space-y-1 border-l pl-3">
      {section.documents.map((document) => <li key={document.id}><Link href={document.path} onClick={onNavigate} aria-current={document.path === currentPath ? "page" : undefined} className={`flex min-h-11 items-center rounded-md pl-5 pr-3 text-sm ${document.path === currentPath ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{document.title}</Link></li>)}
    </ul> : null}
  </li>;
}

function NavigationTree({ sections, currentPath, expandedSectionIds, onNavigate, onToggle }: { sections: PublicNavigationSection[]; currentPath: string; expandedSectionIds: Set<string>; onNavigate?: () => void; onToggle: (sectionId: string) => void }) {
  const treeId = useId();

  return <nav aria-label="สารบัญเอกสาร" className="space-y-6">
    {sections.map((section) => <section key={section.id}>
      <h2 className="px-3 text-sm font-semibold text-foreground">{section.title}</h2>
      <ul className="mt-1 space-y-1">
        {section.documents.map((document) => <li key={document.id}><Link href={document.path} onClick={onNavigate} aria-current={document.path === currentPath ? "page" : undefined} className={`flex min-h-11 items-center rounded-md pl-5 pr-3 text-sm ${document.path === currentPath ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{document.title}</Link></li>)}
        {section.children.map((child) => <SubsectionDisclosure key={child.id} section={child} currentPath={currentPath} isOpen={expandedSectionIds.has(child.id)} onNavigate={onNavigate} onToggle={() => onToggle(child.id)} panelId={`section-${treeId}-${child.id}-documents`} />)}
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
  const activeSectionIds = sections.flatMap((section) => section.children.filter((child) => child.documents.some((document) => document.path === currentPath)).map((child) => child.id));
  const [navigationState, setNavigationState] = useState(() => ({ currentPath, expandedSectionIds: new Set(activeSectionIds) }));
  if (navigationState.currentPath !== currentPath) {
    setNavigationState({ currentPath, expandedSectionIds: new Set([...navigationState.expandedSectionIds, ...activeSectionIds]) });
  }
  const toggleSection = (sectionId: string) => setNavigationState((state) => {
    const expandedSectionIds = new Set(state.expandedSectionIds);
    if (expandedSectionIds.has(sectionId)) expandedSectionIds.delete(sectionId);
    else expandedSectionIds.add(sectionId);
    return { ...state, expandedSectionIds };
  });
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="sticky top-14 z-20 mb-4 flex min-h-11 w-full items-center gap-2 border-y bg-muted px-4 text-sm xl:hidden"><Menu size={18} aria-hidden="true" />เมนูคู่มือ</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40 xl:hidden" />
        <Dialog.Popup aria-label="เมนูคู่มือ" className="fixed inset-x-0 bottom-0 top-14 z-50 overflow-y-auto border-t bg-background p-4 outline-none xl:hidden">
          <div className="mb-4 flex items-center justify-between"><Dialog.Title className="font-medium">คู่มือ</Dialog.Title><Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full border" aria-label="ปิดเมนู"><X size={18} aria-hidden="true" /></Dialog.Close></div>
          <NavigationTree sections={sections} currentPath={currentPath} expandedSectionIds={navigationState.expandedSectionIds} onNavigate={() => setOpen(false)} onToggle={toggleSection} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <div className="mx-auto grid gap-10 xl:w-[74rem] xl:max-w-full xl:grid-cols-[15rem_42rem_12rem]">
      <aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"><NavigationTree sections={sections} currentPath={currentPath} expandedSectionIds={navigationState.expandedSectionIds} onToggle={toggleSection} /></aside>
      <main id="main-content" className="min-w-0">{children}</main>
      <aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"><Toc items={toc} /></aside>
    </div>
  </div>;
}
