# Architecture Research

**Domain:** E-commerce price-tracking web app (Next.js + Supabase)
**Researched:** 2026-04-17
**Confidence:** HIGH — based on official Next.js 16 docs (read from installed package), Supabase RLS and pg_cron documentation, and established patterns for this stack combination.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Hero / Land │  │  AuthModal   │  │  Dashboard   │                  │
│  │  (RSC)       │  │  (Client)    │  │  Grid (RSC)  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                  │                          │
│         │          ┌──────┴───────┐  ┌───────┴────────┐                │
│         │          │ AddProduct   │  │ ProductCard     │                │
│         │          │ Form(Client) │  │ + ChartToggle   │                │
│         │          └──────┬───────┘  │ (Client)        │                │
└─────────┼─────────────────┼──────────┴───────┬─────────┴────────────────┘
          │                 │                  │
          │       Server Actions / Route Handlers
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼──────────────────────────┐
│                     NEXT.JS SERVER (Vercel)                             │
│         │                 │                  │                          │
│  ┌──────┴──────┐  ┌───────┴──────┐  ┌────────┴──────┐                  │
│  │ app/page.tsx│  │ actions/     │  │ app/api/cron/ │                  │
│  │ (RSC, auth  │  │ products.ts  │  │ check-prices/ │                  │
│  │  branch)    │  │ email.ts     │  │ route.ts      │                  │
│  └──────┬──────┘  └───────┬──────┘  └────────┬──────┘                  │
│         │                 │                  │                          │
│  ┌──────┴─────────────────┴──────────────────┴──────┐                  │
│  │                   lib/                            │                  │
│  │  supabase.ts  firecrawl.ts  resend.ts  types.ts  │                  │
│  └────────────────────────┬──────────────────────────┘                  │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────┐
│                     SUPABASE (External)                                 │
│                           │                                             │
│  ┌──────────┐  ┌──────────┴────┐  ┌──────────────┐                     │
│  │  Auth    │  │   Postgres    │  │   pg_cron    │                     │
│  │ (Google  │  │  products +   │  │  (daily job  │                     │
│  │  OAuth)  │  │ price_history │  │   → POST     │                     │
│  └──────────┘  └───────────────┘  │  /api/cron)  │                     │
│                                   └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │  External APIs              │
              │  Firecrawl  │  Resend       │
              └─────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| `app/page.tsx` | Single dynamic page — reads session server-side, branches to Hero or Dashboard | React Server Component; uses `supabase.auth.getUser()` to gate views |
| `app/layout.tsx` | Root HTML shell, Sonner `<Toaster>`, Supabase session provider | Server Component with `<Toaster>` client island injected |
| `components/AuthModal` | Shadcn Dialog wrapping Supabase OAuth sign-in button | `"use client"` — manages open/close state, calls `supabase.auth.signInWithOAuth` |
| `components/Hero` | Landing page for logged-out visitors; triggers AuthModal | Server Component with a client "Sign In" button child |
| `components/AddProductForm` | URL input + submit; calls `addProduct` server action | `"use client"` — manages optimistic state, calls server action |
| `components/Dashboard` | Fetches products + price_history, renders product grid | React Server Component; data-fetches directly via Supabase server client |
| `components/ProductCard` | Displays product image, name, price, action buttons | `"use client"` — owns chart toggle, remove confirmation state |
| `components/PriceChart` | Recharts `<LineChart>` of price_history data | `"use client"` — Recharts requires client |
| `actions/products.ts` | `addProduct`, `removeProduct` server actions | `'use server'` module; auth check → Firecrawl → Supabase insert → revalidatePath |
| `actions/email.ts` | `sendPriceDropAlert` server action | `'use server'`; Resend API call with HTML template |
| `app/api/cron/check-prices/route.ts` | `GET` (health-check) + `POST` (cron job) Route Handler | Bearer token validation → iterate all products → Firecrawl → DB update → Resend |
| `lib/supabase.ts` | Supabase client factories (server vs browser) | `createServerClient` (cookies) + `createBrowserClient` |
| `lib/firecrawl.ts` | Firecrawl `scrape()` wrapper with typed JSON schema | Returns `{ name, current_price, currency_code, image_url }` |
| `lib/resend.ts` | Resend `emails.send()` wrapper with HTML template | Renders inline HTML price-drop email |
| `lib/types.ts` | Shared TypeScript types: `Product`, `PriceHistory`, `ScrapeResult` | Pure type file, no runtime code |

---

## Recommended Project Structure

```
dealdrop/
├── app/
│   ├── layout.tsx                    # Root layout: HTML shell, Toaster, metadata
│   ├── page.tsx                      # Single dynamic page: auth branch (RSC)
│   ├── loading.tsx                   # Suspense skeleton for dashboard load
│   ├── error.tsx                     # Root error boundary
│   └── api/
│       └── cron/
│           └── check-prices/
│               └── route.ts          # GET (health) + POST (cron job)
│
├── components/
│   ├── AuthModal.tsx                 # "use client" — Shadcn Dialog + Google OAuth
│   ├── Hero.tsx                      # Landing view for logged-out users (RSC)
│   ├── Dashboard.tsx                 # Product grid, data-fetches server-side (RSC)
│   ├── AddProductForm.tsx            # "use client" — URL paste + submit form
│   ├── ProductCard.tsx               # "use client" — card with chart toggle + remove
│   ├── PriceChart.tsx                # "use client" — Recharts line chart
│   └── ui/                           # Shadcn auto-generated UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ... (shadcn add output)
│
├── actions/
│   ├── products.ts                   # addProduct, removeProduct server actions
│   └── email.ts                      # sendPriceDropAlert server action
│
├── lib/
│   ├── supabase.ts                   # createServerClient + createBrowserClient
│   ├── firecrawl.ts                  # scrapeProduct() typed wrapper
│   ├── resend.ts                     # sendAlert() wrapper + email HTML template
│   └── types.ts                      # Shared TS types (Product, PriceHistory, etc.)
│
├── public/                           # Favicon, OG image
├── .env.local                        # SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
│                                     # FIRECRAWL_API_KEY, RESEND_API_KEY, CRON_SECRET
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Structure Rationale

- **`app/` is routing-only:** Only Next.js special files live here (`page`, `layout`, `route`, `loading`, `error`). No business logic inside page files — they delegate to components/actions/lib.
- **`components/` is flat, not nested by route:** DealDrop has a single route (`/`), so route-based splitting adds noise. Flat component list is clear at this scale.
- **`components/ui/` is shadcn territory:** Shadcn CLI generates into here. Never hand-edit these files — re-run `npx shadcn add` if needed.
- **`actions/` is the mutation layer:** All `'use server'` functions live here. Keeps page files and components free of `'use server'` inline declarations. Both Server Components and Client Components can import from here.
- **`lib/` is the integration layer:** Each external service has exactly one file. Server actions import from lib; nothing else does. `lib/supabase.ts` exports two factories — one for server (cookies-based) and one for browser — prevents client-server mismatch.
- **No `src/` wrapper:** The scaffold already has `app/` at root. Adding `src/` now would require updating `tsconfig.json` paths and `tailwind.config` — not worth the churn on a greenfield.
- **`.env.local` holds all secrets:** `SUPABASE_SERVICE_ROLE_KEY` is only read in `actions/` and `app/api/cron/`. Never exposed to browser. `SUPABASE_ANON_KEY` is safe for browser client (RLS enforces access).

---

## Architectural Patterns

### Pattern 1: Server Component Auth Branch (Single Dynamic Page)

**What:** `app/page.tsx` calls `supabase.auth.getUser()` server-side, then conditionally renders `<Hero>` or `<Dashboard>` — no client-side redirect, no extra route.

**When to use:** When the entire product lives at a single URL and the UI differs dramatically by auth state. Avoids a separate `/dashboard` route and middleware-based redirects.

**Trade-offs:** Simple and zero-flash. Downside: page is always dynamic (no static caching). Acceptable for a logged-in dashboard; unacceptable for a public marketing page — but here the hero is cheap to render.

```typescript
// app/page.tsx
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import Hero from '@/components/Hero'
import Dashboard from '@/components/Dashboard'

export default async function Page() {
  const supabase = createServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Hero />
  return <Dashboard userId={user.id} />
}
```

### Pattern 2: Server Actions as the Mutation Layer

**What:** Client components call typed server action functions (from `actions/`) instead of hitting API routes for mutations. Next.js automatically serializes the call over POST.

**When to use:** For any user-initiated mutation (add product, remove product). Keeps the happy path co-located with the UI component that triggers it.

**Trade-offs:** Simpler than API routes for UI-triggered mutations. Auth check must be inside every action — the client can call actions directly via POST, bypassing the UI. Never trust the client.

```typescript
// actions/products.ts
'use server'
import { createServerClient } from '@/lib/supabase'
import { scrapeProduct } from '@/lib/firecrawl'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function addProduct(formData: FormData) {
  const supabase = createServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const url = formData.get('url') as string
  const scraped = await scrapeProduct(url)

  const { error } = await supabase.from('products').insert({
    user_id: user.id,
    url,
    name: scraped.name,
    current_price: scraped.current_price,
    currency: scraped.currency_code,
    image_url: scraped.image_url,
  })
  if (error) throw new Error(error.message)

  // Also insert initial price_history row
  await supabase.from('price_history').insert({ /* ... */ })

  revalidatePath('/')
}
```

### Pattern 3: Route Handler for Cron Webhook (not a Server Action)

**What:** The pg_cron job issues an HTTP POST to `/api/cron/check-prices`. This must be a Route Handler (not a Server Action) because pg_cron issues raw HTTP — not a browser form POST.

**When to use:** Any server-to-server webhook. The caller is not a browser, so Server Actions don't apply. Route Handlers handle arbitrary HTTP callers.

**Trade-offs:** Requires manual Bearer token validation (no Supabase session cookie). Must use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) to read ALL users' products — the cron runs as a privileged background worker, not as any individual user.

```typescript
// app/api/cron/check-prices/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... iterate products, scrape, compare, email
  return NextResponse.json({ checked: n, alerted: m })
}
```

---

## Data Flow

### Flow 1: Add Product (URL Paste → Scrape → DB → Dashboard Refresh)

```
User types URL → AddProductForm (Client Component)
    │
    │  form.action = addProduct (Server Action)
    ↓
addProduct() [actions/products.ts, server]
    │
    ├─ supabase.auth.getUser()  ← verify session (mandatory)
    │
    ├─ scrapeProduct(url)  ← lib/firecrawl.ts
    │       └─ POST https://api.firecrawl.dev/v1/scrape
    │              with JSON schema { name, current_price, currency_code, image_url }
    │              returns structured JSON or throws
    │
    ├─ supabase.from('products').insert(...)
    │       with unique constraint (user_id, url) — duplicate returns 23505 error
    │
    ├─ supabase.from('price_history').insert(...)
    │       initial price row for the new product
    │
    └─ revalidatePath('/')  ← tells Next.js to re-fetch RSC tree for /
            │
            ↓
    Dashboard RSC re-runs on next request → fresh product list streamed to browser
    Client: Sonner toast("Product added") shown via useFormState / useActionState
```

### Flow 2: Cron Job (pg_cron → Check All Products → Conditional Email)

```
Supabase pg_cron scheduler (09:00 AM daily)
    │
    │  SELECT cron.schedule('daily-check', '0 9 * * *',
    │    $$SELECT net.http_post(
    │      url := 'https://dealdrop.vercel.app/api/cron/check-prices',
    │      headers := '{"Authorization": "Bearer <CRON_SECRET>"}',
    │      body := '{}'
    │    )$$
    │  )
    ↓
POST /api/cron/check-prices  [Route Handler]
    │
    ├─ Validate Authorization: Bearer <CRON_SECRET>  → 401 if missing/wrong
    │
    ├─ supabaseAdmin.from('products').select('*, price_history(*)')
    │       uses SERVICE_ROLE_KEY → bypasses RLS → reads ALL users' products
    │
    └─ for each product:
            │
            ├─ scrapeProduct(product.url)  ← lib/firecrawl.ts
            │       on scrape failure: update products SET last_scrape_failed=true
            │       skip price comparison for this product, continue loop
            │
            ├─ if newPrice === lastPrice → skip (no change)
            │
            ├─ supabaseAdmin.from('price_history').insert(newPriceRow)
            │
            ├─ supabaseAdmin.from('products').update({ current_price: newPrice })
            │
            └─ if newPrice < lastPrice:
                    │
                    └─ sendPriceDropAlert(product, oldPrice, newPrice)
                            └─ resend.emails.send({
                                 to: user.email,
                                 subject: 'Price drop on {product.name}',
                                 html: template(product, oldPrice, newPrice, dropPercent)
                               })
    │
    └─ return { checked: N, alerted: M, failed: F }
```

### Flow 3: Dashboard Render (Page Load → RSC Data Fetch → Client Hydration)

```
Browser GET /
    │
    ↓
app/page.tsx [RSC]
    │
    ├─ supabase.auth.getUser()  (server-side, reads session cookie)
    │       user = null → render <Hero /> (static-ish, no DB query)
    │       user = {id, email} → render <Dashboard userId={user.id} />
    │
    └─ <Dashboard> [RSC]
            │
            ├─ supabase.from('products')
            │       .select('*, price_history(*)')
            │       .eq('user_id', userId)
            │       .order('created_at', { ascending: false })
            │
            │   RLS enforces user isolation at DB level — even if userId were wrong,
            │   only matching rows return.
            │
            └─ for each product → <ProductCard product={p} /> [Client Component]
                    │
                    ├─ Renders name, price, image, action buttons
                    ├─ "Show Chart" toggle → local useState, mounts <PriceChart>
                    └─ "Remove" button → confirmation → calls removeProduct(id)
                                                                (Server Action)
```

### Flow 4: Auth (Google OAuth via Supabase)

```
User clicks "Sign In" (Hero or unauth add-product attempt)
    │
    └─ AuthModal opens (Shadcn Dialog, "use client")
            │
            └─ supabase.auth.signInWithOAuth({ provider: 'google',
                 options: { redirectTo: window.location.origin } })
                    │
                    └─ Browser redirects → Google OAuth → Supabase callback
                            │
                            └─ Supabase sets session cookie
                                    │
                                    └─ Browser redirects back to /
                                            │
                                            └─ page.tsx RSC now sees user → Dashboard
```

---

## RLS Policy Design

**Principle:** RLS is the authoritative security boundary for user data. Server Actions re-check auth as a defense-in-depth layer. The cron route handler uses SERVICE_ROLE_KEY (bypasses RLS intentionally).

### `products` table policies

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Users can only select their own products
CREATE POLICY "users_select_own_products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert products for themselves
CREATE POLICY "users_insert_own_products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own products
CREATE POLICY "users_update_own_products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own products
CREATE POLICY "users_delete_own_products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);
```

### `price_history` table policies

```sql
-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Users can select price_history for products they own
CREATE POLICY "users_select_own_price_history"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = price_history.product_id
        AND products.user_id = auth.uid()
    )
  );

-- Users can insert price_history for their own products
CREATE POLICY "users_insert_own_price_history"
  ON price_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = price_history.product_id
        AND products.user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies for price_history — history is immutable from user perspective
-- The cascade delete on product removal handles cleanup at the DB level (FK ON DELETE CASCADE)
```

**Cron worker:** Uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. This key must never be exposed to the browser. Only used in `app/api/cron/check-prices/route.ts` and only after Bearer token validation.

**Supabase client split:**
- `createServerClient(cookies())` — uses ANON_KEY + user's session cookie. RLS applies. Used in Server Actions and RSC data fetches.
- `createBrowserClient()` — uses ANON_KEY, runs in browser. RLS applies. Used in AuthModal for OAuth sign-in flow.
- `createAdminClient()` — uses SERVICE_ROLE_KEY. RLS bypassed. Only used in cron Route Handler.

---

## Build Order (Dependency Graph)

Build in this order because each step unblocks the next:

```
Step 1: Environment & Supabase foundation
  ├─ .env.local with all keys
  ├─ lib/supabase.ts (server + browser clients)
  ├─ lib/types.ts (Product, PriceHistory types)
  ├─ Supabase DB: create tables + RLS policies + pg_cron extension
  └─ UNBLOCKS: everything else

Step 2: Auth layer
  ├─ Configure Google OAuth in Supabase dashboard
  ├─ components/AuthModal.tsx (Shadcn Dialog + signInWithOAuth)
  ├─ app/page.tsx auth branch skeleton (Hero vs Dashboard shell)
  └─ UNBLOCKS: any feature requiring user identity

Step 3: Firecrawl integration
  ├─ lib/firecrawl.ts (scrapeProduct wrapper, typed schema)
  └─ UNBLOCKS: addProduct action, cron worker

Step 4: Add product flow (core loop part 1)
  ├─ actions/products.ts → addProduct server action
  ├─ components/AddProductForm.tsx (client form)
  ├─ Dashboard RSC with product list query
  ├─ ProductCard (name, price, image, remove button)
  └─ UNBLOCKS: price history display, chart

Step 5: Price history + chart
  ├─ PriceChart.tsx (Recharts LineChart)
  ├─ "Show Chart" toggle in ProductCard
  └─ UNBLOCKS: cron has data to compare against

Step 6: Cron + email (core loop part 2)
  ├─ lib/resend.ts (sendAlert wrapper + HTML template)
  ├─ app/api/cron/check-prices/route.ts (GET health + POST job)
  ├─ pg_cron schedule in Supabase SQL editor
  └─ UNBLOCKS: end-to-end alert loop

Step 7: Polish
  ├─ Sonner toasts for all action outcomes
  ├─ Loading skeleton (app/loading.tsx)
  ├─ Error boundary (app/error.tsx)
  ├─ Scrape-failure badge on ProductCard
  └─ Responsive Tailwind layout pass
```

**Critical dependency:** Steps 3 and 4 must both complete before Step 6. The cron worker re-uses `scrapeProduct()` from lib/firecrawl.ts and needs at least one product with price_history to have a "last price" to compare against.

---

## Integration Points

### External Services

| Service | Integration Pattern | Gotchas |
|---------|---------------------|---------|
| Supabase Auth | `supabase.auth.signInWithOAuth()` in browser; `supabase.auth.getUser()` in server | Must configure Google OAuth redirect URL in Supabase dashboard AND Google Cloud Console. Callback URL: `https://<project>.supabase.co/auth/v1/callback` |
| Supabase DB | Direct client queries in RSC + Server Actions; admin client in cron route | Never import the admin client in components or browser-side code. Keep SERVICE_ROLE_KEY server-only. |
| Firecrawl | `POST https://api.firecrawl.dev/v1/scrape` with `formats: ['extract']` and JSON schema | Scrape can take 5-15s. The cron worker iterating 100+ products sequentially will time out on Vercel's 60s limit. Sequential with per-product timeout guards, or batch with `Promise.allSettled` with concurrency cap. |
| Resend | `resend.emails.send()` in lib/resend.ts | Verify sender domain in Resend dashboard. Free tier: 3k/month. Do NOT send more than one alert per product per cron run (check dedup by checking last alert timestamp or just comparing newPrice < currentPrice). |
| pg_cron | SQL `cron.schedule(...)` + `net.http_post(...)` in Supabase | Requires `pg_net` extension enabled alongside `pg_cron`. The HTTP call is fire-and-forget from pg_cron's perspective — check Route Handler logs in Vercel for failures. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Component → Server Action | Direct function import, executed as POST by Next.js | Auth re-verified inside action — cannot trust client |
| RSC → Supabase | Direct async query with server client | No API route needed for reads in RSC |
| Cron Route Handler → lib/ | Direct imports | `lib/supabase.ts` must export `createAdminClient` separately from `createServerClient` |
| pg_cron → Route Handler | HTTP POST over public internet | Route exposed publicly — Bearer token is the only guard |
| Server Action → revalidatePath | Next.js cache invalidation API | After insert/delete, call `revalidatePath('/')` to trigger RSC re-fetch on next load |

---

## Anti-Patterns

### Anti-Pattern 1: Calling Firecrawl from a Client Component

**What people do:** Import a fetch-based Firecrawl call directly into a React component to avoid Server Actions.

**Why it's wrong:** Exposes `FIRECRAWL_API_KEY` to the browser bundle. Anyone can extract the key from DevTools.

**Do this instead:** All Firecrawl calls go through `lib/firecrawl.ts` and are called only from Server Actions or the cron Route Handler.

### Anti-Pattern 2: Using the Supabase Admin Client in Server Actions for User-Facing Mutations

**What people do:** Use `SERVICE_ROLE_KEY` everywhere because it "just works" without worrying about RLS.

**Why it's wrong:** Bypasses all RLS policies. If there's any auth bug in the server action, User A could modify User B's data. RLS is the safety net.

**Do this instead:** Use `createServerClient(cookies())` (anon key + session) for all user-facing operations. Only `createAdminClient()` in the cron route, and only after Bearer token validation.

### Anti-Pattern 3: Storing Products in React State Instead of Supabase

**What people do:** After `addProduct` succeeds, optimistically append the product to a client-side list and never re-fetch.

**Why it's wrong:** The cron job updates `current_price` and `price_history` in the DB. Client state becomes stale immediately. Charts show wrong data.

**Do this instead:** After any mutation, call `revalidatePath('/')`. Let the RSC Dashboard re-fetch fresh data from Supabase. Supabase Realtime subscriptions are overkill for this v1 scope — simple revalidation is correct.

### Anti-Pattern 4: Running Firecrawl Scrapes Sequentially Without a Timeout in the Cron Job

**What people do:** `for (const product of products) { await scrapeProduct(product.url) }` with no concurrency or timeout.

**Why it's wrong:** Each Firecrawl call can take up to 15 seconds. With 20 products, sequential execution = 300s. Vercel's maximum function execution is 60s on hobby tier (300s on pro). The cron job will time out, half the products won't get checked, and pg_cron won't know — it fires and forgets.

**Do this instead:** Wrap each scrape in a per-product timeout (e.g., 10s). Use `Promise.allSettled` with a concurrency limiter (e.g., `p-limit` at 5 concurrent) to parallelize. Return partial results gracefully.

### Anti-Pattern 5: Putting Server Action Logic Inline in page.tsx

**What people do:** Define `async function addProduct() { 'use server'; ... }` directly inside `app/page.tsx`.

**Why it's wrong:** Mixes routing concerns with business logic. Actions cannot be shared across components. Hard to test or reason about independently.

**Do this instead:** All server actions live in `actions/products.ts` and `actions/email.ts`. Page and component files only import and wire up.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Current architecture is fine. Sequential scrape in cron with timeout guards. Vercel hobby tier. |
| 100-1k users | Switch cron scrape to `Promise.allSettled` with concurrency cap. Monitor Firecrawl API rate limits and costs. Add per-product `last_checked_at` to skip recently-checked products. |
| 1k+ users | Supabase Pro for pg_cron at higher frequency + connection pooling. Consider replacing pg_cron + Vercel Route Handler with a dedicated job queue (e.g., Trigger.dev or Inngest) that can fan out scrape tasks as individual jobs. Firecrawl costs become the primary constraint. |

### Scaling Priorities

1. **First bottleneck:** Cron job timeout — Firecrawl sequential scrapes hit Vercel's execution limit. Fix with concurrency.
2. **Second bottleneck:** Firecrawl API cost — At scale, scraping every product daily gets expensive. Fix with intelligent scheduling (skip products with no price change for N days).

---

## Sources

- Next.js 16.2.4 official docs — read from `node_modules/next/dist/docs/01-app/` (authoritative, version-matched)
  - `01-getting-started/02-project-structure.md` — folder conventions, colocation rules
  - `01-getting-started/07-mutating-data.md` — Server Actions pattern, auth inside actions
  - `01-getting-started/15-route-handlers.md` — Route Handler vs Server Action distinction
  - `02-guides/authentication.md` — auth flow recommendations
  - `02-guides/data-security.md` — Data Access Layer pattern, server-only secrets
  - `02-guides/backend-for-frontend.md` — Route Handler for external callers
  - `03-api-reference/03-file-conventions/route.md` — GET + POST in same route file
  - `03-api-reference/03-file-conventions/src-folder.md` — src folder convention
- DealDrop PROJECT.md — data model, API endpoint spec, constraint list
- DealDrop codebase/ARCHITECTURE.md — existing scaffold baseline

---

*Architecture research for: DealDrop (Next.js 16 + Supabase price tracker)*
*Researched: 2026-04-17*
