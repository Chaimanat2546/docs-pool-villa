import Link from "next/link";

import { PublicSearchPalette } from "@/components/public/public-search-palette";

export function PublicHeader() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="min-h-11 shrink-0 content-center text-sm font-semibold tracking-tight"
          >
            Baan Pool Villa Docs
          </Link>
          <PublicSearchPalette />
        </div>
      </header>
    </>
  );
}
