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

