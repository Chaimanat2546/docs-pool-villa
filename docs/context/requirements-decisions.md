# Confirmed Requirements Decisions

สรุปการตัดสินใจที่มีผลต่อการออกแบบ:

- Published document อัปเดต Public ทุก Save; Draft ต้องกด Publish
- Manual Save เท่านั้น พร้อม unsaved warning
- Preview แสดง unsaved editor state และ Admin เท่านั้น
- Optimistic locking; Version ชนให้ Reload
- หมวดสูงสุด 2 ระดับ
- Slug unique เฉพาะ Parent/Section และเก็บ permanent redirects
- Hard delete ไม่มี Trash/Restore
- ลบรูป R2 สำเร็จก่อน Save/Delete DB
- Category delete แสดงจำนวนหมวดย่อย รายชื่อเอกสาร และให้พิมพ์ชื่อหมวด
- รูปไม่ใช้ซ้ำข้ามเอกสาร; ไม่มี Media Library
- Upload/Paste เก็บใน Browser จน Save
- Cleanup รูปใหม่ที่ Save ล้มเหลวใช้ `cleanup_required` และ Retry ตอนเปิด/Save ครั้งถัดไป
- Admin ใช้ `EXISTS(uid = auth.uid() AND role_id = 1)`
- ห้ามแก้ Legacy tables/RLS/functions
- Search ใช้ `pg_trgm` เฉพาะ Docs
- Search รอบแรกค้นหาเฉพาะ Title ของ Published documents; query ว่างแสดงรายการทั้งหมดแบบ 10 รายการต่อหน้า และไม่ค้น Excerpt/Content, typo หรือ autocomplete
- Public Search ใช้ `Ctrl+K`/`⌘K` เพื่อไปหรือโฟกัสช่องค้นหา; Enter ส่ง native GET form
- Homepage สร้างอัตโนมัติ ไม่มี Admin configuration
- Staging/Production แยก Cloudflare/Supabase ทั้งหมด
- ชื่อระบบที่แสดง: "คู่มือสำหรับเว็บ Baan Pool Villa"
- Domain Production ที่วางแผน: `docs.poolvilla.co.th` แต่ยังไม่ตั้งค่าหรือใช้งานจริง
- Staging ต้องการชื่อ `docs-pool-villa`; รอระบุ FQDN ก่อนตั้งค่า
- Production migration/deploy ต้องผ่าน Staging, มี Backup/Rollback และรอภูยืนยัน
- ทำทีละ Module และหยุดรออนุมัติหลังจบทุก Module

รายละเอียดและ Acceptance criteria อยู่ใน [Requirement v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

