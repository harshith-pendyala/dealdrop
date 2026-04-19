---
phase: 02-authentication-landing
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - dealdrop/app/auth/callback/route.ts
  - dealdrop/app/layout.tsx
  - dealdrop/app/page.tsx
  - dealdrop/proxy.ts
  - dealdrop/src/actions/auth.ts
  - dealdrop/src/components/auth/AuthModal.tsx
  - dealdrop/src/components/auth/AuthModalProvider.tsx
  - dealdrop/src/components/auth/AuthToastListener.tsx
  - dealdrop/src/components/auth/SignInButton.tsx
  - dealdrop/src/components/auth/SignOutButton.tsx
  - dealdrop/src/components/dashboard/DashboardShell.tsx
  - dealdrop/src/components/header/Header.tsx
  - dealdrop/src/components/hero/FeatureCard.tsx
  - dealdrop/src/components/hero/Hero.tsx
  - dealdrop/supabase/config.toml
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 2 delivers the Google OAuth landing/auth flow (proxy session refresh, `/auth/callback` Route Handler, Shadcn Dialog auth modal, `getUser`-gated homepage, Sonner toasts). Overall, the implementation follows the Supabase SSR docs cleanly:

- `createClient` in `src/lib/supabase/server.ts` correctly awaits `cookies()` for Next 16 and swallows the write-from-RSC error with a comment pointing at the proxy.
- `page.tsx` uses `supabase.auth.getUser()` (network-verified) rather than `getSession()` for the gate — this is the right call.
- `AuthToastListener` is wrapped in `<Suspense fallback={null}>` inside `layout.tsx`, which satisfies Next 16's requirement for `useSearchParams` consumers.
- `/auth/callback` redirects only to `origin` derived from `request.url`, so there's no open-redirect surface.
- CSRF on the Server Action (`signOut`) is handled by Next's built-in Origin check — no additional token wiring needed.

No **Critical** issues were found. Findings cluster around (a) silent failure paths in the OAuth initiation handler and sign-out action, (b) a subtle Suspense-boundary gap now that `AuthToastListener` lives outside `AuthModalProvider` (doesn't affect correctness today but is worth noting), and (c) a few quality/DX nits.

## Warnings

### WR-01: `handleGoogleSignIn` swallows `signInWithOAuth` errors and strands the button in a loading state

**File:** `dealdrop/src/components/auth/AuthModal.tsx:20-29`
**Issue:** The handler `await`s `supabase.auth.signInWithOAuth(...)` but discards the returned `{ data, error }`. If the call fails before the browser is redirected (network error, blocked popup, provider config error), the user sees a spinning button with no feedback and no way to retry without reloading. Under TS strict this is also a missed chance to surface the error via the existing Sonner toaster.
**Fix:**
```tsx
async function handleGoogleSignIn() {
  setIsLoading(true)
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) {
    toast.error('Could not start Google sign-in. Please try again.')
    setIsLoading(false)
  }
  // On success the browser is navigating away; leave isLoading=true so the
  // button stays disabled during the redirect.
}
```

### WR-02: `signOut` Server Action redirects with `?signed_out=1` even when `signOut()` fails

**File:** `dealdrop/src/actions/auth.ts:6-10`
**Issue:** The action awaits `supabase.auth.signOut()` but ignores its `{ error }` return. If sign-out fails (e.g., revoked refresh token, Supabase outage), the user is redirected with `?signed_out=1`, `AuthToastListener` shows a success toast, yet the session cookies may still be valid and the next navigation will render them as signed in — a confusing inconsistency. Sign-out should be treated as a safety-critical path.
**Fix:**
```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    redirect('/?auth_error=1')
  }
  redirect('/?signed_out=1')
}
```

### WR-03: `AuthToastListener` is mounted outside `AuthModalProvider`, so it can't surface auth errors into the modal

**File:** `dealdrop/app/layout.tsx:34-42`
**Issue:** `<AuthToastListener />` is mounted as a sibling of `<AuthModalProvider>` inside `<body>`. Today that's fine because the listener only fires toasts, but the layout's structure means the listener cannot call `useAuthModal()` if you ever want to reopen the modal on `auth_error=1` (a common UX for "sign-in failed, try again"). Since the modal provider already wraps `{children}`, moving the listener inside it costs nothing and keeps future wiring simple. This is a structural warning, not a bug in the current code.
**Fix:**
```tsx
<AuthModalProvider>
  {children}
  <Suspense fallback={null}>
    <AuthToastListener />
  </Suspense>
</AuthModalProvider>
<Toaster position="top-center" richColors />
```

### WR-04: `proxy.ts` matcher lets `/auth/callback` run the proxy before the code exchange

**File:** `dealdrop/proxy.ts:34-38`
**Issue:** The matcher excludes static assets only, so a request to `/auth/callback?code=...` first enters the proxy, which calls `supabase.auth.getClaims()` before the Route Handler runs `exchangeCodeForSession(code)`. On a fresh callback the user has no session yet, so `getClaims()` is a wasted call and — more importantly — the proxy's `setAll` may emit `Set-Cookie` headers (e.g. clearing malformed cookies) that get combined with the handler's own `Set-Cookie` for the new session. This is the exact race the Supabase SSR docs warn about. Skipping the proxy for the OAuth callback is the documented fix.
**Fix:**
```ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
}
```
(If you intentionally want the proxy to run on the callback for other middleware reasons, document the decision and verify that `setAll` doesn't overwrite cookies produced by `exchangeCodeForSession`.)

## Info

### IN-01: `AuthModal` imports `createClient` on every render via `createClient()` inside the handler

**File:** `dealdrop/src/components/auth/AuthModal.tsx:22`
**Issue:** `const supabase = createClient()` runs inside the click handler. This is fine (the browser client is cheap to construct), but every render path re-imports `@/lib/supabase/browser`. Consider lifting it to module scope or memoising with `useMemo` once you add more auth flows.
**Fix:** `const supabase = useMemo(() => createClient(), [])` at component top.

### IN-02: `AuthToastListener` uses `router.replace('/')` which also drops any legitimate query params

**File:** `dealdrop/src/components/auth/AuthToastListener.tsx:14,18`
**Issue:** After showing the toast, the listener navigates to `/`, which strips every query param — not just `signed_out` / `auth_error`. If a future flow adds `?ref=`, `?trackingId=`, etc., they'll be silently discarded. Consider rebuilding the URL with only the auth flags removed.
**Fix:**
```ts
const params = new URLSearchParams(searchParams.toString())
params.delete('signed_out')
params.delete('auth_error')
const qs = params.toString()
router.replace(qs ? `/?${qs}` : '/')
```

### IN-03: `AuthToastListener` re-runs toasts on every `searchParams` change

**File:** `dealdrop/src/components/auth/AuthToastListener.tsx:11-20`
**Issue:** If `searchParams` updates while `signed_out=1` or `auth_error=1` is still present (edge case: external `history.pushState`), the effect fires the toast again. `router.replace('/')` in the same effect normally prevents this, but it's worth guarding to prevent duplicate toasts on double-render in Strict Mode.
**Fix:** Cache the processed flag in a ref or combine both branches into a single if/else so you never re-enter after the replace.

### IN-04: `DashboardShell` destructures `user` only to discard it with `_user`

**File:** `dealdrop/src/components/dashboard/DashboardShell.tsx:7`
**Issue:** The `user: _user` rename documents intent but leaves an unused binding that ESLint (`@typescript-eslint/no-unused-vars` with the leading-underscore exception) will accept silently. Since the component already has the prop typed for future use, this is fine for now — just leave a TODO pointing at when you'll render the username/avatar so the placeholder doesn't rot.
**Fix:** Add `// TODO(AUTH-??): render user.user_metadata.full_name / avatar_url` alongside the destructure, or drop the prop entirely until needed.

### IN-05: `Hero` and `FeatureCard` contain a non-functional marketing blurb ("Made with love")

**File:** `dealdrop/src/components/hero/Hero.tsx:31-33`
**Issue:** The footer `<p>` reads `Made with love`. It is not a bug, but it's the kind of string that reviewers will flag as unprofessional on a portfolio site. Consider replacing with `Made by <your-name>` or removing entirely. (Flagged because CLAUDE.md states the bar is "portfolio/demo quality … presentable UI.")
**Fix:** Replace with author attribution or remove.

### IN-06: `supabase/config.toml` has `[auth] minimum_password_length = 6` even though the project uses Google OAuth only

**File:** `dealdrop/supabase/config.toml:175`
**Issue:** CLAUDE.md pins auth to "Google OAuth only — no password UX". The local config still allows email/password sign-up (`[auth.email] enable_signup = true`) and defines a weak minimum password length. This only affects the local Supabase container, but it's a configuration drift that could confuse future contributors. Consider disabling email sign-up locally to mirror production:
```toml
[auth.email]
enable_signup = false
```
Not strictly a bug — flagged as Info because it documents intent.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
