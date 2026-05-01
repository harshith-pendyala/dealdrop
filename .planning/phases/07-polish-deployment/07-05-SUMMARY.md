---
phase: 07-polish-deployment
plan: 05
status: complete
requirements: [DEP-02, DEP-03]
completed: 2026-05-01
---

# 07-05 — Production Environment Setup

## Outcome

Stood up the prod stack: fresh Supabase prod project (`gltwnfnkodzkupkxwpro`, Tokyo) with migrations 0001..0005 applied + Vault `dealdrop_cron_secret` seeded; Vercel project `dealdrop` configured with all 7 production-scope env vars (4 sensitive); Fluid Compute on; first production deploy live and publicly reachable at the stable alias `https://dealdrop-khaki.vercel.app`. Smoke tests green: 200 on root, 200 + `{"status":"ok"}` on cron health check, 401 + `{"error":"Unauthorized"}` on unauth POST.

## Key Values for Downstream Plans

| Value | Use |
|-------|-----|
| `gltwnfnkodzkupkxwpro` (prod Supabase ref) | Plan 07-06 OAuth callback registration; Plan 07-07 Vault re-verification + migration 0006 |
| `https://dealdrop-khaki.vercel.app` (stable alias) | Plan 07-06 Google OAuth + Supabase Auth redirect URLs; Plan 07-07 hardcoded `net.http_post` URL in migration 0006; Plan 07-08 prod smoke test target |
| `https://dealdrop-pyyc6dlpa-harshithpendyala777-7300s-projects.vercel.app` (deployment URL) | Audit-only — do NOT use in pg_cron (immutable per deploy) |

## Deviation — Vercel Deployment Protection

Initial smoke tests returned `HTTP/2 401` against an HTML SSO wall, not the app's JSON. Root cause: Vercel Deployment Protection / Vercel Authentication was enabled for "All Deployments" by default. Resolution: Vercel Dashboard → Settings → Deployment Protection → "Only Preview Deployments". Production is now public; preview branches remain gated. No redeploy required.

This is a load-bearing fix for Plan 07-07 — the Supabase pg_cron call to `/api/cron/check-prices` has no Vercel SSO cookie and would 401 against the auth wall. Auth wall must stay off for production.

## Threat Mitigations

- T-07-09 (CRON_SECRET leakage): mitigated — `--sensitive` Vercel storage + Vault encryption + zero plaintext in repo. Same value in both places verified manually.
- T-07-10 (service_role key in client bundle): mitigated — set as `production`-scope without `NEXT_PUBLIC_` prefix.
- T-07-11 (Cron 504 from Fluid Compute disabled): mitigated — Fluid Compute confirmed ON.
- T-07-12 (preview env bleeding into production): mitigated — preview scope intentionally skipped (Option A).

## Self-Check: PASSED

- [x] Prod Supabase project provisioned (Tokyo, ref `gltwnfnkodzkupkxwpro`)
- [x] Migrations 0001..0005 applied via `supabase db push --linked`
- [x] Vault `dealdrop_cron_secret` seeded; `SELECT name FROM vault.secrets` returns 1 row
- [x] 7 production env vars set in Vercel; verified via `vercel env ls production`
- [x] 4 sensitive vars used `--sensitive` flag
- [x] Fluid Compute ON
- [x] First production deploy succeeded
- [x] Stable alias `dealdrop-khaki.vercel.app` resolves and serves the app
- [x] Smoke tests: 200 / 200+`{"status":"ok"}` / 401+`{"error":"Unauthorized"}`
- [x] Deployment Protection scoped to "Only Preview Deployments"
- [x] CRON_SECRET in Vercel matches Vault value bit-for-bit
- [x] Plaintext CRON_SECRET not committed to repo
- [x] DEP-01 / DEP-02 / DEP-03 sections appended to 07-VERIFICATION.md
