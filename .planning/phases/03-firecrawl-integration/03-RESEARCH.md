# Phase 3: Firecrawl Integration - Research

**Researched:** 2026-04-19
**Domain:** Server-only Firecrawl HTTP client + Zod-validated structured extraction
**Confidence:** HIGH (API shape + SDK internals verified against live endpoint and published docs)

## Summary

Phase 3 delivers a server-only `scrapeProduct(url)` function that wraps the Firecrawl `/v2/scrape` JSON-extraction endpoint, validates both input URLs and output payloads with Zod, and returns a discriminated union `{ ok: true, data } | { ok: false, reason }`. All locked decisions (D-01..D-08) from CONTEXT.md hold; nothing in the current Firecrawl API shape challenges them.

Two findings force decisions the planner must make explicit:

1. **The SDK (`@mendable/firecrawl-js@4.18.3`) pins `zod@^3.23.8` as a hard dependency.** The project uses `zod@^4.3.6` (see `dealdrop/package.json:29`). npm resolves these as two separate trees (zod@3 nested under the SDK, zod@4 at the root), so **peer-dep install does not fail**, but Zod schemas constructed in our code (zod@4 instance) are *not* interchangeable with the SDK's internal zod@3 instance. The SDK will either (a) accept our schema but fail to recognize it as a ZodType and coerce it via `zod-to-json-schema`, producing wrong-shape JSON Schema, or (b) work correctly only because the conversion treats any `{ _def }`-shaped object as "zod-like". This is fragile and version-brittle.

2. **Firecrawl moved to v2** (`https://api.firecrawl.dev/v2/scrape`). Training data and older StackOverflow answers reference v1 shapes (`formats: ['extract']` + `extractorOptions`) — **do not use these**. v2 uses `formats: [{ type: 'json', schema, prompt? }]` with extracted data returned at `data.json`.

**Primary recommendation:** Use **raw `fetch` against `POST https://api.firecrawl.dev/v2/scrape`** — not the SDK. Rationale: avoids the zod@3 vs zod@4 coupling, gives us first-class `AbortController` timeout control, reduces bundle size, keeps the module a ~80-line pure function that's trivial to unit-test with `fetch` mocks. Firecrawl v2 auth is a single `Authorization: Bearer` header. The request/response shapes are fully documented (see Code Examples below). The SDK offers no capability we need: we're calling exactly one endpoint with a single JSON body.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| URL shape validation | Node server (`src/lib/firecrawl/`) | Browser (Phase 4 form, defense-in-depth) | D-07 locks server-side validation inside `scrapeProduct` as authoritative; Phase 4 client validation is UX-only |
| URL normalization (strip utm_, lowercase host) | Node server | — | Must run before the `(user_id, url)` uniqueness check in Phase 4 and before re-scrape in Phase 6 cron; single source of truth |
| Firecrawl HTTP call | Node server (RSC / Server Action / Route Handler runtime) | — | `FIRECRAWL_API_KEY` is a server-only env var (`env.ts:8`); browser must never reach this code |
| JSON Schema construction | Node server | — | Static constant in the module; no runtime dynamism |
| Response Zod validation | Node server | — | Output contract for `products` DB row; runs once per scrape |
| Timeout / retry control | Node server | — | `AbortController` with `AbortSignal.timeout(60_000)` — server-side only |
| Failure reason mapping | Node server | — | The closed union from D-02 is returned to callers; no client-side translation of HTTP statuses |
| Toast copy / user-facing errors | **Browser (Phase 4)** | — | D-03 explicitly excludes UX strings from this module |

**Implication:** This entire phase is a single server-only module. No client components, no API routes, no DB access. The module is pure TypeScript that takes a string and returns a typed result.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `scrapeProduct()` returns a **discriminated union** `{ ok: true, data: ProductData } | { ok: false, reason: ScrapeFailureReason }`. No throws for expected failures. Callers must handle both branches.
- **D-02:** Failure reasons are a **closed, specific union**: `invalid_url | network_error | scrape_timeout | missing_price | missing_name | invalid_currency | unknown`.
- **D-03:** Phase 4 owns the reason → toast-copy map. `scrapeProduct` returns only the machine-readable reason code.
- **D-04:** Server-side `console.error` the full Firecrawl response (or caught error stack) on any failure. Return payload is strictly `{ ok: false, reason }` — **NO `detail` field** in the production return.
- **D-05:** URL shape validation is Zod `z.string().url()` + protocol allowlist (`'http:'` or `'https:'` only). No localhost/private-IP block. No domain allowlist.
- **D-06:** Light URL normalization before scraping: lowercase scheme/host, strip trailing slash, strip `utm_*`, `fbclid`, `gclid`, preserve variant params verbatim. No redirect following.
- **D-07:** Validation lives inside `scrapeProduct()` as the first guard. Phase 4 also validates, but `scrapeProduct` does not trust its caller.
- **D-08:** URL max length `z.string().max(2048)`.

### Claude's Discretion

- **Currency handling:** Accept only ISO 4217 alpha-3 codes from Firecrawl's `currency_code` field. Symbols or non-standard codes → `invalid_currency`.
- **Retry/timeout:** 60s timeout on Firecrawl. 1 retry on transient 5xx or network errors with 2s backoff. No retry on 4xx. Timeout → `scrape_timeout`; network → `network_error`.

### Deferred Ideas (OUT OF SCOPE)

- Scrape-result caching (LRU / TTL) — Phase 7 polish candidate
- Aggressive URL canonicalization (follow HTTP 301/302 before hashing)
- Domain allowlist
- Retry-with-different-scrape-mode fallback (JSON schema → markdown + regex)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRACK-03 | Server Action validates URL format with Zod before scraping | §Code Examples → "URL validation + normalization" pattern; D-07 locks this into `scrapeProduct` itself so Phase 4 does not need to re-derive it |
| TRACK-04 | Server Action calls Firecrawl `scrape` with JSON schema extracting `product_name`, `current_price`, `currency_code`, `product_image_url` | §Standard Stack (raw fetch recommendation); §Code Examples → "Firecrawl v2 request body" + "JSON Schema for product data" |
| TRACK-05 | Scraped payload validated with Zod — null/missing fields reject the insert with a user-facing error | §Code Examples → "Response Zod schema with branch-level reason mapping"; §Common Pitfalls → "Zod validation swallows which field was missing" |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.3.6` (already installed) | URL schema, Firecrawl response validation | [VERIFIED: dealdrop/package.json:29] Project's validation primitive; used by env.ts, Supabase types. Zod 4 has faster parse and improved error paths vs v3 |
| Native `fetch` | Built-in (Node 24.15.0) | HTTP call to Firecrawl `/v2/scrape` | [VERIFIED: node -e "typeof fetch" on project runtime] First-class support in Next.js 16 server contexts; supports `AbortController` signals — no third-party HTTP client needed |
| `AbortSignal.timeout(ms)` | Built-in (Node 24.15.0) | 60-second request timeout | [VERIFIED: `node -e "typeof AbortSignal.timeout"` returned `function` on this machine] Cleaner than manual `setTimeout` + `controller.abort()` pattern |
| `server-only` | `^0.0.1` (already installed) | Build-time guard preventing browser bundling | [VERIFIED: dealdrop/package.json:24] Canonical pattern at `dealdrop/src/lib/supabase/admin.ts:1` |
| `@t3-oss/env-nextjs` + typed `env` | `^0.13.11` (already installed) | Access `FIRECRAWL_API_KEY` typed and validated | [VERIFIED: dealdrop/src/lib/env.ts:8] Import `env.FIRECRAWL_API_KEY`; never `process.env.FIRECRAWL_API_KEY` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^3.x` (latest) | Unit test framework | Install in Wave 0 of Phase 3 — project has no test framework yet (verified: no vitest/jest deps in `dealdrop/package.json`). Vitest is the current Next.js 16 / React 19 compatible standard; native ESM, fast watch mode, Jest-compatible API |
| `@types/node` | `^20` (already installed) | Node globals, `AbortSignal` types | Already in devDeps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch` to `/v2/scrape` | `@mendable/firecrawl-js@4.18.3` SDK | **Rejected.** SDK ships `zod@^3.23.8` as a direct (not peer) dep — clashes with project's `zod@^4.3.6`. Would force either (a) dual-zod node_modules tree and fragile interop, or (b) dropping to zod@3 project-wide, which would churn `env.ts` and Supabase-type schemas already landed in Phase 1/2. SDK also adds `axios@1.15.0` (another duplicate HTTP client — we have native fetch), `zod-to-json-schema@^3.23.0`, and `typescript-event-target@^1.1.1` — ~700 KB unpacked for one endpoint call. [VERIFIED: `npm view @mendable/firecrawl-js@4.18.3 dependencies`] |
| Vitest | Jest | **Rejected.** Jest requires `@swc/jest` or `babel-jest` shim for TypeScript in ESM mode; Vitest runs native ESM + TS out of the box. Next.js 16 testing docs guide [cited below] show both but Vitest is lighter. |
| `AbortSignal.timeout(60_000)` | Manual `const c = new AbortController(); setTimeout(() => c.abort(), 60_000)` | **Rejected.** Same semantics, more lines, harder to clean up on success path (dangling timers). `AbortSignal.timeout` is stable in Node 24. [VERIFIED: local `node -e` check] |
| `data.json` access (v2) | `data.extract` / `data.llm_extraction` (v1) | **Rejected — obsolete.** v1 shapes are in training data but Firecrawl has moved to v2. Live endpoint `POST https://api.firecrawl.dev/v2/scrape` responds with `{"success":false,"error":"Unauthorized: Invalid token"}` to a bad-token test call — confirming v2 is the current production endpoint. [VERIFIED: curl smoke test this session] |

**Installation:**

```bash
# From dealdrop/
npm install -D vitest @vitest/coverage-v8
```

No runtime dependencies are added. `zod`, `server-only`, `@t3-oss/env-nextjs` are already present.

**Version verification:**

- `zod@4.3.6` — [VERIFIED: dealdrop/package.json:29]
- `@mendable/firecrawl-js@4.18.3` — [VERIFIED: `npm view @mendable/firecrawl-js version` returned `4.18.3`, last published `2026-04-15`]. Flagged as "considered and rejected" above.
- Firecrawl API version — `/v2/scrape` [VERIFIED: live curl returned v2-shaped error response this session]
- Node runtime — `24.15.0` [VERIFIED: local `node --version`, matches CLAUDE.md constraint]

## Architecture Patterns

### System Architecture Diagram

```
            ┌─────────────────────────────────────────────────────────┐
            │  CALLERS (all server-only)                              │
            │  ─ Phase 4: add-product Server Action                   │
            │  ─ Phase 6: daily cron Route Handler (POST)             │
            └──────────────────────────┬──────────────────────────────┘
                                       │ calls scrapeProduct(url: string)
                                       ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │  src/lib/firecrawl/scrape-product.ts   (import 'server-only')   │
     │                                                                 │
     │   ┌──────────────────┐   fail         ┌─────────────────────┐   │
     │   │ 1. Zod URL parse │ ─────────────► │ return              │   │
     │   │    + protocol    │                │  {ok:false,         │   │
     │   │    allowlist     │                │   reason:'invalid_  │   │
     │   │    (D-05,D-08)   │                │   url'}             │   │
     │   └────────┬─────────┘                └─────────────────────┘   │
     │            │ pass                                               │
     │            ▼                                                    │
     │   ┌──────────────────┐                                          │
     │   │ 2. Normalize URL │                                          │
     │   │    (D-06)        │                                          │
     │   └────────┬─────────┘                                          │
     │            │                                                    │
     │            ▼                                                    │
     │   ┌──────────────────────┐    timeout  ┌─────────────────────┐  │
     │   │ 3. fetch POST        │ ──────────► │ {ok:false, reason:  │  │
     │   │   /v2/scrape         │             │  'scrape_timeout'}  │  │
     │   │   AbortSignal        │             └─────────────────────┘  │
     │   │   .timeout(60_000)   │    5xx/net  ┌─────────────────────┐  │
     │   │   + 1 retry (2s)     │ ──────────► │ {ok:false, reason:  │  │
     │   │   on 5xx/network     │             │  'network_error'}   │  │
     │   └──────────┬───────────┘             └─────────────────────┘  │
     │              │ 2xx                                              │
     │              ▼                                                  │
     │   ┌──────────────────────┐                                      │
     │   │ 4. res.json() +      │                                      │
     │   │    check             │                                      │
     │   │    body.success &&   │                                      │
     │   │    body.data.json    │                                      │
     │   └──────────┬───────────┘                                      │
     │              │                                                  │
     │              ▼                                                  │
     │   ┌────────────────────────────────────────┐                    │
     │   │ 5. Branch-ordered Zod validation       │                    │
     │   │    (ordering matters — see Pitfall 3)  │                    │
     │   │                                        │                    │
     │   │    a. name missing/empty?              │                    │
     │   │       → reason:'missing_name'          │                    │
     │   │    b. price null/<=0?                  │                    │
     │   │       → reason:'missing_price'         │                    │
     │   │    c. currency not ISO 4217 alpha-3?   │                    │
     │   │       → reason:'invalid_currency'      │                    │
     │   │    d. image_url: allow null (nullable) │                    │
     │   │                                        │                    │
     │   └──────────┬─────────────────────────────┘                    │
     │              │ all pass                                         │
     │              ▼                                                  │
     │   ┌────────────────────────────────────────┐                    │
     │   │ return { ok: true, data:               │                    │
     │   │   { name, current_price,               │                    │
     │   │     currency_code, image_url } }       │                    │
     │   └────────────────────────────────────────┘                    │
     └─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │  Firecrawl API v2             │
                       │  https://api.firecrawl.dev    │
                       │  /v2/scrape                   │
                       └───────────────────────────────┘

   FAIL BRANCHES all go through console.error(...) with full context
   before returning the coarse reason code. (D-04)
```

### Component Responsibilities

| File | Responsibility |
|------|----------------|
| `dealdrop/src/lib/firecrawl/scrape-product.ts` | Single exported `scrapeProduct(url)` function + named `ProductData` and `ScrapeFailureReason` types. `import 'server-only'` on line 1. |
| `dealdrop/src/lib/firecrawl/product-schema.ts` (optional split) | The JSON Schema sent to Firecrawl + the response Zod schema. Kept in a sibling file so the JSON Schema shape is reusable (Phase 6 cron imports the same schema). |
| `dealdrop/src/lib/firecrawl/normalize-url.ts` (optional split) | D-06 URL normalization. Pure function — no I/O. Easy to unit-test in isolation. |
| `dealdrop/src/lib/firecrawl/scrape-product.test.ts` | Vitest unit tests. Mocks `global.fetch` per branch. |

### Recommended Project Structure

```
dealdrop/src/lib/
├── env.ts                        ← unchanged (FIRECRAWL_API_KEY already here)
├── utils.ts                      ← unchanged
├── supabase/
│   ├── admin.ts                  ← canonical server-only guard, line 1
│   ├── browser.ts
│   └── server.ts
└── firecrawl/                    ← NEW (directory, not single file)
    ├── scrape-product.ts         ← the public export
    ├── product-schema.ts         ← JSON Schema + Zod response schema
    ├── normalize-url.ts          ← D-06 normalization helper
    └── scrape-product.test.ts    ← Vitest tests
```

**Why a directory (not `src/lib/scrape.ts`):**

1. Mirrors existing `src/lib/supabase/*` pattern — consistent with the codebase convention (CLAUDE.md: "Files under `dealdrop/src/lib/...`").
2. Keeps three small files (100/40/30 LOC) separable for testing rather than one 200-line module.
3. Reserves room for Phase 7 polish (`cache.ts`, `rate-limit.ts`) without reshuffling.
4. `normalize-url.ts` is a pure function — trivial to test in isolation, and Phase 4's form may want to reuse it client-side for optimistic dedupe feedback (export without the `server-only` guard if that happens; for v1, keep it server-only).

### Pattern 1: `server-only` Guard (line-1 import)

**What:** Import `'server-only'` as the first line of any module that must never reach the browser bundle.
**When to use:** Any module that reads `env.FIRECRAWL_API_KEY` or performs a privileged HTTP call.
**Example:**

```ts
// Source: dealdrop/src/lib/supabase/admin.ts:1 (canonical pattern)
// Source: node_modules/next/dist/docs/01-app/02-guides/data-security.md L238-L264
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.

import { env } from '@/lib/env'
// ...rest of module
```

### Pattern 2: Discriminated Union Result (no throws)

**What:** Return `{ ok: true, data } | { ok: false, reason }` — caller must narrow on `ok`.
**When to use:** Any function whose failure is an expected part of the domain (network, validation, not-found).
**Example:**

```ts
export type ScrapeFailureReason =
  | 'invalid_url'
  | 'network_error'
  | 'scrape_timeout'
  | 'missing_price'
  | 'missing_name'
  | 'invalid_currency'
  | 'unknown'

export type ProductData = {
  name: string
  current_price: number
  currency_code: string
  image_url: string | null
}

export type ScrapeResult =
  | { ok: true; data: ProductData }
  | { ok: false; reason: ScrapeFailureReason }

export async function scrapeProduct(url: string): Promise<ScrapeResult> { /* ... */ }
```

TypeScript forces callers to check `if (!result.ok)` before reading `result.data`, matching the Phase 2 auth-result style.

### Pattern 3: Fetch with AbortSignal.timeout + targeted retry

**What:** `AbortSignal.timeout(ms)` cancels the fetch if it exceeds the budget; wrap in a `for` loop with a single retry on 5xx or network errors with 2s backoff; no retry on 4xx.
**When to use:** Any outbound HTTP call with an SLA.
**Example:**

```ts
// Source: Node 24 docs (AbortSignal.timeout stable), Next.js fetch supports signal
// https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) })
      // 4xx → don't retry; return res for caller to classify
      if (res.status < 500) return res
      // 5xx → fall through to retry on first attempt only
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2_000))
        continue
      }
      return res
    } catch (err) {
      // AbortError (timeout) or network error
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError'
      if (isTimeout) throw err // map to scrape_timeout upstream, no retry on timeout
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2_000))
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}
```

> **Note on timeout-retry interaction:** The CONTEXT "Claude's Discretion" says "1 retry on transient 5xx or network errors" — it does *not* explicitly include timeout in the retry set. Research recommendation: **do not retry on timeout** (a 60-second timeout already represents a significant failure; another 60s wait doubles latency for users; caller should just see `scrape_timeout`). Retry only on 5xx and network errors (fetch rejection not caused by timeout). Planner should surface this as a minor deviation if the user wants timeout retries included.

### Anti-Patterns to Avoid

- **Reading `process.env.FIRECRAWL_API_KEY` directly:** Always go through `env.FIRECRAWL_API_KEY` from `@/lib/env` — the env module validates at build time and throws on missing vars. [Cited: `dealdrop/src/lib/env.ts:8`]
- **Passing a zod@4 schema to `@mendable/firecrawl-js`:** The SDK uses zod-to-json-schema internally against its own zod@3 instance. Behavior with a zod@4 schema is unspecified. If the SDK is used (against this research's recommendation), pass a plain JSON Schema object, not a Zod schema.
- **Throwing from `scrapeProduct`:** Every failure path must return `{ ok: false, reason }`. Only genuinely unexpected errors (bug / programming error) should surface as thrown exceptions — and even those should be caught at the top level and returned as `reason: 'unknown'` per D-04.
- **Including HTTP status codes or Firecrawl error strings in the return value:** D-04 locks the return to `{ ok: false, reason }` only. Put those details in `console.error` on the server.
- **Validating URL format with a regex:** Use `z.string().url()` — Zod's URL validator uses the WHATWG URL parser and handles edge cases (IDN, IPv6, userinfo) the regex won't.
- **Using `new URL(url)` before Zod:** Construct the URL *after* Zod confirms the shape (or wrap the `new URL()` call in a try/catch that maps to `invalid_url`). Otherwise an exception from the URL constructor bubbles up instead of producing the typed reason.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL shape validation | Regex like `/^https?:\/\//` | `z.string().url()` + explicit `url.protocol` check | Zod uses the WHATWG URL parser; regex misses IDN, IPv6 literals, and trips on trailing whitespace |
| Query-param stripping | `url.split('?')[0] + rebuild string` | `const u = new URL(url); u.searchParams.delete('utm_source'); ...; u.toString()` | WHATWG `URL` / `URLSearchParams` handle encoding, duplicate params, and order correctly |
| HTTP timeout | Manual `setTimeout` + `controller.abort()` pair | `AbortSignal.timeout(60_000)` | Single line; automatic cleanup; cannot leak timers on the success path |
| JSON Schema generation from Zod | `zod-to-json-schema` package | Hand-write the JSON Schema object | We own exactly one schema; it's 15 lines. The conversion library adds 40 KB for zero win |
| Currency code validation | `if (code.length === 3 && code.toUpperCase() === code)` | `z.string().length(3).regex(/^[A-Z]{3}$/)` | Zod composition is self-documenting and plugs into the same error path as the rest of the response validator |
| Price type coercion | `parseFloat(rawPrice)` | Let the JSON Schema declare `"type": "number"` → Firecrawl returns a number → Zod `z.number().positive()` validates | Delegates the parse to Firecrawl's LLM (which already handles `"$1,299.99"` → `1299.99`); our code only asserts the final shape |
| ISO 4217 validation (exhaustive list) | Inline `['USD','EUR','GBP',...180 codes]` array | `z.string().length(3).regex(/^[A-Z]{3}$/)` — **shape** check only | Exhaustive validation of every ISO code is overkill at portfolio bar; shape check rejects `$`, `USD$`, and gibberish. If Firecrawl returns a made-up 3-letter code, we'd insert it and `Intl.NumberFormat` in Phase 4 will just render the literal code — acceptable degradation |
| HTTP client | `axios`, `got`, `undici` | Native `fetch` | Node 24 ships a fully-compliant `fetch`; Next.js 16 has first-class RSC integration with it; no third-party client needed for one endpoint |

**Key insight:** Almost every "helper library" the typical research answer would suggest (`axios`, `zod-to-json-schema`, a currency-code list package) is replaceable by 1–3 lines using primitives already in `node:` globals, `zod@4`, or the WHATWG URL spec. Favor standard-library primitives; they don't go stale.

## Runtime State Inventory

Not applicable. Phase 3 creates a new module (no rename, refactor, or string replacement across existing data). No stored data, live service config, OS-registered state, or build artifacts are affected.

## Common Pitfalls

### Pitfall 1: SDK version pin vs project zod version

**What goes wrong:** Developer `npm install @mendable/firecrawl-js`, then wires a `z.object({...})` schema from the project's zod@4 into the SDK's `firecrawl.scrape(url, { formats: [{ type: 'json', schema: myZodSchema }] })`. At runtime the SDK's internal `zod-to-json-schema` call against a zod@4 instance silently produces either a malformed JSON Schema or an empty one, and Firecrawl returns no structured data (or the wrong shape). The failure is invisible until production data shows up blank.
**Why it happens:** `@mendable/firecrawl-js@4.18.3` depends on `zod@^3.23.8` (not as a peer dep). npm's resolver places a second zod at `node_modules/@mendable/firecrawl-js/node_modules/zod`, so `z.object` from `'zod'` at our callsite is a different class than the one the SDK's `zod-to-json-schema` was built against. `instanceof ZodType` returns false; conversion yields garbage.
**How to avoid:** Use raw fetch (primary recommendation). If the SDK is unavoidable, pass a plain JSON Schema object literal, not a Zod schema.
**Warning signs:** Firecrawl response has `data.json: {}` or missing fields for pages where manual inspection shows the fields are clearly present.

### Pitfall 2: v1 API shapes in training data

**What goes wrong:** Developer writes `formats: ['extract']` with `extractorOptions: { extractionSchema, extractionPrompt }`. The v2 endpoint silently accepts the request (it's valid JSON), ignores the unknown keys, and returns `data.markdown` with no structured extraction.
**Why it happens:** Firecrawl v1 (pre-2025) used `formats: ['extract']` + `extractorOptions`. v2 replaced both with `formats: [{ type: 'json', schema, prompt }]`. Training data and older SDK tutorials reference the v1 shape.
**How to avoid:** Use v2 shape exclusively; target `https://api.firecrawl.dev/v2/scrape` explicitly (not the unversioned host). Assert `res.data.json` exists in the response before validating.
**Warning signs:** Response has `success: true` but `data.json` is undefined — the extraction silently did not run.

### Pitfall 3: Zod response validation lumps all failures

**What goes wrong:** The obvious implementation is `ProductDataSchema.safeParse(data.json)`. On failure the caller gets one `reason`, but the three failure types (`missing_price`, `missing_name`, `invalid_currency`) carry different Phase 4 UX and different operational signal. A single `invalid_response` reason collapses the three into noise.
**Why it happens:** `safeParse` returns a single error object with a list of `ZodIssue`s; translating that back to the D-02 closed union requires inspecting `error.issues[].path` — a footgun at a minimum, and Phase 4 loses the tailored toasts D-03 calls for.
**How to avoid:** **Branch-ordered explicit checks** before the wide `safeParse`. Pseudocode:

```ts
const raw = body.data.json as Record<string, unknown>
if (!raw?.product_name || typeof raw.product_name !== 'string' || raw.product_name.trim() === '') {
  console.error('scrapeProduct: missing_name', { url, raw })
  return { ok: false, reason: 'missing_name' }
}
if (typeof raw.current_price !== 'number' || raw.current_price <= 0) {
  console.error('scrapeProduct: missing_price', { url, raw })
  return { ok: false, reason: 'missing_price' }
}
if (typeof raw.currency_code !== 'string' || !/^[A-Z]{3}$/.test(raw.currency_code)) {
  console.error('scrapeProduct: invalid_currency', { url, raw })
  return { ok: false, reason: 'invalid_currency' }
}
// Only at this point is it safe to collapse the rest into a Zod parse
const parsed = ProductDataSchema.safeParse(raw)
if (!parsed.success) {
  console.error('scrapeProduct: response shape mismatch', { url, issues: parsed.error.issues })
  return { ok: false, reason: 'unknown' }
}
return { ok: true, data: parsed.data }
```

The explicit-branch-first pattern is ugly but required: the closed-union contract is the product, not a clean zod pipeline.
**Warning signs:** If the only failure reason Phase 4 ever sees from response-validation is `unknown`, the branch order is wrong — individual named reasons should fire first.

### Pitfall 4: Timeout vs abort confusion

**What goes wrong:** Developer wraps fetch in `AbortSignal.timeout(60_000)` but catches the aborted fetch with `err instanceof Error && err.name === 'AbortError'`. In Node 24 the actual error is a `DOMException` with `name === 'TimeoutError'` (distinct from user-triggered aborts which are `'AbortError'`). The check misses, the error falls through to the `unknown` branch, and the `scrape_timeout` reason never fires.
**Why it happens:** `AbortSignal.timeout` emits a `TimeoutError` DOMException (per the WHATWG Fetch spec); manual `controller.abort()` emits an `AbortError`. Training data conflates these.
**How to avoid:** Check both forms, or inspect `signal.reason`:

```ts
const isTimeout =
  (err instanceof DOMException && err.name === 'TimeoutError') ||
  (err instanceof Error && err.name === 'TimeoutError')
```

**Warning signs:** Unit test for timeout branch produces `reason: 'unknown'` instead of `reason: 'scrape_timeout'`.

### Pitfall 5: URL normalization drift between phases

**What goes wrong:** Phase 3 normalizes the URL inside `scrapeProduct`, but Phase 4's Server Action passes the **raw** user URL to Postgres `INSERT` (since D-06 asks for normalization before the uniqueness check, but the caller has the raw URL). Two users paste the same product URL with different tracking tails → two rows in `products` → two daily scrapes for one product → duplicated emails.
**Why it happens:** The normalizer lives inside `scrapeProduct` but its output (the normalized URL) is not returned — the `ProductData` shape only carries name/price/currency/image per CONTEXT.md §specifics ("No `url` field in the return").
**How to avoid:** Export `normalizeProductUrl(url: string): string` as a **separate named export** from `dealdrop/src/lib/firecrawl/normalize-url.ts`. Phase 4 Server Action calls `normalizeProductUrl(input)` *before* the DB write AND before calling `scrapeProduct`. Phase 3 plan should make this explicit: the normalizer is a public export, not a private helper.
**Warning signs:** Duplicate `products` rows for the same product appear in dev.

### Pitfall 6: `image_url` null vs required

**What goes wrong:** Developer types `image_url: z.string().url()` in the response schema. For products with no visible image, Firecrawl returns `image_url: null`. Zod rejects → `reason: 'unknown'` (or worse, swallowed as `invalid_url`). Phase 4 shows a "tracking failed" badge for products that actually scraped fine, just without an image.
**Why it happens:** `DB-01` in REQUIREMENTS.md allows `image_url TEXT` (nullable — confirmed in `dealdrop/src/types/database.ts:55`: `image_url: string | null`). The Zod schema must mirror that nullability or be stricter than the DB.
**How to avoid:** `image_url: z.string().url().nullable()` in the Zod schema. If null, store null in the DB; Phase 4 can render a placeholder. Do NOT treat null image_url as a failure reason.
**Warning signs:** Products that manually look fine in Firecrawl playground return `reason: 'unknown'` from our wrapper.

## Code Examples

### URL validation + normalization (D-05, D-06, D-08)

```ts
// Source: WHATWG URL spec + Zod 4 docs
// File: dealdrop/src/lib/firecrawl/normalize-url.ts
import { z } from 'zod'

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$)/i

const UrlSchema = z
  .string()
  .max(2048)        // D-08
  .url()             // D-05 (shape)
  .refine(
    (raw) => {
      try {
        const u = new URL(raw)
        return u.protocol === 'http:' || u.protocol === 'https:'  // D-05 (protocol allowlist)
      } catch {
        return false
      }
    },
    { message: 'Only http/https URLs are accepted' },
  )

export function normalizeProductUrl(raw: string): string | null {
  const parsed = UrlSchema.safeParse(raw)
  if (!parsed.success) return null
  const u = new URL(parsed.data)
  // D-06: lowercase scheme and host
  u.protocol = u.protocol.toLowerCase()
  u.hostname = u.hostname.toLowerCase()
  // D-06: strip trailing slash from path (but preserve root "/")
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1)
  }
  // D-06: strip tracking params, preserve everything else (including ?sku=, ?variant=)
  const keys = Array.from(u.searchParams.keys())
  for (const k of keys) {
    if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k)
  }
  return u.toString()
}
```

### JSON Schema sent to Firecrawl v2 (the payload shape)

```ts
// Source: https://docs.firecrawl.dev/features/llm-extract (verified this session)
// Source: https://docs.firecrawl.dev/api-reference/endpoint/scrape
// File: dealdrop/src/lib/firecrawl/product-schema.ts
export const PRODUCT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    product_name: {
      type: ['string', 'null'],
      description: 'Full product name as displayed on the page. Return null if not found.',
    },
    current_price: {
      type: ['number', 'null'],
      description:
        'Numeric current price (not regular/was price). Parse any formatting like "$1,299.99" to 1299.99. Return null if no price is visible.',
    },
    currency_code: {
      type: ['string', 'null'],
      description:
        'ISO 4217 alpha-3 currency code (e.g. USD, EUR, GBP, JPY, INR). If only a symbol is visible, infer the code. Return null if the currency cannot be determined.',
    },
    product_image_url: {
      type: ['string', 'null'],
      description: 'Absolute URL of the primary product image. Return null if no image is visible.',
    },
  },
  required: ['product_name', 'current_price', 'currency_code', 'product_image_url'],
} as const
```

### Response Zod schema (validates what comes back)

```ts
// File: dealdrop/src/lib/firecrawl/product-schema.ts (same file)
import { z } from 'zod'

// Firecrawl's v2 scrape envelope (we only validate what we use)
export const FirecrawlScrapeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      json: z.unknown().optional(),      // we hand-validate this below; see Pitfall 3
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
  error: z.string().optional(),
})

// Final ProductData shape (returned to Phase 4)
export const ProductDataSchema = z.object({
  name: z.string().min(1),
  current_price: z.number().positive(),
  currency_code: z.string().length(3).regex(/^[A-Z]{3}$/),
  image_url: z.string().url().nullable(),
})
```

### Full `scrapeProduct` implementation sketch

```ts
// File: dealdrop/src/lib/firecrawl/scrape-product.ts
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.

import { env } from '@/lib/env'
import { normalizeProductUrl } from './normalize-url'
import {
  PRODUCT_JSON_SCHEMA,
  FirecrawlScrapeResponseSchema,
} from './product-schema'

export type ScrapeFailureReason =
  | 'invalid_url'
  | 'network_error'
  | 'scrape_timeout'
  | 'missing_price'
  | 'missing_name'
  | 'invalid_currency'
  | 'unknown'

export type ProductData = {
  name: string
  current_price: number
  currency_code: string
  image_url: string | null
}

export type ScrapeResult =
  | { ok: true; data: ProductData }
  | { ok: false; reason: ScrapeFailureReason }

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape'
const TIMEOUT_MS = 60_000
const RETRY_BACKOFF_MS = 2_000

export async function scrapeProduct(rawUrl: string): Promise<ScrapeResult> {
  // 1. URL validation + normalization (D-05, D-06, D-07, D-08)
  const normalized = normalizeProductUrl(rawUrl)
  if (normalized === null) {
    return { ok: false, reason: 'invalid_url' }
  }

  // 2. Firecrawl call with 60s timeout + 1 retry on 5xx/network
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(FIRECRAWL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: normalized,
          formats: [
            {
              type: 'json',
              schema: PRODUCT_JSON_SCHEMA,
              prompt:
                'Extract product_name, current_price (numeric), currency_code (ISO 4217 alpha-3), product_image_url from this e-commerce product page.',
            },
          ],
          onlyMainContent: true,
          timeout: TIMEOUT_MS,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      // 4xx → don't retry
      if (res.status >= 400 && res.status < 500) {
        console.error('scrapeProduct: Firecrawl 4xx', {
          url: normalized,
          status: res.status,
          body: await res.text().catch(() => '<unreadable>'),
        })
        return { ok: false, reason: 'unknown' }
      }
      // 5xx → retry once, then give up
      if (res.status >= 500) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
          continue
        }
        console.error('scrapeProduct: Firecrawl 5xx after retry', {
          url: normalized,
          status: res.status,
        })
        return { ok: false, reason: 'network_error' }
      }

      // 2xx — parse + validate the envelope
      const json = await res.json()
      const env_ = FirecrawlScrapeResponseSchema.safeParse(json)
      if (!env_.success || !env_.data.success || !env_.data.data?.json) {
        console.error('scrapeProduct: unexpected envelope', {
          url: normalized,
          body: json,
        })
        return { ok: false, reason: 'unknown' }
      }

      const raw = env_.data.data.json as Record<string, unknown>

      // 3. Branch-ordered field validation (see Pitfall 3)
      if (
        typeof raw.product_name !== 'string' ||
        raw.product_name.trim() === ''
      ) {
        console.error('scrapeProduct: missing_name', { url: normalized, raw })
        return { ok: false, reason: 'missing_name' }
      }
      if (
        typeof raw.current_price !== 'number' ||
        !Number.isFinite(raw.current_price) ||
        raw.current_price <= 0
      ) {
        console.error('scrapeProduct: missing_price', { url: normalized, raw })
        return { ok: false, reason: 'missing_price' }
      }
      if (
        typeof raw.currency_code !== 'string' ||
        !/^[A-Z]{3}$/.test(raw.currency_code)
      ) {
        console.error('scrapeProduct: invalid_currency', {
          url: normalized,
          raw,
        })
        return { ok: false, reason: 'invalid_currency' }
      }
      // image_url is nullable (DB allows NULL per DB-01)
      const image: string | null =
        typeof raw.product_image_url === 'string' &&
        raw.product_image_url.length > 0
          ? raw.product_image_url
          : null

      return {
        ok: true,
        data: {
          name: raw.product_name.trim(),
          current_price: raw.current_price,
          currency_code: raw.currency_code,
          image_url: image,
        },
      }
    } catch (err) {
      lastErr = err
      const isTimeout =
        (err instanceof DOMException && err.name === 'TimeoutError') ||
        (err instanceof Error && err.name === 'TimeoutError')
      if (isTimeout) {
        console.error('scrapeProduct: timeout', { url: normalized, err })
        return { ok: false, reason: 'scrape_timeout' }
      }
      // Network-level error — retry once
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }
      console.error('scrapeProduct: network_error after retry', {
        url: normalized,
        err,
      })
      return { ok: false, reason: 'network_error' }
    }
  }
  // Should not reach here, but defence-in-depth
  console.error('scrapeProduct: unreachable fallthrough', {
    url: rawUrl,
    lastErr,
  })
  return { ok: false, reason: 'unknown' }
}
```

### server-only guard verification at build time

```ts
// File: any client component, for the purposes of deliberately triggering the error
'use client'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
// Next.js build output (npm run build) will fail with:
//   "You're importing a component that needs `server-only`. That only works in
//    a Server Component but one of its parents is marked with `use client`"
```

The file-level `import 'server-only'` on line 1 makes the module un-bundlable into client code — any `'use client'` → `scrapeProduct` import path fails `npm run build`. This is the same contract exercised by `dealdrop/src/lib/supabase/admin.ts`. [CITED: node_modules/next/dist/docs/01-app/02-guides/data-security.md L238-L264]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firecrawl v1 `formats: ['extract']` + `extractorOptions: { extractionSchema, extractionPrompt }` | v2 `formats: [{ type: 'json', schema, prompt? }]` | 2025 (Firecrawl v2 GA) | Training data is wrong; must use v2 shape. Live endpoint at `/v2/scrape` |
| v1 response `data.llm_extraction` | v2 response `data.json` | 2025 (v2 GA) | Different JSON path to read from |
| Manual `AbortController` + `setTimeout` pair | `AbortSignal.timeout(ms)` | Node 18+ (stable in 20+, widely available in 24) | Single line; no leaked timers |
| Jest with `@swc/jest` or `babel-jest` | Vitest native ESM + TS | 2024+ | Lighter config, native Next.js 16 / React 19 compatibility |
| `axios` / `got` / `undici` direct | Native `fetch` (Node 18+) | Node 18+ | One less dependency; same API as browser fetch |

**Deprecated / outdated:**

- `@mendable/firecrawl-js` with zod@3 (as of the version researched, 4.18.3, published 2026-04-15) — works fine for JavaScript users on zod@3, but carries unresolved zod@4 compatibility risk for this project. Not deprecated by the vendor; deprecated for *our* use.
- Firecrawl v1 endpoint shapes — superseded by v2.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Firecrawl infers ISO 4217 alpha-3 from a currency symbol (e.g., `$` → `USD`) when asked in the prompt | §Code Examples → JSON Schema `currency_code.description` | If inference is unreliable, real scrapes will return symbols and hit `invalid_currency` more often than desired. Low risk for v1 portfolio bar (Phase 4 toast copy covers the UX); higher risk for cross-currency ambiguity (`$` = USD/CAD/AUD). CONTEXT.md already acknowledges this tradeoff under "Claude's Discretion" |
| A2 | Firecrawl v2 returns `current_price` as a native JS number (not a string like `"1299.99"`) when the JSON Schema declares `"type": "number"` | §Common Pitfalls → Pitfall 3; §Don't Hand-Roll (no manual `parseFloat`) | If Firecrawl returns strings, the `typeof raw.current_price !== 'number'` check fails and fires `missing_price` incorrectly. Mitigation: add a `typeof === 'string' && !isNaN(Number(s))` coercion branch. Can be validated cheaply during Phase 3 execution by running one real scrape against a sample URL |
| A3 | `AbortSignal.timeout()` rejection produces `DOMException` with `name === 'TimeoutError'` in Node 24, not `AbortError` | §Code Examples → `scrapeProduct` body; §Common Pitfalls → Pitfall 4 | If the runtime emits a different error shape, timeout-branch unit tests fail and the real `scrape_timeout` path never runs in production. Verified by reading the WHATWG Fetch spec; local Node version confirms `typeof AbortSignal.timeout === 'function'` but exact rejection shape was not exercised live. Test case in §Validation Architecture covers this |
| A4 | Firecrawl v2 accepts a body `timeout` parameter AND respects it at the server side | §Code Examples → body includes `timeout: TIMEOUT_MS` | The local `AbortSignal.timeout(60_000)` is authoritative for *our* side of the connection regardless — so even if Firecrawl ignores the body `timeout`, we still fail-fast at 60s. Low risk |
| A5 | Firecrawl returns `product_image_url: null` (not omits the key) for products with no image when the JSON Schema declares `["string", "null"]` | §Common Pitfalls → Pitfall 6 | If the key is omitted instead, `raw.product_image_url` is `undefined` — the code handles both (`typeof === 'string' && length > 0`). No functional risk; assumption is documentary only |

**These 5 `[ASSUMED]` items are the discuss-phase candidates.** Everything else in this research was verified (codebase grep, live API curl, `npm view`, or cited docs). A2 is the one with highest planner-impact — worth a smoke test in Phase 3 Wave 0 before writing the branch-ordered validation logic.

## Open Questions (RESOLVED)

1. **Should Phase 3 hit live Firecrawl once in Wave 0 to sanity-check assumptions A2 (price is number) and A5 (image null shape)?**
   - What we know: Unit tests with `fetch` mocks cover every branch at our boundary.
   - What's unclear: Whether Firecrawl's actual response matches the documented shape for real e-commerce URLs.
   - Recommendation: Planner adds a **one-shot manual scrape task** in Wave 0 (using `curl` with the real `FIRECRAWL_API_KEY` against a known product URL like `https://www.amazon.com/dp/B08N5WRWNW`) to capture the live response shape into a commit-committed `dealdrop/src/lib/firecrawl/__fixtures__/amazon-response.json`. Unit tests then replay that fixture via mocked `fetch`. Costs ~4 Firecrawl credits; buys certainty.
   - **RESOLVED:** Plan 01 Task 3 captures live fixture (`autonomous: false`, user runs with real FIRECRAWL_API_KEY). Closes assumptions A1/A2/A5.

2. **Does Next.js 16 `next build` fail on the server-only guard in the current setup, or does it warn?**
   - What we know: The canonical guard works for `dealdrop/src/lib/supabase/admin.ts` today (Phase 1 passed verification).
   - What's unclear: Whether a deliberate reverse test (import `scrapeProduct` from a `'use client'` file) produces a build-time *error* or just a runtime error.
   - Recommendation: Plan-checker verification step adds a deliberate bad-import smoke test that must fail `npm run build` before the phase is considered complete. Remove after the assertion passes.
   - **RESOLVED:** Plan 04 Task 1 introduces a throwaway `'use client'` file, runs `npm run build`, asserts the build fails with the server-only error, then deletes the file. Also greps `.next/static/` for API-key patterns.

3. **Should the retry include a request-id header for Firecrawl-side debugging?**
   - What we know: Firecrawl response may include `concurrencyLimited` / `concurrencyQueueDurationMs` fields per the API docs.
   - What's unclear: Whether Firecrawl exposes a request-id header for correlation.
   - Recommendation: Not in scope for v1; log the response body server-side per D-04 and rely on timestamps for correlation.
   - **RESOLVED:** Out of scope for v1 per research recommendation. Timestamps + server-side `console.error` logs provide adequate correlation for portfolio bar. Revisit if Firecrawl adds a supported request-id header.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | All code | Yes | 24.15.0 | — (required by CLAUDE.md) |
| npm | Dependency install | Yes | 11.12.1 | — |
| `zod` | URL + response validation | Yes | 4.3.6 (installed) | — |
| `server-only` | Guard | Yes | 0.0.1 (installed) | — |
| Native `fetch` | HTTP call | Yes (Node 24 built-in) | n/a | — |
| `AbortSignal.timeout` | Timeout control | Yes (Node 24 built-in) | n/a | Manual `AbortController` + `setTimeout` |
| `FIRECRAWL_API_KEY` env var | Runtime scrape | Unknown locally — set in `.env.local` during dev, in Vercel env during prod | — | Phase gate in Wave 0: confirm `env.ts` build passes; a missing key produces a clear build-time error per `@t3-oss/env-nextjs` |
| Firecrawl API endpoint `https://api.firecrawl.dev/v2/scrape` | Scrape call | Yes (live) | v2 | — (this is the core dependency) |
| `vitest` | Unit tests | No (not yet installed) | — (install `^3.x`) | Can be installed in Wave 0 as `npm install -D vitest` |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**

- `vitest` — install in Wave 0 as a dev dependency. Plan should make this an explicit early task.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^3.x` — install in Wave 0 (none currently present) |
| Config file | `dealdrop/vitest.config.ts` — create in Wave 0 (none currently present) |
| Quick run command | `cd dealdrop && npx vitest run src/lib/firecrawl` |
| Full suite command | `cd dealdrop && npx vitest run` |

### Validation Seams (Nyquist Dimension 8)

The `scrapeProduct` module has exactly three external seams. Unit tests must cover each seam's correctness independently:

| Seam | Boundary | What can go wrong | Test approach |
|------|----------|-------------------|---------------|
| URL entry | `scrapeProduct` arg → `normalizeProductUrl` → Zod `UrlSchema` | Malformed strings, `file://`, `javascript:`, >2048 chars, mis-handled tracking params, trailing-slash drift, lowercased host breaking URLs | Pure-function unit tests on `normalizeProductUrl` — no mocks needed |
| Firecrawl wire exit | Fetch body shape matches v2 `formats:[{type:'json',schema,prompt}]` | Wrong endpoint, missing Bearer header, wrong `formats` shape (v1 vs v2 regression), JSON schema drift | Mock `global.fetch`, assert the call arguments passed to fetch (method, URL, headers, body) |
| Firecrawl response entry | Firecrawl → envelope validation → branch-ordered field checks → `ProductData` / `ScrapeFailureReason` | Missing `data.json`, wrong field types, null vs missing discrimination, the D-02 union is closed and complete, each reason fires on a distinct condition | Mock `global.fetch` to return each scripted response; assert the `ScrapeResult` narrows to the expected branch |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRACK-03 | Zod rejects `""` | unit | `npx vitest run src/lib/firecrawl -t "invalid_url empty"` | Wave 0 |
| TRACK-03 | Zod rejects `file:///etc/passwd` | unit | `-t "invalid_url non-http"` | Wave 0 |
| TRACK-03 | Zod rejects `"javascript:alert(1)"` | unit | `-t "invalid_url javascript"` | Wave 0 |
| TRACK-03 | Zod rejects 2049-char URL | unit | `-t "invalid_url too long"` | Wave 0 |
| TRACK-03 | Normalizer lowercases `HTTPS://Example.COM/X/` to `https://example.com/X` | unit | `-t "normalize lowercase + trailing slash"` | Wave 0 |
| TRACK-03 | Normalizer strips `utm_source=x&gclid=y` but preserves `sku=123` | unit | `-t "normalize tracking vs variant"` | Wave 0 |
| TRACK-04 | Fetch called with `POST https://api.firecrawl.dev/v2/scrape`, correct Bearer, v2 body shape | unit | `-t "firecrawl request shape"` | Wave 0 |
| TRACK-04 | JSON Schema in body has all 4 product fields + prompt | unit | `-t "firecrawl schema payload"` | Wave 0 |
| TRACK-04 | Happy path returns `{ ok: true, data: { name, current_price, currency_code, image_url } }` | unit | `-t "happy path"` | Wave 0 |
| TRACK-04 | Happy path with `image_url: null` also succeeds (DB-01 nullable) | unit | `-t "happy path null image"` | Wave 0 |
| TRACK-05 | Null `current_price` → `reason: 'missing_price'` | unit | `-t "missing_price null"` | Wave 0 |
| TRACK-05 | Zero `current_price` → `reason: 'missing_price'` | unit | `-t "missing_price zero"` | Wave 0 |
| TRACK-05 | Negative `current_price` → `reason: 'missing_price'` | unit | `-t "missing_price negative"` | Wave 0 |
| TRACK-05 | Missing `product_name` → `reason: 'missing_name'` | unit | `-t "missing_name"` | Wave 0 |
| TRACK-05 | Empty-string `product_name` → `reason: 'missing_name'` | unit | `-t "missing_name empty"` | Wave 0 |
| TRACK-05 | Currency `"$"` → `reason: 'invalid_currency'` | unit | `-t "invalid_currency symbol"` | Wave 0 |
| TRACK-05 | Currency `"usd"` (lowercase) → `reason: 'invalid_currency'` | unit | `-t "invalid_currency lowercase"` | Wave 0 |
| — | 500 response retried once, then `reason: 'network_error'` | unit | `-t "network_error 5xx retry then fail"` | Wave 0 |
| — | 500 response retried once, succeeds on retry → `{ ok: true, ... }` | unit | `-t "network_error 5xx recovers"` | Wave 0 |
| — | 400 response NOT retried, → `reason: 'unknown'` (logs body) | unit | `-t "no retry on 4xx"` | Wave 0 |
| — | Fetch rejection with `TimeoutError` → `reason: 'scrape_timeout'` | unit | `-t "scrape_timeout"` | Wave 0 |
| — | Fetch rejection with generic network error → retry, then `reason: 'network_error'` | unit | `-t "network_error retry"` | Wave 0 |
| — | server-only guard — importing `scrapeProduct` from a `'use client'` file fails `npm run build` | build-time | `cd dealdrop && npm run build` after deliberately wiring a bad import | Wave 2 / human-verify (remove bad import after check) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/firecrawl` (expected < 3s for ~20 unit tests with mocked fetch)
- **Per wave merge:** `npx vitest run` + `npm run lint` + `npm run build` (build is slow but catches the server-only contract)
- **Phase gate:** Full suite green + one live-fetch smoke test against Firecrawl (Open Question 1) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `dealdrop/vitest.config.ts` — minimal config (test env `node`, includes `src/**/*.test.ts`, path alias `@/*`)
- [ ] `dealdrop/package.json` — add `"test": "vitest run"` and `"test:watch": "vitest"` scripts
- [ ] `dealdrop/src/lib/firecrawl/__fixtures__/` — optional but recommended: live-captured Firecrawl response fixture (Open Question 1)
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not applicable at this layer — auth happens in Phase 2 / Phase 4 Server Action |
| V3 Session Management | no | Same |
| V4 Access Control | no | `scrapeProduct` takes a string URL and returns data; no user-scoped resources here. Access control enforcement is the Phase 4 Server Action's job (RLS + `auth.uid()` before DB write) |
| V5 Input Validation | yes | Zod URL schema (`dealdrop/src/lib/firecrawl/normalize-url.ts`) — enforces shape + protocol + max length. Zod response schema — enforces output shape before it reaches the DB write |
| V6 Cryptography | no | No crypto in this module (TLS is handled by Node's fetch implementation) |
| V9 Communication Security | yes | All Firecrawl calls are HTTPS (hardcoded `https://api.firecrawl.dev`); Bearer token in `Authorization` header only, never query string |
| V12 Files and Resources | no | No file handling |
| V14 Configuration | yes | `FIRECRAWL_API_KEY` loaded through typed `env` module with `@t3-oss/env-nextjs` validation — will fail build if missing or empty; `server-only` guard prevents key from leaking into client bundle |

### Known Threat Patterns for Next.js 16 + Firecrawl wrapper

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via user-pasted URL | Tampering | CONTEXT.md D-05 explicitly declines SSRF blocks on our server because Firecrawl runs in *their* infra, not ours — the request from our Node process is always to `api.firecrawl.dev`, not to the user-supplied URL. Protocol allowlist (`http`/`https` only) prevents `file://` / `javascript:` / `ftp://` schemes from reaching Firecrawl (defensive, low-cost) |
| API key leak to client bundle | Information Disclosure | Line-1 `import 'server-only'` in `scrape-product.ts`; typed `env` module marks `FIRECRAWL_API_KEY` as server-only in `server: {}` (not `client: {}` per `dealdrop/src/lib/env.ts:8`); deliberate bad-import test in Validation Architecture |
| API key leak via server response (D-04 risk) | Information Disclosure | `ScrapeResult` return type is `{ ok: false, reason }` only — no `detail`, no HTTP status, no Firecrawl error strings returned to callers. Full context goes to `console.error` on the server |
| URL-length DoS via 100 KB URL | Denial of Service | `z.string().max(2048)` rejects before the Firecrawl call is made (D-08) |
| Retry amplification (DoS of Firecrawl) | Denial of Service | Exactly 1 retry on 5xx/network; no retry on 4xx; no retry on timeout. Bounded blast radius |
| Pricing tampering via malicious product page JS | Tampering | Firecrawl extracts server-side; we don't execute the product page JS in our runtime. The extracted value still passes through `z.number().positive()` — a page that claims `current_price: -1e308` will be rejected as `missing_price` |
| Cache poisoning | Tampering | Out of scope — no cache in Phase 3 (scrape-result cache is a deferred Phase 7 item) |
| Logged secret leak | Information Disclosure | `console.error` payloads include `raw` response + URL, but explicitly NOT the Bearer token (never logged). Plan must call this out as a Don't-Log in task instructions |

## Sources

### Primary (HIGH confidence)

- **Firecrawl v2 /scrape endpoint specification** — https://docs.firecrawl.dev/api-reference/endpoint/scrape — POST method, `formats: [{ type: 'json', schema, prompt }]` body shape, `data.json` response location, `timeout` parameter (min 1000ms, max 300_000ms, default 60_000ms)
- **Firecrawl v2 llm-extract / JSON mode** — https://docs.firecrawl.dev/features/llm-extract — Example curl request shape and response containing `data.json` for structured extraction
- **Firecrawl v2 scrape feature** — https://docs.firecrawl.dev/features/scrape — Confirms SDK method signature `firecrawl.scrape(url, { formats: [{ type: 'json', schema }] })`
- **`@mendable/firecrawl-js@4.18.3` package manifest** — `npm view @mendable/firecrawl-js version dependencies engines` returned:
  - `version = '4.18.3'`, `time.modified = '2026-04-15T21:34:37.550Z'`
  - `dependencies = { axios: '1.15.0', firecrawl: '4.16.0', 'typescript-event-target': '^1.1.1', zod: '^3.23.8', 'zod-to-json-schema': '^3.23.0' }`
  - `engines = { node: '>=22.0.0' }`
  - This is the direct source for the zod@3 vs zod@4 conflict finding
- **Next.js 16 data-security doc** — `dealdrop/node_modules/next/dist/docs/01-app/02-guides/data-security.md` L238-L264 — The `server-only` guard is the canonical pattern; DAL approach recommended for new projects
- **Project codebase** — `dealdrop/src/lib/env.ts:8` (FIRECRAWL_API_KEY server-only), `dealdrop/src/lib/supabase/admin.ts:1` (canonical server-only guard line), `dealdrop/src/types/database.ts:55` (image_url nullable), `dealdrop/package.json:29` (zod@4.3.6)
- **Live Firecrawl endpoint smoke test** — `curl -X POST https://api.firecrawl.dev/v2/scrape ...` returned `{"success":false,"error":"Unauthorized: Invalid token"}` this session, confirming v2 is live and the `success` envelope field is real

### Secondary (MEDIUM confidence)

- **Firecrawl `/v2/extract` endpoint** — https://docs.firecrawl.dev/api-reference/endpoint/extract — Documents the separate `extract` endpoint (different from `scrape`). Not used here; included for disambiguation (Phase 3 uses `/v2/scrape` with JSON format, NOT `/v2/extract`)
- **WebSearch: Firecrawl v2 scrape curl example with formats json schema** — Multiple search results confirm the `formats: [{ type: 'json', schema, prompt }]` shape consistently

### Tertiary (LOW confidence)

- **A1 (currency symbol → ISO 4217 inference)** — Extrapolated from Firecrawl's LLM-extraction capability; not explicitly documented as a guarantee
- **A2 (current_price returned as number)** — Extrapolated from JSON Schema `"type": "number"` declaration; real behavior requires live verification (Open Question 1)
- **A5 (null vs missing key for image_url)** — Standard JSON Schema behavior for `["string", "null"]`; not explicitly documented for Firecrawl's LLM extraction

## Metadata

**Confidence breakdown:**

- Standard stack (raw fetch, zod, server-only): **HIGH** — all packages already installed or present in Node runtime; conflict with SDK verified via `npm view`
- Firecrawl v2 API shape: **HIGH** — verified via live curl + multiple cross-referenced docs pages
- Validation architecture (20 test cases): **HIGH** — every case maps 1:1 to a documented behavior or a locked D-decision
- Assumptions A1-A5: **MEDIUM** — grounded in JSON Schema and LLM-extraction norms but not each individually verified against a real scrape; A2 is the one worth live-checking
- Retry-on-timeout interpretation of CONTEXT "Claude's Discretion": **MEDIUM** — research recommends *no* retry on timeout; planner may deviate

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (30 days — Firecrawl API is stable but fast-moving; the v1→v2 cutover within the last year means any major version bump warrants re-research)
