"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FileText, Hash, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SearchItem = {
  id: string;
  href: string;
  title: string;
  sectionTitle: string;
  parentTitle: string | null;
  excerpt: string | null;
  kind: "document" | "heading";
  heading?: string;
};
type GroupedSearchResult = { document: SearchItem; headings: SearchItem[] };

function getGroupedSearchResults(items: SearchItem[]): GroupedSearchResult[] {
  const groups = new Map<string, GroupedSearchResult>();

  for (const item of items) {
    const documentHref =
      item.kind === "document" ? item.href : item.href.split("#", 1)[0];
    const group = groups.get(documentHref);

    if (item.kind === "document") {
      groups.set(documentHref, {
        document: item,
        headings: group?.headings ?? [],
      });
    } else if (group) {
      group.headings.push(item);
    } else {
      groups.set(documentHref, {
        document: { ...item, href: documentHref, kind: "document" },
        headings: [item],
      });
    }
  }

  return [...groups.values()];
}

export function PublicSearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const groupedItems = getGroupedSearchResults(items);
  const selectableItems = groupedItems.flatMap((group) => [
    group.document,
    ...group.headings,
  ]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const controller = new AbortController();
    const loadResults = () => {
      setStatus("loading");
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
          setItems(data.items);
          setStatus("idle");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setItems([]);
            setStatus("error");
          }
        });
    };
    const timeout = window.setTimeout(loadResults, query ? 150 : 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "k" &&
        !event.altKey &&
        !event.shiftKey &&
        !event.isComposing &&
        event.ctrlKey !== event.metaKey
      ) {
        event.preventDefault();
        handleOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setSelectedIndex(-1);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedIndex(-1);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!selectableItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % selectableItems.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(
        (current) =>
          (current - 1 + selectableItems.length) % selectableItems.length
      );
    }
    if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      router.push(selectableItems[selectedIndex].href);
      setOpen(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        aria-label="ค้นหาคู่มือ"
        className="ml-auto flex h-11 w-full max-w-sm items-center rounded-md border bg-card px-3 text-left text-sm text-muted-foreground sm:h-9"
      >
        <Search size={16} aria-hidden="true" />
        <span className="ml-2 flex-1">ค้นหาคู่มือ</span>
        <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl K</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" />
        <Dialog.Popup
          aria-label="ค้นหาคู่มือ"
          className="fixed left-1/2 top-24 z-50 w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border bg-card p-3 shadow-xl outline-none"
        >
          <label className="sr-only" htmlFor="palette-search">
            ค้นหาคู่มือ
          </label>
          <input
            ref={inputRef}
            id="palette-search"
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="ค้นหาคู่มือ"
            className="h-11 w-full rounded-md bg-muted px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {status === "loading" ? (
            <p
              className="px-3 py-4 text-sm text-muted-foreground"
              role="status"
            >
              กำลังค้นหาคู่มือ...
            </p>
          ) : status === "error" ? (
            <p className="px-3 py-4 text-sm text-destructive" role="alert">
              ไม่สามารถค้นหาคู่มือได้ ลองพิมพ์อีกครั้ง
            </p>
          ) : items.length === 0 ? (
            <p
              className="px-3 py-4 text-sm text-muted-foreground"
              role="status"
            >
              {query
                ? "ไม่พบเอกสารหรือหัวข้อที่ตรงกับคำค้น"
                : "ยังไม่มีเอกสารที่เผยแพร่"}
            </p>
          ) : (
            <ul
              className="mt-2 max-h-80 overflow-y-auto"
              aria-label="ผลการค้นหา"
              role="listbox"
            >
              {groupedItems.map((group) => (
                <li key={group.document.href}>
                  <a
                    data-testid="document-result"
                    href={group.document.href}
                    aria-selected={
                      selectableItems[selectedIndex]?.href ===
                      group.document.href
                    }
                    role="option"
                    className={`flex min-h-11 items-center gap-2 rounded-md px-3 py-2 font-medium ${
                      selectableItems[selectedIndex]?.href ===
                      group.document.href
                        ? "bg-muted"
                        : "hover:bg-muted"
                    }`}
                  >
                    <FileText
                      data-testid="document-icon"
                      size={16}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block">{group.document.title}</span>
                      {group.document.excerpt?.trim() && (
                        <span
                          data-testid="document-excerpt"
                          className="block truncate text-sm font-normal text-muted-foreground"
                        >
                          {group.document.excerpt}
                        </span>
                      )}
                    </span>
                  </a>
                  {group.headings.map((heading) => (
                    <a
                      key={`${heading.id}-${heading.href}`}
                      data-testid="heading-result"
                      href={heading.href}
                      aria-selected={
                        selectableItems[selectedIndex]?.href === heading.href
                      }
                      role="option"
                      className={`flex min-h-11 items-start gap-2 rounded-md py-2 pl-8 pr-3 text-sm ${
                        selectableItems[selectedIndex]?.href === heading.href
                          ? "bg-muted"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Hash
                        data-testid="heading-icon"
                        size={16}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0"
                      />
                      <span>{heading.heading}</span>
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
