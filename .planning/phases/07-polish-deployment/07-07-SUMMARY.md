---
phase: 07-polish-deployment
plan: 07
status: complete
requirements: [DEP-05]
completed: 2026-05-02
---

# 07-07 — pg_cron Prod URL Cutover

## Outcome

Migration `0006_cron_prod_url_cutover.sql` ships and applies cleanly to the prod Supabase project (`gltwnfnkodzkupkxwpro`). The daily 09:00 UTC pg_cron job (`dealdrop-daily-price-check`) now invokes the prod URL `https://dealdrop-khaki.vercel.app/api/cron/check-prices` via the SECURITY DEFINER wrapper that reads `dealdrop_cron_secret` from Vault. Migration-per-concern preserved (0005 untouched).

## Migration 0006 vs 0005 — Substantive Diff

| Delta | 0005 (dev) | 0006 (prod) |
|-------|------------|-------------|
| `net.http_post` URL | `https://dealdrop.vercel.app/api/cron/check-prices` (dev placeholder) | `https://dealdrop-khaki.vercel.app/api/cron/check-prices` (prod alias) |
| `raise exception` hint | "run Step 1 of migration 0005 with a real token" | "create it via vault.create_secret() in the prod project before applying 0006" |
| Comments | Vault-create-secret commented-out block (WR-03 footgun fix for dev) | Out-of-band Vault precondition note (Plan 07-05 already seeded prod) |

Function body, search_path, REVOKE/GRANT lines, schedule expression `'0 9 * * *'`, and idempotent `cron.unschedule` guard are byte-identical to 0005.

## Apply Result

| Step | Outcome |
|------|---------|
| `cat supabase/.temp/project-ref` | `gltwnfnkodzkupkxwpro` (linked to prod) |
| Vault precondition `SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret'` | 1 row |
| `npx supabase db push --linked` | `Applying migration 0006_cron_prod_url_cutover.sql ... done` |
| `cron.job` row exists | jobname=`dealdrop-daily-price-check`, schedule=`0 9 * * *`, command=`select public.trigger_price_check_cron()` |
| `pg_get_functiondef` URL assertion (Option B boolean) | `url_is_prod = true` |
| `cron.job.command` grep-cleanliness | passes — no inline secret |

## Deviations

### 1. `regprocedure` cast syntax

Plan's verification query used `'public.trigger_price_check_cron'::regprocedure` (bare name). Supabase SQL Editor rejected with a syntax error because `regprocedure` requires the full signature including arg types. Fix: use `'public.trigger_price_check_cron()'::regprocedure` (with parens) OR the `oid`-from-`pg_proc` lookup. Both options recorded in 07-VERIFICATION.md.

### 2. Cell truncation hid the function body

`pg_get_functiondef` output is multi-line; Supabase SQL Editor row-view truncated to the trailing `end if;`. Worked around with the `LIKE '%dealdrop-khaki.vercel.app%'` boolean variant — a single-row boolean is visible in the cell view without expansion.

### 3. Optional manual trigger (Step 5) skipped

The optional `SELECT public.trigger_price_check_cron()` smoke test was not run. Migration + cron.job + URL assertion are sufficient proof of the cutover. End-to-end loop will exercise for real either at the next 09:00 UTC fire or during Plan 07-08's DEP-06 forced-price-drop test. If the fire 401s, the diagnostic is a CRON_SECRET mismatch — re-paste the same 48-char value into Vercel `production` env AND Supabase Vault.

## Threat Mitigations

- T-07-17 (CRON_SECRET in cron.job.command): mitigated — wrapper-function pattern preserved; `command` grep-clean.
- T-07-18 (wrong URL in wrapper): mitigated — `url_is_prod` boolean assertion confirms prod alias.
- T-07-19 (Vault secret missing → silent daily failure): mitigated — wrapper raises loud exception if `dealdrop_cron_secret` is null; precondition verified pre-apply.
- T-07-20 (plaintext CRON_SECRET in 0006): mitigated — file grep-clean of 32+ hex; Vault `create_secret` block lives in comments only.

## Self-Check: PASSED

- [x] `0006_cron_prod_url_cutover.sql` exists in `dealdrop/supabase/migrations/`
- [x] Diff vs 0005 confined to URL + raise-exception message + comments
- [x] Grep-clean of 32+ hex sequences
- [x] Build green
- [x] Migration applied to prod via `npx supabase db push --linked`
- [x] Vault precondition verified (1 row pre-apply)
- [x] `cron.job` shows the daily job at `0 9 * * *` invoking the wrapper
- [x] `pg_get_functiondef` URL assertion = prod alias (Option B boolean)
- [x] `cron.job.command` grep-clean
- [x] DEP-05 section appended to 07-VERIFICATION.md (with two deviation notes)
