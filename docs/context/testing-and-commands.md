# Testing and Commands

ไฟล์นี้บันทึกคำสั่งทดสอบที่ยืนยันว่าใช้ได้จริงตาม Module ห้ามใส่ Secret

## Current state

- ยังไม่เริ่ม M01
- ยังไม่มีคำสั่ง Test ที่รับรองเป็น Baseline
- อนุญาตเฉพาะ Local build/test จนกว่าภูจะสั่ง Deploy

## Required checks by the end of MVP

- Type check, Lint, Unit/Integration tests และ Production build
- RLS tests สำหรับ Guest, Authenticated non-admin และ role_id=1
- Optimistic locking conflict test
- Media upload/delete/rollback failure tests
- Route collision/redirect loop tests
- `pg_trgm` Thai partial search tests
- Accessibility keyboard/screen-reader checks
- Performance checks ตาม NFR
- Browser checks ตามรายการที่รองรับ

เมื่อเริ่มแต่ละ Module ให้เพิ่มเฉพาะคำสั่งที่รันสำเร็จจริงพร้อมคำอธิบายสั้น ๆ

