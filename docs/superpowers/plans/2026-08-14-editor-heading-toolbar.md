# Editor Heading Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible H2 and H3 formatting controls to the document editor toolbar.

**Architecture:** Reuse the existing Tiptap `toggleHeading` commands and `useEditorState` pattern. The buttons stay in `DocumentEditor`; no schema, serialization, slash command, or public-rendering change is needed.

**Tech Stack:** Next.js 16.3.0, React 19, TypeScript, Tiptap 3, Vitest, Testing Library.

## Global Constraints

- Keep the document title as the page-level H1; the editor only supports H2 and H3.
- Preserve the existing H2/H3 schema, slash commands, TOC behavior, and persistence format.
- Use the existing `ToolbarButton` component with Thai labels `หัวข้อ 2` and `หัวข้อ 3`.
- Do not touch the unrelated authentication changes.

---

### Task 1: Add and verify heading toolbar controls

**Files:**
- Modify: `src/components/editor/document-editor.tsx`
- Test: `src/components/editor/document-editor.test.tsx`

**Interfaces:**
- Consumes: `current.isActive("heading", { level: 2 | 3 })` and `editor.chain().focus().toggleHeading({ level: 2 | 3 }).run()`.
- Produces: labelled `ToolbarButton` controls that emit `{ type: "heading", attrs: { level: 2 | 3 } }` JSON after a click.

- [x] **Step 1: Write the failing H2 test**

```tsx
it("changes the current block to a level 2 heading from the toolbar", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "หัวข้อ" }] }] }} onChange={onChange} />);
  await user.click(await screen.findByRole("button", { name: "หัวข้อ 2" }));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: [expect.objectContaining({ type: "heading", attrs: { level: 2 } })] }), []));
});
```

- [x] **Step 2: Run the H2 test to verify it fails**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "changes the current block to a level 2 heading from the toolbar"`. Expected: FAIL because `หัวข้อ 2` does not exist.

- [x] **Step 3: Write the failing H3 test**

```tsx
it("changes the current block to a level 3 heading from the toolbar", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "หัวข้อย่อย" }] }] }} onChange={onChange} />);
  await user.click(await screen.findByRole("button", { name: "หัวข้อ 3" }));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: [expect.objectContaining({ type: "heading", attrs: { level: 3 } })] }), []));
});
```

- [x] **Step 4: Run the H3 test to verify it fails**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "changes the current block to a level 3 heading from the toolbar"`. Expected: FAIL because `หัวข้อ 3` does not exist.

- [x] **Step 5: Implement the minimal toolbar additions**

```tsx
heading2: current.isActive("heading", { level: 2 }),
heading3: current.isActive("heading", { level: 3 }),
<ToolbarButton label="หัวข้อ 2" active={toolbarState.heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
<ToolbarButton label="หัวข้อ 3" active={toolbarState.heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
```

Import `Heading2` and `Heading3`, add false defaults to `toolbarState`, and position the buttons after italic and before list controls.

- [x] **Step 6: Run focused tests to verify both pass**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "heading from the toolbar"`. Expected: PASS for both tests.

- [x] **Step 7: Run required validation**

Run `npm run test:content`, `npx tsc --noEmit`, `npm run lint`, and `git diff --check`. Expected: each exits 0.

- [x] **Step 8: Commit the implementation**

Run `git add -- src/components/editor/document-editor.tsx src/components/editor/document-editor.test.tsx docs/superpowers/plans/2026-08-14-editor-heading-toolbar.md` then `git commit -m "feat: add editor heading toolbar"`.
