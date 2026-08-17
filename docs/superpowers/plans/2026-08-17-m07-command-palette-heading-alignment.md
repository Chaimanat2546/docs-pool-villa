# M07 Command Palette Heading Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vertically center the heading icon against its heading text in command-palette result rows.

**Architecture:** Make a palette-only Tailwind class adjustment in the existing heading-result anchor. No data, API, grouping, or keyboard code changes are required.

**Tech Stack:** React 19, Tailwind CSS, lucide-react, Vitest, Testing Library.

## Global Constraints

- Preserve all existing unstaged changes in palette files and the unrelated admin file.
- Retain heading indentation, `min-h-11`, `Hash` icon, href, selected state, and `role="option"`.
- Do not change API, database, migrations, Staging, or Production.

---

### Task 1: Center heading-row icon and text

**Files:**
- Modify: `src/components/public/public-search-palette.tsx`
- Test: `src/components/public/public-search-palette.test.tsx`

**Interfaces:**
- Consumes: existing `<a data-testid="heading-result">` and `<Hash data-testid="heading-icon">` markup.
- Produces: heading result with `items-center` and heading icon without a top-margin utility.

- [ ] **Step 1: Write the failing component assertion**

In the grouped-results test, add:

```tsx
expect(screen.getAllByTestId("heading-result")[0].className).toContain("items-center");
expect(screen.getAllByTestId("heading-icon")[0].className).not.toContain("mt-0.5");
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
```

Expected: FAIL because the existing heading row uses `items-start` and the icon has `mt-0.5`.

- [ ] **Step 3: Apply the minimal UI change**

Change the heading result anchor class from `items-start` to `items-center`. Remove only `mt-0.5` from the `Hash` icon class while retaining `shrink-0`.

- [ ] **Step 4: Verify green**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
npm run lint
```

Expected: palette tests and ESLint pass.

- [ ] **Step 5: Commit safely**

Inspect the diff before staging. Since files have pre-existing unstaged changes, stage only the exact alignment hunk if it can be separated without including user changes; otherwise leave the verified change unstaged and report the reason.
