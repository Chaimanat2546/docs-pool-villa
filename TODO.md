# Poolvilla Docs — TODO Overview

## Current status

- [x] จัดทำ Requirement ภาษาไทย
- [x] ตรวจ Requirement และยืนยันประเด็นสำคัญ
- [x] แยก Context/TODO สำหรับการทำงานแบบ Module
- [x] ภูอนุมัติให้เริ่ม M01
- [x] ยืนยัน historical Local/Staging close-out ของ M01–M06 ก่อน post-closeout safety remediation
- [x] M06 post-closeout safety remediation: apply/verify Staging สำเร็จ
- [x] Admin File Explorer cross-module follow-up: Local gate และ Staging App/Admin smoke เสร็จแล้ว ([รายละเอียด](docs/todo/admin-file-explorer.md))
- [x] Admin File Explorer: non-admin browser smoke ผ่าน; ไม่มี Migration หรือ Media Worker deploy
- [x] Admin document-management ใช้ Admin-only toast กลางบน รองรับ Success/Info/Warning/Error/Loading; local regression 18 ส.ค. ผ่าน (Admin Shell 22/22, Media 52/52, lint, build และ diff check)
- [x] Admin Toast dev smoke (18 ส.ค.): Local app เชื่อมข้อมูล Staging และภูอนุมัติให้สร้าง/คง `Toast smoke test`; Save แสดง Loading แล้วหลัง navigate เป็น Success `role=status` พร้อมปุ่มปิด, duplicate slug แสดง Error `role=alert` และปิดได้; 390×844 ไม่มี overflow และ close target 44×44
- [ ] Admin Toast Info/Warning ไม่มี caller ใน Admin ที่ตั้งใจให้ trigger ตอนนี้; provider behavior ครอบคลุมด้วย component tests โดยไม่เพิ่ม live integration path
- [x] Mobile image preparation verification (18 ส.ค.): Local `test:content` 42/42, `test:media` 56/56, `lint`, `build` และ `git diff --check` ผ่าน; Staging App version `51af8760-1b43-457c-bdd4-1b18441ea2b7` deploy แล้ว, `/` ตอบ 200 และ Guest `/admin` redirect ไป login; ภูยืนยันหลังใช้งานจริงบน iPhone Safari ว่า “ใช้ได้ปกติ”
- [x] Approved cross-module follow-up: removed the unused section description field; Local tests and Staging migration-history/DB-lint verification complete, Production migration remains pending separate approval
- [ ] M07 กำลังดำเนินการ: Search Title/H2/H3 และ command palette ผ่าน focused Local tests; browser/performance hardening ค้าง

## Module progress

| Module | สถานะ | รายละเอียด |
|---|---|---|
| M01 Foundation/Auth/RLS | Complete — Approved Staging App smoke passed for Guest/non-admin/Admin navigation and sign-out | [TODO](docs/todo/M01-foundation.md) |
| M02 Structure | Complete — verified Local/Staging work closed | [TODO](docs/todo/M02-structure.md) |
| M03 Editor/Media | Complete — verified Local/Staging work closed | [TODO](docs/todo/M03-editor-media.md) |
| Pre-M04 Remediation | Complete; M04 plan approved | [TODO](docs/todo/M01-M03-remediation.md) |
| M01–M04 Full Test Remediation | Complete — image save state fixed; legacy Middleware warning is documented as an OpenNext adapter limitation | [PLAN](docs/todo/M01-M04-full-test-remediation.md) |
| M04 Documents | Complete — verified Local/Staging work closed | [TODO](docs/todo/M04-documents.md) |
| M05 Public Docs | Complete — verified Local/Staging work closed | [TODO](docs/todo/M05-public-docs.md) |
| M06 Media Lifecycle | Complete — historical lifecycle และ post-closeout safety remediation verified on Staging | [TODO](docs/todo/M06-media-management.md) |
| M07 Search/Hardening | In progress — Search Title/H2/H3 และ command palette ผ่าน focused Local tests; browser/performance hardening ค้าง | [TODO](docs/todo/M07-search-hardening.md) |

## Approved cross-module follow-up

| งาน | สถานะ | รายละเอียด |
|---|---|---|
| Admin File Explorer | Complete — Guest/Admin/non-admin browser smoke ผ่าน | [TODO](docs/todo/admin-file-explorer.md) |
| Admin-only session termination | Complete — local verification completed; no migration, RLS, or production action occurred | — |

Post-closeout safety migration `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Local gate, dry-run และ apply/verify บน Staging แล้วเมื่อ 13 สิงหาคม 2026; migration parity ตรง, DB lint ไม่มี schema error และ advisor พบ `doc_*` = 0. ไม่มี Production action

## Stop condition

M01–M06 และ Admin File Explorer ปิดงานตามขอบเขตที่ยืนยันแล้ว; ห้ามเริ่ม M07 จนกว่าภูจะยืนยัน Module ถัดไป และห้ามทำ Production action เอง

