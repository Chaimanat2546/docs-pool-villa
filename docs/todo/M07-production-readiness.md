# M07 — Production Readiness Runbook

**Status:** Production App and Media deployed on 15 September 2026. Guest/Public and Media smoke passed; authenticated Production browser smoke and remaining M07 capacity/device checks are not yet verified.

## Completed rollout — 15 September 2026

- After ภู paused another project, resumed `webook-staging` successfully through Supabase Dashboard. Staging API became available; no migration, data reset, or legacy change performed.
- Built and deployed current App to Staging, version `01ca66b6-7b97-4263-af60-10e6457008c2`. Homepage, empty/matching search and existing `/test1/introduction` Reader returned 200; Guest `/admin` redirected 307 to login. Browser homepage and Ctrl+K focus verified.
- Local source tests passed 52 files / 334 tests with `npx vitest --config vitest.config.mts run src --exclude '**/.worktrees/**' --maxWorkers 2`. The initial broad command included another worktree and failed React hook resolution; excluding worktrees exposed one timing-dependent retry-button assertion under parallel load. That file passed 15/15 independently and the complete bounded-worker run passed without code changes.
- Rebuilt with Production `.env` plus explicit Production config. Browser asset scan found no Staging project/key or Media secret; Production URL was present. OpenNext build passed with existing middleware/Windows warnings.
- Provisioned App secrets from ignored `.env` without printing values. Deployed `docs-pool-villa`, version `e9c281b5-d0f8-4f13-9d36-2cbad67925c4`, at `https://docs-pool-villa.poolvilla.workers.dev`.
- Production `/`, `/auth/login`, `/api/search?q=zzzzzz`, `/sitemap.xml` returned 200; Guest `/admin` returned 307 to `/auth/login`. Sitemap uses the approved workers.dev URL. Browser homepage renders the no-published-documents state; Ctrl+K focuses search. Production currently has no published Reader to smoke-test.
- Production Media signed upload returned 201, read returned 200 image/webp, exact-key cleanup returned 200 and subsequent read 404. Only the temporary smoke object was removed; no document data was created or deleted.
- App rollback: this is the first real App release; there is no prior verified App version. If a critical issue appears, disable this new App route pending a corrected build; do not roll back database schema or alter legacy Workers. Subsequent releases can use this verified version as rollback target.
- Remaining verification: Production Admin/non-admin authenticated navigation and full editor flow, plus existing M07 capacity/device matrix. No credentials or Production user fixtures were created for these checks.

Entries below are historical setup observations; the completed rollout above supersedes their blockers.

## workers.dev confirmation — 15 September 2026

- ภู approved `https://docs-pool-villa.poolvilla.workers.dev` as the initial Production site. Updated App canonical origin and Media allowed origin accordingly.
- Media redeployed as version `84de2c49-7141-4b20-9020-4e2235b13961`. New-origin OPTIONS returns 204 with the matching CORS header; previous custom domain and unrelated origin both return 403.
- Rebuilt the App with Production `.env` and the updated explicit config; OpenNext build and App dry-run passed. App remains undeployed.
- Attempted Resume for Staging in Supabase Dashboard. Supabase blocked it because an organization member has reached the limit of two active free projects. Resuming requires pausing/deleting another project or upgrading; none of those broader actions were performed. User direction is required to resolve the quota.

## Deployment setup — 15 September 2026

- Production Supabase is `ACTIVE_HEALTHY`; all 13 repository Docs migrations are already applied. Additional remote migrations exist after these; no migration/history repair was performed. Anonymous `doc_sections?select=id&limit=0` returns 200.
- Production Cloudflare account access verified. Workers subdomain is `poolvilla`; `webook-media` bucket exists. No accessible `poolvilla.co.th` zone was returned.
- Added explicit `wrangler.production.jsonc` files for App and Media; default Staging config is unchanged. Production App name is `docs-pool-villa`, service binding targets `docs-media`, and planned canonical origin remains `https://docs.poolvilla.co.th` pending domain resolution.
- Deployed `docs-media` at `https://docs-media.poolvilla.workers.dev`, version `e6c6d435-949f-4788-be7b-8d2b3f0efde8`. Uses existing `webook-media` bucket with code restricted to `docs/`, and `DOCS_MEDIA_UPLOAD_SECRET` from ignored `.env`, verified different from Staging. Existing legacy Workers were not changed.
- Media checks: allowed-origin OPTIONS 204; foreign-origin OPTIONS 403; unsigned DELETE 401. Local Worker tests 9/9. Signed upload/read/delete smoke is still pending.
- Production OpenNext build and App/Media dry-runs passed. Build explicitly injects Production `.env` values and Production config vars into the child process, ahead of Staging `.env.local`; do not use plain `npm run cf:deploy` for Production.
- Lint exit 0 with five unused-variable warnings (including generated Wrangler temporary files); `git diff --check` passed. Existing Next middleware/OpenNext Windows warnings remain.
- Staging Supabase `sxvkhzhqtrpxgzumsswl` is `INACTIVE`; its API hostname returns ENOTFOUND. Staging homepage and search return 500, Guest admin redirects 307. Restore Staging before fresh App verification and deployment.
- App has not been deployed and custom domain has not been attached. Domain choice and Staging restoration remain pending. Backup evidence is not needed for this rollout unless a new database migration becomes necessary.

The historical gates below describe the 26 August assessment; use the fresh findings above for current migration and resource status.

**Requirement baseline:** [Poolvilla Docs Requirements TH v1.2](../Poolvilla-Docs-Requirements-TH-v1.2.md)

## Verified read-only facts — 26 August 2026

- Supabase Production target: `rqizfiayvcbozlzuvbok` (`https://rqizfiayvcbozlzuvbok.supabase.co`)
- `supabase migration list --project-ref rqizfiayvcbozlzuvbok` matches the legacy baseline through `20260806173000`.
- `supabase db push --project-ref rqizfiayvcbozlzuvbok --skip-vault --dry-run` lists 13 pending Docs-only migrations and no seed or role changes.
- Cloudflare Production account identifier is `7c1d945e149fc6fad2124176124d8f33`; the repository contains only Staging Worker configuration, so it does not establish Production Worker/R2/origin identifiers.
- Staging App validation is recorded in [M07 TODO](M07-search-hardening.md); it is not evidence for Production deployment.

## Gate 1 — Supabase Production migration

**Target:** `rqizfiayvcbozlzuvbok`

**Pending migrations:** `20260811032210` through `20260818085232` (13 Docs-only files; exact dry-run output must be rechecked immediately before rollout).

**Preconditions:**

- [ ] ภู provides a verified latest backup timestamp and its dashboard/source of record.
- [ ] Rollback SQL for these exact migrations is tested on Staging and reviewed; it must not drop `pg_trgm`, change Legacy objects, or delete Production data.
- [ ] Fresh migration dry-run still lists exactly the approved Docs files, with no seed/role changes.
- [ ] ภู gives explicit approval to apply this gate only.

**Deploy command:** Not authorised or recorded until the four preconditions are met.

**Post-deploy smoke:** migration parity; Docs DB lint/advisors; Guest/non-admin/Admin RLS matrix; Published search/reader; no legacy-object diff.

**Stop condition:** missing/older backup, unexpected migration, any legacy change, failed RLS/security check, or rollback not tested.

## Gate 2 — Docs Media Worker

**Target:** Blocked. The Production Media Worker name, R2 bucket and allowed origin are not present in the repository and must not be inferred from `.poolvilla.worker.dev`.

**Preconditions:**

- [ ] Confirm exact Worker name/URL, Production R2 bucket and `docs/` prefix scope in the Production Cloudflare account.
- [ ] Confirm `DOCS_MEDIA_UPLOAD_SECRET` exists by name only; never expose its value.
- [ ] Confirm App Worker `DOCS_MEDIA` binding points only to that Worker.
- [ ] Fresh dry-run and explicit approval from ภู for this gate.

**Post-deploy smoke:** rejected cross-origin/unsigned upload/delete; signed upload/read/delete under one test document key; exact-key cleanup succeeds.

**Rollback:** roll back to the immediately preceding Media Worker version only if the previous version is compatible with the same object contract and secret/bucket binding.

## Gate 3 — Docs App Worker

**Target:** Blocked. The Production App Worker name/URL and `NEXT_PUBLIC_DOCS_SITE_URL` are not present in the repository.

**Preconditions:**

- [ ] Confirm exact Worker name/URL, account, production Supabase URL, Media Worker URL and service binding.
- [ ] Confirm required secret names without reading values.
- [ ] Fresh `wrangler deploy --dry-run` against the confirmed target; no implicit config conversion from Staging.
- [ ] Explicit approval from ภู for this gate.

**Post-deploy smoke:** `/` 200, Guest `/admin` redirects to login, non-admin denied, Admin navigation works, empty and matching public search work, Published Reader works, no console error.

**Rollback:** Cloudflare rollback to the prior verified App Worker version, then re-run the smoke checks. Do not roll back Supabase schema automatically.

## M07 completion blockers

- [x] Fresh Local pgTAP/RLS gate: Docker Desktop restarted; applied only the four missing Local migrations without reset, then pgTAP/RLS passed 194/194. Local schema lint found no errors; security/performance advisor warnings remain Legacy-only, with no `doc_*` finding.
- [ ] Mobile LCP p75 and load/capacity evidence.
- [ ] Remaining browser/device matrix (Safari macOS/iOS and Chrome Android).
- [ ] Backup proof and tested rollback plan.
- [ ] Exact Production Cloudflare resources and separate approval gates.
