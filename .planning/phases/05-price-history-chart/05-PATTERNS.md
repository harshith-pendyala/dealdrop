# Phase 5: Price History Chart - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 7 (3 new, 4 modified/audited)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `dealdrop/src/components/dashboard/PriceChart.tsx` | client component | request-response (read-only render) | `dealdrop/src/components/dashboard/ProductCard.tsx` | exact — same role, same `'use client'` client component pattern |
| `dealdrop/src/components/dashboard/PriceChart.test.tsx` | test | — | `dealdrop/src/components/dashboard/ProductCard.test.tsx` | exact — same jsdom component test pattern, `vi.mock` stubs, `makeX()` factory |
| `dealdrop/src/lib/products/get-user-products.test.ts` | test | CRUD (DAL select) | `dealdrop/src/actions/products.test.ts` | role-match — same server-side DAL test, same `makeSupabaseMock`, same dynamic-import ordering |
| `dealdrop/src/lib/products/get-user-products.ts` *(modify)* | server DAL | CRUD (select) | itself — extends existing file | exact — add nested select + two new exported types |
| `dealdrop/src/components/dashboard/ProductCard.tsx` *(modify)* | client component | request-response | itself — L58-65 slot swap only | exact — single-site change; rest of file is the pattern source |
| `dealdrop/src/components/dashboard/ProductCard.test.tsx` *(modify)* | test | — | itself | exact — one-line `makeProduct()` fix |
| `dealdrop/src/components/dashboard/ProductGrid.tsx` *(audit)* | client component | — | `dealdrop/src/components/dashboard/DashboardShell.tsx` | role-match — both consume `Product[]` from DAL; audit for `Tables<'products'>` direct usage |

---

## Pattern Assignments

---

### `dealdrop/src/components/dashboard/PriceChart.tsx` (new — client component, read-only render)

**Analog:** `dealdrop/src/components/dashboard/ProductCard.tsx`

**Directive + import pattern** (ProductCard.tsx lines 1-9):
```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RemoveProductDialog } from './RemoveProductDialog'
import type { Product } from '@/lib/products/get-user-products'
```

**PriceChart adaptation:** Copy the `'use client'` top line verbatim. Replace the Shadcn/Lucide imports with Recharts named imports. Import `PricePoint` type from the same DAL path pattern as `Product`:

```typescript
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
```

**Props type pattern** (ProductCard.tsx line 11):
```typescript
type ProductCardProps = Readonly<{ product: Product }>
```

**PriceChart adaptation:** Same `Readonly<{...}>` wrapper. Props are `{ history: PricePoint[]; currency: string }`:

```typescript
type Props = Readonly<{ history: PricePoint[]; currency: string }>
```

**Named export pattern** (ProductCard.tsx line 13):
```typescript
export function ProductCard({ product }: ProductCardProps) {
```

**PriceChart adaptation:** Same named-function export, destructure props:

```typescript
export function PriceChart({ history, currency }: Props) {
```

**`formatPrice` inline helper — full precision** (ProductCard.tsx lines 70-76):
```typescript
function formatPrice(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}
```

**PriceChart adaptation for Y-axis ticks** — copy the `try/catch` wrapper, add `maximumFractionDigits: 0`:

```typescript
const yTickFormatter = (value: number) => {
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
```

**PriceChart adaptation for X-axis ticks** — mirror the same defensive `try/catch` pattern, using `Intl.DateTimeFormat`:

```typescript
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

**`chartOpen` conditional render slot being replaced** (ProductCard.tsx lines 58-65):
```tsx
{chartOpen && (
  <div className="px-4 pb-4">
    <div
      className="min-h-[200px] bg-muted rounded-lg"
      aria-hidden="true"
    />
  </div>
)}
```

**Divergence note:** PriceChart is read-only — no `useState`, no Server Actions, no `useTransition`, no `useActionState`. It receives only `{ history, currency }` and renders. The empty-state guard mirrors the `min-h-[200px] bg-muted rounded-lg` class pattern from the placeholder it replaces.

---

### `dealdrop/src/components/dashboard/PriceChart.test.tsx` (new — jsdom component test)

**Analog:** `dealdrop/src/components/dashboard/ProductCard.test.tsx`

**File header — env pragma + imports** (ProductCard.test.tsx lines 1-4):
```typescript
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
```

**PriceChart test adaptation:** Copy identical header. `fireEvent` is not needed for PriceChart (no interaction), but `cleanup` and `afterEach` are required as-is.

**`vi.mock` pattern for heavy deps** (ProductCard.test.tsx lines 6-16):
```typescript
// Stub next/image to a plain img so we don't pull the Next.js runtime.
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

// Stub RemoveProductDialog to avoid pulling the action + AlertDialog here.
vi.mock('./RemoveProductDialog', () => ({
  RemoveProductDialog: (props: { productId: string }) => (
    <button aria-label="Remove product" data-testid="remove-stub" data-id={props.productId} />
  ),
}))
```

**PriceChart test adaptation:** Replace the `next/image` and `RemoveProductDialog` stubs with the `recharts` stub that bypasses `ResizeObserver`. This is the exact pattern from RESEARCH.md §6 (Strategy A):

```typescript
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 300, height: 200 }}>{children}</div>
    ),
  }
})
```

Note: `vi.mock(...)` hoisting requires the import of `PriceChart` to come AFTER the mock block:

```typescript
// --- vi.mock block FIRST ---
import { PriceChart } from './PriceChart'
import type { PricePoint } from '@/lib/products/get-user-products'
```

**`afterEach` cleanup** (ProductCard.test.tsx lines 21-23):
```typescript
afterEach(() => {
  cleanup()
})
```

Copy verbatim.

**`makeProduct` factory pattern** (ProductCard.test.tsx lines 25-39):
```typescript
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    url: 'https://example.com/product',
    name: 'Test Product',
    current_price: 19.99,
    currency: 'USD',
    image_url: 'https://cdn/x.jpg',
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
    ...overrides,
  } as Product
}
```

**PriceChart adaptation:** Replace with `makeHistory(n)` factory returning `PricePoint[]`:

```typescript
const makeHistory = (n: number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({
    price: 10 + i,
    currency: 'USD',
    checked_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  }))
```

**`describe/it` test body pattern** (ProductCard.test.tsx lines 41-91):
```typescript
describe('ProductCard', () => {
  it('DASH-03: formats price via Intl with stored currency (USD)', () => {
    render(<ProductCard product={makeProduct({ current_price: 19.99, currency: 'USD' })} />)
    expect(document.body.textContent).toMatch(/\$19\.99|US\$19\.99/)
    expect(document.body.textContent).not.toMatch(/£|GBP 19/)
  })
  // ...
  it('DASH-04: Show Chart toggle flips aria-expanded and label', () => {
    render(<ProductCard product={makeProduct()} />)
    const btn = screen.getByRole('button', { name: /Show Chart/ })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    const btnAfter = screen.getByRole('button', { name: /Hide Chart/ })
    expect(btnAfter).toHaveAttribute('aria-expanded', 'true')
  })
```

**PriceChart adaptation:** Copy the `describe/it` skeleton, wire to the four PriceChart cases (empty, 1-point, multi-point, formatter output):

```typescript
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

**Divergence note:** PriceChart tests do NOT use `fireEvent` (read-only component). Formatter unit tests (CHART-03) may be added as inline helper calls in the same file without rendering — just call `xTickFormatter`/`yTickFormatter` and `expect(...).toMatch(...)`.

---

### `dealdrop/src/lib/products/get-user-products.test.ts` (new — server DAL unit test)

**Analog:** `dealdrop/src/actions/products.test.ts` (closest DAL test with `makeSupabaseMock` + dynamic import)

**File header with env stubs** (products.test.ts lines 1-18):
```typescript
import {
  describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll,
} from 'vitest'
import { makeSupabaseMock } from '@/__mocks__/supabase-server'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })
```

Copy verbatim — same 7 env vars required by the Zod env validator.

**`vi.mock` for supabase client + dynamic import ordering** (products.test.ts lines 21-35):
```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

type ProductsActionsModule = typeof import('@/actions/products')
let mod: ProductsActionsModule
beforeAll(async () => {
  mod = await import('@/actions/products')
})
```

**DAL test adaptation:** Same pattern, just import the DAL module instead of the actions module:

```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

type GetUserProductsModule = typeof import('@/lib/products/get-user-products')
let mod: GetUserProductsModule
beforeAll(async () => {
  mod = await import('@/lib/products/get-user-products')
})
```

**`makeSupabaseMock` usage with nested select** (products.test.ts lines 64-65):
```typescript
const supabase = makeSupabaseMock()
vi.mocked(createClient).mockResolvedValue(supabase as any)
```

**DAL test adaptation:** The `selectProducts` override in `makeSupabaseMock` controls what `.select().order()` returns. The mock's `.select` chains to `.order` which returns `selectProducts`. However, the Phase 5 query chains TWO `.order()` calls. The existing `makeSupabaseMock` only chains one `.order()` — the mock may need extension. Concrete mock call assertion:

```typescript
// Assert the builder was called with the nested select string
const selectMock = (supabase.from as any).mock.results[0].value.select
expect(selectMock).toHaveBeenCalledWith('*, price_history(price, currency, checked_at)')

// Assert chronological nested order was requested
const orderMock = selectMock.mock.results[0].value.order
expect(orderMock).toHaveBeenCalledWith('checked_at', {
  ascending: true,
  referencedTable: 'price_history',
})
```

**`beforeEach`/`afterEach` console spy pattern** (products.test.ts lines 37-48):
```typescript
let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  vi.clearAllMocks()
})
```

Copy verbatim — `getUserProducts` calls `console.error` on failure.

**Divergence notes:**
- The `makeSupabaseMock` `.select().order()` chain only has one `.order()` in the current mock (lines 41-43 of `supabase-server.ts`). The DAL now chains two `.order()` calls. If the chain breaks, extend the mock's `order` stub to return another object with an `order` method that resolves the final data.
- The test file uses `environment: 'node'` (default, no pragma needed — DAL code has no DOM dependency).
- No `'use client'` and no jsdom pragma — this is a pure Node test.

---

### `dealdrop/src/lib/products/get-user-products.ts` (modify — extend existing DAL)

**Analog:** itself (extend, not replace)

**Current file verbatim** (lines 1-22):
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type Product = Tables<'products'>

export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createClient()
  // RLS policy products_select_own enforces user_id = auth.uid() — no manual .eq needed.
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getUserProducts: select failed', { err: error })
    return []  // fail-open to empty grid rather than crash the dashboard
  }
  return data ?? []
}
```

**Required changes (copy the pattern, expand the implementation):**

1. After `import type { Tables }...`, add two new exported types:
```typescript
export type PricePoint = {
  price: number
  currency: string
  checked_at: string
}

export type Product = Tables<'products'> & {
  price_history: PricePoint[]
}
```

2. Replace `.select('*')` with nested select:
```typescript
.select('*, price_history(price, currency, checked_at)')
```

3. Chain a second `.order()` for nested table ordering:
```typescript
.order('created_at', { ascending: false })
.order('checked_at', { ascending: true, referencedTable: 'price_history' })
```

4. Change return cast to explicit type:
```typescript
return (data ?? []) as Product[]
```

**Preservation rules:**
- `import 'server-only'` stays as line 1 — do not move
- The `console.error` error handler stays verbatim
- The fail-open `return []` pattern stays verbatim

---

### `dealdrop/src/components/dashboard/ProductCard.tsx` (modify — slot swap at L58-65)

**Analog:** itself (single-site change)

**Current slot (lines 58-65) to be replaced:**
```tsx
{chartOpen && (
  <div className="px-4 pb-4">
    <div
      className="min-h-[200px] bg-muted rounded-lg"
      aria-hidden="true"
    />
  </div>
)}
```

**New slot — add import at top, replace the inner `<div>`:**

Import to add (after existing imports, line 9 area):
```typescript
import { PriceChart } from './PriceChart'
```

Replacement JSX at lines 58-65:
```tsx
{chartOpen && (
  <div className="px-4 pb-4">
    <PriceChart history={product.price_history} currency={product.currency} />
  </div>
)}
```

**Preservation rules:**
- The outer `<div className="px-4 pb-4">` wrapper stays — matches existing padding spec from UI-SPEC.md
- `aria-hidden="true"` is removed (the chart is meaningful content)
- No changes to `formatPrice`, `useState`, or any other part of the file

---

### `dealdrop/src/components/dashboard/ProductCard.test.tsx` (modify — one-line fix, Risk 4)

**Analog:** itself

**Current `makeProduct` helper (lines 25-39):**
```typescript
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    url: 'https://example.com/product',
    name: 'Test Product',
    current_price: 19.99,
    currency: 'USD',
    image_url: 'https://cdn/x.jpg',
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
    ...overrides,
  } as Product
}
```

**Required change:** After `Product` type is widened to include `price_history: PricePoint[]`, this helper must include a default value for the new required field. Without this, TypeScript strict mode will fail to compile every test in this file.

Add `price_history: []` before the `...overrides` spread:
```typescript
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    url: 'https://example.com/product',
    name: 'Test Product',
    current_price: 19.99,
    currency: 'USD',
    image_url: 'https://cdn/x.jpg',
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
    price_history: [],   // <-- ADD THIS LINE
    ...overrides,
  } as Product
}
```

---

### `dealdrop/src/components/dashboard/DashboardShell.tsx` / `ProductGrid.tsx` (audit — Risk 5)

**Analog:** themselves — audit only, no code to write unless a `Tables<'products'>` direct import is found.

**DashboardShell.tsx current import (line 3):**
```typescript
import { getUserProducts } from '@/lib/products/get-user-products'
```

No direct `Tables<'products'>` import. `products` is typed as the return of `getUserProducts()` inferred at line 9 (`const products = await getUserProducts()`). After widening, `products` will be `Product[]` automatically. **No change required.**

**ProductGrid.tsx current import (line 3):**
```typescript
import type { Product } from '@/lib/products/get-user-products'
```

Already imports `Product` from the DAL, NOT directly from `@/types/database`. After widening the `Product` export in `get-user-products.ts`, this import automatically picks up the widened type. **No change required unless TypeScript surfaces a compile error on the `OptimisticItem` union.**

**Audit pattern to run before shipping:**
```bash
cd dealdrop && npx tsc --noEmit
```

If any error cites `DashboardShell.tsx` or `ProductGrid.tsx` about `price_history` missing from a type, replace any remaining `Tables<'products'>` reference in that file with `Product` from `@/lib/products/get-user-products`.

---

## Shared Patterns

### `'use client'` Client Component Directive
**Source:** `dealdrop/src/components/dashboard/ProductCard.tsx` line 1
**Apply to:** `PriceChart.tsx` — must be the first line of the file
```typescript
'use client'
```

### `import 'server-only'` + DAL Boilerplate
**Source:** `dealdrop/src/lib/products/get-user-products.ts` lines 1-5
**Apply to:** `get-user-products.ts` (preserve verbatim when extending)
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
```

### `Intl.NumberFormat` with `try/catch` Defensive Wrapper
**Source:** `dealdrop/src/components/dashboard/ProductCard.tsx` lines 70-76
**Apply to:** `PriceChart.tsx` — yTickFormatter (compact), PriceTooltip (full precision)
```typescript
function formatPrice(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}
```

### `Readonly<{...}>` Props Type
**Source:** `dealdrop/src/components/dashboard/ProductCard.tsx` line 11
**Apply to:** `PriceChart.tsx`
```typescript
type ProductCardProps = Readonly<{ product: Product }>
```

### `// @vitest-environment jsdom` + `afterEach(cleanup)` Pattern
**Source:** `dealdrop/src/components/dashboard/ProductCard.test.tsx` lines 1, 21-23
**Apply to:** `PriceChart.test.tsx`
```typescript
// @vitest-environment jsdom
// ... (at top of file)
afterEach(() => {
  cleanup()
})
```

### `vi.stubEnv` + `beforeAll`/`afterAll` + Dynamic Import Ordering
**Source:** `dealdrop/src/actions/products.test.ts` lines 9-35
**Apply to:** `get-user-products.test.ts` — stub all 7 env vars before any module import
```typescript
beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })
```

### `makeSupabaseMock` Factory from `@/__mocks__/supabase-server`
**Source:** `dealdrop/src/__mocks__/supabase-server.ts` (full file)
**Apply to:** `get-user-products.test.ts` — import and use the `selectProducts` override key
```typescript
import { makeSupabaseMock } from '@/__mocks__/supabase-server'

// Usage in test:
const supabase = makeSupabaseMock({
  selectProducts: {
    data: [{ id: 'p1', price_history: [{ price: 10, currency: 'USD', checked_at: '2026-04-01T00:00:00Z' }], /* ...other cols */ }],
    error: null,
  },
})
vi.mocked(createClient).mockResolvedValue(supabase as any)
```

**Watch-out:** The current `makeSupabaseMock` mock's `.select().order()` chain only has one `.order()` call returning `selectProducts`. The extended DAL chains TWO `.order()` calls. If the second `.order()` call fails because `order()` doesn't return another chainable object, extend the mock:
```typescript
select: vi.fn((_cols?: string) => ({
  order: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue(selectProducts),  // second chained order
  }),
})),
```

### Fail-Open Error Return Pattern (DAL)
**Source:** `dealdrop/src/lib/products/get-user-products.ts` lines 17-20
**Apply to:** Keep verbatim when extending the DAL
```typescript
if (error) {
  console.error('getUserProducts: select failed', { err: error })
  return []  // fail-open to empty grid rather than crash the dashboard
}
```

---

## No Analog Found

All files have analogs. No new patterns without a codebase precedent.

| File | Role | Data Flow | Note |
|------|------|-----------|------|
| *(none)* | — | — | — |

---

## Metadata

**Analog search scope:** `dealdrop/src/components/dashboard/`, `dealdrop/src/lib/products/`, `dealdrop/src/actions/`, `dealdrop/src/__mocks__/`, `dealdrop/vitest.config.ts`
**Files read:** 11 (ProductCard.tsx, ProductCard.test.tsx, get-user-products.ts, ProductGrid.tsx, DashboardShell.tsx, products.test.ts, url.test.ts, scrape-product.test.ts, vitest.config.ts, supabase-server.ts mock, 05-CONTEXT.md + 05-RESEARCH.md + 05-UI-SPEC.md)
**Pattern extraction date:** 2026-04-20

---

## PATTERN MAPPING COMPLETE

**Phase:** 5 - Price History Chart
**Files classified:** 7
**Analogs found:** 7 / 7

### Coverage
- Files with exact analog: 5 (`PriceChart.tsx`, `PriceChart.test.tsx`, `get-user-products.ts` self, `ProductCard.tsx` self, `ProductCard.test.tsx` self)
- Files with role-match analog: 2 (`get-user-products.test.ts` → `products.test.ts`, `ProductGrid.tsx`/`DashboardShell.tsx` audit)
- Files with no analog: 0

### Key Patterns Identified
- All client components use `'use client'` as line 1 + `Readonly<{...}>` props + named function export — copy from `ProductCard.tsx` lines 1-13
- All component tests use `// @vitest-environment jsdom` pragma + `vi.mock(...)` before subject import + `afterEach(cleanup)` — copy from `ProductCard.test.tsx` lines 1-23
- All DAL tests stub 7 env vars in `beforeAll`, mock `@/lib/supabase/server`, and use dynamic import to enforce ordering — copy from `products.test.ts` lines 9-35
- All DAL files have `import 'server-only'` on line 1 and fail-open with `return []` on Supabase error
- `Intl.NumberFormat`/`Intl.DateTimeFormat` with `try/catch` is the locked formatting pattern — no hand-rolled alternatives
- `makeSupabaseMock` from `@/__mocks__/supabase-server.ts` is the shared fixture factory; its `.select().order()` chain needs a second `.order()` stub for the extended DAL

### File Created
`/Users/harshithpendyala/Documents/DealDrop/.planning/phases/05-price-history-chart/05-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference analog patterns in PLAN.md files.
