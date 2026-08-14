# M03 — Editor Core & Docs Media Worker/R2

**Status:** Complete

**Pre-M04 remediation (historical):** Complete; see [Remediation TODO](M01-M03-remediation.md) for verified evidence.

**Post-M04 correction:** เปลี่ยน native `window.prompt()` ของ Alt text, Link และ YouTube เป็น accessible in-page dialog เพื่อรองรับ browser ที่ไม่รองรับ native prompt; TypeScript, content tests และ lint ผ่าน

**Post-closeout note (14 August 2026):** Tables were removed completely from the editor, validation, and reader by approved user decision.

**Post-closeout note (14 August 2026):** Paragraph Tab indentation renders as first-line indentation in the editor, Preview, and reader; persisted `indentLevel` and its keyboard behavior remain unchanged. Enter creates an independently indentable ordinary paragraph which renders with no paragraph-to-paragraph gap; headings, lists, callouts, quotes, code blocks, images, and embeds retain their own keyboard behavior. Tab after a legacy hard break first splits it into independently indentable paragraphs.

## Scope

- [x] Tiptap schema, Toolbar และ Slash Command
- [x] Node: text/headings/lists/link/code/callout/image/YouTube
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

- M04 เรียก `uploadPendingImage()` เฉพาะภายใน manual Save แล้วแทน pending image ด้วย `mediaId`/URL ถาวรใน transaction ของเอกสาร พร้อมเพิ่ม DELETE/document-delete orchestration และ immediate rollback ขั้นต่ำตามแผนที่ภูอนุมัติ
- M06 ต่อจาก contract ของ M04 เพื่อทำ remove-existing-image-before-save, cleanup retry ตอนเปิด/Save และ category cascade orchestration แบบเต็ม

## M01–M06 close-out verification — 13 สิงหาคม 2026

- `npm run test:content` ล่าสุดผ่าน 12/12 รวม dialog focus containment และการคืน focus ไปยัง Link/YouTube/Image trigger; Browser Staging ยืนยัน Link/YouTube dialog, Escape/focus return, Preview ที่ไม่บันทึก DB และ Mobile 390px.
- Browser automation ไม่อนุญาต native file chooser ก่อนแอปรับไฟล์ จึงใช้ real-component Image-flow regression เป็นหลักฐานของ Alt dialog/focus path; lifecycle upload จริงได้รับการยืนยันใน M06 แทน. ไม่มี Production action.

## Acceptance

- ไม่มี Raw HTML หรือ URL อันตรายผ่าน Validation
- รูปไม่ขึ้น R2 ก่อน Save
- Worker เข้าถึงเฉพาะ Docs prefix และไม่แก้ Worker เดิม
- Upload/Paste แสดง Progress/Error ต่อรูป

## Stop

M03 ปิดแล้วจากหลักฐาน Local/Staging; M04–M06 ปิดในรอบถัดมา และ M07 ยังไม่เริ่ม

