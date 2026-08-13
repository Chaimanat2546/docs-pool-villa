# Poolvilla Docs — TODO Overview

## Current status

- [x] จัดทำ Requirement ภาษาไทย
- [x] ตรวจ Requirement และยืนยันประเด็นสำคัญ
- [x] แยก Context/TODO สำหรับการทำงานแบบ Module
- [x] ภูอนุมัติให้เริ่ม M01
- [x] ยืนยัน historical Local/Staging close-out ของ M01–M06 ก่อน post-closeout safety remediation
- [x] M06 post-closeout safety remediation: apply/verify Staging สำเร็จ
- [ ] M07 ยังไม่เริ่ม; รอภูยืนยันให้เริ่ม Module ถัดไป

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
| M07 Search/Hardening | Not started — รอภูยืนยันให้เริ่ม Module | [TODO](docs/todo/M07-search-hardening.md) |

Post-closeout safety migration `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Local gate, dry-run และ apply/verify บน Staging แล้วเมื่อ 13 สิงหาคม 2026; migration parity ตรง, DB lint ไม่มี schema error และ advisor พบ `doc_*` = 0. ไม่มี Production action

## Stop condition

M01–M06 ปิดงานแล้ว; ห้ามเริ่ม M07 จนกว่าภูจะยืนยัน Module ถัดไป และห้าม Deploy หรือทำ Production action เอง

