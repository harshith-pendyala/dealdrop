# Phase 6: Automated Monitoring & Email Alerts - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the core-value loop of DealDrop: a daily pg_cron job re-scrapes every tracked product via the Phase 3 `scrapeProduct()` function, writes a new `price_history` row when the price has changed, updates `products.current_price`, and fires a Resend email to the product owner when the new price is lower than the previous `current_price`. Plus Vault-backed `CRON_SECRET` storage so the token never appears plaintext in the `cron.job` table. Covers CRON-01 through CRON-11 and EMAIL-01 through EMAIL-06.

**In scope:**
- `POST /api/cron/check-prices` Route Handler with Bearer-token auth + `maxDuration = 300` (CRON-01, CRON-02, CRON-05)
- `GET /api/cron/check-prices` public health check returning `{ status: "ok" }` — no auth, no scraping (CRON-01)
- Cron body: `createAdminClient()` → SELECT all products → bounded-concurrency (`p-limit`, cap 2-3) fan-out to `scrapeProduct()` → per-product price-change branch (CRON-03, CRON-04, CRON-06)
- On price change: INSERT `price_history` row THEN UPDATE `products` (new `current_price`, `updated_at`, clear `last_scrape_failed_at = NULL`) (CRON-07)
- Idempotency enforced via the price-change gate — no duplicate rows when same-day re-run finds an unchanged price (CRON-08)
- On scrape failure: UPDATE `products.last_scrape_failed_at = now()` only; leave `current_price` + `price_history` untouched; continue the run (CRON-09)
- `lib/resend.ts` `sendPriceDropAlert(user, product, oldPrice, newPrice)` with inline HTML template-literal email body (EMAIL-01, EMAIL-02, EMAIL-03)
- Email delivery fan-out: one Resend call per dropped product (one-email-per-drop, not digest) (EMAIL-01)
- User's email address resolved via admin client `auth.admin.getUserById(product.user_id)` (EMAIL-05)
- Email send failures are `console.error`'d but do not abort the cron run or revert DB writes (EMAIL-06)
- pg_cron schedule wired in a Supabase migration: daily `0 9 * * *` UTC calling `POST /api/cron/check-prices` with Bearer token from Vault (CRON-10, CRON-11)
- Vault integration: `vault.create_secret('cron-secret-token', '<token>')` + SQL wrapper function that reads the decrypted secret and calls `net.http_post` — the `cron.job.command` string must never contain the plaintext `CRON_SECRET`

**Not in scope:**
- Vercel production deployment of the cron endpoint — Phase 7 (DEP-05)
- Resend domain DNS propagation (SPF/DKIM setup at the registrar) — operational task; begin early per STATE.md blocker, verify in Phase 7 (EMAIL-04)
- Structured cron-run audit table (`cron_runs`) — not selected for discussion; Claude's discretion during planning
- Cron POST response body shape — not selected; planner picks (see Claude's Discretion)
- Alert edge cases beyond the locked behavior (currency-code change mid-lifecycle, floating-point tiny drops, multi-drops-per-day on manual re-trigger) — not selected; sensible defaults below
- UI changes to the dashboard — Phase 4 already owns the DASH-08 badge; Phase 6 just writes `last_scrape_failed_at`
- Per-product alert thresholds, digest emails, or retry-on-email-failure — explicitly out of scope per PROJECT.md / REQUIREMENTS.md v2+

</domain>

<decisions>
## Implementation Decisions

### Price-change detection & idempotency

- **D-01:** **Compare scraped price against `products.current_price`** (not against the latest `price_history` row). Single column read, zero extra query. `current_price` is the authoritative cache of the last-recorded price; it stays in sync because the handler updates it in the same step as the `price_history` INSERT (D-04). Matches CRON-07 literally ("new price different from `current_price`"). If the two ever drift, it's a handler bug, not a data-model problem.

- **D-02:** **Price-change gate only for idempotency (CRON-08).** INSERT a new `price_history` row only when `scrapedPrice !== products.current_price`. Same-day re-runs re-scrape (Firecrawl cost paid again) but do not duplicate rows because the price is identical — the gate rejects the INSERT. Manual re-trigger during Phase 7 DEP-06 verification is safe — always idempotent, no `?force=1` escape hatch needed. No `cron_runs` audit table in v1 (deferred — see Deferred Ideas below). Rationale: simplest possible idempotency model; doubles Firecrawl cost only on intentional manual re-triggers, which is acceptable for portfolio bar.

- **D-03:** **On scrape failure: `UPDATE products SET last_scrape_failed_at = now()` only.** No `price_history` insert. `current_price` untouched. No new `last_scrape_reason` column (deferred — see Deferred Ideas). The DASH-08 badge (Phase 4) renders whenever `last_scrape_failed_at IS NOT NULL`; Phase 4's contract is "non-NULL = failing" and that's sufficient. Structured `console.error` with the `ScrapeFailureReason` code gives us log-line observability without a schema change.

- **D-04:** **On price-change success: INSERT `price_history` first, then UPDATE `products` with all three fields atomically** — `current_price`, `updated_at`, and `last_scrape_failed_at = NULL`. Writes happen as two sequential admin-client calls (no Postgres RPC wrapper in v1 — deferred). If the INSERT succeeds and the UPDATE fails, the handler logs the divergence and continues — the next successful cron for that product reconciles. Clearing `last_scrape_failed_at` to NULL on every successful price-change write gives "badge goes away on recovery" semantics. **Note on unchanged-price success:** when scrape succeeds AND price is unchanged, the handler runs a conditional `UPDATE products SET last_scrape_failed_at = NULL, updated_at = now() WHERE id = $1 AND last_scrape_failed_at IS NOT NULL` — this clears a previously-failing flag even when the price itself didn't change. One extra conditional UPDATE per healthy product; keeps the DASH-08 badge honest.

### Email template & rendering approach

- **D-05:** **Inline HTML template-literal in `lib/resend.ts`** — a single exported function `renderPriceDropEmailHtml({ product, oldPrice, newPrice, percentDrop })` returns a string. Zero new dependencies. Uses table-based HTML layout so it renders in Outlook and Gmail without surprises (modern flexbox/grid layouts are unreliable across email clients). Approximately 60-80 lines of HTML in a template literal with interpolated values. **No `react-email` / `@react-email/components` package** — nice DX but adds 3-4 deps, a new component tree, and render-time complexity for a single template.

- **D-06:** **Primary CTA 'View Product' button links directly to `products.url`** (the original e-commerce URL), with `target="_blank"` and `rel="noopener noreferrer"`. No secondary "View in DealDrop" link. Rationale: core value is "never miss a price drop" — the friction between opening the email and landing on the store's product page is the failure mode. One hop to the store is the right click-through experience.

- **D-07:** **Percentage drop rendered as a hero number at the top of the email body** — format: `"−18%"` or `"SAVE 18%"` (planner picks the copy; either is acceptable) in a large font treatment. Below the hero number: old price with `<s>strikethrough</s>` and new price in a prominent style. Percentage rounded to whole integer (`Math.round((oldPrice - newPrice) / oldPrice * 100)`). Currency-agnostic — the percent is always meaningful regardless of `currency` value. Matches EMAIL-03's "percentage drop" requirement directly.

- **D-08:** **One Resend email per dropped product, per cron run.** If a user has 3 drops in a single cron run, they get 3 separate emails. No digest-email grouping, no "one-email-per-user-with-all-drops" template. Rationale: each email is focused on one product (one image, one drop %, one CTA); simpler template; no grouping step in the handler; matches the "never miss a price drop" core value literally — each drop gets its own notification. Edge case (one user tracks many fast-moving items, sees a flood of emails on a volatile day): acceptable at portfolio bar. Deferred for v2+ as the digest idea.

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner should use these defaults; surface as a deviation if any materially changes the plan or user-visible behavior.

- **Cron POST response body.** Recommend: return `{ status: "ok", scraped: N, updated: M, dropped: K, failed: [{ product_id, reason }] }` with HTTP 200. Gives Phase 7 DEP-06 manual-trigger verification a signal (curl the endpoint, inspect the JSON) without needing a `cron_runs` audit table. Plain `{ status: "ok" }` is also acceptable if the planner prefers less surface area; log the counts to `console.log` instead.

- **Alert edge cases (the subtle stuff).**
  - **Currency-code change mid-lifecycle** (e.g., `USD → CAD` because Firecrawl resolved a geo-redirect differently one day): if `scrapedCurrency !== products.currency`, treat it as a **non-drop** regardless of numeric price comparison — a different currency isn't a comparable price. Log it as a structured warning. Don't email; don't insert a `price_history` row (would pollute the chart). Planner: if this edge case feels under-specified, add a `reason: 'currency_changed'` log and skip the product. No schema change.
  - **Floating-point tiny drops** (`9.99 → 9.98`): treat any `newPrice < oldPrice` as a drop — no tolerance threshold. A 1-cent drop is still "a price drop" per the locked "any drop" rule. If this produces noise in practice (users complain), v2+ introduces a minimum-drop threshold.
  - **First-ever cron check** (product was just added; `price_history` has exactly one row — the initial seed from Phase 4 TRACK-06; `current_price` equals that seed): the cron re-scrape compares against the seeded `current_price`. If the newly-scraped price differs, insert + email as normal. There is no special "skip first-ever run" case — the initial seed IS the baseline.
  - **Multiple drops same day on manual re-trigger**: because D-02 uses the price-change gate, a same-day re-trigger on an unchanged price produces zero new rows and zero emails. A same-day re-trigger on a product whose price genuinely dropped between triggers (real race): both emails send. Acceptable at portfolio bar.

- **Vault SQL pattern (CRON-11).** Planner should research the exact Vault syntax during research phase (STATE.md flags this as needing verification). Recommended pattern: `SELECT vault.create_secret('<token>', 'dealdrop_cron_secret')` + a SECURITY DEFINER SQL function `public.trigger_price_check_cron()` that reads `(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dealdrop_cron_secret')`, builds the Authorization header, and calls `net.http_post(url := '...', headers := '...')`. pg_cron then calls `SELECT public.trigger_price_check_cron()` instead of embedding `net.http_post` with the raw token. The `cron.job.command` column must grep-clean of any substring that looks like the CRON_SECRET value.

- **Sender identity.** `RESEND_FROM_EMAIL` env var already validated as a real email (see `env.server.ts`). Display name: `"DealDrop <alerts@yourdomain.dev>"` is a reasonable default. Exact display name at planner's discretion.

- **Scrape-order & batching.** Iterate products in `created_at ASC` order; `p-limit(3)` concurrency cap. No chunking or queueing — `maxDuration = 300` + concurrency 3 + average scrape ~5-10s comfortably handles ~50-100 products within one Vercel invocation. If product count grows past that, re-architect (queue, Inngest, etc.) — out of scope for v1.

- **p-limit ESM/CJS compat.** STATE.md flags this as needing verification. Current `p-limit` latest is ESM-only (v6+). If that causes a Next.js 16 + Turbopack issue, drop to `p-limit@3.1.0` (CJS-compatible) or write a 10-line inline concurrency limiter. Planner resolves this during research.

### Folded Todos

None — no pending todos matched this phase (verified via `gsd-tools todo match-phase 6`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — CRON-01 through CRON-11 + EMAIL-01 through EMAIL-06 acceptance criteria (the only ones in scope for Phase 6)
- `.planning/ROADMAP.md` §"Phase 6: Automated Monitoring & Email Alerts" — goal + 6 success criteria
- `.planning/PROJECT.md` — Core Value ("daily price check + email alert loop must work end-to-end"); "Any price drop" rule; Daily cadence; Portfolio/demo quality bar

### Prior Phase Context (locked decisions this phase consumes)
- `.planning/phases/01-foundation-database/01-CONTEXT.md` — Three-client Supabase factory pattern (use `createAdminClient()`); `server-only` guard at module top; `pg_cron` + `pg_net` already enabled in migration 0003
- `.planning/phases/03-firecrawl-integration/03-CONTEXT.md` §D-01, D-02, D-04 — `scrapeProduct()` returns discriminated union; closed `ScrapeFailureReason` union (`invalid_url | network_error | scrape_timeout | missing_price | missing_name | invalid_currency | unknown`); server-side `console.error` on failure with coarse reason-only return
- `.planning/phases/03-firecrawl-integration/03-RESEARCH.md` — Raw fetch vs SDK choice (raw fetch won); Firecrawl v2 endpoint shape; verified env-var patterns
- `.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md` §D-07 Claude's Discretion — `products.last_scrape_failed_at TIMESTAMPTZ NULL` column contract: NULL = healthy, non-NULL = failing; cleared on successful re-scrape; Phase 6 writes, Phase 4 reads

### Existing Code Contracts (reuse verbatim)
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — `scrapeProduct(url: string): Promise<ScrapeResult>` server-only; call this directly from the cron handler; narrow on `result.ok`
- `dealdrop/src/lib/firecrawl/types.ts` — `ScrapeResult`, `ScrapeFailureReason`, `ProductData` typed exports
- `dealdrop/src/lib/supabase/admin.ts` — `createAdminClient()` bypasses RLS for the cron worker; must be called from server-only contexts
- `dealdrop/src/lib/env.server.ts` — `env.RESEND_API_KEY`, `env.RESEND_FROM_EMAIL`, `env.CRON_SECRET` (min 32 chars) all Zod-validated; server-only
- `dealdrop/src/lib/env.ts` — `env.NEXT_PUBLIC_SUPABASE_URL` for the admin client constructor
- `dealdrop/src/types/database.ts` — generated Supabase types for `products` (includes `last_scrape_failed_at`) and `price_history`
- `dealdrop/src/lib/products/get-user-products.ts` — reference pattern for nested Supabase selects + RLS-scoped reads (cron uses admin client, but the select-shape pattern is the same)
- `dealdrop/supabase/migrations/0003_enable_extensions.sql` — confirms `pg_cron` + `pg_net` are already enabled
- `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql` — confirms the column exists with a partial index on non-NULL values (Phase 6 cron reads/writes this column)

### Research to Perform (for researcher)
- **Supabase Vault SQL syntax (CRON-11)** — exact `vault.create_secret()` / `vault.decrypted_secrets` read pattern + SECURITY DEFINER wrapper function for `net.http_post`. STATE.md flags this as MEDIUM-confidence; verify against live Supabase docs.
- **`p-limit` ESM/CJS compatibility with Next.js 16 + Turbopack** — STATE.md flags this as needing verification. v6+ is ESM-only; may require `p-limit@3.1.0` pin or an inline limiter.
- **Resend Node SDK vs raw fetch** — both viable; SDK is ~1 line. Planner chooses. No discriminated-union contract needed here (wrap in try/catch, return `{ok,messageId}` / `{ok:false, reason}` at planner's discretion).
- **Vercel `maxDuration` export syntax in Next.js 16 Route Handler** — `export const maxDuration = 300`. Verify against `node_modules/next/dist/docs/` per dealdrop/AGENTS.md instruction ("This is NOT the Next.js you know").
- **pg_cron `schedule` function signature in Supabase** — `cron.schedule('dealdrop-daily-price-check', '0 9 * * *', $$SELECT public.trigger_price_check_cron()$$)` — confirm syntax.

### Architecture & Pitfalls (read before planning)
- `.planning/research/ARCHITECTURE.md` §"Flow 2: Cron Job (pg_cron → Check All Products → Conditional Email)" — full sequence diagram Phase 6 implements
- `.planning/research/PITFALLS.md` §1 (Vercel timeout — already mitigated via `maxDuration=300` + `p-limit`)
- `.planning/research/PITFALLS.md` §2 (CRON_SECRET leak in `cron.job` — Vault mitigation, CRON-11)
- `.planning/research/PITFALLS.md` §3 (service-role key never in browser — already enforced via `server-only` guard + `env.server.ts` split)
- `.planning/research/PITFALLS.md` §4 (Firecrawl null-price propagation — already mitigated in Phase 3 D-04; scrapeProduct returns `missing_price` reason, cron never writes null to price_history)
- `.planning/research/PITFALLS.md` §"Concurrent fan-out exhausts Firecrawl credits" — mitigation is `p-limit(2-3)` concurrency cap (CRON-04)
- `.planning/research/PITFALLS.md` §"Email deliverability" — EMAIL-04 requires SPF + DKIM DNS verified before Phase 7 demo; domain setup begins during Phase 5 per STATE.md

### External Docs (planner should fetch during research)
- Resend Node SDK docs — `emails.send()` signature, error shape, rate limits (3k/mo free-tier ceiling)
- Supabase Vault guide — `vault.create_secret`, `vault.decrypted_secrets` view, SECURITY DEFINER pattern
- pg_net `net.http_post` signature — argument order, header formatting, return shape
- Next.js 16 Route Handler docs (from `dealdrop/node_modules/next/dist/docs/` per AGENTS.md) — `export const maxDuration`, `export const dynamic`, GET/POST split in one file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scrapeProduct(rawUrl)`** — Phase 3 public API. Cron calls it directly per-product; narrows on `result.ok`. Same contract as the Phase 4 add-product Server Action — no cron-specific variant.
- **`createAdminClient()`** — Phase 1 factory at `dealdrop/src/lib/supabase/admin.ts`. Service-role key, no RLS, server-only. Cron Route Handler uses this to SELECT every row in `products` regardless of user.
- **`env.server` typed env module** — `env.RESEND_API_KEY`, `env.RESEND_FROM_EMAIL`, `env.CRON_SECRET` all already validated at build time with Zod. Import from `@/lib/env.server` — never `process.env.*` directly.
- **`ScrapeFailureReason` union** — structured log the reason code on scrape failure; downstream ops / Phase 7 verification grep cleanly.
- **Supabase Postgres + pg_cron + pg_net** — already enabled in migration 0003; no schema change needed for Phase 6 to schedule cron jobs.
- **`products.last_scrape_failed_at` column** — already exists with a partial index. Phase 6 writes; Phase 4 badge reads.

### Established Patterns
- **`import 'server-only'` on the first line** — mandatory for any module that reads `env.server` or uses the admin client. Canonical precedent: `dealdrop/src/lib/supabase/admin.ts:1`. Cron Route Handler file implicitly satisfies this (route.ts is server-only by virtue of being a Route Handler), but any helper module (e.g. `lib/resend.ts`, `lib/cron/check-prices.ts`) must mark it explicitly.
- **Discriminated-union returns** — `{ ok: true, ... } | { ok: false, reason }`. Cron handler's per-product inner work should follow the same shape so the outer iteration loop branches cleanly.
- **Structured `console.error` with object payload** — `console.error('cron: scrape_failed', { productId, reason })` — never template-literal interpolate user data into the message string (log-injection surface; see Phase 3 `scrape-product.ts:88` precedent).
- **Env-var NAMES stay server-only** — `env.server.ts` is the canonical home; `RESEND_API_KEY`, `CRON_SECRET` names never leak to the client bundle (Plan 03-04 enforced this; Phase 6 preserves it).
- **Migration-per-concern** — Phase 6 adds one migration for the pg_cron + Vault wiring (e.g., `0005_cron_daily_price_check.sql`). Don't reopen 0001/0002/0003/0004.

### Integration Points
- **New Route Handler at `dealdrop/app/api/cron/check-prices/route.ts`** — exports `GET` (health), `POST` (cron), `maxDuration = 300`, `dynamic = 'force-dynamic'` (no caching).
- **New module `dealdrop/src/lib/resend.ts`** — `sendPriceDropAlert(to, product, oldPrice, newPrice)` + `renderPriceDropEmailHtml(...)` helper. `import 'server-only'` first line.
- **New module `dealdrop/src/lib/cron/check-prices.ts`** (optional split) — extracted business logic so `route.ts` is thin and testable. Planner's call on whether to split.
- **New migration `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql`** — Vault secret creation + SECURITY DEFINER wrapper function + `cron.schedule(...)` call.
- **No UI changes** — DashboardShell, ProductCard, PriceChart all unchanged. Phase 4 badge automatically reflects Phase 6's `last_scrape_failed_at` writes.

</code_context>

<specifics>
## Specific Ideas

- **Idempotency via price-change gate is the entire idempotency story.** No `cron_runs` table, no `?force=1` flag, no dedup hash. The rule "only INSERT when scraped price differs from `products.current_price`" is load-bearing and should be the first thing the handler's per-product branch does after a successful scrape. Phase 7 DEP-06 manual-trigger verification relies on this — curl the endpoint twice, observe that the second call produces zero new `price_history` rows.
- **`last_scrape_failed_at` clear-on-recovery semantics.** Every successful scrape clears the flag to NULL if it was previously non-NULL — even when the price itself didn't change. The DASH-08 badge must honestly represent "is this product currently failing?", not "did this product ever fail?".
- **One-email-per-drop is a feature, not a limitation.** Each email is a focused "here's the one product, here's the drop, here's the CTA" — matches the core-value framing "never miss a price drop on products they care about". Digest emails (v2+) become a user preference, not a default.
- **Email template stays in `lib/resend.ts`.** Don't split the HTML into a separate `templates/price-drop.html` asset — the template is < 100 lines, uses interpolated values, and lives right next to its only caller. Inlining preserves the "one module, one concern" pattern.
- **CTA button uses inline-style CSS, not a class** — email clients don't load external CSS. Same for the hero percent number styling. Table-based layout + inline styles is the email-client-safe pattern; modern techniques (flexbox, grid) silently break in Outlook.
- **Currency symbol in the email** — use `Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency })` inside the handler (Node-side), produce the formatted string, interpolate into the template. Don't try to do locale-aware formatting in the email HTML itself.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — cross-reference check found zero pending todos.

### Out of this phase
- **`cron_runs` audit table** — not in v1. If Phase 7 observability proves inadequate (can't tell "did the cron run today?"), add in a post-v1 iteration. For v1, Vercel function logs + structured `console.log` from the handler + the cron POST response body are sufficient.
- **`products.last_scrape_reason TEXT NULL` column** — rejected for v1. The DASH-08 badge is a binary "failing / not failing" signal. If users need "why is it failing?" context, add the column in a later iteration.
- **`scrape_failures` audit table** (per-attempt failure history) — rejected for v1. No feature currently consumes "how many consecutive failures?". v2+ candidate if "email-on-persistent-failure" (listed in REQUIREMENTS.md v2+) gets picked up.
- **Postgres RPC wrapping the INSERT + UPDATE pair atomically** — not in v1. Two sequential admin-client writes with an error log on divergence is acceptable at portfolio bar. If price-history integrity becomes a production concern, wrap in a `check_price_changed_and_record(product_id, new_price)` SQL function in a later iteration.
- **Cron POST `?force=1` override** — not needed because the price-change gate makes same-day re-runs naturally idempotent (no duplicate rows). No escape hatch required for Phase 7 manual verification.
- **Digest emails (one email per user with all drops)** — v2+. Listed in PROJECT.md as a "validated requirement" candidate (weekly summary), but not in v1 scope.
- **Email-on-persistent-scrape-failure** — listed in REQUIREMENTS.md v2+; explicitly out of v1.
- **Per-product alert thresholds** (target price / % drop) — listed in REQUIREMENTS.md v2+; PROJECT.md Key Decisions locks "any drop" for v1.
- **Resend retry on send failure** — EMAIL-06 locks "log but don't abort"; no retry in v1. Resend's own retry/delivery infrastructure handles transient failures.
- **Minimum-drop tolerance threshold** (e.g., ignore drops < 1%) — not in v1. "Any drop" rule is literal. If noise becomes a problem, v2+.
- **Cooldown for chronically-failing products** — not in v1. Cron retries every product every day regardless of prior-day status. Firecrawl cost for a permanently-dead URL is one credit per day — acceptable.

</deferred>

---

*Phase: 06-automated-monitoring-email-alerts*
*Context gathered: 2026-04-21*
