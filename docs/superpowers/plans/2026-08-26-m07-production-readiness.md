# M07 Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce verified M07 readiness evidence and a Production runbook without changing Production state.

**Architecture:** Keep the current title-index plus runtime H2/H3 search implementation unchanged. Gather fresh evidence in four independent gates—Local regression, Staging performance/browser/security, Production configuration discovery, and release documentation—then require a separate explicit approval for every Production mutation.

**Tech Stack:** Next.js 16.3.0, Vitest, Supabase CLI/Postgres RLS, Cloudflare Workers/R2/Wrangler, in-app browser.

**Spec:** `docs/superpowers/specs/2026-08-26-m07-production-readiness-design.md`

## Global Constraints

- Do not apply a migration, deploy a Worker, set a secret, modify DNS, reset/truncate, or write any Production data.
- Use only Docs-owned objects; do not modify `public.users`, `public.roles`, legacy Worker, or legacy R2 storage.
- Production target is Supabase project `rqizfiayvcbozlzuvbok`; do not infer an incomplete `.poolvilla.worker.dev` hostname as a deploy target.
- Do not record secret values, tokens, user data, or browser session data in files or command output.
- Any production action requires a new explicit approval from ภู after dry-run, verified backup and rollback evidence.

---

## File Structure

- Modify: `docs/todo/M07-search-hardening.md` — record each completed M07 validation with exact evidence.
- Modify: `docs/context/testing-and-commands.md` — persist commands, targets, dates, measured values and known limitations.
- Create: `docs/todo/M07-production-readiness.md` — production checklist/runbook, exact non-secret identifiers, gates, smoke checks and rollback commands.
- Modify: `TODO.md` and `context.md` — change status only after every M07 acceptance gate is evidenced.

### Task 1: Establish a fresh Local baseline

**Files:**
- Modify: `docs/context/testing-and-commands.md`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Consumes: `package.json` scripts, `supabase/tests/docs_title_search_test.sql`, `src/lib/docs/public-search.ts`, and the current uncommitted working tree.
- Produces: a dated Local baseline with no unreviewed production-target configuration or test failure.

- [ ] **Step 1: Record the preflight state without changing it**

Run:

```powershell
git status --short
git diff --check
npx --yes supabase@latest --version
npx wrangler --version
```

Expected: capture existing user changes separately and stop if `git diff --check` reports whitespace errors.

- [ ] **Step 2: Run the focused Search/RLS regression suite**

Run:

```powershell
npm run test:db
npx vitest --config vitest.config.mts run src/lib/docs/public-search.test.ts src/app/api/search/route.test.ts src/components/public/public-search-palette.test.tsx
```

Expected: all pgTAP and focused Vitest tests pass; the database suite includes `docs_title_search_test.sql` and verifies guest/non-admin/admin published-only title visibility.

- [ ] **Step 3: Run the application and Worker quality gates**

Run:

```powershell
npx tsc --noEmit
npm run typecheck:worker
npm run lint
npm run build
npm run cf:build
npm audit --omit=dev
```

Expected: every command exits 0; record the existing Next middleware/OpenNext Windows warnings separately from failures.

- [ ] **Step 4: Write only factual evidence**

Add exact command results, test counts and warnings to `docs/context/testing-and-commands.md`, then mark only completed Local lines in `docs/todo/M07-search-hardening.md`.

- [ ] **Step 5: Commit the evidence-only documentation change**

Run:

```powershell
git add docs/context/testing-and-commands.md docs/todo/M07-search-hardening.md
git commit -m "docs: record m07 local readiness evidence"
```

Expected: commit contains only completed Local evidence. If tests fail, do not commit a passing claim.

### Task 2: Verify Staging performance, accessibility, and browser behavior

**Files:**
- Modify: `docs/context/testing-and-commands.md`
- Modify: `docs/todo/M07-search-hardening.md`

**Interfaces:**
- Consumes: Staging App `https://docs-pool-villa-staging.chaymanus2003.workers.dev`, Staging Supabase project `sxvkhzhqtrpxgzumsswl`, `GET /api/search`, and existing Staging test data only.
- Produces: repeatable latency measurements and browser-a11y evidence without Production access or persistent fixture creation.

- [ ] **Step 1: Confirm that the Staging target is reachable before testing**

Run:

```powershell
Invoke-WebRequest -Method Head -Uri 'https://docs-pool-villa-staging.chaymanus2003.workers.dev/' -MaximumRedirection 0
Invoke-WebRequest -Method Head -Uri 'https://docs-pool-villa-staging.chaymanus2003.workers.dev/admin' -MaximumRedirection 0
```

Expected: Public homepage is reachable and unauthenticated `/admin` redirects to login; do not authenticate by inspecting cookies or storage.

- [ ] **Step 2: Measure bounded public response and search latency**

Run 30 serial requests for the homepage, one published document URL found from public navigation, and `/api/search?q=<known-published-title-fragment>`. Capture only status and elapsed milliseconds; calculate p50/p75/p95 with a local PowerShell array and retain no response bodies.

```powershell
$durations = 1..30 | ForEach-Object { (Measure-Command { Invoke-WebRequest -Uri $target -UseBasicParsing | Out-Null }).TotalMilliseconds }
$durations | Sort-Object
```

Expected: record target, run count, p50/p75/p95, status/error count and network locality. Mark performance blocked—not passed—if a published document URL or representative query cannot be identified without creating data.

- [ ] **Step 3: Inspect query/index evidence without modifying Staging**

Run Supabase CLI help first, then use only supported read-only migration/history or advisor commands for `sxvkhzhqtrpxgzumsswl`.

```powershell
npx --yes supabase@latest migration list --help
npx --yes supabase@latest db push --help
```

Expected: confirm Local/Remote migration parity and that a dry-run has no unexpected migration. Do not use `db push --yes`, `db reset`, SQL write commands, or link the workspace to Production.

- [ ] **Step 4: Run the browser accessibility matrix**

Use the in-app browser on the Staging URL. Verify: mouse trigger, Ctrl/Cmd+K, initial input focus, Arrow/Enter result navigation, Escape focus restore, visible focus, dialog labeling, empty/error states, 200% zoom, 390px no-horizontal-overflow, Guest `/admin` redirect, and no Draft/Archived item in a known published search result.

Expected: record browser/version, viewport, assertions and any device-only gap. Never inspect browser credentials, cookies, local storage or profiles.

- [ ] **Step 5: Record measured results and unresolved device coverage**

Append the result table to `docs/context/testing-and-commands.md`; update M07 TODO only for checks actually executed. Safari macOS/iOS and Chrome Android remain explicit manual checks unless the devices are available.

- [ ] **Step 6: Commit the Staging evidence-only documentation change**

Run:

```powershell
git add docs/context/testing-and-commands.md docs/todo/M07-search-hardening.md
git commit -m "docs: record m07 staging validation"
```

Expected: no source, migration, Worker configuration, or remote state change is included.

### Task 3: Perform the Production configuration and migration-readiness audit

**Files:**
- Create: `docs/todo/M07-production-readiness.md`
- Modify: `docs/context/architecture.md`

**Interfaces:**
- Consumes: Production Supabase project `rqizfiayvcbozlzuvbok`, Cloudflare account/Worker metadata exposed to the authenticated CLI, current `wrangler.jsonc`, `workers/docs-media/wrangler.jsonc`, and Staging evidence from Task 2.
- Produces: a non-secret inventory that either establishes exact Production targets or blocks rollout with the missing prerequisite named.

- [ ] **Step 1: Discover the supported read-only CLI commands**

Run:

```powershell
npx --yes supabase@latest migration list --help
npx --yes supabase@latest db push --help
npx wrangler deployments list --help
npx wrangler r2 bucket list --help
npx wrangler secret list --help
```

Expected: select only commands that list metadata or perform dry-run; do not assume flag compatibility from Staging commands.

- [ ] **Step 2: Audit Supabase Production history and dry-run only**

Run the supported read-only migration history command for `rqizfiayvcbozlzuvbok`, then run `db push` dry-run with that exact project ref and `--skip-vault` only if help confirms the flags.

Expected: report the exact pending Docs migration filenames, or `none`; stop if any legacy migration is pending or the target cannot be proven to be `rqizfiayvcbozlzuvbok`.

- [ ] **Step 3: Audit Cloudflare Production resources without reading secret values**

List worker deployments, Docs R2 bucket metadata and required secret *names* using supported commands and the exact Production account. Confirm distinct App Worker, Media Worker, R2 bucket, `DOCS_MEDIA` service binding and allowed origin. If only staging configuration exists, mark rollout blocked instead of inventing a Worker name, account, bucket or origin.

Expected: document identifiers only; do not update `wrangler.jsonc`, call `secret put`, deploy, or access legacy resources.

- [ ] **Step 4: Obtain backup and rollback proof**

Record the Supabase Production backup timestamp, verification source and responsible owner supplied by ภู or the authorised dashboard. Draft rollback steps from the actual dry-run list and test them on Staging only after separate approval. A missing backup timestamp is a release blocker, not an assumption.

- [ ] **Step 5: Publish the non-secret readiness inventory**

Create `docs/todo/M07-production-readiness.md` with a checklist for each of the three gates: Supabase migration, Media Worker, App Worker. Each gate must list exact target, dry-run result, precondition, deploy command once the target exists, post-deploy smoke check, rollback command/condition and named stop condition.

- [ ] **Step 6: Commit the readiness audit**

Run:

```powershell
git add docs/todo/M07-production-readiness.md docs/context/architecture.md
git commit -m "docs: add m07 production readiness runbook"
```

Expected: the commit contains no secret values and no fabricated Production identifiers.

### Task 4: Close M07 evidence or report the exact blockers

**Files:**
- Modify: `docs/todo/M07-search-hardening.md`
- Modify: `docs/context/testing-and-commands.md`
- Modify: `TODO.md`
- Modify: `context.md`

**Interfaces:**
- Consumes: verified evidence and runbook from Tasks 1–3.
- Produces: an accurate M07 status; never a production deployment.

- [ ] **Step 1: Reconcile each M07 acceptance criterion with fresh evidence**

Check search p95, document-response p95, mobile LCP p75, RLS/security, browser/accessibility, migration parity, backup and rollback individually against the dated results. Write a blocking entry for every unmet criterion.

- [ ] **Step 2: Update status only if every criterion is met**

If all evidence meets the spec, mark M07 complete in `docs/todo/M07-search-hardening.md`, `TODO.md`, and `context.md`; otherwise leave M07 `In progress` and list only factual blockers.

- [ ] **Step 3: Run documentation and release guards**

Run:

```powershell
git diff --check
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' '(service_role|SUPABASE.*KEY|DOCS_MEDIA_UPLOAD_SECRET|https?://[^[:space:]]+:[^[:space:]@]+@)' docs context.md TODO.md
git status --short
```

Expected: no secret value or connection string appears in changed documentation. Review lexical policy references manually before treating them as a finding.

- [ ] **Step 4: Commit final status documentation**

Run:

```powershell
git add docs/todo/M07-search-hardening.md docs/context/testing-and-commands.md TODO.md context.md
git commit -m "docs: update m07 release readiness status"
```

Expected: commit status matches evidence; no deployment command has been run.

## Plan Self-Review

- Spec coverage: Task 1 covers Local regression; Task 2 covers performance, accessibility, browser and Staging security behavior; Task 3 covers exact Production targets, migration dry-run, backup and rollback; Task 4 prevents premature M07 closure and preserves evidence.
- Placeholder scan: all execution commands and stopping conditions are concrete; a production deploy command is deliberately not included until Task 3 proves exact targets, as required by the spec.
- Interface consistency: all tasks use the existing public `/api/search` contract, title index and runtime H2/H3 extraction. No task introduces `doc_search_segments`, a new RPC, schema change or new dependency.

