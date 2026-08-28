# Document Create Append Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign each newly created document the next `sort_order` within its selected section automatically.

**Architecture:** Replace the Docs-owned `doc_save_document` function through one imperative migration. Its existing advisory lock serializes mutations; only the create branch derives the persisted order from existing sibling documents. Updates and the separate batch reorder RPC retain their existing behavior.

**Tech Stack:** Supabase/Postgres migration, pgTAP, Next.js Server Action regression tests.

## Global Constraints

- Create only a new Docs-owned imperative migration; do not edit prior migrations, legacy objects, RLS, grants, or production.
- Preserve the existing `doc_save_document` signature, `SECURITY INVOKER`, fixed `search_path`, Admin authorization, and grants.
- Compute create-only order after the existing advisory lock: `coalesce(max(sort_order), -1) + 1` scoped to `p_section_id`.
- Existing update `p_sort_order` behavior and `doc_reorder_documents` atomic reorder behavior must not change.
- Run Local DB tests; no remote migration/deployment.

---

### Task 1: Prove and implement database append ordering

**Files:**
- Create: `supabase/migrations/<generated>_document_create_append_order.sql`
- Modify: `supabase/tests/docs_document_management_test.sql`

**Interfaces:**
- Consumes: current `public.doc_save_document(uuid, uuid, text, text, text, jsonb, text, integer, bigint, jsonb)`.
- Produces: unchanged function signature with create branch persisting automatic trailing order.

- [ ] **Step 1: Create failing pgTAP cases**

Add a new empty-section fixture and a fixture section with documents at orders 0 and 1. Call `doc_save_document` with `expected_version = null` and a deliberately valid `p_sort_order = 0`; assert the new row in the populated section receives 2. In the empty section assert the first row receives 0. Add an update call for an existing document with `expected_version` and assert its requested `sort_order` still persists.

- [ ] **Step 2: Run the focused database suite and verify failure**

Run: `npm run test:db`

Expected: the populated-section create assertion fails because the current function persists the client-provided 0.

- [ ] **Step 3: Generate the migration and replace only the function body**

Run: `npx supabase@latest migration new document_create_append_order`

In the generated migration, use `create or replace function public.doc_save_document(...)` with the exact existing signature and function attributes. After the existing `pg_advisory_xact_lock(810241, 1)` and only in the create branch, declare `v_create_sort_order integer` and derive it as:

```sql
select coalesce(max(document.sort_order), -1) + 1
into v_create_sort_order
from public.doc_documents as document
where document.section_id = p_section_id;
```

Use `v_create_sort_order` in the INSERT values list. Keep the update branch assignment `sort_order = p_sort_order` unchanged. Revoke and grant the exact existing function signature to `authenticated`.

- [ ] **Step 4: Run Local database verification**

Run:

```bash
npx supabase@latest db reset
npm run test:db
npx supabase@latest db lint --local --schema public --level warning --fail-on error
git diff --check
```

Expected: Local reset succeeds, all pgTAP tests pass, lint reports no Docs schema error, and no whitespace error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/<generated>_document_create_append_order.sql supabase/tests/docs_document_management_test.sql
git commit -m "feat: append new documents by sort order"
```

### Task 2: Preserve action contract and record evidence

**Files:**
- Modify: `src/app/admin/(content)/documents/actions.test.ts`
- Modify: `docs/todo/admin-file-explorer.md`

**Interfaces:**
- Consumes: unchanged `createDocumentDraft(value)` action and migration behavior from Task 1.
- Produces: regression proof that the client action continues to send a valid non-negative sort order while the database owns create ordering.

- [ ] **Step 1: Add an action regression assertion**

In the existing `createDocumentDraft` success test, retain the exact expectation that its validated save payload contains `sortOrder: 0`. Add a test name/comment explaining this is intentionally a valid placeholder because the database assigns the persisted create order. Do not calculate sibling order in the browser or Server Action.

- [ ] **Step 2: Run the focused action test**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/actions.test.ts"`

Expected: PASS; no client query or new action input is required.

- [ ] **Step 3: Record actual local verification**

Add a dated entry to `docs/todo/admin-file-explorer.md` linking the approved design and this plan. State that create order is assigned in the locked database create branch; update/reorder behavior is unchanged; include actual Local DB/action/lint results only. State no remote migration/deployment occurred.

- [ ] **Step 4: Run final local checks**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: each exits 0; retain any known baseline warning without calling it a failure.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(content)/documents/actions.test.ts" docs/todo/admin-file-explorer.md
git commit -m "docs: verify document create ordering"
```

## Plan self-review

- Spec coverage: Task 1 implements create-only, lock-safe automatic order and proves empty/populated/update cases. Task 2 proves the action boundary stays simple and records only actual verification.
- Placeholder scan: migration filename is generated through the required Supabase CLI command; it is not invented.
- Type consistency: the RPC signature and `createDocumentDraft` input remain unchanged across both tasks.

