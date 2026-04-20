---
phase: 5
slug: price-history-chart
status: draft
nyquist_compliant: false
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

> Populated by planner as tasks are authored. Every CHART-xx requirement must have at least one row with an automated command, OR a Wave 0 stub file_exists: ❌ marker.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 5-00-01 | 00 | 0 | CHART-01..06 | N/A | wave-0 stub | `npx vitest run src/components/dashboard/PriceChart.test.tsx` | ❌ W0 | ⬜ pending |
| 5-00-02 | 00 | 0 | CHART-02 | RLS inherited | wave-0 stub | `npx vitest run src/lib/products/get-user-products.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-xx | 01 | 1 | CHART-02 | RLS ownership-chain on nested select | unit (DAL) | `npx vitest run src/lib/products/get-user-products.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-xx | 02 | 2 | CHART-01, CHART-03, CHART-04 | N/A (read-only) | unit (component) | `npx vitest run src/components/dashboard/PriceChart.test.tsx` | ❌ W0 | ⬜ pending |
| 5-03-xx | 03 | 3 | CHART-05, CHART-06 | N/A | build + manual | `cd dealdrop && npm run build` + manual Show Chart click | ✅ (build) / manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dealdrop/src/components/dashboard/PriceChart.test.tsx` — stubs covering CHART-01, CHART-03, CHART-04 (renders LineChart, formatters produce non-empty strings, single-point + empty-array paths don't crash)
- [ ] `dealdrop/src/lib/products/get-user-products.test.ts` — stub covering CHART-02 (nested select called with `price_history(price, currency, checked_at)` + `order('checked_at', { ascending: true, referencedTable: 'price_history' })`)
- [ ] `dealdrop/src/components/dashboard/ProductCard.test.tsx` — update `makeProduct()` helper to include `price_history: []` default (prevents all existing ProductCard tests from failing to compile after the type widen — RESEARCH.md Risk 4, HIGH)
- [ ] Mock of `recharts.ResponsiveContainer` established via `vi.mock('recharts', ...)` inside `PriceChart.test.tsx` (per RESEARCH.md §6 — jsdom lacks ResizeObserver so the container otherwise renders null)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart renders legibly at 320px mobile viewport | CHART-05 | Visual correctness — jsdom has no layout engine | In `npm run dev`, open a product card in Chrome DevTools device toolbar set to 320px width; click "Show Chart"; confirm Y-axis currency labels are not clipped and line stroke is visible |
| No hydration warnings in browser console | CHART-06 | Hydration mismatches only surface in real browser, not jsdom | In `npm run dev`, open DevTools console; reveal chart on a product; confirm zero warnings containing "hydration" / "did not match" / "findDOMNode" |
| Dark-mode line color is legible | UI-SPEC color contract | CSS custom properties evaluated at runtime | Toggle system appearance to dark; confirm `var(--primary)` line stroke visible against `var(--card)` background |

---

## Data Shape Invariants

| Invariant | Source | Test Guard |
|-----------|--------|-----------|
| `price` is positive `number`, not null/NaN | DB-03 CHECK + `price_history.price NUMERIC NOT NULL` | TypeScript `number` type + Vitest fixtures use positive floats only |
| `currency` non-empty ISO 4217 string | Firecrawl Zod validation (Phase 3 TRACK-05) | Vitest fixtures pass `"USD"` / `"GBP"` |
| `checked_at` ISO 8601 parseable by `new Date()` | Supabase `TIMESTAMPTZ` → ISO string | Fixtures use `new Date().toISOString()`; formatters no-throw on invalid |
| `price_history` chronologically ordered | DAL `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` | DAL unit test asserts `order()` called with exact params |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (new test files + ProductCard.test.tsx update)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter after planner fills the Per-Task Verification Map completely

**Approval:** pending
