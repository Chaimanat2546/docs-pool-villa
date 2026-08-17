# M07 Command Palette Search Design

## Goal

Replace the always-visible public header form with a Next.js-docs-inspired command palette. It opens on click or `Ctrl/Cmd+K`, shows the first 10 Published documents while empty, and filters title/H2/H3 results immediately as the visitor types.

## Direction and component contract

The palette is a documentation navigation tool, not a copy of the Next.js brand: a quiet central dialog, dimmed backdrop, existing background/card/border tokens, 8px input radius, 12px dialog radius, and the project's black/mint focus language. It uses the existing Base UI Dialog primitive and needs no new dependency.

- Header trigger: compact `search-pill` treatment with label and `Ctrl K` keycap; click opens the palette rather than submitting a form.
- Dialog: labelled modal with a search input, Escape affordance, scrollable 10-item result list, and visible selected row.
- Results: title, section path, and `หัวข้อ: …` when applicable. Each item retains the current safe document or anchor href.
- States: initial (10 document results), loading, no result, recoverable fetch error, keyboard-selected, and disabled navigation while loading/empty.
- Desktop: centered max-width dialog within the documentation shell. Mobile: full-width with safe gutters, 44px input/row targets, and no horizontal overflow.

## Data flow

Create a same-origin read-only Route Handler for the palette. It accepts `q`, normalizes it through the existing search parameter rules, invokes the existing Published-only search service at page 1, and returns at most 10 `PublicSearchItem` results. The empty query therefore returns the existing first page of documents; non-empty input returns title and heading matches.

The client palette debounces input by 150ms, aborts obsolete requests, and treats only the latest response as current. It does not expose credentials, query Drafts, create an index, migrate the database, or change the full `/search` page.

## Interaction and accessibility

- `Ctrl/Cmd+K` opens the dialog from every public route. Browser search is prevented only for this valid shortcut.
- Opening focuses the input; dialog focus is trapped by Base UI; closing via Escape, overlay, or close control returns focus to the trigger.
- Arrow Down/Up wraps through available results. Enter navigates the selected result. Normal Tab behavior remains within the dialog.
- Results use semantic links; selected state is exposed with `aria-selected`; loading/error/no-results status is announced through an appropriate live region.
- Clicking an item navigates to its current path or anchor. The header trigger remains accessible by keyboard and screen reader.

## Error and non-goals

On failed fetch, keep the input usable and show a Thai retry instruction; a subsequent input change or opening the palette retries. No result says clearly that no document or heading matched.

Out of scope: fuzzy matching, search analytics, highlighted query text, result pagination inside the palette, schema changes, Staging deployment, and Production action.

## Verification

- Unit-test server query validation and 10-item response cap.
- Component-test open/focus, initial results, live query, loading/error/no-result, arrow selection, Enter navigation, Escape/focus return, and request cancellation/latest-response behavior.
- Preserve direct `/search` page and its title/H2/H3 anchor tests.
- Run focused tests, lint, build, keyboard/focus browser smoke at desktop and mobile, and update M07 context/TODO.
