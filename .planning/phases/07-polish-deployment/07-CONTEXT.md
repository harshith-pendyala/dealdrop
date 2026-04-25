# Phase 7: Polish & Deployment - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Make DealDrop production-presentable on Vercel and prove the core value loop works end-to-end on the live URL. Specifically: ship POL-02 through POL-06 polish (loading, error boundary, mobile-clean, metadata, favicon), deploy to a Vercel production domain with all env vars configured, point pg_cron at the live endpoint, register OAuth redirect URIs for the prod URL, and run the manual sign-up → add product → manual cron trigger → verified price-drop email flow on prod.

**In scope:**
- POL-02: Loading state during add-product submission, reusing the existing `SkeletonCard` via the optimistic-product slot in `ProductGrid`
- POL-03: Two-tier error boundary — `dealdrop/app/global-error.tsx` (root crash) + `dealdrop/app/error.tsx` (page-level, preserves the header on dashboard errors)
- POL-03 fallback content: centered Shadcn Card with "Something went wrong" headline, one-line apology, "Try again" button (calls Next.js `reset()`), and "Go home" link to `/`. No error code, no stack trace.
- POL-04: Fix-as-found mobile audit at 320 / 375 / 768 / desktop viewports, walking hero → sign-in modal → dashboard → add product → chart toggle. File each visible break as a Tailwind tweak in the Phase 7 plan; document findings in `07-VERIFICATION.md`.
- POL-05: Verify `title` + `description` in `dealdrop/app/layout.tsx` reflect DealDrop. **Already shipped** — Phase 7 is a verification-only check, not a re-implementation. No OpenGraph, no Twitter card, no theme-color in v1.
- POL-06: Generated `dealdrop/app/icon.tsx` using Next.js dynamic-icon convention (`ImageResponse`) with a DealDrop mark. **Delete the existing `dealdrop/app/favicon.ico`** (currently the Next.js scaffold default). No binary asset to commit.
- DEP-01 through DEP-06: Vercel prod deploy, env vars, prod Supabase reference, OAuth redirect URI registration on prod URL, pg_cron prod cutover, and the end-to-end manual test producing a real price-drop email in a non-owner inbox.

**Not in scope for this phase:**
- **POL-01 (Sonner setup) — already shipped in Phase 2** (D-13 in `02-CONTEXT.md`). Phase 7 must not re-cover it.
- DASH-08 "tracking failed" badge logic — Phase 4 owns the read; Phase 6 owns the write. Phase 7 only verifies it surfaces in the live flow.
- Any new feature work (per-product alert thresholds, digest emails, retry-on-email-failure, percentage thresholds, profile menu, sticky header, account settings, currency conversion). All explicitly v2+ per `PROJECT.md` Out of Scope and the Phase 2/4/6 deferred lists.
- Playwright / viewport-snapshot regression tests for POL-04 — explicitly rejected as "probably overkill for portfolio bar".
- Tailwind container-query / responsive-primitive refactor — POL-04 is fix-as-found, not opportunistic refactor.
- Loading states beyond add-product (no `dealdrop/app/loading.tsx` for the dashboard segment, no chart-toggle pending state) — POL-02 is taken literally.
- New Resend HTML template work, cron-runs audit table, `last_scrape_reason` column — all locked deferred per Phase 6 `06-CONTEXT.md`.

</domain>

<decisions>
## Implementation Decisions

### Error boundary (POL-03)

- **D-01:** **Two-tier error boundary** — ship `dealdrop/app/global-error.tsx` AND `dealdrop/app/error.tsx`. The global boundary catches root-layout crashes (replaces `<html><body>` itself per Next.js 16 contract); the page-level boundary catches errors thrown inside the `/` route's render (Hero, DashboardShell, ProductGrid) and keeps the header visible while only the body resets. Two files, slightly nicer UX on partial failures than a single root boundary.

- **D-02:** **Fallback content is a centered Shadcn Card** — heading "Something went wrong", one-line apology copy (planner picks exact wording, keep it portfolio-clean and not-developer-shaped), "Try again" button calling Next.js `reset()`, and a "Go home" anchor / Link to `/`. No error code, no stack trace, no `<details>` reveal of `error.message`. The page-level `error.tsx` reuses the same card body inside the page area; `global-error.tsx` wraps it in the minimal `<html><body>` shell required by Next.js.

- **D-03:** Both error boundary files are client components (`'use client'`) per Next.js 16 Route Handler / boundary contract. They accept `{ error, reset }` props. **Both must read the relevant Next.js 16 docs before implementation** (per `dealdrop/AGENTS.md` "This is NOT the Next.js you know" instruction) — `global-error.tsx` semantics changed in 16.

### Loading state (POL-02)

- **D-04:** **POL-02 is taken literally** — loading state during add-product submission only. Reuse the existing `SkeletonCard` (`dealdrop/src/components/dashboard/SkeletonCard.tsx`) via the optimistic-product slot already wired into `ProductGrid` (`useOptimistic` from Phase 4 Plan 04-07). **No new files**, no `dealdrop/app/loading.tsx` for the dashboard segment, no chart-toggle pending state. If the optimistic-pending placeholder is already rendering correctly in the existing `ProductGrid`, the only Phase 7 work for POL-02 is verification.

### Mobile responsive (POL-04)

- **D-05:** **Fix-as-found audit pass** — exercise the full app at 320 / 375 / 768 / desktop viewports in DevTools, walking hero → header Sign In → AuthModal → DashboardShell empty state → AddProductDialog → product card → Show Chart toggle → RemoveProductDialog. File each visible break (overflow, stacked-when-it-should-not, illegible text, button-too-small, etc.) as a discrete Tailwind tweak in the Phase 7 plan. Document the audit findings in `07-VERIFICATION.md` as "viewport / observed break / fix shipped" rows. **No Playwright**, no viewport-snapshot tests, no opportunistic refactor of breakpoints into utility primitives.

### Metadata (POL-05)

- **D-06:** **POL-05 is taken literally — title + description only.** Both already set in `dealdrop/app/layout.tsx:19-22`:
  - `title: "DealDrop — Universal Price Tracker"`
  - `description: "Track products from any e-commerce site. Get email alerts the moment the price drops."`
  Phase 7 work for POL-05 is **verification-only**: confirm there is no "Create Next App" placeholder anywhere (FND-08 was Phase 1's check; revalidate at deploy time on the prod URL). **No OpenGraph metadata, no Twitter card, no `theme-color`, no dynamic OG image route in v1.** If the planner finds the wording weak during verification, micro-edits are acceptable but adding new fields is out of scope.

### Favicon (POL-06)

- **D-07:** **Generated `dealdrop/app/icon.tsx`** using Next.js dynamic-icon convention (`ImageResponse` from `next/og`). Renders a DealDrop mark — planner's discretion on the exact glyph (a stylized "D" letterform, a downward-tag glyph, or a Lucide icon ported in via SVG). Output size 32×32 (Next.js default). **Delete `dealdrop/app/favicon.ico`** as part of the same plan — the dynamic icon convention takes precedence and we don't want a stale Next.js scaffold default lingering. No binary PNG/SVG asset committed to `dealdrop/public/`.

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner should use these defaults; surface as a deviation if any materially changes the plan or user-visible behavior.

- **Production environment topology (DEP-02, DEP-03).** Recommend: **create a fresh Supabase production project** (separate from the `dealdrop-dev` Tokyo project from Phase 1) and re-apply all five committed migrations (`0001..0005`) to it cleanly. Rationale: the dev project has carried test data, manual SQL editor experiments, and a CRON schedule already pointing at a non-prod URL. Portfolio bar still benefits from "demo loads against a clean prod project" because reviewers will inspect the Supabase dashboard. Vercel env scoping: `production` scope gets the prod-project keys + prod `RESEND_API_KEY` + prod `CRON_SECRET`; `preview` scope can reuse the dev-project keys so preview deploys don't pollute prod data. Acceptable alternative if time-pressed: reuse the dev project as "prod" and make sure all migrations are applied + RLS impersonation re-verified — flag as a documented compromise in `07-VERIFICATION.md`.

- **pg_cron prod cutover mechanism (CRON-10, DEP-05).** Recommend: write a new migration `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql` that (a) `cron.unschedule('dealdrop-daily-price-check')` for the dev URL job (idempotent — wrap in DO block / `WHERE EXISTS` guard so re-running on a prod project that never had the dev schedule does not error), and (b) re-`cron.schedule()` against the **prod Vercel URL via the existing `public.trigger_price_check_cron()` SECURITY DEFINER wrapper** from Plan 06-03. The wrapper already reads the Vault secret; only the URL constant inside the wrapper needs to change. Migration approach keeps the cron-config audit trail in git. Acceptable alternative: Supabase dashboard SQL editor for a one-shot prod cutover with the SQL captured in `07-VERIFICATION.md`. **The Vault `cron-secret-token` (Plan 06-03) must also be re-created in the prod Supabase project before pg_cron will work.**

- **OAuth redirect URI registration on prod (AUTH-08, DEP-04).** Already in scope as an ops checklist (per Phase 2 D-15 / Claude's Discretion). Add the live Vercel production URL to (a) Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs as `https://<prod-domain>/auth/callback`, and (b) Supabase Auth → URL Configuration → Site URL + Redirect URLs. The Vercel `*.vercel.app` preview wildcard was registered at Phase 2 close.

- **DEP-06 end-to-end verification deliverable shape.** Recommend: **lightweight checklist embedded in `07-VERIFICATION.md`** — one numbered row per step (sign in with a fresh Google account → add a product whose price you can manipulate via Firecrawl test target or temporary URL → confirm one `price_history` row with the seed price → curl `POST /api/cron/check-prices` with prod `CRON_SECRET` → observe new `price_history` row + email arrival in a **non-owner inbox** → screenshot the email → screenshot the dashboard chart with the second data point). Screenshots stored in `07-VERIFICATION.md` (or referenced inline as relative paths if committing image assets). **No separate printable smoke-test doc** like Phase 2's `02-SMOKE-TEST.md` — the checklist + screenshots in VERIFICATION are enough for portfolio bar. The "Looks Done But Isn't" checklist from `research/PITFALLS.md:336-348` is the inspection grid for this same verification — every line item must pass.

- **Error boundary fallback copy & icon glyph.** Planner picks: copy must be friendly ("Something went wrong" + apology), no developer-jargon, no error codes; icon glyph for `app/icon.tsx` must read as DealDrop and be legible at 32×32. No strong preference between a "D" letterform, a tag-with-arrow shape, or a tinted Lucide icon.

- **Mobile audit "fix budget".** If the audit surfaces more than ~6 distinct breaks at 320px, that's a signal an existing component is structurally broken on mobile and may warrant a focused refactor for that one component. The default is "single Tailwind tweak per break"; flag any deviation to the user.

### Folded Todos

None — `gsd-tools todo match-phase 7` returned zero matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — POL-02 through POL-06 + DEP-01 through DEP-06 acceptance criteria. Note POL-01 explicitly moved to Phase 2 (per traceability footnote) and must NOT be re-implemented in Phase 7.
- `.planning/ROADMAP.md` §"Phase 7: Polish & Deployment" — goal + 5 success criteria + UI hint=yes
- `.planning/PROJECT.md` — "Bar: Portfolio/demo quality" constraint (the polish ceiling); Out of Scope list (no payments, no social, no FX, no per-product thresholds, no mobile native)

### Prior Phase Context (locked decisions Phase 7 inherits)
- `.planning/phases/02-authentication-landing/02-CONTEXT.md` §D-13 — POL-01 moved Phase 7 → Phase 2; Sonner already mounted in `dealdrop/app/layout.tsx`. Phase 7 polish scope MUST exclude Sonner setup.
- `.planning/phases/02-authentication-landing/02-CONTEXT.md` §D-15 + AUTH-08 ops checklist — OAuth redirect URI registration pattern; Phase 7 extends to prod URL.
- `.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md` §D-07 + Plan 04-07 — `useOptimistic` wiring in `ProductGrid` and the `SkeletonCard` optimistic-pending slot Phase 7 reuses for POL-02.
- `.planning/phases/06-automated-monitoring-email-alerts/06-CONTEXT.md` §D-02 — price-change-gate idempotency; Phase 7 manual cron re-trigger for DEP-06 relies on this (no `?force=1` flag, no duplicate rows on re-run).
- `.planning/phases/06-automated-monitoring-email-alerts/06-CONTEXT.md` Vault SQL pattern (Claude's Discretion §"Vault SQL pattern (CRON-11)") — Phase 7 must re-create the Vault secret in the prod Supabase project before pg_cron will work.

### Existing Code Contracts (preserve verbatim)
- `dealdrop/app/layout.tsx:19-22` — title + description metadata already set; Phase 7 verifies, does not rewrite.
- `dealdrop/app/layout.tsx:34-44` — Sonner `<Toaster />` and `AuthModalProvider` already mounted; do not re-mount.
- `dealdrop/app/favicon.ico` — Next.js scaffold default; **delete in Phase 7** when `app/icon.tsx` ships (D-07).
- `dealdrop/src/components/dashboard/SkeletonCard.tsx` — POL-02 reuse target.
- `dealdrop/src/components/dashboard/ProductGrid.tsx` — `useOptimistic` slot already renders `SkeletonCard` while a new product is being added.
- `dealdrop/app/api/cron/check-prices/route.ts` — Phase 7 manual-trigger target for DEP-06; Bearer-token auth, `maxDuration = 300` already in place from Phase 6.
- `dealdrop/proxy.ts` — session refresh from Phase 2; do not modify in Phase 7.
- `dealdrop/src/lib/env.server.ts` and `dealdrop/src/lib/env.ts` — split-env pattern; Phase 7 must add prod values to Vercel without breaking the split.
- `dealdrop/AGENTS.md` / `dealdrop/CLAUDE.md` — "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` before writing `error.tsx`, `global-error.tsx`, or `app/icon.tsx` files.

### Architecture & Pitfalls (read before planning)
- `.planning/research/PITFALLS.md` §"Looks Done But Isn't" Checklist (lines 336-348) — **the inspection grid for DEP-06**. Every item must pass before phase close: cron GET vs POST split, RLS on `price_history`, OAuth on prod URL registered in BOTH Google + Supabase, scrape-failure handling on cron path, email arrives in **non-owner inbox**, chart with single + zero data points, non-USD currency renders, env vars in Vercel prod (not just locally), `maxDuration` with 15+ products, cascade delete works.
- `.planning/research/PITFALLS.md` §"Recovery Strategies" (lines 351-362) — read before deploy so the rotation/recovery story is understood.
- `.planning/research/PITFALLS.md` §"Tailwind classes not applying in production" (line 362) — verify on first prod deploy: `@import "tailwindcss"` in `globals.css`, no conflicting `tailwind.config.js`, classes survive the Vercel build.

### External Docs (planner should fetch during planning)
- **Next.js 16 docs from `dealdrop/node_modules/next/dist/docs/`** — authoritative for `error.tsx`, `global-error.tsx` (semantics changed in 16), `app/icon.tsx` dynamic-icon convention, `ImageResponse` from `next/og`, async Request APIs in error boundaries.
- **Vercel docs** — env var scoping (production vs preview vs development), function timeout limits, deployment URL conventions for Google OAuth registration, pg_cron from external Supabase pointing at Vercel URL.
- **Supabase Auth → URL Configuration** — Site URL + Redirect URLs setup for the prod Vercel URL.
- **Google Cloud Console → OAuth 2.0 Client** — Authorized redirect URIs entry for `https://<prod-domain>/auth/callback`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`SkeletonCard`** at `dealdrop/src/components/dashboard/SkeletonCard.tsx` — POL-02 optimistic-pending placeholder; already wired into `ProductGrid` via `useOptimistic`.
- **Shadcn Card** at `dealdrop/components/ui/card.tsx` — POL-03 fallback wrapper; same component used in Hero feature cards and product cards (UI consistency).
- **Shadcn Button** at `dealdrop/components/ui/button.tsx` — "Try again" + "Go home" actions in the error fallback.
- **`<Toaster />` + Sonner** — already in root layout (POL-01 from Phase 2). Phase 7 does NOT mount or configure it.
- **Lucide icons** (`lucide-react` already installed) — candidate glyph source for `app/icon.tsx`.
- **`dealdrop/app/api/cron/check-prices/route.ts`** — POST endpoint for DEP-06 manual trigger; already has `maxDuration = 300`, Bearer-token auth, GET health check.
- **Existing Tailwind responsive utilities** — `sm:` / `md:` / `lg:` breakpoint vocabulary established across Hero, Header, DashboardShell, ProductGrid; Phase 7 mobile audit extends this pattern, doesn't replace it.
- **Title + description metadata** at `dealdrop/app/layout.tsx:19-22` — POL-05 verification target (already implemented).

### Established Patterns
- **`'use client'` for boundaries** — `error.tsx` and `global-error.tsx` are client components in Next.js App Router.
- **`Readonly<>` props + functional components** — apply to the new boundary components.
- **Tailwind utility-first** with `cn()` from `@/lib/utils` for conditional classes.
- **`@/*` path alias** for internal imports (`@/components/ui/card`, `@/components/ui/button`).
- **`import 'server-only'` first line** — does NOT apply to error boundaries (they're client components) or `app/icon.tsx` (Next.js handles the runtime).
- **Migration-per-concern** — if pg_cron prod cutover is shipped via SQL migration, name it `0006_cron_prod_url_cutover.sql`. Don't reopen `0005_cron_daily_price_check.sql`.
- **No emojis in source files** — established across phases; do not introduce in error boundary copy or icon design.

### Integration Points
- **New: `dealdrop/app/error.tsx`** — page-level boundary. Client component. Renders centered Shadcn Card with headline + apology + Try again (`reset()`) + Go home (`<Link href="/">`). Header stays visible because the boundary catches inside the `/` route segment.
- **New: `dealdrop/app/global-error.tsx`** — root boundary. Client component. Renders its own minimal `<html><body>` (Next.js requirement) with the same card body. Catches root-layout crashes.
- **New: `dealdrop/app/icon.tsx`** — dynamic icon. `ImageResponse` from `next/og`. Replaces favicon.ico.
- **Delete: `dealdrop/app/favicon.ico`** — paired with the `app/icon.tsx` introduction. Same plan, same commit.
- **Modify (mobile audit fixes only): `dealdrop/src/components/{hero,header,dashboard}/*.tsx`** — Tailwind class tweaks discovered during the 320 / 375 / 768 audit. The set of files is empirical (whatever the audit surfaces).
- **No modify: `dealdrop/app/layout.tsx`** — Phase 7 does NOT change layout.tsx. POL-05 metadata is already correct (D-06).
- **New (deployment side): `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql`** — pg_cron unschedule-and-reschedule against prod URL. Idempotent. (See Claude's Discretion §"pg_cron prod cutover mechanism".)
- **Vercel project + env var configuration** — out-of-repo deployment work; documented as a checklist in `07-VERIFICATION.md` once shipped (DEP-02). Includes: prod scope keys (Supabase URL/anon/service-role for prod project, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`), preview scope (can reuse dev keys), Google OAuth + Supabase Auth redirect-URI updates.
- **No UI changes outside the audit and the error fallback** — DashboardShell, Hero, Header, ProductGrid, ProductCard, PriceChart all keep their Phase 2-5 contracts.

</code_context>

<specifics>
## Specific Ideas

- **The two-tier error boundary is load-bearing for portfolio UX** (D-01): the page-level `error.tsx` keeps the Header visible so a logged-in user who hits a dashboard crash can still see they're signed in. The root `global-error.tsx` is the safety net for layout-level explosions. Both must ship; one without the other reads as half-finished.
- **POL-05 is the smallest possible scope** (D-06): the metadata already reads correctly in `app/layout.tsx`. The temptation to "while we're here" add OpenGraph + Twitter is the scope creep we explicitly rejected. If shareable-link cards become a portfolio polish ask, that's a separate decimal-phase insertion, not Phase 7 scope.
- **Favicon work is a two-line transaction** (D-07): create `app/icon.tsx`, delete `app/favicon.ico`. Anything more — branded image assets, multi-size manifest, apple-touch-icon — is v2+.
- **Mobile audit findings are documentation, not just commits** (D-05): every observed break at 320/375/768 must show up as a row in `07-VERIFICATION.md` so the "we audited mobile" claim is auditable. The fix-as-found loop ends when a full top-to-bottom walk produces zero new breaks at 320px.
- **DEP-06 must use a non-owner inbox** for the email-receipt step (per `PITFALLS.md:342`). The "Looks Done But Isn't" item exists because Resend account-owner inboxes silently succeed even when domain DNS is broken. Use a Gmail address that is NOT the Resend account email.
- **POL-01 is closed.** Sonner mounted in Phase 2. If a Phase 7 task description asks to "install Sonner" or "mount `<Toaster />`", that's a planning bug — flag immediately.
- **The Vault `cron-secret-token` must be re-created in the prod Supabase project** (Claude's Discretion §"pg_cron prod cutover mechanism"). The Vault state from the dev project does not carry over to a fresh prod project; running the migrations alone will not create the secret.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — `gsd-tools todo match-phase 7` returned zero pending todos.

### Out of this phase
- **OpenGraph + Twitter card metadata + dynamic OG image route** — POL-05 is title/description only in v1. If portfolio shareability becomes a need (Slack/iMessage previews of the prod URL), introduce as a small decimal-phase insertion or a v2+ polish bundle.
- **Theme-color meta tag** — same bucket as OG; not in v1.
- **Static favicon asset (PNG/SVG in `public/`)** — rejected in favor of the generated `app/icon.tsx` approach (D-07). If the dynamic icon ever feels off-brand, swap the implementation, not the convention.
- **Lucide-icon-as-favicon** — considered as an alternative to D-07's `ImageResponse` glyph; rejected so the favicon is custom-DealDrop, not a recognizable third-party-icon mark.
- **`app/loading.tsx` for the dashboard segment** — POL-02 is taken literally; out of v1.
- **Chart-toggle pending state** — POL-02 is taken literally; out of v1.
- **Playwright + viewport-snapshot regression tests for mobile** — explicitly rejected as overkill for portfolio bar; rely on the audit-pass + VERIFICATION.md document instead.
- **Tailwind responsive-primitive refactor / container queries** — POL-04 is fix-as-found, not opportunistic refactor. If breakpoint inconsistency becomes painful in a later iteration, tackle it as a focused refactor phase.
- **Per-feature React error boundaries inside ProductGrid / PriceChart** — rejected in favor of D-01's two-tier file-system boundary; one row of bad data should not need its own boundary at portfolio bar.
- **Collapsible "Show details" with `error.message`** — D-02 keeps the fallback developer-jargon-free. If on-page error reporting becomes a need (e.g., a portfolio reviewer can't tell us what they hit), revisit.
- **Error code / stack trace display** — same bucket; rejected.
- **Sticky header / profile menu / account settings page** — listed in Phase 2's deferred ideas, still deferred.
- **Email-on-tracking-failure flow** — listed in `PROJECT.md` Out of Scope; v2+.
- **Per-product alert thresholds (target price, % drop) / digest emails / retry-on-email-failure / minimum-drop tolerance / cooldown for chronically-failing products** — all locked deferred per Phase 6 `06-CONTEXT.md`.
- **Cron-runs audit table / `last_scrape_reason` column / `scrape_failures` audit table / Postgres RPC for atomic INSERT+UPDATE** — all locked deferred per Phase 6.
- **Cron `?force=1` override** — not needed (Phase 6 D-02 idempotency); rejected.
- **Currency conversion / FX** — `PROJECT.md` Out of Scope.
- **Browser extension / mobile native apps / payments / social features** — `PROJECT.md` Out of Scope.

</deferred>

---

*Phase: 07-polish-deployment*
*Context gathered: 2026-04-25*
