# Category-first Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive, category-first public homepage that follows the chosen Next.js-style layout without duplicating topbar search.

**Architecture:** Retain the current server-side `getPublicDocsIndex()` model and its Published-only ordering. Recompose the existing Hero and automatic category/recent-update sections; no schema, search API, or navigation-model change is needed.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS, lucide-react, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-18-homepage-mobile-image-toast-design.md`

## Global Constraints

- The topbar Command Palette is the only search entry point; Hero must not render `PublicSearchPalette`.
- CTA links to the first Published `index.documents` item using established `sort_order` ordering.
- Category cards remain automatic and show 3–5 Published documents; the existing cap of four satisfies this.
- Do not add Homepage Editor, featured flags, draft/archived leakage, or database changes.
- Read applicable Next.js 16.3 documentation in `node_modules/next/dist/docs/` before code changes.

---

## File structure

- Modify `src/app/page.tsx` — category-first Hero copy/layout, CTA, automatic cards, and responsive/touch-safe surfaces.
- Modify `src/app/page.test.tsx` — no Hero search, CTA target, empty state, cards, recent updates.
- Modify `TODO.md` and `docs/todo/M07-search-hardening.md` only after validation, recording this public UX follow-up without changing deployment gates.

### Task 1: Lock down the homepage contract with tests

**Files:**
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes mocked `getPublicDocsIndex(): Promise<PublicDocsIndex>`.
- Produces tests for CTA target, automatic content, and Hero search absence.

- [ ] **Step 1: Replace obsolete Hero-search expectation with failing tests**

Mock an index with ordered documents, one primary section, and one recent update. Assert `home-search-palette` is absent, the `เริ่มต้นใช้งาน` link has the first document path, category/document headings render, and the empty index has “กำลังจัดเตรียมคู่มือสำหรับคุณ”.

- [ ] **Step 2: Run the page test to verify failure**

Run: `npx vitest --config vitest.config.mts run src/app/page.test.tsx`

Expected: FAIL because Hero still renders `PublicSearchPalette`.

- [ ] **Step 3: Implement the selected Hero composition**

Remove Hero `PublicSearchPalette` import/render. Keep the system name, CTA and `startPath`; change Hero styling to the approved help-center/category-first treatment. Preserve the existing 44 px-or-larger category links and the automatic recent-update section.

- [ ] **Step 4: Run focused Public tests**

Run: `npx vitest --config vitest.config.mts run src/app/page.test.tsx src/components/public/public-header.test.tsx src/lib/docs/public-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/page.tsx src/app/page.test.tsx; git commit -m "feat: redesign category-first homepage"`

### Task 2: Verify and document responsive Public behavior

**Files:**
- Modify: `TODO.md`
- Modify: `docs/todo/M07-search-hardening.md`

- [ ] **Step 1: Run local validation**

Run: `npm run test:public; npm run lint; npm run build; git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Run browser accessibility/responsive checks**

At 390 px, tablet, and desktop widths, verify topbar search remains available, Hero contains no search, CTA is keyboard reachable, category links have visible focus/no horizontal overflow, and empty/latest-update states are coherent.

- [ ] **Step 3: Record executed evidence and commit**

Run: `git add TODO.md docs/todo/M07-search-hardening.md; git commit -m "docs: record homepage verification"`
