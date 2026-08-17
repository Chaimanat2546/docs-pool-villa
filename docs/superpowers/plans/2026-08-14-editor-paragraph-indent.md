# Editor Paragraph Indent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Tab and Shift+Tab adjust ordinary paragraph indentation from level 0 through 3.

**Architecture:** Replace only Tiptap's paragraph node with an extension that persists an `indentLevel` attribute and owns keyboard handling. The content validator permits only the defined integer range, while the public reader maps persisted levels to a paragraph `data-indent-level` attribute that shared CSS renders in the editor and reader.

**Tech Stack:** Next.js 16.3.0, React 19, TypeScript, Tiptap 3, Vitest, Testing Library, Tailwind CSS 4.

## Global Constraints

- Indentation applies only to paragraph nodes, at levels 0, 1, 2, and 3.
- `Tab` increments and `Shift+Tab` decrements exactly one level; both stop at the range boundary.
- H2/H3, lists, callouts, quotes, code blocks, images, and embeds retain existing keyboard behavior.
- Persist indentation in document JSON and render it in both Admin Editor and public reader.
- Use 2rem, 4rem, and 6rem desktop offsets; narrow screens use proportional smaller offsets.
- Do not touch unrelated authentication files.

---

### Task 1: Validate and render persisted paragraph indent levels

**Files:**
- Modify: `src/lib/docs/content.ts`
- Modify: `src/lib/docs/content.test.ts`
- Modify: `src/components/public/document-content.tsx`
- Modify: `src/components/public/document-content.test.tsx`

**Interfaces:**
- Consumes: paragraph JSON attributes shaped as `{ indentLevel: 0 | 1 | 2 | 3 }`.
- Produces: validation rejection for malformed/out-of-range paragraph indent attributes, and `<p data-indent-level="N">` for non-zero valid public paragraphs.

- [x] **Step 1: Write failing validation and public-rendering tests**

```tsx
it("accepts only paragraph indent levels from 0 through 3", () => {
  expect(validateDocumentContent({ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 3 }, content: [{ type: "text", text: "เยื้อง" }] }] }, "persisted").ok).toBe(true);
  expect(validateDocumentContent({ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 4 }, content: [{ type: "text", text: "เกิน" }] }] }, "persisted").ok).toBe(false);
});

it("renders a persisted paragraph indentation level", () => {
  render(<DocumentContent content={{ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 2 }, content: [{ type: "text", text: "เยื้อง" }] }] }} />);
  expect(screen.getByText("เยื้อง").closest("p")?.getAttribute("data-indent-level")).toBe("2");
});
```

- [x] **Step 2: Run tests to verify they fail**

Run `npm run test:content`. Expected: the out-of-range paragraph is incorrectly accepted and the public paragraph has no `data-indent-level` attribute.

- [x] **Step 3: Implement validation and public render support**

```tsx
case "paragraph":
  return attrs.indentLevel === undefined || (Number.isInteger(attrs.indentLevel) && attrs.indentLevel >= 0 && attrs.indentLevel <= 3)
    ? null
    : "ระดับการเยื้องย่อหน้าไม่ถูกต้อง";

case "paragraph": {
  const indentLevel = node.attrs?.indentLevel;
  return <p {...(indentLevel === 1 || indentLevel === 2 || indentLevel === 3 ? { "data-indent-level": indentLevel } : {})}>{children}</p>;
}
```

- [x] **Step 4: Run tests to verify they pass**

Run `npm run test:content`. Expected: all content tests pass, including the new validation and reader cases.

### Task 2: Persist Tab-based editor indentation and style it responsively

**Files:**
- Modify: `src/components/editor/extensions.ts`
- Modify: `src/components/editor/document-editor.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: current Tiptap editor selection and the paragraph `indentLevel` attribute.
- Produces: `Tab`/`Shift+Tab` keyboard shortcuts that update only current paragraph JSON and shared `data-indent-level` styling.

- [x] **Step 1: Write failing keyboard behavior tests**

```tsx
it("increases a paragraph indent with Tab and limits it to level 3", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
  const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
  setupEditorGeometry();
  editor.focus();
  await user.keyboard("{Tab}{Tab}{Tab}{Tab}");
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 3 } })]) }), []));
});

it("decreases a paragraph indent with Shift+Tab", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "paragraph", attrs: { indentLevel: 1 }, content: [{ type: "text", text: "ข้อความ" }] }] }} onChange={onChange} />);
  const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
  setupEditorGeometry();
  editor.focus();
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ content: expect.arrayContaining([expect.objectContaining({ type: "paragraph", attrs: { indentLevel: 0 } })]) }), []));
});

it("does not indent a heading when Tab is pressed", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DocumentEditor content={{ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "หัวข้อ" }] }] }} onChange={onChange} />);
  const editor = document.querySelector<HTMLElement>(".ProseMirror")!;
  setupEditorGeometry();
  editor.focus();
  await user.keyboard("{Tab}");
  expect(onChange).not.toHaveBeenCalled();
});
```

- [x] **Step 2: Run tests to verify they fail**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "paragraph indent"`. Expected: FAIL because no paragraph extension handles Tab/Shift+Tab.

- [x] **Step 3: Implement the custom paragraph extension**

```tsx
export const DocsParagraph = Paragraph.extend({
  addAttributes() {
    return { ...this.parent?.(), indentLevel: { default: 0, parseHTML: (element) => Number(element.getAttribute("data-indent-level")) || 0, renderHTML: (attributes) => attributes.indentLevel > 0 ? { "data-indent-level": attributes.indentLevel } : {} };
  },
  addKeyboardShortcuts() {
    const changeIndent = (delta: 1 | -1) => {
      if (!this.editor.isActive("paragraph")) return false;
      const current = Number(this.editor.getAttributes("paragraph").indentLevel) || 0;
      const next = Math.max(0, Math.min(3, current + delta));
      if (next === current) return true;
      return this.editor.commands.updateAttributes("paragraph", { indentLevel: next });
    };
    return { Tab: () => changeIndent(1), "Shift-Tab": () => changeIndent(-1) };
  },
});
```

Configure `StarterKit` with `paragraph: false`, then add `DocsParagraph` to `docsExtensions`. Add shared CSS selectors for levels 1–3, and a narrow-screen media query with reduced proportional offsets.

Add this local test helper before the tests that use keyboard shortcuts:

```tsx
function setupEditorGeometry() {
  const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) };
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
}
```

- [x] **Step 4: Run focused editor tests to verify they pass**

Run `npx vitest --config vitest.config.mts run src/components/editor/document-editor.test.tsx -t "paragraph indent"`. Expected: all new keyboard tests pass.

- [x] **Step 5: Run required verification**

Run `npm run test:content`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`. Expected: every command exits 0.

- [x] **Step 6: Commit the implementation**

Run `git add -- src/lib/docs/content.ts src/lib/docs/content.test.ts src/components/public/document-content.tsx src/components/public/document-content.test.tsx src/components/editor/extensions.ts src/components/editor/document-editor.test.tsx src/app/globals.css docs/superpowers/plans/2026-08-14-editor-paragraph-indent.md` then `git commit -m "feat: add paragraph indentation"`.
