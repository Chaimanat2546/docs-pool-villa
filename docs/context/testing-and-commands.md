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
- Pre-M04 Remediation Local verification (11 สิงหาคม 2026): `db reset` apply corrective migration, `npm run test:db` (63 pgTAP tests), `npm run test:content` (6 tests), `npm run test:worker` (5 tests), TypeScript/Worker typecheck, lint, build และ `npm audit --omit=dev` ผ่าน; DB lint/advisors ไม่พบ warning ของ `doc_*`
- Pre-M04 Remediation Browser smoke: Slash Command เลือกด้วย mouse ได้, Toolbar keyboard focus, Preview เปิด/ปิด และ Mobile 390px ไม่มี horizontal overflow หรือ console error ใหม่
- M04 Local verification (11 สิงหาคม 2026): `db reset`, `npm run test:db` (93 pgTAP tests), `npm run test:content` (6 tests), `npm run test:worker` (7 Local R2 tests), TypeScript/Worker typecheck, lint, build, DB lint/advisors และ `npm audit --omit=dev` ผ่าน; advisor warnings ที่เหลือเป็น Legacy objects นอกขอบเขต
- M04 Staging (11 สิงหาคม 2026): dry-run ยืนยัน migration เดียว แล้ว `npx supabase@latest db push --linked --yes` apply `20260811092710_document_management_publish_workflow.sql` สำเร็จ
- M04 Browser smoke (Staging Admin, no media): สร้าง Section `M04 Smoke`, สร้าง Draft, เปิด Preview, Publish, และ hard-delete document สำเร็จ แล้วลบ Section ทดสอบกลับจนไม่เหลือข้อมูล
- M04 Worker Staging (11 สิงหาคม 2026): `wrangler deploy --env staging` deploy `docs-media-staging` version `5a583590-41af-4b58-ae0c-c838ddd170f3` สำเร็จ; remote DELETE ที่ไม่มี ticket คืน 401 และ Origin ที่ไม่อนุญาตคืน 403. สร้าง/ลบ Section `M04 Media Smoke` กลับแล้ว
- M04 close-out validation (11 สิงหาคม 2026): Staging Admin สอง session เปิดเอกสารเดียวกัน แล้ว Save จาก session ที่สองถูก version conflict พร้อมข้อความ Reload; viewport 390px render หน้าแก้ไขได้ และลบข้อมูล `M04 E2E Smoke` กลับแล้ว. `npm run test:worker` ผ่าน 8 tests รวม signed delete success/idempotent และ mock R2 delete failure ที่คืน safe 500; `npm run typecheck:worker` ผ่าน. Browser automation ไม่อนุญาตให้แนบ `FileList` จึงไม่มี real-browser image upload ในรอบนี้
- Editor prompt correction (11 สิงหาคม 2026): แทน `window.prompt()` ของ Alt text, Link และ YouTube ด้วย accessible in-page dialog; `npx tsc --noEmit`, `npm run test:content` (6 tests) และ `npm run lint` ผ่าน
- Docs Media local/Staging configuration (11 สิงหาคม 2026): ตั้ง `NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL` และ secret ที่สุ่มใหม่ให้ `.env.local` (ถูก ignore โดย Git) และ `docs-media-staging`; ตรวจรายชื่อ Worker secret และหน้า `/admin/documents/new` หลัง restart ตอบ 200 โดยไม่แสดงค่า secret
- Docs Media CORS correction (11 สิงหาคม 2026): Worker Staging เพิ่ม allowlist เฉพาะ `http://localhost:3000` และ Staging app origin เพื่อให้ local app upload ได้; deploy version `57a7e225-c8e6-4342-8879-cc47f7b3a597` และ OPTIONS จาก localhost ได้ 204 พร้อม `Access-Control-Allow-Origin` ที่ถูกต้อง
- Docs Media read/config correction (11 สิงหาคม 2026): ย้าย `workers/docs-media/.env.local` ที่ทำให้ deploy ทับ secret ไปเป็น backup ที่ไม่ถูก Wrangler โหลด, sync secret Staging/local ใหม่ และ deploy Worker version `502a3ebd-2a33-443b-98b2-915241f945bc` พร้อม `GET /objects/docs/{document_id}/{media_id}.webp`; ทดสอบ Staging จริง upload 201, read 200 `image/webp`, แล้วลบ object ทดสอบสำเร็จ
- Docs Media lifecycle close-out (11 สิงหาคม 2026): เปลี่ยน Server DELETE ให้ส่ง signed ticket ผ่าน `X-Docs-Media-Ticket` (Worker รองรับ header เดิมสำหรับ retry), `npm run test:worker` ผ่าน 8 tests, `npm run typecheck:worker`, `npx tsc --noEmit`, `npm run test:content` (6 tests) และ `npm run lint` ผ่าน; deploy Staging version `2c4107d0-aecc-473f-b191-594866713329`. ทดสอบจริงด้วยข้อมูล Admin: upload รูป, Save, GET แสดงรูป, hard-delete เอกสารแล้วลบหมวด `M04 Real Media` กลับจนไม่เหลือเอกสาร/หมวด/รูปทดสอบ
- M01–M04 Full automated regression (11 สิงหาคม 2026): Local `db reset` จาก baseline ถึง M04 สำเร็จ; pgTAP 93 tests, Content 6 tests, Worker 8 tests, App/Worker typecheck, lint, production build และ `npm audit --omit=dev` ผ่าน. Local/Staging DB lint ไม่พบ schema error, migration history ตรงกัน และ Staging advisors มี warning ของ Docs 0 รายการ (warning ที่เหลือเป็น Legacy/Auth setting นอกขอบเขต)
- M01–M04 Full browser regression (11 สิงหาคม 2026): Guest `/admin` ตอบ 307 ไป `/auth/login`; Admin สร้าง parent/child section, ป้องกัน duplicate slug, Editor link/YouTube dialog และ Preview ผ่าน; Document ผ่าน Draft, Published, Archived, Republish, two-session version conflict, real PNG→WebP upload, permanent GET 200, hard-delete แล้ว GET เดิม 404 และ cascade-delete Section. Mobile viewport ไม่มี horizontal overflow/console error และลบ Staging Test data กลับจนเอกสาร/หมวด/รูปเป็นศูนย์
- Full Test defects/gaps (11 สิงหาคม 2026): หลัง image Save สำเร็จ Editor ยังแสดง `blob:` preview และ pending-image message จน Reload แม้ permanent object/DB Save สำเร็จ จึง reopen M04. `supabase test db --linked` รันไม่ได้เพราะ Staging ไม่มี `plan()`/pgTAP ใน search path; ทุกไฟล์เริ่มด้วย transaction และหยุดก่อน subtest จึงไม่ทิ้งข้อมูล. Build ผ่านแต่ Next.js แจ้ง deprecation warning ของ middleware convention
- M05 Local verification (13 สิงหาคม 2026): `db reset`, `npm run test:db` (104 pgTAP tests), `npm run test:public` (7 tests), `npm run test:content` (7 tests), `npm run test:worker` (8 tests), `npx tsc --noEmit`, Worker typecheck, lint, Next build, `npm run cf:build`, DB lint และ `npm audit --omit=dev` ผ่าน. OpenNext build ใช้ legacy Middleware เพื่อหลีกเลี่ยงข้อจำกัด Node Proxy ของ adapter; Next.js แสดง deprecation warning ของ Middleware และ adapter แสดง Windows warning เท่านั้น
- M05 Browser local shell smoke (13 สิงหาคม 2026): Homepage empty state, `/search?q=test` (noindex), custom 404 (noindex), skip link, search labels และ Mobile 390px ไม่มี horizontal overflow ผ่าน. ไม่ได้ยืนยัน Published Reader/redirect 308 ใน Browser เพราะ dev server ผูกกับ Staging ตาม `.env.local` ขณะที่ Test data อยู่ Local และยังไม่ได้รับอนุมัติให้ใช้ Staging สำหรับรอบนี้; ลบ Local test data และหยุด dev server แล้ว
- M05 Staging Guest smoke (13 สิงหาคม 2026): สร้าง Published root/child documents, Hidden document และ redirect test data ชั่วคราวผ่าน CLI แล้ว Local app ที่ชี้ Staging แสดง Homepage, nested Published Reader, TOC, Previous/Next และ Hidden route เป็น 404/noindex ถูกต้อง; ลบ Section/Document/Redirect ทดสอบและยืนยันเหลือ 0 records แล้ว. `migration list --linked` ยืนยันว่า `20260813033615_public_docs_redirect_visibility.sql` ยังไม่ถูก apply จึงยังไม่สามารถยืนยัน Guest redirect 308 ได้ และต้อง apply migration นี้ก่อนทดสอบซ้ำ
- M05 Staging migration and close-out (13 สิงหาคม 2026): `db push --linked --dry-run --skip-vault` ยืนยัน migration เดียว แล้ว apply `20260813033615_public_docs_redirect_visibility.sql` สำเร็จ; migration history ตรง Local. Guest old document path ตอบ `308 Location: /m05-staging/start`, Browser ไปถึง Published Reader, และหลัง archive test document redirect ตอบ 404 ทันที; หน้า Homepage ที่ cache อยู่ refresh ข้อมูล Published ถูกต้องหลัง TTL 5 วินาทีและ full refresh. ลบ Staging test Section/Document/Redirect กลับจนเหลือ 0 records, `db lint --linked --schema public --level warning --fail-on error` ผ่าน และ security advisor ไม่มี warning ใหม่ของ `doc_*` (ที่เหลือเป็น Legacy/Auth setting นอกขอบเขต)
- M05 Staging app deployment (13 สิงหาคม 2026): Cloudflare dry-run ตรวจ target `docs-pool-villa-staging` ผ่าน แล้ว build โดยกำหนด `NEXT_PUBLIC_DOCS_SITE_URL` เป็น Staging origin เฉพาะ build/deploy process และ deploy OpenNext Worker version `f8c9bcc1-aa57-43f1-a3f0-cc12995d46c3` สำเร็จที่ `https://docs-pool-villa-staging.chaymanus2003.workers.dev`. Remote smoke: Homepage 200 พร้อม canonical Staging origin, Search เป็น `noindex,nofollow` และ custom 404 ตอบ 404 พร้อม `noindex`. ไม่มี Production deployment

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

