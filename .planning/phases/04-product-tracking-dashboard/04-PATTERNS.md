# Phase 4: Product Tracking & Dashboard — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 19 new + 1 rewrite + 1 migration = 21
**Analogs found:** 19 / 21 (two files — `src/__mocks__/supabase-server.ts` and `src/components/dashboard/*.test.tsx` — are Wave 0 greenfield; component-test infra does not yet exist)

---

## File Classification

### Production code (new unless noted)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `dealdrop/src/actions/products.ts` | Server Action (mutation) | request-response (form → DB + revalidate) | `dealdrop/src/actions/auth.ts` + `dealdrop/src/lib/firecrawl/scrape-product.ts` | role-match (auth) + shape-match (scrape) |
| `dealdrop/src/lib/products/get-user-products.ts` | Server-only DAL helper | CRUD read (RLS-scoped SELECT) | `dealdrop/src/lib/supabase/server.ts` + `dealdrop/src/lib/firecrawl/scrape-product.ts` (server-only directive) | role-match |
| `dealdrop/src/lib/firecrawl/toast-messages.ts` | Client-safe utility (reason→copy map) | pure transform | `dealdrop/src/lib/firecrawl/types.ts` (exhaustiveness pattern) + `dealdrop/src/lib/firecrawl/url.ts` (client-safe module) | exact |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` (**REWRITE**) | RSC (auth branch + data fetch + shell) | request-response | `dealdrop/app/page.tsx` (existing RSC auth-fetch pattern) | exact |
| `dealdrop/src/components/dashboard/EmptyState.tsx` | RSC (layout + copy) | render-only | `dealdrop/src/components/hero/Hero.tsx` | exact (stacked-centered hero tone, same layout classes) |
| `dealdrop/src/components/dashboard/ProductGrid.tsx` | Client component (wraps `useOptimistic` + dialog trigger) | event-driven (optimistic list) | `dealdrop/src/components/auth/AuthModalProvider.tsx` (`'use client'` + hook container) | role-match |
| `dealdrop/src/components/dashboard/ProductCard.tsx` | Client component (card + toggle + actions) | event-driven | `dealdrop/src/components/hero/FeatureCard.tsx` (Card layout) + `dealdrop/src/components/auth/SignOutButton.tsx` (client handler pattern) | partial (FeatureCard is RSC; ProductCard adds `useState` chart toggle + AlertDialog) |
| `dealdrop/src/components/dashboard/AddProductForm.tsx` | Client component (form + `useActionState` + sessionStorage) | request-response + event-driven | `dealdrop/src/components/auth/AuthModal.tsx` (client form + Sonner + loading state + Dialog context consumer) | role-match |
| `dealdrop/src/components/dashboard/AddProductDialog.tsx` | Client component (Dialog wrapper) | render-only (open/close) | `dealdrop/src/components/auth/AuthModal.tsx` (verbatim Dialog usage from same primitive) | exact |
| `dealdrop/src/components/dashboard/RemoveProductDialog.tsx` | Client component (AlertDialog + action call) | request-response | `dealdrop/src/components/auth/AuthModal.tsx` (Dialog open state + server action call + toast on error) | role-match (AlertDialog is new primitive; interaction shape is identical) |
| `dealdrop/src/components/dashboard/SkeletonCard.tsx` | RSC (pure CSS placeholder) | render-only | `dealdrop/src/components/hero/FeatureCard.tsx` (Card-based RSC; no client state) | partial |
| `dealdrop/components/ui/alert-dialog.tsx` | Shadcn primitive (generated) | render-only | `dealdrop/components/ui/dialog.tsx` | exact (both are Radix wrappers emitted by same CLI) |
| `dealdrop/components/ui/badge.tsx` | Shadcn primitive (generated) | render-only | `dealdrop/components/ui/button.tsx` (CVA variant pattern) | role-match |
| `dealdrop/components/ui/input.tsx` | Shadcn primitive (generated) | render-only | `dealdrop/components/ui/button.tsx` (same `React.ComponentProps<"X">` + `cn()` pattern) | role-match |
| `dealdrop/components/ui/label.tsx` | Shadcn primitive (generated) | render-only | `dealdrop/components/ui/button.tsx` | role-match |

### Database migration

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql` | Database migration (ALTER + partial INDEX) | schema-change | `dealdrop/supabase/migrations/0001_init_schema.sql` (CREATE INDEX idiom) + `dealdrop/supabase/migrations/0002_enable_rls.sql` (migration header-comment style) | partial |

### Tests (Wave 0 — component-test infrastructure is missing)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `dealdrop/src/actions/products.test.ts` | Vitest action test | request-response assertions | `dealdrop/src/lib/firecrawl/scrape-product.test.ts` (`vi.stubEnv` + dynamic-import + `vi.spyOn(console,'error')` pattern) | exact |
| `dealdrop/src/lib/firecrawl/toast-messages.test.ts` | Vitest pure-fn test | pure transform | `dealdrop/src/lib/firecrawl/url.test.ts` (no env-stub, no mocks — import + assert) | exact |
| `dealdrop/src/components/dashboard/AddProductForm.test.tsx` | Vitest component test | event-driven | **NO ANALOG** — no `.test.tsx` file exists yet | none (Wave 0) |
| `dealdrop/src/components/dashboard/ProductCard.test.tsx` | Vitest component test | event-driven | **NO ANALOG** | none (Wave 0) |
| `dealdrop/src/components/dashboard/ProductGrid.test.tsx` | Vitest component test | event-driven | **NO ANALOG** | none (Wave 0) |
| `dealdrop/src/components/dashboard/EmptyState.test.tsx` | Vitest component test | render-only | **NO ANALOG** | none (Wave 0) |
| `dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx` | Vitest component test | event-driven | **NO ANALOG** | none (Wave 0) |
| `dealdrop/src/__mocks__/supabase-server.ts` | Shared test mock (Vitest) | support | **NO ANALOG** — no `__mocks__` dir | none (Wave 0) |

---

## Pattern Assignments

### `src/actions/products.ts` (Server Action, request-response)

**Primary analog:** `dealdrop/src/actions/auth.ts` (lines 1-13) — existing `'use server'` file with `createClient` + Supabase auth call + redirect.
**Secondary analog:** `dealdrop/src/lib/firecrawl/scrape-product.ts` — discriminated-union return shape + branch-ordered error handling + structured `console.error` (lines 86-112).

**File header + `'use server'` directive** (mirror `dealdrop/src/actions/auth.ts:1`):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import { normalizeUrl } from '@/lib/firecrawl/url'
import type { ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'
```

**Auth re-check pattern** (copy from `dealdrop/src/actions/auth.ts:6-8` and extend):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { ok: false, reason: 'unauthenticated' }
```

**Discriminated-union return shape** (mirror `dealdrop/src/lib/firecrawl/types.ts:24-26`):
```typescript
export type AddProductResult =
  | { ok: true }
  | { ok: false; reason: ScrapeFailureReason | 'duplicate_url' | 'unauthenticated' | 'db_error' }
```

**Branch-ordered failure + structured logging** (pattern from `dealdrop/src/lib/firecrawl/scrape-product.ts:86-89, 100, 109-112`):
```typescript
const result = await scrapeProduct(rawUrl)
if (!result.ok) return { ok: false, reason: result.reason }
// ... insert ...
if (insertProductErr) {
  if (insertProductErr.code === '23505') return { ok: false, reason: 'duplicate_url' }
  console.error('addProduct: products insert failed', { err: insertProductErr })
  return { ok: false, reason: 'db_error' }
}
```

**Column-rename mapping (critical — do NOT spread `ProductData`)**:
```typescript
// ProductData.currency_code → products.currency (see Pitfall 1 in RESEARCH.md)
.insert({
  user_id: user.id,
  url: normalizedUrl,
  name: result.data.name,
  current_price: result.data.current_price,
  currency: result.data.currency_code,   // explicit rename
  image_url: result.data.image_url,
})
```

**Two-table best-effort rollback** (RESEARCH.md Pattern 1, RESEARCH.md §Code Examples):
```typescript
const { error: insertHistoryErr } = await supabase.from('price_history').insert({
  product_id: product.id,
  price: result.data.current_price,
  currency: result.data.currency_code,
})
if (insertHistoryErr) {
  await supabase.from('products').delete().eq('id', product.id)  // rollback
  console.error('addProduct: price_history insert failed; rolled back product', { err: insertHistoryErr })
  return { ok: false, reason: 'db_error' }
}
revalidatePath('/')
return { ok: true }
```

**`removeProduct` pattern** (mirror auth.ts shape + delete + revalidate; RESEARCH.md §Code Examples):
```typescript
export async function removeProduct(productId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) {
    console.error('removeProduct: delete failed', { productId, err: error })
    return { ok: false }
  }
  revalidatePath('/')
  return { ok: true }
}
```

**Risks / notes:**
- `dealdrop/src/actions/auth.ts` `redirect()`s instead of returning — Phase 4 actions MUST return structured results for `useActionState` to consume. Do NOT redirect from `addProduct`/`removeProduct`.
- `dealdrop/src/actions/auth.ts` omits an auth re-check (it's a sign-out, so `getUser()==null` is acceptable). Phase 4 MUST re-check per RESEARCH.md Pitfall 2.
- Never pass `user_id` from the client — read from `supabase.auth.getUser()` inside the action (RESEARCH.md Anti-Patterns).

---

### `src/lib/products/get-user-products.ts` (server-only DAL, CRUD read)

**Primary analog:** `dealdrop/src/lib/supabase/server.ts` (cookie-bound client factory) + `dealdrop/src/lib/firecrawl/scrape-product.ts:1-3` (`import 'server-only'` directive).

**Server-only guard** (verbatim from `dealdrop/src/lib/firecrawl/scrape-product.ts:1-3`):
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
```

**RLS-scoped SELECT** (RESEARCH.md Pattern 5; leverages policy `products_select_own` from `dealdrop/supabase/migrations/0002_enable_rls.sql:9-12`):
```typescript
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
    return []  // fail-open to empty grid rather than crash
  }
  return data ?? []
}
```

**Risks / notes:**
- Do NOT re-invent the cookie factory. Always call `createClient()` from `@/lib/supabase/server`. The factory already handles `await cookies()` (Next.js 16 breaking change) and the RSC cookie-write no-op.
- Add `last_scrape_failed_at` to the generated `Tables<'products'>` type by regenerating `src/types/database.ts` AFTER pushing the `0004_*.sql` migration — otherwise TypeScript will not see the new column (RESEARCH.md Runtime State Inventory).

---

### `src/lib/firecrawl/toast-messages.ts` (client-safe util, pure transform)

**Primary analog:** `dealdrop/src/lib/firecrawl/types.ts:28-47` (compile-time exhaustiveness pattern) + `dealdrop/src/lib/firecrawl/url.ts` (pure, no `server-only`, no env).

**Exhaustive switch with compile-time never-check** (inspired by `dealdrop/src/lib/firecrawl/types.ts:31-47`):
```typescript
// NO `import 'server-only'` — this file must be importable from Client Components.
import type { ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'

export type ToastableReason =
  | ScrapeFailureReason
  | 'duplicate_url'
  | 'unauthenticated'
  | 'db_error'

export function toastMessageForReason(reason: ToastableReason): string {
  switch (reason) {
    case 'invalid_url':       return "That URL doesn't look right. Check for typos."
    case 'network_error':     return "Couldn't reach that site — try again in a moment."
    case 'scrape_timeout':    return 'That page took too long to load. Try a different URL.'
    case 'missing_price':     return "We couldn't find a price on that page."
    case 'missing_name':      return "We couldn't find a product name on that page."
    case 'invalid_currency':  return "That page's currency format isn't supported yet."
    case 'duplicate_url':     return "You're already tracking this product."
    case 'unauthenticated':   return 'Please sign in and try again.'
    case 'db_error':          return 'Something went wrong saving that. Try again later.'
    case 'unknown':           return 'Something went wrong. Try again later.'
    default: {
      const _exhaustive: never = reason   // compile-time assertion
      void _exhaustive
      return 'Something went wrong. Try again later.'
    }
  }
}
```

**Risks / notes:**
- `scrape-product.ts` has `import 'server-only'` (line 1); re-exporting `ScrapeFailureReason` from it into a client-safe module works because types are erased at compile time and don't cross the client boundary. Confirm by checking the `import type` syntax (no runtime import).
- Verbatim copy strings from `04-UI-SPEC.md` Copywriting Contract and `04-CONTEXT.md` Claude's Discretion — these are locked wording per the UI contract.

---

### `src/components/dashboard/DashboardShell.tsx` (RSC **REWRITE**, request-response)

**Primary analog:** `dealdrop/app/page.tsx:1-18` (existing RSC with `createClient` + `auth.getUser`) — current `DashboardShell.tsx:7-19` has a placeholder body that must be replaced.

**Current placeholder body (to replace)**:
```typescript
// dealdrop/src/components/dashboard/DashboardShell.tsx:7-19 (current)
export function DashboardShell({ user: _user }: DashboardShellProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold leading-snug">Welcome back</h1>
        {/* ... placeholder copy ... */}
      </div>
    </div>
  )
}
```

**New pattern** — async RSC, fetch via DAL, branch on count (RESEARCH.md Architectural Responsibility Map):
```typescript
import type { User } from '@supabase/supabase-js'
import { getUserProducts } from '@/lib/products/get-user-products'
import { EmptyState } from './EmptyState'
import { ProductGrid } from './ProductGrid'

type DashboardShellProps = Readonly<{ user: User }>

export async function DashboardShell({ user }: DashboardShellProps) {
  const products = await getUserProducts()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {products.length === 0
        ? <EmptyState />
        : <ProductGrid products={products} />}
    </div>
  )
}
```

**Layout container classes** (preserve verbatim from current line 9 — shared with `dealdrop/src/components/hero/Hero.tsx` via `px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16` tone):
```
max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16
```

**Risks / notes:**
- Component becomes `async` — `dealdrop/app/page.tsx` already awaits it correctly (`{user ? <DashboardShell user={user} /> : <Hero />}` at line 15). No parent change needed.
- Do NOT introduce client-side data fetching here (RESEARCH.md Anti-Patterns — "Do NOT hydrate the grid with a client-side fetch").

---

### `src/components/dashboard/EmptyState.tsx` (RSC, render-only)

**Primary analog:** `dealdrop/src/components/hero/Hero.tsx` — verbatim stacked-centered composition (`flex flex-col items-center text-center`, h1/p/CTA stack, muted subtitle).

**Layout excerpt** (from `dealdrop/src/components/hero/Hero.tsx:5-13`):
```typescript
<section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16">
  <h1 className="text-3xl sm:text-5xl font-semibold leading-tight sm:leading-[1.1] tracking-tight max-w-2xl">
    Never miss a price drop
  </h1>
  <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-xl">
    Paste any product URL. We&apos;ll check the price daily and email you
    the moment it drops.
  </p>
```

**Phase 4 EmptyState mirror** (per `04-UI-SPEC.md` §Empty State Layout — heading downscaled to `text-xl` per Typography table; copy verbatim from `04-CONTEXT.md` D-04):
```typescript
<section className="flex flex-col items-center text-center gap-4">
  <h1 className="text-xl font-semibold leading-snug">Track your first product</h1>
  <p className="text-base leading-relaxed text-muted-foreground max-w-xl">
    Paste a product URL from any site — we&apos;ll check the price daily and email you when it drops.
  </p>
  <AddProductForm variant="inline" />
  <p className="text-sm text-muted-foreground">
    e.g., https://www.amazon.com/dp/XXXXXXXXXX
  </p>
</section>
```

**Risks / notes:**
- Use HTML entity `&apos;` inside JSX strings (ESLint react/no-unescaped-entities — see how `Hero.tsx:11` does it).
- Keep this file RSC (no `'use client'`); form interactivity lives inside `AddProductForm` which IS a client component.

---

### `src/components/dashboard/ProductGrid.tsx` (Client component, event-driven)

**Primary analog:** `dealdrop/src/components/auth/AuthModalProvider.tsx` (`'use client'` + local state + children composition).

**Client boundary + `useOptimistic`** (RESEARCH.md Pattern 2):
```typescript
'use client'
import { useOptimistic } from 'react'
import type { Product } from '@/lib/products/get-user-products'
import { ProductCard } from './ProductCard'
import { SkeletonCard } from './SkeletonCard'
import { AddProductDialog } from './AddProductDialog'

export function ProductGrid({ products }: { products: Product[] }) {
  const [optimistic, addOptimistic] = useOptimistic<Product[], string>(
    products,
    (current, pendingUrl) => [
      { id: `pending-${pendingUrl}`, url: pendingUrl, __pending: true } as any,
      ...current,
    ],
  )
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold leading-snug">
          {optimistic.length} {optimistic.length === 1 ? 'product' : 'products'} tracked
        </h1>
        <AddProductDialog onSubmitUrl={addOptimistic} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {optimistic.map((p) =>
          (p as any).__pending
            ? <SkeletonCard key={p.id} />
            : <ProductCard key={p.id} product={p} />)}
      </div>
    </>
  )
}
```

**Risks / notes:**
- `useOptimistic` REQUIRES `'use client'` (RESEARCH.md Pitfall 3). Header heading class `text-xl font-semibold leading-snug` matches current `DashboardShell.tsx:11`.
- Pluralization is inline ternary — do not pull in `pluralize`; portfolio bar.
- The grid receives plain JSON `products` from the parent RSC — shape is serializable (`Tables<'products'>` is all primitives + `Date`-as-string).

---

### `src/components/dashboard/ProductCard.tsx` (Client component, event-driven)

**Primary analog:** `dealdrop/src/components/hero/FeatureCard.tsx:10-18` (Card layout, icon + heading + blurb) + `dealdrop/src/components/auth/SignOutButton.tsx:1-25` (client handler + `useState` for pending).

**FeatureCard layout reference** (from `dealdrop/src/components/hero/FeatureCard.tsx:11-17`):
```typescript
<Card className="p-6 text-left">
  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
  <h3 className="mt-4 text-xl font-semibold leading-snug">{title}</h3>
  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{blurb}</p>
</Card>
```

**Phase 4 ProductCard layout** (from `04-UI-SPEC.md` §ProductCard Layout — `aspect-[4/3] bg-muted`, name clamp, Intl price, conditional badge, footer actions):
```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RemoveProductDialog } from './RemoveProductDialog'
import type { Product } from '@/lib/products/get-user-products'

export function ProductCard({ product }: { product: Product }) {
  const [chartOpen, setChartOpen] = useState(false)
  return (
    <Card className="flex flex-col h-full overflow-hidden p-0 gap-0">
      <div className="aspect-[4/3] bg-muted">
        <Image
          src={product.image_url ?? '/placeholder-product.svg'}
          alt={product.name}
          width={400} height={300}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-base font-semibold line-clamp-2">{product.name}</p>
        <p className="text-xl font-semibold">{formatPrice(product.current_price, product.currency)}</p>
        {product.last_scrape_failed_at && (
          <Badge variant="destructive">Tracking failed</Badge>
        )}
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <Button variant="ghost" size="sm" asChild>
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            View Product <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            aria-expanded={chartOpen}
            onClick={() => setChartOpen((v) => !v)}
          >
            {chartOpen ? 'Hide Chart' : 'Show Chart'}
            {chartOpen
              ? <ChevronUp className="h-4 w-4 ml-1" />
              : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
          <RemoveProductDialog productId={product.id} />
        </div>
      </div>
      {chartOpen && (
        <div className="px-4 pb-4">
          <div className="min-h-[200px] bg-muted rounded-lg" aria-hidden="true" />
        </div>
      )}
    </Card>
  )
}

function formatPrice(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}
```

**External link with `rel="noopener noreferrer"`** — required per DASH-05 and `04-UI-SPEC.md` Accessibility Contracts.

**Risks / notes:**
- `next/image` with arbitrary URLs is already whitelisted in `dealdrop/next.config.ts:6-11` (`remotePatterns: [{hostname:'**'}]`). No config change needed.
- `product.last_scrape_failed_at` requires the Phase 4 migration (column does not yet exist in `src/types/database.ts:49-83` — regenerate types after migration push).
- Chart toggle body is an empty `bg-muted` placeholder — Phase 5 fills it.
- `Button` `variant="ghost"` with destructive `text-destructive` class is the UI-SPEC pattern (not `variant="destructive"` — that's for the AlertDialog confirm action).

---

### `src/components/dashboard/AddProductForm.tsx` (Client component, request-response + event-driven)

**Primary analog:** `dealdrop/src/components/auth/AuthModal.tsx` — `'use client'` + `useState` loading + Sonner toast on error + `useAuthModal()` context consumer + Loader2 spinner.

**Client boundary + hooks** (RESEARCH.md Pattern 1 + Pattern 3):
```typescript
'use client'
import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthModal } from '@/components/auth/AuthModalProvider'
import { toastMessageForReason } from '@/lib/firecrawl/toast-messages'
import { addProduct, type AddProductResult } from '@/actions/products'
```

**Loader2 spinner pattern** (verbatim from `dealdrop/src/components/auth/AuthModal.tsx:54`):
```typescript
{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
```

**Toast on action state change** (RESEARCH.md Pattern 1):
```typescript
const [state, formAction] = useActionState(addProduct, null)

useEffect(() => {
  if (!state) return
  if (state.ok) toast.success('Product added!')
  else toast.error(toastMessageForReason(state.reason))
}, [state])
```

**`useFormStatus` child submit button** (RESEARCH.md Don't Hand-Roll — replaces the manual `setIsLoading` seen in `AuthModal.tsx:19,22,52`):
```typescript
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="default" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Track
    </Button>
  )
}
```

**sessionStorage auto-submit (D-03)** (RESEARCH.md Pattern 3):
```typescript
const PENDING_KEY = 'dealdrop:pending-add-url'

useEffect(() => {
  if (!authed) return
  const pending = sessionStorage.getItem(PENDING_KEY)
  if (!pending) return
  sessionStorage.removeItem(PENDING_KEY)
  const input = formRef.current?.elements.namedItem('url') as HTMLInputElement | null
  if (input) { input.value = pending; formRef.current?.requestSubmit() }
}, [authed])
```

**Unauth branch uses `useAuthModal` context consumer** (verbatim import + usage from `dealdrop/src/components/auth/SignInButton.tsx:3,7`):
```typescript
const { openAuthModal } = useAuthModal()
// ...
function handleUnauthSubmit(e: React.FormEvent<HTMLFormElement>) {
  if (authed) return
  e.preventDefault()
  const url = (e.currentTarget.elements.namedItem('url') as HTMLInputElement).value
  sessionStorage.setItem(PENDING_KEY, url)
  openAuthModal()
}
```

**Risks / notes:**
- Do NOT use `type="url"` on the input (UI-SPEC Interaction Contracts — "too strict for pasted URLs"). Use `type="text"` with Zod validation via `validateUrl` from `@/lib/firecrawl/url`.
- `useActionState` (React 19) — NOT `useFormState` (React 18 name). RESEARCH.md State of the Art.
- Shared between `EmptyState` (inline) and `AddProductDialog` (modal) — take `variant?: 'inline' | 'dialog'` prop or pass `authed: boolean` as a prop from the server-side parent.
- `AuthModalProvider` is mounted in `dealdrop/app/layout.tsx:35`, so `useAuthModal()` is reachable from any descendant (RESEARCH.md Assumption A6).

---

### `src/components/dashboard/AddProductDialog.tsx` (Client component, render-only)

**Primary analog:** `dealdrop/src/components/auth/AuthModal.tsx:38-60` — verbatim Shadcn Dialog usage with `DialogContent` + `DialogHeader` + `DialogTitle`.

**Dialog wrapper pattern** (from `dealdrop/src/components/auth/AuthModal.tsx:38-46`):
```typescript
<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Sign in to DealDrop</DialogTitle>
      <DialogDescription>Sign in to start tracking prices</DialogDescription>
    </DialogHeader>
    <div className="mt-6">{/* ... */}</div>
  </DialogContent>
</Dialog>
```

**Phase 4 adaptation** (per `04-UI-SPEC.md` Copywriting Contract — title: "Add a product"):
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddProductForm } from './AddProductForm'

export function AddProductDialog({ onSubmitUrl }: { onSubmitUrl?: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">+ Add Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a product</DialogTitle>
        </DialogHeader>
        <AddProductForm variant="dialog" onSubmitUrl={onSubmitUrl} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

**Risks / notes:**
- `Dialog` is already at `dealdrop/components/ui/dialog.tsx` — do NOT re-install.
- Close the dialog after a successful add (`onSuccess` callback) — the auth modal pattern doesn't need this because the browser redirects away.

---

### `src/components/dashboard/RemoveProductDialog.tsx` (Client component, request-response)

**Primary analog:** `dealdrop/src/components/auth/AuthModal.tsx:17-61` — Dialog-triggered client action + Sonner toast on error; `dealdrop/src/components/auth/SignOutButton.tsx:1-25` — Server Action call from a Client Component.

**AlertDialog composition** (RESEARCH.md Pattern 8 + UI-SPEC §Remove AlertDialog):
```typescript
'use client'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { removeProduct } from '@/actions/products'

export function RemoveProductDialog({ productId }: { productId: string }) {
  async function handleConfirm() {
    const result = await removeProduct(productId)
    if (result.ok) toast.success('Product removed.')
    else toast.error("Couldn't remove that product. Try again.")
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Remove product">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this product?</AlertDialogTitle>
          <AlertDialogDescription>Its price history will be deleted.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Action-call pattern with error toast** (adapted from `dealdrop/src/components/auth/AuthModal.tsx:30-33`):
```typescript
if (error) {
  toast.error('Could not start Google sign-in. Please try again.')
  setIsLoading(false)
}
```

**Risks / notes:**
- `AlertDialog` primitive does NOT yet exist in `dealdrop/components/ui/` — must install via shadcn CLI first (Wave 0).
- `Button variant="ghost" size="icon"` pattern verified against `dealdrop/components/ui/button.tsx:29` (`icon: "size-8"`).
- Optimistic remove at the parent `ProductGrid` level is the UI-SPEC pattern — this dialog just calls the action and shows toast; state management lives upstream.

---

### `src/components/dashboard/SkeletonCard.tsx` (RSC, render-only)

**Primary analog:** `dealdrop/src/components/hero/FeatureCard.tsx` (Card-based RSC; no client state, no hooks).

**Shape** (per `04-UI-SPEC.md` §SkeletonCard Layout):
```typescript
import { Card } from '@/components/ui/card'

export function SkeletonCard() {
  return (
    <Card className="flex flex-col h-full animate-pulse overflow-hidden p-0 gap-0" aria-hidden="true">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-6 bg-muted rounded w-1/3 mt-2" />
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <div className="h-8 bg-muted rounded w-24" />
        <div className="h-8 bg-muted rounded w-24" />
      </div>
    </Card>
  )
}
```

**Risks / notes:**
- `aria-hidden="true"` required per UI-SPEC Accessibility Contracts (screen readers skip placeholder).
- Tailwind `animate-pulse` is built-in — no extra dependency (verify via `dealdrop/app/globals.css:2` which imports `tw-animate-css` for extended animations; `animate-pulse` is a core Tailwind class).

---

### Shadcn primitives (`alert-dialog.tsx`, `badge.tsx`, `input.tsx`, `label.tsx`)

**Primary analog:** `dealdrop/components/ui/dialog.tsx` (Radix wrapper pattern) + `dealdrop/components/ui/button.tsx` (CVA variants pattern).

**Installation** (single command, RESEARCH.md Standard Stack — matches Phase 1 Plan 01-05 precedent):
```bash
cd dealdrop && npx shadcn@latest add alert-dialog badge input label --defaults --force -b radix
```

**Expected dialog.tsx-style pattern** (Radix wrapper — `dealdrop/components/ui/dialog.tsx:5,10-14`):
```typescript
"use client"
import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}
```

**Expected button.tsx-style CVA pattern** (for Badge — `dealdrop/components/ui/button.tsx:7-42`):
```typescript
import { cva, type VariantProps } from "class-variance-authority"
const badgeVariants = cva("...base...", {
  variants: {
    variant: {
      default: "...",
      destructive: "...",
      // ...
    },
  },
  defaultVariants: { variant: "default" },
})
```

**Risks / notes:**
- The project already uses the `radix-ui` umbrella package v1.4.3 (`dealdrop/package.json:23`) — the CLI should emit `import { AlertDialog as AlertDialogPrimitive } from "radix-ui"` (not `@radix-ui/react-alert-dialog`). Verify after install.
- `components.json` is already configured (`style: "new-york"`, `baseColor: "zinc"`) — no init needed.
- If shadcn CLI fails (version skew), fallback is manual primitive authoring per the Phase 1 Plan 01-05 precedent. Deviation note should be surfaced.

---

### `supabase/migrations/0004_add_last_scrape_failed_at.sql` (DB migration)

**Primary analog:** `dealdrop/supabase/migrations/0001_init_schema.sql:20,31-32` (CREATE INDEX idiom) + migration-header comment style from `dealdrop/supabase/migrations/0002_enable_rls.sql:1-4`.

**Header comment style** (verbatim from `dealdrop/supabase/migrations/0002_enable_rls.sql:1-3`):
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Note: ...
```

**Migration body** (RESEARCH.md §Code Examples):
```sql
-- File: dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql
-- DASH-08: track whether the most recent scrape for a product failed.
-- Phase 4 adds the column + renders the badge when non-null.
-- Phase 6 cron writes the timestamp on failure; clears to NULL on next success.

alter table public.products
  add column last_scrape_failed_at timestamptz null;

-- No default; nullable by design. NULL = scraping OK (or never attempted yet).

create index products_last_scrape_failed_at_idx
  on public.products (last_scrape_failed_at)
  where last_scrape_failed_at is not null;
-- Partial index: Phase 6 cron can efficiently find still-failing products without
-- scanning the full table. Uses ~0 space for healthy products.
```

**Risks / notes:**
- Must be followed by `supabase db push` and `supabase gen types typescript --project-id vhlbdcsxccaknccawfdj > src/types/database.ts` (RESEARCH.md Runtime State Inventory + Assumption A5). Without regen, `product.last_scrape_failed_at` is a TypeScript error in `ProductCard`.
- Project linked ID per RESEARCH.md A5: `vhlbdcsxccaknccawfdj` (dealdrop-dev).

---

### Test files

#### `src/actions/products.test.ts` (Vitest, request-response assertions)

**Primary analog:** `dealdrop/src/lib/firecrawl/scrape-product.test.ts` — **EXACT match**. Reuses the `vi.stubEnv` + dynamic-import pattern verbatim.

**Env-stub + dynamic-import header** (verbatim from `dealdrop/src/lib/firecrawl/scrape-product.test.ts:1-28`):
```typescript
import {
  describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll,
} from 'vitest'

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

**Dynamic import guard** (verbatim from `dealdrop/src/lib/firecrawl/scrape-product.test.ts:54-59`):
```typescript
type ProductsActionsModule = typeof import('@/actions/products')
let mod: ProductsActionsModule
beforeAll(async () => {
  mod = await import('@/actions/products')
})
```

**`console.error` spy + mock setup** (verbatim from `dealdrop/src/lib/firecrawl/scrape-product.test.ts:61-74`):
```typescript
let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  vi.restoreAllMocks()
})
```

**Supabase + scrapeProduct + next/cache mocks** (new — no direct analog; inspired by the fetch mock in scrape-product.test.ts:66):
```typescript
vi.mock('@/lib/firecrawl/scrape-product', () => ({
  scrapeProduct: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
```

**Risks / notes:**
- `vitest.config.ts:21-25` already inlines `server-only` — Phase 4 server action tests will resolve `import 'server-only'` to the empty shim and won't throw.
- See `dealdrop/vitest.config.ts:33-38` for the aliased `server-only` path. Do NOT regress this.
- Action tests run in `environment: 'node'` (vitest default per `vitest.config.ts:7`). Component tests (see below) need `// @vitest-environment jsdom` per file.

---

#### `src/lib/firecrawl/toast-messages.test.ts` (Vitest, pure-fn)

**Primary analog:** `dealdrop/src/lib/firecrawl/url.test.ts` — **EXACT match**. No mocks, no env stubs — pure import + assert.

**Minimal header** (verbatim from `dealdrop/src/lib/firecrawl/url.test.ts:1-2`):
```typescript
import { describe, it, expect } from 'vitest'
import { toastMessageForReason } from './toast-messages'
```

**Table-driven assertion pattern** (inspired by `dealdrop/src/lib/firecrawl/url.test.ts:4-36`):
```typescript
describe('toastMessageForReason', () => {
  const cases: Array<[string, string]> = [
    ['invalid_url',      "That URL doesn't look right. Check for typos."],
    ['network_error',    "Couldn't reach that site — try again in a moment."],
    // ... 10 total (7 ScrapeFailureReason + duplicate_url + unauthenticated + db_error)
  ]
  for (const [reason, expected] of cases) {
    it(`${reason} → ${expected}`, () => {
      expect(toastMessageForReason(reason as any)).toBe(expected)
    })
  }
})
```

**Risks / notes:**
- Compile-time exhaustiveness is already enforced in the module itself (`const _exhaustive: never = reason`), so no runtime "unknown case" test is needed — TS will refuse to compile.

---

#### Component tests (`AddProductForm.test.tsx`, `ProductCard.test.tsx`, `ProductGrid.test.tsx`, `EmptyState.test.tsx`, `RemoveProductDialog.test.tsx`)

**Primary analog:** **NONE — no `.test.tsx` file exists in the repo.** This is a Wave 0 gap.

**Wave 0 infrastructure needed** (RESEARCH.md §Wave 0 Gaps):
- Install dev deps: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- Add per-file pragma: `// @vitest-environment jsdom` at top of each `.test.tsx`.
- Update `vitest.config.ts` `test.include` to also match `src/**/*.test.tsx` (currently only matches `*.test.ts` per line 8).

**Risks / notes:**
- Plans MUST sequence component-test infra setup BEFORE writing any `*.test.tsx` file, or the runner silently skips them.
- Keep `environment: 'node'` as the default (per `vitest.config.ts:7`) so action tests stay fast; override per-file with the pragma.
- Mock `next/cache` (`revalidatePath`), `sonner` (`toast.success/error`), and `@/actions/products` in component tests to isolate UI behavior from server state.

---

#### `src/__mocks__/supabase-server.ts` (shared Vitest mock)

**Primary analog:** **NONE — no `__mocks__` dir exists.** This is a Wave 0 gap.

**Suggested shape** (derived from the `fetchMock` pattern in `dealdrop/src/lib/firecrawl/scrape-product.test.ts:62-67`):
```typescript
// src/__mocks__/supabase-server.ts
import { vi } from 'vitest'

export function makeSupabaseMock(overrides: {
  user?: { id: string } | null
  insertProduct?: { data: { id: string } | null; error: { code: string } | null }
  insertHistory?: { error: { code: string } | null }
  deleteError?: { code: string } | null
} = {}) {
  const user = overrides.user === undefined
    ? { id: 'user-test-uuid' }
    : overrides.user
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((_table: string) => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(overrides.insertProduct ?? { data: { id: 'p1' }, error: null }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: overrides.deleteError ?? null }),
      })),
      // ... select, etc.
    })),
  }
}
```

**Risks / notes:**
- Convention for shared mocks is `src/__mocks__/<modulename>.ts` per Vitest docs; must be explicitly imported (not auto-loaded) unless you use `vi.mock('@/lib/supabase/server', () => import('@/__mocks__/supabase-server'))`.
- Keep it typed permissively — Supabase chainable builder types are complex; the goal is to produce the right shape for the action's narrow consumption, not to re-implement PostgrestBuilder.

---

## Shared Patterns

### Pattern A: `'use server'` action entry

**Source:** `dealdrop/src/actions/auth.ts:1` (verbatim directive + import path).
**Apply to:** `src/actions/products.ts`.
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
```

### Pattern B: Auth re-check inside every Server Action

**Source:** RESEARCH.md Pitfall 2 (auth re-check is mandatory). `dealdrop/src/actions/auth.ts` omits this ONLY because it's sign-out (a no-op on logged-out users).
**Apply to:** `src/actions/products.ts` (both `addProduct` and `removeProduct`).
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { ok: false, reason: 'unauthenticated' }
```

### Pattern C: Discriminated-union return + structured `console.error`

**Source:** `dealdrop/src/lib/firecrawl/scrape-product.ts:81-179` (happy-path narrow + branch-ordered failures + `console.error` with structured context, never template-literals).
**Apply to:** All Phase 4 server-side modules (`products.ts`, `get-user-products.ts`).
```typescript
// Good:
console.error('addProduct: products insert failed', { err: insertProductErr })
// Bad (log-injection vector per T-3-04):
console.error(`addProduct: failed for ${rawUrl}`)
```

### Pattern D: `'use client'` marker on any file using hooks

**Source:** `dealdrop/src/components/auth/AuthModalProvider.tsx:1`, `dealdrop/src/components/auth/AuthModal.tsx:1`, `dealdrop/src/components/auth/SignOutButton.tsx:1`.
**Apply to:** `AddProductForm.tsx`, `ProductCard.tsx`, `ProductGrid.tsx`, `AddProductDialog.tsx`, `RemoveProductDialog.tsx`.
**Does NOT apply to:** `DashboardShell.tsx`, `EmptyState.tsx`, `SkeletonCard.tsx` (RSC — no hooks).

### Pattern E: Sonner toast from Client Component

**Source:** `dealdrop/src/components/auth/AuthModal.tsx:4,31` and `dealdrop/src/components/auth/AuthToastListener.tsx:5,13,17`.
**Apply to:** `AddProductForm.tsx`, `RemoveProductDialog.tsx`.
```typescript
import { toast } from 'sonner'
// ...
toast.success('Product added!')
toast.error(toastMessageForReason(state.reason))
```
**Do NOT mount a second `<Toaster />`** — already mounted at `dealdrop/app/layout.tsx:41`.

### Pattern F: `useAuthModal()` context consumer

**Source:** `dealdrop/src/components/auth/SignInButton.tsx:3,7-8` (verbatim import + usage).
**Apply to:** `AddProductForm.tsx` (unauth submit branch — D-03).
```typescript
import { useAuthModal } from '@/components/auth/AuthModalProvider'
const { openAuthModal } = useAuthModal()
```

### Pattern G: Container layout classes

**Source:** `dealdrop/src/components/dashboard/DashboardShell.tsx:9` (current line; preserve in rewrite).
**Apply to:** `DashboardShell.tsx` rewrite only. Children (`EmptyState`, `ProductGrid`) render INSIDE this container; they must NOT wrap themselves in another `max-w-6xl`.
```
max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16
```

### Pattern H: Readonly typed props

**Source:** `dealdrop/src/components/dashboard/DashboardShell.tsx:3-5`, `dealdrop/src/components/hero/FeatureCard.tsx:4-8`, `dealdrop/src/components/header/Header.tsx:5-7`.
**Apply to:** All Phase 4 components that accept props.
```typescript
type DashboardShellProps = Readonly<{ user: User }>
```

### Pattern I: Explicit column-rename on DB insert

**Source:** RESEARCH.md Pitfall 1 — `ProductData.currency_code` maps to `products.currency`.
**Apply to:** `src/actions/products.ts` `addProduct`.
**Verified against:** `dealdrop/src/types/database.ts:62-72` (`products.Insert` has `currency: string`, not `currency_code`).
```typescript
.insert({ currency: result.data.currency_code, /* ... */ })  // explicit
// NEVER: .insert({ ...result.data, user_id })  // shape-mismatch, silent bug
```

### Pattern J: Vitest `vi.stubEnv` + dynamic import

**Source:** `dealdrop/src/lib/firecrawl/scrape-product.test.ts:1-28,54-59`.
**Apply to:** `src/actions/products.test.ts` (action tests import `@/lib/env.server` transitively through `@/lib/supabase/server` → env schema validation).

---

## No Analog Found

| File | Role | Data Flow | Reason | Wave |
|------|------|-----------|--------|------|
| `src/components/dashboard/AddProductForm.test.tsx` | component test | event-driven | No `.test.tsx` file exists yet; `jsdom` not installed | Wave 0 |
| `src/components/dashboard/ProductCard.test.tsx` | component test | event-driven | Same — component-test infra missing | Wave 0 |
| `src/components/dashboard/ProductGrid.test.tsx` | component test | event-driven | Same | Wave 0 |
| `src/components/dashboard/EmptyState.test.tsx` | component test | render-only | Same | Wave 0 |
| `src/components/dashboard/RemoveProductDialog.test.tsx` | component test | event-driven | Same | Wave 0 |
| `src/__mocks__/supabase-server.ts` | shared test mock | support | No `__mocks__` dir exists | Wave 0 |

**Planner action:** Sequence a Wave 0 plan that (1) installs `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`; (2) extends `vitest.config.ts` `test.include` to include `src/**/*.test.tsx`; (3) creates `src/__mocks__/supabase-server.ts`. All component tests depend on this plan landing first.

---

## Metadata

**Analog search scope:**
- `dealdrop/src/actions/**`
- `dealdrop/src/components/**`
- `dealdrop/src/lib/**`
- `dealdrop/src/types/**`
- `dealdrop/app/**`
- `dealdrop/components/ui/**`
- `dealdrop/supabase/migrations/**`
- `dealdrop/vitest.config.ts`

**Files scanned:** 29 existing source / config files read in full, 5 directories listed.

**Pattern extraction date:** 2026-04-20

**Read-only constraint:** No source files were modified during pattern extraction. Only `.planning/phases/04-product-tracking-dashboard/04-PATTERNS.md` was written.
