# Phase 2: Authentication & Landing - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the first user-visible surface of DealDrop: Google OAuth sign-in, persistent sessions across page loads, and a single page at `/` that branches content by auth state — hero for logged-out visitors, dashboard shell for authenticated users.

**In scope:**
- Google OAuth end-to-end (AUTH-01 through AUTH-03, AUTH-05 through AUTH-08)
- AUTH-04 *infrastructure only* — export an `openAuthModal()` hook/context so Phase 4's Add Product form can call it; the actual Add-Product trigger is wired in Phase 4
- `proxy.ts` real session refresh (replaces the Phase 1 stub) via `supabase.auth.getClaims()`
- `/auth/callback` Route Handler for OAuth code exchange
- Shadcn Dialog-based auth modal, triggered from the header
- Full hero (HERO-01 through HERO-05): tagline, subtitle, 3 feature cards, header, "Made with love" credit, mobile-responsive
- Dashboard shell for authenticated users — minimal placeholder header + welcome zone, ready for Phase 4 to fill
- POL-01 pulled forward: Sonner installed + `<Toaster />` mounted in root layout, used for the Sign-Out confirmation toast

**Not in scope for this phase:**
- Add Product form UI (Phase 4) — but its modal trigger hook exists here
- Firecrawl integration (Phase 3)
- Product cards, dashboard grid, charts (Phases 4-5)
- Email/password or magic-link auth (v2+, out of scope)
- First-time onboarding flow — rejected, portfolio bar

</domain>

<decisions>
## Implementation Decisions

### Hero Content & Structure (HERO-01 through HERO-05)
- **D-01:** 3 feature cards using service-benefit framing — **Multi-site support** · **Instant email alerts** · **Price history**. No fourth card; tight mobile grid.
- **D-02:** Stacked, centered layout — tagline + subtitle at top, 3-column card grid below. Collapses to 1-column on mobile. No split-layout, no headline-only-scroll-for-more.
- **D-03:** Header **Sign In** button is the only sign-in CTA. Hero is purely descriptive — no in-hero button, no fake URL input. Matches success criterion #1 verbatim.
- **D-04:** Subtitle below "Never miss a price drop" is plain-spoken: *"Paste any product URL. We'll check the price daily and email you the moment it drops."*
- **D-05:** Tagline is fixed from requirements: **"Never miss a price drop"** (HERO-01).

### Auth Modal & OAuth Flow (AUTH-01 through AUTH-08)
- **D-06:** Auth modal = Shadcn **Dialog** with title "Sign in to DealDrop", one-line subtitle "Sign in to start tracking prices", and a single "Continue with Google" button. Matches AUTH-05 literally. No privacy/terms line (we have no terms doc — would be placeholder copy).
- **D-07:** AUTH-04 is **split across phases**: Phase 2 ships an `openAuthModal()` hook/context exported from the auth module so Phase 4's Add Product form can call it verbatim. Phase 2 does NOT ship a dummy Add-Product UI. **Update REQUIREMENTS.md traceability:** AUTH-04 shows as "Phase 2 (hook) / Phase 4 (trigger)".
- **D-08:** Post-OAuth callback redirects **straight to `/`**. The Server Component re-renders and reads the session, showing the dashboard shell. **No client-side loading screen, no welcome flow, no first-sign-in detection.** Feels instant.
- **D-09:** `/auth/callback` is a Route Handler (AUTH-02) that exchanges the OAuth code, writes session cookies, then redirects to `/`.

### Session Refresh
- **D-10:** `dealdrop/proxy.ts` (currently a stub) implements real session refresh — creates a Supabase client bound to request/response cookies, calls `supabase.auth.getClaims()`, and propagates `Set-Cookie` headers. AUTH-07.

### Sign Out (AUTH-06)
- **D-11:** Sign Out is a **Server Action** that calls `supabase.auth.signOut()`, then redirects to `/`. The session-gone state triggers a re-render back to the hero (since `/` branches by auth).
- **D-12:** A Sonner toast confirms "Signed out" after the redirect completes. Requires POL-01 pulled forward — see D-13.

### Sonner (POL-01 pulled forward from Phase 7)
- **D-13:** Install `sonner` and `npx shadcn@latest add sonner` during Phase 2. Mount `<Toaster />` in `dealdrop/app/layout.tsx`. **Update REQUIREMENTS.md traceability:** POL-01 moves from Phase 7 → Phase 2. Future phases inherit a ready-to-use toast surface.

### Header (HERO-03)
- **D-14:** Always-visible header with DealDrop wordmark on the left and contextual auth action on the right — "Sign In" when logged out, "Sign Out" when logged in. Not sticky in v1; sits at the top of the document flow. No avatar/profile menu — inline Sign Out button is enough for a single-action dropdown-less design.

### Phase 1 Verification Closure
- **D-15:** Phase 2's first file that imports `@/lib/supabase/server` (most likely `app/page.tsx` or a shared `getSession` helper) completes the Phase 1 deferred env-validation item. Record in Phase 2's final VERIFICATION.md: "Phase 1 env-validation chain verified at phase 2 build time via auth code path."

### Claude's Discretion
- **OAuth error handling** — user cancels OAuth, Google returns an error. Planner picks: toast + modal stays open, OR inline error in modal, OR redirect to `/` with an error toast. Default: redirect to `/` with a Sonner error toast, since we already have the toast infrastructure.
- **AUTH-08 redirect URI registration** — part ops task, part plan-checklist item. Planner drafts a concise setup checklist (localhost, prod Vercel URL, Vercel preview wildcard) — user executes outside the agent.
- **Dashboard shell content beyond the header** — Phase 2 ships a thin placeholder ("you're signed in, Phase 4 will add your product list here" or similar sensible copy). Exact copy at planner's discretion; do NOT build the empty-state card, Add Product form, or products grid — those are Phase 4.
- **Feature card icons** — Lucide icons from the installed `lucide-react` package are fine (globe for Multi-site, mail/bell for Instant alerts, line-chart for Price history). Planner picks; no strong preference.
- **"Made with love" credit placement** — footer below hero, plain text. Author name = user's name if mentioned in PROJECT.md, otherwise generic.
- **Exact Tailwind responsive breakpoints** — standard `sm:`/`md:`/`lg:` as established in Phase 1.
- **Mobile hamburger vs compact header** — with only one action (Sign In/Out), a compact responsive header is sufficient. No hamburger menu.

### Folded Todos
None — no pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- [.planning/PROJECT.md](../../PROJECT.md) — Product vision, auth decisions (Google OAuth only, modal not route), v1 scope bar
- [.planning/REQUIREMENTS.md](../../REQUIREMENTS.md) — AUTH-01 through AUTH-08, HERO-01 through HERO-05 define acceptance. Also note POL-01 moves forward (D-13) and AUTH-04 splits (D-07).
- [.planning/ROADMAP.md](../../ROADMAP.md) — Phase 2 goal, 5 success criteria, UI hint=yes

### Prior phase (must read before planning)
- [.planning/phases/01-foundation-database/01-CONTEXT.md](../01-foundation-database/01-CONTEXT.md) — Locked-in layout decisions (dealdrop/ subdir, Shadcn new-york/zinc/0.5rem/system-dark-mode, supabase migrations location), three-client Supabase pattern rationale
- [.planning/phases/01-foundation-database/01-SUMMARY.md](../01-foundation-database/01-SUMMARY.md) — What actually shipped (to know what's reusable)
- [.planning/phases/01-foundation-database/01-04-SUMMARY.md](../01-foundation-database/01-04-SUMMARY.md) — Migrations applied + RLS verification details
- [.planning/phases/01-foundation-database/01-05-SUMMARY.md](../01-foundation-database/01-05-SUMMARY.md) — Shadcn init state (only Button installed)
- [.planning/phases/01-foundation-database/01-VERIFICATION.md](../01-foundation-database/01-VERIFICATION.md) — Deferred env-validation item that Phase 2 naturally closes (see D-15)

### Research outputs (reuse from Phase 1 — still relevant)
- [.planning/research/STACK.md](../../research/STACK.md) — Next.js 16 breaking changes: `proxy.ts` (not `middleware.ts`), async `cookies()` / `headers()`, ESLint CLI, removed `next lint`. Session refresh must use the proxy pattern.
- [.planning/research/ARCHITECTURE.md](../../research/ARCHITECTURE.md) — Three-client Supabase pattern (server / browser / admin). Auth modal uses browser client; Server Actions use server client; admin client is NOT used in Phase 2.
- [.planning/research/PITFALLS.md](../../research/PITFALLS.md) — `@supabase/auth-helpers-nextjs` is deprecated; must use `@supabase/ssr` (already installed)

### Codebase maps
- [.planning/codebase/STRUCTURE.md](../../codebase/STRUCTURE.md) — Current layout; new folders needed: `src/components/{auth,hero,header,dashboard}/`, `app/auth/callback/`
- [.planning/codebase/CONVENTIONS.md](../../codebase/CONVENTIONS.md) — Naming, import order, component patterns, TypeScript strict
- [.planning/codebase/ARCHITECTURE.md](../../codebase/ARCHITECTURE.md) — Server Components by default; client components only when necessary (auth modal is a client component, sign-in triggers are client components)

### External docs (planner should fetch at plan time)
- **Next.js 16 docs** at `dealdrop/node_modules/next/dist/docs/` — authoritative for `proxy.ts`, Route Handlers, async cookies, Server Actions. `AGENTS.md` explicitly says read these before writing code.
- **`@supabase/ssr`** package README — `createServerClient`, `createBrowserClient` patterns for Next.js App Router. Package version 0.10.2 is installed.
- **Supabase Auth > Google OAuth** guide — provider setup in dashboard, authorized redirect URIs, code exchange flow
- **Shadcn UI — Dialog** docs — install command, anatomy, controlled-open pattern (needed for `openAuthModal()` hook in D-07)
- **Shadcn UI — Card** docs — for feature cards
- **Shadcn UI — Sonner** docs — Toaster mounting pattern in App Router (root layout, server-component-safe)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [dealdrop/src/lib/supabase/server.ts](../../../dealdrop/src/lib/supabase/server.ts) — server client factory; used by Server Components + Server Actions for session reads and sign-out
- [dealdrop/src/lib/supabase/browser.ts](../../../dealdrop/src/lib/supabase/browser.ts) — browser client; used by the auth modal's `signInWithOAuth({ provider: 'google' })` call
- [dealdrop/src/lib/env.ts](../../../dealdrop/src/lib/env.ts) — Zod-validated env. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` already wired for client use
- [dealdrop/src/lib/utils.ts](../../../dealdrop/src/lib/utils.ts) — `cn()` helper for Shadcn component composition
- [dealdrop/components/ui/button.tsx](../../../dealdrop/components/ui/button.tsx) — Button primitive, all 5 variants verified in Phase 1
- [dealdrop/proxy.ts](../../../dealdrop/proxy.ts) — stub with matcher config ready; Phase 2 fills in the body
- [dealdrop/app/layout.tsx](../../../dealdrop/app/layout.tsx) — keep Geist fonts + DealDrop metadata from Phase 1; add `<Toaster />` + AuthModalProvider wrapper
- [dealdrop/src/types/database.ts](../../../dealdrop/src/types/database.ts) — generated Supabase types; typed session reads

### Established Patterns
- **TypeScript strict, no `any`, `import type`** for type-only imports
- **Functional components with `Readonly<>` props** (from Phase 1 layout.tsx pattern)
- **Tailwind utility-first** with CSS vars for theme tokens (Shadcn extended these)
- **Dark mode via `prefers-color-scheme` media query** — no toggle, just respect system
- **`@/*` path alias** for all internal imports
- **Await all Request APIs** (Next.js 16: `await cookies()`, `await headers()` — synchronous access was removed)
- **Three-client Supabase separation** — don't mix server and browser contexts

### Integration Points (files to create or modify)
| Path | Purpose |
|------|---------|
| `dealdrop/app/page.tsx` | **Replace** the `create-next-app` scaffold. Server Component reads session, branches: `<Hero />` if no session, `<DashboardShell />` if session exists. |
| `dealdrop/app/auth/callback/route.ts` | **New** Route Handler (AUTH-02). `GET` exchanges OAuth code, redirects to `/`. |
| `dealdrop/proxy.ts` | **Fill in** the stub body with real `getClaims()` session refresh (AUTH-07). |
| `dealdrop/app/layout.tsx` | **Modify** to mount `<Toaster />` (POL-01) and wrap children with `AuthModalProvider`. |
| `dealdrop/src/components/auth/AuthModal.tsx` | **New** — Shadcn Dialog with Google button. Client component. |
| `dealdrop/src/components/auth/AuthModalProvider.tsx` | **New** — React context holding modal open state + `openAuthModal()` hook exported for Phase 4 consumption (D-07). |
| `dealdrop/src/components/auth/SignInButton.tsx` | **New** — header button that calls `openAuthModal()`. Client component. |
| `dealdrop/src/components/auth/SignOutButton.tsx` | **New** — header button that triggers sign-out Server Action + toast. Client component. |
| `dealdrop/src/actions/auth.ts` | **New** — `signOut()` Server Action. |
| `dealdrop/src/components/hero/Hero.tsx` | **New** — tagline, subtitle, 3-card grid, credit line. Server Component. |
| `dealdrop/src/components/hero/FeatureCard.tsx` | **New** — Shadcn Card + Lucide icon + title + blurb. Server Component. |
| `dealdrop/src/components/header/Header.tsx` | **New** — wordmark left, contextual auth action right. Server Component wrapping client auth buttons. |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | **New** — thin placeholder for authed users. Phase 4 fills in the products grid. |
| `dealdrop/components/ui/dialog.tsx` | **Add** via `npx shadcn@latest add dialog`. |
| `dealdrop/components/ui/card.tsx` | **Add** via `npx shadcn@latest add card`. |
| `dealdrop/components/ui/sonner.tsx` | **Add** via `npx shadcn@latest add sonner` (includes `<Toaster />` wrapper). |

### Gotchas from Research + Phase 1
- **`proxy.ts`** not `middleware.ts` (Next.js 16 rename). Match config from the existing stub.
- **`await cookies()`** — Next.js 16 removed sync cookie access. All server code reading cookies must await.
- **`@supabase/ssr`** is the only supported helper — do NOT use `@supabase/auth-helpers-nextjs` (deprecated).
- **Admin client (service role) is NOT used in Phase 2.** Only server + browser clients. Sign-out is a user action, not an admin operation.
- **OAuth redirect URI registration (AUTH-08)** — must list localhost, production Vercel domain, and the Vercel preview wildcard `https://*.vercel.app`. Planner should call this out as an ops checklist with explicit URL templates.
- **`signInWithOAuth` in a Dialog** must run on the client (browser client). The flow kicks off client-side, Google handles the redirect, then our `/auth/callback` Route Handler finishes the exchange.
- **Server Components can't set cookies** — any sign-out that needs to write cookies must be a Server Action (not a Server Component render) OR rely on the proxy to propagate the cookie clear.

</code_context>

<specifics>
## Specific Ideas

- **The tagline text is locked** by HERO-01: "Never miss a price drop". Do not rephrase.
- **The subtitle text is locked** by D-04: "Paste any product URL. We'll check the price daily and email you the moment it drops." Planner may micro-edit for punctuation, not meaning.
- **Modal title + subtitle are locked** by D-06: "Sign in to DealDrop" / "Sign in to start tracking prices" / "Continue with Google".
- **AUTH-04 splits across phases** (D-07). The CONTEXT.md for Phase 4 must reference this split when Phase 4 gets discussed. The planner should update REQUIREMENTS.md's Traceability table to show "AUTH-04: Phase 2 (hook) + Phase 4 (trigger)".
- **POL-01 moves from Phase 7 to Phase 2** (D-13). Planner should update REQUIREMENTS.md Traceability to reflect the move, and update Phase 7 scope to exclude Sonner setup.
- **Dashboard shell is minimal** — do not let scope creep pull Phase 4 work forward. Placeholder copy + the authed header is the target.
- **Three feature cards, service-benefit framing** (D-01): "Multi-site support", "Instant email alerts", "Price history". Each with a short one-line blurb (planner drafts blurbs, keeps them under ~12 words each).

</specifics>

<deferred>
## Deferred Ideas

- **OAuth error UX polish** — if the default "redirect to `/` with a Sonner error toast" turns out to feel cheap, revisit in Phase 7 Polish with inline-modal errors.
- **First-time user welcome/onboarding** — rejected for Phase 2; portfolio bar doesn't need it. If we ever add one, Phase 7 Polish is the natural home.
- **Profile menu / avatar dropdown** — no avatar or menu in v1; inline Sign Out button is enough. Worth revisiting only if the header accumulates more actions in a later phase.
- **Password / magic-link auth** — already deferred to v2+ per PROJECT.md Out of Scope.
- **Account settings page** — not in v1 scope.
- **Sticky header** — Phase 2 uses static header. Sticky can be added in Phase 7 Polish if desired.
- **Hero analytics / track "sign in clicked"** — no analytics in v1 scope.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 02-authentication-landing*
*Context gathered: 2026-04-18*
