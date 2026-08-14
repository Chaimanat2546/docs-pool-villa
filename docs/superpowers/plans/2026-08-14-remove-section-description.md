# Remove Section Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the optional description field from Docs sections everywhere, including existing section data.

**Architecture:** `public.doc_sections` loses its `description` column through a Docs-only migration. The admin/public section models and their data queries no longer carry that field, and the category form/home card remove the only user-visible consumers. Documentation becomes the source of truth for the new section schema.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Vitest, Supabase/PostgreSQL pgTAP.

## Global Constraints

- Remove only `public.doc_sections.description`; retain image alt text, document excerpt, page metadata, and Legacy database columns.
- Create the migration with `npx supabase@latest migration new`; do not invent its timestamp.
- Preserve Docs-only boundaries (`doc_*`); do not change legacy tables, policies, functions, or credentials.
- Run Local checks only. Do not apply migrations or deploy to Staging/Production.
- Preserve pre-existing edits in `src/components/public/reader-navigation.tsx` and its test.

---

### Task 1: Prove and remove the application-level field

**Files:**
- Modify: `src/components/admin/explorer/section-inline-form.test.tsx`
- Modify: `src/app/admin/(content)/structure/actions.test.ts`
- Modify: `src/lib/docs/admin-explorer.test.ts`
- Modify: `src/lib/docs/admin-explorer-server.test.ts`
- Modify: `src/lib/docs/public-model.test.ts`
- Modify: `src/components/admin/explorer/section-inline-form.tsx`
- Modify: `src/app/admin/(content)/structure/actions.ts`
- Modify: `src/lib/docs/admin-explorer.ts`
- Modify: `src/lib/docs/admin-explorer-server.ts`
- Modify: `src/lib/docs/public-types.ts`
- Modify: `src/lib/docs/public.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: section DB rows with `id`, `parent_id`, `title`, `slug`, `is_published`, `sort_order`.
- Produces: `AdminExplorerSection` and `PublicSection` without a `description` property; `saveSection` receives `{ id?, title, slug, parentId, sortOrder, isPublished }`.

- [ ] **Step 1: Write the failing UI/action tests**

```tsx
it("does not expose a section description field while editing", () => {
  render(<SectionInlineForm mode="edit" section={child} parent={root} rootSections={[root]} onCancel={vi.fn()} />);
  expect(screen.queryByRole("textbox", { name: "คำอธิบาย" })).toBeNull();
});

it("writes a section without a retired description field", async () => {
  await saveSection(createInputWithoutDescription);
  expect(insert).toHaveBeenCalledWith({
    title: "การจอง", slug: "booking", parent_id: sectionId,
    sort_order: 0, is_published: true,
  });
});
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/section-inline-form.test.tsx "src/app/admin/(content)/structure/actions.test.ts"`

Expected: FAIL because the textarea is still rendered and the action still includes `description` in the insert payload.

- [ ] **Step 3: Remove the field from the UI, action and query/model boundaries**

```ts
type SaveSectionInput = {
  id?: string;
  title: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isPublished: boolean;
};

supabase.from("doc_sections")
  .select("id, parent_id, title, slug, is_published, sort_order");
```

Delete `description` from section fixtures, mappings, form state/submission, Public/Admin types, homepage rendering, and the selected-section fallback copy. Do not change unrelated description fields.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/section-inline-form.test.tsx "src/app/admin/(content)/structure/actions.test.ts" src/lib/docs/admin-explorer.test.ts src/lib/docs/admin-explorer-server.test.ts src/lib/docs/public-model.test.ts`

Expected: PASS with all specified tests green.

### Task 2: Drop persisted section descriptions with a tested migration

**Files:**
- Modify: `supabase/tests/docs_structure_management_test.sql`
- Create: `supabase/migrations/<CLI-generated>_remove_doc_section_description.sql`

**Interfaces:**
- Consumes: the M02-added nullable `public.doc_sections.description` column.
- Produces: a schema where `information_schema.columns` has no matching `doc_sections.description` row.

- [ ] **Step 1: Write the failing schema regression test**

```sql
select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'doc_sections'
     and column_name = 'description'),
  0::bigint,
  'Doc sections have no retired description column'
);
```

- [ ] **Step 2: Run the database test against the current local schema**

Run: `npm run test:db`

Expected: FAIL only at `Doc sections have no retired description column`, proving the test detects the old schema.

- [ ] **Step 3: Create and implement the migration**

Run: `npx supabase@latest migration new remove_doc_section_description`

Put only this statement in the CLI-created migration file:

```sql
alter table public.doc_sections drop column description;
```

- [ ] **Step 4: Reset Local database and verify database tests**

Run: `npx supabase@latest db reset; npm run test:db`

Expected: reset applies the new migration and all pgTAP tests pass.

### Task 3: Update documentation and complete Local verification

**Files:**
- Modify: `docs/Poolvilla-Docs-Requirements-TH-v1.2.md`
- Modify: `TODO.md`
- Modify: `docs/todo/M02-structure.md`
- Modify: `docs/context/database.md`
- Modify: `supabase/fixtures/staging/m06/*.sql`
- Modify: `supabase/fixtures/staging/closeout/setup.sql`

**Interfaces:**
- Consumes: the final section schema without `description`.
- Produces: requirement/context/fixtures that insert or describe only live `doc_sections` columns.

- [ ] **Step 1: Update documentation and fixture column lists**

Remove `description` from the `doc_sections` data dictionary and category CRUD requirement. Record this approved cross-module schema cleanup and Local-only status in TODO/M02/context. Remove `description` from only `doc_sections` fixture INSERT column/value lists.

- [ ] **Step 2: Search for stale Docs section references**

Run: `rg -n --glob '!node_modules' "doc_sections.*description|description.*doc_sections|section\.description|description:.*(section|Section)" src supabase docs`

Expected: results are only historical design/plan records that intentionally preserve history; no runtime code, active fixtures, active tests, or Requirement baseline reference remains.

- [ ] **Step 3: Run final Local gates**

Run: `npx tsc --noEmit; npm run lint; npm run build; git diff --check`

Expected: each command exits 0. The known Next/OpenNext middleware deprecation warning may appear during build, but no lint/type/build error is allowed.

- [ ] **Step 4: Commit the scoped changes after verifying the staged diff excludes the two pre-existing reader-navigation files**

```bash
git diff -- src/components/public/reader-navigation.tsx src/components/public/reader-navigation.test.tsx
git status --short
git add docs src supabase
git restore --staged src/components/public/reader-navigation.tsx src/components/public/reader-navigation.test.tsx
git commit -m "refactor: remove section descriptions"
```

Expected: commit includes only the approved field-removal changes and does not include the user’s pre-existing navigation edits.
