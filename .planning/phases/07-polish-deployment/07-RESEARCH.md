---
phase: 7
topic: polish-deployment
date: 2026-04-25
---

# Phase 7: Polish & Deployment — Research

**Researched:** 2026-04-25
**Domain:** Next.js 16 polish primitives (error boundaries, dynamic icons), Vercel production deployment, Supabase prod cutover, end-to-end manual verification
**Confidence:** HIGH on Next.js file-convention contracts (verified locally in `node_modules/next/dist/docs/`); HIGH on prior-phase code contracts (read directly); MEDIUM on Vercel CLI exact command shapes (verified via web search 2026); LOW only where the dashboard UI changes between sessions (Google Cloud Console / Vercel dashboard navigation labels).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (Two-tier error boundary):** Ship `dealdrop/app/global-error.tsx` AND `dealdrop/app/error.tsx`. Global catches root-layout crashes (replaces `<html><body>` per Next.js 16 contract). Page-level catches errors thrown inside `/`'s render (Hero, DashboardShell, ProductGrid) and keeps Header visible.
- **D-02 (Fallback content):** Centered Shadcn Card. Heading "Something went wrong"; one-line apology (planner picks copy, portfolio-clean, not developer-shaped); "Try again" button calling Next.js `reset()` (see RESEARCH §"Next.js 16 error boundary contract" — the prop is now `unstable_retry` in Next 16.2; planner must adopt the new name); "Go home" anchor/Link to `/`. No error code, no stack trace, no `<details>`.
- **D-03:** Both boundary files are client components (`'use client'`) per Next.js 16 contract. Both accept `{ error, reset }` props (CONTEXT wording — actual prop name is `unstable_retry` in Next 16.2; see RESEARCH for the fix). Both must read the relevant Next.js 16 docs before implementation per `dealdrop/AGENTS.md`.
- **D-04 (POL-02):** Loading state during add-product submission only. Reuse existing `SkeletonCard` via the optimistic-product slot already wired into `ProductGrid` (`useOptimistic` from Phase 4 Plan 04-07). NO new files. NO `app/loading.tsx`. NO chart-toggle pending state. If the optimistic-pending placeholder already renders correctly, Phase 7 work for POL-02 is verification only.
- **D-05 (POL-04):** Fix-as-found audit pass at 320 / 375 / 768 / desktop. Walk: hero → header Sign In → AuthModal → DashboardShell empty state → AddProductDialog → product card → Show Chart → RemoveProductDialog. File each visible break as a discrete Tailwind tweak. Document findings in `07-VERIFICATION.md` as "viewport / observed break / fix shipped" rows. NO Playwright. NO viewport-snapshot tests. NO opportunistic refactor of breakpoints.
- **D-06 (POL-05):** Verification only — title + description already set in `dealdrop/app/layout.tsx:19-22`. NO OpenGraph, NO Twitter card, NO `theme-color`, NO dynamic OG image route. Micro-edits to wording acceptable; new fields are out of scope.
- **D-07 (POL-06):** Generated `dealdrop/app/icon.tsx` using `ImageResponse` from `next/og`. Render a DealDrop mark (planner picks: stylized "D" letterform, downward-tag glyph, or a Lucide icon ported as SVG). Output 32×32. **Delete `dealdrop/app/favicon.ico`** in the same plan. No binary asset committed.

### Claude's Discretion

- **Production environment topology (DEP-02, DEP-03):** Recommend fresh Supabase production project (separate from `dealdrop-dev` Tokyo from Phase 1). Re-apply migrations 0001..0005 cleanly. Vercel env scopes: `production` gets prod-project keys + prod `RESEND_API_KEY` + prod `CRON_SECRET`; `preview` may reuse dev keys. Acceptable alternative if time-pressed: reuse dev project as "prod" — flag as documented compromise in `07-VERIFICATION.md`.
- **pg_cron prod cutover (CRON-10, DEP-05):** Recommend new migration `0006_cron_prod_url_cutover.sql` that (a) `cron.unschedule('dealdrop-daily-price-check')` for the dev URL job (idempotent — `WHERE EXISTS` guard), and (b) re-`cron.schedule()` against the prod Vercel URL via the existing `public.trigger_price_check_cron()` SECURITY DEFINER wrapper. Only the URL constant inside the wrapper changes. Acceptable alternative: Supabase dashboard SQL Editor for one-shot prod cutover with the SQL captured in `07-VERIFICATION.md`. **The Vault `cron-secret-token` MUST be re-created in the prod Supabase project** before pg_cron will work (Vault state does not carry over).
- **OAuth redirect URI registration on prod (AUTH-08, DEP-04):** Add live Vercel production URL to (a) Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs as `https://<supabase-prod-ref>.supabase.co/auth/v1/callback` (NOTE: the Google entry is the Supabase callback, NOT the app's `/auth/callback` — see RESEARCH §"Production OAuth + Supabase URL configuration"), and (b) Supabase Auth → URL Configuration → Site URL + Redirect URLs (which DO accept `https://<prod-domain>/auth/callback` and the `*.vercel.app` wildcard).
- **DEP-06 deliverable shape:** Lightweight checklist embedded in `07-VERIFICATION.md`. Sign in (fresh Google account) → add a product → confirm seed `price_history` row → curl `POST /api/cron/check-prices` with prod CRON_SECRET → observe new `price_history` row + email arrival in NON-OWNER inbox → screenshot email + chart. The "Looks Done But Isn't" checklist (PITFALLS.md:336-348) is the inspection grid. NO separate printable smoke-test doc.
- **Error boundary copy & icon glyph:** Planner picks. No emojis (project convention).
- **Mobile audit "fix budget":** If audit surfaces > ~6 distinct breaks at 320px, that signals a structurally broken component → flag deviation to user. Default is "single Tailwind tweak per break."

### Deferred Ideas (OUT OF SCOPE)

- **POL-01 — already shipped in Phase 2 (D-13).** Do NOT re-implement Sonner. Phase 7 lists POL-01 in scope only as "verify still working." If a Phase 7 task description asks to "install Sonner" or "mount `<Toaster />`", that's a planning bug — flag immediately.
- OpenGraph + Twitter card metadata + dynamic OG image route — not in v1.
- `theme-color` meta tag.
- Static favicon asset (PNG/SVG in `public/`) — rejected in favor of `app/icon.tsx`.
- Lucide-icon-as-favicon — rejected so the favicon is custom-DealDrop, not third-party-icon.
- `app/loading.tsx` for the dashboard segment.
- Chart-toggle pending state.
- Playwright + viewport-snapshot regression tests for mobile.
- Tailwind responsive-primitive refactor / container queries.
- Per-feature React error boundaries inside ProductGrid / PriceChart.
- Collapsible "Show details" with `error.message`.
- Error code / stack trace display.
- Sticky header / profile menu / account settings page.
- Email-on-tracking-failure flow.
- Per-product alert thresholds (target price / % drop), digest emails, retry-on-email-failure, minimum-drop tolerance, cooldown for chronically-failing products.
- Cron-runs audit table / `last_scrape_reason` column / `scrape_failures` audit table / Postgres RPC for atomic INSERT+UPDATE.
- Cron `?force=1` override.
- Currency conversion / FX, browser extension, mobile native apps, payments, social features.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | Sonner toast provider mounted in root layout | Already shipped in Phase 2 (D-13). Verify only — `dealdrop/app/layout.tsx:41` mounts `<Toaster position="top-center" richColors />`. Plan should include a no-op "verify and mark complete" task, NOT an install task. |
| POL-02 | Loading states (Skeleton/similar) during add-product submission | `dealdrop/src/components/dashboard/ProductGrid.tsx:101-103` already wires `SkeletonCard` into `useOptimistic` slot. Verify behavior visually at the dialog → submit step. If working, this is verification-only. |
| POL-03 | Error boundary catches unexpected rendering errors and shows friendly fallback UI | Two new files: `dealdrop/app/error.tsx` and `dealdrop/app/global-error.tsx`. Both `'use client'`. Per Next.js 16.2 docs (verified locally) the prop is `unstable_retry`, not `reset`. Reuse Shadcn Card + Button. |
| POL-04 | Layout mobile-responsive from 320px upward | Manual audit at 320 / 375 / 768 / desktop. Each break = one Tailwind tweak. Document audit table in `07-VERIFICATION.md`. |
| POL-05 | Metadata (`title`, `description`) reflects DealDrop | Already correct at `dealdrop/app/layout.tsx:19-22`. Verify only. No new fields. |
| POL-06 | Favicon replaced with DealDrop asset | New `dealdrop/app/icon.tsx` using `ImageResponse` from `next/og`, default `size = { width: 32, height: 32 }`, `contentType = 'image/png'`. Delete `dealdrop/app/favicon.ico` in same commit. |
| DEP-01 | Project deployed to Vercel with production domain | Vercel CLI (`vercel link`, `vercel deploy --prod`) or Vercel dashboard import. Default `*.vercel.app` URL is fine for portfolio bar. |
| DEP-02 | All env vars configured in Vercel project settings (production + preview scopes) | 9 env vars total: 3 client (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus `NEXT_PUBLIC_*` if any other added) + 5 server (`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`). Use `vercel env add <NAME> production` and `vercel env add <NAME> preview`. |
| DEP-03 | Supabase production project referenced from Vercel | Recommended: fresh Supabase project distinct from `vhlbdcsxccaknccawfdj` (dealdrop-dev Tokyo). Re-apply migrations 0001..0005. Update `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel `production` scope to point at prod project. |
| DEP-04 | Google OAuth redirect URIs include production Vercel URL | TWO different registrations: (1) **Google Cloud Console** Authorized redirect URI = `https://<supabase-prod-ref>.supabase.co/auth/v1/callback` (the Supabase-hosted leg). (2) **Supabase Auth → URL Configuration → Redirect URLs** = `https://<prod-domain>/auth/callback` + `https://*.vercel.app/auth/callback` (Supabase supports wildcards; Google does not). |
| DEP-05 | pg_cron job active and pointing at production API endpoint | Migration `0006_cron_prod_url_cutover.sql` (recommended) replaces the URL constant in `public.trigger_price_check_cron()`. Idempotent unschedule + reschedule. **Vault secret must be re-created in prod project first.** |
| DEP-06 | End-to-end manual test | Lightweight checklist in `07-VERIFICATION.md`. cURL POST to prod cron endpoint. Email lands in NON-OWNER inbox. Screenshots committed inline. The "Looks Done But Isn't" checklist (PITFALLS.md:336-348) gates phase close. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** Next.js 16.2.4 + React 19.2.4 + TypeScript strict + Tailwind v4 + Supabase + Firecrawl + Resend + Recharts + Shadcn UI + Sonner + Vercel.
- **`dealdrop/AGENTS.md` directive:** "This is NOT the Next.js you know. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." — applies to `error.tsx`, `global-error.tsx`, `app/icon.tsx`.
- **GSD Workflow Enforcement:** No direct edits outside a GSD command unless user explicitly requests bypass.
- **Bar:** Portfolio/demo quality — works end-to-end, presentable, not production-hardened.
- **No emojis in source files** (established across all prior phases).
- **`import 'server-only'` line 1** for any module reading server env. Does NOT apply to error boundaries (client components) or `app/icon.tsx` (Next.js handles the runtime).
- **Functional components, `Readonly<>` props, kebab-case CSS vars, camelCase variables, PascalCase components, `cn()` from `@/lib/utils` for class composition, `@/*` path alias.**
- **Migration-per-concern, never reopen a prior migration.** Phase 7's prod-URL cutover would be `0006_cron_prod_url_cutover.sql`.

## Domain Overview

"Polish & deployment" for DealDrop is a small, exact list: ship the two file-system error-boundary files Next.js needs to replace the dev-mode error overlay with a friendly Shadcn fallback, replace the scaffold favicon with a code-generated icon, walk the app at four viewports and tweak Tailwind classes where things obviously break, and run the existing app on Vercel with production env vars + a prod Supabase project + the pg_cron job pointing at the prod URL. The verification ceremony — sign in with a fresh Google account, add a product, manually fire `/api/cron/check-prices` with the prod CRON_SECRET, watch a real email land in a NON-OWNER inbox, screenshot the chart — is the proof the core-value loop works on the live URL. None of this is feature work. Every "polish" item is a verification-or-tweak; every "deployment" item is a configuration step. The risk concentration is at the Supabase-prod-cutover boundary (Vault secret re-creation, OAuth redirect URI re-registration, pg_cron URL update) where silent failures are easy and auditing them after the fact is hard.

## Key References

### Local Next.js 16 docs (authoritative — read these before writing)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` — error.tsx + global-error.tsx contract for Next 16. **Critical:** prop name in 16.2 is `unstable_retry`, not `reset`. CONTEXT.md still says `reset()` — the implementer must follow the docs.
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` — `app/icon.tsx` convention, `size`/`contentType` exports, default export returns `Blob | ArrayBuffer | TypedArray | DataView | ReadableStream | Response`. `ImageResponse` satisfies this.
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` — `ImageResponse` from `next/og`. Flexbox-only, NO grid. 500KB bundle limit. ttf/otf/woff fonts only.
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` — `export const maxDuration = 5` (numeric seconds).
- `dealdrop/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md` — `metadata` object pattern. POL-05 is verified by reading `dealdrop/app/layout.tsx:19-22`.

### Vercel docs (external — verified via web search 2026-04)
- Vercel Functions Limits — https://vercel.com/docs/functions/limitations
- Vercel Configuring Function Duration — https://vercel.com/docs/functions/configuring-functions/duration
- Vercel CLI `vercel env` — https://vercel.com/docs/cli/env
- Vercel CLI `vercel deploy` — https://vercel.com/docs/cli/deploy
- Vercel Environments — https://vercel.com/docs/deployments/environments

### Supabase docs (external — verified via web search 2026-04)
- Supabase Auth Redirect URLs — https://supabase.com/docs/guides/auth/redirect-urls (wildcards supported for Vercel preview URLs)
- Supabase Login with Google — https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Vault — https://supabase.com/docs/guides/database/vault (already cited in `0005_cron_daily_price_check.sql`)
- Supabase pg_cron quickstart — https://supabase.com/docs/guides/cron/quickstart

### Project canonicals
- `.planning/REQUIREMENTS.md` — POL-01..06 + DEP-01..06 acceptance.
- `.planning/research/PITFALLS.md` lines 336–348 — "Looks Done But Isn't" inspection grid for DEP-06.
- `.planning/research/PITFALLS.md` lines 351–362 — Recovery Strategies (line 362 covers Tailwind-classes-not-applying-in-production verification).
- `.planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md` — canonical disambiguation of the two callback URIs (Google gets Supabase's `/auth/v1/callback`; Supabase gets the app's `/auth/callback`). Phase 7 extends this with the prod URL.
- `.planning/phases/06-automated-monitoring-email-alerts/06-VERIFICATION.md` — Phase 6 cron verification format (mirror this shape in `07-VERIFICATION.md`).
- `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` — the existing wrapper function whose URL Phase 7 will update (line 117: `url := 'https://dealdrop.vercel.app/api/cron/check-prices'`).

## Implementation Patterns

### Pattern 1: Next.js 16 error boundary contract — the `reset` → `unstable_retry` change

**The CONTEXT.md says `reset()`. The Next.js 16.2 docs say `unstable_retry()`. Follow the docs.**

Source: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` (Version History row: `v16.2.0` — `unstable_retry` prop added).

The shipped Next package is `next@16.2.4` (per `dealdrop/package.json`). The current docs show:

```tsx
// dealdrop/app/error.tsx — page-level boundary
'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // No external logger in v1; structured console.error is sufficient at portfolio bar.
    // Do NOT log error.message in production builds — Next 16 already strips it for
    // server-component errors, but log the digest so it can be cross-referenced.
    console.error('app/error.tsx caught:', { digest: error.digest })
  }, [error])

  return (
    <main className="flex flex-col min-h-full items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col gap-4 py-8 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {/* Planner picks copy. Keep it portfolio-clean and not developer-shaped. */}
            We hit a snag rendering this page. Try again, or head back home.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
```

```tsx
// dealdrop/app/global-error.tsx — root boundary (replaces <html><body>)
'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

// IMPORTANT: global-error MUST define its own <html> and <body> tags because
// it replaces the root layout when active. Next.js 16 docs are explicit on this.
// metadata + generateMetadata exports are NOT supported here. Use React's
// <title> component if you need a title (we don't — the fallback is generic).
//
// We DO NOT import `@/components/ui/card` or `@/components/ui/button` here
// because Tailwind utility classes still work inside <body>, and importing
// Shadcn primitives that themselves rely on the layout's CSS variables can
// fail if the layout is the thing that crashed. Inline minimal styles.

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('app/global-error.tsx caught:', { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0a0a0a', color: '#fafafa' }}>
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', border: '1px solid #262626', borderRadius: '0.75rem', padding: '2rem', background: '#171717' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}>Something went wrong</h2>
          <p style={{ fontSize: '0.875rem', color: '#a3a3a3', margin: '0 0 1.25rem 0' }}>
            DealDrop ran into an unexpected problem. Try again, or refresh the page.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '0', background: '#fafafa', color: '#0a0a0a', fontWeight: 500, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
```

**Tagging:** [VERIFIED: dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md] for the `unstable_retry` prop name, the `'use client'` requirement, and the html/body requirement of `global-error.tsx`.

#### What each boundary catches (and does NOT catch)

| Catches | `app/error.tsx` (page-level) | `app/global-error.tsx` (root) |
|---------|-------------------------------|-------------------------------|
| Errors thrown in `app/page.tsx` rendering | YES | YES (only if page-level boundary itself throws) |
| Errors thrown in nested layouts under `/` | YES (if no closer error.tsx) | YES (if all closer boundaries throw) |
| Errors thrown in `app/layout.tsx` | NO — layout is "above" `error.tsx` | YES — this is the only boundary that catches root-layout crashes |
| Errors thrown in Server Components (async render) | YES — Next.js serializes to digest, sends to client | YES |
| Errors thrown in Client Components (event handlers, effects) | YES (rendering errors); event-handler errors are NOT caught by React error boundaries — those need `try/catch` in the handler | Same |
| Errors thrown during hydration | YES | YES |
| Errors thrown inside `error.tsx` itself | NO — bubbles up | YES — global-error is the safety net |
| Errors in Route Handlers (`route.ts`) | NO — Route Handlers return Responses; throw inside one becomes a 500 | NO |
| 404s | NO — use `not-found.tsx` | NO |

**Pitfall — the error inside the error trap:** If `app/error.tsx` itself throws (e.g., the planner imports a CSS module that's broken, or references a Shadcn component whose underlying CSS variables aren't loaded because the layout itself is the thing that crashed), `global-error.tsx` is the only thing standing between the user and a white screen. This is exactly why `global-error.tsx` uses inline styles instead of Tailwind/Shadcn imports — defensive coding.

**Testing locally without breaking production:** Add a temporary throw in a leaf component in dev:

```tsx
// In ProductGrid.tsx — TEMPORARY for testing, REMOVE before commit
if (process.env.NEXT_PUBLIC_DEBUG_BOUNDARY === '1') {
  throw new Error('test boundary')
}
```

Or use the React DevTools "trigger error" button in development (per the Next.js docs note). Plan should include "verify boundary fires by temporarily injecting a throw, then revert" as a verification step in `07-VERIFICATION.md`.

### Pattern 2: `app/icon.tsx` with `ImageResponse` (POL-06)

Source: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` + `image-response.md`.

```tsx
// dealdrop/app/icon.tsx
import { ImageResponse } from 'next/og'

// Image metadata — exported constants Next.js reads to build the <link rel="icon"> tag.
// 32×32 is the documented default and the standard browser-tab favicon size.
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Default export returns Response | Blob | ArrayBuffer | TypedArray | DataView | ReadableStream.
// ImageResponse satisfies this and is the documented "easiest way to generate an icon".
//
// Constraints (from image-response.md):
//   - Flexbox + a subset of CSS only. NO `display: grid`. NO `gap` on grid containers.
//   - 500KB bundle ceiling for the JSX + CSS + fonts + assets used inside ImageResponse.
//   - Custom fonts must be ttf, otf, or woff. Default fonts come from Vercel OG.
//   - Powered by Satori under the hood (https://github.com/vercel/satori#css).
//
// Glyph: a stylized "D" letterform on the brand color works at 32×32. Avoid thin
// strokes (sub-pixel rendering at 32px makes them disappear). Avoid emoji unless
// you set the `emoji` option (twemoji is the default and OK).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          background: '#18181b', // zinc-900 (matches Shadcn new-york/zinc theme tokens)
          color: '#fafafa',      // zinc-50
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
        }}
      >
        D
      </div>
    ),
    {
      ...size,
    }
  )
}
```

**Tagging:** [VERIFIED: dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md] for the file convention, default size, default export shape, and the `size` + `contentType` exports.

**Why deleting `app/favicon.ico` is mandatory:** Per the docs, `favicon.ico` is itself a recognized convention at the top of `app/`, and it CAN coexist with `icon.*`. However, browsers cache `favicon.ico` aggressively, and the static `.ico` will sometimes win the race for the tab icon depending on browser + cache state — especially in incognito vs persistent tabs. The cleanest portfolio-bar behavior is one icon source. Same plan, same commit: create `app/icon.tsx` and `git rm dealdrop/app/favicon.ico`.

**Verification after deploy:** In an incognito tab, hit the prod URL and inspect the rendered `<head>`:
```html
<!-- Expected -->
<link rel="icon" href="/icon?<hash>" type="image/png" sizes="32x32" />
<!-- NOT expected -->
<link rel="icon" href="/favicon.ico" sizes="any" />
```

### Pattern 3: Vercel deployment — env vars, function timeout, project link

#### Env var scoping

Vercel has three deploy environments: `production`, `preview`, `development`. Each env var can be scoped to any combination. The CLI command shape is `vercel env add <NAME> <ENV>`:

```bash
# From dealdrop/ project root after `vercel link`:

# Production scope — points at the FRESH prod Supabase project (recommended per CONTEXT D-disc)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add FIRECRAWL_API_KEY production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add CRON_SECRET production

# Preview scope — may reuse dev keys per CONTEXT.md (so preview deploys don't pollute prod data)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# ...etc

# Verify after adding:
vercel env ls
```

**Sensitive flag:** As of 2026, Vercel supports `--sensitive` for high-risk values (write-once, non-readable in dashboard). Use for `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `FIRECRAWL_API_KEY`:

```bash
vercel env add CRON_SECRET production --sensitive
```

[CITED: https://vercel.com/docs/cli/env]

**Note for `NEXT_PUBLIC_*` vars:** These are baked into the client bundle at build time. If you add `NEXT_PUBLIC_SUPABASE_URL` to Vercel AFTER an existing deploy, you must re-deploy for the change to take effect. This is the bedrock cause of "env var works locally, broken in prod" — see PITFALLS.md line 345.

#### Function timeout — the Hobby-plan trap

`dealdrop/app/api/cron/check-prices/route.ts:28` exports `maxDuration = 300`. **Hobby plan caps Serverless Functions at 60s WITHOUT Fluid Compute, and 300s WITH Fluid Compute** (current as of 2026-04). [CITED: https://vercel.com/docs/functions/limitations] [CITED: https://vercel.com/docs/functions/configuring-functions/duration]

**Action item for the planner:** Verify in the Vercel project settings that **Fluid Compute is enabled** before relying on `maxDuration = 300`. Otherwise the cron will silently 504 when scraping more than ~10-15 products.

How to verify in Vercel dashboard: Project → Settings → Functions → Fluid Compute toggle. As of 2026 this is enabled by default for new projects but may need a manual flip on older projects.

If Fluid Compute is unavailable for any reason, the workaround is reducing the `maxDuration` in `route.ts` to 60 (and accepting a smaller product cap), or splitting the cron into chunks. v1 portfolio bar with < 15 test products is fine on Fluid Compute at 300s.

#### Project link + first deploy

```bash
# From dealdrop/ project root:
npx vercel@latest link              # Interactive — pick or create the project
npx vercel@latest env pull           # Fetches the prod env into .env.local for local dev parity
npx vercel@latest deploy --prod      # Builds + deploys to production
```

The first `vercel deploy --prod` returns the assigned `*.vercel.app` URL. Capture this for:
1. AUTH-08 redirect URI registration (Supabase Auth → URL Configuration → Site URL + Redirect URLs).
2. The pg_cron URL constant in migration `0006_cron_prod_url_cutover.sql`.

[CITED: https://vercel.com/docs/cli/deploy] [CITED: https://vercel.com/docs/cli/pull]

### Pattern 4: Production OAuth + Supabase URL configuration

There are TWO distinct callback URIs and they go in DIFFERENT places. This is the #1 confusion in the AUTH-08 ops checklist (`AUTH-08-OPS-CHECKLIST.md` lines 11-21).

| Callback URI | Hosted by | Goes in |
|--------------|-----------|---------|
| `https://<supabase-project-ref>.supabase.co/auth/v1/callback` | Supabase | Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs |
| `https://<your-prod-domain>/auth/callback` | Your Next.js app (Route Handler at `dealdrop/app/auth/callback/route.ts`) | Supabase Dashboard → Authentication → URL Configuration → Redirect URLs |

The OAuth round-trip: `browser → Google sign-in → Supabase's /auth/v1/callback → DealDrop's /auth/callback → /`.

#### Phase 7 prod-URL additions

**Google Cloud Console (out-of-repo, `autonomous: false` for Claude):**

If you create a fresh Supabase prod project (recommended), the project ref changes (e.g., `vhlbdcsxccaknccawfdj` for dev → `<new-ref>` for prod). The Google OAuth Authorized redirect URIs list must include BOTH:
```
https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback   <-- existing dev
https://<new-prod-ref>.supabase.co/auth/v1/callback         <-- NEW prod entry
```

[CITED: https://supabase.com/docs/guides/auth/social-login/auth-google] — "Under Authorized redirect URIs, you should add: `https://<your-domain>/auth/v1/callback`".

**Important constraint:** Google does NOT support wildcard redirect URIs. Each Supabase project's `auth/v1/callback` must be listed verbatim.

**Supabase Auth → URL Configuration (out-of-repo, `autonomous: false`):**

In the FRESH prod Supabase project's dashboard:
1. **Site URL:** Set to the prod Vercel URL — e.g., `https://dealdrop.vercel.app` (or whatever the assigned default was). This is what `redirectTo` defaults to when a Server Action calls `supabase.auth.signInWithOAuth({...})` without an explicit `redirectTo`.
2. **Redirect URLs (allow list):** Add at minimum:
   ```
   https://dealdrop.vercel.app/auth/callback
   https://*.vercel.app/auth/callback
   ```
   Supabase Auth DOES support `*` and `**` wildcards (unlike Google). Single `*` matches a single path segment, `**` matches across segments. [CITED: https://supabase.com/docs/guides/auth/redirect-urls]

#### Common failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Google returns `redirect_uri_mismatch` | Supabase prod project's `auth/v1/callback` not in Google Cloud Console authorized list | Add `https://<prod-ref>.supabase.co/auth/v1/callback` to the Google OAuth client |
| User completes Google sign-in but lands on `/?auth_error=1` with no session | Prod Vercel URL's `/auth/callback` not in Supabase Redirect URLs allow list | Add `https://<prod-domain>/auth/callback` to Supabase Auth → URL Configuration → Redirect URLs |
| Magic-link / OAuth redirects to localhost in prod | Site URL not set in prod Supabase project | Set Site URL to `https://<prod-domain>` |
| OAuth works on prod but breaks on Vercel preview deploys | Wildcard `https://*.vercel.app/auth/callback` not in Supabase Redirect URLs | Add the wildcard to Supabase (Google does not need preview URLs because the callback there is always Supabase's, not the app's) |
| OAuth still broken after fix | Browser cache / Supabase session cookie from old project still set | Sign out in dev, clear cookies, retry in incognito |

### Pattern 5: pg_cron prod cutover SQL

The existing wrapper function lives in `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql:90-131`. The URL constant on line 117 is hardcoded:

```sql
url := 'https://dealdrop.vercel.app/api/cron/check-prices',
```

**Recommended: ship a new migration `0006_cron_prod_url_cutover.sql`** that (a) replaces the wrapper with the prod URL and (b) reschedules the cron job idempotently. This keeps cron config in git, which is the precedent set by Plan 06-03. (Alternative: one-shot SQL Editor; capture the exact SQL in `07-VERIFICATION.md`.)

```sql
-- File: dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql
-- DEP-05: Cut the dealdrop-daily-price-check pg_cron job over to the production
-- Vercel URL. Idempotent — safe to re-run on a fresh prod project that never
-- had the dev schedule. Re-creates the SECURITY DEFINER wrapper with the prod
-- URL constant and re-registers the cron schedule.
--
-- Prerequisite (out-of-repo): the Vault secret `dealdrop_cron_secret` must
-- already exist in this Supabase project. If applying to a fresh prod
-- project, run this in the SQL Editor FIRST:
--
--   SELECT vault.create_secret(
--     '<paste prod CRON_SECRET (>=32 chars)>',
--     'dealdrop_cron_secret',
--     'Bearer token for DealDrop /api/cron/check-prices (prod)'
--   );
--
-- Verification post-apply:
--   SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret';   -- 1 row
--   SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check';
--   -- schedule: '0 9 * * *', command: 'select public.trigger_price_check_cron()'
--
-- The wrapper body is identical to migration 0005 EXCEPT for the URL string.
-- We replace the function in-place with create-or-replace; no schema change.

create or replace function public.trigger_price_check_cron()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $func$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'dealdrop_cron_secret';

  if v_secret is null then
    raise exception 'dealdrop_cron_secret not set in vault — create it via vault.create_secret() in the prod project before applying 0006';
  end if;

  -- PROD URL — update this line if the assigned Vercel URL differs.
  -- The exact URL is captured in 07-VERIFICATION.md after the first deploy.
  select net.http_post(
    url := 'https://<PROD-URL>.vercel.app/api/cron/check-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 290000
  ) into v_request_id;

  raise notice 'trigger_price_check_cron: request_id = %', v_request_id;

  return v_request_id;
end
$func$;

revoke execute on function public.trigger_price_check_cron() from public;
revoke execute on function public.trigger_price_check_cron() from anon;
revoke execute on function public.trigger_price_check_cron() from authenticated;
grant  execute on function public.trigger_price_check_cron() to service_role;

-- Idempotent reschedule: unschedule first IF the job exists, then re-schedule.
-- WHERE EXISTS guard means re-running on a brand-new prod project that never
-- had the dev URL job is a no-op for the unschedule call.
do $$
begin
  perform cron.unschedule('dealdrop-daily-price-check')
  where exists (select 1 from cron.job where jobname = 'dealdrop-daily-price-check');
end $$;

select cron.schedule(
  'dealdrop-daily-price-check',
  '0 9 * * *',                              -- 09:00 UTC daily; pg_cron has no TZ support
  $$select public.trigger_price_check_cron()$$
);
```

**Time-zone note:** pg_cron schedules are always interpreted as UTC. `0 9 * * *` = 09:00 UTC, regardless of the Supabase project region or operator locale. If "9 AM PT" is the product spec, change the cron to `0 17 * * *` (PST) or `0 16 * * *` (PDT). v1 spec is "daily 9 AM UTC" per CONTEXT-tier locked decisions; no timezone math needed.

**Vault secret re-creation in prod (the easy-to-forget step):**

The Vault secret state from the dev Supabase project does NOT carry over when you create a fresh prod project. Migrations 0001..0005 do NOT create the secret either (the `vault.create_secret` block in 0005 is commented out by design). Before applying 0006, in the Supabase SQL Editor for the prod project:

```sql
SELECT vault.create_secret(
  '<paste a fresh 48-char random CRON_SECRET>',
  'dealdrop_cron_secret',
  'Bearer token for DealDrop /api/cron/check-prices (prod)'
);
```

The exact same value MUST be set as `CRON_SECRET` in Vercel `production` env scope.

**Verifying the cron job is active and points at prod:**

```sql
-- In Supabase SQL Editor for the prod project:
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'dealdrop-daily-price-check';
-- Expected:
--   jobname: dealdrop-daily-price-check
--   schedule: 0 9 * * *
--   command: select public.trigger_price_check_cron()

-- And confirm the wrapper points at prod:
SELECT pg_get_functiondef('public.trigger_price_check_cron()'::regprocedure);
-- The output should contain the prod URL on the net.http_post line.

-- Confirm the secret exists:
SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret';
-- Expected: 1 row.

-- Watch the most recent run (after waiting a day, or after a manual cron POST):
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'dealdrop-daily-price-check')
ORDER BY start_time DESC LIMIT 5;
```

[CITED: https://supabase.com/docs/guides/cron/quickstart] [VERIFIED: dealdrop/supabase/migrations/0005_cron_daily_price_check.sql lines 153-161 for the pattern]

### Pattern 6: Mobile audit at 320 / 375 / 768 (POL-04)

**DevTools workflow (Chrome / Firefox / Safari Responsive Design Mode):**

1. Open the prod URL.
2. Open DevTools → toggle Device Toolbar (Ctrl/Cmd+Shift+M in Chrome).
3. Pick or set custom widths:
   - 320×568 (iPhone SE / smallest target — REQUIREMENTS.md HERO-05 says "from mobile (320px)")
   - 375×812 (iPhone 12)
   - 768×1024 (iPad portrait)
   - Desktop: don't constrain — Tailwind `lg:` is 1024px+
4. Walk: hero → Sign In → AuthModal → DashboardShell empty → AddProductDialog → product card → Show Chart toggle → RemoveProductDialog confirm.
5. For each visible break, screenshot it (browser native screenshot or DevTools "Capture full size screenshot") and note: viewport, component, what broke, what Tailwind class fixes it.

**Common Tailwind v4 break-on-narrow-viewport patterns to watch for:**

| Break | Cause | Fix |
|-------|-------|-----|
| Header overflows on 320px | `flex` items don't wrap, fixed `gap-*`, fixed-width logo | `flex-wrap`, `gap-2 sm:gap-4`, `truncate` on long text |
| Product card image squashed | `aspect-[4/3]` + `min-w-` on parent flex item | Replace `min-w-` with `min-w-0` on flex children — flexbox default `min-width: auto` is the bug |
| AddProductDialog content cut off | Dialog has fixed `max-w-` greater than viewport | `max-w-[90vw] sm:max-w-md` |
| Grid columns too narrow | `grid-cols-2` at 320px (160px columns minus padding = unreadable) | Already correct in `ProductGrid.tsx:98` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); verify it actually collapses |
| Buttons stacked badly in card footer | `flex` row that overflows | `flex-wrap` + `gap-2` |
| Touch targets < 44px | `text-xs` button without explicit height | `h-9` (Shadcn Button default size — 36px is borderline; 44px is iOS HIG; portfolio bar tolerates 36px) |
| Text too small on mobile | `text-sm` body, `text-xs` labels | `text-base sm:text-sm` (scale UP on mobile, DOWN on desktop) |
| Horizontal scrollbar appears | Single child with overflow (long URL, long product name) | `truncate` + `min-w-0` on flex parent + `break-words` on text |
| Modal/Dialog blocks the page | Dialog uses `fixed` positioning that doesn't collapse on small viewports | Shadcn Dialog handles this — verify by inspecting; if broken, file as a Shadcn version mismatch |

**Tailwind v4 specifics that may bite:**

- `@import "tailwindcss"` is the v4 entry point; verify it's still in `dealdrop/app/globals.css` (PITFALLS.md:362). If it accidentally got removed during a refactor, classes will silently stop applying after deploy.
- `@theme` blocks (v4 idiom) — DealDrop uses Shadcn's CSS variable approach, not `@theme`. Don't introduce `@theme` during the audit; stick to utility-class tweaks.
- Container queries (`@container`) — not used in DealDrop. POL-04 is fix-as-found, not opportunistic refactor (D-05). Don't introduce container queries.

**Documentation pattern in `07-VERIFICATION.md`:**

```markdown
## POL-04 Mobile Audit Findings

| Viewport | Component | Observed break | Fix shipped |
|----------|-----------|---------------|-------------|
| 320px | Header | "Sign In" button text overflows logo | `flex-wrap` on header `<div>`, `truncate` on logo span |
| 320px | AddProductDialog | Dialog content padding too tight | `p-4 sm:p-6` instead of `p-6` |
| 375px | ProductCard footer | "Show Chart" button wraps to 2 lines | `text-xs sm:text-sm` |
| (no breaks at 768px / desktop) | — | — | — |

Audit pass count: 2 (final pass found zero new breaks at 320px).
```

### Pattern 7: DEP-06 manual end-to-end test mechanics

**The cURL invocation:**

```bash
# Replace <prod-domain> and <prod-cron-secret> with the real values.
# CRON_SECRET is the same value that was inserted into Vault and into Vercel
# production env. It must be ≥32 chars (env.server.ts schema) — the project
# convention from Phase 1 was 48 chars.
curl -i -X POST "https://<prod-domain>/api/cron/check-prices" \
  -H "Authorization: Bearer <prod-cron-secret>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response (from `route.ts` POST handler returning runPriceCheck summary):
# HTTP/2 200
# {"status":"ok","scraped":N,"updated":M,"dropped":K,"failed":[]}
```

**Health check (no auth, no scraping):**
```bash
curl -i "https://<prod-domain>/api/cron/check-prices"
# Expected: 200 + { "status": "ok" }
```

**Verifying 401 on bad bearer:**
```bash
curl -i -X POST "https://<prod-domain>/api/cron/check-prices" \
  -H "Authorization: Bearer wrong" \
  -H "Content-Type: application/json"
# Expected: 401 + { "error": "Unauthorized" }
```

**The non-owner-inbox requirement (PITFALLS.md:342):**

Resend has a known and documented behavior where emails sent FROM a verified domain TO the email address of the Resend account owner will succeed via the Resend dashboard but may not actually leave Resend's outbound queue if domain DNS is misconfigured. The way you catch a misconfigured domain is by sending TO an email address that is NOT the Resend account owner's email.

Setup: have TWO Gmail addresses. One is the Resend account email (and may also be the email you used to develop locally). The OTHER is a fresh Gmail used as the test sign-in for DEP-06.

DEP-06 procedure:
1. Sign in to prod DealDrop with the NON-RESEND-OWNER Gmail account.
2. Add a product (any e-commerce URL — `books.toscrape.com` is the project's known-good test target per Phase 3 STATE.md).
3. Confirm in Supabase SQL Editor:
   ```sql
   SELECT id, user_id, name, current_price, currency FROM products ORDER BY created_at DESC LIMIT 1;
   SELECT product_id, price, checked_at FROM price_history ORDER BY checked_at DESC LIMIT 1;
   ```
   Expected: 1 product row + 1 price_history row (the seed from TRACK-06).
4. **Manipulate the price to force a drop on the next cron run.** Two approaches:
   - **Cleanest:** in SQL Editor, double the stored `current_price`:
     ```sql
     UPDATE products SET current_price = current_price * 2 WHERE id = '<the-id>';
     ```
     The next cron POST will scrape the real (lower) price, see `scraped < stored`, write a new `price_history` row, update `products.current_price`, and fire `sendPriceDropAlert`. This is the same approach used in Phase 6 Plan 06-05 operator UAT (per `06-VERIFICATION.md`).
   - **Alternative (more realistic but slower):** wait for a real price change on the tracked product. Not practical for a verification step.
5. Trigger the cron POST manually with cURL (above command).
6. Read the JSON response — confirm `dropped: 1`.
7. Open the NON-OWNER Gmail inbox. Find the price-drop email. Confirm:
   - Subject contains the product name (or matches `lib/resend.ts` template subject).
   - Body has the product image, name, percentage hero, strikethrough old price, prominent new price, "View Product" CTA.
   - "View Product" link is the original e-commerce URL with `target="_blank"` semantics.
8. Open the prod DealDrop dashboard. Click "Show Chart" on the product. Confirm the chart now has TWO data points (the seed + the new one).
9. Screenshot:
   - The email (full window or just the email body)
   - The chart with two points
   - Save to `.planning/phases/07-polish-deployment/screenshots/` (planner creates this dir) and reference inline in `07-VERIFICATION.md` with relative paths:
     ```markdown
     ![Price drop email in non-owner Gmail](screenshots/dep-06-email.png)
     ![Dashboard chart with second data point](screenshots/dep-06-chart.png)
     ```
10. Re-fire the cron POST a SECOND time with no further price changes. Confirm `{ scraped: N, updated: 0, dropped: 0 }` (Phase 6 D-02 idempotency — same-day re-run produces no duplicate `price_history` rows because the price-change gate rejects).

**Why screenshots are committed:** the user explicitly asked for "screenshots stored in 07-VERIFICATION.md (or referenced inline as relative paths if committing image assets)" (CONTEXT.md Claude's Discretion). For portfolio bar this is the proof artifact a reviewer would inspect. PNGs at typical phone-screenshot resolution add maybe 200-500KB each — acceptable.

## Validation Architecture

> nyquist_validation is enabled in `.planning/config.json`. This section seeds `07-VALIDATION.md`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (already installed; `dealdrop/package.json` line 41) |
| Config file | `dealdrop/vitest.config.ts` (Phase 3 Plan 03-01) |
| Quick run command | `cd dealdrop && npx vitest run --reporter=basic` |
| Full suite command | `cd dealdrop && npm run test && npm run lint && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POL-01 | `<Toaster />` mounted in root layout | static | `cd dealdrop && grep -q '<Toaster' app/layout.tsx` | yes — `dealdrop/app/layout.tsx:41` (verification only, no test file needed) |
| POL-02 | SkeletonCard renders in pending slot during add-product submission | manual UAT | DevTools — open AddProductDialog, paste URL, click Track, observe SkeletonCard appears for ~5-10s | n/a — manual; no new test file |
| POL-03 | `app/error.tsx` exports a default function with `'use client'` directive and accepts `unstable_retry` prop | unit (Vitest) | `cd dealdrop && npx vitest run app/error.test.tsx` | NO — Wave 0 gap (see below) |
| POL-03 | `app/global-error.tsx` exports a default function with `'use client'` directive, renders `<html><body>`, accepts `unstable_retry` prop | unit (Vitest) | `cd dealdrop && npx vitest run app/global-error.test.tsx` | NO — Wave 0 gap |
| POL-03 | Error boundary fires on a forced throw | manual UAT | Inject temporary `throw new Error('test')` in a leaf, observe Card fallback, click Try again, remove throw | n/a — manual; documented in `07-VERIFICATION.md` |
| POL-04 | Layout intact at 320 / 375 / 768 / desktop | manual UAT | DevTools walk-through documented in `07-VERIFICATION.md` audit table | n/a — manual |
| POL-05 | Title + description match REQUIREMENTS | static | `cd dealdrop && grep -q 'DealDrop — Universal Price Tracker' app/layout.tsx && grep -q 'Track products from any e-commerce site' app/layout.tsx` | yes — `dealdrop/app/layout.tsx:19-22` |
| POL-06 | `app/icon.tsx` exists and exports `size`, `contentType`, default function | static | `cd dealdrop && test -f app/icon.tsx && grep -q 'ImageResponse' app/icon.tsx && grep -q 'export const size' app/icon.tsx && grep -q 'export const contentType' app/icon.tsx && grep -q 'export default' app/icon.tsx && ! test -f app/favicon.ico` | NO — Wave 0 gap (file does not exist yet) |
| POL-06 | Built-app `<head>` includes `<link rel="icon" href="/icon?...">` not `favicon.ico` | manual UAT | `curl -s https://<prod-domain>/ \| grep -E 'rel="icon"'` after deploy | n/a — manual; documented in `07-VERIFICATION.md` |
| DEP-01 | Prod URL responds 200 to `/` | manual UAT | `curl -I https://<prod-domain>/` returns 200 | n/a — manual |
| DEP-02 | All 7 server + 2+ public env vars set in Vercel `production` scope | manual UAT | `vercel env ls` (or screenshot of Vercel dashboard) | n/a — manual; documented in `07-VERIFICATION.md` |
| DEP-03 | App is reading from prod Supabase project (not dev) | manual UAT | Sign in on prod, add product, verify row appears in PROD `products` table (not dev) | n/a — manual |
| DEP-04 | OAuth completes on prod URL with fresh Google account | manual UAT | Walk sign-in flow on prod with a Gmail account that has never signed in to DealDrop | n/a — manual |
| DEP-05 | `cron.job` row exists with prod URL inside the wrapper | static SQL | `SELECT command FROM cron.job WHERE jobname='dealdrop-daily-price-check'` + `pg_get_functiondef('public.trigger_price_check_cron'::regprocedure)` shows prod URL | n/a — captured in `07-VERIFICATION.md` from SQL Editor |
| DEP-06 | Manual cron POST → email arrives in NON-OWNER inbox + chart updates | manual UAT | Full procedure (Pattern 7 above) | n/a — manual; the inspection grid is PITFALLS.md:336-348 |

### Sampling Rate

- **Per task commit:** `cd dealdrop && npx vitest run --reporter=basic` (only meaningful for the new error-boundary test files; the rest of Phase 7 is verification-only)
- **Per wave merge:** `cd dealdrop && npm run test && npm run lint && npm run build`
- **Phase gate:** Full suite green + every line item in PITFALLS.md:336-348 ticked off in `07-VERIFICATION.md` + DEP-06 screenshots committed.

### Wave 0 Gaps

- [ ] `dealdrop/app/error.test.tsx` — covers POL-03 page-level boundary contract (default export shape, `'use client'`, prop name `unstable_retry`)
- [ ] `dealdrop/app/global-error.test.tsx` — covers POL-03 root boundary contract (default export shape, `'use client'`, must render `<html><body>`)

The error-boundary tests are static-shape assertions only — they verify the component is exported and accepts the right props. Behavioral testing (forced throw → fallback renders) is best done manually in the browser per Pattern 1 above; React Testing Library inside Vitest can render a boundary in isolation but cannot exercise the Next.js Server-Component-throws-and-the-error-is-serialized-with-a-digest path. The manual UAT in `07-VERIFICATION.md` covers that.

No new framework install needed — Vitest 3.2.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 are already configured (per `package.json`).

## Risks & Gotchas

### R-01: Prop name change in Next.js 16.2 — `reset` → `unstable_retry` [VERIFIED]

CONTEXT.md D-02 references `reset()`. Next.js 16.2 docs explicitly say `unstable_retry`. The actual installed version is 16.2.4. **The planner MUST use `unstable_retry` and call out this CONTEXT-vs-docs delta in the plan.** Mitigation: the plan should include a Read of `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` as a Wave 0 task BEFORE writing the boundary files, per the `dealdrop/AGENTS.md` directive ("This is NOT the Next.js you know — read the relevant guide before writing").

### R-02: Vercel Hobby plan + `maxDuration = 300` requires Fluid Compute [CITED]

`route.ts:28` exports `maxDuration = 300`. Without Fluid Compute, Hobby plan caps Serverless Functions at 60s. With > ~10-15 products and a 5-10s/scrape average, the cron will silently 504. Mitigation: plan must include a "verify Fluid Compute is enabled in Vercel project settings" step in `07-VERIFICATION.md`. If unavailable, lower `maxDuration` and document the product cap.

### R-03: The Vault secret in the prod Supabase project is easy to forget [VERIFIED]

Migrations 0001..0005 do NOT create the Vault secret (the `vault.create_secret` block in 0005 is COMMENTED OUT by design — see `0005_cron_daily_price_check.sql:54-63`). A fresh prod project has zero Vault entries. Migration 0006 will fail with `dealdrop_cron_secret not set in vault — run Step 1 of migration 0005 with a real token` (or the equivalent message in 0006). Mitigation: 0006 should not unschedule the cron until AFTER the secret exists; the plan should include "create Vault secret in prod via SQL Editor" as an explicit step BEFORE applying 0006. The prod CRON_SECRET value used in Vault MUST match the Vercel `production` env var.

### R-04: `app/icon.tsx` + leftover `app/favicon.ico` race [CITED]

Per Next.js 16 docs, both conventions are recognized. Browsers cache `/favicon.ico` aggressively. The static .ico can win the race depending on browser + cache state. Mitigation: same plan, same commit — create `app/icon.tsx` AND delete `app/favicon.ico`. Verification: post-deploy in incognito, `curl -s https://<prod>/ | grep -E '(icon|favicon)'` should show only the dynamic icon route.

### R-05: Two separate OAuth registrations with different rules [VERIFIED, CITED]

Google's authorized redirect URI list is the Supabase callback (`https://<ref>.supabase.co/auth/v1/callback`); Supabase's allow list is the app's `/auth/callback` URL. Wildcards work in Supabase's allow list, NOT in Google's. The fresh prod Supabase project has a different ref than the dev project — the Google OAuth client must be updated even though "OAuth on prod" feels like it should be a Vercel-side change. Mitigation: AUTH-08 ops checklist (`AUTH-08-OPS-CHECKLIST.md`) is the disambiguation reference; Phase 7 plan creates a derivative `AUTH-08-PROD-CHECKLIST.md` (or appends to the existing one) with the prod ref.

### R-06: `NEXT_PUBLIC_*` vars require a redeploy after env-var change [CITED]

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are baked into the client bundle at BUILD time. Adding/changing them in Vercel after a deploy doesn't take effect until the next build. The first prod deploy must happen AFTER these are set in the `production` scope. Mitigation: ordering in the plan — set Vercel env vars first, then `vercel deploy --prod`. Listed explicitly in PITFALLS.md:345.

### R-07: Tailwind classes silently stop applying in production [CITED]

PITFALLS.md:362. If `@import "tailwindcss"` is missing from `dealdrop/app/globals.css`, or a stray `tailwind.config.js` reintroduces the v3 purge model, classes will silently stop applying in the production build but work in dev. Mitigation: post-first-deploy, hit the prod URL and inspect a known utility class is rendering (e.g., the Hero's `text-4xl` resolves to a 36px font). If it doesn't, check for a non-Tailwind `tailwind.config.js`, verify `@import "tailwindcss"` in globals.css, rebuild.

### R-08: "Looks Done But Isn't" items not all surfaced [VERIFIED]

PITFALLS.md:336-348 has 10 line items. CONTEXT.md says every item must pass before phase close. Two of the 10 are easy to miss:
- **(line 344) non-USD currency RangeError** — add an `amazon.in` or `amazon.co.uk` URL during DEP-06; verify the card and email both render without a JS console error.
- **(line 346) `maxDuration` with 15+ products** — the DEP-06 single-product test can't surface this; if portfolio time allows, add 15 throwaway products and trigger cron.

Mitigation: plan should include each line item as an explicit verification row in `07-VERIFICATION.md`, not implicitly bundled into "DEP-06 done."

### R-09: Resend domain DNS not propagated when DEP-06 fires [STATE-CITED]

STATE.md flags: "Phase 6 depends on Resend domain DNS propagation (up to 48h) — begin domain setup at Phase 5 start, not Phase 6 start." If domain setup was begun on schedule, by Phase 7 the DNS is settled. If not, DEP-06 emails will land in spam or never arrive. Mitigation: BEFORE running DEP-06, send a one-off Resend test email via the Resend dashboard to the non-owner inbox; if it arrives in primary inbox (not spam), DNS is good.

### R-10: Out-of-repo work cannot be done by Claude [VERIFIED — `autonomous: false` in plan]

These steps require dashboard / console access and CANNOT be automated by an agent:
1. Vercel project creation (or `vercel link` interactive prompts on first run).
2. Vercel env var entry via dashboard (CLI works for entry but the user runs it).
3. Google Cloud Console — adding the prod Supabase ref's `auth/v1/callback`.
4. Supabase Dashboard — fresh project creation, Site URL + Redirect URLs entry.
5. Supabase SQL Editor — `vault.create_secret()` for the prod project.
6. Resend dashboard — verifying domain DNS for the prod project (if a separate Resend account/domain).

Mitigation: every plan that includes one of these must be tagged `autonomous: false` and accompanied by a clear human-readable instruction. Mirror the format in `AUTH-08-OPS-CHECKLIST.md`.

### R-11: Mobile audit creep beyond "fix-as-found"

POL-04 is bounded: walk the app, fix what breaks. The temptation is to refactor breakpoints into utility primitives or introduce container queries while we're in there. CONTEXT.md D-05 explicitly forbids opportunistic refactor. Mitigation: budget is "single Tailwind tweak per break"; > ~6 breaks at 320px is the threshold to flag a deviation to the user (CONTEXT.md). Plan acceptance criteria for POL-04 should include "no new abstractions or breakpoint primitives introduced."

### R-12: Migration 0001..0005 may not apply cleanly to a fresh prod project [VERIFIED]

The five committed migrations were authored against the dev project and applied incrementally (per STATE.md notes for Phase 1 Plan 01-04 / Phase 4 Plan 04-02 / Phase 6 Plan 06-05). On a fresh project, applying them in order via `supabase db push` exercises a path that has not been live-tested as a single sequence. Known sensitivities:
- **0003 enables `pg_cron` and `pg_net`** — both extensions are enabled by default on Supabase free-tier as of 2026-04, but if the prod project is on a different region / tier the extension enable order matters.
- **0005 references Vault** — Vault is available in all Supabase projects by default, but the SECURITY DEFINER wrapper grants `service_role` execute permission; verify `service_role` exists in the prod project (it does, by default).
- **No data migration is needed** — fresh project starts empty.

Mitigation: plan should include an explicit `cd dealdrop && npx supabase db push --linked` against the prod project as one of the early DEP-03 tasks, with the output captured in `07-VERIFICATION.md`. If any migration fails, do NOT patch in place — file a deviation, address, and re-run.

## Recommended Plan Decomposition

Eight plans, mostly Wave-1 (each independent of the others EXCEPT where ordering matters for DEP). Listed in suggested execution order. The planner is free to deviate, but this is the informed starting point.

### Plan 07-01 — POL-03 Error Boundaries (Wave 1; autonomous: true)

**Files:** `dealdrop/app/error.tsx`, `dealdrop/app/global-error.tsx`, `dealdrop/app/error.test.tsx`, `dealdrop/app/global-error.test.tsx`

**Why first:** No external dependencies; pure code; closes the largest single piece of polish in scope. Wave 0 is the static-shape Vitest tests; Wave 1 is the implementation. Tests verify `'use client'`, default export shape, and `unstable_retry` prop name to lock in the Next 16.2 contract.

Includes: read `node_modules/next/dist/docs/.../error.md` as task 0 (per AGENTS.md). Use `unstable_retry`, not `reset`. `error.tsx` uses Shadcn Card + Button; `global-error.tsx` uses inline styles for resilience.

### Plan 07-02 — POL-06 Dynamic Icon (Wave 1; autonomous: true)

**Files:** `dealdrop/app/icon.tsx` (new), `dealdrop/app/favicon.ico` (delete)

**Why next:** Self-contained two-line transaction. Read `node_modules/next/dist/docs/.../app-icons.md` and `image-response.md` as task 0. Verify Satori CSS constraints (flexbox-only) before glyph design. Static-shape grep test in plan acceptance criteria.

### Plan 07-03 — POL-01, POL-02, POL-05 Verification Sweep (Wave 1; autonomous: true)

**Files:** none (verification-only). Captures findings inline in `07-VERIFICATION.md` rows.

**Why standalone:** All three are "already shipped, confirm." Bundling them in one plan keeps verification artifacts coherent. If verification fails for any, that becomes a follow-up bugfix plan.

POL-01: grep `<Toaster` in `app/layout.tsx`. POL-02: manual UAT (open AddProductDialog, paste URL, observe SkeletonCard slot). POL-05: grep title + description.

### Plan 07-04 — POL-04 Mobile Audit Pass 1 (Wave 1; autonomous: false for the audit, autonomous: true for the Tailwind tweaks)

**Files:** `dealdrop/src/components/{hero,header,dashboard}/*.tsx` (empirical — set discovered during audit). Plus `07-VERIFICATION.md` audit table.

**Why fourth:** Best done after POL-03 ships so the error fallback is also mobile-checked. The audit step is human (Claude can't drive DevTools); Tailwind class tweaks are autonomous. Plan acceptance criteria: "second top-to-bottom walk produces zero new breaks at 320px."

If audit yields > 6 breaks at 320px, planner flags to user before tweaking (deviation per CONTEXT.md).

### Plan 07-05 — DEP-02, DEP-03 Vercel Project + Prod Supabase (Wave 2; autonomous: false — out-of-repo)

**Files:** none in repo. Captures: Vercel project assignment + URL, env var inventory in `07-VERIFICATION.md`.

**Why fifth:** Must precede DEP-04 / DEP-05 / DEP-06 (those need the prod URL). Includes:
1. Create fresh Supabase prod project (Tokyo or whichever region matches portfolio location).
2. `cd dealdrop && npx supabase link` to the new project (overwrites local link).
3. `npx supabase db push --linked` — apply migrations 0001..0005 to prod.
4. Generate prod CRON_SECRET (48-char random).
5. Create the Vault secret in prod project: `SELECT vault.create_secret('<token>', 'dealdrop_cron_secret', 'Bearer token (prod)');`.
6. `vercel link` to a new or existing Vercel project.
7. `vercel env add` for each of the 7 server-scope vars (production scope) + 2 public-scope vars (production scope). Use `--sensitive` for the four high-risk values.
8. (Optional) `vercel env add` for preview scope reusing dev keys.
9. `vercel deploy --prod` — capture the assigned `*.vercel.app` URL.
10. Document inventory in `07-VERIFICATION.md`.

### Plan 07-06 — DEP-04 Prod OAuth Registration (Wave 2; autonomous: false)

**Files:** none in repo. May append to `AUTH-08-OPS-CHECKLIST.md` or create `AUTH-08-PROD-CHECKLIST.md`.

**Why sixth:** Depends on Plan 07-05's prod Vercel URL + prod Supabase ref. Includes:
1. Google Cloud Console → OAuth client → add `https://<prod-supabase-ref>.supabase.co/auth/v1/callback` to Authorized redirect URIs.
2. Supabase Dashboard (prod project) → Authentication → Providers → enable Google + paste Client ID/Secret (same Google OAuth client; no need for a separate prod Google client at portfolio bar).
3. Supabase Dashboard → Authentication → URL Configuration → Site URL = `https://<prod-vercel-url>`.
4. Redirect URLs allow list: `https://<prod-vercel-url>/auth/callback` + `https://*.vercel.app/auth/callback`.
5. Quick smoke: in incognito, hit prod URL, click Sign In, confirm Google sign-in completes and lands on `/`.

### Plan 07-07 — DEP-05 pg_cron Prod Cutover (Wave 2; autonomous: true for the migration file, autonomous: false for the apply step)

**Files:** `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql`

**Why seventh:** Depends on Plan 07-05's prod URL (to bake into the wrapper) and Vault secret (already created in 07-05). Includes:
1. Author migration 0006 with the prod URL constant.
2. `npx supabase db push --linked` to apply against prod.
3. Verify in SQL Editor: `SELECT command FROM cron.job WHERE jobname='dealdrop-daily-price-check'` + `pg_get_functiondef('public.trigger_price_check_cron'::regprocedure)` shows prod URL.
4. Capture verification output in `07-VERIFICATION.md`.

### Plan 07-08 — DEP-01, DEP-06 End-to-End Verification (Wave 3; autonomous: false — manual UAT)

**Files:** `07-VERIFICATION.md`, `screenshots/dep-06-email.png`, `screenshots/dep-06-chart.png` (commit binary screenshots inline).

**Why last:** Synthesis plan. Walks the full PITFALLS.md:336-348 grid + the DEP-06 procedure (Pattern 7). Includes:
1. Sign in to prod with NON-OWNER Gmail.
2. Add a product (suggest `books.toscrape.com` per Phase 3 STATE).
3. Verify seed `price_history` row in prod Supabase SQL Editor.
4. Manipulate `current_price` to force a drop (UPDATE row; double the value).
5. cURL the prod cron POST endpoint with prod CRON_SECRET.
6. Read response — confirm `dropped: 1`.
7. Check non-owner Gmail — capture screenshot.
8. View chart on prod dashboard — capture screenshot.
9. Re-fire cron POST — confirm `dropped: 0` (idempotency).
10. Walk all 10 PITFALLS.md:336-348 line items; tick each in `07-VERIFICATION.md`.
11. Also test: non-USD URL adds without `RangeError`; verify maxDuration with 15 throwaway products if portfolio time allows.

**Scope reality check:** The eight plans split cleanly into three logical groups: (1) in-repo polish — Plans 01-04. (2) out-of-repo deployment infrastructure — Plans 05-07. (3) manual end-to-end proof — Plan 08. The user retains the option to merge 03 into 04 (single mobile + verification plan) or split 05 into "prod Supabase" + "Vercel deploy" if either feels chunky.

## Out of Scope (Reaffirmed)

Per CONTEXT.md `<deferred>` block — explicitly NOT in Phase 7:

- POL-01 Sonner install / `<Toaster />` mounting — DONE in Phase 2 (D-13). The plan must NOT include "install Sonner" or "mount Toaster" tasks.
- OpenGraph + Twitter card metadata + dynamic OG image route — POL-05 is title/description only.
- `theme-color` meta tag.
- Static favicon asset (PNG/SVG in `public/`) — POL-06 is the dynamic `app/icon.tsx` route only.
- Lucide-icon-as-favicon.
- `app/loading.tsx` for the dashboard segment.
- Chart-toggle pending state.
- Playwright + viewport-snapshot regression tests for mobile.
- Tailwind responsive-primitive refactor / container queries.
- Per-feature React error boundaries inside ProductGrid / PriceChart.
- Collapsible "Show details" with `error.message` — fallback is developer-jargon-free.
- Error code / stack trace display.
- Sticky header / profile menu / account settings page.
- Email-on-tracking-failure flow.
- Per-product alert thresholds, digest emails, retry-on-email-failure, minimum-drop tolerance, cooldown for chronically-failing products.
- Cron-runs audit table / `last_scrape_reason` column / `scrape_failures` audit table / Postgres RPC for atomic INSERT+UPDATE.
- Cron `?force=1` override.
- Currency conversion / FX, browser extension, mobile native apps, payments, social features.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel Hobby plan + Fluid Compute is enabled by default for new projects in 2026-04 | Pattern 3, R-02 | If disabled, `maxDuration = 300` silently caps at 60s and cron 504s with > ~10 products. Mitigation in plan (`07-VERIFICATION.md` step). [CITED but not [VERIFIED] for THIS specific project — depends on Vercel project age.] |
| A2 | Prod Supabase project will use the same default extensions as dev (`pg_cron`, `pg_net` available; Vault available) | Pattern 5, R-12 | Migration 0003 fails. Same Tokyo / free-tier sensitivity Phase 1 hit ("Pitfall 8") — STATE.md noted "Pitfall 8 did NOT fire on Tokyo Free-tier." Different region/tier could behave differently. Mitigation: explicit verification in Plan 07-05. |
| A3 | The same Google OAuth client (single Client ID/Secret) can serve both dev (dev Supabase ref callback) and prod (prod Supabase ref callback) by listing both URIs in Authorized redirect URIs | Pattern 4, Plan 07-06 | If Google's quotas / verification status differ per client, may need separate prod client. AUTH-08-OPS-CHECKLIST.md mentions a "separate Testing OAuth client" option. At portfolio bar, the single-client multi-redirect-URI approach is the simplest path. |
| A4 | Tailwind v4's `@import "tailwindcss"` survives the Vercel build verbatim (no per-build content-purge config required) | Pattern 6, R-07 | If a stray `tailwind.config.js` reintroduces v3 purge, classes silently fail in prod. Phase 1 Plan 01-05 stabilized the v4 setup; PITFALLS.md:362 is the inspection. |
| A5 | The fresh prod CRON_SECRET stored in Vercel `production` env scope can be the SAME value inserted via `vault.create_secret()` in the prod Supabase project | Pattern 5, Plan 07-05 step 4-7 | They MUST match (Vault provides what the wrapper sends in the Authorization header; Vercel env provides what `verifyCronBearer` compares against in the Route Handler). If they differ, every legitimate cron POST returns 401. Plan acceptance criteria must enforce "use same value in both places." |
| A6 | DEP-06 manual cron POST is the ONLY way to surface the email-arrival check in a portfolio-bar timeframe — daily 9 AM UTC schedule is impractical for a same-session verification | Pattern 7, Plan 07-08 | If for some reason the manual POST is blocked (curl unavailable, CRON_SECRET not retrievable), wait until the daily run fires. Acceptable but slow. |
| A7 | `books.toscrape.com` (the Phase 3 known-good test target) returns a `current_price` that's stable enough to manipulate via SQL UPDATE for the DEP-06 forced-drop test | Pattern 7 step 4 | If the target's price changes mid-test (Firecrawl scrapes the live page), the verification can be re-run. Low risk; the sandbox is intentionally stable. |
| A8 | Screenshots committed inline (PNGs at typical phone-screenshot resolution) at ~200-500KB each are acceptable in the repo | Pattern 7 | Repo size grows by ~1MB. Acceptable at portfolio bar. If the user prefers external storage, swap for a hosted URL. |

**A1 and A3** are the highest-risk items because they're outside Claude's verification surface. Plan 07-05 / 07-06 acceptance criteria should explicitly require the user to confirm.

## Open Questions

1. **What is the assigned prod Vercel URL?**
   - What we know: Default `*.vercel.app` is acceptable per CONTEXT.md (no custom domain in v1).
   - What's unclear: The exact subdomain Vercel assigns is project-name-dependent and only known after `vercel deploy --prod`.
   - Recommendation: Plan 07-05 captures the URL post-deploy; Plan 07-07's migration 0006 references the URL via a placeholder that the operator replaces before applying. Document the value in `07-VERIFICATION.md`.

2. **Is the prod Supabase project a fresh Supabase free-tier or upgraded?**
   - What we know: Dev project is Tokyo Free-tier per STATE.md.
   - What's unclear: Whether portfolio-bar prod stays Free-tier (likely yes; product fits well within free limits).
   - Recommendation: Stay Free-tier unless rate-limit or extension constraints surface. Document the choice in `07-VERIFICATION.md`.

3. **Is Resend domain DNS already verified for the prod-FROM email?**
   - What we know: STATE.md flagged "begin domain setup at Phase 5 start." By Phase 7 this should be settled.
   - What's unclear: Whether the same Resend account is being reused or a new one is needed for prod.
   - Recommendation: BEFORE running DEP-06, verify Resend dashboard shows domain "verified" + send a one-off Resend test email to the non-owner inbox. If that test arrives in primary inbox (not spam), proceed with DEP-06.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, Vitest, Vercel CLI | yes | v24.15.0 | — |
| npm | Package install | yes | 11.12.1 | — |
| Supabase CLI | Migration 0006 apply, type regen | yes | 2.90.0 | Supabase Dashboard SQL Editor (manual) |
| Vercel CLI | Project link, env add, deploy | NO (not installed) | — | Vercel Dashboard (manual) OR `npx vercel@latest` (no install required) |
| `curl` | DEP-06 manual cron POST | yes (macOS default) | — | — |
| Google Cloud Console access | DEP-04 OAuth registration | out-of-repo | n/a | none — operator must complete |
| Supabase Dashboard access | DEP-03 Vault secret + URL config | out-of-repo | n/a | none — operator must complete |
| Resend Dashboard access | EMAIL-04 domain verification | out-of-repo | n/a | none — operator must complete |
| Two Gmail addresses (Resend-owner + non-owner) | DEP-06 non-owner inbox check | assumed yes | n/a | If only one Gmail available, register a fresh one (free) for the test |

**Missing dependencies with no fallback:**
- None — all hard dependencies are present or have manual-dashboard fallbacks.

**Missing dependencies with fallback:**
- Vercel CLI: use `npx vercel@latest <command>` instead of installing globally. Equivalent UX, no install step. Plan 07-05 commands all use `npx vercel@latest` form.

## Security Domain

> Project default: `security_enforcement` not explicitly set in `.planning/config.json` — treat as enabled. Phase 7 adds no new attack surface (no new endpoints, no new persistent state). Risk concentration is at the secret-rotation boundary (Vault + Vercel env) and the prod OAuth surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Google OAuth via Supabase Auth; redirect URI strict allow lists in BOTH Google + Supabase. No password / magic-link surface. |
| V3 Session Management | yes | `proxy.ts` session refresh from Phase 2 — unchanged in Phase 7. Cookies remain HttpOnly + SameSite via `@supabase/ssr` defaults. |
| V4 Access Control | yes | RLS on `products` + `price_history` from Phase 1 — unchanged. Service-role bypass only in cron Route Handler (Phase 6). |
| V5 Input Validation | yes (verify only) | Zod schemas on env (Phase 1), URL (Phase 3), Firecrawl payload (Phase 3) — unchanged. Phase 7 introduces no new user input. |
| V6 Cryptography | yes | `verifyCronBearer` uses `node:crypto` `timingSafeEqual` (Phase 6) — unchanged. CRON_SECRET ≥ 32 chars enforced by env.server.ts schema. |
| V7 Error Handling & Logging | yes | Phase 7's NEW error boundaries MUST NOT leak `error.message` from Server Components in production — Next.js 16 already strips this; `error.digest` is the safe identifier. CONTEXT.md D-02 forbids any `<details>` with stack/message. |
| V14 Configuration | yes | Vercel env scoping: production keys must NOT bleed into preview scope; service-role key never in client bundle (env.server.ts split from env.ts, Phase 3 Plan 03-04). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Bearer token leak via cron.job command | Information Disclosure | Vault + SECURITY DEFINER wrapper; cron.job.command grep-clean of secret value (Phase 6 verified). Phase 7 reuses the same wrapper. |
| Open redirect via OAuth callback | Tampering | `/auth/callback` Route Handler redirects only to `origin` derived from `request.url` (Phase 2 02-REVIEW.md line 44). Unchanged in Phase 7. |
| Stale env vars after rotation | Information Disclosure / Denial of Service | `NEXT_PUBLIC_*` vars require redeploy after change (R-06). Plan ordering: set env vars first, then deploy. |
| Service-role key in client bundle | Information Disclosure | `env.server.ts` split + `import 'server-only'` line 1 (Phase 3 Plan 03-04). Unchanged in Phase 7 — but DEP-02 must put `SUPABASE_SERVICE_ROLE_KEY` in `production` scope only, never in `NEXT_PUBLIC_*`. |
| Error boundary leaks server stack to client | Information Disclosure | Next.js 16 strips Server Component error messages in production (`error.digest` only). Don't render `error.message` in fallback (CONTEXT.md D-02 enforces). |
| Vault secret mismatch between DB and Vercel | Denial of Service | Plan 07-05 acceptance: same value in both places. Verification in `07-VERIFICATION.md` with the Bearer token cURL test. |
| Resend domain DNS misconfiguration → emails dropped | Denial of Service | Non-owner-inbox test (PITFALLS.md:342) is the only reliable verification. R-09 mitigation. |

## Sources

### Primary (HIGH confidence — verified locally)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` (Next 16.2 error.tsx + global-error.tsx — `unstable_retry` prop, `'use client'` requirement, html/body requirement, version history)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` (Next 16 `app/icon.tsx` convention, default size 32×32, `size`+`contentType` exports, return shape)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` (`ImageResponse` from `next/og`, flexbox-only, 500KB cap, font format constraints)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` (numeric seconds export — Phase 6 already uses)
- `dealdrop/app/layout.tsx:19-22` (POL-05 verification target — already correct)
- `dealdrop/src/components/dashboard/SkeletonCard.tsx` + `ProductGrid.tsx:101-103` (POL-02 already wired)
- `dealdrop/app/api/cron/check-prices/route.ts` (DEP-06 cURL target; `maxDuration = 300`)
- `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql:90-161` (wrapper function whose URL Phase 7 updates; idempotent unschedule pattern)
- `.planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md` (canonical disambiguation of the two callback URIs)
- `.planning/phases/06-automated-monitoring-email-alerts/06-VERIFICATION.md` (verification document format precedent)
- `.planning/research/PITFALLS.md:336-362` ("Looks Done But Isn't" inspection grid + Tailwind production note)

### Secondary (MEDIUM confidence — web search 2026-04 cross-checked with vendor docs)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — 60s/300s Hobby split, Fluid Compute requirement
- [Vercel Configuring Function Duration](https://vercel.com/docs/functions/configuring-functions/duration) — `maxDuration` semantics
- [Vercel CLI env](https://vercel.com/docs/cli/env) — `vercel env add <NAME> <ENV>` syntax + `--sensitive` flag
- [Vercel CLI deploy](https://vercel.com/docs/cli/deploy) — `vercel deploy --prod`
- [Vercel CLI pull](https://vercel.com/docs/cli/pull) — `vercel env pull`
- [Vercel Environments](https://vercel.com/docs/deployments/environments) — production / preview / development scopes
- [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) — wildcard support (`*` single segment, `**` cross-segment)
- [Supabase Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) — `auth/v1/callback` registration in Google
- [Supabase Vault](https://supabase.com/docs/guides/database/vault) — `vault.create_secret`, `vault.decrypted_secrets`
- [Supabase pg_cron quickstart](https://supabase.com/docs/guides/cron/quickstart) — `cron.schedule` + `cron.unschedule` patterns

### Tertiary (LOW confidence — none in this research)
- (none — this phase's domain is well-documented in primary sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — already locked since Phase 1; nothing new in Phase 7 adds dependencies.
- Architecture (error boundaries, dynamic icon): HIGH — verified directly in local Next 16.2 docs.
- Vercel deployment commands: MEDIUM — verified via web search 2026-04, vendor docs current; specific dashboard navigation labels not snapshotted.
- pg_cron prod cutover SQL: HIGH — pattern verified against the existing migration 0005 (already in repo, applied, working).
- OAuth two-callback disambiguation: HIGH — Phase 2's AUTH-08-OPS-CHECKLIST.md is the canonical reference; this research extends it.
- Mobile audit pitfalls: MEDIUM — broad Tailwind v4 knowledge; specific breaks discoverable only at audit time.
- DEP-06 mechanics: HIGH — Pattern 7 mirrors the Phase 6 verification procedure used in `06-VERIFICATION.md`.

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 — stable platform stack; the only short-term risk is Vercel changing `maxDuration` defaults or Fluid Compute availability (low probability in a 30-day window).

---

## RESEARCH COMPLETE
