# M07 Home Search Palette Trigger Design

## Goal

Replace the removed standalone-search form on the home hero with a large trigger for the existing public command palette.

## Component contract

Extend `PublicSearchPalette` with a `variant` prop:

- `header` remains the current compact header trigger and is the default.
- `hero` renders the home page's wide search-field presentation: Search icon, “ค้นหาคู่มือ” placeholder-like label, and a visible “ค้นหา” action treatment.

Both variants use the same dialog instance behaviour, `/api/search` data, grouped result rendering, excerpts, status states, keyboard navigation, and Ctrl/Cmd+K listener. The hero trigger is a button, not a form, input, or link to `/search`.

## Home page changes

`src/app/page.tsx` imports `PublicSearchPalette` and replaces only the `form action="/search"` block with `<PublicSearchPalette variant="hero" />`. Remove the now-unused `Search` icon import.

## Accessibility and scope

The hero trigger has the accessible name “ค้นหาคู่มือ” and opens/focuses the same labelled dialog. It retains a 44px minimum hit target and remains responsive at the existing hero width.

No API, search ranking, database, migration, standalone search route, Staging, or Production changes.

## Verification

- Component tests cover hero trigger rendering and opening/focusing the shared palette.
- Home page test confirms no form action `/search` remains and the hero palette is rendered.
- Run focused home/palette/API tests, lint, and build; `/search` must remain absent from route output.
