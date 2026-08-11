# Testing and Commands

ไฟล์นี้บันทึกคำสั่งทดสอบที่ยืนยันว่าใช้ได้จริงตาม Module ห้ามใส่ Secret

## Current state

- M01 complete: `.env.local` และ CLI ใช้ Staging, Staging ถูก reset ถึง Production baseline `20260806173000`, Docs migrations ผ่าน Staging แล้ว และ Browser smoke ครบทุก role
- `npm run lint` — ผ่าน เมื่อ 11 สิงหาคม 2026
- `npm run build` — ผ่าน เมื่อ 11 สิงหาคม 2026
- `npm run test:db` — ผ่าน 41 pgTAP tests เมื่อ 11 สิงหาคม 2026: Guest, Authenticated non-admin และ Admin (`role_id = 1` แม้ UID ซ้ำ); ครอบคลุม Sections/Documents/Media/Redirects, CRUD และ direct `SELECT doc_sections`
- `npx supabase@latest db reset` — ผ่าน: สร้าง Local database จาก Production schema baseline, history markers และ migration Docs ตามลำดับ
- `npx supabase@latest db lint --local --schema public --level warning --fail-on error` — ผ่าน
- `npx supabase@latest db advisors --local --type security --level warn --fail-on error` — ผ่านโดยไม่มี warning ของ Docs; warning ที่เหลือเป็น Legacy objects นอกขอบเขต
- `npx supabase@latest db advisors --local --type performance --level warn --fail-on none` — ไม่พบ warning ของ `doc_*`
- `npx supabase@latest db reset --linked --version 20260806173000 --yes` — reset Staging ตาม Production baseline โดยภูยืนยันให้ลบ Test data; ไม่ apply Docs migration
- `npx supabase@latest db push --linked --yes` — apply Docs migrations `20260811032210_docs_foundation_auth_rls.sql` และ `20260811043215_restrict_doc_is_admin_rpc.sql` ไป Staging หลัง dry-run
- `npx supabase@latest migration list --linked` — Staging history ตรง Local รวม Docs migrations แล้ว
- Staging remote checks — พบ RPC `public.doc_is_admin()`, RLS เปิดครบ 4 Docs tables, `anon` เรียก Admin RPC ไม่ได้ และ `authenticated` เรียกได้
- Browser smoke ที่ `http://localhost:3000` — `/` เปิดได้, Guest `/admin` redirect ไป `/auth/login`, invalid credentials แสดงข้อความ generic และ form กลับมาใช้งานได้; non-admin ถูกส่งกลับ `/`, Admin เข้า `/admin` ได้
- Staging Test-account setup — ภูสร้าง Auth users ผ่าน Dashboard; เพิ่ม Test role/mapping เฉพาะ Staging ตามข้อยกเว้นที่ภูอนุมัติ และไม่ใช้ข้อมูลผู้ใช้จริงจาก Production
- อนุญาตเฉพาะ Local build/test จนกว่าภูจะสั่ง Deploy
- M02 Local verification (11 สิงหาคม 2026): `db reset`, `npm run test:db` (55 pgTAP tests), `npm run lint`, `npm run build` และ Local db lint ผ่าน; Local advisor ไม่พบ warning ของ `doc_*`
- M02 Staging (11 สิงหาคม 2026): dry-run ยืนยัน migration เดียว แล้ว `npx supabase@latest db push --linked --yes` apply `20260811060703_docs_structure_management.sql` สำเร็จ; `migration list --linked` ตรง Local
- M02 Browser smoke บน Staging Admin: `/admin/structure` โหลดได้, สร้างหมวดหลัก/หมวดย่อย และลบข้อมูลทดสอบกลับสำเร็จ; Mobile 390px ไม่มี console error
- M03 Local verification (11 สิงหาคม 2026): `npm run test:content` (4 tests), `npm run test:worker` (3 Local R2 tests), `npx tsc --noEmit`, `npm run typecheck:worker`, `npm run lint`, `npm run build` และ `npm audit --omit=dev` ผ่านทั้งหมด
- M03 Browser smoke (11 สิงหาคม 2026): Admin เปิด `/admin/editor` ได้, Editor/Toolbar render, เปิด/ปิด Preview state ที่ยังไม่ Save ได้ และไม่มี console error

## Required checks by the end of MVP

- Type check, Lint, Unit/Integration tests และ Production build
- RLS tests สำหรับ Guest, Authenticated non-admin และ role_id=1
- Optimistic locking conflict test
- Media upload/delete/rollback failure tests
- Route collision/redirect loop tests
- `pg_trgm` Thai partial search tests
- Accessibility keyboard/screen-reader checks
- Performance checks ตาม NFR
- Browser checks ตามรายการที่รองรับ

เมื่อเริ่มแต่ละ Module ให้เพิ่มเฉพาะคำสั่งที่รันสำเร็จจริงพร้อมคำอธิบายสั้น ๆ

