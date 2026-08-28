# Public Reader Subsection Disclosure Design

## Goal

ทำให้คอลัมน์ “หมวด” แยกหมวดย่อยออกจากเอกสารอย่างชัดเจน โดยหมวดย่อยพับ/ขยายได้คล้าย navigation ของ Next.js ขณะที่เอกสารในหมวดหลักยังแสดงทันทีโดยไม่ถูกพับ

## Scope

- แก้เฉพาะ navigation tree ที่ `src/components/public/reader-navigation.tsx` และ regression tests ที่เกี่ยวข้อง
- ใช้รูปแบบเดียวกันใน Desktop sidebar และ Mobile drawer เพราะทั้งคู่ render `NavigationTree` ชุดเดียวกัน
- โครงสร้างข้อมูล, route, Public header, TOC, reader rails, breakpoint และหน้าแรกไม่เปลี่ยน

## Behavior

### หมวดหลัก

- ชื่อหมวดหลักคงเป็น heading ที่มองเห็นได้เสมอ
- เอกสารที่อยู่ตรงในหมวดหลักแสดงใต้ heading ทันทีตาม behavior ปัจจุบัน
- ไม่มีปุ่มพับ/ขยายที่หมวดหลัก แม้หมวดนั้นมีหมวดย่อย

### หมวดย่อย

- แต่ละหมวดย่อยแสดงชื่อเป็น button เต็มความกว้าง พร้อม icon chevron ที่หมุนตามสถานะเปิด/ปิด
- เริ่มต้นพับทุกหมวดย่อย ยกเว้นหมวดย่อยที่มี document `path` ตรงกับ `currentPath`; หมวดย่อยนั้นเริ่มเปิดอัตโนมัติ
- เมื่อเปิด ให้แสดงเอกสารที่อยู่ตรงในหมวดย่อยแบบเยื้องใต้ปุ่มหมวด พร้อมเส้นขอบซ้ายสี muted เพื่อสื่อ nesting
- ผู้ใช้เปิดหมวดย่อยได้มากกว่าหนึ่งรายการพร้อมกัน และการกดหมวดย่อยหนึ่งต้องไม่ปิดรายการอื่น
- หากเปลี่ยนไปยังเอกสารในหมวดย่อยอื่นระหว่าง client-side navigation หมวดย่อยปลายทางต้องเปิดอัตโนมัติ; สถานะที่ผู้ใช้เปิดหมวดอื่นไว้ไม่ถูกล้าง และผู้ใช้ยังพับหมวดปลายทางได้หลังเปิดอัตโนมัติแล้ว

### ขอบเขตลำดับชั้น

- Requirement ของ Docs จำกัดหมวดได้สองระดับ จึงใช้ disclosure เฉพาะ child section ของหมวดหลัก
- NavigationTree จะยัง render child section ตามข้อมูลเดิม แต่ไม่เพิ่ม UI หรือ state สำหรับลึกเกินสองระดับ

## Accessibility

- ปุ่มหมวดย่อยใช้ `<button type="button">`, มี `aria-expanded` และ `aria-controls` ที่อ้างถึง container เอกสารของหมวดย่อยนั้น
- Chevron เป็น decorative (`aria-hidden="true"`); ชื่อหมวดย่อยเป็น accessible name ของ button
- เอกสารที่พับอยู่ไม่อยู่ใน DOM เพื่อไม่รับ focus ผ่าน keyboard โดยไม่เห็น
- Link document และ active `aria-current="page"` คง behavior เดิม

## Implementation shape

- เก็บ `currentPath` ล่าสุดและ `Set<string>` ของหมวดย่อยที่เปิดไว้ใน `ReaderNavigation` เพื่อให้ Desktop sidebar กับ Mobile drawer ใช้ state เดียวกัน แม้ drawer ถูก unmount เมื่อปิด
- เมื่อ `currentPath` เปลี่ยน ให้ union เฉพาะ id ของหมวดย่อยที่มีเอกสารปัจจุบันเข้า state เพียงครั้งเดียว; path เดิมไม่ force-open ซ้ำ จึงพับหมวดปัจจุบันได้หลังเปิดอัตโนมัติ
- `NavigationTree` รับ state และ toggle callback แบบ controlled และใช้ React `useId()` สร้าง id ของ panel แยกแต่ละ tree instance เพื่อไม่ซ้ำกันระหว่าง Desktop/Mobile
- เพิ่ม `ChevronRight`/`ChevronDown` จาก `lucide-react`; ไม่มี package ใหม่
- Root documents render ก่อน subsection disclosure เพื่อรักษาลำดับเดิม

## Verification

1. Unit test: root document มองเห็นทันที และไม่มี button disclosure สำหรับหมวดหลัก
2. Unit test: child document ไม่อยู่ใน DOM ก่อนกดชื่อหมวดย่อย, ปรากฏหลัง click, และ `aria-expanded` เปลี่ยนจาก `false` เป็น `true`
3. Unit test: เมื่อ `currentPath` เป็น child document หมวดย่อยนั้นเปิดตั้งแต่ render และ document มี `aria-current="page"`
4. Unit test: เปิดหมวดย่อยหนึ่งแล้วเปิดอีกหมวดย่อยแรกยังคงเปิดอยู่ และหมวดปัจจุบันพับได้หลังเปิดอัตโนมัติ
5. Unit test: สถานะหมวดย่อยของ Mobile drawer อยู่หลังปิด/เปิด drawer และ `aria-controls` ของ Desktop/Mobile ไม่อ้างถึง id เดียวกัน
6. Browser smoke: Desktop sidebar และ Mobile drawer มี behavior เดียวกัน; link ยังคงนำทาง/ปิด drawer ตามเดิม
7. รัน `npm run test:public`, `npm run lint`, และ `npm run build`

## Non-goals

- ไม่พับเอกสารที่อยู่ในหมวดหลัก
- ไม่ทำ accordion ที่เปิดได้ทีละหมวด
- ไม่เพิ่ม active-TOC tracking, custom scrollbar, animation dependency, persistence ข้ามการ reload หรือการเปลี่ยน schema
