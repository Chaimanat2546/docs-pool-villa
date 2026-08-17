# M06 — Media Lifecycle & Cleanup

**Status:** Complete — historical Staging lifecycle และ post-closeout safety remediation verified on Staging

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
- Staging smoke (13 สิงหาคม 2026): apply migrations, deploy Worker และ App แล้ว; UI แสดง pending operation, filename/retry, disabled save/delete และ Mobile keyboard focus ถูกต้อง. แก้ App-to-Worker call เป็น Cloudflare Service Binding และอ่าน secret จาก runtime binding; Retry end-to-end ลบตาม durable manifest แล้ว finalize DB สำเร็จ, UI กลับมา Save/Delete ได้. เก็บ section/document และ R2 object ทดสอบไว้ตามคำสั่งภู; ไม่มี cleanup เพิ่มเติม
- Repeated Staging smoke (13 สิงหาคม 2026): fixture แยก `M06 Staging Repeat Keep` ยืนยัน object 200 → prepare operation → UI freeze/filename/disabled controls → Worker/DB finalize และ object 404, แล้ว Reload UI กลับมา Save/Delete ได้. พบ race: `DocumentForm` auto-retry ใน `useEffect` เริ่ม action พร้อมกับผู้ใช้คลิก Retry ที่ render แรก ทำให้ action ที่สองได้รับ “ไม่พบงานลบรูปที่ต้องลองอีกครั้ง” แม้ action แรกสำเร็จ. ต้องทำให้ Retry มี single-flight ก่อนปิด M06; fixture และเอกสารทดสอบยังคงไว้
- Retry/UI refresh remediation (13 สิงหาคม 2026): รวม auto-retry และปุ่ม Retry เป็น single-flight ต่อ `operationId`; ปลด lock และแสดง error ที่ควบคุมได้หาก Server Action throw. หลัง `router.refresh()` หน้า Server ส่ง key จาก `document.id:version` เพื่อ remount state ของฟอร์มเมื่อ version เปลี่ยน. Regression test ครอบคลุม manual retry มาก่อน effect, retry หลัง action throw และรับ title/content จาก server version ใหม่. Deploy App Staging `3ff31400-5211-4746-a13a-64a66b6b6406` ด้วย `--keep-vars`; fixture `M06 Staging Key Refresh Keep` แสดง freeze/image/disabled controls ก่อน lifecycle และบนหน้าเดิมเปลี่ยนเป็น finalized, ไม่มีภาพ/alert เดิม และ Save/Delete กลับมาใช้ได้. DB ยืนยัน version 2, media 0, operation 0; R2 object ที่สร้างเฉพาะเพื่อ lifecycle ถูกลบสำเร็จ (404) ขณะที่ section/document และ fixture/ข้อมูลทดสอบเดิมไม่ถูก reset/truncate/delete
- Final close-out (13 สิงหาคม 2026): user-approved fixture `fa200…0007` ได้รับ real lifecycle ใหม่: upload WebP (media `13810f48-9244-4561-902e-5f48f2f26a14`) → Worker `200 image/webp` → remove/save → media/operation/cleanup เป็น 0 และ exact R2 `404` ก่อน cleanup. Reload แล้วไม่มี pending image และ Save/Delete enabled. จากนั้นลบเพียง 1 document/1 section ด้วย exact fail-closed transaction; historical five keys และ dynamic key เป็น 404, target ทั้งหมดเป็น 0 และ non-target fingerprints ไม่เปลี่ยน. ไม่มี reset/truncate/Production action.
- Post-closeout section-delete race remediation (13 สิงหาคม 2026): migration `20260813150200_docs_section_delete_race_guard.sql` ปิดช่องว่าง prepare-empty → create/move Document/Media เข้า subtree → finalize ลบ DB เกิน manifest, overlap parent/child section-delete prepare และ Media mutation หลัง document lifecycle prepare. หลังภูอนุมัติ dry-run ยืนยันเพียง migration นี้ แล้ว apply Staging สำเร็จ; migration parity ตรง, DB lint ไม่มี schema error และ advisor พบ `doc_*` = 0. Deploy Docs App version `2ce99e46-0fbd-4663-a9ab-f9c1fb94b765` ด้วย `--keep-vars`; ไม่มี reset/truncate/delete ข้อมูล, Media Worker หรือ Production action.
- คำสั่งและผลการตรวจ local ล่าสุดบันทึกใน [Testing and Commands](../context/testing-and-commands.md)

## Stop

M06 ปิดงานแล้ว; M07 ยังไม่เริ่มและต้องรอภูยืนยัน Module ถัดไป

