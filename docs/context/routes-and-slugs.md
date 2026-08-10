# Routes and Slugs

## Public routes

- `/` Homepage อัตโนมัติ
- `/search` Search Published docs
- Hierarchy route เช่น `/agency/getting-started/login`
- `/admin` และเส้นทางย่อยสำหรับผู้ดูแล

## Uniqueness

- Section slug unique ภายใต้ Parent
- Document slug unique ภายใน Section
- Slug ซ้ำข้าม Section ได้

## Reserved

ห้ามใช้ `admin`, `api`, `search`, `login`, `_next` และชื่อระบบที่เพิ่มภายหลัง

## Redirect/visibility

- เปลี่ยน Slug หรือย้ายเอกสาร: เก็บ old path และ permanent redirect
- ป้องกัน collision, loop และ chain
- Draft/Archived/Deleted: Public ตอบ 404
- Published เท่านั้นที่อยู่ใน Sitemap/Canonical/Search
- Admin/Preview/Non-published ใช้ `noindex`

