# DealDrop

## What This Is

DealDrop is a universal e-commerce price tracker. Users paste a product URL from any site in the world, and DealDrop scrapes the product details, monitors the price daily, and sends an email alert the moment the price drops. Each user gets a private dashboard with price-history charts for every product they track.

## Core Value

**Users never miss a price drop on products they care about — regardless of which e-commerce site the product lives on.**

If everything else fails (auth edge cases, charts, fancy UI), the daily price check + email alert loop must work end-to-end.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

#### Auth & Access — Validated in Phase 2 (authentication-landing)
- [x] User can sign in with Google OAuth (via Supabase Auth)
- [x] User can sign out from the header
- [x] Auth modal opens when user clicks "Sign In" (Phase 4 will extend to unauth product-add attempts via the locked `useAuthModal()` hook)
- [x] RLS policies ensure users only see/modify their own products and price history *(validated in Phase 1; carried forward)*

#### Landing — Validated in Phase 2
- [x] Logged-out visitors see a hero section ("Never miss a price drop") with feature cards

#### Onboarding — Validated in Phase 4 (product-tracking-dashboard)
- [x] Logged-in users with zero products see an empty state prompting them to add their first product

#### Product Tracking — Validated in Phases 3 + 4
- [x] User pastes any e-commerce product URL into an "Add Product" form
- [x] App uses Firecrawl to scrape structured JSON (name, current_price, currency_code, image_url)
- [x] Scraped product is stored in Postgres with unique constraint on (user_id, url)
- [x] Initial price is recorded in `price_history` table
- [x] Toast notification confirms successful add

#### Dashboard — Validated in Phases 4 + 5
- [x] Dashboard shows total count of tracked products
- [x] Dashboard renders a responsive grid of product cards (name, current price with currency, image)
- [x] Product card has a toggleable "Show Chart" line chart (Recharts) of price history
- [x] Product card has a "View Product" link to the original e-commerce site
- [x] Product card has a "Remove" button with confirmation, cascade-deletes history

#### Automated Monitoring — Validated in Phase 6 (automated-monitoring-email-alerts)
- [x] Daily cron (pg_cron in Supabase, 9:00 AM UTC) triggers `/api/cron/check-prices` POST
- [x] Cron endpoint protected by Bearer token (CRON_SECRET in Authorization header)
- [x] GET endpoint on same route returns health-check response
- [x] Cron iterates all products, re-scrapes with Firecrawl, writes new row to `price_history` when price changes
- [x] When new price < last recorded price → sends Resend email with image, % drop, old vs new price
- [x] When scrape fails, product card shows a "tracking failed" status badge

#### Polish & Deployment — Validated in Phase 7 (polish-deployment)
- [x] Toast notifications (Sonner) for add, remove, errors
- [x] Shadcn UI components for buttons, cards, modal
- [x] Lucide icons
- [x] Tailwind responsive layout works on mobile browsers (zero breaks at 320 / 375 / 768)
- [x] Two-tier error boundary (page-level + root) with `unstable_retry` per Next.js 16.2 docs
- [x] Branded `app/icon.tsx` favicon
- [x] DealDrop deployed to Vercel production at `https://dealdrop-khaki.vercel.app`
- [x] OAuth registered for prod URL in Google + Supabase Auth
- [x] pg_cron daily job points at prod URL (migration 0006)
- [x] DEP-06 end-to-end smoke test passes on prod (sign-in → add product → forced price drop → email + chart)

### Active

<!-- No active v1 requirements remain. Next milestone scope TBD. -->

(All v1 requirements shipped. Define v1.1 scope via `/gsd-new-milestone`.)

### Out of Scope

<!-- Explicit exclusions with reasoning. -->

- **Payments / subscriptions** — Portfolio/demo project; no monetization needed
- **Social / sharing features** (public deal feeds, shared charts) — Privacy-first, keeps scope tight
- **Mobile apps (iOS/Android)** — Web-only; responsive Tailwind covers mobile browsing
- **Browser extension** — Out of scope for portfolio bar; paste-URL flow is sufficient
- **Email/password or magic-link auth** — Google OAuth only keeps auth UX one-click
- **Currency conversion** — Display price in its original currency; no FX logic needed for v1
- **User-configurable alert logic** (target price, % threshold) — v1 uses "any drop" rule
- **User-configurable scrape cadence** — One daily cron for all products
- **Multi-frequency cron or flash-sale tracking** — Daily is enough for v1 demo
- **Email-on-tracking-failure flow** — v1 surfaces failure in UI only (no transactional retry email)
- **Historical data retention limits** — Keep history forever for v1 (low volume)

## Context

### Project Type
Fresh greenfield scaffold. A `create-next-app` skeleton already exists in [dealdrop/](dealdrop/) — Next.js 16.2.4, React 19, TypeScript strict, Tailwind v4, ESLint flat config. No custom business logic yet.

### Current State (after v1.0)

**Shipped:** DealDrop v1.0 MVP — live in production at `https://dealdrop-khaki.vercel.app`. The full sign-up → add product → daily cron → price-drop email loop works end-to-end on prod, verified by DEP-06 walk on 2026-05-02.

**Stack as built:** Next.js 16.2.4 + React 19 + TypeScript strict + Tailwind v4 / Supabase (Postgres + Auth + Vault + pg_cron + pg_net) / Firecrawl v2 / Resend / Recharts 3.x / Shadcn UI new-york-zinc / Vercel hosting with Fluid Compute.

**Code:** ~5,657 LOC TS/TSX/SQL across `dealdrop/`. Six SQL migrations (0001–0006). Three Supabase client factories (server/browser/admin) with split env (`env.ts` client-safe, `env.server.ts` server-only via `import 'server-only'`).

**Testing:** Vitest with jsdom for client components and node env for server logic. ~108 unit tests across DAL, scraper, optimistic UI, error boundaries, and price-drop email path.

**Per-phase artifacts:** All 7 phase VERIFICATION.md and SUMMARY.md files retained under [.planning/phases/](.planning/phases/) (or moved to `milestones/v1.0-phases/` if archived).

### Existing Codebase State
See [.planning/codebase/](.planning/codebase/) for full map.

### Intent
Portfolio / demo project — the bar is "works end-to-end, looks decent, not production-hardened." Prioritize shipping a complete user journey over enterprise concerns.

### Architecture Summary
- **Frontend:** Next.js App Router + Server Actions, single dynamic main page that branches on auth state
- **Auth modal:** Shadcn Dialog (not a separate page) — triggered on sign-in click OR unauth product-add attempt
- **Backend:** Supabase (Postgres + Auth + RLS + pg_cron)
- **Scraping:** Firecrawl `scrape` with JSON schema for product_name, current_price, currency_code, product_image_url
- **Email:** Resend `emails.send` via server action `sendPriceDropAlert` with HTML template
- **Charts:** Recharts line chart per product card
- **Deployment:** Vercel

### Data Model

**`products` table:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `auth.users`, not null |
| `url` | text | Full product URL |
| `name` | text | Scraped product name |
| `current_price` | numeric | Latest scraped price |
| `currency` | text | Currency code (e.g. "USD", "INR") |
| `image_url` | text | Scraped image URL |
| `created_at` | timestamptz | Insert timestamp |
| `updated_at` | timestamptz | Last update timestamp |

Unique constraint: `(user_id, url)` — prevents duplicate tracking.

**`price_history` table:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK → `products.id`, CASCADE delete |
| `price` | numeric | Recorded price |
| `currency` | text | Currency at time of check |
| `checked_at` | timestamptz | Check timestamp |

**Relationships:**
- `users 1 → ∞ products`
- `products 1 → ∞ price_history` (cascade delete)

### API Endpoints
- `GET /api/cron/check-prices` — health check (public)
- `POST /api/cron/check-prices` — cron-triggered, Bearer token required, re-scrapes all products and fires alerts

## Constraints

- **Tech stack**: Next.js 16 + React 19 + TypeScript strict + Tailwind v4 — Already scaffolded; don't migrate
- **Backend**: Supabase — Chosen for Postgres + Auth + RLS + pg_cron in one platform
- **Scraping**: Firecrawl — Chosen for structured JSON output without per-site scrapers
- **Email**: Resend — Chosen for generous free tier (3k/mo) and clean Next.js SDK
- **Charts**: Recharts — Chosen for React-native line charts
- **UI kit**: Shadcn UI + Lucide — Drop-in components, portfolio-friendly look
- **Toasts**: Sonner — Established Shadcn-compatible toast lib
- **Hosting**: Vercel — Matches Next.js defaults, built-in cron-trigger path via pg_cron calling the API
- **Scrape cadence**: Daily (pg_cron, e.g. 9:00 AM) — Single frequency for all products, keeps cost/complexity low
- **Alert rule**: Any price drop — Simple rule, no per-product config
- **Auth**: Google OAuth only — One-click sign-in, no password UX
- **Bar**: Portfolio/demo quality — Works end-to-end, presentable UI, not production-hardened

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for DB + Auth + Cron | One platform covers Postgres, RLS, Google OAuth, and pg_cron scheduling | ✓ Validated end-to-end across Phases 1, 2, 6, 7 (DB + RLS + Auth + pg_cron all live in prod) |
| Google OAuth only for v1 | One-click sign-in; no password/email verification UX to build | ✓ Validated in Phase 7 (DEP-04 fresh-on-prod sign-in PASS on stable alias `dealdrop-khaki.vercel.app`) |
| Firecrawl over per-site scrapers | Works on any e-commerce URL without site-specific code | ✓ Validated in Phase 3 (typed scraper) + Phase 7 (DEP-06 books.toscrape end-to-end on prod) |
| Resend for transactional email | Generous free tier, clean SDK, aligns with Next.js ecosystem | Validated in Phase 6 (sendPriceDropAlert) and Phase 7 (DEP-06 prod email) |
| Daily scrape at 9 AM | Matches "daily alert" expectation; keeps Firecrawl costs predictable | Validated in Phase 6 (pg_cron 0 9 * * * UTC) and Phase 7 (prod cutover) |
| "Any price drop" alert rule | Simpler than target price or % threshold; ships faster | Validated in Phase 6 (price-change gate D-02) and Phase 7 (DEP-06 dropped:1) |
| Auth via modal, not a route | Single dynamic page; fewer routes to manage | Shipped in Phase 2 (AuthModal + AuthModalProvider) |
| Keep price history forever | Low volume in portfolio use; retention policy unnecessary for v1 | Validated in Phase 7 (cascade delete only, no retention) |
| Show scrape failure in UI (not email) | Avoids email noise; user sees state on the product card | Validated in Phase 7 (PITFALLS:341 grid row PASS) |
| Currency displayed as scraped (no FX) | Conversion adds complexity; original currency is accurate | Validated in Phase 7 (GBP product rendered without RangeError) |
| `unstable_retry` over `reset` for error boundaries | Installed Next.js 16.2.4 docs renamed the prop; CONTEXT.md D-02 used the older name | Phase 7 Plan 07-01 — recorded as `overrides_applied: 1` in 07-VERIFICATION.md |
| Single Google OAuth client serves dev + prod Supabase | Portfolio bar; production-hardening would split into two clients with separate quotas | Phase 7 Plan 07-06 — both Supabase projects share the same Client ID/Secret |
| Vercel Deployment Protection scoped to Preview only | Production must be public for both real users and Supabase pg_cron `net.http_post` (no SSO cookie) | Phase 7 Plan 07-05 deviation; documented for future redeploys |

## Next Milestone Goals

v1.0 is shipped. Possible directions for v1.1+ (TBD via `/gsd-new-milestone`):

- **v1.1 Polish & Hardening** — close residual tech debt: Nyquist gaps, formal HUMAN-UAT closures (Phase 01/02), `proxy.ts` env convention, repo-wide lint baseline cleanup (246 pre-existing).
- **v1.1 Smarter Alerts** — target-price thresholds, percentage thresholds, per-product cadence settings, weekly digest opt-in.
- **v1.2 Multi-currency** — FX conversion for cross-currency price comparison (currently each product's currency is shown as scraped).
- **v2.0 Browser extension** — paste-URL friction → "Track this page" button on any e-commerce site.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after v1.0 milestone complete — DealDrop MVP shipped to `https://dealdrop-khaki.vercel.app`; all 7 phases (5+5+4+7+4+5+8 = 38 plans) verified end-to-end*
