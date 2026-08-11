# Database Boundaries

## New Docs-owned objects

Schema baseline ถูกสร้างใน M01 ผ่าน Imperative migration ภายใต้ `supabase/migrations/` โดยใช้ prefix `doc_*`:

- `doc_sections`
- `doc_documents`
- `doc_media`
- `doc_route_redirects`

มี schema private ของ Docs ชื่อ `doc_private` สำหรับ privileged Boolean helpers; `public.doc_is_admin()` เป็น SECURITY INVOKER RPC wrapper ที่คืนค่า Boolean ของผู้เรียกเท่านั้น และตรวจ `EXISTS` จาก `public.users` ด้วย `uid = auth.uid()` และ `role_id = 1` โดยไม่แก้ตาราง Legacy

## Production baseline and migration history

- `20260626050000_production_baseline.sql` เป็น schema-only snapshot ของ Production schemas `public` และ `private` ณ วันที่ 11 สิงหาคม 2026; ไม่มี object `doc_*`
- Marker migrations ที่ตามมาไม่มี SQL และมีไว้เพื่อให้ version history ตรงกับ Production ทั้ง 45 รายการ
- ห้ามแก้ baseline หรือ marker ด้วยมือ และห้ามใช้ `migration repair` กับ Production ภายใต้งาน Docs
- Docs migrations เริ่มหลัง version ล่าสุดของ Production, ผ่าน Staging แล้ว และยังไม่ได้ apply Production

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

