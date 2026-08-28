# Sidebar Section Creation Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Thai sidebar actions for creating a root section and a child section under every root section.

**Architecture:** `FolderTree` already builds root nodes from `childSectionsByParent`. The creation-action list will consume that complete root list instead of the expansion-filtered visible nodes. Tests assert the visible labels and preserve the existing navigation contracts.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Keep the two-level section limit and all existing URLs unchanged.
- Do not change schema, RLS, migration, remote data, or deployment.
- Use Thai UI and accessible labels.

---

### Task 1: Correct sidebar creation actions

**Files:**
- Modify: `src/components/admin/explorer/folder-tree.test.tsx`
- Modify: `src/components/admin/explorer/folder-tree.tsx`

**Interfaces:**
- Consumes: `AdminExplorerSection[]` with root sections where `parentId === null`.
- Produces: buttons labeled `สร้างหมวดย่อยใน {title}` and `สร้างหมวดหลัก` that use the existing structure URLs.

- [x] **Step 1: Update the failing test labels**

```tsx
screen.getByRole("button", { name: "สร้างหมวดย่อยใน เริ่มต้น" });
screen.getByRole("button", { name: "สร้างหมวดหลัก" });
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/folder-tree.test.tsx`

Expected: FAIL because actions are still derived from only expanded root nodes.

- [x] **Step 3: Implement the minimal source correction**

```tsx
const rootSections = childSectionsByParent.get(null) ?? [];
```

Render child-creation actions from `rootSections`, preserving the existing `section` query parameter and `mode=create-child`.

- [x] **Step 4: Run focused and regression tests**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/folder-tree.test.tsx src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx && npm run test:admin-shell && npm run test:content`

Expected: all selected tests pass.
