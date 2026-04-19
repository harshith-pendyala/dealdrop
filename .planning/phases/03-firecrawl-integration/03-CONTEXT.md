# Phase 3: Firecrawl Integration - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a server-only `scrapeProduct(url)` function that:
1. Validates the input URL with Zod
2. Calls Firecrawl `scrape` with a JSON schema extracting `product_name`, `current_price`, `currency_code`, `product_image_url`
3. Validates the scraped payload with Zod
4. Returns a typed `{ ok: true, data } | { ok: false, reason }` discriminated union

Consumed by Phase 4 (add-product Server Action) and Phase 6 (daily price-check cron).

**In scope:**
- `scrapeProduct(url)` implementation + unit-level type contract
- URL validation (Zod + light normalization)
- Firecrawl response validation (Zod schema matching DB columns)
- Failure taxonomy (typed closed union of reason codes)
- `server-only` guard so Firecrawl key never enters browser bundle

**Not in scope:**
- Add-product form UI — Phase 4
- Cron handler + email alerts — Phase 6
- Caching scrape results across calls — deferred (Phase 7 polish candidate)
- Firecrawl SDK choice (sdk vs raw fetch) — planner's call informed by research

</domain>

<decisions>
## Implementation Decisions

### Failure Taxonomy & Error UX

- **D-01:** `scrapeProduct()` returns a **discriminated union**: `{ ok: true, data: ProductData } | { ok: false, reason: FailureReason }`. No throws for expected failures. Callers must handle both branches — type system prevents silent misuse and matches the Phase 1 Zod-first style.

- **D-02:** Failure reasons are a **closed, specific union**: `invalid_url | network_error | scrape_timeout | missing_price | missing_name | invalid_currency | unknown`. Enables Phase 4 to show tailored toasts and Phase 6 to emit structured cron metrics. `unknown` is the escape hatch for genuinely unexpected cases (e.g., Firecrawl returns a response shape we didn't anticipate).

- **D-03:** **Phase 4 owns the reason → toast-copy map.** scrapeProduct returns only the machine-readable reason code. Phase 4's add-product form maps each reason to user-facing copy (e.g., `invalid_url` → "That URL doesn't look right"; `missing_price` → "We couldn't find a price on that page"; `network_error` → "Couldn't reach that site — try again"). Keeps scrapeProduct UI-agnostic and makes copy changes a Phase 4 concern.

- **D-04:** **Server-side logging + reason-only return.** On any failure, `console.error` the full Firecrawl response (or caught error stack) server-side so Phase 6 cron logs are observable. The return payload is strictly `{ ok: false, reason }` — **NO `detail` field in the production return** — to prevent leaking scraping internals (HTTP status codes, Firecrawl field paths, target URL structure) into the browser bundle via server actions.

### URL Validation Strictness

- **D-05:** **URL shape validation** is Zod `z.string().url()` + protocol allowlist check (`url.protocol === 'http:' || url.protocol === 'https:'`). Rejects `ftp://`, `file://`, `javascript:`, etc. No localhost/private-IP block (Firecrawl runs in their infra, not ours — no SSRF surface on our server) and no domain allowlist (breaks the "any e-commerce URL in the world" core value per PROJECT.md).

- **D-06:** **Light URL normalization** applied before scraping and before the `(user_id, url)` uniqueness check lands:
  - Lowercase scheme and host
  - Strip trailing slash from path
  - Strip tracking params: `utm_*`, `fbclid`, `gclid`
  - Preserve variant-identifying params (e.g., `?sku=123`, `?variant=red`) verbatim
  
  Prevents two users (or the same user) from duplicate-tracking the same product just because the URL had a tracker tail. **Deferred:** redirect-following canonicalization (HTTP 301/302 → final URL) is over-engineering for v1.

- **D-07:** **Validation lives inside `scrapeProduct()`** as the first guard. Phase 4's add-product form does its own Zod validation for immediate client feedback on paste, but `scrapeProduct` does not trust the caller — validates again server-side. Defense in depth. Also future-proofs Phase 6 cron: URLs stored months ago may fail re-validation if sites evolve, and `scrapeProduct` should catch that itself.

- **D-08:** **URL max length** is capped at `z.string().max(2048)`. Matches common HTTP URL caps, accommodates real-world Amazon variant URLs (~1500 chars), prevents pathological input. Aligned with Phase 1 `products.url` column (Postgres `text` accepts unlimited but 2048 is the practical upper bound).

### Claude's Discretion

The user chose not to discuss currency handling and retry/timeout policy in depth. Planner should use these defaults; if either materially affects the plan, surface as a deviation:

- **Currency handling:** Accept only ISO 4217 alpha-3 codes from Firecrawl's `currency_code` field (`USD`, `EUR`, `INR`, `GBP`, `JPY`, …). If Firecrawl returns a symbol (`$`, `€`, `₹`) or a non-standard code, return `{ ok: false, reason: 'invalid_currency' }`. Rationale: Firecrawl's JSON-schema extraction is strong enough to prefer ISO codes when prompted; per-product symbol mapping adds edge cases (`$` could mean USD/CAD/AUD/MXN) that don't pay back at portfolio bar.
- **Retry/timeout policy:** 60-second timeout on the Firecrawl call. 1 retry on transient 5xx or network errors with 2-second exponential backoff (2s, then give up). No retry on 4xx (client errors — Firecrawl won't change its mind). Timeout maps to `scrape_timeout` reason; network errors to `network_error`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — TRACK-03, TRACK-04, TRACK-05 acceptance criteria (the only ones in scope for Phase 3)
- `.planning/ROADMAP.md` §"Phase 3: Firecrawl Integration" — goal + 3 success criteria
- `.planning/PROJECT.md` — "Core Value" constraint (daily price check + email loop must work; any-site URL support is non-negotiable)

### Existing Code Contracts (reuse verbatim)
- `dealdrop/src/lib/env.ts` — `FIRECRAWL_API_KEY` already Zod-validated in the server-only section; **import `env.FIRECRAWL_API_KEY`, never `process.env.FIRECRAWL_API_KEY` directly**
- `dealdrop/src/lib/supabase/admin.ts` — precedent for the `import 'server-only'` guard pattern that Phase 3 must replicate at the top of the scrapeProduct module
- `dealdrop/src/types/database.ts` — generated Supabase types for `products.url` / `name` / `current_price` / `currency` / `image_url` columns (ProductData shape must satisfy what Phase 4 writes)

### Prior-Phase Decisions That Bind This Phase
- `.planning/phases/01-foundation-database/01-CONTEXT.md` §D-04 — `dealdrop/.env.local` is the env file; `FIRECRAWL_API_KEY` gets added there
- `.planning/phases/01-foundation-database/01-VERIFICATION.md` — confirms Zod + env validation chain is green (D-15 already closed at Phase 2)

### To Be Added by Researcher
- Firecrawl docs — prefer `scrape` with JSON schema extraction (per TRACK-04). Researcher should cite the exact Firecrawl endpoint, SDK method (or raw HTTP), and recommended JSON schema shape.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`env.FIRECRAWL_API_KEY`** — typed, validated at build time, server-only. Just import from `@/lib/env` and use.
- **`server-only` guard pattern** — `dealdrop/src/lib/supabase/admin.ts:1` shows the canonical `import 'server-only'` first-line guard. Phase 3 module mirrors this exactly.
- **Zod 4.x** installed (package.json: `"zod": "^4.3.6"`). Use `z.object`, `z.discriminatedUnion`, `z.string().url()`, `z.number().positive()`.

### Established Patterns
- **Validate at the boundary** — `env.ts` validates env vars at startup; Phase 1 tables validate at the DB layer. Phase 3 validates URLs at entry and Firecrawl responses at exit. Same pattern.
- **Discriminated-union return types** — aligns with the Phase 2 auth result style (return `{ ok, error }` variants rather than throw).
- **Files under `dealdrop/src/lib/...`** — utilities live here (see `env.ts`, `utils.ts`, `supabase/*`). `scrapeProduct` likely belongs at `dealdrop/src/lib/firecrawl/scrape-product.ts` or `dealdrop/src/lib/scrape.ts` — planner's call.

### Integration Points
- **Phase 4 `Add Product` Server Action** will call `scrapeProduct(url)` inside a Zod-validated Server Action, then (if `ok`) insert into `products` + `price_history`.
- **Phase 6 cron handler** iterates all products and calls `scrapeProduct(product.url)` to check for price drops. Same function, same contract — no two variants.
- **No client code should ever reach this module.** The `server-only` guard makes import from a `'use client'` file a build error.

</code_context>

<specifics>
## Specific Ideas

- **Reason codes are the downstream contract.** The exact string values `invalid_url | network_error | scrape_timeout | missing_price | missing_name | invalid_currency | unknown` are locked — Phase 4's toast map and Phase 6's metrics both key on them. Planner must export the union as a named TypeScript type (`export type ScrapeFailureReason = ...`) for shared import.
- **`ProductData` shape must match the DB write exactly.** Keys: `name` (string), `current_price` (number), `currency_code` (string, ISO 4217 alpha-3), `image_url` (string URL). No `url` field in the return — the caller already has the URL they passed in. Avoids a drift path where normalized vs raw URL diverge between the return and the DB write.
- **Phase 1 WR-03 loopback fix style.** Errors are caught at the boundary, logged with full context server-side, returned with a coarse reason to the caller. Don't swallow; don't leak.

</specifics>

<deferred>
## Deferred Ideas

- **Scrape-result caching** (e.g., LRU with 1-hour TTL to avoid re-hitting Firecrawl when a user pastes the same URL twice in quick succession) — nice-to-have for cost control; not needed for v1 portfolio bar. Log as Phase 7 polish candidate if Firecrawl cost becomes a concern.
- **Aggressive URL canonicalization** (follow HTTP 301/302 redirects before hashing) — explicitly out of scope. Extra HEAD request per paste adds latency and failure modes; 99% of e-commerce URLs don't redirect meaningfully.
- **Domain allowlist** — rejected. Breaks "any e-commerce URL in the world" core value.
- **Retry-with-different-scrape-mode fallback** — e.g., if JSON-schema extraction returns `missing_price`, retry with markdown + regex. Over-engineering for v1; if it becomes a recurring issue, add in a later iteration.

</deferred>

---

*Phase: 03-firecrawl-integration*
*Context gathered: 2026-04-19*
