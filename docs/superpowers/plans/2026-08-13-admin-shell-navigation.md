# Admin Shell Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้ผู้ดูแลนำทางระหว่างงาน Admin และออกจากระบบได้จากทุก route `/admin/*` โดยไม่เปลี่ยน authorization boundary หรือข้อมูลฐานข้อมูล

**Architecture:** เพิ่ม `AdminShell` แบบ client component ที่ `src/app/admin/layout.tsx` ใช้ครอบ content หลัง route pages ตรวจ `requireAdmin()` แบบ server อยู่เดิม. Component เก็บ route definitions เพียงจุดเดียว, แสดง sidebar บน desktop และ Base UI Dialog drawer บนจอเล็ก; Logout ใช้ Supabase browser client และ Next router เฉพาะ client.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, `@base-ui/react/dialog`, `@supabase/ssr`, Vitest + Testing Library, Lucide.

## Global Constraints

- Sidebar แสดงเฉพาะ `/admin/*`; Login และ Public routes ต้องไม่มี Admin chrome.
- Pages ต้องคง `requireAdmin()` บน server; ห้ามใช้ client navigation เป็น authorization.
- ห้ามอ่าน/แสดง `user_metadata`, email หรือข้อมูลบัญชีใน UI.
- Logout เรียก `supabase.auth.signOut()` จาก browser client เท่านั้น; ห้ามแก้ Auth users, `public.users`, `public.roles`, RLS, schema หรือ migration.
- Desktop ใช้ sidebar; viewport ต่ำกว่า `lg` ใช้ drawer modal ที่ keyboard-accessible.
- ห้าม Deploy Staging/Production ในแผนนี้จนกว่าภูจะอนุมัติ deployment แยก.
- ใช้ TDD: test ต้อง RED ก่อน production code ทุก task ที่เปลี่ยน behavior.

---

## File Structure

- Create: `src/components/admin/admin-shell.tsx` — desktop sidebar, mobile drawer, active route navigation และ logout state.
- Create: `src/components/admin/admin-shell.test.tsx` — real component behavior tests for navigation, focus, logout success/failure.
- Modify: `src/app/admin/layout.tsx` — ใช้ `AdminShell` รอบ Admin children โดยคง robots metadata.
- Modify: `package.json` — เพิ่ม focused script `test:admin-shell` ที่รัน test ใหม่เท่านั้น.
- Modify: `docs/todo/M01-foundation.md`, `TODO.md`, `context.md`, `docs/context/testing-and-commands.md` — บันทึก close-out ของ Admin navigation/logout หลัง verification ที่ผ่านจริง.

---

### Task 1: Build accessible Admin navigation shell

**Files:**
- Create: `src/components/admin/admin-shell.tsx`
- Create: `src/components/admin/admin-shell.test.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `usePathname()` from `next/navigation`, `Dialog` from `@base-ui/react/dialog`, Lucide icons.
- Produces: `AdminShell({ children }: { children: React.ReactNode })` and a focused `npm run test:admin-shell` command.

- [ ] **Step 1: Write failing navigation/drawer tests**

Create `admin-shell.test.tsx` with mocked `next/navigation` pathname `/admin/documents`. Render the real `AdminShell` and assert:

```tsx
expect(screen.getByRole("link", { name: "โครงสร้าง" }).getAttribute("href")).toBe("/admin/structure");
expect(screen.getByRole("link", { name: "เอกสาร" }).getAttribute("aria-current")).toBe("page");
expect(screen.getByRole("link", { name: "Editor" }).getAttribute("href")).toBe("/admin/editor");
expect(screen.getByRole("link", { name: "กลับหน้าคู่มือ" }).getAttribute("href")).toBe("/");
```

Add a mobile interaction test: click `เมนูผู้ดูแล`, assert dialog exists and first focusable navigation item receives focus; press Escape, assert dialog is removed and focus returns to the trigger.

- [ ] **Step 2: Run the focused test and record RED**

Run:

```powershell
npx vitest --config vitest.config.mts run src/components/admin/admin-shell.test.tsx
```

Expected: FAIL because `AdminShell` and the focused command do not exist yet.

- [ ] **Step 3: Implement the smallest navigation shell**

Create `AdminShell` with a single `adminNavigation` constant containing title, href and icon for `/admin/structure`, `/admin/documents`, `/admin/editor`. Use a `<nav aria-label="เมนูผู้ดูแล">`; its active link receives `aria-current="page"`. Desktop renders the sidebar at `lg` and mobile renders `Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Backdrop`, and `Dialog.Popup` using the same link list. Give mobile list links an `onClick` that closes the drawer.

Render `<main id="main-content" className="min-w-0">{children}</main>` beside/after the navigation so existing pages retain their content structure. Update `src/app/admin/layout.tsx` to return `<AdminShell>{children}</AdminShell>`. Do not add authorization logic to layout or remove per-page `requireAdmin()` calls.

Add package script:

```json
"test:admin-shell": "vitest --config vitest.config.mts run src/components/admin/admin-shell.test.tsx"
```

- [ ] **Step 4: Run GREEN verification**

Run:

```powershell
npm run test:admin-shell
npx tsc --noEmit
npm run lint
```

Expected: all commands exit 0; the drawer uses Base UI focus management rather than custom Tab handling.

- [ ] **Step 5: Commit the navigation task**

```powershell
git add package.json src/app/admin/layout.tsx src/components/admin/admin-shell.tsx src/components/admin/admin-shell.test.tsx
git diff --cached --check
git commit -m "feat(admin): add navigation shell"
```

---

### Task 2: Add reliable Logout to the shared shell

**Files:**
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/components/admin/admin-shell.test.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/client`, `useRouter()` from `next/navigation`.
- Produces: visible `ออกจากระบบ` action with pending and safe error behavior.

- [ ] **Step 1: Extend tests with logout success and failure behavior**

Mock only browser boundaries: `createClient()` returns `{ auth: { signOut } }`, and `useRouter()` returns `{ replace, refresh }`. Render real shell and assert:

```tsx
await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"));
expect(refresh).toHaveBeenCalledTimes(1);
```

For `{ error: new Error("network") }` and a rejected promise, assert exactly one safe `role="alert"` message `ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`, and assert the button becomes enabled again. Do not assert SDK error text.

- [ ] **Step 2: Run logout tests and record RED**

Run:

```powershell
npm run test:admin-shell
```

Expected: FAIL because Logout action is absent.

- [ ] **Step 3: Implement the minimal logout action**

In `AdminShell`, add `isSigningOut` and `logoutError` state. On Logout click:

1. Clear old error and disable the action.
2. Call `createClient().auth.signOut()`.
3. If returned error or thrown exception, set only the safe Thai error.
4. On success call `router.replace('/auth/login')` then `router.refresh()`.
5. In `finally`, restore button enabled state if still mounted.

Render the same action in desktop and mobile navigation through one shared navigation-content component; do not duplicate state or handlers. Give the alert `role="alert"`, no internal error details, and keep the button target at least 44px tall in the drawer.

- [ ] **Step 4: Run GREEN and regression verification**

Run:

```powershell
npm run test:admin-shell
npx tsc --noEmit
npm run lint
npm run build
npm run cf:build
```

Expected: focused tests pass; build retains only the documented Next Middleware deprecation and OpenNext Windows warnings.

- [ ] **Step 5: Commit the logout task**

```powershell
git add src/components/admin/admin-shell.tsx src/components/admin/admin-shell.test.tsx
git diff --cached --check
git commit -m "feat(auth): add admin logout control"
```

---

### Task 3: Reconcile M01 evidence and request Staging deployment approval

**Files:**
- Modify: `docs/todo/M01-foundation.md`
- Modify: `TODO.md`
- Modify: `context.md`
- Modify: `docs/context/testing-and-commands.md`

**Interfaces:**
- Consumes: Task 1–2 command outputs and source review confirming page-level `requireAdmin()` remains.
- Produces: accurate local close-out evidence plus an explicit Staging deployment request; no remote mutation in this task.

- [ ] **Step 1: Verify server authorization has not moved**

Run:

```powershell
rg -n "await requireAdmin\(\)" src/app/admin
```

Expected: `/admin/structure`, `/admin/documents`, document edit/new, and `/admin/editor` still require Admin server-side.

- [ ] **Step 2: Update evidence documentation truthfully**

Update M01 from `Ready to close — ... sign-out control is a P2 follow-up` to state that Admin navigation and sign-out are implemented locally but Staging verification is pending. Record only actual focused test counts and final local command results. Do not claim Staging success or remove the earlier M01–M06 evidence.

- [ ] **Step 3: Run final local verification and secret scan**

Run:

```powershell
npm run test:admin-shell
npx tsc --noEmit
npm run lint
npm run build
npm run cf:build
git diff --check
rg -n "DOCS_MEDIA_UPLOAD_SECRET=|service_role|postgres(ql)?://[^ ]+:[^ ]+@|password\s*=|token\s*=" src docs TODO.md context.md -g '!*.lock'
```

Expected: commands pass; secret scan finds no committed secret/connection string.

- [ ] **Step 4: Commit local evidence**

```powershell
git add TODO.md context.md docs/context/testing-and-commands.md docs/todo/M01-foundation.md
git diff --cached --check
git commit -m "docs: record admin navigation verification"
```

- [ ] **Step 5: Stop for explicit Staging deployment approval**

Report the precise requested action:

```text
Deploy only Docs App to Staging with `npx wrangler deploy --config wrangler.jsonc --keep-vars`.
Do not deploy Docs Media Worker, do not migrate/reset/truncate/delete Staging data, and do not touch Production.
```

Do not execute this command until ภู approves it directly.

---

### Task 4: Staging smoke and final M01 close-out

**Files:**
- Modify: `docs/todo/M01-foundation.md`
- Modify: `TODO.md`
- Modify: `context.md`
- Modify: `docs/context/testing-and-commands.md`

**Interfaces:**
- Consumes: explicit user deployment approval, deployed Docs App version, existing Staging Admin and non-admin sessions.
- Produces: final M01 navigation/logout evidence without data/schema mutation.

- [ ] **Step 1: Build and dry-run the Staging App deployment**

Run with Staging public values only:

```powershell
$env:NEXT_PUBLIC_DOCS_SITE_URL = 'https://docs-pool-villa-staging.chaymanus2003.workers.dev'
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://sxvkhzhqtrpxgzumsswl.supabase.co'
npm run cf:build
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Expected: target is `docs-pool-villa-staging`, binding `DOCS_MEDIA` remains present, and no secret value appears.

- [ ] **Step 2: Deploy only after the explicit approval gate**

Run:

```powershell
npx wrangler deploy --config wrangler.jsonc --keep-vars
npx wrangler deployments list --config wrangler.jsonc
```

Expected: Docs App version is recorded. Do not deploy `workers/docs-media`.

- [ ] **Step 3: Verify Guest/non-admin/Admin navigation and logout**

In independent existing Staging browser sessions:

- Guest `/admin` returns 307 to `/auth/login`.
- Non-admin `/admin` returns Public; no Admin shell is rendered.
- Admin sees sidebar links and active state on Structure/Documents/Editor; at 390px `เมนูผู้ดูแล` opens a focus-contained drawer, Escape returns focus, and no horizontal overflow/console errors occur.
- Admin clicks `ออกจากระบบ`; browser reaches `/auth/login`; a follow-up `/admin` returns login rather than Admin content.

Do not create users or modify fixture/legacy data.

- [ ] **Step 4: Record actual Staging evidence and commit**

Update M01/TODO/context/testing context with deployment version and actual smoke results. Mark M01 closed only if every check above passed; otherwise retain the exact blocker.

```powershell
git add TODO.md context.md docs/context/testing-and-commands.md docs/todo/M01-foundation.md
git diff --cached --check
git commit -m "docs: close admin navigation verification"
```

- [ ] **Step 5: Verify branch state before reporting**

Run:

```powershell
git status --short
git log --oneline -6
```

Expected: clean worktree and commits for the Admin shell/local evidence plus any approved Staging close-out evidence.
