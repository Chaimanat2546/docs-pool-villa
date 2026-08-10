# M04 — Document Management & Publish Workflow

**Status:** Not started

## Scope

- [ ] CRUD และ Order เอกสาร
- [ ] Draft/Published/Archived
- [ ] Manual Save และ unsaved warning
- [ ] Optimistic locking ด้วย Version
- [ ] Save Published แล้ว Public invalidation ภายใน 5 วินาที
- [ ] Document slug unique ภายใน Section
- [ ] Route history/permanent redirect และ loop/collision guard
- [ ] Hard delete: R2 ก่อน DB
- [ ] 404 สำหรับ Draft/Archived/Deleted
- [ ] Tests ทุก transition/failure path
- [ ] อัปเดต Context/TODO

## Acceptance

- Draft Save ไม่ Publish; Published Save เปลี่ยน Public
- Version ชนต้องหยุด Save และไม่เขียนทับ
- Redirect เดิมทำงานและไม่เกิด Loop
- Delete failure คงข้อมูลและให้ Retry

## Stop

สรุปและรอภูยืนยัน M05

