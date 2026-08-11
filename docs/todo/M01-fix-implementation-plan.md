# M01 Remediation Implementation Plan

**Status:** Complete

## Objective

แก้ blocker ที่พบหลังตรวจ M01 ให้ Foundation/Auth/RLS ปิดงานได้จริง โดยคงขอบเขต Local-only และไม่ apply migration หรือเขียนข้อมูลไป Staging/Production

## Confirmed findings

1. `.env.local` และ Supabase CLI ชี้ไป Production แทน Staging
2. Guest/non-admin `SELECT public.doc_sections` ล้มเหลวด้วย `infinite recursion detected in policy`
3. pgTAP เดิมครอบคลุมเพียงบาง path และไม่ตรวจสิทธิ์ครบทั้ง 4 ตาราง
4. `public.doc_is_admin()` เป็น privileged `SECURITY DEFINER` function ใน exposed schema
5. Login form ไม่มี exception-safe cleanup เมื่อ network/SDK error
6. Performance advisor พบ permissive SELECT policies ซ้อนบนตาราง Docs

## Constraints

- แก้เฉพาะ Local repository และ Local Supabase
- ห้าม `db push`, remote migration, `migration repair` หรือเขียนข้อมูล remote
- ห้ามแก้ Legacy table/function/policy/index รวมถึง `public.users` และ `public.roles`
- Production baseline และ history marker 45 versions ต้องไม่เปลี่ยน
- เนื่องจาก Docs migration ยัง pending และไม่เคย apply remote ให้แก้ไฟล์ `20260811032210_docs_foundation_auth_rls.sql` เดิม ไม่สร้าง corrective remote migration เพิ่ม

## Phase 1 — Environment safety

### Actions

1. หยุด Local dev server ก่อนเปลี่ยน environment
2. เปลี่ยน `.env.local` ให้ใช้ Staging URL และ Staging Publishable key
3. ตรวจโดยไม่แสดง key ว่า:
   - URL ตรงกับ Staging project ref `sxvkhzhqtrpxgzumsswl`
   - Publishable key มีค่า
   - ไม่มี `NEXT_PUBLIC_*SERVICE*` หรือ `NEXT_PUBLIC_*SECRET*`
4. `supabase unlink` จาก Production แล้ว link ไป Staging แบบ interactive
5. รัน `migration list --linked` แบบ read-only กับ Staging
6. หาก Staging history ไม่ตรงกับ baseline ให้หยุดถามภู ห้าม repair/push เอง

### Acceptance

- Local application และ CLI ไม่ชี้ Production
- ไม่มี secret ถูกแสดงหรือ commit
- `.env.example` ไม่มีค่า secret และอธิบาย Staging/local workflow ชัดเจน

## Phase 2 — Privileged authorization helpers

### Design

สร้าง schema `doc_private` ซึ่งไม่อยู่ใน Data API exposed schemas และเป็นของ Docs เท่านั้น

1. ย้าย authorization lookup ไป `doc_private.doc_is_admin()`:
   - `SECURITY DEFINER`
   - fixed empty `search_path`
   - อ้างชื่อ schema/table/function แบบ fully qualified
   - ตรวจ `EXISTS(public.users WHERE uid = auth.uid() AND role_id = 1)`
   - คืน Boolean เท่านั้น
2. `REVOKE EXECUTE` จาก `PUBLIC`, `anon` และ role ที่ไม่จำเป็น แล้ว grant เท่าที่ RLS ต้องใช้
3. ให้ `public.doc_is_admin()` เป็น minimal `SECURITY INVOKER` RPC wrapper สำหรับ Server guard โดยไม่มีสิทธิ์อ่าน Legacy table เอง
4. เพิ่ม `doc_private.doc_section_is_public(section_id uuid)` เพื่อคำนวณว่าหมวดหรือหมวดย่อยมี Published document หรือไม่ โดยไม่ทำให้ RLS เรียกตัวเองซ้ำ
5. หาก Media policy ต้อง query document ซ้ำ ให้เพิ่ม helper แบบ Boolean ที่คืนเฉพาะ published visibility

### Acceptance

- ไม่มี privileged `SECURITY DEFINER` function ของ Docs อยู่ใน exposed schema
- ทุก function มี fixed `search_path` และ explicit grants
- Guest เรียก Admin RPC ไม่ได้
- Authenticated caller ได้เพียง Boolean ของสิทธิ์ตนเอง
- UID ซ้ำแต่มีอย่างน้อยหนึ่งแถว `role_id = 1` ยังเป็น Admin

## Phase 3 — RLS policy rewrite

### Actions

1. ลบ policy ชุดเดิมของตาราง Docs แล้วสร้างใหม่แบบ operation-specific
2. `doc_sections`:
   - `anon SELECT`: เฉพาะหมวดที่ helper ยืนยันว่ามี Published document
   - `authenticated SELECT`: Published visibility หรือ Admin
   - Admin `INSERT`, `UPDATE`, `DELETE`: แยก policy พร้อม `USING`/`WITH CHECK`
3. `doc_documents`:
   - Public/non-admin SELECT เฉพาะ `status = 'published'`
   - Admin อ่านและเขียนได้ทุกสถานะ
4. `doc_media`:
   - Public/non-admin SELECT เฉพาะ Media ของ Published document
   - Admin อ่านและจัดการได้ทั้งหมด
5. `doc_route_redirects`:
   - M01 ให้ Admin จัดการเท่านั้น
   - Public redirect lookup ค่อยเพิ่มใน Module ที่รับผิดชอบ routes พร้อม published-target validation
6. รักษา explicit Data API grants และเปิด RLS ทุกตาราง

### Acceptance

- ไม่มี self-referential RLS recursion
- UPDATE มีทั้ง `USING` และ `WITH CHECK`
- ไม่มี `auth.role()` หรือ user-editable metadata
- Advisor ไม่รายงาน multiple permissive policies ของตาราง Docs

## Phase 4 — Complete pgTAP role matrix

ขยาย test จาก 9 ข้อให้ครอบคลุมอย่างน้อย:

| Role | Sections | Documents | Media | Redirects | Writes |
|---|---|---|---|---|---|
| Guest | Published structure เท่านั้น | Published เท่านั้น | Published doc เท่านั้น | Denied | Denied |
| non-admin | Published structure เท่านั้น | Published เท่านั้น | Published doc เท่านั้น | Denied | Denied |
| Admin | ทั้งหมด | ทุกสถานะ | ทั้งหมด | Allowed | Allowed |

### Required regression tests

- `SELECT doc_sections` ต้อง `lives_ok` และคืนเฉพาะโครงสร้าง Published
- หมวดแม่ที่มี Published document ในหมวดย่อยต้องมองเห็น
- Draft/Archived document และ Media ของเอกสารนั้นต้องไม่รั่ว
- Guest/non-admin เขียนทุก Docs table ไม่ได้
- Admin CRUD แต่ละ Docs table ได้
- RLS เปิดครบทั้ง 4 ตาราง
- `doc_is_admin()` รองรับ UID ซ้ำและปฏิเสธ non-admin
- Function/schema privileges ตรงตาม least privilege

## Phase 5 — Login and route guard hardening

### Actions

1. ครอบ `signInWithPassword` ด้วย `try/catch/finally`
2. คืนปุ่มและ input จาก submitting state เสมอ
3. ใช้ generic Thai error เพื่อไม่เปิดเผยว่าบัญชีมีอยู่หรือไม่
4. ใช้ `role="alert"`/focus ที่ข้อความผิดพลาด และคง label/autocomplete ที่มีอยู่
5. Server guard ยังคงลำดับ:
   - `getClaims()` ตรวจ JWT
   - RPC Boolean ตรวจ Admin
   - ไม่พึ่ง Proxy อย่างเดียว
6. ตรวจ unauthenticated `/admin` redirect ไป Login และ non-admin เข้า Admin ไม่ได้

### Acceptance

- Network/SDK exception ไม่ทำให้ฟอร์มค้าง
- Error ไม่เปิดเผย account existence หรือข้อมูลภายใน
- Guest/non-admin/Admin route behavior ตรง Requirement

## Phase 6 — Verification sequence

รันตามลำดับและหยุดแก้ทันทีเมื่อข้อใดไม่ผ่าน:

1. `npx supabase@latest db reset`
2. `npm run test:db`
3. Direct SQL regression สำหรับ Guest `SELECT doc_sections`
4. `npx supabase@latest db lint --local --schema public --level warning --fail-on error`
5. `npx supabase@latest db advisors --local --type security --level warn --fail-on error`
6. `npx supabase@latest db advisors --local --type performance --level warn --fail-on none` แล้วแยกเฉพาะ `doc_*`
7. `npm run lint`
8. `npm run build`
9. Browser smoke บน Local:
   - `/` เข้าได้โดยไม่ Login
   - `/admin` ของ Guest ไป Login
   - invalid credentials แสดง generic error
   - non-admin เข้า Admin ไม่ได้
   - Admin เข้า Admin ได้
10. `git diff --check` และตรวจว่าไม่มี Secret/Production credential อยู่ใน tracked files

## Documentation updates after passing

- เปลี่ยน M01 จาก `Rework required` เป็น `Complete`
- อัปเดต test count และคำสั่งที่ผ่านจริงใน `docs/context/testing-and-commands.md`
- อัปเดต helper/policy design ใน `docs/context/auth-and-rls.md`
- สรุปไฟล์ที่เปลี่ยน Tests ข้อจำกัด และหยุดรอภูอนุมัติ M02

## Stop conditions

หยุดถามภูก่อนดำเนินการต่อเมื่อ:

- ไม่มี Staging Publishable key
- Staging migration history ไม่ตรง baseline
- การแก้ต้องแตะ Legacy object
- ต้องใช้ remote migration/repair/write
- Advisor พบ security issue ของ Docs ที่ยังแก้ไม่ครบ

## Definition of Done

M01 ปิดได้เมื่อทุก Acceptance ข้างต้นผ่านจริง, ไม่มี environment ใดชี้ Production ระหว่าง local development, Docs migration ผ่าน Staging แล้วแต่ยังไม่ deploy Production และไม่มีการเริ่ม M02
