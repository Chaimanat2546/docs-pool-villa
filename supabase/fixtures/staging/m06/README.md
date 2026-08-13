# Retained M06 fixtures

ไฟล์ `*-smoke.sql` เป็น setup history ที่ Commit ข้อมูลทดสอบเดิม ส่วน `*-inspect.sql` เป็น read-only inspection
ภูอนุมัติ cleanup แล้ว แต่ต้องใช้ `cleanup-retained.sql` หลังตรวจ exact R2 keys และ DB state เท่านั้น
ห้ามนำ directory นี้กลับไปไว้ใต้ `supabase/tests` เพราะ Supabase CLI จะถือทุก SQL เป็น pgTAP test

Historical R2 exact keys:

- `docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp`
- `docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp`
- `docs/f6900000-0000-4000-8000-000000000001/f6b00000-0000-4000-8000-000000000001.webp`
- `docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp`
- `docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp`
