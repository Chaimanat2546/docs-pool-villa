# Media Storage and Lifecycle

## Storage ownership

- R2 bucket แยกตาม Environment
- Docs Worker จำกัด prefix `docs/`
- Key รูปถาวร: `docs/{document_id}/{image_name}`
- รูปหนึ่งเป็นของเอกสารเดียวและใช้ข้ามเอกสารไม่ได้
- ไม่มี Media Library

## Add image

1. Upload button หรือ Clipboard paste สร้าง Browser preview
2. ยังไม่ส่ง R2 จนกด Save
3. Validate JPG/PNG/WebP, ไม่เกิน 10 MB, ด้านยาวไม่เกิน 1920 px
4. แปลงเป็น WebP
5. หาก Upload ใดล้มเหลว ให้ยกเลิก Save
6. หาก DB Save ล้มเหลว ให้ลบรูปใหม่ทันที
7. หากล้างรูปใหม่ไม่สำเร็จ ใช้ `cleanup_required` และ Retry เมื่อเปิด/Save เอกสารครั้งถัดไป

## Remove image

- ลบ R2 ก่อน Save content ใหม่
- ลบไม่สำเร็จให้ยกเลิก Save คงเอกสารเดิม และแสดง Retry

## Delete document/category

- ลบรูปทั้งหมดก่อนลบ DB
- ลบรูปไม่ครบให้คงข้อมูลและแจ้ง Retry
- ไม่ซ่อน Public อัตโนมัติ
- Hard delete ไม่มี Restore

