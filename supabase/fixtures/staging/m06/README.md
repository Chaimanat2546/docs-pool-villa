# Retained M06 fixtures

ไฟล์ `*-smoke.sql` เป็น setup history ที่ Commit ข้อมูลทดสอบเดิม ส่วน `*-inspect.sql` เป็น read-only inspection
ภูอนุมัติ cleanup แล้ว แต่ต้องใช้ `cleanup-retained.sql` หลังตรวจ exact R2 keys และ DB state เท่านั้น
ห้ามนำ directory นี้กลับไปไว้ใต้ `supabase/tests` เพราะ Supabase CLI จะถือทุก SQL เป็น pgTAP test
