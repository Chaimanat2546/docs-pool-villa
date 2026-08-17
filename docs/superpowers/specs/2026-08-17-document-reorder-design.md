# Document Reorder by Drag and Drop Design

**Status:** Approved in conversation on 2026-08-17

**Scope:** Admin File Explorer document ordering within one selected section

## Context

`/admin/structure?section=<section-id>` is the canonical Admin File Explorer. Its normal document list currently paginates four rows at a time. Documents already have a non-negative `sort_order`, and the existing Admin-only `doc_reorder_documents(section_id, document_ids)` RPC validates that the submitted IDs are the complete, duplicate-free set for one section and updates the whole order atomically.

Dragging only the visible page would make it impossible to place a document relative to items on another page. This follow-up uses the existing database boundary and changes only the Admin UI and its focused tests.

## Goals

1. Let an Admin arrange every document in a selected section by drag and drop.
2. Save the intended order once, explicitly, after one or more moves.
3. Keep normal browsing, search, status filtering, and pagination unchanged outside reorder mode.
4. Preserve the current order on cancel or any save failure.

## Non-goals

- Reordering sections or moving a document between sections.
- Reordering from the virtual root, search results, or a status-filtered result set.
- Saving after each drag, autosave, bulk editing, schema/RLS/RPC changes, or deployments.
- A keyboard alternative for changing document order. The requested scope is pointer drag-and-drop only; ordinary controls still retain visible focus and accessible labels.

## Selected UX

For a real selected section, the normal paginated document list adds an explicit **จัดลำดับเอกสาร** action.

1. The Admin selects one real section in the Folder Tree.
2. Activating the action enters reorder mode for that exact section.
3. Reorder mode renders every direct document of the section in a single list, without pagination, filtering, or search. Each row has a clear drag handle and document title/status for orientation.
4. Pointer or touch drag updates only browser state and exposes the **บันทึกลำดับ** and **ยกเลิก** actions.
5. **ยกเลิก** discards browser state and returns to the existing paginated list.
6. **บันทึกลำดับ** sends the complete ordered ID list to the existing server boundary. On success, the page returns to normal list mode with the new order. On failure, it stays in reorder mode with the dragged arrangement intact and presents a retryable error.

The action is unavailable for the virtual root and while a search query or status filter is active, since neither state represents the complete contents of exactly one section. The UI explains why rather than silently changing scope.

## Component and data boundaries

`DocumentList` owns list/reorder-mode presentation and local draft order only. A small, focused reorder client component may own drag state if it keeps the standard list component readable.

The existing validated Admin Server Action calls `doc_reorder_documents(selectedSectionId, orderedIds)`. No client-supplied section or ID list is trusted without the existing server authorization and RPC validation. The RPC is transactional: every direct document receives its new sequential `sort_order`, or no document changes.

After success, the same cache/path refresh contract used by document mutations refreshes the Explorer list and any public ordering consumer. No cache invalidation occurs on drag, cancel, or failed save.

## Error handling

- Reorder mode cannot start without a valid real selected section or when list filters would make the dataset incomplete.
- While saving, disable Save/Cancel and prevent duplicate submissions.
- A rejected, stale, unauthorized, or network-failed save preserves the local order and shows a user-safe retry message.
- Refreshing or leaving before Save deliberately discards the unsaved order; no data has changed.
- If the section or its document set changed concurrently, surface the existing server error and require reload rather than attempting a partial merge.

## Accessibility and responsive behavior

- Drag handles and actions have Thai accessible names, visible focus, and adequate touch targets.
- This approved scope intentionally does not provide keyboard reordering controls. Keyboard users can still navigate ordinary Admin controls, but cannot change order through this feature.
- At 390px, the full reorder list remains one column with no horizontal page overflow; the Save/Cancel actions remain reachable.

## Verification

Focused component/action tests cover:

- entry only for a real selected section with unfiltered list state;
- all documents of a multi-page section shown in reorder mode;
- local drag changes order without a server call;
- Save submits the complete ordered ID list once and returns to normal mode on success;
- Cancel, failure, and concurrency/error states retain or restore the expected UI state;
- virtual root/filter restrictions, pending state, accessible labels, focus, and mobile layout.

Run the smallest relevant Admin/content tests first, then TypeScript, lint, and build. No database migration is needed; existing database/RLS coverage for `doc_reorder_documents` remains the authorization and atomicity proof.

## Acceptance criteria

1. An Admin can drag all direct documents in one selected section, including documents normally on different pages.
2. The database order changes only when **บันทึกลำดับ** succeeds.
3. Cancel and failed saves leave persisted order untouched.
4. Reordering never crosses section boundaries and cannot operate from a partial list.
5. Existing normal-list pagination and filters continue to work outside reorder mode.
