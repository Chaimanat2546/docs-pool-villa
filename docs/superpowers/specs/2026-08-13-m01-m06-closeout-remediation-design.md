# M01–M06 Close-out Remediation Design

**Status:** Approved by ภู on 13 August 2026

Requirement baseline: [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)

Related module records:

- [M01 Foundation](../../todo/M01-foundation.md)
- [M02 Structure](../../todo/M02-structure.md)
- [M03 Editor/Media](../../todo/M03-editor-media.md)
- [M04 Documents](../../todo/M04-documents.md)
- [M05 Public Docs](../../todo/M05-public-docs.md)
- [M06 Media Management](../../todo/M06-media-management.md)

## Goal

แก้ Close-out gaps ที่พบจากการตรวจ M01–M06 และสร้างหลักฐาน Local/Staging รอบใหม่ที่เพียงพอสำหรับตัดสินใจปิดทั้งหก Module โดยไม่เริ่ม M07 และไม่แตะ Production

ผลลัพธ์ที่ต้องการคือ:

1. Database test gate รันจากคำสั่งมาตรฐานได้และผ่านจริง
2. Code, TODO และ Testing Context อธิบายสถานะเดียวกัน
3. Next.js Proxy/Middleware convention ตรงกับความสามารถของ Next/OpenNext เวอร์ชันที่ติดตั้งจริง
4. M04/M05 checklists สะท้อนหลักฐาน ไม่ใช่เพียงสถานะหัวข้อว่า Complete
5. M01–M06 ผ่าน Full Staging verification รอบใหม่
6. Docs test fixtures ที่ไม่จำเป็นถูกลบอย่างเจาะจงทั้ง DB/R2 โดยไม่กระทบข้อมูลอื่น

## Confirmed findings

- `npm run test:db` ชี้ไปทั้ง directory `supabase/tests` ซึ่งมี Staging-only fixture SQL หกไฟล์ปะปนกับ pgTAP suites ทำให้ CLI พยายามรัน fixture เป็น tests และคำสั่งจบด้วย failure
- pgTAP suites จริงห้าไฟล์ผ่านรวม 140 tests เมื่อระบุไฟล์ที่ถูกต้อง
- M04 มี unchecked delivery/verification items 107 รายการ และ M05 มี 89 รายการ แม้หัวข้อระบุว่า Complete
- [M01–M04 Full Test Remediation](../../todo/M01-M04-full-test-remediation.md) ระบุว่าย้ายเป็น `src/proxy.ts` และไม่มี warning แล้ว แต่ Git history และ Code ปัจจุบันใช้ `src/middleware.ts` เพื่อความเข้ากันได้กับ OpenNext
- Local automated suites, builds, DB lint/advisors และ Staging M06 lifecycle evidence ล่าสุดผ่าน แต่ M05 รอบ audit ล่าสุดไม่มี Published fixture ใหม่เพราะยึดข้อจำกัดไม่สร้าง/ลบข้อมูลในรอบนั้น
- Staging มี M06 fixtures ที่ตั้งใจคงไว้จากการทดสอบก่อนหน้าและสามารถระบุด้วย UUID/slug ที่กำหนดไว้ใน fixture SQL

## Scope

### In scope

- Test layout และคำสั่งมาตรฐานที่ใช้ปิด M01–M06
- Proxy/Middleware compatibility remediation
- Defect หรือ missing regression coverage ที่พิสูจน์ได้ระหว่าง checklist audit
- M04/M05 evidence reconciliation และสถานะ M01–M06 ทั้งหมด
- Local full regression
- Staging App deployment เมื่อ Code เปลี่ยนและ Local gates ผ่าน
- Staging M01–M06 browser/API/database verification
- Cleanup เฉพาะ Docs test fixtures และ R2 objects ที่ระบุเป้าหมายได้แน่นอน
- Close-out documentation

### Out of scope

- M07 Search/Hardening implementation
- Feature ใหม่ที่ Requirement ไม่ได้กำหนด
- Legacy table, function, trigger, policy หรือ R2 Worker เดิม
- Production migration, deployment, domain หรือ data mutation
- การลบ Auth test users/role mappings
- การ refactor test infrastructure ขนาดใหญ่หรือสร้าง fixture framework ทั่วไป

## Data safety boundary

Staging cleanup ใช้ allowlist manifest เท่านั้น โดยรายการหนึ่งต้องมี identifier ที่ตรวจสอบได้ เช่น Section ID/slug, Document ID/slug, Media ID/object key, redirect ID/old path, operation ID หรือ cleanup record ID

กติกาบังคับ:

- ห้าม `reset`, `truncate`, wildcard delete หรือ broad cascade ที่ไม่แสดงรายการเป้าหมาย
- ห้ามใช้ชื่ออย่างเดียวเมื่อมี UUID ให้ตรวจสอบ
- ลบ R2 เฉพาะ exact key ใต้ `docs/{document_id}/` ของเอกสารใน manifest
- ลบ R2 สำเร็จก่อนลบ Media/Document/Section data ตาม lifecycle contract
- หาก R2 หรือ DB ขั้นใดล้มเหลว ให้หยุดเฉพาะ fixture group นั้น คงข้อมูลส่วนที่เหลือ และสร้าง retry manifest
- เก็บ before/after counts และ identity ของข้อมูลนอก manifest เพื่อยืนยันว่าไม่เปลี่ยน
- Unknown Docs data, Legacy data, Auth users และ role mappings ถือว่า preserve โดยปริยาย
- Fixture รอบ close-out ถูกลบหลังบันทึก evidence ครบในรอบเดียวกัน

## Remediation design

### 1. Separate pgTAP tests from Staging fixtures

`supabase/tests/` ต้องเหลือเฉพาะ pgTAP suites ที่มี test plan และห่อ mutation ด้วย transaction/rollback:

- `docs_foundation_auth_rls_test.sql`
- `docs_structure_management_test.sql`
- `docs_document_management_test.sql`
- `docs_public_redirect_visibility_test.sql`
- `docs_media_lifecycle_test.sql`

ย้าย Staging M06 setup/inspection SQL ไป `supabase/fixtures/staging/m06/` และเก็บ close-out setup/inspection/cleanup SQL ใหม่ที่ `supabase/fixtures/staging/closeout/` แต่ละ directory ต้องมีคำอธิบายว่าไฟล์ใดเขียนข้อมูล ไฟล์ใด read-only และไฟล์ใดลบข้อมูล

`npm run test:db` ยังคงรัน directory gate เพื่อให้ test discovery พิสูจน์ว่า layout ถูกต้อง โดยต้องผ่าน 140 tests และห้ามพึ่งการ enumerate filenames ใน package script

### 2. Resolve Proxy/Middleware inconsistency

Next.js 16.3 ใช้ `proxy.ts` convention ขณะที่ Code ปัจจุบันย้อนกลับมาใช้ legacy `middleware.ts` จากข้อจำกัด OpenNext เดิม จึงต้องทดสอบกับ dependency versions ปัจจุบันแทนการอาศัยเอกสารเก่า

แนวทางหลัก:

1. มี regression coverage สำหรับ matcher/session update behavior
2. เปลี่ยน `src/middleware.ts` เป็น `src/proxy.ts` และ named export เป็น `proxy` โดยไม่เปลี่ยน matcher หรือ `updateSession()`
3. รัน Next build และ OpenNext build
4. ตรวจ Guest `/admin` redirect และ Admin session บน Local/Staging
5. หากทุก gate ผ่าน ให้คง Proxy และแก้ remediation record ให้ตรง
6. หาก OpenNext build/runtime fail เพราะ adapter limitation ที่พิสูจน์ซ้ำได้ ให้ย้อนเฉพาะ convention change, คง authorization layers เดิม และบันทึก warning เป็น external limitation พร้อม evidence

Proxy/Middleware ไม่ใช่ authorization boundary หลัก Server page guards, Server Actions และ Supabase RLS ต้องยังบังคับสิทธิ์เอง

### 3. Reconcile M04/M05 checklists

ตรวจ M04 ทั้ง 107 และ M05 ทั้ง 89 unchecked items ตามลำดับ:

1. หา Code owner ของ behavior
2. หา automated test หรือ Staging evidence ที่พิสูจน์ behavior
3. ติ๊ก `[x]` เฉพาะเมื่อหลักฐานครบ
4. ถ้าขาด behavior จริง ให้เพิ่ม failing regression test ก่อนแก้ Code
5. ถ้ารายการย้ายไป M06/M07 หรือถูกแทนที่ด้วย confirmed decision ให้ระบุสถานะและ link ไปแหล่งหลักแทนการอ้างว่าเสร็จ
6. อัปเดต test counts และ commands ด้วยผลรันล่าสุดเท่านั้น

M01–M03 และ M06 ที่ checklists เต็มแล้วต้องยังผ่าน regression gates ใหม่ก่อนคงสถานะ Complete

### 4. Schema-change decision

Design นี้ไม่คาดว่าจะเพิ่ม migration หาก audit พบ schema/RLS defect จริง ต้องหยุดสรุปผลกระทบและออกแบบ Docs-only imperative migration แยกก่อนแก้ ห้ามแก้ migration เดิมหรือ push remote schema โดยไม่มี review

## Staging verification design

### Preconditions

- ยืนยัน Staging Supabase project ref และ Cloudflare targets ว่าไม่ใช่ Production
- Local full gate ผ่าน
- Migration history Local/Staging ตรงกัน
- สร้าง before-state inventory ของ Docs rows และ R2 target keys
- Deploy Docs App ด้วย Staging environment และ `--keep-vars` เมื่อมี Code change
- Deploy Docs Media Worker เฉพาะเมื่อ Worker Code เปลี่ยน

### Close-out fixture set

ใช้ deterministic UUIDs/slugs และแบ่ง fixture groups ให้ลบ/Retry แยกกันได้ ชุดรวมต้องมี:

- Public parent/child sections และ hidden section
- Draft, Published, Archived และ Hidden documents
- Document สำหรับ optimistic-lock conflict
- Document สำหรับ slug/section move และ redirect
- Document/media สำหรับ upload, read, remove-existing-image, hard delete และ cleanup retry
- Pending lifecycle operation สำหรับ single-flight auto/manual retry

### M01–M06 matrix

#### M01 — Foundation/Auth/RLS

- Guest ถูก redirect จาก Admin และอ่านได้เฉพาะ Public rows
- Authenticated non-admin เข้า Admin/write Docs ไม่ได้
- Admin role_id=1 ใช้งาน Admin/mutations ได้
- ไม่มี authorization decision จาก user metadata

#### M02 — Structure

- Create parent/child, ordering และ two-level boundary
- Duplicate/reserved/colliding slug ถูกปฏิเสธ
- Delete ทำงานเมื่อปลอดภัยและ fail-closed เมื่อมี dependent media/lifecycle state

#### M03 — Editor/Media core

- Editor controls, Preview unsaved state และ persisted content validation
- Upload/image validation, WebP object, GET content type และ accessible Alt
- Desktop/Mobile keyboard, focus, labels และ no horizontal overflow

#### M04 — Documents

- Draft, Published, Archived, Republished และ save-same-status
- Preview ไม่ Save, dirty warning และ save success/failure state
- Two-session optimistic-lock conflict
- Slug/section move, canonical path, redirect history และ route collision
- Hard delete success และ R2 failure ที่คง DB พร้อม Retry

#### M05 — Public Docs

- Published-only Homepage, cards, recent list และ Start target
- Root/child Reader, renderer, Sidebar, TOC และ Previous/Next
- Hidden/Draft/Archived/Missing route เป็น 404/noindex
- Old public path ตอบ 308 ตรงไป canonical; archive แล้ว old path เป็น 404
- Sitemap/canonical ไม่มี non-public หรือ redirect URLs
- Published/structure update ปรากฏภายใน 5 วินาที
- Search shell ยัง noindex และไม่มี M07 search implementation

#### M06 — Media lifecycle

- Remove existing image ลบ R2 ก่อนบันทึก content ใหม่
- Upload สำเร็จแต่ DB Save ล้มเหลวทำ immediate cleanup
- Cleanup failure ถูก persist และ Retry ได้
- Document/section deletion ลบ media ก่อน DB
- Auto/manual retry เป็น single-flight ต่อ operation
- UI freeze, safe error, refresh และ re-enabled controls หลัง finalize

## Cleanup sequence

1. รวม known retained M06 fixtures และ close-out fixtures เป็น manifest เดียว โดยแยก fixture group
2. Read-only inspect DB/R2 และตัดรายการที่ identity ไม่ตรงออกจาก manifest
3. ใช้ application lifecycle หรือ reviewed exact-target operation เพื่อลบ R2 ก่อน DB
4. ลบ redirects/media/operations/cleanup records/documents/sections ตาม dependency และ contract ที่เกี่ยวข้อง
5. ตรวจ exact R2 keys เป็น 404
6. ตรวจ target rows ทุก `doc_*` table เป็นศูนย์
7. เปรียบเทียบ non-target identities/counts กับ before-state
8. หากบาง group fail ให้หยุด group นั้น บันทึก remaining targets และ Retry โดยไม่ขยาย scope

## Verification gates

### Local

- Replay migrations จาก baseline ถึง M06
- `npm run test:db` — 140/140
- `npm run test:content` — 7
- `npm run test:public` — 7
- `npm run test:media` — 14
- `npm run test:worker` — 9
- App TypeScript และ Worker typecheck
- `npm run lint` — no errors
- `npm run build`
- `npm run cf:build`
- `npm audit --omit=dev`
- Local DB lint และ security/performance advisors ไม่มี warning ใหม่ของ `doc_*`

### Staging

- Migration histories match และไม่มี unplanned migration
- Guest/non-admin/Admin RLS matrix
- HTTP/Browser matrix M01–M06
- Staging DB lint/advisors ไม่มีปัญหาใหม่ของ Docs
- Cleanup targets เป็นศูนย์ทั้ง DB/R2
- Non-target data unchanged
- ไม่มี Production action

## Documentation updates

เมื่อ verification เสร็จให้อัปเดตเฉพาะแหล่งที่เกี่ยวข้อง:

- `TODO.md` — module overview
- `context.md` — current-work index
- `docs/context/testing-and-commands.md` — commands/evidence ล่าสุด
- `docs/todo/M01-M04-full-test-remediation.md` — Proxy/Middleware outcome ที่ตรง Code
- `docs/todo/M04-documents.md` และ `docs/todo/M05-public-docs.md` — evidence-backed checklist
- Module files อื่นเฉพาะเมื่อสถานะหรือหลักฐานเปลี่ยน

ห้ามคัดลอก Requirement เต็มไปหลายไฟล์ ห้ามใส่ Secret, real PII หรือ credential ใน evidence

## Definition of Done

ปิด M01–M06 ได้เมื่อทุกข้อเป็นจริง:

- ไม่มี blocker หรือ unchecked in-scope item
- Test/build/database/browser gates ผ่านจากการรันล่าสุด
- Proxy/Middleware record ตรงกับ Code และ adapter behavior จริง
- Known external warning ที่แก้ไม่ได้มี reproducible evidence และไม่กระทบ security/behavior
- Authorized Docs test fixtures ไม่เหลือทั้ง DB/R2
- Non-target Staging data ไม่เปลี่ยน
- Documentation และ test counts ตรงกับผลรันจริง
- Git worktree สะอาดหลัง commit
- ไม่มี M07 หรือ Production action
