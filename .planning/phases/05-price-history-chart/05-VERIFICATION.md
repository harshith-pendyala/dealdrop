---
phase: 05-price-history-chart
verified: 2026-04-20T22:00:00Z
status: passed
score: 16/16 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 5: Price History Chart — Verification Report

**Phase Goal (ROADMAP §Phase 5):** Each product card has a toggleable line chart showing the full price history for that product, with correct date/price axis formatting and graceful handling of sparse data.

**Task prompt goal:** Users can click "Show Chart" on any tracked product and see a price-history line chart — the core differentiator for DealDrop users tracking prices over time.

**Verified:** 2026-04-20T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (merged from ROADMAP §Phase 5 Success Criteria + PLAN must_haves)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Clicking "Show Chart" on a product card reveals a Recharts line chart; clicking again hides it (SC-1) | ✓ VERIFIED | `ProductCard.tsx:15` — `useState(chartOpen)`; `ProductCard.tsx:46` — `aria-expanded={chartOpen}`; `ProductCard.tsx:47` — `onClick={() => setChartOpen((v) => !v)}`; `ProductCard.tsx:59-63` — `{chartOpen && (<div className="px-4 pb-4"><PriceChart .../></div>)}`. Human-verify step 1 (user approved): "Chart renders correctly" + "CHART-01 visual confirmed (chart appears inline)". Toggle contract preserved verbatim from Phase 4 DASH-04. |
| 2  | The chart X-axis shows formatted dates and Y-axis shows formatted currency values (SC-2) | ✓ VERIFIED | `PriceChart.tsx:26-35` — `xTickFormatter` uses `Intl.DateTimeFormat({ month: 'short', day: 'numeric' })` → "Apr 20"; `PriceChart.tsx:14-24` — `yTickFormatter` uses `Intl.NumberFormat({ style: 'currency', currency, maximumFractionDigits: 0 })` → "$12"; wired into chart at `PriceChart.tsx:100` (XAxis `tickFormatter={xTickFormatter}`) and `PriceChart.tsx:106` (YAxis inline closure binds currency). Unit tests assert `/Apr\s*20/` and `/\$12\|US\$12/`. |
| 3  | A product with only one price history point renders the chart without crashing (SC-3, CHART-04) | ✓ VERIFIED | `PriceChart.tsx:119` — `dot={history.length === 1 ? { r: 4, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 2 } : false}`; Wave 0 test "CHART-04: 1-point history renders without crash" green. User observed live: "Chart renders correctly with 1-point data (single dot visible)" — Phase 4 TRACK-06 seeds one row per product atomically. |
| 4  | The chart renders without hydration warnings or React 19 compat errors on mobile + desktop (SC-4, CHART-05, CHART-06) | ✓ VERIFIED | `npm run build` exits 0 with 0 TS errors, 0 findDOMNode deprecation warnings, 0 recharts/React-19 strict-mode warnings (documented in 05-03-SUMMARY.md); `grep findDOMNode node_modules/recharts/{lib,es6}` → 0 matches; recharts@3.8.1 pinned exact. Human-verify step 3 (320px mobile) + step 4 (full-reload hydration check) passed — zero console warnings matching `hydration` / `did not match` / `findDOMNode`. |
| 5  | Wave 0 creates failing-red test stubs that compile against the widened Product type | ✓ VERIFIED | `PriceChart.test.tsx` (Wave 0 red) now green — 5 tests pass; `get-user-products.test.ts` (Wave 0 red) now green — 5 tests pass. Commits `0b97311` (PriceChart red) + `bf81322` (DAL red) confirm initial red state. |
| 6  | ProductCard.test.tsx's makeProduct() helper defaults price_history: [] (Risk 4 guard) | ✓ VERIFIED | `grep -n "price_history: \[\]" ProductCard.test.tsx` returns 1 match (Wave 0 Task 0.1 landed in commit `9272ef9`); all 7 ProductCard tests stay green after Wave 1 widened Product type. |
| 7  | makeSupabaseMock chains two .order() calls with thenable first-.order | ✓ VERIFIED | `supabase-server.ts` `select` block replaced with double-chain + thenable (commit `9272ef9`); 14 Phase 4 action tests + 7 Phase 4 ProductCard tests stay green alongside the 5 new DAL tests. |
| 8  | vi.mock('recharts', ...) pattern established in PriceChart.test.tsx (jsdom bypass) | ✓ VERIFIED | `PriceChart.test.tsx` uses `vi.mock('recharts', ...)` ResponsiveContainer bypass (Wave 0 decision from RESEARCH §6 Strategy A); 5/5 PriceChart tests pass in jsdom without ResizeObserver polyfill. |
| 9  | recharts@3.8.1 installed as exact-pin prod dependency, zero peer warnings | ✓ VERIFIED | `dealdrop/package.json` `"recharts": "3.8.1"` (no caret); `node_modules/recharts/package.json` version `"3.8.1"`; install-time zero peer-dep warnings, zero vulnerabilities, zero findDOMNode usages (05-01-SUMMARY.md telemetry table). |
| 10 | getUserProducts returns each product with chronologically-ordered price_history: PricePoint[] via one Supabase nested select | ✓ VERIFIED | `get-user-products.ts:25` — `.select('*, price_history(price, currency, checked_at)')`; `get-user-products.ts:26-27` — chained `.order('created_at', { ascending: false }).order('checked_at', { ascending: true, referencedTable: 'price_history' })`; one await, one round-trip per dashboard render (D-01, D-02, D-04). Wave 0 DAL tests assert exact select string + both order call args — 5/5 green. |
| 11 | Product and PricePoint types exported from the DAL | ✓ VERIFIED | `get-user-products.ts:8-12` — `export type PricePoint`; `get-user-products.ts:14-16` — `export type Product = Tables<'products'> & { price_history: PricePoint[] }`; PriceChart imports `PricePoint` from `@/lib/products/get-user-products`; ProductGrid imports `Product` from same path (no parallel type module). |
| 12 | RLS policy DB-06 continues to enforce scoping; no .eq('user_id', ...) added | ✓ VERIFIED | `grep -c "\.eq('user_id'" get-user-products.ts` returns 0; DB-06 ownership-chain policy handles nested resource scoping server-side via PostgREST (D-02 honored). |
| 13 | PriceChart is a 'use client' component that renders Recharts LineChart from PricePoint[] history | ✓ VERIFIED | `PriceChart.tsx:1` — `'use client'` on line 1; imports ResponsiveContainer/LineChart/Line/XAxis/YAxis/Tooltip from `'recharts'`; exports `PriceChart`, `xTickFormatter`, `yTickFormatter`; 125 lines, no prohibited hooks (no `useState`/`useEffect`/`useTransition`), no CartesianGrid/Legend/Brush. |
| 14 | Empty history renders "No price history yet." in min-h-[200px] bg-muted container | ✓ VERIFIED | `PriceChart.tsx:87-93` — defensive branch renders `<div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center"><p className="text-sm text-muted-foreground">No price history yet.</p></div>`; Wave 0 CHART-04 empty-state test green. |
| 15 | Single-point history renders a visible dot; multi-point renders monotone line stroked var(--primary) | ✓ VERIFIED | `PriceChart.tsx:114-120` — `type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2}`; conditional dot on length===1 with fill `var(--card)` + stroke `var(--primary)`; user observed single-dot live on 2026-04-20 browser smoke. |
| 16 | Tooltip shows full-precision currency and full-date copy on hover | ✓ VERIFIED | `PriceChart.tsx:64-81` — `PriceTooltip` renders `fullDate(label)` (long month, numeric day, year) + `fullPrice(price, currency)` (default Intl.NumberFormat currency, no maxFractionDigits) inside var(--card) / var(--border) styled div; wired via `Tooltip content={<PriceTooltip currency={currency} />}` on line 113. Human-verify step 2 confirmed hover tooltip rendering. |

**Score:** 16/16 truths verified.

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive (Level 2) | Wired (Level 3) | Data Flows (Level 4) | Status |
|----------|----------|--------|-----------------------|-----------------|----------------------|--------|
| `dealdrop/src/components/dashboard/PriceChart.tsx` | 'use client' Recharts component + exported formatters + empty-state + tooltip | ✓ (125 lines) | ✓ All UI-SPEC elements present (stroke var(--primary), height=200, width=60, domain=['auto','auto'], monotone, maximumFractionDigits:0, month:'short'+'long', no prohibited subcomponents) | ✓ Imported in ProductCard.tsx:9; used in ProductCard.tsx:61 | ✓ Receives `product.price_history` (populated by DAL nested select) + `product.currency` at runtime | ✓ VERIFIED |
| `dealdrop/src/lib/products/get-user-products.ts` | DAL extended with nested select + PricePoint + widened Product | ✓ (33 lines) | ✓ nested-select string, dual-order chain, server-only directive line 1, fail-open return [], no .limit(), no .eq('user_id'), exports Product + PricePoint | ✓ Imported by DashboardShell.tsx:2 (getUserProducts call) + ProductGrid.tsx:3 (Product type) + PriceChart.tsx:10 (PricePoint type) | ✓ Runtime Supabase PostgREST call returns products + nested price_history (live confirmed by user — 1-point dot rendered from seeded data) | ✓ VERIFIED |
| `dealdrop/src/components/dashboard/ProductCard.tsx` | Placeholder swapped for `<PriceChart history={product.price_history} currency={product.currency} />` | ✓ (74 lines) | ✓ Import on line 9; JSX on line 61; placeholder div + aria-hidden fully removed; `'use client'` preserved; chartOpen state preserved; aria-expanded preserved; formatPrice helper preserved; outer px-4 pb-4 wrapper preserved | ✓ Rendered by ProductGrid; receives Product prop flowing from DashboardShell → getUserProducts | ✓ `product.price_history` prop-drills from Supabase nested-select result to PriceChart — user-observed live render | ✓ VERIFIED |
| `dealdrop/src/__mocks__/supabase-server.ts` | select().order().order() double-chain + thenable | ✓ (test-infra only) | ✓ `grep "order: vi.fn().mockReturnValue"` returns 1; thenable preserves Phase 4 single-order await path | ✓ Imported by 3 test files (get-user-products.test.ts, products.test.ts implicitly, ProductCard.test.tsx) | N/A (test infra — no runtime data) | ✓ VERIFIED |
| `dealdrop/src/components/dashboard/PriceChart.test.tsx` | 5 component tests (CHART-01, 03, 04 coverage) | ✓ | ✓ 5/5 tests pass (vitest run) | ✓ Exercised by `npx vitest run` | N/A (tests) | ✓ VERIFIED |
| `dealdrop/src/lib/products/get-user-products.test.ts` | 5 DAL tests covering nested select + nested order | ✓ | ✓ 5/5 tests pass (vitest run) | ✓ Exercised by `npx vitest run` | N/A (tests) | ✓ VERIFIED |
| `dealdrop/package.json` + `dealdrop/package-lock.json` | recharts@3.8.1 pinned exact | ✓ | ✓ `"recharts": "3.8.1"` (no caret), `node_modules/recharts/package.json` version `"3.8.1"` | ✓ Imported by PriceChart.tsx | N/A (dependency) | ✓ VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Detail |
|------|----|----|--------|--------|
| PriceChart.tsx | recharts package | Named imports (ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip) | ✓ WIRED | `grep "from 'recharts'"` matches on line 9 of PriceChart.tsx; all 6 imports used in JSX (ResponsiveContainer:96, LineChart:97, XAxis:98, YAxis:105, Tooltip:113, Line:114). |
| PriceChart.tsx | PricePoint type from DAL | Type import | ✓ WIRED | `grep "import type { PricePoint } from '@/lib/products/get-user-products'"` matches on line 10; used in Props type line 12. |
| PriceChart.tsx Line stroke | Shadcn theme `var(--primary)` | Inline prop | ✓ WIRED | `grep 'stroke="var(--primary)"'` matches on line 117; dark-mode legibility confirmed in human-verify step 5. |
| ProductCard.tsx | PriceChart component | Named import + JSX in chartOpen slot | ✓ WIRED | `import { PriceChart } from './PriceChart'` on line 9; `<PriceChart history={product.price_history} currency={product.currency} />` on line 61 inside `{chartOpen && ...}` block. |
| ProductCard chartOpen state | PriceChart visibility | Conditional render | ✓ WIRED | Line 59: `{chartOpen && (...)}` gates PriceChart; `aria-expanded={chartOpen}` on the toggle button (line 46) reflects state; DASH-04 toggle contract preserved from Phase 4. |
| get-user-products.ts | Supabase nested select + referencedTable order | `@/lib/supabase/server createClient` | ✓ WIRED | Line 19: `const supabase = await createClient()`; line 25: nested select; line 27: `.order('checked_at', { ascending: true, referencedTable: 'price_history' })`. |
| get-user-products.ts | RLS DB-06 ownership chain | Server-session JWT passthrough (no code change) | ✓ WIRED | No `.eq('user_id', ...)` in source (grep count 0); comment on lines 20-22 documents DB-06 reliance; D-02 decision honored. |
| DashboardShell.tsx | getUserProducts DAL | Direct await | ✓ WIRED | `DashboardShell.tsx:2` imports `getUserProducts`; `line 9`: `const products = await getUserProducts()`; feeds ProductGrid → ProductCard → PriceChart. |
| ProductGrid.tsx | Widened Product type | Type re-import | ✓ WIRED | `ProductGrid.tsx:3` imports `Product` from the DAL; widened type auto-flows (Risk 5 clean). |

**All 9 key links verified WIRED.**

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|---------------------|--------|
| PriceChart.tsx | `history: PricePoint[]` (prop) | Drilled from ProductCard → `product.price_history` | ✓ Yes — Supabase returns rows via nested-select; Phase 4 TRACK-06 seeds initial row at product creation; user observed live 1-point render on 2026-04-20 | ✓ FLOWING |
| PriceChart.tsx | `currency: string` (prop) | Drilled from ProductCard → `product.currency` | ✓ Yes — column on products table; scraped by Phase 3 Firecrawl pipeline | ✓ FLOWING |
| ProductCard.tsx | `product.price_history` | Prop from ProductGrid | ✓ Yes — DashboardShell awaits getUserProducts(); DAL's nested select returns real history rows | ✓ FLOWING |
| get-user-products.ts | `data` from Supabase | Real PostgREST query against live Supabase project | ✓ Yes — chained `.order()` + nested select returns products + embedded price_history arrays | ✓ FLOWING |

**No HOLLOW or DISCONNECTED data paths identified.** Data flows end-to-end from Supabase → DAL → RSC (DashboardShell) → RSC-to-client (ProductGrid) → client (ProductCard) → client (PriceChart) → Recharts SVG render.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite passes | `cd dealdrop && npx vitest run` | 108/108 tests pass across 13 files | ✓ PASS |
| PriceChart tests pass | (subset of above) | 5/5 pass | ✓ PASS |
| DAL tests pass | (subset of above) | 5/5 pass | ✓ PASS |
| Phase 4 regression (ProductCard/products actions) | (subset of above) | 14 products actions + 7 ProductCard all pass | ✓ PASS |
| Build produces bundle without errors | `cd dealdrop && npm run build` | Exit 0; 0 TS errors; 0 recharts/React-19 warnings (05-03-SUMMARY.md telemetry) | ✓ PASS |
| recharts installed at exact pin | `grep '"recharts"' dealdrop/package.json` + `cat node_modules/recharts/package.json` | `"recharts": "3.8.1"` (no caret); installed version `3.8.1` | ✓ PASS |
| PriceChart exports formatters as top-level functions | `grep "^export function" PriceChart.tsx` | 3 matches: `yTickFormatter`, `xTickFormatter`, `PriceChart` | ✓ PASS |
| ProductCard JSX slot swap | `grep "<PriceChart history={product.price_history}" ProductCard.tsx` | 1 match on line 61 | ✓ PASS |
| Placeholder div + aria-hidden removed from ProductCard | `grep "min-h-\[200px\] bg-muted rounded-lg" ProductCard.tsx` + `grep 'aria-hidden="true"' ProductCard.tsx` | 0 matches each (class now only lives in PriceChart empty-state branch) | ✓ PASS |
| DAL has nested select + referencedTable order | `grep "price_history(price, currency, checked_at)" + grep "referencedTable: 'price_history'"` in DAL | 1 match each | ✓ PASS |
| Server-only directive on DAL line 1 | `head -n 1 get-user-products.ts` | `import 'server-only'` | ✓ PASS |

**11/11 spot-checks PASS.** Single-source-of-truth verified: tests executed live (108/108 green), source greps match spec, installed package version confirmed.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHART-01 | 05-00, 05-02, 05-03 | Client component `PriceChart` uses Recharts to render a line chart of price over time | ✓ SATISFIED | `PriceChart.tsx` exports `PriceChart` as `'use client'` component using Recharts `LineChart`; wired into ProductCard; Wave 0 CHART-01 test + human-verify step 1 both confirm. |
| CHART-02 | 05-00, 05-01 | Chart reads from `price_history` rows scoped to the product via RLS | ✓ SATISFIED | `get-user-products.ts:25` nested select `*, price_history(price, currency, checked_at)`; RLS ownership-chain DB-06 scopes reads server-side (no app-level `.eq('user_id', ...)`); 5/5 DAL tests green. |
| CHART-03 | 05-00, 05-02 | X-axis shows formatted dates, Y-axis shows formatted currency values | ✓ SATISFIED | `xTickFormatter` (Intl.DateTimeFormat "MMM d") + `yTickFormatter` (Intl.NumberFormat currency, maxFractionDigits:0) exported at top level; unit tests assert `/Apr\s*20/` + `/\$12\|US\$12/`; wired into XAxis:100 + YAxis:106. |
| CHART-04 | 05-00, 05-02 | Chart has at least one data point (seeded on product creation via TRACK-06) | ✓ SATISFIED | Single-point path: `dot={history.length === 1 ? {...} : false}` on PriceChart.tsx:119; empty-state defensive branch falls back to "No price history yet." placeholder; user observed 1-point dot live on 2026-04-20 (Phase 4's addProduct seeds the first row atomically). |
| CHART-05 | 05-02, 05-03 | Chart renders correctly on mobile and desktop viewports | ✓ SATISFIED | `ResponsiveContainer width="100%" height={200}`; YAxis `width={60}` gives currency labels room on 320px; human-verify step 2 (desktop ≥1200px) + step 3 (320px DevTools) both approved by user. |
| CHART-06 | 05-01, 05-02, 05-03 | Recharts version compatible with React 19 strict mode | ✓ SATISFIED | recharts@3.8.1 pinned exact; `grep findDOMNode node_modules/recharts/{lib,es6}` → 0; `npm run build` green with 0 React-19 strict-mode warnings; human-verify step 4 confirmed zero `hydration`/`did not match`/`findDOMNode` console messages on full page reload. |

**All 6 CHART requirements SATISFIED.** No orphaned requirements — every ID in ROADMAP §Phase 5 is claimed by at least one plan in this phase, and every ID in the phase's plan frontmatters is present in REQUIREMENTS.md. REQUIREMENTS.md already marks all 6 Complete (lines 75-80 and 201-206).

---

### Anti-Patterns Found

Files scanned for TODO/FIXME/placeholder/empty-implementation markers:
- `PriceChart.tsx`
- `get-user-products.ts`
- `ProductCard.tsx`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

**Zero anti-patterns found in shipped Phase 5 source files.** `grep -E "TODO|FIXME|XXX|HACK|PLACEHOLDER"` returned 0 matches across the three shipped source files.

**Review warnings from 05-REVIEW.md (informational, not gaps):**

| Ref | Severity | Issue | Disposition |
|-----|----------|-------|-------------|
| WR-01 | Warning | `PriceTooltip` reads `payload[0].value` without NaN/null guard | Defensive gap — low probability because `PricePoint.price` is always `number` at the DAL boundary; acknowledged in REVIEW, not a blocker for the phase goal. Polish candidate for Phase 7. |
| WR-02 | Warning | "Renders line chart" test asserts only absence of empty-state copy | Test-quality warning — does not affect shipped runtime behavior. Live browser smoke on 2026-04-20 confirmed the chart actually renders. Polish candidate for Phase 7. |
| IN-01..IN-06 | Info | Duplicated formatter, unchecked cast in DAL return, narrow TooltipProps, dual-shape mock, liberal `as any` in tests | Info-level observations documented in 05-REVIEW.md; none block the phase goal. |

These review items are captured for future polish; they do not prevent the phase from passing because the phase goal ("user can click Show Chart and see a line chart") is met end-to-end with real data flowing through real code.

---

### Human Verification Required

**None — already completed in-phase.** Task 3.2 (human-verify checkpoint) was approved by the user on 2026-04-20 after the 5-step live browser smoke:

| Step | Check | Result |
|------|-------|--------|
| 1 | Desktop (≥1200px) Show Chart reveals chart inline with X-axis short dates + Y-axis formatted currency + hover tooltip full-precision | ✓ User confirmed |
| 2 | Show/Hide toggle collapses chart cleanly (aria-expanded flip + DOM removal) | ✓ User confirmed |
| 3 | Mobile 320px viewport: chart fits inside card, YAxis labels not clipped, X-axis tick auto-reduction | ✓ User confirmed |
| 4 | Full page reload with DevTools Console open: zero `hydration` / `did not match` / `findDOMNode` warnings | ✓ User confirmed |
| 5 | Dark-mode legibility: var(--primary) line stroke visible against var(--card) background, var(--muted-foreground) ticks readable | ✓ User confirmed |

The task prompt from the orchestrator explicitly documents: **"Human-verify checkpoint approved by user after live browser smoke (5 steps: desktop chart render, mobile 320px, hydration warnings, dark mode)"** and **"User observed CHART-04 single-point path live (1 dot rendering with today's price)"**. No outstanding human-verify items remain.

---

### Gaps Summary

**No gaps identified.** All 16 must-have truths verified, all 7 artifact paths exist/substantive/wired, all 9 key links wired, all 11 behavioral spot-checks pass, all 6 CHART requirements satisfied, zero anti-patterns in shipped source, human-verify checkpoint already approved in-phase.

**Non-Phase-5 observations noted during verification (not regressions — Phase 4 artifacts):**
- RemoveProductDialog `aria-describedby={undefined}` warning (Phase 4 Shadcn AlertDialog a11y gap)
- Next.js `<Image>` lazy-load browser intervention on product cards (Phase 4)
- CSS Grid `align-items: stretch` equalizes card heights when chart expands (Phase 4 layout baseline)

All three predate Phase 5 and are explicitly documented as out-of-scope polish candidates for Phase 7 in 05-03-SUMMARY.md.

---

## Overall Assessment

Phase 5 ships a complete, working, end-to-end price-history chart feature:

1. **Data layer** — `getUserProducts` DAL widened with a single-round-trip Supabase nested select + chronological ordering via `referencedTable`; RLS DB-06 enforces scoping without app-level guards.
2. **Dependency** — recharts@3.8.1 pinned exact, React 19 strict-mode clean (0 findDOMNode, 0 peer warnings), verified in build + live browser.
3. **Component** — `PriceChart` (125 lines, 'use client') renders a Recharts LineChart with theme-token-styled stroke, compact-currency Y-axis, short-date X-axis, full-precision hover tooltip, defensive empty-state, and a visible single-point dot.
4. **Integration** — ProductCard's `{chartOpen && ...}` slot swapped from placeholder div to `<PriceChart>` with a +2/-4 line diff; Risk 5 downstream-type audit passed cleanly (ProductGrid.tsx and DashboardShell.tsx required zero edits — widened Product type auto-flows through the chain).
5. **Validation** — Full vitest suite 108/108 green across 13 files; `npm run build` exit 0; user-approved human-verify on desktop + 320px mobile + dark-mode + full-reload hydration check.

**Phase goal achieved:** Users can click "Show Chart" on any tracked product and see a price-history line chart. Confirmed live by user on 2026-04-20.

---

_Verified: 2026-04-20T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
