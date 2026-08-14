# Admin Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop Admin Sidebar collapsible to icons while retaining the choice in the browser.

**Architecture:** `AdminShell` owns a client-only collapsed state. It writes the boolean preference to `localStorage` after a toggle and reads it after mount to avoid server/client rendering differences. The mobile drawer remains unchanged.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Store the preference only as `admin-sidebar-collapsed` in browser `localStorage`.
- Do not modify database, Auth, RLS, routes, or mobile drawer behavior.
- Collapsed icon-only controls must retain accessible names.

---

### Task 1: Test and implement collapsed desktop Sidebar

**Files:**
- Modify: `src/components/admin/admin-shell.test.tsx`
- Modify: `src/components/admin/admin-shell.tsx`

**Interfaces:**
- Consumes: `window.localStorage.getItem("admin-sidebar-collapsed")`
- Produces: Desktop Sidebar toggle that writes `"true"` or `"false"` to the same key.

- [ ] **Step 1: Write failing tests**

Add tests that render the expanded title, click the Sidebar collapse toggle, confirm the title is hidden while accessible icon-only navigation remains, and confirm the local-storage key updates.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test:admin-shell`

Expected: FAIL because `AdminShell` has no collapse toggle or persisted collapsed state.

- [ ] **Step 3: Write minimal implementation**

Use mounted client state in `AdminShell`, change only the desktop `<aside>` width and its label visibility, and preserve existing mobile drawer markup and unsaved navigation callbacks.

- [ ] **Step 4: Run focused test, lint, and build**

Run: `npm run test:admin-shell`, `npm run lint`, and `npm run build`.

- [ ] **Step 5: Verify the diff**

Run: `git diff --check`.
