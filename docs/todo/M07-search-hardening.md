# M07 — pg_trgm Search, Performance & Security Hardening

**Status:** In progress — public title/H2/H3 search และ command palette Local implementation complete; browser smoke and remaining hardening pending

## Scope

- [x] เปิด `pg_trgm` และสร้าง GIN trigram index เฉพาะ `doc_documents.title` Published rows (Local)
- [x] Public Search แบบ Title/H2/H3, Thai partial match, Published-only result, pagination 10 รายการ และไม่มี autocomplete (Local); heading result ลิงก์ตรงไปยัง anchor
- [x] Keyboard shortcut `Ctrl+K`/`⌘K` สำหรับ Search (Local)
- [x] Command palette แบบ Next.js Docs: เปิดจาก header หรือ `Ctrl+K`/`⌘K`, focus ช่องค้นหาทันที, แสดง 10 ผลลัพธ์แรกแบบ live (debounce 150ms), เลือกด้วย Arrow/Enter และปิดด้วย Esc (Local)
- [x] แสดงสถานะกำลังค้นหา, ไม่พบผลลัพธ์ และข้อผิดพลาดที่ผู้ใช้แก้ไขได้ใน command palette (Local)
- [x] จัดกลุ่มหัวข้อที่ค้นพบใต้เอกสารเดียวกันใน command palette พร้อมไอคอนเอกสาร/หัวข้อ และเลือกได้ด้วย Arrow/Enter ตามลำดับที่แสดง (Local)
- [x] แสดงคำเกริ่นของเอกสารใน command palette เพียง 1 บรรทัดพร้อม ellipsis; แถวหัวข้อไม่แสดงคำเกริ่น (Local)
- [x] ลบหน้าและลิงก์ `/search` แบบเดิม; การเข้าถึง `/search` ตอบ 404 และ command palette/API search ยังคงใช้งาน (Local)
- [x] ใช้ command palette เดียวกันเป็น search trigger ขนาดใหญ่บนหน้าแรก แทน form ที่เคยส่งไป `/search` (Local)
- [x] ปิด command palette เมื่อคลิกผลการค้นหา แม้ผลลัพธ์จะอยู่หน้าเดิมหรือใช้ anchor เดิม (Local)
- [x] ทำ Tiptap formatting toolbar ให้ติดตาม viewport ระหว่างเลื่อนเนื้อหา (Local)
- [x] จำกัดความกว้าง Tiptap YouTube embed ให้ responsive บน mobile และรักษาสัดส่วน 16:9 (Local)
- [x] เมื่อเปลี่ยนหน้ารายการเอกสารใน Admin ให้เลื่อนไปที่ด้านบนของส่วนรายการเอกสาร พร้อม regression test (Local)
- [x] ปรับ action bar บน mobile ให้ชิดขอบล่าง viewport (`bottom-0`) และคงระยะห่างบนจอใหญ่ (Local)
- [x] Apply/verify title-search migration บน Staging โดยไม่มี seed/role change
- [x] ไม่สร้าง `search_text`; ใช้ runtime H2/H3 extraction เท่านั้น และยังไม่ค้น Excerpt/paragraph/content, typo/fuzzy search
- [x] Admin-only toast local regression (18 สิงหาคม 2026): `npm run test:admin-shell` 22/22, `npm run test:media` 52/52, `npm run lint`, `npm run build` และ `git diff --check` exit 0; build ยังแสดง Next `middleware` convention deprecation เดิมเท่านั้น
- [ ] Admin Toast browser validation: Local `/admin` redirect ไป `/auth/login` จึงไม่สามารถ trigger Success/Info/Warning/Error/Loading, ตรวจ focus ปุ่มปิด หรือยืนยัน loading update in place ได้โดยไม่ใช้ Admin session; ที่ 390px และ 1280px หน้า Login ไม่มี horizontal overflow (scrollWidth เท่ากับ clientWidth)
- [ ] Performance tests ตาม p75/p95 และ Capacity baseline
- [ ] Accessibility และ Browser matrix
- [ ] RLS/Security regression tests
- [ ] Production readiness checklist, Backup/Rollback plan
- [x] อัปเดต Context/TODO สำหรับ heading search

## Acceptance

- Search p95 ไม่เกิน 1 วินาทีตาม Baseline test
- Public LCP และ Server response ผ่านเป้าหมายที่กำหนด
- ไม่มี Search/Index change บน Legacy tables
- Security, Accessibility และ Browser checks ผ่านก่อนเสนอ Deploy

## Stop

สรุปผล MVP ทั้งหมดและรอภูสั่งขั้นตอน Deployment แยก
