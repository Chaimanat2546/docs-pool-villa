# M01–M06 Close-out Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แก้ Close-out gaps, รัน Full Local/Staging verification M01–M06 และลบเฉพาะ Docs test fixtures ที่ได้รับอนุมัติด้วย exact-target cleanup โดยไม่กระทบข้อมูลอื่น

**Architecture:** แยก pgTAP tests ออกจาก Staging fixtures, ทดสอบ Next Proxy convention กับ OpenNext ที่ติดตั้งจริง และใช้ deterministic Staging fixture set เป็น evidence/cleanup boundary ร่วมกัน งานทั้งสามส่วนรวมอยู่ในแผนเดียวเพราะต้องผ่าน Local gate เดียวก่อน Deploy และต้องปิดด้วย manifest/cleanup verification เดียวกัน

**Tech Stack:** Next.js 16.3.0, React 19.2.8, TypeScript, Vitest 4, Supabase/PostgreSQL/pgTAP, Cloudflare Workers/OpenNext 1.20.2, Wrangler 4, R2, PowerShell

> **Recorded final outcome (13 สิงหาคม 2026):** แผนเริ่มต้นให้ย้ายไปใช้ Next `proxy.ts` ตาม convention ใหม่ แต่การ build ที่ทำซ้ำได้พบว่า OpenNext 1.20.2 ปฏิเสธ Node Proxy. จึงใช้ fallback ที่ระบุไว้ใน Task 2: final tree มี `src/middleware.ts` และ `src/middleware.test.ts` เท่านั้น; `src/proxy.ts`/`src/proxy.test.ts` ไม่มีอยู่ในผลลัพธ์สุดท้าย. Next build/OpenNext build ผ่าน โดยคง Next Middleware deprecation และ OpenNext-on-Windows warnings เป็น adapter/environment limitation ที่บันทึกไว้. ส่วนคำสั่ง Proxy ด้านล่างเป็น **เจตนา/เส้นทาง success path ดั้งเดิม** ไม่ใช่การอ้างว่าไฟล์นั้นยัง active.

## Global Constraints

- Requirement baseline คือ `docs/Poolvilla-Docs-Requirements-TH-v1.2.md`; ห้ามเริ่ม M07
- Production Supabase ref คือ `rqizfiayvcbozlzuvbok`; ห้าม migrate, deploy หรือ mutate Production
- Staging Supabase ref ต้องเป็น `sxvkhzhqtrpxgzumsswl` และ Cloudflare account ต้องเป็น `0df55f166fa309dcc904e992c43f86db`
- ห้าม `reset`, `truncate`, wildcard delete หรือ broad cascade บน Staging
- Cleanup ใช้ UUID และ exact R2 key ใน allowlist manifest เท่านั้น; ลบ R2 ก่อน DB
- ห้ามแก้ Legacy objects, `public.users`, `public.roles`, Auth users หรือ role mappings
- Server page guards, Server Actions และ RLS เป็น authorization boundary; Proxy ไม่ใช่ authorization หลัก
- ไม่มี Schema migration ใหม่ในแผนนี้; หากพบ schema/RLS defect ให้หยุดและออกแบบ migration แยก
- ใช้ `npm` และรักษา `package-lock.json`; ห้ามเพิ่ม dependency หากไม่จำเป็น
- ใช้ `superpowers:test-driven-development` เมื่อแก้ behavior, `superpowers:systematic-debugging` เมื่อมี failure และ `superpowers:verification-before-completion` ก่อนรายงานผล
- ทุก Staging write/delete ต้องผ่าน environment identity guard และก่อน/หลัง inventory
- ห้าม Commit Secret, credential, real PII หรือ raw connection string

---

## File Structure

### Test and fixture layout

- `supabase/tests/*.sql` — pgTAP suites เท่านั้น; directory นี้เป็น input ของ `npm run test:db`
- `supabase/fixtures/staging/README.md` — กติกา Staging-only fixtures และ environment guard
- `supabase/fixtures/staging/m06/*.sql` — archived M06 setup/inspection fixtures ที่ย้ายจาก test directory
- `supabase/fixtures/staging/m06/cleanup-retained.sql` — exact-ID cleanup ของ M06 records เดิม; ไม่ลบ Auth/Legacy rows
- `supabase/fixtures/staging/closeout/setup.sql` — deterministic M01–M06 Docs fixture setup
- `supabase/fixtures/staging/closeout/inspect.sql` — target counts และ non-target fingerprints แบบ read-only
- `supabase/fixtures/staging/closeout/cleanup.sql` — exact-ID cleanup พร้อม fail-closed assertions

### Session-boundary compatibility (final recorded state)

- `src/middleware.test.ts` — active matcher และ `updateSession()` delegation regression
- `src/middleware.ts` — active Edge Middleware fallback หลัง reproducible OpenNext Node Proxy incompatibility
- `src/proxy.ts`, `src/proxy.test.ts` — เป็น only original success-path attempt ของ Task 2; ไม่อยู่ใน final tree
- `package.json` — `test:proxy` ชี้ไปที่ `src/middleware.test.ts`

### Close-out records

- `docs/todo/M01-M04-full-test-remediation.md` — Proxy/Middleware outcome ที่ตรง Code
- `docs/todo/M04-documents.md` — evidence-backed checklist
- `docs/todo/M05-public-docs.md` — evidence-backed checklist
- `docs/todo/M01-foundation.md`, `M02-structure.md`, `M03-editor-media.md`, `M06-media-management.md` — อัปเดตเฉพาะผล regression/cleanup ที่เปลี่ยน
- `docs/context/testing-and-commands.md` — ผลรัน, deployment version และ cleanup evidence ล่าสุด
- `TODO.md`, `context.md` — สถานะรวมหลัง gate ทุกชุดผ่าน

---

### Task 1: Isolate pgTAP tests from Staging fixtures

**Files:**
- Move: `supabase/tests/staging-m06-keep-inspect.sql` → `supabase/fixtures/staging/m06/staging-m06-keep-inspect.sql`
- Move: `supabase/tests/staging-m06-keep-smoke.sql` → `supabase/fixtures/staging/m06/staging-m06-keep-smoke.sql`
- Move: `supabase/tests/staging-m06-key-refresh-smoke.sql` → `supabase/fixtures/staging/m06/staging-m06-key-refresh-smoke.sql`
- Move: `supabase/tests/staging-m06-refresh-smoke.sql` → `supabase/fixtures/staging/m06/staging-m06-refresh-smoke.sql`
- Move: `supabase/tests/staging-m06-repeat-smoke.sql` → `supabase/fixtures/staging/m06/staging-m06-repeat-smoke.sql`
- Move: `supabase/tests/staging-m06-single-flight-smoke.sql` → `supabase/fixtures/staging/m06/staging-m06-single-flight-smoke.sql`
- Create: `supabase/fixtures/staging/README.md`
- Create: `supabase/fixtures/staging/m06/README.md`
- Test: `supabase/tests/*.sql`

**Interfaces:**
- Consumes: Existing `npm run test:db` directory discovery contract
- Produces: `supabase/tests/` ที่มี pgTAP suites ห้าไฟล์เท่านั้น และ Staging fixture directory ที่ Task 3/8 ใช้

- [ ] **Step 1: Capture the failing database gate**

Run:

```powershell
npm run test:db
```

Expected: exit non-zero เพราะ CLI ค้นพบ `staging-m06-*.sql` ที่ไม่มี pgTAP `plan()` แม้ห้า pgTAP suites จริงจะผ่าน

- [ ] **Step 2: Move all six Staging-only SQL files**

Run:

```powershell
New-Item -ItemType Directory -Force 'supabase/fixtures/staging/m06' | Out-Null
git mv supabase/tests/staging-m06-keep-inspect.sql supabase/fixtures/staging/m06/staging-m06-keep-inspect.sql
git mv supabase/tests/staging-m06-keep-smoke.sql supabase/fixtures/staging/m06/staging-m06-keep-smoke.sql
git mv supabase/tests/staging-m06-key-refresh-smoke.sql supabase/fixtures/staging/m06/staging-m06-key-refresh-smoke.sql
git mv supabase/tests/staging-m06-refresh-smoke.sql supabase/fixtures/staging/m06/staging-m06-refresh-smoke.sql
git mv supabase/tests/staging-m06-repeat-smoke.sql supabase/fixtures/staging/m06/staging-m06-repeat-smoke.sql
git mv supabase/tests/staging-m06-single-flight-smoke.sql supabase/fixtures/staging/m06/staging-m06-single-flight-smoke.sql
```

Expected: `supabase/tests` เหลือเฉพาะไฟล์ `docs_*_test.sql` ห้าไฟล์

- [ ] **Step 3: Add fixture safety documentation**

Create `supabase/fixtures/staging/README.md` with this content:

```markdown
# Staging-only SQL fixtures

ไฟล์ใต้ directory นี้อาจเขียนหรือลบ Test data บน Staging และไม่ใช่ pgTAP tests

- ตรวจ Supabase project ref ว่าเป็น `sxvkhzhqtrpxgzumsswl` ก่อนรันทุกครั้ง
- ห้ามรันกับ Production ref `rqizfiayvcbozlzuvbok`
- ห้ามใช้ `reset`, `truncate`, wildcard delete หรือแก้ Legacy/Auth data
- Setup/cleanup ต้องใช้ deterministic UUID หรือ exact manifest
- ลบ R2 exact keys ให้สำเร็จก่อนลบ Media/Document rows
- หาก assertion หรือ deletion ใด fail ให้หยุดและเก็บ remaining targets สำหรับ Retry
```

Create `supabase/fixtures/staging/m06/README.md` with this content:

```markdown
# Retained M06 fixtures

ไฟล์ `*-smoke.sql` เป็น setup history ที่ Commit ข้อมูลทดสอบเดิม ส่วน `*-inspect.sql` เป็น read-only inspection
ภูอนุมัติ cleanup แล้ว แต่ต้องใช้ `cleanup-retained.sql` หลังตรวจ exact R2 keys และ DB state เท่านั้น
ห้ามนำ directory นี้กลับไปไว้ใต้ `supabase/tests` เพราะ Supabase CLI จะถือทุก SQL เป็น pgTAP test
```

- [ ] **Step 4: Update stale safety comments in moved setup files**

Replace wording such as “do not delete without approval” with:

```sql
-- Staging-only historical setup. Cleanup is now approved, but may run only
-- through the exact-target manifest after R2 and database preflight checks.
```

Do not change IDs, insert statements or lifecycle calls in the historical setup files

- [ ] **Step 5: Verify directory discovery now passes**

Run:

```powershell
Get-ChildItem 'supabase/tests' -File | Select-Object -ExpandProperty Name
npm run test:db
```

Expected: exactly five SQL filenames and 140/140 pgTAP tests passing with exit code 0

- [ ] **Step 6: Commit fixture isolation**

```powershell
git add supabase/tests supabase/fixtures/staging
git diff --cached --check
git commit -m "test(db): isolate staging fixtures from pgtap"
```

---

### Task 2: Original Next.js Proxy migration plan with explicit OpenNext fallback

**Recorded execution outcome:** Steps 1–5 ได้ทดลอง success path ตาม Next 16.3 convention แล้ว `npm run cf:build` fail เพราะ OpenNext ไม่รองรับ Node Proxy. ได้ดำเนิน fallback ที่อธิบายไว้ใน Task นี้: ไฟล์ active สุดท้ายคือ `src/middleware.ts`/`src/middleware.test.ts`, export `middleware`, และ `test:proxy` ชี้ test ดังกล่าว. ห้ามตีความ code block success path ด้านล่างว่าเป็นสถานะปัจจุบัน.

**Files:**
- Create: `src/proxy.test.ts`
- Move/Modify: `src/middleware.ts` → `src/proxy.ts`
- Modify: `package.json`
- Test: `src/proxy.test.ts`

**Interfaces:**
- Consumes: `updateSession(request: NextRequest)` from `src/lib/middleware.ts`
- Produces: `proxy(request: NextRequest): Promise<NextResponse>` and unchanged exported `config.matcher`

- [ ] **Step 1: Add the failing Proxy test and focused command**

Create `src/proxy.test.ts`:

```typescript
import { unstable_doesProxyMatch } from "next/experimental/testing/server";
import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));

vi.mock("@/lib/middleware", () => ({ updateSession }));

import { config, proxy } from "./proxy";

describe("Proxy session boundary", () => {
  beforeEach(() => updateSession.mockReset());

  it("matches application routes and excludes static image routes", () => {
    expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: "/admin" })).toBe(true);
    expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: "/guide/start" })).toBe(true);
    expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: "/_next/static/chunk.js" })).toBe(false);
    expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: "/cover.webp" })).toBe(false);
  });

  it("delegates cookie refresh to updateSession", async () => {
    const request = {} as NextRequest;
    const response = NextResponse.next();
    updateSession.mockResolvedValue(response);

    await expect(proxy(request)).resolves.toBe(response);
    expect(updateSession).toHaveBeenCalledOnce();
    expect(updateSession).toHaveBeenCalledWith(request);
  });
});
```

Add to `package.json` scripts:

```json
"test:proxy": "vitest --config vitest.config.mts run src/proxy.test.ts"
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing entrypoint**

Run:

```powershell
npm run test:proxy
```

Expected: FAIL because `src/proxy.ts` does not exist

- [ ] **Step 3: Implement the minimal convention migration**

Move the file and use this complete entrypoint:

```typescript
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/middleware";

// Session refresh only. Authorization remains in Page guards, Server Actions
// and Supabase RLS.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
```

Run:

```powershell
git mv src/middleware.ts src/proxy.ts
```

Then apply the content above with `apply_patch`

- [ ] **Step 4: Run focused and type gates**

```powershell
npm run test:proxy
npx tsc --noEmit
```

Expected: both pass

- [ ] **Step 5: Verify both build pipelines**

```powershell
npm run build
npm run cf:build
```

Expected success path: both pass and Next build has no Middleware deprecation warning

If `npm run cf:build` fails specifically because OpenNext cannot consume Node Proxy, execute the exact fallback below and do not conceal the warning:

```powershell
git mv src/proxy.ts src/middleware.ts
```

Use this fallback entrypoint:

```typescript
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/middleware";

// Legacy Middleware is retained only because the installed OpenNext adapter
// rejected Next.js Node Proxy in the recorded build. Authorization remains in
// Page guards, Server Actions and Supabase RLS.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
```

Rename `src/proxy.test.ts` to `src/middleware.test.ts`, import `{ config, middleware }`, call `middleware(request)`, and change the package script to:

```json
"test:proxy": "vitest --config vitest.config.mts run src/middleware.test.ts"
```

Then rerun `npm run test:proxy`, `npm run build` and `npm run cf:build`. Expected fallback: tests/builds pass; only the known Next deprecation warning remains for later documentation

- [ ] **Step 6: Commit the verified compatibility path**

Success path:

```powershell
git add package.json src/proxy.ts src/proxy.test.ts src/middleware.ts
git diff --cached --check
git commit -m "fix(auth): migrate session refresh to next proxy"
```

Fallback path:

```powershell
git add package.json src/middleware.ts src/middleware.test.ts
git diff --cached --check
git commit -m "test(auth): verify opennext middleware fallback"
```

---

### Task 3: Add deterministic close-out and cleanup manifests

**Files:**
- Create: `supabase/fixtures/staging/closeout/README.md`
- Create: `supabase/fixtures/staging/closeout/setup.sql`
- Create: `supabase/fixtures/staging/closeout/inspect.sql`
- Create: `supabase/fixtures/staging/closeout/cleanup.sql`
- Create: `supabase/fixtures/staging/m06/cleanup-retained.sql`

**Interfaces:**
- Consumes: Existing synthetic Staging admin mapping `f6000000-0000-4000-8000-000000000001`, Docs schema through M06, exact R2 keys listed below
- Produces: deterministic Section IDs `fa10…`, Document IDs `fa20…`, read-only fingerprints and fail-closed cleanup scripts

- [ ] **Step 1: Write the close-out fixture contract**

Create `supabase/fixtures/staging/closeout/README.md`:

```markdown
# M01–M06 close-out fixtures

Run order: `inspect.sql` → `setup.sql` → M01–M06 verification → R2/document lifecycle cleanup → `cleanup.sql` → `inspect.sql`.

Targets use deterministic IDs:

- Sections: `fa100000-0000-4000-8000-000000000001` through `...0003`
- Documents: `fa200000-0000-4000-8000-000000000001` through `...0007`

`cleanup.sql` aborts if target Media, lifecycle operations or cleanup records remain. Resolve those through the App/Worker first. It never deletes Auth users, `public.users`, `public.roles` or rows outside the exact ID arrays.
```

- [ ] **Step 2: Create deterministic setup SQL**

Create `supabase/fixtures/staging/closeout/setup.sql` with a transaction that:

```sql
begin;

do $$
begin
  if not exists (
    select 1 from public.users
    where uid = 'f6000000-0000-4000-8000-000000000001'::uuid
      and role_id = 1
  ) then
    raise exception 'Expected synthetic Staging admin mapping is missing';
  end if;
end
$$;

set local role authenticated;
set local request.jwt.claim.sub = 'f6000000-0000-4000-8000-000000000001';

insert into public.doc_sections
  (id, parent_id, title, slug, description, is_published, sort_order)
values
  ('fa100000-0000-4000-8000-000000000001', null,
   'M01-M06 Closeout', 'm01-m06-closeout', 'ข้อมูลทดสอบรอบปิดงาน', true, 900),
  ('fa100000-0000-4000-8000-000000000002',
   'fa100000-0000-4000-8000-000000000001',
   'M01-M06 Closeout Advanced', 'advanced', 'หมวดย่อยทดสอบ', true, 901),
  ('fa100000-0000-4000-8000-000000000003', null,
   'M01-M06 Closeout Hidden', 'm01-m06-closeout-hidden', 'หมวดซ่อนทดสอบ', false, 902)
on conflict (id) do nothing;

insert into public.doc_documents
  (id, section_id, title, slug, excerpt, content, status, published_at, sort_order)
values
  ('fa200000-0000-4000-8000-000000000001',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Overview', 'overview', 'Published root fixture',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"ภาพรวม"}]},{"type":"paragraph","content":[{"type":"text","text":"เนื้อหาทดสอบรอบปิดงาน"}]}]}'::jsonb,
   'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000002',
   'fa100000-0000-4000-8000-000000000002',
   'Closeout Reader', 'reader', 'Published child fixture',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"หัวข้อหลัก"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"หัวข้อย่อย"}]},{"type":"paragraph","content":[{"type":"text","text":"Reader fixture"}]}]}'::jsonb,
   'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000003',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Draft', 'draft', 'Draft fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 2),
  ('fa200000-0000-4000-8000-000000000004',
   'fa100000-0000-4000-8000-000000000003',
   'Closeout Hidden Published', 'hidden-published', 'Hidden fixture',
   '{"type":"doc","content":[]}'::jsonb, 'published', now(), 1),
  ('fa200000-0000-4000-8000-000000000005',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Conflict', 'conflict', 'Conflict fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 3),
  ('fa200000-0000-4000-8000-000000000006',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Redirect', 'redirect-source', 'Redirect fixture',
   '{"type":"doc","content":[]}'::jsonb, 'published', now(), 4),
  ('fa200000-0000-4000-8000-000000000007',
   'fa100000-0000-4000-8000-000000000001',
   'Closeout Media', 'media', 'Media lifecycle fixture',
   '{"type":"doc","content":[]}'::jsonb, 'draft', null, 5)
on conflict (id) do nothing;

commit;
```

Do not insert `doc_media` rows directly; Task 8 must create Media through the signed App/Worker upload flow

- [ ] **Step 3: Create the read-only target and non-target inventory**

Create `supabase/fixtures/staging/closeout/inspect.sql` using exact ID arrays and return:

```sql
with closeout_sections(id) as (values
  ('fa100000-0000-4000-8000-000000000001'::uuid),
  ('fa100000-0000-4000-8000-000000000002'::uuid),
  ('fa100000-0000-4000-8000-000000000003'::uuid)
), retained_sections(id) as (values
  ('f6100000-0000-4000-8000-000000000001'::uuid),
  ('f6400000-0000-4000-8000-000000000001'::uuid),
  ('f6800000-0000-4000-8000-000000000001'::uuid),
  ('f6c00000-0000-4000-8000-000000000001'::uuid),
  ('f7000000-0000-4000-8000-000000000001'::uuid)
), closeout_documents(id) as (values
  ('fa200000-0000-4000-8000-000000000001'::uuid),
  ('fa200000-0000-4000-8000-000000000002'::uuid),
  ('fa200000-0000-4000-8000-000000000003'::uuid),
  ('fa200000-0000-4000-8000-000000000004'::uuid),
  ('fa200000-0000-4000-8000-000000000005'::uuid),
  ('fa200000-0000-4000-8000-000000000006'::uuid),
  ('fa200000-0000-4000-8000-000000000007'::uuid)
), retained_documents(id) as (values
  ('f6200000-0000-4000-8000-000000000001'::uuid),
  ('f6500000-0000-4000-8000-000000000001'::uuid),
  ('f6900000-0000-4000-8000-000000000001'::uuid),
  ('f6d00000-0000-4000-8000-000000000001'::uuid),
  ('f7100000-0000-4000-8000-000000000001'::uuid)
), target_sections as (
  select id from closeout_sections union all select id from retained_sections
), target_documents as (
  select id from closeout_documents union all select id from retained_documents
)
select 'closeout_sections' as metric, count(*)::text as value
from public.doc_sections where id in (select id from closeout_sections)
union all
select 'closeout_documents', count(*)::text
from public.doc_documents where id in (select id from closeout_documents)
union all
select 'retained_m06_sections', count(*)::text
from public.doc_sections where id in (select id from retained_sections)
union all
select 'retained_m06_documents', count(*)::text
from public.doc_documents where id in (select id from retained_documents)
union all
select 'target_media', count(*)::text
from public.doc_media where document_id in (select id from target_documents)
union all
select 'target_redirects', count(*)::text
from public.doc_route_redirects where document_id in (select id from target_documents)
union all
select 'target_operations', count(*)::text
from public.doc_media_operations
where document_id in (select id from target_documents)
   or section_id in (select id from target_sections)
union all
select 'target_operation_documents', count(*)::text
from public.doc_media_operation_documents as operation_document
join public.doc_media_operations as operation on operation.id = operation_document.operation_id
where operation.document_id in (select id from target_documents)
   or operation.section_id in (select id from target_sections)
union all
select 'target_operation_items', count(*)::text
from public.doc_media_operation_items as item
join public.doc_media_operations as operation on operation.id = item.operation_id
where operation.document_id in (select id from target_documents)
   or operation.section_id in (select id from target_sections)
union all
select 'target_cleanup', count(*)::text
from public.doc_media_cleanup where document_id in (select id from target_documents)
union all
select 'non_target_section_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_sections where id not in (select id from target_sections)
union all
select 'non_target_document_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_documents where id not in (select id from target_documents)
union all
select 'non_target_media_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media where document_id not in (select id from target_documents)
union all
select 'non_target_redirect_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_route_redirects
where document_id is null or document_id not in (select id from target_documents)
union all
select 'non_target_operation_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media_operations
where (document_id is null or document_id not in (select id from target_documents))
  and (section_id is null or section_id not in (select id from target_sections))
union all
select 'non_target_operation_document_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(
    operation_document.operation_id::text || ':' || operation_document.document_id::text,
    ',' order by operation_document.operation_id, operation_document.document_id
  )), '')
from public.doc_media_operation_documents as operation_document
join public.doc_media_operations as operation on operation.id = operation_document.operation_id
where (operation.document_id is null or operation.document_id not in (select id from target_documents))
  and (operation.section_id is null or operation.section_id not in (select id from target_sections))
union all
select 'non_target_operation_item_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(
    item.operation_id::text || ':' || item.media_id::text,
    ',' order by item.operation_id, item.media_id
  )), '')
from public.doc_media_operation_items as item
join public.doc_media_operations as operation on operation.id = item.operation_id
where (operation.document_id is null or operation.document_id not in (select id from target_documents))
  and (operation.section_id is null or operation.section_id not in (select id from target_sections))
union all
select 'non_target_cleanup_fingerprint',
  count(*)::text || ':' || coalesce(md5(string_agg(id::text, ',' order by id)), '')
from public.doc_media_cleanup where document_id not in (select id from target_documents);

select id as media_id, document_id, object_key, public_url
from public.doc_media
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
order by document_id, id;

select id as operation_id, kind, document_id, section_id, attempt_count, last_error
from public.doc_media_operations
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
or section_id = any(array[
  'fa100000-0000-4000-8000-000000000001'::uuid,
  'fa100000-0000-4000-8000-000000000002'::uuid,
  'fa100000-0000-4000-8000-000000000003'::uuid,
  'f6100000-0000-4000-8000-000000000001'::uuid,
  'f6400000-0000-4000-8000-000000000001'::uuid,
  'f6800000-0000-4000-8000-000000000001'::uuid,
  'f6c00000-0000-4000-8000-000000000001'::uuid,
  'f7000000-0000-4000-8000-000000000001'::uuid
])
order by id;

select id as cleanup_id, document_id, object_key, display_label, attempt_count, last_error
from public.doc_media_cleanup
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid,
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
])
order by document_id, id;
```

- [ ] **Step 4: Create fail-closed close-out cleanup SQL**

Create `supabase/fixtures/staging/closeout/cleanup.sql` with exact arrays and assertions:

```sql
begin;

do $$
declare
  v_section_ids uuid[] := array[
    'fa100000-0000-4000-8000-000000000001'::uuid,
    'fa100000-0000-4000-8000-000000000002'::uuid,
    'fa100000-0000-4000-8000-000000000003'::uuid
  ];
  v_document_ids uuid[] := array[
    'fa200000-0000-4000-8000-000000000001'::uuid,
    'fa200000-0000-4000-8000-000000000002'::uuid,
    'fa200000-0000-4000-8000-000000000003'::uuid,
    'fa200000-0000-4000-8000-000000000004'::uuid,
    'fa200000-0000-4000-8000-000000000005'::uuid,
    'fa200000-0000-4000-8000-000000000006'::uuid,
    'fa200000-0000-4000-8000-000000000007'::uuid
  ];
begin
  if exists (select 1 from public.doc_media where document_id = any(v_document_ids)) then
    raise exception 'Closeout cleanup blocked: target media remains';
  end if;
  if exists (
    select 1 from public.doc_media_operations
    where document_id = any(v_document_ids) or section_id = any(v_section_ids)
  ) then
    raise exception 'Closeout cleanup blocked: target operation remains';
  end if;
  if exists (select 1 from public.doc_media_cleanup where document_id = any(v_document_ids)) then
    raise exception 'Closeout cleanup blocked: target cleanup record remains';
  end if;
end
$$;

delete from public.doc_route_redirects
where document_id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid
]);

delete from public.doc_documents where id = any(array[
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa200000-0000-4000-8000-000000000002'::uuid,
  'fa200000-0000-4000-8000-000000000003'::uuid,
  'fa200000-0000-4000-8000-000000000004'::uuid,
  'fa200000-0000-4000-8000-000000000005'::uuid,
  'fa200000-0000-4000-8000-000000000006'::uuid,
  'fa200000-0000-4000-8000-000000000007'::uuid
]);

delete from public.doc_sections
where id in (
  'fa100000-0000-4000-8000-000000000002'::uuid,
  'fa100000-0000-4000-8000-000000000003'::uuid
);
delete from public.doc_sections
where id = 'fa100000-0000-4000-8000-000000000001'::uuid;

commit;
```

- [ ] **Step 5: Create exact retained-M06 DB cleanup**

Create `supabase/fixtures/staging/m06/cleanup-retained.sql`. It must assert no Media/operation/cleanup rows remain for these exact documents before deleting redirects/documents/sections:

```sql
-- Documents
-- f6200000-0000-4000-8000-000000000001
-- f6500000-0000-4000-8000-000000000001
-- f6900000-0000-4000-8000-000000000001
-- f6d00000-0000-4000-8000-000000000001
-- f7100000-0000-4000-8000-000000000001

-- Sections
-- f6100000-0000-4000-8000-000000000001
-- f6400000-0000-4000-8000-000000000001
-- f6800000-0000-4000-8000-000000000001
-- f6c00000-0000-4000-8000-000000000001
-- f7000000-0000-4000-8000-000000000001
```

Use this complete transaction and do not delete UID `f6000000-0000-4000-8000-000000000001` from `auth.users` or `public.users`:

```sql
begin;

do $$
declare
  v_document_ids uuid[] := array[
    'f6200000-0000-4000-8000-000000000001'::uuid,
    'f6500000-0000-4000-8000-000000000001'::uuid,
    'f6900000-0000-4000-8000-000000000001'::uuid,
    'f6d00000-0000-4000-8000-000000000001'::uuid,
    'f7100000-0000-4000-8000-000000000001'::uuid
  ];
begin
  if exists (select 1 from public.doc_media where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target media remains';
  end if;
  if exists (select 1 from public.doc_media_operations where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target operation remains';
  end if;
  if exists (select 1 from public.doc_media_cleanup where document_id = any(v_document_ids)) then
    raise exception 'Retained M06 cleanup blocked: target cleanup record remains';
  end if;
end
$$;

delete from public.doc_route_redirects where document_id = any(array[
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
]);

delete from public.doc_documents where id = any(array[
  'f6200000-0000-4000-8000-000000000001'::uuid,
  'f6500000-0000-4000-8000-000000000001'::uuid,
  'f6900000-0000-4000-8000-000000000001'::uuid,
  'f6d00000-0000-4000-8000-000000000001'::uuid,
  'f7100000-0000-4000-8000-000000000001'::uuid
]);

delete from public.doc_sections where id = any(array[
  'f6100000-0000-4000-8000-000000000001'::uuid,
  'f6400000-0000-4000-8000-000000000001'::uuid,
  'f6800000-0000-4000-8000-000000000001'::uuid,
  'f6c00000-0000-4000-8000-000000000001'::uuid,
  'f7000000-0000-4000-8000-000000000001'::uuid
]);

commit;
```

- [ ] **Step 6: Record the five historical R2 exact keys in the M06 README**

```text
docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp
docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp
docs/f6900000-0000-4000-8000-000000000001/f6b00000-0000-4000-8000-000000000001.webp
docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp
docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp
```

- [ ] **Step 7: Review SQL for broad mutation patterns and commit**

Run:

```powershell
rg -n -i "truncate|reset|delete\s+from\s+public\.(users|roles)|auth\.users|like\s+'%|not\s+in" supabase/fixtures/staging
git diff --check
```

Expected: `auth.users` appears only in historical setup; cleanup files contain no Legacy/Auth delete and no wildcard target predicate

Commit:

```powershell
git add supabase/fixtures/staging
git diff --cached --check
git commit -m "test(staging): define closeout fixture manifests"
```

---

### Task 4: Pass the complete Local go/no-go gate

**Files:**
- Verify only; do not modify files while commands are running

**Interfaces:**
- Consumes: Tasks 1–3
- Produces: Local evidence required before any Staging write/deploy

- [ ] **Step 1: Verify CLI versions/help and clean target branch**

```powershell
git branch --show-current
git status --short
npx --yes supabase@latest --version
npx --yes supabase@latest test db --help
npx wrangler --version
npx wrangler r2 object delete --help
```

Expected: branch `feature/documents-editer`, clean worktree, Supabase CLI available and Wrangler v4.x

- [ ] **Step 2: Replay Local migrations and run DB gates**

```powershell
npx --yes supabase@latest db reset --local --yes
npm run test:db
npx --yes supabase@latest db lint --local --schema public --level warning --fail-on error
npx --yes supabase@latest db advisors --local --type security --level warn --fail-on error
npx --yes supabase@latest db advisors --local --type performance --level warn --fail-on none
```

Expected: migrations replay through `20260813062523`; pgTAP 140/140; no `doc_*` lint/advisor warning

- [ ] **Step 3: Run focused and application suites**

```powershell
npm run test:proxy
npm run test:content
npm run test:public
npm run test:media
npm run test:worker
npx tsc --noEmit
npm run typecheck:worker
npm run lint
```

Expected final fallback: session-boundary focused test (`src/middleware.test.ts`) passes; Content 12, Public 7, Media 14, Worker 9; typechecks pass; lint has no errors

- [ ] **Step 4: Run production builds and dependency audit**

```powershell
npm run build
npm run cf:build
npm audit --omit=dev
```

Expected: Next/OpenNext builds pass and audit reports 0 vulnerabilities. Proxy success path has no Middleware warning; fallback path has only the recorded adapter limitation

- [ ] **Step 5: Stop on any unexpected failure**

If any command fails, do not deploy or create Staging fixtures. Invoke `superpowers:systematic-debugging`, add a failing regression test for a real behavior defect, implement the minimal fix, rerun Task 4 from Step 2 and commit that fix separately

---

### Task 5: Preflight, deploy the Docs App, and create the close-out fixtures

**Files:**
- Read: `wrangler.jsonc`
- Read: `workers/docs-media/wrangler.jsonc`
- Execute: `supabase/fixtures/staging/closeout/inspect.sql`
- Execute: `supabase/fixtures/staging/closeout/setup.sql`

**Interfaces:**
- Consumes: Clean Local gate, `DOCS_STAGING_DB_URL` environment variable, existing Cloudflare/Supabase authentication
- Produces: Deployed Staging App version and deterministic fixture set; no Media Worker deployment unless Worker Code changed

- [ ] **Step 1: Verify Staging identities without printing secrets**

```powershell
$docsStagingUrl = $env:DOCS_STAGING_DB_URL
if ([string]::IsNullOrWhiteSpace($docsStagingUrl)) { throw 'DOCS_STAGING_DB_URL is required' }
if ($docsStagingUrl -notmatch 'sxvkhzhqtrpxgzumsswl') { throw 'Refusing non-Staging database URL' }
if ($docsStagingUrl -match 'rqizfiayvcbozlzuvbok') { throw 'Production database URL is forbidden' }

Select-String -Path 'wrangler.jsonc' -Pattern '0df55f166fa309dcc904e992c43f86db|docs-pool-villa-staging|sxvkhzhqtrpxgzumsswl'
Select-String -Path 'workers/docs-media/wrangler.jsonc' -Pattern '0df55f166fa309dcc904e992c43f86db|docs-media-staging'
npx wrangler whoami
npx --yes supabase@latest migration list --linked
```

Expected: all identifiers are Staging, current Cloudflare account matches, Local/remote migrations match through M06

- [ ] **Step 2: Capture the before-state and confirm the synthetic test admin exists**

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/inspect.sql'
psql $docsStagingUrl -v ON_ERROR_STOP=1 -c "select exists (select 1 from public.users where uid = 'f6000000-0000-4000-8000-000000000001'::uuid and role_id = 1) as synthetic_admin_ready;"
```

Expected: close-out sections/documents are 0 before setup; retained M06 sections/documents are 5/5; record non-target fingerprints that exclude both authorized target groups; `synthetic_admin_ready = true`. If false, stop—do not create or modify Auth/Legacy rows

- [ ] **Step 3: Build and dry-run the Staging App deployment**

```powershell
$env:NEXT_PUBLIC_DOCS_SITE_URL = 'https://docs-pool-villa-staging.chaymanus2003.workers.dev'
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://sxvkhzhqtrpxgzumsswl.supabase.co'
npm run cf:build
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Expected: generated Worker target is `docs-pool-villa-staging`; bindings include `DOCS_MEDIA`; no secret value appears in output

- [ ] **Step 4: Deploy only the Docs App and record the version**

```powershell
npx wrangler deploy --config wrangler.jsonc --keep-vars
npx wrangler deployments list --config wrangler.jsonc
```

Expected: deployment succeeds at the Staging URL. Do not deploy `workers/docs-media` because this plan changes no Worker Code

- [ ] **Step 5: Apply the deterministic fixture setup**

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/setup.sql'
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/inspect.sql'
```

Expected: close-out sections/documents = 3/7, retained M06 sections/documents remain 5/5, target media/operations/cleanup = 0; non-target fingerprints equal Step 2

---

### Task 6: Verify M01–M03 on Staging

**Files:**
- Verify through deployed App, Supabase and Docs Media Worker

**Interfaces:**
- Consumes: Existing Guest/non-admin/Admin test sessions and close-out fixtures
- Produces: M01 Auth/RLS, M02 Structure and M03 Editor/Media evidence

- [ ] **Step 1: Verify Guest HTTP/Auth behavior**

```powershell
$stagingOrigin = 'https://docs-pool-villa-staging.chaymanus2003.workers.dev'
$guestAdmin = Invoke-WebRequest -Uri "$stagingOrigin/admin" -MaximumRedirection 0 -SkipHttpErrorCheck
if ($guestAdmin.StatusCode -ne 307) { throw "Expected Guest /admin 307, got $($guestAdmin.StatusCode)" }
if ($guestAdmin.Headers.Location -notmatch '/auth/login') { throw 'Guest /admin did not redirect to login' }
```

Expected: 307 to `/auth/login`; response is noindex

- [ ] **Step 2: Verify non-admin and Admin sessions in independent browser contexts**

Use the existing Staging test accounts; never display credentials in notes:

- non-admin: `/admin` returns to Public and cannot execute Structure/Document actions
- Admin role_id=1: `/admin/structure`, `/admin/documents`, `/admin/editor` render successfully
- Inspect browser console after each route; expected no new errors

If either account/session is unavailable, stop and request the user to restore the existing test account; do not create Auth users in this plan

- [ ] **Step 3: Exercise M02 Structure through the Admin UI**

Create a temporary root Section `M02 Closeout UI` with slug `m02-closeout-ui`, then:

- create one child
- verify a third level is rejected
- verify duplicate/reserved slug is rejected with a safe message
- change numeric order and confirm the persisted order after reload
- delete the child and root through the UI before leaving this step

Expected: validations are fail-closed and the dynamic UI-created rows are removed immediately

- [ ] **Step 4: Exercise M03 Editor/Preview/accessibility**

Open Admin document `fa200000-0000-4000-8000-000000000003` and verify:

- Toolbar controls receive keyboard focus and have accessible names
- Link/YouTube/Alt dialogs keep focus, close with Escape and return focus
- Preview shows unsaved content without changing DB version
- Mobile 390px has no page-level horizontal overflow
- No console error appears

Do not persist an upload in this step; M06 owns the real upload/remove lifecycle in Task 8

- [ ] **Step 5: Run read-only RLS checks**

Use the existing publishable key from the protected environment without printing it. Verify Guest sees three visible Published documents (`overview`, `reader`, `redirect-source`) and two visible Sections; Draft, Hidden and Admin-only lifecycle tables remain inaccessible

```powershell
$docsAnonKey = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if ([string]::IsNullOrWhiteSpace($docsAnonKey)) { throw 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required' }
$docsRestHeaders = @{ apikey = $docsAnonKey; Authorization = "Bearer $docsAnonKey" }
$docsRestOrigin = 'https://sxvkhzhqtrpxgzumsswl.supabase.co/rest/v1'

$visibleDocs = Invoke-RestMethod -Uri "$docsRestOrigin/doc_documents?select=id,slug&id=in.(fa200000-0000-4000-8000-000000000001,fa200000-0000-4000-8000-000000000002,fa200000-0000-4000-8000-000000000003,fa200000-0000-4000-8000-000000000004,fa200000-0000-4000-8000-000000000005,fa200000-0000-4000-8000-000000000006,fa200000-0000-4000-8000-000000000007)&order=id" -Headers $docsRestHeaders
$visibleSections = Invoke-RestMethod -Uri "$docsRestOrigin/doc_sections?select=id,slug&id=in.(fa100000-0000-4000-8000-000000000001,fa100000-0000-4000-8000-000000000002,fa100000-0000-4000-8000-000000000003)&order=id" -Headers $docsRestHeaders
$operations = Invoke-WebRequest -Uri "$docsRestOrigin/doc_media_operations?select=id" -Headers $docsRestHeaders -SkipHttpErrorCheck

$actualDocs = ($visibleDocs.id | Sort-Object) -join ','
$expectedDocs = (@(
  'fa200000-0000-4000-8000-000000000001',
  'fa200000-0000-4000-8000-000000000002',
  'fa200000-0000-4000-8000-000000000006'
) | Sort-Object) -join ','
$actualSections = ($visibleSections.id | Sort-Object) -join ','
$expectedSections = (@(
  'fa100000-0000-4000-8000-000000000001',
  'fa100000-0000-4000-8000-000000000002'
) | Sort-Object) -join ','

if ($actualDocs -ne $expectedDocs) { throw 'Guest document visibility mismatch' }
if ($actualSections -ne $expectedSections) { throw 'Guest section visibility mismatch' }
if ($operations.StatusCode -lt 400) { throw 'Guest unexpectedly accessed media operations' }
```

Run the privilege checks through the protected Staging DB connection:

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -c "select has_table_privilege('anon', 'public.doc_media_operations', 'select') as anon_operations_select, has_function_privilege('anon', 'public.doc_save_document(uuid,uuid,text,text,text,jsonb,text,integer,bigint,jsonb)'::regprocedure, 'execute') as anon_document_save;"
```

Expected: both privilege columns are false

Expected: Guest cannot read `doc_media_operations` and cannot invoke mutation RPCs; Admin behavior remains available through authenticated App actions

---

### Task 7: Verify M04–M05 workflows on Staging

**Files:**
- Verify through deployed Admin/Public App

**Interfaces:**
- Consumes: deterministic documents `fa200…0001`–`fa200…0006`
- Produces: Document lifecycle, conflict, redirect, Public reader/SEO/cache evidence

- [ ] **Step 1: Verify Draft/Preview/Publish/Archive/Republish**

Use `fa200000-0000-4000-8000-000000000003`:

1. Edit title/content and Preview; confirm Public route remains 404 and version unchanged
2. Save Draft; confirm version increments once and Public remains 404
3. Publish; confirm Public route appears
4. Archive; confirm Public route becomes 404/noindex
5. Republish; confirm route appears and the original `published_at` value remains unchanged

Expected: every transition updates exactly once and Public visibility follows status/section visibility

- [ ] **Step 2: Verify two-session optimistic locking**

Open `fa200000-0000-4000-8000-000000000005` in two independent Admin browser sessions at the same version:

1. Session A saves a title change
2. Session B attempts a different save without reload

Expected: Session B receives the safe version-conflict message, its dirty state remains, and DB contains Session A value only

- [ ] **Step 3: Verify route history and direct redirect**

Use `fa200000-0000-4000-8000-000000000006`:

1. Confirm `/m01-m06-closeout/redirect-source` is 200
2. Change slug to `redirect-target` and save Published
3. Request old path without following redirects
4. Confirm status 308 and `Location: /m01-m06-closeout/redirect-target`
5. Archive the document and request the old path again

Expected: archived old path returns 404/noindex, not a Section redirect and not a chain

- [ ] **Step 4: Verify Published-only Homepage and Reader**

Check these routes as Guest:

```text
/
/m01-m06-closeout/overview
/m01-m06-closeout/advanced/reader
/m01-m06-closeout/draft
/m01-m06-closeout-hidden/hidden-published
/search?q=closeout
/sitemap.xml
```

Expected:

- Homepage card/recent/start target include only visible Published fixtures
- Root/child Reader show Breadcrumb, Sidebar, TOC and Previous/Next in deterministic order
- Draft/Hidden paths are 404/noindex
- Search shell is noindex and has no M07 result implementation
- Sitemap contains Homepage/current Published canonical paths only; no Draft/Hidden/old redirect URL

- [ ] **Step 5: Verify canonical/noindex and cache freshness**

Inspect response HTML/headers, not only visual state:

- Homepage and Reader canonical use the Staging origin
- `/admin`, `/auth`, `/search` and 404 are noindex
- Update `Closeout Overview` title through Admin and start a timer after Save success
- Poll Homepage/Reader until the new title is visible

Expected: new Published value appears within 5 seconds; no pre-commit value leaks during the Save request

- [ ] **Step 6: Verify responsive and keyboard Public navigation**

At desktop, tablet and 390px widths:

- use skip link, Search, Start, drawer, TOC and Previous/Next with keyboard only
- verify drawer initial focus, Escape close and focus return
- verify no page-level horizontal overflow or console errors

Expected: all controls are reachable and named; responsive layout matches the documented three-column/drawer/single-column contract

---

### Task 8: Verify M06, then clean all approved fixtures

**Files:**
- Execute: `supabase/fixtures/staging/closeout/inspect.sql`
- Execute: `supabase/fixtures/staging/closeout/cleanup.sql`
- Execute: `supabase/fixtures/staging/m06/cleanup-retained.sql`
- Read: `supabase/fixtures/staging/m06/README.md`

**Interfaces:**
- Consumes: close-out Media document `fa200…0007`, five historical exact R2 keys and all before-state fingerprints
- Produces: M06 success/security evidence and zero approved fixture rows/objects with non-target data unchanged

- [ ] **Step 1: Reconfirm automated M06 failure-path coverage before remote mutation**

```powershell
npm run test:media
npm run test:worker
```

Expected: Media 14 and Worker 9 tests pass, including R2 failure, DB failure, cleanup persistence, retry and single-flight regressions

- [ ] **Step 2: Verify Worker security boundaries remotely**

```powershell
$mediaOrigin = 'https://docs-media-staging.chaymanus2003.workers.dev'
$unsignedDelete = Invoke-WebRequest -Method Delete -Uri "$mediaOrigin/objects" -SkipHttpErrorCheck
if ($unsignedDelete.StatusCode -ne 401) { throw "Expected unsigned delete 401, got $($unsignedDelete.StatusCode)" }

$badOrigin = Invoke-WebRequest -Method Options -Uri "$mediaOrigin/objects" -Headers @{ Origin = 'https://example.invalid' } -SkipHttpErrorCheck
if ($badOrigin.StatusCode -ne 403) { throw "Expected untrusted Origin 403, got $($badOrigin.StatusCode)" }
```

Expected: unsigned delete 401 and untrusted Origin 403 without secret/log leakage

- [ ] **Step 3: Verify real upload/read/remove-before-save lifecycle**

Open Admin document `fa200000-0000-4000-8000-000000000007`:

1. Select a real test image, provide Alt text and Save
2. Confirm the editor replaces `blob:` with permanent Worker URL without reload
3. Record Media ID/object key from the target-only DB inspection
4. GET the permanent URL; expect 200 `image/webp`
5. Remove the image and Save
6. Confirm the target R2 URL becomes 404 and only then DB content/version reflects the new image-free state
7. Reload; confirm no image/pending message and Save/Delete controls are enabled

Expected: `doc_media` returns to 0 for the document and no pending operation/cleanup record remains

- [ ] **Step 4: Verify single-flight UI behavior on a fresh operation**

During the remove/save flow, trigger the visible Retry control rapidly while auto-retry begins. Expected:

- one Server Action dispatch per operation ID
- no “ไม่พบงานลบรูปที่ต้องลองอีกครั้ง” race message after successful finalize
- UI remains frozen during the operation and refreshes to the new document version

If timing prevents a pending banner from being observed, retain the automated single-flight tests as the concurrency evidence and record the remote lifecycle as success-only; do not alter Worker/service bindings to manufacture a failure

- [ ] **Step 5: Capture the final pre-cleanup manifest**

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/inspect.sql'
```

Also inspect the five retained M06 documents, Media rows, operations and cleanup records by exact IDs from `m06/README.md`

Expected before DB cleanup: close-out target Media/operations/cleanup = 0. Historical M06 Media/operations/cleanup = 0. If any remain, stop that group and finish its App lifecycle before proceeding

- [ ] **Step 6: Check and delete only historical R2 exact keys that still exist**

For each exact key in `m06/README.md`, first GET the corresponding public URL. If it is already 404, record it and do not issue a delete. If it is 200, run the matching exact command:

```powershell
npx wrangler r2 object delete 'docs-media-staging/docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp' --remote --env staging --config workers/docs-media/wrangler.jsonc
npx wrangler r2 object delete 'docs-media-staging/docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp' --remote --env staging --config workers/docs-media/wrangler.jsonc
npx wrangler r2 object delete 'docs-media-staging/docs/f6900000-0000-4000-8000-000000000001/f6b00000-0000-4000-8000-000000000001.webp' --remote --env staging --config workers/docs-media/wrangler.jsonc
npx wrangler r2 object delete 'docs-media-staging/docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp' --remote --env staging --config workers/docs-media/wrangler.jsonc
npx wrangler r2 object delete 'docs-media-staging/docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp' --remote --env staging --config workers/docs-media/wrangler.jsonc
```

Run only commands whose exact object returned 200. Re-GET every target; expected 404. Do not list/delete by prefix

- [ ] **Step 7: Delete exact DB targets with fail-closed scripts**

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/cleanup.sql'
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/m06/cleanup-retained.sql'
```

Expected: both transactions commit. If an assertion fails, no statements in that transaction commit; keep the reported group for Retry

- [ ] **Step 8: Verify target zero and non-target unchanged**

```powershell
psql $docsStagingUrl -v ON_ERROR_STOP=1 -f 'supabase/fixtures/staging/closeout/inspect.sql'
npx --yes supabase@latest db lint --linked --schema public --level warning --fail-on error
npx --yes supabase@latest db advisors --linked --type security --level warn --fail-on error
npx --yes supabase@latest db advisors --linked --type performance --level warn --fail-on none
npx --yes supabase@latest migration list --linked
```

Expected:

- close-out target counts = 0
- all five historical M06 document/section targets = 0
- all six exact R2 objects from close-out/history are 404 (one close-out upload key plus five historical keys; any additional UI-created temporary key must also be 404)
- before/after non-target fingerprints match
- no Docs DB lint/advisor warning
- migration history unchanged

---

### Task 9: Reconcile checklists, run final verification, and commit close-out evidence

**Files:**
- Modify: `docs/todo/M01-M04-full-test-remediation.md`
- Modify: `docs/todo/M04-documents.md`
- Modify: `docs/todo/M05-public-docs.md`
- Modify: `docs/todo/M01-foundation.md`
- Modify: `docs/todo/M02-structure.md`
- Modify: `docs/todo/M03-editor-media.md`
- Modify: `docs/todo/M06-media-management.md`
- Modify: `docs/context/testing-and-commands.md`
- Modify: `TODO.md`
- Modify: `context.md`

**Interfaces:**
- Consumes: Fresh command counts, Proxy path, Staging deployment version, Browser/API results and cleanup fingerprints from Tasks 4–8
- Produces: internally consistent M01–M06 close-out record and final clean branch

- [ ] **Step 1: Reconcile the Proxy remediation record**

If Task 2 success path was used, update R3 to state `src/proxy.ts`, `proxy` export, both builds pass and no deprecation warning

If fallback path was used, change the old checked claims that say Proxy is active/no warning. State the exact Next/OpenNext versions, reproducible build failure, retained `src/middleware.ts`, passing Auth/build behavior and the remaining external warning

Never leave documentation claiming a file/path that does not exist

- [ ] **Step 2: Reconcile every M04 checkbox against fresh evidence**

For `docs/todo/M04-documents.md` lines under Delivery plan, Verification and Acceptance:

- mark `[x]` only when the owning Code and automated/Staging evidence exist
- add one concise close-out evidence paragraph linking to the Requirement baseline and `docs/context/testing-and-commands.md`
- use Task 4 counts and Task 7 workflows; do not copy the full Requirement text
- confirm all 107 previously unchecked in-scope items are resolved

Use this evidence routing:

| M04 checklist group | Required evidence |
|---|---|
| Schema, RPC, route collision, RLS | `docs_document_management_test.sql` + Task 4 DB gates |
| Server Actions/cache/error mapping | `actions.test.ts`, `structure/actions.test.ts` + Task 7 save/failure behavior |
| Admin form, dirty state, Preview, conflict | `document-form.test.tsx`, Content suite + Task 7 Steps 1–2 |
| Upload rollback, hard delete, cleanup | Media/Worker suites + Task 8 Steps 1–3 |
| Responsive, keyboard, focus, labels | Task 6 Steps 3–4 and Task 7 Step 6 |
| Verification commands/Acceptance | Task 4 and Task 9 Step 5 fresh outputs |

Run:

```powershell
rg -n "^- \[ \]" docs/todo/M04-documents.md
```

Expected: no output. If an in-scope item still lacks evidence, do not mark it; reopen the owning Task and complete its test/fix first

- [ ] **Step 3: Reconcile every M05 checkbox against fresh evidence**

For every Delivery plan, Verification and Acceptance checkbox in `docs/todo/M05-public-docs.md`:

- identify the owning Public DAL/component/route or Redirect RLS contract
- require the matching automated result from Task 4 and remote behavior from Task 7
- mark `[x]` only after both required evidence classes pass
- add one concise close-out evidence paragraph linking to the Requirement baseline and `docs/context/testing-and-commands.md`
- preserve the explicit boundary that `/search` is a noindex shell and real Search remains M07

Use this evidence routing:

| M05 checklist group | Required evidence |
|---|---|
| Public DTO/DAL/routes/navigation/cache | Public suite + Task 7 Steps 4–5 |
| Redirect visibility RLS | `docs_public_redirect_visibility_test.sql` + Task 7 Step 3 |
| Homepage/Reader/renderer/TOC | Public/Content suites + Task 7 Step 4 |
| Responsive/accessibility interactions | Task 7 Step 6 |
| SEO/sitemap/404/noindex | Task 7 Steps 3–5 with response HTML/headers |
| Verification commands/Acceptance | Task 4 and Task 9 Step 5 fresh outputs |

Run:

```powershell
rg -n "^- \[ \]" docs/todo/M05-public-docs.md
```

Expected: no output for M05 in-scope items

- [ ] **Step 4: Update module overview and testing context**

Record only actual results:

- Local test counts and build outcome
- Staging App deployment version
- M01–M06 matrix summary
- target cleanup counts/R2 404 results
- confirmation that non-target fingerprints matched
- confirmation that no Production action occurred
- any accepted external warning with exact evidence

Update `TODO.md` and `context.md` to say M01–M06 are ready to close only if every final gate below passes

- [ ] **Step 5: Run the final full verification from a clean application state**

```powershell
npm run test:db
npm run test:proxy
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
npx --yes supabase@latest db lint --local --schema public --level warning --fail-on error
npx --yes supabase@latest migration list --local
npx --yes supabase@latest migration list --linked
git diff --check
```

Expected final fallback: pgTAP 140, focused Middleware session-boundary test, Content 12, Public 7, Media 14, Worker 9, both typechecks, lint, Next/OpenNext builds, audit, DB lint and migration comparison all pass; the documented Middleware/OpenNext warnings remain accepted adapter limitations

- [ ] **Step 6: Scan for secrets and stale contradictions**

```powershell
rg -n "DOCS_MEDIA_UPLOAD_SECRET=|service_role|postgres(ql)?://[^ ]+:[^ ]+@|password\s*=|token\s*=" docs supabase src workers -g '!*.lock'
rg -n "src/proxy\.ts|src/middleware\.ts|middleware deprecation|Proxy" docs/todo docs/context TODO.md context.md
```

Expected: no committed secret/connection string; every Proxy/Middleware statement matches the chosen Task 2 path

- [ ] **Step 7: Commit close-out documentation**

```powershell
git add TODO.md context.md docs/context docs/todo
git diff --cached --check
git diff --cached --stat
git commit -m "docs: close m01-m06 verification gaps"
```

- [ ] **Step 8: Verify branch completion before reporting**

Invoke `superpowers:verification-before-completion`, then run:

```powershell
git status --short
git log --oneline -6
```

Expected: clean worktree and commits for fixture isolation, Proxy compatibility, Staging manifests and close-out documentation. Report M01–M06 as closable only if Task 8 target cleanup and every Task 9 gate succeeded; otherwise report the exact remaining blocker/Retry manifest
