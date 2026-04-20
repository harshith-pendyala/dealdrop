# Phase 5: Price History Chart - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 05-price-history-chart
**Areas discussed:** Data loading strategy

---

## Gray Area Selection

**Candidate gray areas presented:**

| Option | Description | Selected |
|--------|-------------|----------|
| Data loading strategy | Eager vs lazy fetch of price_history; impacts TTI, network cost, perceived toggle speed. | ✓ |
| Sparse data handling | 1-point / 2-point / flat-stretch UX. | |
| Chart look & formatting | Line style, color, grid, tooltip, axis formats. | |
| Recharts version + React 19 strict | Version pin, strict-mode compat, SSR guard. | |

**User's choice:** Only "Data loading strategy" — remaining areas left to Claude's Discretion.
**Notes:** User explicitly chose "I'm ready for context" at the end-of-discussion prompt; did not want to explore the other three areas.

---

## Data loading strategy

### Q1 — Eager or lazy fetch of price history on the dashboard?

| Option | Description | Selected |
|--------|-------------|----------|
| Eager — pre-load with products (Recommended) | One server-side query (Supabase nested select) when dashboard renders; toggle is instant, zero extra round-trip. Trivial payload at portfolio scale. | ✓ |
| Lazy — fetch on first Show Chart click | Fire Server Action / client fetch on first toggle; smaller initial payload but adds a skeleton to the toggle. | |
| Lazy with prefetch on hover | Default lazy + hover prefetch; no hover on mobile so falls back to lazy on touch. | |

**User's choice:** Eager — pre-load with products.
**Notes:** Data volume at portfolio bar is negligible; matches the "works end-to-end, feels instant" bar.

### Q2 — How should the server fetch the eager price_history alongside products?

| Option | Description | Selected |
|--------|-------------|----------|
| Single Supabase nested select (Recommended) | Extend getUserProducts: `from('products').select('*, price_history(price, currency, checked_at)')`. One round-trip, RLS ownership-chain applies cleanly. | ✓ |
| Separate getPriceHistory(productId) DAL | Keep getUserProducts unchanged; add parallel DAL returning Map<productId, PricePoint[]>. Two round-trips in parallel. | |
| RPC / Postgres function | Composite shape via a server function; overkill for a straight nested select. | |

**User's choice:** Single Supabase nested select — extend the existing DAL.
**Notes:** No new file; Product type widens to carry `price_history: PricePoint[]`.

### Q3 — How should chart history refresh when a product is added or removed?

| Option | Description | Selected |
|--------|-------------|----------|
| Rely on existing revalidatePath('/') (Recommended) | Phase 4 mutations already call revalidatePath('/'); dashboard re-renders and picks up the new initial point. Zero new code. | ✓ |
| Client-side cache with manual invalidation | Cache per product; invalidate on mutation callback. Saves a query per mutation; adds cache-key complexity. | |
| Realtime subscription to price_history | Supabase Realtime pushes new points as cron writes them; nice but overkill for daily cadence. | |

**User's choice:** Rely on existing revalidatePath('/').
**Notes:** Matches Phase 4 refresh strategy; no new mechanism introduced.

### Q4 — Where should the history be ordered / trimmed — DB query or client component?

| Option | Description | Selected |
|--------|-------------|----------|
| DB: order by checked_at asc, no limit (Recommended) | `.order('checked_at', { ascending: true })` inside the nested select. Client maps rows to {x,y} directly. Payload trivial at portfolio volume. | ✓ |
| DB: order asc + limit to last N days (90) | Cap payload; adds a magic number and query parameter for negligible savings. | |
| Client: send unordered, sort in the chart | Duplicates logic every render; wastes bytes. | |

**User's choice:** DB: order by checked_at asc, no limit.
**Notes:** Matches D-04 in CONTEXT.md.

---

## Claude's Discretion

User ended discussion at "I'm ready for context" and explicitly left the following areas as Claude's Discretion (captured in CONTEXT.md `<decisions>` → "Claude's Discretion"):

- Sparse / 1-point handling (CHART-04 behavioral specifics)
- Chart look & feel (line style, color, grid, tooltip)
- Axis formatting (date format, Y-axis currency/domain)
- Recharts version + React 19 strict compatibility (CHART-06 version pinning — researcher must verify at install time)
- Component placement & data flow (new `PriceChart.tsx` client component in `@/components/dashboard/`)
- Mobile responsiveness (ResponsiveContainer, no separate mobile layout)
- Tests (Vitest component tests: 1-point, many-points, empty)

## Deferred Ideas

- Realtime price updates via Supabase Realtime
- Chart zoom / brush / pan / annotations
- Multi-product comparison overlay
- Client-side history cache with manual invalidation
- Row-limit / retention policy on the nested select
- Alternate chart libraries (PROJECT.md locks Recharts)
