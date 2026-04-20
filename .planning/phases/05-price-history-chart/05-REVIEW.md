---
phase: 05-price-history-chart
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - dealdrop/src/components/dashboard/PriceChart.tsx
  - dealdrop/src/components/dashboard/PriceChart.test.tsx
  - dealdrop/src/components/dashboard/ProductCard.tsx
  - dealdrop/src/components/dashboard/ProductCard.test.tsx
  - dealdrop/src/lib/products/get-user-products.ts
  - dealdrop/src/lib/products/get-user-products.test.ts
  - dealdrop/src/__mocks__/supabase-server.ts
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7 (package.json inspected for dependency context only, not a source file)
**Status:** issues_found

## Summary

Phase 5 adds a Recharts-based price-history chart (`PriceChart`), expands `getUserProducts` with a PostgREST nested select + dual `.order()` chain, wires the chart into `ProductCard` behind a collapsible toggle, and introduces a shared `makeSupabaseMock` factory. No critical (security / data-loss) issues found. Overall quality is strong: the DAL has `server-only` as the first import, RLS-based ownership is correctly relied upon, formatters guard against invalid `Intl` inputs with try/catch fallbacks, and tests pin the exact `.select` / `.order` contract per the Phase 5 plan.

The two warnings are contract weaknesses that do not break functionality today but will bite on edge inputs:
1. `PriceChart`'s `TooltipProps.payload[0].value` is read without verifying `value` is a finite number — Recharts can emit `null` / `NaN` payloads mid-interaction.
2. `PriceChart.test.tsx`'s Strategy-A mock replaces only `ResponsiveContainer` but leaves `LineChart` real; in jsdom this usually renders zero SVG children, so the "renders line chart container" test (line 44) asserts only on the absence of the empty-state text and silently passes even if the chart were broken. The rest of the CHART-04 / CHART-03 coverage is solid.

Several info items flag code-duplication (`formatPrice` / `fullPrice`), unchecked casts in tests, and the unusual dual-interface mock shape (`{ then, order }`) in `supabase-server.ts` that works but is fragile.

## Warnings

### WR-01: `PriceChart` tooltip reads `payload[0].value` without null/NaN guard

**File:** `dealdrop/src/components/dashboard/PriceChart.tsx:64-67`
**Issue:** `PriceTooltip` guards on `!active || !payload?.length` but then indexes `payload[0].value` directly. Recharts can pass entries whose `value` is `null`, `undefined`, or `NaN` (e.g., gaps in data, hover transitions, or when `dataKey` resolves to a missing field). Passing a non-number into `fullPrice` → `Intl.NumberFormat.format(price)` with `NaN` renders "NaN" (not caught by the try/catch because no throw occurs) and with `null` renders "$0.00" silently. The current `PricePoint` shape always has a `number` price, so this is low-probability, but it is still a defensive gap in a component that is explicitly described as "defensive" in the file's own comment on line 84.

**Fix:**
```ts
function PriceTooltip({ active, payload, label, currency }: TooltipProps) {
  if (!active || !payload?.length) return null
  const price = payload[0].value
  if (typeof price !== 'number' || !Number.isFinite(price)) return null
  return (
    <div style={{ /* ... */ }}>
      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{fullDate(label ?? '')}</p>
      <p style={{ fontSize: 14, margin: 0 }}>{fullPrice(price, currency)}</p>
    </div>
  )
}
```
Also widen the type: `payload?: { value: number | null | undefined }[]` so the compiler enforces the check.

### WR-02: "Renders line chart" test asserts only on absence of empty-state text

**File:** `dealdrop/src/components/dashboard/PriceChart.test.tsx:44-47`
**Issue:** The test named `CHART-01: renders line chart container when history has many points` only asserts `expect(screen.queryByText('No price history yet.')).not.toBeInTheDocument()`. That assertion passes any time the `history.length === 0` branch isn't taken — it does not actually verify that a line, axis, or any SVG is rendered. Combined with the Strategy-A `ResponsiveContainer` stub (which renders `<div style={{ width: 300, height: 200 }}>` — not a real ResizeObserver-driven container), the inner `LineChart` may render zero SVG children in jsdom and the test would still pass. This weakens CHART-01's value as a regression gate. Same weakness applies to the 1-point test on line 39-42.

**Fix:** Assert on a stable DOM marker that only renders when the chart mounts. Two options:
```ts
// Option A — assert SVG presence
it('CHART-01: renders line chart container when history has many points', () => {
  const { container } = render(<PriceChart history={makeHistory(10)} currency="USD" />)
  expect(container.querySelector('svg')).toBeInTheDocument()
})

// Option B — assert a formatted tick label is rendered
it('CHART-01: renders an x-axis tick label from the data', () => {
  render(<PriceChart history={makeHistory(10)} currency="USD" />)
  // xTickFormatter → 'Apr 1', 'Apr 2', etc. will appear if chart mounts
  expect(screen.getByText(/Apr\s*1/)).toBeInTheDocument()
})
```
If jsdom still produces no SVG children because the mocked ResponsiveContainer doesn't propagate a usable width/height to `LineChart`, switch to Strategy B from the research note and mock `LineChart` / `Line` as well, or render with an explicit `width={300} height={200}` override when testing.

## Info

### IN-01: `formatPrice` duplicated between `ProductCard.tsx` and `PriceChart.tsx` (`fullPrice`)

**File:** `dealdrop/src/components/dashboard/ProductCard.tsx:68-74` and `dealdrop/src/components/dashboard/PriceChart.tsx:37-43`
**Issue:** Both files define an essentially identical currency-formatter helper with the same try/catch fallback. A third copy would likely appear in the future email-alert template. Worth extracting to avoid drift (e.g., one file starts using `minimumFractionDigits` and the other doesn't).

**Fix:** Extract to `dealdrop/src/lib/format/currency.ts`:
```ts
export function formatCurrency(amount: number, currency: string, opts: Intl.NumberFormatOptions = {}): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, ...opts }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
```
Then `ProductCard` imports it directly and `PriceChart` uses it for both `fullPrice` (default) and `yTickFormatter` (pass `{ maximumFractionDigits: 0 }`).

### IN-02: `getUserProducts` returns via unchecked `as Product[]` cast

**File:** `dealdrop/src/lib/products/get-user-products.ts:32`
**Issue:** `return (data ?? []) as Product[]` bypasses the TS compiler. `Product` is `Tables<'products'> & { price_history: PricePoint[] }`, but `data` comes back as PostgREST's loosely-typed inference, which — for nested embeds — is `price_history: { price: number; currency: string; checked_at: string }[] | null`. If the RLS policy on `price_history` ever denies read (per DB-06 this is paired), a nested entry can be `null`, and downstream `<PriceChart history={product.price_history}>` will crash on `.length`.

**Fix:** Either narrow explicitly:
```ts
return (data ?? []).map((row) => ({
  ...row,
  price_history: row.price_history ?? [],
})) as Product[]
```
Or tighten the `Product` type to `price_history: PricePoint[] | null` and let `ProductCard` coalesce at the callsite.

### IN-03: `PriceChart.tsx` tooltip `TooltipProps` type narrows too aggressively

**File:** `dealdrop/src/components/dashboard/PriceChart.tsx:57-62`
**Issue:** The locally-defined `TooltipProps` forces `payload?: { value: number }[]` — but Recharts 3.x passes `TooltipProps<ValueType, NameType>` with richer shape (`{ value, name, dataKey, payload, color, ... }`). Custom tooltips elsewhere will hit this same narrow-type friction. Not a bug, but the local type will need to grow every time a new field is used.

**Fix:** Import Recharts' own tooltip payload type or accept the content-prop signature Recharts passes:
```ts
import type { TooltipProps } from 'recharts'
// then: function PriceTooltip(props: TooltipProps<number, string> & { currency: string })
```
(Check the Recharts 3.8.1 typings — this has shifted across majors; verify against `node_modules/recharts/types`.)

### IN-04: Shared mock exposes a dual-shape (thenable + `.order`) object that is fragile

**File:** `dealdrop/src/__mocks__/supabase-server.ts:45-50`
**Issue:** The `select().order()` return value has **both** `.then` (making it thenable — Promise-interop will auto-await it) **and** a `.order` method on the same object:
```ts
order: vi.fn().mockReturnValue({
  then: (onFulfilled) => Promise.resolve(selectProducts).then(onFulfilled),
  order: vi.fn().mockResolvedValue(selectProducts),
}),
```
This works today because Phase 4 callers `await` the single-order result (resolving via `.then`) and Phase 5 callers call `.order` again (bypassing `.then`). But any caller that does `const q = supabase.from('x').select().order(...); if (cond) q = q.order(...); await q` — a legitimate pattern — would first resolve via the thenable and then the conditional `.order` would throw "cannot call order of undefined". The helper is also hard to reason about because it pretends to be both a thenable and a builder.

**Fix:** Either (a) split the mock into two factories (`makeFlatSelectMock` / `makeNestedSelectMock`), or (b) make the inner object a proper thenable only and return a pre-resolved value when `.order` is called again:
```ts
order: vi.fn((_col: string, _opts?: unknown) => {
  const result = Promise.resolve(selectProducts)
  // Attach .order for nested chains without the thenable hiding the builder
  return Object.assign(result, { order: vi.fn().mockResolvedValue(selectProducts) })
}),
```
This still has the same dual-shape concern but at least the inner-`.order` receives the same outer arguments pattern. Document the limitation with a comment above the helper.

### IN-05: Liberal `as any` casts in `get-user-products.test.ts`

**File:** `dealdrop/src/lib/products/get-user-products.test.ts:64, 76, 81, 91, 96, 103, 108, 123`
**Issue:** Eight `as any` casts on mock results. These are pragmatic (the mock factory doesn't return a typed `SupabaseClient`) but make the tests fragile to refactors of the mock surface — any renaming won't be caught by `tsc`. Low priority for test code but worth addressing if the mock is reused more broadly.

**Fix:** Have `makeSupabaseMock` return a typed `Partial<SupabaseClient>` or a dedicated `MockSupabaseClient` interface:
```ts
// in supabase-server.ts
export interface MockSupabaseClient {
  auth: { getUser: ReturnType<typeof vi.fn> }
  from: ReturnType<typeof vi.fn>
}
export function makeSupabaseMock(overrides?: SupabaseMockOverrides): MockSupabaseClient { /* ... */ }
```
Then `createClient` mocks accept `MockSupabaseClient` via a small adapter and the `as any` casts drop from the callsites.

### IN-06: `ProductCard` test uses `as Product` to bypass strict typing

**File:** `dealdrop/src/components/dashboard/ProductCard.test.tsx:39`
**Issue:** `makeProduct` returns `{ ...defaults, ...overrides } as Product`. The cast hides any mismatch between test fixtures and `Tables<'products'>` (e.g., a future column addition won't break the test but will break production). Low severity because the defaults currently match the type exactly.

**Fix:** Drop the cast and let TS enforce it:
```ts
function makeProduct(overrides: Partial<Product> = {}): Product {
  const base: Product = {
    id: 'p1', user_id: 'u1', url: 'https://example.com/product',
    name: 'Test Product', current_price: 19.99, currency: 'USD',
    image_url: 'https://cdn/x.jpg',
    created_at: '2026-04-20T00:00:00Z', updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
    price_history: [],
  }
  return { ...base, ...overrides }
}
```
If TS complains about an added column, the test is correctly catching it.

---

_Reviewed: 2026-04-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
