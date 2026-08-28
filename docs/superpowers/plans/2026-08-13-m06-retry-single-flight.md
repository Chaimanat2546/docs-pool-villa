# M06 Retry Single-Flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent automatic and manual media-operation retries from dispatching more than one Server Action for the same pending operation.

**Architecture:** `DocumentForm` owns one synchronous in-flight ref for the pending operation. Its effect and Retry button invoke the same callback; only the first caller may start the Server Action. A successful retry clears the local freeze state before refreshing the route, so a stale banner cannot accept another click.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Preserve durable database lifecycle and Cloudflare Service Binding behavior.
- Keep the automatic bounded retry and the manual Retry affordance.
- Do not create/delete/reset any existing Staging test data beyond the isolated test operation executed for verification.
- Use `npm` and retain strict TypeScript with no new dependencies.

---

### Task 1: Lock duplicate retry dispatch

**Files:**

- Modify: `src/app/admin/documents/document-form.tsx:66-94,154`
- Create: `src/app/admin/documents/document-form.test.tsx`

**Interfaces:**

- Consumes: `retryMediaOperation(operationId): Promise<LifecycleResult>` from `./actions`.
- Produces: One Server Action invocation per unresolved operation, whether triggered by the mount effect or the Retry button.

- [x] **Step 1: Write the failing test**

Render `DocumentForm` with a pending operation whose mocked retry promise remains unresolved. Trigger the mount effect and immediately trigger the Retry button. Assert the action has one invocation, not two.

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/app/admin/documents/document-form.test.tsx`

Expected: FAIL because the current effect and button handlers each dispatch `retryMediaOperation`.

- [x] **Step 3: Write the minimal implementation**

Add one `useRef<string | null>` that is claimed synchronously before `startTransition`. Route both effect and button through one `retryOperation` callback. Clear `operation` before `router.refresh()` on success and release the ref for pending/error results.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest --config vitest.config.mts run src/app/admin/documents/document-form.test.tsx`

Expected: PASS with exactly one dispatched action.

### Task 2: Verify the fix locally and on Staging

**Files:**

- Modify: `docs/context/testing-and-commands.md`
- Modify: `docs/todo/M06-media-management.md`
- Modify: `TODO.md`
- Modify: `context.md`

**Interfaces:**

- Consumes: The retry lock from Task 1 and the isolated M06 Staging fixture pattern.
- Produces: Verification record showing a successful retry without a duplicate-action error.

- [x] **Step 1: Run local checks**

Run: `npm run test:media`, `npx tsc --noEmit`, and `npm run lint`.

- [x] **Step 2: Build and deploy only the Staging App**

Build with the Staging site URL and non-secret build sentinel, assert the build output excludes the local media secret, then run `wrangler deploy --keep-vars` from the repository root.

- [x] **Step 3: Run an isolated Staging smoke**

Create a fresh test-only document/media/operation, verify its frozen UI, wait for the automatic retry, and verify DB/R2/UI final state. Do not click Retry while the automatic attempt is active; separately confirm its disabled state.

- [x] **Step 4: Record outcome and commit**

Mark M06 complete only if no duplicate-action error appears and all checks pass; otherwise retain the remediation status and describe the exact evidence.
