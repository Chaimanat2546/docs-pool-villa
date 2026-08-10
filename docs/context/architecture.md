# Architecture and Environments

## Components

- Next.js + TypeScript: Public, Admin และ Server operations
- Tiptap: Editor/Viewer content model
- Supabase: Auth, PostgreSQL, RLS และ Search
- Cloudflare R2: Image objects
- Docs Media Worker: Upload/Delete เฉพาะ `docs/`

## Production facts

- Supabase project ref: `rqizfiayvcbozlzuvbok`
- Existing R2 bucket: `webook-media`
- Docs object key: `docs/{document_id}/{image_name}`
- Public domain: `docs.poolvilla.co.th`
- Admin path: `/admin`

ค่าข้างต้นเป็น Identifier ไม่ใช่ Secret ห้ามเพิ่ม Key/Token ลงไฟล์นี้

## Isolation

- Docs Worker/Secret แยกจาก `webook-media` Worker เดิม
- Worker จำกัดสิทธิ์เฉพาะ prefix `docs/`
- Staging และ Production แยก Cloudflare Account, Supabase Project, Auth, DB, R2, Worker, Domain และ Secrets
- Staging ใช้ Test users และห้าม Copy ข้อมูลผู้ใช้จริง
- ห้าม Deploy หรือ Migration จนกว่าภูจะสั่ง

