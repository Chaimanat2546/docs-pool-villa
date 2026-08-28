# Local Development Environment Design

## Goal

ให้ Next.js Docs App รันที่ `http://localhost:3000` โดยใช้ค่า Staging ที่มีอยู่ใน `.env.local` เพื่อทดสอบเฉพาะข้อมูลทดสอบของ Staging โดยไม่แก้ infrastructure หรือ remote data

## Scope

- ตรวจว่าตัวแปรที่จำเป็นใน `.env.local` มีค่า โดยไม่แสดง secret
- ใช้ dependency ที่ล็อกใน `package-lock.json`
- เริ่ม `npm run dev` และตรวจ public page กับ Guest redirect ของ `/admin`

## Exclusions

- ไม่แก้ `.env.local` หากค่าที่มีอยู่ครบและถูกต้อง
- ไม่รัน Supabase migration, reset, deploy หรือ Cloudflare command
- ไม่สร้าง แก้ไข หรือลบข้อมูล Staging

## Validation

- `npm run dev` เริ่มสำเร็จบน localhost
- `GET /` ตอบสำเร็จ
- Guest ที่ `GET /admin` ถูก redirect ไป `/auth/login`
- output และรายงานไม่เปิดเผยค่า secret

## Failure Handling

หากตัวแปรแวดล้อมหรือ dependency ไม่พร้อม ให้หยุดก่อนเรียกใช้ Staging และรายงานเฉพาะชื่อ setting/ขั้นตอนแก้ไข โดยไม่แสดงค่า secret
