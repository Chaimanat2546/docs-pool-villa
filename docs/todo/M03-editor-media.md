# M03 — Editor Core & Docs Media Worker/R2

**Status:** Not started

## Scope

- [ ] Tiptap schema, Toolbar และ Slash Command
- [ ] Node: text/headings/lists/link/table/code/callout/image/YouTube
- [ ] Shared validation/style ระหว่าง Editor และ Viewer
- [ ] Preview unsaved state
- [ ] Clipboard paste และ Upload ใช้ Flow เดียวกัน
- [ ] Client preview ก่อน Save
- [ ] Validate/resize/convert image ตาม Requirement
- [ ] Docs Media Worker แยก Secret และจำกัด `docs/`
- [ ] YouTube allowlist + `youtube-nocookie.com`
- [ ] Security/keyboard/accessibility tests
- [ ] อัปเดต Context/TODO

## Acceptance

- ไม่มี Raw HTML หรือ URL อันตรายผ่าน Validation
- รูปไม่ขึ้น R2 ก่อน Save
- Worker เข้าถึงเฉพาะ Docs prefix และไม่แก้ Worker เดิม
- Upload/Paste แสดง Progress/Error ต่อรูป

## Stop

สรุปและรอภูยืนยัน M04

