# Hide Document Sort-Order Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the document-editor sort-order control while retaining the loaded order during ordinary saves.

**Architecture:** `DocumentForm` continues to carry `sortOrder` in its private form state because `saveDocument` requires it. The editor no longer renders, validates, or focuses a user-controlled order input; ordering remains owned by the separate section reorder editor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not add a database migration, constraint, or change to the server action/RPC contract.
- Do not change section sort-order controls.
- Document ordering remains section-scoped and is saved only by the existing drag-and-drop reorder editor.
- Preserve the loaded `DocumentRecord.sortOrder` in ordinary document saves.

---

## File Structure

- Modify `src/app/admin/(content)/documents/document-form.tsx`: remove the visible order field and its UI-only validation plumbing, while retaining `FormState.sortOrder` for saving.
- Modify `src/app/admin/(content)/documents/document-form.test.tsx`: cover the removed control and preserved save payload.

### Task 1: Hide the document order control without changing save behavior

**Files:**
- Modify: `src/app/admin/(content)/documents/document-form.test.tsx:157-168`
- Modify: `src/app/admin/(content)/documents/document-form.tsx:58-60, 127-131, 194-215, 481-512`

**Interfaces:**
- Consumes: `DocumentRecord.sortOrder` and the existing `saveDocument` payload `{ sortOrder: number }`.
- Produces: a document editor without an accessible control named `ลำดับ`; valid saves retain `document.sortOrder`.

- [ ] **Step 1: Write the failing regression test**

  Extend `submits valid staged fields through their semantic form` (or split it into a clearly named adjacent test) with:

  ```tsx
  expect(screen.queryByRole("spinbutton", { name: "ลำดับ" })).toBeNull();

  await waitFor(() => expect(actions.saveDocument).toHaveBeenCalledWith(
    expect.objectContaining({ sortOrder: document.sortOrder }),
  ));
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run:

  ```powershell
  npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx"
  ```

  Expected: FAIL because the rendered form still contains the `ลำดับ` spinbutton.

- [ ] **Step 3: Apply the minimal UI change**

  In `DocumentForm`:

  ```tsx
  type FieldErrors = Partial<Record<"title" | "slug" | "sectionId", string>>;
  ```

  Remove `sortOrderInputRef`, the `validateFields` integer check and focus branch for `sortOrder`, and the `<label>` containing `id="document-sort-order"`. Keep `sortOrder` in `FormState`, `savedSnapshot`, and the existing save payload unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run:

  ```powershell
  npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx"
  ```

  Expected: PASS, including the hidden-control and retained-payload assertions.

- [ ] **Step 5: Run static validation**

  Run:

  ```powershell
  npm run lint
  npm run build
  ```

  Expected: both commands exit 0.

- [ ] **Step 6: Commit the implementation**

  ```powershell
  git add -- "src/app/admin/(content)/documents/document-form.tsx" "src/app/admin/(content)/documents/document-form.test.tsx"
  git commit -m "fix: hide document order input"
  ```
