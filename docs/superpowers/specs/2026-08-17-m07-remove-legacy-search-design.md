# M07 Remove Legacy Search Page Design

## Goal

Remove the legacy standalone `/search` UI and its header link now that the command palette is the only public search entry point.

## Route and UI changes

- Delete the `src/app/search/` route and its tests. With no matching App Router route, `/search` returns Next.js's normal 404 response.
- Remove only the header link whose `href` is `/search`.
- Keep the header `PublicSearchPalette` trigger and its `Ctrl+K`/`⌘K` behavior.

## Preserved search boundary

`src/app/api/search/route.ts` remains in place because the command palette calls it. The public search service, title/H2/H3 matching, result cap, keyboard behavior, database schema, and migrations remain unchanged.

## Verification

- Update header tests to assert that no `/search` link is rendered and the palette trigger remains.
- Remove tests only belonging to the deleted route.
- Run focused palette/API tests, lint, and build; confirm the build route list no longer includes `/search`.

## Scope exclusions

No redirect, API removal, database change, Staging deployment, or Production action.
