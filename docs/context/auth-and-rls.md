# Authentication and RLS

## Admin rule

Admin access ใช้เงื่อนไข:

`EXISTS public.users WHERE uid = auth.uid() AND role_id = 1`

Production มี Auth UID หนึ่งรายการที่อ้างโดย `public.users` มากกว่าหนึ่งแถว และผู้ใช้ยืนยันว่าแถว `role_id = 1` ตั้งใจให้เป็น Administrator จึงไม่ใช้กติกา “ต้องพบเพียงหนึ่งแถว”

## Required enforcement

- Server-side Admin route guard
- RLS สำหรับตาราง Docs ทุกตารางที่เปิดผ่าน Data API
- Public SELECT เฉพาะ Published
- Admin SELECT/INSERT/UPDATE/DELETE ต้องตรวจ Role
- UPDATE ต้องมีทั้งเงื่อนไขแถวเดิมและค่าหลังแก้ไข
- ห้ามใช้ user-editable metadata เพื่อตัดสินสิทธิ์
- Secret/Service Role อยู่ Server เท่านั้น

## M01 implementation

- `doc_private.doc_is_admin()` เป็น `SECURITY DEFINER` helper นอก Data API schema เพื่ออ่าน Legacy authorization data โดยไม่ต้อง grant ให้ Client อ่าน `public.users`; จำกัด `EXECUTE` เฉพาะ `authenticated`
- `public.doc_is_admin()` เป็น `SECURITY INVOKER` RPC wrapper สำหรับ Server guard และคืน Boolean ของผู้เรียกเท่านั้น; revoke privilege จาก `PUBLIC`, `anon` และ `service_role` แล้ว grant เฉพาะ `authenticated`
- `doc_private.doc_section_is_public()` และ `doc_private.doc_document_is_published()` คำนวณ Public visibility โดยไม่ให้ RLS query table ตัวเองซ้ำ
- ทุก helper มี fixed `search_path` และ explicit grants
- RLS ของ `doc_sections`, `doc_documents`, `doc_media` และ `doc_route_redirects` เปิดใช้งานแล้วใน migration local
- Public read ได้เฉพาะเอกสาร Published และโครงสร้าง/รูปที่จำเป็นต่อเอกสารนั้น; สิทธิ์ Admin แยกตาม operation พร้อม `USING` และ `WITH CHECK`

## Pre-M04 remediation

- `doc_private.doc_document_is_public()` ยืนยันทั้ง `document.status = 'published'`, Section Published และ Parent Section Published ก่อนอนุญาต Public read ของ document/media
- Section structural writes ใช้ transaction-level advisory lock และปฏิเสธการย้ายหมวดที่มีลูกไปอยู่ใต้หมวดอื่น เพื่อคงความลึกสูงสุด 2 ระดับ
- `public.doc_delete_section(uuid, text)` ตรวจชื่อยืนยันหลัง lock แถว Section ภายใน transaction เดียวกับการลบ

## Safety

การเปลี่ยน RLS ของระบบเก่าเป็นงานนอกขอบเขต ต้อง Audit และขออนุมัติแยก

