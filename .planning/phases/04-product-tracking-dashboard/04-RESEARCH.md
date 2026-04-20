# Phase 4: Product Tracking & Dashboard - Research

**Researched:** 2026-04-20
**Domain:** Next.js 16 App Router Server Actions + Supabase SSR + Shadcn (AlertDialog/Badge/Input/Label) + Sonner toast-over-action-state
**Confidence:** HIGH — all patterns verified against installed `node_modules/next/dist/docs/` (Next.js 16.2.4), `@supabase/ssr` 0.10.2, `@supabase/postgrest-js`, the committed Phase 3 `scrapeProduct` contract, and the Phase 1 migration file.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** **Inline form on empty state + modal Dialog thereafter.** A user with zero products sees the add form embedded inline directly under the empty-state headline. Once at least one product exists, the dashboard header shows a "+ Add Product" button that opens a Shadcn Dialog containing the same form. The form component is shared between both surfaces.
- **D-02:** **Optimistic skeleton card.** On submit: (1) client-side Zod URL validation via the shared `@/lib/firecrawl/url` module; (2) skeleton card appended to the grid at position 0 with a temporary client-side ID; (3) fire the Server Action — on `{ok:true}` replace via `revalidatePath('/')`, on `{ok:false}` remove skeleton and show Sonner toast; (4) submit button also disabled with spinner (additive, not alternative).
- **D-03:** **Stash URL in sessionStorage across auth.** Unauth submit writes the raw URL to `sessionStorage['dealdrop:pending-add-url']`, calls `openAuthModal()`, and on post-OAuth remount auto-submits via a `useEffect` read + clear. If auto-submit fails, the URL stays pre-filled in the form.
- **D-04:** **Centered headline + inline form + muted sample-URL hint.** "Track your first product" (action-framed). Subtitle: "Paste a product URL from any site — we'll check the price daily and email you when it drops." One-line sample: "e.g., https://www.amazon.com/dp/XXXXXXXXXX".

### Claude's Discretion (implementation defaults — surface as deviation only if materially changed)

- **Card actions layout:** All three actions always visible in the card footer row. Left: View Product (external, `target="_blank" rel="noopener noreferrer"`). Right: Show Chart (Ghost button, Phase 5 fills body). Far right: Remove (destructive Ghost icon — `Trash2`) opens AlertDialog.
- **Card density & image:** Responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. `<Image>` at fixed `aspect-[4/3]`, `object-contain`, bg `bg-muted`. Name 2-line clamp. Price via `Intl.NumberFormat(undefined, { style: 'currency', currency: <code> })`.
- **Tracking-failed badge data source:** **New migration** adds `products.last_scrape_failed_at TIMESTAMPTZ NULL`. Phase 4 renders the badge when non-null; Phase 6 cron writes/clears it. Phase 4 itself never writes it (initial add is always success — failure at add-time shows toast and no row is inserted).
- **Remove flow:** Optimistic — confirm click removes the card immediately while the Server Action runs; on error, card reappears and toast shows. Confirm copy: "Remove this product? Its price history will be deleted." (honest about CASCADE).
- **Duplicate handling (TRACK-07):** Detected via the existing `products_user_url_unique` constraint. `addProduct` catches PostgrestError `code === '23505'` and returns `{ok:false, reason:'duplicate_url'}` — new reason code owned by Phase 4 (NOT in the Phase 3 `ScrapeFailureReason` union; duplicate is a DB-layer failure, not scrape-layer). Toast: "You're already tracking this product." Grid scrolls to the existing card and applies `ring-2 ring-primary animate-pulse` for 2 seconds (plain `setTimeout`).
- **Reason → toast map (closes Phase 3 D-03):** Single module `@/lib/firecrawl/toast-messages.ts` (client-safe — no `server-only`). Maps every `ScrapeFailureReason` + the Phase 4 `duplicate_url` with exhaustive switch + compile-time check.
- **Revalidation strategy:** `revalidatePath('/')` after every successful mutation. Surgical tag-based revalidation is over-engineered for a single-page dashboard.

### Deferred Ideas (OUT OF SCOPE)

- Search / filter / sort products (future phase if counts justify).
- Bulk select + remove.
- Product categories / tags.
- Multi-currency conversion (explicitly excluded in PROJECT.md — display price in original currency).
- Sharing a tracked product with another user (privacy-first, excluded).
- In-app notification center (v1 is email-only).
- Per-product alert threshold (excluded — v1 uses "any drop" rule).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-01 | Logged-in user with no products sees empty state with prompt to add first | Empty-state layout (UI-SPEC) + `app/page.tsx` RSC data-fetch |
| TRACK-02 | Add Product form accepts URL and submits via Server Action | Server Action data flow section |
| TRACK-06 | Successful scrape inserts one row into `products` AND one row into `price_history` (initial data point) | Atomic insert pattern section |
| TRACK-07 | Duplicate URL for same user returns friendly error (caught via unique constraint) | Duplicate detection via PostgrestError `.code === '23505'` |
| TRACK-08 | Successful add triggers `revalidatePath('/')` so dashboard reflects new product without reload | `revalidatePath` + Next.js 16 docs |
| TRACK-09 | Toast notification confirms successful add; failed add shows error toast | Sonner + `useActionState` error flow |
| DASH-01 | Logged-in homepage shows total count of user's tracked products | Server-side RLS-scoped SELECT pattern |
| DASH-02 | Products render in responsive grid of Shadcn Card | Existing `Card` primitive + CSS grid |
| DASH-03 | Card shows name, Intl-formatted price, image via `<Image>` | `next/image` + existing `remotePatterns: **` wildcard |
| DASH-04 | Card has "Show Chart" toggle revealing/hiding chart inline | `useState` toggle + aria-expanded (Phase 5 fills body) |
| DASH-05 | Card has "View Product" link opening URL in new tab | `<a target="_blank" rel="noopener noreferrer">` |
| DASH-06 | Card has Remove button opening Shadcn AlertDialog for confirmation | `@radix-ui/react-alert-dialog` already installed at `radix-ui` 1.4.3 |
| DASH-07 | Confirmed removal deletes product (cascade) and shows success toast | `ON DELETE CASCADE` from DB-04 migration + Sonner |
| DASH-08 | Card displays "tracking failed" badge when last scrape attempt returned invalid data | New column `last_scrape_failed_at` migration (Phase 4 adds; Phase 6 writes) |
</phase_requirements>

---

## Summary

Phase 4 stitches three already-shipped pieces into the user-facing product management loop: (1) the Phase 3 `scrapeProduct(url)` function (server-only, returns a typed discriminated union), (2) the Phase 2 `createClient()` server Supabase factory (cookie-bound to the request, RLS-enforced via `auth.uid()`), and (3) the Phase 2 `<Toaster />` + `AuthModalProvider` already mounted in `app/layout.tsx`. No new infrastructure is invented — the phase composes existing contracts.

The single non-trivial data flow is the `addProduct` Server Action: validate URL → scrape via Phase 3 → insert `products` row (let the `(user_id, url)` unique constraint catch duplicates via PostgrestError `code === '23505'`) → insert corresponding `price_history` row (RLS ownership-chain check in DB-06 will reject if insert-order is wrong) → `revalidatePath('/')`. Because Supabase doesn't expose client-side transactions across two tables and we don't need cross-row atomicity at portfolio bar, the approach is **two sequential inserts**: if the second insert fails, delete the first (best-effort rollback); log any inconsistency and continue. A SECURITY DEFINER Postgres function wrapping both inserts is the production answer, but out of scope here.

The schema uses column name `currency` (NOT `currency_code`). The Phase 3 `ProductData` shape uses `currency_code`. Plans MUST map `ProductData.currency_code → products.currency` in the insert. This is an easily-missed silent bug because Supabase's generated types accept both keys differently. The insert body should be built explicitly: `{ url, name: data.name, current_price: data.current_price, currency: data.currency_code, image_url: data.image_url, user_id }`.

For the skeleton-card optimistic UX (D-02), the correct React 19 primitive is **`useOptimistic`** (not `useState`). `useOptimistic` is designed exactly for this: maintain a "pending" overlay of local state on top of the server-rendered list, automatically reconciled when `revalidatePath` triggers a fresh RSC render. Pairing `useOptimistic` with a Server Action called from `useActionState` gives: optimistic insert → server returns result → if `ok`, the new RSC render wins and replaces the optimistic card; if error, the optimistic state is automatically rolled back when the action completes with a non-ok state.

**Primary recommendation:** Structure the phase as five components + three server actions + one migration + one shared toast-copy map. Server actions live at `dealdrop/src/actions/products.ts` (`addProduct`, `removeProduct`); a thin data-fetch helper lives at `dealdrop/src/lib/products/get-user-products.ts`. The `AddProductForm` is the only truly interactive client component — the grid, cards, and empty state are Server Components that pass server data into small client islands (`ProductCard` for the remove dialog + chart toggle, `DashboardShell` wrapper for the sessionStorage auto-submit hook).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Fetch user's products for dashboard | Frontend Server (RSC `app/page.tsx` → `DashboardShell`) | — | RLS-scoped SELECT via `createClient()` cookie-bound server client; no client data fetch |
| Add Product form UI (input, submit) | Browser (`AddProductForm` client component) | — | Needs `useActionState` + `useOptimistic` + sessionStorage + `openAuthModal()` |
| URL validation (paste-time) | Browser | Server (defense-in-depth) | D-02 defers to shared `@/lib/firecrawl/url` module; server re-validates via `scrapeProduct` entry guard |
| `addProduct` mutation | API / Backend (Server Action) | — | Writes `products` + `price_history`; Supabase RLS enforces `auth.uid() = user_id` |
| Firecrawl scrape | API / Backend (`scrapeProduct` — server-only DAL) | — | Already exists as Phase 3 deliverable |
| Duplicate-URL detection | Database | API / Backend (PostgrestError catch) | Unique constraint `products_user_url_unique` is the source of truth; Server Action reads `error.code === '23505'` |
| `removeProduct` mutation | API / Backend (Server Action) | — | Single `DELETE` — `price_history` cascades via DB-04 FK |
| Product card + chart toggle + remove-confirm | Browser (`ProductCard` client component) | Frontend Server (RSC grid passes product rows) | AlertDialog, useState toggle, and Trash2 click need the browser |
| Tracking-failed badge | Frontend Server (RSC — reads `products.last_scrape_failed_at` from the already-fetched row) | — | Conditional rendering; no client interactivity |
| Reason → toast copy mapping | Browser (`@/lib/firecrawl/toast-messages.ts` — client-safe module) | — | Invoked from `AddProductForm` when action returns `{ok:false}` |
| Sonner toast rendering | Browser | — | `<Toaster />` already mounted in layout; `toast.*()` calls fire from client components |
| Session-aware submit branch (auth check before scrape) | Browser | API / Backend (verify again in action) | Client calls `openAuthModal()` when unauth; Server Action re-checks `auth.getUser()` per data-security.md |
| `revalidatePath('/')` | API / Backend (inside Server Action) | — | `next/cache` — only callable server-side |
| `last_scrape_failed_at` schema migration | Database | — | Single SQL file `0004_add_last_scrape_failed_at.sql`; Phase 4 ships migration + badge render only |

---

## Standard Stack

### Core (already installed — do NOT reinstall)

| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4 `[VERIFIED: package.json]` | App Router, Server Actions, `revalidatePath`, `<Image>` | Locked platform per FND-01 |
| `react` / `react-dom` | 19.2.4 `[VERIFIED: package.json]` | `useActionState`, `useOptimistic`, `useFormStatus` | React 19 is the first version where these three compose cleanly for the skeleton-card pattern |
| `@supabase/ssr` | 0.10.2 `[VERIFIED: package.json]` | `createServerClient()` → used by `createClient()` | Already wired in Phase 2; RLS enforcement is implicit |
| `@supabase/supabase-js` | 2.103.3 `[VERIFIED: package.json]` | PostgrestError with `.code` field | `[CITED: node_modules/@supabase/postgrest-js/src/PostgrestError.ts]` — exposes `code` directly |
| `zod` | 4.3.6 `[VERIFIED: package.json]` | URL shape validation (shared with Phase 3) | Same instance as Phase 3; no dual-zod problem here |
| `sonner` | 2.0.7 `[VERIFIED: package.json]` | `toast.success` / `toast.error` | `<Toaster />` already mounted in `app/layout.tsx:41` |
| `lucide-react` | 1.8.0 `[VERIFIED: package.json]` | `Trash2`, `ExternalLink`, `ChevronDown`/`ChevronUp`, `Plus`, `Loader2` | Already used in Hero/Auth; consistent icon language |
| `radix-ui` (umbrella) | 1.4.3 `[VERIFIED: package.json]` | `react-alert-dialog` sub-package — no separate install | `[VERIFIED: node_modules/@radix-ui/react-alert-dialog exists]` |
| `@base-ui/react` | 1.4.0 `[VERIFIED: package.json]` | Already installed (Dialog primitives) | No new install |

### Supporting (need to add via shadcn CLI)

| Component | Install Command | Purpose |
|-----------|-----------------|---------|
| Shadcn `alert-dialog` | `npx shadcn@latest add alert-dialog` | DASH-06 confirmation |
| Shadcn `badge` | `npx shadcn@latest add badge` | DASH-08 "Tracking failed" badge |
| Shadcn `input` | `npx shadcn@latest add input` | URL field in AddProductForm |
| Shadcn `label` | `npx shadcn@latest add label` | URL field label |

`[CITED: https://ui.shadcn.com/docs/cli]` — single command can install multiple components: `npx shadcn@latest add alert-dialog badge input label`. Confirmed by Phase 1 Plan 01-05 precedent: shadcn 4.3.x dropped interactive prompts — use `--defaults --force -b radix` if scripting.

### Alternatives Considered (REJECTED)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Server Action for add/remove | Route Handler (`/api/products`) + fetch | Server Actions give native `revalidatePath` + `useFormStatus` + `useOptimistic` with zero plumbing. Route Handlers need manual fetch + error mapping + auth re-check. Server Actions are the default for mutations per `node_modules/next/dist/docs/01-app/02-guides/forms.md`. |
| `react-hook-form` | Shadcn `Form` wrapper (RHF-based) | Over-engineered for one input field. Plain `<form action={addProduct}>` with `useActionState` is 10 lines; RHF adds ~50KB + schema binding complexity. UI-SPEC explicitly lists RHF as optional. |
| Supabase transaction (RPC) | Two sequential inserts with rollback | Portfolio bar; "let the second insert run, delete the first if it fails" is acceptable. Production answer is a SECURITY DEFINER RPC — out of scope. |
| `useState` + manual list management for optimistic UI | `useOptimistic` | React 19 canonical for exactly this pattern. Auto-reconciles with RSC re-render; no imperative cleanup. |
| Custom duplicate-detection SELECT before insert | Let unique constraint raise, catch `code === '23505'` | Race-condition-free (two concurrent submits still fan to the DB correctly), one round-trip instead of two. `[CITED: PostgreSQL error code 23505 = unique_violation]` |
| Follow HTTP redirects before insert to canonicalize | `normalizeUrl` only | Phase 3 D-06 explicitly deferred redirect-following. Same choice here. |

**Installation (run once at plan start):**
```bash
cd dealdrop && npx shadcn@latest add alert-dialog badge input label --defaults --force -b radix
```

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  User (authenticated)                                                        │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ paste URL, click "Track"
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AddProductForm  (client component, 'use client')                           │
│  - Zod URL validation via @/lib/firecrawl/url (shared w/ server)            │
│  - useActionState(addProduct, { ok: null })                                 │
│  - useOptimistic(products, (prev, newUrl) => [skeleton, ...prev])           │
│  - useFormStatus() for spinner                                               │
│  - If unauth: write sessionStorage['dealdrop:pending-add-url'] →            │
│    openAuthModal()  (NO scrape attempted)                                   │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │ form action
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  addProduct Server Action  ('use server', src/actions/products.ts)          │
│                                                                              │
│  1. const supabase = await createClient()      // cookie-bound, RLS-scoped  │
│  2. const { data: { user } } = await supabase.auth.getUser()                │
│     if (!user) return { ok: false, reason: 'unauthenticated' }              │
│  3. const result = await scrapeProduct(rawUrl)  // Phase 3 DAL              │
│     if (!result.ok) return { ok: false, reason: result.reason }             │
│  4. const normalizedUrl = normalizeUrl(rawUrl)  // shared util              │
│  5. INSERT products { url: normalizedUrl, user_id: user.id, ...data,        │
│                       currency: data.currency_code }                        │
│     catch PostgrestError where code === '23505' →                            │
│       return { ok: false, reason: 'duplicate_url' }                         │
│  6. INSERT price_history { product_id, price: current_price, currency }     │
│     if fails → delete products row (best-effort rollback); return error     │
│  7. revalidatePath('/')                                                     │
│  8. return { ok: true }                                                     │
└──────┬───────────────────────────┬──────────────────────────────────────────┘
       │                           │
       ▼                           ▼
┌──────────────────────┐  ┌─────────────────────────────────────────────────┐
│ Supabase Postgres    │  │ Firecrawl API (external)                         │
│  products (RLS on)   │  │  POST /v2/scrape {url, formats, onlyMain, ...}   │
│  price_history (RLS) │  │  → { success, data.json: {product_name, ...} }   │
│  unique(user_id,url) │  └─────────────────────────────────────────────────┘
│  CASCADE DELETE      │
└──────────────────────┘
                     │ revalidatePath('/')
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  app/page.tsx  (RSC re-renders)                                              │
│  → DashboardShell fetches products via createClient() + RLS                 │
│  → count === 0 ? <EmptyState> : <ProductGrid products={...} />              │
└─────────────────────────────────────────────────────────────────────────────┘

Remove flow (symmetric, simpler):
  ProductCard (client) → AlertDialog confirm → removeProduct(productId) →
  DELETE products WHERE id=$1 (RLS prevents cross-user) → price_history cascades →
  revalidatePath('/') → toast.success
```

### Component Responsibilities

| Component | Tier | File | Responsibility |
|-----------|------|------|----------------|
| `app/page.tsx` | RSC | existing | Branch auth; pass `user` to `DashboardShell` |
| `DashboardShell` | RSC (wraps client island) | `src/components/dashboard/DashboardShell.tsx` (rewrite) | Fetch products server-side via RLS; render `EmptyState` (inline form) or `ProductGrid` (header + add button) |
| `EmptyState` | RSC | `src/components/dashboard/EmptyState.tsx` | Centered layout + inline `<AddProductForm variant="inline">` |
| `ProductGrid` | RSC | `src/components/dashboard/ProductGrid.tsx` | Header with count + `<AddProductDialog>`; grid of `<ProductCard>` |
| `ProductCard` | client | `src/components/dashboard/ProductCard.tsx` | `<Image>`, name, Intl price, footer actions; `useState` for chart toggle; contains `<RemoveProductDialog>` |
| `AddProductForm` | client | `src/components/dashboard/AddProductForm.tsx` | Shared between inline + dialog variants. `useActionState` + `useOptimistic` (lifted to parent if skeleton card needs to live in grid) + sessionStorage effect + `openAuthModal()` fallback |
| `AddProductDialog` | client | `src/components/dashboard/AddProductDialog.tsx` | Shadcn `Dialog` wrapping `AddProductForm` in modal variant |
| `RemoveProductDialog` | client | `src/components/dashboard/RemoveProductDialog.tsx` | Shadcn `AlertDialog`; calls `removeProduct` server action |
| `SkeletonCard` | RSC (pure CSS `animate-pulse`) | `src/components/dashboard/SkeletonCard.tsx` | Placeholder shape during optimistic insert |
| `addProduct` action | 'use server' | `src/actions/products.ts` | Auth check → scrape → insert products → insert price_history → revalidatePath |
| `removeProduct` action | 'use server' | `src/actions/products.ts` | Auth check → DELETE (RLS + cascade) → revalidatePath |
| Data helper `getUserProducts` | server module | `src/lib/products/get-user-products.ts` | Single source for RLS-scoped `SELECT * FROM products` ordered by created_at desc |
| Toast copy map | client-safe | `src/lib/firecrawl/toast-messages.ts` | Exhaustive `ScrapeFailureReason \| 'duplicate_url'` → string mapping |

### Recommended Project Structure

```
dealdrop/src/
├── actions/
│   ├── auth.ts                 # existing (signOut)
│   └── products.ts             # NEW — addProduct + removeProduct
├── components/
│   └── dashboard/
│       ├── DashboardShell.tsx  # REWRITE — fetch + branch
│       ├── EmptyState.tsx      # NEW
│       ├── ProductGrid.tsx     # NEW
│       ├── ProductCard.tsx     # NEW ('use client')
│       ├── AddProductForm.tsx  # NEW ('use client')
│       ├── AddProductDialog.tsx # NEW ('use client')
│       ├── RemoveProductDialog.tsx # NEW ('use client')
│       └── SkeletonCard.tsx    # NEW (RSC, pure CSS)
├── lib/
│   ├── firecrawl/
│   │   └── toast-messages.ts   # NEW (client-safe; closes P3 D-03)
│   └── products/
│       └── get-user-products.ts # NEW (RSC data helper)
└── components/ui/
    ├── alert-dialog.tsx        # NEW (shadcn)
    ├── badge.tsx               # NEW (shadcn)
    ├── input.tsx               # NEW (shadcn)
    └── label.tsx               # NEW (shadcn)

dealdrop/supabase/migrations/
└── 0004_add_last_scrape_failed_at.sql  # NEW (DASH-08 data source)
```

### Pattern 1: Server Action with `useActionState` + Sonner error toast

**What:** React 19 canonical form-mutation pattern. Server Action returns a discriminated union; client consumes via `useActionState`; `useEffect` on state change fires a Sonner toast.
**When to use:** Every mutation path in Phase 4.

```typescript
// src/actions/products.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import { normalizeUrl } from '@/lib/firecrawl/url'
import type { ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'

export type AddProductResult =
  | { ok: true }
  | { ok: false; reason: ScrapeFailureReason | 'duplicate_url' | 'unauthenticated' | 'db_error' }

export async function addProduct(
  _prevState: AddProductResult | null,
  formData: FormData,
): Promise<AddProductResult> {
  const rawUrl = String(formData.get('url') ?? '')

  const supabase = await createClient()
  // Always re-verify auth inside the Server Action, even if the page-level RSC already checked.
  // Per node_modules/next/dist/docs/01-app/02-guides/data-security.md — page-level auth does
  // NOT extend to Server Actions. Actions are separate POST entry points and must re-check.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthenticated' }

  // scrapeProduct re-validates and normalizes URL internally (D-07 defense-in-depth).
  const result = await scrapeProduct(rawUrl)
  if (!result.ok) return { ok: false, reason: result.reason }

  const normalizedUrl = normalizeUrl(rawUrl)
  // NOTE: ProductData.currency_code maps to products.currency (column naming difference).
  const { data: product, error: insertProductErr } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      url: normalizedUrl,
      name: result.data.name,
      current_price: result.data.current_price,
      currency: result.data.currency_code,  // key rename
      image_url: result.data.image_url,
    })
    .select('id')
    .single()

  if (insertProductErr) {
    if (insertProductErr.code === '23505') return { ok: false, reason: 'duplicate_url' }
    console.error('addProduct: products insert failed', { err: insertProductErr })
    return { ok: false, reason: 'db_error' }
  }

  const { error: insertHistoryErr } = await supabase.from('price_history').insert({
    product_id: product.id,
    price: result.data.current_price,
    currency: result.data.currency_code,
  })

  if (insertHistoryErr) {
    // best-effort rollback — RLS allows own-row delete
    await supabase.from('products').delete().eq('id', product.id)
    console.error('addProduct: price_history insert failed; rolled back product', { err: insertHistoryErr })
    return { ok: false, reason: 'db_error' }
  }

  revalidatePath('/')
  return { ok: true }
}
```

```typescript
// src/components/dashboard/AddProductForm.tsx
'use client'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { toastMessageForReason } from '@/lib/firecrawl/toast-messages'
import { addProduct, type AddProductResult } from '@/actions/products'

const initial: AddProductResult | null = null

export function AddProductForm() {
  const [state, formAction] = useActionState(addProduct, initial)

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Product added!')
    } else {
      toast.error(toastMessageForReason(state.reason))
    }
  }, [state])

  return (
    <form action={formAction} className="flex gap-2 w-full max-w-md">
      <input name="url" type="text" required className="flex-1 ..." />
      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : 'Track'}</button>
}
```

### Pattern 2: `useOptimistic` for skeleton-card insertion

**What:** React 19's optimistic state primitive; automatically reverts when the underlying data source changes (via revalidatePath).
**When to use:** Skeleton card in D-02.

```typescript
// src/components/dashboard/ProductGrid.tsx (client wrapper)
'use client'
import { useOptimistic } from 'react'
import type { Product } from '@/types/products'

export function OptimisticGrid({ products }: { products: Product[] }) {
  const [optimistic, addOptimistic] = useOptimistic<Product[], string>(
    products,
    (current, pendingUrl) => [
      { id: `pending-${pendingUrl}`, url: pendingUrl, __pending: true } as any,
      ...current,
    ]
  )

  return (
    <>
      <AddProductForm onSubmitUrl={addOptimistic} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {optimistic.map(p =>
          (p as any).__pending
            ? <SkeletonCard key={p.id} />
            : <ProductCard key={p.id} product={p} />
        )}
      </div>
    </>
  )
}
```

**Key constraint:** `useOptimistic` MUST be called inside a client component. The parent grid becomes a client island. `products` is passed in from the server component `DashboardShell` — serialization is fine because the shape is plain JSON.

### Pattern 3: Unauth submit with sessionStorage persistence (D-03)

```typescript
// inside AddProductForm
'use client'
import { useEffect, useRef } from 'react'
import { useAuthModal } from '@/components/auth/AuthModalProvider'

const PENDING_KEY = 'dealdrop:pending-add-url'

export function AddProductForm({ authed }: { authed: boolean }) {
  const { openAuthModal } = useAuthModal()
  const formRef = useRef<HTMLFormElement>(null)

  // D-03 auto-submit on mount if a pending URL is stashed AND we're now authed
  useEffect(() => {
    if (!authed) return
    const pending = sessionStorage.getItem(PENDING_KEY)
    if (!pending) return
    sessionStorage.removeItem(PENDING_KEY)
    const input = formRef.current?.elements.namedItem('url') as HTMLInputElement | null
    if (input) {
      input.value = pending
      formRef.current?.requestSubmit()
    }
  }, [authed])

  function handleUnauthSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (authed) return // allow the form action to proceed
    e.preventDefault()
    const url = (e.currentTarget.elements.namedItem('url') as HTMLInputElement).value
    sessionStorage.setItem(PENDING_KEY, url)
    openAuthModal()
  }
  // ...
}
```

### Pattern 4: PostgrestError duplicate detection

```typescript
// Pattern verified against @supabase/postgrest-js PostgrestError.ts:
// class PostgrestError extends Error { code: string; details: string; hint: string }
const { error } = await supabase.from('products').insert({...}).select().single()
if (error?.code === '23505') {
  // PostgreSQL unique_violation — products_user_url_unique was the only unique constraint
  // besides the primary key, and primary key violation is impossible (gen_random_uuid default)
  return { ok: false, reason: 'duplicate_url' }
}
```

`[CITED: https://www.postgresql.org/docs/current/errcodes-appendix.html]` — SQLSTATE 23505 = unique_violation.

### Pattern 5: RLS-scoped data fetch in RSC

```typescript
// src/lib/products/get-user-products.ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type Product = Tables<'products'>

export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createClient()
  // RLS policy products_select_own enforces user_id = auth.uid() — we don't need .eq('user_id', ...)
  // because the policy is the source of truth. Extra filter is harmless but redundant.
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

### Pattern 6: Intl currency formatting (DASH-03)

```typescript
// src/components/dashboard/ProductCard.tsx
function formatPrice(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    // Fallback if the code is somehow not ISO 4217 (shouldn't happen — Phase 3 validates)
    return `${code} ${amount.toFixed(2)}`
  }
}
```

`[CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat]` — `style: 'currency'` requires a valid ISO 4217 code or throws. Phase 3 guarantees that via the branch-ordered `invalid_currency` check.

### Pattern 7: `next/image` with wildcard `remotePatterns`

```typescript
<Image
  src={product.image_url ?? '/placeholder-product.svg'}
  alt={product.name}
  width={400}
  height={300}
  className="object-contain w-full h-full"
/>
```

`[VERIFIED: dealdrop/next.config.ts]` already has `remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }]` from Phase 1 — no config change needed. Permissive allowlist is an intentional Phase 7 hardening candidate.

**Note:** For a user-provided image URL, there's a real failure mode where Firecrawl returns `image_url: null` (valid per `ProductData.image_url: string | null`). Plans MUST handle the null case — see `SkeletonCard` pattern or a tiny `/placeholder-product.svg` SVG file. UI-SPEC shows `bg-muted` background handles the "no image" look.

### Pattern 8: Shadcn AlertDialog for destructive confirm

```typescript
// src/components/dashboard/RemoveProductDialog.tsx
'use client'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { removeProduct } from '@/actions/products'
import { toast } from 'sonner'

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
          >Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Anti-Patterns to Avoid

- **Do NOT build a Route Handler for add/remove.** Server Actions are the correct abstraction. Route Handlers for mutations adds a fetch layer for zero benefit.
- **Do NOT pre-check for duplicate URL with a SELECT before INSERT.** Race condition between two concurrent submits + extra round-trip. Let the unique constraint raise and catch `23505`.
- **Do NOT pass `user_id` from the client to Server Actions.** Read it from `supabase.auth.getUser()` inside the action. Passing client-provided user_id is the canonical IDOR vulnerability per data-security.md.
- **Do NOT use `supabase.auth.getSession()` for auth checks inside server code.** Use `getUser()` — `getSession()` reads an unverified JWT from cookies. `getUser()` re-validates against Supabase Auth server.
- **Do NOT try to set cookies from a Server Component-invoked Supabase client.** The existing `createClient()` in `supabase/server.ts` already swallows the cookie-set exception — this is intentional per `@supabase/ssr` docs. Server Actions CAN set cookies, and `proxy.ts` writes the refreshed session on every request.
- **Do NOT add `currency_code` as a column alias in the insert.** The DB column is `currency` — insert `{ currency: data.currency_code }` explicitly. The generated `Database['public']['Tables']['products']['Insert']` type catches this mistake at compile time.
- **Do NOT call `scrapeProduct` from the client.** Will fail build via the `import 'server-only'` guard (Plan 03-04 regression-tests this).
- **Do NOT hydrate the grid with a client-side fetch.** The RSC `DashboardShell` already reads on the server — a client fetch adds round-trips and loses RLS automatic scoping.
- **Do NOT mount a second `<Toaster />`.** Phase 2 mounted one at `app/layout.tsx:41`. Second toaster causes duplicate toasts.
- **Do NOT use `middleware.ts`.** Next.js 16 renamed the convention to `proxy.ts`. The rename is already applied; plans must not introduce `middleware.ts` even for "small helpers."
- **Do NOT forget `await cookies()` in server clients.** Next.js 16 breaking change — sync `cookies()` access was removed. Existing `supabase/server.ts` already awaits correctly; new modules that read cookies must do the same.
- **Do NOT store the user's pending URL in localStorage.** Use sessionStorage per D-03 — tab-scoped, auto-expires, can't leak across sessions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL validation | Custom regex, `URL` constructor wrapped in try/catch | `validateUrl()` from `@/lib/firecrawl/url` (already exists) | Shared rules with Phase 3; D-05 protocol allowlist + D-08 max length encoded once |
| URL normalization | Manual string munging of utm_*, trailing slashes | `normalizeUrl()` from `@/lib/firecrawl/url` | Unique-constraint duplicate detection MUST match the normalization scrapeProduct applies, or duplicates slip through |
| Firecrawl call | Re-implementing fetch + Zod + retry | `scrapeProduct()` from Phase 3 | Phase 3 contract is the public API |
| Duplicate detection | `SELECT count(*) WHERE url = ...` before insert | Postgres unique constraint + catch `error.code === '23505'` | Race-safe, one round-trip |
| Optimistic UI | `useState([])` + manual array management + revert on error | `useOptimistic` | React 19 auto-reconciles with revalidation |
| Form pending state | Manual `isSubmitting` boolean + effect | `useFormStatus()` in child submit button | Automatic, scoped to form context |
| Action error-to-toast | Wiring callbacks from action → component | `useActionState` + `useEffect([state])` | Canonical pattern per forms.md |
| Confirm dialog | Custom Dialog with manual focus trap | Shadcn `AlertDialog` (Radix-based) | Radix handles `aria-modal`, focus trap, escape-to-close natively |
| Currency formatting | String concat `${code}${amount}` | `Intl.NumberFormat(undefined, { style: 'currency', currency: code })` | Locale-aware symbol placement; INR `₹1,299.99` vs USD `$1,299.99` handled automatically |
| Image proxying | Custom `<img>` with srcset logic | `next/image` + existing `remotePatterns: **` | Already configured; automatic WebP/AVIF, lazy-loading |
| Modal auth trigger | New modal implementation | `openAuthModal()` from `AuthModalProvider` (Phase 2) | Already exported, already wired in `app/layout.tsx` |
| Session refresh | Custom cookie handling | Existing `proxy.ts` (Phase 2) | Already runs on every request |
| Supabase server client | Creating a new factory | `createClient()` from `@/lib/supabase/server` | Already handles async `cookies()` and RSC cookie-write no-op |
| Product data fetch | Mixing query logic into `DashboardShell` | New `getUserProducts()` DAL helper | Single source of truth; reusable for Phase 5 chart |

**Key insight:** Phase 4 should be roughly 90% plumbing of already-built pieces and 10% new code. The new code is: the two Server Actions, seven components (one rewrite + six new), one migration, and one toast-map module. Everything else is import + compose.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `products` + `price_history` tables are empty in dev (Phase 1 created schema but no seed). RLS policies active. Phase 4 is the first phase to write real user rows. | Nothing to migrate — first users write first rows. |
| Live service config | None — Phase 4 introduces no external services. Firecrawl was wired in Phase 3 with env var already set. | None — `FIRECRAWL_API_KEY` already present per Phase 1 FND-02. |
| OS-registered state | None. | None. |
| Secrets / env vars | `FIRECRAWL_API_KEY`, `SUPABASE_*` already configured in `dealdrop/.env.local` from Phase 1. No new env vars added by Phase 4. | None. |
| Build artifacts | None — no build/install step dependencies introduced by Phase 4 beyond the four shadcn component files (which are generated into `dealdrop/components/ui/`). | Run `npx shadcn@latest add alert-dialog badge input label` once; artifacts land in tracked files. |

**Migration note:** The new column `products.last_scrape_failed_at` MUST be added via a new numbered migration file (`0004_add_last_scrape_failed_at.sql`) and pushed with `supabase db push`. Phase 1 Plan 01-04 precedent shows this works cleanly on the linked project (`vhlbdcsxccaknccawfdj` / dealdrop-dev). After migration, regenerate types: `supabase gen types typescript --project-id vhlbdcsxccaknccawfdj > src/types/database.ts`. Plans MUST include the type-regeneration step or TypeScript will not know about the new column.

---

## Common Pitfalls

### Pitfall 1: Column name drift — `currency_code` vs `currency`
**What goes wrong:** The Phase 3 `ProductData` type uses `currency_code` (ISO-prefixed semantic name). The DB column is plain `currency`. Copy-pasting the ProductData object into a Supabase insert without renaming will either throw a TypeScript error (if the generated `Database` types are up to date) or silently write `null` to `currency` and leave `currency_code` ignored.
**Why it happens:** Human eye treats the two as synonyms; TypeScript catches it only if you spread `...result.data` into the insert object without explicit mapping.
**How to avoid:** Never spread `ProductData` into the insert. Always write: `{ currency: result.data.currency_code }` explicitly.
**Warning signs:** TypeScript error `Argument of type 'ProductData' is not assignable to parameter of type 'TablesInsert<"products">'`; silent success in dev with NULL currency column (caught by `NOT NULL` constraint raising).

### Pitfall 2: Auth check forgotten in Server Action
**What goes wrong:** Server Actions are exposed as POST endpoints regardless of whether any UI imports them. An attacker can invoke `addProduct` with arbitrary FormData even if the page-level auth redirect already fired for the UI.
**Why it happens:** Developers assume RSC-level auth protects downstream actions.
**How to avoid:** Every Server Action starts with `const { data: { user } } = await supabase.auth.getUser(); if (!user) return { ok: false, reason: 'unauthenticated' }`. Per `node_modules/next/dist/docs/01-app/02-guides/data-security.md` — page auth does NOT extend to actions.
**Warning signs:** No `supabase.auth.getUser()` or equivalent at the top of the action. Audit by grepping `'use server'` files.

### Pitfall 3: `useOptimistic` outside a client component
**What goes wrong:** Calling `useOptimistic` inside a Server Component throws a build error like "hooks can only be called from client components."
**Why it happens:** `useOptimistic` is a React 19 hook; hooks require the client module boundary.
**How to avoid:** Wrap the grid in a `'use client'` component (`OptimisticGrid`) that receives `products: Product[]` as a prop. The parent `DashboardShell` stays RSC, fetches on the server, and passes plain JSON down.
**Warning signs:** Build error at `useOptimistic`; fix is to add `'use client'` at the top of the file.

### Pitfall 4: `revalidatePath` during render
**What goes wrong:** Calling `revalidatePath('/')` inside a Server Component render body throws an error.
**Why it happens:** `revalidatePath` is a mutation primitive; Next.js explicitly blocks side effects during rendering.
**How to avoid:** Only call `revalidatePath` inside Server Actions or Route Handlers. Never at the top of an RSC.
**Warning signs:** Error `revalidatePath cannot be called during render`.

### Pitfall 5: `next/image` with an invalid external URL
**What goes wrong:** Firecrawl can return an invalid URL (e.g. relative path, CDN that 404s) for `product_image_url`. `<Image>` renders a broken image icon with console noise.
**Why it happens:** Our wildcard `remotePatterns` allows any host, so Next.js Image Optimization attempts the fetch and falls back to the broken icon if the upstream fails.
**How to avoid:** (1) Fall back to a committed `/placeholder-product.svg` when `image_url` is null; (2) consider `onError` handler on Image to swap to placeholder at runtime. Portfolio bar accepts the occasional broken image — don't over-engineer.
**Warning signs:** Console errors `Failed to load resource`. Acceptable at portfolio bar.

### Pitfall 6: Duplicate unique-constraint catch matching wrong error
**What goes wrong:** Catching the Postgres error too broadly (e.g. `if (error) return 'duplicate'`) misclassifies network errors, RLS denials (`42501`), or NOT NULL violations as duplicates.
**Why it happens:** Developers assume "any insert error on this table must be the unique constraint."
**How to avoid:** Check `error.code === '23505'` specifically. Every other error code returns `'db_error'` and logs server-side.
**Warning signs:** Users reporting "duplicate" toast for URLs they've never added.

### Pitfall 7: `price_history` insert failing after `products` insert succeeded
**What goes wrong:** Without a transaction, a race (unlikely) or RLS misconfiguration can leave a product row without its initial history point. This breaks the Phase 5 "chart has at least one data point" assumption.
**Why it happens:** Two round-trips to Postgres, no atomicity.
**How to avoid:** Best-effort rollback — if `price_history` insert fails, `DELETE FROM products WHERE id=$1` (RLS allows own-row delete). Log the inconsistency. Accept the rare edge where BOTH inserts fail and log-only cleanup is impossible.
**Warning signs:** Products with zero `price_history` rows (query to detect: `SELECT id FROM products p WHERE NOT EXISTS (SELECT 1 FROM price_history h WHERE h.product_id = p.id)`).

### Pitfall 8: AlertDialog not trapping focus on mobile
**What goes wrong:** On iOS Safari, missing `aria-modal` or incorrect z-index can let background content steal focus.
**Why it happens:** Custom dialog implementations miss accessibility details.
**How to avoid:** Use Shadcn's AlertDialog (Radix-based) as-is — do not re-implement. Radix handles focus trap, aria-modal, and escape key natively.
**Warning signs:** Tab key escapes the dialog; screen reader announces background content.

### Pitfall 9: Missing `'use client'` on `AddProductForm`
**What goes wrong:** `useActionState`, `useOptimistic`, `useFormStatus`, and `useEffect` all fail without the client boundary marker.
**Why it happens:** Authors forget that hooks require `'use client'`.
**How to avoid:** Every component file that calls a hook starts with `'use client'` on line 1. Grep for files using hooks without the marker as part of plan verification.

### Pitfall 10: Stale dashboard after OAuth auto-submit (D-03)
**What goes wrong:** After OAuth callback, the page re-renders in SSR first with user present but `products: []` (before the new row is written), then the auto-submit action runs and writes. But if `revalidatePath('/')` fires in the action, the page MAY render once more without the new row if timing races.
**Why it happens:** The server-side data fetch in `DashboardShell` happens during the initial render, before the auto-submit action completes.
**How to avoid:** `useOptimistic` hides this — the skeleton card appears immediately on submit, and the real card replaces it on next RSC render triggered by `revalidatePath`. Without `useOptimistic`, the user sees "added but dashboard is empty" for a beat.

### Pitfall 11: Layout file currently has no Server Component data fetch timing protection
**What goes wrong:** If `DashboardShell` renders before the OAuth redirect-sessioned cookies have propagated, `auth.getUser()` can return null and the component assumes empty state.
**Why it happens:** Race between the `/auth/callback` Set-Cookie and the subsequent `/` render.
**How to avoid:** Phase 2 `proxy.ts` refreshes session cookies on every request, so by the time RSC runs, cookies are fresh. No action needed — just confirm via smoke test.

---

## Code Examples

### Complete `addProduct` Server Action (reference)

Source: Pattern 1 above. All fields verified against `dealdrop/src/types/database.ts` generated types and the Phase 3 `ProductData` contract.

### Complete migration (DASH-08 data source)

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

### Reason → toast copy map (closes Phase 3 D-03)

```typescript
// File: dealdrop/src/lib/firecrawl/toast-messages.ts
// Client-safe — NO `import 'server-only'`.
// Consumed by: src/components/dashboard/AddProductForm.tsx
//
// Exhaustive over ScrapeFailureReason ∪ Phase 4 'duplicate_url' ∪
// Phase 4 'unauthenticated' ∪ Phase 4 'db_error'.

import type { ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'

export type ToastableReason =
  | ScrapeFailureReason
  | 'duplicate_url'
  | 'unauthenticated'
  | 'db_error'

export function toastMessageForReason(reason: ToastableReason): string {
  switch (reason) {
    case 'invalid_url':       return "That URL doesn't look right. Check for typos."
    case 'network_error':     return 'Couldn\'t reach that site — try again in a moment.'
    case 'scrape_timeout':    return 'That page took too long to load. Try a different URL.'
    case 'missing_price':     return "We couldn't find a price on that page."
    case 'missing_name':      return "We couldn't find a product name on that page."
    case 'invalid_currency':  return "That page's currency format isn't supported yet."
    case 'duplicate_url':     return "You're already tracking this product."
    case 'unauthenticated':   return 'Please sign in and try again.'
    case 'db_error':          return 'Something went wrong saving that. Try again later.'
    case 'unknown':           return 'Something went wrong. Try again later.'
    default: {
      // Compile-time exhaustiveness — if a new reason is added without updating
      // this switch, _exhaustive has type `never` and TS fails here.
      const _exhaustive: never = reason
      void _exhaustive
      return 'Something went wrong. Try again later.'
    }
  }
}
```

### `removeProduct` Server Action (reference)

```typescript
// src/actions/products.ts (continued)
export async function removeProduct(productId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase.from('products').delete().eq('id', productId)
  // RLS policy products_delete_own already enforces user_id = auth.uid();
  // the .eq('id', productId) is just the WHERE selector.
  if (error) {
    console.error('removeProduct: delete failed', { productId, err: error })
    return { ok: false }
  }
  // price_history cascades via FK (DB-04 migration).
  revalidatePath('/')
  return { ok: true }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` + SWR mutate | RSC fetch + Server Action + `revalidatePath` | Next.js 13 / React 19 stable | Eliminates the fetch+mutate dual-path; one canonical form |
| `useState([])` + manual optimistic list | `useOptimistic` | React 19 stable | Auto-reconciliation with server state |
| `useFormState` | `useActionState` | React 19 renamed April 2024 | Same API, new name — plans must use `useActionState` |
| `middleware.ts` | `proxy.ts` | Next.js 16 breaking | Already applied in this project |
| `cookies()` sync | `await cookies()` | Next.js 16 breaking | Already applied in `supabase/server.ts` |
| Firecrawl v1 `formats: ['extract']` | Firecrawl v2 `formats: [{type:'json',schema,prompt}]` | Firecrawl v2 released 2025 | Applied in Phase 3 |
| Manual cookie writes in route handlers | `@supabase/ssr` getAll/setAll pair | Supabase SSR 0.10+ | Applied in Phase 2 |
| Shadcn CLI interactive prompts | `--defaults --force -b radix` non-interactive | Shadcn 4.x (March 2026) | Phase 1 Plan 01-05 documented this precedent |

**Deprecated / outdated:**
- `useFormState` (replaced by `useActionState`).
- `middleware.ts` (replaced by `proxy.ts` in Next.js 16).
- Firecrawl v1 SDK with zod@3 peer dep — don't import `@mendable/firecrawl-js` anywhere; it would pull zod@3 into the tree.
- `onLoadingComplete` on `<Image>` — replaced by `onLoad`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Two sequential inserts (products, then price_history) with best-effort rollback is acceptable at portfolio bar | Summary + Pattern 1 + Pitfall 7 | If user hits rare race, a product exists with no history. Phase 5 chart handles zero-row case per its success criteria; low impact. |
| A2 | Shadcn `AlertDialog`, `Badge`, `Input`, `Label` install cleanly via `npx shadcn@latest add ...` in the new-york/zinc style | Standard Stack install step | If install fails, plans have the Phase 1 Plan 01-05 precedent (deviations table) to fall back on manual primitive authoring |
| A3 | The `useOptimistic` skeleton pattern correctly reconciles after `revalidatePath('/')` without manual cleanup | Pattern 2 | If reconciliation has a visible flash, fallback is manual `useState` list management — 20 lines of additive code |
| A4 | `supabase.from('products').delete().eq('id', productId)` + RLS policy `products_delete_own` is sufficient for cross-user DELETE protection | Pattern Remove + Anti-Patterns | RLS is DB-tested in Phase 1 Plan 01-04 for SELECT; DELETE policy was created but not impersonation-tested. LOW risk — policy is declarative. |
| A5 | `supabase gen types typescript --project-id vhlbdcsxccaknccawfdj` works after the `0004_add_last_scrape_failed_at.sql` push | Runtime State Inventory | If regen fails (auth token expired), plans need manual type editing of `database.ts` — trivial fallback |
| A6 | The `AuthModalProvider` context is reachable from `AddProductForm` nested inside `DashboardShell` (both under the provider in layout.tsx) | Pattern 3 | Verified: `app/layout.tsx:35` wraps all children in `<AuthModalProvider>`; any descendant can call `useAuthModal()`. Zero risk. |
| A7 | `toast.success('Signed out')` from the OAuth-return path does not collide with `toast.success('Product added!')` from the auto-submit | D-03 auto-submit | Sonner stacks toasts by default; two separate success toasts render in sequence. Acceptable UX. |

---

## Open Questions

1. **Should the skeleton card show the pasted URL?**
   - What we know: D-02 says "shimmer placeholder" without specifying content. UI-SPEC §SkeletonCard shows pure gray blocks — no content.
   - What's unclear: Users might appreciate seeing the URL they pasted mid-scrape for reassurance.
   - Recommendation: Follow UI-SPEC (pure gray blocks). Deviation only if user testing shows it feels broken.

2. **Should `removeProduct` log the product name before deleting (for audit)?**
   - What we know: Phase 6 cron will log scrape failures. Remove is user-initiated.
   - What's unclear: Phase 4 has no audit-log infrastructure. Portfolio bar.
   - Recommendation: `console.log({ action: 'removeProduct', productId, userId })` at minimum. No separate audit table needed.

3. **What happens if a logged-out user's sessionStorage URL becomes stale (they abandon the tab, come back a day later, sign in via a different flow)?**
   - What we know: sessionStorage expires when the tab closes. But if the tab stays open, the URL persists.
   - What's unclear: Auto-submitting a URL the user forgot about might feel magical or creepy.
   - Recommendation: Ship D-03 as-written; surface as a Phase 7 polish question if user testing shows confusion.

4. **Should `addProduct` return the new product ID so the optimistic card can transition to the real card without a full revalidation?**
   - What we know: `revalidatePath('/')` triggers a full RSC re-render; `useOptimistic` handles the transition automatically.
   - What's unclear: Whether returning the ID enables a smoother animation.
   - Recommendation: Defer — portfolio bar. Return `{ ok: true }` only.

5. **Does Phase 4 need to handle a user deleting their Supabase auth account mid-session?**
   - What we know: `auth.users` CASCADE deletes `products` (FK). `getUser()` would return null on the next request.
   - Recommendation: Out of scope. The sign-out button handles the normal case; account deletion is a Phase 7+ concern.

---

## Project Constraints (from CLAUDE.md)

Verified directives from `dealdrop/CLAUDE.md` (via `@AGENTS.md`) and root `./CLAUDE.md`:

### Must follow

1. **Next.js 16 has breaking changes from training data.** Plans MUST consult `node_modules/next/dist/docs/` before writing new Next.js-specific code. Training knowledge of Next.js 14/15 patterns is hypothesis, not fact.
2. **Use `proxy.ts` (not `middleware.ts`).** Already applied.
3. **Server Actions + async Request APIs (`await cookies()`, `await headers()`).** Already applied in `supabase/server.ts`.
4. **`@t3-oss/env-nextjs` Zod validation for all env vars** (FND-02). No `process.env.X` reads in production code — only in `env.ts` / `env.server.ts`.
5. **Three distinct Supabase clients** (FND-05). Phase 4 uses `createClient()` (server) only. Never import `createAdminClient` here — that's Phase 6.
6. **Eslint CLI directly** (FND-07). Already in `package.json`.
7. **Portfolio/demo quality bar.** Works end-to-end; presentable; not production-hardened. Guides the "best-effort rollback" call over a SECURITY DEFINER RPC.
8. **Google OAuth only.** No password / magic-link flows.
9. **Single currency per product; no FX conversion.** Display `Intl.NumberFormat(undefined, { style: 'currency', currency: <stored_code> })`.
10. **Any-site URL support is non-negotiable.** No domain allowlist, no denial of valid https URLs.

### Forbidden

1. Class-based React components (functional only).
2. Re-authoring Phase 3's `scrapeProduct` logic.
3. Reading `process.env.*` outside `env.ts` / `env.server.ts`.
4. Mounting a second `<Toaster />`.
5. Bypassing the GSD workflow for plan/execute phases.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16 runtime | ✓ | 24.15.0 `[VERIFIED: CLAUDE.md]` | — |
| npm | Package install | ✓ | 11.12.1 `[VERIFIED: CLAUDE.md]` | — |
| Supabase CLI | Push `0004_add_last_scrape_failed_at.sql` | ✓ (2.92.1 dev dep) `[VERIFIED: package.json]` | 2.92.1 | — |
| Supabase linked project | `supabase db push` | ✓ (`vhlbdcsxccaknccawfdj` linked per STATE.md [Phase 01]) | — | — |
| `FIRECRAWL_API_KEY` | `scrapeProduct` calls | ✓ (Phase 1 FND-02) | — | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (not used in Phase 4) | ✓ | — | — |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Server + browser Supabase clients | ✓ | — | — |
| Shadcn CLI | `npx shadcn@latest add ...` | ✓ (shadcn 4.3 dev dep) | 4.3.0 | — |
| Vitest | Unit test suites | ✓ | 3.2.4 | — |
| Google OAuth (dev project) | Sign-in flow (user-facing testing) | ✓ (Phase 2 complete) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 `[VERIFIED: package.json]` |
| Config file | `dealdrop/vitest.config.ts` (exists; includes `server-only` alias and `@` → `src` alias) |
| Quick run command | `cd dealdrop && npx vitest run src/actions src/lib/firecrawl/toast-messages src/lib/products` |
| Full suite command | `cd dealdrop && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-01 | Empty state renders when RLS returns zero products | unit (component) | `npx vitest run src/components/dashboard/EmptyState.test.tsx` | ❌ Wave 0 |
| TRACK-02 | Form submits URL via Server Action (not a separate POST) | unit | `npx vitest run src/components/dashboard/AddProductForm.test.tsx` | ❌ Wave 0 |
| TRACK-06 | `addProduct` writes both tables on success (mocked Supabase) | unit | `npx vitest run src/actions/products.test.ts -t "happy path"` | ❌ Wave 0 |
| TRACK-07 | `addProduct` returns `duplicate_url` on PostgrestError code 23505 | unit | `npx vitest run src/actions/products.test.ts -t "duplicate"` | ❌ Wave 0 |
| TRACK-08 | `addProduct` calls `revalidatePath('/')` on success | unit (spy) | `npx vitest run src/actions/products.test.ts -t "revalidate"` | ❌ Wave 0 |
| TRACK-09 | Toast fires on action success / failure | unit | `npx vitest run src/components/dashboard/AddProductForm.test.tsx -t "toast"` | ❌ Wave 0 |
| DASH-01 | Count renders above grid | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "count"` | ❌ Wave 0 |
| DASH-02 | Grid renders one ProductCard per row | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "grid"` | ❌ Wave 0 |
| DASH-03 | Card formats price via `Intl.NumberFormat` using stored `currency` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "price format"` | ❌ Wave 0 |
| DASH-04 | Show Chart toggle switches state and `aria-expanded` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "chart toggle"` | ❌ Wave 0 |
| DASH-05 | View Product link has `target="_blank" rel="noopener noreferrer"` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "view link"` | ❌ Wave 0 |
| DASH-06 | Remove opens AlertDialog (focus trap per Radix) | unit (component) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "opens"` | ❌ Wave 0 |
| DASH-07 | Confirm → action called → success toast | unit (component + action spy) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "confirms"` | ❌ Wave 0 |
| DASH-08 | Badge renders only when `last_scrape_failed_at` non-null | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "failed badge"` | ❌ Wave 0 |
| — | Toast map is exhaustive over `ScrapeFailureReason` ∪ Phase 4 cases | unit | `npx vitest run src/lib/firecrawl/toast-messages.test.ts` | ❌ Wave 0 |
| — | RLS — user A cannot SELECT user B's products (impersonation test) | integration (Supabase REST with authenticated role) | `npx vitest run src/__integration__/rls.test.ts` | ❌ Wave 0 (optional — Phase 1 Plan 01-04 already verified SELECT RLS; Phase 4 relies on the same policies) |
| — | Build-time `server-only` guard: `scrapeProduct` still not importable from `'use client'` | integration | Manual regression: add temporary `'use client'` import, `npm run build` must fail | Manual per Phase 3 Plan 03-04 precedent |
| — | `@ import 'server-only'` still absent from `toast-messages.ts` (client-safe) | unit | `grep -c "server-only" src/lib/firecrawl/toast-messages.ts` → 0 | Lint check |

### Sampling Rate
- **Per task commit:** `cd dealdrop && npx vitest run src/actions src/lib/firecrawl/toast-messages src/lib/products src/components/dashboard`
- **Per wave merge:** `cd dealdrop && npx vitest run`
- **Phase gate:** Full suite green + `npm run build` succeeds + one manual end-to-end smoke (paste URL, add, remove) before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/__mocks__/supabase-server.ts` — shared Supabase client mock with configurable success / PostgrestError responses (reusable by action tests).
- [ ] `src/actions/products.test.ts` — covers addProduct happy path, scrape failure, duplicate URL (23505), DB error rollback path, unauthenticated, revalidatePath spy, removeProduct happy + unauth.
- [ ] `src/components/dashboard/AddProductForm.test.tsx` — covers form submit, useActionState state transitions, Sonner toast call, unauth openAuthModal branch, sessionStorage auto-submit.
- [ ] `src/components/dashboard/ProductCard.test.tsx` — covers Intl price, View Product link, chart toggle aria-expanded, failed badge conditional.
- [ ] `src/components/dashboard/RemoveProductDialog.test.tsx` — covers AlertDialog open, confirm → action call, toast on success / failure.
- [ ] `src/components/dashboard/ProductGrid.test.tsx` — covers count pluralization, empty vs populated branching.
- [ ] `src/components/dashboard/EmptyState.test.tsx` — copy matches D-04 verbatim.
- [ ] `src/lib/firecrawl/toast-messages.test.ts` — exhaustive switch test (every reason maps to a non-empty string; compile-time never-check is already in the module).
- [ ] Testing-library React + JSDOM setup: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` dev deps + `vitest.config.ts` `environment: 'jsdom'` override for component tests (keep `node` default for action tests, override per-file via `// @vitest-environment jsdom`).
- [ ] Mock `next/cache` to spy on `revalidatePath` calls in action tests.
- [ ] Mock `@/lib/firecrawl/scrape-product` in action tests (already mockable because it's a regular module; `vi.mock` + `vi.stubEnv` pattern from Phase 3 Plan 03-03 applies here).
- [ ] Human-verify checkpoint: end-to-end manual test on localhost (sign in, paste a known-good URL like `https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html` which Phase 3 fixture confirmed works, verify card appears with correct price/image, remove it, verify gone).

---

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/02-guides/forms.md` — Server Actions + `useActionState` + `useFormStatus` + `useOptimistic` canonical examples (this is the source of truth for Next.js 16).
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md` — Server Action auth re-check requirement; DAL pattern; rate-limiting notes.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — exact `revalidatePath(path, type?)` signature and Server Action usage.
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — `proxy.ts` / `middleware.ts` rename; async `cookies()` / `headers()`.
- `dealdrop/src/lib/firecrawl/scrape-product.ts` (committed Phase 3 deliverable) — public `scrapeProduct` signature, `ScrapeResult`, exact import paths.
- `dealdrop/src/lib/firecrawl/types.ts` — `ScrapeFailureReason` closed union + compile-time exhaustiveness pattern (mirror in Phase 4 toast map).
- `dealdrop/src/lib/firecrawl/url.ts` — `validateUrl`, `normalizeUrl` (client-safe, shared with Phase 4 client form).
- `dealdrop/src/types/database.ts` — generated Supabase types; column name `currency` (not `currency_code`).
- `dealdrop/supabase/migrations/0001_init_schema.sql` — unique constraint `products_user_url_unique`, CASCADE DELETE on `price_history.product_id`.
- `dealdrop/supabase/migrations/0002_enable_rls.sql` — `products_select_own`, `products_insert_own`, `products_update_own`, `products_delete_own`, `price_history_insert_own` (ownership-chain).
- `dealdrop/node_modules/@supabase/postgrest-js/src/PostgrestError.ts` — `PostgrestError.code: string` exposure.
- `dealdrop/src/lib/supabase/server.ts` — `createClient()` cookie-bound server factory (Phase 2).
- `dealdrop/src/components/auth/AuthModalProvider.tsx` — `useAuthModal().openAuthModal()` client context.
- `dealdrop/app/layout.tsx` — `<Toaster />` mount location (do not re-mount).
- `dealdrop/next.config.ts` — `images.remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }]`.
- `dealdrop/vitest.config.ts` — existing test setup (server-only alias precedent for Phase 4 action tests).
- `.planning/phases/02-authentication-landing/02-RESEARCH.md` — Supabase SSR 0.10.2 getAll/setAll pattern; Shadcn 4.3 non-interactive install precedent.
- `.planning/phases/03-firecrawl-integration/03-03-SUMMARY.md` — `vi.stubEnv` + dynamic-import test pattern (reusable verbatim for Phase 4 action tests).
- `.planning/phases/03-firecrawl-integration/03-CONTEXT.md` §D-03 — "Phase 4 owns the reason → toast-copy map" (closed by this research).

### Secondary (MEDIUM confidence)

- `[CITED: https://www.postgresql.org/docs/current/errcodes-appendix.html]` — SQLSTATE 23505 = unique_violation.
- `[CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat]` — Intl.NumberFormat currency style contract.
- `[CITED: https://ui.shadcn.com/docs/cli]` — `npx shadcn@latest add <...components>` multi-install.
- Shadcn docs: [Alert Dialog](https://ui.shadcn.com/docs/components/radix/alert-dialog), [Dialog](https://ui.shadcn.com/docs/components/radix/dialog) — verified Radix wrappers; no third-party registry blocks needed per UI-SPEC Registry Safety table.

### Tertiary (LOW confidence)

- None — every Phase 4 technical claim was verifiable from installed `node_modules` or committed Phase 1-3 artifacts.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency installed and pinned; Shadcn CLI command verified by Phase 1 precedent.
- Architecture: HIGH — patterns verified against `node_modules/next/dist/docs/` (official Next.js 16 docs).
- Pitfalls: HIGH — all 11 pitfalls trace to either committed code (column naming, RLS) or canonical docs (Server Action auth re-check, useOptimistic boundary).
- Validation architecture: MEDIUM — test patterns derived from Phase 3 Plan 03-03 work and React Testing Library conventions; requires Wave 0 setup of component-test infrastructure (jsdom + testing-library not yet installed).
- Runtime state inventory: HIGH — empty tables in dev; no live service config; one new migration fully specified.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stack is stable; only risk is Shadcn CLI drift or Supabase SSR minor rev).

Sources:
- [Alert Dialog - shadcn/ui](https://ui.shadcn.com/docs/components/radix/alert-dialog)
- [Dialog - shadcn/ui](https://ui.shadcn.com/docs/components/radix/dialog)
- [shadcn CLI - shadcn/ui](https://ui.shadcn.com/docs/cli)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Intl.NumberFormat - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
