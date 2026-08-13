# M06 Media Lifecycle & Cleanup — Design Specification

**วันที่:** 13 สิงหาคม 2026

**สถานะ:** Design ได้รับอนุมัติจากภูแล้ว

**Requirement baseline:** [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)

**Module scope:** [M06 — Media Lifecycle & Cleanup](../../todo/M06-media-management.md)

## 1. เป้าหมาย

M06 ทำให้การนำรูปออกจาก Content, การลบเอกสาร, การลบหมวด และการล้างรูปใหม่ที่ Save ไม่สำเร็จเป็นกระบวนการแบบ fail-closed ที่ Retry ต่อได้ โดยไม่เพิ่ม Cron, Background queue หรือ Media Library

ผลลัพธ์ต้องครอบคลุม Media contract ที่ตกค้างจาก M04 ด้วย ได้แก่ Metadata รูป, Cleanup record ที่ค้าง, Delete manifest race และ UI สำหรับ Progress/Error/Retry ที่จำเป็นต่อ Acceptance ของ Media lifecycle

## 2. สิ่งที่ไม่ทำ

- ไม่สร้าง Media Library, Bucket browser หรือหน้า Admin สำหรับจัดการรูป Active ทั้งระบบ
- ไม่ใช้ Cron, Cloudflare Queues, Scheduled Worker หรือ Background retry
- ไม่สร้าง Audit log หรือเก็บประวัติ Operation ที่สำเร็จแล้ว
- ไม่เพิ่ม Trash/Restore, Soft delete หรือ Version history
- ไม่ซ่อนหรือ Archive Public content อัตโนมัติระหว่าง Media failure
- ไม่แก้ Legacy tables, constraints, indexes, functions หรือ RLS
- ไม่ Deploy App/Worker และไม่ Apply Staging/Production migration โดยไม่มีคำสั่งอนุมัติแยกจากภู

## 3. ช่องว่างของระบบปัจจุบัน

1. `doc_save_document()` เพิ่ม Media ใหม่ แต่ไม่ลบ `doc_media` และ R2 object เมื่อรูปเดิมถูกนำออกจาก Content
2. `saveDocument()` และ Client เรียก Cleanup รูปใหม่ซ้ำกัน และ Cleanup row อาจยังค้างหลัง R2 object ถูกลบแล้ว
3. `doc_delete_section()` ปฏิเสธ Category ที่มี Media แทนที่จะทำ R2-first cascade orchestration
4. Document delete เตรียม Manifest แต่ Finalize ตรวจเพียง Version จึงยังมี Race ระหว่าง External R2 call กับ Concurrent Save
5. Worker ส่ง MIME, byte size และ dimensions กลับมาแล้ว แต่ `doc_media` ยังไม่บันทึก Metadata เหล่านี้
6. Document delete ยังใช้ `window.confirm()` และไม่มีรายการชื่อรูป/Retry state ที่เข้าถึงได้
7. Upload progress callback ถูกละทิ้ง ทำให้ผู้ใช้ไม่เห็น Progress/Error แยกต่อรูปตาม Requirement
8. Worker คืนข้อความอัปโหลดเมื่อ DELETE ล้มเหลว ทำให้ Error ไม่ตรง Operation

## 4. Architecture ที่เลือก

ใช้ Durable prepared operation แบบ synchronous:

1. Server Action ตรวจ Admin และ Validate input
2. Prepare RPC ตรวจ Version/Ownership, ตรึง Documents และบันทึก Staged intent กับ Exact manifest
3. Server Action สร้าง Signed delete ticket แล้วเรียก Docs Media Worker
4. Worker ลบ Exact R2 keys ผ่าน Binding โดยตรง
5. Finalize RPC ตรวจ Operation เดิมและ Commit DB mutation
6. หากขั้นตอนภายนอกหรือ Finalize ขาดช่วง Operation ยังคงอยู่เพื่อ Resume ในครั้งถัดไป

Operation table เป็น Internal transient state ไม่ใช่ Media Library หรือ Audit history เมื่อ Finalize สำเร็จต้องลบ Operation และข้อมูลลูกทั้งหมดใน Transaction เดียวกัน

### 4.1 ข้อกำหนดร่วม

- ทุก Server Action เรียก `requireAdmin()` ภายใน เพราะ Server Actions เรียกตรงผ่าน POST ได้
- ไม่มี Mutation จาก Page GET; Auto retry ตอนเปิดหน้าเรียก Server Action จาก Client effect
- Database เป็นผู้คำนวณ/ยืนยัน Manifest ห้ามเชื่อรายการลบจาก Browser
- Prepare/Finalize ใช้ Shared transaction-level advisory lock ชุดเดียวกับ Structure/Document route mutations
- Lock หลาย Document ตาม UUID ascending เสมอเพื่อลด Deadlock
- External R2 call อยู่นอก Database transaction เพื่อไม่ถือ Lock ระหว่าง Network I/O
- Operation-document link ทำหน้าที่เป็น Persistent freeze ระหว่าง Prepare และ Finalize
- Finalize รับ `operation_id` และตรวจข้อมูลที่ Database เก็บไว้ ไม่รับ Manifest ใหม่จาก Client
- Cache invalidation เกิดหลัง Finalize สำเร็จเท่านั้น

## 5. Data model

สร้าง Imperative migration ใหม่โดยไม่แก้ Migration M01–M05

### 5.1 `doc_media_operations`

ตาราง Docs-owned สำหรับงาน Media ที่ยังไม่จบ:

- `id uuid primary key`
- `kind text not null` จำกัดค่า `save_remove`, `document_delete`, `section_delete`
- `document_id uuid null` อ้าง `doc_documents` แบบ `on delete restrict` สำหรับ Document-scoped operation
- `section_id uuid null` อ้าง `doc_sections` แบบ `on delete restrict` สำหรับ Section-scoped operation
- `staged_save jsonb null` มีเฉพาะ `save_remove` และเก็บ Save payload ที่ผ่าน validation แล้ว
- `attempt_count integer not null default 0`
- `last_attempt_at timestamptz null`
- `last_error text null` เป็นข้อความปลอดภัยสำหรับ Admin
- `created_by uuid not null default auth.uid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Check constraint บังคับ Target และ `staged_save` ให้ตรงกับ `kind` แถวมีอยู่หมายถึง Operation ยัง Pending; ไม่ต้องมี Completed status เพราะแถวต้องถูกลบเมื่อสำเร็จ

### 5.2 `doc_media_operation_documents`

เก็บ Document ที่ถูกตรึงกับ Operation:

- `operation_id uuid` อ้าง `doc_media_operations` แบบ `on delete cascade`
- `document_id uuid` อ้าง `doc_documents` แบบ `on delete restrict`
- `expected_version bigint not null`
- Primary key `(operation_id, document_id)`
- Unique `(document_id)` เพื่อให้หนึ่ง Document อยู่ใน Pending operation ได้เพียงงานเดียว

Save/Delete RPC ทุกตัวต้องตรวจว่า Document ไม่มีแถวในตารางนี้ เว้นแต่กำลัง Finalize Operation เจ้าของแถวนั้น

### 5.3 `doc_media_operation_items`

เก็บ Exact delete manifest:

- `operation_id uuid` อ้าง `doc_media_operations` แบบ `on delete cascade`
- `document_id uuid` อ้าง `doc_documents` แบบ `on delete restrict`
- `media_id uuid` อ้าง `doc_media` แบบ `on delete restrict`
- `object_key text not null`
- `display_label text not null`
- Primary key `(operation_id, media_id)`
- Unique `(operation_id, object_key)`

`display_label` ใช้ Alt text จาก Stored content เมื่อหาได้ และ fallback เป็น Basename ของ Object key ไม่เก็บชื่อไฟล์จากเครื่องผู้ใช้ใน Public media row

### 5.4 `doc_media_cleanup`

คงตารางเดิมเป็นแหล่งข้อมูลเดียวสำหรับ Uploaded object ที่ยังไม่มี Active `doc_media` row และ Immediate rollback ล้มเหลว โดย Rename `reason` เป็น `last_error` แล้วเพิ่ม:

- `display_label text not null`
- `attempt_count integer not null default 0`
- `last_attempt_at timestamptz null`
- `last_error text not null` ซึ่ง Rename มาจาก `reason`
- `claim_token uuid null`
- `claim_expires_at timestamptz null`

`document_id` ไม่มี Foreign key โดยตั้งใจ เพราะ Cleanup อาจเกิดจาก Create ที่ Document ไม่เคยถูกบันทึก

Cleanup claim RPC ใช้ `FOR UPDATE SKIP LOCKED`, claim token และ lease แบบสั้น เพื่อไม่ให้หลาย Admin page ประมวลผลแถวเดียวกันพร้อมกัน หาก Process หยุด Lease หมดอายุแล้ว Claim ใหม่ได้ การ Upsert ตาม `object_key` ต้องอัปเดต Error/เวลาอย่าง Atomic

### 5.5 `doc_media`

เพิ่ม Metadata ที่ Worker ตรวจแล้ว:

- `mime_type text not null` จำกัดเป็น `image/webp`
- `size_bytes bigint not null` มากกว่า 0 และไม่เกิน 10 MB
- `width integer not null` ช่วง 1–1920
- `height integer not null` ช่วง 1–1920

ลบ Boolean `cleanup_required` ที่ไม่ได้เป็นแหล่งข้อมูลที่ถูกต้องสำหรับ Orphan upload โดย Migration ต้องตรวจว่าข้อมูลเดิมไม่มีแถวที่ไม่สามารถเติม Metadata ได้ก่อนเปลี่ยนเป็น `not null` ปัจจุบัน Staging ไม่มี Docs media ค้างจาก M05 แต่ต้องตรวจซ้ำก่อน Apply Staging จริง

### 5.6 RLS, privileges และ indexes

- เปิด RLS บน Operation tables ทั้งหมด
- `anon` ไม่มี Grant และไม่มี Policy สำหรับ Operation/Cleanup
- `authenticated` ได้เฉพาะ Privilege ที่ RPC/หน้าจอ Admin จำเป็นต้องใช้ และทุก Policy ตรวจ `(select doc_private.doc_is_admin())`
- Mutation RPC เป็น `SECURITY INVOKER`, fixed `search_path`, explicit `REVOKE/GRANT`
- Index รองรับ Pending operation lookup, Cleanup claim order และ Document freeze โดยไม่สร้าง Index ที่ไม่มี Query รองรับ
- ไม่เพิ่ม FK หรือ Index ให้ Legacy objects

## 6. Lifecycle flows

### 6.1 Save ที่ไม่มีรูปเดิมถูกนำออก

1. Browser Upload รูปใหม่เมื่อผู้ใช้กด Save
2. Server ตรวจ Document input, persisted Tiptap JSON, New media metadata และ Object prefix
3. Database ตรวจว่า Media ID ใน Content ทุกตัวเป็น Existing media ของ Document นี้หรือ New media ใน Payload
4. Atomic save อัปเดต Document, Version และเพิ่ม New `doc_media` rows พร้อม Metadata
5. หาก Validation/Version/DB Save ล้มเหลวก่อนมี Prepared operation ให้ Immediate rollback รูปใหม่
6. หาก Immediate rollback ล้มเหลว ให้ Upsert `doc_media_cleanup`

Client ห้ามเรียก Cleanup ซ้ำหลัง Server Action จัดการแล้ว

### 6.2 Save ที่นำรูปเดิมออก

1. Browser Upload รูปใหม่และส่ง Full persisted content, expected Version และ New media metadata
2. Prepare RPC ตรวจ Admin, Version, Media ownership และคำนวณ Existing media ที่ Content ใหม่ไม่อ้างถึง
3. RPC สร้าง `save_remove` Operation, Document freeze, Staged normalized payload และ Exact delete items
4. Server ลบ Removed objects ผ่าน Worker
5. Finalize RPC ตรวจ Operation/freeze/version แล้วทำใน Transaction เดียว:
   - Update Document fields/content/status
   - เพิ่ม Version หนึ่งครั้ง
   - Insert New media metadata
   - Delete Removed media metadata
   - ลบ Operation
6. Server invalidate Admin/Public cache ตามสถานะที่ Finalize แล้ว

หาก R2 delete ล้มเหลว DB Document/Version/Content ยังไม่เปลี่ยน New uploads อยู่ใน Staged operation เพื่อใช้ต่อในการ Retry และไม่ถูกบันทึกเป็น Cleanup orphan

หาก R2 สำเร็จแต่ Process หรือ Finalize ขาดช่วง Operation ยังคงอยู่ การ Retry ลบ Exact keys ซ้ำแบบ Idempotent แล้ว Finalize Staged payload เดิม

### 6.3 Upload rollback cleanup

1. Immediate rollback สำเร็จ: ไม่สร้าง Cleanup row
2. Immediate rollback ล้มเหลว: Upsert Cleanup row พร้อม Safe error
3. Documents page และ Editor เรียก Bounded cleanup retry หนึ่งครั้งตอนเปิดผ่าน Server Action
4. Save เรียก Retry สำหรับ Cleanup ของ Document นั้นก่อนเริ่ม Media mutation ใหม่
5. Claim RPC คืนไม่เกิน 100 แถวต่อครั้ง
6. ลบ R2 สำเร็จ: Finalize cleanup ลบแถวตาม Claim token
7. ล้มเหลว: เพิ่ม Attempt, บันทึก Error และปล่อย Claim ให้ Retry ภายหลัง

Cleanup retry เป็น Best effort และไม่ขวาง Save ที่ไม่มี Media mutation

### 6.4 Hard-delete Document

1. Accessible dialog แสดงชื่อ Document, จำนวน/ชื่อรูป และ Hard-delete warning
2. Prepare RPC ตรวจ Version สร้าง `document_delete` Operation และตรึง Document
3. Server ลบ Exact manifest จาก R2
4. Finalize RPC ลบ Operation links/items ก่อน แล้วลบ Media metadata, Redirect history และ Document ใน Transaction เดียว
5. R2 failure คง Document/DB metadata และ Pending operation พร้อม Retry

ระหว่าง Pending delete Document ถูก Save/Delete ซ้อนไม่ได้ แต่ Public status ไม่ถูกเปลี่ยน

### 6.5 Category cascade deletion

1. Preview แสดงจำนวนหมวดย่อย รายชื่อเอกสาร และจำนวนรูป
2. ผู้ใช้พิมพ์ชื่อหมวดเพื่อยืนยัน
3. Prepare RPC ใช้ Shared advisory lock, Snapshot subtree, Lock Documents ตาม UUID และสร้าง `section_delete` Operation เดียว
4. Server Group items ตาม `document_id` เพราะ Ticket ผูกกับ Document และแบ่ง Batch ไม่เกิน 1,000 keys
5. เมื่อทุก Batch สำเร็จ Finalize RPC ลบ Operation links/items, Redirects, Media, Documents และ Sections ใน Transaction เดียว
6. หาก Batch ใดล้มเหลว DB subtree ยังอยู่ Operation เดิมใช้ Retry ต่อ และ Batch ที่สำเร็จแล้วส่งซ้ำได้อย่างปลอดภัย

ไม่มีการ Archive/Hide อัตโนมัติ และไม่มี Cancel หลัง Prepare เพราะอาจมี R2 object บางส่วนถูกลบแล้ว

## 7. Distributed failure boundary

PostgreSQL และ R2 ไม่มี Transaction ร่วมกัน จึงรับประกัน Atomicity ข้ามระบบไม่ได้ โดยเฉพาะ Category ที่ต้องลบหลาย Batch หาก Batch แรกสำเร็จและ Batch ถัดไปล้มเหลว DB จะยังคงอยู่ แต่รูปที่ลบสำเร็จแล้วอาจตอบ 404 จนกว่า Retry จะลบส่วนที่เหลือและ Finalize DB

Design ลดผลกระทบด้วย Persistent freeze, Exact manifest, Idempotent delete, Staged Save payload และ Retry ที่ Resume ได้ ห้ามรายงานว่ารูปทั้งหมดคงอยู่เมื่อ R2 operation เริ่มทำงานแล้ว UI ต้องแจ้งให้ Retry งานเดิมทันที

## 8. Application boundaries

### 8.1 Pure media/content utilities

สร้าง `src/lib/media/content-media.ts` สำหรับ:

- เดิน Tiptap JSON เพื่อเก็บ `mediaId` และ Alt text
- ตรวจ Duplicate/malformed media references
- สร้าง Display label
- เปรียบเทียบ Retained/Removed/New media

Module นี้ไม่มี Network/Database dependency และมี Unit tests โดยตรง

### 8.2 Server lifecycle orchestrator

สร้าง Server-only Module `src/lib/media/lifecycle.ts` สำหรับ:

- เรียก Prepare/Finalize/Failure RPC
- Group/Batch exact keys
- สร้าง Signed delete ticket
- เรียก Worker และแปลง Response เป็น Safe result
- Resume Pending operation
- Claim/finalize Cleanup

`documents/actions.ts` และ `structure/actions.ts` ทำหน้าที่ Auth/Input boundary, เรียก Orchestrator และ Invalidate cache เท่านั้น

### 8.3 Worker contract

Delete ticket ต้องผูก:

- `operation: "delete"`
- `operationId`
- `operationType`
- `documentId`
- Exact unique `objectKeys`
- `expiresAt`

Worker ตรวจ HMAC แบบ Constant-time, อายุไม่เกิน 5 นาที, UUID, Operation type, Document prefix, จำนวน 1–1,000 keys และ Duplicate keys ก่อนเรียก R2 binding

DELETE success คืนจำนวน keys ที่รับ; Missing object ถือว่าสำเร็จ Error handler ใช้ข้อความลบรูปที่ปลอดภัยแยกจาก Upload error Structured log มี Operation type/ID, path, key count และ Safe error class แต่ไม่มี Ticket, Secret หรือ Raw payload

## 9. Admin UX และ Accessibility

### 9.1 Document editor

- แสดงรายการรูปใหม่พร้อม `ready`, `uploading`, progress percent และ `error`
- Error แยกต่อรูปและไม่ล้าง Editor state
- Pending operation banner แสดง Operation type, ชื่อไฟล์ที่ล้มเหลว และปุ่ม “ลองอีกครั้ง”
- ปิด Save/Delete ซ้อนขณะมี Operation แต่ Preview unsaved editor state ยังใช้ได้
- Retry success Refresh Document, Version, permanent URLs และ Dirty snapshot

### 9.2 Delete dialogs

- แทน `window.confirm()` ด้วย Dialog component ที่มี Focus trap, Escape และคืน Focus
- Document dialog แสดงจำนวน/ชื่อรูป, Hard-delete และ No restore
- Section dialog คง Child/document summary และเพิ่ม Pending batch/error state
- Error ใช้ `role="alert"`; Progress ใช้ `role="status"` หรือ `aria-live`
- Disabled state มีข้อความอธิบาย ไม่พึ่งสีอย่างเดียว
- Touch target อย่างน้อย 44px บน Mobile

### 9.3 Cleanup banner

- Documents page แสดง Banner แบบย่อเมื่อยังมี Orphan cleanup
- แสดงจำนวน, Object basename และ Retry action
- ไม่แสดง Active media ทั้งระบบและไม่เปิด Bucket listing

## 10. Error model และ Retry policy

User-safe error categories:

- Validation/media ownership
- Version conflict
- Pending operation conflict
- Worker configuration/connectivity
- R2 delete failure
- Database prepare/finalize failure
- Missing target

Error response ต้องมีข้อความแก้ไขได้, Display labels ของ Batch ที่เกี่ยวข้อง และ Retry availability โดยไม่เปิดเผย SQL, Stack trace, Ticket, Secret หรือ Credential

Retry policy:

- Auto retry หนึ่งครั้งเมื่อเปิดหน้าที่เกี่ยวข้อง
- Retry เพิ่มเติมเกิดจากปุ่มหรือ Save ครั้งถัดไป
- ไม่มี Automatic loop
- Operation delete ใช้ Exact manifest เดิมจนสำเร็จ
- Operation ที่เริ่มแล้วไม่มี Cancel
- Cleanup claim ที่หมด Lease กลับมา Claim ใหม่ได้

## 11. Cache behavior

- Prepare, Retry failure และ Cleanup-only success ไม่ Invalidate Public content
- Finalized Published save, Document delete และ Section delete เรียก `revalidatePublicDocs()` หลัง DB commit
- Admin list/detail paths ถูก Revalidate หลัง Finalize
- Draft-only save ไม่ทำให้ข้อมูล Draft เปิดเผย Public
- Save failure และ Pending operation ไม่เปลี่ยน Public cache contract

## 12. Test strategy

### 12.1 Database/pgTAP

- Guest/non-admin อ่านหรือ Mutate Operation/Cleanup ไม่ได้
- Admin Prepare/Finalize ได้ตาม kind
- Stale Version ถูกปฏิเสธก่อนเกิด Operation
- Pending operation ป้องกัน Save/Delete ซ้อน
- Cross-document Media ID และ Object key ถูกปฏิเสธ
- Finalize ใช้ Stored manifest และ Staged payload เท่านั้น
- Save Finalize เปลี่ยน Content/Media/Version ทั้งหมดหรือไม่เปลี่ยนเลย
- Document/Section Finalize ลบข้อมูลทั้งหมดหรือไม่ลบเลย
- Multiple-document locks ใช้ลำดับคงที่
- Cleanup claim/failure/success และ Lease expiry ถูกต้อง
- Guest/non-admin/Admin RLS regression เดิมผ่าน

### 12.2 Unit/component

- Tiptap media extraction ทุกตำแหน่งที่รองรับ
- Duplicate/malformed/cross-document references
- Retained/removed/new comparison
- 1,000-key batching
- Safe error mapping
- Per-image progress/error
- Pending-operation disabled states
- Retry success/failure state preservation
- Dialog Focus/Escape/return focus
- Cleanup banner state

### 12.3 Worker

- Invalid/expired/wrong-operation ticket
- Wrong Operation ID/type/Document prefix
- Duplicate/empty/over-1,000 keys
- Idempotent single/multiple delete
- R2 binding failure returns Safe delete error
- Structured logs omit Ticket/Secret
- Existing Upload/GET tests remain green

### 12.4 Integration/failure paths

- Remove existing image: R2 failure leaves Content/Version unchanged
- R2 success then Finalize interruption resumes on next open
- Upload rollback failure creates Cleanup and later clears it
- Version conflict rolls back New uploads or records Cleanup
- Document delete failure keeps Document/DB metadata
- Category Batch 1 success and Batch 2 failure resumes to completion
- Concurrent Save is rejected while Operation is pending
- Cache invalidation occurs only after Finalize

### 12.5 Manual verification

- Desktop และ Mobile 390px
- Keyboard-only, Focus order, Dialog focus trap, Escape และ Screen-reader labels
- Upload progress, Remove image, Retry, Document delete และ Category cascade
- Public content remains unchanged on failure and updates after Finalize
- No console error or horizontal overflow

## 13. Verification และ rollout

Local verification อย่างน้อย:

- Supabase CLI version/help ก่อนสร้าง Migration
- `npx supabase@latest db reset`
- `npm run test:db`
- `npm run test:content`
- `npm run test:worker`
- App TypeScript check
- `npm run typecheck:worker`
- `npm run lint`
- `npm run build`
- `npm run cf:build`
- Local DB lint และ Security/Performance advisors
- `npm audit --omit=dev`

ใช้ Wrangler help ก่อนคำสั่งที่เกี่ยวข้อง และตรวจ Worker config/type generation ตาม Version ที่ติดตั้ง

M06 implementation รอบแรกอนุญาตเฉพาะ Local build/test และ Local R2 simulation ไม่ Push Staging migration, ไม่ Deploy Worker/App และไม่แตะ Production จนกว่าภูจะอนุมัติแยก

## 14. Documentation updates

เมื่อ Implementation ดำเนินการแล้วให้อัปเดต:

- `docs/todo/M06-media-management.md` หลังจบแต่ละงานย่อย
- `TODO.md` เมื่อสถานะ Module เปลี่ยน
- `docs/context/media-storage.md` สำหรับ Lifecycle/Retry contract
- `docs/context/database.md` สำหรับ Operation/Cleanup schema boundary
- `docs/context/testing-and-commands.md` เฉพาะคำสั่งที่รันจริงและผลจริง
- `context.md` เฉพาะเมื่อ Architecture หรือสถานะ Current work เปลี่ยน

## 15. Acceptance และ Definition of Done

M06 ปิดได้เมื่อ:

1. การนำรูปเดิมออกลบ R2 สำเร็จก่อน Commit Content ใหม่
2. R2 failure ไม่ Commit Content/Document/Section deletion
3. Save/Delete operation Resume ได้หลัง Network/Process interruption
4. Upload rollback failure ถูกติดตามและ Retry ได้
5. Category cascade ลบรูปก่อน Database records และ Retry partial batches ได้
6. รูปหนึ่งเป็นของ Document เดียวและ Cross-document reference ถูกปฏิเสธ
7. ผู้ใช้เห็นชื่อไฟล์, Safe cause และ Retry path
8. ไม่มี Cron, Queue หรือ Media Library
9. Success/failure/concurrency/RLS/Accessibility tests ที่เกี่ยวข้องผ่านจริง
10. Code, Context, Module status และ Requirement ตรงกัน
11. สรุปไฟล์ที่เปลี่ยน, Tests, ข้อจำกัด และหยุดรอภูอนุมัติ M07

## 16. เอกสารภายนอกที่ใช้ยืนยัน Design

- [Cloudflare R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
