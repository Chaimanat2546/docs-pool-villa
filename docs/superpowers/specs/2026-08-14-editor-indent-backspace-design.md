# Editor indent backspace

## Objective

Let an author reduce paragraph indentation by pressing `Backspace` at the exact start of an indented ordinary paragraph.

## Scope

- Apply only to a collapsed cursor in a top-level paragraph with `indentLevel` from 1 through 3.
- When the cursor is at the paragraph's first text position, `Backspace` reduces `indentLevel` by one.
- When the cursor is not at that position, or the level is 0, `Backspace` retains existing Tiptap/browser behavior.
- Do not alter headings, lists, callouts, quotes, code blocks, images, embeds, or multi-paragraph selections.

## Implementation

Add a `Backspace` shortcut to `DocsParagraph` beside the existing Tab shortcuts. Reuse the existing top-level and collapsed-selection guards, then update only the current paragraph node.

## Testing

- Verify Backspace at the start of a level-2 paragraph emits level 1.
- Verify Backspace in the middle of paragraph text leaves normal deletion behavior available.
- Verify a level-0 paragraph and non-paragraph blocks are not intercepted.

## Non-goals

- No toolbar button or new JSON fields.
- No change to Tab, Shift+Tab, focus-boundary behavior, or public rendering.
