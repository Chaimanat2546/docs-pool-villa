# Admin Shell Navigation Design

## Goal

เพิ่ม navigation ที่ใช้งานได้จริงและการออกจากระบบให้เฉพาะ Admin route ของ Poolvilla Docs โดยไม่เปลี่ยนสิทธิ์หรือข้อมูลระบบเดิม

## Scope

- ครอบเฉพาะ `/admin/*` หลัง `requireAdmin()` สำเร็จ
- Desktop แสดง sidebar คงที่
- Mobile แสดงปุ่ม `เมนูผู้ดูแล` เปิด drawer แบบ modal
- เมนูหลัก: `โครงสร้าง` (`/admin/structure`), `เอกสาร` (`/admin/documents`) และ `Editor` (`/admin/editor`)
- แสดง active state ของ route ปัจจุบัน
- มี `กลับหน้าคู่มือ` ไป `/` และ `ออกจากระบบ`

## Out of scope

- ไม่แสดง email, user metadata หรือข้อมูลบัญชีอื่นใน UI
- ไม่สร้างหน้า account/profile
- ไม่เปลี่ยน `public.users`, `public.roles`, Auth user, role mapping, RLS, schema หรือ migration
- ไม่เปลี่ยน Public navigation, M07 หรือ Docs Media Worker

## Architecture

สร้าง client component `AdminShell` ซึ่งรับ `children` และใช้ `usePathname()` ระบุ active route. Admin layouts/pages จะเรียก `requireAdmin()` บน server ก่อนส่ง content เข้า shell จึงไม่ย้าย authorization ไปไว้ client.

บน desktop shell วาง sidebar ทางซ้ายพร้อม navigation landmarks. บน mobile shell ซ่อน sidebar และใช้ Base UI `Dialog` drawer: เปิดจากปุ่มที่มีชื่อเข้าถึงได้, trap focus, ปิดด้วย Escape/Backdrop และคืน focus ไป trigger. การเลือก link ปิด drawer ก่อน navigation.

`ออกจากระบบ` อยู่ส่วนล่างของ navigation และใช้ Supabase browser client เรียก `auth.signOut()`. ระหว่าง request ปุ่ม disabled. เมื่อสำเร็จ redirect ด้วย `router.replace('/auth/login')` และ `router.refresh()`; เมื่อล้มเหลวแสดงข้อความภาษาไทยด้วย `role="alert"` และคืนปุ่มให้ใช้งานได้. การ sign-out ไม่พึ่ง user metadata และ server guard/RLS ยังคงเป็นสิทธิ์หลัก.

## Component Contract

`AdminShell({ children }: { children: React.ReactNode })`

- Render `<main id="main-content">` รอบ `children`
- Render navigation links พร้อม accessible names และ active indicator ที่อ่านด้วย screen reader
- Render mobile trigger `เมนูผู้ดูแล`
- Render one shared navigation content for desktop and drawer, with exact route definitions in one module
- Render logout action and its visible/error states

## Accessibility and Responsive Behavior

- ทุก navigation link และ Logout เป็น keyboard reachable และมี focus style เดิมของระบบ
- Drawer ใช้ Base UI Dialog เพื่อรักษา modal focus containment; Escape และ backdrop close คืน focus ไป `เมนูผู้ดูแล`
- Breakpoint เดียวกับ Docs navigation: sidebar desktop ตั้งแต่ `lg`; mobile/tablet ใช้ drawer
- Touch target อย่างน้อย 44px ใน drawer และไม่เกิด horizontal overflow ที่ viewport 390px
- Logout failure announcement ใช้ `role="alert"`; ไม่มีการเปิดเผยรายละเอียด SDK/credential

## Tests and Evidence

- Unit/component tests: links/active route, desktop/sidebar semantics, mobile drawer initial focus + Escape focus return, navigation selection closes drawer
- Logout success: `signOut()` เรียกหนึ่งครั้ง, redirect login; failure: alert และปุ่มกลับมา enabled
- Regression: route pages ยังคง server `requireAdmin()` ก่อน content
- Validation: relevant unit tests, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run cf:build`
- Staging smoke: Admin navigation works at desktop and 390px, Guest/non-admin ยังเข้า `/admin` ไม่ได้, logout ไป login แล้ว `/admin` ไม่เข้าถึงโดย session เดิม

## Acceptance Criteria

1. Admin เห็น sidebar navigation ทุก `/admin/*` เท่านั้นหลังผ่าน server authorization
2. ผู้ใช้ไป Structure, Documents และ Editor ได้โดยไม่ต้องพิมพ์ URL
3. Mobile drawer เข้าถึงได้ด้วย keyboard, trap focus, Escape/backdrop close และคืน focus ถูกต้อง
4. Logout สำเร็จล้าง session และพาไป `/auth/login`; failure ไม่ทำให้ปุ่มค้างและแจ้งข้อผิดพลาดปลอดภัย
5. ไม่มีการเปลี่ยน schema, RLS, Auth users/roles, Public routes, Media Worker หรือ Production
