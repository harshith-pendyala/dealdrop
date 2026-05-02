---
phase: 07-polish-deployment
plan: 08
status: complete
requirements: [DEP-01, DEP-06]
completed: 2026-05-02
---

# 07-08 — DEP-06 End-to-End Smoke Test

## Outcome

The DealDrop core-value loop is proven on the live URL. Sign-in → add product → force a price drop → cron POST → email lands in inbox → dashboard chart shows two data points → idempotent re-fire produces `dropped:0` with no duplicate rows. All 10 line items in PITFALLS.md "Looks Done But Isn't" inspection grid recorded as PASS or PASS-deferred. Phase 7 frontmatter advanced to `status: passed`, `score: 12/12 (with PASS-deferred on line 346)`.

## DEP-06 Procedure (compressed)

| # | What | Outcome |
|---|------|---------|
| Pre | curl 200 / 200+ok / 401 against prod | All green |
| 1 | Sign in incognito on prod with operator's Google account | New row in prod `auth.users` (already created by Plan 07-06) |
| 2 | Add `books.toscrape.com/.../a-light-in-the-attic` | ProductCard renders with name + £51.77 + image; UUID `088328fe-4f87-459b-8c36-cc275f2c760a` |
| 3 | Confirm seed in prod SQL | 1 product row, 1 price_history row |
| 4 | `UPDATE products SET current_price = current_price * 2` | current_price = 103.54 |
| 5 | `curl -X POST .../api/cron/check-prices -H 'Bearer <prod CRON_SECRET>'` | 200 + `{"scraped":1,"updated":1,"dropped":1,"failed":[]}` |
| 6 | Price-drop email arrived in operator inbox | All body elements present; screenshot saved |
| 7 | Dashboard chart shows 2 data points | Confirmed via Show Chart toggle; screenshot saved |
| 8 | Verify 2 price_history rows + current_price=51.77 | Phase 6 D-04 INSERT-then-UPDATE order confirmed |
| 9 | Re-fire cron POST (no changes) | 200 + `{"dropped":0}`, count(*) still 2, no new email |

## PITFALLS.md Inspection Grid (10/10)

| # | Pitfall | Status |
|---|---------|--------|
| 1 | Cron GET ≠ scraping (338) | PASS |
| 2 | RLS on price_history (339) | PASS |
| 3 | OAuth on prod URL in BOTH Google + Supabase (340) | PASS |
| 4 | Cron handles scrape failures gracefully (341) | PASS |
| 5 | Email arrives in inbox (342) | PASS-with-deviation (same-account, see below) |
| 6 | PriceChart at 1+0 data points (343) | PASS |
| 7 | Non-USD currency (344) | PASS |
| 8 | NEXT_PUBLIC_* env in prod (345) | PASS (operational evidence: OAuth flow against prod ref) |
| 9 | maxDuration with 15+ products (346) | PASS-deferred (single-product happy path verified; Fluid Compute on; 15+ not exercised) |
| 10 | Cascade delete (347) | PASS |

Tailwind production check (line 362): `@import "tailwindcss"` present, no stray config, Hero h1 font-size correct in DevTools. PASS.

## Screenshots Committed

- `screenshots/dep-06-email.png` (87 KB) — price-drop email rendered in operator inbox
- `screenshots/dep-06-chart.png` (315 KB) — dashboard chart with 2 data points
- `screenshots/dep-04-google-redirects.png` (169 KB) — Google Cloud Console authorized redirect URIs (carried over from Plan 07-06)

## Deviations

### 1. Same-account email test

PITFALLS:342 specified a non-owner Gmail inbox to defeat Resend account-owner silent-success when DNS is broken. Operator has only one Google account; reused it. The DNS-silent-success risk is mitigated alternately by visually inspecting the email body (sender, To, body) AND Resend dashboard "delivered" status. Production-hardening would re-test with a true non-owner inbox.

### 2. PITFALLS line 346 (maxDuration with 15+ products) deferred

The portfolio test is a single-product happy path. Fluid Compute is confirmed ON in Plan 07-05 (the only infra prerequisite for `maxDuration=300`). Scale to 15+ is not exercised. Acceptable for portfolio bar per the plan's PASS-deferred allowance.

### 3. NEXT_PUBLIC_* env verification (PITFALLS:345) — operational not curl

The plan suggested `curl -s prod | grep '<PROD_REF>.supabase.co'` as proof. The home page's bare HTML doesn't inline the Supabase URL (it's in client JS chunks, not initial HTML), so the curl returned empty. The OAuth flow successfully completing against `gltwnfnkodzkupkxwpro.supabase.co/auth/v1/authorize` in Plan 07-06 + DEP-06 Step 1 IS proof — if the env var were the dev ref, sign-in would have hit the dev `auth.users` table, which it didn't.

## Cleanup Confirmation

- Test product (UUID `088328fe-...`) removed via dashboard cascade delete (Check 5 PASS)
- `dealdrop/.env.prod.tmp` (CRON_SECRET pull file) deleted post-use
- Bad-URL test product (Check 6) removed
- Prod DB final state: operator's `auth.users` row + zero products (clean for portfolio screenshots)

## Frontmatter Update

`07-VERIFICATION.md` advanced from `status: in_progress` / `score: pending` to:

```yaml
status: passed
score: 12/12 (with PASS-deferred on PITFALLS line 346)
overrides_applied: 1
```

`overrides_applied: 1` documents Plan 07-01's `reset` → `unstable_retry` substitution per installed Next.js 16.2.4 docs (CONTEXT D-02 override; user-approved).

## Threat Mitigations

- T-07-21 (CRON_SECRET on disk via `.env.prod.tmp`): mitigated — file deleted post-use; `.env*` is gitignored.
- T-07-22 (sensitive data in committed screenshots): mitigated — operator inspected screenshots before commit; email body shows fields without exposing the actual address (or operator blurred it).
- T-07-23 (cron POST exposes endpoint): accepted — endpoint is already public per DEP-01 health check; Bearer-protected POST is documented.
- T-07-24 (re-fire creates duplicate rows): mitigated — Phase 6 D-02 price-change gate; Step 9a count(*)=2 confirmed.
- T-07-25 (Resend account-owner silent-success): partially mitigated — see Deviation 1.

## Self-Check: PASSED

- [x] Pre-flight 200 / 200+ok / 401 all green
- [x] Sign-in on prod incognito succeeds
- [x] Product added; ProductCard + seed price_history row confirmed
- [x] SQL UPDATE doubled current_price; cURL Bearer cron POST returns 200 + dropped:1
- [x] Price-drop email arrived; screenshot saved
- [x] Chart shows 2 data points; screenshot saved
- [x] post-cron SQL: 2 price_history rows + current_price=51.77
- [x] Idempotency re-fire returns dropped:0; count(*) still 2; no new email
- [x] All 10 PITFALLS inspection-grid rows PASS or PASS-deferred
- [x] Tailwind production check: 3 sub-rows PASS
- [x] Cascade delete cleaned up test product
- [x] `.env.prod.tmp` removed
- [x] 07-VERIFICATION.md frontmatter: `status: passed`, `score: 12/12 (with PASS-deferred on line 346)`, `overrides_applied: 1`
