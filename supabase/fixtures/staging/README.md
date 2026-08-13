# Staging-only SQL fixtures

ไฟล์ใต้ directory นี้อาจเขียนหรือลบ Test data บน Staging และไม่ใช่ pgTAP tests

- ตรวจ Supabase project ref ว่าเป็น `sxvkhzhqtrpxgzumsswl` ก่อนรันทุกครั้ง
- ห้ามรันกับ Production ref `rqizfiayvcbozlzuvbok`
- ห้ามใช้ `reset`, `truncate`, wildcard delete หรือแก้ Legacy/Auth data
- Fixture ต้องใช้ Test admin/mapping ที่ภูสร้างไว้แล้ว; อนุญาตเพียง assertion ว่า synthetic mapping มีอยู่ ห้ามเขียน `auth.users`, `public.users`, Role หรือ Legacy object
- Setup/cleanup ต้องใช้ deterministic UUID หรือ exact manifest
- ลบ R2 exact keys ให้สำเร็จก่อนลบ Media/Document rows
- หาก assertion หรือ deletion ใด fail ให้หยุดและเก็บ remaining targets สำหรับ Retry
