# Roadmap: DealDrop

## Overview

DealDrop is built in 7 dependency-ordered phases. Phases 1-2 establish the non-negotiable infrastructure (DB schema with RLS, auth) before any user-facing feature can exist. Phase 3 isolates the Firecrawl scraping layer so both product add and cron can consume it without duplication. Phases 4-5 deliver the complete user-facing loop: add a product, view the dashboard, inspect price history. Phase 6 delivers the core value proposition — the daily automated price-drop alert engine. Phase 7 brings the product to a presentable, deployable state. Every phase must complete before the next begins; there are no safe parallel tracks in this dependency chain.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Database** - Supabase project, DB schema, RLS policies, env validation, Supabase client factories, and Tailwind/Shadcn scaffolding
- [ ] **Phase 2: Authentication & Landing** - Google OAuth sign-in/out, auth modal, proxy.ts session refresh, and the logged-out hero page
- [ ] **Phase 3: Firecrawl Integration** - Typed scrapeProduct() wrapper with Zod validation — the shared scraping layer consumed by both product add and cron
- [ ] **Phase 4: Product Tracking & Dashboard** - Add product flow, dashboard grid, product cards with remove and view-product actions
- [ ] **Phase 5: Price History Chart** - Recharts line chart per product card, with show/hide toggle and edge-case handling
- [ ] **Phase 6: Automated Monitoring & Email Alerts** - Daily pg_cron job, cron route handler, Resend price-drop email, Vault-backed secret storage
- [ ] **Phase 7: Polish & Deployment** - Loading states, error boundaries, responsive layout, Vercel deploy, end-to-end validation

## Phase Details

### Phase 1: Foundation & Database
**Goal**: The project has a working Supabase backend with correctly-structured tables, RLS on both tables, validated env config, three Supabase client factories, and an initialized UI toolkit — everything every subsequent phase depends on
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07
**Success Criteria** (what must be TRUE):
  1. A Supabase project exists with `products` and `price_history` tables and all required columns, constraints, and indexes
  2. RLS is enabled on both tables; querying `price_history` as a non-owner user returns zero rows (verified via Supabase user impersonation)
  3. The Next.js app starts without errors when all 7 required env vars are present, and fails with a clear message when any are missing
  4. Three Supabase client factories exist (server, browser, admin) and the admin client is marked server-only
  5. Shadcn UI initializes with working theme tokens; a `npx shadcn add button` renders without Tailwind v4 style conflicts
**Plans**: 5 plans
- [x] 01-01-PLAN.md — Wave 0: Dependencies + scaffold config (tsconfig paths, metadata, next.config.ts images, .env files, .gitignore)
- [x] 01-02-PLAN.md — Wave 1: Env validation (Zod) + three Supabase client factories + proxy.ts stub
- [x] 01-03-PLAN.md — Wave 1: Supabase project creation + CLI link + three schema migrations (schema, RLS, extensions)
- [x] 01-04-PLAN.md — Wave 2: [BLOCKING] supabase db push + type generation + RLS impersonation verification + Phase Gate
- [x] 01-05-PLAN.md — Wave 1: Shadcn UI init (new-york/zinc) + Button primitive + globals.css dark-mode media query merge

### Phase 2: Authentication & Landing
**Goal**: Users can sign in with Google OAuth, stay signed in across page loads, and see a contextually correct UI — the hero for logged-out visitors and a dashboard shell for authenticated users
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, HERO-01, HERO-02, HERO-03, HERO-04, HERO-05, POL-01
**Success Criteria** (what must be TRUE):
  1. A logged-out visitor sees the hero section with "Never miss a price drop" tagline, feature cards, and a Sign In button in the header
  2. Clicking Sign In opens the Shadcn Dialog modal with a single "Continue with Google" button
  3. After completing Google OAuth, the user is redirected to `/` and the page now shows the dashboard shell (not the hero)
  4. Clicking Sign Out from the header ends the session and the page reverts to showing the hero
  5. The full OAuth flow completes without errors on both localhost and a Vercel preview deployment
**Plans**: 5 plans
- [x] 02-01-PLAN.md — Wave 1: Shadcn primitives install (Dialog, Card, Sonner) + sonner npm dep (AUTH-05 deps, POL-01 deps, HERO-02 deps)
- [x] 02-02-PLAN.md — Wave 1: proxy.ts session refresh + /auth/callback Route Handler + supabase/config.toml WR-03 fix (AUTH-02, AUTH-07)
- [x] 02-03-PLAN.md — Wave 2: Auth UI islands — AuthModalProvider, AuthModal, SignIn/SignOutButton, signOut Server Action, AuthToastListener (AUTH-01, AUTH-03, AUTH-04, AUTH-05, AUTH-06)
- [x] 02-04-PLAN.md — Wave 3: Hero + FeatureCard + Header + DashboardShell + app/page.tsx branch + app/layout.tsx wiring + human OAuth smoke test (HERO-01..05, POL-01 mount, human-verify gate)
- [x] 02-05-PLAN.md — Wave 1: REQUIREMENTS.md traceability update (D-07 AUTH-04 split, D-13 POL-01 moved) + AUTH-08 ops checklist + printable 02-SMOKE-TEST.md (AUTH-08, AUTH-04 doc, POL-01 doc)
**UI hint**: yes

### Phase 3: Firecrawl Integration
**Goal**: A typed `scrapeProduct(url)` function exists that calls Firecrawl, validates the response with Zod, and returns structured product data or a typed failure — ready to be consumed by both the add-product Server Action and the cron handler
**Depends on**: Phase 1
**Requirements**: TRACK-03, TRACK-04, TRACK-05
**Success Criteria** (what must be TRUE):
  1. Calling `scrapeProduct()` with a valid e-commerce URL returns a typed object with `name`, `current_price`, `currency_code`, and `image_url`
  2. A Firecrawl response with a null or zero `current_price` is rejected and returns a typed failure (not written to the DB)
  3. The Firecrawl API key is never accessible in the browser bundle (server-only guard in place)
**Plans**: 4 plans
- [x] 03-01-PLAN.md — Wave 0: Vitest install + vitest.config.ts + skeleton test files + live Firecrawl v2 fixture capture (closes A1/A2/A5)
- [x] 03-02-PLAN.md — Wave 1: types.ts (closed ScrapeFailureReason + ProductData + ScrapeResult) + url.ts (validateUrl + normalizeUrl per D-05/D-06/D-07/D-08) + schema.ts (PRODUCT_JSON_SCHEMA + branch-ordered parseProductResponse) with full unit-test coverage
- [x] 03-03-PLAN.md — Wave 2: scrape-product.ts (server-only guard + env.FIRECRAWL_API_KEY + Firecrawl v2 fetch + AbortSignal.timeout + targeted retry) with 15 mocked-fetch branch tests
- [x] 03-04-PLAN.md — Wave 3: Build-time server-only guard regression test (import scrapeProduct from a throwaway 'use client' page, assert npm run build fails, cleanup, post-build grep confirms no FIRECRAWL_API_KEY in .next/static/)

### Phase 4: Product Tracking & Dashboard
**Goal**: An authenticated user can paste any e-commerce URL, see it scraped and saved to their dashboard, and remove products they no longer want to track — the complete user-facing product management loop
**Depends on**: Phases 2 and 3
**Requirements**: TRACK-01, TRACK-02, TRACK-06, TRACK-07, TRACK-08, TRACK-09, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08
**Success Criteria** (what must be TRUE):
  1. A logged-in user with no products sees an empty state prompting them to add their first product
  2. Pasting a valid e-commerce URL and submitting the form adds the product to the dashboard grid with its name, price (formatted with correct currency), and image — without a page reload
  3. Submitting the same URL a second time shows a friendly duplicate error toast instead of a silent failure
  4. Clicking Remove on a product card opens a confirmation dialog; confirming deletes the product and its price history from the grid
  5. A product whose last scrape returned invalid data shows a "tracking failed" status badge on its card
**Plans**: 7 plans
- [x] 04-01-PLAN.md — Wave 0: Component-test infra (testing-library + jsdom) + Shadcn primitives (alert-dialog, badge, input, label) + shared Supabase mock factory
- [x] 04-02-PLAN.md — Wave 0: Migration 0004_last_scrape_failed_at.sql + [BLOCKING] supabase db push + type regeneration
- [x] 04-03-PLAN.md — Wave 0 (TDD): toast-messages module + exhaustive reason→copy test
- [x] 04-04-PLAN.md — Wave 1: addProduct + removeProduct Server Actions + getUserProducts DAL + action tests
- [x] 04-05-PLAN.md — Wave 2: EmptyState, SkeletonCard, ProductCard + placeholder SVG + component tests (DASH-03/04/05/08)
- [x] 04-06-PLAN.md — Wave 3: AddProductForm (useActionState + sessionStorage D-03), AddProductDialog, RemoveProductDialog + component tests
- [x] 04-07-PLAN.md — Wave 4: ProductGrid (useOptimistic) + DashboardShell rewrite + human-verify end-to-end smoke
**UI hint**: yes

### Phase 5: Price History Chart
**Goal**: Each product card has a toggleable line chart showing the full price history for that product, with correct date/price axis formatting and graceful handling of sparse data
**Depends on**: Phase 4
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06
**Success Criteria** (what must be TRUE):
  1. Clicking "Show Chart" on a product card reveals a Recharts line chart; clicking again hides it
  2. The chart X-axis shows formatted dates and Y-axis shows formatted currency values
  3. A product with only one price history point (just added) renders the chart without crashing
  4. The chart renders without hydration warnings or React 19 compatibility errors on both mobile and desktop viewports
**Plans**: 4 plans
- [x] 05-00-PLAN.md — Wave 0: Red-state test stubs (PriceChart.test.tsx + get-user-products.test.ts) + Risk 4 ProductCard.test.tsx makeProduct() fix + makeSupabaseMock double-order chain extension
- [x] 05-01-PLAN.md — Wave 1: Install recharts@3.8.1 (exact-pinned, React 19-compatible) + extend getUserProducts DAL with nested price_history select + widen Product type + export PricePoint
- [x] 05-02-PLAN.md — Wave 2: Create PriceChart.tsx client component (locked UI-SPEC Recharts skeleton, exported xTickFormatter/yTickFormatter, PriceTooltip subcomponent, empty-state guard) — turns 5/5 PriceChart tests green
- [x] 05-03-PLAN.md — Wave 3: ProductCard slot swap (placeholder div → <PriceChart>) + full suite + npm run build Risk 5 audit + human-verify mobile/desktop/dark-mode smoke (CHART-05, CHART-06)
**UI hint**: yes

### Phase 6: Automated Monitoring & Email Alerts
**Goal**: Every tracked product is re-scraped daily by an automated cron job; when a price drops, the product owner receives a Resend email alert — the core value proposition of DealDrop
**Depends on**: Phase 5
**Requirements**: CRON-01, CRON-02, CRON-03, CRON-04, CRON-05, CRON-06, CRON-07, CRON-08, CRON-09, CRON-10, CRON-11, EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06
**Success Criteria** (what must be TRUE):
  1. `GET /api/cron/check-prices` returns `{ status: "ok" }` without triggering any scraping
  2. `POST /api/cron/check-prices` with an incorrect or missing Bearer token returns 401
  3. A valid cron POST re-scrapes all products and writes new `price_history` rows only when the price has changed
  4. When a re-scraped price is lower than the previous recorded price, the product owner receives a Resend email with the product image, old price, new price, and percentage drop
  5. A failed scrape is logged and skipped; the cron run continues for remaining products and the product card shows the "tracking failed" badge
  6. The CRON_SECRET never appears in plaintext in the `cron.job` table or any migration file
**Plans**: 5 plans
- [x] 06-01-PLAN.md — Wave 0: Install resend@^6.12.2 + p-limit@^3.1.0 (CJS) + new makeSupabaseAdminMock factory + 4 RED-state test skeletons (resend.test.ts, cron/auth.test.ts, cron/check-prices.test.ts, route.test.ts)
- [x] 06-02-PLAN.md — Wave 1: lib/resend.ts — HTML email template (D-05/06/07) + Resend SDK wrapper + flip resend.test.ts to GREEN (EMAIL-01/02/03/05/06)
- [x] 06-03-PLAN.md — Wave 1: Migration 0005_cron_daily_price_check.sql — Vault-backed secret + SECURITY DEFINER wrapper + pg_cron schedule (CRON-10, CRON-11)
- [x] 06-04-PLAN.md — Wave 2: lib/cron/auth.ts (constant-time verifyCronBearer) + lib/cron/check-prices.ts (runPriceCheck orchestrator, p-limit 3, price-change gate, email branch) + green tests (CRON-02/03/04/06/07/08/09, EMAIL-01/05/06)
- [x] 06-05-PLAN.md — Wave 3: app/api/cron/check-prices/route.ts (GET+POST+maxDuration=300) + route.test.ts green + [BLOCKING] supabase db push + CRON-11 grep-cleanliness SQL verification + local curl smoke test + human-verify (CRON-01/05, Phase 6 gate)

### Phase 7: Polish & Deployment
**Goal**: DealDrop is deployed to Vercel production, looks professional on mobile and desktop, handles errors gracefully, and passes an end-to-end manual test of the full sign-up → add product → price-drop alert flow
**Depends on**: Phase 6
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, DEP-06
**Success Criteria** (what must be TRUE):
  1. The app is live at a Vercel production URL with all env vars configured; Google OAuth completes successfully on that URL
  2. The layout is usable and visually intact on a 320px mobile viewport and a standard desktop viewport
  3. An unexpected rendering error triggers the error boundary with a friendly fallback UI (not a white screen)
  4. The end-to-end flow completes: sign up → add product → verify initial price history row → trigger cron manually → verify price-drop email received in a non-owner inbox
  5. The pg_cron job is active and pointing at the production endpoint; the "Looks Done But Isn't" checklist from PITFALLS.md is fully verified
**Plans**: 8 plans
- [x] 07-01-PLAN.md — Wave 1: POL-03 error boundaries — app/error.tsx + app/global-error.tsx + tests (uses Next.js 16.2 `unstable_retry` per installed docs)
- [x] 07-02-PLAN.md — Wave 1: POL-06 dynamic icon — app/icon.tsx via ImageResponse + delete app/favicon.ico
- [ ] 07-03-PLAN.md — Wave 1: POL-01/02/05 verification sweep (no code changes; appends to 07-VERIFICATION.md)
- [ ] 07-04-PLAN.md — Wave 2: POL-04 mobile audit pass at 320 / 375 / 768 / desktop with empirical Tailwind tweaks (depends on 07-01, 07-03)
- [ ] 07-05-PLAN.md — Wave 3: DEP-02/03 — Vercel project + 7 prod env vars + fresh Supabase prod project + Vault secret + first deploy (depends on 07-04)
- [ ] 07-06-PLAN.md — Wave 4: DEP-04 — Google + Supabase prod OAuth registration + fresh-account smoke test (depends on 07-05)
- [ ] 07-07-PLAN.md — Wave 5: DEP-05 — migration 0006_cron_prod_url_cutover.sql + apply to prod (depends on 07-06)
- [ ] 07-08-PLAN.md — Wave 6: DEP-01/06 — synthesis end-to-end UAT + PITFALLS.md:336-348 inspection grid + screenshots (depends on 07-07)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Database | 0/5 | Not started | - |
| 2. Authentication & Landing | 0/5 | Not started | - |
| 3. Firecrawl Integration | 0/TBD | Not started | - |
| 4. Product Tracking & Dashboard | 0/TBD | Not started | - |
| 5. Price History Chart | 4/4 | Complete | 2026-04-20 |
| 6. Automated Monitoring & Email Alerts | 0/5 | Not started | - |
| 7. Polish & Deployment | 0/TBD | Not started | - |
