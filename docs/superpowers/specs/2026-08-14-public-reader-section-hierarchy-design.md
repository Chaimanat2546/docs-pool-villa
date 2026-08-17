# Public Reader Section Hierarchy Design

## Goal

ทำให้คอลัมน์ “หมวด” แยกหมวดหลักออกจากรายการเอกสารได้ชัดเจนตามแนว navigation ของ Next.js โดยไม่เปลี่ยนโครงสร้างข้อมูลหรือพฤติกรรม disclosure ของหมวดย่อย

## Problem

ปัจจุบันชื่อหมวดหลักใช้ `text-muted-foreground` และ padding ซ้ายเท่ากับลิงก์เอกสาร จึงมีน้ำหนักภาพใกล้กันเกินไป แม้หมวดหลักจะมี `font-semibold` และตัวพิมพ์ใหญ่แล้วก็ตาม

## Design

### หมวดหลัก

- แสดงชื่อในขนาด `text-sm`, น้ำหนัก `font-semibold`, สี `text-foreground`
- ไม่ใช้ `uppercase` หรือ `tracking-wide`; แสดงชื่อหมวดตามที่ผู้ดูแลตั้งไว้
- ใช้ padding ซ้าย `px-3` และเพิ่ม vertical separation ระหว่างกลุ่มด้วย `space-y-6` ของ navigation
- หมวดหลักไม่เป็น link หรือ disclosure button และไม่มี hover state

### เอกสารในหมวดหลัก

- แสดงทันทีใต้หมวดหลักตาม behavior ปัจจุบัน
- เยื้องเป็น `pl-5 pr-3` เพื่อสัมพันธ์กับหมวดหลักและชัดว่าเป็นรายการภายในกลุ่ม
- คง active background, hover state, minimum touch target และ `aria-current` เดิม

### หมวดย่อยและเอกสารของหมวดย่อย

- disclosure button ของหมวดย่อยใช้ `pl-5 pr-3` เพื่อเป็นระดับถัดจากหมวดหลัก
- เอกสารของหมวดย่อยคงเส้น border ซ้าย และเพิ่ม padding ซ้ายจาก layout เดิมเฉพาะเท่าที่จำเป็นให้เห็นชั้นลึกกว่า button หมวดย่อย
- ไม่เปลี่ยน state, auto-open, collapse, id, aria attributes หรือ desktop/mobile shared state ที่อนุมัติก่อนหน้า

## Scope

- แก้ Tailwind class ใน `src/components/public/reader-navigation.tsx` เท่านั้น
- ไม่เปลี่ยน component structure, JavaScript, tests, data model, routes, header, TOC, reader rails, breakpoint, หน้าแรก หรือ dependency

## Accessibility and responsive behavior

- ขนาด hit target ของ document links และ subsection buttons ยังคง `min-h-11`
- Contrast ของหมวดหลักเพิ่มขึ้นโดยใช้ `text-foreground`; document links ยังใช้ muted color แต่คง hover/active color เดิม
- Desktop sidebar และ Mobile drawer ได้รูปแบบเดียวกันจาก `NavigationTree` ชุดเดียว

## Verification

1. Browser smoke ที่ Desktop และ Mobile drawer: หมวดหลักมีสี/น้ำหนักเด่นกว่าเอกสาร, root documents เยื้องหนึ่งระดับ, child button และ child document เห็นระดับต่อเนื่อง
2. ยืนยัน disclosure, active document, keyboard focus และ drawer behavior เดิมไม่ถดถอย
3. รัน `npm run test:public`, `npm run lint`, และ `npm run build`

## Non-goals

- ไม่เปลี่ยนสี design system, เพิ่ม background/card, animation, icon ใหม่ หรือ custom CSS
- ไม่เปลี่ยนการพับเฉพาะหมวดย่อยหรือการแสดงเอกสารในหมวดหลัก
