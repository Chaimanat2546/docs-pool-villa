# Document List Pagination Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เมื่อเปลี่ยนหน้ารายการเอกสาร ให้เลื่อนกลับไปที่ส่วนหัวของรายการเอกสารโดยไม่เปลี่ยนพฤติกรรมการนำทางไปหน้าอื่น

**Architecture:** ใช้ `ref` ที่มีอยู่ใน `DocumentList` ชี้ไปยัง `<section>` ของรายการ และให้ handler ของ pagination เรียก `scrollIntoView` หลังตั้งค่าหน้าใหม่ การเปลี่ยนหมวดและการเข้าแก้ไขเอกสารยังคงใช้ route navigation เดิมของ Next.js

**Tech Stack:** React Client Component, Next.js 16.3.0, TypeScript, Vitest, Testing Library

## Global Constraints

- แก้เฉพาะ pagination ใน `DocumentList`
- ไม่เพิ่ม dependency หรือเปลี่ยน route navigation
- รักษาการเปลี่ยนแปลงเดิมของผู้ใช้ใน working tree
- ต้องมี regression test และรัน validation ตามความเสี่ยง

---

### Task 1: Add pagination scroll regression coverage

**Files:**
- Modify: `src/components/admin/explorer/document-list.test.tsx`

- [ ] เพิ่ม test ที่ render รายการหลายหน้า ติดตั้ง spy บน `section.scrollIntoView` แล้วกด `หน้าถัดไป`
- [ ] ยืนยันว่าหน้าเปลี่ยนเป็นหน้า 2 และ `scrollIntoView` ถูกเรียกด้วย `{ behavior: "smooth", block: "start" }`
- [ ] รัน `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx` และยืนยันว่า test ใหม่ fail เพราะยังไม่มีการเรียก scroll

### Task 2: Implement scroll-to-list behavior

**Files:**
- Modify: `src/components/admin/explorer/document-list.tsx`

- [ ] เพิ่ม `useRef<HTMLElement | null>` สำหรับ section รายการ
- [ ] สร้าง handler pagination ที่เรียก `setPage` และ `scrollIntoView` ด้วย smooth behavior พร้อม block start
- [ ] ผูก handler กับปุ่มหน้าก่อนหน้าและหน้าถัดไป โดยไม่เปลี่ยน filter หรือ route links
- [ ] ใส่ `ref` ให้ section รายการ และคง accessibility label เดิม
- [ ] รัน test ไฟล์เดิมและยืนยันว่า test ผ่าน

### Task 3: Run focused validation

**Files:**
- No additional files

- [ ] รัน `npx vitest --config vitest.config.mts run src/components/admin/explorer/document-list.test.tsx`
- [ ] รัน `npx tsc --noEmit`
- [ ] รัน `npm run lint`
- [ ] ตรวจ `git diff --check` และตรวจ diff ว่ามีเฉพาะ test/component ของงานนี้ โดยไม่ทับไฟล์เดิมของภู
