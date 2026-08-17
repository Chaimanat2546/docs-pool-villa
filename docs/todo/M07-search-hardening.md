# M07 — pg_trgm Search, Performance & Security Hardening

**Status:** In progress — title-only public search Local implementation complete; browser smoke and remaining hardening pending

## Scope

- [x] เปิด `pg_trgm` และสร้าง GIN trigram index เฉพาะ `doc_documents.title` Published rows (Local)
- [x] Public Search แบบ Title-only, Thai partial match, Published-only result, pagination 10 รายการ และไม่มี autocomplete (Local)
- [x] Keyboard shortcut `Ctrl+K`/`⌘K` สำหรับ Search (Local)
- [ ] ไม่สร้าง `search_text`; Excerpt/Content, typo/fuzzy search อยู่นอกขอบเขตรอบแรก
- [ ] Performance tests ตาม p75/p95 และ Capacity baseline
- [ ] Accessibility และ Browser matrix
- [ ] RLS/Security regression tests
- [ ] Production readiness checklist, Backup/Rollback plan
- [ ] อัปเดต Context/TODO

## Acceptance

- Search p95 ไม่เกิน 1 วินาทีตาม Baseline test
- Public LCP และ Server response ผ่านเป้าหมายที่กำหนด
- ไม่มี Search/Index change บน Legacy tables
- Security, Accessibility และ Browser checks ผ่านก่อนเสนอ Deploy

## Stop

สรุปผล MVP ทั้งหมดและรอภูสั่งขั้นตอน Deployment แยก
