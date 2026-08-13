# Poolvilla Docs — TODO Overview

## Current status

- [x] จัดทำ Requirement ภาษาไทย
- [x] ตรวจ Requirement และยืนยันประเด็นสำคัญ
- [x] แยก Context/TODO สำหรับการทำงานแบบ Module
- [x] ภูอนุมัติให้เริ่ม M01
- [x] ยืนยัน historical Local/Staging close-out ของ M01–M06 ก่อน post-closeout safety remediation
- [ ] M06 post-closeout safety remediation: Local verified; รอภูอนุมัติ apply/verify Staging
- [ ] M07 ยังไม่เริ่มและถูก block จนกว่า M06 safety remediation จะผ่าน Staging

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
| M06 Media Lifecycle | In progress — historical Staging lifecycle verified; post-closeout safety remediation awaits Staging apply/verification | [TODO](docs/todo/M06-media-management.md) |
| M07 Search/Hardening | Not started — blocked by M06 post-closeout safety remediation | [TODO](docs/todo/M07-search-hardening.md) |

Post-closeout safety migration `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Local gate แล้วแต่ยังไม่ได้ apply/verify Staging; ต้องรอภูอนุมัติ Remote migration โดยตรง และไม่มี Production action

## Stop condition

งานปัจจุบันคือ M06 post-closeout safety remediation; ห้ามเริ่ม M07 จนกว่า migration นี้จะ apply และ verify บน Staging หลังภูอนุมัติ และห้าม Deploy หรือทำ Production action เอง

