---
phase: 07-polish-deployment
verified: 2026-04-25T08:05:26Z
status: in_progress
score: pending
---

# Phase 7: Polish & Deployment — Verification Report

**Phase Goal:** DealDrop is deployed to Vercel production, looks professional on mobile and desktop, handles errors gracefully, and passes an end-to-end manual test of the full sign-up → add product → price-drop alert flow.
**Verified:** in progress (rolling)
**Status:** in_progress

## Requirement Verification

| Req | Behavior | Status | Evidence |
|-----|----------|--------|----------|
| POL-01 | Sonner Toaster mounted in root layout | VERIFIED (Phase 2 D-13) | `dealdrop/app/layout.tsx:41` — `<Toaster position="top-center" richColors />` (grep confirms). Phase 7 did NOT modify `app/layout.tsx`. |
| POL-02 | Loading skeleton during add-product submission | VERIFIED (Phase 4 Plan 04-07) | `dealdrop/src/components/dashboard/ProductGrid.tsx` uses `useOptimistic`; `SkeletonCard` renders in the optimistic-pending slot while a new product is being added. Manual UAT confirms (Task 2 below). |
| POL-05 | Metadata title + description reflect DealDrop | VERIFIED | `dealdrop/app/layout.tsx:20` — `title: "DealDrop — Universal Price Tracker"`. Line 21 — `description: "Track products from any e-commerce site. Get email alerts the moment the price drops."` (grep confirms both). No "Create Next App" placeholders. |

(POL-03, POL-04, POL-06, DEP-01..06 to be appended by their respective plans.)

## POL-02 Manual UAT

| Step | Action | Observed | Expected | Status |
|------|--------|----------|----------|--------|
| 1 | Open AddProductDialog, paste books.toscrape.com URL, click Track | SkeletonCard appears in grid while scrape in flight | SkeletonCard appears | PASS |
| 2 | Wait for scrape to complete | SkeletonCard replaced by real ProductCard with name + price + image | Replaced cleanly | PASS |

**Date:** 2026-04-25
**Operator:** operator

## POL-04 Mobile Audit

**First walk:** 2026-05-01
**Operator:** operator
**Tooling:** Chrome DevTools "Responsive" mode (NOT iPhone preset — see methodology note below)

| Viewport | Component | Observed break | Fix shipped |
|----------|-----------|----------------|-------------|
| 320px | (all) | None — top-to-bottom walk produced zero visible breaks | n/a |
| 375px | (all) | None | n/a |
| 768px | (all) | None | n/a |
| Desktop | (all) | None | n/a |

**Pass 2:** Not required — first walk produced zero breaks. Audit complete.

**Total breaks at 320px:** 0 (limit: 6) ✓
**Files modified by this plan:** 0 (no Tailwind tweaks needed)

### Methodology Note — Chrome DevTools Device Preset vs Responsive Mode

The first walk attempt used Chrome DevTools "iPhone SE" / "iPhone 12" device presets, which spoof the mobile User-Agent string. Google OAuth returned `Error 403: disallowed_useragent` because Google treats certain mobile UA strings inside desktop Chrome as embedded webviews (a known Google identity policy, NOT a DealDrop bug). Switching DevTools to **"Responsive" mode** sets viewport size only without UA spoofing, allowing the OAuth flow to complete normally. This is an audit-tooling caveat — real iPhone Safari produces a valid UA and works fine. To be re-validated on a real device during the DEP-06 prod smoke test in Plan 07-08.

### Regression Sweep

- `cd dealdrop && npm run build` — green ✓
- Lint on Phase 7 new files (`error.tsx`, `error.test.tsx`, `global-error.tsx`, `global-error.test.tsx`, `icon.tsx`) — zero errors ✓
- Repo-wide lint baseline (246 pre-existing errors) — unchanged by this plan ✓
- `git diff --stat src/components/` — empty (zero source modifications) ✓
- Temporary `throw new Error('test')` debug injection in ProductGrid.tsx (Task 1 step 9) — REVERTED before stopping dev server ✓ (T-07-08 mitigated)

## DEP-03: Production Supabase Project

| Item | Value | Status |
|------|-------|--------|
| Project ref | `gltwnfnkodzkupkxwpro` | created |
| Region | Tokyo | matches dev |
| Migrations applied | 0001 / 0002 / 0003 / 0004 / 0005 | green (operator-confirmed via `npx supabase db push --linked`) |
| Vault `dealdrop_cron_secret` | seeded with 48-char prod token | verified (1 row in `vault.secrets`) |
| service_role exists | yes | verified |
| Plaintext CRON_SECRET committed to repo | no | verified — only Vault + Vercel `--sensitive` |

## DEP-02: Vercel Production Env Vars

| Variable | Scope | Sensitive | Status |
|----------|-------|-----------|--------|
| NEXT_PUBLIC_SUPABASE_URL | production | no | set |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | production | no | set |
| SUPABASE_SERVICE_ROLE_KEY | production | yes (`--sensitive`) | set |
| FIRECRAWL_API_KEY | production | yes (`--sensitive`) | set |
| RESEND_API_KEY | production | yes (`--sensitive`) | set |
| RESEND_FROM_EMAIL | production | no | set |
| CRON_SECRET | production | yes (`--sensitive`) | set; matches Vault `dealdrop_cron_secret` value bit-for-bit |

**Total:** 7 production-scope env vars (verified via `npx vercel@latest env ls production`)
**Preview scope:** Option A — preview env vars skipped per CONTEXT.md guidance (preview deploys won't have functioning auth/scrape; acceptable for portfolio bar).
**Fluid Compute:** confirmed ON (Vercel Settings → Functions). Required for `maxDuration = 300` in `app/api/cron/check-prices/route.ts:28`.

## DEP-01: First Production Deploy

| Item | Value |
|------|-------|
| Vercel project | `dealdrop` |
| Stable production alias | `https://dealdrop-khaki.vercel.app` |
| Initial deployment URL | `https://dealdrop-pyyc6dlpa-harshithpendyala777-7300s-projects.vercel.app` (immutable per deploy) |
| `curl -I /` | HTTP/2 200 |
| `curl GET /api/cron/check-prices` | 200 + `{"status":"ok"}` |
| `curl POST /api/cron/check-prices` (no auth) | 401 + `{"error":"Unauthorized"}` (app-level guard, not Vercel SSO wall) |

### Deviation — Vercel Deployment Protection

First smoke test attempt returned `HTTP/2 401` (HTML page, not JSON). Root cause: Vercel project had **Deployment Protection / Vercel Authentication** enabled for "All Deployments" by default. This blocks public traffic AND server-to-server cron calls (the Supabase pg_cron job has no SSO cookie).

**Fix applied:** Vercel Dashboard → Settings → Deployment Protection → set scope to "Only Preview Deployments" (or Disabled). Production is now publicly reachable. No redeploy required — setting is live immediately.

**Why this matters for Plan 07-07:** the pg_cron `net.http_post` call from Supabase to `/api/cron/check-prices` would 401 against a Vercel SSO wall. Auth wall must remain off for production for the daily price-check loop to work.

### Stable Alias vs Deployment URL — Use the Alias for Plan 07-07

`https://dealdrop-khaki.vercel.app` is the stable alias and is what Plan 07-07 (migration 0006 cron URL cutover) MUST hardcode. The deployment-hash URL (`-pyyc6dlpa-`) is immutable but tied to a single deployment — every new prod deploy gets a new hash, breaking the cron if hardcoded.

## DEP-04: Production OAuth Registration (Google Cloud Console)

**Authorized redirect URIs (final state — both entries):**

| URI | Scope | Status |
|-----|-------|--------|
| `https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback` | dev | preserved |
| `https://gltwnfnkodzkupkxwpro.supabase.co/auth/v1/callback` | prod | added |

**Authorized JavaScript origins:**

| Origin | Status |
|--------|--------|
| `https://vhlbdcsxccaknccawfdj.supabase.co` | preserved |
| `https://gltwnfnkodzkupkxwpro.supabase.co` | added |

Screenshot: see `screenshots/dep-04-google-redirects.png` (operator-captured).

## DEP-04: Production OAuth Registration (Supabase Auth — prod project `gltwnfnkodzkupkxwpro`)

| Setting | Value | Status |
|---------|-------|--------|
| Auth → Providers → Google | Enabled with rotated Client ID + Secret (see deviation below) | enabled |
| Auth → URL Configuration → Site URL | `https://dealdrop-khaki.vercel.app` | set |
| Auth → URL Configuration → Redirect URLs | `https://dealdrop-khaki.vercel.app/auth/callback` AND `https://*.vercel.app/auth/callback` | set |

Dev project (`vhlbdcsxccaknccawfdj`) Auth config: Site URL + Redirect URLs unchanged. **Client Secret rotated** — see deviation below.

### Deviation — `Unable to exchange external code` 500 → Client Secret Rotation

First smoke-test attempt returned the redirect chain ending at:

```
https://dealdrop-khaki.vercel.app/auth/callback?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%3A+4%2F0A
```

Root cause: the Client Secret pasted into Supabase prod's Google provider didn't match the Client Secret Google had on file (probable cause: original dev secret had drifted, or paste truncation hid the mismatch behind Supabase's `••••••` masking).

**Fix applied:** Operator generated a fresh Client Secret in Google Cloud Console (`+ ADD SECRET`), pasted into Supabase prod's Google provider, AND re-pasted into Supabase dev's Google provider so dev OAuth keeps working. Both projects now share the same active secret. Smoke test passes.

**Operational follow-up:** Both Supabase projects' Google provider Client Secret values are now tied to the same Google OAuth client secret. If that secret is ever regenerated again, BOTH Supabase projects must be re-pasted — single source of truth = the Google OAuth client.

### Deviation — Same Account for Smoke Test (No Fresh Account Available)

Plan 07-06 acceptance specified a "fresh Google account that has never signed in to DealDrop". Operator has only one Google account and reused the existing one. This is acceptable for the prod-OAuth-works proof because the **prod Supabase project** (`gltwnfnkodzkupkxwpro`) is a brand-new database with zero pre-existing users — the dev users live in the dev project. Signing in with the existing Google account on prod still inserts a fresh row in prod's `auth.users` table, validating the create-user-on-first-OAuth flow. This deviation also applies to Plan 07-08's DEP-06 email test — same account will be used (alert email lands in the same inbox as sign-up, which is the canonical end-user flow anyway).

## DEP-04: Production OAuth Smoke Test

| Step | Action | Observed | Expected | Status |
|------|--------|----------|----------|--------|
| 1 | Open `https://dealdrop-khaki.vercel.app/` in incognito | Hero page renders, 200 | Hero | PASS |
| 2 | Click Sign In → Continue with Google | Google consent screen shown | Consent | PASS |
| 3 | Complete consent with operator's Google account | Browser redirects through `/auth/v1/callback` to `/` | Land at `/` with session | PASS |
| 4 | Header shows "Sign Out" instead of "Sign In" | Yes | Yes | PASS |
| 5 | `SELECT id, email, last_sign_in_at FROM auth.users ORDER BY last_sign_in_at DESC LIMIT 1` in PROD SQL | 1 row, operator's Google email, recent timestamp | 1 row, recent | PASS |

**Date:** 2026-05-02
**Operator:** operator
**Account used:** `<operator-google@redacted>` — same account will be reused for DEP-06 non-owner email test in Plan 07-08 per the same-account deviation above.

## DEP-05: pg_cron Prod Cutover

**Migration applied:** `0006_cron_prod_url_cutover.sql` to `gltwnfnkodzkupkxwpro`
**Date:** 2026-05-02

**Vault precondition (R-03):** `SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret'` returns 1 row (seeded in Plan 07-05 Task 1 Step 5; operator-confirmed before applying 0006).

**`supabase db push --linked` outcome:** `Applying migration 0006_cron_prod_url_cutover.sql ... done` (operator-confirmed). Migrations 0001..0005 already present and skipped.

**`cron.job` verification:**

| Column | Value |
|--------|-------|
| jobname | `dealdrop-daily-price-check` |
| schedule | `0 9 * * *` |
| command | `select public.trigger_price_check_cron()` |

**Wrapper function URL (prod-URL assertion):** the operator ran the boolean variant of the verification query (Option B):

```sql
SELECT pg_get_functiondef(oid) LIKE '%dealdrop-khaki.vercel.app/api/cron/check-prices%' AS url_is_prod
FROM pg_proc
WHERE proname = 'trigger_price_check_cron'
  AND pronamespace = 'public'::regnamespace;
```

`url_is_prod = true` — confirmed the `net.http_post` line targets the prod stable alias (https://dealdrop-khaki.vercel.app/api/cron/check-prices), not the dev placeholder.

**Grep-cleanliness (CRON-11 carryover):** `cron.job.command` contains only `select public.trigger_price_check_cron()` — no inline secret. Wrapper reads Vault internally inside SECURITY DEFINER scope.

### Deviation — `regprocedure` cast format

Initial verification query `SELECT pg_get_functiondef('public.trigger_price_check_cron'::regprocedure)` returned a syntax error in the Supabase SQL Editor because `regprocedure` requires the function signature including arg types — the bare name without `()` is ambiguous. Fix: switched to `'public.trigger_price_check_cron()'::regprocedure` OR the `oid`-from-`pg_proc` lookup pattern. The plan's verification block has been recorded with the working query for future operators.

### Deviation — Result truncation in Supabase SQL Editor cell view

`pg_get_functiondef` returns a multi-line text body that the Supabase SQL Editor truncates in the row-view cell (only the trailing `end if;` was visible). Workaround: used the `LIKE '%dealdrop-khaki.vercel.app%'` boolean variant (Option B) which returns a single boolean per row — visible without expanding the cell. Recorded as Option B in the plan's verification queries for future operators.

### Optional Step 5 (manual trigger) — not run

The optional `SELECT public.trigger_price_check_cron()` smoke test was skipped. Function definition + cron.job inspection are sufficient proof of the cutover. The end-to-end loop will be exercised for real either at the next 09:00 UTC daily fire OR during Plan 07-08's DEP-06 prod smoke test (which forces a price drop and observes the email).

If the daily-fire fails with 401 in Vercel logs, the symptom is a CRON_SECRET mismatch between Vercel `production` env and Supabase prod Vault `dealdrop_cron_secret` — re-paste both with the same 48-char value (Plan 07-05 Task 2 Step 3).
