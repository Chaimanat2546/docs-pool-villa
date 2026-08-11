# M03 — Editor Core & Docs Media Worker/R2

**Status:** Complete

## Scope

- [x] Tiptap schema, Toolbar และ Slash Command
- [x] Node: text/headings/lists/link/table/code/callout/image/YouTube
- [x] Shared validation/style ระหว่าง Editor และ Viewer
- [x] Preview unsaved state
- [x] Clipboard paste และ Upload ใช้ Flow เดียวกัน
- [x] Client preview ก่อน Save
- [x] Validate/resize/convert image ตาม Requirement
- [x] Docs Media Worker แยก Secret และจำกัด `docs/`
- [x] YouTube allowlist + `youtube-nocookie.com`
- [x] Security/keyboard/accessibility tests
- [x] อัปเดต Context/TODO

## Local verification

- `npm run test:content` — ผ่าน 4 tests: content/URL/YouTube validation และ keyboard semantics ของ Toolbar
- `npm run test:worker` — ผ่าน 3 tests กับ Local R2: Origin, ticket, WebP validation และ write เฉพาะ Docs key
- `npx tsc --noEmit` และ `npm run typecheck:worker` — ผ่าน
- `npm run lint` — ผ่าน
- `npm run build` — ผ่าน
- `npm audit --omit=dev` — ไม่พบช่องโหว่
- Browser smoke ที่ `http://localhost:3000/admin/editor` — Admin เห็น Editor/Toolbar, เปิด/ปิด Preview ได้ และไม่มี console error

## Handoff to M04/M06

- M04 เรียก `uploadPendingImage()` เฉพาะภายใน manual Save แล้วแทน pending image ด้วย `mediaId`/URL ถาวรใน transaction ของเอกสาร
- M06 เพิ่ม DELETE endpoint และ orchestration: ลบ R2 ก่อนเปลี่ยน DB, rollback และ `cleanup_required`

## Acceptance

- ไม่มี Raw HTML หรือ URL อันตรายผ่าน Validation
- รูปไม่ขึ้น R2 ก่อน Save
- Worker เข้าถึงเฉพาะ Docs prefix และไม่แก้ Worker เดิม
- Upload/Paste แสดง Progress/Error ต่อรูป

## Stop

สรุปและรอภูยืนยัน M04

