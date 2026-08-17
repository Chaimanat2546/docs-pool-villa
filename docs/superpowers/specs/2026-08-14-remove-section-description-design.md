# Remove Section Description Design

## Goal

นำคำอธิบายของหมวดเอกสารออกจากระบบ Poolvilla Docs ทั้งข้อมูลเดิม ฐานข้อมูล UI การรับส่งข้อมูล และเอกสารข้อกำหนด โดยไม่กระทบคำอธิบายรูป, excerpt ของเอกสาร, SEO description หรือข้อความช่วยเหลือส่วนอื่น

## Confirmed scope

- ลบคอลัมน์ `public.doc_sections.description` ด้วย migration ใหม่ของ Docs เท่านั้น
- ตัด field ออกจาก form สร้างและแก้ไขหมวด, Server Action, query, model, type, fixture และ tests ที่ใช้กับหมวด
- หน้า Public card และ Admin panel ไม่แสดงหรืออ้างถึงคำอธิบายหมวดอีก
- ปรับ Requirement baseline และ TODO/context ให้สะท้อน schema ใหม่
- ทำ Local database reset/tests/build เท่านั้น ไม่มี Staging หรือ Production migration/deployment ในงานนี้

## Design

Migration ใช้ `alter table public.doc_sections drop column description` เพียงคำสั่งเดียว ภายใน migration ใหม่ที่ตั้งชื่อผ่าน Supabase CLI. การลบนี้ทำให้ข้อมูลคำอธิบายหมวดเก่าถูกลบถาวรเมื่อ apply migration ดังนั้นต้องมีการอนุมัติแยกก่อน apply ไป Staging หรือ Production ตามกติกาโครงการ

Application model `AdminExplorerSection` และ `PublicSection` จะเหลือ id, parentId, title, slug, publishing/order state และข้อมูล navigation ที่มีอยู่แล้ว. ทุก select จาก `doc_sections` จะไม่ขอ `description`; action รับเฉพาะ title, slug, parentId, sortOrder และ isPublished. `SectionInlineForm` จะไม่มี textarea คำอธิบายและไม่มี state สำหรับค่านั้น. หน้า Homepage card และ Admin explorer panel จะแสดงเฉพาะข้อมูลที่ยังมีความหมาย เช่น title, state และคำแนะนำเริ่มต้นเมื่อยังไม่เลือกหมวด.

## Error handling and compatibility

หลัง Local reset schema และ code จะตรงกัน ไม่มี request หรือ query ที่อ้างคอลัมน์ที่ถูกลบ. Tests จะยืนยันว่า action รับ payload ใหม่, mapping/query ไม่รวม column นี้ และ UI ไม่มี textbox/ข้อความ fallback สำหรับคำอธิบายหมวด. คำอธิบายรูป, metadata ของหน้า และ slash-command description อยู่นอกขอบเขตและต้องคงเดิม.

## Verification

- เขียน regression tests ก่อนแก้ code และรันให้ fail ด้วยสาเหตุที่คาดไว้
- `npx supabase@latest db reset` และ `npm run test:db`
- focused Vitest สำหรับ structure/admin explorer/public model
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, และ `git diff --check`
- ตรวจ migration/local schema และค้นหาเฉพาะ docs code/fixtures ว่าไม่มี `doc_sections` query, type หรือ fixture ที่ใช้ `description`

## Out of scope

- ไม่ลบคำอธิบายภาพ, excerpt เอกสาร, metadata description, UI description ของ editor หรือข้อมูล Legacy ที่ไม่ใช่ `doc_sections`
- ไม่ apply migration หรือ deploy ไปยัง Staging/Production
