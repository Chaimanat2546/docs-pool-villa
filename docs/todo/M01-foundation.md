# M01 — Foundation, Supabase Auth & Docs-only RLS

**Status:** Not started — รอภูอนุมัติ

## Scope

- [ ] ตรวจ Project structure และ Environment variables โดยไม่เปิดเผย Secret
- [ ] ยืนยัน Staging/Production configuration boundary
- [ ] ออกแบบ Docs schema baseline และ Migration workflow
- [ ] เชื่อม Supabase Auth ฝั่ง Server
- [ ] สร้าง Admin route guard ด้วย `EXISTS(uid = auth.uid() AND role_id = 1)`
- [ ] สร้าง Docs-only RLS โดยไม่แก้ Legacy objects
- [ ] เพิ่ม Tests สำหรับ Guest, non-admin และ Admin
- [ ] อัปเดต Context/Commands หลังทดสอบจริง

## Acceptance

- ผู้ไม่มีสิทธิ์เข้า Admin/เขียนข้อมูล Docs ไม่ได้
- `role_id = 1` เข้า Admin ได้ แม้ UID มีหลายแถว
- Diff/Migration ไม่มีการแก้ `public.users`, `public.roles` หรือ RLS เดิม
- Local build/test ผ่าน

## Stop

สรุปผล ไฟล์ Tests และประเด็นค้าง แล้วรอภูยืนยัน M02

