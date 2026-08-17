# M07 — pg_trgm Search, Performance & Security Hardening

**Status:** In progress — public title/H2/H3 search และ command palette Local implementation complete; browser smoke and remaining hardening pending

## Scope

- [x] เปิด `pg_trgm` และสร้าง GIN trigram index เฉพาะ `doc_documents.title` Published rows (Local)
- [x] Public Search แบบ Title/H2/H3, Thai partial match, Published-only result, pagination 10 รายการ และไม่มี autocomplete (Local); heading result ลิงก์ตรงไปยัง anchor
- [x] Keyboard shortcut `Ctrl+K`/`⌘K` สำหรับ Search (Local)
- [x] Command palette แบบ Next.js Docs: เปิดจาก header หรือ `Ctrl+K`/`⌘K`, focus ช่องค้นหาทันที, แสดง 10 ผลลัพธ์แรกแบบ live (debounce 150ms), เลือกด้วย Arrow/Enter และปิดด้วย Esc (Local)
- [x] แสดงสถานะกำลังค้นหา, ไม่พบผลลัพธ์ และข้อผิดพลาดที่ผู้ใช้แก้ไขได้ใน command palette (Local)
- [x] Apply/verify title-search migration บน Staging โดยไม่มี seed/role change
- [x] ไม่สร้าง `search_text`; ใช้ runtime H2/H3 extraction เท่านั้น และยังไม่ค้น Excerpt/paragraph/content, typo/fuzzy search
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
