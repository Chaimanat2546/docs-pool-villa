# Public Reader Sticky Header Scroll Offset Design

## Goal

เมื่อผู้ใช้นำทางระหว่างเอกสาร Public ด้วยลิงก์ในหน้า เช่น “ก่อนหน้า/ถัดไป” Next.js ต้องไม่เลื่อน breadcrumb ของเอกสารปลายทางไปอยู่ใต้ Public header แบบ sticky ผู้ใช้ต้องเห็น breadcrumb ทันทีโดยไม่ต้องเลื่อนกลับขึ้นเอง

## Root cause

`PublicHeader` เป็น sticky header สูง `3.5rem` (`min-h-14`) แต่ Next.js App Router จัดการ scroll หลังการนำทางโดยข้าม sticky element เพื่อหาเป้าหมายที่เลื่อนได้ ผลที่ทดสอบได้คือการกด “ถัดไป test1test1” จาก `/test1/test2-docs` ทำให้ปลายทางมี `window.scrollY = 57` และ breadcrumb `test1` อยู่ที่ y=24 ใต้ header ซึ่งสิ้นสุดที่ y=57

Next.js ระบุให้ใช้ CSS `scroll-padding-top` บน scroll container เพื่อชดเชย sticky header ในกรณีนี้

## Design

- เพิ่ม `scroll-padding-top: 3.5rem` ให้ `html` ใน global base styles
- ค่า `3.5rem` ตรงกับความสูง content ของ Public header (`min-h-14`) และทำให้ Next.js native scroll target เริ่มใต้ header แทนการเลื่อน breadcrumb ไปซ่อนด้านหลัง
- ครอบคลุมลิงก์นำทางของ Public Reader ทั้ง sidebar, mobile drawer และก่อนหน้า/ถัดไป โดยไม่ต้องเพิ่ม prop, event handler หรือ JavaScript
- การเปิด URL โดยตรงและการกด Back/Forward คง browser/Next.js default behavior; การเปลี่ยนแปลงนี้มีผลเฉพาะกรณีที่ browser หรือ Next.js ใช้ scroll-based positioning

## Scope

- แก้ `src/app/globals.css` เท่านั้น
- ไม่เปลี่ยน header, fixed reader rails, data query, schema, route, link history behavior หรือ mobile layout
- ไม่แก้หน้าแรกตามขอบเขตที่ภูยืนยันก่อนหน้า

## Accessibility and responsive behavior

- Skip link และการนำทางด้วย hash ได้รับ scroll offset เดียวกัน จึงไม่ตกใต้ sticky header
- ไม่มี JavaScript เพิ่ม และไม่เปลี่ยน focus, keyboard navigation หรือ reduced-motion behavior
- ค่า offset ใช้หน่วย `rem` เพื่อสอดคล้องกับ Tailwind `h-14` ทุกขนาดหน้าจอที่ header ใช้โครงสร้างเดียวกัน

## Verification

1. Browser smoke: เปิด `/test1/test2-docs` ที่ด้านบน กด “ถัดไป test1test1” และยืนยันว่า breadcrumb `test1` ของ `/test1/test1-docs` มองเห็นได้ทั้งหมด โดยขอบบนของ breadcrumb ต้องไม่อยู่เหนือขอบล่างของ header
2. Browser smoke: ยืนยัน Header ยังคง sticky และ content/rails เดิมไม่เลื่อนผิดตำแหน่ง
3. รัน `npm run test:public`, `npm run lint`, และ `npm run build`

## Non-goals

- ไม่ทำ custom scroll restoration
- ไม่เปลี่ยนให้ลิงก์ทุกชนิดบังคับ scroll top
- ไม่ปรับ breakpoint หรือความกว้างคอลัมน์ของ Public Reader
