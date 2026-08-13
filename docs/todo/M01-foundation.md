# M01 — Foundation, Supabase Auth & Docs-only RLS

**Status:** Pending Staging verification

**Pre-M04 remediation:** Local complete; see [Remediation TODO](M01-M03-remediation.md) for the Staging gate.

แผนแก้ไข: [M01 Remediation Implementation Plan](M01-fix-implementation-plan.md)

## Scope

- [x] ตรวจ Project structure และ Environment variables โดยไม่เปิดเผย Secret
- [x] ยืนยัน Staging/Production configuration boundary
- [x] ออกแบบ Docs schema baseline และ Migration workflow
- [x] เชื่อม Supabase Auth ฝั่ง Server
- [x] สร้าง Admin route guard ด้วย `EXISTS(uid = auth.uid() AND role_id = 1)`
- [x] สร้าง Docs-only RLS โดยไม่แก้ Legacy objects
- [x] รัน Tests สำหรับ Guest, non-admin และ Admin
- [x] อัปเดต Context/Commands หลังทดสอบจริง
- [x] เทียบ migration history กับ Production แบบ read-only
- [x] เปลี่ยน Local environment/CLI ออกจาก Production ไป Staging และ reset Staging ตาม Production baseline
- [x] แก้ `doc_sections` RLS recursion และ privileged helper placement
- [x] ขยาย pgTAP role matrix ครบทุก Docs table
- [x] Harden Login exception/error handling
- [x] รัน Local verification sequence ใหม่ครบชุด
- [x] Apply Docs migrations ไป Staging และตรวจ history/RLS/RPC privilege
- [x] ทำ Browser smoke สำหรับ Staging non-admin และ Admin ด้วย Test account

## Acceptance

- ผู้ไม่มีสิทธิ์เข้า Admin/เขียนข้อมูล Docs ไม่ได้
- `role_id = 1` เข้า Admin ได้ แม้ UID มีหลายแถว
- Diff/Migration ไม่มีการแก้ `public.users`, `public.roles` หรือ RLS เดิม
- Local build/test ผ่าน

## Stop

สรุปผล ไฟล์ Tests และประเด็นค้าง แล้วรอภูยืนยัน M02

## Previous verification result

- Production migration versions 45 รายการตรงกับ local marker ทั้งหมด
- `20260811032210_docs_foundation_auth_rls.sql` เป็น migration Docs เดียวที่ pending และยังไม่ถูก apply ไปยัง remote
- `npx supabase db reset`, `npm run test:db`, `npm run lint` และ `npm run build` ผ่านใน Local

ผลเดิมยังไม่เพียงพอสำหรับปิด Module เพราะ test ไม่ครอบคลุม `SELECT doc_sections`; direct regression check พบ `infinite recursion detected in policy for relation doc_sections` และ Local environment ยังชี้ Production

## Rework verification result

- `doc_private` เก็บ privileged helper และ `public.doc_is_admin()` เป็น SECURITY INVOKER wrapper สำหรับ Server guard
- RLS ไม่มี self-recursion แล้ว; Guest/non-admin เห็นเฉพาะ Published structure/documents/media ส่วน Admin ทำ CRUD ได้ครบ
- `npx supabase@latest db reset`, `npm run test:db` (41 pgTAP tests), `db lint`, security/performance advisors, `npm run lint` และ `npm run build` ผ่านใน Local
- Advisor ที่เหลือเป็น Legacy objects เท่านั้น; ไม่พบ warning ของ `doc_*`
- Staging ถูก reset ถึง Production baseline version `20260806173000`; จากนั้น apply Docs migrations `20260811032210` และ `20260811043215` สำเร็จ
- Browser smoke ผ่านครบ: Guest ไป Login, non-admin ถูกส่งกลับหน้า Public และ Admin เข้า `/admin` ได้
- Staging มี Test accounts ที่ภูสร้างและ mapping test roles 1/2 สำหรับการทดสอบครั้งนี้; ไม่มีข้อมูลผู้ใช้จริงจาก Production

## M01–M06 close-out verification — 13 สิงหาคม 2026

- Final local gate: pgTAP 140/140, focused suites, typecheck, lint, build/OpenNext build, audit และ local DB lint ผ่าน; Staging migration history ตรง Local ถึง `20260813062523`.
- Staging Guest/non-admin/Admin matrix ยืนยันอีกครั้ง: Guest `/admin` ไป login, non-admin กลับ Public, Admin เข้า Admin routes; Guest เห็น fixture Published-only และไม่มีสิทธิ์ mutation RPC/operation table. ไม่มี Production action.
- พบปุ่ม sign out ไม่ปรากฏใน Admin UI ระหว่าง smoke. บันทึกเป็น P2 UX follow-up แยกต่างหาก ไม่ใช่ข้ออ้างว่า requirement sign out ครบหรือเป็น authorization defect.

## Admin navigation/sign-out local evidence — 13 สิงหาคม 2026

- หลักฐาน M01–M06 ข้างต้นเป็นบันทึกเดิมและคงไว้ทั้งหมด; การเปลี่ยน Admin navigation/sign-out รอบนี้ผ่านเฉพาะ Local verification จึงยังไม่ใช่หลักฐาน Staging success หรือการปิด M01.
- Source review ด้วย `rg -n "await requireAdmin\\(\\)" src/app/admin` ยืนยันว่า Server guard ยังคงอยู่ที่ `/admin`, `/admin/structure`, `/admin/documents`, `/admin/documents/new`, `/admin/documents/[id]` และ `/admin/editor` (รวม Server Actions ที่เกี่ยวข้อง).
- `npm run test:admin-shell` ผ่าน 7/7 tests; `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run cf:build` และ `git diff --check` ผ่านใน Local.
- OpenNext build จบสำเร็จโดยมีคำเตือนเดิมเรื่อง Next `middleware` deprecated และข้อจำกัด OpenNext บน Windows; ไม่มี error จากคำสั่ง.
- Secret scan ของ tracked scope ไม่พบ secret หรือ connection string ที่ commit แล้ว: lexical matches 5 จุดมาจาก literal/ข้อความใน historical plan เท่านั้น และอีก 1 จุดเป็นคำอธิบาย policy ของ `service_role`; ไม่มีค่า secret ถูกบันทึกหรือแสดงในผลตรวจ.

## Staging deployment approval required

M01 ต้องคงสถานะ **Pending Staging verification** จนกว่าภูจะอนุมัติและมีผล smoke ที่ยืนยันได้จริง. คำขออนุมัติที่ต้องการคือ:

> Deploy only Docs App to Staging with `npx wrangler deploy --config wrangler.jsonc --keep-vars`.
> Do not deploy Docs Media Worker, do not migrate/reset/truncate/delete Staging data, and do not touch Production.

