# M07 Production Readiness — Design Specification

**วันที่:** 26 สิงหาคม 2026  
**สถานะ:** รอภูตรวจทานก่อนเริ่ม execution  
**Requirement baseline:** [Poolvilla Docs Requirements TH v1.2](../../Poolvilla-Docs-Requirements-TH-v1.2.md)  
**Module scope:** [M07 — Search, Performance & Security Hardening](../../todo/M07-search-hardening.md)

## เป้าหมาย

ปิดหลักฐานที่เหลือของ M07 โดยไม่เปลี่ยน Feature หรือขอบเขตข้อมูล: วัด Public/Search performance, ตรวจ accessibility และ browser behavior, ยืนยัน Docs-only security/RLS และจัดทำ Production rollout checklist ที่มี backup และ rollback ตรวจสอบได้

เอกสารนี้แทนที่เฉพาะส่วน execution/production-readiness ของ [M07 design เดิม](2026-08-14-m07-search-hardening-design.md) เพราะ implementation จริงใช้ title index และ runtime H2/H3 extraction แล้ว ไม่ใช้ `doc_search_segments` หรือ RPC ใหม่

## ขอบเขตและลำดับงาน

1. **Baseline และ Local gate** — ตรวจ working tree, migration parity ที่อ่านได้ และรัน regression/build ที่เกี่ยวข้องโดยไม่เขียน Remote state
2. **Performance evidence** — ใช้ published test content และคำค้นแบบ representative บน Staging เพื่อวัด API search, Public document response และ mobile LCP; รายงานจำนวนรอบ, percentile, error rate และเงื่อนไขการวัดอย่างโปร่งใส ห้ามสร้าง/คัดลอกข้อมูล Production
3. **Accessibility และ browser matrix** — ตรวจ keyboard-only, focus trap/restore, visible focus, labels/live regions, zoom, 390px responsive และ published-only result; ครอบคลุม browser ที่พร้อมใช้งานใน environment นี้ ส่วน Safari/iOS/Chrome Android ที่ต้องใช้อุปกรณ์จริงระบุเป็น user validation อย่างชัดเจน
4. **Security/RLS regression** — ยืนยัน Guest, authenticated non-admin และ Admin matrix รวม direct Docs Data API, `/admin` guard และ Search ที่ไม่คืน Draft/Archived โดยไม่แก้ Legacy object
5. **Release readiness** — ตรวจชื่อและ binding ของ Production App Worker, Docs Media Worker, R2 bucket, allowed origin และ secrets แบบไม่แสดงค่า; ตรวจ Supabase Production migration dry-run/history; บันทึก backup timestamp/owner และ rollback ที่ผ่าน Staging ก่อนเสนอคำสั่ง Production

## ขอบเขตห้ามทำ

- ไม่ apply migration, deploy Worker, ตั้ง secret, เปลี่ยน DNS/domain, reset/truncate หรือเขียนข้อมูล Production
- ไม่ deploy หรือแก้ Worker/Storage ของ legacy `webook`
- ไม่สร้าง migration, schema/index/RLS/function ใหม่ เว้นแต่หลักฐานพบ defect ที่ต้องแยก design/approval ใหม่
- ไม่ถือว่า `.poolvilla.worker.dev` เป็นชื่อ target ที่ครบถ้วนจนกว่าภูหรือ Cloudflare configuration จะยืนยันชื่อ Worker เต็ม

## เกณฑ์ผ่าน

- Search p95 ≤ 1 วินาที, Public document server response p95 ≤ 1 วินาที และ Mobile LCP p75 ≤ 2.5 วินาที ภายใต้ methodology ที่บันทึกได้
- ไม่มี Draft/Archived หรือ Admin-only data ปรากฏผ่าน Search, Reader, Data API หรือการเข้าถึง Admin
- Keyboard/focus/label/live-region และ responsive checks ผ่านใน browser ที่ทดสอบได้; ช่องว่างจากอุปกรณ์จริงถูกระบุ ไม่ปกปิด
- Local/Staging migration history และ Production dry-run แสดงเฉพาะ Docs migrations ที่ตั้งใจจะ rollout
- มี Production checklist ระบุ Worker name/URL, account, R2 bucket, origin, required secret *names* (ไม่ใช่ค่า), backup ที่ตรวจแล้ว และ rollback steps ที่ทดลองบน Staging

## Rollout และ rollback

เมื่อ M07 readiness ผ่าน จะเสนอ Production runbook แยกเป็น 3 approval gates: (1) Supabase migration, (2) Docs Media Worker, (3) Docs App Worker. แต่ละ gate ต้องมี dry-run, exact target, smoke test และ stop condition ของตนเอง

Rollback ของ App Worker ใช้ Cloudflare version rollback ไป version ก่อนหน้า. Migration rollback จะใช้เฉพาะ SQL ที่ทดสอบบน Staging และไม่ลบ extension หรือแก้ Legacy object; หาก rollback schema ไม่ปลอดภัย ให้หยุด App traffic/feature ก่อนและคง schema ไว้. Media Worker rollback ต้องคง contract ของ object `docs/` และ secret/bucket Production เท่านั้น

## หลักฐานและเอกสารผลลัพธ์

ผลที่รันจริงจะบันทึกต่อใน `docs/context/testing-and-commands.md` และ checklist/runbook จะอยู่ใต้ `docs/todo/` โดยไม่ใส่ secret หรือข้อมูลส่วนบุคคล. `TODO.md` และ `context.md` จะเปลี่ยนสถานะก็ต่อเมื่อ M07 ผ่านจริงเท่านั้น
