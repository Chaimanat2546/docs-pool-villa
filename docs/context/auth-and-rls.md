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

## Safety

การเปลี่ยน RLS ของระบบเก่าเป็นงานนอกขอบเขต ต้อง Audit และขออนุมัติแยก

