# Document Progress Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the document editor's boxed stage list with an accessible connected circular stepper.

**Architecture:** Keep all stepper state derived inside `DocumentForm` from the existing `stage` value. Render the three fixed stages from one local data structure so the visual state, `aria-current`, icons, and connecting rails cannot diverge. No new shared component or dependency is needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

## Global Constraints

- Preserve the existing three stages, ordering, save flow, and `aria-current="step"` behavior.
- Keep ordered-list semantics and the Thai accessible list label `ขั้นตอนจัดทำเอกสาร`.
- Keep Thai labels visible beneath decorative icons on every viewport.
- Use existing semantic Tailwind colors and Lucide React; add no packages.
- Preserve the existing unrelated working-tree changes.

---

### Task 1: Add stepper state regression tests

**Files:**
- Modify: `src/app/admin/(content)/documents/document-form.test.tsx:existing DocumentForm stage tests`

**Interfaces:**
- Consumes: `DocumentForm` with `initialStage: "content" | "review"`.
- Produces: Tests that protect completed/current/upcoming state, visible Thai labels, and the absence of a final connector.

- [ ] **Step 1: Write the failing test**

```tsx
it("shows completed, current, and upcoming document steps", () => {
  const { container } = renderForm({ stage: "content" });

  expect(screen.getByText("ข้อมูลเอกสาร").closest("li")?.dataset.state).toBe("completed");
  expect(screen.getByText("เขียนเนื้อหา").closest("li")?.getAttribute("aria-current")).toBe("step");
  expect(screen.getByText("สถานะเอกสาร").closest("li")?.dataset.state).toBe("upcoming");
  expect(container.querySelectorAll("[data-step-connector]")).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx"`

Expected: FAIL because the existing boxed list has no `data-state` or connector elements.

- [ ] **Step 3: Add the review-stage test**

```tsx
it("marks the first two steps complete when reviewing", () => {
  renderForm({ stage: "review" });

  expect(screen.getByText("ข้อมูลเอกสาร").closest("li")?.dataset.state).toBe("completed");
  expect(screen.getByText("เขียนเนื้อหา").closest("li")?.dataset.state).toBe("completed");
  expect(screen.getByText("สถานะเอกสาร").closest("li")?.getAttribute("aria-current")).toBe("step");
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx"`

Expected: FAIL because the existing boxed list exposes neither of the expected state attributes.

### Task 2: Implement the connected circular stepper

**Files:**
- Modify: `src/app/admin/(content)/documents/document-form.tsx:imports and existing progress <ol>`

**Interfaces:**
- Consumes: `stage: "content" | "review"` already managed by `DocumentForm`.
- Produces: A three-item `<ol>` with `data-state` of `completed`, `current`, or `upcoming`, two connector elements marked `data-step-connector`, and the current item's `aria-current="step"`.

- [ ] **Step 1: Extend the Lucide import**

```tsx
import { Check, ClipboardList, Power, FileText, Save } from "lucide-react";
```

- [ ] **Step 2: Define fixed local step metadata before `DocumentForm`**

```tsx
const documentSteps = [
  { key: "setup", label: "ข้อมูลเอกสาร", Icon: ClipboardList },
  { key: "content", label: "เขียนเนื้อหา", Icon: FileText },
  { key: "review", label: "สถานะเอกสาร", Icon: Power },
] as const;
```

- [ ] **Step 3: Replace the boxed `<ol>` with one derived map**

```tsx
{documentSteps.map(({ key, label, Icon }, index) => {
  const completed = key === "setup" || (key === "content" && stage === "review");
  const current = (key === "content" && stage === "content") || (key === "review" && stage === "review");
  const state = completed ? "completed" : current ? "current" : "upcoming";
  const MarkerIcon = completed ? Check : Icon;

  return <li key={key} data-state={state} aria-current={current ? "step" : undefined}>...</li>;
})}
```

The marker is `size-10 lg:size-12`, uses soft mint/primary/muted semantic classes by `state`, and has `aria-hidden="true"`. Each item has its Thai label in a centered text element. Render a flexible rounded connector only when `index < documentSteps.length - 1`; completed rails use the mint accent and all other rails use the border color.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx"`

Expected: PASS with all `document-form` tests passing.

### Task 3: Validate presentation and code quality

**Files:**
- Verify: `src/app/admin/(content)/documents/document-form.tsx`
- Verify: `src/app/admin/(content)/documents/document-form.test.tsx`

**Interfaces:**
- Consumes: The completed connected stepper and focused test coverage.
- Produces: Evidence that the component remains lint-clean and its narrow test suite passes.

- [ ] **Step 1: Inspect both supported states**

Check content and review renders for: three readable labels, two connectors, a 40px mobile/48px large-screen marker, mint completed state, dark current state, muted upcoming state, and no trailing connector.

- [ ] **Step 2: Run lint for the changed files**

Run: `npx eslint "src/app/admin/(content)/documents/document-form.tsx" "src/app/admin/(content)/documents/document-form.test.tsx"`

Expected: exit code 0 with no lint errors.

- [ ] **Step 3: Check the patch for whitespace errors**

Run: `git diff --check`

Expected: exit code 0 and no output.

- [ ] **Step 4: Commit only the stepper implementation and test**

```bash
git add -- "src/app/admin/(content)/documents/document-form.tsx" "src/app/admin/(content)/documents/document-form.test.tsx"
git commit -m "feat: redesign document progress stepper"
```
