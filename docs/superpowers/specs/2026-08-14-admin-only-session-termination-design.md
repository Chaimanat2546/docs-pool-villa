# Admin-only session termination design

## เป้าหมาย

เมื่อผู้ใช้ที่ยืนยันตัวตนแล้วแต่ไม่มีสิทธิ์ Admin พยายามเข้า Admin route หรือเรียก Admin Server Action ระบบต้องล้าง Supabase session แล้วส่งไปหน้าเข้าสู่ระบบ พร้อมข้อความว่าเฉพาะผู้ดูแลระบบเท่านั้นที่เข้าถึงได้

## ขอบเขต

- ใช้กติกาสิทธิ์เดิมผ่าน `public.doc_is_admin()` ซึ่งตรวจ `public.users` ด้วย `EXISTS(uid = auth.uid() AND role_id = 1)`
- ไม่แก้ schema, RLS, migration หรือข้อมูลใน Supabase
- ครอบคลุม Admin routes และ Server Actions ที่เรียก `requireAdmin()`
- ไม่เปลี่ยนสิทธิ์ Public ของผู้ใช้ที่ไม่ใช่ Admin จนกว่าจะพยายามเข้าถึง Admin functionality

## ออกแบบ

`requireAdmin()` ยังคงตรวจ session และเรียก RPC `doc_is_admin()` เหมือนเดิม หากไม่พบ session ให้ส่งไป `/auth/login` ตามพฤติกรรมเดิม หากตรวจแล้วไม่เป็น Admin ให้ redirect ไปยัง Route Handler ภายใน

Route Handler จะสร้าง Supabase server client, เรียก `auth.signOut()` เพื่อส่ง cookie ที่ล้าง session กลับไปยัง browser แล้ว redirect ไป `/auth/login?error=admin_only` การแยก Route Handler ออกจาก Server Component ทำให้สามารถเขียน cookie ได้อย่างถูกต้อง

Admin ไม่ถูก redirect และทำงานตามปกติ ความผิดพลาดขณะตรวจสิทธิ์ยังเป็น server error เพื่อไม่ตีความความล้มเหลวของ authorization ว่าเป็น non-admin

## การทดสอบ

- Guest: `requireAdmin()` redirect ไป `/auth/login` โดยไม่เรียก RPC
- Non-admin: `requireAdmin()` redirect ไป Route Handler ล้าง session
- Route Handler: เรียก `auth.signOut()` แล้ว redirect ไป `/auth/login?error=admin_only`
- Admin: `requireAdmin()` ทำงานต่อได้ และไม่เรียก `signOut()`
- Regression: Admin Server Action ยังคงหยุดก่อน mutation เมื่อ guard redirect

## ข้อจำกัด

วิธีนี้ไม่ปฏิเสธ password ที่ระดับ Supabase Auth; session จะถูกล้างเมื่อ non-admin พยายามเข้าถึง Admin functionality ซึ่งเป็นขอบเขตที่ Docs app ควบคุมได้โดยไม่เปลี่ยน Auth data หรือ DB.
