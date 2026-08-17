# Public Reader Sticky Rails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ Sidebar และ TOC ของหน้าอ่านเอกสาร Public บน Desktop ติดอยู่ใต้ header และ scroll ภายใน rail ของตนเองเมื่อรายการยาว

**Architecture:** เปลี่ยนเฉพาะ class ของ `<aside>` สองตัวใน `ReaderNavigation`. ที่ `xl` แต่ละ rail จะเป็น sticky scroll container ใต้ header 56px; main column ไม่รับ fixed height หรือ overflow จึงใช้ page scroll เดิม. ต่ำกว่า `xl` class เหล่านี้ไม่ทำงานและคง drawer/TOC details เดิม.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Browser smoke

## Global Constraints

- แก้เฉพาะ `ReaderNavigation` ของหน้าเอกสาร Public; ห้ามแก้หน้าแรก, data query, document schema, header, Mobile drawer หรือ TOC mobile `<details>`
- ใช้เฉพาะ `xl` ขึ้นไป; fixed grid เดิมยังเป็น 15rem / 42rem / 12rem, gap-10 และกว้าง 74rem
- Rails ทั้งสองใช้ `xl:sticky xl:top-14 xl:max-h-[calc(100dvh-3.5rem)] xl:overflow-y-auto xl:overscroll-contain xl:self-start`
- Main content ห้ามมี fixed height, `overflow-y-auto` หรือ JavaScript scroll listener
- TOC `<aside>` ต้องจอง rail ต่อไปแม้ TOC ไม่มี H2/H3; ภายในต้องว่างและไม่แสดง placeholder
- ต่ำกว่า `xl` ต้องคง Drawer และ TOC `<details>` ใน page flow ปัจจุบัน
- ไม่เพิ่ม package, custom scrollbar, progress indicator หรือ active-TOC tracking

---

## File structure

- Modify: `src/components/public/reader-navigation.tsx` — เพิ่ม sticky/rail-scroll utilities ให้ทั้งสอง Desktop `<aside>`
- Keep: `src/components/public/reader-navigation.test.tsx` — regression drawer/focus/TOC เดิมต้องผ่าน; ไม่เพิ่ม class-string detector test

### Task 1: Make Public Reader rails independently scrollable

**Files:**
- Modify: `src/components/public/reader-navigation.tsx:44-46`

**Interfaces:**
- Consumes: Existing `ReaderNavigation({ children, currentPath, sections, toc })`, `NavigationTree`, and `Toc`
- Produces: Desktop sidebar/TOC rails that retain the existing navigation markup while becoming sticky internal scroll containers at `xl`

- [x] **Step 1: Confirm the visual-verification exception**

The user approved browser smoke instead of a unit test coupled to Tailwind class strings. JSDOM does not calculate sticky positioning or Tailwind layout, so this CSS-only change has no meaningful failing unit test. The existing component regression suite remains the automated guard for Mobile drawer/focus and TOC markup.

- [x] **Step 2: Write minimal implementation**

Replace the two Desktop `<aside>` class values in `reader-navigation.tsx` with the following exact markup:

```tsx
<aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">
  <NavigationTree sections={sections} currentPath={currentPath} />
</aside>
<main id="main-content" className="min-w-0">
  <Toc items={toc} mobile />
  {children}
</main>
<aside className="hidden xl:sticky xl:top-14 xl:block xl:max-h-[calc(100dvh-3.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">
  <Toc items={toc} />
</aside>
```

Do not change `NavigationTree`, `Toc`, the grid wrapper, or the `main` class.

- [x] **Step 3: Run component regression test**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/reader-navigation.test.tsx
```

Expected: PASS the existing mobile drawer, Escape focus-return, and mobile TOC test.

- [x] **Step 4: Run relevant regression checks**

Run:

```powershell
npm run test:public
npm run lint
npm run build
```

Expected: every command exits 0; the build has no type or route error.

- [x] **Step 5: Run browser smoke**

Use a published local document that has long navigation and TOC data at `1280px` or wider. Confirm:

1. After page scrolling, both rails remain at y=`56px` below the sticky header.
2. Each rail has `max-height: calc(100dvh - 3.5rem)`, `overflow-y: auto`, and can scroll without changing the main document scroll position while its own content has remaining scroll range.
3. The main column has no independent `overflow-y` and still responds to normal page scrolling.
4. A document with no H2/H3 retains the empty 12rem right rail without a visible scrollbar.
5. At `1024px` and `390px`, both static rails are hidden; drawer and in-content TOC remain usable.

- [x] **Step 6: Commit**

```powershell
git add -- src/components/public/reader-navigation.tsx
git commit -m "fix: make public reader rails sticky"
```

## Plan self-review

- Spec coverage: Task 1 covers sticky position, independent rail scrolling, unchanged main/page scroll, empty TOC reservation, responsive behavior, regression checks, and browser smoke.
- Placeholder scan: ไม่มีข้อความค้างหรือขั้นตอนที่ไม่มีคำสั่งและ code ที่ต้องใช้.
- Type consistency: ใช้ props และ components เดิมทั้งหมด; ไม่เพิ่ม type, state หรือ interface.
