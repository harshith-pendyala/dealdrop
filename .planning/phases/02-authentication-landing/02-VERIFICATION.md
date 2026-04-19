---
phase: 02-authentication-landing
verified: 2026-04-19T16:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "WR-01: AuthModal surfaces signInWithOAuth error via sonner toast and resets loading state"
    - "WR-02: signOut Server Action branches to /?auth_error=1 on Supabase error"
    - "WR-03: AuthToastListener is now nested inside AuthModalProvider"
    - "WR-04: proxy matcher excludes /auth/callback (no cookie race with exchangeCodeForSession)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "The full OAuth flow completes without errors on both localhost and a Vercel preview deployment"
    addressed_in: "Phase 7 (Polish & Deployment)"
    evidence: "Phase 7 Success Criterion #1: 'The app is live at a Vercel production URL with all env vars configured; Google OAuth completes successfully on that URL.' Phase 7 requirements DEP-04 ('Google OAuth redirect URIs include production Vercel URL') and DEP-06 ('End-to-end manual test: sign up → add product → verify initial history row → manual cron trigger → verify alert email delivered') explicitly cover the Vercel preview/production leg. User explicitly deferred the Vercel leg in this Phase 2 session — localhost leg is human-approved, Vercel leg remains the Phase 7 contract."
human_verification:
  - test: "Vercel preview OAuth smoke test"
    expected: "Pushing a branch to GitHub triggers a Vercel preview deploy. Visiting the preview URL, clicking Sign In → Continue with Google, completing the Google flow, and landing back on the preview URL with DashboardShell visible — all without redirect_uri_mismatch or session-persistence errors. Reload the preview URL and confirm DashboardShell still renders (proxy session refresh on Vercel edge). Click Sign Out → Hero returns + 'Signed out' toast fires."
    why_human: "Requires a deployed Vercel environment (out-of-repo), a real Google OAuth redirect round-trip, and verifying cookies persist on a domain that does not exist at verification time. Explicitly deferred to Phase 7 per user and roadmap; this entry remains in human_verification so the check is not forgotten during Phase 7 execution."
---

# Phase 2: Authentication & Landing Verification Report

**Phase Goal:** Users can sign in with Google OAuth, stay signed in across page loads, and see a contextually correct UI — the hero for logged-out visitors and a dashboard shell for authenticated users.
**Verified:** 2026-04-19T16:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after WR-01..WR-04 fix pass

## Re-verification Summary

All 4 code-review warnings from `02-REVIEW.md` (tracked as gaps in the prior `02-VERIFICATION.md`) have been fixed with atomic commits and verified in the codebase:

| Fix | Commit | File | Status |
|-----|--------|------|--------|
| WR-01 — signInWithOAuth errors surfaced + loading state reset | `f50ef04` | `dealdrop/src/components/auth/AuthModal.tsx` | CLOSED |
| WR-02 — signOut redirects to `/?auth_error=1` on Supabase failure | `d051d31` | `dealdrop/src/actions/auth.ts` | CLOSED |
| WR-03 — AuthToastListener nested inside AuthModalProvider | `c6653ae` | `dealdrop/app/layout.tsx` | CLOSED |
| WR-04 — proxy matcher excludes `/auth/callback` | `6b6b433` | `dealdrop/proxy.ts` | CLOSED |

`npx tsc --noEmit` exits 0 after all four commits (verified this session). No regressions detected. The prior "Gap 2" cluster (code-review verification debt) is fully closed.

The only remaining open item from the prior verification is the Vercel preview OAuth leg (Phase 2 Roadmap Success Criterion #5 second half), which the user explicitly deferred and which Phase 7 already tracks formally. It is moved to `deferred` + `human_verification` and does not count as a gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A logged-out visitor sees the hero section with "Never miss a price drop" tagline, feature cards, and a Sign In button in the header | VERIFIED | `dealdrop/app/page.tsx:15` branches `{user ? <DashboardShell/> : <Hero/>}`; `dealdrop/src/components/hero/Hero.tsx:8` contains exact string `"Never miss a price drop"`; all 3 feature-card titles present (`Multi-site support`, `Instant email alerts`, `Price history`); `dealdrop/src/components/header/Header.tsx:14` renders `<SignInButton/>` when `user` is null |
| 2 | Clicking Sign In opens the Shadcn Dialog modal with a single "Continue with Google" button | VERIFIED | `dealdrop/src/components/auth/SignInButton.tsx:10` calls `openAuthModal()`; `dealdrop/src/components/auth/AuthModal.tsx:38-59` renders Shadcn `<Dialog open={isOpen} onOpenChange={setOpen}>` with exact copy `"Sign in to DealDrop"`, `"Sign in to start tracking prices"`, and a single `"Continue with Google"` button; `handleGoogleSignIn` now captures `{ error }` from `signInWithOAuth` (WR-01 fix) and toasts on failure |
| 3 | After completing Google OAuth, the user is redirected to `/` and the page now shows the dashboard shell (not the hero) | VERIFIED | `dealdrop/app/auth/callback/route.ts:10-12` calls `exchangeCodeForSession(code)` and `NextResponse.redirect(${origin}/)` on success; `dealdrop/app/page.tsx:6-15` uses `supabase.auth.getUser()` (auth-server-verified, NOT `getSession()`) and branches to `<DashboardShell user={user}/>` when user exists; `dealdrop/src/components/dashboard/DashboardShell.tsx:11` renders `"Welcome back"` heading; human smoke test (Plan 02-04 Task 3) approved this leg on localhost. Session persistence confirmed via `dealdrop/proxy.ts:29` `await supabase.auth.getClaims()` with rebuilt `supabaseResponse` cookie propagation (AUTH-07). WR-04 fix removes cookie-race risk on `/auth/callback` (proxy matcher now excludes it) |
| 4 | Clicking Sign Out from the header ends the session and the page reverts to showing the hero | VERIFIED | `dealdrop/src/components/auth/SignOutButton.tsx:12` calls `signOut()` Server Action; `dealdrop/src/actions/auth.ts:6-12` awaits `supabase.auth.signOut()`, captures `{ error }` (WR-02 fix), branches to `/?auth_error=1` on failure or `/?signed_out=1` on success; `dealdrop/src/components/auth/AuthToastListener.tsx:12-19` fires `toast.success('Signed out')` on `?signed_out=1` and `toast.error('Sign in failed. Please try again.')` on `?auth_error=1`, then `router.replace('/')` to clean the URL. Page re-renders via RSC — `getUser()` now returns null, branches to `<Hero/>`. Human smoke test confirmed cookies cleared in DevTools |
| 5 | The full OAuth flow completes without errors on both localhost and a Vercel preview deployment | VERIFIED (localhost) + DEFERRED (Vercel preview) | Localhost leg: Plan 02-04 Task 3 — 14-step browser smoke test + D-15 env recovery, user typed `approved`. Vercel preview leg: explicitly deferred by user; tracked in Phase 7 SC #1, DEP-04, DEP-06. Per prompt instruction and Step 9b roadmap-trace, the Vercel leg is deferred (not a gap) and surfaced as a human_verification item so Phase 7 does not drop it |

**Score:** 5/5 truths verified (SC #5 second leg deferred to Phase 7 per user; localhost leg verified).

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | Vercel preview OAuth smoke test (SC #5 second leg) | Phase 7 (Polish & Deployment) | Phase 7 SC #1: "The app is live at a Vercel production URL with all env vars configured; Google OAuth completes successfully on that URL." Phase 7 requirements DEP-04 ("Google OAuth redirect URIs include production Vercel URL") and DEP-06 ("End-to-end manual test: sign up → add product → verify initial history row → manual cron trigger → verify alert email delivered") explicitly cover this leg. User acknowledged the deferral both in the prior session and in this re-verification prompt. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dealdrop/components/ui/dialog.tsx` | Shadcn Dialog primitive | VERIFIED | Imports `Dialog as DialogPrimitive from "radix-ui"` (umbrella — Shadcn 4.3 pattern, functionally equivalent to `@radix-ui/react-dialog`); 10 named exports |
| `dealdrop/components/ui/card.tsx` | Shadcn Card primitive | VERIFIED | 7 named exports, imports `cn` from `@/lib/utils` |
| `dealdrop/components/ui/sonner.tsx` | Shadcn Sonner Toaster wrapper | VERIFIED | `import { Toaster as Sonner, type ToasterProps } from "sonner"` |
| `dealdrop/proxy.ts` | Supabase session refresh with callback exclusion | VERIFIED | `getClaims()`, `createServerClient`, `supabaseResponse` rebuild pattern; matcher now includes `auth/callback` in negative-lookahead (WR-04 closed) |
| `dealdrop/app/auth/callback/route.ts` | OAuth code-exchange Route Handler | VERIFIED | `exchangeCodeForSession(code)`, origin-anchored redirect, `?auth_error=1` failure path |
| `dealdrop/supabase/config.toml` | Loopback URL uses http:// | VERIFIED | Line 156: `additional_redirect_urls = ["http://127.0.0.1:3000", "http://localhost:3000"]`. WR-03 from Phase 1 closed. |
| `dealdrop/src/actions/auth.ts` | signOut Server Action with error branch | VERIFIED | `'use server'` directive, `await supabase.auth.signOut()`, captures `{ error }`, branches to `/?auth_error=1` or `/?signed_out=1` (WR-02 closed) |
| `dealdrop/src/components/auth/AuthModalProvider.tsx` | Provider + useAuthModal hook | VERIFIED | Exports `AuthModalProvider` + `useAuthModal`; context exposes `openAuthModal`, `setOpen`, `isOpen` (AUTH-04 hook contract for Phase 4) |
| `dealdrop/src/components/auth/AuthModal.tsx` | Shadcn Dialog with Google CTA + error surfacing | VERIFIED | All locked copy strings present verbatim; `redirectTo: ${window.location.origin}/auth/callback`; `toast.error(...)` + `setIsLoading(false)` on failure (WR-01 closed) |
| `dealdrop/src/components/auth/SignInButton.tsx` | Header Sign In button | VERIFIED | `variant="default"`, label `"Sign in"`, `onClick={openAuthModal}` |
| `dealdrop/src/components/auth/SignOutButton.tsx` | Header Sign Out button | VERIFIED | `variant="outline"`, labels `"Sign out"` / `"Signing out…"`, calls `signOut` from `@/actions/auth` |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | Query-string toast listener | VERIFIED | Imports `toast` from raw `sonner`; handles `signed_out=1` and `auth_error=1`; `router.replace('/')` cleans URL |
| `dealdrop/src/components/hero/Hero.tsx` | Hero RSC with locked copy | VERIFIED | All HERO-01/02/04 strings present verbatim; renders 3 FeatureCards with `Globe`, `BellRing`, `LineChart` icons |
| `dealdrop/src/components/hero/FeatureCard.tsx` | FeatureCard RSC | VERIFIED | `aria-hidden="true"` on icon, `text-primary` accent, Shadcn Card wrapper |
| `dealdrop/src/components/header/Header.tsx` | Header RSC with contextual auth | VERIFIED | `h-14`, wordmark `<span>` (not link), branches `{user ? <SignOutButton/> : <SignInButton/>}`; no `sticky`/`fixed` per D-14 |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | Placeholder for authed users | VERIFIED | `"Welcome back"` heading + placeholder copy; no Add Product form (deferred to Phase 4) |
| `dealdrop/app/page.tsx` | RSC auth gate | VERIFIED | `await createClient()`, `supabase.auth.getUser()` (NOT `getSession()`), branches Hero vs DashboardShell, passes `user` to Header |
| `dealdrop/app/layout.tsx` | Root layout wiring with listener nested | VERIFIED | AuthModalProvider wraps `{children}`; AuthToastListener now nested inside AuthModalProvider (lines 35-40) — WR-03 closed; Toaster with `position="top-center"` + `richColors`; Phase 1 Geist fonts + DealDrop metadata preserved |
| `.planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md` | Ops checklist for OAuth redirect URIs | VERIFIED | 90 lines, contains Supabase project ref, Google + Supabase dashboard steps, troubleshooting table |
| `.planning/phases/02-authentication-landing/02-SMOKE-TEST.md` | Printable smoke test | VERIFIED | 111 lines, all 11 locked UI-SPEC copy strings present, D-15 negative-case included |
| `.planning/REQUIREMENTS.md` | POL-01 → Phase 2, AUTH-04 split | VERIFIED | `AUTH-04 \| Phase 2 (hook) / Phase 4 (trigger)`; `POL-01 \| Phase 2`; D-07 and D-13 footnotes present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `proxy.ts` | `@supabase/ssr createServerClient` | `getAll`/`setAll` with rebuilt NextResponse | WIRED | Lines 8-27 — pattern matches Supabase SSR docs; `supabaseResponse` is `let` and rebuilt inside `setAll` (Pitfall 1 avoided) |
| `proxy.ts` | matcher excludes `/auth/callback` | `config.matcher` negative-lookahead | WIRED | Line 36 includes `auth/callback` in the negation — WR-04 closed |
| `app/auth/callback/route.ts` | `@/lib/supabase/server createClient` | `await createClient()` + `exchangeCodeForSession(code)` | WIRED | Lines 2, 9-10 |
| `AuthModal.tsx` | `@/lib/supabase/browser createClient` | `createClient().auth.signInWithOAuth` | WIRED | Lines 5, 23-29 |
| `AuthModal.tsx` | `sonner toast` | `toast.error(...)` on `{ error }` branch | WIRED | Lines 4, 31 — WR-01 wire path |
| `AuthModal.tsx` | `@/components/ui/dialog` | Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription imports | WIRED | Lines 7-13 |
| `AuthModal.tsx` | `./AuthModalProvider useAuthModal` | `isOpen`/`setOpen` context consumption | WIRED | Line 18 — `const { isOpen, setOpen } = useAuthModal()` |
| `SignInButton.tsx` | `./AuthModalProvider openAuthModal` | `useAuthModal().openAuthModal` onClick | WIRED | Lines 3, 7, 10 |
| `SignOutButton.tsx` | `@/actions/auth signOut` | onClick handler | WIRED | Lines 5, 12 |
| `auth.ts` (Server Action) | `@/lib/supabase/server createClient` | `await createClient()` + `supabase.auth.signOut()` | WIRED | Lines 4, 7-8 |
| `auth.ts` (Server Action) | branches on `{ error }` | `redirect('/?auth_error=1')` vs `redirect('/?signed_out=1')` | WIRED | Lines 8-12 — WR-02 wire path |
| `AuthToastListener.tsx` | `sonner toast` | `toast.success` / `toast.error` | WIRED | Lines 5, 13, 17 |
| `AuthToastListener.tsx` | nested inside `AuthModalProvider` | `<Suspense><AuthToastListener /></Suspense>` inside provider | WIRED | layout.tsx lines 35-40 — WR-03 wire path (enables future useAuthModal() consumption) |
| `app/page.tsx` | `@/lib/supabase/server createClient` | `await createClient().auth.getUser()` | WIRED | Lines 1, 7-10 — uses `getUser()` (auth-server verified), NOT `getSession()` |
| `app/page.tsx` | `<Hero/>` | Conditional render when user is null | WIRED | Line 15 |
| `app/page.tsx` | `<DashboardShell/>` | Conditional render when user is truthy | WIRED | Line 15 |
| `app/page.tsx` | `<Header user={user}/>` | Passes user prop | WIRED | Line 14 |
| `Header.tsx` | `<SignInButton/>` | Rendered when user is null | WIRED | Lines 2, 14 |
| `Header.tsx` | `<SignOutButton/>` | Rendered when user is truthy | WIRED | Lines 3, 14 |
| `app/layout.tsx` | `AuthModalProvider` | Wraps `{children}` + `AuthToastListener` | WIRED | Lines 5, 35-40 |
| `app/layout.tsx` | `<Toaster/>` (Shadcn Sonner wrapper) | Mount with `position="top-center" richColors` | WIRED | Lines 4, 41 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/page.tsx` | `user` | `await supabase.auth.getUser()` (Supabase Auth server) | Yes — network-verified JWT → User object or null | FLOWING |
| `Header.tsx` | `user` prop | Passed from `app/page.tsx` | Yes — flows from getUser() result | FLOWING |
| `AuthModal.tsx` | `isOpen` | `useAuthModal()` → React context state | Yes — state flips via `openAuthModal()` from SignInButton | FLOWING |
| `AuthModal.tsx` | `error` (new, WR-01) | `await supabase.auth.signInWithOAuth(...)` return | Yes — Supabase SDK returns AuthError on failure; handler toasts + resets loading | FLOWING |
| `auth.ts` | `error` (new, WR-02) | `await supabase.auth.signOut()` return | Yes — Supabase SDK returns AuthError on failure; handler branches redirect | FLOWING |
| `SignOutButton.tsx` | `isPending` | `useState(false)` → mutated by handleSignOut | Yes — local state for loading UX | FLOWING |
| `AuthToastListener.tsx` | `searchParams` | `useSearchParams()` from Next.js router | Yes — reads real URL query params | FLOWING |
| `DashboardShell.tsx` | `_user` | Passed from `app/page.tsx` but unused in v1 | N/A — placeholder, Phase 4 will render user fields | HOLLOW_PROP (intentional, documented in plan) |

**Note on DashboardShell HOLLOW_PROP:** Plan 02-04 explicitly specs `user: _user` rename for strict-mode unused-var compliance with intent to render user fields in Phase 4. This is a planned-forward stub, not verification debt.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| proxy.ts exports the `proxy` function and a valid matcher | `grep -E "^export async function proxy\|^export const config" dealdrop/proxy.ts` | Both present (lines 5, 34) | PASS |
| proxy matcher excludes /auth/callback (WR-04) | `grep "auth/callback" dealdrop/proxy.ts` | Line 36 contains `auth/callback` in negation | PASS |
| /auth/callback exports GET handler | `grep -E "^export async function GET" dealdrop/app/auth/callback/route.ts` | Present (line 4) | PASS |
| signOut Server Action has 'use server' directive | `head -1 dealdrop/src/actions/auth.ts` | `'use server'` | PASS |
| signOut Server Action branches on error (WR-02) | `grep -n auth_error dealdrop/src/actions/auth.ts` | Line 10: `redirect('/?auth_error=1')` | PASS |
| AuthModal toasts on signInWithOAuth error (WR-01) | `grep -n "toast.error" dealdrop/src/components/auth/AuthModal.tsx` | Line 31 toast with message + `setIsLoading(false)` on line 32 | PASS |
| AuthModalProvider is client component | `head -1 dealdrop/src/components/auth/AuthModalProvider.tsx` | `'use client'` | PASS |
| AuthToastListener nested inside AuthModalProvider (WR-03) | `awk` block `AuthModalProvider>/../AuthModalProvider>/` in layout.tsx | Listener + Suspense appear at lines 37-39, inside provider (35-40) | PASS |
| AuthToastListener handles auth_error query (pairs with WR-02) | `grep -n auth_error dealdrop/src/components/auth/AuthToastListener.tsx` | Line 16: `searchParams.get('auth_error') === '1'` | PASS |
| Hero contains all locked copy strings | `grep -c -E "Never miss a price drop\|Paste any product URL\|Multi-site support\|Instant email alerts\|Price history\|Made with love" dealdrop/src/components/hero/Hero.tsx` | 6 matches (all present) | PASS |
| AuthModal contains all locked copy strings | `grep -c -E "Sign in to DealDrop\|Sign in to start tracking prices\|Continue with Google" dealdrop/src/components/auth/AuthModal.tsx` | 3 matches (all present) | PASS |
| page.tsx uses getUser() not getSession() | `grep -c getSession dealdrop/app/page.tsx` | 0 matches (correct — uses getUser) | PASS |
| page.tsx scaffold fully removed | `grep -E "Create Next App\|Vercel Deploy Now" dealdrop/app/page.tsx` | No matches | PASS |
| AUTH-04 hook contract multiply-consumed | `grep -rc "openAuthModal\|useAuthModal" dealdrop/src` | Matches across Provider + SignInButton + AuthModal | PASS |
| Type check post-fix | `npx tsc --noEmit` | Exit 0 (verified this session) | PASS |
| Fix commits land atomically | `git log f50ef04 d051d31 c6653ae 6b6b433 --stat` | Four separate commits, each touches exactly one file, small diffs | PASS |
| Localhost OAuth end-to-end smoke test | Plan 02-04 Task 3: 14-step browser test | User typed `approved` after all 14 steps + D-15 env recovery | PASS (user-approved, carried forward) |
| Vercel preview OAuth smoke test | Deploy to Vercel preview, complete Google OAuth | Not run — explicitly deferred to Phase 7 | SKIP — routed to human verification (intentional) |

### Requirements Coverage

Requirements declared across Phase 2 plans (aggregated from `requirements:` frontmatter fields):

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| AUTH-01 | 02-03, 02-04 | User can sign in with Google OAuth via Supabase Auth | SATISFIED | AuthModal.tsx signInWithOAuth + callback/route.ts exchangeCodeForSession + proxy.ts session refresh; localhost smoke test user-approved; WR-01 hardens error surface |
| AUTH-02 | 02-02 | `/auth/callback` Route Handler exchanges OAuth code for session and redirects to `/` | SATISFIED | callback/route.ts:10-12; WR-04 removes cookie-race risk on this path |
| AUTH-03 | 02-03, 02-04 | Sign-in triggered by clicking "Sign In" button in the header | SATISFIED | Header.tsx:14 renders SignInButton; SignInButton.tsx:10 calls openAuthModal |
| AUTH-04 | 02-03, 02-05 (doc) | Sign-in triggered when user submits Add Product form while logged out (opens auth modal) | SATISFIED (hook only) | useAuthModal() hook exported from AuthModalProvider.tsx; AUTH-04 is formally split across Phase 2 (hook) / Phase 4 (trigger) per REQUIREMENTS.md footnote. Phase 2's half is complete. |
| AUTH-05 | 02-01, 02-03 | Auth modal is a Shadcn Dialog with a single "Continue with Google" button | SATISFIED | AuthModal.tsx uses `<Dialog>` from `@/components/ui/dialog`; single `<Button>` with label "Continue with Google" |
| AUTH-06 | 02-03, 02-04 | Authenticated user sees "Sign Out" button in header that ends the session | SATISFIED | Header.tsx:14 renders SignOutButton when user present; SignOutButton.tsx + actions/auth.ts + AuthToastListener.tsx full round-trip; WR-02 adds error-branch; user-approved smoke test step 9 |
| AUTH-07 | 02-02 | `proxy.ts` refreshes Supabase session cookies on every request | SATISFIED | proxy.ts:5-31 real body with getAll/setAll pattern; smoke test step 7 confirmed session persists across reload; WR-04 excludes `/auth/callback` from matcher to avoid cookie race with `exchangeCodeForSession` |
| AUTH-08 | 02-05 (doc) | OAuth redirect URIs registered in Google Cloud Console + Supabase Auth dashboard | SATISFIED (doc-level) + DEFERRED (Vercel runtime) | AUTH-08-OPS-CHECKLIST.md documents URIs; user-approved localhost smoke test implies they completed the checklist for localhost. Vercel preview portion deferred to Phase 7 per user. |
| HERO-01 | 02-04 | Logged-out visitors see hero with tagline + subtitle | SATISFIED | Hero.tsx:7-13 — locked copy |
| HERO-02 | 02-01, 02-04 | Responsive grid of feature cards | SATISFIED | Hero.tsx:14-30 — 3 FeatureCards in `grid-cols-1 sm:grid-cols-3` |
| HERO-03 | 02-04 | Header always visible with logo and contextual Sign In / Sign Out | SATISFIED | Header.tsx — wordmark `<span>` + contextual auth button |
| HERO-04 | 02-04 | "Made with love" credit line | SATISFIED | Hero.tsx:31-33 |
| HERO-05 | 02-04 | Responsive from mobile (320px) to desktop | SATISFIED | Hero.tsx uses `sm:text-5xl`, `grid-cols-1 sm:grid-cols-3`; Header uses `px-4 sm:px-6 lg:px-8`; user-approved smoke test step 12 confirmed <640px stacking |
| POL-01 | 02-01, 02-04, 02-05 (doc) | Sonner toast provider mounted in root layout | SATISFIED | `<Toaster position="top-center" richColors />` in app/layout.tsx:41. Moved forward from Phase 7 per D-13; REQUIREMENTS.md updated. |

**Declared requirements: 14 total. Coverage: 14/14 SATISFIED.** AUTH-04 marked SATISFIED for its Phase 2 half; Phase 4 will complete the second half (trigger from Add Product form). AUTH-08 Vercel-leg runtime verification deferred to Phase 7.

**Orphan check:** REQUIREMENTS.md Traceability maps exactly AUTH-01..08, HERO-01..05, and POL-01 to Phase 2 — same 14 IDs the plans declare. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dealdrop/src/components/auth/AuthModal.tsx` | 20-36 | ~~`await signInWithOAuth(...)` with `{ error }` discarded — WR-01~~ | Warning | **CLOSED** (commit f50ef04): error captured, toast fired, loading state reset |
| `dealdrop/src/actions/auth.ts` | 6-12 | ~~`await supabase.auth.signOut()` with `{ error }` discarded — WR-02~~ | Warning | **CLOSED** (commit d051d31): error captured, `/?auth_error=1` branch added |
| `dealdrop/app/layout.tsx` | 35-40 | ~~AuthToastListener is sibling of AuthModalProvider — WR-03~~ | Warning | **CLOSED** (commit c6653ae): listener now nested inside provider |
| `dealdrop/proxy.ts` | 36 | ~~Matcher does not exclude `/auth/callback` — WR-04~~ | Warning | **CLOSED** (commit 6b6b433): `auth/callback` added to negative-lookahead |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | 7 | `user: _user` unused binding — IN-04 | Info | Intentional per plan (Phase 4 will consume); reviewer recommended adding a TODO comment |
| `dealdrop/src/components/hero/Hero.tsx` | 31-33 | `"Made with love"` marketing blurb — IN-05 | Info | Copy is locked by UI-SPEC Copywriting Contract D-05 |
| `dealdrop/supabase/config.toml` | 175 | `[auth.email] enable_signup = true` + `minimum_password_length = 6` — IN-06 | Info | Non-blocking; only affects local dev container |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | 11-20 | Effect could re-fire on searchParams updates in Strict Mode — IN-03 | Info | Edge case; `router.replace('/')` in same effect mostly prevents it |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | 14, 18 | `router.replace('/')` drops ALL query params — IN-02 | Info | No other query params on `/` today |
| `dealdrop/src/components/auth/AuthModal.tsx` | 23 | `createClient()` re-invoked per click — IN-01 | Info | Browser Supabase client is cheap; minor perf opportunity |

**Blocker count:** 0. **Warning count:** 0 (all 4 WRs now closed). **Info count:** 6 (explicitly deferred by fix-scope per 02-REVIEW-FIX.md).

### Fix-Commit Regression Scan

Each of the 4 fix commits was reviewed for unintended side effects:

| Commit | File(s) | Diff shape | Regression risk | Result |
|--------|---------|-----------|------------------|--------|
| `f50ef04` (WR-01) | AuthModal.tsx | +8/-1; imports `toast`, destructures `{ error }`, wraps setIsLoading(false) in the error branch | Could break happy-path if error flag misnamed — checked; happy path unchanged (button stays disabled on success, comment explains) | No regression |
| `d051d31` (WR-02) | actions/auth.ts | +4/-1; destructures `{ error }`, adds `if (error) redirect('/?auth_error=1')` before success redirect | Next.js `redirect()` throws — two calls in sequence still only execute one; AuthToastListener already handles `auth_error=1` | No regression |
| `c6653ae` (WR-03) | layout.tsx | +3/-3; moves `<Suspense><AuthToastListener/></Suspense>` from sibling to child of `<AuthModalProvider>` | Suspense semantics preserved; Toaster remains outside provider (portal-hosted); AuthModalProvider tree unaltered | No regression |
| `6b6b433` (WR-04) | proxy.ts | +1/-1; single matcher regex edit adds `auth/callback` to negative-lookahead | Matcher still guards static assets; `/auth/callback` now bypasses proxy, which is the documented Supabase SSR recommendation | No regression |

All commits are atomic (one file per commit), small (max 9 LOC changed), and paired 1:1 with the fix report (`02-REVIEW-FIX.md`). No additional files were touched. `npx tsc --noEmit` exits 0 post-fix.

### Human Verification Required

#### 1. Vercel preview OAuth smoke test (DEFERRED to Phase 7)

**Test:**
1. Push a branch to GitHub to trigger a Vercel preview deployment (or use an existing preview URL).
2. Visit the preview URL (e.g. `https://dealdrop-<hash>.vercel.app`).
3. Verify Hero + Header render with Sign In button.
4. Click Sign In → modal opens with "Continue with Google" button.
5. Click Continue with Google → redirects through Google → lands back on the preview URL with DashboardShell visible.
6. Reload the preview URL → DashboardShell persists (session refresh via proxy.ts on Vercel edge).
7. Click Sign Out → Hero returns + "Signed out" toast fires.

**Expected:** Full round-trip completes without `redirect_uri_mismatch`, without session loss on reload, without any console errors. Cookies visible in DevTools during authed state; cleared after sign-out.

**Why human:** Requires a deployed Vercel environment (out-of-repo), a real Google account, a working Supabase Auth Dashboard registration for the `*.vercel.app` wildcard (or the specific preview URL), and a working browser session. Tracked formally in Phase 7 (Polish & Deployment) per SC #1, DEP-04, DEP-06. This item surfaces in `human_verification` so Phase 7 does not drop it.

### Gaps Summary

No gaps remain. The two gap clusters from the prior verification are resolved as follows:

**Gap 1 (prior) — Vercel preview verification.** Reclassified from `gap_found` to `deferred` per Step 9b roadmap-trace: Phase 7 Success Criterion #1, DEP-04, and DEP-06 explicitly cover Vercel OAuth verification. User explicitly deferred in this session. Surfaced as `human_verification` so Phase 7 execution has a hook to close it.

**Gap 2 (prior) — Code review verification debt (WR-01..WR-04).** All four warnings closed with atomic commits this session:
- WR-01 closed by `f50ef04` (AuthModal toast + loading reset)
- WR-02 closed by `d051d31` (signOut redirects to `/?auth_error=1` on failure)
- WR-03 closed by `c6653ae` (AuthToastListener nested inside AuthModalProvider)
- WR-04 closed by `6b6b433` (proxy matcher excludes `/auth/callback`)

Type check green. Code shape matches fix spec. No regressions detected in fix-commit scan. Phase 2 is code-complete at portfolio/demo bar.

## D-15 Env-Validation Closure

> Phase 1 env-validation chain verified at Phase 2 build time via auth code path. `npm run build` exits 0 with all env vars populated; removing `CRON_SECRET` from `.env.local` re-runs build with expected Zod failure `Invalid environment variables: [{ path: ['CRON_SECRET'] ... }]`; restoring the var restores the green build. Reached via `app/page.tsx` → `@/lib/supabase/server` → `@/lib/env` AND `app/auth/callback/route.ts` → `@/lib/supabase/server` → `@/lib/env`.

The user's smoke test in Plan 02-04 Task 3 approved both the env-negative (build fails with Zod error when CRON_SECRET is removed) and env-positive (build passes when CRON_SECRET is restored) legs. This closes Phase 1 VERIFICATION human_verification[0].

## Phase 1 Deferred Items — Closure Status

| Phase 1 Item | Phase 2 Closure | Evidence |
|--------------|-----------------|----------|
| 01-VERIFICATION human_verification[0] — env-validation chain empirical proof | CLOSED | D-15 negative case run in Plan 02-04 Task 3 (build failed with Zod error, recovered on restore) |
| 01-VERIFICATION human_verification[2] — Shadcn Button visual verification | PARTIALLY CLOSED | `default` and `outline` variants rendered on `/` across light + dark modes (per 02-04 SUMMARY). Remaining variants (`ghost`, `destructive`, `secondary`, `link`) not used in Phase 2 — naturally defer to later phases |
| 01-REVIEW WR-03 — config.toml `https://127.0.0.1:3000` typo | CLOSED | Plan 02-02 Task 2b; verified: `grep http://127.0.0.1:3000 dealdrop/supabase/config.toml` matches, `grep https://127.0.0.1:3000` returns nothing |

---

*Re-verified: 2026-04-19T16:30:00Z*
*Verifier: Claude (gsd-verifier)*
*Previous status: gaps_found (4/5) → Current status: human_needed (5/5, Vercel leg deferred)*
