# Admin Toast Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Admin toast into the single transient feedback surface for success, info, warning, error, and loading outcomes.

**Architecture:** Keep `AdminToastProvider` scoped to the existing Admin content layout. Replace its nullable single-toast state with ID-addressable toast records so a loading notification can update in place; retain inline validation and durable retry banners.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-18-homepage-mobile-image-toast-design.md`

## Global Constraints

- Toast is Admin-only; do not wrap Public or Login routes.
- Support exact kinds `success`, `info`, `warning`, `error`, and `loading`.
- Success/info dismiss after 3,000 ms; warning after 5,000 ms; error/loading persist until updated or dismissed.
- Error/warning use `role="alert"`; success/info/loading use `role="status"`.
- Do not replace inline field validation, per-file errors, or retryable media-operation banners.

---

## File structure

- Modify `src/components/admin/admin-toast.tsx` — API, records, timing, variants, and accessibility.
- Modify `src/components/admin/admin-toast.test.tsx` — five variants and update/dismiss behavior.
- Modify `src/components/admin/explorer/document-reorder-list.tsx`, `section-inline-form.tsx`, `section-panel.tsx` — loading-to-result calls for Explorer mutations.
- Modify `src/app/admin/(content)/documents/document-form.tsx` and `src/components/admin/explorer/document-setup-form.tsx` — standard mutation feedback without replacing durable UI.
- Modify relevant existing component tests and, after evidence exists, `TODO.md` plus `docs/todo/M07-search-hardening.md`.

### Task 1: Extend the Toast provider with a test-first public API

**Files:**
- Modify: `src/components/admin/admin-toast.tsx`
- Modify: `src/components/admin/admin-toast.test.tsx`

**Interfaces:**
- Produces `AdminToastKind = "success" | "info" | "warning" | "error" | "loading"`.
- Produces `useAdminToast()` methods `show(kind, message): string`, `showLoading(message): string`, `update(id, kind, message): void`, `dismiss(id): void`, `showSuccess(message)`, and `showError(message)`.

- [ ] **Step 1: Write failing provider tests for variants and updates**

Use a test harness that calls `showLoading("กำลังบันทึก")`, captures its ID, then calls `update(id, "success", "บันทึกสำเร็จ")`. Assert success/info use `status` and close after 3,000 ms; warning uses `alert` and closes after 5,000 ms; error persists until close; loading persists; and update replaces its loading record.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/components/admin/admin-toast.test.tsx`

Expected: FAIL because the API and variants do not exist.

- [ ] **Step 3: Implement the minimal provider**

Store `Toast[]`, generate IDs with `crypto.randomUUID()`, schedule only timed variants, and render a responsive top-center stack. Give every non-loading item a 44 px close button, use a visible icon plus text for each kind, and expose the exact context methods above.

- [ ] **Step 4: Run focused provider tests**

Run: `npx vitest --config vitest.config.mts run src/components/admin/admin-toast.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/admin/admin-toast.tsx src/components/admin/admin-toast.test.tsx; git commit -m "feat: extend admin toast states"`

### Task 2: Migrate Admin mutation feedback to loading-to-result Toasts

**Files:**
- Modify: `src/components/admin/explorer/document-reorder-list.tsx`
- Modify: `src/components/admin/explorer/section-inline-form.tsx`
- Modify: `src/components/admin/explorer/section-panel.tsx`
- Modify: `src/app/admin/(content)/documents/document-form.tsx`
- Modify: `src/components/admin/explorer/document-setup-form.tsx`
- Test: existing component tests adjacent to modified files

**Interfaces:**
- Consumes `showLoading`, `update`, `dismiss`, `showSuccess`, and `showError` from Task 1.
- Produces one final toast per transient mutation; existing media-operation banners remain authoritative for durable/pending operations.

- [ ] **Step 1: Write representative failing component tests**

For document save and reorder, mock `showLoading` to return `toast-1`; assert it is called with the in-progress copy and `update("toast-1", "success", ...)` is called on success. Add error-path assertions that the same ID updates to `error`.

- [ ] **Step 2: Run affected tests to verify failure**

Run: `npm run test:admin-shell; npm run test:media`

Expected: FAIL at new loading/update assertions.

- [ ] **Step 3: Implement mutation migration**

Create a loading toast immediately before each async create/edit/reorder/save/delete request. Update it on success, expected error, and caught exception. Dismiss it when a durable pending operation moves to its existing banner. Leave field validation and per-file/media recovery inline.

- [ ] **Step 4: Run affected tests**

Run: `npm run test:admin-shell; npm run test:media`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/admin/explorer/document-reorder-list.tsx src/components/admin/explorer/section-inline-form.tsx src/components/admin/explorer/section-panel.tsx "src/app/admin/(content)/documents/document-form.tsx" src/components/admin/explorer/document-setup-form.tsx; git commit -m "feat: standardize admin mutation feedback"`

### Task 3: Validate and document Admin Toast behavior

**Files:**
- Modify: `TODO.md`
- Modify: `docs/todo/M07-search-hardening.md`

- [ ] **Step 1: Run local regression**

Run: `npm run test:admin-shell; npm run test:media; npm run lint; npm run build; git diff --check`

Expected: all commands exit 0; record any existing Next middleware deprecation warning separately.

- [ ] **Step 2: Perform keyboard/mobile checks**

At 390 px and desktop widths, trigger all five kinds; verify no horizontal overflow, visible close-button focus, and a loading toast updates in place.

- [ ] **Step 3: Update documentation with executed evidence only**

Record command outcomes and the Admin-only scope without changing Staging/Production gates.

- [ ] **Step 4: Commit**

Run: `git add TODO.md docs/todo/M07-search-hardening.md; git commit -m "docs: record admin toast verification"`
