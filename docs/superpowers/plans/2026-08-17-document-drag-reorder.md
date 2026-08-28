# Document Drag Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Admin drag every direct document in one selected section into a new order and commit the complete order explicitly.

**Architecture:** Keep `doc_reorder_documents(uuid, uuid[])` as the sole persistence boundary. A validated Server Action invokes it and invalidates only after success. `DocumentList` keeps its normal filter/pagination state; a new client-only sortable component owns the temporary complete-section order and save/cancel lifecycle.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Supabase SSR client/RPC, Vitest + Testing Library, `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`.

## Global Constraints

- Reorder only direct documents of one valid selected section; never virtual root, search results, or status-filtered results.
- Persist only through `doc_reorder_documents`; no schema, migration, RLS, Worker, remote, or deployment change.
- Require Admin authorization and validate every untrusted UUID before calling Supabase.
- Submit the complete duplicate-free ID list once; no autosave and no request for individual drag events.
- Pointer/touch drag only. Do not configure `KeyboardSensor` or add up/down ordering controls.
- Preserve the local dragged order after failed save; Cancel and leaving without Save do not mutate data.
- Use Thai labels, visible focus, `min-h-11` targets, and no horizontal overflow at 390px.
- Use `npm` and commit `package-lock.json`.

---

## File structure

- `package.json`, `package-lock.json` — add the smallest maintained pointer/touch sortable dependency pair.
- `src/app/admin/(content)/documents/actions.ts` — Admin-only `reorderDocuments` Server Action.
- `src/app/admin/(content)/documents/actions.test.ts` — validation/RPC/auth/cache tests.
- `src/components/admin/explorer/document-reorder-list.tsx` — local sort state, drag sensors, pending/error UI, Save/Cancel.
- `src/components/admin/explorer/document-reorder-list.test.tsx` — drag, save, failure, cancel, and no keyboard-order-control tests.
- `src/components/admin/explorer/document-list.tsx` — controlled entry/exit to reorder mode.
- `src/components/admin/explorer/document-list.test.tsx` — multi-page/full-list handoff and restriction tests.
- `docs/todo/admin-file-explorer.md` — approved follow-up and real verification evidence.

### Task 1: Add drag-and-drop dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: React 19 runtime.
- Produces: DnD-kit context/sensors/sortable primitives for Task 3.

- [ ] **Step 1: Verify the dependency is absent**

Run: `npm ls @dnd-kit/core @dnd-kit/sortable`

Expected: neither package is installed; no files change.

- [ ] **Step 2: Install compatible versions**

Run: `npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0`

Expected: only these runtime dependencies and their lockfile graph are added.

- [ ] **Step 3: Verify the dependency change**

Run: `git diff --check -- package.json package-lock.json; npm ls @dnd-kit/core @dnd-kit/sortable`

Expected: no whitespace error and both packages resolve from the project root.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add document reorder dnd support"
```

### Task 2: Add validated atomic reorder action

**Files:**
- Modify: `src/app/admin/(content)/documents/actions.ts`
- Modify: `src/app/admin/(content)/documents/actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin()`, `createClient()`, `revalidatePath()`, `revalidatePublicDocs()`, and `doc_reorder_documents`.
- Produces: `reorderDocuments(input: unknown): Promise<{ success: true } | { error: string }>`.

- [ ] **Step 1: Write failing action tests**

Extend existing action mocks with `createClient` and `rpc`. Add a successful case that calls:

```ts
await reorderDocuments({ sectionId, documentIds: [documentId, secondDocumentId] });
expect(rpc).toHaveBeenCalledWith("doc_reorder_documents", {
  p_section_id: sectionId,
  p_document_ids: [documentId, secondDocumentId],
});
expect(revalidatePath).toHaveBeenCalledWith("/admin/structure");
expect(revalidatePath).toHaveBeenCalledWith("/");
expect(revalidatePublicDocs).toHaveBeenCalledTimes(1);
```

Add malformed section ID, empty list, malformed document ID, and duplicate-ID cases. Each must return `{ error: "ข้อมูลลำดับเอกสารไม่ถูกต้อง" }` and never call `rpc`. Add an RPC-error case returning `{ error: "บันทึกลำดับเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง" }` with no invalidation.

- [ ] **Step 2: Run the test to prove it fails**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/actions.test.ts"`

Expected: FAIL because `reorderDocuments` is not exported.

- [ ] **Step 3: Implement the narrow action**

Reuse the existing `uuidPattern` and `isRecord`, then add:

```ts
type ReorderDocumentsInput = { sectionId: string; documentIds: string[] };
export type ReorderDocumentsResult = { success: true } | { error: string };

function parseReorderDocumentsInput(value: unknown): ReorderDocumentsInput | null {
  if (!isRecord(value) || typeof value.sectionId !== "string" || !uuidPattern.test(value.sectionId)) return null;
  if (!Array.isArray(value.documentIds) || value.documentIds.length === 0) return null;
  if (value.documentIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))) return null;
  return new Set(value.documentIds).size === value.documentIds.length
    ? { sectionId: value.sectionId, documentIds: value.documentIds }
    : null;
}
```

Implement `reorderDocuments` in the existing `"use server"` module: call `requireAdmin()`, parse input, call `rpc("doc_reorder_documents", { p_section_id, p_document_ids })`, map any Supabase failure to the specified safe Thai error, and on success call `revalidatePath("/admin/structure")`, `revalidatePath("/")`, and `revalidatePublicDocs()` before returning `{ success: true }`.

- [ ] **Step 4: Verify action tests pass**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/actions.test.ts"`

Expected: PASS including authorization, invalid input, duplicate, RPC failure, and invalidation coverage.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(content)/documents/actions.ts" "src/app/admin/(content)/documents/actions.test.ts"
git commit -m "feat: add document reorder action"
```

### Task 3: Build full-section drag editor

**Files:**
- Create: `src/components/admin/explorer/document-reorder-list.tsx`
- Create: `src/components/admin/explorer/document-reorder-list.test.tsx`

**Interfaces:**
- Consumes: `AdminExplorerDocument`, `reorderDocuments`, `DndContext`, `PointerSensor`, `TouchSensor`, `SortableContext`, `useSortable`, and `arrayMove`.
- Produces: `DocumentReorderList({ sectionId, documents, onCancel, onSaved })`.

- [ ] **Step 1: Write failing deterministic DnD component tests**

Mock DnD-kit’s context so a test button invokes supplied `onDragEnd({ active: { id: "doc-a" }, over: { id: "doc-c" } })`. Render A/B/C and assert that A becomes the third list item. Assert Save calls:

```ts
expect(reorderDocuments).toHaveBeenCalledWith({
  sectionId,
  documentIds: ["doc-b", "doc-c", "doc-a"],
});
```

Add tests that pending disables Save/Cancel, success calls `onSaved`, an error retains the dragged sequence in a `role="alert"`, Cancel calls `onCancel` without invoking the action, each handle has `aria-label="ลาก <title>"`, and neither `เลื่อนขึ้น` nor `เลื่อนลง` exists.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-reorder-list.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement pointer/touch sortable UI**

Create a client component using exactly these sensors and no `KeyboardSensor`:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
);
```

Store a copy of `documents` in local state. On valid `DragEndEvent`, calculate source/target indexes by ID and use `arrayMove`; no server call occurs. Render a labeled `ul` of sortable rows, each with title/status and a 44px labeled drag-handle button. Use `useTransition` for Save: invoke `reorderDocuments({ sectionId, documentIds: orderedDocuments.map(({ id }) => id) })`; success calls `onSaved()`, error remains visible and does not reset state. Render `ยกเลิก` and `บันทึกลำดับ` actions with pending behavior and responsive one-column layout.

- [ ] **Step 4: Verify component tests pass**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-reorder-list.test.tsx`

Expected: PASS for drag state, save, cancel, pending, failure retention, handles, and intentionally absent keyboard-order controls.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/explorer/document-reorder-list.tsx src/components/admin/explorer/document-reorder-list.test.tsx
git commit -m "feat: add document drag reorder editor"
```

### Task 4: Integrate reorder mode with Explorer pagination

**Files:**
- Modify: `src/components/admin/explorer/document-list.tsx`
- Modify: `src/components/admin/explorer/document-list.test.tsx`

**Interfaces:**
- Consumes: `DocumentReorderList` and the loader’s raw ordered `documents`.
- Produces: normal-mode `จัดลำดับเอกสาร` entry that supplies every direct document of the selected section.

- [ ] **Step 1: Write failing integration tests**

Create a selected-section fixture with seven documents. Mock `DocumentReorderList` to display received IDs. Assert normal mode still shows four edit links and page 1 of 2; then:

```ts
await user.click(screen.getByRole("button", { name: "จัดลำดับเอกสาร" }));
expect(screen.getByTestId("reorder-document-ids")).toHaveTextContent(
  "booking-1,booking-2,booking-3,booking-4,booking-5,booking-6,booking-7",
);
expect(screen.queryByRole("navigation", { name: "แบ่งหน้าเอกสาร" })).toBeNull();
```

Also assert virtual root has no reorder entry; active search/status filter disables it with explanation; Cancel restores normal filters/pagination; and the existing pagination regression remains unchanged.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx`

Expected: FAIL because reorder mode is absent.

- [ ] **Step 3: Implement mode handoff**

Derive the full unfiltered selected-section set:

```ts
const directSectionDocuments = selectedSectionId === null
  ? []
  : documents.filter((document) => document.sectionId === selectedSectionId);
const canReorder = selectedSectionId !== null && !hasQuery && !hasStatusFilter && directSectionDocuments.length > 1;
```

Add `isReordering` state. Normal mode shows `จัดลำดับเอกสาร` beside document creation. For a real section with filters or fewer than two documents, render a disabled action with scope explanation; for virtual root omit it. In reorder mode replace only the filter/list/pagination region with `DocumentReorderList`, passing the selected section, complete direct-section documents, and callbacks that set `isReordering` false. Do not alter normal query/status/page state.

- [ ] **Step 4: Run focused UI tests**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx src/components/admin/explorer/document-reorder-list.test.tsx`

Expected: PASS; normal mode remains four rows per page while reorder mode receives all seven documents.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/explorer/document-list.tsx src/components/admin/explorer/document-list.test.tsx
git commit -m "feat: add explorer document reorder mode"
```

### Task 5: Record evidence and run local gates

**Files:**
- Modify: `docs/todo/admin-file-explorer.md`

**Interfaces:**
- Consumes: Tasks 1–4 and actual command/browser results.
- Produces: accurate cross-module follow-up evidence with no remote claim.

- [ ] **Step 1: Update tracking**

Add a dated entry linking this plan and `docs/superpowers/specs/2026-08-17-document-reorder-design.md`. State: reorder is one section only; normal mode retains four-row pagination; reorder mode receives the complete section set; save uses the existing atomic RPC; keyboard reordering is intentionally excluded.

- [ ] **Step 2: Run local automated verification**

Run:

```bash
npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/actions.test.ts" src/components/admin/explorer/document-reorder-list.test.tsx src/components/admin/explorer/document-list.test.tsx
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. If one fails, keep the tracking item in progress, diagnose the first failure, add the missing regression test when relevant, then rerun that command and the focused suite.

- [ ] **Step 3: Run local Admin browser smoke only if a safe Admin session exists**

At desktop and 390px, select a test section with at least five documents, verify normal pagination, enter reorder mode, move a later-page item, save, refresh, and verify persistence. Separately verify Cancel and a forced action failure do not change stored order. Do not create or mutate Staging/Production fixtures merely to obtain a session.

- [ ] **Step 4: Record actual evidence**

Append exact passing commands and any unavailable local-session condition to `docs/todo/admin-file-explorer.md`. Do not claim browser, Staging, or Production verification that did not occur.

- [ ] **Step 5: Commit**

```bash
git add docs/todo/admin-file-explorer.md
git commit -m "docs: record document reorder verification"
```

## Plan self-review

- Spec coverage: Tasks 3–4 implement full-section pointer/touch drag, explicit Save/Cancel, no cross-section or partial ordering, no keyboard reorder controls, and responsive labels. Task 2 preserves existing RPC atomicity and Admin authorization. Task 5 records evidence.
- Placeholder scan: every task names files, interfaces, tests, commands, expected outputs, and implementation boundaries.
- Type consistency: Tasks 2–3 share `{ sectionId: string; documentIds: string[] }`; Task 4 passes complete `AdminExplorerDocument[]` into Task 3.
