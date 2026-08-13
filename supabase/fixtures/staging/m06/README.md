# Retained M06 fixtures

ไฟล์ `*-smoke.sql` ที่เหลือเป็น setup history ของ Docs-owned test data และต้องอาศัย Test admin/mapping ที่มีอยู่แล้ว ส่วน `*-inspect.sql` เป็น read-only inspection
ห้ามนำ directory นี้กลับไปไว้ใต้ `supabase/tests` เพราะ Supabase CLI จะถือทุก SQL เป็น pgTAP test

`staging-m06-keep-smoke.md` เป็น archival record ที่รันไม่ได้; executable `.sql` เดิมถูกนำออกเพราะเขียน `auth.users` และ `public.users`. Fixture ใด ๆ ห้ามสร้าง/แก้ Auth, Role, Legacy user หรือ Legacy object และอนุญาตเพียง assertion ว่า synthetic Admin mapping มีอยู่แล้ว

Historical R2 exact keys:

- `docs/f6200000-0000-4000-8000-000000000001/f6300000-0000-4000-8000-000000000001.webp`
- `docs/f6500000-0000-4000-8000-000000000001/f6600000-0000-4000-8000-000000000001.webp`
- `docs/f6900000-0000-4000-8000-000000000001/f6b00000-0000-4000-8000-000000000001.webp`
- `docs/f6d00000-0000-4000-8000-000000000001/f6e00000-0000-4000-8000-000000000001.webp`
- `docs/f7100000-0000-4000-8000-000000000001/f7200000-0000-4000-8000-000000000001.webp`

## Historical cleanup gate — completed

ภูอนุมัติและดำเนิน cleanup ตาม gate นี้ครบเมื่อ 13 สิงหาคม 2026:

1. รัน inspection เพื่อยืนยัน current DB state และรายการ exact R2 keys เป้าหมาย
2. ลบเฉพาะ R2 exact keys ทั้ง 5 รายการข้างต้นผ่าน App/Worker path ที่อนุมัติหรือ exact-target operation ที่อนุมัติเท่านั้น
3. ตรวจว่า exact keys ทั้ง 5 รายการไม่มีอยู่แล้ว โดยแต่ละ key ต้องตอบ `404` หรือยืนยัน absence สำเร็จ
4. ตรวจว่า DB blockers เป็นศูนย์สำหรับ exact retained documents: Media, lifecycle operations และ cleanup records ต้องไม่มีเหลือ
5. รัน `cleanup-retained.sql` หลังข้อ 1–4 สำเร็จทั้งหมดเท่านั้น

ผลสุดท้ายคือ retained Section/Document/Media/operation/cleanup targets เป็นศูนย์, exact R2 keys ทั้ง 5 ตอบ 404, non-target fingerprints ไม่เปลี่ยน และไม่มี Production action. รายการขั้นตอนด้านบนเก็บไว้เป็น historical safety record ไม่ใช่คำสั่งให้รัน cleanup ซ้ำ
