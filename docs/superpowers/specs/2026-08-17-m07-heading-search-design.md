# M07 — Heading Search Design

## Goal

Extend the existing public search so a visitor can find a document by its title or by a matching heading inside that document. A heading result opens the exact H2 or H3 section through the same anchor already rendered by the public document page.

## Scope

- Search document titles and headings H2/H3 with case-insensitive partial matching.
- Keep one result for each matched heading. A document may therefore appear more than once when several headings match.
- Keep a matched title as a document-level result linked to the document path. A matched heading links to `document path#heading-id`.
- Continue to search Published documents only, use native GET, cap `q` at 200 characters, paginate 10 results, and provide no autocomplete.
- For a blank query, retain the current document-only list; do not create heading results.
- Do not search excerpts, paragraphs, code, images, or any other document content.

## Data and anchors

The public document renderer already derives a deterministic anchor from each non-table H2/H3 using a Unicode-safe slug and duplicate counter. The implementation will move this extraction into a pure shared helper, so the reader, table of contents, and search use exactly the same `{ id, level, text }` result.

For this small, first expansion, the public server search loads `content` only for Published Docs rows, extracts headings in application code, and filters those headings. It does not add `search_text`, a new table, trigger, or index. The existing trigram index remains responsible for title matching at the database layer.

This deliberately trades heading-search scalability for avoiding duplicated derived data. M07 performance/capacity testing remains required before a deployment proposal; if the measured baseline cannot meet the target, the follow-up design must introduce indexed derived heading data instead of silently degrading results.

## Result model and ordering

The search model has two result kinds:

- `document`: current summary fields and `href = path`.
- `heading`: the same document context plus `heading`, `headingLevel`, and `href = path + '#' + headingId`.

For a non-empty query, title matches appear first in the existing title/id ordering, then heading matches ordered by document title/id and their source order in Tiptap content. This is stable across pagination. A heading that has the same text as a document title remains a separate, meaningful heading result.

The UI continues to show the document title, section breadcrumb, and optional excerpt. Heading results add a clear label such as `หัวข้อ: การตั้งค่า` so the destination is understandable before activation. Links remain keyboard accessible and native anchors handle scrolling after navigation.

## Error handling and security

- Preserve existing generic search load error handling; malformed/unknown JSON produces no headings rather than exposing an error to the visitor.
- Reuse only publicly readable `doc_documents` and `doc_sections`; existing RLS remains the authority that limits results to Published rows.
- Escape `%`, `_`, and `\\` for title `ILIKE` unchanged. Heading matching is in application code and treats them as literal characters.
- No legacy table, legacy index, RLS policy, or credential changes.

## Verification

- Unit test the shared extractor for H2/H3, nested marks, ignored table headings, Unicode anchors, and duplicate headings.
- Unit test search result construction for title-only, heading-only, multiple headings in one document, blank query, literal special characters, Published-only input, stable ordering, count, and pagination.
- Update search page tests to cover heading text/label and anchor href.
- Run focused tests, `npm run lint`, and `npm run build`; browser keyboard/anchor and performance checks remain M07 follow-up work.

## Non-goals

- Autocomplete, fuzzy/typo tolerance, full-content search, excerpts, search analytics, highlighting query text, and changes to Admin editing behavior.
