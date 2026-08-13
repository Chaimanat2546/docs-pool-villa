# Media Storage and Lifecycle

## Storage ownership

- R2 bucket แยกตาม Environment
- Docs Worker จำกัด prefix `docs/`
- Key รูปถาวร: `docs/{document_id}/{media_id}.webp`
- รูปหนึ่งเป็นของเอกสารเดียวและใช้ข้ามเอกสารไม่ได้
- ไม่มี Media Library

## Add image

1. Upload button หรือ Clipboard paste สร้าง Browser preview
2. ยังไม่ส่ง R2 จนกด Save
3. Validate JPG/PNG/WebP, ไม่เกิน 10 MB, ด้านยาวไม่เกิน 1920 px
4. แปลงเป็น WebP
5. หาก Upload ใดล้มเหลว ให้ยกเลิก Save
6. หาก DB Save ล้มเหลวก่อนเริ่ม prepared operation ให้ลบรูปใหม่ทันที
7. หากล้างรูปใหม่ไม่สำเร็จ ให้บันทึก `doc_media_cleanup` พร้อม lease/error และ Retry แบบ bounded เมื่อเปิดรายการเอกสารหรือ Save ครั้งถัดไป

## M03 upload contract

- Browser เตรียมรูปเป็น WebP และเก็บ Blob/preview URL ชั่วคราวจนกด Save
- Upload button และ Clipboard paste ใช้ pipeline เดียวกัน; รูปต้องมี alt text
- Next.js Server Action ตรวจ Admin และออก HMAC upload ticket อายุ 5 นาที; secret ไม่ส่ง Client
- Ticket ระบุ byte size และ dimensions ที่ Browser แปลงแล้ว; Worker parse WebP container/dimensions เองและต้องตรงกับ ticket
- Worker รับ `PUT /uploads` เฉพาะ ticket ที่ผูกกับ `docs/{document_id}/{media_id}.webp`, Origin ที่อนุญาต, `image/webp` และขนาดไม่เกิน 10 MB
- R2 ใช้ conditional create (`etagDoesNotMatch: '*'`) เพื่อป้องกัน ticket replay เขียนทับ object เดิม; response คืน metadata ที่ตรวจจริงให้ M04 บันทึก
- Worker Local config อยู่ที่ `workers/docs-media/wrangler.jsonc`; secret local อยู่ใน `.dev.vars` ที่ถูก ignore และห้าม deploy จนกว่าภูจะอนุมัติ
- M06 ใช้ durable `doc_media_operations`: prepare จะ freeze เอกสารและ persist exact-key manifest, Server Action อ่าน secret จาก runtime binding แล้วส่ง HMAC ticket ที่ผูก operation ID/type, document และ exact object keys ไป Worker ผ่าน Cloudflare Service Binding `DOCS_MEDIA`; finalize DB เฉพาะเมื่อ R2 สำเร็จ
- Worker DELETE ไม่รับ ticket จาก Browser และการลบ key เดิมซ้ำเป็น success เพื่อให้ Retry ของ operation เดิมปลอดภัย
- Worker อ่านรูปด้วย `GET /objects/docs/{document_id}/{media_id}.webp` เท่านั้น; ส่งผ่าน R2 stream, `image/webp` และ immutable cache header โดยไม่เปิด bucket listing หรือ arbitrary key access

## Remove image

- prepare ก่อน: document เดิมยังคงอยู่และถูก freeze
- ลบ R2 ตาม manifest ก่อน แล้วจึง finalize content/metadata ใหม่
- ลบไม่สำเร็จให้คง document เดิม, เก็บ error/ชื่อไฟล์ และแสดง Retry

## Delete document/category

- prepare document/category ก่อน แล้วลบรูปทั้งหมดตาม manifest ก่อนลบ DB
- ลบรูปไม่ครบให้คงข้อมูลและแจ้ง Retry; category จะ freeze documents ใน subtree
- ไม่ซ่อน Public อัตโนมัติ
- Hard delete ไม่มี Restore

