---
phase: 06-automated-monitoring-email-alerts
plan: 04
subsystem: cron-orchestrator
tags: [cron, p-limit, timingSafeEqual, price-change-gate, green-flip, tdd, cron-02, cron-03, cron-04, cron-06, cron-07, cron-08, cron-09, email-01, email-05, email-06]

# Dependency graph
requires:
  - phase: 06-automated-monitoring-email-alerts
    plan: 01
    provides: "RED skeletons at src/lib/cron/auth.test.ts (6 it.todo) + src/lib/cron/check-prices.test.ts (16 it.todo); makeSupabaseAdminMock factory; p-limit@3.1.0 installed"
  - phase: 06-automated-monitoring-email-alerts
    plan: 02
    provides: "sendPriceDropAlert(input) -> Promise<SendResult> contract; Zod v4 bare-email env stub convention"
  - phase: 03-firecrawl-integration
    provides: "scrapeProduct(url) -> ScrapeResult discriminated union; ScrapeFailureReason closed enum"
  - phase: 01-foundation-database
    plan: 04
    provides: "admin client factory (createAdminClient); products + price_history schema with last_scrape_failed_at column"
provides:
  - "verifyCronBearer(authHeader, secret) -> boolean — constant-time Bearer-token compare via node:crypto timingSafeEqual"
  - "runPriceCheck(admin) -> Promise<CronSummary> — cron orchestrator with p-limit(3) concurrency cap + Promise.allSettled"
  - "ProductResult discriminated union (4 kinds: drop | update | unchanged | scrape_failed)"
  - "CronSummary { status, scraped, updated, dropped, failed[] } — aggregate counters"
  - "Structured log vocabulary: cron: scrape_failed | price_history_insert_failed | products_update_failed_after_history_insert | recipient_email_missing | currency_changed (warn) | clear_failed_flag_failed | last_scrape_failed_at_update_failed | products_select_failed | worker_unexpected_throw"
affects: [06-05-route-handler]

# Tech tracking
tech-stack:
  added: []  # p-limit@3.1.0 already installed by Plan 01; resend already Plan 01
  patterns:
    - "Bearer-token verification: length-pre-check + timingSafeEqual (CRON-02 mitigation for T-6-03)"
    - "Per-product worker with discriminated ProductResult return — NEVER throws (SP-6 from 06-PATTERNS)"
    - "Promise.allSettled + pLimit(3) fan-out (NEVER Promise.all — Anti-Pattern)"
    - "Price-change gate against products.current_price (D-02) = entire idempotency story (CRON-08); no cron_runs audit table"
    - "Conditional .eq().not('last_scrape_failed_at', 'is', null) clear-on-recovery UPDATE — the only Supabase chain using .not()"
    - "Two-step price-change write (D-04): INSERT price_history → UPDATE products (current_price, updated_at, last_scrape_failed_at=null)"
    - "image_url pass-through: DB row image_url (not scraped.image_url) flows to resend — email reflects the image_url we already have, decoupled from scrape drift"

key-files:
  created:
    - "dealdrop/src/lib/cron/auth.ts"
    - "dealdrop/src/lib/cron/check-prices.ts"
  modified:
    - "dealdrop/src/lib/cron/auth.test.ts"
    - "dealdrop/src/lib/cron/check-prices.test.ts"

key-decisions:
  - "Used image_url (from ProductData type) not product_image_url (plan text typo) — types.ts and schema.ts parse product_image_url from Firecrawl into image_url in the domain ProductData. The plan's test-mock examples referenced product_image_url which does not type-check."
  - "Env stub RESEND_FROM_EMAIL uses bare 'alerts@example.com' (Plan 02 deviation 2) — Zod v4 z.email() rejects mailbox format. Propagated to auth.test.ts and check-prices.test.ts."
  - "Email payload uses product.image_url (DB row), not scraped.image_url — consistent with plan action body. This means email images always reflect the product the user added, not a potentially drifted scrape. Acceptable because image_url is not compared at price-gate time."
  - "Omitted the `void mod` lint-silencer after describe block — real test bodies reference mod.runPriceCheck inside the describe, so no lint issue arises. Original skeleton's `void mod` was needed because it.todo doesn't count as use."

requirements-completed: [CRON-02, CRON-03, CRON-04, CRON-06, CRON-07, CRON-08, CRON-09, EMAIL-01, EMAIL-05, EMAIL-06]

# Metrics
duration: ~6min
completed: 2026-04-21
---

# Phase 6 Plan 4: cron-orchestrator Summary

**Shipped `verifyCronBearer` (constant-time Bearer compare via node:crypto) + `runPriceCheck` (p-limit(3) fan-out with per-product discriminated-union worker, price-change gate, two-step D-04 write, and EMAIL-06 log-but-don't-abort email branch) — 6 GREEN auth tests + 13 GREEN orchestrator tests, all CRON-* and EMAIL-* requirements for Phase 6 Wave 2 closed.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-21T15:18:06Z
- **Completed:** 2026-04-21T15:24:31Z
- **Tasks:** 3
- **Files modified:** 4 (2 created in src/lib/cron/, 2 flipped RED → GREEN)

## Accomplishments

- `dealdrop/src/lib/cron/auth.ts` shipped at **24 lines** with `import 'server-only'` line 1 + `timingSafeEqual` length-pre-check
- `dealdrop/src/lib/cron/check-prices.ts` shipped at **295 lines** (plan minimum: 160 — exceeded with full structured-log coverage on every failure branch)
- `dealdrop/src/lib/cron/auth.test.ts` flipped from 6 it.todo + 1 probe → **6 GREEN tests** (CRON-02 contract)
- `dealdrop/src/lib/cron/check-prices.test.ts` flipped from 16 it.todo + 1 probe → **13 GREEN tests** (condensed to merge two scrape_failed todos into one test covering products.update + no history insert, etc.)
- CRON-02 + CRON-03 + CRON-04 + CRON-06 + CRON-07 + CRON-08 + CRON-09 + EMAIL-01 + EMAIL-05 + EMAIL-06 all mitigated in code + tested
- T-6-03 (timing-attack spoofing) mitigated: `timingSafeEqual` with length pre-check, no RangeError on mismatch
- T-6-04 (log injection) mitigated: ALL console.error/warn calls use structured object payload; grep-clean for backtick-in-console.error
- Zero regressions: 146/146 existing Phase 1-5 + Phase 6 Plans 1-3 tests still pass
- Build green: `npm run build` exits 0

## Task Commits

Each task was committed atomically with `--no-verify` (parallel worktree mode):

1. **Task 1: Implement lib/cron/auth.ts + flip auth.test.ts to GREEN** — `88cf251` (feat)
2. **Task 2: Implement lib/cron/check-prices.ts runPriceCheck orchestrator** — `963641d` (feat)
3. **Task 3: Flip check-prices.test.ts from RED to GREEN** — `998a26f` (test)

## Final Line Counts

| File | Lines | Plan Min | Status |
|------|------:|---------:|--------|
| `src/lib/cron/auth.ts` | 24 | 15 | ✓ exceeds |
| `src/lib/cron/check-prices.ts` | 295 | 160 | ✓ exceeds |
| `src/lib/cron/auth.test.ts` | 54 | — | 6 real it() + 0 todos |
| `src/lib/cron/check-prices.test.ts` | 424 | — | 13 real it() + 0 todos |

## Vitest Output

### `src/lib/cron/auth.test.ts`

```
✓ src/lib/cron/auth.test.ts (6 tests) 6ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  200ms
```

6 tests:
- returns false when authHeader is null
- returns false when authHeader does not start with "Bearer "
- returns false when provided token has different length than secret
- returns false when provided token is same-length but wrong bytes
- returns true when provided token exactly equals secret (constant-time compare)
- does not throw RangeError when lengths differ (timingSafeEqual length-safety)

### `src/lib/cron/check-prices.test.ts`

```
✓ src/lib/cron/check-prices.test.ts (13 tests) 32ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Duration  271ms
```

13 tests:
- calls admin.from("products").select("*").order("created_at", { ascending: true }) once (CRON-03)
- calls scrapeProduct once per product (CRON-06)
- caps concurrent scrapeProduct calls at 3 via p-limit (CRON-04) — observed peak=3 deterministically (setTimeout(5ms) forces overlap on 8 products)
- on scrape_failed: updates products.last_scrape_failed_at and continues (CRON-09, D-03)
- on scrape_failed: does NOT insert price_history row (CRON-09, D-03)
- on unchanged price: inserts zero price_history rows (CRON-08 idempotency)
- on unchanged price + previously failing: conditional UPDATE clears last_scrape_failed_at
- on price change: INSERT price_history THEN UPDATE products (CRON-07, D-04)
- on price drop: calls sendPriceDropAlert with correct input (EMAIL-01, EMAIL-05)
- on price drop + missing email: logs recipient_email_missing and skips email
- on currency_code mismatch: warns and skips insert + email (Pattern 8)
- on resend send_failed: logs and continues run (EMAIL-06) — scrapeProduct.toHaveBeenCalledTimes(2) proves no batch abort
- returns CronSummary with correct counters on mixed-outcome batch

### Full suite (excluding Plan 05 RED skeleton)

```
 Test Files  16 passed (16)
      Tests  146 passed (146)
   Duration  1.47s
```

Plan 05's `app/api/cron/check-prices/route.test.ts` remains RED by design — that skeleton is Plan 05's responsibility to flip.

## p-limit Concurrency Test

The CRON-04 test used 8 products + `setTimeout(5ms)` inside the scrape mock to force overlap. Observed peak in-flight count = 3 deterministically (the cap). The test asserts `peak <= 3 && peak > 0`, which passes on every run (no flakiness observed).

## Mock Factory — No Extensions Needed

`makeSupabaseAdminMock` from Plan 01 Task 2 was used verbatim. All test assertions used the factory's default shape:
- `selectProducts: { data: [...], error: null }` → exercised by every orchestrator test
- `userById: { 'u-1': { id, email } }` → exercised by EMAIL-01, EMAIL-05, EMAIL-06 tests
- Default `updateProductResult / insertHistoryResult` → `{ error: null }` covers all happy paths

The `.eq().not()` chain for the conditional clear-failed-flag UPDATE was already modeled in the factory's `makeUpdateBuilder` (line 38-43). Test "on unchanged price + previously failing" confirmed the builder resolves correctly for this chain.

No factory extensions were required.

## SupabaseClient Type Friction

The `runPriceCheck(admin: SupabaseClient)` signature takes the generic `@supabase/supabase-js` type (not the `Database`-parameterized variant used elsewhere). This works because:
1. The mock's `from`, `auth.admin.getUserById`, etc. shapes match the generic client's runtime surface
2. Tests pass the mock as `admin as never` to bypass the structural type check at the call site
3. No TS errors in the SUT itself (`npx tsc --noEmit` exits clean for `check-prices.ts`)

This is acceptable for the unit-test boundary; Plan 05 will pass a real `createAdminClient()` return value which is structurally compatible.

## Files Created/Modified

### Created

- **`dealdrop/src/lib/cron/auth.ts`** (24 lines)
  - Line 1: `import 'server-only'` (T-6-03 bundle-time guard)
  - Exports: `verifyCronBearer(authHeader, secret)`
  - Imports: `timingSafeEqual` from `node:crypto`
  - Pattern: length-pre-check → Buffer.from → timingSafeEqual

- **`dealdrop/src/lib/cron/check-prices.ts`** (295 lines)
  - Line 1: `import 'server-only'` (T-6-03 bundle-time guard)
  - Imports: `pLimit` (default) from `p-limit`; `SupabaseClient` type; `scrapeProduct`; `ScrapeFailureReason` type; `sendPriceDropAlert`
  - Exports: `ProductResult`, `CronSummary`, `runPriceCheck`
  - Private: `processOneProduct` per-product worker
  - Concurrency: `pLimit(3)` + `Promise.allSettled`
  - No `use server` directive (grep-clean — only in natural-language comments, not as directive)

### Modified

- **`dealdrop/src/lib/cron/auth.test.ts`** (+37 / -13 lines)
  - 0 `it.todo(` remain (was 6)
  - 0 import probes remain (was 1)
  - 6 real `it(...)` tests
  - Env stub RESEND_FROM_EMAIL changed to bare 'alerts@example.com' (Plan 02 deviation 2 propagation)
  - Removed `void mod` / `void expect` lint-silencers (real tests reference both)

- **`dealdrop/src/lib/cron/check-prices.test.ts`** (+381 / -29 lines)
  - 0 `it.todo(` remain (was 16)
  - 0 import probes remain (was 1)
  - 13 real `it(...)` tests covering CRON-03/04/06/07/08/09 + EMAIL-01/05/06
  - Env stub RESEND_FROM_EMAIL changed to bare 'alerts@example.com'
  - Scrape mocks use `image_url: null` (ProductData actual field), not `product_image_url: null` (plan text typo)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan text used `product_image_url` in test mocks, but `ProductData` type has `image_url`**
- **Found during:** Task 3 (vitest run — type error on first iteration)
- **Issue:** The plan action bodies for Task 3 use `product_image_url: null` in `scrapeProduct.mockResolvedValue(...)` mocks. But `dealdrop/src/lib/firecrawl/types.ts` defines `ProductData` as `{ name, current_price, currency_code, image_url }` — note `image_url`, NOT `product_image_url`. The `product_image_url` name appears only in the Firecrawl JSON schema (which the scraper then maps to `image_url` in `schema.ts::parseProductResponse`). Passing `product_image_url: null` to `mockResolvedValue` fails TS2322: Type `{ ..., product_image_url: null }` is not assignable to type `ProductData`.
- **Fix:** Changed all mock payloads to `image_url: null` (or `'https://cdn.example.com/scraped.jpg'` for the one test needing a non-null value).
- **Files modified:** `dealdrop/src/lib/cron/check-prices.test.ts` (8 mock locations updated)
- **Verification:** tsc passes; all 13 tests green.
- **Committed in:** `998a26f` (Task 3 commit — applied before commit).

**2. [Rule 3 - Blocking] `'use server'` substring inside natural-language comment broke plan's verify-script grep**
- **Found during:** Task 2 (running the plan's `node -e` verify one-liner)
- **Issue:** The plan action's comment block included `// - NO 'use server' directive — this is a Route Handler helper, not an action.` The verify one-liner does `if (src.includes("'use server'")) process.exit(3)`, which fails on that literal string match. The comment was informational (not a directive), but the grep doesn't distinguish.
- **Fix:** Reworded the comment to `// - Do NOT add a server-action directive here — this is a Route Handler helper.` which preserves the anti-pattern guidance without the matching substring. No behavior change.
- **Files modified:** `dealdrop/src/lib/cron/check-prices.ts` line 25 (1 line reworded)
- **Verification:** `node -e "..."` plan verify one-liner prints "all checks pass". Final acceptance `grep -c "'use server'" src/lib/cron/check-prices.ts` returns 0.
- **Committed in:** `963641d` (Task 2 commit — applied before commit).

**3. [Rule 3 - Blocking] Line 1 of check-prices.ts must be `import 'server-only'`, not a comment**
- **Found during:** Task 2 (same verify run as deviation 2)
- **Issue:** Initial write placed `// File: ...` comment on line 1, with `import 'server-only'` at line ~24 after the block comment. The plan's acceptance check uses `head -1 src/lib/cron/check-prices.ts | grep -q "import 'server-only'"`. Matches `auth.ts`, `resend.ts`, `admin.ts`, `env.server.ts`, and `scrape-product.ts` precedent (line 1 is the literal directive; comments start on line 2).
- **Fix:** Reordered: `import 'server-only'` on line 1, block comment starting line 2. Semantic behavior unchanged (server-only is always evaluated at import regardless of line).
- **Files modified:** `dealdrop/src/lib/cron/check-prices.ts` (top-of-file reorder)
- **Verification:** `head -1 src/lib/cron/check-prices.ts` prints exactly `import 'server-only'`.
- **Committed in:** `963641d` (Task 2 commit — applied before commit).

**4. [Rule 1 - Bug] `void mod` outside describe block caused TS2454 "used before being assigned"**
- **Found during:** Task 3 (tsc after first test-flip iteration)
- **Issue:** The plan action preserved the skeleton's `void mod` / `void expect` lint-silencer lines at module scope. But after replacing `it.todo` with real `it(...)` inside a describe, the top-level `void mod` line runs BEFORE the `beforeAll(async () => { mod = await import(...) })` has executed — producing `error TS2454: Variable 'mod' is used before being assigned`. The skeleton didn't hit this because it.todo doesn't execute.
- **Fix:** Removed the `void mod` / `void expect` lines. Real tests inside the describe reference both, so there's no unused-var warning.
- **Files modified:** `dealdrop/src/lib/cron/check-prices.test.ts` (2 lines removed)
- **Verification:** tsc exits clean for this file; test file still executes correctly (mod is referenced inside async `it` blocks that run after `beforeAll`).
- **Committed in:** `998a26f` (Task 3 commit — applied before commit).

**5. [Rule 3 - Blocking] Worktree bootstrap: missing node_modules + env/config files**
- **Found during:** Plan-start baseline check
- **Issue:** Worktree base commit `89bb7d6` did not include installed `node_modules`, `.env.local`, `postcss.config.mjs`, `eslint.config.mjs`, or `next-env.d.ts`. Matches the pattern from Plan 01 Deviation 3 and Plan 02 Deviation 1 (git worktrees share `.git` but not `node_modules`; config/env files are orchestrator-layer concerns).
- **Fix:** Ran `npm install` in the worktree (added 909 packages in 12s; lockfile already up-to-date). Copied `.env.local`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts` from the main repo working tree. Files not committed (intentional — environment fix, not code change, matches prior plan pattern).
- **Files modified:** Worktree-local only — no git history changes.
- **Verification:** `npm ls p-limit` and `npm ls resend` show expected versions; `npm run build` exits 0; env validation no longer fires at test import time.
- **Committed in:** None (intentional — environment fix).

---

**Total deviations:** 5 auto-fixed (3 Rule 3 blocking, 2 Rule 1 bugs)
**Impact on plan:** Zero scope creep. All five auto-fixes address plan-text typos (product_image_url → image_url), grep-hostile comment strings, top-of-file ordering, TS strictness, and worktree bootstrap. No feature added, no library swapped, no architectural change. Production runtime behavior identical to the plan's intent.

## Known Stubs

None. All branches are fully wired to real SDK calls (scrapeProduct, sendPriceDropAlert, admin.from/.auth.admin.getUserById); no TODO markers; no placeholder returns.

## Threat Flags

None. Plan 04's threat model (T-6-03 timing attack, T-6-04 log injection, T-6-05 null-price propagation) is complete — `timingSafeEqual` mitigates T-6-03, structured console.error/warn (no template literals) mitigates T-6-04, Phase 3's `missing_price` narrowing (already accepted) mitigates T-6-05. No new security-relevant surface introduced.

## Issues Encountered

1. **ProductData.image_url vs Firecrawl's product_image_url naming discrepancy.** The plan action's test mock examples referenced `product_image_url` (the Firecrawl API field name), but the domain `ProductData` type uses `image_url` (per `types.ts` + `schema.ts::parseProductResponse`). Caught by tsc on first test iteration. Flagged here so Plan 05's route test should also use `image_url: null` if it constructs any ProductData mocks.

2. **Grep-hostile anti-pattern comment.** The plan's own verify one-liner (`if (src.includes("'use server'")) process.exit(3)`) doesn't distinguish directive vs comment-mention. Had to reword the "NO 'use server' directive" comment to avoid the substring while preserving the intent.

3. **Module-scope `void mod` lint-silencer runs before async import.** The skeleton pattern assumes `it.todo` (never executes). Real `it(...)` blocks run AFTER beforeAll, but the top-level `void mod` runs IMMEDIATELY (at module eval time), producing TS2454. Removed the silencers — real tests inside the describe reference `mod` and `expect` organically.

## Next Plan Readiness

- **Plan 05 (Route handler):** ready. Both `verifyCronBearer` (auth.ts) and `runPriceCheck` (check-prices.ts) are importable at stable paths. The Plan 05 skeleton at `app/api/cron/check-prices/route.test.ts` (11 it.todo) remains RED by design — Plan 05 will flip it by implementing `app/api/cron/check-prices/route.ts` which composes the Plan 04 exports.

No blockers for Plan 05.

## Self-Check: PASSED

Verified files exist:
- `dealdrop/src/lib/cron/auth.ts` — FOUND (24 lines)
- `dealdrop/src/lib/cron/check-prices.ts` — FOUND (295 lines)
- `dealdrop/src/lib/cron/auth.test.ts` — FOUND (54 lines, 0 it.todo, 6 it())
- `dealdrop/src/lib/cron/check-prices.test.ts` — FOUND (424 lines, 0 it.todo, 13 it())

Verified commits exist in git history:
- `88cf251` (feat(06-04): implement lib/cron/auth.ts + flip auth.test.ts to GREEN) — FOUND
- `963641d` (feat(06-04): implement lib/cron/check-prices.ts runPriceCheck orchestrator) — FOUND
- `998a26f` (test(06-04): flip check-prices.test.ts from RED to GREEN) — FOUND

Verified contract-grep checks pass:
- `head -1 src/lib/cron/auth.ts` is `import 'server-only'` — PASS
- `head -1 src/lib/cron/check-prices.ts` is `import 'server-only'` — PASS
- `grep -c "'use server'" src/lib/cron/check-prices.ts` returns 0 — PASS
- `grep -c "Promise.all(" src/lib/cron/check-prices.ts` returns 0 — PASS
- `grep -c "Promise.allSettled" src/lib/cron/check-prices.ts` returns 1+ — PASS
- `grep -c "pLimit(3)" src/lib/cron/check-prices.ts` returns 1 — PASS
- `grep -c 'it.todo' src/lib/cron/auth.test.ts src/lib/cron/check-prices.test.ts` returns 0 — PASS

Verified tests pass:
- `npx vitest run src/lib/cron/auth.test.ts` → 6/6 GREEN
- `npx vitest run src/lib/cron/check-prices.test.ts` → 13/13 GREEN
- Full suite excluding Plan 05 RED skeleton: 146/146 GREEN
- `npm run build` exits 0

## TDD Gate Compliance

All three tasks had `tdd="true"`. Gate sequence:
- **RED:** Plan 01 commit `ec8fa2b` landed `auth.test.ts` + `check-prices.test.ts` with it.todo skeletons + import probes. Baseline `npx vitest run src/lib/cron/auth.test.ts` at worktree HEAD (pre-Task-1) reported `Test Files 1 failed · Error: Cannot find module '@/lib/cron/auth'`. Same for check-prices.test.ts. RED verified.
- **GREEN:** Task 1 commit `88cf251` landed `auth.ts` + flipped `auth.test.ts` to 6 passing. Task 2 commit `963641d` landed `check-prices.ts`. Task 3 commit `998a26f` flipped `check-prices.test.ts` to 13 passing. Both test files report GREEN.
- **REFACTOR:** Not needed. Implementation shipped from plan action + deviations applied pre-commit (not as a separate refactor pass).

---
*Phase: 06-automated-monitoring-email-alerts*
*Plan: 04*
*Completed: 2026-04-21*
