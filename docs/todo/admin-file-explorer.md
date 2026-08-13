# Admin File Explorer — Cross-module UX follow-up

**สถานะ:** Approved; Local implementation และ automated verification เสร็จแล้ว, รออนุมัติแยกสำหรับ Staging App deploy/smoke

งานนี้เป็น UX follow-up ที่ภูอนุมัติให้ปรับประสบการณ์ Admin ต่อจาก M01–M06 ไม่ใช่ M07 และไม่เปิด Module ที่ปิดแล้วอีกครั้ง

เอกสารอ้างอิง:

- [Approved design](../superpowers/specs/2026-08-14-admin-file-explorer-design.md)
- [Implementation plan](../superpowers/plans/2026-08-14-admin-file-explorer.md)
- [Requirement baseline](../Poolvilla-Docs-Requirements-TH-v1.2.md)

## ทิศทางที่เลือก

- เลือก **A — two-pane Folder Tree + Folder Contents**: หมวดอยู่ด้านซ้าย เนื้อหา/ขั้นตอนสร้างและแก้เอกสารอยู่ด้านขวา ทำให้เลือกหมวดแล้วสร้างเอกสารในบริบทเดิมได้ทันที
- ไม่เลือก B — three-pane เพราะพื้นที่หนาแน่นเกินไปสำหรับข้อความภาษาไทย, Tablet และ Mobile
- ไม่เลือก C — documents nested in tree เพราะ Tree จะยาวและมีสัญญาณรบกวนเมื่อจำนวนเอกสารเพิ่มขึ้น

## Implementation checklist

- [x] Task 1 — Explorer view model และ authenticated server loader
- [x] Task 2 — `(content)` route group, shared Explorer shell และ accessible folder tree
- [x] Task 3 — Navigation รายการเดียว **จัดการเนื้อหา** และ unsaved-navigation guard
- [x] Task 4 — สร้าง/แก้/ลบหมวดในบริบท พร้อมข้อจำกัดสองระดับเดิม
- [x] Task 5 — รายการเอกสารตามหมวด, virtual root, search/status filter และ canonical redirect
- [x] Task 6 — สร้าง Draft จากหมวดที่เลือกแบบ explicit
- [x] Task 7 — Editor แบบเป็นขั้น Content → Review พร้อมกลับหมวดเดิมและ dirty-state guard
- [x] Task 8 — Loading/error state, responsive behavior และ integrated UI tests
- [x] Task 9 — เอกสาร, Full Local gate, scope/security scan และ Browser smoke เท่าที่ Local configuration รองรับ

## Full Local verification — 14 สิงหาคม 2026

รันตามลำดับที่กำหนดและได้ Exit code 0 ทุกคำสั่งใน Gate:

| คำสั่ง | ผลจริง |
|---|---|
| `npm run test:admin-shell` | 1 file, 17/17 tests |
| `npm run test:content` | 2 files, 12/12 tests |
| `npm run test:public` | 3 files, 7/7 tests |
| `npm run test:proxy` | 1 file, 2/2 tests |
| `npm run test:media` | 9 files, 33/33 tests |
| `npm run test:worker` | 1 file, 9/9 tests |
| `npm run test:db` | 5 files, 177/177 pgTAP tests |
| `npx tsc --noEmit` | ผ่าน |
| `npm run typecheck:worker` | ผ่านและ generate `src/env.d.ts` ตรงกับไฟล์เดิม |
| `npm run lint` | ผ่าน ไม่มี error/warning ใหม่ |
| `npm run build` | ผ่าน; route manifest มี `/admin/structure`, `/admin/documents`, `/admin/documents/new`, `/admin/documents/[id]` โดยไม่มี `(content)` ใน URL |
| `npm run cf:build` | ผ่าน |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | ผ่าน |

เพิ่ม regression sweep ด้วย `npx vitest --config vitest.config.mts run src` ผ่าน 30 files, 142/142 tests เพื่อรวม Explorer tests ของ Tasks 1–8 ที่ไม่ได้อยู่ใน script รายกลุ่มทั้งหมด ส่วน `npx vitest --config vitest.config.mts run` แบบไม่จำกัด path ถูกใช้เป็น diagnostic แล้วหยุดที่ Worker test เพราะ App Vitest config resolve `cloudflare:workers` ไม่ได้; Worker suite ที่ถูกต้องผ่านแยกด้วย `npm run test:worker` 9/9 ตาม Gate ด้านบน

Build ใน worktree โหลดค่า Local development ที่มีอยู่แล้วจาก repository `.env.local` เข้า child process ผ่าน `@next/env` โดยไม่ copy/แก้ไฟล์หรือแสดงค่า Secret. Warning ที่เหลือมีเฉพาะ Next.js `middleware` deprecation และ OpenNext Windows compatibility ซึ่งเป็น baseline ที่บันทึกไว้แล้ว

## Local browser smoke — 14 สิงหาคม 2026

- Guest เปิด `http://localhost:3000/admin` แล้วถูกส่งไป `/auth/login` และไม่เห็น Admin shell
- Login surface ที่ Desktop 1280px, Tablet 768px และ Mobile 390px ไม่มี horizontal overflow; Browser console ไม่มี error/warning
- ตรวจ Local DB แบบ read-only พบ Admin mapping = 0 และ non-admin mapping = 0 ขณะที่ Local Supabase API/Auth services ไม่ได้เปิด จึงไม่มี Local session ที่ใช้ยืนยัน authenticated flow
- ตรวจ Staging tab เดิมแบบ read-only พบว่ายังเป็น deployment ก่อน File Explorer (ยังมีเมนู **โครงสร้าง** และ **เอกสาร** แยกกัน) จึงไม่ใช้ผลนั้นอ้างว่า Feature ใหม่นี้ผ่าน Browser
- ไม่สร้าง/แก้ `auth.users`, `public.users` หรือข้อมูล Staging เพื่อฝืนสร้าง session และไม่ create/delete เอกสารหรือหมวดบน Remote
- ดังนั้น Browser smoke รอบ Local นี้ยัง **ไม่ยืนยัน** non-admin redirect, Admin Explorer, virtual/root/child selection, fixture create/save/review/delete, dirty dialog/focus containment/Escape/focus return และ responsive Admin workspace; พฤติกรรมเหล่านี้มี automated coverage ใน App sweep 142/142 แต่ยังต้องยืนยันบน Staging หลัง deploy
- ไม่มี file chooser/upload ในรอบนี้ และไม่ได้ลดเกณฑ์ Media acceptance; `npm run test:media` 33/33 และ `npm run test:worker` 9/9 ยังเป็นหลักฐานบังคับ

## ขอบเขตและขั้นถัดไป

- ไม่มี Schema, Migration, RLS, Auth, Legacy table, Docs Media Worker, R2 protocol หรือ Production change ใน follow-up นี้
- การสร้าง/แก้/ลบหมวดและเอกสารยังผ่าน Admin Server Actions, RLS และ lifecycle functions เดิม
- M01–M06 ยังคง Complete; M07 ยังคง Not started จนกว่าภูจะอนุมัติแยก
- [ ] **Pending approval:** Deploy เฉพาะ Docs App ไป Staging แล้วทำ Guest/non-admin/Admin Browser smoke ของ File Explorer; ไม่ต้องมี Database migration หรือ Docs Media Worker deploy สำหรับ Feature นี้
