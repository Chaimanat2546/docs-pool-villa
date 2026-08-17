# M07 Command Palette Grouped Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group matching heading results under one document row in the public command palette, with document and heading icons.

**Architecture:** Keep `/api/search` and `PublicSearchItem` unchanged. `PublicSearchPalette` will derive grouped document rows and then flatten those visual rows for keyboard navigation. A heading-only API response creates a synthetic document row from its document metadata, so every displayed row is selectable; API scope and its 10-item cap remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Base UI Dialog, lucide-react, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- No API, database, migration, ranking, pagination, Staging, or Production changes.
- Keep the existing 10-result API cap, live query debounce, status states, keyboard shortcut, IME guard, and focus handling.
- Use `FileText` for document rows and `List` for heading rows; icons are decorative (`aria-hidden`).
- Preserve semantic anchors and listbox/option keyboard-selection exposure.
- Use `apply_patch` for manual file edits; preserve unrelated user changes.

---

### Task 1: Derive and render grouped palette results

**Files:**

- Modify: `src/components/public/public-search-palette.tsx`
- Test: `src/components/public/public-search-palette.test.tsx`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**

- Consumes: existing `SearchItem = { id; href; title; sectionTitle; parentTitle; kind; heading? }` from the route response.
- Produces: `getGroupedSearchResults(items: SearchItem[]): GroupedSearchResult[]`, where `GroupedSearchResult = { document: SearchItem; headings: SearchItem[] }`.
- Produces: `getSelectableSearchItems(groups: GroupedSearchResult[]): SearchItem[]`, ordered as each document followed by its headings, for `selectedIndex`, Arrow navigation, and Enter navigation.

- [ ] **Step 1: Write failing component tests for grouped rendering and navigation**

Add a fixture where two heading matches share `title: "บัญชี"` and one heading belongs to `title: "การจอง"`. Open the palette and assert:

```tsx
expect(screen.getAllByTestId("document-result")).toHaveLength(2);
expect(screen.getAllByTestId("document-icon")).toHaveLength(2);
expect(screen.getAllByTestId("heading-result")).toHaveLength(3);
expect(screen.getAllByTestId("heading-icon")).toHaveLength(3);
expect(screen.getByTestId("document-result").textContent).toContain("บัญชี");
```

Add an Arrow Down + Enter test that moves through the flattened visual order and calls `push` with the synthetic document href first, then the selected heading anchor href. Keep existing tests for a single result, Escape/focus, Ctrl/Cmd+K, IME, status states, and empty query.

- [ ] **Step 2: Run the palette test to verify it fails**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
```

Expected: FAIL because the palette currently renders one `li` per raw item and has neither groups nor icon test IDs.

- [ ] **Step 3: Implement a pure grouping helper and update visual rendering**

In `public-search-palette.tsx`, add the exported local types and helper:

```ts
type GroupedSearchResult = { document: SearchItem; headings: SearchItem[] };

function getGroupedSearchResults(items: SearchItem[]): GroupedSearchResult[] {
  const groups = new Map<string, GroupedSearchResult>();
  for (const item of items) {
    const key =
      item.kind === "document" ? item.href : item.href.split("#", 1)[0];
    const existing = groups.get(key);
    if (item.kind === "document") {
      groups.set(key, { document: item, headings: existing?.headings ?? [] });
    } else if (existing) {
      existing.headings.push(item);
    } else {
      groups.set(key, {
        document: { ...item, href: key, kind: "document" },
        headings: [item],
      });
    }
  }
  return [...groups.values()];
}
```

Add a helper that flattens each group as `[group.document, ...group.headings]`, and use that array for `selectedIndex`, Arrow navigation, and Enter navigation. Render each `group.document` once as a link row with `<FileText data-testid="document-icon" aria-hidden />`; render each `group.headings` below it as an indented link row with `<Hash data-testid="heading-icon" aria-hidden />`. Give interactive rows `data-testid="document-result"` or `data-testid="heading-result"`, retain `role="option"`, and compute each row's selected state by matching its href against `selectableItems[selectedIndex]?.href`.

Update `onInputKeyDown` to navigate `selectableItems`, which mirrors the visual group order and uses existing document or anchor hrefs for Enter.

- [ ] **Step 4: Run palette tests to verify the implementation passes**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/public-search-palette.test.tsx
```

Expected: PASS, including grouped rendering, direct anchor navigation, and all prior interaction tests.

- [ ] **Step 5: Run public-search regression, lint, and build**

Run:

```powershell
npx vitest --config vitest.config.mts run src/app/api/search/route.test.ts src/components/public/public-search-palette.test.tsx src/lib/docs/public-search.test.ts src/app/search/page.test.tsx
npm run lint
npm run build
```

Expected: focused tests pass, ESLint has no errors, and Next.js build completes. Record any pre-existing middleware deprecation warning without treating it as a failure.

- [ ] **Step 6: Update M07 documentation and commit**

Add a checked M07 TODO entry stating that command-palette results group headings under documents with document/heading icons (Local). Then commit only the palette component, its tests, and M07 TODO:

```powershell
git add src/components/public/public-search-palette.tsx src/components/public/public-search-palette.test.tsx docs/todo/M07-search-hardening.md
git commit -m "feat: group command palette results"
```
