# คู่มือ WeBooks

ภูอนุมัติให้เขียน ตรวจ และเผยแพร่คู่มือใน Docs Production เมื่อ 15 กันยายน 2026

## ขอบเขต

16 บท ภายใต้หมวดคู่มือ WeBooks และหมวดย่อย 6 หมวด: เริ่มต้นใช้งาน, บ้านพัก, โฆษณา, ใบเสนอราคาและข้อมูลลูกค้า, ผู้ใช้, แก้ปัญหา

เนื้อหาอยู่ใน `catalogue.mjs` ไม่มีข้อมูลลูกค้า ชื่อบุคคล ราคาเฉพาะบ้าน บัญชีรับเงิน หรือรหัสผ่าน ภาพประกอบเป็นภาพหน้าจอจริงที่ครอป/ปิดข้อมูลแล้ว ใช้ชื่อเมนูจากเว็บที่เปิดและตรวจพฤติกรรมเพิ่มเติมจาก repo `C:/Users/chaym/Projects/webook` โดยไม่เปลี่ยนข้อมูลในระบบ webook

## แหล่งตรวจสอบ

- Live UI: บ้านพักและเมนูจัดการ, ข้อมูลบ้าน, ราคาพื้นฐาน, สร้างโฆษณา, สร้างใบเสนอราคาและเมนูตั้งค่าเอกสาร
- `app/admin/houses/[propertyId]/page.tsx`, `components/admin/houses/house-list.tsx`, `server/services/houses.ts`
- `components/admin/images/image-zone-viewer.tsx`, `cover-select-viewer.tsx`, `server/services/images.ts`
- `components/admin/advertisements/advertisement-form.tsx`, `docs/advertisement-management.md`
- `components/admin/quotations/quotation-editor.tsx`, `quotation-layout-editor.tsx`, `company-profile-form.tsx`, `customers/customer-form.tsx`
- `app/admin/quotations/page.tsx`, `app/admin/quotations/settings/company/page.tsx`, `docs/quotation-management.md`
- `supabase/migrations/20260806103000_quotation_security_hardening.sql` สำหรับลิงก์ที่สร้าง/รีเซ็ตอายุ 30 วัน
- `components/admin/user-manager/user-manager-page.tsx`, `components/admin/user-management/user-edit-form.tsx`, `lib/webook-users.ts`, `server/auth/admin.ts`, `docs/mobile-navigation.md`

เอกสาร quotation เดิมบางย่อหน้าล้าสมัย: toolbar ปัจจุบันใช้ ตั้งค่าเอกสาร / เผยแพร่ / ส่งออก และมีการจัดการเลเอาท์แล้ว จึงใช้ source และ Live UI ปัจจุบันเป็นหลัก

## ตรวจและเผยแพร่

`node docs/manuals/webook/prepare.mjs` แปลงเนื้อหาเป็น Tiptap JSON และตรวจด้วย validator ของแอป สร้าง SQL และ manifest ใต้ `.wrangler/manuals/webook/` ซึ่งไม่ติด Git

- `staging-check.sql` ทดลอง insert พร้อมตรวจจำนวนแล้ว rollback ใน transaction เดียว
- `publish.sql` เพิ่มเฉพาะ `doc_sections` และ `doc_documents` ชุดใหม่ ไม่มีการแก้ schema/legacy/media หรือเขียนทับเนื้อหาเดิม หากพบหมวด root `webook` จะหยุด
- นี่เป็น content import ที่ภูอนุมัติ ไม่ใช่ migration ไม่มีการปลอมตัวผู้เขียน; audit actor ใช้ค่า default ของบริบทนำเข้า
- Production target: `rqizfiayvcbozlzuvbok`; Staging target: `sxvkhzhqtrpxgzumsswl`
- หลังเผยแพร่ต้องเปิด URL ทุกบทและตรวจ Public Search ไม่ถือว่า SQL สำเร็จเพียงอย่างเดียวเป็นงานเสร็จ

## สถานะ

เผยแพร่ Production แล้วเมื่อ 15 กันยายน 2026: 16 บท ใน 7 หมวดรวมหมวดหลัก

- ตัวตรวจเนื้อหาผ่านครบ 16 บท
- ทดลองนำเข้า Staging ครบ 16 บทและ rollback สำเร็จ ตรวจหมวดทดสอบคงเหลือ 0
- Production import สำเร็จครบ 16 บท โดยไม่เขียนทับเอกสารเดิม
- ตรวจ URL ทุกบท: HTTP 200 และพบชื่อบทตรงกันครบ 16/16
- Public Search: ราคาพื้นฐาน, ใบเสนอราคา, ผู้ใช้เว็บไซต์ ตอบ HTTP 200 และพบผลลัพธ์ทุกคำ
- ตรวจหน้าบทเริ่มต้นผ่าน browser: เนื้อหา รายการลำดับ หมวดด้านซ้าย และสารบัญหัวข้อแสดงจริง
- งานนี้เปลี่ยนเฉพาะเนื้อหาและเครื่องมือเตรียมเนื้อหา ไม่ได้แก้หรือ deploy ตัวแอป webook

เปิดคู่มือ: https://docs-pool-villa.poolvilla.workers.dev/webook/start/getting-started

## ภาพประกอบ — เผยแพร่แล้ว 15 กันยายน 2026

ภูอนุมัติภาพหน้าจอจริงแบบครอป/ปิดข้อมูล พร้อมคำอธิบายใต้ภาพและเผยแพร่ในบทเดิม

- เพิ่มภาพ 16 ไฟล์ บทละหนึ่งภาพ พร้อม alt text และคำอธิบายตรงหัวข้อที่เกี่ยวข้อง ไม่มีรูปใช้ซ้ำข้ามเอกสาร
- ไฟล์ภาพที่ตรวจแล้วเผยแพร่อยู่บน Cloudflare R2; ตำแหน่งและข้อความประกอบอยู่ใน `illustrations.mjs` และ repo ไม่เก็บไฟล์ WebP ต้นฉบับ
- ภาพมือถือระบุไว้ในคำอธิบาย รูปช่องราคาปิดตัวเลขด้วยแถบทึบ ไม่ได้ทำให้ช่องราคาจริงว่างหรือแก้ข้อมูลบ้าน
- ณ วันที่เผยแพร่ WebP รวม 290,952 bytes; ไม่เก็บภาพเต็มที่มีข้อมูลส่วนตัว และภายหลังลบสำเนา WebP ใน repo ตามนโยบายเก็บเฉพาะโค้ด
- `publish-illustrations.mjs prepare` อ่านบทปัจจุบัน เก็บสำเนาก่อนแก้ในพื้นที่ ignored สร้าง manifest และ SQL โดยตรวจ version/content เดิมก่อนเขียน เพื่อไม่ทับการแก้ของผู้อื่น
- ใช้ signed Docs Media API สำหรับรูปใหม่ แล้วบันทึก `doc_media` และเนื้อหาทั้ง 16 บทใน transaction สั้น ไม่มี schema migration หรือ deploy ตัวแอป
- `image-content.test.mjs` ผ่าน 7/7: ตำแหน่งภาพ, ไม่แก้ต้นฉบับ, หัวข้อหาย, ป้องกันรูปซ้ำ, cleanup เมื่อ upload/save ล้มเหลว, ไม่ลบรูปเมื่อ commit แล้ว/ตรวจสถานะไม่ได้ และบันทึก cleanup_required
- Staging: SQL เพิ่มภาพครบ 16 บทผ่านและ rollback; หมวดทดสอบคงเหลือ 0 ทดสอบ upload/read/delete ด้วย credential ของ Staging และล้างภาพทดสอบแล้ว (อ่านกลับ 404)
- Production: เอกสาร 16/16 เป็น published version 2 มีภาพบทละหนึ่งภาพ; ทุก URL ตอบ 200 และพบ image ID; ทุกไฟล์ตอบ 200 และ SHA-256 ตรงต้นฉบับที่ตรวจ
- Browser: บทเริ่มต้นและบทจัดการรูปแสดงภาพ/คำอธิบายจริง; บทจัดการรูปโหลดครบ และที่ viewport 390×844 มี clientWidth/scrollWidth = 375 เท่ากัน ไม่มี horizontal overflow
- ไม่มีการสร้างลูกค้า/ผู้ใช้ โฆษณา หรือบันทึกการแก้ไขใน webook ระหว่างถ่ายภาพ

คำสั่ง publish ใช้ได้กับ import ใหม่ครั้งเดียวเท่านั้น ห้ามรัน `prepare`/`publish` ซ้ำหลังเผยแพร่แล้วเพื่อเปลี่ยนรูป ต้องตรวจรูปเดิมและใช้ lifecycle การแทนที่รูปตามระบบ Docs. สคริปต์ประวัติการเผยแพร่ต้องกู้ไฟล์ภาพจาก R2/export ก่อนจึงจะรันซ้ำได้ เพราะ repo ไม่เก็บสำเนา WebP

## Desktop-only revision — เผยแพร่แล้ว 15 กันยายน 2026

ภูอนุมัติให้เปลี่ยนคำอธิบายและภาพมือถือเป็น Desktop เผยแพร่ในลิงก์เดิม และยืนยันลบไฟล์ภาพเก่า 9 บทเมื่อบันทึกแล้ว

- แทนภาพ 9 บท: เริ่มต้น, เมนูและสิทธิ์, ข้อมูลบ้าน, ราคา, โฆษณา, ลูกค้า, สร้างใบเสนอราคา, แชร์/ส่งออก และเทมเพลต อีก 7 ภาพเป็น Desktop อยู่แล้วจึงคงเดิม
- แก้ข้อความการใช้เมนูด้านซ้าย เมนูจัดการท้ายแถว และเลือกเว็บไซต์ในบทผู้ใช้ ไม่มีคำอ้างถึงมือถือในเนื้อหาที่เผยแพร่ทั้ง 16 บท
- ใช้หน้าแก้ไข Docs ที่ภูเข้าสู่ระบบจริง ผ่าน upload/prepare/delete/finalize ของแอป ไม่มีการปลอม auth/audit actor และไม่มี schema change หรือ deployment
- ภาพราคาปิดตัวเลขด้วยแถบทึบ และภาพใหม่ตรวจด้วยตาแล้วก่อนเผยแพร่; สำเนาภาพเก่า 9 ไฟล์อยู่ในพื้นที่ ignored `.wrangler/manuals/webook/pre-desktop-images/` หากต้องกู้คืนให้อัปโหลดใหม่ผ่านแอป ไม่ใช่คืน URL เก่า
- หน้าแก้ไขปฏิเสธลิงก์ในบทเริ่มต้นด้วยข้อความ “ลิงก์ไม่ปลอดภัยหรือไม่รองรับ” จึงคงปลายทางเป็นข้อความ `webook-admin.poolvilla.workers.dev` ให้อ่าน/คัดลอกได้ ไม่ได้แก้ validator หรือแอปนอกขอบเขต
- `node docs/manuals/webook/verify-desktop.mjs` ผ่าน: URL 200 ครบ 16/16, รูป WebP โหลดได้และ metadata ตรง 16/16, ownership ถูกต้อง, alt/caption ตรง catalogue, เนื้อหาเทียบต้นฉบับตรงโดยไม่คิด whitespace, จำนวนหัวข้อ/list item/callout คงเดิม และรูปเก่าทั้ง 9 URL ตอบ 404 แบบ cache-bust
- เอกสารที่แก้ 10 บทเป็น published version 4; อีก 6 บทคง version 2 ไม่มีการแก้ไขนอกขอบเขต
- Read-only Production query ตรวจ `doc_media_operations = 0` และ `doc_media_cleanup = 0` หลังเสร็จ
- `node --test docs/manuals/webook/image-content.test.mjs` ผ่าน 7/7; syntax check ของ catalogue และ illustrations ผ่าน ไม่ได้รัน build เพราะไม่มีการแก้แอป
- Browser ตรวจบทเริ่มต้นแล้ว: หัวข้อ Desktop ภาพเมนูด้านซ้ายและคำอธิบายแสดงจริง รูปโหลดสมบูรณ์ คืนหน้าบ้านพัก WeBooks และ reset viewport override แล้ว

ตัวตรวจ Desktop เป็น read-only; ห้ามใช้เครื่องมือ import รอบแรก (`prepare.mjs` / `publish-illustrations.mjs`) เพื่อเขียนทับชุดนี้
