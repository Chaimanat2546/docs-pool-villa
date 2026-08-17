"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function SearchShortcut() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      pathname !== "/search" ||
      window.sessionStorage.getItem("docs-search-focus") !== "1"
    ) {
      return;
    }

    window.sessionStorage.removeItem("docs-search-focus");
    document.getElementById("public-search")?.focus();
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || event.altKey || event.shiftKey || event.isComposing || event.ctrlKey === event.metaKey) return;
      event.preventDefault();
      if (window.location.pathname === "/search") {
        document.getElementById("public-search")?.focus();
      } else {
        window.sessionStorage.setItem("docs-search-focus", "1");
        router.push("/search");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}
