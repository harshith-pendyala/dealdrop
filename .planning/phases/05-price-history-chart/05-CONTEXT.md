# Phase 5: Price History Chart - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fill the toggleable chart slot already wired into [dealdrop/src/components/dashboard/ProductCard.tsx:58-65](dealdrop/src/components/dashboard/ProductCard.tsx#L58-L65) with a Recharts line chart of the product's `price_history`, with correctly formatted date/currency axes and graceful handling of sparse data (including the 1-point just-added case). Covers CHART-01 through CHART-06.

**In scope:**
- Client component `PriceChart` (Recharts line chart) rendered inside the existing `{chartOpen && ...}` slot in ProductCard
- Extension of the Phase 4 `getUserProducts` DAL to include `price_history(price, currency, checked_at)` via a single Supabase nested select
- Type-widening of `Product` (or a new exported type) so ProductCard receives price points alongside its row
- Install + pin the Recharts package and verify React 19 strict-mode compatibility
- X-axis formatted dates + Y-axis formatted currency (matching the existing `Intl.NumberFormat` pattern used in the card header price)
- Empty/sparse-data rendering (1 point, 2 points, long flat stretches) without hydration warnings

**Not in scope:**
- Show/Hide toggle button, `chartOpen` state, Ghost button styling — already shipped in Phase 4 (DASH-04)
- Writing new price_history rows (initial point on add is Phase 4 via `addProduct`; subsequent points are Phase 6 via the daily cron)
- Realtime/websocket updates of the chart — daily cadence; next-day reload covers it (deferred below)
- Multi-product comparison, zoom/pan, brushing, annotations — not in CHART requirements
- Loading skeleton for the chart slot itself — existing `min-h-[200px] bg-muted` placeholder doubles as the empty/loading state; polish lives in Phase 7
- Tracking-failed visual state on the chart — badge is already on the card (DASH-08); chart just shows what data exists

</domain>

<decisions>
## Implementation Decisions

### Data Loading Strategy

- **D-01: Eager pre-load of price_history alongside products.** The dashboard fetches each product with its history in a single server round-trip on render — not lazily on first Show Chart click. At portfolio scale (~dozens of products × up to ~365 daily rows each) the payload is trivial, and the toggle feels instant because the data is already in the card's props. Lazy loading was considered and rejected as overkill for this scale.

- **D-02: Single Supabase nested select — extend `getUserProducts`, don't add a parallel DAL.** Query shape: `from('products').select('*, price_history(price, currency, checked_at)').order('created_at', { ascending: false })`. Supabase's RLS ownership-chain policy on `price_history` (DB-06: `product_id IN (SELECT id FROM products WHERE user_id = auth.uid())`) cleanly applies to the nested select with no extra guards. The existing `Product = Tables<'products'>` type is widened (or replaced with an exported composite) to include `price_history: PricePoint[]`. No new file — the DAL stays in [dealdrop/src/lib/products/get-user-products.ts](dealdrop/src/lib/products/get-user-products.ts).

- **D-03: Refresh via the existing `revalidatePath('/')` from Phase 4 mutations.** `addProduct` and `removeProduct` already call `revalidatePath('/')` on success ([dealdrop/src/actions/products.ts:66,87](dealdrop/src/actions/products.ts#L66)). This re-renders the dashboard server component and re-fires the nested select, so a newly-added product's initial price point appears in its chart on the very next render with zero new code. No client-side cache, no Realtime subscription — both are out of scope for a daily-cadence portfolio demo.

- **D-04: DB-side ordering, no row limit.** Add `.order('checked_at', { ascending: true })` inside the nested select so Recharts receives chronological input and the client just maps rows to `{ x: checked_at, y: price }`. No `.limit(N)` — at a year of daily data × dozens of products the payload is ~hundreds of KB, well within a server-rendered page budget.

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner/researcher should use these defaults; surface as a deviation if any materially changes the plan or user-visible behavior.

- **Sparse / 1-point handling (CHART-04):** Render the line chart unconditionally but ensure Recharts doesn't crash on a single point. Standard approach: `<LineChart>` with `<Line dot>` renders a single dot at the point; a 2-point series draws a line. No special-casing unless empirical rendering shows an issue (hydration warning, NaN domain). If `price_history` is unexpectedly empty (shouldn't happen — TRACK-06 seeds the initial row atomically with the product insert), render the existing muted placeholder with copy `"No price history yet."` rather than a broken axis.

- **Chart look & feel:** `<LineChart>` with a single `<Line type="monotone" dataKey="price">` (smooth curve), thin stroke, single color tied to a CSS custom property (`--primary` or `--foreground` — planner picks; keep it theme-aware for light/dark mode already set up in Phase 1). Tooltip on hover shows formatted date + formatted currency. No grid lines by default (keeps the card slot visually quiet); optional faint horizontal grid if it improves readability. No legend (single series). No interactive zoom/brush. Height fills the slot (`min-h-[200px]` already in ProductCard).

- **Axis formatting:**
  - **X-axis:** short-date formatter (`"MMM d"` e.g. `"Apr 20"`) using `Intl.DateTimeFormat` — no year because price histories stay within a portfolio-demo window. Let Recharts auto-select ticks; on a narrow mobile card (grid col ~150px wide) this may reduce to 2-3 tick labels, which is fine.
  - **Y-axis:** formatted currency values using the same `Intl.NumberFormat(undefined, { style: 'currency', currency: <code> })` pattern as the ProductCard price header, but with `maximumFractionDigits: 0` on the axis tick formatter to keep labels compact. Tooltip uses the full-precision formatter. Domain: `['auto', 'auto']` — let Recharts pick padded bounds; do NOT hard-code zero-based so small drops stay visible.
  - **Currency is per-product, not global:** each chart formats with its row's `currency` code (products.currency). Price history rows carry their own currency column too; assume equal per product (the daily cron writes the scraped `currency_code` each time).

- **Recharts version + React 19 strict compatibility (CHART-06):** Use the latest Recharts major that supports React 19 as a peer dependency — **planner/researcher must verify this at install time before pinning.** Known risk: older 2.x releases may emit `findDOMNode` warnings under React 19 strict mode. If the latest 3.x release is stable, pin to it; otherwise pin to the most recent 2.x release that is React 19-compatible and document the version in 05-RESEARCH.md. `PriceChart` is a client component (`'use client'` at top) and uses `<ResponsiveContainer width="100%" height="100%">` inside a parent with a fixed height — the ProductCard slot already has `min-h-[200px]`. No SSR rendering of Recharts (Next.js App Router + `'use client'` handles this; no `dynamic({ ssr: false })` shim needed unless research surfaces one).

- **Component placement & data flow:**
  - New client component `dealdrop/src/components/dashboard/PriceChart.tsx` — props: `{ history: PricePoint[]; currency: string }`.
  - ProductCard passes `product.price_history` and `product.currency` to `<PriceChart>` inside the existing `{chartOpen && ...}` block, replacing the placeholder `<div className="min-h-[200px] bg-muted rounded-lg">`.
  - `PricePoint` type defined alongside the extended `Product` type in `get-user-products.ts` (re-exported) so ProductCard and PriceChart share the same shape.

- **Mobile responsiveness (CHART-05):** `<ResponsiveContainer>` handles width. On a 320px viewport the card is one per row (grid-cols-1), giving the chart ~290px of width × 200px height — plenty for a readable line. No separate mobile layout.

- **Tests:** Vitest component tests for `PriceChart` — render with 1 point (single dot, no crash), render with many points (line drawn), render with empty array (placeholder shown). Match the Phase 4 component-testing pattern established in `ProductCard.test.tsx`. No Recharts-internal snapshot tests — treat Recharts as a black box.

### Folded Todos

(none — cross-reference check found no pending todos matching Phase 5 scope)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- [.planning/REQUIREMENTS.md](.planning/REQUIREMENTS.md) §"Price History Chart (CHART)" — CHART-01 through CHART-06 acceptance criteria
- [.planning/ROADMAP.md](.planning/ROADMAP.md) §"Phase 5: Price History Chart" — goal + 4 success criteria
- [.planning/PROJECT.md](.planning/PROJECT.md) §Constraints — Recharts is the locked charting library; Portfolio/demo quality bar

### Prior Phase Context (locked decisions this phase consumes)
- [.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md](.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md) §"Claude's Discretion → Product card actions layout" — Show Chart toggle button already shipped; Phase 5 only fills the slot body
- [.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md](.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md) §"Claude's Discretion → Card density & image" — `Intl.NumberFormat(undefined, { style: 'currency', currency: <code> })` is the locked currency-formatting pattern to reuse
- [.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md](.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md) §"Claude's Discretion → Revalidation strategy" — `revalidatePath('/')` after mutations propagates to the chart automatically (no new refresh mechanism needed)
- [.planning/phases/01-foundation-database/01-CONTEXT.md](.planning/phases/01-foundation-database/01-CONTEXT.md) — DB schema + RLS ownership-chain on `price_history` (confirms nested-select RLS behavior for D-02)

### Existing Code Contracts (reuse verbatim / extend)
- [dealdrop/src/components/dashboard/ProductCard.tsx](dealdrop/src/components/dashboard/ProductCard.tsx) §L58-65 — existing `{chartOpen && <div className="min-h-[200px] bg-muted rounded-lg" />}` slot Phase 5 replaces with `<PriceChart>`
- [dealdrop/src/components/dashboard/ProductCard.tsx](dealdrop/src/components/dashboard/ProductCard.tsx) §L70-76 — `formatPrice(amount, code)` pattern to mirror in chart tooltip (full precision) and adapt for Y-axis ticks (`maximumFractionDigits: 0`)
- [dealdrop/src/lib/products/get-user-products.ts](dealdrop/src/lib/products/get-user-products.ts) — DAL to **extend** with nested `price_history` select + chronological ordering; re-export widened `Product` + new `PricePoint` type
- [dealdrop/src/lib/supabase/server.ts](dealdrop/src/lib/supabase/server.ts) — `createClient()` already used by DAL; no changes
- [dealdrop/src/types/database.ts](dealdrop/src/types/database.ts) — `Tables<'products'>` and `Tables<'price_history'>` generated types to compose the extended row shape

### Database Schema (no Phase 5 schema work)
- `products` and `price_history` tables locked in Phase 1 (FND/DB requirements); `price_history` has CASCADE DELETE on `product_id` and RLS ownership-chain policy DB-06 — nested select inherits this policy correctly
- Initial `price_history` row inserted by Phase 4 `addProduct` Server Action (TRACK-06); subsequent rows by Phase 6 cron — Phase 5 only reads

### External Dependencies (need install in this phase)
- `recharts` — pin to the latest version verified React 19-compatible at install time (see Claude's Discretion above); documented in 05-RESEARCH.md
- No Shadcn primitives needed — PriceChart is a bespoke client component, not a primitive wrapper

### Runtime Constraints
- [dealdrop/CLAUDE.md](dealdrop/CLAUDE.md) / [dealdrop/AGENTS.md](dealdrop/AGENTS.md) — Next.js 16 breaking changes warning: consult `node_modules/next/dist/docs/` for any ambiguous App Router / client-component / data-fetching behavior before implementing
- React 19.2.4 + Next.js 16.2.4 + TypeScript strict + Tailwind v4 — existing stack; no migration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProductCard chart slot + `chartOpen` state** — already wired in Phase 4; Phase 5 swaps the inner `<div>` placeholder for `<PriceChart />` and passes two props (history + currency).
- **`formatPrice(amount, code)` helper** — lives inline in `ProductCard.tsx`; same pattern can be lifted or duplicated in `PriceChart` for tooltip formatting. If lifted, a shared util belongs in `@/lib/products/format.ts` (small, client-safe).
- **`getUserProducts()` DAL** — extend, don't replace. Server-only, RLS-scoped, returns an array the dashboard server component already consumes.
- **Vitest + @testing-library/react component-test infra** — Phase 4 established this in `ProductCard.test.tsx`, `EmptyState.test.tsx`, etc. Phase 5 `PriceChart.test.tsx` follows the same pattern.

### Established Patterns
- **Server-only DAL (`import 'server-only'` on line 1) with RLS trust** — policies enforce per-user scoping; DAL never passes `user_id` manually. Nested selects inherit RLS through the ownership chain (DB-06).
- **Client components stay inside already-client parents** — ProductCard is `'use client'`; nesting PriceChart there adds no new boundary or `dynamic()` import.
- **Discriminated unions for failure, typed row shapes for data** — the composite `Product & { price_history: PricePoint[] }` keeps strict-mode compile-time guarantees.
- **`revalidatePath('/')` is the app's single invalidation knob** — after mutations, the whole dashboard re-renders and re-queries; don't introduce tag-based revalidation for a single-page app.
- **Currency formatting uses `Intl.NumberFormat(undefined, { style: 'currency', currency: <code> })`** — locale-from-browser, code-from-data; reused exactly in the chart tooltip and adapted (tick formatter) for the Y-axis.

### Integration Points
- **`DashboardShell` / `ProductGrid`** — already render `<ProductCard product={...} />`; no signature changes needed if the widened row type flows through from `getUserProducts` → `DashboardShell` → `ProductGrid` → `ProductCard` props.
- **`ProductCard` inner slot at L58-65** — single edit site for the swap: import `PriceChart`, replace the `<div>`.
- **No API routes, no Route Handlers** — all data flows via the Server Component render pass.

</code_context>

<specifics>
## Specific Ideas

- **Toggle button affordance is already done** — Phase 4 ships the Ghost "Show Chart"/"Hide Chart" button with chevron-up/down. Phase 5 must not re-wire the toggle; only render the chart body inside the existing `{chartOpen && ...}` block.
- **Empty-slot placeholder copy:** if `price_history` is somehow empty (defensive — shouldn't happen), render the muted slot with text "No price history yet." rather than an empty chart. Matches the calm, minimal voice from Phase 2's Hero and Phase 4's empty state.
- **Tooltip formatting parity:** the hover tooltip shows full-precision currency (`formatPrice(point.price, currency)` — same call the card header uses) + formatted date. Y-axis ticks use the same formatter with `maximumFractionDigits: 0` so labels don't crowd on a narrow mobile card.
- **Single-point render:** Recharts draws a dot at a single `<Line>` point by default — no special-casing needed. Verify with a component test asserting the chart renders without throwing when given `[{ price: X, checked_at: T, currency: C }]`.
- **Dark mode readiness:** chart stroke color references a theme CSS custom property (e.g., `var(--primary)` or `var(--foreground)`) so the line stays legible in both light and dark modes already wired up in Phase 1.

</specifics>

<deferred>
## Deferred Ideas

- **Realtime price updates via Supabase Realtime subscription** — nice, but out of scope for a daily-cadence product. User revisits the dashboard the next day and sees the fresh data via the standard server render.
- **Chart zoom / brush / pan** — not in CHART requirements; would add a UI surface not covered by the portfolio bar.
- **Multi-product chart comparison overlay** — "see price drops across all my products on one chart" is a v2 idea, would need a new page/surface.
- **Annotations on the chart** (e.g., highlight the day a price dropped below the first-seen value) — related to the "lowest-price-ever badge" in REQUIREMENTS.md v2 section. Defer with it.
- **Client-side history caching with manual invalidation** — rejected above (D-03) as over-engineering at daily cadence.
- **Row limit / retention policy on the nested select** — rejected above (D-04) as premature at portfolio volume; PROJECT.md Key Decisions already lists "Keep price history forever for v1".
- **Custom chart component library (e.g., visx, Chart.js)** — PROJECT.md locks Recharts.

### Reviewed Todos (not folded)
(none — cross-reference check found no pending todos matching Phase 5 scope)

</deferred>

---

*Phase: 05-price-history-chart*
*Context gathered: 2026-04-20*
