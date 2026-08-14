# Admin File Explorer — Cross-module UX follow-up

**สถานะ:** Complete — Local gate, Staging App deploy และ Admin browser smoke เสร็จแล้ว

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
| `npm run test:admin-shell` | 1 file, 19/19 tests |
| `npm run test:content` | 2 files, 12/12 tests |
| `npm run test:public` | 3 files, 7/7 tests |
| `npm run test:proxy` | 1 file, 2/2 tests |
| `npm run test:media` | 9 files, 35/35 tests |
| `npm run test:worker` | 1 file, 9/9 tests |
| `npm run test:db` | 5 files, 177/177 pgTAP tests |
| `npx tsc --noEmit` | ผ่าน |
| `npm run typecheck:worker` | ผ่านและ generate `src/env.d.ts` ตรงกับไฟล์เดิม |
| `npm run lint` | ผ่าน ไม่มี error/warning ใหม่ |
| `npm run build` | ผ่าน; route manifest มี `/admin/structure`, `/admin/documents`, `/admin/documents/new`, `/admin/documents/[id]` โดยไม่มี `(content)` ใน URL |
| `npm run cf:build` | ผ่าน |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | ผ่าน |

เพิ่ม regression sweep ด้วย `npx vitest --config vitest.config.mts run src` ผ่าน 30 files, 156/156 tests เพื่อรวม Explorer tests ของ Tasks 1–8 และ final review remediations ที่ไม่ได้อยู่ใน script รายกลุ่มทั้งหมด ส่วน `npx vitest --config vitest.config.mts run` แบบไม่จำกัด path ถูกใช้เป็น diagnostic แล้วหยุดที่ Worker test เพราะ App Vitest config resolve `cloudflare:workers` ไม่ได้; Worker suite ที่ถูกต้องผ่านแยกด้วย `npm run test:worker` 9/9 ตาม Gate ด้านบน

Build ใน worktree โหลดค่า Local development ที่มีอยู่แล้วจาก repository `.env.local` เข้า child process ผ่าน `@next/env` โดยไม่ copy/แก้ไฟล์หรือแสดงค่า Secret. Warning ที่เหลือมีเฉพาะ Next.js `middleware` deprecation และ OpenNext Windows compatibility ซึ่งเป็น baseline ที่บันทึกไว้แล้ว

## Local browser smoke — 14 สิงหาคม 2026

- Guest เปิด `http://localhost:3000/admin` แล้วถูกส่งไป `/auth/login` และไม่เห็น Admin shell
- Login surface ที่ Desktop 1280px, Tablet 768px และ Mobile 390px ไม่มี horizontal overflow; Browser console ไม่มี error/warning
- ตรวจ Local DB แบบ read-only พบ Admin mapping = 0 และ non-admin mapping = 0 ขณะที่ Local Supabase API/Auth services ไม่ได้เปิด จึงไม่มี Local session ที่ใช้ยืนยัน authenticated flow
- ตรวจ Staging tab เดิมแบบ read-only พบว่ายังเป็น deployment ก่อน File Explorer (ยังมีเมนู **โครงสร้าง** และ **เอกสาร** แยกกัน) จึงไม่ใช้ผลนั้นอ้างว่า Feature ใหม่นี้ผ่าน Browser
- ไม่สร้าง/แก้ `auth.users`, `public.users` หรือข้อมูล Staging เพื่อฝืนสร้าง session และไม่ create/delete เอกสารหรือหมวดบน Remote
- ดังนั้น Browser smoke รอบ Local นี้ยัง **ไม่ยืนยัน** non-admin redirect, Admin Explorer, virtual/root/child selection, fixture create/save/review/delete, dirty dialog/focus containment/Escape/focus return และ responsive Admin workspace; พฤติกรรมเหล่านี้มี automated coverage ใน App sweep 155/155 แต่ยังต้องยืนยันบน Staging หลัง deploy
- ไม่มี file chooser/upload ในรอบนี้ และไม่ได้ลดเกณฑ์ Media acceptance; `npm run test:media` 35/35 และ `npm run test:worker` 9/9 ยังเป็นหลักฐานบังคับ

## Staging App deploy and smoke — 14 สิงหาคม 2026

- Deploy เฉพาะ Docs App `docs-pool-villa-staging` ด้วย `wrangler deploy --keep-vars`; version `a222ad20-d7f7-41e6-b158-ff3945fd9092` รับ traffic โดยไม่ deploy Docs Media Worker, Migration, R2 cleanup, Auth หรือ Production
- Guest `/admin` redirect ไป `/auth/login`; Admin session เห็นเมนู **จัดการเนื้อหา** และ Explorer โดย console ไม่มี error/warning
- สร้าง fixture ชั่วคราว root → child → Draft จาก child, บันทึก Content → Review → กลับ folder เดิม แล้ว hard-delete Draft และลบ child/root ผ่าน typed confirmation จนเหลือเฉพาะข้อมูล Staging เดิม
- Child action แสดงคำอธิบายจำกัดสองระดับ; viewport 390px ไม่มี horizontal overflow, Drawer เปิดแล้ว focus ไปปุ่มปิด และ Escape คืน focus ไป **เลือกหมวด** โดย console ไม่มี error/warning
- Non-admin session ที่ภูล็อกอินแล้วถูกทดสอบหลัง deploy: `/admin`, `/admin/structure` และ `/admin/documents` ถูกส่งกลับ Public homepage `/` ทั้งหมด และไม่พบข้อความหรือปุ่ม Admin Explorer ใน DOM; ไม่มีการแก้ไขข้อมูลหรือ inspect cookie/storage

## ขอบเขตและสถานะ

- Follow-up UX เมื่อ 14 สิงหาคม 2026: นำ **Editor Sandbox** ออกจาก Sidebar เพื่อให้ **จัดการเนื้อหา** เป็นทางเข้างาน Admin เพียงจุดเดียว; route `/admin/editor` ยังอยู่และไม่อยู่ในขอบเขตการลบครั้งนี้
- ไม่มี Schema, Migration, RLS, Auth, Legacy table, Docs Media Worker, R2 protocol หรือ Production change ใน follow-up นี้
- การสร้าง/แก้/ลบหมวดและเอกสารยังผ่าน Admin Server Actions, RLS และ lifecycle functions เดิม
- Unsaved guard ใช้ dialog ของระบบกับลิงก์/การกระทำ/Logout ภายใน Admin และใช้ `beforeunload` สำหรับ refresh, ปิดแท็บ หรือออกจาก document. Browser Back/Forward แบบ same-document จะถูกหน่วงก่อน commit เฉพาะเมื่อ Browser เปิดเผย `NavigationPrecommitController` และ Navigation API ระบุว่า traversal นั้น `canIntercept` และ `cancelable`; Browser ที่ไม่มี precommit support (รวม implementation รุ่นเก่าที่มี `navigation.intercept` เพียงบางส่วน) จะไม่ติดตั้ง traversal handler และใช้พฤติกรรม native โดยไม่ทำ history-bounce หรืออ้างว่ายกเลิก traversal ได้ ส่วน guarded links/actions/Logout และ `beforeunload` ยังทำงานตามเดิม
- M01–M06 ยังคง Complete; M07 ยังคง Not started จนกว่าภูจะอนุมัติแยก
- [x] Deploy เฉพาะ Docs App และทำ Guest/Admin Staging smoke แล้ว; ไม่มี Database migration หรือ Docs Media Worker deploy สำหรับ Feature นี้
- [x] Non-admin Browser smoke ของ File Explorer: session ที่มีอยู่ถูกส่งจาก `/admin`, `/admin/structure` และ `/admin/documents` กลับ Public homepage โดยไม่เห็น Admin Explorer
- [x] UX follow-up (14 สิงหาคม 2026): รายการเอกสารใน Explorer แบ่งหน้า 5 รายการหลังกรองจากหมวด/คำค้น/สถานะ, ปุ่มก่อนหน้า/ถัดไปจะปรากฏเมื่อเกิน 5 รายการ และการกรองจะกลับหน้าแรก; regression test, TypeScript, lint และ build ผ่านใน Local

## Follow-up: contextual section creation — 14 สิงหาคม 2026

- Sidebar มีคำสั่ง **สร้าง Topic** และ **สร้าง Sub-topic** ตามระดับที่อนุญาต; แบบฟอร์มเลือก parent ที่ตั้งใจจากบริบทที่ผู้ใช้กด และหมวดใหม่ตั้งค่า `sort_order` เป็นลำดับถัดไปของ sibling เดียวกันโดยอัตโนมัติ
- หลักฐาน Local จริง: focused Explorer regression ผ่าน 3 files, 27/27 tests; `npm run test:admin-shell` ผ่าน 22/22; `npm run test:content` ผ่าน 30/30; `npx tsc --noEmit`, `npm run lint`, `npm run build` และ `git diff --check` ออก 0
- `npm run build` ยังแสดง warning baseline ของ Next.js ว่า convention `middleware` deprecated; ไม่ใช่ผลเปลี่ยน pass/fail จาก follow-up นี้
- ไม่เกิดการเปลี่ยน Schema, Migration, RLS, Worker, Remote หรือ Deployment
- Manual accessibility check แบบ authenticated Admin บน Local ยังทำไม่ได้: เปิด `http://localhost:3000/admin` แล้ว redirect ไป `/auth/login` และไม่มี Admin session ที่ใช้ได้ จึงไม่สร้างหรือแก้ไข remote fixture; Desktop/390px action visibility, form focus, child restriction, overflow และ console ของ authenticated Explorer ยังต้องตรวจเมื่อมี local Admin session
