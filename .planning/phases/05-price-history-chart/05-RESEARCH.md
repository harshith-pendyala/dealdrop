# Phase 5: Price History Chart - Research

**Researched:** 2026-04-20
**Domain:** Recharts 3.x + Supabase nested-select + React 19 / Next.js 16 App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Eager pre-load — price_history fetched alongside products in a single server round-trip on dashboard render. No lazy loading.
- **D-02:** Single Supabase nested select — extend `getUserProducts`, no parallel DAL. Query: `from('products').select('*, price_history(price, currency, checked_at)').order('created_at', { ascending: false })` with nested `.order('checked_at', { ascending: true, referencedTable: 'price_history' })`. No extra guards needed beyond RLS.
- **D-03:** Refresh via existing `revalidatePath('/')` from Phase 4 mutations. Zero new code for refresh.
- **D-04:** DB-side ordering via nested `.order('checked_at', { ascending: true, referencedTable: 'price_history' })`. No `.limit(N)`.

### Claude's Discretion
- Sparse/1-point handling: render unconditionally; empty array guard returns "No price history yet." muted placeholder.
- Chart look & feel: `<LineChart>` with single `<Line type="monotone">`, stroke `var(--primary)`, no grid lines, no legend, no zoom/brush. Height 200px via `<ResponsiveContainer height={200}>`.
- Axis formatting: X = `"MMM d"` via `Intl.DateTimeFormat`; Y = `Intl.NumberFormat` with `maximumFractionDigits: 0`; tooltip uses full-precision formatter.
- Recharts version: pin to latest React 19-compatible major — verified below as 3.8.1.
- Component placement: `dealdrop/src/components/dashboard/PriceChart.tsx`, props `{ history: PricePoint[]; currency: string }`.
- Mobile: `<ResponsiveContainer>` handles width; no separate mobile layout.
- Tests: Vitest component tests for 1-point, many-point, empty-array cases.

### Deferred Ideas (OUT OF SCOPE)
- Realtime Supabase subscription for chart updates
- Chart zoom / brush / pan
- Multi-product chart comparison overlay
- Annotations on chart (lowest-price-ever highlights)
- Client-side history caching with manual invalidation
- Row limit / retention policy on nested select
- Custom chart component library (visx, Chart.js) — Recharts is locked
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | Client component `PriceChart` uses Recharts to render a line chart of price over time | Recharts 3.8.1 verified React 19-compatible; `LineChart` + `Line` components confirmed available |
| CHART-02 | Chart reads from `price_history` rows scoped to the product via RLS | Nested select with `referencedTable` ordering supported by @supabase/postgrest-js 2.103.3; RLS DB-06 applies automatically to nested rows |
| CHART-03 | X-axis shows formatted dates, Y-axis shows formatted currency values | `tickFormatter` + `Intl.*` pattern documented below with exact API |
| CHART-04 | Chart has at least one data point (seeded on product creation via TRACK-06) | Single-point behavior verified: recharts renders a dot; empty-array guard documented |
| CHART-05 | Chart renders correctly on mobile and desktop viewports | `<ResponsiveContainer width="100%" height={200}>` + `width={60}` Y-axis confirmed pattern |
| CHART-06 | Recharts version compatible with React 19 strict mode | Recharts 3.8.1 installed with zero peer-dep warnings; zero `findDOMNode` usages confirmed by grep |
</phase_requirements>

---

## Summary

Recharts 3.8.1 is the current stable release (as of 2026-04-20) and explicitly declares React 19 as a supported peer. A live `npm install recharts@3.8.1` in the project directory produced zero peer-dependency warnings and zero `findDOMNode` usages were found in the installed package. The `ResponsiveContainer` component uses `ResizeObserver` with a `typeof ResizeObserver === 'undefined'` guard that degrades gracefully to null render — meaning jsdom tests require a `ResizeObserver` polyfill (or must use fixed-dimension `<LineChart width={N} height={N}>` directly). The `@supabase/postgrest-js` client (v2.103.3) supports `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` for nested ordering within a single `.select('*, price_history(price, currency, checked_at)')` call. RLS policy DB-06 applies automatically to nested rows because the ownership chain (`product_id IN (SELECT id FROM products WHERE user_id = auth.uid())`) is evaluated server-side by PostgREST. Supabase TypeScript types do not auto-infer the nested array shape from the select string; a manual composite type (`Tables<'products'> & { price_history: PricePoint[] }`) is required and is already prescribed in CONTEXT.md.

**Primary recommendation:** Install `recharts@3.8.1`, implement `PriceChart` as a `'use client'` component using `<LineChart width>` / `<LineChart height>` fixed props in tests (bypass `ResizeObserver`), and mock `ResponsiveContainer` or polyfill `ResizeObserver` in the jsdom test environment.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch price_history rows | API / Backend (Server Component DAL) | — | `getUserProducts` is `server-only`; nested select executes at render time inside a React Server Component |
| Chart rendering | Browser / Client | — | Recharts requires DOM measurements; `PriceChart` is `'use client'`; all chart computation runs in the browser |
| Type-widening (PricePoint) | API / Backend (DAL boundary) | — | `PricePoint` type defined at the DAL layer and re-exported so both server and client share the same shape |
| Axis formatting (Intl.*) | Browser / Client | — | `Intl.NumberFormat` / `Intl.DateTimeFormat` with `undefined` locale resolve to the browser locale at render time |
| Empty-state guard | Browser / Client | — | Defensive check in `PriceChart` component before reaching Recharts |
| RLS enforcement | Database / Storage | — | PostgREST policy DB-06 filters nested rows server-side; no application code needed |

---

## 1. Dependencies to Install

### Verified Package

| Package | Version Installed | Peer Deps Met | Install Warnings | Verdict |
|---------|------------------|---------------|-----------------|---------|
| `recharts` | 3.8.1 | react `^19.0.0` ✓, react-dom `^19.0.0` ✓, react-is `^19.0.0` ✓ | **0 warnings** | Pin to 3.8.1 |

[VERIFIED: npm registry + live `npm install recharts@3.8.1` in project directory]

`react-is` is a transitive peer dependency required by Recharts. Check if it is already installed:

```bash
cd dealdrop && ls node_modules/react-is 2>/dev/null && cat node_modules/react-is/package.json | grep '"version"'
```

If absent, install alongside recharts:

```bash
cd dealdrop && npm install recharts@3.8.1 react-is@19
```

**Note:** `react-is` is commonly a transitive dep from other libraries. The dry-run showed no warning about it being missing — it is likely already present via another dependency. Verify before deciding to install explicitly.

### Additional transitive dependencies installed automatically
Recharts 3.8.1 brings: `@reduxjs/toolkit`, `react-redux`, `immer`, `victory-vendor`, `d3-*` utilities (d3-shape, d3-scale, d3-array, etc.), `es-toolkit`, `eventemitter3`, `decimal.js-light`. These are standard production dependencies; no action needed beyond the `npm install recharts@3.8.1` command.

### Full install command (confirmed zero warnings)
```bash
cd dealdrop && npm install recharts@3.8.1
```

---

## 2. Supabase DAL Extension

### Final Query Shape

```typescript
// dealdrop/src/lib/products/get-user-products.ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type PricePoint = {
  price: number
  currency: string
  checked_at: string
}

export type Product = Tables<'products'> & {
  price_history: PricePoint[]
}

export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, price_history(price, currency, checked_at)')
    .order('created_at', { ascending: false })
    .order('checked_at', { ascending: true, referencedTable: 'price_history' })
  if (error) {
    console.error('getUserProducts: select failed', { err: error })
    return []
  }
  return (data ?? []) as Product[]
}
```

### Type-Widening Strategy

Supabase's TypeScript client does NOT auto-infer nested array shapes from the select string. The generated `Tables<'products'>` type contains only the `products.Row` columns. The manual cast `as Product[]` is necessary and safe because:
1. The select string `*, price_history(price, currency, checked_at)` is a PostgREST embedded resource query
2. At runtime, `data` will have the `price_history` array; TypeScript just can't infer it from the string literal without the newer Supabase type-gen with `?select=` param support
3. The `PricePoint` type mirrors `Tables<'price_history'>` for the three selected columns exactly (`price: number`, `currency: string`, `checked_at: string`) — confirmed against `database.ts` generated types

[VERIFIED: grep of `@supabase/postgrest-js/dist/index.d.cts` + `database.ts` column types]

### Nested Order Syntax

The `order` method signature (from `@supabase/postgrest-js/dist/index.d.cts` line 1098-1102):

```typescript
order(column: string, options?: {
  ascending?: boolean;
  nullsFirst?: boolean;
  referencedTable?: string;    // <-- use this for nested ordering
}): this;
```

The chained `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` is the current (non-deprecated) syntax. `foreignTable` is deprecated in favor of `referencedTable`. [VERIFIED: postgrest-js dist/index.cjs line 756-757 implementation]

### RLS Ownership Chain (DB-06)

The RLS policy on `price_history` is:
```sql
USING (product_id IN (SELECT id FROM products WHERE user_id = auth.uid()))
```

PostgREST evaluates this policy when resolving the nested `price_history(...)` embedded resource. The user's session JWT is passed through to PostgREST, so `auth.uid()` resolves correctly. No application-level guard (`.eq('user_id', userId)` on the nested select) is needed. [VERIFIED: CONTEXT.md D-02 + Phase 1 DB-06 policy definition in REQUIREMENTS.md]

---

## 3. Recharts Implementation Patterns

### React 19 Strict Mode: findDOMNode

[VERIFIED: live grep of `node_modules/recharts/lib/` and `node_modules/recharts/es6/`]

**Result: 0 files containing `findDOMNode`** in Recharts 3.8.1. The library was refactored away from `findDOMNode` in the 3.x series. No strict-mode `findDOMNode` warnings will fire under React 19.2.4.

### Axis Formatters

```typescript
// Y-axis tick formatter — compact (no decimals) for narrow mobile cards
const yTickFormatter = (value: number) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Math.round(value)}`
  }
}

// X-axis tick formatter — "MMM d" e.g. "Apr 20"
const xTickFormatter = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}
```

**Notes:**
- Both use `undefined` locale to resolve to the browser's locale. On the server (SSR render), `undefined` defaults to the server's locale — but `PriceChart` is `'use client'` so it never SSR-renders (see Section 5).
- The `try/catch` on `Intl.NumberFormat` mirrors the existing `formatPrice` helper in `ProductCard.tsx` (line 70-75). Reuse the same defensive pattern.

### Custom Tooltip Component

```typescript
// Tooltip sub-component — full precision currency + full date
function PriceTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  currency: string
}) {
  if (!active || !payload?.length) return null
  const price = payload[0].value
  const formattedPrice = (() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(price)
    } catch {
      return `${currency} ${price.toFixed(2)}`
    }
  })()
  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(label ?? ''))
    } catch {
      return label ?? ''
    }
  })()
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 12px',
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{formattedDate}</p>
      <p style={{ fontSize: 14, margin: 0 }}>{formattedPrice}</p>
    </div>
  )
}
```

**Note on tooltip `content` prop:** `<Tooltip content={<PriceTooltip currency={currency} />}>` passes a React element; Recharts injects `active`, `payload`, and `label` props automatically. [ASSUMED — based on Recharts 2.x API convention; the 3.x API is compatible but the `content` prop type annotation changed. Verify by running tests.]

### Single-Point and Empty-Array Handling

**Empty array (0 rows):** The defensive guard renders before Recharts ever initializes:

```typescript
if (history.length === 0) {
  return (
    <div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center">
      <p className="text-sm text-muted-foreground">No price history yet.</p>
    </div>
  )
}
```

**Single point (1 row):** Recharts 3.8.1 `<Line>` with `type="monotone"` renders a single SVG dot when there is one data point and `dot={true}`. The `domain={['auto', 'auto']}` Y-axis will set min === max for a single value, which Recharts handles by adding padding (it does NOT produce NaN). [ASSUMED — based on recharts behavior described in issues; the component test asserting no-crash is the verification gate for this claim.]

**UI-SPEC.md single-point pattern (locked):**
```tsx
<Line
  type="monotone"
  dataKey="price"
  stroke="var(--primary)"
  strokeWidth={2}
  dot={history.length === 1}      // dot only for single-point; hover activeDot otherwise
  activeDot={{ r: 4, fill: 'var(--primary)' }}
/>
```

### Full PriceChart Component Structure

```tsx
// dealdrop/src/components/dashboard/PriceChart.tsx
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

export function PriceChart({ history, currency }: Props) {
  if (history.length === 0) {
    return (
      <div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No price history yet.</p>
      </div>
    )
  }

  const xTickFormatter = (value: string) => { /* see above */ }
  const yTickFormatter = (value: number) => { /* see above */ }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="checked_at"
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={yTickFormatter}
          tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }}
          domain={['auto', 'auto']}
          width={60}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<PriceTooltip currency={currency} />} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={history.length === 1}
          activeDot={{ r: 4, fill: 'var(--primary)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## 4. React 19 Strict Mode Compatibility Notes

### findDOMNode
[VERIFIED: grep of recharts 3.8.1 installed files]

Recharts 3.x eliminated all `findDOMNode` calls. Zero warnings will fire under React 19 strict mode's `findDOMNode` deprecation check.

### Ref Forwarding
Recharts 3.x uses `React.forwardRef` and `useImperativeHandle` for `ResponsiveContainer` (confirmed in `ResponsiveContainer.js` line 51). This is the React 19-compatible pattern. No legacy `string refs` or `callback refs` that React 19 strict mode would warn about.

### useEffect Double-Invocation
React 19 strict mode double-invokes `useEffect` in development. Recharts' `ResizeObserver` setup (lines 96-129 of `ResponsiveContainer.js`) correctly returns a cleanup function `() => observer.disconnect()` — so double-invocation in strict mode is safe: the observer is set up, torn down, and set up again correctly.

### `react-is` Peer Dependency
Recharts requires `react-is ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`. React 19's `react-is` package satisfies this. No action needed if `react-is@19` is already in the dep tree (verify with `ls node_modules/react-is`).

### Verdict
**Recharts 3.8.1 is React 19 strict-mode clean.** No additional mitigations needed.

---

## 5. Next.js 16 Hydration Considerations

### `'use client'` Placement

`PriceChart` must have `'use client'` at the top of the file. `ProductCard` already has `'use client'` (confirmed at line 1 of `ProductCard.tsx`). Nesting a client component inside an existing client component does NOT require a new `'use client'` directive — the directive is already in scope from the parent. However, since `PriceChart` is a separate file, it still needs its own `'use client'` directive for the module system to mark it correctly when imported in other contexts. [VERIFIED: ProductCard.tsx line 1; Next.js App Router docs pattern]

### No `dynamic({ ssr: false })` Needed

`ProductCard` is already a client component. Any child component it renders — including `PriceChart` — is rendered only on the client side during the React hydration pass. Recharts never executes on the Next.js server renderer for client components. Therefore:
- No SSR render of Recharts occurs
- No `dynamic(() => import('./PriceChart'), { ssr: false })` shim is needed
- No `window is not defined` or DOM API errors will occur at render time

[VERIFIED: ProductCard.tsx `'use client'` at line 1 + CONTEXT.md §"Component placement & data flow"]

### `Intl.*` Locale Determinism

Both `Intl.NumberFormat(undefined, ...)` and `Intl.DateTimeFormat(undefined, ...)` use `undefined` as the locale, which resolves to the runtime locale:
- **On the server:** resolves to the Node.js process locale (typically `en-US` or the server's OS locale)
- **On the client (browser):** resolves to the browser's `navigator.language`

**This is not a hydration risk** for `PriceChart` because the component is `'use client'` and will never be SSR-rendered as part of the initial HTML payload. The `Intl.*` formatters only run in the browser. No server/client mismatch is possible.

**Axis tick labels** are rendered by Recharts inside a `<svg>` element — these are not part of the HTML sent from the server, so there is no hydration mismatch vector.

### Server Component Integration

The data prop (`product.price_history`) is populated server-side in `getUserProducts()` (a `server-only` DAL), serialized as JSON, and passed as a prop through `ProductGrid` → `ProductCard` → `PriceChart`. JSON serialization is safe: `PricePoint` fields are all primitives (`number`, `string`). No Date objects, no circular references.

---

## 6. Vitest Test Infrastructure for Recharts

### The Problem: ResizeObserver in jsdom

`ResponsiveContainer` registers a `ResizeObserver` in a `useEffect`. The implementation at line 97 is:

```javascript
if (containerRef.current == null || typeof ResizeObserver === 'undefined') {
  return noop;
}
```

When `ResizeObserver` is undefined (jsdom does not include it), the observer setup is skipped. The container dimensions remain at the `initialDimension` default: `{ width: -1, height: -1 }`.

Then at line 37-44 of `ResponsiveContainer.js`, `isAcceptableSize` checks:
```javascript
if (!isAcceptableSize(size)) {
  return null;  // renders NOTHING
}
```

**Consequence:** In jsdom without a ResizeObserver polyfill, `<ResponsiveContainer>` renders `null` — meaning no `<LineChart>`, no `<Line>`, no SVG. Tests asserting on chart content will fail.

### Two Valid Test Strategies

#### Strategy A (Recommended for PriceChart.test.tsx): Mock ResponsiveContainer

Replace `<ResponsiveContainer>` with a fixed-dimension pass-through in tests. This is the simplest approach that lets the inner `<LineChart>` render fully.

```typescript
// At top of PriceChart.test.tsx — before importing PriceChart
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 300, height: 200 }}>{children}</div>
    ),
  }
})
```

This lets all other Recharts components render normally while bypassing the `ResizeObserver` requirement.

#### Strategy B: Polyfill ResizeObserver in vitest setup

If the project needs ResizeObserver for other tests too, add a polyfill to `vitest.config.ts`:

```typescript
// In vitest.config.ts, add a setup file:
// setupFiles: ['./src/test-utils/vitest.setup.ts']

// In src/test-utils/vitest.setup.ts:
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
```

However, this polyfill provides a no-op observer — `containerRef.current.getBoundingClientRect()` in jsdom returns `{width: 0, height: 0}`, which still fails `isAcceptableSize`. You would also need to mock `getBoundingClientRect` to return non-zero values.

**Recommendation:** Use Strategy A (mock `ResponsiveContainer`). It is simpler, doesn't require additional setup file changes, and tests the actual `PriceChart` rendering logic (axis formatters, line data, empty state) without fighting DOM measurement APIs.

### Existing Test Infrastructure Compatibility

The existing `vitest.config.ts` already has:
- `test.environment: 'node'` (global default)
- Per-file `// @vitest-environment jsdom` pragma (used in all component tests)
- `server-only` alias to `empty.js`
- `@/components/ui` → `./components/ui` alias
- `@` → `./src` alias

`PriceChart.test.tsx` must use `// @vitest-environment jsdom` and the `vi.mock('recharts', ...)` pattern for `ResponsiveContainer`. No changes to `vitest.config.ts` are needed.

### Existing `ProductCard.test.tsx` Pattern

`ProductCard.test.tsx` (confirmed at `dealdrop/src/components/dashboard/ProductCard.test.tsx`) uses:
- `// @vitest-environment jsdom` pragma
- `vi.mock('next/image', ...)` to stub heavy deps
- `vi.mock('./RemoveProductDialog', ...)` to stub dialog deps

`PriceChart.test.tsx` follows the same pattern with `vi.mock('recharts', ...)`.

### Phase 5 Test File: PriceChart.test.tsx

```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 300, height: 200 }}>{children}</div>
    ),
  }
})

import { PriceChart } from './PriceChart'
import type { PricePoint } from '@/lib/products/get-user-products'

afterEach(() => cleanup())

const makeHistory = (n: number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({
    price: 10 + i,
    currency: 'USD',
    checked_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  }))

describe('PriceChart', () => {
  it('CHART-04: renders empty-state copy when history is empty', () => {
    render(<PriceChart history={[]} currency="USD" />)
    expect(screen.getByText('No price history yet.')).toBeInTheDocument()
  })

  it('CHART-04: renders without crash when given 1 point', () => {
    render(<PriceChart history={makeHistory(1)} currency="USD" />)
    expect(screen.queryByText('No price history yet.')).not.toBeInTheDocument()
  })

  it('CHART-01: renders line chart container when history has many points', () => {
    render(<PriceChart history={makeHistory(10)} currency="USD" />)
    expect(screen.queryByText('No price history yet.')).not.toBeInTheDocument()
  })
})
```

**What is NOT tested by component tests:**
- Visual correctness of SVG path shape — treat Recharts as a black box
- Recharts snapshot tests — fragile and brittle
- Actual pixel dimensions — `ResponsiveContainer` is mocked

---

## 7. Validation Architecture

### Test Framework Summary

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `dealdrop/vitest.config.ts` (exists; no changes needed for Phase 5) |
| Quick run command | `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx` |
| Full suite command | `cd dealdrop && npx vitest run` |

### Phase 5 Success Criteria → Evidence Map

| Success Criterion (from ROADMAP §Phase 5) | Claim | Evidence Type | Automated Command | Exists? |
|-------------------------------------------|-------|---------------|-------------------|---------|
| SC-1: Clicking "Show Chart" reveals chart; clicking hides it | Toggle wiring unchanged from Phase 4 | Component test (inherited) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "Show Chart"` | ✅ (Phase 4 test file exists) |
| SC-2: X-axis shows formatted dates, Y-axis formatted currency | `xTickFormatter` / `yTickFormatter` produce non-empty strings | Component test (formatter unit test inside PriceChart.test.tsx, or inline) | `npx vitest run src/components/dashboard/PriceChart.test.tsx` | ❌ Wave 0 |
| SC-3: Single price point renders without crash | `PriceChart` with 1-point history renders + no throw | Component test | `npx vitest run src/components/dashboard/PriceChart.test.tsx -t "1 point"` | ❌ Wave 0 |
| SC-4: No hydration warnings / React 19 errors on mobile + desktop | `findDOMNode`-free + `'use client'` boundary correct | Build pass + manual | `cd dealdrop && npm run build` (zero TS/build errors) + manual browser check | ❌ Wave 0 (build test) |

### CHART Requirement → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-01 | `PriceChart` renders a Recharts `<LineChart>` | unit (component) | `npx vitest run src/components/dashboard/PriceChart.test.tsx` | ❌ Wave 0 |
| CHART-02 | Chart data comes from `price_history` via RLS-scoped nested select | unit (DAL action) | `npx vitest run src/lib/products/get-user-products.test.ts` | ❌ Wave 0 |
| CHART-03 | Axis formatters produce correct output | unit (component) | `npx vitest run src/components/dashboard/PriceChart.test.tsx -t "formatter"` | ❌ Wave 0 |
| CHART-04 | Empty array → "No price history yet." / 1 point → no crash | unit (component) | `npx vitest run src/components/dashboard/PriceChart.test.tsx -t "CHART-04"` | ❌ Wave 0 |
| CHART-05 | `ResponsiveContainer` renders without fixed-width restriction | manual smoke | Browser DevTools viewport test at 320px | manual only |
| CHART-06 | Recharts 3.8.1 installs without React 19 peer-dep warnings | install-time | `npm install recharts@3.8.1` (capture output; 0 warnings = pass) | ❌ Wave 0 (already done in research) |

### Data Shape Invariants (Required for Test Fixtures)

| Invariant | Source | Test Guard |
|-----------|--------|-----------|
| `price` is a positive `number` (not `null`, not `NaN`) | DB-03: `current_price > 0` CHECK constraint; `price_history.price NUMERIC` column | TypeScript strict: `number` type prevents null; runtime test: pass valid fixtures only |
| `currency` is a non-empty ISO 4217 string | Firecrawl Zod schema validation (Phase 3, TRACK-05) | Pass real 3-letter code in test fixture (`"USD"`, `"GBP"`) |
| `checked_at` is an ISO 8601 string parseable by `new Date()` | Supabase `TIMESTAMPTZ` column; returned as ISO string | Test fixtures use ISO 8601 format; `try/catch` in formatters handles invalid dates |
| `price_history` array is chronologically ordered (ascending `checked_at`) | Enforced by DAL `.order('checked_at', { ascending: true, referencedTable: 'price_history' })` | DAL unit test verifies `.order()` was called with correct params |

### Wave 0 Gaps

- [ ] `dealdrop/src/components/dashboard/PriceChart.test.tsx` — covers CHART-01, CHART-03, CHART-04
- [ ] `dealdrop/src/lib/products/get-user-products.test.ts` — covers CHART-02 (DAL nested-select + order params)
- [ ] TypeScript build check: `cd dealdrop && npm run build` after widening `Product` type — confirms no regressions

*(No changes to `vitest.config.ts` or `vitest.setup.ts` are needed — existing config handles jsdom + `server-only` alias.)*

### Sampling Rate (Phase 5)

- **Per task commit:** `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx src/lib/products`
- **Per wave merge:** `cd dealdrop && npx vitest run`
- **Phase gate:** Full suite green + `npm run build` passes + manual "Show Chart" click on a product with 1 history point

---

## 8. Open Risks / Unknowns

### Risk 1: Supabase Nested-Select Type Inference (MEDIUM risk)
**What we know:** `@supabase/supabase-js` v2.103.3 does not auto-infer nested array shapes from `.select()` string literals in the current version. A manual `as Product[]` cast is required.
**Risk:** The cast masks TypeScript errors if the selected columns change. Mitigated by the `PricePoint` type definition matching `database.ts` generated types exactly.
**Planner action:** Add a type-probe file (following Phase 4's `src/__probes__/product-type.probe.ts` pattern) that asserts `Product.price_history` is an array of `PricePoint`.

### Risk 2: Tooltip `content` Prop API Change in Recharts 3.x (LOW risk)
**What we know:** Recharts 3.x changed some internal type signatures. The `<Tooltip content={<Component />}>` pattern passing a React element should still work but was not verified via live render test.
**Risk:** The custom tooltip may not receive `active`/`payload`/`label` props if the API changed to require a render function `content={(props) => <Component {...props} />}`.
**Planner action:** Treat this as a "verify during implementation" item. If the element-passing style fails, switch to the render-function style: `content={(props) => <PriceTooltip {...props} currency={currency} />}`. Both are standard patterns.

### Risk 3: Single-Point Y-axis Domain Behavior (LOW risk)
**What we know:** When `domain={['auto', 'auto']}` and all prices are identical (single point or flat history), Recharts' D3 scale will have `min === max`. D3's `scaleLinear` pads the domain in this case (it does not produce `NaN`), but the padding behavior is D3 version-specific.
**Risk:** Y-axis labels might show unexpected values (e.g., `$9` to `$11` when price is `$10`) or the line might render off-center.
**Planner action:** Verify with the component test using a 1-point history fixture. If domain padding is unacceptable, fall back to `domain={[(v: number) => v * 0.95, (v: number) => v * 1.05]}` for a 5% buffer.

### Risk 4: `ProductCard.test.tsx` Needs Update After Type Widening (HIGH risk — must address in Wave 0)
**What we know:** `ProductCard.test.tsx` has a `makeProduct()` helper that constructs a `Product` object. After widening `Product` to include `price_history: PricePoint[]`, the `makeProduct()` helper must include `price_history: []` (or a real array) to satisfy TypeScript strict mode.
**Risk:** If `makeProduct()` is not updated, ALL existing `ProductCard` tests will fail to compile after the type change.
**Planner action:** Wave 0 for Phase 5 must include updating `makeProduct()` in `ProductCard.test.tsx` to include `price_history: []` as a default. This is a one-line fix but must be in the plan explicitly.

### Risk 5: `ProductGrid` and `DashboardShell` Prop Types (MEDIUM risk)
**What we know:** `ProductGrid` and `DashboardShell` pass `Product[]` down the component tree. After widening `Product`, the DAL returns the wider type. TypeScript will flag any intermediate prop that still expects `Tables<'products'>` rather than the new `Product`.
**Risk:** Compilation errors in `ProductGrid.tsx` / `DashboardShell.tsx` if they re-import `Tables<'products'>` directly instead of `Product` from the DAL.
**Planner action:** Audit `ProductGrid.tsx` and `DashboardShell.tsx` for any explicit type import of `Tables<'products'>` and replace with the re-exported `Product` from `get-user-products.ts`.

---

## Standard Stack

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `recharts` | 3.8.1 | Recharts line chart | Install in Phase 5 |
| `@supabase/postgrest-js` | 2.103.3 | Nested select + order | Already installed (transitive) |
| `vitest` | 3.2.4 | Component testing | Already installed |
| `@testing-library/react` | 16.3.2 | Component render + query | Already installed |

**No new dev dependencies required beyond `recharts@3.8.1`.**

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive chart width | Custom width-listener or `window.innerWidth` hook | `<ResponsiveContainer width="100%">` | Handles ResizeObserver lifecycle, SSR safety, and debounce |
| Currency formatting | Custom string format logic | `Intl.NumberFormat` (already used in `formatPrice`) | Handles locale, grouping separators, currency symbol placement |
| Date tick auto-selection | Custom modulo tick filter | Recharts built-in tick auto-selection | Recharts auto-reduces ticks on narrow viewports |
| SVG tooltip styling | Canvas overlay or position:absolute tooltip | `<Tooltip content={...}>` | Recharts positions tooltip relative to the hovered point |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Single-point `domain={['auto','auto']}` does not produce NaN Y-axis values | Section 3 (Recharts Patterns) | Chart may show broken axis; mitigation: explicit domain function |
| A2 | `<Tooltip content={<Component />}>` element-passing API still works in Recharts 3.8.1 | Section 3 (Recharts Patterns) | Tooltip never renders; fix: switch to render function style |
| A3 | `react-is@19` is already in the dependency tree (not installed explicitly) | Section 1 (Dependencies) | Peer dep warning at install time; fix: `npm install react-is@19` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + tests | ✓ | v24.15.0 | — |
| npm | Install recharts | ✓ | 11.12.1 | — |
| Vitest | Component tests | ✓ | 3.2.4 | — |
| jsdom | Component test env | ✓ | 29.0.2 | — |
| recharts | Chart rendering | ✓ | 3.8.1 (installed in research) | — |
| Supabase dev project | DAL integration | ✓ | linked (Phase 1) | — |

**No missing dependencies with no fallback.**

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — `npm view recharts version` → 3.8.1 is `latest`
- [VERIFIED: npm registry] — `npm view recharts peerDependencies` → React 19 explicitly in peer range
- [VERIFIED: live npm install] — `npm install recharts@3.8.1` in project dir → 0 peer-dep warnings, 0 vulnerabilities
- [VERIFIED: grep of node_modules/recharts] — 0 files containing `findDOMNode`
- [VERIFIED: node_modules/recharts/lib/component/ResponsiveContainer.js lines 97, 37-44] — ResizeObserver guard + null-render behavior confirmed
- [VERIFIED: node_modules/@supabase/postgrest-js/dist/index.d.cts lines 1098-1102, index.cjs line 756-757] — `order` with `referencedTable` is supported API
- [VERIFIED: dealdrop/src/types/database.ts] — `price_history.Row` column types (`price: number`, `currency: string`, `checked_at: string`)
- [VERIFIED: dealdrop/vitest.config.ts] — existing test setup, no `setupFiles` or ResizeObserver polyfill present
- [VERIFIED: dealdrop/src/components/dashboard/ProductCard.test.tsx] — existing test pattern for Phase 5 to follow

### Secondary (MEDIUM confidence)
- [CITED: CONTEXT.md §Decisions D-01..D-04] — DAL query shape, type-widening strategy, revalidation

### Tertiary (LOW confidence / ASSUMED)
- A1-A3 in Assumptions Log above

---

## Metadata

**Confidence breakdown:**
- Recharts install + React 19 compatibility: HIGH — live install verified
- Supabase nested-select ordering API: HIGH — source code verified
- Vitest test strategy: HIGH — existing pattern confirmed
- Single-point rendering behavior: LOW — not live-tested; guarded by component test
- Tooltip content prop API (element vs function): LOW — assumed, verify during implementation

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable libraries; Recharts 3.x is current major)
