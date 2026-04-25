---
phase: 06-automated-monitoring-email-alerts
plan: 05
status: complete
completed_at: 2026-04-25
requirements_completed:
  - CRON-01
  - CRON-02
  - CRON-03
  - CRON-05
  - CRON-10
  - CRON-11
  - EMAIL-04
threat_refs_validated:
  - T-6-01
  - T-6-03
---

# Plan 06-05 — Cron Route Handler + Live DB Wiring

## Objective met
Wired `app/api/cron/check-prices/route.ts` (GET health + Bearer-guarded POST), flipped `route.test.ts` from RED to GREEN, applied migration 0005 to cloud Supabase via the Dashboard SQL Editor, verified grep-cleanliness + Vault secret + privilege grants, and ran the four-case local curl UAT plus an end-to-end email send through Resend.

## Tasks
| # | Status | Commit | Notes |
|---|--------|--------|-------|
| 1 | ✓ | `e9e71db` | Route handler implemented (55 lines), 11/11 route tests GREEN |
| 2 | ✓ | (operator, no commit) | Migration 0005 applied via Dashboard SQL Editor; `cron.schedule()` returned jobid 4 |
| 3 | ✓ | (operator, no commit) | Local UAT — 4 curl cases + Resend test send all green |

Plan 06-03 dollar-quote tag fix committed in `32f04b7` after the Dashboard parser mis-handled `$fn$`.

## Verification

### Code-level
- `dealdrop/app/api/cron/check-prices/route.ts` — exports `GET`, `POST`, `maxDuration = 300`, `dynamic = 'force-dynamic'`, `runtime = 'nodejs'`
- `dealdrop/app/api/cron/check-prices/route.test.ts` — 11 GREEN tests, 0 `it.todo`, 0 import probes
- Full vitest suite: 157/157 GREEN
- `npm run build` — exits 0

### Operational (post-migration)
- `cron.job` row for `dealdrop-daily-price-check`: schedule `'0 9 * * *'`, active, command `select public.trigger_price_check_cron()` (grep-clean of CRON_SECRET — CRON-11 ✓)
- `vault.secrets` row for `dealdrop_cron_secret`: 1 row, created
- `has_function_privilege` for `public.trigger_price_check_cron()`: anon `f`, authenticated `f`, service_role `t` (T-6-01 defense ✓)

### Local UAT
- Case A `GET /api/cron/check-prices` → 200 OK
- Case B `POST` (no Authorization) → 401 Unauthorized
- Case C `POST` (wrong Bearer) → 401 Unauthorized
- Case D `POST` (correct Bearer) → 200 OK, body `{"status":"ok","scraped":3,"updated":0,"dropped":0,"failed":[]}`

### Email pipeline
- Manually doubled stored `current_price` for one product → `POST` → `dropped: 1` → Resend dashboard logs the delivery → email received at signup address. EMAIL-04 verified end-to-end.

## Deviations
1. **Plan 01 RED skeleton import path** — used `../../../../../app/api/cron/check-prices/route` which resolves outside the project root. Auto-fixed during Task 1 to co-located `./route` import. Documented inline in `route.test.ts`.
2. **`$fn$` → `$func$` (committed in `32f04b7`)** — the Supabase Dashboard SQL Editor mis-parsed `$fn$` as a non-quote token, causing `SELECT INTO v_secret` to be interpreted as a CREATE-TABLE-style `SELECT INTO new_table`. Switched to `$func$` for forward compatibility.

## Files
- `dealdrop/app/api/cron/check-prices/route.ts` (created, 55 lines)
- `dealdrop/app/api/cron/check-prices/route.test.ts` (RED → GREEN, 11 tests)
- `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` (post-fix dollar-quote tag)
