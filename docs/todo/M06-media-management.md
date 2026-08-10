# M06 — Media Lifecycle & Cleanup

**Status:** Not started

ชื่อไฟล์คง `media-management` เพื่อให้ลิงก์ที่ตกลงไว้ไม่เปลี่ยน แต่ Module นี้ไม่มี Media Library

## Scope

- [ ] ลบรูปเดิมจาก R2 ก่อน Save content ที่เอารูปออก
- [ ] Upload rollback เมื่อ DB Save ล้มเหลว
- [ ] `cleanup_required` และ Retry ตอนเปิด/Save เอกสารครั้งถัดไป
- [ ] ลบรูปทั้งหมดก่อน Hard-delete เอกสาร
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

