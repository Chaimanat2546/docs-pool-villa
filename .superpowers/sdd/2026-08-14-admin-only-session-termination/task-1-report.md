# Task 1 Report — Admin-only session termination redirect

## Result

Updated `requireAdmin()` so authenticated non-admin users redirect to `/auth/admin-only`. Guest redirect, admin success, and RPC error behavior remain unchanged.

## TDD evidence

### RED

Command:

```text
npx vitest --config vitest.config.mts run src/lib/auth/require-admin.test.ts
```

Result: failed as expected before the production change. The non-admin test received `NEXT_REDIRECT;/` instead of `NEXT_REDIRECT;/auth/admin-only`; the other three tests passed.

```text
Test Files  1 failed (1)
Tests       1 failed | 3 passed (4)
Received    digest: NEXT_REDIRECT;/
Expected    digest: NEXT_REDIRECT;/auth/admin-only
```

### GREEN

Command:

```text
npx vitest --config vitest.config.mts run src/lib/auth/require-admin.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       4 passed (4)
```

Covered outcomes:

- guest redirects to `/auth/login` and does not call the admin RPC;
- non-admin redirects to `/auth/admin-only`;
- administrator resolves successfully;
- admin RPC errors still throw `ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลระบบได้`.

## Files changed

- `src/lib/auth/require-admin.ts`
- `src/lib/auth/require-admin.test.ts`

## Self-review

- The production diff is the minimal one-line route change.
- Authorization remains delegated to the existing `doc_is_admin` RPC; no schema, RLS, migration, or Supabase changes were made.
- Tests mock only the server client and redirect boundary, and assert observable redirect/error behavior.
- `git diff --check` completed without whitespace errors.

## Concerns

None identified for Task 1. The test command required running outside the restricted sandbox because Vite config loading hit Windows `spawn EPERM` inside the sandbox.
