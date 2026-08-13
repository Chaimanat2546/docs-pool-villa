# M06 — Media Lifecycle & Cleanup

**Status:** Complete and verified on Staging; retained test artifacts awaiting user approval to cleanup

ชื่อไฟล์คง `media-management` เพื่อให้ลิงก์ที่ตกลงไว้ไม่เปลี่ยน แต่ Module นี้ไม่มี Media Library

## Scope

- [x] ลบรูปเดิมจาก R2 ก่อน Save content ที่เอารูปออก โดย persist operation และ freeze เอกสารก่อน
- [x] ต่อจาก immediate upload rollback/cleanup record ขั้นต่ำของ M04 และทำ Retry เมื่อเปิดรายการ/Save เอกสารครั้งถัดไป
- [x] Cleanup claim/retry lifecycle แทน `cleanup_required` พร้อม lease, bounded batch และ error ที่แสดงชื่อไฟล์
- [x] Hard-delete document lifecycle hardening ต่อจาก Worker DELETE/document-delete orchestration ขั้นต่ำของ M04
- [x] Category cascade deletion orchestration พร้อม exact-key manifest และ freeze เอกสารใน subtree
- [x] Error message, progress list, Base UI confirmation dialog และ Retry แบบ minimal
- [x] Failure-path tests สำหรับ cleanup, prepared save, concurrent operation, direct-save bypass และ Worker ticket
- [x] อัปเดต Context/TODO

## Acceptance

- Delete R2 fail แล้ว Content/Document ไม่ถูกลบ
- Upload rollback fail ถูกติดตามและ Retry ได้โดยไม่ใช้ Cron/Media Library
- ไม่มีการใช้รูปข้ามเอกสาร
- ผู้ใช้ทราบชื่อไฟล์และขั้นตอน Retry

## Close-out

- สร้าง migration `20260813062523_docs_media_lifecycle_operations.sql` สำหรับ durable operation, cleanup lease และ trigger ที่ป้องกัน direct save ทำให้ media เดิมกลายเป็น orphan
- ยังไม่ได้ apply migration หรือ deploy Worker ไป Staging/Production ตามขอบเขตที่ภูอนุมัติในรอบนี้
- Staging smoke (13 สิงหาคม 2026): apply migrations, deploy Worker และ App แล้ว; UI แสดง pending operation, filename/retry, disabled save/delete และ Mobile keyboard focus ถูกต้อง. แก้ App-to-Worker call เป็น Cloudflare Service Binding และอ่าน secret จาก runtime binding; Retry end-to-end ลบตาม durable manifest แล้ว finalize DB สำเร็จ, UI กลับมา Save/Delete ได้. เก็บ section/document และ R2 object ทดสอบไว้ตามคำสั่งภู; ไม่มี cleanup เพิ่มเติม
- คำสั่งและผลการตรวจ local ล่าสุดบันทึกใน [Testing and Commands](../context/testing-and-commands.md)

## Stop

สรุปและรอภูยืนยัน M07

