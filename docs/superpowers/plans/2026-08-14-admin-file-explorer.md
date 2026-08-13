# Admin File Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Admin structure and document-list experiences with one accessible two-pane File Explorer workspace where the selected section scopes document creation and editing.

**Architecture:** Move the existing Structure and Documents routes into an App Router route group so they share a persistent Explorer layout without changing their public URLs. A server-only loader supplies validated Admin section/document view models; focused client components own tree interaction, section forms, list filtering, staged editing, and unsaved-navigation feedback while existing Server Actions, RLS, media lifecycle, and deletion RPCs remain authoritative.

**Tech Stack:** Next.js 16.3.0 App Router, React 19.2.8, TypeScript 5, Base UI Dialog, Tailwind CSS 4, Supabase SSR/Postgres, Vitest 4, Testing Library, Tiptap 3, OpenNext Cloudflare.

## Global Constraints

- Work on `feature/documents-editer`; preserve the unrelated untracked `.codex/` directory and all unrelated user changes.
- Before editing Next.js routes or navigation, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`, `page.md`, `layout.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`, and `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`.
- Use `apply_patch` for manual file creation and edits; use `npm` and keep `package-lock.json` unchanged because this plan adds no dependency.
- Follow TDD for every behavior change: record a focused RED result before implementation, then GREEN, then the smallest relevant regression suite.
- Keep `await requireAdmin()` or an equivalent server-side call on every Admin page/data entry point; never rely on client selection for authorization.
- Do not change database schema, migrations, RLS, Auth, legacy tables, Cloudflare Worker, R2 protocol, or Production resources.
- Preserve explicit save, version conflict, media cleanup, prepared delete, and fail-closed lifecycle behavior.
- Sections remain limited to root plus one child level. Do not add drag and drop, bulk actions, media library, or autosave.
- Build and test locally only. Staging deployment and Staging mutation require separate approval after this plan is complete.
- User-facing Admin copy remains Thai; route and code identifiers remain English.
- Each reviewer gate checks keyboard, focus, 44px touch targets, 390px layout, error feedback, and no horizontal page overflow when relevant.

---

## File Structure

### Create

- `src/lib/docs/admin-explorer.ts` — pure Explorer view-model types, section resolution/path/count helpers, and document filtering.
- `src/lib/docs/admin-explorer.test.ts` — pure model tests.
- `src/lib/docs/admin-explorer-server.ts` — authenticated Supabase loader for the shared Explorer data.
- `src/lib/docs/admin-explorer-server.test.ts` — loader authorization/error/mapping tests with mocked Supabase.
- `src/app/admin/(content)/layout.tsx` — persistent shared Explorer layout for Structure and Documents routes.
- `src/app/admin/(content)/loading.tsx` — right-pane loading skeleton that leaves the layout/tree mounted.
- `src/app/admin/(content)/error.tsx` — recoverable right-pane error state.
- `src/components/admin/explorer/admin-explorer-shell.tsx` — bounded two-pane grid, mobile section drawer, and selected-section derivation from URL.
- `src/components/admin/explorer/admin-explorer-shell.test.tsx` — shell, drawer, resizing, and selected-state tests.
- `src/components/admin/explorer/folder-tree.tsx` — ARIA tree keyboard navigation and guarded section navigation.
- `src/components/admin/explorer/folder-tree.test.tsx` — tree interaction tests.
- `src/components/admin/unsaved-navigation.tsx` — Admin-wide dirty-state registration and confirmation dialog.
- `src/components/admin/unsaved-navigation.test.tsx` — navigation, focus return, and beforeunload tests.
- `src/components/admin/explorer/section-inline-form.tsx` — create/edit section form with immediate focus and preserved values on failure.
- `src/components/admin/explorer/section-inline-form.test.tsx` — form and third-level prevention tests.
- `src/components/admin/explorer/section-panel.tsx` — breadcrumb, contextual section actions, deletion preview, and operation banners.
- `src/components/admin/explorer/section-panel.test.tsx` — section action and failure-state tests.
- `src/components/admin/explorer/document-list.tsx` — selected-section list, search, status filter, empty states, and guarded links.
- `src/components/admin/explorer/document-list.test.tsx` — list/filter/empty-state tests.
- `src/components/admin/explorer/document-setup-form.tsx` — stage 1 draft creation bound to an explicit section.
- `src/components/admin/explorer/document-setup-form.test.tsx` — selected-section, error preservation, and successful-route tests.
- `docs/todo/admin-file-explorer.md` — approved cross-module Admin UX follow-up status and verification record.

### Move without changing URL

- `src/app/admin/structure/**` → `src/app/admin/(content)/structure/**`
- `src/app/admin/documents/**` → `src/app/admin/(content)/documents/**`

The `(content)` segment is omitted from URLs. Do not leave duplicate route files at the old physical paths.

### Modify

- `src/components/admin/admin-shell.tsx` — one primary **จัดการเนื้อหา** navigation item, secondary Editor item, and Admin-wide unsaved-navigation provider.
- `src/components/admin/admin-shell.test.tsx` — unified active-state and guarded-navigation expectations.
- `src/app/admin/page.tsx` — retain authenticated redirect to `/admin/structure`.
- `src/app/admin/(content)/structure/page.tsx` — canonical Explorer contents page driven by promised `searchParams`.
- `src/app/admin/(content)/structure/actions.ts` — return the created/updated section id without changing authorization or delete lifecycle.
- `src/app/admin/(content)/structure/actions.test.ts` — create/update id and existing delete delegation tests.
- `src/app/admin/(content)/documents/page.tsx` — authenticated redirect to the canonical Explorer route.
- `src/app/admin/(content)/documents/new/page.tsx` — explicit-section stage 1.
- `src/app/admin/(content)/documents/[id]/page.tsx` — canonicalize section context and render staged editing.
- `src/app/admin/(content)/documents/actions.ts` — add minimal draft-creation wrapper around the existing validated save boundary.
- `src/app/admin/(content)/documents/actions.test.ts` — draft creation and existing media/lifecycle regression tests.
- `src/app/admin/(content)/documents/document-form.tsx` — stages 2/3, guarded cancel/final return, and dirty-state registration.
- `src/app/admin/(content)/documents/document-form.test.tsx` — staged save/review/cancel/error tests plus existing retry/version tests.
- `TODO.md`, `context.md`, `docs/context/architecture.md`, `docs/context/testing-and-commands.md` — record this approved follow-up without reopening M01–M06 or starting M07.

### Remove after replacement is GREEN

- `src/app/admin/(content)/structure/structure-manager.tsx` — responsibilities are split into `FolderTree`, `SectionPanel`, and `SectionInlineForm`.

---

### Task 1: Explorer view model and authenticated loader

**Files:**
- Create: `src/lib/docs/admin-explorer.ts`
- Create: `src/lib/docs/admin-explorer.test.ts`
- Create: `src/lib/docs/admin-explorer-server.ts`
- Create: `src/lib/docs/admin-explorer-server.test.ts`

**Interfaces:**
- Produces: `AdminExplorerSection`, `AdminExplorerDocument`, `AdminExplorerData`.
- Produces: `buildAdminExplorerSections(sectionRows, documents): AdminExplorerSection[]`.
- Produces: `mapAdminDocuments(documentRows): AdminExplorerDocument[]`.
- Produces: `resolveAdminSectionId(sections, requestedId): string | null`.
- Produces: `getAdminSectionPath(sections, sectionId): AdminExplorerSection[]`.
- Produces: `filterAdminDocuments(documents, selectedSectionId, query, status): AdminExplorerDocument[]`.
- Produces: `loadAdminExplorerDataUncached(): Promise<AdminExplorerData>` for focused loader tests.
- Produces: `loadAdminExplorerData(): Promise<AdminExplorerData>`.

- [ ] **Step 1: Write pure-model failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  buildAdminExplorerSections,
  filterAdminDocuments,
  getAdminSectionPath,
  resolveAdminSectionId,
} from "./admin-explorer";

const sectionRows = [
  { id: "root", parent_id: null, title: "เริ่มต้น", slug: "start", description: null, is_published: true, sort_order: 0 },
  { id: "child", parent_id: "root", title: "การจอง", slug: "booking", description: null, is_published: true, sort_order: 0 },
];
const documents = [
  { id: "a", sectionId: "root", title: "ภาพรวม", slug: "overview", status: "published" as const, updatedAt: "2026-08-14", sortOrder: 0, version: 1 },
  { id: "b", sectionId: "child", title: "สร้างการจอง", slug: "create-booking", status: "draft" as const, updatedAt: "2026-08-14", sortOrder: 0, version: 1 },
];

describe("admin explorer model", () => {
  it("counts direct documents and resolves only real section ids", () => {
    const sections = buildAdminExplorerSections(sectionRows, documents);
    expect(sections.map((section) => [section.id, section.directDocumentCount])).toEqual([["root", 1], ["child", 1]]);
    expect(resolveAdminSectionId(sections, "child")).toBe("child");
    expect(resolveAdminSectionId(sections, "missing")).toBeNull();
  });

  it("builds a root-to-child breadcrumb", () => {
    expect(getAdminSectionPath(buildAdminExplorerSections(sectionRows, documents), "child").map((item) => item.title)).toEqual(["เริ่มต้น", "การจอง"]);
  });

  it("filters direct documents, while null means the virtual root", () => {
    expect(filterAdminDocuments(documents, "child", "สร้าง", "draft").map((item) => item.id)).toEqual(["b"]);
    expect(filterAdminDocuments(documents, null, "", "all").map((item) => item.id)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run the model test and record RED**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/admin-explorer.test.ts`

Expected: FAIL because `./admin-explorer` does not exist.

- [ ] **Step 3: Implement the pure model**

```ts
export type AdminDocumentStatus = "draft" | "published" | "archived";

export type AdminExplorerDocument = {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  status: AdminDocumentStatus;
  updatedAt: string;
  sortOrder: number;
  version: number;
};

export type AdminExplorerSection = {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  sortOrder: number;
  directDocumentCount: number;
};

export function resolveAdminSectionId(sections: AdminExplorerSection[], requestedId: string | undefined): string | null {
  return requestedId && sections.some((section) => section.id === requestedId) ? requestedId : null;
}

export function getAdminSectionPath(sections: AdminExplorerSection[], sectionId: string): AdminExplorerSection[] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const current = byId.get(sectionId);
  if (!current) return [];
  return current.parentId && byId.has(current.parentId) ? [byId.get(current.parentId)!, current] : [current];
}

export function filterAdminDocuments(
  documents: AdminExplorerDocument[],
  selectedSectionId: string | null,
  query: string,
  status: AdminDocumentStatus | "all",
): AdminExplorerDocument[] {
  const normalized = query.trim().toLocaleLowerCase("th");
  return documents.filter((document) =>
    (selectedSectionId === null || document.sectionId === selectedSectionId) &&
    (status === "all" || document.status === status) &&
    (!normalized || `${document.title} ${document.slug}`.toLocaleLowerCase("th").includes(normalized)),
  );
}

type AdminSectionRow = {
  id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  sort_order: number;
};

type AdminDocumentRow = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  status: AdminDocumentStatus;
  updated_at: string;
  sort_order: number;
  version: number;
};

export function mapAdminDocuments(rows: AdminDocumentRow[]): AdminExplorerDocument[] {
  return rows.map((row) => ({
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    version: Number(row.version),
  }));
}

export function buildAdminExplorerSections(rows: AdminSectionRow[], documents: AdminExplorerDocument[]): AdminExplorerSection[] {
  const counts = new Map<string, number>();
  for (const document of documents) counts.set(document.sectionId, (counts.get(document.sectionId) ?? 0) + 1);
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    directDocumentCount: counts.get(row.id) ?? 0,
  }));
}
```

- [ ] **Step 4: Write loader authorization/mapping failing tests**

Mock `requireAdmin`, `createClient`, and four Supabase query results. Assert `requireAdmin` is called once, snake_case rows become the exact camelCase interfaces, and any section/document query error rejects with `ไม่สามารถโหลดพื้นที่จัดการเนื้อหาได้`.

```ts
await expect(loadAdminExplorerDataUncached()).resolves.toMatchObject({
  sections: [{ id: sectionId, parentId: null, directDocumentCount: 1 }],
  documents: [{ id: documentId, sectionId, status: "draft", version: 1 }],
  pendingSectionOperations: [],
  cleanupOperation: null,
});
expect(requireAdmin).toHaveBeenCalledTimes(1);
```

- [ ] **Step 5: Run the loader test and record RED**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/admin-explorer-server.test.ts`

Expected: FAIL because `loadAdminExplorerData` does not exist.

- [ ] **Step 6: Implement the server-only loader**

Use `cache` from React so the route-group layout and leaf page share one request result.

```ts
import "server-only";
import { cache } from "react";
import type { MediaOperationView } from "@/lib/media/lifecycle-types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { readMediaOperation } from "@/lib/media/lifecycle";
import { createClient } from "@/lib/server";

export type AdminExplorerData = {
  sections: AdminExplorerSection[];
  documents: AdminExplorerDocument[];
  pendingSectionOperations: MediaOperationView[];
  cleanupOperation: MediaOperationView | null;
};

export async function loadAdminExplorerDataUncached(): Promise<AdminExplorerData> {
  await requireAdmin();
  const supabase = await createClient();
  const [sectionsResult, documentsResult, operationRowsResult, cleanupRowsResult] = await Promise.all([
    supabase.from("doc_sections").select("id, parent_id, title, slug, description, is_published, sort_order").order("sort_order").order("id"),
    supabase.from("doc_documents").select("id, section_id, title, slug, status, updated_at, sort_order, version").order("sort_order").order("title"),
    supabase.from("doc_media_operations").select("id").eq("kind", "section_delete").order("created_at"),
    supabase.from("doc_media_cleanup").select("id, document_id, display_label, attempt_count, last_error").order("created_at").limit(100),
  ]);
  if (sectionsResult.error || documentsResult.error || operationRowsResult.error || cleanupRowsResult.error) throw new Error("ไม่สามารถโหลดพื้นที่จัดการเนื้อหาได้");
  const documents = mapAdminDocuments(documentsResult.data ?? []);
  const pendingSectionOperations = (await Promise.all((operationRowsResult.data ?? []).map((row) => readMediaOperation(row.id))))
    .filter((operation): operation is MediaOperationView => operation !== null);
  const cleanupRows = cleanupRowsResult.data ?? [];
  const cleanupOperation = cleanupRows.length === 0 ? null : {
    operationId: cleanupRows[0].id,
    kind: "cleanup" as const,
    targetId: cleanupRows[0].document_id,
    files: cleanupRows.map((row) => row.display_label),
    attemptCount: Math.max(...cleanupRows.map((row) => row.attempt_count)),
    message: cleanupRows[0].last_error,
  };
  return { sections: buildAdminExplorerSections(sectionsResult.data ?? [], documents), documents, pendingSectionOperations, cleanupOperation };
}

export const loadAdminExplorerData = cache(loadAdminExplorerDataUncached);
```

- [ ] **Step 7: Run focused GREEN and commit**

Run: `npx vitest --config vitest.config.mts run src/lib/docs/admin-explorer.test.ts src/lib/docs/admin-explorer-server.test.ts`

Expected: PASS.

```bash
git add src/lib/docs/admin-explorer.ts src/lib/docs/admin-explorer.test.ts src/lib/docs/admin-explorer-server.ts src/lib/docs/admin-explorer-server.test.ts
git commit -m "feat: add admin explorer data model"
```

---

### Task 2: Persistent route-group shell and accessible folder tree

**Files:**
- Create: `src/app/admin/(content)/layout.tsx`
- Create: `src/components/admin/explorer/admin-explorer-shell.tsx`
- Create: `src/components/admin/explorer/admin-explorer-shell.test.tsx`
- Create: `src/components/admin/explorer/folder-tree.tsx`
- Create: `src/components/admin/explorer/folder-tree.test.tsx`
- Move: `src/app/admin/structure/**` → `src/app/admin/(content)/structure/**`
- Move: `src/app/admin/documents/**` → `src/app/admin/(content)/documents/**`

**Interfaces:**
- Consumes: `loadAdminExplorerData()` and `AdminExplorerSection[]` from Task 1.
- Produces: `AdminExplorerShell({ sections, children })`.
- Produces: `FolderTree({ sections, selectedSectionId, onNavigate })`.

- [ ] **Step 1: Read the required Next.js route-group, page, layout, redirect, and linking guides listed in Global Constraints**

Record the exact Next 16 rules in the task report: route groups do not affect URLs; `params` and `searchParams` are promises; layouts persist across child navigation.

- [ ] **Step 2: Write shell and tree failing tests**

Cover these exact behaviors:

```tsx
it("renders the virtual root and direct document counts", () => {
  render(<FolderTree sections={sections} selectedSectionId="child" onNavigate={navigate} />);
  expect(screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ })).not.toBeNull();
  expect(screen.getByRole("treeitem", { name: /การจอง.*2/ }).getAttribute("aria-selected")).toBe("true");
});

it("supports Arrow keys, Home, End, expand, collapse, and Enter", async () => {
  const user = userEvent.setup();
  render(<FolderTree sections={sections} selectedSectionId={null} onNavigate={navigate} />);
  const root = screen.getByRole("treeitem", { name: /เริ่มต้น/ });
  root.focus();
  await user.keyboard("{ArrowRight}{ArrowDown}{Enter}");
  expect(navigate).toHaveBeenCalledWith("/admin/structure?section=child");
  await user.keyboard("{Home}");
  expect(document.activeElement).toBe(screen.getByRole("treeitem", { name: /คู่มือทั้งหมด/ }));
});

it("traps mobile drawer focus and returns it to เลือกหมวด", async () => {
  const user = userEvent.setup();
  render(<AdminExplorerShell sections={sections}><p>รายการเอกสาร</p></AdminExplorerShell>);
  const trigger = screen.getByRole("button", { name: "เลือกหมวด" });
  await user.click(trigger);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
```

Also assert the resize control has `role="slider"`, minimum 224, maximum 384, keyboard increments, and is hidden below the desktop breakpoint.

- [ ] **Step 3: Run focused tests and record RED**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/admin-explorer-shell.test.tsx src/components/admin/explorer/folder-tree.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement the ARIA tree**

Use one focusable `button[role=treeitem]` per visible node. Enter navigates; Right expands or moves to the first child; Left collapses or moves to the parent; Up/Down/Home/End use the current visible-node order. Expansion and selection remain separate state.

```ts
type FolderTreeProps = {
  sections: AdminExplorerSection[];
  selectedSectionId: string | null;
  onNavigate: (href: string) => void;
};

function sectionHref(sectionId: string | null): string {
  return sectionId ? `/admin/structure?section=${encodeURIComponent(sectionId)}` : "/admin/structure";
}
```

Each tree item must expose `aria-level`, `aria-selected`, `aria-expanded` only when it has children, and a Thai accessible name including its direct count.

- [ ] **Step 5: Implement the two-pane shell and mobile drawer**

Use Base UI `Dialog.Root`, `Dialog.Trigger`, `Dialog.Close`, `Dialog.Backdrop`, and `Dialog.Popup` for mobile. Use a native range control for accessible bounded resizing instead of a pointer-only separator.

```tsx
<div className="hidden min-w-0 lg:grid" style={{ gridTemplateColumns: `${treeWidth}px minmax(0,1fr)` }}>
  <aside aria-label="หมวดคู่มือ"><FolderTree {...treeProps} /></aside>
  <main className="min-w-0">{children}</main>
</div>
<input
  aria-label="ปรับความกว้างรายการหมวด"
  type="range"
  min={224}
  max={384}
  step={16}
  value={treeWidth}
  onChange={(event) => setTreeWidth(Number(event.target.value))}
  className="hidden lg:block"
/>
```

The shell reads `useSearchParams().get("section")`, validates it against `sections`, and passes `null` for the virtual root when invalid.

- [ ] **Step 6: Move the routes into `(content)` and add the layout**

Use the route group only for Structure/Documents. Leave `/admin/editor`, `/admin/page.tsx`, and `/admin/layout.tsx` outside it.

```tsx
export default async function AdminContentLayout({ children }: { children: React.ReactNode }) {
  const { sections } = await loadAdminExplorerData();
  return <AdminExplorerShell sections={sections}>{children}</AdminExplorerShell>;
}
```

Update moved relative imports, then verify the old physical route directories no longer contain page files.

- [ ] **Step 7: Run focused tests, typecheck, route build, and commit**

Run:

```bash
npx vitest --config vitest.config.mts run src/components/admin/explorer/admin-explorer-shell.test.tsx src/components/admin/explorer/folder-tree.test.tsx
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0; the Next route manifest still contains `/admin/structure`, `/admin/documents`, `/admin/documents/new`, and `/admin/documents/[id]` with no `(content)` in URLs.

```bash
git add src/app/admin src/components/admin/explorer
git commit -m "feat: add persistent admin explorer shell"
```

---

### Task 3: Unified Admin navigation and unsaved-change guard

**Files:**
- Create: `src/components/admin/unsaved-navigation.tsx`
- Create: `src/components/admin/unsaved-navigation.test.tsx`
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/components/admin/admin-shell.test.tsx`
- Modify: `src/components/admin/explorer/admin-explorer-shell.tsx`

**Interfaces:**
- Produces: `UnsavedNavigationProvider`.
- Produces: `useUnsavedNavigation(): { dirty: boolean; registerDirty(dirty: boolean): void; requestNavigation(href: string, trigger?: HTMLElement): void }`.
- Produces: `GuardedAdminLink` with the same `href` and children contract used by Admin navigation.
- `FolderTree.onNavigate` must call `requestNavigation` rather than `router.push` directly.

- [ ] **Step 1: Write unsaved-navigation and unified-nav failing tests**

```tsx
it("asks before same-tab Admin navigation when dirty and returns focus on cancel", async () => {
  const user = userEvent.setup();
  render(<Harness dirty />);
  const link = screen.getByRole("link", { name: "Editor" });
  await user.click(link);
  const dialog = screen.getByRole("dialog", { name: "ออกจากหน้านี้หรือไม่" });
  await user.click(within(dialog).getByRole("button", { name: "แก้ไขต่อ" }));
  await waitFor(() => expect(document.activeElement).toBe(link));
  expect(push).not.toHaveBeenCalled();
});

it("navigates only after confirming discard", async () => {
  const user = userEvent.setup();
  render(<Harness dirty />);
  await user.click(screen.getByRole("link", { name: "Editor" }));
  await user.click(screen.getByRole("button", { name: "ออกโดยไม่บันทึก" }));
  expect(push).toHaveBeenCalledWith("/admin/editor");
});
```

Update the shell expectation to one primary link named **จัดการเนื้อหา** at `/admin/structure`; `/admin/structure`, `/admin/documents`, `/admin/documents/new`, and `/admin/documents/<id>` all mark it current. Editor remains separate and less prominent.

- [ ] **Step 2: Run focused tests and record RED**

Run: `npx vitest --config vitest.config.mts run src/components/admin/unsaved-navigation.test.tsx src/components/admin/admin-shell.test.tsx`

Expected: FAIL because the provider and unified navigation do not exist.

- [ ] **Step 3: Implement the provider and confirmation dialog**

Use Base UI Dialog with programmatic `open`, captured trigger focus, explicit close, Escape, and final focus. Keep a one-shot bypass ref so confirmation does not reopen the dialog before the dirty editor unmounts.

```ts
function requestNavigation(href: string, trigger?: HTMLElement) {
  if (!dirty || bypassRef.current) {
    router.push(href);
    return;
  }
  triggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  setPendingHref(href);
}
```

Register `beforeunload` while dirty for refresh/tab-close protection. Modified clicks, new-tab links, and external destinations retain native browser behavior; the browser warning remains the protection for those cases.

- [ ] **Step 4: Replace Admin navigation links and wire the Explorer tree**

```ts
const adminNavigation = [
  { title: "จัดการเนื้อหา", href: "/admin/structure", matches: ["/admin/structure", "/admin/documents"] },
  { title: "Editor Sandbox", href: "/admin/editor", matches: ["/admin/editor"] },
] as const;
```

Wrap the Admin shell content in `UnsavedNavigationProvider`. Use `GuardedAdminLink` for Admin navigation and public-return links. Pass `requestNavigation` to both desktop and mobile `FolderTree` instances.

- [ ] **Step 5: Run GREEN, Admin regression, and commit**

Run:

```bash
npx vitest --config vitest.config.mts run src/components/admin/unsaved-navigation.test.tsx src/components/admin/admin-shell.test.tsx src/components/admin/explorer/folder-tree.test.tsx
npm run test:admin-shell
npx tsc --noEmit
```

Expected: PASS.

```bash
git add src/components/admin/admin-shell.tsx src/components/admin/admin-shell.test.tsx src/components/admin/unsaved-navigation.tsx src/components/admin/unsaved-navigation.test.tsx src/components/admin/explorer
git commit -m "feat: unify admin content navigation"
```

---

### Task 4: Inline section creation, editing, and safe deletion

**Files:**
- Create: `src/components/admin/explorer/section-inline-form.tsx`
- Create: `src/components/admin/explorer/section-inline-form.test.tsx`
- Create: `src/components/admin/explorer/section-panel.tsx`
- Create: `src/components/admin/explorer/section-panel.test.tsx`
- Modify: `src/app/admin/(content)/structure/actions.ts`
- Modify: `src/app/admin/(content)/structure/actions.test.ts`
- Modify: `src/app/admin/(content)/structure/page.tsx`
- Remove after GREEN: `src/app/admin/(content)/structure/structure-manager.tsx`

**Interfaces:**
- Changes `StructureActionResult` to `{ error: string } | { success: true; id: string }`.
- Produces: `SectionInlineForm({ mode, section, parent, rootSections })`.
- Produces: `SectionPanel({ selectedSection, sectionPath, documents, pendingOperations, mode })`.

- [ ] **Step 1: Write Server Action failing tests for returned ids**

Mock Supabase insert/update chains and assert:

```ts
await expect(saveSection({
  title: "การจอง", slug: "booking", description: "", parentId: rootId,
  sortOrder: 0, isPublished: true,
})).resolves.toEqual({ success: true, id: childId });

await expect(saveSection({
  id: childId, title: "การจองใหม่", slug: "booking", description: "", parentId: rootId,
  sortOrder: 1, isPublished: true,
})).resolves.toEqual({ success: true, id: childId });
```

Keep the existing `prepareAndDeleteSection(sectionId, confirmedName)` delegation assertion.

- [ ] **Step 2: Run action tests and record RED**

Run: `npx vitest --config vitest.config.mts run 'src/app/admin/(content)/structure/actions.test.ts'`

Expected: FAIL because success does not include `id`.

- [ ] **Step 3: Return ids without weakening validation**

For inserts use `.insert(payload).select("id").single()`. For updates keep `.update(payload).eq("id", parsedInput.id)` and return the already validated id. Map missing insert data to the existing safe generic error.

```ts
let savedId: string;
if (parsedInput.id) {
  const result = await supabase.from("doc_sections").update(payload).eq("id", parsedInput.id);
  if (result.error) return { error: userSafeError(result.error.code) };
  savedId = parsedInput.id;
} else {
  const result = await supabase.from("doc_sections").insert(payload).select("id").single();
  if (result.error || !result.data) return { error: userSafeError(result.error?.code) };
  savedId = result.data.id;
}
revalidatePath("/admin/structure");
revalidatePublicDocs();
return { success: true, id: savedId };
```

- [ ] **Step 4: Write component failing tests**

Cover:

- Activating **เพิ่มหมวดหลัก** or **เพิ่มหมวดย่อย** displays the inline form and focuses **ชื่อหมวด**.
- Failed save keeps title/slug values and renders the Server Action message adjacent to the form.
- Successful save calls `router.replace('/admin/structure?section=<id>')` then `router.refresh()`.
- Selecting a child renders a disabled **เพิ่มหมวดย่อย** action with **รองรับหมวดไม่เกิน 2 ระดับ**.
- Rename pre-fills the selected section.
- Delete preview, typed-name confirmation, pending media operation, retry, and fail-closed UI retain current behavior.

- [ ] **Step 5: Run component tests and record RED**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 6: Implement URL-driven modes and focused forms**

Use these exact query modes:

```ts
export type SectionMode = "view" | "create-root" | "create-child" | "edit";

function sectionMode(value: string | string[] | undefined): SectionMode {
  return value === "create-root" || value === "create-child" || value === "edit" ? value : "view";
}
```

Links/actions:

- Root create: `/admin/structure?mode=create-root`
- Child create: `/admin/structure?section=<id>&mode=create-child`
- Edit: `/admin/structure?section=<id>&mode=edit`
- Cancel: selected section URL, or `/admin/structure` for root creation.

Use the existing section fields and validation. Keep title and slug visible; place description, order, and published checkbox under a native `<details>` labeled **ตั้งค่าเพิ่มเติม** for create mode. Edit mode shows all fields so no existing capability disappears.

- [ ] **Step 7: Replace StructureManager only after focused GREEN**

The promised Next 16 signature is:

```ts
export default async function StructurePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  const data = await loadAdminExplorerData();
  const requested = typeof query.section === "string" ? query.section : undefined;
  const selectedId = resolveAdminSectionId(data.sections, requested);
  return <SectionPanel selectedSectionId={selectedId} mode={sectionMode(query.mode)} explorer={data} />;
}
```

Render `data.pendingSectionOperations` through `MediaOperationBanner` and use the existing retry action; do not replace the existing lifecycle functions.

- [ ] **Step 8: Run GREEN and commit**

Run:

```bash
npx vitest --config vitest.config.mts run 'src/app/admin/(content)/structure/actions.test.ts' src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx
npm run test:media
npx tsc --noEmit
```

Expected: PASS, including existing section deletion/media tests.

```bash
git add 'src/app/admin/(content)/structure' src/components/admin/explorer
git commit -m "feat: add contextual section workflows"
```

---

### Task 5: Section-scoped document list and canonical redirect

**Files:**
- Create: `src/components/admin/explorer/document-list.tsx`
- Create: `src/components/admin/explorer/document-list.test.tsx`
- Modify: `src/app/admin/(content)/structure/page.tsx`
- Modify: `src/app/admin/(content)/documents/page.tsx`

**Interfaces:**
- Consumes: `filterAdminDocuments`, `getAdminSectionPath`, and `AdminExplorerData`.
- Produces: `DocumentList({ documents, sections, selectedSectionId })`.

- [ ] **Step 1: Write document-list failing tests**

```tsx
it("shows only direct documents for a selected section", () => {
  render(<DocumentList documents={documents} sections={sections} selectedSectionId="child" />);
  expect(screen.getByRole("link", { name: /สร้างการจอง/ })).not.toBeNull();
  expect(screen.queryByRole("link", { name: /ภาพรวม/ })).toBeNull();
});

it("shows all documents and their section paths at the virtual root", () => {
  render(<DocumentList documents={documents} sections={sections} selectedSectionId={null} />);
  expect(screen.getByText("เริ่มต้น › การจอง")).not.toBeNull();
});

it("distinguishes an empty folder from empty search results", async () => {
  const user = userEvent.setup();
  render(<DocumentList documents={documents} sections={sections} selectedSectionId="child" />);
  await user.type(screen.getByRole("searchbox", { name: "ค้นหาเอกสารในหมวดนี้" }), "ไม่พบ");
  expect(screen.getByText("ไม่พบเอกสารที่ตรงกับการค้นหา")).not.toBeNull();
});
```

Assert status filtering, Thai status labels, 44px row actions, and **สร้างเอกสารในหมวดนี้** linking to `/admin/documents/new?section=<id>`. The virtual root must ask the Admin to choose a real section instead of showing a create action.

- [ ] **Step 2: Run focused test and record RED**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx`

Expected: FAIL because `DocumentList` does not exist.

- [ ] **Step 3: Implement list, search, filter, and empty states**

Use local `query` and `status` state; use `filterAdminDocuments()` for the result. Editing links include the actual document section so the Explorer highlights correctly before the edit page canonicalizes it:

```tsx
<GuardedAdminLink href={`/admin/documents/${document.id}?section=${encodeURIComponent(document.sectionId)}`}>
  แก้ไข {document.title}
</GuardedAdminLink>
```

Use Thai labels Draft = **ฉบับร่าง**, Published = **เผยแพร่แล้ว**, Archived = **เก็บถาวร**. Keep text labels in addition to color.

- [ ] **Step 4: Make Structure the canonical contents page**

Render breadcrumb/header, cleanup banner, contextual section actions, and `DocumentList` from `/admin/structure`. For invalid `section`, select the virtual root and show `ไม่พบหมวดที่เลือก จึงแสดงคู่มือทั้งหมด`.

Change `/admin/documents` to:

```tsx
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function DocumentsPage() {
  await requireAdmin();
  redirect("/admin/structure");
}
```

- [ ] **Step 5: Run GREEN, route build, and commit**

Run:

```bash
npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx
npm run test:admin-shell
npx tsc --noEmit
npm run build
```

Expected: PASS; `/admin/documents` remains present and redirects without a duplicate list implementation.

```bash
git add 'src/app/admin/(content)/structure/page.tsx' 'src/app/admin/(content)/documents/page.tsx' src/components/admin/explorer/document-list.tsx src/components/admin/explorer/document-list.test.tsx
git commit -m "feat: scope documents by selected section"
```

---

### Task 6: Explicit-section draft creation

**Files:**
- Create: `src/components/admin/explorer/document-setup-form.tsx`
- Create: `src/components/admin/explorer/document-setup-form.test.tsx`
- Modify: `src/app/admin/(content)/documents/actions.ts`
- Modify: `src/app/admin/(content)/documents/actions.test.ts`
- Modify: `src/app/admin/(content)/documents/new/page.tsx`

**Interfaces:**
- Produces: `createDocumentDraft(value: unknown): Promise<DocumentActionResult>`.
- Produces: `DocumentSetupForm({ sections, selectedSectionId })`.
- Successful route: `/admin/documents/<id>?section=<section-id>&stage=content`.

- [ ] **Step 1: Write the draft-action failing tests**

```ts
it("creates a draft through the validated save lifecycle", async () => {
  runDocumentSave.mockResolvedValue({ success: true, kind: "save", targetId: documentId, version: 1, path: "/start/new-doc" });
  await expect(createDocumentDraft({ id: documentId, sectionId, title: "เอกสารใหม่", slug: "new-doc" })).resolves.toEqual({
    success: true, id: documentId, version: 1, path: "/start/new-doc",
  });
  expect(runDocumentSave).toHaveBeenCalledWith(expect.objectContaining({
    id: documentId, sectionId, title: "เอกสารใหม่", slug: "new-doc",
    status: "draft", sortOrder: 0, expectedVersion: null, media: [],
  }));
});

it("rejects a missing or malformed section before the lifecycle call", async () => {
  await expect(createDocumentDraft({ id: documentId, sectionId: "", title: "เอกสารใหม่", slug: "new-doc" })).resolves.toEqual({ error: "ข้อมูลเอกสารไม่ถูกต้อง" });
  expect(runDocumentSave).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run action tests and record RED**

Run: `npx vitest --config vitest.config.mts run 'src/app/admin/(content)/documents/actions.test.ts'`

Expected: FAIL because `createDocumentDraft` does not exist.

- [ ] **Step 3: Implement the minimal draft wrapper**

Validate `id`, `sectionId`, `title`, and `slug` at the server boundary, then call the existing `saveDocument` with the canonical empty document content, Draft status, version null, and no media. Do not create a second database path.

```ts
const initialContent = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "เริ่มเขียนคู่มือ หรือพิมพ์ / เพื่อเปิดคำสั่ง" }] }],
};

export async function createDocumentDraft(value: unknown): Promise<DocumentActionResult> {
  if (!isRecord(value)) return { error: "ข้อมูลเอกสารไม่ถูกต้อง" };
  return saveDocument({
    id: value.id,
    sectionId: value.sectionId,
    title: value.title,
    slug: value.slug,
    excerpt: "",
    content: initialContent,
    status: "draft",
    sortOrder: 0,
    expectedVersion: null,
    media: [],
  });
}
```

`saveDocument` remains the function that calls `requireAdmin`, validates content and identifiers, and owns lifecycle revalidation.

- [ ] **Step 4: Write setup-form failing tests**

Cover explicit section path, section change before creation, focused first field, pending label, duplicate-submit prevention, preserved values on error, and successful `router.replace`.

```tsx
expect(screen.getByText("เริ่มต้น › การจอง")).not.toBeNull();
await user.type(screen.getByRole("textbox", { name: "ชื่อเอกสาร" }), "เอกสารใหม่");
await user.type(screen.getByRole("textbox", { name: "Slug" }), "new-doc");
await user.click(screen.getByRole("button", { name: "สร้างฉบับร่างและเขียนต่อ" }));
await waitFor(() => expect(replace).toHaveBeenCalledWith(`/admin/documents/${documentId}?section=${sectionId}&stage=content`));
```

- [ ] **Step 5: Run setup-form test and record RED**

Run: `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-setup-form.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 6: Implement stage 1 and the new-document page**

The page awaits `searchParams`, validates a real section through Task 1 helpers, and renders a choose-section state when missing/invalid. It must not use `sections[0]` as a default.

```tsx
const selectedSectionId = resolveAdminSectionId(data.sections, requestedSection);
if (!selectedSectionId) {
  return <section aria-labelledby="choose-section"><h1 id="choose-section">เลือกหมวดก่อนสร้างเอกสาร</h1><p>เลือกหมวดจากรายการด้านซ้าย แล้วกด “สร้างเอกสารในหมวดนี้”</p></section>;
}
return <DocumentSetupForm sections={data.sections} selectedSectionId={selectedSectionId} />;
```

- [ ] **Step 7: Run GREEN, media regression, and commit**

Run:

```bash
npx vitest --config vitest.config.mts run 'src/app/admin/(content)/documents/actions.test.ts' src/components/admin/explorer/document-setup-form.test.tsx
npm run test:media
npx tsc --noEmit
```

Expected: PASS.

```bash
git add 'src/app/admin/(content)/documents' src/components/admin/explorer/document-setup-form.tsx src/components/admin/explorer/document-setup-form.test.tsx
git commit -m "feat: create drafts from selected sections"
```

---

### Task 7: Staged editor, canonical section context, and guarded return

**Files:**
- Modify: `src/app/admin/(content)/documents/[id]/page.tsx`
- Modify: `src/app/admin/(content)/documents/document-form.tsx`
- Modify: `src/app/admin/(content)/documents/document-form.test.tsx`
- Modify: `src/components/admin/unsaved-navigation.tsx`

**Interfaces:**
- `DocumentForm` now requires a non-null `DocumentRecord` and adds `initialStage: "content" | "review"` and `returnHref: string`.
- `DocumentForm` calls `registerDirty(dirty)` and `requestNavigation(returnHref)`.
- Canonical edit URL always includes `section=<document.sectionId>` and `stage=content|review`.

- [ ] **Step 1: Write staged-editor failing tests**

Keep the existing duplicate-retry and server-refreshed-version tests. Hoist `requestNavigation` and mock `useUnsavedNavigation` so the component can register dirty state and the tests can inspect guarded destinations:

```ts
const requestNavigation = vi.hoisted(() => vi.fn());
const registerDirty = vi.hoisted(() => vi.fn());
vi.mock("@/components/admin/unsaved-navigation", () => ({
  useUnsavedNavigation: () => ({ dirty: false, registerDirty, requestNavigation }),
}));
```

Then add:

```tsx
it("saves content before advancing to review", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  render(<DocumentForm document={document} sections={sections} initialStage="content" returnHref={`/admin/structure?section=${document.sectionId}`} />);
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));
  await waitFor(() => expect(actions.saveDocument).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("heading", { name: "ตรวจและเผยแพร่" })).not.toBeNull();
});

it("keeps content stage and values when save fails", async () => {
  actions.saveDocument.mockResolvedValue({ error: "Version conflict กรุณา Reload" });
  const user = userEvent.setup();
  render(<DocumentForm document={document} sections={sections} initialStage="content" returnHref={`/admin/structure?section=${document.sectionId}`} />);
  const title = screen.getByRole("textbox", { name: "ชื่อเอกสาร" });
  await user.clear(title);
  await user.type(title, "ชื่อที่ยังไม่บันทึก");
  await user.click(screen.getByRole("button", { name: "บันทึกและตรวจต่อ" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Version conflict กรุณา Reload");
  expect(screen.getByRole("heading", { name: "เขียนเนื้อหา" })).not.toBeNull();
  expect((title as HTMLInputElement).value).toBe("ชื่อที่ยังไม่บันทึก");
});

it("final save returns to the selected folder", async () => {
  actions.saveDocument.mockResolvedValue({ success: true, id: document.id, version: 2, path: "/start/doc" });
  const user = userEvent.setup();
  render(<DocumentForm document={document} sections={sections} initialStage="review" returnHref={`/admin/structure?section=${document.sectionId}`} />);
  await user.click(screen.getByRole("button", { name: "บันทึกและกลับรายการ" }));
  await waitFor(() => expect(requestNavigation).toHaveBeenCalledWith(`/admin/structure?section=${document.sectionId}`));
});

it("cancel keeps the saved draft and uses the unsaved guard", async () => {
  const user = userEvent.setup();
  const returnHref = `/admin/structure?section=${document.sectionId}`;
  render(<DocumentForm document={document} sections={sections} initialStage="content" returnHref={returnHref} />);
  await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
  expect(actions.deleteDocument).not.toHaveBeenCalled();
  expect(requestNavigation).toHaveBeenCalledWith(returnHref);
});
```

Also assert status is chosen in Review, Preview still works before final save, pending media operations block both stage transitions, and dirty registration returns to false after successful save/unmount.

- [ ] **Step 2: Run the form tests and record RED**

Run: `npx vitest --config vitest.config.mts run 'src/app/admin/(content)/documents/document-form.test.tsx'`

Expected: FAIL because staged props and behavior do not exist.

- [ ] **Step 3: Refactor save into a boolean result without changing lifecycle ownership**

Rename the current `save()` implementation to `persist()`. Keep its upload → `replacePendingImages` → `saveDocument` → pre-submit rollback sequence byte-for-byte except for its return values: every error or pending-operation branch returns `false`; the successful branch returns `true` after version, content revision, pending images, and saved snapshot have been updated.

```ts
async function saveAndReview() {
  if (!(await persist())) return;
  setStage("review");
  router.replace(`/admin/documents/${document.id}?section=${encodeURIComponent(form.sectionId)}&stage=review`);
}

async function finalSave() {
  if (!(await persist())) return;
  requestNavigation(`/admin/structure?section=${encodeURIComponent(form.sectionId)}`);
}
```

Do not duplicate upload code or move R2 cleanup into the client. Preserve the current `saveSubmitted` ownership boundary exactly.

- [ ] **Step 4: Render the two remaining stages**

- Content stage: title, slug, section, excerpt, order, Editor, media progress, **บันทึกและตรวจต่อ**, Preview, cancel.
- Review stage: breadcrumb/section path, Preview, status, explicit **บันทึกและกลับรายการ**, **กลับไปแก้เนื้อหา**, cancel.
- Keep hard delete as a distinct destructive action; successful delete returns through `requestNavigation(returnHref)`.
- A successful section move updates the stage URL and final return URL to `form.sectionId`; a failed move leaves the stored document and original selected context unchanged.

Use an ordered step indicator with `aria-current="step"`; do not make completed stages color-only.

- [ ] **Step 5: Canonicalize edit route section and stage on the server**

After loading the document, normalize query values. If `section` differs from `document.section_id` or stage is invalid, redirect to the canonical URL outside any `try` block:

```ts
const stage = query.stage === "review" ? "review" : "content";
const canonical = `/admin/documents/${record.id}?section=${encodeURIComponent(record.sectionId)}&stage=${stage}`;
if (query.section !== record.sectionId || (query.stage !== undefined && query.stage !== "content" && query.stage !== "review")) redirect(canonical);
```

Pass `returnHref={`/admin/structure?section=${encodeURIComponent(record.sectionId)}`}`.

- [ ] **Step 6: Run GREEN, content/media regressions, and commit**

Run:

```bash
npx vitest --config vitest.config.mts run 'src/app/admin/(content)/documents/document-form.test.tsx'
npm run test:content
npm run test:media
npx tsc --noEmit
```

Expected: PASS with existing retry, version refresh, media rollback, and pending-operation behavior intact.

```bash
git add 'src/app/admin/(content)/documents' src/components/admin/unsaved-navigation.tsx
git commit -m "feat: add staged document editing"
```

---

### Task 8: Loading, recoverable errors, responsive polish, and integrated UI tests

**Files:**
- Create: `src/app/admin/(content)/loading.tsx`
- Create: `src/app/admin/(content)/error.tsx`
- Modify: `src/components/admin/explorer/admin-explorer-shell.tsx`
- Modify: `src/components/admin/explorer/admin-explorer-shell.test.tsx`
- Modify: `src/components/admin/explorer/section-panel.test.tsx`
- Modify: `src/components/admin/explorer/document-list.test.tsx`
- Modify: `src/components/admin/explorer/document-setup-form.test.tsx`
- Modify: `src/app/admin/(content)/documents/document-form.test.tsx`

**Interfaces:**
- The route-group layout remains mounted while `loading.tsx` or `error.tsx` replaces only the right pane.
- `error.tsx` exposes a Thai `ลองใหม่` button that calls `reset()`.

- [ ] **Step 1: Write loading/error/responsive failing tests**

Assert:

- Loading markup uses `aria-busy="true"`, has a screen-reader label, and contains no second folder tree.
- Error markup uses `role="alert"` and `ลองใหม่` calls `reset()` once.
- Desktop tree width is bounded 224–384.
- Every primary action uses `min-h-11` or `size-11`.
- Mobile shell uses one visible **เลือกหมวด** trigger, a modal dialog, Escape close, and focus return.
- No component introduces fixed widths wider than `100vw`; long Thai titles use `min-w-0` and wrapping/truncation intentionally.

- [ ] **Step 2: Run focused tests and record RED**

Run:

```bash
npx vitest --config vitest.config.mts run src/components/admin/explorer 'src/app/admin/(content)/documents/document-form.test.tsx'
```

Expected: FAIL on missing loading/error and incomplete responsive contracts.

- [ ] **Step 3: Implement the route-group loading and error boundaries**

```tsx
export default function Loading() {
  return <section aria-busy="true" aria-label="กำลังโหลดพื้นที่จัดการเนื้อหา" className="min-w-0 p-4 sm:p-6">
    <div className="h-8 w-48 animate-pulse rounded bg-muted" />
    <div className="mt-4 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
  </section>;
}
```

`error.tsx` must start with `"use client"`, log no sensitive details to the UI, and render a safe Thai message plus reset action.

- [ ] **Step 4: Apply responsive and interaction polish**

Use existing design tokens/classes only. Confirm:

- Desktop: two panes, bounded slider, stable right-pane skeleton.
- Tablet/mobile: no desktop grid, section drawer, one right-pane mode.
- Long title/slug/path: no page overflow.
- Empty section, empty search, invalid section, load failure, save failure, delete failure, and pending operation have distinct copy/actions.
- Disabled child creation exposes `aria-describedby` pointing to the two-level explanation.

- [ ] **Step 5: Run all focused Admin UI tests and commit**

Run:

```bash
npx vitest --config vitest.config.mts run src/components/admin/admin-shell.test.tsx src/components/admin/unsaved-navigation.test.tsx src/components/admin/explorer 'src/app/admin/(content)/structure/actions.test.ts' 'src/app/admin/(content)/documents/actions.test.ts' 'src/app/admin/(content)/documents/document-form.test.tsx'
npx tsc --noEmit
npm run lint
```

Expected: PASS.

```bash
git add 'src/app/admin/(content)' src/components/admin
git commit -m "fix: harden admin explorer interaction states"
```

---

### Task 9: Documentation, full local verification, and browser smoke

**Files:**
- Create: `docs/todo/admin-file-explorer.md`
- Modify: `TODO.md`
- Modify: `context.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/testing-and-commands.md`

**Interfaces:**
- Documentation identifies this as an approved cross-module Admin UX follow-up, not M07.
- M01–M06 remain Complete; M07 remains Not started until separately approved.
- No Staging/Production completion claim is permitted from Local evidence.

- [ ] **Step 1: Write the follow-up tracking document**

Include:

- Links to the approved design and this implementation plan.
- Chosen A two-pane direction and rejected B/C tradeoffs.
- Checklist for Tasks 1–8.
- Local verification commands and exact observed counts after execution.
- A separate pending line for Staging deploy/smoke approval.

- [ ] **Step 2: Update index/context documentation narrowly**

`TODO.md` and `context.md` must say the File Explorer follow-up is the current approved work while M07 remains blocked. `docs/context/architecture.md` records the `(content)` route group, shared Explorer layout, authenticated loader, and existing lifecycle boundaries. `docs/context/testing-and-commands.md` records only commands actually run.

- [ ] **Step 3: Run the complete automated gate**

Run in this order and record exact exit codes/counts:

```bash
npm run test:admin-shell
npm run test:content
npm run test:public
npm run test:proxy
npm run test:media
npm run test:worker
npm run test:db
npx tsc --noEmit
npm run typecheck:worker
npm run lint
npm run build
npm run cf:build
npm audit --omit=dev
git diff --check
```

Expected: all exit 0. Only previously documented Next middleware deprecation and OpenNext Windows warnings may remain; investigate any new warning.

- [ ] **Step 4: Run local browser smoke without Staging mutation**

Use existing Local/Staging-read configuration only if already present; do not create or delete remote data without renewed approval. Prefer local fixtures for mutations.

Verify:

1. Guest `/admin` redirects to `/auth/login`.
2. Existing non-admin `/admin` returns to Public and renders no Admin shell.
3. Admin sees one **จัดการเนื้อหา** item and the Explorer.
4. Select virtual root/root/child; URL and direct lists match.
5. Create root and child fixtures; third level is unavailable with explanation.
6. Create a Draft from the selected child; selected `section_id` and URL are exact.
7. Content save → Review → final save returns to the same folder.
8. Dirty section/nav/cancel warning, focus containment, Escape, and focus return pass.
9. Delete only the exact local test fixtures through the existing confirmation/lifecycle flow.
10. Desktop, tablet, and 390px have no horizontal overflow or console errors.

If browser automation cannot choose a local file, do not weaken media acceptance or upload a personal file. Existing component/media lifecycle tests remain mandatory, and a manual file chooser handoff requires explicit user participation.

- [ ] **Step 5: Review scope and security evidence**

Run:

```bash
git diff --name-only 7d40f1d..HEAD
rg -n "service_role|postgres(?:ql)?://|SUPABASE_SERVICE|CLOUDFLARE_API_TOKEN" --glob '!docs/superpowers/plans/**' --glob '!package-lock.json' .
git status --short
```

Expected: no secret value, migration, Worker edit, legacy write, Production config, or unrelated tracked file. The pre-existing untracked `.codex/` remains untouched.

- [ ] **Step 6: Commit documentation and stop before deployment**

```bash
git add TODO.md context.md docs/todo/admin-file-explorer.md docs/context/architecture.md docs/context/testing-and-commands.md
git commit -m "docs: record admin explorer verification"
```

Report Local results and ask for separate approval before any Staging App deployment or Staging mutation. No database migration or Media Worker deploy is expected for this feature.

---

## Final review checklist

- [ ] The implementation matches every acceptance criterion in `docs/superpowers/specs/2026-08-14-admin-file-explorer-design.md`.
- [ ] Physical route-group moves preserve the same external URLs and do not duplicate routes.
- [ ] Invalid/missing section ids never select the first section silently.
- [ ] Direct counts, direct lists, virtual-root counts, search, and status filters agree.
- [ ] All section/document mutations remain behind existing Admin Server Actions and lifecycle functions.
- [ ] No media upload/delete ownership moved into presentation components.
- [ ] Dirty-state warning covers Admin links, Explorer navigation, cancel, refresh, and tab close.
- [ ] Keyboard tree, dialogs, focus return, 44px targets, and 390px layout pass.
- [ ] M01–M06 remain closed and M07 remains unstarted.
- [ ] No Staging or Production claim/action occurs without separate approval.
