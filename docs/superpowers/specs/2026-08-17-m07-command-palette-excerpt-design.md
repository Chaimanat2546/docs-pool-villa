# M07 Command Palette Excerpt Design

## Goal

Show an existing document excerpt beneath each document row in the public command palette. Long excerpts are limited to one line with an ellipsis; heading rows never display excerpts.

## Data and rendering

The existing public search response already carries the document `excerpt` through its navigation-item data. Extend the palette's local `SearchItem` type to include `excerpt: string | null`; do not change the API route, search service, schema, or migrations.

- A document row renders its `excerpt` only when it is non-empty after trimming.
- The excerpt uses Tailwind `truncate` in a minimum-width flex container so long text is shown as one line followed by an ellipsis.
- A synthetic document row created from a heading result carries the same excerpt, so grouped results have the same document summary.
- Heading rows render only their heading title and heading icon; they never render `excerpt`.

## Accessibility and scope

Excerpt text is supplementary, so the document link retains the document title as its accessible name. Existing FileText/List icons remain decorative. Keyboard navigation, grouping, result cap, live query, API behaviour, and all status states remain unchanged.

Out of scope: generating excerpts from document content, changing excerpt storage, query highlighting, Staging deployment, and Production action.

## Verification

- Component tests cover a non-empty document excerpt, a missing/blank excerpt, long-text truncation classes, and absence of excerpt text on heading rows.
- Preserve grouped-results, keyboard, focus, shortcut, IME, error, and empty-result tests.
- Run focused public-search tests, lint, and build.
