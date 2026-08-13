# M04 — Document Management & Publish Workflow

**Status:** Complete — Full Test remediation ปิดแล้ว 13 สิงหาคม 2026

Requirement baseline: [Poolvilla Docs Requirements TH v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

Remediation plan: [M01–M04 Full Test Remediation Plan](M01-M04-full-test-remediation.md)

## Implementation progress

- [x] Local migration: document audit fields, redirect-to-document link, cleanup record, route validation, Save/Reorder/Delete RPCs, RLS และ explicit grants
- [x] Admin Documents pages: list, create, edit, status, numeric ordering, Preview, manual Save, unsaved warning และ hard-delete dialog
- [x] Signed Worker DELETE endpoint, immediate upload rollback และ idempotent retry contract
- [x] Local pgTAP, content/Worker tests, TypeScript, Worker typecheck, lint, build, DB lint/advisors และ dependency audit
- [x] Staging no-media smoke: สร้าง Draft, Preview, Publish และ hard-delete document ได้; สร้าง/ลบ Section ทดสอบกลับแล้ว
- [x] Deploy Worker `docs-media-staging` พร้อม signed DELETE endpoint (version `5a583590-41af-4b58-ae0c-c838ddd170f3`)
- [x] E2E/service validation: สอง session ถูก version conflict, Mobile 390px render, hard-delete no-media บน Staging, Worker test ครอบคลุม signed delete success/idempotent/R2 failure และทดสอบจริงจาก Admin ด้วยรูป: upload, Save, GET แสดงรูป, hard-delete เอกสารและหมวดทดสอบกลับสำเร็จ

> Real-browser image flow ได้รับการยืนยันบน Staging/localhost แล้วด้วยข้อมูลทดสอบที่ลบกลับครบ: Worker รับ Upload/GET/DELETE และลำดับ hard-delete เป็น R2 ก่อน DB. M06 ยังต้องทดสอบ remove-existing-image-before-save และ cleanup retry ตามขอบเขต Module

## Full Test remediation — 13 สิงหาคม 2026

- [x] หลัง Save รูปสำเร็จ Editor เปลี่ยน `blob:` เป็น permanent Worker URL, revoke Blob URL และล้างข้อความ pending image ทันทีโดยไม่ต้อง Reload
- [x] Reload หลัง Save โหลด permanent URL ได้, Worker GET ตอบ `200 image/webp` และ hard-delete ทำให้ URL เดิมตอบ 404
- [x] Test data `FULL M01-M04 20260811`, child, document และ R2 object ถูกลบกลับครบ
- [x] Local pgTAP 93 tests เป็น database gate; `supabase test db --linked` ของ Staging ยังคง resolve `plan()` ไม่ได้แม้ runner แจ้งว่ามี extension จึงบันทึกเป็น hosted-tooling limitation โดยไม่มี remote schema change หรือข้อมูลค้าง

## M01–M06 close-out evidence — 13 สิงหาคม 2026

Checklist ทุกข้อใน M04 ได้รับหลักฐานจาก Requirement baseline, pgTAP 140/140, Content 12/12, Media 14/14, Worker 9/9, typecheck/lint/build/audit และ Staging workflow. Staging ยืนยัน Draft/Preview/Publish/Archive/Republish, optimistic conflict, redirect 308→canonical และ 404/noindex เมื่อ archive, พร้อม M06 real upload→`200 image/webp`→remove→exact R2 `404` ก่อน DB cleanup. Exact close-out/retained fixtures ถูกลบแล้วและ non-target fingerprints ไม่เปลี่ยน; ดูรายละเอียดที่ [Testing and Commands](../context/testing-and-commands.md).

## Goal

เชื่อม M02 Structure และ M03 Editor/Upload contract ให้เป็นระบบจัดการเอกสารจริงที่บันทึกด้วยมือ ป้องกันการเขียนทับ รองรับ Draft/Published/Archived เก็บ Route เดิม และลบเอกสารแบบ fail-closed โดยยังไม่สร้างหน้า Public เต็มรูปแบบของ M05

## Approved boundary

- M04 เพิ่ม Worker `DELETE` contract และ document-delete orchestration ขั้นต่ำ เพื่อให้ลบ R2 ก่อน DB และ Cleanup รูปใหม่หลัง DB Save ล้มเหลวได้
- M04 เพิ่มที่เก็บ Cleanup work ขั้นต่ำสำหรับกรณีลบรูปใหม่ไม่สำเร็จ เพื่อไม่ปล่อย Orphan โดยไม่มีสถานะติดตาม
- M06 ยังเป็นเจ้าของการลบรูปเดิมออกจาก Content ก่อน Save, Retry `cleanup_required` ตอนเปิด/Save, Category cascade deletion orchestration และ Media lifecycle hardening
- M05 เป็นเจ้าของ Public reader, 404/redirect rendering และการตรวจ end-to-end ว่า Published content เปลี่ยนภายใน 5 วินาที; M04 ต้องเตรียม Route/cache invalidation contract ให้พร้อม
- Staging database migration, no-media smoke และ Worker `docs-media-staging` ได้รับอนุมัติและทำแล้ว; ห้ามแตะ Production จนกว่าภูจะอนุมัติแยก

## Working decisions

- `published_at` คือเวลาที่ Publish สำเร็จครั้งแรก; Archive แล้ว Publish ใหม่ไม่เขียนทับค่าเดิม
- Create ใช้ UUID ที่สร้างล่วงหน้าเพื่อผูก Pending images กับเอกสารโดยไม่ต้อง Autosave
- Update ทุกครั้งส่ง `expected_version`; Save สำเร็จเพิ่ม `version` หนึ่งครั้ง
- Version conflict ต้องหยุดทั้ง transaction และให้ผู้ใช้ Reload; ห้าม Last-write-wins
- Route redirect ผูกกับ `document_id` และ resolve ไป Route ปัจจุบันโดยตรง เพื่อตัด redirect chain
- Document/route mutations ใช้ transaction-level advisory lock ชุดเดียวกับ Structure mutations เพื่อปิด race ระหว่างการเปลี่ยน Section และ Document route
- การจัดลำดับใช้เลข `sort_order` และ batch RPC แบบ transaction; M04 ไม่เพิ่ม Drag-and-drop
- Cache invalidation เกิดหลัง DB commit สำเร็จเท่านั้น; Draft Save ไม่ invalidate Public content
- Worker delete รับเฉพาะ signed operation ที่ระบุ exact `document_id` และรายการ Object keys ใต้ `docs/{document_id}/`; ไม่มี API สำหรับลบ prefix แบบอิสระ
- R2 batch delete ต้องทำแบบ idempotent เพื่อให้ Retry หลังการลบบางส่วนทำงานได้; DB metadata/document ถูกลบหลัง Worker ตอบสำเร็จเท่านั้น

## Delivery plan

### 1. Schema and database contracts

- [x] สร้าง Imperative migration ใหม่ด้วย Supabase CLI; ห้ามแก้ Production baseline, marker หรือ migration M01-M03 เดิม
- [x] เพิ่ม audit fields ที่ยังขาดใน `doc_documents` ได้แก่ `created_by` และ `updated_by`
- [x] เพิ่ม `document_id` ให้ `doc_route_redirects`, วาง FK/index และแผน backfill ที่ fail-closed สำหรับข้อมูลเดิม
- [x] เพิ่ม Docs-owned cleanup record ขั้นต่ำสำหรับ Uploaded object ที่ DB Save และ immediate R2 cleanup ล้มเหลว โดยไม่สร้าง Media Library
- [x] ตรวจ/เพิ่ม constraint และ index ตาม access pattern ของ document list, section order, status, redirect lookup และ cleanup retry
- [x] เพิ่ม audit/validation trigger เฉพาะ `doc_*`; ห้ามแก้ Legacy objects
- [x] รักษา RLS และ explicit privileges: Guest/non-admin อ่านได้เฉพาะ Public rows, Admin เท่านั้นที่เขียนได้
- [x] RPC/Function ทุกตัวใช้ fixed `search_path`, explicit `REVOKE/GRANT` และ `SECURITY INVOKER` เว้นแต่มีเหตุผลที่ตรวจสอบแล้วว่าต้องใช้ private helper

### 2. Atomic document RPCs

- [x] `doc_save_document(...)`: Validate Admin, lock route namespace, Create/Update document, ตรวจ Version, เปลี่ยนสถานะ, บันทึก Media metadata และ Route history ใน transaction เดียว
- [x] Create รับ UUID ที่ Server ตรวจรูปแบบแล้ว; หาก ID มีอยู่แล้วต้อง fail โดยไม่ Upsert
- [x] Update ใช้ `id + expected_version`; แยกผล Not found กับ Version conflict ให้ Server Action map เป็นข้อความที่ปลอดภัย
- [x] เพิ่ม `version` เพียงครั้งเดียวต่อ Save และตั้ง `updated_at`/`updated_by` ในฐานข้อมูล
- [x] ตั้ง `published_at` ด้วย `coalesce(published_at, now())` เฉพาะ transition เข้า Published
- [x] `doc_reorder_documents(...)`: ตรวจว่า IDs อยู่ Section ที่กำหนดครบ ไม่มีซ้ำ และอัปเดตทุกลำดับหรือไม่อัปเดตเลย
- [x] `doc_prepare_document_delete(...)`: ตรวจ Admin/Version, lock เอกสาร และคืน immutable delete manifest ของ Media โดยไม่ลบ DB
- [x] `doc_finalize_document_delete(...)`: ตรวจ manifest/version อีกครั้ง แล้วลบ Redirects, Media metadata และ Document ใน transaction เดียว
- [x] หาก Delete manifest เปลี่ยนเพราะ concurrent edit ให้หยุด finalize และแจ้ง Retry โดยไม่ลบ DB

### 3. Route history and collision guards

- [x] สร้าง helper คำนวณ canonical document path จาก Section tree ระดับไม่เกิน 2
- [x] Document slug ต้อง unique ภายใน Section และตรวจ Reserved slugs
- [x] Route ใหม่ห้ามชน current Section route, current Document route และ `doc_route_redirects.old_path`
- [x] เมื่อ Slug หรือ Section เปลี่ยน ให้บันทึก Route เดิมก่อนเปลี่ยนและผูกกับ Document เดิม
- [x] Redirect เดิมทั้งหมดของ Document resolve ไป canonical route ล่าสุดโดยตรง
- [x] ปฏิเสธ `old_path = current_path`, self-loop, redirect loop และ collision ภายใต้ advisory lock
- [x] Hard delete ลบ Redirects ของ Document พร้อม DB record; Route ที่ลบแล้วต้องไม่ Redirect ไป Section

### 4. Server-side document layer

- [x] เพิ่ม validation ของ Title, Slug, Excerpt, Section, Status, Sort order, Version, Tiptap JSON และ Media payload ที่ Trust boundary
- [x] ทุก Server Action เรียก `requireAdmin()` ภายใน Action เพราะ Action เรียกตรงผ่าน POST ได้
- [x] แยก user-safe error mapping สำหรับ Validation, Unique/collision, Version conflict, Missing row, R2 failure และ DB failure
- [x] เพิ่ม query functions สำหรับ Document list, Document detail, Section choices และ Delete preview โดยเลือกเฉพาะ column ที่จำเป็น
- [x] เพิ่ม cache tag/path contract สำหรับ Documents, Structure, Homepage และ canonical document path
- [x] Invalidate เฉพาะหลัง Save/Delete สำเร็จ; Published mutation ใช้ invalidation แบบทันทีที่ M05 นำไปใช้ต่อได้

### 5. Admin document UI

- [x] `/admin/documents`: รายการเอกสารเรียงตาม Section/`sort_order`, แสดง Status, Version และ Updated date
- [x] รองรับ filter อย่างน้อยตาม Section และ Status โดยไม่เพิ่ม Search admin ที่ Requirement ไม่ได้กำหนด
- [x] `/admin/documents/new`: ฟอร์มสร้างเอกสารพร้อม UUID ล่วงหน้าและ Editor state ที่ยังไม่บันทึก
- [x] `/admin/documents/[id]`: โหลด Document/Media/Version จริงและส่งเข้า Editor
- [x] ช่องข้อมูล: Title, Slug, Section, Excerpt, Status, Sort order และ Content
- [x] แสดงสถานะ Draft/Published/Archived ชัดเจน และแยกปุ่ม Save ออกจาก Preview
- [x] Delete dialog แสดงชื่อเอกสาร จำนวน/ชื่อไฟล์ และให้ยืนยันการลบถาวร
- [x] มี pending, success, field error, upload error, conflict และ retry states ที่อ่านได้ด้วย Screen reader
- [x] ตรวจ Keyboard order, visible focus, labels, dialog focus/escape และ Mobile 390px

### 6. Manual Save and upload pipeline

- [x] Dirty state เทียบกับ snapshot ล่าสุดที่โหลดหรือ Save สำเร็จ ไม่อิงเฉพาะ Editor transaction ล่าสุด
- [x] เตือนเมื่อ navigate ออกจาก Editor, Reload หรือปิด Tab ขณะ Dirty
- [x] Preview ใช้ current unsaved state และไม่เรียก Save/Publish
- [x] เมื่อกด Save: Validate metadata/content -> Upload Pending images -> แทน `blob:` ด้วย permanent URL/`mediaId` -> Validate persisted content -> เรียก atomic RPC
- [x] แสดง Progress/Error แยกต่อรูป และหาก Upload ใดล้มเหลวให้ยกเลิก DB Save
- [x] ถ้า Upload บางส่วนสำเร็จก่อนขั้นต่อมาล้มเหลว ให้เรียก Worker DELETE ทันที
- [x] ถ้า immediate cleanup ล้มเหลว ให้บันทึก cleanup record ขั้นต่ำพร้อม Object key/สาเหตุ โดยไม่เผย Secret หรือข้อมูลส่วนบุคคล
- [x] หลัง Save สำเร็จให้ revoke Blob URLs, ล้าง Pending state, เก็บ Version ใหม่ และ reset Dirty snapshot
- [x] Save Draft ไม่ Publish; Save Published invalidates Public contract; Save failure ไม่เปลี่ยน Public

### 7. Worker DELETE and hard-delete flow

- [x] เพิ่ม signed delete payload แยก operation จาก Upload ticket, มี expiry และ exact object list
- [x] Worker ตรวจ signature แบบ constant-time, จำกัด `docs/{document_id}/`, จำกัดจำนวน keys และไม่รับ arbitrary bucket/prefix
- [x] ใช้ R2 binding โดยตรงและ `await` delete ก่อนตอบ success; Structured log ต้องไม่มี Secret/ticket
- [x] DELETE ที่ Object หายไปแล้วถือว่าสำเร็จเพื่อรองรับ idempotent Retry
- [x] Hard delete sequence: โหลด delete manifest -> ขอ signed delete operation -> ลบ R2 -> finalize DB delete
- [x] หาก R2 ล้มเหลว ห้ามเรียก finalize; คง Document/Media metadata และแจ้งชื่อไฟล์/สาเหตุพร้อม Retry
- [x] หาก DB finalize ล้มเหลวหลัง R2 สำเร็จ ให้คง DB, แสดง Retry และให้ finalize ซ้ำได้โดยไม่ต้องมี Object อยู่แล้ว
- [x] Category deletion ใน M02 ยังคง fail-closed เมื่อพบ Media; orchestration ข้ามหลาย Documents อยู่ M06

### 8. Test matrix

#### Database / pgTAP

- [x] Guest และ non-admin เขียน Document/Redirect/Media/Cleanup record หรือเรียก mutation RPC ไม่ได้
- [x] Admin CRUD และ Reorder สำเร็จตาม RLS
- [x] Create Draft ไม่ Public และ Publish จึง Public เมื่อ Section/Parent เปิดเผย
- [x] ทดสอบทุก transition: Draft↔Published, Draft↔Archived และ Published↔Archived รวม Save สถานะเดิม
- [x] `published_at` ถูกตั้งครั้งแรกและไม่เปลี่ยนเมื่อ Republish
- [x] Version ตรง Save สำเร็จ; Version เก่าถูกปฏิเสธโดยข้อมูลเดิมไม่เปลี่ยน
- [x] RPC error หลังเริ่ม Save rollback Document, Redirect และ Media metadata ทั้งหมด
- [x] Duplicate slug ภายใน Section fail; slug เดียวกันคนละ Section pass
- [x] Current-route/redirect collision, self-loop และ chain attempt ถูกปฏิเสธ
- [x] Reorder payload ขาด/ซ้ำ/ข้าม Section rollback ทั้งชุด
- [x] Delete prepare/finalize ตรวจ Version/manifest และลบเฉพาะ Document เป้าหมาย

#### Unit / component

- [x] Input parser และ user-safe error mapping
- [x] Pending image replacement ไม่เหลือ `blob:` ใน persisted content
- [x] Upload ใดล้มเหลวแล้ว DB Save ไม่ถูกเรียก
- [x] Version conflict แสดง Reload path และไม่ reset Dirty state
- [x] Unsaved warning ทำงานกับ reload/close และ in-app navigation
- [x] Preview แสดง Unsaved content โดยไม่ Save
- [x] Save success reset snapshot/version; Save failure คง Editor state
- [x] Accessible labels, alerts, dialog focus และ keyboard controls

#### Worker

- [x] Reject invalid/expired/wrong-operation ticket, wrong Origin/route และ key นอก Document
- [x] Delete one/multiple keys สำเร็จและการลบซ้ำสำเร็จแบบ idempotent
- [x] Binding failure คืน safe error และไม่รายงาน success
- [x] Upload tests เดิมยังผ่าน

#### Local integration / browser

- [x] สอง Browser sessions เปิด Version เดียวกัน แล้ว session ที่สอง Save ถูก conflict
- [x] Create Draft, Preview Unsaved, Publish, Save Published, Archive และ Republish
- [x] เปลี่ยน Slug/Section แล้วตรวจ Redirect record/canonical target
- [x] Hard delete success และจำลอง R2 failure แล้ว Document ยังอยู่พร้อม Retry
- [x] Desktop และ Mobile 390px ไม่มี overflow/console error; Keyboard/Focus/Labels ผ่าน smoke

### 9. Verification commands

- [x] `npx supabase@latest --version` และเปิด `--help` ของคำสั่ง migration ที่จะใช้
- [x] `npx supabase@latest db reset`
- [x] `npm run test:db`
- [x] `npm run test:content`
- [x] `npm run test:worker`
- [x] `npx tsc --noEmit`
- [x] `npm run typecheck:worker`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npx supabase@latest db lint --local --schema public --level warning --fail-on error`
- [x] Supabase security/performance advisors และยืนยันว่าไม่มี warning ใหม่ของ `doc_*`
- [x] `npm audit --omit=dev`
- [x] Browser smoke ตาม matrix ด้านบน

## Acceptance

- [x] Draft Save ไม่ Publish; Published Save เปลี่ยน cache/public contract หลัง commit ภายในกรอบ 5 วินาที
- [x] Manual Save และ Preview Unsaved ทำงานแยกกัน พร้อม unsaved warning
- [x] Version ชนต้องหยุด Save และไม่เขียนทับ
- [x] ทุก status transition ให้ผล Published visibility และ `published_at` ถูกต้อง
- [x] Slug/Section change เก็บ Route เดิมและ resolve ไป canonical route ล่าสุดโดยไม่เกิด loop/chain
- [x] Hard delete ลบ R2 สำเร็จก่อน DB; R2 failure คงข้อมูลและให้ Retry
- [x] Upload สำเร็จแต่ DB Save ล้มเหลวมี immediate cleanup และไม่เกิด Orphan ที่ไม่มีสถานะติดตาม
- [x] Guest/non-admin/Admin ผ่าน authorization/RLS matrix
- [x] Tests, typecheck, lint, build, DB lint/advisors และ Browser smoke ที่เกี่ยวข้องผ่านจริง
- [x] Context/TODO อัปเดตตรงกับ implementation และไม่มี Secret/Test PII

## Explicit non-goals

- Public Homepage/Reader/Sidebar/TOC/SEO rendering — M05
- Remove-existing-image-before-save และ Cleanup retry orchestration เต็มรูปแบบ — M06
- Category cascade R2 deletion — M06
- Search และ `pg_trgm` — M07
- Autosave, Version history, Trash/Restore, Approval workflow, Scheduled publishing และ Media Library — ไม่อยู่ใน MVP

## Stop

ปิด Module แล้วตามการอนุมัติของภู; หยุดรอภูยืนยัน M05 ห้ามเริ่ม M05 เอง
