# Retained M06 fixtures

ไฟล์ `*-smoke.sql` เป็น setup history ที่ Commit ข้อมูลทดสอบเดิม ส่วน `*-inspect.sql` เป็น read-only inspection
ห้ามนำ directory นี้กลับไปไว้ใต้ `supabase/tests` เพราะ Supabase CLI จะถือทุก SQL เป็น pgTAP test

Historical R2 exact keys:

- `docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp`
- `docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp`
- `docs/f6900000-0000-4000-8000-000000000001/f6b00000-0000-4000-8000-000000000001.webp`
- `docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp`
- `docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp`

## Required cleanup gate

ภูอนุมัติ cleanup แล้ว แต่ต้องทำตามลำดับนี้ครบทุกข้อก่อนลบ DB:

1. รัน inspection เพื่อยืนยัน current DB state และรายการ exact R2 keys เป้าหมาย
2. ลบเฉพาะ R2 exact keys ทั้ง 5 รายการข้างต้นผ่าน App/Worker path ที่อนุมัติหรือ exact-target operation ที่อนุมัติเท่านั้น
3. ตรวจว่า exact keys ทั้ง 5 รายการไม่มีอยู่แล้ว โดยแต่ละ key ต้องตอบ `404` หรือยืนยัน absence สำเร็จ
4. ตรวจว่า DB blockers เป็นศูนย์สำหรับ exact retained documents: Media, lifecycle operations และ cleanup records ต้องไม่มีเหลือ
5. รัน `cleanup-retained.sql` หลังข้อ 1–4 สำเร็จทั้งหมดเท่านั้น

หากขั้นตอนใดล้มเหลว ให้หยุดและคง DB targets เดิมไว้ ห้ามรัน `cleanup-retained.sql` หรือขยาย target/predicate เพื่อข้าม blocker
