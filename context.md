# Poolvilla Docs — AI Context Index

ไฟล์นี้เป็นจุดเริ่มต้นสำหรับ AI และผู้พัฒนา ห้ามใส่ Secret, Token หรือ Password

## สถานะปัจจุบัน

- Requirement baseline: [Poolvilla Docs Requirements TH v1.2](docs/Poolvilla-Docs-Requirements-TH-v1.2.md)
- Requirement review: เสร็จแล้ว
- Current work: หลักฐาน close-out เดิมของ M01–M06 ยังคงเก็บไว้; แต่ M01 อยู่ระหว่างรอ Staging verification ของ Admin navigation และ sign-out ที่ implement ใน Local แล้ว จึงห้ามปิด M01 ในรอบนี้. M06 real Staging lifecycle/cleanup ผ่านแล้ว โดย exact close-out, retained M06 และ R2 targets ถูก cleanup จนเป็นศูนย์ และ non-target fingerprints ไม่เปลี่ยน
- Deployment: Staging database remediation เดิมได้รับอนุมัติและเสร็จแล้ว; การ deploy Docs App เพื่อยืนยัน Admin navigation/sign-out ยังรอภูอนุมัติโดยตรง. ห้าม Deploy Docs Media Worker, migrate/reset/truncate/delete ข้อมูล Staging หรือแตะ Production
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

