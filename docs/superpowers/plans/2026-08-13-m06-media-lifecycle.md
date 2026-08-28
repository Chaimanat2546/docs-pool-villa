# M06 Media Lifecycle & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้การนำรูปออกจาก Content, Upload rollback, Hard-delete Document และ Category cascade เป็น R2-first lifecycle ที่ Fail-closed, Resume ได้ และแจ้ง Retry อย่างเข้าถึงได้

**Architecture:** ใช้ Durable prepared operation ใน PostgreSQL เพื่อ Snapshot intent/manifest และตรึง Document version ก่อนออกไปลบ Exact R2 keys ผ่าน Docs Media Worker จากนั้น Finalize Database mutation ด้วย Operation ID เดิม Cleanup ของ Orphan upload ใช้ตารางและ Claim lease แยก โดยไม่มี Cron, Queue หรือ Media Library

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Supabase PostgreSQL/RLS/pgTAP, Cloudflare Workers/R2, Vitest Workers pool, Testing Library, Base UI Dialog

## Global Constraints

- Requirement source of truth คือ `docs/Poolvilla-Docs-Requirements-TH-v1.2.md`
- Design source of truth คือ `docs/superpowers/specs/2026-08-13-m06-media-lifecycle-design.md`
- ใช้ `npm` และรักษา `package-lock.json`; ห้ามเปลี่ยน Package manager
- ใช้ Imperative migration ที่สร้างด้วย `npx supabase@latest migration new docs_media_lifecycle`; ห้ามตั้ง Timestamp เองหรือแก้ Migration เดิม
- Schema/Function/Table/Index ใหม่ต้องใช้ prefix `doc_*` และห้ามแก้ Legacy objects
- Admin authorization ใช้ `EXISTS(uid = auth.uid() AND role_id = 1)` ผ่าน Helper เดิม; ห้ามใช้ `user_metadata`
- ทุกตารางใน `public` ที่เปิดผ่าน Data API ต้องเปิด RLS และมี Tests ของ Guest/non-admin/Admin
- RPC ใช้ `SECURITY INVOKER`, fixed `search_path`, explicit `REVOKE/GRANT`; Private helper ที่จำเป็นต้องตรวจ Admin ภายใน
- R2 key ต้องเป็น `docs/{document_id}/{media_id}.webp`; รูปหนึ่งเป็นของ Document เดียว
- External R2 call ต้องอยู่นอก Database transaction
- Worker รับ Signed exact-key ticket อายุไม่เกิน 5 นาทีและไม่เปิด Bucket listing
- ไม่มี Cron, Queue, Media Library, Soft delete, Restore หรือ Automatic Archive
- Cache invalidation เกิดหลัง Database Finalize สำเร็จเท่านั้น
- UI ต้องรองรับ Keyboard, Focus, Labels, Alt text, Screen reader และ Mobile 390px
- ทำ Local build/test เท่านั้น; ห้าม Push Staging migration, Deploy Worker/App หรือแตะ Production จนกว่าภูจะอนุมัติแยก
- ก่อนแก้ Next.js Code ให้อ่าน `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` และ `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
- ก่อนใช้ Supabase/Wrangler CLI ให้รัน `--help` ของ Command ที่จะใช้

---

## File Map

### New files

- `src/lib/media/content-media.ts` — Pure Tiptap media extraction, pending-image replacement และ delete batching
- `src/lib/media/content-media.test.ts` — Unit tests ของ Media/content utilities
- `src/lib/media/lifecycle-types.ts` — Shared serializable command/result types
- `src/lib/media/lifecycle.ts` — Server-only Prepare/Delete/Finalize/Cleanup orchestration
- `src/lib/media/lifecycle.test.ts` — Unit tests ของ orchestration และ partial failure
- `src/components/admin/media-operation-banner.tsx` — Pending operation/Cleanup retry status
- `src/components/admin/media-operation-banner.test.tsx` — Accessibility/state tests
- `src/components/admin/media-progress-list.tsx` — Per-image upload status/progress
- `src/components/admin/media-progress-list.test.tsx` — Progress/error tests
- `src/components/admin/media-cleanup-banner.tsx` — Client wrapper สำหรับ one-shot cleanup retry บน Documents page
- `src/components/admin/media-cleanup-banner.test.tsx` — Cleanup retry/banner state tests
- `src/components/admin/hard-delete-dialog.tsx` — Base UI accessible hard-delete confirmation
- `src/components/admin/hard-delete-dialog.test.tsx` — Focus/Escape/confirmation tests
- `src/app/admin/documents/document-form.test.tsx` — Save/rollback/resume integration at component boundary
- `src/app/admin/documents/actions.test.ts` — Document Action Auth/cache/ownership boundary
- `src/app/admin/structure/structure-manager.test.tsx` — Section cascade dialog/retry tests
- `src/app/admin/structure/actions.test.ts` — Structure Action Auth/cache boundary
- `supabase/tests/docs_media_lifecycle_test.sql` — pgTAP coverage ของ M06 schema/RPC/RLS
- `supabase/migrations/*_docs_media_lifecycle.sql` — Path ที่ Supabase CLI สร้างจริงใน Task 2

### Modified files

- `package.json` — เพิ่ม `test:media` และรวมไฟล์ทดสอบใหม่โดยใช้ npm เดิม
- `src/lib/media/upload-ticket.ts` — Bind delete ticket กับ Operation ID/type และ Batch limit
- `workers/docs-media/src/index.ts` — Operation-aware DELETE validation/error/logging
- `workers/docs-media/test/upload.spec.ts` — Worker delete contract regression
- `src/app/admin/documents/actions.ts` — Thin Auth/Input boundary ที่เรียก lifecycle orchestrator
- `src/app/admin/documents/document-form.tsx` — Progress, staged operation, rollback ownership และ hard-delete dialog
- `src/app/admin/documents/[id]/page.tsx` — โหลด Pending operation/Media labels
- `src/app/admin/documents/page.tsx` — Cleanup summary/banner
- `src/app/admin/structure/actions.ts` — Prepared section cascade orchestration
- `src/app/admin/structure/structure-manager.tsx` — Accessible dialog และ Pending section operation
- `src/app/admin/structure/page.tsx` — โหลด Pending section operation
- `supabase/tests/docs_document_management_test.sql` — ปรับ Assertions ที่ใช้ RPC เดิม
- `supabase/tests/docs_structure_management_test.sql` — ปรับ Section-delete contract เดิม
- `docs/todo/M06-media-management.md` — Track งานย่อยและผลจริง
- `TODO.md` — Module status เมื่อ M06 จบจริง
- `context.md` — Current work หลัง M06 จบจริง
- `docs/context/media-storage.md` — Prepared operation/cleanup lifecycle
- `docs/context/database.md` — M06 tables/RPC boundaries
- `docs/context/testing-and-commands.md` — บันทึกเฉพาะ Commands/ผลที่รันจริง

---

### Task 1: Pure Tiptap Media Contract

**Files:**
- Create: `src/lib/media/content-media.ts`
- Create: `src/lib/media/content-media.test.ts`
- Modify: `package.json`
- Modify later consumer: `src/app/admin/documents/document-form.tsx:39`

**Interfaces:**
- Produces: `collectPersistedMedia(content: JSONContent): MediaReferenceResult`
- Produces: `replacePendingImages(content, uploaded, publicUrlFor): JSONContent`
- Produces: `groupDeleteBatches(items, maxKeys?): MediaDeleteBatch[]`
- Consumes: `UploadedPendingImage` from `src/components/editor/pending-images.ts`

- [ ] **Step 1: Add failing tests for nested extraction, duplicate rejection, replacement and batching**

```ts
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { collectPersistedMedia, groupDeleteBatches, replacePendingImages } from "./content-media";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("content media contract", () => {
  it("collects nested persisted images with an accessible label", () => {
    const content: JSONContent = { type: "doc", content: [{ type: "blockquote", content: [{ type: "image", attrs: { mediaId: firstId, src: "https://media.test/one.webp", alt: "ภาพหน้าเข้าสู่ระบบ" } }] }] };
    expect(collectPersistedMedia(content)).toEqual({ ok: true, references: [{ mediaId: firstId, displayLabel: "ภาพหน้าเข้าสู่ระบบ" }] });
  });

  it("rejects duplicate persisted media ids", () => {
    const image = { type: "image", attrs: { mediaId: firstId, src: "https://media.test/one.webp", alt: "ภาพ" } };
    expect(collectPersistedMedia({ type: "doc", content: [image, image] })).toEqual({ ok: false, error: "พบรูปเดิมซ้ำในเอกสาร" });
  });

  it("replaces pending ids without mutating the input", () => {
    const content: JSONContent = { type: "doc", content: [{ type: "image", attrs: { pendingId: "pending-1", src: "blob:one", alt: "ภาพ" } }] };
    const replaced = replacePendingImages(content, new Map([["pending-1", { mediaId: firstId, objectKey: `docs/${secondId}/${firstId}.webp`, mimeType: "image/webp", sizeBytes: 10, width: 1, height: 1 }]]), (key) => `https://media.test/${key}`);
    expect(replaced.content?.[0].attrs).toMatchObject({ mediaId: firstId, src: `https://media.test/docs/${secondId}/${firstId}.webp` });
    expect(content.content?.[0].attrs?.pendingId).toBe("pending-1");
  });

  it("groups by document and caps batches at 1000 exact keys", () => {
    const items = Array.from({ length: 1001 }, (_, index) => ({ documentId: firstId, objectKey: `docs/${firstId}/${String(index).padStart(36, "0")}.webp`, displayLabel: String(index) }));
    expect(groupDeleteBatches(items).map((batch) => batch.objectKeys.length)).toEqual([1000, 1]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `npx vitest --config vitest.config.mts run src/lib/media/content-media.test.ts`

Expected: FAIL because `src/lib/media/content-media.ts` does not exist

- [ ] **Step 3: Implement immutable traversal and deterministic batching**

```ts
import type { JSONContent } from "@tiptap/core";
import type { UploadedPendingImage } from "@/components/editor/pending-images";

export type MediaReference = { mediaId: string; displayLabel: string };
export type MediaReferenceResult = { ok: true; references: MediaReference[] } | { ok: false; error: string };
export type MediaDeleteItem = { documentId: string; objectKey: string; displayLabel: string };
export type MediaDeleteBatch = { documentId: string; objectKeys: string[]; displayLabels: string[] };

export function collectPersistedMedia(content: JSONContent): MediaReferenceResult {
  const references: MediaReference[] = [];
  const seen = new Set<string>();
  const visit = (node: JSONContent) => {
    if (node.type === "image" && typeof node.attrs?.mediaId === "string") {
      if (seen.has(node.attrs.mediaId)) throw new Error("พบรูปเดิมซ้ำในเอกสาร");
      seen.add(node.attrs.mediaId);
      references.push({ mediaId: node.attrs.mediaId, displayLabel: typeof node.attrs.alt === "string" && node.attrs.alt.trim() ? node.attrs.alt.trim() : `${node.attrs.mediaId}.webp` });
    }
    for (const child of node.content ?? []) visit(child);
  };
  try { visit(content); return { ok: true, references }; } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "ข้อมูลรูปไม่ถูกต้อง" }; }
}

export function replacePendingImages(content: JSONContent, uploaded: Map<string, UploadedPendingImage>, publicUrlFor: (objectKey: string) => string): JSONContent {
  const visit = (node: JSONContent): JSONContent => {
    const attrs = node.attrs ? { ...node.attrs } : undefined;
    if (node.type === "image" && typeof attrs?.pendingId === "string") {
      const image = uploaded.get(attrs.pendingId);
      if (image) { delete attrs.pendingId; attrs.mediaId = image.mediaId; attrs.src = publicUrlFor(image.objectKey); }
    }
    return { ...node, ...(attrs ? { attrs } : {}), ...(node.content ? { content: node.content.map(visit) } : {}) };
  };
  return visit(content);
}

export function groupDeleteBatches(items: MediaDeleteItem[], maxKeys = 1000): MediaDeleteBatch[] {
  const byDocument = new Map<string, MediaDeleteItem[]>();
  for (const item of items) byDocument.set(item.documentId, [...(byDocument.get(item.documentId) ?? []), item]);
  return [...byDocument.entries()].flatMap(([documentId, documentItems]) => Array.from({ length: Math.ceil(documentItems.length / maxKeys) }, (_, index) => {
    const slice = documentItems.slice(index * maxKeys, (index + 1) * maxKeys);
    return { documentId, objectKeys: slice.map((item) => item.objectKey), displayLabels: slice.map((item) => item.displayLabel) };
  }));
}
```

- [ ] **Step 4: Add the media test script and run it**

```json
"test:media": "vitest --config vitest.config.mts run src/lib/media/content-media.test.ts"
```

Run: `npx vitest --config vitest.config.mts run src/lib/media/content-media.test.ts`

Expected: PASS 4 tests

- [ ] **Step 5: Commit Task 1**

```bash
git add package.json src/lib/media/content-media.ts src/lib/media/content-media.test.ts
git commit -m "test(media): define persisted content media contract"
```

---

### Task 2: Database Schema, Metadata and RLS Foundation

**Files:**
- Create via Supabase CLI: `supabase/migrations/*_docs_media_lifecycle.sql`
- Create: `supabase/tests/docs_media_lifecycle_test.sql`
- Modify: `supabase/tests/docs_foundation_auth_rls_test.sql`

**Interfaces:**
- Produces tables: `doc_media_operations`, `doc_media_operation_documents`, `doc_media_operation_items`
- Extends: `doc_media`, `doc_media_cleanup`
- Produces invariant: Unique pending operation per `document_id`

- [ ] **Step 1: Discover the installed CLI command and create the migration through Supabase CLI**

Run:

```bash
npx supabase@latest --version
npx supabase@latest migration --help
npx supabase@latest migration new --help
npx supabase@latest migration new docs_media_lifecycle
```

Expected: one new file ending in `_docs_media_lifecycle.sql`; use that exact generated path for every later step

- [ ] **Step 2: Write the failing pgTAP schema/RLS test first**

```sql
begin;
select no_plan();

insert into public.roles (id, name) values
  (1, '{"th":"Administrator"}'::json),
  (2, '{"th":"Member"}'::json);
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'm06-admin@example.test'),
  ('a0000000-0000-0000-0000-000000000002', 'm06-member@example.test');
insert into public.users (uid, role_id) values
  ('a0000000-0000-0000-0000-000000000001', 1),
  ('a0000000-0000-0000-0000-000000000002', 2);
insert into public.doc_sections (id, title, slug) values
  ('b1000000-0000-4000-8000-000000000001', 'M06 Documents', 'm06-documents'),
  ('b1000000-0000-4000-8000-000000000010', 'หมวดสำหรับลบ', 'm06-delete');
insert into public.doc_documents (id, section_id, title, slug) values
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'เอกสาร M06', 'm06-document');

select has_table('public', 'doc_media_operations', 'M06 operation table exists');
select has_table('public', 'doc_media_operation_documents', 'M06 document freeze table exists');
select has_table('public', 'doc_media_operation_items', 'M06 exact manifest table exists');
select has_column('public', 'doc_media', 'mime_type', 'Media stores verified MIME type');
select has_column('public', 'doc_media', 'size_bytes', 'Media stores verified byte size');
select has_column('public', 'doc_media', 'width', 'Media stores verified width');
select has_column('public', 'doc_media', 'height', 'Media stores verified height');
select hasnt_column('public', 'doc_media', 'cleanup_required', 'Cleanup state has one source of truth');
select has_column('public', 'doc_media_cleanup', 'last_error', 'Cleanup stores the latest safe error');
select has_column('public', 'doc_media_cleanup', 'claim_token', 'Cleanup rows support leases');
select ok((select relrowsecurity from pg_class where oid = 'public.doc_media_operations'::regclass), 'Operations have RLS enabled');

select * from finish();
rollback;
```

- [ ] **Step 3: Run reset/test and verify the schema test fails**

Run: `npx supabase@latest db reset && npm run test:db`

Expected: FAIL on missing `doc_media_operations`

- [ ] **Step 4: Implement the schema, constraints, indexes, grants and policies in the CLI-generated migration**

```sql
do $$
begin
  if exists (select 1 from public.doc_media) then
    raise exception 'M06 media metadata migration requires an empty doc_media table.';
  end if;
end $$;

alter table public.doc_media
  drop column cleanup_required,
  add column mime_type text not null default 'image/webp' check (mime_type = 'image/webp'),
  add column size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  add column width integer not null check (width between 1 and 1920),
  add column height integer not null check (height between 1 and 1920);
alter table public.doc_media alter column mime_type drop default;

alter table public.doc_media_cleanup
  rename column reason to last_error;
alter table public.doc_media_cleanup
  add column display_label text not null default 'unknown.webp' check (length(btrim(display_label)) > 0),
  add column attempt_count integer not null default 0 check (attempt_count >= 0),
  add column last_attempt_at timestamptz,
  add column claim_token uuid,
  add column claim_expires_at timestamptz;
alter table public.doc_media_cleanup alter column display_label drop default;

create table public.doc_media_operations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('save_remove', 'document_delete', 'section_delete')),
  document_id uuid references public.doc_documents(id) on delete restrict,
  section_id uuid references public.doc_sections(id) on delete restrict,
  staged_save jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'save_remove' and document_id is not null and section_id is null and staged_save is not null)
    or (kind = 'document_delete' and document_id is not null and section_id is null and staged_save is null)
    or (kind = 'section_delete' and document_id is null and section_id is not null and staged_save is null)
  )
);

create table public.doc_media_operation_documents (
  operation_id uuid not null references public.doc_media_operations(id) on delete cascade,
  document_id uuid not null references public.doc_documents(id) on delete restrict,
  expected_version bigint not null check (expected_version > 0),
  primary key (operation_id, document_id),
  unique (document_id)
);

create table public.doc_media_operation_items (
  operation_id uuid not null references public.doc_media_operations(id) on delete cascade,
  document_id uuid not null references public.doc_documents(id) on delete restrict,
  media_id uuid not null references public.doc_media(id) on delete restrict,
  object_key text not null check (object_key like 'docs/%'),
  display_label text not null check (length(btrim(display_label)) > 0),
  primary key (operation_id, media_id),
  unique (operation_id, object_key)
);

create index doc_media_operations_document_id_idx on public.doc_media_operations(document_id) where document_id is not null;
create index doc_media_operations_section_id_idx on public.doc_media_operations(section_id) where section_id is not null;
create index doc_media_cleanup_claim_idx on public.doc_media_cleanup(claim_expires_at, created_at);

grant select, insert, update, delete on public.doc_media_operations, public.doc_media_operation_documents, public.doc_media_operation_items to authenticated;
alter table public.doc_media_operations enable row level security;
alter table public.doc_media_operation_documents enable row level security;
alter table public.doc_media_operation_items enable row level security;

create policy "Docs administrators manage media operations" on public.doc_media_operations for all to authenticated using ((select doc_private.doc_is_admin())) with check ((select doc_private.doc_is_admin()));
create policy "Docs administrators manage operation documents" on public.doc_media_operation_documents for all to authenticated using ((select doc_private.doc_is_admin())) with check ((select doc_private.doc_is_admin()));
create policy "Docs administrators manage operation items" on public.doc_media_operation_items for all to authenticated using ((select doc_private.doc_is_admin())) with check ((select doc_private.doc_is_admin()));
```

- [ ] **Step 5: Add Guest/non-admin/Admin access assertions**

```sql
set local role anon;
select throws_ok($$select count(*) from public.doc_media_operations$$, '42501', null, 'Guest has no Operation table privilege');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
select throws_ok($$insert into public.doc_media_operations(kind, document_id, staged_save) values ('save_remove', 'b2000000-0000-4000-8000-000000000001', '{}'::jsonb)$$, '42501', null, 'Non-admin cannot create operations');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select lives_ok($$insert into public.doc_media_operations(kind, document_id, staged_save) values ('save_remove', 'b2000000-0000-4000-8000-000000000001', '{}'::jsonb)$$, 'Admin can create an operation');
select is((select count(*) from public.doc_media_operations), 1::bigint, 'Admin can read the operation');
delete from public.doc_media_operations where document_id = 'b2000000-0000-4000-8000-000000000001';
reset role;
```

- [ ] **Step 6: Run database verification**

Run:

```bash
npx supabase@latest db reset
npm run test:db
npx supabase@latest db lint --local --schema public --level warning --fail-on error
```

Expected: reset succeeds, all pgTAP files pass, no new `doc_*` lint error

- [ ] **Step 7: Commit Task 2**

```bash
git add supabase/migrations supabase/tests/docs_media_lifecycle_test.sql supabase/tests/docs_foundation_auth_rls_test.sql
git commit -m "feat(db): add durable media lifecycle state"
```

---

### Task 3: Prepared Document Save RPCs

**Files:**
- Modify: CLI-generated `supabase/migrations/*_docs_media_lifecycle.sql`
- Modify: `supabase/tests/docs_media_lifecycle_test.sql`
- Modify: `supabase/tests/docs_document_management_test.sql`

**Interfaces:**
- Produces RPC: `doc_prepare_document_save(...)`
- Produces RPC: `doc_get_media_operation(uuid)`
- Produces RPC: `doc_mark_media_operation_failed(uuid, text)`
- Produces RPC: `doc_finalize_document_save(uuid)`
- Replaces direct use of: `doc_save_document(...)`

- [ ] **Step 1: Add failing pgTAP tests for direct save, staged removal, ownership and freeze**

```sql
select has_function('public', 'doc_prepare_document_save', array['uuid','uuid','text','text','text','jsonb','text','integer','bigint','jsonb'], 'Prepared save RPC exists');
select has_function('public', 'doc_finalize_document_save', array['uuid'], 'Prepared save finalize RPC exists');

select is(
  (select finalized from public.doc_prepare_document_save(
    'b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'เอกสาร', 'document', null,
    '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://media.test/one.webp","alt":"ภาพเดิม","mediaId":"b3000000-0000-4000-8000-000000000001"}}]}'::jsonb,
    'draft', 0, null,
    '[{"id":"b3000000-0000-4000-8000-000000000001","object_key":"docs/b2000000-0000-4000-8000-000000000002/b3000000-0000-4000-8000-000000000001.webp","public_url":"https://media.test/one.webp","mime_type":"image/webp","size_bytes":26,"width":1,"height":1}]'::jsonb
  )), true, 'Save without removed media finalizes in one transaction'
);

select ok(
  (select operation_id is not null from public.doc_prepare_document_save(
    'b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'เอกสารใหม่', 'document', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
  )), 'Removing stored media creates a durable operation'
);

select throws_ok(
  $$select * from public.doc_prepare_document_save(
    'b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'เขียนซ้อน', 'document', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
  )$$,
  'P0003', null, 'Pending operation blocks a concurrent save'
);

select lives_ok(
  $$select * from public.doc_finalize_document_save((select id from public.doc_media_operations where kind = 'save_remove' and document_id = 'b2000000-0000-4000-8000-000000000002'))$$,
  'Finalizing the prepared removal applies staged content and clears the freeze'
);
```

- [ ] **Step 2: Run the focused database test and confirm missing-function failure**

Run: `npx supabase@latest db reset && npx supabase@latest test db --local supabase/tests/docs_media_lifecycle_test.sql`

Expected: FAIL because `doc_prepare_document_save` is undefined

- [ ] **Step 3: Implement typed prepared-save and operation-read contracts**

Use these exact signatures in the migration:

```sql
create function public.doc_prepare_document_save(
  p_id uuid,
  p_section_id uuid,
  p_title text,
  p_slug text,
  p_excerpt text,
  p_content jsonb,
  p_status text,
  p_sort_order integer,
  p_expected_version bigint,
  p_media jsonb default '[]'::jsonb
) returns table(operation_id uuid, finalized boolean, document_id uuid, version bigint, status text, path text);

create function public.doc_get_media_operation(p_operation_id uuid)
returns table(operation_id uuid, kind text, target_id uuid, attempt_count integer, last_error text, items jsonb);

create function public.doc_mark_media_operation_failed(p_operation_id uuid, p_error text)
returns void;

create function public.doc_finalize_document_save(p_operation_id uuid)
returns table(document_id uuid, version bigint, status text, path text);
```

Implementation rules inside these functions:

```sql
-- At the start of every public mutation RPC:
if not (select doc_private.doc_is_admin()) then
  raise exception 'Administrator access is required.' using errcode = '42501';
end if;

-- Before accepting a save:
if exists (select 1 from public.doc_media_operation_documents where document_id = p_id) then
  raise exception 'A media operation is pending.' using errcode = 'P0003';
end if;

-- Validate every content media id against existing media or p_media, and reject
-- any existing media whose document_id differs from p_id.
-- When removed media exists, persist normalized fields and p_media in staged_save,
-- insert one freeze row, and copy exact media rows into operation_items.
-- When no removed media exists, execute the existing route/version/media save logic
-- directly and return finalized=true with operation_id=null.
```

`doc_get_media_operation()` must return exactly one aggregate row even when the manifest is empty, so an interrupted zero-media delete can still finalize:

```sql
select operation.id,
       operation.kind,
       coalesce(operation.document_id, operation.section_id) as target_id,
       operation.attempt_count,
       operation.last_error,
       coalesce(
         jsonb_agg(jsonb_build_object(
           'documentId', item.document_id,
           'objectKey', item.object_key,
           'displayLabel', item.display_label
         ) order by item.document_id, item.object_key)
           filter (where item.media_id is not null),
         '[]'::jsonb
       ) as items
from public.doc_media_operations as operation
left join public.doc_media_operation_items as item on item.operation_id = operation.id
where operation.id = p_operation_id
group by operation.id;
```

`doc_finalize_document_save()` must lock the Operation/freeze row, re-check `expected_version`, apply staged content/metadata, delete removed `doc_media`, increment Version once, then delete the Operation before returning

Every new public function must `REVOKE ALL` from `public, anon, authenticated, service_role`, then grant only its exact signature to `authenticated`. `doc_get_media_operation()` also checks Admin before returning a row. Between creating the pending save and finalizing it, add these authorization assertions:

```sql
set local role anon;
select throws_ok($$select * from public.doc_get_media_operation(gen_random_uuid())$$, '42501', null, 'Guest cannot execute Operation read RPC');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
select throws_ok($$select * from public.doc_prepare_document_save('b2000000-0000-4000-8000-000000000099', 'b1000000-0000-4000-8000-000000000001', 'ห้ามบันทึก', 'forbidden', null, '{"type":"doc","content":[]}'::jsonb, 'draft', 0, null, '[]'::jsonb)$$, '42501', null, 'Non-admin cannot prepare a save');
select throws_ok($$select public.doc_mark_media_operation_failed(gen_random_uuid(), 'forbidden')$$, '42501', null, 'Non-admin cannot mark an operation failed');
select throws_ok($$select * from public.doc_finalize_document_save(gen_random_uuid())$$, '42501', null, 'Non-admin cannot finalize a save');
reset role;
```

- [ ] **Step 4: Replace M04 tests with the new prepare result and add full metadata assertions**

Place these assertions immediately after the direct finalized save and before the staged-removal call deletes that media row:

```sql
select is((select mime_type from public.doc_media where id = 'b3000000-0000-4000-8000-000000000001'), 'image/webp', 'Save persists verified MIME');
select is((select size_bytes from public.doc_media where id = 'b3000000-0000-4000-8000-000000000001'), 26::bigint, 'Save persists verified byte size');
select is((select width from public.doc_media where id = 'b3000000-0000-4000-8000-000000000001'), 1, 'Save persists verified width');
select is((select height from public.doc_media where id = 'b3000000-0000-4000-8000-000000000001'), 1, 'Save persists verified height');
```

- [ ] **Step 5: Verify staged save rollback/finalize behavior**

Run: `npx supabase@latest db reset && npm run test:db`

Expected: all DB tests pass; staged content remains unchanged before finalize and changes atomically after finalize

- [ ] **Step 6: Commit Task 3**

```bash
git add supabase/migrations supabase/tests/docs_media_lifecycle_test.sql supabase/tests/docs_document_management_test.sql
git commit -m "feat(db): prepare and finalize media-aware saves"
```

---

### Task 4: Orphan Cleanup Claim Lifecycle

**Files:**
- Modify: CLI-generated `supabase/migrations/*_docs_media_lifecycle.sql`
- Modify: `supabase/tests/docs_media_lifecycle_test.sql`

**Interfaces:**
- Produces RPC: `doc_record_media_cleanup(uuid, jsonb, text)`
- Produces RPC: `doc_claim_media_cleanup(uuid, integer)`
- Produces RPC: `doc_complete_media_cleanup(uuid, text[])`
- Produces RPC: `doc_fail_media_cleanup(uuid, text[], text)`

- [ ] **Step 1: Add failing tests for upsert, bounded claim, failure and completion**

```sql
select lives_ok(
  $$select public.doc_record_media_cleanup(
    'b2000000-0000-4000-8000-000000000099',
    '[{"object_key":"docs/b2000000-0000-4000-8000-000000000099/b3000000-0000-4000-8000-000000000099.webp","display_label":"b3000000-0000-4000-8000-000000000099.webp"}]'::jsonb,
    'เชื่อมต่อ Docs Media Worker ไม่สำเร็จ'
  )$$,
  'Admin records an orphan even when the document does not exist'
);

create temporary table claimed_cleanup as
select * from public.doc_claim_media_cleanup(null, 100);
select is((select count(*) from claimed_cleanup), 1::bigint, 'Cleanup claim is bounded and returns pending work');
select lives_ok(
  $$select public.doc_fail_media_cleanup((select claim_token from claimed_cleanup limit 1), array[(select object_key from claimed_cleanup limit 1)], 'R2 unavailable')$$,
  'Failed cleanup releases the lease and records a safe error'
);
select is((select attempt_count from public.doc_media_cleanup limit 1), 1, 'Failure increments attempt count once');
```

- [ ] **Step 2: Run the focused pgTAP file and verify missing-function failure**

Run: `npx supabase@latest test db --local supabase/tests/docs_media_lifecycle_test.sql`

Expected: FAIL because cleanup RPCs are undefined

- [ ] **Step 3: Implement atomic upsert and SKIP LOCKED claim functions**

```sql
create function public.doc_record_media_cleanup(p_document_id uuid, p_items jsonb, p_error text) returns void;
create function public.doc_claim_media_cleanup(p_document_id uuid default null, p_limit integer default 100)
returns table(claim_token uuid, document_id uuid, object_key text, display_label text, attempt_count integer);
create function public.doc_complete_media_cleanup(p_claim_token uuid, p_object_keys text[]) returns void;
create function public.doc_fail_media_cleanup(p_claim_token uuid, p_object_keys text[], p_error text) returns void;
```

Claim implementation must atomically assign one generated token:

```sql
with candidates as (
  select id
  from public.doc_media_cleanup
  where (p_document_id is null or document_id = p_document_id)
    and (claim_expires_at is null or claim_expires_at < now())
  order by created_at, id
  limit least(greatest(p_limit, 1), 100)
  for update skip locked
)
update public.doc_media_cleanup as cleanup
set claim_token = v_claim_token,
    claim_expires_at = now() + interval '5 minutes',
    last_attempt_at = now(),
    updated_at = now()
from candidates
where cleanup.id = candidates.id
returning v_claim_token, cleanup.document_id, cleanup.object_key, cleanup.display_label, cleanup.attempt_count;
```

- [ ] **Step 4: Add non-admin RPC rejection and expired-lease reclaim tests**

```sql
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
select throws_ok($$select * from public.doc_claim_media_cleanup(null, 100)$$, '42501', null, 'Non-admin cannot claim cleanup');
select throws_ok($$select public.doc_record_media_cleanup(gen_random_uuid(), '[]'::jsonb, 'forbidden')$$, '42501', null, 'Non-admin cannot record cleanup');
select throws_ok($$select public.doc_complete_media_cleanup(gen_random_uuid(), array['docs/00000000-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000001.webp'])$$, '42501', null, 'Non-admin cannot complete cleanup');
select throws_ok($$select public.doc_fail_media_cleanup(gen_random_uuid(), array['docs/00000000-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000001.webp'], 'forbidden')$$, '42501', null, 'Non-admin cannot fail cleanup');
reset role;
```

Also assert `anon` receives `42501` when executing each cleanup RPC, then return to the Admin identity for the expired-lease reclaim assertion.

- [ ] **Step 5: Run DB tests and commit**

Run: `npx supabase@latest db reset && npm run test:db`

Expected: all DB tests pass

```bash
git add supabase/migrations supabase/tests/docs_media_lifecycle_test.sql
git commit -m "feat(db): add retryable orphan cleanup claims"
```

---

### Task 5: Prepared Document and Section Delete RPCs

**Files:**
- Modify: CLI-generated `supabase/migrations/*_docs_media_lifecycle.sql`
- Modify: `supabase/tests/docs_media_lifecycle_test.sql`
- Modify: `supabase/tests/docs_document_management_test.sql`
- Modify: `supabase/tests/docs_structure_management_test.sql`

**Interfaces:**
- Produces: `doc_prepare_document_delete(uuid, bigint)` returning Operation ID
- Produces: `doc_finalize_document_delete(uuid)` accepting Operation ID
- Produces: `doc_prepare_section_delete(uuid, text)` returning Operation ID
- Produces: `doc_finalize_section_delete(uuid)` accepting Operation ID
- Revokes the legacy direct `doc_delete_section(uuid, text)` execution path from `authenticated`

- [ ] **Step 1: Add failing tests for durable delete freezes and section snapshot**

```sql
insert into public.doc_sections (id, parent_id, title, slug) values
  ('b1000000-0000-4000-8000-000000000011', 'b1000000-0000-4000-8000-000000000010', 'หมวดย่อยสำหรับลบ', 'm06-delete-child');
insert into public.doc_documents (id, section_id, title, slug) values
  ('b2000000-0000-4000-8000-000000000010', 'b1000000-0000-4000-8000-000000000011', 'เอกสารในหมวดลบ', 'section-delete-document');
insert into public.doc_media (id, document_id, object_key, public_url, mime_type, size_bytes, width, height) values
  ('b3000000-0000-4000-8000-000000000010', 'b2000000-0000-4000-8000-000000000010', 'docs/b2000000-0000-4000-8000-000000000010/b3000000-0000-4000-8000-000000000010.webp', 'https://media.test/section.webp', 'image/webp', 26, 1, 1);

create temporary table prepared_document_delete as
select * from public.doc_prepare_document_delete('b2000000-0000-4000-8000-000000000001', 1);
select ok(
  (select operation_id is not null from prepared_document_delete),
  'Document delete creates a durable operation'
);
select throws_ok(
  $$select * from public.doc_prepare_document_save(
    'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'ชนงานลบ', 'document', null,
    '{"type":"doc","content":[]}'::jsonb, 'draft', 0, 1, '[]'::jsonb
  )$$,
  'P0003', null, 'Delete freeze blocks save'
);
create temporary table prepared_section_delete as
select * from public.doc_prepare_section_delete('b1000000-0000-4000-8000-000000000010', 'หมวดสำหรับลบ');
select is((select document_count from prepared_section_delete), 1::bigint, 'Section delete snapshots one document');
select is((select media_count from prepared_section_delete), 1::bigint, 'Section delete snapshots one media object');
select lives_ok($$select * from public.doc_finalize_document_delete((select operation_id from prepared_document_delete))$$, 'Document finalize removes the isolated document');
select lives_ok($$select * from public.doc_finalize_section_delete((select operation_id from prepared_section_delete))$$, 'Section finalize removes the frozen subtree');
```

- [ ] **Step 2: Run the DB file and confirm section functions are missing**

Run: `npx supabase@latest test db --local supabase/tests/docs_media_lifecycle_test.sql`

Expected: FAIL on `doc_prepare_section_delete`

- [ ] **Step 3: Drop/recreate the old document delete signatures and add section functions**

```sql
drop function public.doc_prepare_document_delete(uuid, bigint);
drop function public.doc_finalize_document_delete(uuid, bigint);

create function public.doc_prepare_document_delete(p_document_id uuid, p_expected_version bigint)
returns table(operation_id uuid, media_count bigint);
create function public.doc_finalize_document_delete(p_operation_id uuid)
returns table(document_id uuid);
create function public.doc_prepare_section_delete(p_section_id uuid, p_confirmed_title text)
returns table(operation_id uuid, document_count bigint, media_count bigint);
create function public.doc_finalize_section_delete(p_operation_id uuid)
returns table(section_id uuid);
```

Concrete rules:

```sql
-- Prepare section:
-- 1. pg_advisory_xact_lock(810241, 1)
-- 2. validate exact confirmed title
-- 3. materialize root + direct children subtree
-- 4. lock documents ORDER BY id FOR UPDATE
-- 5. reject any document already present in operation_documents
-- 6. insert one freeze row per document and one manifest row per media object

-- Finalize section:
-- lock operation, verify kind='section_delete', verify every current version,
-- delete the operation first (cascade links/items), then redirects/media/documents/
-- children/root within the same transaction, and return the captured root section id.
```

Use an isolated document fixture for the Document-delete assertions and a separate parent/child/document fixture for Section-delete assertions. Finalize must capture the target ID before deleting the Operation row, return that ID, and prove that a second finalize call fails safely without deleting unrelated rows.

Before either Admin finalize, switch to the non-admin fixture and assert `42501` for both Prepare signatures and both Finalize signatures using valid-shaped UUID inputs. Also assert `anon` has no execute privilege on those four RPC signatures. Restore the Admin identity before continuing the success assertions.

Revoke the legacy M02 delete RPC:

```sql
revoke execute on function public.doc_delete_section(uuid, text) from authenticated;
```

- [ ] **Step 4: Update M02/M04 regression tests to use prepare/finalize and assert stale version rejection**

Run: `npx supabase@latest db reset && npm run test:db`

Expected: all structure/document/media lifecycle pgTAP tests pass

- [ ] **Step 5: Run local DB lint and advisors**

Run:

```bash
npx supabase@latest db lint --local --schema public --level warning --fail-on error
npx supabase@latest db advisors --local --type security --level warn --fail-on error
npx supabase@latest db advisors --local --type performance --level warn --fail-on none
```

Expected: no new warning for `doc_*`; Legacy warnings remain out of scope

- [ ] **Step 6: Commit Task 5**

```bash
git add supabase/migrations supabase/tests/docs_media_lifecycle_test.sql supabase/tests/docs_document_management_test.sql supabase/tests/docs_structure_management_test.sql
git commit -m "feat(db): prepare document and section media deletion"
```

---

### Task 6: Operation-bound Worker Delete Contract

**Files:**
- Modify: `src/lib/media/upload-ticket.ts:12`
- Modify: `workers/docs-media/src/index.ts:120`
- Modify: `workers/docs-media/test/upload.spec.ts:104`
- Regenerate during verification: `workers/docs-media/src/env.d.ts`

**Interfaces:**
- Changes `MediaDeleteTicketPayload`
- Keeps endpoint: `DELETE /objects`
- Enforces 1–1,000 keys per ticket

- [ ] **Step 1: Extend failing Worker tests before changing the ticket implementation**

```ts
const operationId = "77777777-7777-4777-8777-777777777777";

it("binds delete tickets to an operation id and operation type", async () => {
  const missingOperation = await signMediaDeleteTicket({ operation: "delete", operationId: "invalid", operationType: "document_delete", documentId, objectKeys: [objectKey], expiresAt: Date.now() + 60_000 }, "test-docs-media-secret");
  const response = await worker.fetch(new Request("https://media.example.test/objects", { method: "DELETE", headers: { "X-Docs-Media-Ticket": missingOperation } }), env, createExecutionContext());
  expect(response.status).toBe(401);
});

it("rejects empty and over-1000-key delete batches", async () => {
  const keys = Array.from({ length: 1001 }, (_, index) => `docs/${documentId}/${String(index).padStart(36, "0")}.webp`);
  const ticket = await signMediaDeleteTicket({ operation: "delete", operationId, operationType: "section_delete", documentId, objectKeys: keys, expiresAt: Date.now() + 60_000 }, "test-docs-media-secret");
  const response = await worker.fetch(new Request("https://media.example.test/objects", { method: "DELETE", headers: { "X-Docs-Media-Ticket": ticket } }), env, createExecutionContext());
  expect(response.status).toBe(401);
});
```

- [ ] **Step 2: Run Worker tests and verify they fail**

Run: `npm run test:worker`

Expected: FAIL because the current payload has no `operationId`/`operationType` validation

- [ ] **Step 3: Extend and validate the delete payload**

```ts
export type MediaOperationType = "save_remove" | "document_delete" | "section_delete" | "cleanup";
export type MediaDeleteTicketPayload = {
  operation: "delete";
  operationId: string;
  operationType: MediaOperationType;
  documentId: string;
  objectKeys: string[];
  expiresAt: number;
};
```

Validation must require UUID `operationId`, allowed `operationType`, 1–1,000 unique exact-document keys and finite positive expiry

- [ ] **Step 4: Add operation-specific delete failure handling and structured logging**

```ts
try {
  await env.DOCS_MEDIA_BUCKET.delete(payload.objectKeys);
  console.log(JSON.stringify({ message: "docs media delete completed", operationId: payload.operationId, operationType: payload.operationType, keyCount: payload.objectKeys.length }));
  return json(request, env, 200, { deleted: payload.objectKeys.length });
} catch (error) {
  console.error(JSON.stringify({ message: "docs media delete failed", operationId: payload.operationId, operationType: payload.operationType, keyCount: payload.objectKeys.length, error: error instanceof Error ? error.message : "Unknown error" }));
  return json(request, env, 500, { error: "ลบรูปไม่สำเร็จ กรุณาลองอีกครั้ง" });
}
```

- [ ] **Step 5: Update every existing delete test ticket and verify logs omit Ticket/Secret**

Run:

```bash
npm run test:worker
npm run typecheck:worker
```

Expected: Worker tests pass and generated Env types match Wrangler config

- [ ] **Step 6: Commit Task 6**

```bash
git add src/lib/media/upload-ticket.ts workers/docs-media/src workers/docs-media/test/upload.spec.ts
git commit -m "feat(worker): bind deletes to media operations"
```

---

### Task 7: Server Media Lifecycle Orchestrator

**Files:**
- Create: `src/lib/media/lifecycle-types.ts`
- Create: `src/lib/media/lifecycle.ts`
- Create: `src/lib/media/lifecycle.test.ts`
- Modify: `src/lib/media/upload-ticket.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `runDocumentSave(command)`
- Produces: `prepareAndDeleteDocument(documentId, expectedVersion)`
- Produces: `prepareAndDeleteSection(sectionId, confirmedTitle)`
- Produces: `readMediaOperation(operationId)`
- Produces: `resumeMediaOperation(operationId)`
- Produces: `rollbackUploadedMedia(documentId, items)`
- Produces: `retryMediaCleanup(documentId?)`

- [ ] **Step 1: Define serializable command/result types and write orchestration failure tests**

```ts
export type MediaOperationKind = "save_remove" | "document_delete" | "section_delete";
export type MediaWorkKind = MediaOperationKind | "cleanup";
export type UploadedMediaCommand = { mediaId: string; objectKey: string; displayLabel: string; mimeType: "image/webp"; sizeBytes: number; width: number; height: number };
export type DocumentSaveCommand = { id: string; sectionId: string; title: string; slug: string; excerpt: string; content: unknown; status: "draft" | "published" | "archived"; sortOrder: number; expectedVersion: number | null; media: UploadedMediaCommand[] };
export type MediaOperationView = { operationId: string; kind: MediaWorkKind; targetId: string; files: string[]; attemptCount: number; message: string };
export type LifecycleResult = { success: true; kind: MediaWorkKind; targetId: string; version?: number; path?: string } | { pending: true; operation: MediaOperationView } | { error: string; files?: string[] };
export type CleanupRetryResult = { status: "complete" } | { status: "pending"; remaining: MediaOperationView[] } | { status: "error"; error: string };
```

```ts
it("does not finalize when the second R2 batch fails", async () => {
  rpc.mockResolvedValueOnce({ data: preparedOperationRows, error: null });
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ deleted: 1000 }), { status: 200 }));
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "ลบรูปไม่สำเร็จ กรุณาลองอีกครั้ง" }), { status: 500 }));
  const result = await resumeMediaOperation(operationId);
  expect(result).toMatchObject({ pending: true });
  expect(rpc).not.toHaveBeenCalledWith("doc_finalize_section_delete", expect.anything());
  expect(rpc).toHaveBeenCalledWith("doc_mark_media_operation_failed", expect.objectContaining({ p_operation_id: operationId }));
});
```

- [ ] **Step 2: Run the lifecycle test and verify missing-module failure**

Run: `npx vitest --config vitest.config.mts run src/lib/media/lifecycle.test.ts`

Expected: FAIL because `lifecycle.ts` does not exist

- [ ] **Step 3: Implement exact-key Worker calls and resume dispatch**

```ts
import "server-only";

const finalizeRpc: Record<MediaOperationKind, string> = {
  save_remove: "doc_finalize_document_save",
  document_delete: "doc_finalize_document_delete",
  section_delete: "doc_finalize_section_delete",
};

const operationKinds = new Set<MediaOperationKind>(["save_remove", "document_delete", "section_delete"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOperationItems(value: unknown): MediaDeleteItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: MediaDeleteItem[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Record<string, unknown>;
    if (typeof item.documentId !== "string" || !uuidPattern.test(item.documentId)) return null;
    if (typeof item.objectKey !== "string") return null;
    const keyParts = item.objectKey.split("/");
    if (keyParts.length !== 3 || keyParts[0] !== "docs" || keyParts[1] !== item.documentId || !keyParts[2].endsWith(".webp") || !uuidPattern.test(keyParts[2].slice(0, -5))) return null;
    if (typeof item.displayLabel !== "string" || !item.displayLabel.trim()) return null;
    items.push({ documentId: item.documentId, objectKey: item.objectKey, displayLabel: item.displayLabel.trim() });
  }
  return items;
}

function normalizeFinalizeResult(kind: MediaOperationKind, targetId: string, data: unknown): LifecycleResult {
  const row = Array.isArray(data) && data[0] && typeof data[0] === "object" ? data[0] as Record<string, unknown> : {};
  return {
    success: true,
    kind,
    targetId,
    ...(typeof row.version === "number" ? { version: row.version } : {}),
    ...(typeof row.path === "string" ? { path: row.path } : {}),
  };
}

export async function resumeMediaOperation(operationId: string): Promise<LifecycleResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("doc_get_media_operation", { p_operation_id: operationId });
  if (error || !data?.length) return { error: "ไม่พบงานลบรูปที่ต้องลองอีกครั้ง" };
  const row = data[0];
  if (!operationKinds.has(row.kind as MediaOperationKind) || typeof row.target_id !== "string" || !uuidPattern.test(row.target_id)) return { error: "ข้อมูลงานลบรูปไม่ถูกต้อง" };
  const kind = row.kind as MediaOperationKind;
  const items = parseOperationItems(row.items);
  if (!items) return { error: "รายการรูปของงานลบไม่ถูกต้อง" };
  for (const batch of groupDeleteBatches(items)) {
    const failure = await deleteWorkerBatch({ operationId, operationType: kind, ...batch });
    if (failure) {
      await supabase.rpc("doc_mark_media_operation_failed", { p_operation_id: operationId, p_error: failure.message });
      return { pending: true, operation: { operationId, kind, targetId: row.target_id, files: failure.files, attemptCount: Number(row.attempt_count) + 1, message: failure.message } };
    }
  }
  const { data: finalized, error: finalizeError } = await supabase.rpc(finalizeRpc[kind], { p_operation_id: operationId });
  if (finalizeError) {
    const message = "ลบรูปแล้วแต่ยังบันทึกฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง";
    await supabase.rpc("doc_mark_media_operation_failed", { p_operation_id: operationId, p_error: message });
    return { pending: true, operation: { operationId, kind, targetId: row.target_id, files: items.map((item) => item.displayLabel), attemptCount: Number(row.attempt_count) + 1, message } };
  }
  return normalizeFinalizeResult(kind, row.target_id, finalized);
}
```

Implement a shared private loader around `doc_get_media_operation()`. `readMediaOperation(operationId)` maps that loader to `MediaOperationView | null` using all manifest labels and the stored safe error; `resumeMediaOperation()` reuses the same validated loader so Server pages and mutation paths cannot drift in parsing or authorization behavior.

`deleteWorkerBatch()` must require Worker URL/Secret, sign the exact batch, set `X-Docs-Media-Ticket`, use `cache: "no-store"`, parse only bounded safe JSON error text and return all display labels in the failed batch

- [ ] **Step 4: Implement prepare wrappers and cleanup claim loop**

```ts
export async function retryMediaCleanup(documentId?: string): Promise<CleanupRetryResult> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("doc_claim_media_cleanup", { p_document_id: documentId ?? null, p_limit: 100 });
  if (error) return { status: "error", error: "ไม่สามารถเริ่มงานล้างรูปได้ กรุณาลองอีกครั้ง" };
  if (!rows?.length) return { status: "complete" };
  const claimToken = rows[0].claim_token;
  const completedKeys = new Set<string>();
  for (const batch of groupDeleteBatches(rows.map((row) => ({ documentId: row.document_id, objectKey: row.object_key, displayLabel: row.display_label })))) {
    const failure = await deleteWorkerBatch({ operationId: claimToken, operationType: "cleanup", ...batch });
    if (failure) {
      const remainingRows = rows.filter((row) => !completedKeys.has(row.object_key));
      await supabase.rpc("doc_fail_media_cleanup", { p_claim_token: claimToken, p_object_keys: remainingRows.map((row) => row.object_key), p_error: failure.message });
      return { status: "pending", remaining: [{ operationId: claimToken, kind: "cleanup", targetId: batch.documentId, files: remainingRows.map((row) => row.display_label), attemptCount: Math.max(...remainingRows.map((row) => Number(row.attempt_count))) + 1, message: failure.message }] };
    }
    const { error: completeError } = await supabase.rpc("doc_complete_media_cleanup", { p_claim_token: claimToken, p_object_keys: batch.objectKeys });
    if (completeError) {
      const message = "ลบรูปแล้วแต่ยังปิดงาน Cleanup ไม่สำเร็จ กรุณาลองอีกครั้ง";
      const remainingRows = rows.filter((row) => !completedKeys.has(row.object_key));
      await supabase.rpc("doc_fail_media_cleanup", { p_claim_token: claimToken, p_object_keys: remainingRows.map((row) => row.object_key), p_error: message });
      return { status: "pending", remaining: [{ operationId: claimToken, kind: "cleanup", targetId: batch.documentId, files: remainingRows.map((row) => row.display_label), attemptCount: Math.max(...remainingRows.map((row) => Number(row.attempt_count))) + 1, message }] };
    }
    for (const objectKey of batch.objectKeys) completedKeys.add(objectKey);
  }
  return { status: "complete" };
}
```

`runDocumentSave()` must call bounded cleanup for the current Document as best effort, call `doc_prepare_document_save`, return the direct finalized row when `finalized=true`, and call `resumeMediaOperation(operation_id)` otherwise. If prepare fails after Browser uploads exist, it owns immediate exact-key rollback and records cleanup only when that rollback fails. `prepareAndDeleteDocument()` and `prepareAndDeleteSection()` call their Prepare RPC once, then resume the returned Operation; no Action or Client may repeat Prepare for a pending operation.

- [ ] **Step 5: Cover missing configuration, DB prepare failure, idempotent retry and finalize interruption**

Run: `npx vitest --config vitest.config.mts run src/lib/media/lifecycle.test.ts`

Expected: PASS all lifecycle orchestration tests

Then expand `test:media` to include `src/lib/media/lifecycle.test.ts` and run `npm run test:media`.

- [ ] **Step 6: Commit Task 7**

```bash
git add package.json src/lib/media/lifecycle-types.ts src/lib/media/lifecycle.ts src/lib/media/lifecycle.test.ts src/lib/media/upload-ticket.ts
git commit -m "feat(media): orchestrate durable lifecycle operations"
```

---

### Task 8: Server Actions and Cache Boundaries

**Files:**
- Modify: `src/app/admin/documents/actions.ts:98`
- Modify: `src/app/admin/structure/actions.ts:95`
- Create: `src/app/admin/documents/actions.test.ts`
- Create: `src/app/admin/structure/actions.test.ts`
- Modify: `package.json`

**Interfaces:**
- Exposes Action: `saveDocument(value)`
- Exposes Action: `rollbackUploadedMedia(documentId, items)` only for failures before Save Action submission
- Exposes Action: `retryMediaOperation(operationId)`
- Exposes Action: `retryMediaCleanup(documentId?)`
- Exposes Action: `deleteDocument(documentId, expectedVersion)`
- Exposes Action: `deleteSection(sectionId, confirmedName)`

- [ ] **Step 1: Write action tests proving Auth, single cleanup owner and post-finalize revalidation**

```ts
it("does not ask the client to clean uploads after the server handled a failed save", async () => {
  runDocumentSaveMock.mockResolvedValue({ error: "เอกสารถูกแก้ไขจากที่อื่น กรุณา Reload ก่อนบันทึกอีกครั้ง" });
  const result = await saveDocument(validInput);
  expect(result).toEqual({ error: "เอกสารถูกแก้ไขจากที่อื่น กรุณา Reload ก่อนบันทึกอีกครั้ง" });
  expect(runDocumentSaveMock).toHaveBeenCalledTimes(1);
});

it("invalidates public docs only after a finalized published save", async () => {
  runDocumentSaveMock.mockResolvedValue({ success: true, kind: "save_remove", targetId: documentId, version: 2, path: "/guides/start" });
  await saveDocument({ ...validInput, status: "published" });
  expect(revalidatePublicDocsMock).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run focused action tests and confirm current behavior fails**

Run: `npx vitest --config vitest.config.mts run src/app/admin/documents/actions.test.ts src/app/admin/structure/actions.test.ts`

Expected: FAIL because actions still own raw R2/DB orchestration and duplicate cleanup

- [ ] **Step 3: Make Actions thin and preserve safe validation/error mapping**

```ts
export async function retryMediaOperation(operationId: unknown): Promise<LifecycleResult> {
  await requireAdmin();
  if (typeof operationId !== "string" || !uuidPattern.test(operationId)) return { error: "ข้อมูลงานลบรูปไม่ถูกต้อง" };
  const result = await resumeMediaOperation(operationId);
  if ("success" in result) revalidateAfterMediaFinalize(result);
  return result;
}
```

Delete these responsibilities from `actions.ts`: direct ticket signing, raw Worker fetch, direct cleanup-table upsert and client-triggered cleanup after a submitted Save

- [ ] **Step 4: Add the new action tests to `test:media` and run them**

Expand the script to the files that exist now:

```json
"test:media": "vitest --config vitest.config.mts run src/lib/media/content-media.test.ts src/lib/media/lifecycle.test.ts src/app/admin/documents/actions.test.ts src/app/admin/structure/actions.test.ts"
```

Run: `npm run test:media`

Expected: action, lifecycle, utility and component test files that exist at this point pass

- [ ] **Step 5: Commit Task 8**

```bash
git add package.json src/app/admin/documents/actions.ts src/app/admin/documents/actions.test.ts src/app/admin/structure/actions.ts src/app/admin/structure/actions.test.ts
git commit -m "refactor(admin): route media mutations through lifecycle actions"
```

---

### Task 9: Reusable Accessible Media UI

**Files:**
- Create: `src/components/admin/media-operation-banner.tsx`
- Create: `src/components/admin/media-operation-banner.test.tsx`
- Create: `src/components/admin/media-progress-list.tsx`
- Create: `src/components/admin/media-progress-list.test.tsx`
- Create: `src/components/admin/hard-delete-dialog.tsx`
- Create: `src/components/admin/hard-delete-dialog.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces component: `MediaOperationBanner`
- Produces component: `MediaProgressList`
- Produces component: `HardDeleteDialog`

- [ ] **Step 1: Write failing accessibility/state tests**

```tsx
it("announces failed files and invokes retry once", async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  render(<MediaOperationBanner operation={{ operationId, kind: "document_delete", targetId: documentId, files: ["ภาพหน้าเข้าสู่ระบบ"], attemptCount: 1, message: "ลบรูปไม่สำเร็จ" }} onRetry={onRetry} />);
  expect(screen.getByRole("alert")).toHaveTextContent("ภาพหน้าเข้าสู่ระบบ");
  await user.click(screen.getByRole("button", { name: "ลองลบรูปอีกครั้ง" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

it("returns focus to the hard-delete trigger after Escape", async () => {
  const user = userEvent.setup();
  render(<HardDeleteDialog title="ลบเอกสารถาวร" targetName="เริ่มต้น" files={["ภาพตัวอย่าง"]} confirmText="เริ่มต้น" onConfirm={vi.fn()} />);
  const trigger = screen.getByRole("button", { name: "ลบเอกสารถาวร" });
  await user.click(trigger);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
```

- [ ] **Step 2: Run focused component tests and confirm missing-component failure**

Run: `npx vitest --config vitest.config.mts run src/components/admin/media-operation-banner.test.tsx src/components/admin/media-progress-list.test.tsx src/components/admin/hard-delete-dialog.test.tsx`

Expected: FAIL because the components do not exist

- [ ] **Step 3: Implement Base UI Dialog and live regions using established project patterns**

```tsx
import { Dialog } from "@base-ui/react/dialog";

<Dialog.Root>
  <Dialog.Trigger className="inline-flex min-h-11 items-center rounded-full px-4">ลบเอกสารถาวร</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
    <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 outline-none">
      <Dialog.Title>ลบเอกสารถาวร</Dialog.Title>
      <Dialog.Description>การลบนี้ไม่มี Restore ระบบต้องลบรูปจาก R2 ก่อนลบข้อมูล</Dialog.Description>
      <ul aria-label="รูปที่จะลบ">{files.map((file) => <li key={file}>{file}</li>)}</ul>
      <label htmlFor="confirm-delete-name">พิมพ์ชื่อรายการเพื่อยืนยัน</label>
      <input id="confirm-delete-name" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      {error && <p role="alert">{error}</p>}
      <Dialog.Close>ยกเลิก</Dialog.Close>
      <button type="button" disabled={confirmation !== targetName || pending} onClick={onConfirm}>ลบถาวร</button>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

`MediaProgressList` must render each pending image by `file.name`, expose percent with `role="status"`, expose individual failure with `role="alert"`, and never rely on color alone

- [ ] **Step 4: Run the component tests**

Add the three component test files to `test:media`, preserving all earlier paths.

Run: `npx vitest --config vitest.config.mts run src/components/admin/*.test.tsx`

Expected: PASS banner, progress and dialog tests

- [ ] **Step 5: Commit Task 9**

```bash
git add package.json src/components/admin
git commit -m "feat(admin): add accessible media lifecycle feedback"
```

---

### Task 10: Document Editor Save, Resume and Hard-delete UX

**Files:**
- Modify: `src/app/admin/documents/document-form.tsx:39`
- Modify: `src/app/admin/documents/[id]/page.tsx`
- Create: `src/app/admin/documents/document-form.test.tsx`
- Modify: `src/components/editor/pending-images.ts`
- Modify: `src/components/editor/document-editor.tsx`
- Modify: `src/components/editor/document-editor.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `MediaOperationView`, reusable components and Document actions
- Produces prop: `pendingOperation: MediaOperationView | null`
- Produces behavior: one mount retry, no automatic retry loop

- [ ] **Step 1: Write failing tests for upload progress, pre-submit rollback and pending resume**

```tsx
it("rolls back uploaded files only when upload fails before saveDocument is submitted", async () => {
  uploadPendingImageMock.mockResolvedValueOnce(firstUpload).mockRejectedValueOnce(new Error("อัปโหลดรูปไม่สำเร็จ"));
  render(<DocumentForm document={document} sections={sections} pendingOperation={null} />);
  await userEvent.click(screen.getByRole("button", { name: "บันทึก" }));
  expect(saveDocumentMock).not.toHaveBeenCalled();
  expect(rollbackUploadedMediaMock).toHaveBeenCalledWith(document.id, [expect.objectContaining({ objectKey: firstUpload.objectKey })]);
});

it("retries a pending operation once on mount and disables save/delete", async () => {
  retryMediaOperationMock.mockResolvedValue({ pending: true, operation });
  render(<DocumentForm document={document} sections={sections} pendingOperation={operation} />);
  await waitFor(() => expect(retryMediaOperationMock).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "บันทึก" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ลบเอกสารถาวร" })).toBeDisabled();
});
```

- [ ] **Step 2: Run focused tests and verify current UI fails**

Run: `npx vitest --config vitest.config.mts run src/app/admin/documents/document-form.test.tsx src/components/editor/document-editor.test.tsx`

Expected: FAIL because current Form has no operation prop/progress/dialog and double-cleans submitted saves

- [ ] **Step 3: Move pending replacement to the pure utility and wire progress updates**

```ts
const setImageProgress = (id: string, progress: number) => {
  setPendingImages((current) => current.map((image) => image.id === id ? { ...image, status: "uploading", progress } : image));
};

const result = await uploadPendingImage(idRef.current, image, (progress) => setImageProgress(image.id, progress), createMediaUploadTicket);
```

Track whether `saveDocument()` was invoked; call `rollbackUploadedMedia()` only for upload-loop exceptions before that invocation. For Action error/pending results, trust the Server lifecycle owner and do not call cleanup again

- [ ] **Step 4: Add one-shot mount retry and durable pending state**

```tsx
const retriedOperationRef = useRef<string | null>(null);
useEffect(() => {
  if (!pendingOperation || retriedOperationRef.current === pendingOperation.operationId) return;
  retriedOperationRef.current = pendingOperation.operationId;
  startTransition(async () => {
    const result = await retryMediaOperation(pendingOperation.operationId);
    if ("success" in result) router.refresh();
    else if ("pending" in result) setOperation(result.operation);
    else setMessage(result.error);
  });
}, [pendingOperation, router]);
```

- [ ] **Step 5: Replace `window.confirm()` with `HardDeleteDialog` and show exact media labels**

The edit page must select pending operation summary and stored document media before rendering the Form. Use Alt labels from stored Content and Object basenames as fallback; do not select staged payload into Client props

```ts
const [{ data: document, error: documentError }, { data: media, error: mediaError }, { data: freeze, error: freezeError }] = await Promise.all([
  supabase.from("doc_documents").select(documentSelect).eq("id", id).single(),
  supabase.from("doc_media").select("id, object_key").eq("document_id", id).order("id"),
  supabase.from("doc_media_operation_documents").select("operation_id").eq("document_id", id).maybeSingle(),
]);
if (documentError || mediaError || freezeError) throw new Error("ไม่สามารถโหลดข้อมูลเอกสารได้");
const pendingOperation = freeze ? await readMediaOperation(freeze.operation_id) : null;
const referenced = collectPersistedMedia(document.content);
const labelByMediaId = new Map(referenced.ok ? referenced.references.map((item) => [item.mediaId, item.displayLabel]) : []);
const hardDeleteFiles = (media ?? []).map((item) => labelByMediaId.get(item.id) ?? item.object_key.split("/").at(-1) ?? "unknown.webp");
```

Pass only `pendingOperation` and `hardDeleteFiles` to the Client Form. Any parse failure must use the safe basename fallback and must not expose `staged_save`.

- [ ] **Step 6: Run document/content/media tests**

Add `src/app/admin/documents/document-form.test.tsx` to `test:media`; `document-editor.test.tsx` remains owned by `test:content`.

Run:

```bash
npm run test:content
npm run test:media
npx tsc --noEmit
```

Expected: all pass; saved content no longer retains Blob URLs and progress/retry states are typed

- [ ] **Step 7: Commit Task 10**

```bash
git add package.json src/app/admin/documents src/components/editor src/lib/media/content-media.ts
git commit -m "feat(admin): resume document media operations"
```

---

### Task 11: Category Cascade and Cleanup Banner UX

**Files:**
- Modify: `src/app/admin/structure/structure-manager.tsx:48`
- Modify: `src/app/admin/structure/page.tsx`
- Create: `src/app/admin/structure/structure-manager.test.tsx`
- Modify: `src/app/admin/documents/page.tsx`
- Create: `src/components/admin/media-cleanup-banner.tsx`
- Create: `src/components/admin/media-cleanup-banner.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: Section lifecycle actions and `MediaOperationBanner`
- Produces prop: `pendingOperations: MediaOperationView[]`
- Produces: one-shot retry per Section operation ID
- Produces: bounded orphan cleanup banner on Documents page

- [ ] **Step 1: Write failing structure and cleanup-banner tests**

```tsx
it("keeps the section dialog open with file labels when R2 deletion is pending", async () => {
  deleteSectionMock.mockResolvedValue({ pending: true, operation: { operationId, kind: "section_delete", targetId: sections[0].id, files: ["ภาพในคู่มือ"], attemptCount: 1, message: "ลบรูปไม่สำเร็จ" } });
  render(<StructureManager sections={sections} pendingOperations={[]} />);
  await openAndConfirmDelete();
  expect(screen.getByRole("dialog", { name: "ยืนยันการลบหมวด" })).not.toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent("ภาพในคู่มือ");
});

it("retries cleanup once on mount and keeps remaining labels visible", async () => {
  retryMediaCleanupMock.mockResolvedValue({ status: "pending", remaining: [{ ...cleanupOperation, files: ["orphan.webp"], attemptCount: 2 }] });
  render(<MediaCleanupBanner initialOperation={cleanupOperation} />);
  await waitFor(() => expect(retryMediaCleanupMock).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("alert")).toHaveTextContent("orphan.webp");
});
```

- [ ] **Step 2: Run focused tests and confirm current dialog behavior fails**

Run: `npx vitest --config vitest.config.mts run src/app/admin/structure/structure-manager.test.tsx`

Expected: FAIL because the current dialog closes/only returns a flat error and has no operation state

- [ ] **Step 3: Convert Structure dialog to Base UI and wire operation retry**

The Server page selects every `section_delete` Operation ID (never `staged_save`), resolves each through `readMediaOperation()`, filters nulls and passes the array to `StructureManager`:

```ts
const { data: rows, error: operationError } = await supabase
  .from("doc_media_operations")
  .select("id")
  .eq("kind", "section_delete")
  .order("created_at");
if (operationError) throw new Error("ไม่สามารถโหลดงานลบหมวดที่ค้างอยู่ได้");
const pendingOperations = (await Promise.all((rows ?? []).map((row) => readMediaOperation(row.id))))
  .filter((operation): operation is MediaOperationView => operation !== null);
```

Use a `Set<string>` ref as the one-shot guard so each Operation ID is retried at most once per mount. Render one `MediaOperationBanner` per pending operation. While pending, disable Section edits/deletes for each frozen root subtree, keep Public visibility unchanged and show exact failed batch labels

```tsx
<MediaOperationBanner
  operation={operation}
  onRetry={async () => {
    const result = await retryMediaOperation(operation.operationId);
    if ("success" in result) router.refresh();
    else if ("pending" in result) setOperation(result.operation);
    else setMessage(result.error);
  }}
/>
```

- [ ] **Step 4: Add Documents-page bounded cleanup retry/banner**

The Server page selects at most 100 Admin-safe cleanup summary rows. It uses the first cleanup row ID only as the initial render identity; the actual Worker ticket is always bound to the claim token returned by the RPC. It must not list Active `doc_media` rows, staged payload or call R2 listing:

```ts
const { data: cleanupRows, error: cleanupError } = await supabase
  .from("doc_media_cleanup")
  .select("id, document_id, display_label, attempt_count, last_error")
  .order("created_at")
  .limit(100);
if (cleanupError) throw new Error("ไม่สามารถโหลดรายการรูปที่รอล้างได้");
const cleanupOperation: MediaOperationView | null = cleanupRows?.length ? {
  operationId: cleanupRows[0].id,
  kind: "cleanup",
  targetId: cleanupRows[0].document_id,
  files: cleanupRows.map((row) => row.display_label),
  attemptCount: Math.max(...cleanupRows.map((row) => row.attempt_count)),
  message: cleanupRows[0].last_error,
} : null;
```

`MediaCleanupBanner` is a Client component. It calls `retryMediaCleanup()` once on mount, displays remaining labels and offers one explicit “ลองล้างรูปอีกครั้ง” button:

```tsx
{operation && (
  <MediaOperationBanner operation={operation} onRetry={async () => {
    const result = await retryMediaCleanup();
    if (result.status === "complete") router.refresh();
    else if (result.status === "pending") setOperation(result.remaining[0]);
    else setMessage(result.error);
  }} />
)}
```

- [ ] **Step 5: Run UI tests and typecheck**

Add `src/app/admin/structure/structure-manager.test.tsx` and `src/components/admin/media-cleanup-banner.test.tsx` to `test:media`, preserving every earlier test path. This is the final M06 script.

Run:

```bash
npm run test:media
npx tsc --noEmit
npm run lint
```

Expected: all pass with no hook, accessibility or type errors

- [ ] **Step 6: Commit Task 11**

```bash
git add package.json src/app/admin/structure src/app/admin/documents/page.tsx src/components/admin
git commit -m "feat(admin): retry category and orphan media cleanup"
```

---

### Task 12: Full Failure-path Verification and Documentation

**Files:**
- Modify: `docs/todo/M06-media-management.md`
- Modify: `TODO.md`
- Modify: `context.md`
- Modify: `docs/context/media-storage.md`
- Modify: `docs/context/database.md`
- Modify: `docs/context/testing-and-commands.md`
- Modify only if tests require script correction: `package.json`

**Interfaces:**
- Consumes all previous tasks
- Produces a completed M06 handoff; does not begin M07

- [ ] **Step 1: Run the complete local database gate**

Run:

```bash
npx supabase@latest db reset
npm run test:db
npx supabase@latest db lint --local --schema public --level warning --fail-on error
npx supabase@latest db advisors --local --type security --level warn --fail-on error
npx supabase@latest db advisors --local --type performance --level warn --fail-on none
```

Expected: all Docs tests pass; no new `doc_*` lint/advisor warning

- [ ] **Step 2: Run all App/Worker tests and static checks**

Run:

```bash
npm run test:content
npm run test:public
npm run test:media
npm run test:worker
npx tsc --noEmit
npm run typecheck:worker
npm run lint
npm run build
npm run cf:build
npm audit --omit=dev
```

Expected: every command exits 0; only previously documented platform warnings may remain

- [ ] **Step 3: Execute local failure-path integration cases**

Verify in this order and record actual evidence:

```text
1. Save a document with one existing image, remove it, force Worker DELETE failure, verify DB content/version unchanged.
2. Restore Worker DELETE, retry the same operation, verify object is 404 and DB content/version finalize once.
3. Force DB Save/version conflict after new upload, force rollback DELETE failure, verify cleanup row exists.
4. Retry cleanup, verify object is 404 and cleanup row is gone.
5. Prepare Document delete, fail a batch, verify Document/metadata remain and Save is blocked.
6. Retry Document delete, verify Document/redirect/media rows are gone.
7. Create parent/child/documents with more than one delete batch in test doubles, fail batch two, verify subtree remains; retry and finalize.
```

- [ ] **Step 4: Run keyboard/responsive browser smoke locally**

Check Document and Section dialogs, focus trap/return, Escape, live regions, Retry buttons, upload progress and 390px layout. Confirm no horizontal overflow or new console error

- [ ] **Step 5: Update documentation with actual results only**

```markdown
# docs/todo/M06-media-management.md
**Status:** Complete — Local verification complete; waiting for approval before M07

- [x] Delete-before-save durable operation
- [x] Upload rollback cleanup claim/retry
- [x] Hard-delete Document hardening
- [x] Category cascade orchestration
- [x] Failure-path, RLS, Worker, UI and accessibility verification
```

Record exact test counts, dates and warnings in `docs/context/testing-and-commands.md`; document the distributed R2/Postgres partial-batch limitation in `docs/context/media-storage.md`; do not claim Staging or Production verification

- [ ] **Step 6: Review final diff for scope and secrets**

Run:

```bash
git diff --check
git status --short
git diff --stat
rg -n "service_role|DOCS_MEDIA_UPLOAD_SECRET=|password|token" .env.example src workers supabase docs/context docs/todo
```

Expected: no committed secret, no unrelated file, no whitespace error

- [ ] **Step 7: Commit M06 close-out documentation**

```bash
git add TODO.md context.md docs/todo/M06-media-management.md docs/context/media-storage.md docs/context/database.md docs/context/testing-and-commands.md
git commit -m "docs: close M06 media lifecycle"
```

- [ ] **Step 8: Stop at the Module boundary**

Report completed behavior, changed files, every command actually run, browser checks, the distributed partial-delete limitation and any remaining issue. Do not start M07, push Staging, deploy Worker/App or touch Production without a new explicit instruction fromภู

---

## Plan Self-review Checklist

- Every approved Design section maps to at least one Task
- Every Database mutation has Guest/non-admin/Admin coverage
- Every external R2 failure path leaves a durable Retry path
- Exact TypeScript and SQL interfaces are introduced before consumers
- Dynamic migration filename is created only by Supabase CLI as required
- Worker Batch limit is 1–1,000 keys and all deletes remain document-bound
- Cache invalidation occurs only after Finalize success
- UI work includes Keyboard, Focus, Labels, live regions and Mobile 390px
- Verification remains Local-only and the plan stops before M07
