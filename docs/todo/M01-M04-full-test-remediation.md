# M01–M04 Full Test Remediation Plan

**Status:** Complete — 13 สิงหาคม 2026

Requirement baseline: [Poolvilla Docs Requirements TH v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

## เป้าหมาย

ปิด Defect/Gap ที่พบจาก Full Test M01–M04 โดยไม่เริ่ม M05/M06, ไม่แก้ Production และไม่เพิ่ม Feature นอก Requirement

## ขอบเขตที่ต้องแก้

### R1 — Post-save image state เปลี่ยนเป็นข้อมูลถาวรทันที

**สาเหตุ:** `DocumentForm` เปลี่ยน `content` และล้าง pending images หลัง Save แต่ `DocumentEditor`/Tiptap และ pending state ภายในไม่ได้รับสัญญาณ commit จึงยัง render `blob:` และข้อความรูปชั่วคราวจน Reload

- [x] เพิ่ม `contentRevision` commit contract ระหว่าง `DocumentForm` กับ `DocumentEditor`; เปลี่ยนเฉพาะหลัง DB Save สำเร็จ
- [x] เมื่อ commit สำเร็จ Editor เปลี่ยน content เป็น permanent Worker URL โดยไม่ emit dirty update ซ้ำ
- [x] ล้าง pending state ของ Parent และ Editor, เปลี่ยน content ก่อน revoke Blob URL และคง cleanup ตอน unmount/cancel
- [x] Save/Upload/DB failure ยังคง pending preview และ dirty state เพื่อ Retry ได้
- [x] Create แล้ว `router.replace` ไม่ต้องพึ่ง Reload เพื่อแก้ state

**Regression tests**

- [x] เพิ่ม Component regression test: เมื่อ content revision เปลี่ยน รูปใน Editor เปลี่ยนจาก `blob:` เป็น permanent URL
- [x] `npm run test:content` ครอบคลุม Component regression test (7 tests ผ่าน)
- [x] Browser E2E: เลือกรูป → Alt text → Save → หน้าเดิมแสดง permanent URL ทันที, pending message หาย และ dirty false โดยไม่ Reload
- [x] Worker GET ตอบ `200 image/webp`; hard-delete ทำให้ URL เดิมตอบ `404`

### R2 — pgTAP local เป็น database gate; linked runner ของ Staging ใช้ไม่ได้ในสภาพแวดล้อมนี้

**ผลวิเคราะห์:** Local stack มี pgTAP พร้อมใช้งานและทดสอบครบ แต่ `supabase test db --linked` บน Staging รายงานว่า extension มีอยู่แล้วก่อนหยุดที่ `function plan(integer) does not exist` แม้ไม่มี `doc_*` schema หรือ test data ถูกเขียนจากคำสั่งนั้น. การเพิ่ม extension/search path ใน test file ไม่ทำให้ hosted runner resolve function ได้ จึงนำการทดลองนั้นออกเพื่อไม่สร้างความเข้าใจผิดหรือเพิ่ม remote schema change ที่ไม่เกี่ยวกับแอป

- [x] คง `begin ... rollback` ในทุกไฟล์และไม่เพิ่ม Staging-only migration หรือ extension จาก test
- [x] รัน Local pgTAP สำเร็จครบ 93 tests หลัง local reset
- [x] ก่อน linked diagnostic ตรวจ Project ref ว่าเป็น Staging (`sxvkhzhqtrpxgzumsswl`) และไม่ใช่ Production ref `rqizfiayvcbozlzuvbok`
- [x] ยืนยันว่า linked runner เป็นข้อจำกัดของ hosted tooling ไม่ใช่ application/RLS defect; ไม่ทิ้ง test row, migration หรือ remote schema change
- [x] ใช้ Local pgTAP เป็น database gate และ Staging browser/RLS/media smoke เป็น integration gate จนกว่าจะมี dedicated test database หรือ Supabase แก้ linked pgTAP runner

### R3 — ย้าย Next.js Middleware convention เป็น Proxy

**สาเหตุ:** Next.js 16.3 deprecate `middleware.ts` และใช้ `proxy.ts`

- [x] ย้าย `src/middleware.ts` เป็น `src/proxy.ts` และเปลี่ยน named export เป็น `proxy`
- [x] คง matcher และ `updateSession()` เดิม; Server guard/RLS ยังเป็น authorization หลัก
- [x] Guest `/admin` → `/auth/login`; Admin session เข้า `/admin/structure` ได้
- [x] `npm run build` ไม่มี middleware deprecation warning

## ลำดับดำเนินงาน

1. เขียน Regression test ให้ R1 fail ตามอาการจริง
2. แก้ commit/reset contract ของ Editor แล้วรัน Content/Component tests
3. ย้าย Middleware convention เป็น Proxy และทดสอบ Auth redirect/session
4. ยืนยัน Local pgTAP 93 tests และแยก linked-runner limitation ออกจาก application gate
5. รัน Local full verification ทั้งชุด
6. รัน Staging Browser media E2E ด้วย Test data แล้วลบคืน
7. ลบ Test document/section/R2 object กลับ ตรวจว่าไม่เหลือข้อมูล แล้วอัปเดต Context/TODO

## Verification matrix

- [x] `npx supabase@latest db reset --local --yes`
- [x] `npm run test:db` — 93 tests
- [x] `npm run test:content` และ Component regression ใหม่
- [x] `npm run test:worker` — 8 tests
- [x] `npx tsc --noEmit`
- [x] `npm run typecheck:worker`
- [x] `npm run lint`
- [x] `npm run build` — ไม่มี middleware warning
- [x] `npm audit --omit=dev` — 0 vulnerabilities
- [x] Browser Desktop/Mobile smoke: auth, upload, save, GET, hard-delete, Mobile 390px ไม่มี horizontal overflow/console error และ cleanup test data บน Staging
- [x] `supabase test db --linked` ถูกตรวจแล้วว่าใช้ไม่ได้กับ hosted pgTAP runner นี้; Local 93 tests เป็น DB gate

## Definition of Done

- Save รูปสำเร็จแล้วหน้าเดิมใช้ permanent URL และไม่มี pending/dirty state โดยไม่ Reload
- Failure paths ไม่ล้าง preview/state และไม่ทิ้ง Orphan โดยไม่มีสถานะติดตาม
- Local pgTAP ผ่าน 93 tests; Staging integration ผ่าน Browser smoke โดยไม่ทิ้ง Test data หรือเปลี่ยน migration history
- Build ไม่มี middleware deprecation warning และ Auth behavior ไม่เปลี่ยน
- Test data/R2 object ถูกลบกลับครบ, Documentation ตรงกับผลจริง และ M04 กลับเป็น Complete
- หยุดรอภูอนุมัติก่อนเริ่ม M05; Production ยังไม่ถูกแตะ

## ไม่อยู่ในขอบเขต

- ลบรูปเดิมออกจากเอกสารขณะแก้ไข — M06
- Cleanup retry orchestration เต็มรูปแบบและ Category cascade R2 — M06
- Public reader/SEO/redirect rendering — M05
- Production migration/deployment
