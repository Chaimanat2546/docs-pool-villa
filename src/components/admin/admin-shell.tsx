"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BookOpen, FolderTree, Menu, PencilLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const adminNavigation = [
  { title: "โครงสร้าง", href: "/admin/structure", icon: FolderTree },
  { title: "เอกสาร", href: "/admin/documents", icon: BookOpen },
  { title: "Editor", href: "/admin/editor", icon: PencilLine },
] as const;

type NavigationLinksProps = {
  pathname: string;
  onNavigate?: () => void;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
};

function NavigationLinks({ pathname, onNavigate, firstLinkRef }: NavigationLinksProps) {
  return <>
    {adminNavigation.map(({ title, href, icon: Icon }, index) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={onNavigate} ref={index === 0 ? firstLinkRef : undefined} className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"><Icon size={18} aria-hidden="true" />{title}</Link>)}
  </>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  return <div className="min-h-screen lg:flex">
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="border-b px-5 py-5"><p className="font-semibold">ผู้ดูแลคู่มือ</p></div>
      <nav aria-label="เมนูผู้ดูแล" className="flex flex-1 flex-col gap-1 p-3"><NavigationLinks pathname={pathname} /><Link href="/" className="mt-auto flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">กลับหน้าคู่มือ</Link></nav>
    </aside>

    <Dialog.Root open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
      <div className="border-b bg-card px-4 py-3 lg:hidden"><Dialog.Trigger className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"><Menu size={18} aria-hidden="true" />เมนูผู้ดูแล</Dialog.Trigger></div>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
        <Dialog.Popup initialFocus={firstMobileLinkRef} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col bg-card p-4 shadow-xl outline-none lg:hidden">
          <Dialog.Title className="px-3 py-2 text-lg font-semibold">เมนูผู้ดูแล</Dialog.Title>
          <nav aria-label="เมนูผู้ดูแล" className="mt-3 flex flex-1 flex-col gap-1"><NavigationLinks pathname={pathname} onNavigate={() => setMobileNavigationOpen(false)} firstLinkRef={firstMobileLinkRef} /><Link href="/" onClick={() => setMobileNavigationOpen(false)} className="mt-auto flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">กลับหน้าคู่มือ</Link></nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>

    <main id="main-content" className="min-w-0">{children}</main>
  </div>;
}
