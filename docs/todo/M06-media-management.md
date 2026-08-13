# M06 — Media Lifecycle & Cleanup

**Status:** Not started

ชื่อไฟล์คง `media-management` เพื่อให้ลิงก์ที่ตกลงไว้ไม่เปลี่ยน แต่ Module นี้ไม่มี Media Library

## Scope

- [ ] ลบรูปเดิมจาก R2 ก่อน Save content ที่เอารูปออก
- [ ] ต่อจาก immediate upload rollback/cleanup record ขั้นต่ำของ M04 และทำ Retry เมื่อเปิด/Save เอกสารครั้งถัดไป
- [ ] `cleanup_required` lifecycle และ Retry orchestration แบบเต็ม
- [ ] Hard-delete document lifecycle hardening ต่อจาก Worker DELETE/document-delete orchestration ขั้นต่ำของ M04
- [ ] Category cascade deletion orchestration
- [ ] Error message และ Retry แบบ minimal
- [ ] Failure-path tests
- [ ] อัปเดต Context/TODO

## Acceptance

- Delete R2 fail แล้ว Content/Document ไม่ถูกลบ
- Upload rollback fail ถูกติดตามและ Retry ได้โดยไม่ใช้ Cron/Media Library
- ไม่มีการใช้รูปข้ามเอกสาร
- ผู้ใช้ทราบชื่อไฟล์และขั้นตอน Retry

## Stop

สรุปและรอภูยืนยัน M07

