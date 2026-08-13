# Poolvilla Docs — TODO Overview

## Current status

- [x] จัดทำ Requirement ภาษาไทย
- [x] ตรวจ Requirement และยืนยันประเด็นสำคัญ
- [x] แยก Context/TODO สำหรับการทำงานแบบ Module
- [x] ภูอนุมัติให้เริ่ม M01
- [x] ปิด M01–M06 จากหลักฐาน Local/Staging ที่ตรวจแล้ว
- [ ] M07 ยังไม่เริ่มและต้องรอภูยืนยันก่อนเริ่ม

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
| M06 Media Lifecycle | Complete — real Staging lifecycle and exact-target cleanup verified | [TODO](docs/todo/M06-media-management.md) |
| M07 Search/Hardening | Not started | [TODO](docs/todo/M07-search-hardening.md) |

Post-closeout safety migration `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Local gate แล้วแต่ยังไม่ได้ apply Staging; ต้องรอภูอนุมัติ Remote migration โดยตรง และไม่มี Production action

## Stop condition

M01–M06 ปิดแล้ว; Module ถัดไปคือ M07 ซึ่งยังไม่เริ่ม ต้องรอภูยืนยันก่อนเริ่ม และห้าม Deploy หรือทำ Production action เอง

