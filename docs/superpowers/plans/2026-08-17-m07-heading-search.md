# M07 Heading Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search Published documents by title or H2/H3 heading, with a matched heading opening its anchor.

**Architecture:** Put H2/H3 extraction in one pure helper used by document rendering and search. A non-empty query fetches title matches via escaped `ILIKE`, fetches Published JSON to derive headings, joins title results before heading results, then paginates globally. Blank queries retain the current database-paginated document list.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Testing Library, Supabase JavaScript client.

## Global Constraints

- Use only `doc_documents` and `doc_sections`; no legacy or schema/RLS/index changes.
- Return Published documents only; GET search, 200-character query cap, 10 results/page, and no autocomplete stay unchanged.
- Match H2/H3 outside tables only; do not match excerpts, paragraphs, code, or images.
- Blank query lists documents only. Treat `%`, `_`, and `\\` literally.
- No `search_text`, new table, trigger, migration, package, or deployment.
- Preserve unrelated worktree edits; use `apply_patch` and `npm`.

---

## File Structure

| File | Role |
|---|---|
| `src/lib/docs/headings.ts` | Pure Tiptap H2/H3 text and stable anchor ID extraction. |
| `src/lib/docs/headings.test.ts` | Extractor unit tests. |
| `src/components/public/document-content.tsx` | Use shared headings for reader anchors. |
| `src/components/public/document-content.test.tsx` | Reader-anchor regressions. |
| `src/lib/docs/public-search.ts` | Construct/order/paginate title and heading results. |
| `src/lib/docs/public-search.test.ts` | Search result unit tests. |
| `src/app/search/page.tsx` | Heading label and anchor destination UI. |
| `src/app/search/page.test.tsx` | Heading UI regression test. |
| M07 docs/context files | Scope and fresh verification evidence. |

### Task 1: Share deterministic heading extraction

**Files:** Create `src/lib/docs/headings.ts`, `src/lib/docs/headings.test.ts`; modify `src/components/public/document-content.tsx` and `.test.tsx`.

**Interfaces:** Produce `DocumentHeading = { id: string; level: 2 | 3; text: string }` and `getDocumentHeadings(content: unknown): DocumentHeading[]`. `DocumentContent` consumes that helper.

- [ ] **Step 1: Write the failing extractor test**

```ts
expect(getDocumentHeadings(content)).toEqual([{ id: "ตั้งค่า", level: 2, text: "ตั้งค่า" }, { id: "รายละเอียด", level: 3, text: "รายละเอียด" }, { id: "ตั้งค่า-2", level: 2, text: "ตั้งค่า" }]);
```

Use `content` containing a Thai H2, an H3, duplicate H2, nested marked text, and a table containing an H2 named `ซ่อน`; the table heading must not appear.

- [ ] **Step 2: Run the test and confirm red**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts`

Expected: FAIL because `./headings` does not exist.

- [ ] **Step 3: Write the minimal pure helper and wire reader rendering**

```ts
type ContentNode = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: ContentNode[] };
const textFromNode = (node: ContentNode): string => node.text ?? node.content?.map(textFromNode).join("") ?? "";
export function getDocumentHeadings(content: unknown): DocumentHeading[] {
  const usedIds = new Map<string, number>(); const headings: DocumentHeading[] = [];
  const visit = (node: ContentNode) => { if (node.type === "table") return; if (node.type === "heading" && (node.attrs?.level === 2 || node.attrs?.level === 3)) { const text = textFromNode(node).trim(); if (text) { const base = slugify(text); const count = usedIds.get(base) ?? 0; usedIds.set(base, count + 1); headings.push({ id: count ? `${base}-${count + 1}` : base, level: node.attrs.level, text }); } } node.content?.forEach(visit); };
  visit(content as ContentNode); return headings;
}
```

Move the existing extraction out of `document-content.tsx`, import it there, and retain `getTableOfContents` as an alias if an existing import needs it. Do not change reader anchor output.

- [ ] **Step 4: Run focused tests and confirm green**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts src/components/public/document-content.test.tsx`

Expected: PASS, including Thai, duplicate, and ignored-table heading IDs.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/docs/headings.ts src/lib/docs/headings.test.ts src/components/public/document-content.tsx src/components/public/document-content.test.tsx && git commit -m "refactor: share document heading extraction"
```

### Task 2: Build and paginate title/heading results

**Files:** Modify `src/lib/docs/public-search.ts` and `src/lib/docs/public-search.test.ts`.

**Interfaces:** Consume `getDocumentHeadings`. Produce `PublicSearchItem = PublicNavigationItem & ({ kind: "document"; href: string } | { kind: "heading"; href: string; heading: string; headingLevel: 2 | 3 })` and `buildPublicSearchItems(documents, sections, query): PublicSearchItem[]`.

- [ ] **Step 1: Write failing search-builder tests**

```ts
expect(buildPublicSearchItems(documents, sections, "ตั้ง")).toMatchObject([{ kind: "document", href: "/guides/settings" }, { kind: "heading", heading: "ตั้งค่าบัญชี", href: "/guides/account#ตั้งค่าบัญชี" }, { kind: "heading", headingLevel: 3, heading: "ตั้งค่าการแจ้งเตือน", href: "/guides/account#ตั้งค่าการแจ้งเตือน" }]);
```

Fixtures must prove title-first order, one row per matched heading, heading source order, blank query creates no headings, paragraph/table heading exclusion, literal `%`, `_`, `\\`, draft exclusion, and 11 constructed matches yielding page 2 with one item.

- [ ] **Step 2: Run test and confirm red**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/public-search.test.ts`

Expected: FAIL because the builder/type do not exist.

- [ ] **Step 3: Implement minimal data and builder logic**

```ts
const headingItems = contentRows.flatMap((document) => getDocumentHeadings(document.content).filter(({ text }) => text.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(({ id, level, text }) => ({ ...toNavigationItem(document), kind: "heading", heading: text, headingLevel: level, href: `${path}#${id}` })));
```

For a non-empty query, concurrently fetch sections, title rows with the existing escaped `ILIKE`, and all Published rows including `content`; sort title rows by title/id, heading rows by document title/id/source order, concatenate title then heading, and slice only after construction. Compute total/page count from the combined list. Empty query keeps the current exact count, range, title/id order, document mapping, and does not select content. Ignore malformed JSON and recheck `status === "published"` in the builder.

- [ ] **Step 4: Run tests and confirm green**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/public-search.test.ts`

Expected: PASS for all Task 2 fixture cases.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/docs/public-search.ts src/lib/docs/public-search.test.ts && git commit -m "feat: search document headings"
```

### Task 3: Render heading results and record the expanded scope

**Files:** Modify `src/app/search/page.tsx`, `src/app/search/page.test.tsx`, `TODO.md`, `docs/todo/M07-search-hardening.md`, `docs/context/requirements-decisions.md`, and `docs/context/testing-and-commands.md`.

**Interfaces:** Consume `PublicSearchItem`. A `kind: "heading"` item renders `หัวข้อ: {heading}` and uses its `href`; document item UI stays the same.

- [ ] **Step 1: Write the failing page assertion**

```tsx
expect(screen.getByRole("link", { name: "คู่มือบัญชี" }).getAttribute("href")).toBe("/guides/account#ตั้งค่าการแจ้งเตือน"); expect(screen.getByText("หัวข้อ: ตั้งค่าการแจ้งเตือน")).toBeTruthy();
```

Mock one heading item with `headingLevel: 3`, standard navigation fields, and `href: "/guides/account#ตั้งค่าการแจ้งเตือน"`.

- [ ] **Step 2: Run test and confirm red**

Run: `npx vitest --config vitest.config.mts run src/app/search/page.test.tsx`

Expected: FAIL because the page uses `path` and lacks a heading label.

- [ ] **Step 3: Implement minimal UI and documentation**

```tsx
<Link href={result.href} aria-label={result.title} className="block px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="block font-medium">{result.title}</span>{result.kind === "heading" && <span className="mt-1 block text-sm text-muted-foreground">หัวข้อ: {result.heading}</span>}</Link>
```

Keep current no-result text, query-preserving pagination, native anchors, focus style, breadcrumb, and excerpt. Update M07 records from title-only to title plus runtime-extracted H2/H3 with no migration; append exact test/lint/build outcomes after Task 4.

- [ ] **Step 4: Run focused UI suite and confirm green**

Run: `npx vitest --config vitest.config.mts run src/app/search/page.test.tsx src/lib/docs/public-search.test.ts src/lib/docs/headings.test.ts src/components/public/document-content.test.tsx`

Expected: PASS with the heading label and exact anchor href.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/app/search/page.tsx src/app/search/page.test.tsx TODO.md docs/todo/M07-search-hardening.md docs/context/requirements-decisions.md docs/context/testing-and-commands.md && git commit -m "docs: record heading search verification"
```

### Task 4: Full local verification

**Files:** Modify `docs/context/testing-and-commands.md` only if new evidence was not recorded by Task 3.

**Interfaces:** Consume Tasks 1-3 and produce fresh local evidence. Do not deploy or migrate Staging.

- [ ] **Step 1: Run full focused regression suite**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts src/components/public/document-content.test.tsx src/lib/docs/public-search.test.ts src/app/search/page.test.tsx src/components/public/search-shortcut.test.tsx`

Expected: PASS with zero failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no errors; report unrelated warnings without editing their files.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit code 0; record framework deprecation warnings separately.

- [ ] **Step 4: Inspect and commit only necessary evidence**

```bash
git diff --check && git status --short
```

If Task 4 changes documentation, stage only that doc and use `git commit -m "test: verify heading search"`; otherwise do not create an empty commit. Never stage unrelated Admin files.

## Plan Self-Review

- Spec coverage: Tasks 1-3 cover shared anchors, H2/H3-only matching, one heading per result, title precedence, blank-query behavior, Published-only defense, literal handling, labels/links, docs, and no schema work. Task 4 covers tests, lint, and build; performance/capacity remains explicit M07 follow-up.
- Placeholder scan: no `TBD`, `TODO`, or unspecified test/error step remains.
- Type consistency: `DocumentHeading` feeds Task 2; `PublicSearchItem` feeds Task 3; Task 4 names the exact related tests.
