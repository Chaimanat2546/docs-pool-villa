# Poolvilla Docs — AI Context Index

ไฟล์นี้เป็นจุดเริ่มต้นสำหรับ AI และผู้พัฒนา ห้ามใส่ Secret, Token หรือ Password

## สถานะปัจจุบัน

- Requirement baseline: [Poolvilla Docs Requirements TH v1.2](docs/Poolvilla-Docs-Requirements-TH-v1.2.md)
- Requirement review: เสร็จแล้ว
- Current work: M01–M06 ปิดงานแล้ว โดย historical Local/Staging close-out, M01 Admin smoke, M06 real lifecycle/cleanup และ post-closeout safety migration `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Staging ครบ. M07 ยังไม่เริ่มและต้องรอภูยืนยัน
- Deployment: Docs App Staging `docs-pool-villa-staging` deploy version `2ce99e46-0fbd-4663-a9ab-f9c1fb94b765` สำเร็จด้วย `--keep-vars`; migration `20260813150200` apply Staging สำเร็จโดยไม่มี reset/truncate/delete ข้อมูล. ไม่มี Docs Media Worker หรือ Production action ในรอบนี้
- Domain Production `docs.poolvilla.co.th`: ยืนยันชื่อแล้ว แต่ยังไม่ตั้งค่าหรือใช้งานจริง

## Context ตามหัวข้อ

- [System overview](docs/context/system-overview.md)
- [Architecture and environments](docs/context/architecture.md)
- [Database boundaries](docs/context/database.md)
- [Authentication and RLS](docs/context/auth-and-rls.md)
- [Media storage and lifecycle](docs/context/media-storage.md)
- [Routes and slugs](docs/context/routes-and-slugs.md)
- [Confirmed decisions](docs/context/requirements-decisions.md)
- [Testing and commands](docs/context/testing-and-commands.md)

## Working rules

1. อ่านไฟล์ Context ที่เกี่ยวข้องก่อนเปลี่ยน Code
2. ทำทีละ Module ตาม [TODO.md](TODO.md)
3. อัปเดต TODO หลังเสร็จแต่ละงานย่อย
4. อัปเดต Context เมื่อ Architecture, Schema boundary หรือ Requirement เปลี่ยน
5. ห้ามแก้ระบบ Supabase/Cloudflare เก่านอกขอบเขต Docs
6. หลังจบ Module ให้หยุด สรุป และรอภูอนุมัติ Module ถัดไป

