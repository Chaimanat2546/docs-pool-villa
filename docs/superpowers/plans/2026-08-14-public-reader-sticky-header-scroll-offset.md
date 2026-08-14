# Public Reader Sticky Header Scroll Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ breadcrumb ของเอกสาร Public มองเห็นใต้ sticky header ทันทีหลังผู้ใช้นำทางไปยังเอกสารอื่น

**Architecture:** ใช้ CSS scroll offset กลางบน `html` แทนการเพิ่ม JavaScript หรือแก้แต่ละ `<Link>`. Next.js จะนำ offset นี้ไปใช้เมื่อจัดตำแหน่ง scroll target หลัง client-side navigation หรือการนำทางด้วย hash; Public header สูง `3.5rem` จึงใช้ค่าเดียวกัน.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, browser smoke test, Vitest, ESLint

## Global Constraints

- แก้เฉพาะ `src/app/globals.css`; ไม่เพิ่ม dependency, JavaScript state หรือ custom scroll restoration
- Public header ใช้ `min-h-14` ซึ่งเท่ากับ `3.5rem`; scroll offset ต้องตรงค่านี้
- ไม่เปลี่ยน header, reader rails, breakpoint `xl`, หน้าแรก, schema, route หรือ link history behavior
- ต้องทดสอบเส้นทาง `/test1/test2-docs` → `/test1/test1-docs` จากบนสุดของหน้า และยืนยัน breadcrumb ไม่ถูก header บัง
- ห้าม deploy หรือทำ Production action

---

### Task 1: Add the sticky-header scroll offset

**Files:**
- Modify: `src/app/globals.css` within the existing `@layer base` `html` rule
- Test: Browser smoke against `http://localhost:3000/test1/test2-docs`

**Interfaces:**
- Consumes: `PublicHeader` height from `src/components/public/public-header.tsx` (`min-h-14` = `3.5rem`)
- Produces: global browser scroll offset via `html { scroll-padding-top: 3.5rem; }`

- [x] **Step 1: Capture the failing browser behavior before the CSS change**

Open `/test1/test2-docs` with `window.scrollY === 0`, click the visible link named `ถัดไป test1test1`, wait for URL `/test1/test1-docs`, then evaluate:

```ts
{
  scrollY: window.scrollY,
  breadcrumb: document.querySelector('nav[aria-label="เส้นทาง"]')?.getBoundingClientRect(),
  header: document.querySelector('header')?.getBoundingClientRect(),
}
```

Expected before the fix: the breadcrumb top is less than the header bottom; the reproduced baseline is `scrollY = 57`, breadcrumb top `24`, header bottom `57`.

- [x] **Step 2: Apply the minimal CSS implementation**

In the existing `@layer base` block, extend only the existing `html` rule:

```css
html {
  @apply font-sans;
  scroll-padding-top: 3.5rem;
}
```

Do not change any `<Link>` props or add event handlers. The local Next.js Link documentation specifies `scroll-padding-top` on the scroll container for sticky-header navigation offsets.

- [x] **Step 3: Verify the browser behavior passes**

Repeat Step 1 with a fresh page navigation. Assert both conditions after the route finishes:

```ts
const header = document.querySelector('header')!.getBoundingClientRect()
const breadcrumb = document.querySelector('nav[aria-label="เส้นทาง"]')!.getBoundingClientRect()

expect(breadcrumb.top).toBeGreaterThanOrEqual(header.bottom)
expect(document.querySelector('h1')?.textContent).toBe('test1test1')
```

Also scroll the page manually and confirm the Public header remains sticky; do not change the browser viewport override unless it was explicitly set for the smoke test.

- [x] **Step 4: Run regression checks**

Run:

```powershell
npm run test:public
npm run lint
npm run build
```

Expected: each command exits with code 0. Record the existing build warning about the deprecated middleware convention only if it appears; it is not a failure for this task.

- [x] **Step 5: Commit the implementation**

```powershell
git add -- src/app/globals.css
git commit -m "fix: offset public reader scroll below header"
```

## Plan Self-Review

- Spec coverage: Task 1 implements the one-file CSS offset, preserves all listed non-goals, and verifies the exact prior/next transition from the approved spec.
- Placeholder scan: no TBD/TODO/incomplete implementation steps.
- Type consistency: no TypeScript interface or runtime API is added; browser assertions use the existing DOM labels `เส้นทาง`, `header`, and `h1`.
