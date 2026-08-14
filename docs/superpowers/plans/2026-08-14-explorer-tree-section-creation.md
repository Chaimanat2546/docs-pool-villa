# Explorer Tree Section Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Admin create root sections and contextual child sections from the File Explorer sidebar, defaulting each new section to the next sibling sort order.

**Architecture:** Keep all persistence in the existing `saveSection` Server Action. Extend the client-side tree with explicit creation intents that navigate to the established `mode=create-root` and `mode=create-child` URL states. `SectionPanel` derives the next order from already authorized explorer data and passes it to the existing inline form; no client input can bypass the existing server validation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, React Testing Library, Tailwind CSS, existing Server Actions.

## Global Constraints

- Preserve the existing two-level `doc_sections` hierarchy; never render a child-creation action for a child section.
- Root order is calculated among `parentId === null`; child order is calculated only among sections with the same parent ID; an empty sibling group starts at `0`.
- `sort_order` remains editable and is still validated server-side as a non-negative integer.
- Do not add a schema, migration, RLS, Auth, Cloudflare Worker, media-lifecycle, dependency, Staging, or Production change.
- Keep tree selection, expand/collapse, and creation as distinct accessible interactions, with visible Thai labels and 44px minimum touch targets.
- Preserve existing dirty-navigation and pending-media-operation safeguards.

---

## File map

- `src/components/admin/explorer/folder-tree.tsx` — renders the section hierarchy plus sidebar root/child creation controls and translates each control into existing URL navigation.
- `src/components/admin/explorer/folder-tree.test.tsx` — proves creation controls appear only at valid depths and navigate without selecting a tree item.
- `src/components/admin/explorer/section-inline-form.tsx` — accepts a caller-provided initial order for create modes while retaining the existing edit values.
- `src/components/admin/explorer/section-inline-form.test.tsx` — proves the inline form shows and submits its caller-provided default order.
- `src/components/admin/explorer/section-panel.tsx` — derives the next sibling order from `explorer.sections` and supplies it to root and child inline forms.
- `src/components/admin/explorer/section-panel.test.tsx` — proves root and child contexts calculate independent next orders and retain existing depth/pending-operation behavior.
- `docs/todo/admin-file-explorer.md` — records the completed UX follow-up and actual local verification results.

### Task 1: Make the inline form accept a calculated create-order default

**Files:**
- Modify: `src/components/admin/explorer/section-inline-form.tsx`
- Test: `src/components/admin/explorer/section-inline-form.test.tsx`

**Interfaces:**
- Consumes: existing `SectionMode`, `AdminExplorerSection`, and `saveSection(input)`.
- Produces: `SectionInlineForm` prop `initialSortOrder?: number`; callers in Task 3 provide it for create modes, while the form falls back to `0` until then and ignores it for `edit`.

- [ ] **Step 1: Write the failing tests**

Add `initialSortOrder={4}` to the existing root creation render and assert the advanced numeric input is `"4"` after opening `ตั้งค่าเพิ่มเติม`. Add a child-creation submission test with `initialSortOrder={7}` and assert the mock receives:

```ts
expect(saveSection).toHaveBeenCalledWith(expect.objectContaining({
  parentId: root.id,
  sortOrder: 7,
}));
```

Keep the existing edit test asserting `child.sortOrder`, proving the calculated create default cannot replace a persisted edit value.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/admin/explorer/section-inline-form.test.tsx
```

Expected: FAIL because `SectionInlineForm` does not yet accept `initialSortOrder` and new creation forms initialize `sortOrder` to `0`.

- [ ] **Step 3: Implement the minimal form change**

Extend `SectionInlineFormProps` with `initialSortOrder?: number`. Pass it to `initialFormState`, then set only create-mode state as follows:

```ts
return {
  title: "",
  slug: "",
  parentId: mode === "create-child" ? parent?.id ?? "" : "",
  sortOrder: String(initialSortOrder ?? 0),
  isPublished: true,
};
```

Keep edit state sourced from `section.sortOrder` and leave `saveSection` unchanged.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same Vitest command. Expected: PASS with all `SectionInlineForm` tests green.

- [ ] **Step 5: Commit the focused change**

```powershell
git add src/components/admin/explorer/section-inline-form.tsx src/components/admin/explorer/section-inline-form.test.tsx
git commit -m "feat: default new section order"
```

### Task 2: Add explicit creation actions to the sidebar tree

**Files:**
- Modify: `src/components/admin/explorer/folder-tree.tsx`
- Test: `src/components/admin/explorer/folder-tree.test.tsx`

**Interfaces:**
- Consumes: existing `FolderTreeProps.onNavigate(href: string)`.
- Produces: sidebar links/buttons that call `onNavigate("/admin/structure?mode=create-root")` or `onNavigate("/admin/structure?section=<root-id>&mode=create-child")`.

- [ ] **Step 1: Write the failing tests**

Add a test that expands `เริ่มต้น`, then asserts:

```ts
expect(screen.getByRole("button", { name: "สร้าง Sub-topic ใน เริ่มต้น" })).not.toBeNull();
expect(screen.queryByRole("button", { name: /สร้าง Sub-topic ใน การจอง/ })).toBeNull();
expect(screen.getByRole("button", { name: "สร้าง Topic" })).not.toBeNull();
```

Click the child action and root action separately. Assert the exact calls:

```ts
expect(navigate).toHaveBeenCalledWith("/admin/structure?section=root&mode=create-child");
expect(navigate).toHaveBeenCalledWith("/admin/structure?mode=create-root");
```

Assert neither click changes tree selection or invokes the root treeitem's selection navigation.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/admin/explorer/folder-tree.test.tsx
```

Expected: FAIL because neither labeled creation control exists.

- [ ] **Step 3: Implement the minimal tree controls**

Keep the existing `role="tree"` and treeitems unchanged. In the visible-tree render, after an expanded root's children, render a separate indented `button` with:

```tsx
type="button"
aria-label={`สร้าง Sub-topic ใน ${root.title}`}
onClick={() => onNavigate(`/admin/structure?section=${encodeURIComponent(root.id)}&mode=create-child`)}
className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium hover:bg-muted"
```

Render a separate final `สร้าง Topic` button below the tree, call `onNavigate("/admin/structure?mode=create-root")`, and use the same minimum-height/touch-target styling. Do not nest buttons inside a `treeitem`, and do not use the action to change `expandedKeys`, `focusedKey`, or selected section state.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same Vitest command. Expected: PASS; all existing Arrow-key, single-tree-tab-stop, and disclosure tests remain green.

- [ ] **Step 5: Commit the focused change**

```powershell
git add src/components/admin/explorer/folder-tree.tsx src/components/admin/explorer/folder-tree.test.tsx
git commit -m "feat: add sidebar section creation actions"
```

### Task 3: Derive independent root and child orders in the content panel

**Files:**
- Modify: `src/components/admin/explorer/section-panel.tsx`
- Modify: `src/components/admin/explorer/section-inline-form.tsx`
- Test: `src/components/admin/explorer/section-panel.test.tsx`
- Test: `src/components/admin/explorer/section-inline-form.test.tsx`

**Interfaces:**
- Consumes: `AdminExplorerData.sections`, `SectionInlineForm.initialSortOrder` from Task 1.
- Produces: `nextSectionSortOrder(sections: AdminExplorerSection[], parentId: string | null): number` local pure helper in `section-panel.tsx`.

- [ ] **Step 1: Write the failing panel tests**

Use the existing fixture, whose root has `sortOrder: 0` and child has `sortOrder: 0`. Add one root sibling with `parentId: null, sortOrder: 5` and one child sibling with `parentId: rootId, sortOrder: 8`. Render create-root and create-child modes, open each form's advanced settings, and assert:

```ts
expect(screen.getByRole("spinbutton", { name: "ลำดับ" })).toHaveValue(6);
// create-child under rootId
expect(screen.getByRole("spinbutton", { name: "ลำดับ" })).toHaveValue(9);
```

Add a no-sibling root fixture and assert its create-root input has value `0`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/admin/explorer/section-panel.test.tsx src/components/admin/explorer/section-inline-form.test.tsx
```

Expected: FAIL because `SectionPanel` does not calculate or pass a next sibling order.

- [ ] **Step 3: Implement the minimal order calculation and wiring**

Add this pure helper near the props in `section-panel.tsx`:

```ts
function nextSectionSortOrder(sections: AdminExplorerSection[], parentId: string | null): number {
  const siblingOrders = sections
    .filter((section) => section.parentId === parentId)
    .map((section) => section.sortOrder);
  return siblingOrders.length === 0 ? 0 : Math.max(...siblingOrders) + 1;
}
```

Calculate `rootNextSortOrder` with `null`, calculate `childNextSortOrder` with `selectedSection.id`, and pass the relevant number through every `SectionInlineForm` render. Preserve all existing form keys, cancel URLs, parent selection, pending-operation gates, and edit behavior.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run the same Vitest command. Expected: PASS for both suites with root, child, and empty-sibling default orders covered.

- [ ] **Step 5: Commit the focused change**

```powershell
git add src/components/admin/explorer/section-panel.tsx src/components/admin/explorer/section-panel.test.tsx src/components/admin/explorer/section-inline-form.tsx src/components/admin/explorer/section-inline-form.test.tsx
git commit -m "feat: sequence sidebar section creation"
```

### Task 4: Update work tracking and run the local verification gate

**Files:**
- Modify: `docs/todo/admin-file-explorer.md`

**Interfaces:**
- Consumes: completed Tasks 1–3 and their actual command outputs.
- Produces: a dated follow-up entry describing contextual tree creation, sibling-order defaults, and real local evidence.

- [ ] **Step 1: Update the follow-up record**

Add a dated entry stating that `สร้าง Topic` and `สร้าง Sub-topic` are available from the sidebar, forms select the intended parent, and new sections default to the next sibling `sort_order`. State explicitly that no schema, migration, RLS, Worker, remote, or deployment change occurred.

- [ ] **Step 2: Run focused Admin Explorer regression coverage**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/admin/explorer/folder-tree.test.tsx src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx
```

Expected: PASS with the new sidebar and order-default cases plus prior Explorer behavior.

- [ ] **Step 3: Run required broader local checks**

Run:

```powershell
npm run test:admin-shell
npm run test:content
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: every command exits `0`; record any pre-existing, documented Next/OpenNext warnings without calling them a pass/fail change from this task.

- [ ] **Step 4: Perform a local manual accessibility check**

With a locally authenticated Admin session if available, check Desktop and 390px mobile drawer: actions are visible at valid depths, touch/click starts the intended form, focus moves to `ชื่อหมวด`, a child section exposes no child creation, and no horizontal overflow or console error appears. If no authenticated local session exists, record that limitation and do not create or modify remote fixtures.

- [ ] **Step 5: Commit the tracking and verification record**

```powershell
git add docs/todo/admin-file-explorer.md
git commit -m "docs: record sidebar section creation"
```
