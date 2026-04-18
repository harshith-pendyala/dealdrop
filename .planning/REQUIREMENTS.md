# DealDrop v1 Requirements

Source: [PROJECT.md](PROJECT.md) + [research/SUMMARY.md](research/SUMMARY.md)
Scope bar: **Portfolio / demo project** — works end-to-end, looks decent, not production-hardened.

---

## v1 Requirements

### Foundation (FND)

- [x] **FND-01**: Project uses Next.js 16 App Router with `proxy.ts` (not `middleware.ts`), Server Actions, and async Request APIs (`await cookies()`, `await headers()`)
- [x] **FND-02**: Environment variables validated at build time via `@t3-oss/env-nextjs` with Zod schemas (covers `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `RESEND_FROM_EMAIL`)
- [x] **FND-03**: `next.config.ts` has `images.remotePatterns` wildcard to render scraped product images from any domain
- [x] **FND-04**: Supabase project created with `pg_cron` AND `pg_net` extensions enabled
- [x] **FND-05**: Three distinct Supabase clients exist: `createServerClient` (RSC + actions), `createBrowserClient` (auth modal), `createAdminClient` (cron only, service role)
- [x] **FND-06**: Tailwind v4 + Shadcn UI initialized via `npx shadcn@latest init` with working theme tokens
- [x] **FND-07**: `package.json` lint script uses ESLint CLI directly (not removed `next lint`)
- [x] **FND-08**: Project `CLAUDE.md` (or equivalent) replaces "Create Next App" placeholder metadata in [dealdrop/app/layout.tsx](dealdrop/app/layout.tsx)

### Database & Security (DB)

- [x] **DB-01**: `products` table created with columns: `id UUID PK`, `user_id UUID FK NOT NULL`, `url TEXT`, `name TEXT`, `current_price NUMERIC`, `currency TEXT`, `image_url TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- [x] **DB-02**: `products` has unique constraint on `(user_id, url)` preventing duplicate tracking per user
- [x] **DB-03**: `products` has CHECK constraint `current_price > 0` rejecting null/zero prices from failed scrapes
- [x] **DB-04**: `price_history` table created with columns: `id UUID PK`, `product_id UUID FK CASCADE`, `price NUMERIC`, `currency TEXT`, `checked_at TIMESTAMPTZ`
- [x] **DB-05**: RLS enabled on `products` with policies: SELECT/INSERT/UPDATE/DELETE only where `user_id = auth.uid()`
- [x] **DB-06**: RLS enabled on `price_history` with ownership-chain policy: `USING (product_id IN (SELECT id FROM products WHERE user_id = auth.uid()))` — read-only from user perspective
- [x] **DB-07**: Supabase-generated TypeScript types available via `supabase gen types typescript` integrated into the codebase

### Authentication (AUTH)

- [ ] **AUTH-01**: User can sign in with Google OAuth via Supabase Auth
- [ ] **AUTH-02**: `/auth/callback` Route Handler exchanges OAuth code for session and redirects to `/`
- [ ] **AUTH-03**: Sign-in triggered by clicking "Sign In" button in the header (opens auth modal)
- [ ] **AUTH-04**: Sign-in triggered when user submits Add Product form while logged out (opens auth modal)
- [ ] **AUTH-05**: Auth modal is a Shadcn Dialog with a single "Continue with Google" button (not a separate route)
- [ ] **AUTH-06**: Authenticated user sees "Sign Out" button in header that ends the session
- [ ] **AUTH-07**: `proxy.ts` refreshes Supabase session cookies on every request
- [ ] **AUTH-08**: OAuth redirect URIs registered in Google Cloud Console + Supabase Auth dashboard for `localhost:3000`, production domain, and Vercel preview wildcard

### Landing / Hero (HERO)

- [ ] **HERO-01**: Logged-out visitors see a hero section with tagline "Never miss a price drop" and a subtitle describing the service
- [ ] **HERO-02**: Hero section includes a responsive grid of feature cards (e.g. Multi-site support, Instant alerts, Price history)
- [ ] **HERO-03**: Header always visible with app logo and contextual Sign In / Sign Out button
- [ ] **HERO-04**: "Made with love" credit line rendered in hero
- [ ] **HERO-05**: Hero and feature cards are responsive from mobile (320px) to desktop

### Product Tracking (TRACK)

- [ ] **TRACK-01**: Logged-in user with no products sees an empty state with "No products yet" copy and prompt to add first product
- [ ] **TRACK-02**: Add Product form accepts a URL string and submits via Server Action
- [ ] **TRACK-03**: Server Action validates URL format with Zod before scraping
- [ ] **TRACK-04**: Server Action calls Firecrawl `scrape` with JSON schema extracting `product_name`, `current_price`, `currency_code`, `product_image_url`
- [ ] **TRACK-05**: Scraped payload validated with Zod — null/missing fields reject the insert with a user-facing error
- [ ] **TRACK-06**: Successful scrape inserts one row into `products` AND one row into `price_history` (initial data point)
- [ ] **TRACK-07**: Duplicate URL for same user returns a friendly error (caught via unique constraint)
- [ ] **TRACK-08**: Successful add triggers `revalidatePath('/')` so dashboard reflects new product without reload
- [ ] **TRACK-09**: Toast notification (Sonner) confirms successful add, failed add shows error toast

### Dashboard & Product Card (DASH)

- [ ] **DASH-01**: Logged-in homepage shows total count of user's tracked products
- [ ] **DASH-02**: Products render in a responsive grid of Shadcn Card components
- [ ] **DASH-03**: Each card displays product name, current price formatted via `Intl.NumberFormat` with correct currency, and product image via `next/image`
- [ ] **DASH-04**: Card has "Show Chart" toggle button that reveals/hides price history chart inline
- [ ] **DASH-05**: Card has "View Product" link that opens original URL in new tab (`target="_blank" rel="noopener"`)
- [ ] **DASH-06**: Card has "Remove" button that opens a Shadcn AlertDialog for confirmation
- [ ] **DASH-07**: Confirmed removal deletes the product (cascade deletes `price_history`) and shows success toast
- [ ] **DASH-08**: Card displays a "tracking failed" status badge when the most recent scrape attempt returned invalid data

### Price History Chart (CHART)

- [ ] **CHART-01**: Client component `PriceChart` uses Recharts to render a line chart of price over time
- [ ] **CHART-02**: Chart reads from `price_history` rows scoped to the product via RLS
- [ ] **CHART-03**: X-axis shows formatted dates, Y-axis shows formatted currency values
- [ ] **CHART-04**: Chart has at least one data point (seeded on product creation via TRACK-06)
- [ ] **CHART-05**: Chart renders correctly on mobile and desktop viewports
- [ ] **CHART-06**: Recharts version compatible with React 19 strict mode

### Automated Monitoring (CRON)

- [ ] **CRON-01**: Route Handler `GET /api/cron/check-prices` returns `{ status: "ok" }` as a public health check
- [ ] **CRON-02**: Route Handler `POST /api/cron/check-prices` requires `Authorization: Bearer ${CRON_SECRET}` header, returns 401 otherwise
- [ ] **CRON-03**: POST handler uses `createAdminClient()` (service role) to fetch all `products` rows, bypassing RLS
- [ ] **CRON-04**: Handler iterates products with bounded concurrency (`p-limit`, cap at 2-3 concurrent Firecrawl calls)
- [ ] **CRON-05**: Route Handler exports `maxDuration = 300` to allow longer execution on Vercel
- [ ] **CRON-06**: Each product re-scraped with Firecrawl; result validated with Zod
- [ ] **CRON-07**: Successful scrape with new price different from `current_price` inserts a new `price_history` row and updates `products.current_price` + `updated_at`
- [ ] **CRON-08**: Handler is idempotent — re-running on same day does not create duplicate price_history rows when price unchanged
- [ ] **CRON-09**: Failed scrape is logged but does not abort the run; product's UI badge reflects recent failure
- [ ] **CRON-10**: pg_cron schedule configured in Supabase to POST to the endpoint daily at 9:00 AM UTC (or chosen timezone)
- [ ] **CRON-11**: `CRON_SECRET` stored in Supabase Vault and referenced via a wrapper SQL function — never inline in `cron.job` table

### Email Alerts (EMAIL)

- [ ] **EMAIL-01**: When a new price < previous `current_price`, cron handler calls server action `sendPriceDropAlert`
- [ ] **EMAIL-02**: `sendPriceDropAlert` calls Resend `emails.send` with a detailed HTML template
- [ ] **EMAIL-03**: Email template renders product image, product name, old price, new price, percentage drop, and "View Product" link
- [ ] **EMAIL-04**: Resend sender domain verified with SPF + DKIM DNS records; `RESEND_FROM_EMAIL` uses the verified domain
- [ ] **EMAIL-05**: Email `To:` field uses authenticated user's email from Supabase Auth
- [ ] **EMAIL-06**: Email send failures logged but do not abort the cron run or revert DB writes

### Polish (POL)

- [ ] **POL-01**: Sonner toast provider mounted in root layout
- [ ] **POL-02**: Loading states (Shadcn Skeleton or similar) shown during add-product submission
- [ ] **POL-03**: Error boundary catches unexpected rendering errors and shows friendly fallback UI
- [ ] **POL-04**: Layout is mobile-responsive from 320px width upward
- [ ] **POL-05**: Metadata (`title`, `description`) in `app/layout.tsx` reflects DealDrop (no "Create Next App" placeholders)
- [ ] **POL-06**: Favicon replaced with DealDrop asset

### Deployment (DEP)

- [ ] **DEP-01**: Project deployed to Vercel with production domain
- [ ] **DEP-02**: All env vars configured in Vercel project settings (production + preview scopes)
- [ ] **DEP-03**: Supabase production project referenced from Vercel (not the local dev project)
- [ ] **DEP-04**: Google OAuth redirect URIs include production Vercel URL
- [ ] **DEP-05**: pg_cron job active and pointing at production API endpoint
- [ ] **DEP-06**: End-to-end manual test: sign up → add product → verify initial history row → manual cron trigger → verify alert email delivered

---

## v2+ (Deferred)

- Target price threshold alerts (per-product "notify when ≤ $X")
- Percentage-drop threshold alerts (per-product "notify on ≥ X% drop")
- Lowest-price-ever badge on product cards (easy win — already in data)
- Price drop history digest (weekly summary)
- Email-on-persistent-scrape-failure (after N consecutive failures)
- Sign-in with email/password or magic link (non-Google options)
- User-configurable scrape cadence per product

---

## Out of Scope

<!-- Mirrors PROJECT.md Out of Scope — explicit v1 exclusions. -->

- **Payments / subscriptions** — Portfolio/demo project; no monetization
- **Social / sharing features** — Privacy-first, keeps scope tight
- **Mobile native apps** — Web-only via responsive Tailwind
- **Browser extension** — Out of scope; paste-URL flow is sufficient
- **Currency conversion / FX** — Display prices in original currency
- **Multi-frequency cron or flash-sale tracking** — Daily is enough
- **Historical data retention limits** — Keep forever for v1
- **Real-time scraping (per-page-visit refresh)** — Only daily cron updates prices

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Complete |
| DB-01 | Phase 1 | Complete |
| DB-02 | Phase 1 | Complete |
| DB-03 | Phase 1 | Complete |
| DB-04 | Phase 1 | Complete |
| DB-05 | Phase 1 | Complete |
| DB-06 | Phase 1 | Complete |
| DB-07 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| HERO-01 | Phase 2 | Pending |
| HERO-02 | Phase 2 | Pending |
| HERO-03 | Phase 2 | Pending |
| HERO-04 | Phase 2 | Pending |
| HERO-05 | Phase 2 | Pending |
| TRACK-03 | Phase 3 | Pending |
| TRACK-04 | Phase 3 | Pending |
| TRACK-05 | Phase 3 | Pending |
| TRACK-01 | Phase 4 | Pending |
| TRACK-02 | Phase 4 | Pending |
| TRACK-06 | Phase 4 | Pending |
| TRACK-07 | Phase 4 | Pending |
| TRACK-08 | Phase 4 | Pending |
| TRACK-09 | Phase 4 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| DASH-07 | Phase 4 | Pending |
| DASH-08 | Phase 4 | Pending |
| CHART-01 | Phase 5 | Pending |
| CHART-02 | Phase 5 | Pending |
| CHART-03 | Phase 5 | Pending |
| CHART-04 | Phase 5 | Pending |
| CHART-05 | Phase 5 | Pending |
| CHART-06 | Phase 5 | Pending |
| CRON-01 | Phase 6 | Pending |
| CRON-02 | Phase 6 | Pending |
| CRON-03 | Phase 6 | Pending |
| CRON-04 | Phase 6 | Pending |
| CRON-05 | Phase 6 | Pending |
| CRON-06 | Phase 6 | Pending |
| CRON-07 | Phase 6 | Pending |
| CRON-08 | Phase 6 | Pending |
| CRON-09 | Phase 6 | Pending |
| CRON-10 | Phase 6 | Pending |
| CRON-11 | Phase 6 | Pending |
| EMAIL-01 | Phase 6 | Pending |
| EMAIL-02 | Phase 6 | Pending |
| EMAIL-03 | Phase 6 | Pending |
| EMAIL-04 | Phase 6 | Pending |
| EMAIL-05 | Phase 6 | Pending |
| EMAIL-06 | Phase 6 | Pending |
| POL-01 | Phase 7 | Pending |
| POL-02 | Phase 7 | Pending |
| POL-03 | Phase 7 | Pending |
| POL-04 | Phase 7 | Pending |
| POL-05 | Phase 7 | Pending |
| POL-06 | Phase 7 | Pending |
| DEP-01 | Phase 7 | Pending |
| DEP-02 | Phase 7 | Pending |
| DEP-03 | Phase 7 | Pending |
| DEP-04 | Phase 7 | Pending |
| DEP-05 | Phase 7 | Pending |
| DEP-06 | Phase 7 | Pending |

**Coverage:** 76/76 v1 requirements mapped across 7 phases. No orphans.

---

*Last updated: 2026-04-17 — traceability populated by gsd-roadmapper*
