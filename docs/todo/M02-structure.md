# M02 — Structure Management

**Status:** Not started

## Scope

- [ ] CRUD หมวดหลักและหมวดย่อยสูงสุด 2 ระดับ
- [ ] Sort order และ Sidebar-ready tree
- [ ] Slug validation/uniqueness ภายใต้ Parent
- [ ] Reserved route และ Route collision validation
- [ ] Category deletion confirmation: จำนวนหมวดย่อย รายชื่อเอกสาร และพิมพ์ชื่อหมวด
- [ ] Tests สำหรับ depth, slug, order และ cascade delete guard
- [ ] อัปเดต Context/TODO

## Acceptance

- ไม่สร้างหมวดลึกเกิน 2 ระดับ
- Slug ซ้ำใน Parent เดียวกันไม่ได้ แต่ซ้ำคนละ Parent ได้
- การลบหมวดต้องยืนยันและไม่ลบข้อมูลถ้า Media cleanup ล้มเหลว

## Stop

สรุปและรอภูยืนยัน M03

