# M07 — Production Readiness Runbook

**Status:** Blocked pending evidence; no Production action has been taken.

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
