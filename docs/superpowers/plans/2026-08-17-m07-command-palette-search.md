# M07 Command Palette Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a keyboard-accessible, live-search command palette for Published Docs title and heading results.

**Architecture:** Add a read-only `/api/search` Route Handler over `getPublicSearchResults`; a client `PublicSearchPalette` owns dialog state, debounced/aborted fetches, selection, and navigation. `PublicHeader` becomes the trigger and preserves `/search` as a shareable fallback.

**Tech Stack:** Next.js 16 App Router, React 19, Base UI Dialog, TypeScript, Vitest, Testing Library.

## Global Constraints

- Read only Published `doc_*` data; no migration, index, RLS, legacy, credential, or deployment change.
- Empty palette shows first 10 documents; typed query searches title/H2/H3 immediately.
- Reuse existing background/card/border/focus tokens and 44px touch targets; no dependency.
- Support Ctrl/Cmd+K, click, Escape, Arrow Up/Down, Enter, focus trap and focus return.
- Preserve `/search`, GET URL behavior, no fuzzy search, analytics, or in-palette pagination.

---

### Task 1: Expose a bounded public palette endpoint

**Files:** Create `src/app/api/search/route.ts`, `src/app/api/search/route.test.ts`.

**Interfaces:** Produce `GET(request: Request): Response` returning `{ items: PublicSearchItem[] }`; consume `normalizePublicSearchParams` and `getPublicSearchResults`.

- [ ] **Step 1: Write the failing route test**

```ts
expect((await GET(new Request("https://docs.test/api/search?q=ตั้ง&page=9"))).json()).resolves.toMatchObject({ items: [{ kind: "heading", href: "/guides/account#ตั้งค่า" }] });
```

Mock only the Supabase-facing search service; assert it receives `{ query: "ตั้ง", page: 1 }`, malformed multi-value `q` becomes empty, errors return status 500, and returned items never exceed 10.

- [ ] **Step 2: Run red test**

Run: `npx vitest --config vitest.config.mts run src/app/api/search/route.test.ts`

Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement the handler**

```ts
const input = normalizePublicSearchParams({ q: new URL(request.url).searchParams.get("q") ?? undefined });
const result = await getPublicSearchResults({ query: input.query, page: 1 });
return Response.json({ items: result.items.slice(0, 10) });
```

Catch service errors and return `Response.json({ error: "ไม่สามารถค้นหาคู่มือได้" }, { status: 500 })`.

- [ ] **Step 4: Run green test and commit**

Run: `npx vitest --config vitest.config.mts run src/app/api/search/route.test.ts`

```bash
git add src/app/api/search/route.ts src/app/api/search/route.test.ts && git commit -m "feat: add public search endpoint"
```

### Task 2: Build the palette and trigger

**Files:** Create `src/components/public/public-search-palette.tsx`, `.test.tsx`; modify `src/components/public/public-header.tsx`, `src/components/public/search-shortcut.tsx`, `.test.tsx`.

**Interfaces:** `PublicSearchPalette` exposes its trigger through `open` state; it fetches `/api/search?q=${encodeURIComponent(query)}` and consumes endpoint item type `{ kind, href, title, sectionTitle, parentTitle, heading? }`.

- [ ] **Step 1: Write failing interaction tests**

```tsx
await user.keyboard("{Control>}k{/Control}"); expect(screen.getByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeTruthy(); expect(screen.getByRole("searchbox")).toBe(document.activeElement);
await user.keyboard("{ArrowDown}{Enter}"); expect(push).toHaveBeenCalledWith("/guides/account#ตั้งค่า");
await user.keyboard("{Escape}"); expect(trigger).toBe(document.activeElement);
```

Mock `fetch` responses for initial 10 items, typed heading items, empty list, and 500. Assert loading/status text, debounce fake-timer behavior, and an obsolete request cannot replace the latest result.

- [ ] **Step 2: Run red test**

Run: `npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx`

Expected: FAIL because palette component does not exist.

- [ ] **Step 3: Implement minimal dialog behavior**

```tsx
<Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 bg-background/60" /><Dialog.Popup aria-label="ค้นหาคู่มือ">...</Dialog.Popup></Dialog.Portal></Dialog.Root>
```

On open fetch `q=""`, focus the input, then debounce subsequent fetches 150ms with `AbortController`. Render 10 semantic result links; Arrow Up/Down wraps `selectedIndex`; Enter calls `router.push(items[selectedIndex].href)`; Escape/close restores trigger focus. Replace old header form/shortcut page-navigation with the palette trigger/open callback.

- [ ] **Step 4: Run palette/shortcut tests and commit**

Run: `npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx src/components/public/search-shortcut.test.tsx`

```bash
git add src/components/public/public-search-palette.tsx src/components/public/public-search-palette.test.tsx src/components/public/public-header.tsx src/components/public/search-shortcut.tsx src/components/public/search-shortcut.test.tsx && git commit -m "feat: add public search palette"
```

### Task 3: Document and verify

**Files:** Modify `TODO.md`, `docs/todo/M07-search-hardening.md`, `docs/context/requirements-decisions.md`, `docs/context/testing-and-commands.md`.

- [ ] **Step 1: Update M07 records**

Record that command palette now performs live Title/H2/H3 search, initial results are first 10 documents, and `/search` remains fallback; retain the explicit performance/browser follow-up.

- [ ] **Step 2: Run focused checks**

Run: `npx vitest --config vitest.config.mts run src/app/api/search/route.test.ts src/components/public/public-search-palette.test.tsx src/components/public/search-shortcut.test.tsx src/lib/docs/public-search.test.ts src/app/search/page.test.tsx`

Expected: PASS with zero failures.

- [ ] **Step 3: Run local gate**

Run: `npm run lint && npm run build && git diff --check`

Expected: lint has no errors, build exits 0, diff has no whitespace error.

- [ ] **Step 4: Commit evidence**

```bash
git add TODO.md docs/todo/M07-search-hardening.md docs/context/requirements-decisions.md docs/context/testing-and-commands.md && git commit -m "docs: record command palette search"
```

## Plan Self-Review

- Tasks 1-2 cover initial/live data, bounded results, all dialog states, keyboard navigation, focus, error handling, and responsive component constraints; Task 3 preserves direct search and records verification.
- `PublicSearchItem` is returned by Task 1 and consumed by Task 2; no unplanned schema or dependency work appears.
