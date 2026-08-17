# Hide the document sort-order input

## Goal

Prevent regular document editing from directly changing a document's sort order.

## Scope

- Remove the `ลำดับ` number input from the document editor content stage.
- Remove its client-side validation, error state, and focus reference.
- Preserve the document's loaded `sortOrder` in client form state and submit that
  unchanged value with ordinary document saves.
- Keep document ordering exclusively in the section-scoped drag-and-drop reorder
  editor at `/admin/structure?section=...`, which requires an explicit save.

## Out of scope

- No new database constraint or migration for unique `(section_id, sort_order)`.
- No change to the existing server action or reorder RPC contract.
- No change to section sort-order inputs.

## Behavior

Opening and saving an existing document must not expose a numeric order field and
must retain its saved order. Administrators change document order only through the
section's reorder mode.

## Verification

- Add a component regression test that the document edit screen has no input
  labelled `ลำดับ`.
- Assert a valid document save still submits the original sort-order value.
- Run the focused component test, then lint and build.
