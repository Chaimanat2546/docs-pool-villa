"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SearchShortcut() {
  const router = useRouter();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || event.altKey || event.shiftKey || event.isComposing || event.ctrlKey === event.metaKey) return;
      event.preventDefault();
      if (window.location.pathname === "/search") document.getElementById("public-search")?.focus();
      else router.push("/search#public-search");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  return null;
}
