# Editor Public Width Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ Editor body และ Admin Preview มีความกว้างเนื้อหา `42rem` เท่าหน้า Public.

**Architecture:** คง Admin form และ toolbar ที่ความกว้างเดิม; เพิ่ม width constraint เฉพาะ ProseMirror และ wrapper `DocumentContent` ใน Preview. ทั้งสอง responsive ด้วย `max-width: 100%`.

**Tech Stack:** Next.js 16.3, React 19, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Public reader content column มีความกว้าง `42rem`
- ฟอร์ม Admin และ toolbar ต้องไม่ถูกจำกัดที่ `42rem`
- Editor/Preview ต้องไม่เกิด horizontal overflow บน mobile

---

### Task 1: เพิ่ม regression test และ width constraints

**Files:**

- Modify: `src/components/editor/document-editor.test.tsx`
- Modify: `src/components/editor/editor-preview.test.tsx` (create)
- Modify: `src/components/editor/editor-preview.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- Produces: `.docs-editor-content` ที่มี max width `42rem` และ Preview content wrapper class `editor-preview-content`

- [ ] **Step 1: Write failing tests**

Add an Editor test that renders `DocumentEditor`, gets `.docs-editor-content`, and asserts class `docs-editor-content`. Create an `EditorPreview` jsdom test that opens Preview and asserts its `DocumentContent` parent has class `editor-preview-content`. Add a stylesheet assertion by reading `src/app/globals.css` only if existing test conventions support it; otherwise assert the classes and verify CSS through the production build.

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx src/components/editor/editor-preview.test.tsx`

Expected: FAIL because the preview wrapper does not exist.

- [ ] **Step 3: Write minimal implementation**

Wrap `DocumentContent` in `EditorPreview` with `<div className="editor-preview-content">`. In `globals.css`, set `.docs-editor-content, .editor-preview-content { width: 100%; max-width: 42rem; }`; do not apply that constraint to the editor section or toolbar. Keep Preview wrapper left aligned.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx src/components/editor/editor-preview.test.tsx`

Expected: PASS for both component contracts.

- [ ] **Step 5: Commit**

Run: `git add src/components/editor/document-editor.test.tsx src/components/editor/editor-preview.tsx src/components/editor/editor-preview.test.tsx src/app/globals.css`

Run: `git commit -m "fix: align editor width with public reader"`

### Task 2: Verify shared rendering

**Files:**

- Verify: files from Task 1 and `src/components/public/document-content.tsx`

- [ ] **Step 1: Run verification**

Run: `npm run test:content`, `npm run test:public`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

Expected: all exit 0; record actual build warnings only.

- [ ] **Step 2: Inspect final diff**

Run: `git diff --check`

Expected: no whitespace errors.

## Self-review

- Spec coverage: Task 1 makes Editor and Preview match the Public content width; the constraint targets only content surfaces. Task 2 confirms shared content rendering remains valid.
- Placeholder scan: no unresolved placeholders remain.
- Type consistency: no component props change.
