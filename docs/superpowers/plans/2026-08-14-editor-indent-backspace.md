# Editor Indent Backspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce an ordinary paragraph's indentation with Backspace only at its exact start.

**Architecture:** Extend the existing `DocsParagraph` keyboard shortcut logic with a Backspace handler. It reuses the top-level, collapsed-selection guard, adds a first-text-position check, and updates only the current paragraph through the existing transaction pattern.

**Tech Stack:** Next.js 16.3.0, TypeScript, Tiptap 3, Vitest, Testing Library.

## Global Constraints

- Only a collapsed cursor at the exact start of a top-level paragraph with indent level 1–3 may reduce indentation.
- Backspace reduces exactly one level; level 0 and every other cursor/block state keep existing behavior.
- Do not alter Tab, Shift+Tab, focus-boundary behavior, public rendering, H2/H3, lists, callouts, quotes, code blocks, images, embeds, or range selections.
- Do not touch unrelated pending Explorer, Actions, or M07 files.

---

### Task 1: Add Backspace paragraph-indent behavior

**Files:**
- Modify: `src/components/editor/extensions.ts`
- Modify: `src/components/editor/document-editor.test.tsx`

**Interfaces:**
- Consumes: collapsed `EditorState.selection.$from`, the current top-level paragraph node, and its `indentLevel`.
- Produces: `Backspace` shortcut that returns handled only after changing current paragraph `{ indentLevel: N }` to `{ indentLevel: N - 1 }`.

- [x] **Step 1: Write failing regression tests**

```tsx
it("reduces paragraph indentation with Backspace at the first text position", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
  const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
  setupEditorGeometry();
  editor.focus();
  await user.keyboard("{Backspace}");
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 1 } })]) }), []));
});

it("keeps normal Backspace behavior away from the paragraph start", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
  const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
  setupEditorGeometry();
  editor.focus();
  await user.keyboard("{End}{Backspace}");
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "ข้อควา" }] })]) }), []));
});
```

Add a level-0 test that verifies Backspace is not intercepted and a heading test that verifies no `indentLevel` appears.

- [x] **Step 2: Run focused tests to verify RED**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "Backspace"`. Expected: the first-position test fails because Backspace has no indent handler.

- [x] **Step 3: Add the minimal Backspace shortcut**

```tsx
const atParagraphStart = $from.parentOffset === 0;

return {
  Backspace: () => {
    if (!isTopLevelCollapsedParagraph() || !atParagraphStart) return false;
    return changeIndent(-1, { allowBoundaryRelease: true });
  },
};
```

Implement the helper so it reads current selection at keypress time. For Backspace, level 0 returns `false`; otherwise create the same `setNodeMarkup` transaction used by Shift+Tab to decrement exactly the current paragraph.

- [x] **Step 4: Run focused tests to verify GREEN**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "Backspace"`. Expected: all new Backspace tests pass.

- [x] **Step 5: Run required verification**

Run `npm run test:content`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`. Expected: each command exits 0; if a command is blocked by unrelated uncommitted work, record exact diagnostics without changing those files.

- [x] **Step 6: Commit implementation**

Run `git add -- src/components/editor/extensions.ts src/components/editor/document-editor.test.tsx docs/superpowers/plans/2026-08-14-editor-indent-backspace.md` then `git commit -m "feat: reduce indent with backspace"`.
