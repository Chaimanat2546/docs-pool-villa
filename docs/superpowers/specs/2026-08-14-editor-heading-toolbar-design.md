# Editor heading toolbar

## Objective

Make heading formatting discoverable in the document editor by adding H2 and H3 controls to the existing toolbar. Keep the document title as the page-level H1.

## Scope

- Add H2 and H3 toolbar buttons before the list controls.
- Each button toggles the corresponding existing Tiptap heading level on the current block.
- Indicate the active heading level with the existing pressed-state treatment.
- Provide Thai accessible labels: `หัวข้อ 2` and `หัวข้อ 3`.
- Preserve the existing slash commands, H2/H3-only schema, TOC generation, and all other toolbar behavior.

## Implementation

`DocumentEditor` will read `heading` activity from `useEditorState`, then invoke `toggleHeading({ level: 2 })` or `toggleHeading({ level: 3 })` from `ToolbarButton`. The feature uses existing Tiptap commands and introduces no new extension or data format.

## Testing

- Add one component test per control that clicks the button and asserts the emitted editor JSON contains a heading at its expected level.
- Run the focused content test suite, then type check and lint.

## Non-goals

- No H1 control: the document title remains the sole page-level H1.
- No change to slash commands, TOC behavior, persistence format, or public rendering.
