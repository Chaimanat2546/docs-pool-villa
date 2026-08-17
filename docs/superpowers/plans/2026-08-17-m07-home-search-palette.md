# M07 Home Search Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home hero search open the existing public command palette rather than submitting to the removed `/search` page.

**Architecture:** Add a `variant?: "header" | "hero"` prop to `PublicSearchPalette`; only its trigger markup varies. The dialog, fetch, grouping, excerpt, and keyboard code remain single-source. The server home page replaces its old form with the client palette component.

**Tech Stack:** Next.js 16 App Router, React 19, Base UI Dialog, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Preserve unstaged palette changes and do not stage unrelated palette/admin work.
- Keep `/api/search` and all palette interaction logic unchanged.
- Hero is a button trigger; it must not contain `form`, `input`, or `/search` action.
- No database, migration, Staging, or Production action.

---

### Task 1: Add hero trigger variant and replace the home form

**Files:**
- Modify: `src/components/public/public-search-palette.tsx`
- Test: `src/components/public/public-search-palette.test.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `PublicSearchPalette({ variant?: "header" | "hero" })`.
- Produces: `variant="hero"` trigger with the home hero width/style that opens the same dialog.

- [ ] **Step 1: Write failing tests**

Add a palette test:

```tsx
render(<PublicSearchPalette variant="hero" />);
fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
expect(await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeTruthy();
```

Create `src/app/page.test.tsx`, mock `PublicSearchPalette`, render `Home()`, and assert the mock received `variant="hero"`; assert no `<form action="/search">` exists.

- [ ] **Step 2: Verify red**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx src/app/page.test.tsx
```

Expected: FAIL because `variant` does not exist and Home still contains the legacy form.

- [ ] **Step 3: Implement minimal shared trigger rendering**

Add the optional prop and select the trigger class/content by variant. The hero trigger is a full-width button using the current hero form visual structure: Search icon, “ค้นหาคู่มือ” text, and a right-side “ค้นหา” span. Keep the default header trigger byte-for-byte equivalent in appearance.

In `src/app/page.tsx`, replace the form block with:

```tsx
<div className="mx-auto mt-8 max-w-xl">
  <PublicSearchPalette variant="hero" />
</div>
```

Remove the unused `Search` import.

- [ ] **Step 4: Verify green and regressions**

Run:

```powershell
npx vitest --config vitest.config.mts run src/app/page.test.tsx src/components/public/public-header.test.tsx src/components/public/public-search-palette.test.tsx src/app/api/search/route.test.ts src/lib/docs/public-search.test.ts
npm run lint
npm run build
```

Expected: all tests, lint, and build pass; no `/search` route appears.

- [ ] **Step 5: Document and commit safely**

Add a checked M07 TODO item stating that the home hero uses the shared command palette. Inspect the diff and stage only hero-variant/home-page hunks plus tests/docs; do not stage unrelated existing palette changes. Commit with:

```powershell
git commit -m "feat: use command palette on home"
```
