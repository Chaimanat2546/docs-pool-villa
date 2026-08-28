# M07 Command Palette Excerpt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-line truncated document excerpt in grouped command-palette document rows, while keeping heading rows title-only.

**Architecture:** Extend the palette-only `SearchItem` shape with `excerpt: string | null`, which is already present in the existing search response. The existing grouped document result will carry that value naturally, including synthetic document rows created from heading results. Rendering changes remain inside `PublicSearchPalette`; API, schema, and search ranking stay unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Base UI Dialog, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Do not alter `/api/search`, `src/lib/docs/public-search.ts`, Supabase, migrations, ranking, pagination, Staging, or Production.
- Do not overwrite or revert the pre-existing unstaged changes in the palette component, palette tests, or grouped-results plan; review and preserve them while adding the minimal excerpt change.
- Render document excerpts only when `excerpt?.trim()` is non-empty, in one line with Tailwind `truncate`.
- Never render excerpts in heading rows.
- Preserve existing grouped results, keyboard ordering, focus, Ctrl/Cmd+K, IME, loading/error/empty states, and accessible decorative icons.

---

### Task 1: Render excerpts on document rows only

**Files:**
- Modify: `src/components/public/public-search-palette.tsx`
- Test: `src/components/public/public-search-palette.test.tsx`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Consumes: route-result item field `excerpt: string | null`.
- Produces: document result rows with optional `<span data-testid="document-excerpt">` and no excerpt node in heading result rows.

- [ ] **Step 1: Write failing component tests**

Extend a grouped-result fixture to include `excerpt: "ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง"`. Assert the document row includes the text and an element with `data-testid="document-excerpt"` and class `truncate`.

Add a heading-only assertion:

```tsx
expect(screen.getByTestId("heading-result").textContent)
  .not.toContain("ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง");
```

Add a fixture with `excerpt: "   "` and assert `queryByTestId("document-excerpt")` is `null`.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
```

Expected: FAIL because `SearchItem` does not currently accept `excerpt` and document rows do not render it.

- [ ] **Step 3: Implement the minimal palette-only rendering change**

Extend the local item type:

```ts
type SearchItem = {
  // existing fields
  excerpt: string | null;
};
```

Inside the document anchor, below its title, render only non-blank excerpts:

```tsx
{group.document.excerpt?.trim() && (
  <span data-testid="document-excerpt" className="block truncate text-sm font-normal text-muted-foreground">
    {group.document.excerpt}
  </span>
)}
```

Keep this markup out of the heading-row map. Ensure the document text wrapper uses `min-w-0 flex-1` so `truncate` can produce an ellipsis in the flex row.

- [ ] **Step 4: Run component tests to verify green**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
```

Expected: PASS, covering non-empty, blank, and heading-only excerpt behavior plus all existing palette interactions.

- [ ] **Step 5: Run regression and compilation checks**

Run:

```powershell
npx vitest --config vitest.config.mts run src/app/api/search/route.test.ts src/components/public/public-search-palette.test.tsx src/lib/docs/public-search.test.ts src/app/search/page.test.tsx
npm run lint
npm run build
```

Expected: all focused tests pass; ESLint reports no errors; Next.js build completes. Record the pre-existing middleware deprecation warning if it appears.

- [ ] **Step 6: Update M07 documentation and commit only intended changes**

Add a checked M07 TODO entry for one-line document excerpts in the palette and the heading-row exclusion. Before staging, inspect `git diff` and stage only the excerpt hunks from the pre-existing modified palette files together with `docs/todo/M07-search-hardening.md`; do not include unrelated formatting-only or user changes. Commit with:

```powershell
git commit -m "feat: show palette document excerpts"
```
