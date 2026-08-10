# Database Boundaries

## New Docs-owned objects

Schema ขั้นสุดท้ายออกแบบใน M01/M02 แต่ใช้ prefix `doc_*` และคาดว่าจะมีอย่างน้อย:

- `doc_sections`
- `doc_documents`
- `doc_media`
- `doc_route_redirects`

## Legacy boundary

- อ่าน `public.users.uid` และ `public.users.role_id` เพื่อ Authorization เท่านั้น
- `public.users.uid` เชื่อมกับ `auth.users.id`
- ห้ามแก้ `public.users`, `public.roles`, Constraint, Trigger, Function, Index หรือ RLS เดิม
- ห้ามเพิ่ม FK/Unique constraint ให้ `users.uid` ภายใต้งาน Docs

## Key data rules

- Section depth สูงสุด 2 ระดับ
- Section slug unique ภายใต้ Parent เดียวกัน
- Document slug unique ภายใน Section เดียวกัน
- Document content เป็น validated Tiptap JSONB
- Document มี Version สำหรับ optimistic locking
- Media หนึ่งรายการมี Document owner เดียว
- Redirect old path ต้อง unique และห้ามชน Reserved/current route
- `pg_trgm` และ GIN index ใช้เฉพาะตาราง Docs

