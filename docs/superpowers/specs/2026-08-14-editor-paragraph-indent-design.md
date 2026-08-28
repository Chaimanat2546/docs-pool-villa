# Editor paragraph indent

## Objective

Let an author indent only ordinary paragraph blocks in the document editor. Pressing `Tab` increases the paragraph indentation, while `Shift + Tab` decreases it.

## Scope

- Store a paragraph `indentLevel` from 0 through 3 in the document JSON.
- `Tab` changes the current paragraph from level 0 to 3, one level per press.
- `Shift + Tab` changes the current paragraph from level 3 to 0, one level per press.
- At level 0 or 3, the matching key has no further effect.
- H2/H3, lists, callouts, quotes, code blocks, images, and embeds retain their existing keyboard behavior.
- Render indentation in both the Admin editor and the public document reader.

## Presentation

- Level 0: no indentation.
- Level 1: 2rem indentation.
- Level 2: 4rem indentation.
- Level 3: 6rem indentation.
- On narrow screens, use a smaller but proportional indentation so the paragraph remains readable.

## Implementation

Extend the existing Tiptap paragraph node with an `indentLevel` attribute. Render non-zero levels as `data-indent-level`, add editor keyboard shortcuts that operate only when the current block is a paragraph, and add shared CSS rules for the editor and public reader.

## Testing

- Verify Tab increments a paragraph level and emits JSON with `indentLevel`.
- Verify Shift+Tab decrements it.
- Verify levels do not exceed 3 or go below 0.
- Verify heading blocks do not receive a paragraph indent level.

## Non-goals

- No indentation button in the toolbar.
- No indentation for headings or non-paragraph blocks.
- No changes to TOC, slash commands, document title H1, or list nesting.
