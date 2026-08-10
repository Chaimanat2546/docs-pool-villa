<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Poolvilla Docs — Project Instructions

## Communication

- เรียกผู้ใช้ว่า “ภู” และตอบภาษาไทยเป็นหลัก
- อธิบายศัพท์เทคนิคที่ไม่ใช่คำทั่วไปแบบสั้นและนำไปใช้ได้
- ตอบผลลัพธ์ก่อน แล้วค่อยสรุปเหตุผล Tests และขั้นตอนถัดไป
- หากข้อมูลไม่ครบแต่เดินหน้าต่อได้ ให้ตั้งสมมติฐานที่ปลอดภัยและระบุไว้

## Read before working

1. เริ่มจาก `context.md` เพื่อดูสถานะและเลือก Context ที่เกี่ยวข้อง
2. อ่าน `TODO.md` และ `docs/todo/Mxx-*.md` ของ Module ปัจจุบัน
3. ใช้ `docs/Poolvilla-Docs-Requirements-TH-v1.2.md` เป็น Requirement baseline
4. อ่าน `DESIGN.md` ก่อนแก้ UI หรือ Design system
5. สำหรับ Next.js ให้เปิดคู่มือที่เกี่ยวข้องใน `node_modules/next/dist/docs/` ก่อนเขียน Code

อย่าคัดลอก Requirement ทั้งหมดไปหลายไฟล์ ให้ Link กลับไปยังแหล่งอ้างอิงหลัก

## Current state

- Requirement review เสร็จแล้ว
- ยังไม่เริ่ม M01 และต้องรอภูสั่งก่อน
- ทำได้เฉพาะ Local build/test จนกว่าภูจะอนุมัติ Deployment
- ห้ามเริ่ม Module ถัดไปเอง

## Module workflow

- ทำทีละ Module ตามลำดับ M01-M07 และมีเพียง Module เดียวที่ `in progress`
- ก่อนเริ่ม Module ต้องได้รับการยืนยันจากภู
- อัปเดต Module TODO หลังเสร็จแต่ละงานย่อย
- อัปเดต Context เฉพาะเมื่อ Architecture, Schema boundary, Command หรือ Requirement เปลี่ยน
- Definition of Done ต้องรวม Code, Validation, Tests ที่เหมาะสม และ Documentation
- เมื่อจบ Module ให้หยุดและสรุป:
  - ผลลัพธ์ที่เสร็จ
  - รายการไฟล์ที่เปลี่ยน
  - Tests/Build ที่รันและผลลัพธ์
  - ข้อจำกัดหรือประเด็นค้าง
- รอภูยืนยันก่อนเริ่ม Module ถัดไป

## Implementation principles

- ใช้วิธีที่ง่ายที่สุดซึ่งผ่าน Requirement, Security, Accessibility และ Error handling
- ใช้ Pattern/Dependency ที่มีอยู่ก่อนเพิ่ม Abstraction หรือ Package ใหม่
- ห้ามสร้าง Feature เผื่ออนาคตโดยไม่มี Requirement
- TypeScript ต้องชัดเจน หลีกเลี่ยง `any` และ Validate ข้อมูลที่ Trust boundary
- ใช้ `npm` และรักษา `package-lock.json`; ห้ามสลับ Package manager
- รักษาการเปลี่ยนแปลงเดิมของผู้ใช้ และอย่าแก้ไฟล์นอกขอบเขต
- ใช้ `apply_patch` สำหรับการแก้ไฟล์ด้วยมือ
- ห้ามทำ Destructive Git/File operation หากไม่ได้รับคำสั่งชัดเจน

## Supabase and legacy safety

- งานที่เกี่ยวกับ Supabase ต้องอ่าน `.agents/skills/supabase/SKILL.md`
- ก่อนออกแบบ/แก้ Schema, Migration, Index, Function หรือ RLS ต้องอ่าน `.agents/skills/supabase-postgres-best-practices/SKILL.md`
- Production project ref ที่ตรวจแล้วคือ `rqizfiayvcbozlzuvbok`; Identifier นี้ไม่ใช่ Secret
- Docs สร้างและแก้เฉพาะ Object ที่เป็นของ Docs โดยใช้ prefix `doc_*`
- อ่าน `public.users` เฉพาะเพื่อเชื่อม `uid = auth.uid()` และตรวจ `role_id = 1`
- Admin authorization ใช้ `EXISTS(uid = auth.uid() AND role_id = 1)`
- ห้ามแก้ `public.users`, `public.roles` หรือ Constraint, Index, Trigger, Function และ RLS ของระบบเก่า
- ห้ามใช้ `user_metadata` เพื่อตัดสินสิทธิ์
- ตาราง Docs ที่เปิดผ่าน Data API ต้องมี RLS และ Tests ของ Guest/non-admin/Admin
- ห้ามรัน Remote migration หรือเขียน Production จนกว่าภูจะอนุมัติโดยตรง

## Cloudflare and media safety

- งาน Cloudflare ต้องอ่าน Cloudflare skill ที่เกี่ยวข้องก่อนทำ
- Docs ใช้ Worker/Secret แยกจาก Worker เดิม และจำกัดสิทธิ์เฉพาะ R2 prefix `docs/`
- ห้ามแก้หรือ Deploy Worker เดิมใน `C:\Projects\webook` ภายใต้งาน Docs
- รูปหนึ่งเป็นของเอกสารเดียว ไม่มี Media Library และไม่ใช้รูปซ้ำข้ามเอกสาร
- เมื่อนำรูปเดิมออก ต้องลบ R2 สำเร็จก่อน Save เนื้อหาใหม่
- เมื่อลบเอกสาร/หมวด ต้องลบรูปสำเร็จก่อนลบข้อมูล
- หากลบไม่สำเร็จ ให้คงข้อมูลเดิม แจ้งชื่อไฟล์/สาเหตุ และให้ Retry
- รูปใหม่ที่ Upload สำเร็จแต่ DB Save ล้มเหลวต้อง Cleanup ทันที; หาก Cleanup ไม่สำเร็จใช้ `cleanup_required`

## Environment and deployment

- Staging และ Production แยก Cloudflare Account, Supabase Project, Auth, DB, R2, Worker, Domain และ Secrets
- Staging ใช้ Test data เท่านั้น ห้าม Copy ข้อมูลผู้ใช้จริงจาก Production
- ห้ามใช้ Production credential ใน Staging หรือ Client
- ห้าม Commit Secret, Token, Password, Service Role key หรือ Cloudflare credential
- ทุก Schema change/Deployment ต้องผ่าน Staging ก่อน
- Production Migration/Deployment ต้องได้รับคำสั่งยืนยันแยกจากภู
- ก่อน Production Migration ต้องยืนยัน Backup ล่าสุดและ Rollback plan

## Verification

- รัน Check ที่เล็กที่สุดซึ่งพิสูจน์งานได้ แล้วขยายตามความเสี่ยง
- Baseline เมื่อเกี่ยวข้อง: `npm run lint` และ `npm run build`
- Database/Auth ต้องมี RLS/authorization tests
- Save/Delete/Media ต้องทดสอบ Failure path ไม่ใช่เฉพาะ Success path
- UI ต้องตรวจ Keyboard, Focus, Labels, Alt text และ Responsive behavior
- ห้ามรายงานว่า Test ผ่านหากไม่ได้รันจริง

## Documentation hygiene

- `context.md` เป็นดัชนี ไม่ใช่ที่เก็บรายละเอียดทุกอย่าง
- `TODO.md` แสดงภาพรวมและ Module ปัจจุบัน
- รายละเอียด Module อยู่ใน `docs/todo/`
- Context แยกหัวข้ออยู่ใน `docs/context/`
- ห้ามใส่ Secret หรือข้อมูลส่วนบุคคลจริงใน Context, TODO, Test fixture หรือ Screenshot
- หาก Code กับ Requirement/Context ไม่ตรง ให้แก้ให้ตรงก่อนปิดงาน หรือหยุดถามภูเมื่อเป็นการเปลี่ยนขอบเขต
