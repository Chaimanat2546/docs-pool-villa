# M07 Search, Performance & Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Published-only Thai-friendly document and H2/H3 search experience with an accessible command palette, indexed PostgreSQL query path, repeatable 5,000-document load harness, and verified production-readiness evidence.

**Architecture:** PostgreSQL materializes one document segment plus ordered heading segments whenever a Published document changes, and searches those rows through `pg_trgm` GIN indexes and a bounded `SECURITY INVOKER` RPC. Next.js exposes the RPC through one server-only search module, a no-store Route Handler, a shareable `/search` page, and a Base UI command palette that receives five-second Public suggestions but fetches live results after a 250 ms debounce.

**Tech Stack:** PostgreSQL 17, Supabase CLI/Data API/RLS/pgTAP, `pg_trgm`, Next.js 16.3.0 App Router, React 19.2.8, TypeScript 5, Base UI Dialog 1.7, Tailwind CSS 4, Vitest 4, Testing Library, Node.js built-in `fetch`, OpenNext Cloudflare.

## Global Constraints

- Work on the current `feature/documents-editer` branch. The working tree may be dirty: run `git status --short` before each task, preserve every unrelated user change, and stage only the exact files named by the current task. Never assume that an existing modification belongs to M07.
- Treat [the approved design](../specs/2026-08-14-m07-search-hardening-design.md), [M07 module scope](../../todo/M07-search-hardening.md), and [Requirements v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md) as authoritative.
- Before editing Next.js code, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, `page.md`, `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, and the relevant Cache Components guidance under `node_modules/next/dist/docs/01-app/01-getting-started/`.
- At execution time, load `.agents/skills/supabase/SKILL.md` for every Supabase task and `.agents/skills/supabase-postgres-best-practices/SKILL.md` before any schema, function, trigger, index, RLS, query-plan, or load-test change.
- Use the imperative migration workflow. Run `npx --yes supabase@latest migration new m07_search_segments`; use the exact path printed by the CLI and never invent or edit an older migration filename.
- Use `apply_patch` for manual edits, `npm` for package scripts, and keep `package-lock.json` unchanged because this plan adds no dependency.
- Follow TDD at every behavior boundary: focused RED, minimal implementation, focused GREEN, then the smallest relevant regression suite.
- Create or alter only Docs-owned `doc_*` objects. Do not alter `public.users`, `public.roles`, Legacy policies/functions/indexes, Cloudflare Media Worker, R2, Auth configuration, or Production resources.
- Public visibility means `doc_private.doc_document_is_public(document_id)`: document status is `published`, its section is published, and its parent section is published when present.
- Draft and Archived documents must have no search segments. Hidden-section Published segments may exist for fast re-publication but RLS and RPC must never expose them publicly.
- Public RPCs use `SECURITY INVOKER`, fixed `search_path`, explicit `REVOKE/GRANT`, parameterized SQL, 2–200-character queries, at most 10 documents, at most 20 clickable rows, and bounded snippets.
- Never expose or use a `service_role` key in the App, Route Handler, browser, tests, load harness, docs, or logs. Do not record raw user search queries in application logs.
- Header UI shows **ค้นหาเอกสาร...** without a visible or global `Ctrl/⌘ K` shortcut. Mouse/touch is primary; Tab, Arrow Up/Down, Enter, and Escape remain functional without visible shortcut instructions.
- Reuse Base UI Dialog and existing semantic tokens. Interactive targets remain at least 44×44 CSS pixels; verify focus trap/restore, screen-reader semantics, reduced motion, long Thai text, 390px layout, and no horizontal overflow.
- Performance gates are Search and Server response ≤1 s p95, Public mobile LCP ≤2.5 s p75, Admin save ≤2 s p95 including segment rebuild, Published visibility ≤5 s, 5,000 documents, 500 Public concurrent, and 10 Admin capacity.
- Run only Local build/test untilภู gives separate Staging approval. Staging uses deterministic Test data only. Production migration/deployment requires another explicit approval after Staging, verified backup, and tested rollback.
- Update `docs/todo/M07-search-hardening.md` after each completed task. Change `TODO.md`/`context.md` status only when implementation actually starts or finishes; never claim a test or target passed without fresh evidence.

---

## File Structure

### Create

- `supabase/migrations/*_m07_search_segments.sql` — the single file emitted by `supabase migration new`; it owns `pg_trgm`, segment schema, extraction/anchor/sync helpers, RLS, GIN index, bounded Public RPC, trigger, and Published backfill.
- `supabase/tests/docs_search_hardening_test.sql` — pgTAP coverage for extraction, synchronization, ranking, bounds, privileges, and Guest/non-admin/Admin visibility.
- `src/lib/docs/headings.ts` — shared TypeScript heading text, slug, duplicate-anchor, and TOC contract.
- `src/lib/docs/headings.test.ts` — pure Thai/Unicode/duplicate/table anchor fixtures.
- `src/lib/docs/search-model.ts` — search query parser, RPC row/result types, deterministic grouping, flattening, and safe highlight fragments.
- `src/lib/docs/search-model.test.ts` — pure query/grouping/highlight tests.
- `src/lib/docs/search.ts` — server-only Supabase RPC adapter and safe error boundary.
- `src/lib/docs/search.test.ts` — mocked RPC mapping, bounds, and failure tests.
- `src/app/api/search/route.ts` — dynamic no-store `GET /api/search?q=` JSON boundary.
- `src/app/api/search/route.test.ts` — `400`/`200`/`500`, response shape, and cache-header tests.
- `src/components/public/search-result-list.tsx` — shared grouped document/heading list and safe highlighting.
- `src/components/public/search-result-list.test.tsx` — document/heading links, anchors, highlight, and long-copy behavior.
- `src/components/public/search-command.tsx` — controlled Base UI Dialog, progressive trigger link, debounce, abort, active option, retry, and focus behavior.
- `src/components/public/search-command.test.tsx` — mouse/touch, keyboard, stale-response, state, and accessibility tests.
- `src/components/public/public-header.test.tsx` — suggestion mapping and visible Header contract.
- `src/app/search/page.test.tsx` — empty, short, success, empty-result, and safe-error page states.
- `supabase/perf/m07_seed_search.sql` — deterministic 5,000-document Local/Staging-approved fixture creation.
- `supabase/perf/m07_cleanup_search.sql` — exact-ID guarded fixture cleanup.
- `supabase/perf/m07_explain_search.sql` — direct GIN candidate and end-to-end RPC `EXPLAIN (ANALYZE, BUFFERS)` queries.
- `scripts/m07-search-load.mjs` — dependency-free concurrent HTTP runner that writes p50/p75/p95/throughput/error JSON.
- `docs/context/search-and-performance.md` — durable Search schema/query/performance/rollback contract and measured evidence links.

### Modify

- `src/components/public/document-content.tsx` — consume and re-export shared heading helpers without changing rendering behavior.
- `src/lib/docs/public.ts` — export the existing server-only Public Supabase client factory and supply cached navigation suggestions to the Header.
- `src/components/public/public-header.tsx` — replace the current Header form/link pair with the command palette while preserving `/search` fallback.
- `src/app/search/page.tsx` — render the full shareable Server Component search experience.
- `src/app/globals.css` — add only command palette/result layout rules that cannot be expressed clearly with existing utilities.
- `package.json` — add focused `test:search` and dependency-free `perf:search` scripts; do not change dependencies.
- `.gitignore` — ignore `/artifacts/m07/` generated performance reports.
- `docs/todo/M07-search-hardening.md`, `TODO.md`, `context.md`, `docs/context/database.md`, `docs/context/testing-and-commands.md` — track actual progress, schema boundary, commands, and measured results.

---

### Task 1: Start M07 and centralize the heading-anchor contract

**Files:**
- Create: `src/lib/docs/headings.ts`
- Create: `src/lib/docs/headings.test.ts`
- Modify: `src/components/public/document-content.tsx`
- Modify: `docs/todo/M07-search-hardening.md`
- Modify: `TODO.md`
- Modify: `context.md`

**Interfaces:**
- Produces: `ContentNode`, `TocItem`.
- Produces: `textFromContentNode(node: ContentNode): string`.
- Produces: `slugifyHeading(value: string): string`.
- Produces: `getTableOfContents(content: unknown): TocItem[]`.
- Preserves: `DocumentContent` output and its existing `getTableOfContents` named export for current consumers.

- [ ] **Step 1: Record the authorized implementation start**

Set M07 to `in progress` in `TODO.md`, identify it as the sole current module in `context.md`, and change `docs/todo/M07-search-hardening.md` status to `In progress`. Link the approved Design and this Plan; do not check a feature item yet.

- [ ] **Step 2: Write pure heading-helper failing tests**

Create `src/lib/docs/headings.test.ts` with the exact contract fixtures used by SQL later:

```ts
import { describe, expect, it } from "vitest";
import { getTableOfContents, slugifyHeading } from "./headings";

describe("heading anchors", () => {
  it("normalizes Thai, Latin accents, punctuation, empty values, and collisions", () => {
    expect(slugifyHeading("  เริ่มต้น ใช้งาน! ")).toBe("เริ่มต้น-ใช้งาน");
    expect(slugifyHeading("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugifyHeading("***")).toBe("section");
  });

  it("numbers duplicate normalized ids and skips legacy tables", () => {
    expect(getTableOfContents({ type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Café" }] },
      { type: "table", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "ซ่อน" }] }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Cafe" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "***" }] },
    ] })).toEqual([
      { id: "cafe", level: 2, text: "Café" },
      { id: "cafe-2", level: 3, text: "Cafe" },
      { id: "section", level: 2, text: "***" },
    ]);
  });
});
```

- [ ] **Step 3: Run the focused test and record RED**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts`

Expected: FAIL because `src/lib/docs/headings.ts` does not exist.

- [ ] **Step 4: Move the existing contract into the focused module**

Implement the shared module without changing the approved algorithm:

```ts
export type ContentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: ContentNode[];
};

export type TocItem = { id: string; level: 2 | 3; text: string };

export function textFromContentNode(node: ContentNode): string {
  return node.text ?? node.content?.map(textFromContentNode).join("") ?? "";
}

export function slugifyHeading(value: string): string {
  const normalized = value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}
```

Implement `getTableOfContents` with the existing depth-first traversal, `table` subtree skip, H2/H3 filter, trimmed non-empty text, and duplicate counter keyed by `slugifyHeading(text)`.

In `document-content.tsx`, import these helpers/types, replace the private duplicates, and retain:

```ts
export { getTableOfContents } from "@/lib/docs/headings";
export type { TocItem } from "@/lib/docs/headings";
```

- [ ] **Step 5: Run GREEN and the existing renderer regression**

Run:

```powershell
npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts src/components/public/document-content.test.tsx
npx tsc --noEmit
```

Expected: all tests PASS and TypeScript exits 0. Preserve unrelated edits already present in `document-content.test.tsx`; do not stage them unless they are intentionally incorporated and reviewed during execution.

- [ ] **Step 6: Update module progress and commit only this task**

Check the anchor-contract subtask in `docs/todo/M07-search-hardening.md` and record the focused commands only.

```powershell
git add -- src/lib/docs/headings.ts src/lib/docs/headings.test.ts src/components/public/document-content.tsx docs/todo/M07-search-hardening.md TODO.md context.md
git diff --cached --check
git commit -m "refactor: centralize document heading anchors"
```

---

### Task 2: Add materialized search segments, RLS, synchronization, and bounded RPC

**Files:**
- Create via CLI: the one `supabase/migrations/*_m07_search_segments.sql` file emitted by `npx --yes supabase@latest migration new m07_search_segments`
- Create: `supabase/tests/docs_search_hardening_test.sql`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Produces table: `public.doc_search_segments(document_id, segment_order, kind, heading_level, heading_text, anchor, body_text, search_text)`.
- Produces private functions: `doc_search_slugify(text)`, `doc_search_node_text(jsonb)`, `doc_extract_search_segments(uuid,text,text,jsonb)`, `doc_rebuild_search_segments(uuid)`, and trigger `doc_sync_search_segments()`.
- Produces Public RPC: `public.doc_search_public(p_query text, p_document_limit integer default 10, p_result_limit integer default 20)`.
- Produces RPC columns: `document_id uuid`, `document_title text`, `document_excerpt text`, `document_path text`, `section_title text`, `parent_title text`, `kind text`, `segment_order integer`, `heading_level smallint`, `heading_text text`, `anchor text`, `snippet text`, `rank_score real`.

- [ ] **Step 1: Discover the current CLI and create the migration through it**

Run:

```powershell
npx --yes supabase@latest --version
npx --yes supabase@latest migration new --help
npx --yes supabase@latest migration new m07_search_segments
$m07Migration = @(git ls-files --others --exclude-standard 'supabase/migrations/*_m07_search_segments.sql')
if ($m07Migration.Count -ne 1) { throw "Expected exactly one untracked M07 search migration" }
$m07Migration
```

Record the exact generated filename in the task notes and use it for every later `git add` command.

- [ ] **Step 2: Write the pgTAP contract before the migration SQL**

Create a transaction-scoped test with deterministic Docs-only UUIDs and `select no_plan(); ... select * from finish();`. Seed Public root/child, hidden root, Published, Draft, and Archived documents. Include nested H2/H3, duplicate Thai headings, Latin normalization collision, content before the first heading, and a Legacy table subtree.

The core assertions must use these concrete forms:

```sql
select has_extension('pg_trgm', 'pg_trgm is enabled');
select has_table('public', 'doc_search_segments', 'Search segments are Docs-owned');
select has_index('public', 'doc_search_segments', 'doc_search_segments_search_text_idx', 'Search uses a GIN trigram index');

select results_eq(
  $$select segment_order, kind, heading_level, heading_text, anchor
    from public.doc_search_segments
    where document_id = '70000000-0000-0000-0000-000000000001'
    order by segment_order$$,
  $$values
    (0, 'document'::text, null::smallint, null::text, null::text),
    (1, 'heading'::text, 2::smallint, 'เริ่มต้น'::text, 'เริ่มต้น'::text),
    (2, 'heading'::text, 3::smallint, 'เริ่มต้น'::text, 'เริ่มต้น-2'::text),
    (3, 'heading'::text, 2::smallint, 'Café'::text, 'cafe'::text),
    (4, 'heading'::text, 2::smallint, 'Cafe'::text, 'cafe-2'::text)$$,
  'Published content is partitioned with matching anchors'
);

select is(
  (select count(*) from public.doc_search_segments where document_id in (
    '70000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000003'
  )),
  0::bigint,
  'Draft and Archived documents have no segments'
);
```

Add exact assertions for:

- Document body contains only Title, Excerpt, and pre-heading text.
- Each heading body stops before the next eligible heading.
- URL, Media ID, YouTube attributes, and table text are absent.
- Updating Published content atomically replaces rows; switching to Draft or Archived removes them; republishing recreates them; delete cascades them.
- Backfill and repeated `doc_rebuild_search_segments` calls produce the same rows.
- Guest and non-admin direct SELECT/RPC see only documents passing `doc_document_is_public`; Admin can see hidden-section Published segments but still sees no Draft/Archived segments.
- Guest/non-admin direct INSERT/UPDATE/DELETE fails; Admin-triggered document saves can synchronize rows.
- Query lengths 0, 1, and 201 throw safe validation errors; `%` and `_` are treated as literal search characters.
- Exact title outranks title similarity, which outranks heading title, which outranks body; tie order is deterministic.
- RPC returns at most 10 document groups and 20 rows, every heading row follows its document row, snippets are bounded, and no Draft/hidden result appears.
- A test-only failing INSERT trigger on `doc_search_segments` makes a Published document UPDATE throw and leaves the original document title/version and original segments unchanged; drop that test trigger before later assertions.
- `pg_get_functiondef` confirms Public RPC `SECURITY INVOKER` and fixed search path; execute privileges are exact.

- [ ] **Step 3: Run the database suite and record RED**

Run:

```powershell
npx --yes supabase@latest db reset
npm run test:db
```

Expected: the new search test FAILS because the extension/table/functions do not exist; existing database tests remain useful diagnostic evidence.

- [ ] **Step 4: Implement extension, table, constraints, index, grants, and RLS**

Start the CLI-generated migration with the concrete schema contract:

```sql
create extension if not exists pg_trgm with schema extensions;

create table public.doc_search_segments (
  document_id uuid not null references public.doc_documents(id) on delete cascade,
  segment_order integer not null check (segment_order >= 0),
  kind text not null check (kind in ('document', 'heading')),
  heading_level smallint,
  heading_text text,
  anchor text,
  body_text text not null default '',
  search_text text not null,
  primary key (document_id, segment_order),
  check (
    (kind = 'document' and segment_order = 0 and heading_level is null and heading_text is null and anchor is null)
    or
    (kind = 'heading' and segment_order > 0 and heading_level in (2, 3) and length(btrim(heading_text)) > 0 and length(anchor) > 0)
  )
);

create index doc_search_segments_search_text_idx
  on public.doc_search_segments using gin (search_text extensions.gin_trgm_ops);

alter table public.doc_search_segments enable row level security;

create policy "Public search segments are readable by guests"
on public.doc_search_segments for select to anon
using ((select doc_private.doc_document_is_public(document_id)));

create policy "Public search segments or administrators are readable"
on public.doc_search_segments for select to authenticated
using (
  (select doc_private.doc_document_is_public(document_id))
  or (select doc_private.doc_is_admin())
);
```

Grant SELECT to `anon, authenticated`; grant INSERT/UPDATE/DELETE only to `authenticated`; add Admin-only INSERT, UPDATE (`USING` plus `WITH CHECK`), and DELETE policies using `(select doc_private.doc_is_admin())`.

- [ ] **Step 5: Implement extraction and anchor helpers**

Use UTF-8 PostgreSQL `normalize(value, NFKD)`, the same U+0300–U+036F removal, Unicode-aware character filtering, fallback `section`, and duplicate numbering. Keep helpers in `doc_private`, `SECURITY INVOKER`, fixed `search_path = pg_catalog`, and revoke direct execution from `PUBLIC` unless the trigger/RPC caller needs an explicit grant.

Flatten JSON with a recursive path so traversal is deterministic and does not descend into `table`:

```sql
with recursive nodes(path, node) as (
  select array[]::integer[], p_content
  union all
  select nodes.path || child.ordinality::integer, child.value
  from nodes
  cross join lateral jsonb_array_elements(coalesce(nodes.node -> 'content', '[]'::jsonb))
    with ordinality as child(value, ordinality)
  where nodes.node ->> 'type' <> 'table'
), searchable_blocks as (
  select path, node
  from nodes
  where node ->> 'type' in ('heading', 'paragraph', 'codeBlock')
)
```

`doc_search_node_text(jsonb)` concatenates Text nodes and hard breaks only. `doc_extract_search_segments` assigns searchable blocks to group 0 before the first non-empty H2/H3 and increments the group at every later eligible heading. Aggregate each group once, prepend Title/Excerpt only to group 0, and calculate duplicate anchor counts in document order.

Run the exact Thai/Latin SQL fixture query directly after implementing these helpers. Do not proceed if any SQL anchor differs from `src/lib/docs/headings.test.ts`.

- [ ] **Step 6: Implement atomic rebuild, trigger, and backfill**

`doc_rebuild_search_segments(p_document_id uuid)` must:

1. Delete existing rows for the exact document.
2. Read the source row under the caller's visibility.
3. Return after deletion when no row exists or status is not `published`.
4. Insert the complete extraction result when status is `published`.

Attach an `AFTER INSERT OR UPDATE OF title, excerpt, content, status` row trigger to `doc_documents`. Let the FK cascade own DELETE. Backfill with one call per existing `status = 'published'` document using the same rebuild function; hidden-section Published documents may be materialized but remain protected by Source-aware RLS.

- [ ] **Step 7: Implement the bounded search RPC**

Validate and normalize input in PL/pgSQL. Escape `%`, `_`, and the escape character before `ILIKE`; use schema-qualified `extensions.similarity` and `OPERATOR(extensions.%)`/supported trigram operators so the fixed search path cannot resolve attacker-controlled objects.

The query pipeline must be explicit:

1. Rank candidate segment rows from the GIN-supported predicate.
2. Derive each document's best score with Title exact/prefix > Title similarity > Heading exact/prefix > Heading similarity > Body similarity.
3. Select at most `least(greatest(p_document_limit, 1), 10)` documents.
4. Emit one synthetic `kind='document'` row before matching Heading rows for each selected document.
5. Order by document rank, Source section/document order, then document row before `segment_order`.
6. Apply `least(greatest(p_result_limit, 1), 20)` after the union so the total clickable rows never exceeds 20.
7. Return `left(body_text, 240)` only; build `document_path` with `doc_private.doc_document_path`.

Filter and join through rows visible to the invoker and explicitly require `doc_private.doc_document_is_public(document.id)` so hidden Source state cannot leak even if a Segment row is stale.

- [ ] **Step 8: Run fresh database verification and advisors**

Run:

```powershell
npx --yes supabase@latest db reset
npm run test:db
npx --yes supabase@latest db lint --local --schema public --level warning --fail-on error
npx --yes supabase@latest migration list --local
```

Run the locally available Security/Performance advisor command discovered through `--help`. Expected: reset and tests PASS, no new `doc_*` warning, migration history includes the CLI-generated migration, and no Legacy object diff exists.

- [ ] **Step 9: Update progress and commit the database gate**

Check extension, segment/index, Thai partial/typo, Published-only, and RLS subtasks only after fresh evidence.

```powershell
$m07Migration = @(git ls-files --others --exclude-standard 'supabase/migrations/*_m07_search_segments.sql')
if ($m07Migration.Count -ne 1) { throw "Expected exactly one untracked M07 search migration" }
git add -- $m07Migration supabase/tests/docs_search_hardening_test.sql docs/todo/M07-search-hardening.md
git diff --cached --check
git commit -m "feat(db): add indexed document search"
```

---

### Task 3: Add the typed search model, Supabase adapter, and API boundary

**Files:**
- Create: `src/lib/docs/search-model.ts`
- Create: `src/lib/docs/search-model.test.ts`
- Create: `src/lib/docs/search.ts`
- Create: `src/lib/docs/search.test.ts`
- Create: `src/app/api/search/route.ts`
- Create: `src/app/api/search/route.test.ts`
- Modify: `src/lib/docs/public.ts`
- Modify: `package.json`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Produces: `parsePublicSearchQuery(value: unknown): { ok: true; query: string } | { ok: false; reason: "missing" | "too_short" | "too_long" }`.
- Produces: `PublicSearchRpcRow`, `PublicSearchItem`, `PublicSearchGroup`, `PublicSearchResponse`.
- Produces: `groupPublicSearchRows(query: string, rows: PublicSearchRpcRow[]): PublicSearchResponse`.
- Produces: `flattenPublicSearchGroups(groups: PublicSearchGroup[]): PublicSearchItem[]`.
- Produces: `highlightSearchText(text: string, query: string): Array<{ text: string; match: boolean }>`.
- Produces: `searchPublicDocs(query: string): Promise<PublicSearchResponse>`.
- Produces: `GET(request: Request): Promise<Response>` at `/api/search`.

- [ ] **Step 1: Write pure model failing tests**

```ts
import { describe, expect, it } from "vitest";
import { groupPublicSearchRows, highlightSearchText, parsePublicSearchQuery } from "./search-model";

describe("public search model", () => {
  it("trims and bounds queries", () => {
    expect(parsePublicSearchQuery("  การจอง  ")).toEqual({ ok: true, query: "การจอง" });
    expect(parsePublicSearchQuery(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(parsePublicSearchQuery("ก")).toEqual({ ok: false, reason: "too_short" });
    expect(parsePublicSearchQuery("ก".repeat(201))).toEqual({ ok: false, reason: "too_long" });
  });

  it("groups ordered rows without exceeding the RPC order", () => {
    const response = groupPublicSearchRows("จอง", [documentRow, headingRow]);
    expect(response.groups).toEqual([{ document: expect.objectContaining({ href: "/guide/booking" }), headings: [expect.objectContaining({ href: "/guide/booking#วิธีจอง" })] }]);
    expect(response.resultCount).toBe(2);
  });

  it("returns safe fragments instead of HTML", () => {
    expect(highlightSearchText("วิธีจอง <script>", "จอง")).toEqual([
      { text: "วิธี", match: false },
      { text: "จอง", match: true },
      { text: " <script>", match: false },
    ]);
  });
});
```

Define fixture rows fully in the test with all RPC columns; do not use `as any`.

- [ ] **Step 2: Run model RED**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/search-model.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement exact types and pure transformations**

Use discriminated items:

```ts
export type PublicSearchItem = {
  id: string;
  kind: "document" | "heading";
  documentId: string;
  title: string;
  href: string;
  snippet: string | null;
  headingLevel: 2 | 3 | null;
  rankScore: number;
};

export type PublicSearchGroup = {
  document: PublicSearchItem;
  sectionLabel: string;
  headings: PublicSearchItem[];
};

export type PublicSearchResponse = {
  query: string;
  groups: PublicSearchGroup[];
  resultCount: number;
};
```

Reject duplicate/misordered rows from the adapter with a safe error rather than silently creating a Heading group without its Document row. `highlightSearchText` uses case-insensitive literal index matching and returns strings only; React performs escaping.

- [ ] **Step 4: Write failing server adapter and Route Handler tests**

Mock the exported `createPublicClient` and `searchPublicDocs`. Assert:

```ts
expect(rpc).toHaveBeenCalledWith("doc_search_public", {
  p_query: "การจอง",
  p_document_limit: 10,
  p_result_limit: 20,
});
```

Route tests must verify:

```ts
expect((await GET(new Request("http://localhost/api/search?q=ก"))).status).toBe(400);
expect(success.status).toBe(200);
expect(success.headers.get("cache-control")).toBe("no-store");
expect(await success.json()).toEqual(searchResponse);
expect((await GET(new Request("http://localhost/api/search?q=การจอง"))).status).toBe(500);
expect(await failure.json()).toEqual({ error: "ไม่สามารถค้นหาเอกสารได้ กรุณาลองใหม่" });
```

Also assert the failure body contains no mocked SQL message, URL, key, or stack.

- [ ] **Step 5: Run adapter/API RED**

Run:

```powershell
npx vitest --config vitest.config.mts run src/lib/docs/search.test.ts src/app/api/search/route.test.ts
```

Expected: FAIL because server adapter and Route Handler do not exist.

- [ ] **Step 6: Implement the server-only adapter and Route Handler**

Export the existing `createPublicClient` from `src/lib/docs/public.ts`; do not duplicate environment/client configuration.

```ts
import "server-only";
import { createPublicClient } from "@/lib/docs/public";
import { groupPublicSearchRows, type PublicSearchResponse, type PublicSearchRpcRow } from "./search-model";

export async function searchPublicDocs(query: string): Promise<PublicSearchResponse> {
  const parsed = parsePublicSearchQuery(query);
  if (!parsed.ok) throw new PublicSearchInputError(parsed.reason);
  const { data, error } = await createPublicClient().rpc("doc_search_public", {
    p_query: parsed.query,
    p_document_limit: 10,
    p_result_limit: 20,
  });
  if (error) throw new Error("Public search failed");
  return groupPublicSearchRows(parsed.query, (data ?? []) as PublicSearchRpcRow[]);
}
```

The Route Handler reads `new URL(request.url).searchParams.get("q")`, returns `Response.json`, catches only at the boundary, and always sets `{ "Cache-Control": "no-store" }` on Success and Error responses. GET Route Handlers are dynamic by default in Next 16, but the explicit header remains the M07 freshness contract.

- [ ] **Step 7: Add focused package script and run GREEN**

Add:

```json
"test:search": "vitest --config vitest.config.mts run src/lib/docs/headings.test.ts src/lib/docs/search-model.test.ts src/lib/docs/search.test.ts src/app/api/search/route.test.ts src/components/public/search-result-list.test.tsx src/components/public/search-command.test.tsx src/components/public/public-header.test.tsx src/app/search/page.test.tsx"
```

The later component/page paths may not exist yet, so run the currently created focused files now:

```powershell
npx vitest --config vitest.config.mts run src/lib/docs/headings.test.ts src/lib/docs/search-model.test.ts src/lib/docs/search.test.ts src/app/api/search/route.test.ts
npx tsc --noEmit
```

Expected: PASS and TypeScript exits 0.

- [ ] **Step 8: Update progress and commit**

Record the server/API boundary as complete without marking UI or performance complete.

```powershell
git add -- src/lib/docs/public.ts src/lib/docs/search-model.ts src/lib/docs/search-model.test.ts src/lib/docs/search.ts src/lib/docs/search.test.ts src/app/api/search/route.ts src/app/api/search/route.test.ts package.json docs/todo/M07-search-hardening.md
git diff --cached --check
git commit -m "feat: add public search API"
```

---

### Task 4: Build the accessible command palette and Header integration

**Files:**
- Create: `src/components/public/search-result-list.tsx`
- Create: `src/components/public/search-result-list.test.tsx`
- Create: `src/components/public/search-command.tsx`
- Create: `src/components/public/search-command.test.tsx`
- Create: `src/components/public/public-header.test.tsx`
- Modify: `src/components/public/public-header.tsx`
- Modify: `src/app/globals.css`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Consumes: `PublicSearchGroup`, `PublicSearchItem`, `PublicSearchResponse`, `flattenPublicSearchGroups`, and `highlightSearchText` from Task 3.
- Produces: `SearchSuggestionSection = { id: string; title: string; documents: Array<{ id: string; title: string; href: string }> }`.
- Produces: `SearchResultList({ mode: "links" | "listbox", groups, query, activeId, onActiveIdChange, onNavigate })`.
- Produces: `SearchCommand({ suggestions })`.
- Produces: async `PublicHeader()` that supplies five-second cached Published suggestions.

- [ ] **Step 1: Write the result-list failing test**

Assert the document and heading hierarchy, exact anchors, safe text rendering, level cue, and no raw HTML:

```tsx
render(<SearchResultList mode="links" groups={groups} query="จอง" activeId={null} />);
expect(screen.getByRole("link", { name: /การจอง/ }).getAttribute("href")).toBe("/guide/booking");
expect(screen.getByRole("link", { name: /วิธีจอง/ }).getAttribute("href")).toBe("/guide/booking#วิธีจอง");
expect(screen.getByText("จอง").tagName).toBe("MARK");
expect(screen.queryByText("script", { selector: "script" })).toBeNull();
```

- [ ] **Step 2: Write command-palette failing tests**

Use `userEvent`, fake timers only around the 250 ms debounce, and a controllable mocked `fetch`. Cover:

- Header trigger is a link named **ค้นหาเอกสาร...**, has `href="/search"`, and contains no `Ctrl`, `⌘`, or shortcut badge.
- Plain click prevents navigation and opens a dialog; modified click/new-tab behavior is not intercepted.
- Search input receives focus; close button, Escape, and navigation restore focus to the trigger.
- Default suggestions are grouped by Section and are clickable by mouse/touch.
- One-character query shows the short-query state and sends no request.
- Two-character query waits 250 ms then requests `/api/search?q=<encoded>`.
- Typing again aborts the first request; a late first response cannot replace the newest response.
- Loading retains the prior results and exposes a perceivable busy state.
- Empty, error, Retry, and successful result-count live-region states use the approved Thai copy.
- Arrow Down/Up changes `aria-activedescendant`; Enter navigates the active result; Tab remains available for natural focus movement.
- There is no global `Ctrl/⌘ K` event listener.
- Long Thai labels and mobile classes include `min-w-0`, bounded viewport width, `max-h-[80dvh]`, and 44px controls.

- [ ] **Step 3: Run component RED**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/search-result-list.test.tsx src/components/public/search-command.test.tsx
```

Expected: FAIL because both components do not exist.

- [ ] **Step 4: Implement the shared result list**

Render one Section label and one clickable Document row followed by matching Heading rows. Use Next `Link`, `<mark>` fragments from `highlightSearchText`, plain text snippets, and stable item IDs. H3 receives an additional structural indent and visible **หัวข้อย่อย** label available to assistive technology; selected state uses both `aria-selected` and visible background/focus treatment.

Do not use `dangerouslySetInnerHTML`.

- [ ] **Step 5: Implement the controlled command palette**

Use a controlled `Dialog.Root`. The progressive trigger is a real `<a href="/search">`; intercept only an unmodified primary click after hydration. Give `Dialog.Popup` `initialFocus={inputRef}` and `finalFocus={triggerRef}`.

The input contract is concrete:

```tsx
<input
  ref={inputRef}
  type="search"
  role="combobox"
  aria-label="ค้นหาเอกสาร"
  aria-autocomplete="list"
  aria-expanded={open}
  aria-controls={listboxId}
  aria-activedescendant={activeId ?? undefined}
  value={query}
  onChange={(event) => setQuery(event.currentTarget.value)}
  onKeyDown={handleKeyDown}
/>
```

Keep one monotonically increasing request ID plus `AbortController`. On each valid debounced query, abort the previous controller, set Loading without clearing previous data, fetch the encoded API URL, and update state only when the response ID equals the latest ID. Abort on close/unmount. Retry reissues the current valid query.

Use a visible `Dialog.Close` button labelled **ปิดหน้าค้นหา**. Do not add global keyboard listeners or a visible shortcut badge.

Render `SearchResultList` in `mode="listbox"` inside the command palette so the active descendant points to real `role="option"` elements. Render it in `mode="links"` on the full Search page as a semantic list of links, without an orphan `listbox` or `option` role. Both modes keep the same document/heading hierarchy and mouse-clickable destinations.

- [ ] **Step 6: Integrate cached suggestions into the Server Header**

Make `PublicHeader` async, call `getPublicDocsIndex()`, and map root/child navigation sections into `SearchSuggestionSection[]` without Draft or hidden data. Reuse the request cache so pages already loading the Public index do not duplicate work.

Replace the current Header search `<form>` plus separate **ค้นหา** link with one `SearchCommand`. Keep the skip link, brand link, sticky header height, and max-width container unchanged.

- [ ] **Step 7: Write and run the Header test**

Mock `getPublicDocsIndex`, render `await PublicHeader()`, and assert:

```tsx
const user = userEvent.setup();
expect(screen.getByRole("link", { name: "ค้นหาเอกสาร..." }).getAttribute("href")).toBe("/search");
expect(screen.queryByText(/Ctrl|⌘/)).toBeNull();
await user.click(screen.getByRole("link", { name: "ค้นหาเอกสาร..." }));
expect(screen.getByText("คู่มือการจอง")).not.toBeNull();
```

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/search-result-list.test.tsx src/components/public/search-command.test.tsx src/components/public/public-header.test.tsx
npm run test:public
npx tsc --noEmit
```

Expected: all PASS. Existing Public tests must remain green.

- [ ] **Step 8: Update progress and commit**

Mark Command palette interaction/accessibility implementation complete, but leave Browser matrix unchecked until observed.

```powershell
git add -- src/components/public/search-result-list.tsx src/components/public/search-result-list.test.tsx src/components/public/search-command.tsx src/components/public/search-command.test.tsx src/components/public/public-header.tsx src/components/public/public-header.test.tsx src/app/globals.css docs/todo/M07-search-hardening.md
git diff --cached --check
git commit -m "feat: add public search command palette"
```

---

### Task 5: Replace the existing stub with the full shareable Search page

**Files:**
- Modify: `src/app/search/page.tsx`
- Create: `src/app/search/page.test.tsx`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Consumes: promised `searchParams` from Next.js 16, `parsePublicSearchQuery`, `searchPublicDocs`, `PublicHeader`, and `SearchResultList`.
- Preserves: `metadata = { title: "ค้นหาคู่มือ", robots: { index: false, follow: false } }`.
- Produces: standard GET form at `/search` with a shareable `q` parameter and Server-rendered result/error states.

- [ ] **Step 1: Write page failing tests**

Mock `searchPublicDocs` and cover exact states:

```tsx
render(await SearchPage({ searchParams: Promise.resolve({}) }));
expect(screen.getByRole("heading", { name: "ค้นหาคู่มือ" })).not.toBeNull();
expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).not.toBeNull();
expect(searchPublicDocs).not.toHaveBeenCalled();
```

Also assert:

- `q=ก` shows **พิมพ์อย่างน้อย 2 ตัวอักษร** without calling RPC.
- Valid query preserves the input value and renders grouped document/heading links.
- Empty response says **ไม่พบเอกสารสำหรับ “…”**.
- Adapter rejection renders **ไม่สามารถค้นหาเอกสารได้ กรุณาลองใหม่** without internal details and keeps a resubmittable form.
- `string[]` query is treated as missing instead of choosing an arbitrary value.

- [ ] **Step 2: Run page RED**

Run: `npx vitest --config vitest.config.mts run src/app/search/page.test.tsx`

Expected: FAIL because the current page is still the pre-M07 stub.

- [ ] **Step 3: Implement the Server Component page**

Await `searchParams` as required by Next.js 16. Keep an empty string for missing/array values. Parse without truncating overlong input silently: an over-200 value is invalid and must not reach the RPC.

Render:

1. `PublicHeader`.
2. `<main id="main-content">` with H1.
3. `<form role="search" action="/search">` using a labelled search input and explicit **ค้นหา** submit button.
4. Instruction for empty/short query.
5. `SearchResultList` for Success.
6. Distinct Empty and safe Error messages.

The page does not cache live results independently. It uses the same server search adapter and Published/RLS contract as the API.

- [ ] **Step 4: Run page GREEN and complete focused Search suite**

Run:

```powershell
npm run test:search
npm run test:public
npx tsc --noEmit
npm run lint
```

Expected: every command exits 0.

- [ ] **Step 5: Update progress and commit**

```powershell
git add -- src/app/search/page.tsx src/app/search/page.test.tsx docs/todo/M07-search-hardening.md
git diff --cached --check
git commit -m "feat: add full public search page"
```

---

### Task 6: Add deterministic seed/cleanup, EXPLAIN evidence, and concurrent load runner

**Files:**
- Create: `supabase/perf/m07_seed_search.sql`
- Create: `supabase/perf/m07_cleanup_search.sql`
- Create: `supabase/perf/m07_explain_search.sql`
- Create: `scripts/m07-search-load.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Produces deterministic Section IDs from `md5('m07-perf-section-' || n)::uuid` for `n=1..10`.
- Produces deterministic Document IDs from `md5('m07-perf-document-' || n)::uuid` for `n=1..5000` and slugs `m07-perf-00001`…`m07-perf-05000`.
- Produces cleanup that deletes only those exact IDs after validating their slug/title marker.
- Produces CLI: `npm run perf:search -- --base-url http://127.0.0.1:3000 --concurrency 500 --requests 5000 --output artifacts/m07/search-load.json`.

- [ ] **Step 1: Write guarded deterministic seed SQL**

Before inserting, raise when a deterministic ID already exists with a non-M07 slug. Insert 10 root sections and 5,000 Published documents with `ON CONFLICT (id) DO UPDATE` only after the marker guard passes. Vary content deterministically by modulus:

- Thai Titles and H2/H3 terms for Partial/Typo scenarios.
- Duplicate heading names every tenth document.
- Intro paragraph before the first heading.
- Short, medium, and long bodies.
- High-frequency term in 20% of documents.
- Unique exact token `m07uniqueNNNNN` in every document.

Use `jsonb_build_object/jsonb_build_array`; do not add Media, Auth, Redirect, Legacy, or real-user data.

- [ ] **Step 2: Write exact cleanup SQL**

The cleanup script must lock and validate all matching deterministic IDs before deletion:

```sql
do $$
begin
  if exists (
    select 1
    from generate_series(1, 5000) as item(n)
    join public.doc_documents as document
      on document.id = md5('m07-perf-document-' || item.n)::uuid
    where document.slug <> 'm07-perf-' || lpad(item.n::text, 5, '0')
  ) then
    raise exception 'Refusing M07 cleanup: deterministic document ID collision';
  end if;
end;
$$;

delete from public.doc_documents
where id in (select md5('m07-perf-document-' || n)::uuid from generate_series(1, 5000) as item(n))
  and slug like 'm07-perf-%';
```

After documents, delete only the 10 deterministic Sections with exact `m07-perf-section-%` slugs. Assert zero remaining deterministic documents, sections, and segments. Never use a broad `TRUNCATE`, wildcard-only delete, or Production target.

- [ ] **Step 3: Write EXPLAIN SQL**

Include both the direct candidate predicate and end-to-end RPC:

```sql
explain (analyze, buffers, verbose)
select document_id, segment_order
from public.doc_search_segments
where search_text operator(extensions.%) 'การจอง';

explain (analyze, buffers, verbose)
select * from public.doc_search_public('การจอง', 10, 20);
```

Add representative exact, Thai partial, typo, two-character, and high-frequency queries. Keep this file read-only with respect to data.

- [ ] **Step 4: Write and test the dependency-free load runner**

The script parses `--self-test` or the four load flags `--base-url`, `--concurrency`, `--requests`, and `--output`. Reject unknown flags, non-HTTP(S) URLs, concurrency outside 1–500, requests below concurrency, and output outside `artifacts/m07/`.

Use built-in `fetch`, `AbortSignal.timeout(5000)`, `performance.now()`, and a fixed synthetic query scenario list. Collect HTTP status, latency, response byte length, and errors without logging raw real-user queries. Calculate percentile by sorted nearest-rank and write:

```json
{
  "target": "http://127.0.0.1:3000",
  "concurrency": 500,
  "requests": 5000,
  "successes": 5000,
  "errors": 0,
  "p50Ms": 0,
  "p75Ms": 0,
  "p95Ms": 0,
  "throughputPerSecond": 0,
  "generatedAt": "ISO-8601"
}
```

The numeric zeros above describe keys, not expected measurements; the runner fills measured values. Exit non-zero when any request fails or `p95Ms > 1000`.

Add a built-in `--self-test` mode that tests argument rejection and percentile math without Network, then run:

```powershell
node scripts/m07-search-load.mjs --self-test
```

Expected: prints `M07 search load self-test: PASS` and exits 0.

- [ ] **Step 5: Add scripts and artifact ignore**

Add to `package.json`:

```json
"perf:search": "node scripts/m07-search-load.mjs"
```

Add `/artifacts/m07/` to `.gitignore`.

- [ ] **Step 6: Seed Local, collect database evidence, and prove cleanup safety**

Discover commands first, then run only Local:

```powershell
npx --yes supabase@latest db query --help
npx --yes supabase@latest db query --local --file supabase/perf/m07_seed_search.sql
npx --yes supabase@latest db query --local --file supabase/perf/m07_explain_search.sql
```

Save the EXPLAIN output under `artifacts/m07/`. Confirm `Bitmap Index Scan`/GIN participation for selective candidate queries; record when a two-character/high-frequency query chooses another valid plan and its measured latency instead of asserting that every query must use GIN.

Run cleanup, verify zero exact fixtures, rerun seed, and verify the same counts. This proves cleanup is bounded and the seed is repeatable:

```powershell
npx --yes supabase@latest db query --local --file supabase/perf/m07_cleanup_search.sql
npx --yes supabase@latest db query --local "select count(*) from public.doc_documents where slug like 'm07-perf-%'"
npx --yes supabase@latest db query --local --file supabase/perf/m07_seed_search.sql
```

- [ ] **Step 7: Run Local HTTP capacity and mobile performance measurements**

Start the Local App against Local Supabase. Run the HTTP harness:

```powershell
npm run perf:search -- --base-url http://127.0.0.1:3000 --concurrency 500 --requests 5000 --output artifacts/m07/search-load.json
```

Use the available browser performance tooling on the Public homepage, Search page, and a Published Reader at a mobile profile. Record LCP p75 sampling method, Server response distribution, viewport, throttling, run count, and observed values in the artifact notes. When Local authorized Admin test sessions are available, issue 10 concurrent save operations against 10 distinct synthetic documents and record p95 including Trigger rebuild. If those sessions are unavailable, record the 10-Admin capacity gate as pending Staging/manual verification; do not substitute a sequential run or claim the gate passed. Never use personal or Remote data.

If Local machine saturation invalidates the 500-concurrent result, record CPU/memory saturation and the invalid run rather than claiming failure or success; repeat on approved Staging only after separate permission.

- [ ] **Step 8: Cleanup exact Local fixtures, update progress, and commit harness files**

Always end by running the exact cleanup and verifying zero deterministic rows. Do not commit generated artifacts.

```powershell
git add -- supabase/perf/m07_seed_search.sql supabase/perf/m07_cleanup_search.sql supabase/perf/m07_explain_search.sql scripts/m07-search-load.mjs package.json .gitignore docs/todo/M07-search-hardening.md
git diff --cached --check
git commit -m "test: add M07 performance harness"
```

Mark Performance checklist items complete only when measured thresholds pass; otherwise leave them open with exact evidence and remediation notes.

---

### Task 7: Complete Local security, accessibility, browser, documentation, and rollback gates

**Files:**
- Create: `docs/context/search-and-performance.md`
- Modify: `docs/todo/M07-search-hardening.md`
- Modify: `TODO.md`
- Modify: `context.md`
- Modify: `docs/context/database.md`
- Modify: `docs/context/testing-and-commands.md`

**Interfaces:**
- Documentation distinguishes observed Local evidence from pending Staging/Production work.
- `docs/context/search-and-performance.md` records schema/RPC contracts, exact fixture guards, performance method/results, Browser matrix, Backup prerequisite, and Rollback order.
- No Staging/Production action is part of this task.

- [ ] **Step 1: Run the complete automated Local gate**

Run in this order and record exact counts/exits:

```powershell
npx --yes supabase@latest db reset
npm run test:db
npm run test:search
npm run test:public
npm run test:content
npm run test:proxy
npm run test:admin-shell
npm run test:media
npm run test:worker
npx tsc --noEmit
npm run typecheck:worker
npm run lint
npm run build
npm run cf:build
npm audit --omit=dev
git diff --check
```

Expected: all exit 0. Investigate every new warning; only previously documented Next middleware deprecation and OpenNext Windows compatibility warnings may be carried forward with evidence.

- [ ] **Step 2: Run Database security/performance review**

Use CLI `--help` before exact commands. Verify:

- RLS matrix for Guest, non-admin, and Admin from pgTAP.
- No `SECURITY DEFINER` Public Search RPC.
- Fixed search paths and exact grants.
- No `doc_*` Security/Performance advisor warning.
- GIN index is valid and not duplicated.
- Foreign key has a supporting leading-key index through the composite primary key.
- Migration diff contains only Docs-owned objects and no Legacy change.

- [ ] **Step 3: Run Local browser accessibility/responsive smoke**

Verify with actual rendered UI:

1. Header shows one **ค้นหาเอกสาร...** trigger and no visible/global `Ctrl/⌘ K` shortcut.
2. Plain click/touch opens; modified click follows `/search` fallback behavior.
3. Default suggestions are Published-only and grouped by Section.
4. One character sends no request; Thai partial and typo queries return expected document/heading groups.
5. Mouse/touch opens document and exact `#anchor` including duplicate heading suffix.
6. Tab, Arrow Up/Down, Enter, Escape, focus trap, and focus return work; live-region result count is announced semantically.
7. Loading keeps previous results; stale response cannot replace current; Empty/Error/Retry retain query.
8. `/search?q=` survives refresh/bookmark and standard Form submit; JavaScript-disabled fallback remains useful.
9. Desktop, tablet, 390px, zoom, long Thai labels, and reduced motion have no horizontal overflow or hidden controls.
10. No console error, hydration warning, SQL detail, key, token, or raw query log appears.

- [ ] **Step 4: Complete the required Browser matrix**

Record version, OS/device, flow, and outcome for latest two available versions of Chrome, Edge, Firefox, Safari macOS/iOS, and Chrome Android. If a required physical/browser target is unavailable Locally, leave that checklist row Pending and do not close M07; identify the exact target needed for Staging/manual verification.

- [ ] **Step 5: Write durable Search and rollback context**

`docs/context/search-and-performance.md` must contain:

- Segment schema, extraction boundary, Anchor parity, Trigger/Backfill invariant, RLS, RPC signature, Ranking, and Response bounds.
- Local fixture IDs/slugs, seed/cleanup commands, safety guard, and measured p50/p75/p95/throughput/error results.
- EXPLAIN evidence location and query-plan observations.
- Accessibility and Browser matrix with Observed/Pending labels.
- Staging checklist: dry-run migration, Test-only seed, load/UI/browser checks, exact cleanup, advisors, and rollback rehearsal.
- Production checklist: separate approval, verified latest backup, migration parity, maintenance/monitoring owner, rollback SQL, and no Production load seed.
- Rollback order: disable consumer UI/API, drop trigger/RPC, drop private helpers/index/table, retain `pg_trgm` unless dependency inspection plus explicit approval permits removal.

Update `docs/context/database.md` with the new Docs-owned boundary and `docs/context/testing-and-commands.md` with commands actually run, not planned commands.

- [ ] **Step 6: Reconcile M07 status honestly**

If every Local-eligible acceptance item passes but required Browser/Staging evidence remains, keep M07 `in progress` and list the exact pending approval/evidence. If every Definition of Done item that does not require unapproved Remote work is complete, label Local implementation complete but do not mark Production ready or deployed.

Only mark M07 complete after all required security, performance, accessibility, Browser, Staging, backup, and rollback gates have real evidence. `TODO.md`, `context.md`, and `docs/todo/M07-search-hardening.md` must agree.

- [ ] **Step 7: Review secrets, scope, and exact fixture cleanup**

Run:

```powershell
rg -n "service_role|postgres(?:ql)?://|SUPABASE_SERVICE|CLOUDFLARE_API_TOKEN" --glob '!docs/superpowers/**' --glob '!package-lock.json' .
npx --yes supabase@latest db query --local "select count(*) from public.doc_documents where slug like 'm07-perf-%'"
git diff --name-only 23af755..HEAD
git status --short
```

Expected: no secret value, deterministic fixture count 0, no Legacy/Production/Media Worker edit, and unrelated user files remain preserved. Lexical matches without secret values must be reviewed and described rather than silently ignored.

- [ ] **Step 8: Commit documentation and stop before Remote work**

```powershell
git add -- docs/context/search-and-performance.md docs/context/database.md docs/context/testing-and-commands.md docs/todo/M07-search-hardening.md TODO.md context.md
git diff --cached --check
git commit -m "docs: record M07 local verification"
```

Report Local results, unresolved thresholds/Browser targets, all changed files, and exact cleanup state. Askภู for separate Staging migration/load/deploy approval. Do not run a linked query, Remote migration, Staging mutation/deployment, Production read/write, or Production deployment in this plan without that new approval.

---

## Final Review Checklist

- [ ] Every acceptance item in `docs/superpowers/specs/2026-08-14-m07-search-hardening-design.md` maps to a Task and fresh evidence.
- [ ] SQL and TypeScript anchors match for Thai, Latin accents, punctuation, empty fallback, normalization collision, and duplicate suffixes.
- [ ] Segment text partitions content once, skips Legacy tables and attributes, and remains Atomic with Source saves.
- [ ] Draft, Archived, hidden-section, and direct Data API paths cannot leak through Public search.
- [ ] Public RPC is `SECURITY INVOKER`, fixed-path, bounded, deterministic, parameterized, indexed, and safe for literal `%`/`_` input.
- [ ] Header has no visible/global shortcut; Mouse/Touch plus complete Keyboard/Focus/Screen-reader behavior pass.
- [ ] `/search?q=` remains shareable, refreshable, noindex, and useful without JavaScript.
- [ ] 5,000-document seed is deterministic; cleanup proves zero exact fixtures without broad deletion.
- [ ] Search/Server/LCP/Save/visibility/concurrency targets have measured p50/p75/p95 evidence or remain explicitly open.
- [ ] Full automated gate, advisors, Browser matrix, secret scan, and no-Legacy diff pass before M07 close-out.
- [ ] Staging and Production remain untouched until separate approvals; Production additionally requires verified backup and rehearsed rollback.
