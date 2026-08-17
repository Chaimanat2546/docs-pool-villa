# M07 Title Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search Published document titles only, 10 results per page, with `Ctrl/⌘+K` and no autocomplete.

**Architecture:** A Server Component route obtains one page through a new server-only Supabase service. The service uses existing anon/RLS visibility, an explicit Published filter, and public sections for paths. A leaf Client Component alone handles keyboard events. PostgreSQL receives one Docs-only partial GIN trigram index.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Supabase/PostgreSQL `pg_trgm`, Vitest, pgTAP.

## Constraints

- Search only `doc_documents.title`; do not add `search_text` or search excerpt/content.
- Empty query lists Published documents, 10 per page.
- Escape `%`, `_`, and `\\`; modify no legacy object, RLS policy, function, or index.
- Never use Staging/Production without separate approval from ภู.

### Task 1: Database index and regression test

**Files:** Create `supabase/migrations/<CLI-generated>_docs_title_search.sql`; create `supabase/tests/docs_title_search_test.sql`.

- [ ] Write a transaction-scoped pgTAP fixture for Published, Draft, and content-only matches. Under anon, non-admin, and Admin roles, verify explicit Published title match, literal `%_\\` matching, and that no legacy index changes exist.

- [ ] Run the failing test.

```powershell
npx --yes supabase@latest test db --local supabase/tests/docs_title_search_test.sql
```

Expected: FAIL because the index is absent.

- [ ] Read `supabase migration new --help` and current Supabase extension/performance docs, then generate the migration. Its complete SQL is:

```sql
create extension if not exists pg_trgm with schema extensions;
create index doc_documents_published_title_trgm_idx on public.doc_documents using gin (title extensions.gin_trgm_ops) where status = 'published';
```

- [ ] Reset Local DB, run focused pgTAP, DB lint, security/performance advisors, and an `EXPLAIN (ANALYZE, BUFFERS)` representative query. Require passing tests, no new Docs finding, and index usage before commit.

- [ ] Commit `supabase/migrations` and the test as `feat: index published document titles`.

### Task 2: Server-only search service

**Files:** Create `src/lib/docs/public-search.ts`; create `src/lib/docs/public-search.test.ts`.

**Interfaces:**

```ts
export const PUBLIC_SEARCH_PAGE_SIZE = 10;
export function normalizePublicSearchParams(input: { q?: string | string[]; page?: string | string[] }): { query: string; page: number };
export function escapeLikePattern(value: string): string;
export async function getPublicSearchResults(input: { query: string; page: number }): Promise<{ items: PublicNavigationItem[]; total: number; page: number; pageCount: number }>;
```

- [ ] Write tests first: trim input, limit at 200 characters, array/invalid page resolves to page 1, 0/10/11 page totals, and `escapeLikePattern("%_\\") === "\\%\\_\\\\"`. Run the test and confirm it fails due to absent module.

- [ ] Implement a `server-only` service. In parallel, fetch RLS-visible sections and this exact public document query, applying the escaped `ilike` only when query is non-empty:

```ts
supabase.from("doc_documents").select("id, section_id, title, slug, excerpt, updated_at, sort_order", { count: "exact" }).eq("status", "published").order("title").order("id").range((page - 1) * 10, page * 10 - 1)
```

- [ ] Map results with `pathFromSection` into `PublicNavigationItem`; throw the existing Thai public-data error style on request/path failure; never select content. Run tests to PASS and commit as `feat: add public title search service`.

### Task 3: Server-rendered route and error UI

**Files:** Modify `src/app/search/page.tsx`; create `src/app/search/page.test.tsx`, `src/app/search/error.tsx`, and `src/app/search/error.test.tsx`.

- [ ] Mock Task 2 and write failing tests for: blank heading `เอกสารทั้งหมด`, query heading, ten list rows, path/optional excerpt, no-result copy, no previous link on page 1, encoded next link, noindex metadata, and retry calling `reset`.

- [ ] Keep the page server-rendered: await `searchParams`, normalize, query, and render `PublicHeader`, one `h1`, status/count, an `ol`, result Links, and pagination Links. Use `URLSearchParams`, omit `page=1`, preserve non-empty `q`, and retain `robots: { index: false, follow: false }`.

- [ ] Add a client `error.tsx` whose `role="alert"` copy is `ไม่สามารถค้นหาคู่มือได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง` and whose `ลองใหม่` button calls `reset`; do not expose error details. Pass tests and commit as `feat: render paginated title search results`.

### Task 4: Next.js-style shortcut

**Files:** Create `src/components/public/search-shortcut.tsx` and `.test.tsx`; modify `src/components/public/public-header.tsx`.

- [ ] Write failing tests: Ctrl+K/Command+K off Search invokes `window.location.assign("/search#public-search")`; on `/search` it focuses labeled `public-search`; plain K, Ctrl+Shift+K, and composing input do nothing; no dialog/listbox is rendered.

- [ ] Implement a leaf `"use client"` component with `useEffect` listener/cleanup. Only prevent default for lowercase K, exactly one Ctrl/Meta, without Alt/Shift/composition. Focus current Search input or navigate to its fragment. Mount it in the still-server header and add a compact `Ctrl K`/`⌘ K` hint while preserving the native labeled GET form.

- [ ] Pass tests and commit as `feat: add public search keyboard shortcut`.

### Task 5: Local verification and records

**Files:** Modify `TODO.md`, `docs/todo/M07-search-hardening.md`, `docs/context/requirements-decisions.md`, and `docs/context/testing-and-commands.md`.

- [ ] Run fresh Local DB reset, `npm run test:db`, all four focused Vitest files, `npm run test:public`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`. Resolve failures before documentation.

- [ ] With Local fixtures only, smoke-test shortcut focus, Enter submit, pagination, no-result copy, labels, visible focus, and no horizontal overflow at 390px. Record only successful evidence. Mark only Local M07 tasks complete; record the title-only/10-item/blank-query/shortcut decision and never claim Staging or Production verification.

- [ ] Commit verified records as `docs: record M07 local search verification`.

## Plan Self-Review

- Tasks 1–3 implement and test all search behavior, security boundaries, errors, and noindex requirements.
- Task 4 implements exactly the requested Next.js Docs-style keyboard shortcut without expanding scope to autocomplete.
- Task 5 ensures Local evidence and project documentation stay accurate.
