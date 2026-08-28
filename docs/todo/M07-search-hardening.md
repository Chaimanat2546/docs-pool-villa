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
- [x] Admin Toast authorized dev smoke (18 สิงหาคม 2026): Local app เชื่อม Remote Staging data และภูอนุมัติให้สร้าง/คง `Toast smoke test` (ไม่มีการลบ); Save แสดง Loading แล้วหลัง route navigation เป็น Success `role=status` ข้อความ `บันทึกหมวดสำเร็จ` พร้อม close button—พบและแก้ provider remount bug ใน `31745b1`; duplicate slug `toast-smoke-test` แสดง Error `role=alert` ข้อความ `Slug หรือ Route นี้ถูกใช้งานแล้ว` และคลิก close ได้
- [x] Admin Toast responsive/keyboard evidence: viewport 390×844 มี document clientWidth/scrollWidth = 375 จึงไม่มี horizontal overflow และ close target 44×44; keyboard close ยืนยันด้วย focused component test ใน `0b588c3` (browser locator keypress ให้ผลไม่ชัดเจน)
- [ ] Admin Toast Info/Warning ยังไม่มี caller ที่ตั้งใจให้ trigger ใน Admin; provider behavior ครอบคลุมด้วย component tests แต่ไม่ได้เพิ่ม live integration path
- [x] Mobile image preparation validation (18 สิงหาคม 2026): Local `npm run test:content` 43/43, `npm run test:media` 59/59, `npm run lint`, `npm run build` และ `git diff --check` exit 0; dependency audit ฝั่ง production `npm audit --omit=dev` พบ 0 vulnerabilities; Staging App version `51af8760-1b43-457c-bdd4-1b18441ea2b7` deploy แล้ว, `/` ตอบ 200 และ Guest `/admin` redirect ไป login; ภูยืนยันผลการใช้งานจริงบน iPhone Safari ว่า “ใช้ได้ปกติ” โดยไม่มีรายละเอียดรายรูปแบบไฟล์เพิ่มเติม
- [ ] Performance tests ตาม p75/p95 และ Capacity baseline
- [ ] Accessibility และ Browser matrix
- [ ] RLS/Security regression tests
- [ ] Production readiness checklist, Backup/Rollback plan
- [x] อัปเดต Context/TODO สำหรับ heading search

## Production-readiness รอบ 26 สิงหาคม 2026

- [x] แก้ Staging-only regression: `/api/search` ที่คืนผลว่างเคยเกิด Cloudflare Worker 1101 (`Cannot perform I/O on behalf of a different request`); เพิ่ม regression test ให้ success response มี `Cache-Control: no-store` และ deploy เฉพาะ Docs App Staging version `a6a54c82-0bb6-4039-86c1-b28d5dbce8e9` ด้วย `--keep-vars` (ไม่ deploy Media Worker/Migration/Production)
- [x] Staging smoke หลัง deploy: `/api/search?q=zzzzzz` 200 ขนาด 12 bytes, `/api/search?q=test1` 200, Guest `/admin` 307 ไป `/auth/login`, `/` 200; search p95 266.33 ms และ published Reader `/test1/introduction` p95 296.48 ms จาก 30 request serial ต่อ endpoint
- [x] In-app browser Staging: trigger/focus, Ctrl+K, empty state, Arrow selection, Escape focus restore และ 390×844 ไม่มี horizontal overflow (document client/scroll width = 375) ผ่าน
- [x] Production Supabase read-only audit: history ตรง baseline ถึง `20260806173000`; dry-run ของ `rqizfiayvcbozlzuvbok` แสดง Docs migration 13 ไฟล์เท่านั้นและไม่มี seed/roles
- [x] Local pgTAP/RLS gate: หลัง Docker Desktop พร้อม พบ Local schema ค้างที่ `20260813150200`; apply เฉพาะ 4 migrations ที่ขาด (`20260814085611` ถึง `20260818085232`) โดยไม่ reset แล้ว `npm run test:db` ผ่าน 194/194
- [ ] ยังไม่ได้วัด Mobile LCP p75, load/capacity 500 Public/10 Admin, และ Safari macOS/iOS/Chrome Android matrix
- [ ] ยังต้องยืนยัน Production backup ล่าสุด, ชื่อ App/Media Worker, R2 bucket, allowed origin และ secret-name inventory ก่อนเสนอ Production gate

## Acceptance

- Search p95 ไม่เกิน 1 วินาทีตาม Baseline test
- Public LCP และ Server response ผ่านเป้าหมายที่กำหนด
- ไม่มี Search/Index change บน Legacy tables
- Security, Accessibility และ Browser checks ผ่านก่อนเสนอ Deploy

## Stop

สรุปผล MVP ทั้งหมดและรอภูสั่งขั้นตอน Deployment แยก
