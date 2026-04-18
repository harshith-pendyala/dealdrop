# Project Research Summary

**Project:** DealDrop — Universal E-Commerce Price Tracker
**Domain:** Web app / SaaS price monitoring (Next.js + Supabase + Firecrawl)
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH (stack verified against installed Next.js 16 docs; third-party library APIs from training data cutoff August 2025 — verify versions before install)

---

## Executive Summary

DealDrop is a universal e-commerce price tracker built on a greenfield Next.js 16.2.4 + React 19 + Supabase scaffold. Users paste any product URL, Firecrawl extracts structured product data (name, price, image), and a daily pg_cron job re-scrapes all tracked products — firing Resend email alerts whenever the price falls. The entire product fits in a single Next.js App Router page that branches on auth state: logged-out visitors see a hero; logged-in users see their dashboard. This architecture is validated, dependency-ordered, and well-suited to the portfolio bar.

The recommended approach is build-in-dependency-order: database foundation and auth before any UI, Firecrawl integration before product CRUD, product CRUD before the cron worker, and the cron worker before email alerts. This order is non-negotiable — the cron worker literally cannot function without products in the DB, and products require an authenticated user_id FK. All 10 table-stakes features for a price tracker are covered by v1 scope with no gaps. The one genuine differentiator — universal any-URL tracking without a browser extension — is delivered by Firecrawl and is DealDrop's core competitive position.

The two highest-risk areas are the cron architecture and security configuration. Vercel's default function timeout will silently truncate the scrape loop as soon as product count exceeds ~10 on Hobby tier; this must be addressed with parallel fan-out and `maxDuration = 300` from day one, not retrofitted. The pg_cron secret (CRON_SECRET) must never appear in plaintext SQL or migration files — Supabase Vault is the correct storage mechanism. RLS must be enabled on both `products` and `price_history` simultaneously in the initial migration; adding it to only one table leaves user data exposed.

---

## Key Findings

### Recommended Stack

The stack is already scaffolded (Next.js 16.2.4, React 19, TypeScript strict, Tailwind v4) and must not be migrated. The remaining installation work is focused: Supabase client libraries, Firecrawl SDK, Resend SDK, Zod (required — not optional), Recharts for charts, shadcn/ui CLI for component primitives, and `@t3-oss/env-nextjs` for validated environment variables. Next.js 16 introduces three breaking changes that affect every phase of this project: `proxy.ts` replaces `middleware.ts`, all Request APIs (`cookies()`, `headers()`, `params`) must be awaited, and `next lint` is removed. Treat these as hard constraints — violations produce silent failures or confusing build errors rather than loud exceptions.

**Core technologies:**

| Technology | Purpose | Why Required |
|------------|---------|--------------|
| Next.js 16.2.4 (installed) | Full-stack framework, App Router, Route Handlers, Server Actions | Already scaffolded. Breaking changes from v15 must be observed across all phases. |
| React 19.2.4 (installed) | UI rendering | Paired with Next.js 16. Do not mix v18 patterns. |
| Tailwind v4 (installed) | Utility-first styling | CSS-first config via `@theme` in globals.css. No `tailwind.config.js`. |
| @supabase/supabase-js ^2 + @supabase/ssr ^0.5 | DB queries + cookie-based auth in App Router | Mandatory pair. `@supabase/auth-helpers-nextjs` is deprecated — do not use. |
| @mendable/firecrawl-js ^1 | Universal web scraping with structured JSON extraction | Core product differentiator. Validate extracted fields — Firecrawl can return null on layout drift. |
| resend ^4 | Transactional email | 3k/month free tier. Domain + SPF/DKIM verification required before sending to non-owner inboxes. |
| zod ^3 | Schema validation | Required for Firecrawl extraction schema, Server Action input validation, and `@t3-oss/env-nextjs`. |
| recharts ^2 | Price-history line charts | Must be in a `'use client'` component. Pass data as plain JSON (no Date objects). |
| shadcn/ui CLI + lucide-react + sonner | UI components and toasts | Install via `npx shadcn@latest add` using the Tailwind v4 init path — the v3 path produces broken styles. |
| @t3-oss/env-nextjs ^0.11 | Validated environment variables at startup | Catches missing secrets at build time. Define all 7 required env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET). |
| server-only | Prevents server modules from being imported in Client Components | Import at top of any file containing secrets or DB logic. |

**What NOT to use:**
- `middleware.ts` — Removed in Next.js 16. Use `proxy.ts` with a `proxy` export.
- `@supabase/auth-helpers-nextjs` — Deprecated. Use `@supabase/ssr`.
- `next lint` CLI — Removed. Run `npx eslint .` directly.
- Synchronous `cookies()` / `headers()` / `params` — Breaking change. Always `await`.
- `serverRuntimeConfig` / `publicRuntimeConfig` — Removed from next.config.
- `images.domains` — Deprecated. Use `images.remotePatterns` for scraped product images.

**Development tooling:**
- Vitest + @testing-library/react — Preferred over Jest for Turbopack (default in Next.js 16). For utility functions and client component tests.
- Playwright — End-to-end testing for the cron alert flow (the critical path). Recommended but not blocking for portfolio bar.
- `vite-tsconfig-paths` — Resolves `@/` aliases in Vitest config.

---

### Expected Features

DealDrop v1 scope covers all 10 table-stakes features for a price tracking product. There are zero gaps between what users expect and what v1 ships. The feature set is clean with no over-scoping.

**Must have (table stakes) — all covered in v1:**
- Product URL ingestion (paste-URL form with Firecrawl scrape)
- Scraped product metadata display (name, image, current price, currency)
- Price history chart per product (Recharts line chart)
- Price drop email alert (Resend, any-drop rule)
- Tracked products dashboard (responsive product grid)
- Remove / stop tracking (with confirmation + cascade delete)
- Auth / account (Google OAuth via Supabase)
- Link back to original product page ("View Product" on each card)
- Duplicate tracking prevention (unique constraint on `user_id, url`)
- Scrape failure surfacing ("tracking failed" badge on product card)

**Should have (competitive differentiators) — DealDrop has, competitors lack:**
- Universal any-URL tracking without a browser extension — core DealDrop differentiator; Keepa/CamelCamelCamel are Amazon-only; Honey requires browser extension install
- Server-side scraping (works on any device, no extension required)

**Defer to v1.x (add after validation, zero schema changes required):**
- Lowest-price-ever badge — computable from existing `price_history` data, no schema change
- Target price alert threshold — add if users report alert fatigue from "any drop" rule
- Percentage-drop threshold — pair with target price as configurable alert options
- Weekly digest email — add if engagement drops between price-drop events

**Defer to v2+ (architectural additions):**
- Stock-availability alerts (requires Firecrawl schema extension)
- "Best time to buy" prediction (requires 30+ data points per product)
- Multi-retailer price comparison (requires product identity resolution — UPC/EAN)
- Sub-hourly scrape cadence for flash sales (requires billing integration)

**Deliberate anti-features (correctly excluded from scope):**
- Browser extension (separate codebase, Chrome Web Store friction, destroys paste-URL simplicity)
- Sub-hourly price checks (Firecrawl cost scales directly — flash-sale tracking is a paid-tier concern)
- Email/password auth (adds reset flow, verification, brute-force protection — Google OAuth covers demo use)
- Currency conversion (live FX API + historical normalization = significant complexity for marginal value)
- Social / public deal feed (different product type; conflicts with private RLS architecture)

---

### Architecture Approach

DealDrop uses a single-page App Router architecture: one dynamic route (`/`) that branches on auth state server-side — rendering `<Hero>` for logged-out visitors or `<Dashboard>` for authenticated users. All mutations go through Server Actions (`actions/products.ts`, `actions/email.ts`); only the pg_cron webhook uses a Route Handler (`/api/cron/check-prices`). External service integrations are isolated to `lib/` (one file per service). The Supabase client is split into three factories: a server client using `createServerClient(cookies())` with the anon key for user-facing operations (RLS enforced), a browser client using `createBrowserClient()` for the OAuth flow, and an admin client using `createAdminClient()` with the service role key exclusively for the cron route handler.

**Major components and responsibilities:**

| Component | Type | Responsibility |
|-----------|------|----------------|
| `app/page.tsx` | RSC | Auth branch: reads session server-side, renders Hero or Dashboard |
| `app/layout.tsx` | RSC | Root HTML shell, Sonner `<Toaster>`, metadata |
| `app/api/cron/check-prices/route.ts` | Route Handler | GET (health check) + POST (cron job, Bearer-protected) |
| `proxy.ts` | Next.js 16 proxy | Session refresh on every request via `supabase.auth.getUser()` |
| `components/AuthModal.tsx` | Client Component | Shadcn Dialog + `supabase.auth.signInWithOAuth()` |
| `components/Hero.tsx` | RSC | Landing view for logged-out visitors |
| `components/Dashboard.tsx` | RSC | Fetches products + price_history, renders product grid |
| `components/AddProductForm.tsx` | Client Component | URL paste form, calls `addProduct` Server Action |
| `components/ProductCard.tsx` | Client Component | Product name, price, image, chart toggle, remove button |
| `components/PriceChart.tsx` | Client Component | Recharts `<LineChart>` of price_history data |
| `actions/products.ts` | Server Action module | `addProduct`, `removeProduct` — auth check, Firecrawl, DB, `revalidatePath('/')` |
| `actions/email.ts` | Server Action module | `sendPriceDropAlert` — Resend API call with HTML template |
| `lib/supabase.ts` | Integration | `createServerClient`, `createBrowserClient`, `createAdminClient` factories |
| `lib/firecrawl.ts` | Integration | `scrapeProduct()` typed wrapper — Zod validation of extracted fields |
| `lib/resend.ts` | Integration | `sendAlert()` wrapper + inline HTML email template |
| `lib/types.ts` | Shared types | `Product`, `PriceHistory`, `ScrapeResult` — pure type file, no runtime code |
| `lib/env.ts` | Config | `@t3-oss/env-nextjs` validated environment schema |

**RLS design:** RLS is the authoritative security boundary. Server Actions re-check auth as defense-in-depth. The cron Route Handler uses SERVICE_ROLE_KEY (bypasses RLS intentionally) and is protected exclusively by Bearer token validation. Enable RLS on both `products` and `price_history` in the initial migration — `price_history` must enforce ownership via `product_id IN (SELECT id FROM products WHERE user_id = auth.uid())`.

**Key data flows:**
1. Add Product: AddProductForm → `addProduct` Server Action → `supabase.auth.getUser()` → Firecrawl scrape → `products` insert + `price_history` initial row → `revalidatePath('/')` → Dashboard RSC re-fetches
2. Cron: pg_cron → `POST /api/cron/check-prices` → Bearer validation → admin client reads all products → parallel Firecrawl scrapes (concurrency-capped) → `price_history` insert → `products.current_price` update → conditional Resend alert
3. Dashboard: Browser GET `/` → `page.tsx` RSC → `supabase.auth.getUser()` → `<Dashboard>` RSC fetches products + history → `<ProductCard>` client components hydrate

---

### Critical Pitfalls

The following pitfalls are build-phase-specific and must be addressed during the phase where they originate — retrofitting them is technically possible but adds unnecessary risk and rework.

1. **Vercel cron timeout from sequential Firecrawl calls** — Default timeout is 10s (Hobby) or 60s (Pro). Even 15 products at ~5s each exceeds both. Prevention: set `export const maxDuration = 300` in the cron route file (requires Vercel Pro; document as deploy requirement), and use `Promise.allSettled` with `p-limit(2)` concurrency cap from day one. Never await Firecrawl calls sequentially. Address in: Phase 6 (automated monitoring).

2. **pg_cron CRON_SECRET leak into SQL job definition and git history** — The `net.http_post` call requires the Bearer token inline in SQL. Prevention: store `CRON_SECRET` in Supabase Vault and reference via a Vault wrapper function rather than inlining the literal value. Never commit a migration containing the real secret — use a placeholder and document that the Vault value must be set post-deploy via Supabase Dashboard. Address in: Phase 6 (automated monitoring).

3. **RLS missing on `price_history` table** — Developers add RLS to `products` (obvious) but assume the join through `products` protects `price_history`. It does not. Without policies on `price_history`, any authenticated user can query all price history rows for all users. Prevention: enable RLS on both tables in the same migration; write the ownership-chain policy on `price_history` alongside the `products` policies. Verify by impersonating a user in Supabase Dashboard and confirming zero cross-user rows are returned. Address in: Phase 1 (database foundation).

4. **Firecrawl schema extraction drift producing silent null prices** — Layout changes or A/B tests on target sites cause Firecrawl to return `null` for `current_price` without an HTTP error. Prevention: validate every Firecrawl response — `current_price` must be a finite positive number; if not, set `last_scraped_status = 'failed'` and skip the `price_history` insert. Never write null to `price_history`. Add a `NOT NULL` DB constraint on `price_history.price` as a last-resort guard. Address in: Phase 3 (Firecrawl integration).

5. **Next.js 16 breaking API surface (`proxy.ts` / async Request APIs)** — Using `middleware.ts` instead of `proxy.ts`, or accessing `cookies()` / `headers()` synchronously, produces silent failures or confusing build errors. Prevention: treat these as non-negotiable hard constraints from Phase 1. Never write synchronous Request API access anywhere. The `proxy.ts` file is required for session refresh; build it in Phase 2 alongside auth. Address in: Phases 1 and 2.

**Additional pitfalls to watch:**
- **Google OAuth redirect URI mismatch on deploy** — Register localhost, production URL, and Vercel preview wildcard (`https://*.vercel.app/auth/callback`) in both Google Cloud Console and Supabase Auth settings before writing any auth code. Address in: Phase 2.
- **Resend domain deliverability** — Emails from unverified domains land in spam or silently reject. Complete DNS verification (SPF TXT + DKIM CNAME x2) before the email phase. DNS propagation can take up to 48h — begin domain setup at the start of Phase 5, not Phase 6. Address in: Phase 6.
- **Currency RangeError from non-ISO-4217 scraped codes** — `Intl.NumberFormat` throws on scraped values like `"Rs"` or `"₹"`. Prevention: validate and sanitize `currency_code` against an ISO 4217 allowlist before DB insert; wrap `Intl.NumberFormat` in try/catch in the price display utility. Address in: Phase 4.
- **Server Action revalidation — stale dashboard after mutation** — Call `revalidatePath('/', 'layout')` at the end of every mutating Server Action. Establish this pattern in the first action and never deviate.
- **Firecrawl cost blowup from cron misconfiguration** — `0 9 * * *` vs `* 9 * * *` is one character. Add an idempotency guard (check `cron_runs` table for a same-day completion entry) and verify the schedule string with a cron expression validator before deploying.

---

## Implications for Roadmap

The architecture research defines a clear 7-phase dependency graph. Phases 1-3 are pure foundation with no user-visible features. Phases 4 and 5 deliver the core user loop. Phase 6 delivers the automated monitoring engine (the reason users sign up). Phase 7 is polish that makes the product presentable.

### Phase 1: Environment, Database, and Foundation

**Rationale:** Everything depends on the database schema and environment setup. RLS must be created alongside the tables — not added later. The env validation library must be set up before any secret is accessed in code.
**Delivers:** Working Supabase project with `products` and `price_history` tables, RLS policies on both, pg_cron + pg_net extensions enabled, `lib/env.ts` validated config, `lib/supabase.ts` with three client factories, `lib/types.ts` shared types, and `server-only` guard installed.
**Features addressed:** RLS data isolation (required by all user-facing features), `price_history` schema (required by cron and charts).
**Pitfalls to avoid:** RLS missing on `price_history`; missing env vars silently returning `undefined`; synchronous Request API access anywhere.
**Research flag:** Standard patterns — skip `/gsd-research-phase`. Supabase migration and RLS patterns are well-documented; Next.js 16 env setup is covered in installed docs.

### Phase 2: Auth Layer

**Rationale:** `user_id` is a non-null FK on `products`. Nothing can be tracked without an authenticated user. OAuth redirect URIs must be registered before any auth code is written (config changes have propagation lag).
**Delivers:** Google OAuth sign-in / sign-out via Supabase Auth, `AuthModal.tsx` (Shadcn Dialog), `proxy.ts` for session refresh, `/auth/callback` Route Handler for OAuth code exchange, and auth-branching `app/page.tsx` that renders Hero or Dashboard shell.
**Uses:** `@supabase/ssr` `createBrowserClient` + `createServerClient`, `proxy.ts` (Next.js 16 replacement for `middleware.ts`).
**Pitfalls to avoid:** `middleware.ts` instead of `proxy.ts`; `getSession()` instead of `getUser()` on the server; Google OAuth redirect URI mismatch on deploy.
**Research flag:** Standard patterns — skip `/gsd-research-phase`. Next.js 16 installed docs cover the full auth pattern including `proxy.ts` and the callback Route Handler.

### Phase 3: Firecrawl Integration

**Rationale:** The scraping layer (`lib/firecrawl.ts`) is shared by both the add-product Server Action (Phase 4) and the cron Route Handler (Phase 6). It must exist and be tested in isolation before either consumer is built.
**Delivers:** `lib/firecrawl.ts` with a typed `scrapeProduct(url)` wrapper, Zod schema defining `{ name, current_price, currency_code, image_url }`, null/invalid field validation, `last_scraped_status = 'failed'` handling, and a Vitest unit test of the wrapper with a mock response.
**Uses:** `@mendable/firecrawl-js`, `zod`, `zod-to-json-schema` (or plain JSON Schema).
**Pitfalls to avoid:** Trusting extracted fields without Zod validation; writing null to `price_history`; calling Firecrawl from a Client Component.
**Research flag:** Needs `/gsd-research-phase`. The exact Firecrawl SDK parameter shape (`formats: ['extract']` + `extract.schema` vs `extractorOptions.extractionSchema`) is MEDIUM confidence from training data. Verify against current `@mendable/firecrawl-js` npm package docs before implementing `lib/firecrawl.ts`.

### Phase 4: Product Tracking — Add, Dashboard, Remove

**Rationale:** Core user-facing loop (part 1). Depends on Phases 1-3 fully complete.
**Delivers:** `addProduct` Server Action (auth check, Firecrawl, DB insert with unique constraint, initial `price_history` row, `revalidatePath('/')`), `AddProductForm.tsx` with loading state during 3-8s scrape, `Dashboard.tsx` RSC with product grid, `ProductCard.tsx` showing name/price/currency/image, "Remove" button with AlertDialog confirmation and cascade delete, duplicate URL error handling surfaced via toast, currency code sanitization against ISO 4217 allowlist, Sonner toasts for all action outcomes.
**Features addressed:** URL ingestion, product metadata display, dashboard grid, remove/stop tracking, duplicate prevention, scrape failure badge, toast notifications.
**Pitfalls to avoid:** Currency `RangeError` from unsanitized scraped codes; stale dashboard from missing `revalidatePath`; no loading state during scrape (user double-submits); service role key used in user-facing Server Action.
**Research flag:** Standard patterns — skip `/gsd-research-phase`. Server Action + `revalidatePath` pattern is in Next.js 16 installed docs.

### Phase 5: Price History Chart

**Rationale:** Recharts requires a `'use client'` component boundary and must receive plain JSON data (no Date objects). This phase also validates the data model before the cron worker depends on it.
**Delivers:** `PriceChart.tsx` Client Component wrapping Recharts `<LineChart>`, "Show Chart" toggle in `ProductCard`, empty state handling for single-data-point (day 1) and zero-data-point cases, date serialization (ISO strings not Date objects) in Dashboard RSC data pass, chart data capped at 90 most recent rows.
**Uses:** `recharts ^2` (pin at `^2.12.x`; verify React 19 compatibility before upgrading).
**Pitfalls to avoid:** Recharts hydration mismatch from Date object props; chart crash on single or zero data points; fetching unbounded price history rows on dashboard load.
**Research flag:** Standard patterns — skip `/gsd-research-phase`. Recharts in a `'use client'` wrapper is well-documented; all known gotchas captured in PITFALLS.md.

### Phase 6: Automated Monitoring — Cron and Email Alerts

**Rationale:** The reason users sign up. Depends on Phases 1-5 fully complete. DNS propagation for Resend domain verification can take up to 48h — begin domain setup at the start of Phase 5, not here.
**Delivers:** `lib/resend.ts` with `sendAlert()` wrapper and inline HTML price-drop email template (with plain-text version for spam scores), `/api/cron/check-prices/route.ts` with GET health check and POST cron job (Bearer token validation as first line, not an afterthought), parallel Firecrawl fan-out via `Promise.allSettled` + `p-limit(2)` concurrency cap, `export const maxDuration = 300`, idempotency guard via `cron_runs` table, scrape failure handling (sets `last_scraped_status = 'failed'`, skips price comparison), pg_cron schedule using Supabase Vault for CRON_SECRET (not plaintext in SQL), CAN-SPAM compliant email footer.
**Features addressed:** Daily cron monitoring, price drop email alert, scrape failure badge update.
**Pitfalls to avoid:** Sequential Firecrawl awaits causing Vercel timeout; CRON_SECRET in plaintext SQL or migration files; double-fire cost blowup; Resend emails to non-owner inboxes before domain DNS verification; cron GET route triggering scraping.
**Research flag:** Needs `/gsd-research-phase`. Two items need live verification: (1) Supabase Vault secret retrieval syntax for use inside a pg_cron SQL function; (2) `p-limit` ESM/CJS compatibility with Next.js 16 + Turbopack (ESM-only package — verify or substitute before implementing).

### Phase 7: Polish and Deployment

**Rationale:** Covers all UX quality signals and production deployment. Must be complete before the project is presented but should not block the end-to-end alert loop.
**Delivers:** `app/loading.tsx` skeleton, `app/error.tsx` root error boundary, empty state for zero-product dashboard, friendly error messages for scrape failures, scrape-failure badge on product cards, responsive Tailwind layout verified on mobile, `images.remotePatterns` in `next.config.ts`, Vercel production env vars configured, Google OAuth production and preview URLs registered, cron verified end-to-end on production, PITFALLS.md "Looks Done But Isn't" checklist completed.
**Pitfalls to avoid:** Google OAuth redirect URI mismatch on Vercel (production + preview wildcard); Tailwind v4 purge gaps in production build; Recharts React 19 hydration warnings; cascade delete not wired in migration.
**Research flag:** Standard patterns — skip `/gsd-research-phase`. Vercel deployment for Next.js 16 follows standard patterns; the checklist items are explicit.

---

### Phase Ordering Rationale

- Phases 1-2 before everything: `user_id` is a non-null FK on `products`; no product can be tracked without auth; no auth can be tested without a DB schema
- Phase 3 before Phases 4 and 6: `scrapeProduct()` is shared by both consumers — build once, test in isolation, use twice
- Phase 4 before Phase 5: chart data has nothing to render until products exist; `AddProductForm` also writes the bootstrap `price_history` row that charts depend on
- Phase 5 before Phase 6: validates the data model before the cron worker depends on it; also begins Resend domain DNS setup (48h propagation window)
- Phase 6 before Phase 7: no point polishing a deployment where the critical alert loop is not verified end-to-end
- RLS on both tables in Phase 1: the only pitfall rated "never acceptable as technical debt" — cannot be deferred

---

### Research Flags

**Phases needing `/gsd-research-phase` during planning:**
- **Phase 3 (Firecrawl integration):** Exact Firecrawl SDK API shape (`formats: ['extract']`, `extract.schema` vs `extractorOptions.extractionSchema`) — MEDIUM confidence from training data. Verify against current `@mendable/firecrawl-js` docs or package changelog before writing the `scrapeProduct()` wrapper.
- **Phase 6 (Cron + Email):** Supabase Vault secret retrieval syntax inside a pg_cron SQL function needs live verification. Also verify `p-limit` ESM compatibility with Next.js 16 + Turbopack before using it in the cron route.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Supabase migration + RLS patterns are stable. Next.js 16 env setup covered in installed docs.
- **Phase 2 (Auth):** Google OAuth + Supabase SSR + `proxy.ts` covered in Next.js 16 installed docs (`02-guides/authentication.md`).
- **Phase 4 (Product CRUD):** Server Actions + `revalidatePath` + shadcn/ui covered in Next.js 16 installed docs.
- **Phase 5 (Charts):** Recharts `LineChart` in a `'use client'` wrapper is well-documented; all gotchas captured in PITFALLS.md.
- **Phase 7 (Polish + Deploy):** Vercel deployment for Next.js 16 follows standard patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified from installed `node_modules/next/dist/docs/`. Third-party library versions from training data cutoff August 2025 — run `npm info <package> version` for each before pinning. |
| Features | MEDIUM | Competitor feature matrix from training-data knowledge of Keepa, CamelCamelCamel, Honey, Pricepulse, ShopSavvy (stable mature products; web search unavailable). DealDrop v1 scope cross-referenced against PROJECT.md with HIGH confidence — no gaps. |
| Architecture | HIGH | Based on Next.js 16 installed docs, Supabase RLS and pg_cron patterns, and established patterns for this stack combination. Component responsibilities and data flows are authoritative. |
| Pitfalls | MEDIUM | Drawn from high-confidence training knowledge of each technology's documented failure modes. Firecrawl pricing tiers and Vercel timeout limits change frequently — re-verify at implementation time. The "Looks Done But Isn't" checklist is reliable regardless of pricing changes. |

**Overall confidence:** MEDIUM-HIGH — sufficient to proceed with roadmap creation. The two MEDIUM-confidence items (Firecrawl SDK exact API shape in Phase 3, Supabase Vault SQL syntax in Phase 6) are scoped to specific phases where a `/gsd-research-phase` call can resolve them before implementation begins.

### Gaps to Address

- **Firecrawl SDK exact API parameters:** The parameter name for the JSON extraction schema (`extract.schema` vs `extractorOptions`) should be verified against current `@mendable/firecrawl-js` npm docs before writing `lib/firecrawl.ts`. A wrong parameter name produces a successful HTTP response with all null fields — the exact failure mode described in Pitfall 4.
- **Supabase Vault + pg_cron integration:** The exact SQL to create a Vault-backed wrapper function that pg_cron calls (instead of inlining CRON_SECRET) needs live verification. This is a security requirement, not an optimization — do not skip it in favor of the plaintext SQL shortcut.
- **p-limit ESM compatibility with Turbopack:** `p-limit` is ESM-only. Next.js 16 with Turbopack has specific ESM import handling. Verify compatibility (or use an alternative like `async-pool` or a hand-rolled semaphore with `Array.from`) before Phase 6.
- **Third-party library version pinning:** All versions in STACK.md are from training data (cutoff August 2025). Run `npm info <package> version` for each before install: `@mendable/firecrawl-js`, `resend`, `@supabase/supabase-js`, `@supabase/ssr`, `recharts`, `@t3-oss/env-nextjs`.
- **Resend domain setup lead time:** DNS propagation for SPF/DKIM takes up to 48 hours. If a custom domain is used for email (required to send to non-owner inboxes), begin domain verification at the start of Phase 5, not Phase 6 — to avoid blocking the email phase on DNS propagation.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.4 installed docs (`node_modules/next/dist/docs/`) — Breaking changes, auth patterns (proxy.ts, getUser vs getSession), Server Actions, Route Handlers, Vitest/Playwright setup, environment variables, data security, project structure
- DealDrop PROJECT.md — v1 requirements, constraints, data model, API endpoints, out-of-scope list

### Secondary (MEDIUM confidence)
- Training-data knowledge of `@supabase/ssr`, `@supabase/supabase-js`, `@mendable/firecrawl-js`, `resend`, `zod`, `recharts`, `shadcn/ui`, `sonner`, `@t3-oss/env-nextjs`, `p-limit` — APIs are stable but versions should be verified at install time
- Training-data knowledge of Keepa, CamelCamelCamel, Honey, Pricepulse, ShopSavvy, PriceGrabber feature sets — stable mature products; web search unavailable during research session
- Firecrawl documentation (docs.firecrawl.dev) — extraction schema behavior, concurrency limits (from training data; verify pricing and limits at implementation time)
- Supabase documentation — RLS, pg_cron + pg_net, Vault secrets, Auth URL configuration (from training data; Vault SQL syntax needs live verification)
- Vercel documentation — function timeout limits by plan (change frequently; verify at deploy time)
- Resend documentation — domain verification, SPF/DKIM, sandbox restrictions (from training data)

### Tertiary (LOW confidence — verify before acting)
- Firecrawl API pricing tiers and credit costs per scrape — free-tier concurrency stated as 2 concurrent requests; verify current limits in Firecrawl dashboard at project start
- Vercel Hobby vs Pro timeout limits — stated as 10s / 60s defaults with 300s Pro max via `maxDuration`; verify current values in Vercel docs before deciding on plan tier

---

*Research completed: 2026-04-17*
*Ready for roadmap: yes*
