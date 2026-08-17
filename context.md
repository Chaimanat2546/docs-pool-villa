# Poolvilla Docs — AI Context Index

ไฟล์นี้เป็นจุดเริ่มต้นสำหรับ AI และผู้พัฒนา ห้ามใส่ Secret, Token หรือ Password

## สถานะปัจจุบัน

- Requirement baseline: [Poolvilla Docs Requirements TH v1.2](docs/Poolvilla-Docs-Requirements-TH-v1.2.md)
- Requirement review: เสร็จแล้ว
- Current work: M01–M06 ปิดงานแล้ว; [Admin File Explorer](docs/todo/admin-file-explorer.md) เป็น approved cross-module UX follow-up ที่ผ่าน Local gate และ Staging App/Admin smoke แล้ว. M07 อยู่ระหว่างดำเนินการ: public title/H2/H3 search และ command palette ผ่าน focused Local tests แล้ว; browser/performance hardening ยังเหลือ
- Deployment: Staging Docs App version `a222ad20-d7f7-41e6-b158-ff3945fd9092` มี Admin File Explorer แล้ว; deploy เฉพาะ App ด้วย `--keep-vars`. Migration `20260814085611_remove_doc_section_description.sql` ถูก apply/verify บน Staging แล้ว; ไม่มี Docs Media Worker หรือ Production action. Guest/Admin/non-admin browser smoke ก่อน migration ผ่านแล้ว
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

