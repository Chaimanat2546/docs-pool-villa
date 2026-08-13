# M02 — Structure Management

**Status:** Complete

**Pre-M04 remediation (historical):** Complete; see [Remediation TODO](M01-M03-remediation.md) for verified evidence.

## Scope

- [x] CRUD หมวดหลักและหมวดย่อยสูงสุด 2 ระดับ
- [x] Sort order และ Sidebar-ready tree
- [x] Slug validation/uniqueness ภายใต้ Parent
- [x] Reserved route และ Route collision validation
- [x] Category deletion confirmation: จำนวนหมวดย่อย รายชื่อเอกสาร และพิมพ์ชื่อหมวด
- [x] Tests สำหรับ depth, slug, order และ cascade delete guard
- [x] อัปเดต Context/TODO

## Local verification

- `npx supabase@latest db reset` — ผ่าน; ใช้ migration M02 กับ Local database
- `npm run test:db` — ผ่าน 55 pgTAP tests (M01 41, M02 14)
- `npm run lint` — ผ่าน
- `npm run build` — ผ่าน
- `npx supabase@latest db lint --local --schema public --level warning --fail-on error` — ผ่าน
- `npx supabase@latest db advisors --local` — ไม่พบ warning ของ `doc_*`; รายการที่รายงานเป็น Legacy objects นอกขอบเขต

## Staging verification

- `npx supabase@latest db push --linked --dry-run` — ยืนยันว่ามี migration M02 เพียงรายการเดียวก่อน apply
- `npx supabase@latest db push --linked --yes` — apply `20260811060703_docs_structure_management.sql` ไป Staging สำเร็จ
- `npx supabase@latest migration list --linked` — Staging history ตรง Local รวม migration M02
- Browser smoke (Staging Admin) — เปิด `/admin/structure`, สร้างหมวดหลัก, สร้างหมวดย่อย, ยืนยันชื่อลบ และลบข้อมูลทดสอบกลับสำเร็จ; ตรวจ Mobile 390px โดยไม่มี console error

## M01–M06 close-out verification — 13 สิงหาคม 2026

- Staging Admin สร้าง root/child exact test fixture, ปฏิเสธ depth 3, duplicate และ reserved slug, บันทึก sort order แล้วลบผ่าน confirmation กลับเป็นศูนย์. ไม่มี fixture/ข้อมูลนอก target คงค้าง.
- Final local DB gate เป็น pgTAP 140/140 และ Staging migration history ตรง Local ถึง `20260813062523`; ไม่มี Production action.

## Constraint ที่ส่งต่อ M03/M06

- Category ที่มี Media จะถูกปฏิเสธแบบ fail-closed จนกว่า M03/M06 จะมี Docs Media Worker และ R2 cleanup flow

## Acceptance

- ไม่สร้างหมวดลึกเกิน 2 ระดับ
- Slug ซ้ำใน Parent เดียวกันไม่ได้ แต่ซ้ำคนละ Parent ได้
- การลบหมวดต้องยืนยันและไม่ลบข้อมูลถ้า Media cleanup ล้มเหลว

## Stop

M02 ปิดแล้วจากหลักฐาน Local/Staging; M03–M06 ปิดในรอบถัดมา และ M07 ยังไม่เริ่ม

