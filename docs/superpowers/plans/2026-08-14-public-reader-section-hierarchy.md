# Public Reader Section Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ชื่อหมวดหลักของ Public Reader เด่นและแยกชั้นจาก root documents กับหมวดย่อยได้ชัดเจน

**Architecture:** ปรับเฉพาะ Tailwind classes ใน markup เดิมของ `NavigationTree` และ `SubsectionDisclosure`. ไม่มี state, component structure หรือ data behavior เปลี่ยน; ทั้ง Desktop sidebar และ Mobile drawer จึงรับ hierarchy เดียวกันโดยอัตโนมัติ.

**Tech Stack:** React, Tailwind CSS v4, Next.js, browser smoke test, Vitest, ESLint

## Global Constraints

- แก้เฉพาะ `src/components/public/reader-navigation.tsx`; ไม่เพิ่ม test ที่ assert Tailwind class strings เพราะไม่พิสูจน์ CSS layout จริง
- หมวดหลักต้องเป็น `text-sm font-semibold text-foreground`, `px-3`, ไม่ใช้ uppercase/tracking-wide, ไม่มี hover/link/disclosure
- Root document links ต้องคง `min-h-11`, active/hover/`aria-current` และเปลี่ยน padding เป็น `pl-5 pr-3`
- Child disclosure button ต้องคง semantics และเปลี่ยน padding เป็น `pl-5 pr-3`; child document list คง border-left และมี indentation ลึกกว่า child button
- ใช้ `space-y-6` ระหว่าง root groups; ห้ามเปลี่ยน component structure, JavaScript, state, tests, data model, routes, header, TOC, rails, breakpoint, หน้าแรก หรือ dependency
- ห้าม deploy หรือทำ Production action

---

### Task 1: Apply visual hierarchy to reader navigation

**Files:**
- Modify: `src/components/public/reader-navigation.tsx`
- Test: Browser smoke against a Public document with root and child sections

**Interfaces:**
- Consumes: Existing `NavigationTree` heading, root Link, `SubsectionDisclosure` button, and child document list markup
- Produces: The same semantics and behavior with visually distinct hierarchy classes

- [ ] **Step 1: Capture the visual baseline before editing**

At an `xl` viewport, open a Public document that has root documents and child sections. Record that the root heading shares `text-muted-foreground` and `px-3` alignment with document links, so it looks like another document. Open the mobile drawer and confirm it uses the same tree markup.

- [ ] **Step 2: Apply the minimal class-only implementation**

Make exactly these class changes in `reader-navigation.tsx`:

```tsx
// NavigationTree nav
<nav aria-label="สารบัญเอกสาร" className="space-y-6">

// Root heading
<h2 className="px-3 text-sm font-semibold text-foreground">{section.title}</h2>

// Root and child document Link
className={`flex min-h-11 items-center rounded-md pl-5 pr-3 text-sm ${document.path === currentPath ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}

// SubsectionDisclosure button
className="flex min-h-11 w-full items-center justify-between rounded-md pl-5 pr-3 text-left text-sm font-medium hover:bg-muted"

// Open child document list
<ul id={panelId} className="ml-5 mt-1 space-y-1 border-l pl-3">
```

Do not change any other class, state calculation, aria attribute, or JSX structure.

- [ ] **Step 3: Verify visual and interaction behavior**

Repeat Step 1 at Desktop and Mobile drawer. Confirm the visual sequence is visibly distinct: root heading → root document (one indentation) → child button (one indentation) → child document (border plus deeper indentation). Confirm child disclosure still toggles, active links retain their highlight, and mobile document navigation still closes the drawer.

- [ ] **Step 4: Run regression checks**

Run:

```powershell
npm run test:public
npm run lint
npm run build
```

Expected: all commands exit 0. Record the existing middleware-to-proxy deprecation warning only if it appears in build output.

- [ ] **Step 5: Commit the task**

```powershell
git add -- src/components/public/reader-navigation.tsx
git commit -m "style: clarify public reader section hierarchy"
```

## Plan Self-Review

- Spec coverage: one task applies all four specified hierarchy levels, preserves scope/non-goals, covers Desktop and Mobile, and verifies regression behavior.
- Placeholder scan: all class values, commands, and expected outcomes are explicit.
- Type consistency: no TypeScript interface or component prop changes are introduced.
