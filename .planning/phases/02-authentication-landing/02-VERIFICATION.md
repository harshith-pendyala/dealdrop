---
phase: 02-authentication-landing
verified: 2026-04-18T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
re_verification: null
gaps:
  - truth: "The full OAuth flow completes without errors on both localhost and a Vercel preview deployment"
    status: partial
    reason: "Localhost leg was human-verified (Plan 02-04 Task 3, user typed 'approved' after 14-step smoke test). Vercel preview leg is unverified — user explicitly deferred it to a post-deploy manual check. The roadmap Success Criterion #5 requires BOTH environments; one is still open."
    artifacts:
      - path: ".planning/phases/02-authentication-landing/02-04-SUMMARY.md"
        issue: "Records localhost smoke test approved; no record of a Vercel preview run. The Phase 2 Success Criterion #5 cannot be fully closed until the preview deploy is exercised."
      - path: "dealdrop/supabase/config.toml"
        issue: "additional_redirect_urls only contains http://127.0.0.1:3000 and http://localhost:3000. Vercel preview domains (*.vercel.app/auth/callback) are documented in AUTH-08-OPS-CHECKLIST.md as something the user registers in the Supabase Auth Dashboard (out-of-repo), but there is no local verification that the preview flow was exercised."
    missing:
      - "Run OAuth smoke test against a deployed Vercel preview URL and record the result (PASS/FAIL + any redirect_uri_mismatch errors). A short note appended to 02-SMOKE-TEST.md or a new 02-VERCEL-SMOKE.md is sufficient."
      - "Confirm the Vercel preview URL is registered in Supabase Auth → URL Configuration → Redirect URLs (either explicitly or via the *.vercel.app wildcard documented in AUTH-08-OPS-CHECKLIST.md)."
  - truth: "Code-review warnings WR-01..WR-04 from 02-REVIEW.md should be resolved or explicitly accepted as verification debt"
    status: partial
    reason: "The user-approved smoke test confirmed the happy path works, but the code review surfaced 4 warnings that describe real failure-mode gaps and a cookie-race risk. None are blockers for the smoke test's happy path; all four are legitimate verification debt worth tracking before Phase 3 builds on top of this auth layer."
    artifacts:
      - path: "dealdrop/src/components/auth/AuthModal.tsx"
        issue: "WR-01 — handleGoogleSignIn awaits signInWithOAuth but discards the returned { error }. On a pre-redirect failure (network error, blocked popup, provider config error), the button stays in the loading/disabled state with no user feedback and no retry path. Line 20-29."
      - path: "dealdrop/src/actions/auth.ts"
        issue: "WR-02 — signOut() awaits supabase.auth.signOut() but ignores its { error } return and redirects unconditionally to /?signed_out=1. If sign-out fails, the UI fires the success toast while the session cookies may still be valid — a confusing inconsistency on a safety-critical path. Line 6-10."
      - path: "dealdrop/app/layout.tsx"
        issue: "WR-03 — AuthToastListener is a sibling of AuthModalProvider (line 35-41), not a child. The current layout works because the listener only fires toasts, but the structure blocks any future wiring where the listener would want to call useAuthModal() (e.g. reopen the modal on ?auth_error=1)."
      - path: "dealdrop/proxy.ts"
        issue: "WR-04 — The proxy matcher ('/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)') does NOT exclude /auth/callback. A request to /auth/callback?code=... enters the proxy first, which calls supabase.auth.getClaims() and may setAll cookies BEFORE the Route Handler runs exchangeCodeForSession(code). This is the documented cookie-race the Supabase SSR docs warn about. The happy path currently works (smoke test approved), but there is latent flakiness."
    missing:
      - "WR-01 fix: capture { error } from signInWithOAuth; on error, toast.error(...) and setIsLoading(false)."
      - "WR-02 fix: capture { error } from supabase.auth.signOut(); on error, redirect('/?auth_error=1') instead of '/?signed_out=1'."
      - "WR-03 fix: move <Suspense fallback={null}><AuthToastListener /></Suspense> inside <AuthModalProvider> so the listener has access to useAuthModal() for future UX (e.g. reopen modal on auth_error)."
      - "WR-04 fix: add 'auth/callback' to the proxy matcher negative-lookahead: '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)'."
deferred:
  - truth: "Vercel preview OAuth smoke test"
    addressed_in: "Phase 7 (Polish & Deployment)"
    evidence: "Phase 7 Success Criterion #1: 'The app is live at a Vercel production URL with all env vars configured; Google OAuth completes successfully on that URL.' Phase 7 Requirements include DEP-04 ('Google OAuth redirect URIs include production Vercel URL') and DEP-06 ('End-to-end manual test: sign up → add product → verify initial history row → manual cron trigger → verify alert email delivered'). The user explicitly flagged Vercel preview verification as out-of-scope for this Phase 2 session. Note: Phase 2 SC#5 also calls out this leg, so it is tracked as a gap above AND as deferred work — the gap closure happens naturally in Phase 7."
human_verification:
  - test: "Vercel preview OAuth smoke test"
    expected: "Pushing a branch to GitHub triggers a Vercel preview deploy. Visiting the preview URL, clicking Sign In → Continue with Google, completing the Google flow, and landing back on the preview URL with the DashboardShell visible — all without redirect_uri_mismatch or session-persistence errors. Reload the preview URL and confirm DashboardShell still renders (proxy session refresh)."
    why_human: "Requires deploying to Vercel (out-of-repo), completing a real Google OAuth redirect round-trip, and verifying cookies persist on a domain that does not exist at verification time. No automated check can exercise this without Playwright + a test Google account + a live preview URL — all out of scope per CLAUDE.md portfolio bar."
---

# Phase 2: Authentication & Landing Verification Report

**Phase Goal:** Users can sign in with Google OAuth, stay signed in across page loads, and see a contextually correct UI — the hero for logged-out visitors and a dashboard shell for authenticated users.
**Verified:** 2026-04-18
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A logged-out visitor sees the hero section with "Never miss a price drop" tagline, feature cards, and a Sign In button in the header | VERIFIED | `dealdrop/app/page.tsx:15` branches `{user ? <DashboardShell/> : <Hero/>}`; `dealdrop/src/components/hero/Hero.tsx:8` contains exact string `"Never miss a price drop"`; all 3 feature-card titles present (`Multi-site support`, `Instant email alerts`, `Price history`); `dealdrop/src/components/header/Header.tsx:14` renders `<SignInButton/>` when `user` is null |
| 2 | Clicking Sign In opens the Shadcn Dialog modal with a single "Continue with Google" button | VERIFIED | `dealdrop/src/components/auth/SignInButton.tsx:10` calls `openAuthModal()`; `dealdrop/src/components/auth/AuthModal.tsx:32-53` renders Shadcn `<Dialog open={isOpen} onOpenChange={setOpen}>` with exact copy `"Sign in to DealDrop"`, `"Sign in to start tracking prices"`, and a single `"Continue with Google"` button; `handleGoogleSignIn` calls `signInWithOAuth({ provider: 'google', options: { redirectTo: ${window.location.origin}/auth/callback } })` |
| 3 | After completing Google OAuth, the user is redirected to `/` and the page now shows the dashboard shell (not the hero) | VERIFIED | `dealdrop/app/auth/callback/route.ts:10-13` calls `exchangeCodeForSession(code)` and `NextResponse.redirect(${origin}/)` on success; `dealdrop/app/page.tsx:10-15` uses `supabase.auth.getUser()` (auth-server-verified, NOT `getSession()`) and branches to `<DashboardShell user={user}/>` when user exists; `dealdrop/src/components/dashboard/DashboardShell.tsx:11` renders `"Welcome back"` heading; human smoke test (Plan 02-04 Task 3) approved this leg on localhost. Session persistence confirmed via `dealdrop/proxy.ts:29` `await supabase.auth.getClaims()` with rebuilt `supabaseResponse` cookie propagation (AUTH-07) |
| 4 | Clicking Sign Out from the header ends the session and the page reverts to showing the hero | VERIFIED | `dealdrop/src/components/auth/SignOutButton.tsx:12` calls `signOut()` Server Action; `dealdrop/src/actions/auth.ts:6-9` awaits `supabase.auth.signOut()` then `redirect('/?signed_out=1')`; `dealdrop/src/components/auth/AuthToastListener.tsx:12-14` fires `toast.success('Signed out')` on `?signed_out=1` and `router.replace('/')`; page re-renders via RSC — `getUser()` now returns null, branches to `<Hero/>`. Human smoke test confirmed cookies cleared in DevTools |
| 5 | The full OAuth flow completes without errors on both localhost and a Vercel preview deployment | FAILED (partial) | Localhost leg VERIFIED via human smoke test (Plan 02-04 Task 3 — 14 steps + D-15 env recovery, user typed "approved"). Vercel preview leg NOT VERIFIED — user explicitly deferred to post-deploy manual check. No artifact records a preview-URL run. See gaps section. |

**Score:** 4/5 truths verified (1 partial/deferred)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | Vercel preview OAuth smoke test (SC #5 second leg) | Phase 7 (Polish & Deployment) | Phase 7 SC #1: "The app is live at a Vercel production URL with all env vars configured; Google OAuth completes successfully on that URL." Phase 7 requirements DEP-04 ("Google OAuth redirect URIs include production Vercel URL") and DEP-06 ("End-to-end manual test: sign up → add product → …") explicitly cover this. User acknowledged the deferral in the verification prompt. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dealdrop/components/ui/dialog.tsx` | Shadcn Dialog primitive | VERIFIED | Imports `Dialog as DialogPrimitive from "radix-ui"` (umbrella — Shadcn 4.3 pattern, functionally equivalent to `@radix-ui/react-dialog`); 10 named exports |
| `dealdrop/components/ui/card.tsx` | Shadcn Card primitive | VERIFIED | 7 named exports, imports `cn` from `@/lib/utils` |
| `dealdrop/components/ui/sonner.tsx` | Shadcn Sonner Toaster wrapper | VERIFIED | Line 11 `import { Toaster as Sonner, type ToasterProps } from "sonner"` |
| `dealdrop/proxy.ts` | Supabase session refresh | VERIFIED | `getClaims()`, `createServerClient`, `supabaseResponse` rebuild pattern, matcher from Phase 1 preserved |
| `dealdrop/app/auth/callback/route.ts` | OAuth code-exchange Route Handler | VERIFIED | `exchangeCodeForSession(code)`, origin-anchored redirect, `?auth_error=1` failure path |
| `dealdrop/supabase/config.toml` | Loopback URL uses http:// | VERIFIED | Line 156: `additional_redirect_urls = ["http://127.0.0.1:3000", "http://localhost:3000"]`. WR-03 from Phase 1 closed. |
| `dealdrop/src/actions/auth.ts` | signOut Server Action | VERIFIED | `'use server'` directive, `await supabase.auth.signOut()`, `redirect('/?signed_out=1')` |
| `dealdrop/src/components/auth/AuthModalProvider.tsx` | Provider + useAuthModal hook | VERIFIED | Exports `AuthModalProvider` + `useAuthModal`; context exposes `openAuthModal`, `setOpen`, `isOpen` (AUTH-04 hook contract for Phase 4) |
| `dealdrop/src/components/auth/AuthModal.tsx` | Shadcn Dialog with Google CTA | VERIFIED | All locked copy strings present verbatim; `redirectTo: ${window.location.origin}/auth/callback` |
| `dealdrop/src/components/auth/SignInButton.tsx` | Header Sign In button | VERIFIED | `variant="default"`, label `"Sign in"`, `onClick={openAuthModal}` |
| `dealdrop/src/components/auth/SignOutButton.tsx` | Header Sign Out button | VERIFIED | `variant="outline"`, labels `"Sign out"` / `"Signing out…"`, calls `signOut` from `@/actions/auth` |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | Query-string toast listener | VERIFIED | Imports `toast` from raw `sonner`; handles `signed_out=1` and `auth_error=1`; `router.replace('/')` cleans URL |
| `dealdrop/src/components/hero/Hero.tsx` | Hero RSC with locked copy | VERIFIED | All HERO-01/02/04 strings present verbatim; renders 3 FeatureCards with `Globe`, `BellRing`, `LineChart` icons |
| `dealdrop/src/components/hero/FeatureCard.tsx` | FeatureCard RSC | VERIFIED | `aria-hidden="true"` on icon, `text-primary` accent, Shadcn Card wrapper |
| `dealdrop/src/components/header/Header.tsx` | Header RSC with contextual auth | VERIFIED | `h-14`, wordmark `<span>` (not link), branches `{user ? <SignOutButton/> : <SignInButton/>}`; no `sticky`/`fixed` per D-14 |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | Placeholder for authed users | VERIFIED | `"Welcome back"` heading + placeholder copy; no Add Product form (deferred to Phase 4) |
| `dealdrop/app/page.tsx` | RSC auth gate | VERIFIED | `await createClient()`, `supabase.auth.getUser()` (NOT `getSession()`), branches Hero vs DashboardShell, passes `user` to Header |
| `dealdrop/app/layout.tsx` | Root layout wiring | VERIFIED | AuthModalProvider wraps `{children}`; Toaster with `position="top-center"` + `richColors`; AuthToastListener in `<Suspense fallback={null}>`; Phase 1 Geist fonts + DealDrop metadata preserved |
| `.planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md` | Ops checklist for OAuth redirect URIs | VERIFIED | 90 lines, contains Supabase project ref `vhlbdcsxccaknccawfdj`, Google + Supabase dashboard steps, troubleshooting table |
| `.planning/phases/02-authentication-landing/02-SMOKE-TEST.md` | Printable smoke test | VERIFIED | 111 lines, all 11 locked UI-SPEC copy strings present, D-15 negative-case included |
| `.planning/REQUIREMENTS.md` | POL-01 → Phase 2, AUTH-04 split | VERIFIED | Line 174: `AUTH-04 \| Phase 2 (hook) / Phase 4 (trigger)`; line 224: `POL-01 \| Phase 2`; D-07 and D-13 footnotes present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `proxy.ts` | `@supabase/ssr createServerClient` | `getAll`/`setAll` with rebuilt NextResponse | WIRED | Lines 8-27 — pattern matches Supabase SSR docs; `supabaseResponse` is `let` and rebuilt inside `setAll` (Pitfall 1 avoided) |
| `app/auth/callback/route.ts` | `@/lib/supabase/server createClient` | `await createClient()` + `exchangeCodeForSession(code)` | WIRED | Lines 2, 9-10 |
| `proxy.ts` | Next.js 16 pipeline | `export const config.matcher` + `export async function proxy` | WIRED | Lines 5, 34-38 — matcher regex byte-identical to Phase 1 lock |
| `AuthModal.tsx` | `@/lib/supabase/browser createClient` | `createClient().auth.signInWithOAuth` | WIRED | Lines 4, 22-28 |
| `AuthModal.tsx` | `@/components/ui/dialog` | Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription imports | WIRED | Lines 7-12 |
| `AuthModal.tsx` | `./AuthModalProvider useAuthModal` | `isOpen`/`setOpen` context consumption | WIRED | Line 17 — `const { isOpen, setOpen } = useAuthModal()` |
| `SignInButton.tsx` | `./AuthModalProvider openAuthModal` | `useAuthModal().openAuthModal` onClick | WIRED | Lines 3, 7, 10 |
| `SignOutButton.tsx` | `@/actions/auth signOut` | onClick handler | WIRED | Lines 5, 12 |
| `auth.ts` (Server Action) | `@/lib/supabase/server createClient` | `await createClient()` + `supabase.auth.signOut()` + `redirect('/?signed_out=1')` | WIRED | Lines 4, 7-9 |
| `AuthToastListener.tsx` | `sonner toast` | `toast.success` / `toast.error` | WIRED | Lines 5, 13, 17 |
| `app/page.tsx` | `@/lib/supabase/server createClient` | `await createClient().auth.getUser()` | WIRED | Lines 1, 7, 10 — uses `getUser()` (auth-server verified), NOT `getSession()` |
| `app/page.tsx` | `<Hero/>` | Conditional render when user is null | WIRED | Line 15 |
| `app/page.tsx` | `<DashboardShell/>` | Conditional render when user is truthy | WIRED | Line 15 |
| `app/page.tsx` | `<Header user={user}/>` | Passes user prop | WIRED | Line 14 |
| `Header.tsx` | `<SignInButton/>` | Rendered when user is null | WIRED | Lines 2, 14 |
| `Header.tsx` | `<SignOutButton/>` | Rendered when user is truthy | WIRED | Lines 3, 14 |
| `app/layout.tsx` | `AuthModalProvider` | Wraps `{children}` | WIRED | Lines 5, 35-37 |
| `app/layout.tsx` | `<Toaster/>` (Shadcn Sonner wrapper) | Mount with `position="top-center" richColors` | WIRED | Lines 4, 38 |
| `app/layout.tsx` | `AuthToastListener` | Suspense-wrapped mount | WIRED | Lines 3, 6, 39-41 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/page.tsx` | `user` | `await supabase.auth.getUser()` (Supabase Auth server) | Yes — network-verified JWT → User object or null | FLOWING |
| `Header.tsx` | `user` prop | Passed from `app/page.tsx` | Yes — flows from getUser() result | FLOWING |
| `AuthModal.tsx` | `isOpen` | `useAuthModal()` → React context state | Yes — state flips via `openAuthModal()` from SignInButton | FLOWING |
| `SignOutButton.tsx` | `isPending` | `useState(false)` → mutated by handleSignOut | Yes — local state for loading UX | FLOWING |
| `AuthToastListener.tsx` | `searchParams` | `useSearchParams()` from Next.js router | Yes — reads real URL query params | FLOWING |
| `DashboardShell.tsx` | `_user` | Passed from `app/page.tsx` but unused in v1 | N/A — placeholder, Phase 4 will render user fields | HOLLOW_PROP (intentional, documented in plan) |

**Note on DashboardShell HOLLOW_PROP:** Plan 02-04 explicitly specs `user: _user` rename for strict-mode unused-var compliance with intent to render user fields in Phase 4. This is a planned-forward stub, not verification debt.

### Behavioral Spot-Checks

Phase 2 produces a Next.js app that requires a running dev server + a real Supabase project + Google OAuth credentials to exercise end-to-end. Spot-checks here focus on what can be verified without running the server, since Plan 02-04 Task 3 already ran the full end-to-end smoke test and the user approved it.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| proxy.ts exports the `proxy` function and a valid matcher | `grep -E "^export async function proxy|^export const config" dealdrop/proxy.ts` | Both present (lines 5, 34) | PASS |
| /auth/callback exports GET handler | `grep -E "^export async function GET" dealdrop/app/auth/callback/route.ts` | Present (line 4) | PASS |
| signOut Server Action has 'use server' directive | `head -1 dealdrop/src/actions/auth.ts` | `'use server'` | PASS |
| AuthModalProvider is client component | `head -1 dealdrop/src/components/auth/AuthModalProvider.tsx` | `'use client'` | PASS |
| Hero contains all locked copy strings | `grep -c -E "Never miss a price drop\|Paste any product URL\|Multi-site support\|Instant email alerts\|Price history\|Made with love" dealdrop/src/components/hero/Hero.tsx` | 6 matches (all present) | PASS |
| AuthModal contains all locked copy strings | `grep -c -E "Sign in to DealDrop\|Sign in to start tracking prices\|Continue with Google" dealdrop/src/components/auth/AuthModal.tsx` | 3 matches (all present) | PASS |
| page.tsx uses getUser() not getSession() | `grep -c getSession dealdrop/app/page.tsx` | 0 matches (correct — uses getUser) | PASS |
| page.tsx scaffold fully removed | `grep -E "Create Next App\|Vercel Deploy Now" dealdrop/app/page.tsx` | No matches | PASS |
| AUTH-04 hook contract multiply-consumed (openAuthModal/useAuthModal) | `grep -rc "openAuthModal\|useAuthModal" dealdrop/src` | 10 matches across 3 files (Provider def + SignInButton + AuthModal) | PASS |
| Build + type check (per SUMMARY) | `npm run lint && npx tsc --noEmit && npm run build` | Per Plan 02-04 SUMMARY: all 3 exit 0; route tree includes `ƒ /`, `ƒ /auth/callback`, `ƒ Proxy (Middleware)` | PASS (recorded in SUMMARY) |
| Vercel preview OAuth smoke test | Deploy to Vercel preview, complete Google OAuth | Not run — explicitly deferred | SKIP — routed to human verification |
| Localhost OAuth end-to-end smoke test | Plan 02-04 Task 3: 14-step browser test | User typed `approved` after all 14 steps + D-15 env recovery | PASS (user-approved) |

### Requirements Coverage

Requirements declared across Phase 2 plans (aggregated from `requirements:` frontmatter fields):

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| AUTH-01 | 02-03, 02-04 | User can sign in with Google OAuth via Supabase Auth | SATISFIED | AuthModal.tsx signInWithOAuth + callback/route.ts exchangeCodeForSession + proxy.ts session refresh; localhost smoke test user-approved |
| AUTH-02 | 02-02 | `/auth/callback` Route Handler exchanges OAuth code for session and redirects to `/` | SATISFIED | callback/route.ts:10-13 |
| AUTH-03 | 02-03, 02-04 | Sign-in triggered by clicking "Sign In" button in the header | SATISFIED | Header.tsx:14 renders SignInButton; SignInButton.tsx:10 calls openAuthModal |
| AUTH-04 | 02-03, 02-05 (doc) | Sign-in triggered when user submits Add Product form while logged out (opens auth modal) | SATISFIED (hook only) | useAuthModal() hook exported from AuthModalProvider.tsx; AUTH-04 is formally split across Phase 2 (hook) / Phase 4 (trigger) per REQUIREMENTS.md footnote. Phase 2's half is complete. |
| AUTH-05 | 02-01, 02-03 | Auth modal is a Shadcn Dialog with a single "Continue with Google" button | SATISFIED | AuthModal.tsx uses `<Dialog>` from `@/components/ui/dialog`; single `<Button>` with label "Continue with Google" |
| AUTH-06 | 02-03, 02-04 | Authenticated user sees "Sign Out" button in header that ends the session | SATISFIED | Header.tsx:14 renders SignOutButton when user present; SignOutButton.tsx + actions/auth.ts + AuthToastListener.tsx full round-trip; user-approved smoke test step 9 |
| AUTH-07 | 02-02 | `proxy.ts` refreshes Supabase session cookies on every request | SATISFIED | proxy.ts:5-31 real body with getAll/setAll pattern; smoke test step 7 confirmed session persists across reload |
| AUTH-08 | 02-05 (doc) | OAuth redirect URIs registered in Google Cloud Console + Supabase Auth dashboard | SATISFIED (doc-level) + NEEDS HUMAN (runtime) | AUTH-08-OPS-CHECKLIST.md documents URIs; user must run checklist in external dashboards. User-approved localhost smoke test implies they completed the checklist for localhost. Vercel preview portion still open (see gap). |
| HERO-01 | 02-04 | Logged-out visitors see hero with tagline + subtitle | SATISFIED | Hero.tsx:7-13 — locked copy |
| HERO-02 | 02-01, 02-04 | Responsive grid of feature cards | SATISFIED | Hero.tsx:14-30 — 3 FeatureCards in `grid-cols-1 sm:grid-cols-3` |
| HERO-03 | 02-04 | Header always visible with logo and contextual Sign In / Sign Out | SATISFIED | Header.tsx — wordmark `<span>` + contextual auth button |
| HERO-04 | 02-04 | "Made with love" credit line | SATISFIED | Hero.tsx:31-33 |
| HERO-05 | 02-04 | Responsive from mobile (320px) to desktop | SATISFIED | Hero.tsx uses `sm:text-5xl`, `grid-cols-1 sm:grid-cols-3`; Header uses `px-4 sm:px-6 lg:px-8`; user-approved smoke test step 12 confirmed <640px stacking |
| POL-01 | 02-01, 02-04, 02-05 (doc) | Sonner toast provider mounted in root layout | SATISFIED | `<Toaster position="top-center" richColors />` in app/layout.tsx:38. Moved forward from Phase 7 per D-13; REQUIREMENTS.md updated. |

**Declared requirements: 14 total. Coverage: 14/14 SATISFIED.** AUTH-04 marked SATISFIED for its Phase 2 half; Phase 4 will complete the second half (trigger from Add Product form).

**Orphan check:** REQUIREMENTS.md Traceability maps exactly AUTH-01..08, HERO-01..05, and POL-01 to Phase 2 — same 14 IDs the plans declare. No orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `dealdrop/src/components/auth/AuthModal.tsx` | 20-29 | `await signInWithOAuth(...)` with `{ error }` discarded — WR-01 | Warning | Loading state strands on pre-redirect failure; no toast, no retry |
| `dealdrop/src/actions/auth.ts` | 6-10 | `await supabase.auth.signOut()` with `{ error }` discarded — WR-02 | Warning | Failed sign-out redirects to success path with stale cookies |
| `dealdrop/app/layout.tsx` | 35-41 | AuthToastListener is sibling of AuthModalProvider, not child — WR-03 | Warning | Structural — blocks listener from calling useAuthModal() for future auth-error modal UX |
| `dealdrop/proxy.ts` | 34-38 | Matcher does not exclude `/auth/callback` — WR-04 | Warning | Cookie race: proxy runs getClaims() + setAll BEFORE Route Handler runs exchangeCodeForSession() — documented failure mode per Supabase SSR docs |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | 7 | `user: _user` unused binding — IN-04 | Info | Intentional per plan (Phase 4 will consume); add a TODO comment pointing at Phase 4 |
| `dealdrop/src/components/hero/Hero.tsx` | 31-33 | `"Made with love"` marketing blurb — IN-05 | Info | Copy is locked by UI-SPEC Copywriting Contract D-05; reviewer flags as potentially unprofessional but it is the locked value |
| `dealdrop/supabase/config.toml` | 175 | `[auth.email] enable_signup = true` + `minimum_password_length = 6` — IN-06 | Info | CLAUDE.md pins auth to Google OAuth only; local Supabase config drift. Non-blocking; only affects local dev container |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | 11-20 | Effect could re-fire on searchParams updates in Strict Mode — IN-03 | Info | Edge case; `router.replace('/')` in same effect mostly prevents it |
| `dealdrop/src/components/auth/AuthToastListener.tsx` | 14, 18 | `router.replace('/')` drops ALL query params — IN-02 | Info | Today no other query params exist on `/`; future flows adding `?ref=` etc. would be silently stripped |
| `dealdrop/src/components/auth/AuthModal.tsx` | 22 | `createClient()` re-invoked per render — IN-01 | Info | Browser Supabase client is cheap; minor perf opportunity |

**Blocker count:** 0. **Warning count:** 4 (all from 02-REVIEW.md — tracked as gaps above). **Info count:** 6.

### Human Verification Required

#### 1. Vercel preview OAuth smoke test

**Test:**
1. Push a branch to GitHub to trigger a Vercel preview deployment (or use the existing preview URL if one is deployed).
2. Visit the preview URL (e.g. `https://dealdrop-<hash>.vercel.app`).
3. Verify Hero + Header render with Sign In button.
4. Click Sign In → modal opens with "Continue with Google" button.
5. Click Continue with Google → redirects through Google → lands back on the preview URL with DashboardShell visible.
6. Reload the preview URL → DashboardShell persists (session refresh via proxy.ts on Vercel's edge).
7. Click Sign Out → Hero returns + "Signed out" toast fires.

**Expected:** Full round-trip completes without `redirect_uri_mismatch`, without session loss on reload, without any console errors. Cookies visible in DevTools during authed state; cleared after sign-out.

**Why human:** Requires a deployed Vercel environment (out-of-repo), a real Google account, a working Supabase Auth Dashboard registration for the `*.vercel.app` wildcard (or the specific preview URL), and a working browser session — none of which can be automated at portfolio bar (per 02-RESEARCH.md Validation Architecture). This closes the Phase 2 Roadmap Success Criterion #5 second leg.

### Gaps Summary

**Two gap clusters:**

**Gap 1 — Vercel preview verification.** Phase 2 Roadmap Success Criterion #5 requires OAuth completeness on BOTH localhost and Vercel preview. Localhost is user-approved. Vercel preview is explicitly deferred by the user for this session. Phase 7 (Polish & Deployment) covers it formally via DEP-04 + DEP-06 and Phase 7 SC #1, so this deferral is tracked in the roadmap and not a surprise. Marked as a gap AND as deferred; it does not need to be closed inside Phase 2 but SHOULD be tracked so Phase 7 does not drop it.

**Gap 2 — Code review verification debt (WR-01..WR-04).** Four warnings from 02-REVIEW.md describe real failure-mode gaps and a cookie-race risk. None blocked the happy-path smoke test (all 14 steps + D-15 env recovery passed). All four are recoverable with small, localized edits:

- WR-01 (AuthModal.tsx): 4-line handler change — capture + toast on error
- WR-02 (auth.ts Server Action): 2-line change — branch on error to `/?auth_error=1`
- WR-03 (layout.tsx): move listener inside provider — 3-line structural move
- WR-04 (proxy.ts): add `auth/callback` to matcher negative-lookahead — 1-line regex change

These are appropriate for a focused `/gsd-plan-phase --gaps` pass or a follow-up polish phase. If the team accepts the current happy-path behavior and defers error-path hardening to a later polish phase, those can be migrated to overrides with an explicit `accepted_by` entry.

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

*Verified: 2026-04-18*
*Verifier: Claude (gsd-verifier)*
