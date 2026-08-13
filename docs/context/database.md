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

## M02 structure additions

- Migration `20260811060703_docs_structure_management.sql` เพิ่ม `description`, `is_published` และ audit actor fields ให้ `doc_sections`; เพิ่ม `sort_order` ให้ `doc_documents`
- Trigger ของ Docs บังคับ slug สงวน, ห้าม self-parent และจำกัด section tree ไว้ที่ 2 ระดับ
- Route ของ Section ห้ามชน `doc_route_redirects.old_path`
- `public.doc_section_delete_preview()` คืนจำนวนหมวดย่อย เอกสาร รูป และรายชื่อเอกสารสำหรับ Dialog ยืนยัน
- `public.doc_delete_section()` ลบได้เฉพาะ subtree ที่ไม่มี Media; เมื่อพบ Media จะ fail-closed โดยไม่เปลี่ยน DB

## M04 document additions

- Migration `20260811092710_document_management_publish_workflow.sql` เพิ่ม `created_by`/`updated_by` ของ Document, `document_id` แบบ nullable ให้ Route history เดิม และ `doc_media_cleanup` สำหรับเก็บ object ที่ rollback ไม่สำเร็จ
- `public.doc_save_document()` ทำ Create/Update, optimistic locking, status transition, media metadata และ document route history ใน transaction เดียว
- `public.doc_reorder_documents()`, `public.doc_prepare_document_delete()` และ `public.doc_finalize_document_delete()` บังคับ Admin และ Version check; R2 deletion ยังอยู่ภายนอก DB transaction และต้องสำเร็จก่อน finalize
- Route ของ Document ใช้ shared transaction-level advisory lock กับ Structure และห้ามชน Redirect route ที่เก็บแล้ว

## M05 public redirect visibility

- Migration `20260813033615_public_docs_redirect_visibility.sql` ให้ Public client อ่าน `doc_route_redirects` ได้ผ่าน RLS เฉพาะ redirect ที่ผูกกับ Document และปลายทางยังผ่าน `doc_private.doc_document_is_public()`
- Redirect ของ Draft, Archived, Section/Parent ที่ซ่อน หรือ Document ที่ถูกลบ จึงไม่เปิดเผย Route history; Admin ยังคงอ่านและเขียนได้ตาม policy เดิม
- ไม่เพิ่ม index เพราะ `old_path` มี unique index สำหรับ lookup แล้ว และ index แบบ partial ของ `document_id` รองรับ predicate visibility ที่มีอยู่

