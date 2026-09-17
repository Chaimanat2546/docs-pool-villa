# คู่มือ Baan Pool Villa — Desktop

ปรับล่าสุด 16 กันยายน 2026: 14 บท / 20 ภาพที่เผยแพร่ / 4 หมวดย่อย ภายใต้หมวด `คู่มือ Baan Pool Villa` เป็นคำอธิบายแบบจับมือทำสำหรับแอดมินเริ่มต้นบน Desktop

[เปิดคู่มือ](https://docs-pool-villa.poolvilla.workers.dev/baan-pool-villa/start/getting-started)

## ขอบเขตและแหล่งอ้างอิง

- ผู้ใช้ขอเพิ่มคู่มือจาก repo `C:\Users\chaym\Projects\baan-pool-villa` ในรูปแบบ Desktop-only พร้อมรูป และเปิด `https://www.pmheevilla.com/admin/sections` ให้ตรวจหน้าจอจริง ตามขอบเขตเผยแพร่เมื่อเขียนและตรวจเสร็จ
- อ่านและถ่ายภาพหน้า admin เท่านั้น ไม่บันทึกตั้งค่า อัปโหลด ลบ หรือเปลี่ยนข้อมูลบน PMhee Villa และไม่แก้ repo ต้นทาง
- การเปิด `/admin/guides/new` สร้างแบบฟอร์มเฉพาะใน client state ตาม `loadGuides` ใน `components/admin/guides/admin-guides-page.tsx`; ไม่มีการบันทึกบทความใหม่
- เนื้อหาฉบับปัจจุบัน: [beginner-content.mjs](beginner-content.mjs); [catalogue.mjs](catalogue.mjs) เก็บฉบับแรกเพื่อเป็นหลักฐาน ภาพ Desktop ที่ครอปและปิดข้อมูลแล้วเผยแพร่อยู่บน Cloudflare R2; repo ไม่เก็บไฟล์ WebP ต้นฉบับ
- อ้างอิง live menu และ `components/admin/` กลุ่ม sections, detail-layout, villa-card-images, guides, customer-reviews, villa-reviews, tiktok, marketing-tags, legal และ site settings ใน repo ต้นทาง
- จุดสำคัญที่ตรวจจาก source: รูปปกบ้านบันทึกทันทีหลังเลือกไฟล์; ชุดรูปการ์ดต้องยืนยันลำดับ; คิวรีวิวหน้าแรกบันทึกแยกจาก upload; Hero รองรับสูงสุด 10 สไลด์; กฎหมายบันทึกเฉพาะหน้าที่เลือก

## รายการบท

- เริ่มใช้งาน: รู้จักเมนู บันทึก และตรวจหน้าเว็บจริง
- จัดหน้าเว็บไซต์: ชุดบ้านพัก / ผังหน้ารายละเอียด / รูปปกและรูปการ์ด
- จัดการเนื้อหา: บทความ / รูปรีวิวลูกค้า / รีวิวบ้านพัก / TikTok
- ตั้งค่าเว็บไซต์: แบรนด์และธีม / Hero / ติดต่อและชำระเงิน / SEO / Marketing Tags / หน้ากฎหมาย

## การนำเข้าและความปลอดภัย

[manual.mjs](manual.mjs) เป็นสคริปต์ประวัติการนำเข้าครั้งเดียวแบบ insert-only ใช้สิ่งที่ระบบมีอยู่แล้ว ไม่สร้าง schema, role, policy หรือ deploy Worker; ไม่มีไฟล์ WebP ต้นฉบับใน repo จึงห้ามรันซ้ำโดยไม่กู้ภาพจาก R2/export ก่อน

- ตรวจ environment ให้ตรง project ref ก่อนใช้ credential ทุกครั้ง
- เพิ่มเฉพาะ `doc_sections`, `doc_documents`, `doc_media` และอัปโหลด exact keys ใต้ `docs/{documentId}/{mediaId}.webp`
- หนึ่งรูปเป็นของเอกสารเดียว มี alt และ caption ทุกภาพ
- ปฏิเสธเมื่อมี root slug เดิม ไม่เขียนทับเอกสารหรือรูปเดิม
- ตรวจ hash ของเนื้อหาและภาพก่อนเผยแพร่; upload อยู่นอก transaction สั้น
- ใช้ helper `../webook/image-content.mjs` ที่มี failure-path tests เพื่อ reconcile commit ที่ไม่แน่ชัดก่อน cleanup และบันทึก cleanup_required หากล้างรูปใหม่ไม่สำเร็จ
- ไม่แตะ legacy data / users / roles ไม่เปลี่ยนสิทธิ์ และไม่อ้าง actor คนอื่น
- ไฟล์ SQL, manifests และหลักฐานอยู่ใต้ `.wrangler/manuals/baan-pool-villa/` ซึ่งไม่ commit; ไม่มี credential ในไฟล์เหล่านี้

คำสั่งสำหรับตรวจซ้ำแบบอ่านอย่างเดียว:

```powershell
node docs/manuals/baan-pool-villa/plain-headings.mjs verify
node --test docs/manuals/baan-pool-villa/beginner-transform.test.mjs docs/manuals/webook/image-content.test.mjs
```

ห้ามรัน `prepare`, `staging` หรือ `publish` ซ้ำเพื่อแก้บทที่เผยแพร่แล้ว การแก้ภายหลังใช้ workflow บันทึกเอกสารและจัดการรูปของระบบตามปกติ

## หลักฐานตรวจสอบ

- Local content validation ณ วันที่เผยแพร่: 14/14 ผ่าน โครงสร้าง Tiptap, route, ownership, alt/caption, WebP และขนาดภาพถูกต้อง รวมภาพ 290,732 bytes; ภายหลังลบสำเนา WebP ออกจาก repo ตามนโยบายเก็บเฉพาะโค้ด
- Media helper tests: 7/7 ผ่าน รวม upload failure, save response lost, cleanup failure และ unknown commit state
- Staging: transaction ใส่ 14 บท + 14 media rows ผ่านและ ROLLBACK; ยืนยันไม่มี root หลงเหลือ; อัปโหลด/อ่าน/ลบภาพทดสอบผ่านและ exact key ตอบ 404 หลัง cleanup
- Production: เผยแพร่ 14/14; public pages 200 ครบ, images 200 ครบ, hash ภาพและ canonical content ตรงทุกบท
- เปรียบเทียบเอกสารเดิม: WeBooks 16 บท content/title/status/version ไม่เปลี่ยน
- Production `doc_media_operations = 0`, `doc_media_cleanup = 0`
- Browser Desktop reader: หมวดใหม่ปรากฏ ภาพโหลด มี alt และไม่มี horizontal overflow ในหน้าตัวอย่าง
- ไม่รัน app lint/build ในงานนี้ เพราะไม่มีการแก้ application code, schema หรือ deployment; ทดสอบ focused content/media และหน้าจริงแทน
- Node แจ้ง MODULE_TYPELESS_PACKAGE_JSON และ DEP0190 จาก CLI launcher เดิมที่ใช้ fixed arguments; ไม่เปลี่ยน package configuration นอกขอบเขต

งานนี้เป็น content follow-up ไม่ใช่การปิด M07 หรือการอนุมัติ deployment/schema ใหม่ ดู requirement baseline ที่ [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)

## แก้คู่มือการจัดหน้าเว็บหลัง feedback

ต้นฉบับฉบับแรกอยู่ใน catalogue.mjs; ฉบับปัจจุบันเพิ่ม [page-management-expansion.mjs](page-management-expansion.mjs) พร้อมแก้ข้อความปุ่มบันทึกที่คลาดเคลื่อนในบทตั้งค่าเว็บ ไม่ใช้ manual.mjs verify กับฉบับใหม่เพราะตัวตรวจนั้นเก็บ baseline ก่อนแก้ไข

- ขยาย 7 บท: site-settings, detail-layout, sections, card-images, contact, seo, hero
- เพิ่ม Header สองแบบ ปุ่มบันทึกแยกจากการ์ดบ้าน สีแต่ละตำแหน่ง การเลือกเมนูตามงาน และเครื่องมือ refresh
- เพิ่มวิธีจัดหมวดรูป เปิดปิดหมวดรูปปก บันทึกลำดับแล้วบันทึกหน้าหลัก และความแตกต่างระหว่างแหล่งรูปกับวิธีเปิดรูป
- เพิ่มขอบเขตส่วนระบบบนหน้าแรก การตรวจบ้านไม่ตรงชุด การเพิ่ม/ลบผู้ติดต่อ และ SEO แยกตามหน้า
- เพิ่มภาพ Desktop 2 รูป: header-controls และ gallery-order-controls; ไม่แทนหรือลบภาพเดิม
- Staging guarded SQL amendment ผ่านและ rollback; media upload/read/delete ผ่าน; helper failure-path tests 7/7
- Production ตรวจเนื้อหา/เวอร์ชัน/หน้าสาธารณะครบ 7 บท รูปใหม่ 2 รูป hash ตรง เอกสารอื่น 23 บทและภาพเดิม 30 รูปไม่เปลี่ยน
- Browser ตรวจบทตั้งค่า: หัวข้อใหม่ปรากฏ ภาพทั้งสองโหลด มี alt และไม่มี horizontal overflow; ไม่เปลี่ยนค่าใน PMhee Villa
- หลักฐาน `.wrangler/manuals/baan-pool-villa/expansion-*`; ห้ามรัน prepare/stage/publish ของ amendment ซ้ำเพื่อแก้ฉบับถัดไป ใช้ snapshot และ version guard ใหม่เสมอ

## ภาพตามขั้นตอนจัดชุดบ้านพัก

ผู้ใช้ขอภาพตามขั้นตอนโดยตรง จึงเพิ่มภาพ Desktop 4 รูปในบท sections ใต้หัวข้อเพิ่ม/แก้ชุด, เลือกบ้านเอง, จัดลำดับหน้าแรก และเรียงบ้านภายในชุด รวมบทนี้มี 5 ภาพพร้อม alt/caption เก็บภาพเดิมไว้ทั้งหมด ไม่แก้การตั้งค่าบน PMhee Villa

- สเปก [sections-step-images.mjs](sections-step-images.mjs); importer [publish-section-steps.mjs](publish-section-steps.mjs) ใช้ snapshot/version guard และ cleanup helper เดิม
- ยืนยันชื่อปุ่มในหน้าต่างเรียงบ้านคือ เสร็จสิ้น แล้วต้องบันทึกหน้าหลักอีกครั้ง
- Staging SQL rollback และ media upload/read/delete ผ่าน; helper tests 7/7
- Production: เนื้อหาบทเป้าหมายและรูปใหม่ 4 รูป hash ตรง หน้าสาธารณะ 200 เอกสารอื่น 29 บทและรูปเดิม 32 รูปไม่เปลี่ยน ไม่มี media operation/cleanup ค้าง
- หลักฐาน `.wrangler/manuals/baan-pool-villa/sections-images-*`; verification รุ่นก่อนเป็นหลักฐานของ revision ก่อนหน้า ไม่ใช้ตรวจ content รุ่นใหม่

## ฉบับจับมือทำสำหรับแอดมินเริ่มต้น — 16 กันยายน 2026

ภูอนุมัติให้เริ่มปรับคู่มือ Baan Pool Villa ก่อน โดยคง WeBooks ไว้ ใช้ระดับจับมือทำ: ทางเข้าบน Desktop, เตรียมข้อมูล, งานย่อย, ขั้นตอนคลิก/กรอก, ผลที่ควรเห็น และการแก้ปัญหา เพิ่มจุดตรวจและคำเตือนสำหรับเผยแพร่ ลบข้อมูล และข้อมูลรับเงิน

- แทนคำอธิบายทั้ง 14 บทด้วย [beginner-content.mjs](beginner-content.mjs); คงชื่อบท URL หมวด สถานะ และรูปเดิมทั้งหมด ไม่มีการเพิ่ม/ลบ/แทนไฟล์ภาพ
- จัดภาพ 5 รูปของบท sections ให้ตามงาน: ภาพรวม → เลือกวิธีคัด → เลือกบ้าน → เรียงบ้านในชุด → เรียงทั้งส่วนหน้าแรก ภาพยังเป็นของเอกสารเดิม
- แยกการเลือก/พรีวิวจากการบันทึก อธิบายรูปปกบันทึกทันที, เสร็จสิ้นแล้วบันทึกหน้าหลัก, บันทึกลำดับหมวดรูปแล้วบันทึกอีกครั้ง และปุ่ม Header/การ์ดแยกกัน
- [beginner-transform.mjs](beginner-transform.mjs) ปฏิเสธ image marker ที่ซ้ำ/หาย/ไม่มีจริง พร้อมย้าย image node และ caption เดิมโดยไม่แก้ attrs
- [revise-beginner.mjs](revise-beginner.mjs) เป็นสคริปต์ประวัติการเผยแพร่ที่เตรียม snapshot และ SQL แบบ exact id/content/version/status guard; ไม่มีไฟล์ภาพต้นฉบับใน repo จึงห้ามรันซ้ำโดยไม่กู้ภาพจาก R2/export ก่อน
- Local tests 10/10 ผ่าน (transform/guard 3 และ media helper เดิม 7); `git diff --check` ผ่าน มีคำเตือน CRLF ของ TODO เดิม ไม่มี app lint/build เพราะไม่ได้แก้ app
- Staging: จำลอง revision ต่อจาก fixtures ที่เผยแพร่เดิม ผ่านและ ROLLBACK; ทดสอบเขียนซ้ำด้วย version เก่าได้ข้อผิดพลาด `Document changed; abort all updates` ตามที่ตั้งใจ และตรวจไม่มีหมวดทดสอบเหลือ
- Production: 14 บทมี canonical content ตรงฉบับใหม่และ version เพิ่ม 1, ทุก URL ตอบ 200, ภาพ 20 รูปตอบ 200 และขนาดตรง metadata; อีก 16 บทไม่เปลี่ยนและ media ทั้ง 36 แถวไม่เปลี่ยน
- Browser: ตรวจหน้าเริ่มต้นเป็นฉบับวันที่ 16 กันยายน; Desktop 1440×1000 ตรวจบท sections ภาพ 5 รูปโหลดครบและไม่มี overflow, สารบัญพาไปงานเรียงบ้านได้; บท contact แสดงคำเตือนก่อนแก้บัญชีและรายการตรวจหลังบันทึก ไม่มี overflow
- ไม่เปิดแก้หรือบันทึกข้อมูลธุรกิจ PMhee Villa และไม่แก้ repo ต้นทาง
- หลักฐาน `.wrangler/manuals/baan-pool-villa/beginner-*` เก็บ snapshot ก่อนแก้และผลตรวจ ไม่ commit; อย่ารัน SQL publish ซ้ำหรือเปลี่ยน snapshot เก่าเพื่อข้าม version guard

## ปรับชื่อหัวข้อไม่ให้เหมือนรายการสั่งงาน

16 กันยายน 2026 ภูขอเอาคำว่า “งานที่ 1, 2, 3…” ออก จึงแก้ 40 หัวข้อใน 13 บทให้เหลือชื่อเรื่องโดยตรง คงเลขลำดับขั้นตอน เนื้อหาอื่น และภาพเดิมทั้งหมด บทเริ่มต้นไม่มีหัวข้อรูปแบบนี้จึงไม่เปลี่ยน

- ต้นฉบับ `beginner-content.mjs` ปรับตรงกับฉบับเผยแพร่; ตรวจฉบับปัจจุบันด้วย `plain-headings.mjs verify` ไม่ใช้ตัวตรวจ revision ก่อนหน้า
- Staging transaction ผ่านและ rollback; Production ตรวจ canonical content/version/หน้าสาธารณะครบ 13 บท อีก 17 บทและ media 36 แถวไม่เปลี่ยน
- Tests ของ transform/version guard 3/3 ผ่าน; หลักฐาน `.wrangler/manuals/baan-pool-villa/plain-headings-*`
