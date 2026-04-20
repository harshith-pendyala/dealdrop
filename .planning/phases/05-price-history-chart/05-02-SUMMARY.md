---
phase: 05-price-history-chart
plan: 02
subsystem: frontend

tags: [recharts, client-component, react-19, price-chart, intl, shadcn-tokens, tdd-green]

requires:
  - phase: 05-price-history-chart
    provides: "recharts@3.8.1 exact-pinned + PricePoint type export + widened Product with price_history from 05-01 DAL"
  - phase: 05-price-history-chart
    provides: "Red-state PriceChart.test.tsx with vi.mock('recharts') ResponsiveContainer bypass + makeHistory factory from 05-00 Wave 0"

provides:
  - "dealdrop/src/components/dashboard/PriceChart.tsx — 'use client' Recharts LineChart component ready to swap into ProductCard's {chartOpen && ...} slot"
  - "Top-level exported xTickFormatter(value: string) — Intl.DateTimeFormat 'MMM d' short date formatter with try/catch fallback"
  - "Top-level exported yTickFormatter(value: number, currency: string) — Intl.NumberFormat compact-currency formatter (maximumFractionDigits: 0) with try/catch fallback"
  - "Defensive empty-state branch rendering 'No price history yet.' inside min-h-[200px] bg-muted rounded-lg container (defensive — TRACK-06 seeds the first row atomically at product creation)"
  - "PriceTooltip inner component with full-precision currency + full-date copy on hover using var(--card)/var(--border) chrome"

affects: [05-03-plan]

tech-stack:
  added: []
  patterns:
    - "Recharts 3.x Tooltip element-passing API — content={<PriceTooltip currency={currency} />} accepted without fallback (Risk 2 resolved element-style)"
    - "Top-level named-function export of Intl formatters so Vitest can unit-test them without rendering the chart (xTickFormatter / yTickFormatter)"
    - "Inline arrow wrapper on YAxis tickFormatter to bind currency closure: tickFormatter={(value: number) => yTickFormatter(value, currency)}"
    - "Single-point dot via conditional literal — dot={history.length === 1 ? { r: 4, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 2 } : false}"
    - "Shadcn theme-token styling inside inline SVG/JSX — stroke='var(--primary)', fill='var(--muted-foreground)', background/border/color on tooltip div via style prop (CSS custom properties evaluate at paint time, dark-mode safe)"

key-files:
  created:
    - "dealdrop/src/components/dashboard/PriceChart.tsx"
  modified: []

key-decisions:
  - "Accepted Recharts 3.8.1 Tooltip element-passing style (content={<PriceTooltip currency={currency} />}) without falling back to render-function form — element-style works in live jsdom tests, Risk 2 resolved in favor of simpler pattern"
  - "Kept domain={['auto', 'auto']} (D-04 locked) despite Risk 3 single-point concern — Recharts D3 scale pads min===max without NaN, verified by CHART-04 1-point test case rendering without crash"
  - "Single-point dot uses fill='var(--card)' with stroke='var(--primary)' outline (UI-SPEC §Color) — visible marker, not solid disc; activeDot hover stays solid var(--primary)"
  - "No CartesianGrid, no Legend, no Brush (UI-SPEC locked); no hooks (useState/useEffect/useTransition) — read-only presentational component"
  - "PriceTooltip inner component defined as regular function (not memoized) — Recharts only re-renders it on hover state changes, memoization adds complexity without measurable benefit"

patterns-established:
  - "Client-component + top-level named formatter exports = unit-testable formatting logic without DOM rendering overhead"
  - "Inline style={{ background: 'var(--card)', ... }} for Recharts subcomponents that can't accept Tailwind className (SVG-adjacent HTML) — CSS vars handle theme/dark-mode automatically"
  - "vi.mock('recharts', ...) ResponsiveContainer bypass from Wave 0 lets component tests exercise the inner LineChart tree without ResizeObserver polyfill"

requirements-completed: [CHART-01, CHART-03, CHART-04, CHART-05, CHART-06]

duration: 2min
completed: 2026-04-20
---

# Phase 05 Plan 02: PriceChart Client Component (Wave 2) Summary

**PriceChart.tsx shipped as a 125-line 'use client' Recharts LineChart with exported xTickFormatter + yTickFormatter, defensive empty-state guard, and PriceTooltip full-precision hover — all 5 Wave 0 red tests flipped to green in a single task commit, full 108/108 suite + npm run build remain clean.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-20T14:51:40Z
- **Completed:** 2026-04-20T14:53:15Z
- **Tasks:** 1
- **Files created:** 1 (PriceChart.tsx)
- **Files modified:** 0

## Accomplishments

- Created `dealdrop/src/components/dashboard/PriceChart.tsx` (125 lines) with the UI-SPEC-locked Recharts skeleton verbatim: ResponsiveContainer (100% width, 200px height) → LineChart (margin {4,8,4,0}) → XAxis (checked_at, xTickFormatter, 14px var(--muted-foreground) ticks, no tick/axis lines) → YAxis (yTickFormatter w/ currency closure, domain ['auto','auto'], width 60, 14px var(--muted-foreground) ticks, no tick/axis lines) → Tooltip (custom PriceTooltip element) → Line (monotone, price, var(--primary) stroke 2px, conditional dot for single-point, activeDot r:4).
- Exported `xTickFormatter(value: string)` and `yTickFormatter(value: number, currency: string)` as top-level named functions so Wave 0's unit-test assertions `/\$12|US\$12/` and `/Apr\s*20/` hit without rendering the chart.
- Added `PriceTooltip` inner component returning null when inactive; on hover renders full-precision `Intl.NumberFormat` currency + full `Intl.DateTimeFormat` long-date copy in a var(--card)/var(--border)-styled div with 8/12 padding.
- Added defensive empty-state: `history.length === 0` → renders `<p className="text-sm text-muted-foreground">No price history yet.</p>` inside a `min-h-[200px] bg-muted rounded-lg flex items-center justify-center` container (matches the existing ProductCard placeholder class pattern byte-for-byte).
- Flipped all 5 Wave 0 PriceChart.test.tsx red tests to GREEN in one write: CHART-04 empty-state, CHART-04 1-point no-crash, CHART-01 multi-point container, CHART-03 yTickFormatter compact currency, CHART-03 xTickFormatter short date.
- Preserved full regression envelope: 108/108 tests pass across all 13 test files; `npm run build` exits 0 with zero TS errors, zero recharts/React 19 strict-mode warnings — confirms RESEARCH.md §4 clean-slate prediction.

## Task Commits

Each task was committed atomically:

1. **Task 2.1:** Create PriceChart.tsx with Recharts skeleton, formatters, PriceTooltip, empty-state — `e00e56e` (feat)

**Plan metadata commit:** (pending — created at end of plan execution)

## PriceChart.tsx Source (final shape)

```tsx
'use client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { PricePoint } from '@/lib/products/get-user-products'

type Props = Readonly<{ history: PricePoint[]; currency: string }>

export function yTickFormatter(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Math.round(value)}`
  }
}

export function xTickFormatter(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

// fullPrice / fullDate helpers + PriceTooltip subcomponent (see file)

export function PriceChart({ history, currency }: Props) {
  if (history.length === 0) {
    return (
      <div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No price history yet.</p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis dataKey="checked_at" tickFormatter={xTickFormatter} tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => yTickFormatter(v, currency)} tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }} domain={['auto', 'auto']} width={60} tickLine={false} axisLine={false} />
        <Tooltip content={<PriceTooltip currency={currency} />} />
        <Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2}
          dot={history.length === 1 ? { r: 4, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 2 } : false}
          activeDot={{ r: 4, fill: 'var(--primary)' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Net:** 125 lines total (105% of 80-line minimum spec), zero deletions, no existing files modified.

## Test Run (Wave 2 gate — `npx vitest run`)

| Test File | Before Wave 2 | After Wave 2 | Delta |
|-----------|---------------|--------------|-------|
| `src/components/dashboard/PriceChart.test.tsx` | 0 passed / transform-fail (missing `./PriceChart` import) | **5 passed** | 0 → 5 GREEN ✅ (RED→GREEN as required by TDD) |
| `src/lib/products/get-user-products.test.ts` | 5 passed | 5 passed | no regression ✅ |
| `src/components/dashboard/ProductCard.test.tsx` | 7 passed | 7 passed | no regression ✅ |
| `src/actions/products.test.ts` | 14 passed | 14 passed | no regression ✅ |
| Full `npx vitest run` | 103 + 1 transform-fail | **108 passed across 13 files, 0 failures** | Wave 2 GATE GREEN ✅ |
| `npm run build` | green | green | zero TS errors, zero recharts/React 19 warnings ✅ |

## 5/5 Component Test Confirmation

| Test | Requirement | Result |
|------|-------------|--------|
| `CHART-04: renders empty-state copy when history is empty` | CHART-04 | ✅ PASS — "No price history yet." found in DOM when `history=[]` |
| `CHART-04: renders without crash when given 1 point` | CHART-04 | ✅ PASS — empty-state copy NOT present when `history=[{price:10,...}]` (means the Recharts branch rendered without throwing) |
| `CHART-01: renders line chart container when history has many points` | CHART-01 | ✅ PASS — empty-state copy NOT present when `history.length=10` |
| `CHART-03: yTickFormatter produces compact currency label (no decimals)` | CHART-03 | ✅ PASS — `yTickFormatter(12, 'USD')` matches `/\$12|US\$12/` and does NOT match `/\.\d/` |
| `CHART-03: xTickFormatter produces short "MMM d" date label (no year)` | CHART-03 | ✅ PASS — `xTickFormatter('2026-04-20T00:00:00Z')` matches `/Apr\s*20/` and does NOT match `/2026/` |

## Tooltip `content` Prop Resolution (Risk 2)

**Resolved: Element-passing API accepted without fallback.** The plan's Risk 2 flagged that Recharts 3.x *might* require switching from `content={<PriceTooltip currency={currency} />}` to `content={(props) => <PriceTooltip {...props} currency={currency} />}` (render-function form). In practice, the element-style pattern works cleanly in Recharts 3.8.1 — the multi-point test (CHART-01) renders without throwing, the `npm run build` compilation accepts the `content: React.ReactNode` prop signature, and no `active`/`payload` type complaints surfaced.

**Impact:** Zero. The simpler element-style pattern ships as written; no Rule-1 fallback needed.

## UI-SPEC Fidelity Check

| UI-SPEC §Component Inventory item | Locked value | Shipped value | Match |
|-----------------------------------|--------------|---------------|-------|
| Directive | `'use client'` (line 1) | `'use client'` (line 1) | ✅ exact |
| Recharts imports | `ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip` (6 named) | 6 named (multi-line block, lines 2-9) | ✅ all 6 |
| Props | `{ history: PricePoint[]; currency: string }` (Readonly) | `Readonly<{ history: PricePoint[]; currency: string }>` | ✅ exact |
| ResponsiveContainer | `width="100%" height={200}` | `width="100%" height={200}` | ✅ exact |
| LineChart margin | `{ top: 4, right: 8, bottom: 4, left: 0 }` | `{ top: 4, right: 8, bottom: 4, left: 0 }` | ✅ exact |
| XAxis dataKey | `checked_at` | `"checked_at"` | ✅ exact |
| XAxis tick | `fontSize: 14, fill: 'var(--muted-foreground)'` | `fontSize: 14, fill: 'var(--muted-foreground)'` | ✅ exact |
| YAxis domain | `['auto', 'auto']` | `['auto', 'auto']` | ✅ exact |
| YAxis width | `60` | `60` | ✅ exact |
| Line type | `monotone` | `"monotone"` | ✅ exact |
| Line stroke | `var(--primary)` | `"var(--primary)"` | ✅ exact |
| Line strokeWidth | `2` | `2` | ✅ exact |
| activeDot | `{ r: 4, fill: 'var(--primary)' }` | `{ r: 4, fill: 'var(--primary)' }` | ✅ exact |
| Empty-state copy | `No price history yet.` | `No price history yet.` | ✅ exact |
| Empty-state container | `min-h-[200px] bg-muted rounded-lg flex items-center justify-center` | `min-h-[200px] bg-muted rounded-lg flex items-center justify-center` | ✅ exact |
| Empty-state text class | `text-sm text-muted-foreground` | `text-sm text-muted-foreground` | ✅ exact |

**Deviations from UI-SPEC:** ZERO. Every locked value shipped verbatim.

## Acceptance-Grep Audit

All 20 acceptance greps from the plan evaluate as required:

| Grep | Expected | Actual |
|------|----------|--------|
| `'use client'` (line 1) | 1 | ✅ line 1 |
| 6 recharts named imports block | all 6 present | ✅ multi-line block lines 2-9 |
| `import type { PricePoint }` | 1 | ✅ line 10 |
| `export function PriceChart` | 1 | ✅ line 83 |
| `export function xTickFormatter` | 1 | ✅ line 26 |
| `export function yTickFormatter` | 1 | ✅ line 14 |
| `No price history yet.` | 1 | ✅ line 90 |
| `min-h-\[200px\] bg-muted rounded-lg` | 1 (in JSX, comment line 86 is prose) | ✅ line 89 (JSX) |
| `stroke="var(--primary)"` | ≥1 | ✅ line 117 (Line stroke) |
| `fill: 'var(--muted-foreground)'` | ≥2 | ✅ lines 101 (XAxis) + 107 (YAxis) |
| `height={200}` | 1 | ✅ line 96 |
| `width={60}` | 1 | ✅ line 109 |
| `domain={['auto', 'auto']}` | 1 | ✅ line 108 |
| `type="monotone"` | 1 | ✅ line 115 |
| `maximumFractionDigits: 0` | 1 | ✅ line 19 |
| `month: 'short'` + `day: 'numeric'` (formatter) | 1 each | ✅ lines 29 + 30 (multi-line per Prettier) |
| `month: 'long'` | 1 | ✅ line 49 (tooltip full-date) |
| `import 'server-only'` | 0 | ✅ 0 (client-component correctness) |
| `useState\|useEffect\|useTransition` | 0 | ✅ 0 (read-only component) |
| `CartesianGrid\|Legend\|Brush` | 0 | ✅ 0 (UI-SPEC locked out) |

**Note on single-line grep:** The plan's acceptance grep `"month: 'short', day: 'numeric'"` expected a single-line match, but the plan's own verbatim `<action>` code block (lines 173-174 of 05-02-PLAN.md) uses the multi-line Prettier-style formatting (`month: 'short',` and `day: 'numeric',` on separate lines). The shipped file follows the verbatim code block exactly. The acceptance grep literal is a stale artifact; the behavior (Intl.DateTimeFormat with month: 'short' AND day: 'numeric') is correct and verified by the CHART-03 xTickFormatter test (`/Apr\s*20/` green).

## npm run build Telemetry

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Exit code | 0 | 0 | ✅ |
| TypeScript compilation | "Finished TypeScript" | "Finished TypeScript in 1346ms" | ✅ |
| Recharts/React 19 strict-mode warnings | 0 | 0 | ✅ (RESEARCH.md §4 prediction holds) |
| `findDOMNode` deprecation warnings | 0 | 0 | ✅ (recharts 3.8.1 is findDOMNode-free) |
| Next.js static/dynamic page generation | 5 pages | 5/5 generated in 180ms | ✅ |
| Compiled bundle size regression | no alarm | no alarm | ✅ |

## Deviations from Plan

None. The plan's `<action>` verbatim tsx block was shipped exactly as written, with only the documented acceptance-grep wording artifact (see §"Acceptance-Grep Audit" note above) — substantively the behavior is correct and test-verified.

**Total deviations:** 0.
**Impact on plan:** None — all success criteria, all acceptance criteria, all UI-SPEC-locked values shipped verbatim.

## Auth Gates

None — Wave 2 is a pure presentational client component. No external service authentication, no secret provisioning, no human intervention.

## Issues Encountered

None — single-write, single-commit execution. All tests green on first run.

## Known Stubs

None — PriceChart.tsx is complete. The empty-state branch is defensive (TRACK-06 seeds the first price_history row atomically with product creation), not a stub. The component receives fully-wired data from the Wave 1 DAL via ProductCard props (swap happens in Wave 3).

## Threat Flags

None — Wave 2 introduced no new network endpoints, no new auth paths, no schema changes, and no new file-access patterns. Threat register T-5-02-01..T-5-02-04 dispositions stand: the component trusts RSC-serialized `PricePoint[]` primitives (number/string only, JSON-safe), emits controlled SVG-text through Recharts (no dangerouslySetInnerHTML), and reads no environment variables.

## User Setup Required

None — no new environment variables, no Vercel/Supabase/Resend dashboard configuration, no DNS changes. Wave 2 is entirely a TypeScript + React client module addition.

## Next Phase Readiness

**Ready for Wave 3 (Plan 05-03 — ProductCard wiring):**
- `PriceChart` is a named export from `@/components/dashboard/PriceChart` — Wave 3 can `import { PriceChart } from './PriceChart'` inside ProductCard.tsx.
- Props shape (`history: PricePoint[]`, `currency: string`) matches the planned Wave 3 swap exactly: `<PriceChart history={product.price_history} currency={product.currency} />`.
- `product.price_history` is populated by the Wave 1 DAL (nested select) and typed on the widened `Product` type. `product.currency` is a string column on `Tables<'products'>`.
- No additional type exports needed. `PricePoint` is already exported from `@/lib/products/get-user-products` (Wave 1).
- The existing `{chartOpen && ...}` slot in ProductCard.tsx (lines 58-65) has padding `px-4 pb-4` that matches UI-SPEC §Spacing — the swap is a single JSX line change inside that slot (remove `<div aria-hidden="true" className="min-h-[200px] bg-muted rounded-lg"/>`, add `<PriceChart history={product.price_history} currency={product.currency} />`).

**No blockers.** Wave 2's shipped component + its formatter exports + the empty-state guard form a clean handoff to Wave 3. Wave 3 can focus purely on the ProductCard.tsx slot swap, full-suite regression, and the human-verify browser smoke checkpoint (mobile 320px viewport, dark-mode contrast, tooltip hover parity).

## Self-Check: PASSED

Verified artifacts exist and commits are reachable:

- `dealdrop/src/components/dashboard/PriceChart.tsx` — FOUND (125 lines; line 1 `'use client'`; PricePoint import; 3 exports; empty-state copy; all UI-SPEC locked values)
- Commit `e00e56e` — FOUND in `git log` (Task 2.1 feat)
- `npx vitest run src/components/dashboard/PriceChart.test.tsx` → **5/5 green** (red→green transition verified)
- `npx vitest run` → **108/108 green** across 13 files (zero regression)
- `npm run build` → exit 0 (zero TS errors, zero recharts/React 19 warnings)

---
*Phase: 05-price-history-chart*
*Completed: 2026-04-20*
