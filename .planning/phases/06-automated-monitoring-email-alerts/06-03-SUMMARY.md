---
phase: 06-automated-monitoring-email-alerts
plan: 03
subsystem: database-migration
tags: [pg_cron, pg_net, supabase-vault, security-definer, cron-10, cron-11]
requires:
  - migration 0003 (pg_cron + pg_net extensions enabled)
  - Supabase Vault (available by default in all Supabase projects)
provides:
  - public.trigger_price_check_cron() — SECURITY DEFINER wrapper function that reads vault.decrypted_secrets and issues net.http_post
  - pg_cron job 'dealdrop-daily-price-check' firing at 09:00 UTC daily
  - Vault entry named 'dealdrop_cron_secret' (placeholder — operator replaces before applying)
affects:
  - cron.job table gains one row after apply
  - vault.secrets / vault.decrypted_secrets gain one encrypted row after apply
  - public schema gains one function (locked to service_role EXECUTE)
tech-stack:
  added:
    - Supabase Vault (vault.create_secret, vault.decrypted_secrets) — first use in this codebase
    - SECURITY DEFINER Postgres function pattern — first use in this codebase
  patterns:
    - idempotent `do $$ ... $$` block guarded by `if not exists`
    - REVOKE from public/anon/authenticated + single GRANT to service_role
    - `cron.unschedule` guard before `cron.schedule` (re-run-safe migration)
key-files:
  created:
    - dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
  modified: []
decisions:
  - 'Used verbatim SQL from 06-RESEARCH.md §Pattern 4 (with the hostname substituted to https://dealdrop.vercel.app) and 06-03-PLAN.md <action> block. No architectural deviation.'
  - 'Pitfall 10 inline comment reworded from "raise notice ..., v_secret" wording to "raise-notice / raise-log the decrypted secret variable" prose so the grep-cleanliness check (raise notice.*v_secret → 0) passes. Rule 1 auto-fix: plan contained a literal-grep vs educational-comment conflict; prose-ified the warning.'
metrics:
  duration: 8 min
  completed: 2026-04-21
---

# Phase 6 Plan 03: Daily pg_cron + Vault-Backed Secret Summary

**One-liner:** Idempotent Supabase migration wires `cron.schedule('dealdrop-daily-price-check', '0 9 * * *', ...)` to a `SECURITY DEFINER` wrapper that reads the CRON_SECRET from Vault and POSTs `/api/cron/check-prices` via `pg_net` — `cron.job.command` stays grep-clean of the plaintext token.

## What Was Built

A single 152-line SQL migration (`0005_cron_daily_price_check.sql`, 7286 bytes) structured in three steps:

1. **Vault secret create (idempotent).** A `do $$ ... if not exists ... perform vault.create_secret(...) end $$;` block inserts a row named `dealdrop_cron_secret` with the placeholder value `CRON_SECRET-value-goes-here`. The operator replaces the placeholder out-of-band before applying, OR leaves it commented out and runs `vault.create_secret()` in the Supabase SQL Editor as a one-shot op.
2. **SECURITY DEFINER wrapper.** `public.trigger_price_check_cron()` pins `search_path = public, vault, net`, reads `vault.decrypted_secrets WHERE name = 'dealdrop_cron_secret'`, fails loudly if the secret is null, constructs the `Authorization: Bearer <v_secret>` header via `jsonb_build_object`, and calls `net.http_post(url, body, headers, timeout_milliseconds := 290000)`. Ends with three `revoke execute … from public/anon/authenticated` + one `grant  execute … to service_role`.
3. **pg_cron schedule (idempotent).** `do $$ … cron.unschedule('dealdrop-daily-price-check') where exists …` guard, followed by `cron.schedule('dealdrop-daily-price-check', '0 9 * * *', $$select public.trigger_price_check_cron()$$)`.

The migration file is load-bearing grep-clean:
- No substring matching `[a-f0-9]{32,}` (output of `grep -E '[a-f0-9]{32,}' … || echo "clean"` → **clean**).
- No `raise notice` or `raise log` line contains the token `v_secret`.
- The placeholder string `CRON_SECRET-value-goes-here` is literally present twice (once in the `perform vault.create_secret(...)` call, once in the explanatory comment) so downstream grep audits can confirm the placeholder survived.

## Embedded Hostname

The wrapper function's `net.http_post(url := ...)` literally embeds:

```
https://dealdrop.vercel.app/api/cron/check-prices
```

Plan 05's curl smoke-test and Phase 7 deployment prep must align on this exact hostname. If the production Vercel domain differs, the operator edits this string before applying the migration (noted in the inline comment above the `url :=` line).

## Operator Setup Note

**Before Phase 7 deployment:** replace the `CRON_SECRET-value-goes-here` placeholder with the real 48-char CRON_SECRET token from `env.server.ts`, via one of two paths:

- **Preferred (out-of-band):** comment out the `do $$ … vault.create_secret(...) end $$;` block in this migration and run `vault.create_secret('<real-token>', 'dealdrop_cron_secret', 'Bearer token …');` directly in the Supabase Dashboard → SQL Editor as a one-shot operation. The committed SQL file then stays permanently grep-clean even in git history.
- **Edit-and-apply:** replace the placeholder string with the real token locally, run `supabase db push`, then **immediately revert the placeholder in the working tree** (and verify `git log -p` shows the migration file never carried the real value into a commit).

Either way, **post-apply verification** should run from the SQL Editor:

```sql
select name from vault.secrets where name = 'dealdrop_cron_secret';
-- Expect: exactly one row.

select jobname, command from cron.job where jobname = 'dealdrop-daily-price-check';
-- Expect: one row, command = 'select public.trigger_price_check_cron()'.
-- Expect: NO substring matching the real CRON_SECRET.

select has_function_privilege('anon',          'public.trigger_price_check_cron()', 'execute');  -- expect false
select has_function_privilege('authenticated', 'public.trigger_price_check_cron()', 'execute');  -- expect false
select has_function_privilege('service_role',  'public.trigger_price_check_cron()', 'execute');  -- expect true
```

## Verification Results

| Check | Expected | Actual |
|---|---|---|
| File exists at `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` | yes | yes |
| Line count | ≥ 80 (plan min_lines) | 152 |
| Byte count | — | 7286 |
| Trailing newline | present | 0x0a (`tail -c 1 \| xxd` → `.`) |
| `grep -c 'CRON_SECRET-value-goes-here'` | ≥ 1 | **2** |
| `grep -cE '[a-f0-9]{32,}'` | 0 | **0** (clean) |
| `grep -cE 'raise notice.*v_secret'` | 0 | **0** |
| `grep -cE 'raise log.*v_secret'` | 0 | **0** |
| `grep -c 'grant  execute on function public.trigger_price_check_cron() to service_role'` | 1 | **1** |
| `grep -cE "'0 9 \* \* \*'"` | 1 | **1** |
| `grep -c 'UTC'` | ≥ 1 | **3** (schedule comment + two clarifying notes) |
| Node inline structural assertion (15 substrings) | all present | **all structural checks pass** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rephrased Pitfall 10 inline comment to pass `raise notice.*v_secret` grep**

- **Found during:** Task 1 verification (plan's verify step #3)
- **Issue:** The plan's own `<action>` block contained the literal line:
  ```
  -- Pitfall 10 (T-6-01 severity): DO NOT add `raise notice '...%', v_secret;`
  ```
  which documents the leak pattern by showing the forbidden construct. But the plan's `<verify>` step requires `grep -c 'raise notice.*v_secret' supabase/migrations/0005_cron_daily_price_check.sql` to return **0** — including matches inside comment lines.
- **Fix:** Reworded the educational comment from a literal example (`raise notice '...%', v_secret;`) to prose (`DO NOT raise-notice or raise-log the decrypted secret variable inside this function`). Preserves the Pitfall 10 safety marker without tripping the literal grep audit.
- **Files modified:** `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` (single comment block, 4 lines)
- **Commit:** `c50f8b8` (task-level; fix applied before the only task commit, so no separate commit)

No other deviations. The Vault + wrapper + schedule body was copied verbatim from 06-RESEARCH.md §Pattern 4 with the single documented substitution (URL placeholder `<PROD_HOST>` → `dealdrop.vercel.app` per plan `<behavior>`).

## Threat Model Mitigations Applied

| Threat ID | Mitigation in shipped file |
|---|---|
| **T-6-01** (CRON_SECRET leak via `cron.job.command`) | `cron.schedule(...)` command is literally `select public.trigger_price_check_cron()` — no secret. Wrapper reads `vault.decrypted_secrets` internally. File grep-clean of 32+ hex sequences. Pitfall 10 enforced via comment rework. |
| search_path hijack (SECURITY DEFINER) | `set search_path = public, vault, net` pinned on function definition. |
| Authenticated-user REST-API DoS | Three explicit REVOKEs (public/anon/authenticated) + single GRANT to service_role. |
| Duplicate-job-name double-firing (Pitfall 4) | `do $$ … perform cron.unschedule(...) where exists … end $$;` guard before `cron.schedule`. |

## What Happens Next (Plan Dependencies)

- **Plan 06-04** (route handler) — implements the `/api/cron/check-prices` Route Handler that this wrapper's `net.http_post` targets. URL hard-coded here must match the deployed Vercel hostname in Phase 7.
- **Plan 06-05** — the [BLOCKING] `supabase db push` that actually applies this migration to the hosted database. Plan 06-03 only writes the file; it does not apply it (handler must exist first so pg_net has a real endpoint to hit when the 9 AM UTC job fires).

## Known Stubs

None. The file is complete: the only placeholder is the CRON_SECRET literal, which is load-bearing by design (grep-audit marker, operator-replaced out-of-band). The Vercel hostname `https://dealdrop.vercel.app/...` is a committed constant the operator edits in-place if the deployment URL differs.

## Self-Check: PASSED

- Created file: `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` — **FOUND**
- Commit `c50f8b8`: `feat(06-03): add 0005_cron_daily_price_check.sql (Vault + wrapper + schedule)` — **FOUND** in `git log --oneline`
- All 15 node structural substring checks — **PASS**
- All 6 plan `<verification>` grep counts — **PASS** (see table above)
- All 8 plan `<success_criteria>` boxes — **PASS**
