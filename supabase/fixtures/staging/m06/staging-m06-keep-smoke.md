# Archived M06 Staging Keep setup

ไฟล์นี้เป็นบันทึก non-executable ของ fixture `M06 Staging Keep` เท่านั้น ห้ามแปลงกลับเป็น SQL หรือใช้สร้าง Test account/Role mapping

Setup เดิมเคยสร้าง Synthetic Auth user และเขียน `public.users.role_id = 1` ก่อนสร้าง Docs fixture จึงถูกนำออกจาก executable fixtures เพราะขัดกับขอบเขตที่อนุญาตให้ Docs อ่าน Legacy authorization mapping เท่านั้น

สถานะ ณ 13 สิงหาคม 2026:

- exact Section, Document, Media, operation และ cleanup targets ถูก cleanup จนเป็นศูนย์แล้ว
- exact R2 key `docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp` ตอบ 404 แล้ว
- non-target fingerprints ที่ตรวจไว้ไม่เปลี่ยน
- ไม่มี Production action

หากต้องทำ Staging smoke ใหม่ ให้ใช้ Test admin/mapping ที่ภูสร้างไว้แล้วและเริ่มจาก read-only assertion ว่า `EXISTS(uid = auth.uid() AND role_id = 1)` เท่านั้น ห้าม fixture ใด `INSERT`, `UPDATE`, `UPSERT` หรือ `DELETE` ที่ `auth.users`, `public.users` หรือ Legacy object อื่น
