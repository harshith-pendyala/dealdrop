---
phase: 02-authentication-landing
fixed_at: 2026-04-18T00:00:00Z
review_path: .planning/phases/02-authentication-landing/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** `.planning/phases/02-authentication-landing/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (critical + warning only; 6 Info findings deferred by scope)
- Fixed: 4
- Skipped: 0

All four Warning-level findings were applied cleanly. Each fix was verified with `npx tsc --noEmit` (no errors reported) before commit. No Critical findings existed in the source review.

## Fixed Issues

### WR-01: `handleGoogleSignIn` swallows `signInWithOAuth` errors and strands the button in a loading state

**Files modified:** `dealdrop/src/components/auth/AuthModal.tsx`
**Commit:** f50ef04
**Applied fix:**
- Added `import { toast } from 'sonner'` at module scope.
- Destructured `{ error }` from the `supabase.auth.signInWithOAuth(...)` response.
- On error, surfaced `toast.error('Could not start Google sign-in. Please try again.')` and reset `setIsLoading(false)` so the user can retry.
- On success, left `isLoading=true` with an explanatory comment — the browser is navigating away and the button should stay disabled during the redirect.

### WR-02: `signOut` Server Action redirects with `?signed_out=1` even when `signOut()` fails

**Files modified:** `dealdrop/src/actions/auth.ts`
**Commit:** d051d31
**Applied fix:**
- Destructured `{ error }` from `supabase.auth.signOut()`.
- On error, redirect to `/?auth_error=1` so `AuthToastListener` shows the existing error toast instead of a misleading "Signed out" success.
- On success, keep the existing redirect to `/?signed_out=1`.

### WR-03: `AuthToastListener` is mounted outside `AuthModalProvider`

**Files modified:** `dealdrop/app/layout.tsx`
**Commit:** c6653ae
**Applied fix:**
- Moved `<Suspense fallback={null}><AuthToastListener /></Suspense>` inside `<AuthModalProvider>` as a sibling of `{children}` (still Suspense-wrapped to satisfy Next 16's `useSearchParams` requirement).
- Kept `<Toaster />` outside the provider (portal-hosted, no modal context needed).
- `Suspense` import was already present in the file, so no additional imports were required.

### WR-04: `proxy.ts` matcher lets `/auth/callback` run the proxy before the code exchange

**Files modified:** `dealdrop/proxy.ts`
**Commit:** 6b6b433
**Applied fix:**
- Inserted `auth/callback` into the negative lookahead in the matcher regex so the proxy no longer runs on the OAuth callback path. This prevents the documented Supabase SSR cookie race where proxy `setAll` can clobber `Set-Cookie` headers emitted by `exchangeCodeForSession`.
- Final matcher: `/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)`.

## Skipped Issues

None.

## Deferred (out of scope)

The following Info-level findings were not addressed per the `critical_warning` fix scope. They remain documented in `02-REVIEW.md` for the developer's discretion:

- IN-01: memoise `createClient()` in `AuthModal` — polish.
- IN-02: preserve unrelated query params in `AuthToastListener.router.replace('/')` — defensive.
- IN-03: guard against duplicate toasts under Strict Mode — defensive.
- IN-04: add TODO for `_user` destructure in `DashboardShell` — docs.
- IN-05: replace "Made with love" blurb — copy.
- IN-06: disable local email signup in `supabase/config.toml` — config drift.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
