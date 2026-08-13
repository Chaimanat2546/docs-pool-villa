# M01 — Foundation, Supabase Auth & Docs-only RLS

**Status:** Complete — Approved Staging App smoke passed

**Pre-M04 remediation (historical):** Complete; see [Remediation TODO](M01-M03-remediation.md) for verified evidence.

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

M01 ปิดแล้ว; M02–M06 ปิดในรอบถัดมา และ M07 ยังไม่เริ่มจนกว่าภูจะยืนยัน

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

- บันทึกนี้เป็น historical checkpoint ก่อน Approved Staging App smoke: ณ จุดนี้ Admin navigation/sign-out ผ่านเฉพาะ Local และยังไม่ใช้ปิด M01; หลักฐาน Staging ในหัวข้อถัดไปเป็นผลที่ใช้ปิด M01 แล้ว.
- Source review ด้วย `rg -n "await requireAdmin\\(\\)" src/app/admin` ยืนยันว่า Server guard ยังคงอยู่ที่ `/admin`, `/admin/structure`, `/admin/documents`, `/admin/documents/new`, `/admin/documents/[id]` และ `/admin/editor` (รวม Server Actions ที่เกี่ยวข้อง).
- `npm run test:admin-shell` ผ่าน 7/7 tests; `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run cf:build` และ `git diff --check` ผ่านใน Local.
- OpenNext build จบสำเร็จโดยมีคำเตือนเดิมเรื่อง Next `middleware` deprecated และข้อจำกัด OpenNext บน Windows; ไม่มี error จากคำสั่ง.
- Secret scan ของ tracked scope ไม่พบ secret หรือ connection string ที่ commit แล้ว: lexical matches 8 จุดประกอบด้วย 5 จุดจาก literal/ข้อความใน historical plan และ 3 จุดจาก documentation policy ที่อ้างถึง `service_role`; ไม่มี PostgreSQL connection-string match และไม่มีค่า secret ถูกบันทึกหรือแสดงในผลตรวจ.

## Approved Staging App smoke — 13 สิงหาคม 2026

- Build โดยกำหนดเฉพาะ public Staging values และ `npx wrangler deploy --dry-run --config wrangler.jsonc` ผ่าน: target คือ `docs-pool-villa-staging`, binding `DOCS_MEDIA` อยู่ครบ และไม่แสดง secret.
- Deploy เฉพาะ Docs App ด้วย `npx wrangler deploy --config wrangler.jsonc --keep-vars` สำเร็จเป็น version `c9c10b09-a383-4fbf-9bba-5609831c29cb`; ไม่ได้ deploy Docs Media Worker, migration, reset, truncate หรือลบข้อมูล Staging และไม่ได้แตะ Production.
- Guest HTTP request ไป `/admin` ตอบ `307 Location: /auth/login`. Admin session ที่มีอยู่เห็น Sidebar และ active state ของ Structure/Documents/Editor; ที่ viewport 390px ปุ่ม `เมนูผู้ดูแล` เปิด drawer ที่ focus ถูกกักใน dialog, Escape คืน focus ให้ปุ่มเดิม, ไม่มี horizontal overflow หรือ console error. คลิก `ออกจากระบบ` ไป `/auth/login` และเรียก `/admin` หลัง logout ยังไป `/auth/login`.
- Non-admin session handoff สำเร็จแล้ว: เรียก Staging `/admin` ถูกส่งไป Public homepage `/` และไม่ render Admin shell/sidebar; console error เป็นศูนย์. ไม่ inspect cookie/storage และไม่มีการสร้าง user หรือแก้ข้อมูล. ครบ Guest/non-admin/Admin navigation และ sign-out acceptance จึงปิด M01 ได้.

