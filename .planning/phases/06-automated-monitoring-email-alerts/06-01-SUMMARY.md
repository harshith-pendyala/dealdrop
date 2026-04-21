---
phase: 06-automated-monitoring-email-alerts
plan: 01
subsystem: testing
tags: [vitest, resend, p-limit, mocks, tdd, red-state, cron, email]

# Dependency graph
requires:
  - phase: 03-firecrawl-integration
    provides: env-stub + mock-before-dynamic-import pattern (Pattern SP-7) — scrape-product.test.ts + products.test.ts
  - phase: 04-product-tracking-dashboard
    provides: shared supabase-server.ts mock factory shape
  - phase: 05-price-history-chart
    provides: Wave-0 RED skeleton pattern established (PriceChart tests)
provides:
  - "resend@6.12.2 dependency (named export `Resend`)"
  - "p-limit@3.1.0 CJS dependency (NOT v7+ ESM-only — Turbopack-safe)"
  - "makeSupabaseAdminMock factory at src/__mocks__/supabase-admin.ts"
  - "4 RED-state test skeletons with 50 total it.todo blocks covering CRON-01..09 + EMAIL-01..03/05/06"
  - "Import probes forcing vitest to surface module-not-found as test-file failures"
  - "Extended vitest.config.ts include glob (src/**/*.test.{ts,tsx} + app/**/*.test.{ts,tsx})"
affects: [06-02-resend, 06-04-cron-orchestrator, 06-05-route-handler]

# Tech tracking
tech-stack:
  added:
    - "resend@6.12.2"
    - "p-limit@3.1.0"
  patterns:
    - "Wave-0 RED-state probe pattern — single real `it()` per skeleton triggers the dynamic beforeAll import so vitest reports 'Cannot find module' as a FAIL (not a silent skip)"
    - "Separate makeSupabaseAdminMock factory (distinct from makeSupabaseMock) — admin surface has auth.admin.getUserById + update().eq().not() chains not present on user-scoped client"

key-files:
  created:
    - "dealdrop/src/__mocks__/supabase-admin.ts"
    - "dealdrop/src/lib/resend.test.ts"
    - "dealdrop/src/lib/cron/auth.test.ts"
    - "dealdrop/src/lib/cron/check-prices.test.ts"
    - "dealdrop/app/api/cron/check-prices/route.test.ts"
  modified:
    - "dealdrop/package.json"
    - "dealdrop/package-lock.json"
    - "dealdrop/vitest.config.ts"

key-decisions:
  - "Pinned p-limit@^3.1.0 (NOT latest ^7.x) for CJS compatibility with Next.js 16 + Turbopack — per 06-RESEARCH.md Pitfall 9"
  - "Kept makeSupabaseAdminMock separate from existing makeSupabaseMock — avoids creating fragile tests for both Phase 4 (user-scoped client) and Phase 6 (admin client) by keeping surfaces cleanly split"
  - "Added a 'wave-0 import probe' it() block to each skeleton — without a real test, vitest silently skips the dynamic import in beforeAll, so 'Cannot find module' never surfaces. The probe block is deleted by downstream plans (02/04/05) once the SUT exists"
  - "Extended vitest.config.ts include glob to pick up app/**/*.test.{ts,tsx}. Previously only src/**/*.test.{ts,tsx} was matched, which would have left route.test.ts undetected. Required because Route Handler tests live co-located with handlers under app/api/cron/check-prices/"

patterns-established:
  - "Wave-0 RED-state probe: single real `it('loads @/path/to/sut', () => expect(mod).toBeDefined())` inside a 'wave-0 import probe' describe block. Triggers the dynamic import; surfaces module-not-found as file FAIL. Delete when SUT ships."
  - "makeSupabaseAdminMock factory: userById map for auth.admin.getUserById, select/update/insert chain builders, override-driven response shape — mirrors supabase-server.ts API but models admin-only surface"

requirements-completed: []  # This is a Wave 0 test-scaffolding plan — no CRON-* or EMAIL-* requirement is GREEN yet. Plans 02/04/05 will complete them. The frontmatter field `requirements` in the plan lists IDs that this SCAFFOLDING targets, but the scaffolding itself doesn't close them.

# Metrics
duration: 22min
completed: 2026-04-21
---

# Phase 6 Plan 1: cron-test-scaffolding Summary

**resend@6.12.2 + p-limit@3.1.0 (CJS-pinned) installed, makeSupabaseAdminMock factory shipped, and 4 RED-state test skeletons (50 todos + 4 import probes) staged for Plans 02/04/05 to flip GREEN.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-04-21T20:10:00Z
- **Completed:** 2026-04-21T20:32:00Z
- **Tasks:** 3
- **Files modified:** 8 (3 created in src/lib + 1 in app/api + 1 mock factory + vitest.config.ts + package.json + package-lock.json)

## Accomplishments
- Installed `resend@^6.12.2` (named export `Resend`) and `p-limit@^3.1.0` (CJS — NOT v7 ESM-only)
- Shipped `makeSupabaseAdminMock` factory modelling auth.admin.getUserById + products.select/update + price_history.insert
- Authored 4 test skeletons covering CRON-01..09 + EMAIL-01..03, EMAIL-05, EMAIL-06 via 50 it.todo blocks + 4 RED-state probes
- Extended `vitest.config.ts` to include `app/**/*.test.{ts,tsx}` so route handler tests are discoverable
- Zero regressions: 108/108 existing Phase 1-5 tests still pass; `npm run build` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install resend + p-limit dependencies** — `34c2627` (chore)
2. **Task 2: Add makeSupabaseAdminMock factory for cron tests** — `a0dee11` (test)
3. **Task 3: Add 4 RED-state test skeletons for cron + email** — `ec8fa2b` (test)

## Files Created/Modified

- `dealdrop/package.json` — added resend@^6.12.2 + p-limit@^3.1.0
- `dealdrop/package-lock.json` — lockfile integrity for the two new packages
- `dealdrop/src/__mocks__/supabase-admin.ts` — new makeSupabaseAdminMock factory (85 lines)
- `dealdrop/src/lib/resend.test.ts` — EMAIL-02/03 coverage (17 todos + 1 probe)
- `dealdrop/src/lib/cron/auth.test.ts` — CRON-02 coverage (6 todos + 1 probe)
- `dealdrop/src/lib/cron/check-prices.test.ts` — CRON-03/04/06/07/08/09 + EMAIL-01/05/06 (16 todos + 1 probe)
- `dealdrop/app/api/cron/check-prices/route.test.ts` — CRON-01/02/05 (11 todos + 1 probe)
- `dealdrop/vitest.config.ts` — extended include glob for `app/**/*.test.{ts,tsx}`

## Exact Installed Versions

```
$ npm ls resend
dealdrop@0.1.0
└── resend@6.12.2

$ npm ls p-limit
dealdrop@0.1.0
├─┬ eslint@9.39.4
│ └─┬ find-up@5.0.0
│   └─┬ locate-path@6.0.0
│     └─┬ p-locate@5.0.0
│       └── p-limit@3.1.0 deduped
└── p-limit@3.1.0
```

- `node_modules/p-limit/package.json` version: `3.1.0` (no `"type": "module"` — confirmed CJS)
- `node_modules/resend/package.json` version: `6.12.2`

## it.todo Counts per Test File

Downstream plans (02/04/05) MUST flip ALL these to real `it(...)` blocks before the
plan is GREEN. Each file also has a 1-line "wave-0 import probe" describe block that
plans delete after their SUT exists.

| File | it.todo count | Probe blocks | Target plan |
|------|---------------|--------------|-------------|
| `src/lib/resend.test.ts` | 17 | 1 | Plan 02 |
| `src/lib/cron/auth.test.ts` | 6 | 1 | Plan 04 |
| `src/lib/cron/check-prices.test.ts` | 16 | 1 | Plan 04 |
| `app/api/cron/check-prices/route.test.ts` | 11 | 1 | Plan 05 |
| **Total** | **50** | **4** | — |

Plan minimums: ≥6 resend, ≥6 auth, ≥14 check-prices, ≥9 route. All satisfied.

## Admin Mock Factory Path (for downstream plans)

```typescript
// Import from Plan 04 (check-prices.test.ts) and Plan 05 (route.test.ts) tests:
import { makeSupabaseAdminMock } from '@/__mocks__/supabase-admin'

// Typical usage:
const admin = makeSupabaseAdminMock({
  selectProducts: { data: [product1, product2], error: null },
  userById: { 'user-uuid-1': { id: 'user-uuid-1', email: 'a@b.com' } },
})
```

## Decisions Made

- **p-limit@^3.1.0 (NOT ^7.x):** v7+ is ESM-only (`"type": "module"` in package.json). Next.js 16 + Turbopack has historical rough edges importing ESM-only packages inside Route Handlers. v3.1.0 is pure CJS, already transitively installed via eslint, 30 lines of battle-tested code.
- **Resend import pattern:** `import { Resend } from 'resend'` (NAMED export). Plan 02 must use this — NOT default-import.
- **Separate admin mock factory:** kept `supabase-admin.ts` completely independent of `supabase-server.ts`. Admin client has `auth.admin.getUserById` + `update().eq().not()` chains not used by user-scoped callers; conflating the factories would make both Phase 4 and Phase 6 tests fragile.
- **Wave-0 import probe pattern:** Adding a real `it(...)` per skeleton that simply asserts `expect(mod).toBeDefined()` is the smallest force-multiplier on RED state. Without it, `beforeAll(async () => mod = await import('@/lib/...'))` is never invoked because vitest skips `beforeAll` when all tests are todo. The probe triggers the dynamic import → surfaces "Cannot find module" → vitest reports file FAILED (the expected RED signal). Downstream plans remove the probe after the SUT ships.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended vitest.config.ts include glob to cover app/**
- **Found during:** Task 3 (RED-state test skeletons)
- **Issue:** The plan notes state "Route Handler tests live alongside the handler under `app/api/cron/check-prices/route.test.ts`. Vitest picks up `*.test.ts` anywhere per the existing config." But the existing `vitest.config.ts` `include` array was explicitly `['src/**/*.test.{ts,tsx}']` only — so `app/api/cron/check-prices/route.test.ts` was NOT discovered.
- **Fix:** Added `'app/**/*.test.{ts,tsx}'` to the include array. Kept `src/**` pattern unchanged.
- **Files modified:** `dealdrop/vitest.config.ts` (1 line changed)
- **Verification:** `npx vitest run app/api/cron/check-prices/route.test.ts` now resolves the file and surfaces the expected "Cannot find module" RED error.
- **Committed in:** `ec8fa2b` (Task 3 commit)

**2. [Rule 2 - Missing Critical] Added RED-state import probe to each test skeleton**
- **Found during:** Task 3 (RED-state verification)
- **Issue:** Plan verification script uses `grep -q "Cannot find module\|failed"` to confirm RED state. But with only `it.todo(...)` blocks, vitest silently marks the file as "skipped" and never executes the `beforeAll` that performs the dynamic import. Result: no "Cannot find module" error surfaces → verification grep fails.
- **Fix:** Added a single real `it('loads @/lib/<sut>', () => expect(mod).toBeDefined())` inside a `describe('wave-0 import probe', ...)` block per file. Real `it` forces vitest to run `beforeAll`, which forces the dynamic import, which surfaces `Cannot find module` as file FAIL. Each probe block is commented with "Plan 0X deletes this block after <sut> exists."
- **Files modified:** `resend.test.ts`, `cron/auth.test.ts`, `cron/check-prices.test.ts`, `app/api/cron/check-prices/route.test.ts`
- **Verification:** `npx vitest run src/lib/resend.test.ts src/lib/cron/ app/api/cron/` now reports "Test Files 4 failed" with 4 × "Cannot find module" errors — the exact RED state the plan describes.
- **Committed in:** `ec8fa2b` (Task 3 commit)

**3. [Rule 3 - Blocking] Worktree setup gaps (config files + .env.local)**
- **Found during:** Task 1 (npm run build verification)
- **Issue:** The worktree base (`da881c6`) did NOT include `dealdrop/postcss.config.mjs`, `dealdrop/eslint.config.mjs`, `dealdrop/next-env.d.ts`, or `dealdrop/.env.local`. These files exist in the main repo's working tree but were never committed to the outer git repo — a historical gap. Without them, `npm run build` fails with "Can't resolve 'tw-animate-css'" (postcss config missing) and "Invalid environment variables" (env.local missing).
- **Fix:** Copied the four files from the main repo working tree into the worktree. Files were NOT staged or committed because:
  1. Other wave agents are working on the same base and should receive these files via orchestrator-level worktree setup, not via plan-01 commits
  2. `postcss.config.mjs` and `eslint.config.mjs` are tracked in the inner `dealdrop/.git` repo, not the outer `DealDrop/.git` — they're environment-level config
  3. Committing `.env.local` would leak secrets
- **Files modified:** Worktree-local only — no git history changes
- **Verification:** `npm run build` exits 0, `npm test` 108/108 existing tests pass
- **Committed in:** None (intentional — environment fix, not code change)

---

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking, 1 Rule 2 missing critical)
**Impact on plan:** All three auto-fixes are execution-environment or RED-state-signaling essentials. Rule 1 deviation would have left the plan's verification script passing a false-negative "Not strictly RED" state. Rule 3 deviations (vitest include + worktree setup) were absolute blockers for plan verification. Zero scope creep — no feature, library, or architectural change outside the plan's declared surface.

## Deferred Issues

**1. Pre-existing tsc error in src/lib/products/get-user-products.test.ts:121**
- `Type 'null' is not assignable to type 'unknown[]'`
- NOT caused by this plan — exists in baseline commit `da881c6` (inherited from Phase 5)
- Out of scope per executor scope-boundary rule. Tracked for Phase 7 cleanup or a dedicated /gsd-debug session.

**2. Worktree base missing committed config files**
- `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts`, `.env.local` missing from outer repo tracking
- Worked around in-worktree (see Deviation 3); properly fixed at orchestrator worktree-setup layer would avoid the per-plan workaround

## Threat Flags

None. Wave 0 installs dependencies and writes tests — no production code path is introduced. T-6-04 (log injection) pre-emptively mitigated by baking structured-log convention into `it.todo` descriptions (e.g. `structured-logs on failure: console.error("resend: send_failed", { ... })`).

## Issues Encountered

- `npm run build` initially failed with "Can't resolve 'tw-animate-css'" — root cause was missing `postcss.config.mjs` in worktree base, NOT the new npm install. Resolved by copying config files from main repo (see Deviation 3).
- `vitest run` initially reported 4 test files as "skipped" instead of "failed" — root cause was vitest silently skipping `beforeAll` when all tests are `it.todo`. Resolved by adding RED-state import probes (see Deviation 2).

## Next Phase Readiness

- Plan 02 (Resend implementation): ready. Import skeleton at `src/lib/resend.test.ts`, Resend SDK installed, mock-before-dynamic-import pattern in place.
- Plan 04 (Cron orchestrator): ready. Import skeletons for auth + check-prices, `makeSupabaseAdminMock` factory available at `src/__mocks__/supabase-admin.ts`, `p-limit@3.1.0` installed.
- Plan 05 (Route handler): ready. Route test skeleton at `app/api/cron/check-prices/route.test.ts`, vitest include extended to app/.

No blockers for subsequent waves.

## Self-Check: PASSED

Verified:
- `dealdrop/src/__mocks__/supabase-admin.ts` — FOUND
- `dealdrop/src/lib/resend.test.ts` — FOUND
- `dealdrop/src/lib/cron/auth.test.ts` — FOUND
- `dealdrop/src/lib/cron/check-prices.test.ts` — FOUND
- `dealdrop/app/api/cron/check-prices/route.test.ts` — FOUND
- Commit `34c2627` (chore: install resend + p-limit) — FOUND
- Commit `a0dee11` (test: makeSupabaseAdminMock factory) — FOUND
- Commit `ec8fa2b` (test: 4 RED-state test skeletons) — FOUND

---
*Phase: 06-automated-monitoring-email-alerts*
*Plan: 01*
*Completed: 2026-04-21*
