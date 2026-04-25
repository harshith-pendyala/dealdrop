---
phase: 7
slug: polish-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `07-RESEARCH.md` § "Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (already installed; `dealdrop/package.json` line 41) |
| **Config file** | `dealdrop/vitest.config.ts` (Phase 3 Plan 03-01) |
| **Quick run command** | `cd dealdrop && npx vitest run --reporter=basic` |
| **Full suite command** | `cd dealdrop && npm run test && npm run lint && npm run build` |
| **Estimated runtime** | ~30–60 seconds (existing suite + 2 new error-boundary tests) |

---

## Sampling Rate

- **After every task commit:** Run `cd dealdrop && npx vitest run --reporter=basic`
- **After every plan wave:** Run `cd dealdrop && npm run test && npm run lint && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green AND every line item in PITFALLS.md:336-348 ticked off in `07-VERIFICATION.md` AND DEP-06 screenshots committed.
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| POL-01 | `<Toaster />` mounted in root layout | static | `cd dealdrop && grep -q '<Toaster' app/layout.tsx` | ✅ (Phase 2 D-13) | ⬜ pending |
| POL-02 | `SkeletonCard` renders in optimistic-pending slot during add-product | manual UAT | DevTools — open `AddProductDialog`, paste URL, click Track, observe SkeletonCard for ~5–10s | ✅ (Phase 4 Plan 04-07) | ⬜ pending |
| POL-03 | `app/error.tsx` exports default function with `'use client'` and accepts `unstable_retry` | unit (Vitest) | `cd dealdrop && npx vitest run app/error.test.tsx` | ❌ W0 | ⬜ pending |
| POL-03 | `app/global-error.tsx` exports default with `'use client'`, renders `<html><body>`, accepts `unstable_retry` | unit (Vitest) | `cd dealdrop && npx vitest run app/global-error.test.tsx` | ❌ W0 | ⬜ pending |
| POL-03 | Error boundary fires on a forced throw and Card fallback renders | manual UAT | Inject temp `throw new Error('test')` in a leaf, observe Card fallback, click Try again, remove throw | n/a — manual; logged in `07-VERIFICATION.md` | ⬜ pending |
| POL-04 | Layout intact at 320 / 375 / 768 / desktop | manual UAT | DevTools walk-through documented in `07-VERIFICATION.md` audit table | n/a — manual | ⬜ pending |
| POL-05 | Title + description match REQUIREMENTS | static | `cd dealdrop && grep -q 'DealDrop — Universal Price Tracker' app/layout.tsx && grep -q 'Track products from any e-commerce site' app/layout.tsx` | ✅ (`app/layout.tsx:19-22`) | ⬜ pending |
| POL-06 | `app/icon.tsx` exists, exports `size`+`contentType`+default; `favicon.ico` deleted | static | `cd dealdrop && test -f app/icon.tsx && grep -q 'ImageResponse' app/icon.tsx && grep -q 'export const size' app/icon.tsx && grep -q 'export const contentType' app/icon.tsx && grep -q 'export default' app/icon.tsx && ! test -f app/favicon.ico` | ❌ W0 (file does not exist yet) | ⬜ pending |
| POL-06 | Built-app `<head>` references `/icon` not `/favicon.ico` | manual UAT | `curl -s https://<prod-domain>/ \| grep -E 'rel="icon"'` after deploy | n/a — manual | ⬜ pending |
| DEP-01 | Prod URL responds 200 to `/` | manual UAT | `curl -I https://<prod-domain>/` returns 200 | n/a — manual | ⬜ pending |
| DEP-02 | All 7 server + 2+ public env vars set in Vercel `production` scope | manual UAT | `vercel env ls` (or screenshot of Vercel dashboard) | n/a — manual | ⬜ pending |
| DEP-03 | App reads from prod Supabase project (not dev) | manual UAT | Sign in on prod, add product, verify row appears in PROD `products` table (not dev) | n/a — manual | ⬜ pending |
| DEP-04 | OAuth completes on prod URL with fresh Google account | manual UAT | Walk sign-in flow on prod with a Gmail account that has never signed in to DealDrop | n/a — manual | ⬜ pending |
| DEP-05 | `cron.job` row exists with prod URL inside the wrapper | static SQL | `SELECT command FROM cron.job WHERE jobname='dealdrop-daily-price-check'` + `pg_get_functiondef('public.trigger_price_check_cron'::regprocedure)` shows prod URL | n/a — captured in `07-VERIFICATION.md` | ⬜ pending |
| DEP-06 | Manual cron POST → email arrives in NON-OWNER inbox + chart updates | manual UAT | Full procedure (RESEARCH § Pattern 7) | n/a — manual; inspection grid is PITFALLS.md:336-348 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dealdrop/app/error.test.tsx` — covers POL-03 page-level boundary contract (default export shape, `'use client'`, prop name `unstable_retry`)
- [ ] `dealdrop/app/global-error.test.tsx` — covers POL-03 root boundary contract (default export shape, `'use client'`, must render `<html><body>`)

No new framework install needed — Vitest 3.2.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 are already configured per `package.json`.

The error-boundary tests are static-shape assertions only — they verify the component is exported and accepts the right props. Behavioral testing (forced throw → fallback renders) is best done manually in the browser; React Testing Library inside Vitest can render a boundary in isolation but cannot exercise the Next.js Server-Component-throws-and-error-is-serialized-with-a-digest path. The manual UAT in `07-VERIFICATION.md` covers that.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Error boundary forced-throw → Card fallback renders | POL-03 | Server Component throw + Next.js error serialization cannot be exercised by RTL | Inject `throw new Error('test')` in a leaf component, hit the page in dev, observe Card fallback with "Try again" button; click button, verify rerender; remove throw |
| Mobile layout at 320 / 375 / 768 / desktop | POL-04 | Visual / responsive — no automated viewport regression in scope (Playwright explicitly out, per CONTEXT.md `<deferred>`) | DevTools device toolbar walkthrough; document each break + fix in `07-VERIFICATION.md` audit table |
| Built `<head>` `<link rel="icon">` resolves to `/icon` not `/favicon.ico` | POL-06 | Requires deployed prod URL | `curl -s https://<prod-domain>/ \| grep -E 'rel="icon"'`; capture in `07-VERIFICATION.md` |
| Prod URL responds 200 | DEP-01 | Requires deployed prod URL | `curl -I https://<prod-domain>/`; capture status line |
| Vercel env vars set in `production` scope | DEP-02 | Out-of-repo dashboard / CLI work | `vercel env ls` output OR Vercel dashboard screenshot; document inventory in `07-VERIFICATION.md` |
| App reads from prod Supabase | DEP-03 | Requires running flow on prod | Sign in on prod, add product, confirm row appears in PROD project (`SELECT * FROM products` in prod SQL Editor) — NOT dev |
| OAuth completes on prod with fresh Google account | DEP-04 | Requires browser + Google account | Walk sign-in flow on prod URL with a Gmail account that has never signed in to DealDrop; verify redirect to `/` and session persists |
| pg_cron job points at prod URL | DEP-05 | SQL inspection in prod project | Run `SELECT jobname, schedule, command FROM cron.job;` + `SELECT pg_get_functiondef('public.trigger_price_check_cron'::regprocedure);` in prod SQL Editor; verify URL matches prod Vercel URL; capture output |
| End-to-end price-drop email arrives in NON-OWNER inbox | DEP-06 | Requires DNS, real email, real Gmail | Full procedure in RESEARCH § Pattern 7: sign in (non-owner Gmail) → add product → verify seed `price_history` row → manipulate `current_price` to force drop → cURL `POST /api/cron/check-prices` with prod CRON_SECRET → confirm `dropped: 1` → check non-owner Gmail → screenshot email + chart → re-fire cron, confirm `dropped: 0` (idempotency) |
| All 10 PITFALLS.md:336-348 line items pass | DEP-06 | Inspection grid | Walk each line; tick in `07-VERIFICATION.md`. Includes non-USD `RangeError` check + `maxDuration` w/ 15+ products if portfolio time allows |

---

## Validation Sign-Off

- [ ] All POL-03 / POL-06 implementation tasks have `<automated>` Vitest verify
- [ ] All POL-01 / POL-02 / POL-05 verification tasks have `<automated>` static grep verify
- [ ] DEP-01 through DEP-06 manual verifications have step-by-step instructions in `07-VERIFICATION.md`
- [ ] Sampling continuity: no 3 consecutive autonomous tasks without an automated verify
- [ ] Wave 0 covers the two ❌ MISSING test files (`app/error.test.tsx`, `app/global-error.test.tsx`)
- [ ] No watch-mode flags (Vitest invoked with `run`)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter once plans land

**Approval:** pending
