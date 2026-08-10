# เอกสารความต้องการระบบ (System Requirements)

## ระบบ Documentation สำหรับ Poolvilla

**เวอร์ชัน:** 1.1 (ขอบเขต MVP)  
**วันที่:** 10 สิงหาคม 2026  
**สถานะ:** รออนุมัติ  
**ผู้รับผิดชอบ:** ทีม Poolvilla

## 1. วัตถุประสงค์

กำหนดความต้องการด้านฟังก์ชัน ข้อมูล ความปลอดภัย และการทำงานของระบบ Documentation สำหรับ Poolvilla เพื่อใช้เป็นเอกสารอ้างอิงก่อนออกแบบหน้าจอ สร้างฐานข้อมูล และเริ่มพัฒนา

## 2. ภาพรวมระบบ

ระบบเป็นเว็บไซต์เอกสารแนว Mintlify มีหน้าอ่านเอกสารสาธารณะที่รองรับมือถือ และหน้าผู้ดูแลระบบสำหรับจัดการเนื้อหา เอกสารจัดเป็นลำดับชั้นของหมวดหมู่และบทความ ผู้ดูแลเขียนด้วย Tiptap และสามารถวางข้อความ รูปภาพ วิดีโอ YouTube ตาราง Code block และ Callout ไว้ตำแหน่งใดก็ได้ในบทความ

สถาปัตยกรรมหลัก: Next.js + TypeScript, Supabase สำหรับ Auth/PostgreSQL/RLS และใช้ Cloudflare Image Storage เดิมสำหรับสื่อรูปภาพ

## 3. เป้าหมายและขอบเขต

### 3.1 เป้าหมาย

- ให้ผู้ใช้ค้นหา อ่าน และนำทางคู่มือ Poolvilla ได้ง่ายบนทุกขนาดหน้าจอ
- อนุญาตเฉพาะผู้ใช้ที่มี `role_id` ตามที่กำหนดให้จัดการเอกสารได้
- ใช้ Supabase project และ Cloudflare Image Storage เดิม
- รองรับวงจรเนื้อหาที่ปลอดภัย: ร่าง, ดูตัวอย่าง, เผยแพร่, เก็บถาวร

### 3.2 สิ่งที่รวมใน MVP

- หน้าแรก, Navigation, หน้าอ่านเอกสาร, Table of Contents, Search และ Previous/Next
- หมวดหมู่แบบลำดับชั้น (ข้อมูลรองรับหลายระดับ แต่ UI MVP จัดการ 2 ระดับ)
- จัดการหมวดหมู่ เอกสาร ลำดับ Slug สถานะ และ Preview ใน Admin
- Tiptap editor: ข้อความ หัวข้อ List Link Table Code block Callout รูป และ YouTube
- Media Library สำหรับดู ค้นหา ใช้ซ้ำ และจัดการรูปภาพ รวมถึงตรวจสอบ/ล้างรูปที่ไม่ถูกใช้งานอย่างปลอดภัย
- Supabase Auth, ตรวจสอบ Role และ Row Level Security (RLS)

### 3.3 สิ่งที่ไม่รวมใน MVP

- ประวัติการแก้ไขและการกู้คืนเวอร์ชัน
- การทำงานร่วมกัน, คอมเมนต์, ขั้นตอนอนุมัติ, เผยแพร่ตามเวลา
- Search ภายนอก, Dashboard Analytics, หลายภาษา และ Public API

## 4. ผู้ใช้และสิทธิ์

| บทบาท | อ่านเอกสารสาธารณะ | เข้า Admin | แก้ไขข้อมูล |
|---|:---:|:---:|:---:|
| ผู้เยี่ยมชม | ได้ เฉพาะที่เผยแพร่ | ไม่ได้ | ไม่ได้ |
| ผู้ใช้ที่เข้าสู่ระบบแต่ไม่มีสิทธิ์ | ได้ เฉพาะที่เผยแพร่ | ไม่ได้ | ไม่ได้ |
| ผู้ดูแล Docs | ได้ | ได้ | ได้ |
| System service | ไม่เกี่ยวข้อง | ไม่เกี่ยวข้อง | เฉพาะงานฝั่ง Server |

ให้กำหนด `DOC_ADMIN_ROLE_IDS` เป็นแหล่งอ้างอิงเดียวของ `role_id` ที่เข้าจัดการ Docs ได้ โดยต้องยืนยันค่าจริงจากระบบหลักก่อนเริ่มพัฒนา

## 5. Functional Requirements

### 5.1 หน้าสาธารณะ

| ID | ความต้องการ | ระดับ |
|---|---|---|
| FR-01 | ผู้เยี่ยมชมเห็นเฉพาะเอกสารที่เผยแพร่และอยู่ในหมวดที่แสดงผล | Must |
| FR-02 | หน้าแรกมีทางเข้าการค้นหาและหมวดเอกสารที่เลือกมาแสดง | Must |
| FR-03 | Sidebar แสดงหมวดและเอกสารตามลำดับที่ผู้ดูแลกำหนด | Must |
| FR-04 | หน้าเอกสารแสดงชื่อ เนื้อหา วันที่แก้ไขล่าสุด TOC และ Previous/Next เมื่อมี | Must |
| FR-05 | สร้าง TOC จาก Heading H2 และ H3 ในเนื้อหา | Must |
| FR-06 | ค้นหาจากชื่อ บทสรุป และข้อความในเนื้อหาได้ | Must |
| FR-07 | แสดงรูปจาก Cloudflare พร้อม alt text ที่ผู้เขียนระบุ | Must |
| FR-08 | แสดง YouTube Embed ตำแหน่งเดียวกับที่ผู้เขียนวางในเนื้อหา | Must |

### 5.2 สิทธิ์ Admin

| ID | ความต้องการ | ระดับ |
|---|---|---|
| FR-09 | ต้องเข้าสู่ระบบก่อนเข้าถึง `/admin` | Must |
| FR-10 | ระบบตรวจสอบบทบาทที่อนุญาตก่อนแสดงฟังก์ชันผู้ดูแล | Must |
| FR-11 | Supabase RLS ต้องบังคับสิทธิ์ที่ฐานข้อมูลแยกจากการเช็ก UI | Must |
| FR-12 | ผู้ไม่มีสิทธิ์อ่าน Draft/Archived ผ่าน API ไม่ได้ | Must |

### 5.3 จัดการหมวดหมู่

| ID | ความต้องการ | ระดับ |
|---|---|---|
| FR-13 | ผู้ดูแลสร้าง เปลี่ยนชื่อ ใส่คำอธิบาย ซ่อน/แสดง จัดลำดับ และลบหมวดได้ | Must |
| FR-14 | ผู้ดูแลสร้างหมวดหมู่ย่อยได้ | Must |
| FR-15 | ข้อมูลใช้ `parent_id` แบบ Recursive; UI MVP แสดง/จัดการ 2 ระดับ | Must |
| FR-16 | ลบหมวดไม่ได้หากยังมีหมวดลูกหรือเอกสาร จนกว่าจะย้ายหรือลบเนื้อหา | Must |

### 5.4 จัดการเอกสาร

| ID | ความต้องการ | ระดับ |
|---|---|---|
| FR-17 | ผู้ดูแลสร้าง แก้ไข Preview Publish กลับเป็น Draft Archive จัดลำดับ ย้าย และลบเอกสารได้ | Must |
| FR-18 | เอกสารมีสถานะ `draft`, `published`, `archived` | Must |
| FR-19 | เมื่อ Publish ให้บันทึก `published_at`; เอกสารที่ไม่ Published ห้ามเข้าถึงจากสาธารณะ | Must |
| FR-20 | เอกสารมี title, section, slug, excerpt (ถ้ามี), Tiptap content และ sort order | Must |
| FR-21 | ตรวจสอบ Slug และป้องกัน URL สาธารณะซ้ำ | Must |
| FR-22 | Preview ใช้ได้เฉพาะผู้ดูแล และใช้รูปแบบ Viewer เดียวกับหน้าสาธารณะ | Must |

### 5.5 Editor และสื่อ

| ID | ความต้องการ | ระดับ |
|---|---|---|
| FR-23 | เก็บเนื้อหาเป็น Tiptap JSON ที่ผ่าน Schema validation | Must |
| FR-24 | รองรับ Heading, Paragraph, Bold, Italic, Underline, List, Link, Table, Code, Quote, Divider, Callout, Image และ YouTube | Must |
| FR-25 | มี Toolbar และ Slash Command เพื่อเลือก Block ที่รองรับ | Should |
| FR-26 | Editor และ Viewer ใช้รูปแบบ Node ชุดเดียวกัน ยกเว้นปุ่มควบคุมการแก้ไข | Must |
| FR-27 | Upload รูปผ่าน Server endpoint ที่ตรวจสิทธิ์และส่งกลับ Cloudflare URL/Image ID | Must |
| FR-28 | ตรวจสอบ URL YouTube และใส่วิดีโอได้หลายรายการทุกตำแหน่งในบทความ | Must |
| FR-29 | ผู้ดูแลดูรายการ ค้นหา และใช้รูปจาก Media Library ซ้ำในหลายเอกสารได้ | Must |
| FR-30 | ระบบแสดงข้อมูลรูปอย่างน้อย: ตัวอย่างรูป, ชื่อไฟล์, URL/Image ID, ขนาดไฟล์, วันที่อัปโหลด และผู้อัปโหลด | Must |
| FR-31 | ระบบตรวจสอบจำนวนเอกสารที่อ้างอิงรูปแต่ละรายการได้ | Must |
| FR-32 | ลบรูปได้เฉพาะเมื่อไม่มีเอกสารอ้างอิง หรือผู้ดูแลยืนยันการลบหลังระบบแจ้งผลกระทบ | Must |
| FR-33 | ผู้ดูแลดูรายการรูปที่ไม่มีเอกสารอ้างอิงและล้างเป็นรายรายการหรือหลายรายการได้ | Must |
| FR-34 | การล้างรูปต้องลบข้อมูลอ้างอิงในระบบและไฟล์จาก Cloudflare อย่างสอดคล้องกัน หรือบันทึกสถานะ failed เพื่อให้ลองใหม่ได้ | Must |

## 6. Route

| ส่วน | Route | หน้าที่ |
|---|---|---|
| หน้าแรก | `/` | จุดเริ่มต้นค้นหาและเลือกเอกสาร |
| ค้นหา | `/search` | ค้นหาเอกสารที่เผยแพร่ |
| หน้าเอกสาร | `/[...slug]` | แสดงเอกสารตามเส้นทางแบบลำดับชั้น |
| ภาพรวม Admin | `/admin` | สถานะเอกสารและรายการที่แก้ไขล่าสุด |
| จัดการเอกสาร | `/admin/documents` | ค้นหา กรอง และจัดการเอกสาร |
| สร้างเอกสาร | `/admin/documents/new` | สร้างเอกสารใหม่ |
| แก้ไขเอกสาร | `/admin/documents/[id]/edit` | แก้ไข Preview และ Publish |
| โครงสร้าง | `/admin/structure` | จัดการ Tree และลำดับหมวด |

## 7. ความต้องการข้อมูล

### 7.1 `doc_sections`

| Field | Type | กติกา |
|---|---|---|
| id | UUID | Primary key |
| parent_id | UUID, nullable | อ้างถึง `doc_sections.id`; เป็น null สำหรับหมวดบนสุด |
| name | text | ต้องมี |
| slug | text | ต้องมีและใช้ใน URL ได้ |
| description | text, nullable | คำอธิบายเสริม |
| sort_order | integer | กำหนดลำดับของรายการระดับเดียวกัน |
| is_published | boolean | ควบคุมการแสดงผลสาธารณะ |
| created_by / updated_by | UUID | ID ผู้ใช้ระบบเดิม |
| created_at / updated_at | timestamptz | เวลาที่จัดการโดย Server |

### 7.2 `documents`

| Field | Type | กติกา |
|---|---|---|
| id | UUID | Primary key |
| section_id | UUID | อ้างถึง `doc_sections.id` |
| title | text | ต้องมี |
| slug | text | ต้องมีและไม่ซ้ำในเส้นทางสาธารณะ |
| excerpt | text, nullable | คำเกริ่นสำหรับผลค้นหา |
| content | JSONB | Tiptap JSON ที่ถูกต้อง |
| search_text | text | Plain text ที่สกัดเพื่อค้นหา |
| status | text/enum | `draft`, `published`, `archived` |
| sort_order | integer | ลำดับในหมวด |
| created_by / updated_by | UUID | ID ผู้ใช้ระบบเดิม |
| published_at | timestamptz, nullable | บันทึกเมื่อเผยแพร่ |
| created_at / updated_at | timestamptz | เวลาที่จัดการโดย Server |

## 8. Business Rules

- เอกสารจะเป็นสาธารณะได้เมื่อมีสถานะ Published และทุกหมวดในเส้นทางสามารถแสดงผลได้
- ห้ามเปิดเผยเนื้อหา Draft หรือ Archived ผ่าน URL ตรง
- ใช้ `sort_order` เพื่อกำหนดลำดับที่แน่นอนของหมวดและเอกสารระดับเดียวกัน
- Slug ต้องเป็นตัวพิมพ์เล็ก ใช้ใน URL ได้ และไม่ว่าง; หัวข้อไทยสามารถกำหนด slug เองหรือใช้คำทับศัพท์
- ตรวจ Tiptap schema ก่อนบันทึกและก่อนแสดงผล ห้าม Render HTML ที่ไม่น่าเชื่อถือโดยตรง
- ใน JSON เก็บเฉพาะ Cloudflare URL/Image ID และ alt text ไม่เก็บไฟล์ใน Supabase
- Cloudflare credential สำหรับ upload ต้องอยู่ฝั่ง Server เท่านั้น
- ก่อนลบรูป ระบบต้องตรวจการอ้างอิงจาก Tiptap JSON ที่บันทึกไว้ทั้งหมด
- งานล้างรูปที่ไม่ได้ใช้ต้องเป็นการกระทำของผู้ดูแล และต้องมีรายการผลลัพธ์ที่สำเร็จ/ไม่สำเร็จ

## 9. ความปลอดภัย

- เปิด RLS สำหรับทุกตารางใหม่ที่เข้าถึงผ่าน Supabase Data API
- Policy สาธารณะ `SELECT` ได้เฉพาะเอกสาร Published และเส้นทางหมวดที่มองเห็นได้
- การเขียนข้อมูลและการอ่านข้อมูลที่ไม่สาธารณะ ต้องเป็นผู้ใช้ที่ `role_id` อยู่ใน `DOC_ADMIN_ROLE_IDS`
- Role lookup ต้องไม่เปิดโอกาสให้ผู้ใช้ยกระดับสิทธิ์ของตนเอง
- ห้ามส่ง Supabase service-role key หรือ Cloudflare upload credential ไปยัง Client
- ป้องกัน Admin route ฝั่ง Server และย้ำด้วย RLS
- ตรวจชนิด ขนาด และมิติของไฟล์รูป รวมถึง Origin ที่อนุญาตของ YouTube
- เก็บ actor id และเวลาอย่างน้อยสำหรับการเปลี่ยนแปลงโดยผู้ดูแล

## 10. Search

- MVP ใช้ PostgreSQL Full-text Search จาก `title`, `excerpt`, และ `search_text`
- สกัด `search_text` จาก Tiptap JSON เมื่อบันทึกหรือ Publish
- ผลค้นหาแสดงเฉพาะเอกสาร Published ที่สาธารณะเข้าถึงได้ พร้อมชื่อ บทสรุป และเส้นทางหมวด
- ไม่ค้นหา JSONB โดยตรงเป็นวิธีหลัก

## 11. Non-functional Requirements

| ID | ความต้องการ |
|---|---|
| NFR-01 | หน้า Public รองรับ mobile, tablet และ desktop |
| NFR-02 | URL สาธารณะแชร์ได้ คงที่ และเหมาะกับ SEO |
| NFR-03 | รองรับภาษาไทยใน heading, search และ slug ที่ผู้ดูแลกำหนด |
| NFR-04 | หน้าอ่านเอกสารใช้ server rendering หรือ static regeneration ตามรูปแบบ deployment |
| NFR-05 | ใช้ความสามารถด้าน optimisation/delivery ของ Cloudflare เท่าที่ storage เดิมรองรับ |
| NFR-06 | ข้อผิดพลาดใน Admin และ upload อธิบายให้แก้ได้ โดยไม่เปิดเผย credential หรือรายละเอียดภายใน |
| NFR-07 | รองรับ accessibility ขั้นพื้นฐาน: semantic heading, keyboard, focus state, label และ alt text |

## 12. เกณฑ์ยอมรับ MVP

1. ผู้เยี่ยมชมเปิดและค้นหาได้เฉพาะคู่มือ Published
2. ผู้ไม่มีสิทธิ์เข้า Admin หรือแก้ข้อมูลผ่าน Supabase ไม่ได้
3. ผู้ดูแลสร้าง Draft ใส่ข้อความ รูป Callout และ YouTube หลายรายการ แล้ว Preview/Publish ได้
4. หน้าที่ Publish แสดงเนื้อหาและรูปแบบเดียวกับ Preview
5. ผู้ดูแลสร้างหมวดหลัก หมวดย่อย เอกสาร และจัดลำดับได้; Sidebar ต้องตรงตามลำดับนั้น
6. Draft/Archived ไม่ปรากฏใน Navigation, Search หรือ URL สาธารณะ
7. รูปอัปโหลดผ่าน Cloudflare service เดิม และ URL ถูกเก็บใน Document JSON
8. Search หาเอกสาร Published เจอจากคำใน title, excerpt หรือเนื้อหา
9. ผู้ดูแลค้นหารูปจาก Media Library ใช้รูปเดิมในเอกสาร และเห็นจำนวนการอ้างอิงได้
10. ระบบไม่อนุญาตให้ลบรูปที่ยังถูกอ้างอิงโดยไม่ยืนยัน และล้างรูปที่ไม่มีการอ้างอิงได้

## 13. สิ่งที่ต้องยืนยันก่อนพัฒนา

| หัวข้อ | คำตอบที่ต้องการ | ผลกระทบ |
|---|---|---|
| สิทธิ์ผู้ดูแล | `role_id` ใดจัดการ Docs ได้ | RLS และ Route guard |
| ตารางผู้ใช้ | ตาราง/view ใดมี `role_id` และเชื่อมกับ `auth.users` อย่างไร | RLS |
| Cloudflare Storage | Cloudflare Images, R2 หรือ Custom upload API | Upload endpoint และ URL |
| Public domain | ยืนยัน domain/subdomain เช่น `docs.poolvilla.co.th` | Routing, Cookie, SEO |
| กติกา Slug | ไม่ซ้ำทั้งระบบ หรือไม่ซ้ำเฉพาะในเส้นทางหมวด | Constraint และ Route lookup |
| การลบ | Hard delete, Soft delete หรือ Archive only | Data retention และ UI |
| Thai Search | ความคาดหวังเรื่องตัดคำไทย | PostgreSQL search configuration |

## 14. แนวทางการพัฒนาแบบแยก Module

ไม่พัฒนาทุก Module พร้อมกัน แต่ทำให้จบเป็นส่วน ๆ โดยแต่ละ Module ต้องมี Migration/Policy, UI, Test และเกณฑ์ยอมรับของตัวเองก่อนเริ่มส่วนถัดไป

| ลำดับ | Module | ผลลัพธ์ที่ต้องจบในรอบนั้น |
|---|---|---|
| M01 | Foundation & Authorization | เชื่อม Supabase, role mapping, Admin route guard, RLS และ schema หลัก |
| M02 | Structure Management | CRUD หมวดหลัก/ย่อย, ลำดับ และกติกาการลบ |
| M03 | Document Management | CRUD เอกสาร, Draft/Publish/Archive, Slug, Preview และลำดับ |
| M04 | Public Documentation | หน้าอ่าน, Sidebar, TOC, Previous/Next และการซ่อนเนื้อหาที่ไม่ Published |
| M05 | Editor & Media Upload | Tiptap, การตรวจ schema, Upload Cloudflare และ YouTube embed |
| M06 | Media Library & Cleanup | รายการ/ค้นหารูป, ใช้ซ้ำ, ตรวจการอ้างอิง และล้างรูปที่ไม่ใช้ |
| M07 | Search & Hardening | Full-text search, Accessibility, Security test และทดสอบเกณฑ์ยอมรับรวม |

ก่อนขึ้น Module ใหม่ ให้ทดสอบ acceptance criteria ของ Module ก่อนหน้าและแก้ defect ที่เป็น blocker ให้จบก่อน
