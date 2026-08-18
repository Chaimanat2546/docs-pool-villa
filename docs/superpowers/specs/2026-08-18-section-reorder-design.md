# Section Reorder by Drag and Drop Design

**Status:** Approved in conversation on 2026-08-18

**Scope:** Admin File Explorer ordering for root sections and for child sections within their existing root section.

## Context

`doc_sections.sort_order` already defines the order used by the Admin Explorer and Public navigation.  The Explorer already has an explicit document-reorder mode built with `@dnd-kit`, but its Folder Tree is navigation-only and no database RPC can atomically save an ordered set of sections.

Moving a child section to a different root would change its documents' public paths and require redirect handling.  This follow-up deliberately excludes that behavior: it changes only `sort_order`, never `parent_id`, section slugs, documents, media, or redirects.

## Goals

1. Let an Admin reorder all root sections and all child sections of one selected root.
2. Keep each section inside its present sibling group.
3. Save a complete group order atomically, only after the Admin explicitly chooses to save.
4. Reuse the established document-reorder interaction and cache-refresh contract.

## Non-goals

- Moving a child section between roots, changing nesting depth, or changing `parent_id`.
- Reordering sections from the Folder Tree itself, from search/filter results, or while a media lifecycle operation is pending.
- Autosave, saving each drag, changing document order, or changing any public URL/redirect.
- Staging, Production, Worker, or deployment activity.

## Selected UX

The normal Folder Tree remains a stable, keyboard-navigable navigation control.  Reorder happens in an explicit main-panel mode so selection, disclosure, creation controls, and drag controls do not compete in one tree row.

1. At the virtual root (`/admin/structure`), the panel offers **จัดลำดับหมวดหลัก** when there are at least two root sections.
2. When a root section is selected, the panel offers **จัดลำดับหมวดย่อย** when it has at least two direct child sections.
3. A selected child section does not expose the action, because its sibling group is owned by its root; the Admin returns to that root to arrange the group.
4. Entering reorder mode renders every member of the exact sibling group in one list, independent of the normal tree disclosure state.  Each row identifies the section and has a 44px drag handle.
5. Pointer, touch, and keyboard drag update local draft order only.  The list provides Thai screen-reader instructions and live announcements; the keyboard sensor follows the standard pick-up/move/drop interaction.
6. **บันทึกลำดับ** submits the complete ordered ID list once.  **ยกเลิก** discards the draft and restores normal panel mode.
7. During save, while any pending section-media operation exists, or while another action makes mutations unavailable, reorder controls are disabled.  The existing pending-media explanation remains the source of truth.

No drag target is rendered outside the active sibling list, so cross-root and root/child drops cannot occur.

## Data and server boundary

Add an imperative migration that creates `public.doc_reorder_sections(p_parent_id uuid, p_section_ids uuid[])`.

- The function is `SECURITY INVOKER`, uses a pinned `pg_catalog` search path, and checks `doc_private.doc_is_admin()`.
- It rejects null/empty or duplicate ID arrays and validates that the submitted IDs are the exact current set whose `parent_id IS NOT DISTINCT FROM p_parent_id`.
- It acquires a transaction-scoped advisory lock before validating and writing.  A stale or concurrently changed group fails rather than partially merging.
- One `UPDATE ... FROM unnest(... ) WITH ORDINALITY` assigns sequential `sort_order` values starting at zero.  PostgreSQL rolls back the complete function call on any error.
- Execute is revoked from `PUBLIC`, `anon`, and `service_role`, then granted only to `authenticated`, matching the existing Docs RPC pattern.  RLS remains enabled and unchanged.

The new Server Action accepts only a UUID-or-null parent ID and a non-empty, duplicate-free UUID array.  It calls `requireAdmin()`, invokes the RPC, maps all database errors to a safe retry message, and only on success revalidates `/admin/structure` plus the shared Public Docs cache.  Client input is never trusted as authorization or as a partial group definition.

## Components and state

`SectionPanel` decides which sibling group is eligible and owns transitions between normal and reorder mode.  A focused `SectionReorderList` component mirrors the existing `DocumentReorderList`:

- receives a parent ID and the complete ordered sibling data;
- owns only local draft order and pending-save state;
- uses the installed `@dnd-kit/core` and `@dnd-kit/sortable` packages, so no dependency is added;
- calls the new action on explicit save and keeps the draft intact on an error;
- calls the existing navigation/refresh path after success so the refreshed server tree becomes canonical.

The Folder Tree receives no drag behavior.  Its current roving focus, expanded-state behavior, and creation actions therefore remain unchanged outside reorder mode.

## Error handling and concurrency

- Invalid input, unauthorized access, a changed sibling set, RPC failure, and network failure do not change persisted order and show a user-safe error toast.
- Save is single-flight; Save and Cancel are disabled while it is pending.
- Reloading, navigating away, or cancelling before a successful save deliberately discards only the browser draft.
- A successful save refreshes all public ordering consumers.  Dragging, cancelling, and failed saves do not invalidate cache.

## Verification

### Database / pgTAP

- Admin can reorder a complete root group and a complete child group; resulting orders are zero-based and sequential.
- Guest and non-admin cannot execute the RPC or update Docs section order.
- Duplicate, incomplete, mixed-parent, and stale/invalid inputs fail without changing any member's order.
- Existing Docs section, document, and media lifecycle tests remain green.

### Server action and UI

- Input parsing, Admin authorization, RPC arguments, error mapping, and success-only cache invalidation.
- Root action appears only for a complete multi-root group; child action only for a selected root with multiple children; no action for a selected child or one-item group.
- Drag and keyboard reorder change only local state; Save submits one complete ordered ID list; Cancel and failed save retain the expected persisted/draft state.
- Cross-level/cross-parent placement is impossible by construction; pending media operations block entry and save.
- Accessible names, visible focus, Thai live announcements, 44px controls, touch interaction, and 390px no-horizontal-overflow behavior.

Run focused section reorder/action tests and `npm run test:db` first; then TypeScript, `npm run lint`, `npm run build`, and `git diff --check`.  Any remote migration or deployment requires separate approval from ภู after Local validation.

## Acceptance criteria

1. An Admin can explicitly enter and save ordering for root sections and for a root's direct child sections.
2. A reorder modifies only `sort_order`; each section's `parent_id`, routes, documents, media, and redirects are unchanged.
3. Each successful request validates and updates the full sibling group atomically; failures leave all persisted orders unchanged.
4. The normal Folder Tree and Public navigation show the refreshed order after save.
5. The feature remains usable with pointer, touch, and keyboard interaction without regressing the existing tree controls.
