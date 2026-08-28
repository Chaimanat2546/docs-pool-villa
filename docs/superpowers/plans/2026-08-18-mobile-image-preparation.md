# Mobile Image Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reliably prepare JPEG, PNG, WebP, HEIC, and HEIF images as WebP on iPhone Safari, one file at a time, before the existing Save/upload lifecycle.

**Architecture:** Split browser codec/normalization from FIFO queue orchestration. A codec layer decodes native or HEIC/HEIF files, normalizes orientation/size, verifies Canvas WebP output, and lazily falls back to a WebAssembly WebP encoder. `DocumentEditor` owns serial preparation and Alt dialogs; `DocumentForm` receives preparation state to block Save safely.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tiptap, Canvas/Image APIs, `heic2any`, `@jsquash/webp`, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-homepage-mobile-image-toast-design.md`

## Global Constraints

- Keep source images local; upload only final WebP using the unchanged ticket/Worker contract.
- Accept JPEG, PNG, WebP, HEIC, HEIF; maximum source size is 10 MiB per file; maximum output dimension is 1920 px.
- Require final `Blob.type === "image/webp"`; do not trust requested Canvas MIME alone.
- Process one queue item at a time; clean decoded resources and object URLs on removal, save, cancellation, and unmount.
- Preserve sequential Alt-text dialogs before insertion.
- Read applicable Next.js 16.3 documentation in `node_modules/next/dist/docs/` before code changes; use `npm` only.

---

## File structure

- Modify `src/components/editor/pending-images.ts` — Safari-safe decode, HEIC branch, and verified WebP encoding; preserve `uploadPendingImage`.
- Create `src/components/editor/image-preparation.test.ts` — codec and normalization tests.
- Create `src/components/editor/use-image-preparation-queue.ts` and `.test.ts` — serial queue, retry/remove, cancellation.
- Modify `src/components/editor/document-editor.tsx` and `.test.tsx` — multi-file/paste integration, queue UI, serial Alt dialogs, preparation callback.
- Modify `src/app/admin/(content)/documents/document-form.tsx` and `.test.tsx` — preparation-aware Save guard and aggregate Toast.
- Modify `package.json` and `package-lock.json`; create `src/types/heic2any.d.ts` only if the installed package lacks declarations.
- Modify `TODO.md` and `docs/todo/M07-search-hardening.md` only after validation.

### Task 1: Prove a Safari-safe codec boundary

**Files:**
- Modify: `package.json`, `package-lock.json`, `src/components/editor/pending-images.ts`
- Create: `src/components/editor/image-preparation.test.ts`
- Create: `src/types/heic2any.d.ts` only if TypeScript requires it

**Interfaces:**
- Produces `preparePendingImage(file: File, signal?: AbortSignal): Promise<PendingImage>` returning a verified WebP Blob.

- [ ] **Step 1: Write failing unit tests**

Mock native decode/Canvas/WASM boundaries. Cover JPEG native success, `createImageBitmap` rejection then `<img>.decode()` success, HEIC lazy decoder selection, 1920 px resize, rejected `image/png` Canvas Blob then WASM WebP success, and both encoders failing.

- [ ] **Step 2: Run the focused test to verify failure**

Run: `npx vitest --config vitest.config.mts run src/components/editor/image-preparation.test.ts`

Expected: FAIL because fallback/HEIC support does not exist.

- [ ] **Step 3: Install and implement codecs**

Run: `npm install heic2any @jsquash/webp`

Classify HEIC/HEIF by MIME or case-insensitive extension, dynamically import `heic2any` only for those files, and use `<img>.decode()` as the dependable native path. Normalize pixels/orientation and accept Canvas output only if it is `image/webp`; otherwise dynamically import `@jsquash/webp`, encode `ImageData`, and create a WebP Blob. Clean all temporary image/object resources in `finally`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest --config vitest.config.mts run src/components/editor/image-preparation.test.ts; npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json src/components/editor/pending-images.ts src/components/editor/image-preparation.test.ts src/types/heic2any.d.ts; git commit -m "feat: support Safari image preparation"`

### Task 2: Add a FIFO queue without changing Alt-text flow

**Files:**
- Create: `src/components/editor/use-image-preparation-queue.ts`, `src/components/editor/use-image-preparation-queue.test.ts`
- Modify: `src/components/editor/document-editor.tsx`, `src/components/editor/document-editor.test.tsx`

**Interfaces:**
- Produces `useImagePreparationQueue({ prepare })` with `{ items, isPreparing, enqueue(files), retry(id), remove(id), takeReady() }`.
- `items` expose `id`, `file`, `status: "pending" | "converting" | "ready" | "failed"`, and optional error.
- `DocumentEditorProps` gains optional `onPreparationChange(isPreparing: boolean): void`.

- [ ] **Step 1: Write failing queue/editor tests**

Use deferred promises to show that only the first of two files starts. Assert `<input multiple>` forwards all files, the next conversion/dialog waits until the first Alt dialog submits or cancels, a failed file has retry/remove controls without blocking the next one, and the summary announces the current ordinal.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npx vitest --config vitest.config.mts run src/components/editor/use-image-preparation-queue.test.ts src/components/editor/document-editor.test.tsx`

Expected: FAIL because no queue/multiple-file flow exists.

- [ ] **Step 3: Implement queue and editor integration**

Use one active `AbortController`, process FIFO, render accessible pending/converting/failed rows with retry/remove controls, and show a summary such as “กำลังเตรียมรูป 2 จาก 5”. Pass each ready result to the existing Alt dialog. Confirm inserts it and advances; cancel removes/revokes it and advances. Paste all image files rather than only the first.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest --config vitest.config.mts run src/components/editor/image-preparation.test.ts src/components/editor/use-image-preparation-queue.test.ts src/components/editor/document-editor.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/editor/use-image-preparation-queue.ts src/components/editor/use-image-preparation-queue.test.ts src/components/editor/document-editor.tsx src/components/editor/document-editor.test.tsx; git commit -m "feat: queue mobile image preparation"`

### Task 3: Block Save and provide aggregate Admin feedback

**Files:**
- Modify: `src/app/admin/(content)/documents/document-form.tsx`, `src/app/admin/(content)/documents/document-form.test.tsx`

**Interfaces:**
- Consumes `onPreparationChange` and the Toast API from the Admin Toast plan.
- Produces a Save guard that refuses save while image preparation is active.

- [ ] **Step 1: Write failing form tests**

Mock the editor calling `onPreparationChange(true)`. Assert Save cannot request a ticket and reports “กรุณารอให้เตรียมรูปเสร็จก่อนบันทึก”; assert a non-empty batch uses one loading toast that updates to success/warning/error.

- [ ] **Step 2: Run media tests to verify failure**

Run: `npm run test:media`

Expected: FAIL at preparation-state assertions.

- [ ] **Step 3: Implement Save guard and aggregate Toast**

Hold `isPreparingImages` in `DocumentForm`, include it in dirty-state calculation, pass it to the editor callback, and return before media upload while active. Update one batch toast to success, warning for partial failures, or error when no image becomes ready; preserve detailed inline recovery.

- [ ] **Step 4: Run tests**

Run: `npm run test:content; npm run test:media`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add "src/app/admin/(content)/documents/document-form.tsx" "src/app/admin/(content)/documents/document-form.test.tsx"; git commit -m "feat: guard save during image preparation"`

### Task 4: Validate and document

- [ ] **Step 1: Run local checks**

Run: `npm run test:content; npm run test:media; npm run lint; npm run build; git diff --check; npm audit --omit=dev`

Expected: all commands exit 0.

- [ ] **Step 2: Run real iPhone Safari checks**

Verify JPEG, PNG, HEIC, multi-file selection, portrait orientation, serial Alt dialogs, retryable failure, Save guard, and successful WebP upload handoff. Do not substitute desktop emulation.

- [ ] **Step 3: Record executed results and commit**

Run: `git add TODO.md docs/todo/M07-search-hardening.md; git commit -m "docs: record mobile image verification"`
