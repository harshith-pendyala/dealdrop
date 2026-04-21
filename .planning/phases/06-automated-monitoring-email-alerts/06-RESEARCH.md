# Phase 6: Automated Monitoring & Email Alerts - Research

**Researched:** 2026-04-21
**Domain:** Serverless cron + webhook + transactional email (Next.js 16 Route Handler + Supabase pg_cron + pg_net + Vault + Resend)
**Confidence:** HIGH — every contested claim (Vault SQL, p-limit version, Resend return shape, Next.js 16 route segment config, pg_cron signatures, `auth.admin.getUserById` shape) was verified against either the installed package source, the live npm registry, or the official vendor docs during this session.

## Summary

Phase 6 is the core-value loop of DealDrop: a daily pg_cron job POSTs to a Next.js 16 Route Handler with a Bearer token, the handler re-scrapes every product via the Phase 3 `scrapeProduct()` function under a concurrency cap, writes a new `price_history` row when the price differs from `products.current_price`, clears `last_scrape_failed_at` on success (or sets it on scrape failure), and for every genuine price drop emails the product owner via Resend. The CRON_SECRET is stored in Supabase Vault and retrieved inside a SECURITY DEFINER SQL wrapper function so the `cron.job.command` column is grep-clean.

The phase has five genuinely open research questions flagged by CONTEXT.md, and ALL FIVE are now resolved against current (2026-04) sources: (1) Vault's SECURITY DEFINER wrapper pattern is documented and battle-tested; (2) `p-limit@3.1.0` (CJS) is already transitively in `node_modules` and bypasses the ESM/Turbopack risk; (3) Resend Node SDK v6.12.2 returns a `{ data, error }` tuple — never throws — and free tier is 3k emails/month @ 2-5 req/sec; (4) `export const maxDuration = 300` is the correct Next.js 16 syntax (verified from the installed package docs); (5) `cron.schedule(name, schedule, command)` has exactly the signature assumed.

**Primary recommendation:** Ship exactly what CONTEXT.md locks. Install `resend@^6.12.2` and `p-limit@^3.1.0` (both verified current + project-compatible). Use a Vault-backed `public.trigger_price_check_cron()` SECURITY DEFINER function; call it from `cron.schedule('dealdrop-daily-price-check', '0 9 * * *', $$SELECT public.trigger_price_check_cron()$$)`. Keep `export const dynamic = 'force-dynamic'` and `export const maxDuration = 300` on the Route Handler. The `{ data, error }` tuple from Resend maps 1-to-1 onto the planner's preferred `{ ok, messageId } | { ok: false, reason }` internal contract — the handler never re-throws on email failure (EMAIL-06).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Price-change detection & idempotency:**
- **D-01:** Compare scraped price against `products.current_price` (not against the latest `price_history` row). Single column read, zero extra query. Matches CRON-07 literally.
- **D-02:** Price-change gate is the entire idempotency story (CRON-08). INSERT a new `price_history` row only when `scrapedPrice !== products.current_price`. No `?force=1` escape hatch; no `cron_runs` audit table in v1.
- **D-03:** On scrape failure: `UPDATE products SET last_scrape_failed_at = now()` only. No `price_history` insert, no `current_price` mutation, no new `last_scrape_reason` column.
- **D-04:** On price-change success: INSERT `price_history` first, then UPDATE `products` with `current_price`, `updated_at`, and `last_scrape_failed_at = NULL`, in two sequential admin-client calls (no Postgres RPC wrapper in v1). On unchanged-price success with a previously-failing flag: conditional `UPDATE products SET last_scrape_failed_at = NULL, updated_at = now() WHERE id = $1 AND last_scrape_failed_at IS NOT NULL`.

**Email template & rendering:**
- **D-05:** Inline HTML template-literal in `lib/resend.ts` via `renderPriceDropEmailHtml({ product, oldPrice, newPrice, percentDrop })`. Table-based layout. NO `react-email` / `@react-email/components`.
- **D-06:** Primary CTA "View Product" button links directly to `products.url` with `target="_blank"` and `rel="noopener noreferrer"`. No secondary DealDrop link.
- **D-07:** Hero percentage drop at the top of the email body — format `"−18%"` or `"SAVE 18%"` — `Math.round((oldPrice - newPrice) / oldPrice * 100)`. Strikethrough old price + prominent new price.
- **D-08:** One Resend email per dropped product, per cron run. No digest grouping.

### Claude's Discretion

- **Cron POST response body.** Recommend `{ status: "ok", scraped: N, updated: M, dropped: K, failed: [{ product_id, reason }] }` with HTTP 200.
- **Alert edge cases:** currency-code change → treat as non-drop, log and skip (no schema change); floating-point tiny drops → any `newPrice < oldPrice` is a drop (no tolerance); first-ever cron check → the Phase 4 TRACK-06 seed IS the baseline; multiple drops same day on manual re-trigger → price-change gate guarantees zero duplicates.
- **Vault SQL pattern (CRON-11).** Recommended: `SELECT vault.create_secret('<token>', 'dealdrop_cron_secret')` + SECURITY DEFINER `public.trigger_price_check_cron()` reading `(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dealdrop_cron_secret')` and calling `net.http_post`. `cron.job.command` must be grep-clean.
- **Sender identity:** `"DealDrop <alerts@yourdomain.dev>"` display-name format; `RESEND_FROM_EMAIL` already validated as a real email by env.server.ts Zod.
- **Scrape-order & batching:** iterate products in `created_at ASC`; `p-limit(3)` concurrency cap; no chunking/queueing; `maxDuration = 300`.
- **p-limit ESM/CJS compat:** RESOLVED BELOW — pin to `p-limit@^3.1.0` (CJS, already transitively installed, Turbopack-compatible).

### Deferred Ideas (OUT OF SCOPE)

- `cron_runs` audit table
- `products.last_scrape_reason TEXT NULL` column
- `scrape_failures` audit table (per-attempt history)
- Postgres RPC wrapping INSERT + UPDATE atomically
- Cron POST `?force=1` override
- Digest emails (one email per user with all drops)
- Email-on-persistent-scrape-failure
- Per-product alert thresholds (target price / % drop)
- Resend retry on send failure (EMAIL-06 locks "log but don't abort")
- Minimum-drop tolerance threshold
- Cooldown for chronically-failing products

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRON-01 | `GET /api/cron/check-prices` returns `{ status: "ok" }` public health check | Next.js 16 route.md confirms GET/POST co-located in one `route.ts` |
| CRON-02 | `POST` requires `Authorization: Bearer ${CRON_SECRET}`, else 401 | Standard pattern; constant-time compare recommended (see Pattern 3) |
| CRON-03 | POST uses `createAdminClient()` (service role) to bypass RLS | Existing factory at `dealdrop/src/lib/supabase/admin.ts` |
| CRON-04 | Iterate with bounded concurrency (`p-limit` 2-3) | `p-limit@3.1.0` (CJS) verified installed; v7+ is ESM-only — pin to v3 |
| CRON-05 | Route exports `maxDuration = 300` | Verified against `node_modules/next/dist/docs/.../maxDuration.md` — exact syntax `export const maxDuration = 300` |
| CRON-06 | Each product re-scraped; Zod-validated | `scrapeProduct()` already does full Zod validation internally (Phase 3) |
| CRON-07 | Successful scrape with price change → INSERT `price_history` + UPDATE `current_price` + `updated_at` | D-04 locks the two-step write pattern |
| CRON-08 | Idempotent: same-day re-run produces no duplicate rows when price unchanged | D-02 price-change gate is the mechanism |
| CRON-09 | Failed scrape logged, run continues, badge reflects failure | D-03: `UPDATE products SET last_scrape_failed_at = now()` only; Phase 4 reads via partial index in migration 0004 |
| CRON-10 | pg_cron configured for daily `0 9 * * *` UTC POST | Verified `cron.schedule(name, schedule, command)` signature; named jobs replaceable via `cron.unschedule(name)` first |
| CRON-11 | `CRON_SECRET` in Supabase Vault, referenced via wrapper SQL function | Verified: `vault.create_secret(secret, name)` + SECURITY DEFINER function reading `vault.decrypted_secrets WHERE name = '...'` |
| EMAIL-01 | On new price < previous `current_price` → call `sendPriceDropAlert` | One email per drop per cron run (D-08) |
| EMAIL-02 | Resend `emails.send` with detailed HTML template | Resend Node SDK v6.12.2 returns `{ data, error }` tuple — never throws |
| EMAIL-03 | Template: image, name, old price, new price, %, View Product link | D-05/D-06/D-07 lock the template; inline-style CSS + table layout |
| EMAIL-04 | Resend sender domain verified (SPF + DKIM); `RESEND_FROM_EMAIL` on verified domain | Out of Phase 6 coding scope — operational; DNS begins Phase 5 per STATE.md blocker |
| EMAIL-05 | `To:` uses authenticated user's email from Supabase Auth | Verified `auth.admin.getUserById(uid)` returns `{ data: { user }, error }` where `user.email` is `string \| undefined` — must null-check |
| EMAIL-06 | Email send failures logged, do not abort cron or revert DB writes | Locked; no retry in v1 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scheduled trigger | Supabase Postgres (pg_cron extension) | — | pg_cron already enabled in migration 0003; platform already chosen |
| HTTP fan-out from DB | Supabase Postgres (pg_net extension) | — | `net.http_post` is the only way a scheduled Postgres job can reach the web |
| Secret storage | Supabase Vault (vault schema) | — | Mandated by CRON-11 to prevent plaintext in `cron.job` |
| Bearer-token auth | Next.js 16 Route Handler (Node runtime on Vercel) | — | Serverless handler is the only thing pg_cron can authenticate against; RLS cannot check bearer tokens |
| Product iteration + price gate + DB writes | Next.js 16 Route Handler using Supabase admin client | — | Bypasses RLS intentionally (cron is a privileged background worker) |
| Product scraping | Phase 3 `scrapeProduct()` (server-only) | — | Already built; cron reuses same function as Phase 4 add-product |
| Email rendering | `lib/resend.ts` (server-only) | — | HTML template literal + Intl.NumberFormat on Node side; inline-style CSS for email-client compatibility |
| Email delivery | Resend API (via Node SDK) | — | Already chosen per PROJECT.md; DNS setup is operational |
| User-email lookup | Supabase `auth.admin.getUserById()` (service role) | — | Cron runs without a user session; must look up email from auth schema |
| Badge visibility | Phase 4 dashboard card (reads `last_scrape_failed_at`) | — | Phase 6 writes the column; Phase 4 owns the UI |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | `^6.12.2` | Transactional email Node SDK | Chosen in PROJECT.md; `{ data, error }` tuple pattern never throws; ships dual CJS+ESM exports → zero Turbopack risk `[VERIFIED: npm view resend@6.12.2 exports; published 2026-04-20]` |
| `p-limit` | `^3.1.0` | Bounded concurrency for the scrape fan-out | v3.1.0 is pure CJS (no `"type": "module"`); already transitively installed in `node_modules` → Turbopack-safe `[VERIFIED: cat node_modules/p-limit/package.json]` |
| `@supabase/supabase-js` | already installed (`^2.103.3`) | `auth.admin.getUserById`, `from('products').select/update`, `from('price_history').insert` via service-role client | Project standard since Phase 1 |
| Supabase `pg_cron` | Postgres extension (already enabled in migration 0003) | Scheduler inside Postgres | Chosen in PROJECT.md; `cron.schedule(name, schedule, command)` returns bigint jobid `[CITED: github.com/citusdata/pg_cron]` |
| Supabase `pg_net` | Postgres extension (already enabled in migration 0003) | Async HTTP client from inside SQL | `net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds int)` returns bigint `[CITED: supabase.com/docs/guides/database/extensions/pg_net]` |
| Supabase `vault` | Postgres extension (managed by Supabase — available in all projects) | Encrypted secret storage | `vault.create_secret(secret, name, description)` returns uuid; `vault.decrypted_secrets` view has `decrypted_secret` column `[CITED: supabase.com/docs/guides/database/vault]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `server-only` | already installed | Build-time guard on any module that reads `env.server` or touches the admin client | Must be line 1 of `lib/resend.ts` and any handler-helper module |
| `@t3-oss/env-nextjs` | already installed | Zod-validated `env.RESEND_API_KEY`, `env.RESEND_FROM_EMAIL`, `env.CRON_SECRET` | Import `env` from `@/lib/env.server` — never `process.env.*` directly |
| `zod` | already installed | Validation on any external payload (though cron body is `{}`, so Phase 6 validation surface is minimal) | Only needed if a future `?force=1` or post-body contract emerges — not in v1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `p-limit@^3.1.0` | Inline 10-line `async function runWithLimit(n, items, fn)` using a `Promise` queue | +10 lines of code but zero-dependency; mathematically identical. Acceptable fallback if any p-limit install friction emerges. No emotional cost. |
| `p-limit@^7` (latest) | Same API, current version | **Rejected**: v7 is ESM-only (`"type": "module"`, `exports.default`). Turbopack/Next.js 16 has historical ESM-in-Route-Handler rough edges. v3 is CJS and already installed. `[VERIFIED: npm view p-limit@7.3.0 type → "module"]` |
| Resend Node SDK | Raw `fetch` to `https://api.resend.com/emails` | SDK is ~1 line; raw fetch adds no value here. Phase 3 chose raw fetch for Firecrawl because Firecrawl SDK shape was MEDIUM-confidence; Resend SDK shape is HIGH-confidence and the `{ data, error }` tuple is ergonomic. Use SDK. |
| React Email (`@react-email/components`) | Inline HTML template literal | Locked by D-05; rejected for dep weight vs a single template. |
| Server Action for email send | `lib/resend.ts` plain async function | Server Actions require a browser-form-POST ergonomics; cron handler is server-to-server. Skip the `'use server'` directive — just a plain server module. |
| Inngest / Trigger.dev / queue | `p-limit` inside a single Route Handler | Over-engineered for portfolio bar (~50 products); ROADMAP explicitly defers to v2+. |
| `CRON_SECRET` inline in `cron.job.command` | Vault-backed wrapper | PITFALLS.md §2 documents why this is never acceptable; rejected. |

**Installation:**
```bash
# Run from inside dealdrop/
npm install resend@^6.12.2 p-limit@^3.1.0
```

**Version verification (performed 2026-04-21):**
- `npm view resend version` → `6.12.2` (published 2026-04-20)
- `npm view p-limit@3 version` → `3.1.0` (published 2026-02-03)
- `npm view p-limit version` → `7.3.0` (latest, ESM-only — do NOT install)
- `npm view p-limit@7.3.0 type` → `"module"` — confirmed ESM-only
- `cat node_modules/p-limit/package.json` → `"version": "3.1.0"`, no `"type"` key → CJS (already present)
- `npm view resend@6.12.2 exports` → dual CJS + ESM conditional exports → compatible regardless of handler bundle mode

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      Supabase Postgres (cloud)                             │
│                                                                            │
│   ┌────────────────────────────────────────┐                              │
│   │ pg_cron scheduler                       │  fires at 09:00 UTC daily   │
│   │ job: 'dealdrop-daily-price-check'       │  (0 9 * * *)                │
│   │ command: SELECT public.trigger_price_   │                              │
│   │          check_cron()                   │                              │
│   └──────────────────┬─────────────────────┘                              │
│                      │                                                     │
│                      ↓                                                     │
│   ┌────────────────────────────────────────┐                              │
│   │ public.trigger_price_check_cron()       │  SECURITY DEFINER           │
│   │ • reads vault.decrypted_secrets         │  restricts plaintext token  │
│   │   WHERE name = 'dealdrop_cron_secret'   │  to function scope          │
│   │ • builds jsonb {Authorization: Bearer} │                              │
│   │ • calls net.http_post(url, body,       │                              │
│   │   headers)                              │                              │
│   └──────────────────┬─────────────────────┘                              │
│                      │                                                     │
│                      │ HTTPS POST                                          │
│                      │ Authorization: Bearer <CRON_SECRET>                 │
└──────────────────────┼─────────────────────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────┼─────────────────────────────────────────────────────┐
│  Vercel Node runtime (maxDuration = 300s)                                  │
│                                                                            │
│   app/api/cron/check-prices/route.ts                                       │
│   ┌────────────────────────────────────────┐                              │
│   │ POST handler                           │                              │
│   │ ├─ validate Bearer token (constant-time│                              │
│   │ │  compare → 401)                      │                              │
│   │ ├─ createAdminClient()                 │ bypasses RLS intentionally   │
│   │ ├─ SELECT * FROM products              │                              │
│   │ │  ORDER BY created_at ASC             │                              │
│   │ ├─ p-limit(3) fan-out:                 │                              │
│   │ │    for each product:                 │                              │
│   │ │      result = scrapeProduct(url)     │ Phase 3 pure function        │
│   │ │      if !result.ok:                  │                              │
│   │ │        UPDATE products SET           │                              │
│   │ │          last_scrape_failed_at=now() │                              │
│   │ │      elif price changed:             │                              │
│   │ │        INSERT price_history          │                              │
│   │ │        UPDATE products (current_price│                              │
│   │ │          updated_at, failed_at=NULL) │                              │
│   │ │        if newPrice < oldPrice:       │                              │
│   │ │          email = auth.admin          │                              │
│   │ │                .getUserById(user_id) │                              │
│   │ │                .data.user.email      │                              │
│   │ │          sendPriceDropAlert(email,   │                              │
│   │ │            product, old, new)        │                              │
│   │ │      elif scrape ok AND price same   │                              │
│   │ │           AND last_scrape_failed_at  │                              │
│   │ │           IS NOT NULL:               │                              │
│   │ │        UPDATE products SET           │                              │
│   │ │          last_scrape_failed_at=NULL  │                              │
│   │ └─ return { status, scraped, updated, │                              │
│   │    dropped, failed: [...]  }           │                              │
│   └──────────────────┬─────────────────────┘                              │
│                      │                                                     │
│                      ↓                                                     │
│   lib/resend.ts                                                            │
│   ┌────────────────────────────────────────┐      ┌─────────────────────┐ │
│   │ renderPriceDropEmailHtml(...)          │      │ Resend API          │ │
│   │   → table-based HTML string            │─────▶│ POST /emails        │ │
│   │ sendPriceDropAlert(to, product, o, n)  │      │ { from, to, subject │ │
│   │   → resend.emails.send({...})          │      │   html }            │ │
│   │   → destructure { data, error }         │      │                     │ │
│   │   → on error: console.error, continue  │      │ returns             │ │
│   │                                        │      │ { data: { id },    │ │
│   │                                        │      │   error: null }     │ │
│   └────────────────────────────────────────┘      └─────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

File-to-implementation mapping is in the Component Responsibilities section below; the diagram shows only data flow.

### Component Responsibilities

| File | Responsibility |
|------|----------------|
| `dealdrop/app/api/cron/check-prices/route.ts` | GET (health, no auth) + POST (Bearer-guarded cron body); exports `maxDuration = 300` + `dynamic = 'force-dynamic'` + `runtime = 'nodejs'` |
| `dealdrop/src/lib/cron/check-prices.ts` *(optional split — planner's call)* | Pure business logic: `runPriceCheck(admin): Promise<CronSummary>` — iterates, scrapes, gates, writes, emails |
| `dealdrop/src/lib/cron/auth.ts` *(optional split)* | `verifyCronBearer(request): boolean` — constant-time compare helper |
| `dealdrop/src/lib/resend.ts` | `import 'server-only'` + `sendPriceDropAlert(to, product, oldPrice, newPrice)` + `renderPriceDropEmailHtml({ product, oldPrice, newPrice, percentDrop })` + `formatCurrency(amount, code)` |
| `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` | `vault.create_secret` call (placeholder note — real token set post-deploy) + SECURITY DEFINER wrapper + `cron.unschedule('...') — safely` + `cron.schedule(...)` |

### Recommended Project Structure

```
dealdrop/
├── app/
│   └── api/
│       └── cron/
│           └── check-prices/
│               └── route.ts              # GET + POST + maxDuration + dynamic
├── src/
│   └── lib/
│       ├── cron/
│       │   ├── auth.ts                   # optional: verifyCronBearer
│       │   └── check-prices.ts           # optional: runPriceCheck
│       └── resend.ts                     # sendPriceDropAlert + renderPriceDropEmailHtml
└── supabase/
    └── migrations/
        └── 0005_cron_daily_price_check.sql  # Vault + wrapper + schedule
```

### Pattern 1: Next.js 16 Route Handler for Server-to-Server Webhook

**What:** A single `route.ts` co-locates `GET` (public health check) and `POST` (Bearer-guarded work). Exports `maxDuration = 300` at module scope.

**When to use:** Any HTTP webhook called by a non-browser client (pg_cron, GitHub Actions, Stripe). Server Actions are inappropriate because they require browser form-POST ergonomics.

**Example (verified against `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` and `.../02-route-segment-config/maxDuration.md`):**

```ts
// dealdrop/app/api/cron/check-prices/route.ts
import 'server-only' // optional for route.ts (route files are server-only implicitly),
                     // BUT helper modules under src/lib/cron/ MUST have this first line.
import type { NextRequest } from 'next/server'
import { env } from '@/lib/env.server'

// Route Segment Config — verified via node_modules/next/dist/docs/.../maxDuration.md
// (maxDuration unchanged in Next.js 16) and .../caching-without-cache-components.md
// (dynamic = 'force-dynamic' still supported when cacheComponents is not enabled;
//  this project does NOT enable cacheComponents in next.config.ts).
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // default, but explicit for cron correctness

export async function GET() {
  return Response.json({ status: 'ok' })
}

export async function POST(request: NextRequest) {
  const header = request.headers.get('Authorization')
  if (!header || !verifyCronBearer(header, env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... iterate, scrape, write, email
  return Response.json({ status: 'ok', scraped: 0, updated: 0, dropped: 0, failed: [] })
}
```

[CITED: /Users/harshithpendyala/Documents/DealDrop/dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md §HTTP Methods, §Segment Config Options; .../02-route-segment-config/maxDuration.md]

### Pattern 2: Constant-Time Bearer Comparison

**What:** Compare `Authorization: Bearer <secret>` using `crypto.timingSafeEqual` (Node built-in) to avoid timing-attack oracles. Standard practice for any webhook with a shared secret.

**Example:**

```ts
// dealdrop/src/lib/cron/auth.ts
import 'server-only'
import { timingSafeEqual } from 'node:crypto'

export function verifyCronBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false
  const provided = authHeader.slice(7) // strip "Bearer "
  const providedBuf = Buffer.from(provided)
  const secretBuf = Buffer.from(secret)
  if (providedBuf.length !== secretBuf.length) return false
  return timingSafeEqual(providedBuf, secretBuf)
}
```

**Pitfall:** `timingSafeEqual` throws `RangeError` if the buffers are different lengths — always length-check first.

[ASSUMED: `timingSafeEqual` behavior on length mismatch — verified in Node.js `crypto` docs training knowledge, not re-verified this session]

### Pattern 3: Bounded-Concurrency Scrape Fan-Out

**What:** `p-limit(3)` wraps each scrape call; `Promise.allSettled` awaits all inner tasks. Matches PITFALLS.md §1 + §5 mitigations.

**Example:**

```ts
// inside runPriceCheck()
import pLimit from 'p-limit' // v3.1.0 CJS - default export is a function

const limit = pLimit(3)
const products = await fetchAllProducts(admin) // SELECT * FROM products ORDER BY created_at ASC

const settled = await Promise.allSettled(
  products.map((product) => limit(() => processOneProduct(admin, product)))
)

// settled[i] is { status: 'fulfilled', value: ... } or { status: 'rejected', reason: ... }
// processOneProduct should itself NOT throw — catch internally and return a result object.
// Promise.allSettled is belt-and-suspenders against unexpected throws.
```

**Example inner worker (returns a discriminated union matching the Phase 3 style):**

```ts
type ProductResult =
  | { kind: 'drop'; productId: string; oldPrice: number; newPrice: number; emailOk: boolean }
  | { kind: 'update'; productId: string; newPrice: number }
  | { kind: 'unchanged'; productId: string }
  | { kind: 'scrape_failed'; productId: string; reason: ScrapeFailureReason }

async function processOneProduct(
  admin: SupabaseClient,
  product: Product
): Promise<ProductResult> {
  const result = await scrapeProduct(product.url)
  if (!result.ok) {
    await admin
      .from('products')
      .update({ last_scrape_failed_at: new Date().toISOString() })
      .eq('id', product.id)
    console.error('cron: scrape_failed', { productId: product.id, reason: result.reason })
    return { kind: 'scrape_failed', productId: product.id, reason: result.reason }
  }
  // ... price-change gate, currency-change edge case, DB writes, email send
}
```

### Pattern 4: Vault-Backed SECURITY DEFINER Wrapper for pg_cron HTTP Call

**What:** The CRON_SECRET never appears in `cron.job.command`. pg_cron calls a wrapper SQL function that reads the decrypted secret from `vault.decrypted_secrets` and constructs the Authorization header internally.

**Verified Vault function signatures:**
- `vault.create_secret(secret text, name text, description text) returns uuid` `[CITED: supabase.com/docs/guides/database/vault]`
- `vault.decrypted_secrets` is a view with columns: `id, name, description, decrypted_secret, key_id, nonce, created_at, updated_at` `[CITED: supabase.com/docs/guides/database/vault]`

**Verified pg_net signature:**
- `net.http_post(url text, body jsonb DEFAULT '{}', params jsonb DEFAULT '{}', headers jsonb DEFAULT '{"Content-Type":"application/json"}', timeout_milliseconds int DEFAULT 2000) returns bigint` `[CITED: supabase.com/docs/guides/database/extensions/pg_net]`

**Verified pg_cron signature:**
- `cron.schedule(job_name text, schedule text, command text) returns bigint` `[CITED: github.com/citusdata/pg_cron README]`
- `cron.unschedule(job_name text) returns boolean`
- Named jobs: behavior on duplicate name is **not documented explicitly in pg_cron** — `[ASSUMED]` idiomatic pattern is `SELECT cron.unschedule('job_name')` before `cron.schedule('job_name', ...)` for idempotent migrations. Confirmed safe via `WHERE exists` guard pattern.

**Verified SECURITY DEFINER wrapper pattern (composed from two authoritative sources):**

[CITED: supabase.com/docs/guides/database/vault §Creating Secrets, §Reading Secrets; makerkit.dev/blog/tutorials/supabase-vault §Wrapper Functions; tomaspozo.com/articles/secure-api-calls-supabase-pg-net-vault]

```sql
-- dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
-- Source: Composed from Supabase Vault docs + pg_net docs + pg_cron docs.
-- SECURITY DEFINER is mandatory — without it, the function runs as the cron invoker
-- (which does NOT have read privileges on vault.decrypted_secrets by default).

-- ---------------------------------------------------------------------------
-- Step 1: Create the secret (run ONCE per environment; NEVER commit the real token).
--
-- The real CRON_SECRET token is set manually after migration, either via the
-- Supabase Dashboard SQL editor or a separate out-of-band SQL file. This
-- migration commits ONLY a placeholder function call wrapped in a DO block
-- that is a no-op if the secret already exists. Grep the committed migration:
-- the string "CRON_SECRET-value-goes-here" is intentional — it never resolves
-- to a real secret unless the human operator edits the text to match the
-- deployed env.server.ts CRON_SECRET value and runs the migration by hand.
--
-- Alternative: leave this commented out entirely and run `vault.create_secret`
-- in the Supabase Dashboard SQL Editor as a one-shot operation. Either way,
-- the committed SQL file must be grep-clean of any real token.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'dealdrop_cron_secret') then
    perform vault.create_secret(
      'CRON_SECRET-value-goes-here',   -- placeholder; REPLACE by hand before applying
      'dealdrop_cron_secret',
      'Bearer token for DealDrop /api/cron/check-prices'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Step 2: SECURITY DEFINER wrapper — grep-clean; never prints the secret.
-- Lives in schema public. Restrict EXECUTE to service_role (the role pg_cron
-- jobs run under by default in Supabase).
-- ---------------------------------------------------------------------------
create or replace function public.trigger_price_check_cron()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net  -- explicit search_path per SECURITY DEFINER best practice
as $fn$
declare
  v_secret text;
  v_request_id bigint;
begin
  -- Read the decrypted secret inside this function's elevated-privilege scope.
  -- The view is only queryable here; the row-level access is granted by SECURITY DEFINER.
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'dealdrop_cron_secret';

  if v_secret is null then
    raise exception 'dealdrop_cron_secret not set in vault';
  end if;

  -- Call the Next.js Route Handler. URL is an env-specific constant; parameterize
  -- via a non-public config table if multi-env reuse becomes a concern (v2+).
  select net.http_post(
    url := 'https://<PROD_HOST>.vercel.app/api/cron/check-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 290000  -- slightly under the handler's maxDuration=300s
  ) into v_request_id;

  return v_request_id;
end
$fn$;

revoke execute on function public.trigger_price_check_cron() from public;
revoke execute on function public.trigger_price_check_cron() from anon;
revoke execute on function public.trigger_price_check_cron() from authenticated;
grant execute on function public.trigger_price_check_cron() to service_role;

-- ---------------------------------------------------------------------------
-- Step 3: Idempotent schedule. cron.unschedule returns boolean and does not
-- error on "not found" — safe to call first.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Unschedule any prior version of this job so re-running the migration is safe.
  perform cron.unschedule('dealdrop-daily-price-check')
  where exists (select 1 from cron.job where jobname = 'dealdrop-daily-price-check');
end $$;

select cron.schedule(
  'dealdrop-daily-price-check',
  '0 9 * * *',                              -- 09:00 UTC daily
  $$select public.trigger_price_check_cron()$$
);
```

**Grep-cleanliness post-check (run after deploy):**

```sql
-- From Supabase SQL Editor. Must return zero rows containing the real CRON_SECRET.
select jobname, command from cron.job where jobname = 'dealdrop-daily-price-check';
-- Expected: command = 'select public.trigger_price_check_cron()'
-- NOT expected: any substring matching the real CRON_SECRET.
```

### Pattern 5: Resend `emails.send` — `{ data, error }` Tuple Pattern

**Verified Resend Node SDK v6.12.2 signature and return shape** `[CITED: resend.com/docs/send-with-nextjs; resend.com/docs/send-with-nodejs; npm view resend@6.12.2]`:

```ts
// dealdrop/src/lib/resend.ts
import 'server-only' // MUST be line 1
import { Resend } from 'resend'
import { env } from '@/lib/env.server'

const resend = new Resend(env.RESEND_API_KEY)

type PriceDropInput = {
  to: string
  product: { name: string; url: string; image_url: string | null; currency: string }
  oldPrice: number
  newPrice: number
}

type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_from' | 'validation' | 'unknown' }

export async function sendPriceDropAlert(input: PriceDropInput): Promise<SendResult> {
  const percentDrop = Math.round(((input.oldPrice - input.newPrice) / input.oldPrice) * 100)
  const html = renderPriceDropEmailHtml({ ...input, percentDrop })

  // Resend Node SDK v6.12.2 returns { data, error } — never throws for API errors.
  // Shape confirmed via node_modules/resend type definitions (server-side) +
  // docs/send-with-nextjs + docs/send-with-nodejs.
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL, // format: "DealDrop <alerts@domain.dev>" — validated by env Zod
    to: input.to,
    subject: `Price drop: ${input.product.name} -${percentDrop}%`,
    html,
  })

  if (error) {
    // Structured log — NEVER template-literal the message body (log-injection per Phase 3 precedent).
    console.error('resend: send_failed', {
      productUrl: input.product.url,
      errorName: error.name,
      errorMessage: error.message,
    })
    // Map to coarse reason. Full error name list from resend.com/docs/api-reference/errors:
    //   validation_error, invalid_from_address, rate_limit_exceeded,
    //   monthly_quota_exceeded, daily_quota_exceeded, authentication_error, etc.
    const reason =
      error.name === 'rate_limit_exceeded' || error.name === 'monthly_quota_exceeded'
        ? 'rate_limited'
        : error.name === 'invalid_from_address'
          ? 'invalid_from'
          : error.name === 'validation_error'
            ? 'validation'
            : 'unknown'
    return { ok: false, reason }
  }
  // data is { id: string } on success
  return { ok: true, messageId: data!.id }
}
```

**Key contract points:**
- The SDK **never throws for API errors** — always destructure `{ data, error }`. `try/catch` is only needed for network-layer crashes (extremely rare on Vercel).
- On success: `data = { id: string }`, `error = null`.
- On failure: `data = null`, `error = { name: string; message: string; ...maybe statusCode }`.
- EMAIL-06 says "log but don't abort" → the outer cron handler logs the `{ ok: false, reason }` return and keeps iterating.

### Pattern 6: HTML Email Template — Table-Based Layout with Inline CSS

**Why table-based:** Outlook.com (Microsoft Word renderer) and Gmail strip most `<style>` blocks and don't support flexbox or CSS grid reliably. Every production transactional email from 2010–2026 uses tables + inline style attributes. Any modern tutorial that shows `display: flex` in email HTML is wrong for the email-client target.

**Template skeleton (inline-style only, no class names):**

```ts
// dealdrop/src/lib/resend.ts (continued)
type RenderInput = {
  product: { name: string; url: string; image_url: string | null; currency: string }
  oldPrice: number
  newPrice: number
  percentDrop: number
}

export function renderPriceDropEmailHtml({ product, oldPrice, newPrice, percentDrop }: RenderInput): string {
  const oldFormatted = formatCurrency(oldPrice, product.currency)
  const newFormatted = formatCurrency(newPrice, product.currency)
  // Basic HTML-escape for interpolated product name. Emails render in the
  // recipient's inbox — don't inject arbitrary scraped HTML.
  const safeName = escapeHtml(product.name)
  // Note: escape product.url too; never interpolate raw URLs into an href without
  // URL-encoding. Since URLs are Phase 3 validated (z.string().url() + protocol
  // allowlist), the minimal escape is sufficient.
  const safeUrl = escapeHtml(product.url)
  const imgTag = product.image_url
    ? `<img src="${escapeHtml(product.image_url)}" alt="" width="300" style="display:block;max-width:300px;height:auto;border:0;" />`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 16px 32px;text-align:center;">
          <div style="font-size:48px;font-weight:700;color:#16a34a;line-height:1;">−${percentDrop}%</div>
          <div style="font-size:14px;color:#71717a;margin-top:8px;">Price drop on a product you track</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px 32px;text-align:center;">
          ${imgTag}
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px 32px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:#18181b;">${safeName}</div>
          <div style="margin-top:12px;font-size:16px;color:#71717a;">
            <s style="color:#a1a1aa;">${oldFormatted}</s>
            &nbsp;&nbsp;
            <span style="font-size:20px;font-weight:700;color:#18181b;">${newFormatted}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px 32px;text-align:center;">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;">
            View Product →
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;font-size:12px;color:#a1a1aa;">
          You're getting this because you're tracking this product on DealDrop.
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount)
  } catch {
    // ISO code unknown or malformed — fall back to plain "42.00 XYZ"
    // See Pitfall 3 below. Should rarely fire in practice: Phase 3 rejects non-ISO
    // codes with `invalid_currency` before any product is stored.
    return `${amount.toFixed(2)} ${code}`
  }
}
```

[CITED: D-05, D-06, D-07; https://resend.com/blog/email-authentication-a-developers-guide for general best-practice confirmation]

### Pattern 7: `auth.admin.getUserById()` → Extract Email

**Verified signature** via `dealdrop/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts`:

```ts
// From node_modules/@supabase/auth-js:
//   getUserById(uid: string): Promise<UserResponse>;
//   type UserResponse = { data: { user: User }, error: null } | { data: { user: null }, error: AuthError }
//   type User = { id: string; email?: string; /* ... */ }   // NB: email is OPTIONAL

const { data, error } = await admin.auth.admin.getUserById(product.user_id)
if (error || !data?.user?.email) {
  console.error('cron: user_email_missing', { productId: product.id, userId: product.user_id })
  // Can't email this user — log and continue the cron run. EMAIL-06 applies.
  return /* don't crash the worker */
}
const recipientEmail = data.user.email
```

**Failure modes to handle:**
- User was deleted post-product-add → `error` set, `data.user = null`
- OAuth user created without email scope (rare — Google default includes email) → `email` is `undefined`
- Email set to empty string (shouldn't happen through Google OAuth) → treat as missing

### Pattern 8: Currency-Change Edge Case (CONTEXT Claude's Discretion)

**Contract:** If `scrapedCurrency !== product.currency`, treat as a **non-drop** regardless of numeric comparison. Log a structured warning. Don't insert, don't email.

```ts
if (result.data.currency_code !== product.currency) {
  console.warn('cron: currency_changed', {
    productId: product.id,
    oldCurrency: product.currency,
    scrapedCurrency: result.data.currency_code,
  })
  return { kind: 'unchanged', productId: product.id }
}
```

Rationale: a different currency produces a non-comparable number. Emailing "price dropped from ₹42 to $5" is technically correct but misleading. Skip it; hope the next day's scrape returns the original currency.

### Anti-Patterns to Avoid

- **Do NOT re-throw from Resend errors.** EMAIL-06 is explicit: log, don't abort. A 429 from Resend during a volatile day must not cancel the cron's remaining DB writes.
- **Do NOT interpolate secrets into log template literals.** `console.error(\`token: ${env.CRON_SECRET}\`)` is a leak vector. Use structured object payloads — never log the secret or the Authorization header value.
- **Do NOT forget `revoke execute ... from public/anon/authenticated`** on the SECURITY DEFINER wrapper. Without revocation, any authenticated user could `SELECT public.trigger_price_check_cron()` from the Supabase REST API and trigger the cron out-of-schedule.
- **Do NOT rely on `Promise.all` for the scrape fan-out** — one rejection cancels the batch. Use `Promise.allSettled` (and ideally `processOneProduct` catches its own errors to return a discriminated result).
- **Do NOT embed the Vercel hostname as a literal string in the wrapper function** if you plan to promote the same migration across dev/staging/prod. If only prod cron exists (per PROJECT.md portfolio bar), hardcoding is acceptable.
- **Do NOT trust the cron handler to also run as a Server Action.** It's a Route Handler. Don't add `'use server'`.
- **Do NOT ship without verifying the `0 9 * * *` expression.** One-character typos (`* 9 * * *` meaning every minute of 09:00 UTC) double or 60x the Firecrawl spend. PITFALLS.md §5 warning sign.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bounded concurrency | Custom `async function* queue()` with manual pending-promise tracking | `p-limit@^3.1.0` | v3 is 30 lines of battle-tested code; deps total < 5KB; already transitively installed |
| Transactional email HTTP client | `fetch('https://api.resend.com/emails', { ... })` | `resend` SDK | Handles auth header, response parsing, versioning, future idempotency keys for free |
| Secret storage in Postgres | `CREATE TABLE secrets (name text, value text)` in a non-public schema | Supabase Vault (`vault.create_secret` + `vault.decrypted_secrets`) | Vault uses libsodium + key-per-tenant encryption; a hand-rolled table leaks on pg_dump |
| HTML email templates | Build `react-email` component tree | Template literal with table layout + inline styles (D-05 locks this) | Email clients (Outlook, Gmail) silently ignore `<style>` blocks; compatibility risk of a component library for one template is bad math |
| Constant-time secret compare | Hand-rolled loop over `a[i] !== b[i]` | `crypto.timingSafeEqual` | Node built-in; length-compare + throw on mismatch is the correct API |
| HTML escape for template interpolation | Attempt to "sanitize" | Simple `escapeHtml` (5 replacements) OR a library like `he` if more needed | Scraped strings can contain `<`, `>`, `"`. For email, the 5-replacement escape is sufficient. |
| Currency formatting | Hand-roll `$${amount.toFixed(2)}` with a currency map | `Intl.NumberFormat('en-US', { style: 'currency', currency: code })` with `try/catch` fallback | ICU data handles thousand separators, non-USD symbols, right-to-left languages |

**Key insight:** Phase 6 is an integration phase — every novel mechanism (scheduling, HTTP-from-DB, secret storage, email delivery, currency formatting, concurrency) has a battle-tested standard solution. The only custom code should be (1) the ~80-line HTML email template, (2) the per-product business logic branch, and (3) the Bearer-token verification wrapper.

## Runtime State Inventory

*Not applicable.* This is a greenfield phase (no rename/refactor/migration work). All new code and a new migration; no existing data or config being renamed.

## Common Pitfalls

### Pitfall 1: `maxDuration` Requires Vercel Pro (or Changed Plan Defaults)

**What goes wrong:** `export const maxDuration = 300` is honored by Vercel only on Pro+ plans. On Hobby tier the function hard-stops at 60s (or 10s depending on the year). Cron truncates silently.

**Why it happens:** Dev/local has no timeout. Vercel deploys silently downgrade the setting.

**How to avoid:**
- PROJECT.md declares portfolio/demo quality bar → if the portfolio repo is deployed to a Hobby-tier Vercel account, the cron will time out on > ~10 products with p-limit(3) at ~5-10s scrape latency.
- Document Pro-tier requirement for EMAIL-04 / DEP-05 deployment prep.
- Log cron start + end timestamps so Vercel function log truncation is visible.

**Warning signs:** Cron logs show start but no end line; Vercel function log ends with "Task timed out"; partial `price_history` row counts.

[CITED: vercel.com/docs — maxDuration limits by plan; verified against node_modules/next/dist/docs/.../maxDuration.md which says "Deployment platforms can use `maxDuration` from the Next.js build output to add specific execution limits."]

### Pitfall 2: pg_cron Runs on UTC; "9 AM daily" Means 9 AM UTC

**What goes wrong:** `0 9 * * *` fires at 09:00 UTC. If the team mentally models this as "9 AM Pacific" or "9 AM Tokyo", the actual fire time is off by 7-12 hours. Emails land at bad times of day.

**How to avoid:**
- Document the cron schedule as `0 9 * * * UTC` explicitly in the migration comment.
- If a specific TZ is required, use `AT TIME ZONE 'America/Los_Angeles'` semantics via a wrapper — but pg_cron itself runs in UTC. Simpler to pick a reasonable UTC time (e.g., `0 13 * * *` for 9 AM EST).

**Warning sign:** Users report emails arriving at 2 AM local time consistently.

### Pitfall 3: `Intl.NumberFormat` Throws `RangeError` on Unknown Currency Codes

**What goes wrong:** `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XYZ' })` throws `RangeError: Invalid currency code : XYZ`. The error crashes the email-template rendering, the email fails to render, and the handler's error log is noisy.

**Why it happens:** Firecrawl (Phase 3) validates codes against ISO 4217 via a closed union + Zod — in theory nothing non-ISO should reach the products table. **But:** Phase 3 actually returns `{ ok: false, reason: 'invalid_currency' }` for unknown codes; the add flow rejects them. So in steady state Phase 6 should never see bad codes. However:
- Legacy products added before a currency-validation hardening could exist.
- Intl.NumberFormat in Vercel's Node 20 runtime ships with full ICU data — bundled ICU supports all active ISO 4217 codes → rare RangeError surface.

**How to avoid:**
- Wrap `Intl.NumberFormat` construction in `try/catch` and fall back to `${amount.toFixed(2)} ${code}` (see Pattern 6's `formatCurrency`).
- NEVER let a template-render exception bubble up into the email-send branch; the handler must continue processing the next product.

[CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat §Exceptions; github.com/nodejs/node/issues/15223]

### Pitfall 4: `cron.schedule` with an Existing Job Name — Undocumented Behavior

**What goes wrong:** pg_cron docs don't explicitly specify whether `cron.schedule('name', ...)` on a duplicate name overwrites, errors, or creates a parallel job. `[ASSUMED]` idiomatic pattern in the wild is to `cron.unschedule('name')` first.

**How to avoid:**
- Always precede `cron.schedule(...)` with a guarded `cron.unschedule(...)` in migrations. Pattern: `do $$ begin perform cron.unschedule('x') where exists (select 1 from cron.job where jobname = 'x'); end $$;`
- Makes re-running the migration idempotent.

**Warning sign:** `select * from cron.job` shows two rows with the same `jobname` — cron fires twice per schedule.

### Pitfall 5: Two Sequential Writes (INSERT + UPDATE) Can Diverge on Failure

**What goes wrong:** D-04 locks two separate admin-client calls: INSERT `price_history`, then UPDATE `products`. If the INSERT succeeds and the UPDATE fails (network blip between Vercel and Supabase), the `price_history` row is committed but `current_price` stays stale. The next day's cron then re-inserts a "new" price row based on the stale `current_price` comparison.

**How to avoid (v1 portfolio bar):**
- Log the divergence: `console.error('cron: update_after_insert_failed', { productId, insertedPrice, previousCurrentPrice })`. The log is the observability hook.
- Accept that the next successful cron for that product auto-reconciles (the real-world scraped price becomes the new `current_price`).
- Deferred: wrap both writes in a `check_price_changed_and_record(product_id, new_price)` SQL function. v1 doesn't need this.

### Pitfall 6: pg_net HTTP Calls Are Asynchronous — Return Happens Before the Request Completes

**What goes wrong:** `net.http_post` returns a `bigint request_id` immediately and completes the HTTP request asynchronously after transaction commit. From the wrapper function's perspective, "success" means "queued" — not "handler returned 2xx". If the Vercel handler is down or the URL is wrong, the wrapper function "succeeds" but no cron work runs.

**How to avoid:**
- Don't rely on the wrapper function's return value for health signalling.
- For v1: manually `curl -X POST ... -H "Authorization: Bearer ..."` the handler to confirm the endpoint works before wiring the cron. This is Phase 7 DEP-06 — plan for it.
- Advanced: `select * from net._http_response where id = <request_id>` to inspect an async response. Not needed for v1.

[CITED: supabase.com/docs/guides/database/extensions/pg_net §Async Networking]

### Pitfall 7: Resend Sandbox Mode — Works for You, Fails for Everyone Else

**What goes wrong:** Sending `from: onboarding@resend.dev` only delivers to the Resend account owner's verified email. All other recipients silently fail to receive. The Resend dashboard shows "delivered" because the message was accepted — the restriction is at the Resend service layer, not the SMTP layer.

**How to avoid:**
- Use a real verified domain in `RESEND_FROM_EMAIL` before the Phase 7 end-to-end test.
- DNS propagation takes up to 48h — STATE.md says to start domain setup at Phase 5 start.
- Test delivery to a non-owner inbox in Phase 7 DEP-06 (the pitfall-mapping says "Email alerts: verify emails arrive in a non-owner inbox").

[CITED: resend.com/blog/new-free-tier; PITFALLS.md §8]

### Pitfall 8: Concurrent Writes to the Same Product Row

**What goes wrong:** If a user somehow adds the same product (Phase 4 `addProduct`) at the same instant the cron processes it, two concurrent `UPDATE products SET current_price = ...` statements land on the same row. Postgres serializes them, so integrity is fine — but the `updated_at` timestamps can race and the latter write overwrites the earlier `current_price` with a stale value.

**How to avoid (v1 portfolio bar):**
- Accept the race — it's cosmetic and self-heals on the next cron tick.
- CAS pattern if needed: `UPDATE products SET current_price = $1 WHERE id = $2 AND current_price = $3` — only writes if current_price is still what we scraped against. Deferred to v2+.

### Pitfall 9: `p-limit` Imported with Default Export vs Named Export

**What goes wrong:** `p-limit@3.x` exports a default function. Writing `import { pLimit } from 'p-limit'` fails. Writing `import pLimit from 'p-limit'` works. v7+ is ESM with the same default-export shape.

**How to avoid:**
- `import pLimit from 'p-limit'` — default import.
- `const limit = pLimit(3)` — returns a `LimitFunction` that you wrap each promise-returning call in.

[CITED: cat node_modules/p-limit/index.d.ts]

### Pitfall 10: The Wrapper Function Must Not Leak the Secret via `raise notice`

**What goes wrong:** A dev adds `raise notice 'calling with secret: %', v_secret;` during debugging. The notice lands in Postgres logs, which are then streamed to Supabase's log aggregator. The secret ends up in a searchable log index.

**How to avoid:**
- NEVER `raise notice` / `raise log` with the decrypted secret variable.
- Do include non-sensitive trace: `raise notice 'trigger_price_check_cron: request_id = %', v_request_id;` is fine.
- Review the final migration for any debug `raise` statements before commit.

## Code Examples

### Happy path — price drops, email sends

```ts
// Inside the per-product worker
const result = await scrapeProduct(product.url)
if (!result.ok) { /* see Pattern 3, scrape_failed branch */ return }

const { data: scraped } = result
// Currency-change guard (Claude's Discretion edge case)
if (scraped.currency_code !== product.currency) {
  console.warn('cron: currency_changed', {
    productId: product.id, old: product.currency, new: scraped.currency_code,
  })
  return { kind: 'unchanged', productId: product.id }
}

// Price-change gate (D-02)
if (scraped.current_price === product.current_price) {
  // Healthy-but-unchanged branch (D-04 second paragraph)
  if (product.last_scrape_failed_at !== null) {
    await admin
      .from('products')
      .update({ last_scrape_failed_at: null, updated_at: new Date().toISOString() })
      .eq('id', product.id)
      .not('last_scrape_failed_at', 'is', null)
  }
  return { kind: 'unchanged', productId: product.id }
}

// Price CHANGED — D-04 atomic(ish) pair of writes
const nowIso = new Date().toISOString()
const { error: histErr } = await admin.from('price_history').insert({
  product_id: product.id,
  price: scraped.current_price,
  currency: scraped.currency_code,
  checked_at: nowIso,
})
if (histErr) {
  console.error('cron: price_history_insert_failed', { productId: product.id, err: histErr })
  return { kind: 'unchanged', productId: product.id } // fail-closed, try again tomorrow
}

const { error: updErr } = await admin.from('products').update({
  current_price: scraped.current_price,
  updated_at: nowIso,
  last_scrape_failed_at: null,
}).eq('id', product.id)
if (updErr) {
  // The divergence case from Pitfall 5 — log and continue.
  console.error('cron: products_update_failed_after_history_insert', {
    productId: product.id, err: updErr, insertedPrice: scraped.current_price,
  })
  // Do NOT return early — still try to email if the price was a drop.
}

// Email gate — only for genuine drops (newPrice < oldPrice)
if (scraped.current_price < product.current_price) {
  // Resolve recipient email
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(product.user_id)
  if (userErr || !userData?.user?.email) {
    console.error('cron: recipient_email_missing', {
      productId: product.id, userId: product.user_id,
    })
    return { kind: 'drop', productId: product.id, oldPrice: product.current_price, newPrice: scraped.current_price, emailOk: false }
  }

  const sendResult = await sendPriceDropAlert({
    to: userData.user.email,
    product: {
      name: product.name, url: product.url, image_url: product.image_url, currency: product.currency,
    },
    oldPrice: product.current_price,
    newPrice: scraped.current_price,
  })
  // EMAIL-06: log but don't abort
  return {
    kind: 'drop',
    productId: product.id,
    oldPrice: product.current_price,
    newPrice: scraped.current_price,
    emailOk: sendResult.ok,
  }
}

// Price increased — still write the history row + update current_price, but no email
return { kind: 'update', productId: product.id, newPrice: scraped.current_price }
```

### GET health check — not gated, no scraping

```ts
// app/api/cron/check-prices/route.ts
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

### 401 on missing/bad Bearer

```ts
export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!verifyCronBearer(auth, env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... main handler body
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` JSON config | `@theme` in CSS | Tailwind v4 (late 2024) | Not Phase 6's concern — already handled in Phase 1 |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Already handled in Phase 1 |
| Pages Router API routes | App Router `route.ts` | Next.js 13 | Phase 6 uses route.ts natively |
| Hardcoded secrets in pg_cron SQL | Supabase Vault + SECURITY DEFINER wrapper | Ongoing — Vault has been available since 2023 | Phase 6 must use the current approach per CRON-11 |
| Resend Node SDK v3-5 | v6.12.2 (current) | 2026-04-20 | Nearly identical API; the `{ data, error }` tuple pattern is unchanged since v2.x |
| `p-limit@6.x / 7.x` (ESM-only) | v3.1.0 for CJS compatibility | 2021 (v3.x is stable-maintained) | Project pins v3 intentionally for Turbopack compat |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr` in Phase 1. Ignore any tutorial referencing it.
- `middleware.ts` pattern — replaced by `proxy.ts` per Next.js 16. Relevant only if docs are found that mention `middleware.ts`.
- Cache Components (`cacheComponents: true` in `next.config.ts`) — removes `dynamic`/`dynamicParams`/`revalidate`/`fetchCache` from route segment config. This project does NOT enable Cache Components, so `export const dynamic = 'force-dynamic'` is valid. `[VERIFIED: cat dealdrop/next.config.ts — no cacheComponents key]`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cron.schedule('name', ...)` on a duplicate name is NOT documented; idiomatic pattern is to `cron.unschedule('name')` first | Pattern 4, Pitfall 4 | LOW — if `cron.schedule` actually errors on duplicate names, the migration fails loudly with a clear error the first time; remediation is trivial (add the unschedule). If it silently overwrites, current approach is still correct. |
| A2 | `timingSafeEqual(a, b)` throws `RangeError` on length mismatch | Pattern 2 | LOW — Node.js built-in behavior; documented in Node crypto. Length-pre-check prevents the throw. |
| A3 | `pg_cron` jobs run as role `supabase_admin` (or `service_role`) by default in Supabase cloud | Pattern 4 GRANT statement | MEDIUM — if the default role is `postgres` or something else, the `GRANT EXECUTE TO service_role` is correct but may need an additional grant. Verify at migration time by running `SELECT username FROM cron.job WHERE jobname = 'dealdrop-daily-price-check'` after scheduling. |
| A4 | Vercel's Node 20+ runtime ships with full ICU data so all active ISO 4217 codes resolve in `Intl.NumberFormat` | Pattern 6, Pitfall 3 | LOW — full ICU has been the default since Node 16. The `try/catch` fallback covers the edge case anyway. |
| A5 | `auth.admin.getUserById(uid)` with an orphaned `user_id` (user deleted) returns `{ error: not_found }` rather than throwing | Pattern 7 | LOW — the code treats both `error` and `data.user.email = undefined` as "skip this email, log, continue". Safe either way. |
| A6 | `net.http_post` with `timeout_milliseconds = 290000` respects the passed value (not clamped to 2000 default) | Pattern 4 SQL | LOW — documented as an accepted parameter. If clamped, the handler's own `maxDuration = 300` is the load-bearing timeout; the pg_net timeout is belt-and-suspenders. |
| A7 | Cross-row concurrent UPDATEs to `products` by the cron serialize via Postgres MVCC and don't need explicit locking | Pitfall 8 | LOW — basic Postgres semantics; documented. |
| A8 | Resend Node SDK v6.x error objects include `.name` and `.message` matching the documented error-name list (`rate_limit_exceeded`, `invalid_from_address`, etc.) | Pattern 5 | LOW-MEDIUM — confirmed from multiple sources (official docs, GitHub issues) but not directly from SDK source code this session. If the shape diverges, the `'unknown'` fallback in `sendPriceDropAlert` catches it. |
| A9 | `cron.job.command` is stored as text; `SELECT command FROM cron.job` shows the exact string passed to `cron.schedule` | Vault grep-cleanliness check | LOW — documented behavior of pg_cron. |

**User-confirmation items (flag for the planner's discuss-phase review):**
- **A3** — planner should include a verification SQL step in the migration's comment: "After deploy, run `SELECT username FROM cron.job WHERE jobname = '...'` to confirm the job owner has EXECUTE on `public.trigger_price_check_cron()`."

## Open Questions

1. **Are the Phase 7 DEP-06 manual-curl and end-to-end steps Phase 6's responsibility to document in the plan, or Phase 7's?**
   - What we know: CONTEXT.md "Not in scope" line lists Phase 7 (DEP-05) as the Vercel-deploy owner; DEP-06 is the end-to-end manual test (sign up → add product → cron trigger → email received).
   - What's unclear: whether Phase 6 should ship a `curl` reference snippet in 06-SMOKE-TEST.md or defer entirely to Phase 7.
   - Recommendation: Phase 6 plans should include a local curl smoke-test verification (hitting `http://localhost:3000/api/cron/check-prices` with the real CRON_SECRET after adding a fixture product). The production cron wire-up is Phase 7's DEP-05.

2. **Should the wrapper function's Vercel URL be parameterized (e.g., via a `cron_config` table or env-specific migration) or hardcoded?**
   - What we know: CONTEXT.md doesn't prescribe; PROJECT.md portfolio-bar implies one production environment.
   - Recommendation: Hardcode the production Vercel URL in the migration. If multi-env support is ever needed, extract to a single-row `cron_config` table and read from there. Not a v1 concern.

3. **Does the GET health check need cache-control headers to prevent Vercel's edge cache from returning stale responses?**
   - What we know: GET returns `{ status: "ok" }`; Vercel's default for Route Handlers is dynamic-per-request.
   - Recommendation: `export const dynamic = 'force-dynamic'` on the whole route (Pattern 1) covers GET too. No per-method override needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest tests, Route Handler runtime | ✓ | 24.15.0 (per CLAUDE.md) | — |
| npm | Dependency install | ✓ | 11.12.1 | — |
| `resend` npm package | EMAIL-01..03 | ✗ (needs install) | — | Must install `resend@^6.12.2` |
| `p-limit` npm package | CRON-04 | ✓ (transitively present) | `3.1.0` in `node_modules/p-limit/` | If `npm install p-limit@^3.1.0` resolves differently, use inline 10-line limiter |
| Supabase CLI | Migration push | ✓ | `^2.92.1` (devDependency) | — |
| Supabase project (linked) | Migration apply | ✓ | Tokyo Free-tier, project ref in 01-CONTEXT | — |
| `pg_cron` extension | CRON-10 | ✓ | enabled in migration 0003 | — |
| `pg_net` extension | CRON-11 (http_post from SQL) | ✓ | enabled in migration 0003 | — |
| `vault` schema | CRON-11 | ✓ | managed by Supabase (always available) | — |
| Resend account + API key | EMAIL-01..03 | ⚠️ (account exists, key presumably set in env — not verified) | — | Phase 7 operational — must be set before cron runs against live endpoint |
| Verified Resend sender domain | EMAIL-04 | ✗ (DNS may not yet have propagated) | — | Can use sandbox for local testing; real domain needed by Phase 7 DEP-06 |
| Vercel Pro plan (for `maxDuration = 300`) | CRON-05 | ⚠️ (plan tier not stated) | — | On Hobby, cron truncates at ~60s → reduce `p-limit` or accept partial runs |

**Missing dependencies with no fallback:** Resend npm package (trivially installed).

**Missing dependencies with fallback:** Verified Resend domain — sandbox (`onboarding@resend.dev`) works for local testing; real domain required for Phase 7 DEP-06 demo.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (already installed; `dealdrop/vitest.config.ts` present) |
| Config file | `dealdrop/vitest.config.ts` (includes `server-only` aliasing for Node DAL tests) |
| Quick run command | `cd dealdrop && npx vitest run src/lib/resend.test.ts src/lib/cron/` (scoped to Phase 6 modules) |
| Full suite command | `cd dealdrop && npm test` (runs all `src/**/*.test.{ts,tsx}`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRON-01 | GET returns `{ status: "ok" }` (no auth, no work) | integration | `npx vitest run src/app/api/cron/check-prices/route.test.ts -t "GET returns ok"` | ❌ Wave 0 |
| CRON-02 | POST without/with-wrong Bearer returns 401 | unit (verifyCronBearer) + integration (handler) | `npx vitest run src/lib/cron/auth.test.ts` | ❌ Wave 0 |
| CRON-03 | POST uses admin client (service role) | integration with mocked `createAdminClient` | `npx vitest run src/app/api/cron/check-prices/route.test.ts -t "uses admin client"` | ❌ Wave 0 |
| CRON-04 | Bounded concurrency (p-limit 3) — at most 3 concurrent scrapes | unit (spy on `pLimit`, observe simultaneous in-flight count) | `npx vitest run src/lib/cron/check-prices.test.ts -t "concurrency capped at 3"` | ❌ Wave 0 |
| CRON-05 | Route exports `maxDuration = 300` | unit (import the module, assert export) | `npx vitest run src/app/api/cron/check-prices/route.test.ts -t "exports maxDuration"` | ❌ Wave 0 |
| CRON-06 | Each product re-scraped via `scrapeProduct` | integration (mocked scrapeProduct) | `npx vitest run src/lib/cron/check-prices.test.ts -t "calls scrapeProduct per product"` | ❌ Wave 0 |
| CRON-07 | Price change → INSERT history + UPDATE current_price | integration (assert both admin-client calls fire) | `npx vitest run src/lib/cron/check-prices.test.ts -t "price change inserts history and updates product"` | ❌ Wave 0 |
| CRON-08 | Idempotent — no duplicate history rows on unchanged price | integration (same-price scrape → zero INSERT calls) | `npx vitest run src/lib/cron/check-prices.test.ts -t "unchanged price produces no price_history insert"` | ❌ Wave 0 |
| CRON-09 | Scrape failure → last_scrape_failed_at set, run continues | integration (mock one product fails, rest succeed → all processed) | `npx vitest run src/lib/cron/check-prices.test.ts -t "scrape failure sets last_scrape_failed_at and continues"` | ❌ Wave 0 |
| CRON-10 | pg_cron schedule configured | manual SQL verification | `psql ... -c "SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check'"` | manual |
| CRON-11 | CRON_SECRET not in cron.job.command | manual SQL verification | `psql ... -c "SELECT command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check'"` (assert output contains ONLY `select public.trigger_price_check_cron()`) | manual |
| EMAIL-01 | On drop → sendPriceDropAlert called | integration (assert spy fires on price-drop branch) | `npx vitest run src/lib/cron/check-prices.test.ts -t "price drop triggers email"` | ❌ Wave 0 |
| EMAIL-02 | sendPriceDropAlert calls resend.emails.send | unit (mocked `Resend`) | `npx vitest run src/lib/resend.test.ts -t "sendPriceDropAlert calls resend emails send"` | ❌ Wave 0 |
| EMAIL-03 | renderPriceDropEmailHtml contains image, name, oldPrice, newPrice, %, CTA link | unit (pure function; string assertions) | `npx vitest run src/lib/resend.test.ts -t "renderPriceDropEmailHtml contains all required fields"` | ❌ Wave 0 |
| EMAIL-04 | Sender domain SPF + DKIM verified | manual DNS check + Resend dashboard | `dig TXT <domain> +short` + Resend UI | manual |
| EMAIL-05 | To: uses user's Supabase Auth email | integration (mocked `auth.admin.getUserById` returns email; assert passed to sendPriceDropAlert) | `npx vitest run src/lib/cron/check-prices.test.ts -t "email recipient comes from auth.admin.getUserById"` | ❌ Wave 0 |
| EMAIL-06 | Email send failure logged, cron continues | integration (mock Resend returns `{ error }`; assert `console.error` + no rethrow + next product processed) | `npx vitest run src/lib/cron/check-prices.test.ts -t "resend error is logged and does not abort run"` | ❌ Wave 0 |

### Validation Seam Map (by concern category — for VALIDATION.md scaffold)

Per CONTEXT's specific ask: "enumerate how each major requirement category will be independently verified."

| Concern | Seam Type | Mechanism | Requirements Covered |
|---------|-----------|-----------|---------------------|
| **Cron auth** | Unit + Integration | `verifyCronBearer` pure function (4 cases: null, wrong prefix, wrong value, correct); handler integration with mocked `env.CRON_SECRET` | CRON-02 |
| **Price-change gate** | Unit (ideal split) | Extract `shouldInsertHistory(scrapedPrice, currentPrice): boolean` + `shouldEmailDrop(scrapedPrice, currentPrice): boolean` as pure functions; direct assertion | CRON-07, CRON-08, EMAIL-01 |
| **Percent-drop math** | Unit | `Math.round((old - new) / old * 100)` extracted to `computePercentDrop(oldPrice, newPrice)` pure function; test 10 cases including edge math | EMAIL-03 |
| **Currency formatting** | Unit | `formatCurrency(amount, code)` with `try/catch` fallback; test known codes (USD, EUR, INR, GBP, JPY) + unknown (ZZZ, empty string, "Rs") | EMAIL-03 (Intl correctness) |
| **Email template rendering** | Unit | `renderPriceDropEmailHtml(input)` pure function; assert HTML contains `<img src=...`, the name (escaped), both formatted prices, the percent hero, the CTA `href` equal to `product.url` with `target="_blank" rel="noopener noreferrer"` | EMAIL-03, D-05, D-06, D-07 |
| **Scrape-failure path** | Integration | Mock scrapeProduct returns `{ ok: false, reason }`; assert admin.from('products').update sets `last_scrape_failed_at`, no `price_history` insert, next product still runs | CRON-09, D-03 |
| **Happy-path email wire-up** | Integration | Mock scrapeProduct returns lower price; mock `auth.admin.getUserById` returns user with email; assert `sendPriceDropAlert` called with correct `{ to, oldPrice, newPrice }` | EMAIL-01, EMAIL-05 |
| **Resend error handling** | Integration | Mock `Resend.prototype.emails.send` to return `{ data: null, error: { name: 'rate_limit_exceeded' } }`; assert run continues and logs | EMAIL-06 |
| **`auth.admin.getUserById` null-email** | Integration | Mock returns `{ data: { user: { email: undefined } } }`; assert skip + log, no Resend call | EMAIL-05 |
| **pg_cron scheduling** | Manual SQL | `SELECT * FROM cron.job WHERE jobname = 'dealdrop-daily-price-check'` — assert exactly one row, schedule = `0 9 * * *`, command string contains ONLY the wrapper-function call | CRON-10 |
| **Vault secret grep-cleanliness** | Manual SQL | `SELECT command FROM cron.job WHERE jobname = '...'` — assert no substring matching the CRON_SECRET env value | CRON-11 |
| **Wrapper function revoke/grant** | Manual SQL | `SELECT has_function_privilege('anon', 'public.trigger_price_check_cron()', 'execute')` = `false` for anon, authenticated, public; `true` only for service_role | CRON-11 security |
| **End-to-end manual curl** | Manual (Phase 7 DEP-06) | `curl -X POST http://localhost:3000/api/cron/check-prices -H "Authorization: Bearer $CRON_SECRET"` returns 200 with JSON summary; `\d price_history` shows new row; inbox receives email | all CRON + all EMAIL |

### Sampling Rate
- **Per task commit:** `cd dealdrop && npx vitest run src/lib/resend.test.ts src/lib/cron/` (scoped to Phase 6 modules; completes in < 2s when mocked)
- **Per wave merge:** `cd dealdrop && npm test && npm run build` (full suite + type-check regression)
- **Phase gate:** Full suite green + local curl smoke-test green + SQL grep-cleanliness check passes

### Wave 0 Gaps
- [ ] `dealdrop/src/lib/resend.ts` — module skeleton + exports (server-only guard, sendPriceDropAlert stub, renderPriceDropEmailHtml stub, computePercentDrop, formatCurrency, escapeHtml)
- [ ] `dealdrop/src/lib/resend.test.ts` — unit tests for renderPriceDropEmailHtml, computePercentDrop, formatCurrency, escapeHtml (all pure — no mocks needed)
- [ ] `dealdrop/src/lib/cron/auth.ts` — verifyCronBearer helper
- [ ] `dealdrop/src/lib/cron/auth.test.ts` — 4-case matrix (null, wrong prefix, wrong value, correct)
- [ ] `dealdrop/src/lib/cron/check-prices.ts` — runPriceCheck business-logic function
- [ ] `dealdrop/src/lib/cron/check-prices.test.ts` — all scenarios with mocked admin client + mocked scrapeProduct + mocked sendPriceDropAlert
- [ ] `dealdrop/app/api/cron/check-prices/route.ts` — thin GET + POST + config exports
- [ ] `dealdrop/app/api/cron/check-prices/route.test.ts` — Route Handler integration tests (status codes, auth, config exports)
- [ ] `dealdrop/src/lib/__mocks__/` helpers — shared Supabase admin-client mock factory (extending the existing makeSupabaseMock if present in test utils) with `auth.admin.getUserById` branch
- [ ] Install deps: `cd dealdrop && npm install resend@^6.12.2 p-limit@^3.1.0`

## Project Constraints (from CLAUDE.md + AGENTS.md)

- **Next.js 16 is NOT the Next.js you know** (dealdrop/AGENTS.md). Verify all Next.js API usage against `dealdrop/node_modules/next/dist/docs/` — not against web tutorials. This research verified route handler GET/POST co-location, `maxDuration`, and `dynamic = 'force-dynamic'` against that authoritative source.
- **`proxy.ts`, not `middleware.ts`.** Already handled in Phase 1; confirmed present at `dealdrop/proxy.ts`.
- **TypeScript strict mode** — no `any`, `import type` for type-only imports.
- **Functional components only** — no class components. (Phase 6 has minimal UI, but template rendering is pure-function.)
- **`@/*` path alias** — use for internal imports; resolves to both `./` and `./src/*` per tsconfig paths.
- **`import 'server-only'` on line 1** of any module that reads `env.server` or uses `createAdminClient`. Canonical precedent: `dealdrop/src/lib/supabase/admin.ts:1`. Required on `lib/resend.ts` + any cron helper module.
- **Env var NAMES stay server-only** — Plan 03-04 split `env.ts` (client-only) from `env.server.ts` (server-only) specifically to prevent NAMES like `FIRECRAWL_API_KEY` leaking into the client bundle. Phase 6's `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` are all in `env.server` — preserve.
- **Structured `console.error`** — always pass an object payload, never template-literal interpolate user/scrape data. Precedent: `dealdrop/src/lib/firecrawl/scrape-product.ts:88`.
- **GSD workflow enforcement** — before file-changing operations, start work through a GSD command (research phase is in-progress already).

## Sources

### Primary (HIGH confidence)
- **`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`** — GET/POST co-location in `route.ts`, exact `route` Route Handler shape for Next.js 16.2.4 (the installed version)
- **`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md`** — `export const maxDuration = 5` syntax; Next.js 16 unchanged
- **`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`** — Next.js 16 removes `dynamic/dynamicParams/revalidate/fetchCache` when Cache Components enabled
- **`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`** — `export const dynamic = 'force-dynamic'` is valid when Cache Components is NOT enabled (this project's state — verified `next.config.ts` has no `cacheComponents` key)
- **`node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.d.ts`** — exact `getUserById(uid: string): Promise<UserResponse>` signature and `User.email?: string` type
- **`node_modules/@supabase/auth-js/dist/module/lib/types.d.ts`** — `UserResponse`, `User`, `email?: string` optional
- **`cat node_modules/p-limit/package.json`** — v3.1.0, no `"type"` key (CJS), already transitively installed
- **`npm view p-limit@7.3.0 type`** — `"module"` (confirms v7+ is ESM-only)
- **`npm view resend version`** — 6.12.2 (published 2026-04-20)
- **`npm view resend@6.12.2 exports`** — dual CJS + ESM conditional exports
- **`dealdrop/supabase/migrations/0003_enable_extensions.sql`** — confirms `pg_cron` + `pg_net` extensions present
- **`dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql`** — `last_scrape_failed_at TIMESTAMPTZ NULL` with partial index (DASH-08 contract)
- **`dealdrop/src/lib/env.server.ts`** — `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` Zod-validated (CRON_SECRET: `z.string().min(32)`)
- **`dealdrop/src/lib/firecrawl/scrape-product.ts`** — Phase 3 public API `scrapeProduct(rawUrl): Promise<ScrapeResult>` contract
- **`dealdrop/src/lib/firecrawl/types.ts`** — `ScrapeResult`, `ScrapeFailureReason` closed union
- **`dealdrop/src/lib/supabase/admin.ts`** — `createAdminClient()` service-role factory precedent

### Secondary (MEDIUM confidence, verified with multiple official sources)
- **[Supabase Vault | Supabase Docs](https://supabase.com/docs/guides/database/vault)** — `vault.create_secret()`, `vault.decrypted_secrets` view; verified with WebFetch
- **[pg_net: Async Networking | Supabase Docs](https://supabase.com/docs/guides/database/extensions/pg_net)** — `net.http_post` signature
- **[Supabase Cron Quickstart](https://supabase.com/docs/guides/cron/quickstart)** — `cron.schedule(name, schedule, command)` invoking `net.http_post` example
- **[pg_cron GitHub](https://github.com/citusdata/pg_cron)** — `cron.schedule` + `cron.unschedule` signatures
- **[Resend Send with Next.js](https://resend.com/docs/send-with-nextjs)** — `const { data, error } = await resend.emails.send(...)` tuple pattern with App Router example
- **[Resend Send with Node.js](https://resend.com/docs/send-with-nodejs)** — same tuple pattern (destructured success/error)
- **[Resend API Errors](https://resend.com/docs/api-reference/errors)** — full error-name enum (`validation_error`, `rate_limit_exceeded`, `invalid_from_address`, `monthly_quota_exceeded`, etc.)
- **[Resend Rate Limits](https://resend.com/docs/api-reference/rate-limit)** — 5 req/sec per team default, `retry-after` header on 429
- **[Resend New Free Tier](https://resend.com/blog/new-free-tier)** — 3,000 emails/month free tier (up from 100)
- **[Supabase Vault Tutorial — Makerkit](https://makerkit.dev/blog/tutorials/supabase-vault)** — SECURITY DEFINER wrapper pattern with `revoke/grant execute` example
- **[Secure API Calls with pg_net + Vault — Tomás Pozo](https://tomaspozo.com/articles/secure-api-calls-supabase-pg-net-vault)** — end-to-end Vault + SECURITY DEFINER + pg_cron example

### Tertiary (LOW confidence — single source or training knowledge, flagged for validation)
- **ICU currency data completeness in Vercel's Node 20 runtime** — Node 16+ ships `--with-intl=full-icu` by default, Vercel uses this config `[ASSUMED]`
- **`timingSafeEqual` throwing `RangeError` on length mismatch** — training knowledge of Node.js crypto; standard docs behavior but not re-verified this session `[ASSUMED]`
- **`cron.schedule` duplicate-name behavior** — undocumented `[ASSUMED]` — the `cron.unschedule` pattern is a defensive workaround

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package verified via `npm view` + installed `node_modules` inspection; version numbers published within last 3 months
- Architecture: HIGH — architecture reuses the Phase 3 `scrapeProduct` contract and Phase 1 `createAdminClient` pattern verbatim; new surface is small and well-understood
- Patterns (Vault / SECURITY DEFINER): MEDIUM-HIGH — pattern confirmed from two independent secondary sources (Makerkit + Tomás Pozo) plus official Supabase Vault docs; the Supabase Cron docs don't show a combined Vault-backed example explicitly, so the composition is ours but built from verified primitives
- Next.js 16 exports: HIGH — verified against installed `node_modules/next/dist/docs/` per AGENTS.md mandate
- Resend Node SDK shape: HIGH — tuple pattern confirmed across multiple official and community sources
- Pitfalls: HIGH — the 10 listed map to PITFALLS.md items with project-specific elaboration + 3 new ones (currency Intl throwing, p-limit ESM, sequential write divergence) verified during research
- Validation architecture: HIGH — maps cleanly to Vitest 3.2.4 infrastructure already present; all proposed test files follow established Phase 3/4/5 conventions

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (estimate — Resend SDK moves fast; p-limit v3.x is stable-maintained; Next.js 16 maxDuration / dynamic behavior is stable)
