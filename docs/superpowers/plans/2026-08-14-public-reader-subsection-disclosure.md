# Public Reader Subsection Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้เฉพาะหมวดย่อยของ Public Reader พับ/ขยายได้ พร้อมเปิดหมวดของเอกสารปัจจุบันอัตโนมัติ ขณะที่เอกสารในหมวดหลักแสดงทันที

**Architecture:** Refactor `NavigationTree` ให้ render หมวดหลักเป็น heading และ root document links ตามเดิม แล้ว render child section ผ่าน disclosure button แบบ controlled. `ReaderNavigation` เก็บ `{ currentPath, expandedSectionIds }` นอก Mobile dialog และเพิ่ม active child id เพียงครั้งเดียวเมื่อ path เปลี่ยน จึงรองรับการเปิดหลายหมวด พับ active section ภายหลังได้ และคง state เมื่อ drawer ถูก unmount โดยไม่เพิ่ม dependency.

**Tech Stack:** React, Next.js App Router, TypeScript, lucide-react, Vitest, Testing Library, Tailwind CSS v4

## Global Constraints

- แก้เฉพาะ `src/components/public/reader-navigation.tsx` และ `src/components/public/reader-navigation.test.tsx`
- หมวดหลักและเอกสารของหมวดหลักต้องมองเห็นทันที ไม่มี disclosure button สำหรับหมวดหลัก
- disclosure มีเฉพาะหมวดย่อยที่เป็น direct child ของหมวดหลัก; Docs รองรับลำดับหมวดไม่เกินสองระดับ
- Child section ที่มี `currentPath` ต้องเปิดอัตโนมัติ; หมวดอื่นเริ่มพับ และเปิดได้หลายหมวดโดยไม่ปิดกัน
- Button ต้องใช้ `type="button"`, `aria-expanded`, `aria-controls`; Chevron ต้อง `aria-hidden="true"`; collapsed documents ต้องไม่อยู่ใน DOM
- ใช้ NavigationTree เดียวกันทั้ง Desktop sidebar และ Mobile drawer; ห้ามแก้ header, TOC, rails, breakpoint, data shape, route, หน้าแรก หรือเพิ่ม package
- ห้าม deploy หรือทำ Production action

---

### Task 1: Implement accessible child-section disclosure

**Files:**
- Modify: `src/components/public/reader-navigation.tsx`
- Modify: `src/components/public/reader-navigation.test.tsx`

**Interfaces:**
- Consumes: `PublicNavigationSection` whose root `documents` are direct root documents and `children` are child sections
- Produces: `NavigationTree` that exposes child section buttons with `aria-expanded` and `aria-controls`, while preserving document links and `aria-current="page"`

- [x] **Step 1: Replace the test fixture with root and child sections, then write failing behavior tests**

In `reader-navigation.test.tsx`, use this fixture shape in addition to the existing mobile-drawer test data:

```ts
const nestedSections = [{
  id: "root", parentId: null, title: "คู่มือ", slug: "guides", description: null, sortOrder: 1,
  documents: [{ id: "root-document", sectionId: "root", title: "เริ่มต้น", slug: "start", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/start", sectionTitle: "คู่มือ", parentTitle: null }],
  children: [
    { id: "child-one", parentId: "root", title: "ตั้งค่า", slug: "configuration", description: null, sortOrder: 1, documents: [{ id: "child-one-document", sectionId: "child-one", title: "ตั้งค่าบัญชี", slug: "account", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/configuration/account", sectionTitle: "ตั้งค่า", parentTitle: "คู่มือ" }], children: [] },
    { id: "child-two", parentId: "root", title: "การใช้งาน", slug: "usage", description: null, sortOrder: 2, documents: [{ id: "child-two-document", sectionId: "child-two", title: "เริ่มใช้งาน", slug: "first-use", excerpt: null, updatedAt: "2026-08-13T00:00:00.000Z", sortOrder: 1, path: "/guides/usage/first-use", sectionTitle: "การใช้งาน", parentTitle: "คู่มือ" }], children: [] },
  ],
}];
```

Add these tests:

```ts
it("keeps root documents visible and collapses child documents until expanded", async () => {
  const user = userEvent.setup();
  render(<ReaderNavigation currentPath="/guides/start" sections={nestedSections} toc={[]}><article>เนื้อหา</article></ReaderNavigation>);
  expect(screen.getByRole("link", { name: "เริ่มต้น" })).not.toBeNull();
  expect(screen.queryByRole("button", { name: "คู่มือ" })).toBeNull();
  const subsection = screen.getByRole("button", { name: "ตั้งค่า" });
  expect(subsection).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("link", { name: "ตั้งค่าบัญชี" })).toBeNull();
  await user.click(subsection);
  expect(subsection).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "ตั้งค่าบัญชี" })).not.toBeNull();
});

it("opens the active child section and preserves other expanded sections", async () => {
  const user = userEvent.setup();
  render(<ReaderNavigation currentPath="/guides/configuration/account" sections={nestedSections} toc={[]}><article>เนื้อหา</article></ReaderNavigation>);
  expect(screen.getByRole("button", { name: "ตั้งค่า" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "ตั้งค่าบัญชี" })).toHaveAttribute("aria-current", "page");
  const other = screen.getByRole("button", { name: "การใช้งาน" });
  await user.click(other);
  expect(other).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "ตั้งค่า" })).toHaveAttribute("aria-expanded", "true");
});
```

- [x] **Step 2: Run the focused tests and confirm they fail for the missing disclosure behavior**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/reader-navigation.test.tsx
```

Expected: the new tests fail because `NavigationTree` renders child document links immediately and has no child-section buttons with `aria-expanded`.

- [x] **Step 3: Implement the minimal NavigationTree disclosure UI**

In `reader-navigation.tsx`:

1. Import `ChevronRight` from `lucide-react` and `useEffect` in addition to `useState`.
2. Add a `SubsectionDisclosure` component that receives a child `PublicNavigationSection`, `currentPath`, `isOpen`, and `onToggle`. Its button follows this exact shape, with a stable id derived from `section.id`:

```tsx
<button
  type="button"
  aria-expanded={isOpen}
  aria-controls={`section-${section.id}-documents`}
  onClick={onToggle}
  className="flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-medium hover:bg-muted"
>
  {section.title}
  <ChevronRight aria-hidden="true" className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
</button>
```

When `isOpen` is true only, render the child documents in:

```tsx
<ul id={`section-${section.id}-documents`} className="ml-3 mt-1 space-y-1 border-l pl-2">
  {/* existing document Link markup, including onClick and aria-current */}
</ul>
```

3. In `ReaderNavigation`, calculate active direct child ids with `section.children.filter((child) => child.documents.some((document) => document.path === currentPath))`. Store `{ currentPath, expandedSectionIds }` in state outside `Dialog.Portal`; when the stored path differs from `currentPath`, synchronously replace state with the new path and a fresh Set that unions existing and active ids. Toggle only the clicked id in a fresh Set. Pass that controlled state and callback to both NavigationTree instances.
4. In `NavigationTree`, call `useId()` once and include its value in each child panel id so the Desktop and Mobile instances never duplicate `aria-controls`/`id` values.
5. Keep each root heading and `section.documents` list outside disclosure. Replace the old recursive `section.children.map(...)` render with `SubsectionDisclosure` items.

Do not alter `ReaderNavigation`, dialog behavior, TOC, or desktop rail classes.

- [x] **Step 4: Run focused tests and verify green**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/public/reader-navigation.test.tsx
```

Expected: all tests in that file pass, including the existing Drawer Escape/focus test and the two new disclosure tests.

- [x] **Step 5: Perform browser smoke verification**

At desktop width (`xl` or wider), open a document with a child section. Verify root documents display immediately, child documents appear only after their child-section button is clicked, and the active child section is expanded. At width below `xl`, open “เมนูคู่มือ”, verify the same disclosure behavior, click a child document, and confirm the drawer closes through the existing `onNavigate` callback.

- [x] **Step 6: Run regression checks**

Run:

```powershell
npm run test:public
npm run lint
npm run build
```

Expected: every command exits 0. If build prints the known middleware-to-proxy deprecation warning, record it as pre-existing warning rather than a task failure.

- [x] **Step 7: Commit the task**

```powershell
git add -- src/components/public/reader-navigation.tsx src/components/public/reader-navigation.test.tsx
git commit -m "feat: disclose public reader subsections"
```

## Plan Self-Review

- Spec coverage: Task 1 covers root documents always visible, child-only disclosure, active child automatic expansion, multi-open state, accessible semantics, shared desktop/mobile tree, browser behavior, and regression checks. Active ids are derived during render rather than added in an effect because the approved implementation must comply with `react-hooks/set-state-in-effect`.
- Placeholder scan: all task steps include exact files, fixture values, assertions, markup, commands, and expected outcomes.
- Type consistency: `PublicNavigationSection`, `currentPath`, document `path`, and the existing document Link props are the only consumed interfaces; no new externally consumed type is introduced.
