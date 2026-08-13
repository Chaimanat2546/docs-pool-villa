# Admin File Explorer Design

**Status:** Approved in conversation on 2026-08-14

**Scope:** Admin information architecture and document/section management UX

**Selected direction:** A — two-pane Folder Tree + Folder Contents

## Context

The current Admin separates section management from document management. An Admin must create a section in one page, move to another page to create a document, and remember which section the document belongs to. Some controls also fail to provide visible feedback when activated, which makes the workflow feel broken even when the underlying operation is available.

This design combines the existing section and document capabilities into one File Explorer-style workspace. Clicking a section establishes the context for listing, creating, and editing documents. The design preserves the existing data model, authorization boundary, media lifecycle, and destructive-operation safety.

Requirement baselines:

- [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)
- [Design system](../../../DESIGN.md)
- Existing M01–M06 behavior and safety constraints documented in `docs/todo/`

## Goals

1. Let an Admin select a section like a folder and create a document in that section immediately.
2. Keep the selected section visible throughout list, create, edit, preview, and cancel flows.
3. Merge section structure and document list management into one primary Admin workspace.
4. Make every control produce immediate, perceivable feedback.
5. Serve both first-time and frequent Admin users without adding an advanced-only interface.
6. Preserve keyboard, focus, responsive, authorization, media, and deletion guarantees.

## Non-goals

- No database schema, migration, RLS, Auth, or legacy-system change.
- No Cloudflare Worker, R2 protocol, or media lifecycle change.
- No drag and drop, bulk actions, media library, document reuse, or third section depth.
- No autosave. Existing explicit save and conflict behavior remains authoritative.
- No removal of the Editor Sandbox; it remains a secondary testing tool.
- No Staging or Production deployment without separate approval.

## Chosen approach

The primary Admin content workspace uses two panes:

- **Left pane:** section folder tree.
- **Right pane:** the selected section header and its document contents, or the active create/edit flow.

This direction was chosen after comparing:

- A: two-pane tree + contents — selected.
- B: three-pane tree + list + editor — rejected because it is too dense for Thai labels, tablets, and mobile.
- C: documents nested in the tree — rejected because the tree becomes long and noisy as document count grows.

## Information architecture

### Admin navigation

The primary Admin navigation item is **จัดการเนื้อหา**. It replaces the two peer navigation items **โครงสร้าง** and **เอกสาร** because both capabilities now live in the same workspace.

The Editor Sandbox remains available as a less prominent secondary navigation item. Existing links for viewing the public website and logging out remain in the Admin shell.

### Routes

- `/admin` continues to enter the Admin content workspace.
- `/admin/structure` is the canonical File Explorer workspace to preserve the existing entry route.
- `/admin/documents` redirects to `/admin/structure`.
- `/admin/structure?section=<section-id>` records the selected section in the URL.
- `/admin/documents/new?section=<section-id>` opens document creation inside the shared workspace shell.
- `/admin/documents/<document-id>` opens document editing inside the shared workspace shell and derives the selected section from the document.
- `/admin/editor` remains the separate Editor Sandbox.

The selected section must be URL-addressable so refresh, bookmark, browser Back, and browser Forward preserve context. Invalid, missing, deleted, or unauthorized section identifiers fall back to the virtual root and show a clear notice; they must never select an arbitrary section silently.

### Virtual root

The tree contains a virtual root named **คู่มือทั้งหมด**.

- Selecting it shows every document and includes a section column in the list.
- Selecting a real section shows only documents directly assigned to that section.
- Folder counts represent direct documents so the number matches the contents pane. The virtual root count represents all documents.

## Workspace layout

### Desktop and tablet

The left folder pane and right workspace pane share the available Admin content width. The folder pane can be resized only within bounded minimum and maximum widths so it cannot hide either pane.

The folder pane contains:

- **เพิ่มหมวดหลัก** action.
- Expand/collapse controls independent from folder selection.
- The virtual root, root sections, and one level of child sections.
- Direct-document counts.
- A visible selected state.

The right pane contains:

- Breadcrumb.
- Selected section name and direct-document count.
- Section actions: add child, rename, reorder, and delete.
- Primary **สร้างเอกสารในหมวดนี้** action for a real section.
- Search and status filter.
- Document list, empty state, loading state, error state, or create/edit flow.

### Mobile

The folder tree becomes a modal drawer opened by a visible **เลือกหมวด** button. The current section name remains visible above the document content when the drawer is closed.

The drawer uses the existing accessible dialog pattern: modal focus containment, Escape and explicit close support, and focus return to the trigger. The content pane displays one list/create/edit view at a time without horizontal overflow.

## Component boundaries

### `AdminContentWorkspace`

Owns URL-derived selection and the current right-pane mode. It coordinates the other components but does not implement section mutations or editor internals.

### `FolderTree`

Renders hierarchy, expansion, selection, and direct-document counts. It exposes selection and action intents through explicit callbacks. It does not fetch or mutate documents.

### `FolderHeader`

Renders breadcrumb, selected section metadata, and labeled section actions. It prevents unsupported actions and explains why they are unavailable.

### `SectionInlineForm`

Handles root/child creation and rename. Opening the form moves focus to the name field. Closing returns focus to the initiating control.

### `DocumentList`

Renders documents for the current selection, search, and status filter. It exposes create/edit/preview intents and does not own the Editor.

### `DocumentWorkspace`

Hosts the three document stages and the existing Editor/Preview capabilities. It preserves explicit-save, optimistic-concurrency, media, and cleanup behavior.

### Existing mutation boundaries

Existing validated Server Actions, RPCs, RLS, and media operations remain the source of truth. UI components must call those boundaries rather than duplicate business rules in the browser.

## Section workflows

### Create a root section

1. Admin activates **เพิ่มหมวดหลัก**.
2. An inline form appears immediately and focuses the section name field.
3. Submit shows an in-place pending state and prevents duplicate submission.
4. Success selects the new section, updates the URL, and shows its empty state.
5. Failure keeps the entered value and renders the actionable error beside the form.

### Create a child section

1. Admin selects a root section.
2. Admin activates **เพิ่มหมวดย่อย**.
3. The inline form identifies the selected parent explicitly.
4. Success selects the new child and exposes **สร้างเอกสารแรก**.

If a child section is selected, creating another child is disabled with the explanation **รองรับหมวดไม่เกิน 2 ระดับ**. The interface must not render an apparently active control that does nothing.

### Rename, reorder, and delete

These actions remain contextual to the selected section. Reorder uses explicit controls rather than drag and drop. Delete uses the existing confirmation and fail-closed media/data lifecycle. The UI removes nothing until the server confirms success.

## Document workflows

### List and find documents

- A real section lists its directly assigned documents.
- The virtual root lists all documents with their section paths.
- Search applies within the current selection.
- Status filtering applies within the current selection.
- Empty search results are distinct from an empty section.

Each document row shows at least title, status, last update, and labeled actions for edit and preview. Status cannot be communicated by color alone.

### Create a document

A document can be created only after a real section is selected.

1. **ข้อมูลเอกสาร:** title, slug, and the selected section path. The section is preselected from the URL and remains changeable before initial creation. **สร้างฉบับร่างและเขียนต่อ** creates the draft.
2. **เขียนเนื้อหา:** the existing content Editor and image flow. **บันทึกและตรวจต่อ** uses the existing explicit-save boundary before advancing.
3. **ตรวจและเผยแพร่:** Preview, status selection, and the final explicit save/publish action.

Submitting stage 1 creates the draft through the existing validated boundary. On success, the URL changes to the edit route and stage 2 opens without losing the folder selection. On failure, stage-1 input remains intact. There is no autosave.

If the new-document route lacks a valid real section, the right pane asks the Admin to choose a section; it must not assign the document to an arbitrary default.

### Edit, cancel, and return

Editing derives the selected section from the document and keeps that section highlighted. Final save/publish or cancel returns to the document list for that same section. Cancel after a draft has been created keeps the saved draft; it never deletes the document implicitly. If the Admin attempts to change section, navigate away, or close the editor with unsaved changes, the existing unsaved-change warning must run.

Moving a document to another section updates the selected context only after a successful save. A failed move leaves both the stored document and visible context unchanged.

## Feedback and error handling

- Every action immediately produces one of: an opened control, pending state, success state, error state, or an explanation for being disabled.
- Pending actions prevent accidental duplicate submission without freezing unrelated navigation.
- Field validation appears adjacent to the relevant field and moves focus to the first invalid field after submit.
- Server failures preserve entered or unsaved data and provide a retry path.
- Loading uses a stable right-pane skeleton; it must not collapse or shift the folder tree.
- Empty section, empty search, unauthorized, missing selection, and load failure are separate states with appropriate next actions.
- Destructive operations remain visible until the server confirms completion.
- Media upload, cleanup, conflict, and deletion errors continue to use the existing fail-closed behavior and detailed retry messaging.

## Accessibility

- Use the established accessible Admin shell and Base UI dialog patterns.
- The folder hierarchy follows the ARIA tree interaction model with Arrow keys, Enter, Home, and End.
- Expand/collapse and select are distinguishable actions for assistive technology.
- Visible controls have accessible names; icon-only controls require a programmatic label.
- Touch targets are at least 44 by 44 CSS pixels where the existing design baseline requires them.
- Focus moves to newly opened inline forms and returns to their triggers when closed.
- Mobile drawer focus is trapped while open and returns to **เลือกหมวด** on close.
- Status, selection, error, and disabled meaning never rely on color alone.
- Desktop, tablet, and 390px layouts have no horizontal page overflow.

## Security and safety

- Admin authorization remains server-enforced with the existing `public.users.uid = auth.uid()` and `role_id = 1` boundary.
- Guest and non-admin users must never receive or render the Admin workspace.
- URL section identifiers are untrusted input and must be validated against rows visible to the authorized Admin.
- Client selection cannot override Server Action validation, RLS, document version checks, operation manifests, or media lifecycle guards.
- No Auth fixture, legacy row, Production resource, or non-Docs object is introduced by this work.

## Verification strategy

### Component tests

- Selecting a folder updates the right pane and URL.
- Expand/collapse does not accidentally select a folder.
- Root and child creation open a visible form and manage focus correctly.
- Third-level creation is unavailable with an explanation.
- Creating a document carries the intended `section_id`.
- Missing/invalid section selection cannot create against an arbitrary section.
- Save, cancel, Back, and refresh preserve or restore folder context.
- Unsaved navigation triggers the warning.
- Error paths preserve form values and expose retry actions.
- Mobile drawer traps and restores focus.

### Existing regression suites

Run the relevant Admin shell, content, public, proxy, media, Worker, and database suites. Also run App and Worker type checks, lint, Next build, OpenNext build, and dependency audit.

Database, authorization, save/delete, and media failure-path tests remain mandatory even though this design does not change their schema or protocol.

### Browser smoke

Verify locally before any deployment:

- Admin root/child/document workflow.
- Guest and non-admin rejection.
- Desktop, tablet, and 390px behavior.
- Keyboard tree navigation, inline-form focus, drawer focus, and unsaved warning.
- Create, edit, preview, status, cancel, error, and return-to-folder behavior.
- No console errors or horizontal overflow.

Staging deployment and Staging smoke require separate approval. Production migration or deployment is outside this design.

## Acceptance criteria

The design is complete when:

1. Structure and document management operate from one primary Admin workspace.
2. Selecting a section clearly scopes its document list and document creation.
3. A newly created document receives the explicitly selected section.
4. Create/edit/cancel/save/Back/refresh preserve section context.
5. All controls visibly react or explain why they are unavailable.
6. The two-level section limit is enforced and explained in the UI.
7. Existing authorization, conflict, media, cleanup, and deletion guarantees remain unchanged.
8. Keyboard, focus, touch-target, mobile, and no-overflow checks pass.
9. Relevant automated suites and local browser smoke pass before requesting deployment approval.
