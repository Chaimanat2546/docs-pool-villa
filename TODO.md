# Poolvilla Docs — TODO Overview

## Current status

- [x] จัดทำ Requirement ภาษาไทย
- [x] ตรวจ Requirement และยืนยันประเด็นสำคัญ
- [x] แยก Context/TODO สำหรับการทำงานแบบ Module
- [x] ภูอนุมัติให้เริ่ม M01

## Module progress

| Module | สถานะ | รายละเอียด |
|---|---|---|
| M01 Foundation/Auth/RLS | Complete — Approved Staging App smoke passed for Guest/non-admin/Admin navigation and sign-out; wait for ภู before starting M02 | [TODO](docs/todo/M01-foundation.md) |
| M02 Structure | Ready to close — final M01–M06 gate passed | [TODO](docs/todo/M02-structure.md) |
| M03 Editor/Media | Ready to close — final M01–M06 gate passed | [TODO](docs/todo/M03-editor-media.md) |
| Pre-M04 Remediation | Complete; M04 plan approved | [TODO](docs/todo/M01-M03-remediation.md) |
| M01–M04 Full Test Remediation | Complete — image save state fixed; legacy Middleware warning is documented as an OpenNext adapter limitation | [PLAN](docs/todo/M01-M04-full-test-remediation.md) |
| M04 Documents | Ready to close — final M01–M06 gate passed | [TODO](docs/todo/M04-documents.md) |
| M05 Public Docs | Ready to close — final M01–M06 gate passed | [TODO](docs/todo/M05-public-docs.md) |
| M06 Media Lifecycle | Ready to close — real Staging lifecycle and exact-target cleanup passed | [TODO](docs/todo/M06-media-management.md) |
| M07 Search/Hardening | Not started | [TODO](docs/todo/M07-search-hardening.md) |

## Stop condition

เมื่อจบแต่ละ Module ต้องอัปเดตเอกสาร สรุปผล/ไฟล์/Tests/ประเด็นค้าง แล้วหยุดรอภูยืนยัน ห้ามเริ่ม Module ถัดไปหรือ Deploy เอง

