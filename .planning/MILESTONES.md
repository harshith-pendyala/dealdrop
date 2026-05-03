# Milestones

## v1.1 Brand Polish & Email Config (Shipped: 2026-05-03)

**Phases completed:** 2 phases, 10 plans, 16 tasks

**Key accomplishments:**

- Redefined --primary CSS custom property to verified Tailwind v4 orange oklch values (orange-500 light / orange-400 dark) so every existing bg-primary, text-primary, and var(--primary) consumer auto-restyles via the cascade; added text-primary to ProductCard price <p> as the only consumer that needed a class addition.
- Replaced the text wordmark in Header.tsx with a click-home logo block (`<Link href="/" aria-label="DealDrop home"><Image src="/deal-drop-logo.png" alt="DealDrop" width={95} height={32} priority /></Link>`) and shipped a 5-test Header.test.tsx as the Wave 0 scaffold for BRAND-02.
- Swapped the inline ImageResponse background in dealdrop/app/icon.tsx from #18181b (zinc-900) to #f97316 (Tailwind v4 orange-500) and deleted the working-tree dealdrop/app/favicon.ico leftover — Path B chosen because the wordmark logo doesn't reduce legibly to 32x32.
- Two surgical edits to dealdrop/src/components/hero/Hero.tsx (delete the "Made with love" footer copy + append five Tailwind v4 gradient utilities to the section className) plus a Wave 0 Vitest test file (Hero.test.tsx) that locks in BRAND-01 absence and BRAND-04 gradient surface in red-green order.
- Two-task surgical rename of every user-facing "Add Product" / "Add a product" / "Product added!" string in dealdrop/src to "Track Price" / "Track a price" / "Now tracking" (D-11), with test assertions updated in lockstep. Component files and backend identifiers explicitly preserved. Full vitest suite (173/173) green.
- 08-VERIFICATION.md scaffolded and BRAND-01..04 closed via automated evidence; BRAND-05 disposition formally recorded as `deferred-to-human-uat` for the phase verifier to materialize 08-HUMAN-UAT.md.
- Insert location:
- Change:

---

## v1.0 DealDrop MVP (Shipped: 2026-05-02)

**Phases completed:** 7 phases, 38 plans, 55 tasks

**Key accomplishments:**

- Typed env schema (@t3-oss/env-nextjs + Zod) plus three Supabase client factories (server/browser/admin with server-only guard) plus Next.js 16 proxy.ts pass-through stub — every downstream phase now imports through this layer.
- products
- Applied all 3 migrations to remote Supabase (0001 schema, 0002 RLS, 0003 extensions), generated the Supabase TypeScript Database type from the live schema, empirically verified RLS cross-user isolation on both tables via Management API SQL impersonation, confirmed the server-only guard fires when admin client is imported into a Client Component, ran FND-02 env validation positive+negative tests, and cleaned up the debug page — closing Phase 1 with a provably-correct backend foundation.
- Shadcn UI 4.3 initialized with locked `components.json` (new-york/zinc/cssVariables), `cn()` helper at `src/lib/utils.ts`, Button primitive with radix-ui Slot.Root, and `@theme inline` OKLCH token layer with `@media (prefers-color-scheme: dark)` dark mode — developer visually verified all 5 Button variants in light + dark mode.
- Installed three Shadcn primitives (Dialog, Card, Sonner wrapper) plus the `sonner` and `next-themes` npm packages; locked files (components.json, globals.css, layout.tsx, button.tsx) verified untouched via md5; `npx tsc --noEmit` exits 0 — downstream Plans 03/04 have all required UI toolkit artifacts ready on disk.
- Next.js proxy now refreshes Supabase sessions on every request, /auth/callback exchanges OAuth codes into session cookies, and config.toml loopback URL is fixed (WR-03 closed).
- Five auth client components + one Server Action shipped. useAuthModal() hook contract locked for Phase 4. tsc + next build both exit 0; route tree lists /auth/callback and Proxy middleware.
- Phase 2 ships end-to-end. Hero with locked copy, contextual header, Shadcn Dialog OAuth modal, getUser-gated home route, Suspense-wrapped toast listener. User-approved after full 14-step OAuth smoke test.
- One-liner:
- Vitest 3.2.4 installed with node env + `@` → `./src` alias, three describe.skip skeletons for url/schema/scrape-product, and one committed live Firecrawl v2 /scrape response fixture closing research assumptions A1, A2, A5.
- Closed 7-reason ScrapeFailureReason union with compile-time exhaustiveness, Zod-backed validateUrl/normalizeUrl pure functions, and a branch-ordered parseProductResponse that maps Firecrawl v2 payloads to `{ok, data | reason}` — 24 passing unit tests, Seams 1 and 2 closed.
- Shipped the server-only `scrapeProduct(url)` function — 179 lines composing Plan 02's validateUrl/normalizeUrl/parseProductResponse contracts with Firecrawl v2 POST + AbortSignal.timeout(60s) + targeted 1-retry on 5xx/network. 16 passing branch tests (B1–B15 + B10b) via mocked fetch + fixture spread. `server-only` aliased in vitest so DAL code is unit-testable without touching the production guard. `npm run build`, `tsc --noEmit`, and the full vitest suite (40 tests, 269ms) all green.
- Closed T-3-01 operational verification two ways: (1) an adversarial `'use client'` page that imports `scrapeProduct` still makes `npm run build` fail with the expected `server-only` error (production guard operative), AND (2) a post-refactor bundle grep confirms `.next/static/
- One-liner:
- One-liner:
- 1. [Rule 1 - Bug] EmptyState test missing jest-dom import and DOM cleanup
- One-liner:
- One-liner:
- Red-state Vitest scaffolding for PriceChart + getUserProducts with Risk-4 makeProduct() forward-compat patch and dual-mode makeSupabaseMock chain.
- recharts@3.8.1 exact-pinned and getUserProducts widened to a single round-trip nested select that preloads RLS-scoped price_history ordered chronologically — all 5 Wave 0 red-state DAL tests turn green with zero Phase 4 regression and zero downstream TypeScript changes.
- PriceChart.tsx shipped as a 125-line 'use client' Recharts LineChart with exported xTickFormatter + yTickFormatter, defensive empty-state guard, and PriceTooltip full-precision hover — all 5 Wave 0 red tests flipped to green in a single task commit, full 108/108 suite + npm run build remain clean.
- ProductCard.tsx `{chartOpen && ...}` slot swapped from placeholder div to `<PriceChart history={product.price_history} currency={product.currency} />` in a single +2/-4 diff; Risk 5 audit confirmed CLEAN (ProductGrid/DashboardShell required no changes); full 108/108 vitest suite + npm run build remain green; user approved the 5-step browser smoke test (mobile + desktop + dark-mode + hydration-check) — Phase 5 fully closed with all 6 CHART requirements complete.
- resend@6.12.2 + p-limit@3.1.0 (CJS-pinned) installed, makeSupabaseAdminMock factory shipped, and 4 RED-state test skeletons (50 todos + 4 import probes) staged for Plans 02/04/05 to flip GREEN.
- Shipped `sendPriceDropAlert` — the single server-only function that renders the price-drop HTML email and hands it to Resend's SDK — with 19 GREEN tests covering happy path + every error-name branch + T-6-04 structured-log + T-6-06 HTML-escape contract.
- One-liner:
- 1. [Rule 1 - Bug] Plan text used `product_image_url` in test mocks, but `ProductData` type has `image_url`
- One-liner:

---
