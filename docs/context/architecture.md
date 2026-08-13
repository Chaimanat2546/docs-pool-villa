# Architecture and Environments

## Components

- Next.js + TypeScript: Public, Admin และ Server operations
- Tiptap: Editor/Viewer content model
- Supabase: Auth, PostgreSQL, RLS และ Search
- Cloudflare R2: Image objects
- Docs Media Worker: Upload/Delete เฉพาะ `docs/`

## Environment identifiers

| Environment | Supabase URL | Cloudflare Account ID | Docs domain status |
|---|---|---|---|
| Production | `https://rqizfiayvcbozlzuvbok.supabase.co` | `7c1d945e149fc6fad2124176124d8f33` | วางแผนใช้ `docs.poolvilla.co.th` แต่ยังไม่ตั้งค่าหรือใช้งานจริง |
| Staging | `https://sxvkhzhqtrpxgzumsswl.supabase.co` | `0df55f166fa309dcc904e992c43f86db` | `https://docs-pool-villa-staging.chaymanus2003.workers.dev` |

- Existing R2 bucket: `webook-media` (Production legacy bucket; Docs ต้องใช้ Worker แยก)
- Docs object key: `docs/{document_id}/{media_id}.webp`
- Admin path: `/admin`

ค่าข้างต้นเป็น Identifier ไม่ใช่ Secret ห้ามเพิ่ม Key/Token ลงไฟล์นี้

## Isolation

- Docs Worker/Secret แยกจาก `webook-media` Worker เดิม
- Worker จำกัดสิทธิ์เฉพาะ prefix `docs/`
- Server operations ของ Docs App เรียก Docs Media Worker ผ่าน Cloudflare Service Binding `DOCS_MEDIA`; Browser ใช้ public Worker URL เฉพาะ upload/read ที่จำเป็น และ secret อ่านจาก runtime binding เท่านั้น
- Staging และ Production แยก Cloudflare Account, Supabase Project, Auth, DB, R2, Worker, Domain และ Secrets
- Staging ใช้ Test users และห้าม Copy ข้อมูลผู้ใช้จริง
- ห้าม Deploy, ตั้งค่า Domain หรือ Migration จนกว่าภูจะสั่ง

## Admin File Explorer route boundary

- Admin Structure และ Documents อยู่ใต้ physical route group `src/app/admin/(content)/` ซึ่งไม่เพิ่ม `(content)` ใน URL; external routes ยังคงเป็น `/admin/structure` และ `/admin/documents/**`
- `src/app/admin/(content)/layout.tsx` โหลด authenticated Explorer data แล้วคง shared two-pane shell/folder tree ระหว่างการนำทางของ Structure, New Document และ Edit Document
- Loader เรียก `requireAdmin()` ฝั่ง Server ก่อนอ่านเฉพาะ `doc_sections`, `doc_documents`, `doc_media_operations` และ `doc_media_cleanup`; Client-side section selection ไม่ใช่ authorization boundary
- `/admin/documents` redirect ไป canonical `/admin/structure`; selected section อยู่ใน query `section` และ invalid/missing id กลับ virtual root โดยไม่เลือกหมวดแรกเงียบ ๆ
- Section/Document mutation ยังอยู่หลัง Admin Server Actions และ RLS เดิม; save, version conflict, media cleanup, prepared delete และ fail-closed lifecycle boundaries ไม่ย้ายเข้า presentation components
- โครงสร้างรองรับหมวดหลักกับหมวดย่อยหนึ่งระดับเท่านั้น ไม่มี Schema, Migration, Auth, RLS, Worker, R2 protocol หรือ Legacy-system change จาก UX follow-up นี้

