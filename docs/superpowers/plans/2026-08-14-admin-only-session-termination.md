# Admin-only Session Termination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ล้าง Supabase session และส่งผู้ใช้ non-admin ไปหน้า login เมื่อพยายามเข้าถึง Admin functionality

**Architecture:** `requireAdmin()` คงการตรวจ session และ `public.doc_is_admin()` เดิมไว้ แต่ redirect non-admin ไปยัง GET Route Handler ภายในแทนหน้า Public โดยตรง Route Handler สร้าง server Supabase client เพื่อ sign out และตอบ redirect ไปหน้า login พร้อม error code ที่ UI แปลเป็นข้อความเข้าถึงได้

**Tech Stack:** Next.js 16 App Router Route Handler, Supabase SSR, TypeScript, Vitest

## Global Constraints

- ใช้ `public.doc_is_admin()` เป็น source of truth; ไม่อ่านหรือแก้ `public.users` จาก client
- ไม่แก้ schema, RLS, migration หรือข้อมูล Supabase
- Guest redirect `/auth/login`; non-admin redirect `/auth/admin-only`; Admin ผ่านได้
- Route Handler ต้องล้าง session ก่อน redirect `/auth/login?error=admin_only`
- ห้าม expose secret/service-role key และไม่ใช้ `user_metadata` ตัดสินสิทธิ์
- รักษา existing uncommitted changes ที่ไม่เกี่ยวข้อง

---

## File structure

- Modify: `src/lib/auth/require-admin.ts` — เปลี่ยนปลายทาง redirect ของ non-admin เท่านั้น
- Create: `src/lib/auth/require-admin.test.ts` — unit tests สำหรับ guest, non-admin, RPC failure และ admin
- Create: `src/app/auth/admin-only/route.ts` — GET handler ที่ sign out และ redirect ไป login
- Create: `src/app/auth/admin-only/route.test.ts` — unit test ว่า handler ล้าง sessionและ redirect ถูกต้อง
- Modify: `src/app/auth/login/page.tsx` — อ่าน `error=admin_only` และส่งข้อความเข้า form
- Modify: `src/app/auth/login/sign-in-form.tsx` — แสดงข้อความ error จาก redirect อย่าง accessible ก่อน submit
- Modify: `src/app/auth/login/sign-in-form.test.tsx` — regression test สำหรับข้อความ admin-only
- Modify: `TODO.md` — บันทึก approved cross-module security follow-up และหลักฐาน local verification

### Task 1: Redirect non-admin to the session-termination route

**Files:**
- Modify: `src/lib/auth/require-admin.ts:7-24`
- Create: `src/lib/auth/require-admin.test.ts`

**Interfaces:**
- Consumes: `createClient(): Promise<SupabaseClient>` and `redirect(path: string): never`
- Produces: `requireAdmin(): Promise<void>`; redirects unauthenticated users to `/auth/login`, non-admin users to `/auth/admin-only`, and otherwise resolves

- [ ] **Step 1: Write the failing test**

```ts
it("redirects a non-admin to the session-termination route", async () => {
  createClient.mockResolvedValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  });

  await expect(requireAdmin()).rejects.toEqual(expect.objectContaining({ digest: "NEXT_REDIRECT;/auth/admin-only" }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/lib/auth/require-admin.test.ts`

Expected: FAIL because the existing guard redirects non-admin users to `/`.

- [ ] **Step 3: Add coverage for the remaining guard outcomes**

```ts
it("redirects a guest to login without calling the admin RPC", async () => {
  const rpc = vi.fn();
  createClient.mockResolvedValue({ auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }) }, rpc });
  await expect(requireAdmin()).rejects.toEqual(expect.objectContaining({ digest: "NEXT_REDIRECT;/auth/login" }));
  expect(rpc).not.toHaveBeenCalled();
});

it("resolves for an administrator", async () => {
  createClient.mockResolvedValue({ auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "admin-id" } }, error: null }) }, rpc: vi.fn().mockResolvedValue({ data: true, error: null }) });
  await expect(requireAdmin()).resolves.toBeUndefined();
});
```

- [ ] **Step 4: Implement the minimal guard change**

```ts
if (!isAdmin) {
  redirect("/auth/admin-only");
}
```

Keep the existing behavior that throws `ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลระบบได้` when the RPC errors.

- [ ] **Step 5: Run the guard test to verify it passes**

Run: `npx vitest --config vitest.config.mts run src/lib/auth/require-admin.test.ts`

Expected: PASS for guest, non-admin, admin, and RPC-error cases.

### Task 2: Clear the server session in an internal Route Handler

**Files:**
- Create: `src/app/auth/admin-only/route.ts`
- Create: `src/app/auth/admin-only/route.test.ts`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/server`
- Produces: `GET(): Promise<Response>` that calls `supabase.auth.signOut()` and returns a 307 redirect to `/auth/login?error=admin_only`

- [ ] **Step 1: Write the failing Route Handler test**

```ts
it("signs out before redirecting to the login page", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  createClient.mockResolvedValue({ auth: { signOut } });

  const response = await GET();

  expect(signOut).toHaveBeenCalledOnce();
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("http://localhost/auth/login?error=admin_only");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/app/auth/admin-only/route.test.ts`

Expected: FAIL because the Route Handler does not exist.

- [ ] **Step 3: Implement the Route Handler**

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login?error=admin_only", request.url));
}
```

Accept the `Request` parameter so the redirect origin is derived from the request instead of a hard-coded environment URL.

- [ ] **Step 4: Add the sign-out failure test and behavior**

```ts
it("still redirects to login when session cleanup reports an error", async () => {
  createClient.mockResolvedValue({ auth: { signOut: vi.fn().mockResolvedValue({ error: { message: "failed" } }) } });

  const response = await GET(new Request("http://localhost/auth/admin-only"));

  expect(response.headers.get("location")).toBe("http://localhost/auth/login?error=admin_only");
});
```

Do not surface internal cleanup details to the browser. The caller has already been denied Admin access; redirect to login in either result.

- [ ] **Step 5: Run the Route Handler test to verify it passes**

Run: `npx vitest --config vitest.config.mts run src/app/auth/admin-only/route.test.ts`

Expected: PASS for successful and failed `signOut()` calls.

### Task 3: Explain the denial on the login screen accessibly

**Files:**
- Modify: `src/app/auth/login/page.tsx:3-17`
- Modify: `src/app/auth/login/sign-in-form.tsx:8-90`
- Create: `src/app/auth/login/sign-in-form.test.tsx`

**Interfaces:**
- Consumes: `searchParams: Promise<{ error?: string | string[] }>` in `LoginPage`
- Produces: `SignInForm({ initialErrorMessage?: string }): JSX.Element`; the `admin_only` query maps to `บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล`

- [ ] **Step 1: Write the failing UI test**

```tsx
it("announces the administrator-only denial before the sign-in form", () => {
  render(<SignInForm initialErrorMessage="บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล" />);

  expect(screen.getByRole("alert")).toHaveTextContent("บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest --config vitest.config.mts run src/app/auth/login/sign-in-form.test.tsx`

Expected: FAIL because `SignInForm` has no `initialErrorMessage` prop.

- [ ] **Step 3: Implement the minimal login copy flow**

```tsx
export function SignInForm({ initialErrorMessage }: { initialErrorMessage?: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage ?? null);
  // existing submit behavior remains unchanged
}
```

```tsx
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const query = await searchParams;
  const initialErrorMessage = query.error === "admin_only" ? "บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแล" : undefined;
  return <SignInForm initialErrorMessage={initialErrorMessage} />;
}
```

Retain the existing `role="alert"`, focus behavior, and generic credential error text.

- [ ] **Step 4: Run the login UI test to verify it passes**

Run: `npx vitest --config vitest.config.mts run src/app/auth/login/sign-in-form.test.tsx`

Expected: PASS and the denial text is exposed through the existing alert semantics.

### Task 4: Verify the cross-module security follow-up and document it

**Files:**
- Modify: `TODO.md`
- Verify: `src/lib/auth/require-admin.test.ts`
- Verify: `src/app/auth/admin-only/route.test.ts`
- Verify: `src/app/auth/login/sign-in-form.test.tsx`
- Verify: `src/lib/docs/admin-explorer-server.test.ts`
- Verify: `src/app/admin/(content)/documents/actions.test.ts`

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: documented local verification without starting M07 or modifying existing modules

- [ ] **Step 1: Add regression checks that prove Admin actions are stopped by the guard**

```ts
requireAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT;/auth/admin-only"));

await expect(saveDocument(validDocument)).rejects.toThrow("NEXT_REDIRECT;/auth/admin-only");
expect(runDocumentSave).not.toHaveBeenCalled();
```

Use the existing document action test’s mocked `requireAdmin` and lifecycle function; do not bypass the guard in test code.

- [ ] **Step 2: Run focused regression tests**

Run: `npx vitest --config vitest.config.mts run src/lib/auth/require-admin.test.ts src/app/auth/admin-only/route.test.ts src/app/auth/login/sign-in-form.test.tsx src/lib/docs/admin-explorer-server.test.ts "src/app/admin/(content)/documents/actions.test.ts"`

Expected: PASS with all focused authorization, logout, login-message, explorer, and mutation tests.

- [ ] **Step 3: Run static and production build checks**

Run: `npx tsc --noEmit && npm run lint && npm run build && git diff --check`

Expected: every command exits 0.

- [ ] **Step 4: Update the cross-module follow-up record**

Add an entry in `TODO.md` under “Approved cross-module follow-up” named `Admin-only session termination` that states: local verification complete; no migration, RLS, or production action.

- [ ] **Step 5: Review the final diff before handoff**

Run: `git diff -- src/lib/auth/require-admin.ts src/lib/auth/require-admin.test.ts src/app/auth/admin-only/route.ts src/app/auth/admin-only/route.test.ts src/app/auth/login/page.tsx src/app/auth/login/sign-in-form.tsx src/app/auth/login/sign-in-form.test.tsx TODO.md && git status --short`

Expected: review only files listed above plus the approved design and plan documents; preserve unrelated user changes.
