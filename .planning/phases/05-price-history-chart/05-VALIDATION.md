---
phase: 5
slug: price-history-chart
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution of Price History Chart.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + @testing-library/react 16.3.2 |
| **Config file** | `dealdrop/vitest.config.ts` (exists; no Phase 5 changes) |
| **Quick run command** | `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx src/lib/products` |
| **Full suite command** | `cd dealdrop && npx vitest run` |
| **Estimated runtime** | ~8s quick, ~25s full |

---

## Sampling Rate

- **After every task commit:** Run `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx src/lib/products`
- **After every plan wave:** Run `cd dealdrop && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite + `cd dealdrop && npm run build` must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

> Populated by planner. Every CHART-xx requirement has at least one row with an automated command.
> Task IDs follow `{phase}-{plan}-{task}` pattern, matching the plan file names (05-00-PLAN.md … 05-03-PLAN.md).

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 5-00-01 | 00 | 0 | CHART-01..04 (Risk 4 prep) | test-only (no prod surface) | test-infra patch | `cd dealdrop && npx vitest run src/components/dashboard/ProductCard.test.tsx src/actions/products.test.ts` | ✅ (existing files patched) | ⬜ pending |
| 5-00-02 | 00 | 0 | CHART-01, CHART-03, CHART-04 | N/A (red-state stub) | unit (component, jsdom) | `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx` | ❌ W0 (creates file) | ⬜ pending (red expected) |
| 5-00-03 | 00 | 0 | CHART-02 | RLS inherited via nested select | unit (DAL, node env) | `cd dealdrop && npx vitest run src/lib/products/get-user-products.test.ts` | ❌ W0 (creates file) | ⬜ pending (red expected) |
| 5-01-01 | 01 | 1 | CHART-06 | supply-chain pin (exact version) | install verification | `cd dealdrop && node -e "require('./package.json').dependencies.recharts === '3.8.1' \|\| process.exit(1)"` | ✅ (package.json existing) | ⬜ pending |
| 5-01-02 | 01 | 1 | CHART-02 | RLS ownership-chain on nested select | unit (DAL) | `cd dealdrop && npx vitest run src/lib/products/get-user-products.test.ts` | ✅ (W0 stub turns green) | ⬜ pending |
| 5-02-01 | 02 | 2 | CHART-01, CHART-03, CHART-04, CHART-05, CHART-06 | N/A (read-only presentational) | unit (component) + build | `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx && npm run build` | ✅ (W0 stub turns green) | ⬜ pending |
| 5-03-01 | 03 | 3 | CHART-01 | N/A (wiring only) | full suite + build | `cd dealdrop && npx vitest run && npm run build` | ✅ (ProductCard existing) | ⬜ pending |
| 5-03-02 | 03 | 3 | CHART-05, CHART-06 | N/A | human-verify (browser smoke) | manual — see Manual-Only Verifications below | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dealdrop/src/components/dashboard/PriceChart.test.tsx` (Task 5-00-02) — stubs covering CHART-01, CHART-03, CHART-04 (renders LineChart, formatters produce non-empty strings, single-point + empty-array paths don't crash)
- [ ] `dealdrop/src/lib/products/get-user-products.test.ts` (Task 5-00-03) — stub covering CHART-02 (nested select called with `price_history(price, currency, checked_at)` + `order('checked_at', { ascending: true, referencedTable: 'price_history' })`)
- [ ] `dealdrop/src/components/dashboard/ProductCard.test.tsx` (Task 5-00-01) — update `makeProduct()` helper to include `price_history: []` default (prevents all existing ProductCard tests from failing to compile after the type widen — RESEARCH.md Risk 4, HIGH)
- [ ] `dealdrop/src/__mocks__/supabase-server.ts` (Task 5-00-01) — extend `.select().order()` chain to support a second `.order()` call while preserving await-compatibility for Phase 4's single-`.order()` callers (thenable pattern)
- [ ] Mock of `recharts.ResponsiveContainer` established via `vi.mock('recharts', ...)` inside `PriceChart.test.tsx` (per RESEARCH.md §6 — jsdom lacks ResizeObserver so the container otherwise renders null)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Owned By |
|----------|-------------|------------|-------------------|----------|
| Chart renders legibly at 320px mobile viewport | CHART-05 | Visual correctness — jsdom has no layout engine | In `npm run dev`, open a product card in Chrome DevTools device toolbar set to 320px width; click "Show Chart"; confirm Y-axis currency labels are not clipped and line stroke is visible | Task 5-03-02 Step 3 |
| No hydration warnings in browser console | CHART-06 | Hydration mismatches only surface in real browser, not jsdom | In `npm run dev`, open DevTools console; reveal chart on a product; FULL PAGE RELOAD; confirm zero warnings containing "hydration" / "did not match" / "findDOMNode" | Task 5-03-02 Step 4 |
| Dark-mode line color is legible | UI-SPEC color contract | CSS custom properties evaluated at runtime | Toggle system appearance to dark; confirm `var(--primary)` line stroke visible against `var(--card)` background | Task 5-03-02 Step 5 |
| Desktop smoke: Show Chart reveals, Hide Chart collapses | CHART-01 (SC-1) | End-to-end toggle behavior across the full data flow (DAL → grid → card → chart) | Desktop viewport ≥1200px; click Show Chart on a populated card; verify chart inline; click Hide Chart; verify collapse | Task 5-03-02 Step 2 |
| Tooltip shows full-precision currency + full date | CHART-03 | Recharts tooltip rendering is not asserted by component test (mocked ResponsiveContainer) | Hover a data point; verify tooltip shows full date (e.g. "April 20, 2026") + full-precision price (e.g. "$12.99") | Task 5-03-02 Step 2 |

---

## Data Shape Invariants

| Invariant | Source | Test Guard |
|-----------|--------|-----------|
| `price` is positive `number`, not null/NaN | DB-03 CHECK + `price_history.price NUMERIC NOT NULL` | TypeScript `number` type + Vitest fixtures use positive floats only |
| `currency` non-empty ISO 4217 string | Firecrawl Zod validation (Phase 3 TRACK-05) | Vitest fixtures pass `"USD"` / `"GBP"` |
| `checked_at` ISO 8601 parseable by `new Date()` | Supabase `TIMESTAMPTZ` → ISO string | Fixtures use `new Date().toISOString()`; formatters no-throw on invalid |
| `price_history` chronologically ordered | DAL `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` | DAL unit test asserts `order()` called with exact params (Task 5-00-03 Test 4) |

---

## Requirement → Task Coverage

| Req ID | Description | Primary Tasks | Automated Gate | Manual Gate |
|--------|-------------|---------------|----------------|-------------|
| CHART-01 | Client component PriceChart uses Recharts LineChart | 5-00-02, 5-02-01, 5-03-01 | `npx vitest run src/components/dashboard/PriceChart.test.tsx` | 5-03-02 Step 2 |
| CHART-02 | Chart reads price_history via RLS | 5-00-03, 5-01-02 | `npx vitest run src/lib/products/get-user-products.test.ts` | — (RLS verified in Phase 1) |
| CHART-03 | X-axis formatted dates, Y-axis formatted currency | 5-00-02, 5-02-01 | Vitest formatter assertions `Apr 20` / `\$12` | 5-03-02 Step 2 (tooltip full precision) |
| CHART-04 | Single-point renders without crash | 5-00-02, 5-02-01 | `npx vitest run -t "CHART-04"` | — (component test sufficient) |
| CHART-05 | Renders correctly on mobile + desktop | 5-02-01, 5-03-02 | `npm run build` | 5-03-02 Step 3 (320px) + Step 2 (desktop) |
| CHART-06 | Recharts compatible with React 19 strict mode | 5-01-01, 5-02-01, 5-03-01 | `grep -r findDOMNode node_modules/recharts` → 0 + `npm run build` | 5-03-02 Step 4 (runtime hydration check) |

**Coverage:** 6/6 CHART requirements have both automated + manual (where applicable) gates. No orphans.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify OR a human-verify checkpoint with prior automated gates
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (worst gap is Plan 03's human-verify, preceded by Task 3.1's full-suite + build gate)
- [x] Wave 0 covers all MISSING references (PriceChart.test.tsx + get-user-products.test.ts new; ProductCard.test.tsx + supabase-server.ts patched)
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 10s for the quick run
- [x] `nyquist_compliant: true` set in frontmatter — Per-Task Verification Map fully populated with real plan/task IDs

**Approval:** approved (by planner, 2026-04-20)
