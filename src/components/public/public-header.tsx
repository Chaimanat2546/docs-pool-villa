import Link from "next/link";
import { Moon } from "lucide-react";

import { PublicSearchPalette } from "@/components/public/public-search-palette";

export function PublicHeader() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-8">
          <Link
            href="/"
            className="min-h-11 shrink-0 content-center text-sm font-semibold tracking-tight"
          >
            Baan Pool Villa
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="เมนูหลัก">
            <Link href="#getting-started" className="hover:text-foreground">Docs</Link>
            <Link href="#getting-started" className="hover:text-foreground">Guides</Link>
            <Link href="#explore" className="hover:text-foreground">Reference</Link>
            <Link href="#latest-updates" className="hover:text-foreground">Changelog</Link>
          </nav>
          <PublicSearchPalette />
          <button type="button" aria-label="เปิด GitHub" className="hidden size-10 shrink-0 place-items-center rounded-md text-lg hover:bg-muted sm:grid">◉</button>
          <button type="button" aria-label="เปลี่ยนธีม" className="grid size-10 shrink-0 place-items-center rounded-md hover:bg-muted"><Moon size={18} /></button>
        </div>
      </header>
    </>
  );
}
