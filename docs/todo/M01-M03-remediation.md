# Pre-M04 Remediation — M01–M03

**Status:** Complete — Staging remediation accepted; M04–M06 completed in later approved work

## Scope

- [x] ปิด Public RLS leak: Published document/media ใต้ Section หรือ Parent Section ที่ซ่อนไม่สามารถอ่านได้
- [x] บังคับ Section depth สูงสุด 2 ระดับแม้มี concurrent structural writes
- [x] ทำ category delete confirmation เป็น atomic กับการลบ
- [x] Validate Server Action input และ Tiptap JSON structural limits
- [x] Harden Docs Media Worker: WebP structure/dimension validation, bounded body และ conditional R2 write
- [x] แก้ Slash Command mouse selection และ pending-image state reconciliation
- [x] เพิ่ม pgTAP, Content และ Worker regressions
- [x] รัน Local verification ครบ

## Corrective migration

- `20260811074629_docs_pre_m04_remediation.sql` เป็น migration ใหม่ เพราะ M01/M02 migrations เดิมถูก apply Staging แล้ว
- เปลี่ยนเฉพาะ Docs-owned functions/policies และไม่แตะ Legacy object

## Local verification

- `npx supabase@latest db reset` — ผ่าน; apply migration remediation ได้จาก Production baseline
- `npm run test:db` — ผ่าน 63 pgTAP tests
- `npm run test:content` — ผ่าน 6 tests
- `npm run test:worker` — ผ่าน 5 Local R2 tests
- `npx tsc --noEmit`, `npm run typecheck:worker`, `npm run lint`, `npm run build` — ผ่าน
- `npm audit --omit=dev` — ไม่พบช่องโหว่
- Local DB lint — ผ่าน; advisors ไม่พบ warning ของ `doc_*`
- Browser smoke — Slash Command เลือกด้วย mouse ได้, Toolbar keyboard focus, Preview เปิด/ปิด, Mobile 390px ไม่มี horizontal overflow หรือ console error ใหม่

## Staging progress

1. [x] ตรวจ `db push --linked --dry-run` และ apply corrective migration ไป Staging
   - apply เฉพาะ `20260811074629_docs_pre_m04_remediation.sql`; ตรวจ migration history แล้วตรงกัน
   - ตรวจ remote policy ยืนยันว่า public read ของ Document/Media เรียก `doc_private.doc_document_is_public(...)`
2. [x] Deploy Docs Media Worker เฉพาะ Staging และตั้ง Secret/Origin ของ Staging
   - Worker: `https://docs-media-staging.chaymanus2003.workers.dev`
   - R2: `docs-media-staging` (APAC), แยกจากระบบเดิม และ Worker เขียนได้เฉพาะ key prefix `docs/`
   - CORS อนุญาตเฉพาะ `https://docs-pool-villa-staging.chaymanus2003.workers.dev`; ตั้ง `DOCS_MEDIA_UPLOAD_SECRET` เป็น Staging secret ใหม่
   - smoke ผ่าน: allowed preflight 204, untrusted origin 403, upload ที่ไม่มี ticket 401
3. [x] ทดสอบ RLS role matrix, Section move/delete และ Editor ผ่านหน้าเว็บบน Staging
   - Frontend: `https://docs-pool-villa-staging.chaymanus2003.workers.dev`
   - unauthenticated browser smoke ผ่าน: Login page render, `/admin/editor` redirect ไป Login
   - authenticated admin smoke ผ่าน: สร้าง Root/Child test sections, Root ที่มี Child เลือก parent ใหม่ไม่ได้, delete confirmation ต้องตรงชื่อ และลบ Root/Child test data สำเร็จ
   - Editor render ผ่าน; แก้ Tiptap `link` extension ซ้ำและ redeploy แล้ว ไม่พบ warning ใหม่
   - การ upload ผ่าน UI เป็น pending image โดยตั้งใจ และจะอัปโหลดเมื่อกด Save document ใน M04; จึงไม่มี document-save path ให้ทดสอบ actual WebP upload ก่อนเริ่ม M04

ห้าม deploy หรือ migrate Production ภายใต้งานนี้
