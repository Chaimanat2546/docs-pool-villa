# M07 Remove Legacy Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the standalone `/search` page and header link, leaving the command palette as the public search entry point.

**Architecture:** Delete the App Router search route and its route-only test. Simplify `PublicHeader` by removing the `/search` Link while retaining `PublicSearchPalette`, which continues to call the existing `/api/search` endpoint.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, Testing Library.

## Global Constraints

- Preserve the existing unstaged palette and unrelated admin changes.
- Do not delete `/api/search`, public-search service code, database objects, migrations, or command-palette code.
- `/search` must not redirect; its deleted route must use normal Next.js 404 behaviour.
- No Staging or Production action.

---

### Task 1: Remove standalone search entry points

**Files:**
- Modify: `src/components/public/public-header.tsx`
- Create: `src/components/public/public-header.test.tsx`
- Delete: `src/app/search/page.tsx`
- Delete: `src/app/search/page.test.tsx`

**Interfaces:**
- Consumes: `PublicHeader()` and `PublicSearchPalette` component.
- Produces: a header with the home link and palette trigger, but no anchor/link to `/search`.

- [ ] **Step 1: Write the failing header test**

Create a jsdom test that mocks `PublicSearchPalette` as `<button>ค้นหาคู่มือ</button>`, renders `PublicHeader`, then asserts:

```tsx
expect(screen.getByRole("button", { name: "ค้นหาคู่มือ" })).toBeTruthy();
expect(screen.queryByRole("link", { name: "ค้นหา" })).toBeNull();
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-header.test.tsx
```

Expected: FAIL because the current header renders a `ค้นหา` Link with `href="/search"`.

- [ ] **Step 3: Remove legacy UI and route**

Use `apply_patch` to remove the `/search` Link from `PublicHeader`. Delete `src/app/search/page.tsx` and `src/app/search/page.test.tsx` with `apply_patch`; do not create a redirect or replacement page.

- [ ] **Step 4: Verify green**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-header.test.tsx src/components/public/public-search-palette.test.tsx src/app/api/search/route.test.ts src/lib/docs/public-search.test.ts
```

Expected: PASS. The command palette and API remain covered; deleted route test is absent.

- [ ] **Step 5: Lint and build**

Run:

```powershell
npm run lint
npm run build
```

Expected: PASS, and the build route table does not list `/search`.

- [ ] **Step 6: Update M07 docs and commit safely**

Add a checked M07 TODO item noting that the legacy `/search` UI/link was removed and unknown `/search` now 404s. Inspect the diff before staging; do not stage any existing palette/admin changes. Commit only deletions, header files, and M07 docs with:

```powershell
git commit -m "refactor: remove legacy search page"
```
