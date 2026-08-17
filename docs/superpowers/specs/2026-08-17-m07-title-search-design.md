# M07 Title Search Design

## Scope

Implement a simple public search for Docs. It searches only the title of Published documents. It does not provide autocomplete, a search modal, typo/fuzzy matching, or matching against excerpts and document content.

This decision narrows the M07 search requirement in `docs/Poolvilla-Docs-Requirements-TH-v1.2.md` for the first release. A later change may extend the searchable fields and matching behavior through a separately approved design.

## User behavior

- The existing public forms submit with `GET /search?q=<query>`.
- An empty or absent `q` displays every Published document.
- A non-empty `q` performs a case-insensitive substring match on the document title. For example, `ล็อก` matches `วิธีล็อกอินระบบ`.
- Results show 10 documents per page. The `page` query parameter starts at 1 and remains alongside `q` while paging.
- A result displays its title, optional excerpt, and section path, and links to the public document route.
- When no document matches, the page clearly states that no results were found for the submitted query.
- The page remains `noindex,nofollow`.

## Keyboard behavior

- `Ctrl+K` on Windows/Linux and `Command+K` on macOS navigate to `/search` when used outside that page, then place focus in the search input.
- On `/search`, the same shortcut focuses the input without changing its current value.
- `Enter` submits the native search form.
- The shortcut does not open a dialog and does not fetch or show results while typing.
- The handler ignores modifier combinations other than Control/Command+K and does not steal ordinary text entry.

## Data access and performance

- Add `pg_trgm` and a GIN trigram index for `public.doc_documents.title` only. No legacy table, index, or search behavior changes.
- The public search query uses the existing public Supabase client and existing RLS policies, so only documents that the public can already read are returned.
- Search uses a literal `ILIKE '%query%'` pattern. Escape `%`, `_`, and `\\` in user input so they remain literal characters rather than wildcard syntax.
- An empty query does not apply a title filter. Both modes use a deterministic ordering and request only the current page plus the total count.
- Validate `q` as a trimmed string with a maximum of 200 characters. Treat invalid, missing, zero, or negative `page` values as page 1. Requests beyond the final page render the normal empty-result state rather than leaking database details.
- Reuse the existing public navigation/index data to calculate each result's section path; this does not expand the database response with unpublished section data.

## UI and accessibility

- Keep the existing public header and homepage search entry points.
- Add a visible keyboard hint for `Ctrl K` / `⌘ K` where space permits, while retaining an accessible input label.
- Search results use semantic list and navigation markup. Previous/next controls have unambiguous accessible names, preserve query parameters, and show a visible focus state.
- Loading is server-rendered. If the search query fails, show a concise retry message without SQL, credentials, or internal details.

## Testing and verification

- Unit/page tests cover query parsing, empty-query listing, partial title matching, a content/excerpt non-match, no-result UI, paging at 10 items, invalid page handling, and error UI.
- Client-component tests cover `Ctrl+K` and `Command+K`, input focus, native Enter submit, and that no autocomplete list appears.
- Database tests cover Guest/non-admin/Admin visibility, Published-only rows, literal wildcard handling, and that the title index exists only on Docs data.
- Run the focused tests first, then `npm run lint` and `npm run build`. Verify the database query plan/performance locally against the M07 baseline before any staging action.

## Out of scope

- Autocomplete, modal/command-palette search, result previews while typing, recent searches, keyboard result navigation, typo tolerance, and searching excerpt/content.
- Staging or Production migration/deployment. These require separate approval from ภู.
