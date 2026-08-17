# Local Development Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the Docs App locally against the existing Staging configuration without changing remote state.

**Architecture:** The checked-in `.env.example` defines the required keys; the ignored `.env.local` supplies their existing local/Staging values. Next.js runs locally through `npm run dev`; HTTP checks prove the public route and unauthenticated Admin guard work without authenticating or mutating data.

**Tech Stack:** Node.js, npm, Next.js 16.3.0, PowerShell.

## Global Constraints

- Never print secret values from `.env.local`.
- Do not run Supabase migration, reset, deploy, Cloudflare deploy, or data mutation commands.
- Use existing `node_modules` and the locked `package-lock.json`; do not install or upgrade dependencies.
- Local web origin is `http://localhost:3000`.

---

### Task 1: Verify configuration and run the Local App

**Files:**
- Read: `.env.example`
- Read: `.env.local`
- Read: `package.json`
- Modify: none unless a required key is missing; stop and report the key name instead.

**Interfaces:**
- Consumes: `.env.local` values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DOCS_SITE_URL`, `NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL`, and `DOCS_MEDIA_UPLOAD_SECRET`.
- Produces: a Next.js development server at `http://localhost:3000` and a validation report without secret values.

- [x] **Step 1: Check required environment-key presence without exposing values**

Run:

```powershell
$required = @(
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_DOCS_SITE_URL',
  'NEXT_PUBLIC_DOCS_MEDIA_WORKER_URL',
  'DOCS_MEDIA_UPLOAD_SECRET'
)
$values = @{}
Get-Content .env.local | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object { $values[$Matches[1]] = $Matches[2] }
$required | ForEach-Object { "$_=" + $(if ($values.ContainsKey($_) -and $values[$_].Length -gt 0) { '<configured>' } else { '<missing>' }) }
```

Expected: each required key reports `<configured>`.

- [x] **Step 2: Verify the locked dependencies are usable**

Run:

```powershell
npm ls next react react-dom --depth=0
```

Expected: `next@16.3.0`, `react@19.2.8`, and `react-dom@19.2.8` resolve without npm errors.

- [x] **Step 3: Start the development server**

Run in a hidden background PowerShell process:

```powershell
Start-Process -WindowStyle Hidden -FilePath npm -ArgumentList 'run','dev' -RedirectStandardOutput "$env:TEMP\docs-pool-villa-next.out" -RedirectStandardError "$env:TEMP\docs-pool-villa-next.err"
```

Expected: the server listens at `http://localhost:3000`.

- [x] **Step 4: Verify public and Guest Admin routes without authenticating**

Run:

```powershell
$public = Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
$admin = Invoke-WebRequest http://localhost:3000/admin -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
"public=$($public.StatusCode)"
"admin=$($admin.StatusCode) location=$($admin.Headers.Location)"
```

Expected: `public=200`; `/admin` returns a redirect with `Location: /auth/login`.

- [x] **Step 5: Report the running local URL and any non-secret setup issue**

Report `http://localhost:3000`, whether all required variables were configured, resolved dependency versions, and the two HTTP outcomes. Do not report any value from `.env.local`.
