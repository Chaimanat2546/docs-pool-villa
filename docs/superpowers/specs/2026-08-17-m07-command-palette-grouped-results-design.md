# M07 Command Palette Grouped Results Design

## Goal

Make command-palette results easier to scan when multiple matched H2/H3 headings belong to the same document. Each document appears once with a document icon; its matched headings are nested directly underneath.

## Scope and data contract

The existing same-origin search Route Handler, its 10-item cap, and `PublicSearchItem` shape remain unchanged. Grouping happens only in `PublicSearchPalette` after the response arrives, keyed by the document result identity/path.

- A document result creates a document group and supplies the document-level link.
- A heading result joins its document group and keeps its existing anchor href.
- If an API response only contains heading results for one document, the palette still creates a document group using that result's document metadata.
- Results remain limited to the first 10 API items; grouping never fetches more items or changes search ranking.

## Visual and interaction design

The palette retains the project's existing light card, border, mint/black focus language, and responsive row sizing. The screenshot is used as an information-layout reference only, not as a request to copy its dark theme.

- Document group row: `FileText` icon, document title, and a link to the document page.
- Heading row: indented beneath its document, `List` icon, heading text, and a link to the existing anchor.
- Multiple headings under one document display consecutively inside that group; headings from other documents start a new document group.
- Arrow Up/Down and Enter operate on every navigable document or heading row in visual order. The selected row retains the existing visible state and `aria-selected` exposure.
- Empty, loading, and recoverable-error states stay unchanged.

## Accessibility and non-goals

The document and heading links remain semantic anchors. The listbox exposes each interactive row as an option; decorative icons are hidden from assistive technologies. Indentation is visual only, so screen-reader order stays document followed by its matched headings.

Out of scope: changing search matching/ranking, query highlighting, excerpts, API/schema changes, Staging deployment, or Production action.

## Verification

- Component tests cover grouping multiple headings under one document, document/heading icon labels, keyboard selection through grouped visual order, and direct navigation hrefs.
- Preserve the existing focus, Escape, Ctrl/Cmd+K, IME, loading, error, empty-result, API, and `/search` regression tests.
- Run focused tests, lint, and build.
