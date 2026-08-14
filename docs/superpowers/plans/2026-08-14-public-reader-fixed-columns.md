# Public Reader Fixed Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้หน้าอ่านเอกสาร Public บน Desktop มีตำแหน่งและความกว้างของ Sidebar, เนื้อหา และ TOC คงที่ในทุกเอกสาร

**Architecture:** ปรับเฉพาะ component client `ReaderNavigation` ให้ grid Desktop มีความกว้างคงที่ 74rem และใช้ 3 รางตายตัว 15rem / 42rem / 12rem. TOC Desktop ยังคงมี `<aside>` แม้ helper `Toc` คืนค่า `null`; ต่ำกว่า `lg` คง drawer และ TOC ในเนื้อหาเช่นเดิม.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library

## Global Constraints

- แก้เฉพาะ `ReaderNavigation` ของหน้าเอกสาร Public; ห้ามแก้หน้าแรก, data query, document schema หรือ Mobile drawer
- Desktop คือ Tailwind breakpoint `lg` ขึ้นไป; ต่ำกว่า `lg` ต้องคง behavior เดิม
- Desktop grid ใช้ Sidebar `15rem`, เนื้อหา `42rem`, TOC `12rem`, `gap-10` สองช่อง และ container กว้าง `74rem` พร้อม `max-w-full`
- ไม่มี dependency หรือ breakpoint ใหม่
- TOC ว่างได้ แต่ Desktop TOC `<aside>` ต้องคงอยู่และจองพื้นที่

---

## File structure

- Modify: `src/components/public/reader-navigation.tsx` — กำหนด class ของ Desktop container/grid และเก็บ TOC `<aside>` ไว้เสมอ
- Keep: `src/components/public/reader-navigation.test.tsx` — test drawer/focus เดิมเป็น regression suite ที่ต้องยังผ่าน; ไม่เพิ่ม test ที่ผูกกับชื่อ class

### Task 1: Lock the Public Reader Desktop grid

**Files:**
- Modify: `src/components/public/reader-navigation.tsx:43-46`

**Interfaces:**
- Consumes: `ReaderNavigation({ children, currentPath, sections, toc })` และ `TocItem[]`
- Produces: Desktop DOM ที่ใช้ grid กว้าง 74rem และราง 15rem / 42rem / 12rem; TOC `<aside>` ตัวที่สองอยู่ใน DOM เสมอ

- [x] **Step 1: Confirm the visual-verification exception**

ภูเลือกให้ตรวจโครงสร้างที่ผู้ใช้เห็นด้วย browser smoke แทนการเขียน unit test ที่ผูกกับชื่อ Tailwind class. การเปลี่ยนนี้ไม่มี JavaScript behavior ใหม่ และ JSDOM ไม่คำนวณ Tailwind layout จึงไม่มี unit test ที่ fail/pass จาก CSS layout จริงโดยไม่สร้าง change detector.

- [x] **Step 2: Write minimal implementation**

เปลี่ยน grid wrapper และ TOC aside ใน `reader-navigation.tsx` เป็น:

```tsx
<div className="mx-auto grid gap-10 lg:w-[74rem] lg:max-w-full lg:grid-cols-[15rem_42rem_12rem]">
  <aside className="hidden lg:block lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
    <NavigationTree sections={sections} currentPath={currentPath} />
  </aside>
  <main id="main-content" className="min-w-0">
    <Toc items={toc} mobile />
    {children}
  </main>
  <aside className="hidden lg:block">
    <Toc items={toc} />
  </aside>
</div>
```

`Toc` ยังคงคืน `null` เมื่อ `items` ว่าง; `<aside>` ภายนอกจึงจองราง 12rem โดยไม่แสดง placeholder.

- [x] **Step 3: Run component regression test**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/reader-navigation.test.tsx
```

Expected: PASS ทุก test ในไฟล์ รวม mobile drawer/focus test เดิม.

- [x] **Step 4: Run relevant regression checks**

Run:

```powershell
npm run test:public
npm run lint
npm run build
```

Expected: ทุกคำสั่ง exit code 0; build ไม่มี type หรือ route error.

- [x] **Step 5: Run browser smoke at Desktop viewport**

เปิดหน้าเอกสาร Published ที่มี TOC และอีกหน้าที่ไม่มี H2/H3 ที่ viewport Desktop เดียวกัน. ยืนยันด้วยภาพหรือ DevTools ว่า:

1. จุดเริ่ม Sidebar, เนื้อหา และ TOC ตรงกันระหว่างสองหน้า
2. ความกว้างรางเท่ากับ 240px / 672px / 192px และ gap 40px
3. หน้าที่ไม่มี TOC ยังเหลือรางขวา 192px โดยไม่มีข้อความ placeholder
4. ที่ Mobile ยังเปิด drawer และ TOC `<details>` ได้

- [x] **Step 6: Commit**

```powershell
git add -- src/components/public/reader-navigation.tsx src/components/public/reader-navigation.test.tsx
git commit -m "fix: lock public reader desktop columns"
```

## Plan self-review

- Spec coverage: Task 1 ครบ Desktop fixed width/tracks, TOC reservation, Mobile/Tablet unchanged, component regression และ browser verification.
- Placeholder scan: ไม่มีข้อความค้างหรือขั้นตอนที่ไม่มีคำสั่งและ code ที่ต้องใช้.
- Type consistency: ใช้ props `toc: TocItem[]` ที่มีอยู่แล้ว; ไม่เพิ่ม type หรือ interface ใหม่.
