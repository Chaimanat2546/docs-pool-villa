# Remove Table Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove table authoring, validation, rendering, and editor dependencies from Poolvilla Docs.

**Architecture:** Tables become unsupported content. The Tiptap editor no longer registers table nodes or shows a table command; server-side validation rejects saved table JSON; the public renderer ignores legacy table nodes and their descendants. No database migration changes historical JSON documents.

**Tech Stack:** Next.js 16, React 19, Tiptap 3, TypeScript, Vitest, npm.

## Global Constraints

- Preserve the user's uncommitted YouTube normalization changes in `src/lib/docs/content.ts` and its test.
- Do not modify the database, Supabase, Cloudflare, or production environment.
- Use `npm` and keep `package-lock.json` synchronized.
- Existing documents containing tables are not migrated; their table content is intentionally omitted by the public renderer.

---

### Task 1: Lock removal behavior with tests

**Files:**
- Modify: `src/components/editor/document-editor.test.tsx`
- Modify: `src/lib/docs/content.test.ts`
- Modify: `src/components/public/document-content.test.tsx`

**Interfaces:**
- Consumes: `DocumentEditor`, `validateDocumentContent`, and `DocumentContent`.
- Produces: regression coverage that fails while table authoring, validation, or rendering remains enabled.

- [ ] **Step 1: Write failing tests**

```tsx
expect(screen.queryByRole("button", { name: "ตาราง" })).toBeNull();
```

```ts
expect(validateDocumentContent({ type: "doc", content: [{ type: "table", content: [] }] }, "persisted").ok).toBe(false);
```

```tsx
expect(screen.queryByRole("table")).toBeNull();
```

- [ ] **Step 2: Run the focused test suite and verify it fails**

Run: `npm run test:content -- --runInBand`

Expected: failures because the table toolbar button remains, validation accepts `table`, and the public renderer creates a `<table>`.

### Task 2: Remove table support from the editor and content boundary

**Files:**
- Modify: `src/components/editor/document-editor.tsx`
- Modify: `src/components/editor/extensions.ts`
- Modify: `src/lib/docs/content.ts`
- Modify: `src/components/public/document-content.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the regression tests from Task 1.
- Produces: an editor without table commands, a validator that rejects table nodes, and a renderer that drops legacy table content.

- [ ] **Step 1: Remove table editor registration and controls**

Delete the `TableKit` import and configuration, the slash command whose `title` is `"ตาราง"`, the `Table2` icon import, and the toolbar button whose label is `"ตาราง"`.

- [ ] **Step 2: Reject table JSON at the server boundary**

Delete `table`, `tableRow`, `tableHeader`, and `tableCell` from `allowedNodes`; remove the matching entries from `allowedChildren`.

- [ ] **Step 3: Omit legacy table nodes from the public renderer**

Replace the table-related renderer cases with `case "table": return null;` so table descendants are not recursively rendered.

- [ ] **Step 4: Remove unused table styling**

Delete `.doc-table`, `.doc-table-wrap`, and `.doc-table td, .doc-table th` rules from `src/app/globals.css`.

### Task 3: Remove unused dependency and verify

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/Poolvilla-Docs-Requirements-TH-v1.2.md`
- Modify: `docs/todo/M03-editor-media.md`

**Interfaces:**
- Consumes: table removal from Task 2.
- Produces: no runtime dependency or requirement/TODO claim that Docs supports tables.

- [ ] **Step 1: Remove the package**

Run: `npm uninstall @tiptap/extension-table`

- [ ] **Step 2: Update documentation**

Remove `Table` from the supported content lists in the requirements baseline and amend the M03 node checklist to explicitly record the post-closeout removal decision.

- [ ] **Step 3: Run verification**

Run: `npm run test:content`, `npm run test:public`, `npm run lint`, and `npm run build`.

Expected: all commands exit with code 0; tests demonstrate there is no table control, validation rejects table JSON, and public reading omits table nodes.
