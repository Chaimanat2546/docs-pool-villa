# Public Reader Sticky Rails Design

## Goal

ให้คอลัมน์ “หมวด” และ “ในหน้านี้” บนหน้าอ่านเอกสาร Public ติดอยู่ใต้ header และเลื่อนภายในคอลัมน์ของตนเองเมื่อรายการยาวเกิน viewport โดยคอลัมน์เนื้อหายังคงใช้ page scroll ปกติ.

## Scope

- แก้เฉพาะ `ReaderNavigation` ของหน้าเอกสาร Public
- ใช้เฉพาะ Desktop breakpoint `xl` ขึ้นไปตาม fixed-grid design ที่อนุมัติก่อนหน้า
- ไม่แก้หน้าแรก, data query, document schema, header, Mobile drawer หรือ TOC mobile `<details>`

## Layout and scrolling

ที่ `xl` ขึ้นไป:

| ส่วน | พฤติกรรม |
|---|---|
| หมวด | ราง 15rem, `sticky` ใต้ header 56px, สูงเท่า viewport ที่เหลือ, scroll ภายในเมื่อรายการยาว |
| เนื้อหา | ราง 42rem, ไม่มี fixed height หรือ overflow; อ่านด้วย page scroll ปกติ |
| ในหน้านี้ | ราง 12rem, `sticky` ใต้ header 56px, สูงเท่า viewport ที่เหลือ, scroll ภายในเมื่อรายการยาว |

ใช้ `top-14`, `max-h-[calc(100dvh-3.5rem)]`, `overflow-y-auto` และ `self-start` กับทั้งสอง `<aside>`. ใช้ `overscroll-contain` เพื่อไม่ให้ scroll chain ไปยังหน้าโดยไม่ตั้งใจขณะ pointer อยู่บน rail ที่ถึงขอบแล้ว. ไม่มี scrollbar ที่บังคับแสดงเมื่อเนื้อหาสั้น.

TOC `<aside>` ฝั่ง Desktop ยังคงอยู่เมื่อไม่มี H2/H3 เพื่อรักษาราง 12rem ตาม fixed-grid design; ภายในว่างและไม่เกิด scrollbar.

## Responsive and accessibility

- ต่ำกว่า `xl`: คง behavior ปัจจุบัน — Sidebar เป็น dialog drawer, TOC อยู่ใน `<details>` และทั้งสองใช้ page flow ปกติ.
- ลิงก์ใน NavigationTree/TOC ยัง keyboard-focus ได้; browser จะเลื่อน scroll container ให้เห็นลิงก์ที่ focus โดยอัตโนมัติ.
- ไม่เพิ่ม JavaScript listener, state หรือ package.

## Verification

- ไม่เพิ่ม unit test ที่ตรวจ string ของ Tailwind class เพราะ JSDOM ไม่คำนวณ CSS layout จริง; regression test เดิมต้องผ่าน.
- Browser smoke บน `xl` document ที่มีรายการหมวด/TOC ยาว: rail อยู่ใต้ header เมื่อ page scroll, rail scroll ได้เอง, และเนื้อหาหลักยัง page scroll.
- Browser smoke บน document ที่ TOC ว่าง: rail ขวายังจองพื้นที่ แต่ไม่มี overflow ที่มองเห็น.
- Browser smoke ที่ 1024px และ 390px: drawer, TOC `<details>` และ page flow เดิมไม่ถดถอย.
- รัน `npm run test:public`, `npm run lint`, และ `npm run build`.

## Non-goals

- ไม่สร้าง custom scrollbar, progress indicator หรือ active-TOC tracking.
- ไม่เปลี่ยน fixed width/tracks หรือ breakpoint `xl` ที่อนุมัติแล้ว.
