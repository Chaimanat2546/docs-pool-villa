# M07 — pg_trgm Search, Performance & Security Hardening

**Status:** Not started

## Scope

- [ ] เปิด `pg_trgm` ใน Environment Docs
- [ ] สร้าง `search_text` จาก Title/Excerpt/Tiptap plain text
- [ ] GIN trigram index เฉพาะ Docs
- [ ] Thai partial/typo search และ Published-only result
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

