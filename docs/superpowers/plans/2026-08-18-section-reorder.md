# Section Reorder Implementation Plan

**Goal:** เรียงหมวดหลัก และหมวดย่อยภายในหมวดหลักเดิมจาก Admin Explorer โดยไม่เปลี่ยน `parent_id` หรือ URL

**Spec:** `docs/superpowers/specs/2026-08-18-section-reorder-design.md`

## Work items

- [x] สร้าง worktree `codex/section-reorder` และกู้ design spec
- [x] เพิ่ม Server Action `reorderSections` พร้อม UUID/duplicate validation และ success-only cache refresh
- [x] เพิ่ม `SectionReorderList` ด้วย `@dnd-kit` รองรับ mouse, touch และ keyboard sensor
- [x] เพิ่ม URL modes `reorder-root` และ `reorder-child` ใน `SectionPanel`
- [x] เพิ่ม migration `doc_reorder_sections(parent_id, section_ids)` แบบ `SECURITY INVOKER`, Admin-only, complete sibling validation และ atomic `sort_order` update
- [x] เพิ่ม focused Vitest และ pgTAP cases สำหรับ root/child ordering และ duplicate IDs
- [ ] รัน Local Supabase migration + `npm run test:db` เมื่อ Docker พร้อม
- [ ] ตรวจ UI authenticated Admin, 390px, pointer/touch/keyboard interaction
- [ ] อัปเดต `docs/todo/admin-file-explorer.md`, `TODO.md` และ `context.md` หลัง Local verification ผ่าน

## Verification evidence to collect

- `npm run test:db`
- focused Explorer/action tests
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Boundaries

- ไม่ย้ายหมวดย่อยข้ามหมวดหลัก
- ไม่แก้ `parent_id`, slug, document, media หรือ redirect
- ไม่ทำ Staging/Production migration หรือ deploy โดยไม่มีคำสั่งแยกจากภู
