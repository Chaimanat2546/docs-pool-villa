# Public Reader Fixed Columns Design

## Goal

ทำให้ตำแหน่งและความกว้างของสามส่วนบนหน้าอ่านเอกสาร Public คงที่บน Desktop ไม่เปลี่ยนตามความยาวของหมวด เนื้อหา หรือรายการใน TOC ("ในหน้านี้").

## Scope

- แก้เฉพาะ `ReaderNavigation` ของหน้าเอกสาร Public
- ไม่แก้หน้าแรก, data query, document schema หรือ Mobile drawer

## Layout

ที่ breakpoint `xl` (อย่างน้อย 1280px) ขึ้นไป ให้ Reader ใช้ grid กึ่งกลางที่มีรางคงที่:

| ส่วน | ขนาด |
|---|---:|
| หมวด (Sidebar) | 240px (15rem) |
| เนื้อหา | 672px (42rem) |
| ในหน้านี้ (TOC) | 192px (12rem) |

กำหนด `width` ของ container เป็นผลรวมของทั้งสามรางและช่องว่าง 40px สองช่อง (1,184px) พร้อม `max-width: 100%` เพื่อไม่ให้ล้นก่อนถึง breakpoint. จัด layout ไว้กึ่งกลางหน้าจอ. เนื้อหาไม่มีสิทธิ์ขยายราง; ข้อความยาวให้ wrap/scroll ภายในตามชนิดเนื้อหาเดิม.

TOC column ต้อง render เป็น `<aside>` เสมอใน Desktop. เมื่อไม่มี H2/H3, ภายใน TOC ว่างได้ แต่คอลัมน์ 192px ต้องยังคงอยู่ เพื่อให้ตำแหน่ง Sidebar และเนื้อหาเท่ากันทุกเอกสาร.

## Responsive behavior

- ต่ำกว่า `xl` (รวม Tablet 1024–1279px): คง Mobile/Tablet behavior เดิม — Sidebar เป็น dialog drawer, TOC อยู่ใน `<details>` ในคอลัมน์เนื้อหา และไม่จองคอลัมน์ Desktop.
- ไม่มีการเพิ่ม breakpoint หรือ dependency.

## Verification

- ตรวจด้วย browser smoke ที่ viewport 1024, 1184, 1232 และ mobile; ไม่เพิ่ม unit test ที่ผูกกับชื่อ Tailwind class.
- รัน `npm run test:public`, `npm run lint`, และ `npm run build` ก่อนส่งมอบ.

## Non-goals

- ไม่ปรับ typography, card, homepage หรือเนื้อหาเอกสาร.
- ไม่ทำให้ TOC แสดงข้อความ placeholder ต่อผู้ใช้เมื่อว่าง.
