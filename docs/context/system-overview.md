# System Overview

## Product

Poolvilla Docs เป็นเว็บไซต์คู่มือแนว Mintlify/Next.js Docs มีหน้า Public และ Admin ใช้ภาษาไทยเป็นหลัก ชื่อระบบที่แสดงต่อผู้ใช้คือ "คู่มือสำหรับเว็บ Baan Pool Villa"

## Users

- Guest อ่านและค้นหาเฉพาะ Published
- Authenticated user ที่ไม่มีสิทธิ์ใช้ Public ได้เท่านั้น
- Docs Administrator ต้องผ่าน `public.users.uid = auth.uid()` และมี `role_id = 1`

## Core capabilities

- Homepage สร้างจากหมวดและเอกสาร Published อัตโนมัติ
- Navigation สูงสุด 2 ระดับ: หมวดหลัก > หมวดย่อย > เอกสาร
- Tiptap Editor, manual Save, Preview unsaved content และ optimistic locking
- รูปเป็นของเอกสารเดียว Upload/Paste ตอน Save และจัดเก็บใน Cloudflare R2
- Search ด้วย PostgreSQL `pg_trgm`

## Source of truth

อ่าน Requirement ฉบับเต็มที่ [Poolvilla Docs Requirements TH v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

