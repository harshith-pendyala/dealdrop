# Phase 7: Polish & Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 07-polish-deployment
**Areas discussed:** Error boundary + polish surface (bundled — covers POL-02, POL-03, POL-04, POL-05, POL-06)

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Error boundary + polish surface | POL-03 boundary placement + fallback content; POL-02 loading depth; POL-04 mobile 320px audit; POL-05 metadata depth; POL-06 favicon source. | ✓ |
| Production env topology | Fresh prod Supabase project vs reuse dev project; Vercel env scoping. | |
| pg_cron prod cutover | How daily cron gets pointed at live Vercel URL; dev cron disposition. | |
| DEP-06 E2E deliverable | Printable smoke-test doc with screenshots vs lightweight checklist embedded in VERIFICATION.md. | |

**User's choice:** Error boundary + polish surface (single area). The other three were left to Claude's Discretion in CONTEXT.md.

---

## Error boundary placement (POL-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Root global-error only (Recommended) | Single `global-error.tsx` with friendly card + Try again. Catches root + unhandled route errors. Minimal surface. | |
| Root global-error + page-level error.tsx | `global-error.tsx` for root crashes + `app/error.tsx` so dashboard errors keep the header visible and only the page body resets. Two files. | ✓ |
| Root global-error + per-feature boundaries | Above + targeted React error boundaries inside ProductGrid and PriceChart so one bad row/chart doesn't kill the dashboard. Most resilient; adds 2 client-component boundaries. | |

**User's choice:** Root global-error + page-level error.tsx
**Notes:** Two-tier boundary is load-bearing — page-level keeps the Header visible on dashboard crashes; root catches layout-level explosions. Captured as D-01 in CONTEXT.md.

---

## Loading state coverage (POL-02)

| Option | Description | Selected |
|--------|-------------|----------|
| POL-02 literal: add-product only (Recommended) | Reuse existing `SkeletonCard` via `useOptimistic` pending-product slot in `ProductGrid`. No new files. | ✓ |
| Add-product + dashboard initial load | Above + `app/loading.tsx` for dashboard segment so initial server-render shows skeletons. One small new file. | |
| Add-product + dashboard + chart toggle | Above + tiny pending state for the Show Chart toggle. Three loading surfaces. | |

**User's choice:** POL-02 literal: add-product only
**Notes:** Captured as D-04. Phase 7 work is verification — the optimistic-pending placeholder may already be rendering correctly.

---

## Metadata depth (POL-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Title + description only (Recommended) | POL-05 literal. Already set in `app/layout.tsx`. Verify wording, ship. No OG, no Twitter card, no theme-color. | ✓ |
| Title/description + OpenGraph + theme-color | Add openGraph (title, description, type='website', siteName, url) + theme-color so prod URL renders a card in Slack/iMessage. | |
| Full social-share suite | Title/description + OpenGraph + Twitter card + theme-color + generated `/opengraph-image.tsx` (Next.js dynamic OG). | |

**User's choice:** Title + description only
**Notes:** Captured as D-06. Already shipped; Phase 7 is verification-only. No OG/Twitter in v1.

---

## Favicon source (POL-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Generated `/icon.tsx` with DealDrop mark (Recommended) | `dealdrop/app/icon.tsx` renders DealDrop glyph with `ImageResponse`. No binary asset to commit. Delete `app/favicon.ico`. | ✓ |
| Static PNG/SVG asset committed to public/ | Hand-made favicon (e.g., `public/favicon.png` + `public/icon.svg`) referenced in `metadata.icons`. More design control; need to provide the asset. | |
| Lucide-icon-as-favicon SVG | Reuse a Lucide tag/trending-down icon as a static SVG favicon. Matches in-app iconography. | |

**User's choice:** Generated `/icon.tsx` with DealDrop mark
**Notes:** Captured as D-07. Pair the new file with `app/favicon.ico` deletion in the same plan.

---

## Mobile responsive approach (POL-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Fix-as-found audit pass (Recommended) | DevTools at 320 / 375 / 768 / desktop, walk hero → sign-in → dashboard → add product → chart toggle. File each break as a Tailwind tweak. Document in 07-VERIFICATION.md. | ✓ |
| Audit + Playwright viewport snapshot tests | Above + Playwright (new dep) with viewport screenshots at 320/768/1280. Heavier; not in current test stack. | |
| Audit + Tailwind container-query / responsive primitives refactor | Audit-pass + opportunistically refactor improvised mobile breakpoints into utility patterns. Risk of touching files outside POL-04 scope. | |

**User's choice:** Fix-as-found audit pass
**Notes:** Captured as D-05. No Playwright. No refactor.

---

## Error fallback content (POL-03 fallback)

| Option | Description | Selected |
|--------|-------------|----------|
| Centered card: headline + Try again + Home link (Recommended) | Vertically-centered Shadcn Card. "Something went wrong" + apology + "Try again" (`reset()`) + "Go home" (anchor to `/`). No error code, no stack trace. | ✓ |
| Card + collapsible 'Show details' | Above + `<details>` revealing `error.message` (NOT stack). Slightly more developer-shaped UX. | |
| Minimal text + Try again | Plain centered text block, no card, no home link, just a Try again button. Simpler than Recommended. | |

**User's choice:** Centered card: headline + Try again + Home link
**Notes:** Captured as D-02. Card body is shared between `app/error.tsx` and `app/global-error.tsx`.

---

## Continuation choice

| Option | Description | Selected |
|--------|-------------|----------|
| Move to write CONTEXT | Five decisions in this area is enough; lock and write CONTEXT.md. | ✓ |
| More questions in this area | Keep going on icon glyph specifics, dashboard error.tsx layout, etc. | |
| Discuss one of the deferred areas | Pull in prod env topology / pg_cron cutover / DEP-06 deliverable. | |

**User's choice:** Move to write CONTEXT

---

## Claude's Discretion

The user explicitly did not deep-dive these areas. Defaults documented in CONTEXT.md `<decisions>` §"Claude's Discretion":

- Production environment topology (DEP-02, DEP-03) — recommend fresh prod Supabase project; reuse dev as fallback if time-pressed.
- pg_cron prod cutover mechanism (CRON-10, DEP-05) — recommend new migration `0006_cron_prod_url_cutover.sql` + re-create Vault secret in prod project.
- OAuth redirect URI registration on prod (AUTH-08, DEP-04) — already on the Phase 2 ops-checklist pattern; extend to prod URL.
- DEP-06 end-to-end verification deliverable shape — recommend lightweight checklist + screenshots embedded in `07-VERIFICATION.md`; no separate smoke-test doc.
- Error boundary fallback copy & icon glyph — planner picks, friendly + non-developer-jargon, legible at 32×32.
- Mobile audit "fix budget" — single Tailwind tweak per break; >6 distinct breaks at 320px on a single component is a signal to escalate.

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`. Highlights: OpenGraph/Twitter/theme-color metadata, dynamic OG image route, static favicon asset, `app/loading.tsx`, chart-toggle pending state, Playwright snapshots, Tailwind container-query refactor, per-feature React error boundaries, error-code/stack-trace display, sticky header, profile menu, account settings, email-on-tracking-failure, per-product alert thresholds, digest emails, currency conversion, browser extension, mobile native apps, payments, social features.
