# เอกสารความต้องการระบบ (System Requirements)

## ระบบ Documentation สำหรับ Poolvilla

**เวอร์ชัน:** 1.2 (ขอบเขต MVP)  
**วันที่:** 10 สิงหาคม 2026  
**สถานะ:** Requirement baseline ยืนยันแล้ว; M01–M06 ปิดงานพร้อมหลักฐาน Local/Staging รวม migration `20260813150200` ที่ apply/verify Staging แล้ว; M07 ยังไม่เริ่มและไม่มี Production action
**ผู้รับผิดชอบ:** ทีม Poolvilla

## 1. วัตถุประสงค์

เอกสารนี้เป็นแหล่งอ้างอิงหลักสำหรับกำหนดขอบเขต พฤติกรรม ข้อมูล ความปลอดภัย และลำดับการพัฒนาระบบ Documentation ของ Poolvilla ก่อนเริ่มลงมือพัฒนาแต่ละ Module

ระบบต้องเป็นเว็บไซต์เอกสารแนว Mintlify/Next.js Docs มีหน้า Public สำหรับอ่านและค้นหาเอกสาร และหน้า Admin สำหรับจัดการโครงสร้าง เนื้อหา และการเผยแพร่

## 2. เป้าหมายและขอบเขต

### 2.1 เป้าหมาย

- ผู้ใช้ค้นหา อ่าน และนำทางคู่มือ Poolvilla ได้ง่ายบนมือถือ Tablet และ Desktop
- ผู้ดูแลสร้างและแก้ไขเอกสารด้วย Tiptap โดยรองรับเนื้อหาที่จำเป็นต่อคู่มือจริง
- ป้องกันการเขียนทับข้อมูลของผู้ดูแลคนอื่นและป้องกันไฟล์รูปตกค้าง
- ใช้ Supabase และ Cloudflare แยกหน้าที่อย่างชัดเจน โดยไม่กระทบระบบเก่าที่ใช้งานอยู่
- พัฒนาและตรวจรับทีละ Module ไม่เปิดงานทุก Module พร้อมกัน

### 2.2 สิ่งที่รวมใน MVP

- หน้าแนะนำอัตโนมัติ หน้าอ่านเอกสาร Sidebar, Table of Contents, Previous/Next และ Search
- หมวดหลักและหมวดย่อยรวมสูงสุด 2 ระดับ
- จัดการหมวด เอกสาร ลำดับ Slug, Redirect, Draft, Published, Archived และ Preview
- Tiptap Editor พร้อม Toolbar และ Slash Command
- Paragraph, Heading, List, Link, Code block, Callout, Image และ YouTube Embed
- อัปโหลดรูปด้วยปุ่ม Upload และวางรูปจาก Clipboard
- จัดการวงจรชีวิตรูปตามเอกสาร โดยไม่มี Media Library
- Supabase Auth, PostgreSQL, Docs-only RLS และ `pg_trgm` Search
- SEO สำหรับเอกสาร Published และ Accessibility ระดับ WCAG 2.2 AA

### 2.3 สิ่งที่ไม่รวมใน MVP

- ประวัติเวอร์ชัน การกู้คืนเวอร์ชัน หรือ Audit log แบบแยก
- Trash/Restore, Soft delete หรือการกู้คืนรายการที่ลบถาวร
- Media Library, การใช้รูปซ้ำข้ามเอกสาร หรือหน้า Admin สำหรับสแกนไฟล์
- Collaboration แบบ Real-time, Comment, Approval workflow และ Scheduled publishing
- Homepage Editor, Featured content ที่เลือกเอง, Analytics dashboard, หลายภาษา และ Public API

## 3. สถาปัตยกรรมและ Environment

### 3.1 Technology Stack

| ส่วน | เทคโนโลยี/บริการ | หน้าที่ |
|---|---|---|
| Web Application | Next.js + TypeScript | Public site, Admin และ Server-side operations |
| Rich Text Editor | Tiptap | สร้างและแก้ไขเนื้อหาเป็น JSON |
| Database/Auth | Supabase | Auth, PostgreSQL, RLS และ Search |
| Image Storage | Cloudflare R2 | จัดเก็บและส่งรูปเอกสาร |
| Docs Media API | Cloudflare Worker แยก | Upload/Delete เฉพาะไฟล์ใต้ `docs/` |

### 3.2 Production ที่ตรวจสอบแล้ว

- Supabase Production project ref คือ `rqizfiayvcbozlzuvbok`
- ระบบเก่าเชื่อม Auth ด้วย `public.users.uid = auth.users.id`
- Role อยู่ที่ `public.users.role_id` และอ้างถึง `public.roles.id`
- Cloudflare ใช้ R2 bucket เดิมชื่อ `webook-media`
- Docs ต้องใช้ Worker และ Secret แยกจาก Worker ของระบบ `webook`
- Docs Worker เข้าถึงได้เฉพาะ Object key prefix `docs/`
- รูปใช้รูปแบบ key `docs/{document_id}/{image_name}`
- ห้ามแก้หรือ Deploy Worker เดิมของระบบ `webook` เพื่อรองรับ Docs

### 3.3 Domain และ Environment Isolation

- Public Production: `https://docs.poolvilla.co.th`
- Admin Production: `https://docs.poolvilla.co.th/admin`
- Docs Media Worker ใช้ Subdomain แยกซึ่งกำหนดตอนตั้ง Environment
- Staging และ Production ต้องแยก Cloudflare Account และ Supabase Project
- ต้องแยก Database, Auth, R2 Bucket, Worker, Domain และ Secrets ทั้งหมด
- Staging ใช้ Schema ที่จำเป็นและบัญชีทดสอบ ห้ามคัดลอกข้อมูลผู้ใช้จริงจาก Production
- ห้ามใช้ Production credential ใน Staging หรือ Client
- หลังจบแต่ละ Module ให้ Build/Test ในเครื่องเท่านั้น จนกว่าภูจะสั่ง Deploy โดยตรง

## 4. ผู้ใช้ การยืนยันตัวตน และสิทธิ์

| บทบาท | Public Published | Admin | เขียนข้อมูล Docs |
|---|:---:|:---:|:---:|
| Guest | ได้ | ไม่ได้ | ไม่ได้ |
| Authenticated แต่ไม่มีสิทธิ์ | ได้ | ไม่ได้ | ไม่ได้ |
| Docs Administrator | ได้ | ได้ | ได้ |

### 4.1 กติกาสิทธิ์ Admin

- อนุญาตเฉพาะผู้ใช้ที่มีอย่างน้อยหนึ่งแถวใน `public.users` ซึ่ง `uid = auth.uid()` และ `role_id = 1`
- ใช้การตรวจแบบ `EXISTS`; ไม่บังคับว่า `users.uid` ต้องมีเพียงแถวเดียว เพราะ Production มีบัญชีที่ตั้งใจให้เป็น Administrator แต่มีข้อมูลซ้ำจากระบบเก่า
- Route guard ฝั่ง Server และ RLS ต้องตรวจสิทธิ์แยกกัน
- ห้ามใช้ `user_metadata` เป็นแหล่งตัดสินสิทธิ์
- ห้ามส่ง Supabase Secret/Service Role หรือ Cloudflare credential ไป Client

### 4.2 การแยกระบบ Docs ออกจากระบบเก่า

- สร้างเฉพาะตาราง ฟังก์ชัน Policy, Index และ Migration ที่เป็นของ Docs โดยใช้ชื่อ `doc_*`
- อ่าน `public.users` เพื่อเชื่อม Auth และตรวจ `role_id = 1` เท่านั้น
- ห้ามแก้ตาราง `public.users`, `public.roles` รวมถึง Constraint, Trigger, Function หรือ RLS เดิม
- ห้ามแก้ Schema/Policy ของตารางระบบเก่าเพื่อแก้ปัญหา Docs
- การเปลี่ยนระบบเก่าต้องมีการ Audit และขออนุมัติเป็นงานแยก

## 5. Information Architecture, Route และ Slug

### 5.1 โครงสร้าง

- รองรับสูงสุด 2 ระดับ: `หมวดหลัก > หมวดย่อย > เอกสาร`
- เอกสารสามารถอยู่ในหมวดหลักหรือหมวดย่อยได้
- Sidebar และ Previous/Next ใช้ `sort_order` ที่ผู้ดูแลกำหนด

### 5.2 URL และ Slug

- URL ใช้เส้นทางตามโครงสร้าง เช่น `/agency/getting-started/login`
- Slug ของหมวดต้องไม่ซ้ำเฉพาะภายใต้ Parent เดียวกัน
- Slug ของเอกสารต้องไม่ซ้ำเฉพาะภายในหมวดเดียวกัน
- อนุญาตให้ใช้ Slug เดียวกันในคนละหมวด
- สงวน Slug ของระบบ เช่น `admin`, `api`, `search`, `login`, `_next` และรายการที่ระบบเพิ่มภายหลัง
- ตรวจการชนกันทั้ง Route ปัจจุบันและ Route ที่เก็บไว้สำหรับ Redirect

### 5.3 Redirect และหน้าที่ไม่เผยแพร่

- เมื่อเปลี่ยน Slug หรือย้ายหมวด ต้องเก็บ Route เดิมและ Redirect แบบถาวรไป Route ใหม่
- ต้องป้องกัน Redirect loop และ Redirect chain ที่ไม่จำเป็น
- Draft, Archived และเอกสารที่ลบถาวรต้องตอบเป็นหน้า 404 โดยไม่ Redirect ไปหมวด

## 6. หน้า Public และ SEO

### 6.1 Homepage อัตโนมัติ

- Hero ใช้ข้อความและชื่อระบบที่กำหนดไว้ใน Code
- มี Search และปุ่ม “เริ่มต้นใช้งาน” ซึ่งเปิดเอกสาร Published รายการแรกตาม `sort_order`
- สร้างการ์ดจากหมวดหลักที่มีเอกสาร Published โดยอัตโนมัติ
- แสดงเอกสารแรก 3-5 รายการต่อการ์ด
- แสดงส่วน “อัปเดตล่าสุด” จาก `updated_at`
- ไม่มี Homepage Editor หรือ `is_featured`
- การเปลี่ยน Structure/Publish ต้องสะท้อนหน้า Public ภายใน 5 วินาทีหลัง Save สำเร็จ

### 6.2 หน้าเอกสาร

- แสดง Title, Excerpt เมื่อมี, เนื้อหา, Updated date, TOC และ Previous/Next
- TOC สร้างจาก Heading H2 และ H3
- แสดงเฉพาะเอกสาร Published ที่อยู่ในโครงสร้าง Public
- Search, Navigation และ Homepage ต้องไม่แสดง Draft/Archived

### 6.3 SEO

- สร้าง `sitemap.xml` และ Canonical URL จากเอกสาร Published
- `/admin`, Preview และเนื้อหาที่ไม่เผยแพร่ต้องเป็น `noindex`
- `noindex` ไม่ใช้แทน Authentication หรือ Authorization

## 7. Document Lifecycle และ Editor

### 7.1 สถานะเอกสาร

- `draft`: Save ได้แต่ไม่แสดง Public/Search จนกด Publish
- `published`: เมื่อกด Save แล้ว Public ต้องเปลี่ยนตามทันทีภายใน 5 วินาที
- `archived`: ซ่อนจาก Public/Search แต่ยังเก็บข้อมูลและรูปไว้
- ไม่มี Version history, Approval workflow หรือ Autosave

### 7.2 การ Save และ Preview

- บันทึกเมื่อผู้ใช้กดปุ่ม Save เท่านั้น
- เตือนเมื่อออกจากหน้า Reload หรือปิด Tab ขณะที่มีการแก้ไขที่ยังไม่ Save
- Preview แสดง State ปัจจุบันใน Editor รวม Unsaved changes โดยไม่ Save/Publish และเปิดได้เฉพาะ Admin
- ถ้า Save ล้มเหลว Public ต้องคงเนื้อหาเดิม
- Save ของเอกสาร Published เปลี่ยน Public ทันทีโดยไม่มี Draft snapshot แยก

### 7.3 ป้องกันการเขียนทับ

- เอกสารมี `version` หรือค่าที่เทียบเท่าเพื่อทำ Optimistic locking
- Save ต้องส่ง Version ที่โหลดมาตอนเปิดหน้า
- หากฐานข้อมูลถูกแก้หลังจากเปิดหน้า ต้องหยุด Save และแจ้งให้ Reload ก่อน
- ห้ามใช้ Last-write-wins

### 7.4 Tiptap Content

- เก็บ Content เป็น Tiptap JSONB ที่ผ่าน Schema validation
- รองรับ Paragraph, Heading, List, Link, Code block, Callout, Image และ YouTube
- มี Toolbar และ Slash Command ที่ใช้งานด้วย Keyboard ได้
- Editor และ Viewer ใช้ Node styling และ validation ชุดเดียวกัน
- ไม่รองรับ Raw HTML
- Link อนุญาตเฉพาะ `https://`, `http://` และ `mailto:`
- ปฏิเสธ `javascript:`, `data:` และ URL ที่เสี่ยงต่อการฝัง Script
- YouTube รับเฉพาะ `youtube.com` และ `youtu.be` แล้วแสดงผ่าน `youtube-nocookie.com`
- ไม่อนุญาตให้วาง iframe หรือ HTML จากแหล่งอื่น

## 8. Media Lifecycle & Cleanup

### 8.1 Ownership และขอบเขต

- รูปหนึ่งเป็นของเอกสารเดียวและห้ามใช้ซ้ำข้ามเอกสาร
- ไม่มี Media Library หรือหน้า Admin สำหรับสแกน/จัดการรูปทั้งหมด
- Supabase เก็บ Metadata และ URL/Object key; ไฟล์จริงอยู่ใน Cloudflare R2

### 8.2 การเพิ่มรูป

- รองรับ Upload button และวางรูปจาก Clipboard ด้วย Ctrl/Cmd+V
- ทั้งสองวิธีต้องใช้ Flow เดียวกัน
- ก่อน Save ให้เก็บรูปชั่วคราวใน Browser และแสดง Preview ทันที
- อัปโหลดขึ้น R2 เฉพาะตอนกด Save
- หากออกจากหน้าโดยไม่ Save ให้ทิ้งรูปชั่วคราวใน Browser
- รองรับ JPG, PNG และ WebP ขนาดไม่เกิน 10 MB ต่อไฟล์
- จำกัดด้านยาวไม่เกิน 1920 px และแปลงผลลัพธ์เป็น WebP
- ไม่รองรับ GIF และ SVG
- แสดง Progress และข้อผิดพลาดแยกต่อรูป
- หากมีรูปใด Upload ไม่สำเร็จให้ยกเลิก Save ทั้งรายการ

### 8.3 การนำรูปออกจากเอกสาร

- เมื่อกด Save หลังนำรูปเดิมออก ต้องลบรูปนั้นจาก R2 ให้สำเร็จก่อนบันทึก Content ใหม่
- หากลบ R2 ไม่สำเร็จ ให้ยกเลิก Save คงเอกสารและรูปเดิมไว้ และแสดงชื่อรูปพร้อมปุ่ม “ลองอีกครั้ง”
- ไม่ต้องมี Cron, Background retry หรือ Media management UI สำหรับกรณีนี้

### 8.4 รูปใหม่เมื่อ Save ล้มเหลว

- หาก Upload รูปใหม่ขึ้น R2 สำเร็จ แต่ Save ฐานข้อมูลล้มเหลว ให้ลบรูปใหม่นั้นทันที
- หากล้างรูปใหม่ไม่สำเร็จ ให้บันทึกสถานะ `cleanup_required`
- Retry การล้างเมื่อ Admin เปิดหรือ Save เอกสารนั้นครั้งถัดไป
- ไม่ต้องมี Media Library, Cron หรือการแจ้งเตือนตามเวลา

### 8.5 การลบเอกสาร

- เป็น Hard delete และไม่มี Restore
- ต้องลบรูปทั้งหมดของเอกสารจาก R2 ให้สำเร็จก่อน จึงลบเอกสารและข้อมูลเกี่ยวข้องจากฐานข้อมูล
- หากมีรูปใดลบไม่สำเร็จ ให้คงเอกสารไว้ แสดงสาเหตุอย่างชัดเจน และให้ Retry

### 8.6 การลบหมวด

- อนุญาตให้ลบหมวดพร้อมหมวดย่อย เอกสาร และรูปทั้งหมดภายใน
- Dialog ต้องแสดงจำนวนหมวดย่อย รายชื่อเอกสาร และให้พิมพ์ชื่อหมวดเพื่อยืนยัน
- ใช้กฎลบรูปจาก R2 ก่อนลบข้อมูลเช่นเดียวกับการลบเอกสาร
- หากลบไม่สำเร็จ ให้คงหมวดและเอกสารไว้ พร้อมแจ้งข้อผิดพลาดและให้ Retry
- ห้ามซ่อนจาก Public อัตโนมัติ ผู้ดูแลต้อง Archive เองหากต้องการซ่อนระหว่างแก้ปัญหา

## 9. Search

- ใช้ PostgreSQL extension `pg_trgm`
- ติดตั้งและสร้าง Index เฉพาะตาราง Docs ห้ามเพิ่ม Index หรือแก้ Search ของระบบเก่า
- `search_text` ประกอบด้วย Title, Excerpt และ Plain text ที่สกัดจาก Tiptap JSON
- ใช้ GIN trigram index บนข้อมูล Docs ที่เหมาะสม
- แสดงผลเฉพาะเอกสาร Published
- รองรับคำไทยบางส่วนและการพิมพ์คลาดเคลื่อนในระดับใกล้เคียง
- ผลลัพธ์แสดง Title, Excerpt และเส้นทางหมวด

## 10. Data Model ระดับ Requirement

### 10.1 `doc_sections`

| Field | แนวทาง | กติกาหลัก |
|---|---|---|
| `id` | UUID | Primary key |
| `parent_id` | UUID nullable | อ้างถึงหมวดหลัก; ลึกได้สูงสุด 2 ระดับ |
| `name`, `slug` | Text | Required; Slug unique ภายใต้ Parent |
| `description` | Text nullable | คำอธิบายหมวด |
| `sort_order` | Integer | ลำดับใน Parent เดียวกัน |
| `is_published` | Boolean | ควบคุมการแสดง Public |
| Metadata | UUID/timestamptz | `created_by`, `updated_by`, `created_at`, `updated_at` |

### 10.2 `doc_documents`

| Field | แนวทาง | กติกาหลัก |
|---|---|---|
| `id`, `section_id` | UUID | Primary key และหมวดเจ้าของ |
| `title`, `slug` | Text | Required; Slug unique ภายในหมวด |
| `excerpt` | Text nullable | ใช้หน้า Public/Search |
| `content` | JSONB | Tiptap JSON ที่ผ่าน validation |
| `search_text` | Text | Plain text สำหรับ `pg_trgm` |
| `status` | Text/Enum | `draft`, `published`, `archived` |
| `version` | Integer | Optimistic locking |
| `sort_order` | Integer | ลำดับในหมวด |
| `published_at` | Timestamptz nullable | เวลาที่ Publish ครั้งแรก/ตามกติกาที่ออกแบบ |
| Metadata | UUID/timestamptz | `created_by`, `updated_by`, `created_at`, `updated_at` |

### 10.3 `doc_media`

| Field | แนวทาง | กติกาหลัก |
|---|---|---|
| `id`, `document_id` | UUID | รูปต้องมีเอกสารเจ้าของเดียว |
| `object_key`, `url` | Text | อยู่ใต้ `docs/{document_id}/` |
| `mime_type`, `size_bytes` | Text/Bigint | Metadata หลังตรวจไฟล์ |
| `width`, `height` | Integer | มิติหลังแปลงรูป |
| `status` | Text/Enum | เช่น `active`, `cleanup_required` |
| Metadata | UUID/timestamptz | ผู้อัปโหลดและเวลา |

### 10.4 `doc_route_redirects`

| Field | แนวทาง | กติกาหลัก |
|---|---|---|
| `old_path` | Text | Unique; ห้ามชน Route ปัจจุบัน/Reserved route |
| `document_id` | UUID | เอกสารปลายทาง |
| `created_at` | Timestamptz | เวลาสร้างประวัติ |

หมายเหตุ: ชื่อ Column, Enum, Constraint และ Index ขั้นสุดท้ายต้องออกแบบใน M01/M02 และตรวจด้วย Migration review ก่อนใช้งานจริง

## 11. Security Requirements

- ตาราง `doc_*` ที่เปิดผ่าน Supabase Data API ต้องเปิด RLS
- Public อ่านได้เฉพาะข้อมูล Published ที่อนุญาต
- Admin read/write ต้องผ่าน Auth และเงื่อนไข Role ที่ยืนยันแล้ว
- UPDATE policy ต้องมีทั้งเงื่อนไขอ่านแถวเดิมและตรวจค่าหลังแก้ไข
- หลีกเลี่ยง `SECURITY DEFINER`; หากจำเป็นต้องใช้ ต้องอยู่ใน Schema ที่ไม่เปิด Public จำกัดสิทธิ์ Execute และตรวจ `auth.uid()` ภายใน
- Validate Tiptap schema, URL, Slug, YouTube source, File type, File size และ Image dimension ที่ Server
- Worker credential และ Database secret อยู่ฝั่ง Server เท่านั้น
- Error ที่ส่งให้ผู้ใช้ต้องอธิบายสิ่งที่แก้ได้โดยไม่เปิดเผย Credential, SQL หรือรายละเอียดระบบภายใน
- เก็บเฉพาะ Metadata ปกติ `created_by`, `updated_by`, `created_at`, `updated_at`; ไม่สร้าง Audit log แยก

## 12. Non-functional Requirements

### 12.1 Performance และ Capacity Baseline

| รายการ | เป้าหมาย |
|---|---|
| Public LCP | ไม่เกิน 2.5 วินาทีที่ p75 บน Mobile |
| Search response | ไม่เกิน 1 วินาทีที่ p95 |
| Public document server response | ไม่เกิน 1 วินาทีที่ p95 ไม่รวมโหลดรูป |
| Save ที่ไม่มีรูปใหม่ | ไม่เกิน 2 วินาทีที่ p95 |
| Public/Search หลัง Save Published | เห็นข้อมูลใหม่ภายใน 5 วินาที |
| จำนวนเอกสารอ้างอิง | 5,000 เอกสาร |
| Admin พร้อมกัน | 10 คน |
| Public visitors พร้อมกัน | 500 คน |
| รูปรวมอ้างอิง | 100,000 รูป |

### 12.2 Accessibility และ Browser

- Public และ Admin ต้องผ่านหลัก WCAG 2.2 AA
- รองรับ Keyboard, Focus, Contrast, Label, Alt text และ Heading hierarchy
- Dialog, Toolbar และ Slash Command ต้องใช้งานกับ Screen reader ได้
- รองรับ 2 เวอร์ชันล่าสุดของ Chrome, Edge, Firefox, Safari macOS, Safari iOS และ Chrome Android
- ไม่รองรับ Internet Explorer

## 13. Deployment, Migration และ Recovery

- ทุก Schema change และ Deployment ต้องทดสอบผ่าน Staging ก่อน
- Production ต้องได้รับคำสั่งยืนยันจากภูแยกทุกครั้ง
- ห้ามรัน Production Migration หรือ Deployment อัตโนมัติ
- ก่อน Production Migration ต้องตรวจว่ามี Backup ล่าสุดและแผนย้อนกลับที่ทำได้จริง
- Migration ของ Docs ต้องไม่แก้ Object ของระบบเก่านอกขอบเขต `doc_*`
- Secrets ของ Staging และ Production ต้องแยกกันและห้าม Commit ลง Repository

## 14. ลำดับพัฒนาแบบแยก Module

| ลำดับ | Module | ผลลัพธ์หลัก |
|---|---|---|
| M01 | Foundation, Supabase Auth & Docs-only RLS | Environment, Auth guard, Docs schema/RLS baseline และการแยกระบบเก่า |
| M02 | Structure Management | หมวด 2 ระดับ, ลำดับ, Slug, Route collision และการลบหมวด |
| M03 | Editor Core & Docs Media Worker/R2 | Tiptap, Preview state, Upload/Paste, Image validation และ Docs Worker |
| M04 | Document Management & Publish Workflow | CRUD, Save, Optimistic locking, Draft/Publish/Archive, Redirect และ Hard delete |
| M05 | Public Documentation | Homepage อัตโนมัติ, Reader, Sidebar, TOC, Previous/Next และ SEO |
| M06 | Media Lifecycle & Cleanup | Delete-before-save, Delete-before-document, Cleanup rollback และ Retry แบบ minimal |
| M07 | pg_trgm Search, Performance & Security Hardening | Search, Index, NFR test, Accessibility, Browser และ Security verification |

### 14.1 กติกาการทำงานแต่ละ Module

- ทำทีละ Module และมีได้เพียง Module เดียวที่กำลังพัฒนา
- Module ต้องผ่าน Acceptance criteria และแก้ Blocker ก่อนปิดงาน
- อัปเดต `TODO.md` และไฟล์ `docs/todo/Mxx-*.md` หลังจบแต่ละงานย่อย
- อัปเดต `context.md` และไฟล์ `docs/context/` เมื่อโครงสร้างหรือการตัดสินใจเปลี่ยน
- หลังจบ Module ให้หยุด สรุปผล รายการไฟล์ Tests และประเด็นค้าง
- รอภูยืนยันก่อนเริ่ม Module ถัดไป
- ห้าม Deploy Staging/Production จนกว่าภูจะสั่งโดยตรง

## 15. Acceptance Criteria ระดับ MVP

1. Guest อ่าน ค้นหา และ Navigate ได้เฉพาะเอกสาร Published
2. ผู้ไม่มี `role_id = 1` เข้า Admin หรือเขียนข้อมูล Docs ผ่าน API/RLS ไม่ได้
3. ระบบอ่าน Role จากระบบเก่าได้โดยไม่แก้ตาราง/Policy เดิม
4. Admin สร้าง Draft, Preview Unsaved changes, Publish และ Save เอกสาร Published ได้ตามกติกา
5. Concurrent edit ที่ Version ไม่ตรงต้องถูกปฏิเสธโดยไม่เขียนทับข้อมูล
6. Upload และ Paste รูปใช้ Flow เดียวกัน และไฟล์ไม่ขึ้น R2 ก่อนกด Save
7. การลบรูปออกจาก Content ต้องลบ R2 สำเร็จก่อน Save
8. การลบเอกสาร/หมวดต้องลบรูปสำเร็จก่อนลบข้อมูล และแจ้ง Retry เมื่อไม่สำเร็จ
9. Slug ซ้ำได้เฉพาะคนละหมวด และ Route เดิม Redirect ถาวรหลังย้าย/เปลี่ยน Slug
10. Homepage, Navigation, Search, Sitemap และ Canonical แสดงเฉพาะ Published
11. `pg_trgm` ค้นหา Title, Excerpt และ Plain content ภาษาไทยแบบบางส่วนได้
12. Staging/Production แยก Account, Project, Data และ Secrets โดย Production เปลี่ยนได้เมื่อได้รับอนุมัติเท่านั้น

## 16. Definition of Done ระดับเอกสาร

- Requirement v1.2 เป็นแหล่งอ้างอิงหลักและไม่มีรายการรอยืนยันก่อนเริ่ม M01
- `context.md` ชี้ไปยัง Context ย่อยโดยไม่ทำข้อมูลจริงซ้ำหลายแห่ง
- `TODO.md` ระบุสถานะปัจจุบันและ Module ที่รอเริ่ม
- แต่ละ Module มี TODO และ Acceptance criteria ของตนเอง
- เอกสาร Context/TODO ห้ามมี Password, Token, Secret หรือ Credential
- เมื่อ Code กับเอกสารไม่ตรง ให้หยุดและแก้เอกสารหรือ Code ให้ตรงก่อนปิดงาน
