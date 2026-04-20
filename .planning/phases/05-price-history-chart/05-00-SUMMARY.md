---
phase: 05-price-history-chart
plan: 00
subsystem: testing

tags: [vitest, recharts-mock, supabase-mock, tdd, red-state, risk-4-mitigation]

requires:
  - phase: 04-dashboard-add-remove
    provides: "ProductCard component + makeSupabaseMock factory + getUserProducts DAL + products action tests"

provides:
  - "Red-state PriceChart.test.tsx (5 tests) driving Wave 2 implementation"
  - "Red-state get-user-products.test.ts (5 tests) driving Wave 1 DAL extension"
  - "ProductCard.test.tsx makeProduct() helper with price_history: [] default (Risk 4 mitigation)"
  - "makeSupabaseMock supports both single-.order (Phase 4 flat select) and chained double-.order (Phase 5 nested select with referencedTable) via thenable pattern"
  - "vi.mock('recharts') ResponsiveContainer-bypass pattern documented for jsdom"

affects: [05-01-plan, 05-02-plan, 05-03-plan]

tech-stack:
  added: []
  patterns:
    - "Thenable on first .order() so mock is both awaitable (Phase 4) and chainable (Phase 5)"
    - "Named export of xTickFormatter/yTickFormatter so Wave 2 formatter logic is unit-testable without rendering"
    - "vi.mock('recharts', ...) ResponsiveContainer bypass for jsdom (RESEARCH §6 Strategy A)"

key-files:
  created:
    - "dealdrop/src/components/dashboard/PriceChart.test.tsx"
    - "dealdrop/src/lib/products/get-user-products.test.ts"
  modified:
    - "dealdrop/src/__mocks__/supabase-server.ts"
    - "dealdrop/src/components/dashboard/ProductCard.test.tsx"

key-decisions:
  - "Kept .order thenable pattern so Phase 4 single-.order callers keep awaiting the same result (no Phase 4 test regression)"
  - "Exposed xTickFormatter/yTickFormatter as top-level named exports (not closures) so CHART-03 is unit-testable without rendering"
  - "Red state for get-user-products.test.ts is 2/5 failing (not 3/5 as plan text stated) — the 3 passing tests assert preserved Phase 4 behavior that already holds; the 2 failing tests assert the Wave 1 nested-select + nested-order contract"

patterns-established:
  - "makeSupabaseMock thenable chain: first .order() return value has both `.then` (awaitable) AND `.order` (chainable)"
  - "Risk-4 forward-compat pattern: add required-field defaults to factories BEFORE widening the type they produce"
  - "TDD red-state verification: missing-module import error = red contract for Wave 2; missing-assertion args = red contract for Wave 1"

requirements-completed: [CHART-01, CHART-02, CHART-03, CHART-04]

duration: ~2min
completed: 2026-04-20
---

# Phase 05 Plan 00: Test Infrastructure (Wave 0) Summary

**Red-state Vitest scaffolding for PriceChart + getUserProducts with Risk-4 makeProduct() forward-compat patch and dual-mode makeSupabaseMock chain.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-20T14:37:56Z
- **Completed:** 2026-04-20T20:10:11Z (execution was not continuous — real elapsed coding time was ~2 min)
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Extended `makeSupabaseMock()` to support both Phase 4's single `.order()` await and Phase 5's double `.order()` chain via a thenable shim — zero Phase 4 test regression (all 14 action tests + 7 ProductCard tests still green).
- Future-proofed `ProductCard.test.tsx`'s `makeProduct()` helper with `price_history: []` default so Wave 1's `Product` type widening cannot break any existing card test (Risk 4 HIGH mitigation landed in Wave 0 as planned).
- Created `PriceChart.test.tsx` with 5 failing-red tests locking in CHART-01 (line chart renders), CHART-03 (X/Y formatter contracts), CHART-04 (empty + 1-point + multi-point paths).
- Created `get-user-products.test.ts` with 5 tests locking in CHART-02 nested-select query shape (`*, price_history(price, currency, checked_at)`) and D-04 nested-order contract (`referencedTable: 'price_history'`) — red on the 2 new-contract assertions, green on the 3 preserved-behavior assertions.

## Task Commits

Each task was committed atomically:

1. **Task 0.1:** Extend makeSupabaseMock + patch ProductCard makeProduct — `9272ef9` (test)
2. **Task 0.2:** Red-state PriceChart.test.tsx with recharts ResponsiveContainer mock — `0b97311` (test)
3. **Task 0.3:** Red-state get-user-products.test.ts with nested-select + referencedTable assertions — `bf81322` (test)

**Plan metadata:** (pending — created at end of plan execution)

## makeSupabaseMock Before/After

**BEFORE** (Phase 4 — single `.order()` only):

```typescript
select: vi.fn((_cols?: string) => ({
  order: vi.fn().mockResolvedValue(selectProducts),
})),
```

**AFTER** (Phase 5 — single OR chained `.order()` supported):

```typescript
select: vi.fn((_cols?: string) => ({
  // Supports both single .order() (Phase 4 flat select) and
  // double .order() (Phase 5 nested select with referencedTable).
  // The inner .order() resolves to selectProducts regardless of chain depth.
  order: vi.fn().mockReturnValue({
    then: (onFulfilled: (v: typeof selectProducts) => unknown) =>
      Promise.resolve(selectProducts).then(onFulfilled),
    order: vi.fn().mockResolvedValue(selectProducts),
  }),
})),
```

The `then` thenable is the load-bearing trick: awaiting the first `.order()` (Phase 4's `await .select('*').order('created_at', ...)`) resolves to `selectProducts`; *chaining* a second `.order()` (Phase 5's `.order('checked_at', { referencedTable: 'price_history' })`) also resolves to `selectProducts`. Both code paths go through one mock.

## Red-State Exit Codes

| Test File | Expected State | Actual State | Status |
|-----------|---------------|--------------|--------|
| `src/components/dashboard/ProductCard.test.tsx` | GREEN (Phase 4 baseline preserved) | 7/7 passed, exit 0 | ✅ |
| `src/actions/products.test.ts` | GREEN (thenable preserves single-.order await) | 14/14 passed, exit 0 | ✅ |
| `src/components/dashboard/PriceChart.test.tsx` | RED — import fails on missing `./PriceChart` | Import resolution failure: `Failed to resolve import "./PriceChart"` | ✅ (correct red) |
| `src/lib/products/get-user-products.test.ts` | RED — at least 2 new-contract assertions fail | 2 failed, 3 passed (Test 2 `.select('*')` vs nested, Test 4 nested `.order` never called) | ✅ (correct red — see deviation note below) |

## Files Created/Modified

- `dealdrop/src/components/dashboard/PriceChart.test.tsx` **(created)** — 5 red-state component tests with `vi.mock('recharts', ...)` ResponsiveContainer bypass
- `dealdrop/src/lib/products/get-user-products.test.ts` **(created)** — 5 tests (2 red, 3 green) asserting the nested-select query shape, outer/nested `.order` contracts, and fail-open preservation
- `dealdrop/src/__mocks__/supabase-server.ts` **(modified)** — 3-line `select` block replaced with 6-line thenable-enabled chainable version; rest of file untouched
- `dealdrop/src/components/dashboard/ProductCard.test.tsx` **(modified)** — single-line addition: `price_history: []` before `...overrides,` in `makeProduct()`

## Decisions Made

- **Mock thenable pattern (Phase 4 back-compat):** Rather than forking the mock into `makeSupabaseMockFlat` / `makeSupabaseMockNested`, kept a single `makeSupabaseMock` with a thenable on the first `.order()` return value. Lower test-fixture sprawl, zero Phase 4 regressions.
- **Named-export formatters:** Planned `xTickFormatter(value)` / `yTickFormatter(value, currency)` as top-level exports from `PriceChart.tsx` so Wave 2's formatter logic is unit-testable without rendering the full chart. Tests call them directly; the component body will pass `currency` prop at the call site.
- **Red state is deliberate artifact of the Nyquist contract:** Did not stub `PriceChart.tsx` to silence the import failure. Wave 2 owns that file; an empty stub would mask the red→green transition the Nyquist sampling depends on.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Specification correction] Red-state count for get-user-products.test.ts is 2/5 not 3/5**
- **Found during:** Task 0.3 verification
- **Issue:** Plan acceptance criterion states "Running vitest ... shows at least 3 failing tests". Actual red state is 2 failing tests (Test 2 select-string + Test 4 nested-order), with Tests 1/3/5 passing.
- **Fix:** No code change needed. The 3 green tests assert preserved Phase 4 behavior (happy-path data flow through the mock, outer `.order('created_at', { ascending: false })` call, and fail-open `return []` + console.error) — all of which the current Phase 4 DAL already satisfies. The 2 red tests correctly capture the Wave 1 contract (new nested-select string + new nested-order call with `referencedTable`). Two red tests fully cover CHART-02's novel invariants; the plan text overcounted by including preserved-behavior tests in the red bucket.
- **Files modified:** None — documentation-level deviation
- **Verification:** `cd dealdrop && npx vitest run src/lib/products/get-user-products.test.ts` → `2 failed | 3 passed`, both failures reference the nested-select and nested-order assertions exactly
- **Committed in:** `bf81322` (Task 0.3 commit) — commit message documents the 2-red / 3-green distribution and the rationale

---

**Total deviations:** 1 auto-fixed (1 specification correction — no code deviation)
**Impact on plan:** No scope creep. Wave 1's CHART-02 contract is fully covered by the 2 red assertions (new select string + new nested-order call). Wave 1 must turn those 2 red. The 3 green tests become the regression guard that Wave 1's widened DAL must continue satisfying.

## Issues Encountered

None — all three tasks executed in single-pass with no retries.

## User Setup Required

None — Wave 0 is test-only scaffolding with no runtime surface, no env vars, no external services.

## Next Phase Readiness

**Ready for Wave 1 (Plan 05-01):**
- Red-state test file `get-user-products.test.ts` is the Nyquist gate for Wave 1's DAL extension. Wave 1 must:
  1. Install `recharts@3.8.1` (CHART-06)
  2. Widen the `Product` type: `Tables<'products'> & { price_history: PricePoint[] }`
  3. Export `PricePoint` type
  4. Change `.select('*')` → `.select('*, price_history(price, currency, checked_at)')`
  5. Chain `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` after the existing `.order('created_at', { ascending: false })`
- After those 5 edits, `npx vitest run src/lib/products/get-user-products.test.ts` must report 5/5 green.

**Ready for Wave 2 (Plan 05-02):**
- Red-state `PriceChart.test.tsx` import-resolution failure is the Nyquist gate. Wave 2 must create `dealdrop/src/components/dashboard/PriceChart.tsx` exporting the `PriceChart` component AND the `xTickFormatter` / `yTickFormatter` named functions with signatures:
  - `yTickFormatter(value: number, currency: string): string` — compact `Intl.NumberFormat` with `maximumFractionDigits: 0`
  - `xTickFormatter(value: string): string` — `Intl.DateTimeFormat` with `{ month: 'short', day: 'numeric' }`
- After Wave 2, `npx vitest run src/components/dashboard/PriceChart.test.tsx` must report 5/5 green.

**No blockers.** Phase 4 test suite remains 21/21 green; Phase 5 test surface is seeded for the remaining three waves.

## Self-Check: PASSED

Verified artifacts exist and commits are reachable:

- `dealdrop/src/components/dashboard/PriceChart.test.tsx` — FOUND
- `dealdrop/src/lib/products/get-user-products.test.ts` — FOUND
- `dealdrop/src/__mocks__/supabase-server.ts` — FOUND (modified — line 45 `order: vi.fn().mockReturnValue`)
- `dealdrop/src/components/dashboard/ProductCard.test.tsx` — FOUND (modified — line 37 `price_history: []`)
- Commit `9272ef9` — FOUND in `git log`
- Commit `0b97311` — FOUND in `git log`
- Commit `bf81322` — FOUND in `git log`

---
*Phase: 05-price-history-chart*
*Completed: 2026-04-20*
