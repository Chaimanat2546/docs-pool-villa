# Database Boundaries

## New Docs-owned objects

Schema baseline ถูกสร้างใน M01 ผ่าน Imperative migration ภายใต้ `supabase/migrations/` โดยใช้ prefix `doc_*`:

- `doc_sections`
- `doc_documents`
- `doc_media`
- `doc_route_redirects`
- `doc_media_cleanup`
- `doc_media_operations`, `doc_media_operation_documents`, `doc_media_operation_items`

มี schema private ของ Docs ชื่อ `doc_private` สำหรับ privileged Boolean helpers; `public.doc_is_admin()` เป็น SECURITY INVOKER RPC wrapper ที่คืนค่า Boolean ของผู้เรียกเท่านั้น และตรวจ `EXISTS` จาก `public.users` ด้วย `uid = auth.uid()` และ `role_id = 1` โดยไม่แก้ตาราง Legacy

## Production baseline and migration history

- `20260626050000_production_baseline.sql` เป็น schema-only snapshot ของ Production schemas `public` และ `private` ณ วันที่ 11 สิงหาคม 2026; ไม่มี object `doc_*`
- Marker migrations ที่ตามมาไม่มี SQL และมีไว้เพื่อให้ version history ตรงกับ Production ทั้ง 45 รายการ
- ห้ามแก้ baseline หรือ marker ด้วยมือ และห้ามใช้ `migration repair` กับ Production ภายใต้งาน Docs
- Docs migrations ถึง `20260813150200` ผ่าน Staging แล้ว; migration ป้องกัน section-delete race `20260813150200_docs_section_delete_race_guard.sql` ผ่าน Local และ Staging verification. Migration `20260814085611_remove_doc_section_description.sql` ลบ `doc_sections.description` และผ่าน Local/Staging verification แล้ว. ไม่มี Docs migration ใดถูก apply Production

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

- Migration `20260811060703_docs_structure_management.sql` เพิ่ม `is_published` และ audit actor fields ให้ `doc_sections`; เพิ่ม `sort_order` ให้ `doc_documents`. ต่อมา `20260814085611_remove_doc_section_description.sql` ลบ `description` ออก
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

## M06 durable media lifecycle

- Migration `20260813062523_docs_media_lifecycle_operations.sql` เพิ่ม operation manifest/freeze สำหรับ save ที่เอารูปออก, hard delete และ section cascade; DB finalize จะทำงานหลัง R2 ลบ exact keys สำเร็จเท่านั้น
- `doc_media_cleanup` ใช้ claim token และ lease 5 นาทีเพื่อ retry แบบ bounded; state `cleanup_required` ถูกเลิกใช้เพื่อให้มี source of truth เดียว
- trigger ของ Docs ปฏิเสธ direct content update ที่ทำให้ media เดิมไม่มี reference; finalizer ตั้ง transaction-local guard เท่านั้น
- RPC ทุกตัวเป็น security invoker, ตรวจ Admin ด้วย `doc_private.doc_is_admin()` และ policy ของ operation tables จำกัดเฉพาะ Admin
- Post-closeout race guard ใช้ advisory lock ชุดเดิมแบบ statement/RPC-first ที่ Document, Section, Media และ operation/snapshot mutation boundaries เพื่อห้ามเปลี่ยนสมาชิกของ subtree ระหว่าง pending section delete; ครอบคลุม staged `save_remove` destination, section-delete subtree ที่ overlap กัน และป้องกัน lock order กลับด้านด้วย
- Operation target และ frozen Document/Media manifest เปลี่ยนตรงไม่ได้หลัง prepare; Media ของ Document ที่มี pending `save_remove`/`document_delete` ก็เปลี่ยนตรงไม่ได้. lifecycle RPC เปิด transaction-local write guard เฉพาะช่วงสร้าง/ปิด exact snapshot ขณะที่ retry bookkeeping ยังอัปเดตได้
- Section finalizer lock และเทียบ exact sorted Document IDs รวม exact `(document_id, media_id, object_key)` manifest ก่อนลบ; mismatch คืน `P0001`, คง operation/data เพื่อ Retry และลบ DB เฉพาะ frozen Document IDs หลัง guard ผ่าน

