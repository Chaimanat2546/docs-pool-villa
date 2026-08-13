# Staging-only SQL fixtures

ไฟล์ใต้ directory นี้อาจเขียนหรือลบ Test data บน Staging และไม่ใช่ pgTAP tests

- ตรวจ Supabase project ref ว่าเป็น `sxvkhzhqtrpxgzumsswl` ก่อนรันทุกครั้ง
- ห้ามรันกับ Production ref `rqizfiayvcbozlzuvbok`
- ห้ามใช้ `reset`, `truncate`, wildcard delete หรือแก้ Legacy/Auth data
- Setup/cleanup ต้องใช้ deterministic UUID หรือ exact manifest
- ลบ R2 exact keys ให้สำเร็จก่อนลบ Media/Document rows
- หาก assertion หรือ deletion ใด fail ให้หยุดและเก็บ remaining targets สำหรับ Retry
