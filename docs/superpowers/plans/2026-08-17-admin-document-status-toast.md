# Admin document status toast implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace Admin document-management inline status messages with accessible top-center toast notifications.

**Architecture:** A client AdminToastProvider is mounted below the server Admin layout and exposes a typed context hook. Existing flows call its success/error functions without changing their server actions, navigation, media recovery UI, or pending state.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

## Global Constraints

- Top-center fixed position; mobile width is capped to the viewport.
- Success: role="status", auto-dismiss after 3,000 ms.
- Error: role="alert", no auto-dismiss, close button labelled ปิดข้อความแจ้งเตือน.
- Showing a new notification replaces the old one.
- Do not add packages or change server/database/media behavior.

---

### Task 1: Build shared toast provider

**Files:**
- Create: src/components/admin/admin-toast.tsx
- Create: src/components/admin/admin-toast.test.tsx
- Modify: src/app/admin/(content)/layout.tsx

**Interfaces:**
- Produces AdminToastProvider({ children }: { children: ReactNode }).
- Produces useAdminToast(): { showSuccess(message: string): void; showError(message: string): void }.

- [ ] **Step 1: Write a failing provider test**

~~~tsx
it("dismisses success after 3 seconds", async () => {
  vi.useFakeTimers();
  render(<ToastHarness />);
  await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "success" }));
  expect(screen.getByRole("status")).toHaveTextContent("บันทึกสำเร็จ");
  await act(() => vi.advanceTimersByTimeAsync(3_000));
  expect(screen.queryByRole("status")).toBeNull();
});

it("keeps error until the close button is pressed", async () => {
  render(<ToastHarness />);
  await userEvent.setup().click(screen.getByRole("button", { name: "error" }));
  expect(screen.getByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
  await userEvent.setup().click(screen.getByRole("button", { name: "ปิดข้อความแจ้งเตือน" }));
  expect(screen.queryByRole("alert")).toBeNull();
});
~~~

- [ ] **Step 2: Verify RED**

Run: npx vitest --config vitest.config.mts run src/components/admin/admin-toast.test.tsx

Expected: FAIL because the toast module does not exist.

- [ ] **Step 3: Implement minimal provider**

~~~tsx
type Toast = { id: number; kind: "success" | "error"; message: string };

export function useAdminToast() {
  const value = useContext(AdminToastContext);
  if (!value) throw new Error("useAdminToast must be used within AdminToastProvider");
  return value;
}
~~~

Use a single toast state, a useEffect timeout only for success, and an X-icon button that clears errors. Mount the provider around the Admin layout children.

- [ ] **Step 4: Verify GREEN**

Run: npx vitest --config vitest.config.mts run src/components/admin/admin-toast.test.tsx

Expected: PASS.

### Task 2: Migrate document management status flows

**Files:**
- Modify: src/app/admin/(content)/documents/document-form.tsx
- Modify: src/components/admin/explorer/document-setup-form.tsx
- Modify: src/components/admin/explorer/document-reorder-list.tsx
- Modify: their three matching .test.tsx files.

**Interfaces:**
- Consumes the useAdminToast hook from Task 1.
- Retains local validation errors, uploading state, media operation UI, and navigation.

- [ ] **Step 1: Write failing flow tests**

~~~tsx
it("reports document save failure through the shared toast", async () => {
  actions.saveDocument.mockResolvedValue({ error: "บันทึกเอกสารไม่สำเร็จ" });
  renderFormWithinToastProvider();
  await userEvent.setup().click(screen.getByRole("button", { name: "บันทึกและตรวจทาน" }));
  expect(screen.getByRole("alert")).toHaveTextContent("บันทึกเอกสารไม่สำเร็จ");
});
~~~

Add corresponding tests for failed draft creation and failed reorder save, plus a success-status assertion for a saved document.

- [ ] **Step 2: Verify RED**

Run: npx vitest --config vitest.config.mts run "src/app/admin/(content)/documents/document-form.test.tsx" src/components/admin/explorer/document-setup-form.test.tsx src/components/admin/explorer/document-reorder-list.test.tsx

Expected: FAIL because those flows use inline messages.

- [ ] **Step 3: Implement toast calls**

~~~tsx
const { showError, showSuccess } = useAdminToast();

if ("error" in result) {
  showError(result.error);
  return false;
}
showSuccess("บันทึกเอกสารสำเร็จ");
~~~

Remove only message state and inline status JSX. Keep operation banners and all existing action semantics.

- [ ] **Step 4: Verify GREEN**

Run the same command from Step 2.

Expected: PASS.

### Task 3: Migrate section-management errors

**Files:**
- Modify: src/components/admin/explorer/section-inline-form.tsx
- Modify: src/components/admin/explorer/section-panel.tsx
- Modify: their matching .test.tsx files.

**Interfaces:**
- Consumes the useAdminToast hook from Task 1.
- Keeps MediaOperationBanner and the mutationsBlocked message in context because they are recovery/blocking UI, not transient action status.

- [ ] **Step 1: Write a failing section failure test**

~~~tsx
it("reports a section save failure through the shared toast", async () => {
  saveSection.mockResolvedValue({ error: "Slug หรือ Route นี้ถูกใช้งานแล้ว" });
  renderWithinToastProvider(<SectionInlineForm {...props} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "บันทึกหมวด" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Slug หรือ Route นี้ถูกใช้งานแล้ว");
});
~~~

Also cover failures from section delete-preview, delete, and retry.

- [ ] **Step 2: Verify RED**

Run: npx vitest --config vitest.config.mts run src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx

Expected: FAIL because errors are still in local form/panel backgrounds.

- [ ] **Step 3: Implement and preserve recovery UI**

Replace setMessage(result.error) with showError(result.error) and remove duplicated inline error blocks, including the delete dialog error. Do not remove media operation banners or mutation-blocked UI.

- [ ] **Step 4: Verify GREEN**

Run the same command from Step 2.

Expected: PASS.

### Task 4: Integrate and verify

**Files:**
- Modify: TODO.md

- [ ] **Step 1: Record the completed M07 follow-up**

Add one completed bullet for the top-center Admin toast, its 3-second success timeout, and persistent closeable error behavior.

- [ ] **Step 2: Run focused regression tests**

Run: npx vitest --config vitest.config.mts run src/components/admin/admin-toast.test.tsx "src/app/admin/(content)/documents/document-form.test.tsx" src/components/admin/explorer/document-setup-form.test.tsx src/components/admin/explorer/document-reorder-list.test.tsx src/components/admin/explorer/section-inline-form.test.tsx src/components/admin/explorer/section-panel.test.tsx

Expected: PASS.

- [ ] **Step 3: Run project validation**

Run: npm run lint then npm run build

Expected: both exit 0.

