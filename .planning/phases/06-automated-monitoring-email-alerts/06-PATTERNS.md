# Phase 6: Automated Monitoring & Email Alerts — Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 9 new/modified (5 source + 4 test) + 1 SQL migration
**Analogs found:** 10 / 10 (every new file has a strong existing analog in the codebase)

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `dealdrop/app/api/cron/check-prices/route.ts` | Route Handler (GET+POST) | request-response, server-to-server webhook | `dealdrop/app/auth/callback/route.ts` | role-match (auth callback is GET-only; not Bearer-guarded; no `maxDuration`) |
| `dealdrop/src/lib/cron/check-prices.ts` (optional split) | server-only lib module (orchestrator) | batch + fan-out | `dealdrop/src/actions/products.ts` (`addProduct`) | role-match — same scrape→gate→insert→update pattern at different scope |
| `dealdrop/src/lib/cron/auth.ts` (optional split) | server-only utility | pure function (request-response helper) | `dealdrop/src/lib/firecrawl/url.ts` (pure URL validator) | role-match — same "tiny pure helper with server-only guard" shape |
| `dealdrop/src/lib/resend.ts` | server-only lib module (email sender + HTML renderer) | request-response (outbound HTTP via SDK) | `dealdrop/src/lib/firecrawl/scrape-product.ts` | exact — same "SDK/fetch wrapper with discriminated-union return, structured `console.error`, no throws" contract |
| `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` | SQL migration | DDL + cron.schedule RPC | `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql` + `0003_enable_extensions.sql` | role-match — same migration file style, header comment, `do $$` pattern |
| `dealdrop/app/api/cron/check-prices/route.test.ts` | test (route handler) | test harness | `dealdrop/src/actions/products.test.ts` | role-match — server-action-shaped test but Route Handler is tested the same way (dynamic import + env stub + mocked collaborators) |
| `dealdrop/src/lib/cron/check-prices.test.ts` | test (orchestrator) | test harness | `dealdrop/src/actions/products.test.ts` | exact — same orchestrator (auth → scrape → DB write) shape |
| `dealdrop/src/lib/cron/auth.test.ts` | test (pure function) | test harness | `dealdrop/src/lib/firecrawl/url.test.ts` | role-match — pure-function unit test |
| `dealdrop/src/lib/resend.test.ts` | test (email sender + HTML renderer) | test harness | `dealdrop/src/lib/firecrawl/scrape-product.test.ts` | exact — same "mock the SDK/fetch, assert discriminated-union return + structured `console.error`" pattern |

**Modified files:** None. Phase 6 is purely additive — no file from Phases 1–5 is edited.

---

## Pattern Assignments

### `dealdrop/app/api/cron/check-prices/route.ts` — Route Handler (GET + POST)

**Primary analog:** `dealdrop/app/auth/callback/route.ts` (existing Route Handler) — confirms the `import { NextRequest, NextResponse } from 'next/server'` + `export async function GET(request: NextRequest)` shape.

**Secondary analog (Route-Segment-Config syntax):** `RESEARCH.md` §Pattern 1 (verified against `dealdrop/node_modules/next/dist/docs/.../maxDuration.md`). No existing project file exports `maxDuration`, `dynamic`, or `runtime`, so this is a new pattern — but it is verified.

**Imports pattern** (from `dealdrop/app/auth/callback/route.ts:1-2`):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```
For Phase 6 the imports become:
```typescript
import type { NextRequest } from 'next/server'
import { env } from '@/lib/env.server'      // env.CRON_SECRET — never process.env.*
// plus the orchestrator and/or auth helper
```

**Route Segment Config pattern** (new — from RESEARCH.md §Pattern 1, verified against Next.js 16 docs at `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` + `.../02-route-segment-config/maxDuration.md`):
```typescript
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'   // explicit per CRON-05
```

**GET (health) pattern** (simplified from `app/auth/callback/route.ts:4-17`):
```typescript
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

**POST (Bearer-guarded) pattern** (new — composed from RESEARCH.md §Pattern 1 + §Pattern 2; authoritative shape):
```typescript
export async function POST(request: NextRequest) {
  const header = request.headers.get('Authorization')
  if (!verifyCronBearer(header, env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... orchestrator call
  return Response.json({ status: 'ok', scraped, updated, dropped, failed })
}
```

**Notes for planner:**
- Route files (`route.ts`) are server-only by virtue of the App Router — `import 'server-only'` is OPTIONAL on the route file itself but MUST be line 1 of every helper module under `src/lib/cron/` and `src/lib/resend.ts`.
- The auth-callback analog uses `NextResponse.redirect`; the cron route uses `Response.json` (JSON API, not HTML redirect). Both APIs coexist.
- `export const maxDuration = 300` is a **module-level** const export — not a config object. Do not try to import any config helper.

---

### `dealdrop/src/lib/cron/check-prices.ts` — Orchestrator (per-product loop)

**Primary analog:** `dealdrop/src/actions/products.ts` — `addProduct()` is the closest existing scrape-→-validate-→-insert-→-update orchestrator in the codebase. The cron's per-product worker is `addProduct` scaled up into a bounded-concurrency loop.

**`server-only` + imports pattern** (from `dealdrop/src/actions/products.ts:1-11`):
```typescript
// 'use server' is NOT applicable here — cron is a Route Handler helper, not a Server Action.
// DO NOT add 'use server' to this file (RESEARCH.md §Anti-Patterns "Do NOT trust the cron handler to also run as a Server Action").
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.

import { createAdminClient } from '@/lib/supabase/admin'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import { sendPriceDropAlert } from '@/lib/resend'
import type { ScrapeFailureReason } from '@/lib/firecrawl/types'
import pLimit from 'p-limit'   // v3.1.0 default export — NOT `import { pLimit }`
```

**Discriminated-union return pattern** (verbatim shape from `dealdrop/src/lib/firecrawl/types.ts:24-26` + `src/actions/products.ts:13-15`):
```typescript
// Per-product inner worker result — matches Phase 3 style.
export type ProductResult =
  | { kind: 'drop'; productId: string; oldPrice: number; newPrice: number; emailOk: boolean }
  | { kind: 'update'; productId: string; newPrice: number }
  | { kind: 'unchanged'; productId: string }
  | { kind: 'scrape_failed'; productId: string; reason: ScrapeFailureReason }

// Outer summary — for the Route Handler response body (planner's discretion per CONTEXT).
export type CronSummary = {
  status: 'ok'
  scraped: number
  updated: number
  dropped: number
  failed: { product_id: string; reason: ScrapeFailureReason }[]
}
```

**Auth re-check + scrape + DB write pattern** (from `dealdrop/src/actions/products.ts:22-66` — adapted for admin client + cron semantics):
```typescript
// From src/actions/products.ts:28-30 — the canonical pattern for narrowing scrapeProduct():
const result = await scrapeProduct(product.url)
if (!result.ok) {
  // Cron diverges from addProduct: on failure, bump last_scrape_failed_at instead of returning.
  await admin
    .from('products')
    .update({ last_scrape_failed_at: new Date().toISOString() })
    .eq('id', product.id)
  console.error('cron: scrape_failed', { productId: product.id, reason: result.reason })
  return { kind: 'scrape_failed', productId: product.id, reason: result.reason }
}

// From src/actions/products.ts:34-50 — the insert+narrow pattern:
const { error: histErr } = await admin.from('price_history').insert({
  product_id: product.id,
  price: scraped.current_price,
  currency: scraped.currency_code,   // ProductData.currency_code maps to price_history.currency (addProduct Pitfall 1)
  checked_at: new Date().toISOString(),
})
if (histErr) {
  console.error('cron: price_history_insert_failed', { productId: product.id, err: histErr })
  return { kind: 'unchanged', productId: product.id }
}
```

**Bounded-concurrency pattern** (new — from RESEARCH.md §Pattern 3; NOT present elsewhere in the codebase):
```typescript
const limit = pLimit(3)
const settled = await Promise.allSettled(
  products.map((p) => limit(() => processOneProduct(admin, p))),
)
// RESEARCH.md §Pitfall 9: Promise.allSettled (NOT Promise.all) — one rejection must not cancel the batch.
```

**Structured `console.error` pattern** (exact — from `dealdrop/src/lib/firecrawl/scrape-product.ts:88,100,109,123,137,149,162,175`):
```typescript
// Canonical shape: string tag + structured object payload.
// NEVER template-literal interpolate user data (log-injection).
console.error('cron: scrape_failed', { productId: product.id, reason: result.reason })
console.error('cron: price_history_insert_failed', { productId: product.id, err: histErr })
console.error('cron: products_update_failed_after_history_insert', {
  productId: product.id, err: updErr, insertedPrice: scraped.current_price,
})
console.error('cron: recipient_email_missing', { productId: product.id, userId: product.user_id })
// Contrast (ANTI-PATTERN, never do this):
//   console.error(`cron: scrape failed for product ${product.id}`)   // log-injection surface
```

**Key contract notes:**
- `admin` is obtained via `createAdminClient()` per `dealdrop/src/lib/supabase/admin.ts:8`. The cron's select is `.from('products').select('*').order('created_at', { ascending: true })` — full table, no user scoping (service role bypasses RLS intentionally).
- The currency-rename from `ProductData.currency_code` → `products.currency` / `price_history.currency` MUST be preserved (see `src/actions/products.ts:41` "Pitfall 1"). The scraped field name is `currency_code`; both table columns are `currency`.
- Email send failures do NOT return early — EMAIL-06 says "log but don't abort" (see `src/actions/products.ts` precedent: no `throw` anywhere; every failure branch returns a discriminated value).

---

### `dealdrop/src/lib/cron/auth.ts` — Constant-Time Bearer Comparison (optional split)

**Primary analog:** `dealdrop/src/lib/firecrawl/url.ts` (pure-function server-only helper). Same "tiny named-export pure module with `import 'server-only'` on line 1" shape.

**`server-only` + imports pattern** (verbatim line 1 + line 2 from `dealdrop/src/lib/supabase/admin.ts:1-3`):
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
import { timingSafeEqual } from 'node:crypto'
```

**Core pattern** (new — from RESEARCH.md §Pattern 2):
```typescript
export function verifyCronBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false
  const provided = authHeader.slice(7)
  const providedBuf = Buffer.from(provided)
  const secretBuf = Buffer.from(secret)
  if (providedBuf.length !== secretBuf.length) return false
  // timingSafeEqual throws RangeError on length mismatch — always length-check first.
  return timingSafeEqual(providedBuf, secretBuf)
}
```

**Notes for planner:**
- If the planner decides NOT to split this helper, inline the function at the top of `route.ts`. Either shape is acceptable; the split version is easier to unit-test.

---

### `dealdrop/src/lib/resend.ts` — Email sender + HTML renderer

**Primary analog:** `dealdrop/src/lib/firecrawl/scrape-product.ts` — same contract shape: server-only module wrapping an external HTTP call (Firecrawl → Resend), returning a discriminated union, never throwing, `console.error` on failure.

**`server-only` + imports pattern** (exact — from `dealdrop/src/lib/firecrawl/scrape-product.ts:1-13` and `dealdrop/src/lib/supabase/admin.ts:1-6`):
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)

import { Resend } from 'resend'
import { env } from '@/lib/env.server'   // env.RESEND_API_KEY, env.RESEND_FROM_EMAIL — never process.env.*
```

**Discriminated-union return pattern** (exact — from `dealdrop/src/lib/firecrawl/types.ts:24-26`):
```typescript
type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_from' | 'validation' | 'unknown' }
```

**SDK-wrapper pattern** (new — from RESEARCH.md §Pattern 5; structurally matches the Firecrawl raw-fetch pattern):
```typescript
const resend = new Resend(env.RESEND_API_KEY)   // module-scope singleton, like the FIRECRAWL_URL constant

export async function sendPriceDropAlert(input: PriceDropInput): Promise<SendResult> {
  const percentDrop = Math.round(((input.oldPrice - input.newPrice) / input.oldPrice) * 100)
  const html = renderPriceDropEmailHtml({ ...input, percentDrop })

  // Resend Node SDK v6.12.2 returns { data, error } — never throws for API errors.
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: `Price drop: ${input.product.name} -${percentDrop}%`,
    html,
  })

  if (error) {
    // Structured log — matches scrape-product.ts:88 precedent exactly.
    console.error('resend: send_failed', {
      productUrl: input.product.url,
      errorName: error.name,
      errorMessage: error.message,
    })
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
  return { ok: true, messageId: data!.id }
}
```

**HTML template pattern** (new — from RESEARCH.md §Pattern 6; no existing analog):
- Table-based layout (email-client compatibility), inline-style CSS, no class names.
- `escapeHtml()` helper for all interpolated strings (scraped product name can contain `<`, `>`, `"`).
- `formatCurrency()` wraps `Intl.NumberFormat` in `try/catch` (RESEARCH.md §Pitfall 3).
- Target ≈ 60–80 lines of HTML in a template literal.

**Key contract notes:**
- `Resend` is imported as a named export — `import { Resend } from 'resend'`. This differs from `p-limit` which is a default export (`import pLimit from 'p-limit'` — RESEARCH.md §Pitfall 9).
- `resend.emails.send()` NEVER throws for API errors — always destructure `{ data, error }`. This mirrors the raw-fetch outcome branching in `scrape-product.ts` (`{ kind: 'response' | 'timeout' | 'network' }`).

---

### `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql`

**Primary analog:** `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql` (most recent migration precedent). Secondary: `0003_enable_extensions.sql` (confirms `pg_cron` + `pg_net` are already present).

**File header comment pattern** (exact — from `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql:1-4`):
```sql
-- File: dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
-- CRON-10 / CRON-11: daily pg_cron job POSTs /api/cron/check-prices with a
-- Vault-backed Bearer token; cron.job.command is grep-clean of the plaintext secret.
-- Phase 6 wires; Phases 3–4 already supply the scrape function and the products table.
```

**Source-comment pattern** (from `dealdrop/supabase/migrations/0003_enable_extensions.sql:1-2`):
```sql
-- Source: https://supabase.com/docs/guides/database/vault
-- Source: https://supabase.com/docs/guides/database/extensions/pg_net
-- Source: https://github.com/citusdata/pg_cron#readme
```

**`do $$ ... $$` idempotency pattern** (new — not in prior migrations because 0001–0004 are pure DDL). From RESEARCH.md §Pattern 4 + §Pitfall 4:
```sql
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
```

**SECURITY DEFINER wrapper + REVOKE/GRANT pattern** (new — from RESEARCH.md §Pattern 4, verified against Supabase Vault docs):
```sql
create or replace function public.trigger_price_check_cron()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $fn$
  -- ... reads vault.decrypted_secrets, calls net.http_post, returns request_id
$fn$;

revoke execute on function public.trigger_price_check_cron() from public;
revoke execute on function public.trigger_price_check_cron() from anon;
revoke execute on function public.trigger_price_check_cron() from authenticated;
grant  execute on function public.trigger_price_check_cron() to service_role;
```

**`cron.unschedule` guard + `cron.schedule` pattern** (new — from RESEARCH.md §Pattern 4):
```sql
do $$
begin
  perform cron.unschedule('dealdrop-daily-price-check')
  where exists (select 1 from cron.job where jobname = 'dealdrop-daily-price-check');
end $$;

select cron.schedule(
  'dealdrop-daily-price-check',
  '0 9 * * *',                              -- 09:00 UTC daily (RESEARCH.md §Pitfall 2)
  $$select public.trigger_price_check_cron()$$
);
```

**Anti-patterns to avoid (RESEARCH.md §Anti-Patterns + §Pitfall 10):**
- Do NOT embed the real CRON_SECRET in the committed SQL file. The placeholder string `CRON_SECRET-value-goes-here` is load-bearing — grep checks depend on its literal presence.
- Do NOT `raise notice '...%', v_secret;` inside the wrapper function — Supabase log aggregation indexes these.
- Do NOT forget the three `revoke execute ... from public/anon/authenticated` statements before the single `grant execute ... to service_role`.

---

### `dealdrop/app/api/cron/check-prices/route.test.ts` + `dealdrop/src/lib/cron/check-prices.test.ts`

**Primary analog:** `dealdrop/src/actions/products.test.ts` — same orchestrator shape (auth guard → scrape → DB write → optional email).

**Env-stub boilerplate** (exact — copy verbatim from `dealdrop/src/actions/products.test.ts:9-18`):
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

**Mock-before-dynamic-import pattern** (exact — from `dealdrop/src/actions/products.test.ts:21-35`):
```typescript
// Mocks registered BEFORE the SUT import (Vitest hoists vi.mock but the dynamic
// import below guarantees env-stub ordering).
vi.mock('@/lib/firecrawl/scrape-product', () => ({
  scrapeProduct: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/resend', () => ({
  sendPriceDropAlert: vi.fn(),
}))

type CronCheckPricesModule = typeof import('@/lib/cron/check-prices')
let mod: CronCheckPricesModule
beforeAll(async () => {
  mod = await import('@/lib/cron/check-prices')
})
```

**Console spy pattern** (exact — from `dealdrop/src/actions/products.test.ts:37-48`):
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

**Supabase client mock** (reuse — the shared factory lives at `dealdrop/src/__mocks__/supabase-server.ts` with `makeSupabaseMock(overrides)`):
```typescript
import { makeSupabaseMock } from '@/__mocks__/supabase-server'

// The factory already supports: user, insertProduct, insertHistory, deleteError, selectProducts.
// Phase 6 may need to EXTEND it to also mock:
//   - auth.admin.getUserById  (for email lookup — RESEARCH.md §Pattern 7)
//   - from('products').update().eq()  (currently only select/insert/delete are supported)
// Planner decides: extend the shared mock OR write a cron-specific local mock.
```

**Assertion patterns** (from `dealdrop/src/lib/products/get-user-products.test.ts:73-99`):
```typescript
// Inspect builder chain calls to assert exact .select/.order/.update arguments:
const fromResults = (supabase.from as any).mock.results
const productsBuilder = fromResults[0].value
expect(productsBuilder.select).toHaveBeenCalledWith(/* expected exact string */)
```

---

### `dealdrop/src/lib/cron/auth.test.ts`

**Primary analog:** `dealdrop/src/lib/firecrawl/url.test.ts` (pure-function unit tests).

Pattern: simple `describe/it` blocks exercising each branch of `verifyCronBearer()` — valid Bearer, missing header, wrong scheme, wrong length, wrong bytes. No env stubs needed (the function takes the secret as a parameter). No mocks needed (uses only `node:crypto`).

---

### `dealdrop/src/lib/resend.test.ts`

**Primary analog:** `dealdrop/src/lib/firecrawl/scrape-product.test.ts` — same "mock the SDK/fetch, assert discriminated-union return + structured `console.error`" shape.

**Mock-the-SDK pattern** (adapted from the fetch-mock pattern at `scrape-product.test.ts:66-67`):
```typescript
// Resend SDK has a named export; mock the whole module.
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn(),
    },
  })),
}))

type ResendMod = typeof import('@/lib/resend')
let mod: ResendMod
beforeAll(async () => {
  mod = await import('@/lib/resend')
})
```

**Test cases (minimum set):**
- Happy path: `{ data: { id: 'msg_123' }, error: null }` → `{ ok: true, messageId: 'msg_123' }`
- Rate limit: `{ data: null, error: { name: 'rate_limit_exceeded', message: '...' } }` → `{ ok: false, reason: 'rate_limited' }`
- Invalid from: `error.name === 'invalid_from_address'` → `{ ok: false, reason: 'invalid_from' }`
- Validation: `error.name === 'validation_error'` → `{ ok: false, reason: 'validation' }`
- Unknown: `error.name === 'something_else'` → `{ ok: false, reason: 'unknown' }`
- `console.error` called on every failure branch with `{ productUrl, errorName, errorMessage }` payload.
- `renderPriceDropEmailHtml`: HTML-escape assertions (product name `<script>` etc.), percent rounding, currency fallback on bad ISO code.

---

## Shared Patterns (apply to multiple Phase 6 files)

### SP-1: `import 'server-only'` as line 1

**Source:** `dealdrop/src/lib/supabase/admin.ts:1-3`, `dealdrop/src/lib/firecrawl/scrape-product.ts:1-11`, `dealdrop/src/lib/products/get-user-products.ts:1-3`, `dealdrop/src/lib/env.server.ts:1-9`, `dealdrop/src/actions/products.ts:1-5`

**Apply to:** `src/lib/cron/check-prices.ts`, `src/lib/cron/auth.ts`, `src/lib/resend.ts` (every new lib module).

**NOT required on:** `app/api/cron/check-prices/route.ts` (route files are server-only implicitly) — but acceptable if planner wants defense-in-depth.

**Verbatim shape:**
```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
```

### SP-2: Env-var access via `@/lib/env.server` — never `process.env.*`

**Source:** `dealdrop/src/lib/env.server.ts:13-30`, consumed at `dealdrop/src/lib/supabase/admin.ts:6-7,11`, `dealdrop/src/lib/firecrawl/scrape-product.ts:13,42`

**Apply to:** All Phase 6 modules that read `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

**Why load-bearing:** Plan 03-04 demonstrated that direct `process.env.FIRECRAWL_API_KEY` references leaked the server env-var NAME into `.next/static/**`. The `env.server.ts` split is the T-3-01 mitigation. Phase 6 preserves it.

**Verbatim shape:**
```typescript
import { env } from '@/lib/env.server'
// ... env.CRON_SECRET, env.RESEND_API_KEY, env.RESEND_FROM_EMAIL
```

### SP-3: Discriminated-union return — `{ ok: true, ... } | { ok: false, reason }`

**Source:** `dealdrop/src/lib/firecrawl/types.ts:24-26`, `dealdrop/src/actions/products.ts:13-15`

**Apply to:**
- `sendPriceDropAlert()` return value (`SendResult` type).
- The inner per-product worker in the cron orchestrator (`ProductResult` discriminated by `kind`, not `ok` — a slight variation but the same spirit).
- The outer cron summary (`CronSummary`) uses a richer object shape per CONTEXT.md Claude's Discretion.

**Contract enforcement precedent** (from `dealdrop/src/lib/firecrawl/types.ts:28-47`): Phase 3 includes a compile-time `_ExhaustivenessCheck` to catch union drift. Phase 6 doesn't strictly need this (the unions are narrower) — planner's call whether to include equivalent `_ExhaustivenessCheck` for `ScrapeFailureReason` propagation.

### SP-4: Structured `console.error('<module>: <event>', { ...payload })`

**Source:** `dealdrop/src/lib/firecrawl/scrape-product.ts:88,100,109,123,137,149,162,175` (the canonical 8-site precedent); `dealdrop/src/actions/products.ts:49,62,78`; `dealdrop/src/lib/products/get-user-products.ts:29`

**Apply to:** EVERY failure branch in the cron orchestrator and `resend.ts`.

**Canonical tag vocabulary for Phase 6:**
```typescript
console.error('cron: scrape_failed', { productId, reason })
console.error('cron: price_history_insert_failed', { productId, err })
console.error('cron: products_update_failed_after_history_insert', { productId, err, insertedPrice })
console.error('cron: recipient_email_missing', { productId, userId })
console.error('resend: send_failed', { productUrl, errorName, errorMessage })
// And ONE warning:
console.warn('cron: currency_changed', { productId, oldCurrency, scrapedCurrency })
```

**Anti-pattern (NEVER):**
```typescript
// Log-injection surface — the rawUrl/productId can contain newlines, quotes, control chars.
console.error(`scrape failed for ${productId}: ${err.message}`)
```

### SP-5: `createAdminClient()` + no `await` before the call

**Source:** `dealdrop/src/lib/supabase/admin.ts:8-19`

**Apply to:** The cron orchestrator (the cron runs without a user session; must bypass RLS).

**Contrast with Phase 4 Server Actions:** `addProduct()` at `src/actions/products.ts:23` uses `await createClient()` (user-scoped, RLS-enforced). Cron uses `createAdminClient()` synchronously (no await; the factory returns the client directly, not a Promise).

**Verbatim shape:**
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
// ...
const admin = createAdminClient()   // NOT awaited — factory is synchronous
```

### SP-6: No throws on expected failures

**Source:** `dealdrop/src/lib/firecrawl/scrape-product.ts` (the entire file — every expected failure returns `{ ok: false, reason }`; no `throw`); `dealdrop/src/actions/products.ts` (same).

**Apply to:** `sendPriceDropAlert()`, the cron orchestrator's per-product worker, the Route Handler's POST body.

**Why load-bearing:** `Promise.allSettled` in the fan-out is belt-and-suspenders; the inner workers should never throw. EMAIL-06 explicitly locks "log but don't abort" for Resend failures.

### SP-7: Vitest env stub + dynamic import ordering (tests)

**Source:** `dealdrop/src/actions/products.test.ts:9-35`, `dealdrop/src/lib/firecrawl/scrape-product.test.ts:17-59`, `dealdrop/src/lib/products/get-user-products.test.ts:8-27`

**Apply to:** EVERY new test file.

**Why load-bearing:** `@/lib/env.server.ts` Zod-validates on module import. If env stubs aren't in place before the SUT module loads, the test fails with a Zod validation error. The pattern: `vi.stubEnv(...)` in `beforeAll`, then `await import('@/path/to/sut')` inside a separate `beforeAll`.

**Verbatim shape** (copy from `src/actions/products.test.ts:9-35`):
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

// vi.mock('@/lib/...', ...) before dynamic import
type SutModule = typeof import('@/lib/cron/check-prices')
let mod: SutModule
beforeAll(async () => {
  mod = await import('@/lib/cron/check-prices')
})
```

### SP-8: Migration file naming + header comment

**Source:** `dealdrop/supabase/migrations/0001_init_schema.sql:1-2`, `0003_enable_extensions.sql:1-2`, `0004_add_last_scrape_failed_at.sql:1-4`

**Apply to:** The new `0005_cron_daily_price_check.sql`.

**Filename convention:** `NNNN_verb_subject.sql` — zero-padded 4-digit sequence, snake_case, imperative verb. Next slot is `0005`.

**Header comment shape:**
```sql
-- File: dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
-- <REQUIREMENT-ID>: <one-line what & why>
-- Source: <authoritative docs URL>
```

---

## No Analog Found

Only one Phase 6 pattern has no existing-codebase analog (all are covered by RESEARCH.md verified patterns):

| File / Pattern | Why No Analog | Planner Action |
|----------------|---------------|----------------|
| Supabase Vault SQL (`vault.create_secret`, `vault.decrypted_secrets`, SECURITY DEFINER wrapper) in `0005_*.sql` | No prior migration in this project uses Vault or SECURITY DEFINER | Use RESEARCH.md §Pattern 4 verbatim; cite `supabase.com/docs/guides/database/vault` in the migration header |
| HTML email template (`renderPriceDropEmailHtml`) in `resend.ts` | No prior HTML-string-generation code in the project | Use RESEARCH.md §Pattern 6 verbatim; table-based layout, inline-style CSS, `escapeHtml` helper |
| `p-limit` bounded concurrency in `check-prices.ts` | No prior fan-out code in the project | Use RESEARCH.md §Pattern 3 verbatim; default import of `pLimit` (RESEARCH.md §Pitfall 9) |
| `export const maxDuration = 300` on a Route Handler | Only existing Route Handler (`app/auth/callback/route.ts`) does not export `maxDuration`, `dynamic`, or `runtime` | Use RESEARCH.md §Pattern 1; verified against `dealdrop/node_modules/next/dist/docs/.../maxDuration.md` per AGENTS.md "This is NOT the Next.js you know" guidance |

---

## Metadata

**Analog search scope:**
- `dealdrop/app/**/route.ts` — 1 file (`app/auth/callback/route.ts`)
- `dealdrop/src/lib/**/*.ts` — 8 production files (`env.ts`, `env.server.ts`, `supabase/{admin,server,browser}.ts`, `firecrawl/*`, `products/get-user-products.ts`, `utils.ts`)
- `dealdrop/src/actions/*.ts` — 2 production files (`auth.ts`, `products.ts`)
- `dealdrop/src/**/*.test.ts` — 6 test files
- `dealdrop/src/__mocks__/*.ts` — 1 shared mock factory (`supabase-server.ts`)
- `dealdrop/supabase/migrations/*.sql` — 4 existing migrations (0001–0004)
- `dealdrop/vitest.config.ts` — 1 config file (relevant for `server-only` alias)

**Files scanned:** 23 production/test/config files, 4 migrations.

**Pattern-extraction date:** 2026-04-21.

**Key structural conclusion:** Phase 6 is structurally a clone of Phase 3 (`scrape-product.ts` + its test) scaled up to a batch fan-out driven by a Route Handler, plus a new Supabase Vault migration that has no prior analog in the project. Every single TypeScript pattern (server-only guard, env.server import path, discriminated-union returns, structured console.error, no throws, Vitest env stubbing, dynamic-import ordering) exists verbatim in the codebase and should be copied line-for-line.
