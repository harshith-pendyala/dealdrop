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
