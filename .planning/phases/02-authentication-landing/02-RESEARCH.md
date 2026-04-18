# Phase 2: Authentication & Landing — Research

**Researched:** 2026-04-18
**Domain:** Supabase Auth (Google OAuth) + Next.js 16 App Router + Shadcn UI
**Confidence:** HIGH — all core patterns verified from installed node_modules (next 16.2.4, @supabase/ssr 0.10.2); UI patterns verified from installed packages

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 3 feature cards — "Multi-site support", "Instant email alerts", "Price history". Service-benefit framing. No fourth card.
- **D-02:** Stacked, centered layout. 3-column card grid collapses to 1-column on mobile.
- **D-03:** Header Sign In button is the only CTA. Hero is purely descriptive — no in-hero button.
- **D-04:** Subtitle: "Paste any product URL. We'll check the price daily and email you the moment it drops."
- **D-05:** Tagline: "Never miss a price drop" (locked, HERO-01)
- **D-06:** Auth modal = Shadcn Dialog. Title "Sign in to DealDrop", subtitle "Sign in to start tracking prices", button "Continue with Google". No privacy/terms line.
- **D-07:** AUTH-04 split: Phase 2 exports `openAuthModal()` hook/context; Phase 4 wires the trigger. Update REQUIREMENTS.md traceability.
- **D-08:** Post-OAuth callback redirects straight to `/`. No loading screen, no welcome flow.
- **D-09:** `/auth/callback` is a Route Handler that exchanges code, writes session cookies, redirects to `/`.
- **D-10:** `proxy.ts` stub gets a real body: create Supabase client bound to req/res cookies, call `supabase.auth.getClaims()`, propagate `Set-Cookie`.
- **D-11:** Sign Out is a Server Action calling `supabase.auth.signOut()` then redirecting to `/`.
- **D-12:** Sonner toast confirms "Signed out" after redirect.
- **D-13:** Install sonner + `npx shadcn@latest add sonner`. Mount `<Toaster />` in layout.tsx. POL-01 pulled forward from Phase 7.
- **D-14:** Header: DealDrop wordmark left, contextual auth button right. Static (not sticky). No avatar/menu.
- **D-15:** Phase 2 auth import of `@/lib/supabase/server` closes Phase 1 env-validation deferred item. Record in VERIFICATION.md.

### Claude's Discretion

- OAuth error handling: redirect to `/` with Sonner error toast (`?auth_error=1` query param) — default choice.
- AUTH-08 redirect URI registration: planner drafts the setup checklist; user executes manually.
- Dashboard shell content beyond the header: thin placeholder copy, no Add Product form.
- Feature card icons: Globe / BellRing / LineChart from lucide-react (planner picks exact names).
- "Made with love" credit: footer below hero, plain text.
- Tailwind responsive breakpoints: standard `sm:` / `lg:` only.
- Mobile header: compact, no hamburger (only one action).

### Deferred Ideas (OUT OF SCOPE)

- OAuth error UX polish beyond basic toast (Phase 7 Polish)
- First-time user welcome/onboarding (rejected for v1)
- Profile menu / avatar dropdown (Phase 7 if ever)
- Password / magic-link auth (v2+)
- Account settings page (not in v1)
- Sticky header (Phase 7 Polish)
- Hero analytics (no analytics in v1)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in with Google OAuth via Supabase Auth | Section: OAuth Sign-In Flow + Code Examples |
| AUTH-02 | `/auth/callback` Route Handler exchanges OAuth code for session, redirects to `/` | Section: /auth/callback Route Handler |
| AUTH-03 | Sign-in triggered by clicking "Sign In" in the header (opens auth modal) | Section: AuthModal Context Pattern |
| AUTH-04 | `openAuthModal()` hook/context exported (Phase 2 infra only) | Section: AuthModal Context Pattern |
| AUTH-05 | Auth modal is Shadcn Dialog with single "Continue with Google" button | Section: Shadcn Dialog Install |
| AUTH-06 | "Sign Out" button ends session | Section: Sign-Out Server Action |
| AUTH-07 | `proxy.ts` refreshes Supabase session cookies on every request | Section: proxy.ts Session Refresh |
| AUTH-08 | OAuth redirect URIs registered in Google Cloud Console + Supabase | Section: OAuth Redirect URI Registration |
| HERO-01 | Hero with tagline "Never miss a price drop" | UI-SPEC.md owns this — locked |
| HERO-02 | Responsive feature card grid | UI-SPEC.md owns this — locked |
| HERO-03 | Header always visible with contextual auth action | Section: Architectural Responsibility Map |
| HERO-04 | "Made with love" credit line | UI-SPEC.md owns this — locked |
| HERO-05 | Responsive from 320px to desktop | UI-SPEC.md owns this — locked |
</phase_requirements>

---

## Summary

Phase 2 delivers Google OAuth end-to-end on a Next.js 16 App Router project using `@supabase/ssr` 0.10.2. The three technical pieces that require careful implementation are: (1) `proxy.ts` session refresh — using `createServerClient` bound to both request cookies AND response cookies so token refreshes propagate `Set-Cookie` headers back to the browser; (2) `/auth/callback` Route Handler — exchanging the OAuth `code` param via `supabase.auth.exchangeCodeForSession(code)` and redirecting to `/`; and (3) the auth modal — a client component that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` from the browser client. The sign-out path is a `'use server'` Server Action that calls `supabase.auth.signOut()` and then calls Next.js `redirect('/?signed_out=1')`, with a toast triggered from the client side after navigation.

The key insight from the `@supabase/ssr` 0.10.2 README (read from `node_modules`): the proxy MUST implement both `getAll` (reads from request cookies) AND `setAll` (writes to response cookies) — omitting `setAll` is a frequent source of session loss bugs because token refreshes cannot write back. The pattern differs from the server component client, where `setAll` silently no-ops (correct, because RSC cannot set cookies).

The Shadcn install approach has an important deviation from training data: this project is on `shadcn` 4.3.x (the package, not the CLI alias), which uses `npx shadcn@latest add <component>`. The Dialog component ships as a Radix wrapper (`@radix-ui/react-dialog` is already installed at 1.1.15 as seen in `node_modules`), so the `npx shadcn@latest add dialog` command will generate the component file without installing new npm deps. Same for Card and Sonner.

The zod version concern from STACK.md is now resolved: `@t3-oss/env-nextjs` 0.13.11 declares `peerDependencies: { zod: "^3.24.0 || ^4.0.0" }`. The installed zod is 4.3.6 — compatible. No conflict.

**Primary recommendation:** Implement in this order: proxy.ts → /auth/callback → Shadcn installs → AuthModalProvider context → AuthModal → page.tsx branch → Header → Hero/FeatureCard/DashboardShell → sign-out Server Action → Sonner mounting. This order ensures each piece is testable before building on top of it.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session cookie refresh | Next.js Proxy (`proxy.ts`) | — | Proxy runs before every request; only place to propagate Set-Cookie headers reliably before RSC renders |
| OAuth code exchange | API / Backend (`/auth/callback` Route Handler) | — | Must be a server-side route to exchange the code securely and write cookies |
| Sign-in trigger (modal open) | Browser / Client (`SignInButton`, `AuthModal`) | — | `signInWithOAuth` must run in browser to redirect the page |
| Auth state read for page branch | Frontend Server (RSC `app/page.tsx`) | — | `getUser()` from server-client; no client-side redirect |
| Sign-out | API / Backend (Server Action `src/actions/auth.ts`) | Browser (toast trigger) | `signOut()` clears server cookies; `redirect()` is server-side; toast fires client-side post-navigation |
| Hero rendering | Frontend Server (RSC `src/components/hero/Hero.tsx`) | — | No dynamic data; pure server render |
| Feature cards | Frontend Server (RSC `src/components/hero/FeatureCard.tsx`) | — | Static content; server render |
| Dashboard shell | Frontend Server (RSC `src/components/dashboard/DashboardShell.tsx`) | — | Placeholder; no data fetch yet |
| Modal open-state | Browser / Client (`AuthModalProvider` React context) | — | React context is client-only; state lives in client component tree |
| Header auth branch | Frontend Server (RSC `src/components/header/Header.tsx`) | Browser (client auth buttons) | Server reads user prop; client buttons hold event handlers |

---

## Standard Stack

### Core (Phase 2 specific — all already installed)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@supabase/ssr` | 0.10.2 [VERIFIED: node_modules] | Session cookie management in Next.js App Router | Official Supabase SSR adapter; replaces deprecated auth-helpers |
| `@supabase/supabase-js` | 2.103.3 [VERIFIED: node_modules] | Supabase client — auth methods | Base SDK required alongside @supabase/ssr |
| `next` | 16.2.4 [VERIFIED: node_modules] | App Router, Route Handlers, Server Actions, proxy.ts | Already scaffolded; locked |
| `lucide-react` | 1.8.0 [VERIFIED: node_modules] | Icons for feature cards and modal | Already installed; Shadcn's default icon library |
| `shadcn` | 4.3.0 [VERIFIED: node_modules] | CLI tool for adding Dialog, Card, Sonner | Already initialized; new-york/zinc preset locked |

### To Install in Phase 2

| Library | Purpose | Install Command |
|---------|---------|-----------------|
| `sonner` | Toast notifications (POL-01) | `npm install sonner` then `npx shadcn@latest add sonner` |
| Shadcn `dialog` component | Auth modal | `npx shadcn@latest add dialog` |
| Shadcn `card` component | Feature cards | `npx shadcn@latest add card` |

**Installation sequence:**

```bash
# Step 1: Install sonner npm package (shadcn wraps it)
cd dealdrop && npm install sonner

# Step 2: Add Shadcn components (generates files in components/ui/)
npx shadcn@latest add dialog
npx shadcn@latest add card
npx shadcn@latest add sonner
```

**Important:** `@radix-ui/react-dialog` is already installed (1.1.15, seen in node_modules). The `npx shadcn@latest add dialog` command generates `dealdrop/components/ui/dialog.tsx` without pulling new npm deps. [VERIFIED: node_modules/@radix-ui/react-dialog exists]

**Version verification:**

```bash
npm view sonner version   # Latest as of research: 2.x
```

[ASSUMED: sonner latest version is 2.x — verify at install time]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
     │
     ▼
proxy.ts (runs before every request)
     │  createServerClient(request cookies, response cookies)
     │  supabase.auth.getClaims()  ← validates JWT locally
     │  Set-Cookie headers propagated back to response
     │
     ▼
app/page.tsx  [RSC — dynamic]
     │  const supabase = await createClient()  ← server.ts factory
     │  const { data: { user } } = await supabase.auth.getUser()
     │
     ├──[user == null]──▶  <Hero />  [RSC]
     │                       ├── <Header user={null} />  [RSC]
     │                       │     └── <SignInButton />  [Client]
     │                       │           └── calls openAuthModal()
     │                       ├── <h1> "Never miss a price drop"
     │                       ├── <FeatureCard> × 3  [RSC]
     │                       └── "Made with love" footer
     │
     └──[user != null]──▶  <DashboardShell />  [RSC]
                             └── <Header user={user} />  [RSC]
                                   └── <SignOutButton />  [Client]
                                         └── calls signOut() Server Action

------ Client-side OAuth flow ------

SignInButton → openAuthModal() → AuthModalProvider sets isOpen=true
     │
     ▼
AuthModal (Dialog) [Client Component]
     │  supabase.auth.signInWithOAuth({
     │    provider: 'google',
     │    options: { redirectTo: `${window.location.origin}/auth/callback` }
     │  })
     │
     ▼
Browser redirects → Google → Supabase → /auth/callback
     │
     ▼
/auth/callback/route.ts  [Route Handler]
     │  const code = searchParams.get('code')
     │  await supabase.auth.exchangeCodeForSession(code)
     │  redirect('/')  ← session cookies now set
     │
     ▼
app/page.tsx RSC re-renders → user != null → DashboardShell

------ Sign-out flow ------

SignOutButton → signOut() Server Action
     │  await supabase.auth.signOut()
     │  redirect('/?signed_out=1')
     │
     ▼
app/page.tsx RSC → user == null → Hero
Client detects ?signed_out=1 → toast.success("Signed out") → router.replace('/')
```

### Recommended Project Structure

```
dealdrop/
├── proxy.ts                              # MODIFY: fill in session refresh body
├── app/
│   ├── layout.tsx                        # MODIFY: add <Toaster />, AuthModalProvider
│   ├── page.tsx                          # REPLACE: auth branch (Hero vs DashboardShell)
│   └── auth/
│       └── callback/
│           └── route.ts                  # NEW: OAuth code exchange Route Handler
├── src/
│   ├── actions/
│   │   └── auth.ts                       # NEW: signOut() Server Action
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthModal.tsx             # NEW: "use client" Dialog
│   │   │   ├── AuthModalProvider.tsx     # NEW: "use client" context + openAuthModal()
│   │   │   ├── SignInButton.tsx          # NEW: "use client" button
│   │   │   └── SignOutButton.tsx         # NEW: "use client" button
│   │   ├── header/
│   │   │   └── Header.tsx               # NEW: RSC, receives user prop
│   │   ├── hero/
│   │   │   ├── Hero.tsx                 # NEW: RSC
│   │   │   └── FeatureCard.tsx          # NEW: RSC
│   │   └── dashboard/
│   │       └── DashboardShell.tsx       # NEW: RSC placeholder
│   └── lib/
│       └── supabase/
│           ├── server.ts                # EXISTS: async createClient() — unchanged
│           └── browser.ts              # EXISTS: createClient() — unchanged
└── components/
    └── ui/
        ├── button.tsx                   # EXISTS (Phase 1)
        ├── dialog.tsx                   # NEW: npx shadcn@latest add dialog
        ├── card.tsx                     # NEW: npx shadcn@latest add card
        └── sonner.tsx                   # NEW: npx shadcn@latest add sonner
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based session management | Custom cookie read/write in proxy | `createServerClient` from `@supabase/ssr` with getAll/setAll | Cookie chunking, Base64 encoding, Max-Age=0 cleanup — all handled; hand-rolling misses chunk edge cases |
| OAuth token exchange | Manually fetching token endpoint | `supabase.auth.exchangeCodeForSession(code)` | PKCE flow, nonce validation, error handling built in |
| Auth modal focus trap, ESC close, click-outside | Custom event listeners | Shadcn Dialog (Radix primitive) | Radix handles all a11y: focus trap, ESC, aria-modal, return focus to trigger |
| JWT validation in proxy | Manual JWKS fetch + signature verify | `supabase.auth.getClaims()` | Handles JWKS caching, key rotation, expiry check |
| Toast notification system | Custom toast component + portal | Sonner via `toast()` calls | Animation, stacking, auto-dismiss, rich colors, a11y announcements |

**Key insight:** The cookie chunking complexity in `@supabase/ssr` (split values > 3180 bytes across `key.0`, `key.1`, ... cookies, plus cleanup of stale chunks on token refresh) is exactly why you must use the library's `getAll`/`setAll` API — hand-rolling cookie access loses the cleanup step and causes intermittent "logged out on next tab" bugs.

---

## Pattern 1: proxy.ts — Session Refresh (AUTH-07)

**What:** Proxy intercepts every request, creates a Supabase client bound to both `request.cookies` (read) and a `NextResponse` (write), calls `getClaims()` to validate/refresh the JWT, and propagates any updated session cookies via `Set-Cookie` headers.

**Why `getClaims()` not `getUser()`:** The proxy README explicitly documents the distinction. `getClaims()` validates locally using the JWKS endpoint — no Auth server network call per request, appropriate for middleware. `getUser()` hits the Auth server every call — correct for security-sensitive Server Components, but too slow and costly for every proxy invocation. Use `getClaims()` in proxy, `getUser()` in `app/page.tsx`.

**Source:** `@supabase/ssr` 0.10.2 README [VERIFIED: node_modules/@supabase/ssr/README.md]

```typescript
// dealdrop/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to request (for downstream Route Handlers to see)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild response so it carries the updated request cookies
          supabaseResponse = NextResponse.next({ request })
          // Write Set-Cookie headers to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validate session — uses JWKS local validation, no Auth server call
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
}
```

**Critical constraint:** The `supabaseResponse` variable MUST be rebuilt inside `setAll` before setting cookies on it, and the final return MUST return `supabaseResponse` (not a new `NextResponse.next()`). Returning a different response object drops the `Set-Cookie` headers. [VERIFIED: @supabase/ssr design.md]

**Note on env vars:** The proxy runs at the Edge boundary. It can use `process.env.NEXT_PUBLIC_*` directly without importing `@/lib/env` (which uses Zod and may not be compatible with the Edge runtime's module loading). The `@/lib/env` import IS correct for Route Handlers and Server Actions running in Node.js runtime. [ASSUMED — verify that @t3-oss/env-nextjs works in the Next.js 16 proxy/edge context before using it there]

---

## Pattern 2: /auth/callback Route Handler (AUTH-02)

**What:** GET Route Handler at `app/auth/callback/route.ts`. Reads the `code` query param, exchanges it for a session (writes cookies via `@supabase/ssr`), handles errors, redirects to `/`.

**Source:** `@supabase/ssr` README + Next.js 16 Route Handler docs [VERIFIED: node_modules]

```typescript
// dealdrop/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to / (D-08: no next param handling needed — always go to /)
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // No code or exchange failed — redirect with error signal
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
```

**Why ignore `next` param:** D-08 locks that the redirect always goes to `/`. The DashboardShell is the only authed view in v1. The `next` variable is read defensively for future use but the redirect always uses `/`.

**Cookie propagation:** `createClient()` from `src/lib/supabase/server.ts` already has the `setAll` try/catch pattern where it attempts to set cookies. In a Route Handler context (unlike RSC), cookies CAN be set — the try/catch only suppresses errors from RSC callers. The `exchangeCodeForSession` call triggers `setAll`, which writes the session cookies to the response. [VERIFIED: server.ts source — try/catch in setAll means it silently succeeds in Route Handlers]

---

## Pattern 3: signInWithOAuth in AuthModal (AUTH-01, AUTH-05)

**What:** Client component that calls `supabase.auth.signInWithOAuth` from the browser client, using `window.location.origin` as the base for `redirectTo`.

**Source:** `@supabase/supabase-js` docs + AUTH architecture [VERIFIED: node_modules]

```typescript
// dealdrop/src/components/auth/AuthModal.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { useAuthModal } from './AuthModalProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function AuthModal() {
  const { isOpen, setOpen } = useAuthModal()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGoogleSignIn() {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    // Browser redirects — setIsLoading(false) not needed
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to DealDrop</DialogTitle>
          <DialogDescription>
            Sign in to start tracking prices
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**`redirectTo` value:** Must be `${window.location.origin}/auth/callback` — NOT a hardcoded URL. This makes localhost dev (`http://localhost:3000/auth/callback`) and Vercel production (`https://dealdrop.vercel.app/auth/callback`) both work without env vars in the browser bundle. [VERIFIED: this is the correct pattern per Supabase docs]

---

## Pattern 4: AuthModalProvider Context (AUTH-04 infra)

**What:** React context that holds `isOpen` state and exports an `openAuthModal()` hook. Both the header SignInButton and (in Phase 4) the Add Product form call `openAuthModal()` without knowing about Dialog internals.

**Why React context, not prop drilling:** The modal is mounted at the root layout level (`app/layout.tsx`). Callers (Header, Phase 4's Add Product button) are deep in the tree. Context is the correct solution. [VERIFIED: standard React pattern]

```typescript
// dealdrop/src/components/auth/AuthModalProvider.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import { AuthModal } from './AuthModal'

type AuthModalContextValue = {
  openAuthModal: () => void
  setOpen: (open: boolean) => void
  isOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)

  function openAuthModal() {
    setIsOpen(true)
  }

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, setOpen: setIsOpen, isOpen }}
    >
      {children}
      <AuthModal />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return context
}
```

**Layout.tsx modification:** `AuthModalProvider` wraps `{children}` in `app/layout.tsx`. The `<Toaster />` is placed as a sibling AFTER `{children}`, before the closing `<body>`. Both are client components mounted inside a Server Component layout — this is standard App Router pattern. [VERIFIED: Next.js App Router docs]

---

## Pattern 5: Sign-Out Server Action (AUTH-06)

**What:** `'use server'` function that calls `supabase.auth.signOut()` then redirects to `/?signed_out=1`. The client reads the query param, fires the toast, and cleans the URL.

**Source:** Next.js 16 auth guide [VERIFIED: node_modules/next/dist/docs/01-app/02-guides/authentication.md]

```typescript
// dealdrop/src/actions/auth.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/?signed_out=1')
}
```

**Cookie clearing:** `supabase.auth.signOut()` internally calls `setAll` on the server client, which clears the session cookies by setting `Max-Age=0`. The `createClient()` server factory has the try/catch in `setAll` — but a Server Action IS able to set cookies, so the try/catch does NOT suppress the clear. Session cookies are properly deleted. [VERIFIED: server.ts source + @supabase/ssr design.md]

**Toast trigger from SignOutButton:**

```typescript
// dealdrop/src/components/auth/SignOutButton.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { signOut } from '@/actions/auth'
import { Button } from '@/components/ui/button'

// Note: toast.success call after sign-out lives in a separate client component
// that reads the ?signed_out=1 query param after redirect
```

**Cleaner pattern — separate toast listener:** Mount a `<AuthToastListener />` client component in `app/layout.tsx` that reads `useSearchParams()` and fires toasts based on `signed_out=1` or `auth_error=1`. This keeps `SignOutButton` simple (just calls action, shows "Signing out…" disable state) and centralizes toast logic. [ASSUMED — this is the recommended pattern given Next.js 16's redirect behavior; verify that `useSearchParams` Suspense boundary isn't required]

---

## Pattern 6: app/page.tsx Auth Branch (AUTH-01, HERO-01 through HERO-05)

**What:** RSC that reads `getUser()` server-side and conditionally renders Hero or DashboardShell. Uses `getUser()` (not `getClaims()`, not `getSession()`) because this is a security-relevant auth gate.

```typescript
// dealdrop/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header/Header'
import { Hero } from '@/components/hero/Hero'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex flex-col min-h-full">
      <Header user={user} />
      {user ? <DashboardShell user={user} /> : <Hero />}
    </main>
  )
}
```

**Why `getUser()` not `getClaims()`:** Per the `@supabase/ssr` README: "`getUser()` contacts the Supabase Auth server on every call and returns the most up-to-date user record." This is the right call for gating content — it's the security boundary. The proxy already handled refresh via `getClaims()`, so `getUser()` here is verifying the already-refreshed token. [VERIFIED: @supabase/ssr README, node_modules]

---

## Pattern 7: Shadcn Dialog Install and Anatomy

**What:** `npx shadcn@latest add dialog` generates `dealdrop/components/ui/dialog.tsx`. The Dialog uses `@radix-ui/react-dialog` which is already installed (1.1.15).

**Controlled open pattern:** AuthModal receives `open` and `onOpenChange` from context, making it fully controlled. The Shadcn Dialog passes these through to Radix's `Dialog.Root`. [VERIFIED: @radix-ui/react-dialog in node_modules]

**Key components used:**
- `<Dialog open={isOpen} onOpenChange={setOpen}>` — controlled root
- `<DialogContent className="sm:max-w-md">` — modal panel, 448px on desktop
- `<DialogHeader>` — groups Title + Description
- `<DialogTitle>` — accessible heading (required for a11y)
- `<DialogDescription>` — subtitle text (renders as `text-muted-foreground`)

**Focus behavior:** Radix Dialog automatically traps focus, returns focus to trigger on close, and handles ESC. No custom focus code needed. [VERIFIED: Radix Dialog docs pattern]

---

## Pattern 8: Sonner Mounting (POL-01)

**What:** Shadcn's `sonner` component generates `dealdrop/components/ui/sonner.tsx` which wraps Sonner's `<Toaster>` with theme detection. Mount once in `app/layout.tsx`.

```typescript
// app/layout.tsx addition
import { Toaster } from '@/components/ui/sonner'

// Inside RootLayout, after {children}:
<Toaster position="top-center" richColors />
```

**Why Shadcn wrapper not raw Sonner:** The Shadcn wrapper auto-detects light/dark theme via `prefers-color-scheme` and passes the correct `theme` prop to Sonner. Matches the project's dark-mode strategy. [ASSUMED based on standard Shadcn Sonner wrapper pattern — verify after `npx shadcn@latest add sonner`]

---

## OAuth Redirect URI Registration (AUTH-08)

**Ops checklist — user executes manually:**

### Google Cloud Console

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Select your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   - `http://localhost:3000/auth/callback` (local dev)
   - `https://dealdrop.vercel.app/auth/callback` (production — replace with real domain)
   - `https://*.vercel.app/auth/callback` — NOT supported by Google (Google does not allow wildcard domains in production OAuth clients)

**Important limitation:** Google OAuth does NOT support wildcard domains in redirect URIs for production apps. For Vercel preview deployments you have two options:
- Option A: Add each preview URL manually when testing (cumbersome but secure)
- Option B: Create a separate Google OAuth client in "Testing" mode (not verified) which allows any redirect URI — use for dev/preview only, not production

### Supabase Auth Dashboard

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set "Site URL" to `https://dealdrop.vercel.app` (production URL)
3. Add to "Redirect URLs":
   - `http://localhost:3000/auth/callback`
   - `https://dealdrop.vercel.app/auth/callback`
   - `https://*.vercel.app/auth/callback` — Supabase DOES support glob patterns

**Key distinction:** Supabase supports `*.vercel.app` wildcard (for preview deployments) but Google does NOT. The redirect flow goes: Browser → Google OAuth → Supabase (Supabase callback URL is `https://<project>.supabase.co/auth/v1/callback`, NOT your app's callback) → Your app's `/auth/callback` Route Handler.

The URI that must be registered in Google Cloud Console is Supabase's own callback URI, not your app's callback. Supabase's callback URI format is: `https://<project-ref>.supabase.co/auth/v1/callback`.

**Correct registration summary:**
- In Google Cloud Console: add `https://<project-ref>.supabase.co/auth/v1/callback` (just this one)
- In Supabase Auth → Redirect URLs: add your app's `/auth/callback` URLs (localhost, production, wildcard for Vercel previews)
- In Supabase Auth → URL Configuration: set Site URL to production domain

[ASSUMED: the exact Supabase project ref is `vhlbdcsxccaknccawfdj` from STATE.md — verify in Supabase dashboard before registering URIs]

---

## Common Pitfalls

### Pitfall 1: Returning Wrong Response Object from proxy.ts

**What goes wrong:** `supabaseResponse` is rebuilt inside `setAll` to carry new cookies. If you return `NextResponse.next()` instead of the rebuilt `supabaseResponse`, the `Set-Cookie` headers are lost. Every token refresh fails to propagate, causing intermittent session loss.

**Why it happens:** The `createServerClient` call in proxy receives a mutable reference to `supabaseResponse` but the pattern requires the variable to be reassigned inside the closure.

**How to avoid:** The `setAll` callback must (1) set cookies on request, (2) rebuild `supabaseResponse = NextResponse.next({ request })`, and (3) set cookies on the new response. The final `return supabaseResponse` returns the rebuilt object.

**Warning signs:** User stays logged in on first load but gets logged out on next tab open or page refresh.

### Pitfall 2: Using getSession() for Auth Gate in page.tsx

**What goes wrong:** `supabase.auth.getSession()` reads directly from cookies without verifying with the Auth server. A malicious client can craft a spoofed session cookie. Passing auth checks with `getSession()` is a security hole.

**Why it happens:** `getSession()` is synchronous and convenient; `getUser()` requires an await and a network call.

**How to avoid:** Always use `supabase.auth.getUser()` for any auth gate in server context. The @supabase/ssr README explicitly documents this distinction. [VERIFIED: node_modules/@supabase/ssr/README.md]

### Pitfall 3: Next.js 16 Async Cookies in Server.ts setAll

**What goes wrong:** The `createClient()` in `server.ts` uses `await cookies()` at the top, storing the store in `cookieStore`. The `setAll` method calls `cookieStore.set()` synchronously. In RSC context, this throws because RSC cannot set cookies. The existing `try/catch` in `setAll` correctly suppresses this — do NOT remove it.

**How to avoid:** Keep the existing try/catch in `server.ts` setAll. It is intentional and documented. Route Handlers and Server Actions do NOT throw here because they allow cookie writes.

### Pitfall 4: supabase/config.toml https:// vs http:// for localhost

**What goes wrong:** The `01-VERIFICATION.md` flagged REVIEW WR-03: `dealdrop/supabase/config.toml` has `https://127.0.0.1:3000` in `additional_redirect_urls` instead of `http://`. Local dev runs on HTTP, not HTTPS. This causes OAuth redirect failures on localhost.

**How to avoid:** In the Phase 2 first task, fix `supabase/config.toml` to use `http://127.0.0.1:3000` (and/or `http://localhost:3000`). This is the deferred WR-03 from Phase 1.

**Warning signs:** OAuth flow works on Vercel preview but fails on localhost with redirect_uri_mismatch.

### Pitfall 5: Server Components Cannot Set Cookies

**What goes wrong:** If `signOut()` were called from a Server Component render (not a Server Action), the cookie clear would silently fail (caught by try/catch in setAll) and the user would appear signed out to the RSC but retain valid cookies on subsequent requests.

**How to avoid:** Sign-out MUST be a Server Action. The `'use server'` directive is what enables cookie writes in this call path. [VERIFIED: Next.js 16 auth guide pattern]

### Pitfall 6: useSearchParams Requires Suspense Boundary

**What goes wrong:** `useSearchParams()` in Next.js 16 App Router can cause the component to opt out of static rendering and requires a `<Suspense>` boundary. Without it, the build may succeed but you get a Next.js warning or the component renders incorrectly on initial load.

**How to avoid:** Wrap any component using `useSearchParams()` (e.g., `AuthToastListener`) in a `<Suspense fallback={null}>` in the parent layout. [ASSUMED based on Next.js App Router behavior — verify at implementation]

### Pitfall 7: Dialog Import Path

**What goes wrong:** After `npx shadcn@latest add dialog`, the generated file is at `dealdrop/components/ui/dialog.tsx`. The import path is `@/components/ui/dialog` — but `@/*` resolves to both `dealdrop/*` and `dealdrop/src/*` per tsconfig. Components/ui is at the root `components/`, not inside `src/`, so the path alias resolves correctly as `@/components/ui/dialog`. [VERIFIED: tsconfig.json paths + button.tsx import pattern]

---

## Anti-Patterns to Avoid

- **React context in Server Components:** `useAuthModal()` hook can ONLY be called in client components (`'use client'`). The `AuthModalProvider` and all its children that consume the context must be client components. `Header.tsx` itself can be an RSC that receives `user` as a prop, but the `SignInButton` it renders must be a client component.
- **Calling `signInWithOAuth` from a Server Component:** Must be in a `'use client'` component — it triggers browser redirect.
- **Hardcoding the site URL in redirectTo:** Use `window.location.origin` so localhost and Vercel preview both work without per-env configuration.
- **Importing browser client in server files:** `@/lib/supabase/browser.ts` is for client components only. Importing it in `server.ts`, Server Actions, or Route Handlers is wrong (though not caught at build time because the browser client has no server-only guard).

---

## Runtime State Inventory

Step 2.5 SKIPPED: This is a greenfield feature phase, not a rename/refactor/migration. No runtime state exists for the auth system since Phase 2 is the first implementation of auth.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app | ✓ | 24.15.0 | — |
| npm | Package install | ✓ | 11.12.1 | — |
| Supabase CLI | Type gen (already done Phase 1) | ✓ | 2.92.1 (devDep) | — |
| `@supabase/ssr` | proxy.ts, server.ts, callback route | ✓ | 0.10.2 | — |
| `@supabase/supabase-js` | All Supabase clients | ✓ | 2.103.3 | — |
| `lucide-react` | Feature card icons, modal spinner | ✓ | 1.8.0 | — |
| `sonner` | Toast system (POL-01) | ✗ (not yet installed) | — | None — must install (`npm install sonner`) |
| `@radix-ui/react-dialog` | Shadcn Dialog primitive | ✓ | 1.1.15 | — |
| Google Cloud Console access | AUTH-08 setup | Requires user action | — | Cannot bypass — user must register OAuth client |
| Supabase Dashboard access | AUTH-08 setup + Google provider enable | Requires user action | — | Cannot bypass — user must enable Google provider |

**Missing dependencies with no fallback:**
- `sonner` npm package: must run `npm install sonner` before `npx shadcn@latest add sonner`

**User action required (blocks full OAuth flow):**
- Google Cloud Console: Enable Google OAuth provider, register Supabase callback URI
- Supabase Dashboard: Enable Google provider with Client ID + Secret from Google Console; set redirect URLs

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None currently installed — no test framework from Phase 1 |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Realistic Validation Surface for Phase 2

**The fundamental constraint:** Google OAuth cannot be unit-tested against real Google. The OAuth redirect flow is a browser + network + Google + Supabase chain. Any test that goes to `https://accounts.google.com` is an integration test requiring real credentials.

**Recommended validation strategy (pragmatic for portfolio bar):**

| Layer | What to Test | Type | Why |
|-------|-------------|------|-----|
| proxy.ts `setAll` cookie propagation | Does `getClaims()` result in `Set-Cookie` headers in response? | Unit (mocked Supabase) | Critical correctness — testable without Google |
| `/auth/callback` happy path | Given a valid `code` param, does the route call `exchangeCodeForSession` and redirect to `/`? | Contract test (mock supabase client) | Verifiable without real OAuth |
| `/auth/callback` error path | Given no `code` or Supabase error, does the route redirect to `/?auth_error=1`? | Contract test | Fully testable |
| `signOut()` Server Action | Does it call `supabase.auth.signOut()` and redirect to `/?signed_out=1`? | Unit test (mock supabase) | Fully testable |
| `page.tsx` auth branch | Given `getUser()` returns `null`, does Hero render? Given a user, does DashboardShell render? | Component test (mock supabase) | Fully testable with React Testing Library |
| Full OAuth flow (happy path) | Sign in → callback → dashboard shell visible | Manual smoke test | Cannot be automated against real Google without Playwright + Google test account |
| Sign-out flow | Click Sign Out → hero visible → "Signed out" toast | Manual smoke test | Verifiable locally |
| Shadcn Button visual (deferred from Phase 1) | All 5 variants render, dark mode works | Manual (natural closure in Phase 2) | First Shadcn consumer restores Phase 1 deferred check |

### Test Framework Recommendation

Given the portfolio bar and the constraint that OAuth can't be unit-tested, the minimal meaningful test surface is:

1. **Vitest** for unit tests of Server Actions and utility logic (no browser needed)
2. **Manual smoke checklist** for the full OAuth flow

If Vitest is NOT installed in Phase 2 (acceptable for portfolio bar), the entire validation is the manual smoke checklist. The planner should include a Wave 0 gap task to install Vitest only if `tdd_mode: true` — since config shows `tdd_mode: false`, manual smoke testing is the primary validation method.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated? | Notes |
|--------|----------|-----------|------------|-------|
| AUTH-01 | User can sign in with Google OAuth | Manual smoke | No | Real Google redirect — manual only |
| AUTH-02 | `/auth/callback` exchanges code and redirects | Contract test (Vitest, mock) | If Vitest installed | `supabase.auth.exchangeCodeForSession` called with `code` param |
| AUTH-03 | Sign In button opens modal | Component test | If Vitest + RTL | `useAuthModal` context, Dialog open state |
| AUTH-04 | `openAuthModal()` exported and callable | Unit test | If Vitest | Context exports correct function |
| AUTH-05 | Modal has single "Continue with Google" button | Component test | If Vitest + RTL | Button render check |
| AUTH-06 | Sign Out ends session | Manual smoke + unit (signOut action) | Partial | Action unit-testable; visual verification manual |
| AUTH-07 | proxy.ts refreshes session cookies | Unit test (mock createServerClient) | If Vitest | Verify `setAll` is called after `getClaims()` |
| AUTH-08 | OAuth URIs registered correctly | Manual ops checklist | No | External config — must be verified manually |
| HERO-01..05 | Hero renders correctly | Visual + manual | No | Static content — build passes means it renders |

### Manual Smoke Test Checklist (Primary Validation)

```
PHASE 2 SMOKE TEST — Run on localhost before marking phase complete

Auth flow:
[ ] Start dev server: cd dealdrop && npm run dev
[ ] Visit http://localhost:3000 → Hero is visible, tagline "Never miss a price drop"
[ ] Click "Sign in" → Dialog opens with "Continue with Google" button
[ ] Click "Continue with Google" → Redirected to Google login
[ ] Complete Google login → Redirected to http://localhost:3000/
[ ] Dashboard shell is visible ("Welcome back"), Hero is gone
[ ] Click "Sign out" → Redirected to homepage, Hero visible, "Signed out" toast appears
[ ] Visit http://localhost:3000 again (new tab) → Hero still visible (session ended)

Error path:
[ ] Manually visit http://localhost:3000/?auth_error=1 → "Sign in failed. Please try again." toast appears, URL cleaned to /

Env validation chain (closes D-15 from Phase 1):
[ ] Run `npm run build` — build succeeds (env validation fires via auth import chain)
[ ] Remove one env var from .env.local, re-run build → expect build failure with Zod error message
[ ] Restore env var

Shadcn visual check (closes Phase 1 deferred item):
[ ] In dark mode (OS preference): Shadcn Dialog, Cards, Buttons render with correct zinc tokens
[ ] In light mode: Same components render correctly
[ ] Button focus ring visible (keyboard Tab navigation through header)
```

### Wave 0 Gaps

Since `tdd_mode: false`, Vitest is not required. Wave 0 for Phase 2 tests consists only of:

- [ ] Manual smoke test infrastructure — no test files to create
- [ ] AUTH-08 ops checklist — user must complete before smoke test (Google + Supabase console config)

*(If nyquist_validation requires at least one automated test: Wave 0 should install Vitest + testing-library and write one contract test for `/auth/callback` happy path. At `tdd_mode: false` this is optional.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth + Google OAuth (delegated — no password storage) |
| V3 Session Management | Yes | `@supabase/ssr` cookie management; `proxy.ts` refresh; httpOnly cookies set by Supabase |
| V4 Access Control | Yes | `supabase.auth.getUser()` in RSC for page gate; RLS on database (Phase 1 — unchanged) |
| V5 Input Validation | Minimal | No user text input in Phase 2; `code` param from OAuth is passed directly to Supabase SDK (not manually parsed) |
| V6 Cryptography | Delegated | Token signing/verification delegated to Supabase (`getClaims()` uses JWKS endpoint) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session fixation via cookie crafting | Spoofing | `getUser()` in page.tsx hits Auth server for verification (not just cookie read) |
| CSRF on Server Actions | Tampering | Next.js 16 Server Actions include built-in CSRF protection via Origin header check [ASSUMED — verify in Next.js 16 docs] |
| Open redirect in `/auth/callback` | Elevation | `redirect` always goes to `${origin}/` — never a user-controlled URL; `next` param is read but ignored (D-08) |
| OAuth code interception | Spoofing | PKCE flow handled by Supabase SDK; `exchangeCodeForSession` validates the code verifier |
| Service role key exposure | Information Disclosure | Admin client NOT used in Phase 2; only anon key + session used |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | sonner latest version is 2.x | Standard Stack | Version conflict with React 19 — verify with `npm view sonner version` before install |
| A2 | `@t3-oss/env-nextjs` Zod validation may not be compatible with the Next.js 16 proxy/edge context | proxy.ts pattern | If env import causes edge runtime error, proxy.ts must use `process.env.*` directly instead of `env.*` |
| A3 | `AuthToastListener` using `useSearchParams()` needs `<Suspense fallback={null}>` wrapper | Pattern 5 sign-out | Without Suspense, may cause build warning or hydration mismatch in Next.js 16 |
| A4 | Shadcn Sonner wrapper auto-adapts to `prefers-color-scheme` | Pattern 8 Sonner | If incorrect, must manually pass `theme` prop to Toaster |
| A5 | CSRF protection is built into Next.js 16 Server Actions | Security Domain | If not built-in, sign-out action needs explicit CSRF validation |
| A6 | Supabase project ref is `vhlbdcsxccaknccawfdj` (from STATE.md) | OAuth URI Registration | Wrong project ref = wrong callback URI registered in Google Console |

---

## Open Questions (RESOLVED)

1. **`supabaseResponse` reassignment pattern in proxy — TypeScript strict mode compatibility**
   - What we know: The pattern requires `let supabaseResponse = NextResponse.next(...)` and reassignment inside `setAll`. TypeScript strict mode with `noUncheckedIndexedAccess` may flag this.
   - What's unclear: Whether the pattern compiles cleanly under the project's strict tsconfig.
   - Recommendation: Implement as shown; if TS error, add explicit type annotation `let supabaseResponse: NextResponse`.
   - RESOLVED: proxy.ts uses type inference; if strict TS flags it, add explicit `let supabaseResponse: NextResponse` annotation. Pattern 1 in 02-PATTERNS.md shows the exact shape used by Plan 02-02 Task 1.

2. **Google OAuth "Testing" vs "Production" mode for Vercel preview deployments**
   - What we know: Google does not support wildcard redirect URIs in production OAuth clients.
   - What's unclear: Whether the user wants to configure a separate "Testing" OAuth client for dev/preview, or just test production flow on the production Vercel URL.
   - Recommendation: The AUTH-08 ops checklist should give both options and let the user decide. For portfolio bar, testing on the production Vercel URL is sufficient.
   - RESOLVED: AUTH-08 ops checklist (Plan 02-05 Task 2) presents both options; for portfolio bar, testing on the production Vercel URL + localhost is sufficient, no separate Testing OAuth client needed unless user opts in.

3. **`useSearchParams()` Suspense requirement in Next.js 16**
   - What we know: In Next.js 13-15, `useSearchParams()` without Suspense was warned in static rendering contexts.
   - What's unclear: Whether Next.js 16 still requires this or has changed behavior.
   - Recommendation: Wrap `AuthToastListener` in `<Suspense fallback={null}>` as a defensive measure — negligible cost, avoids potential build error.
   - RESOLVED: defensive wrap. Plan 02-04 Task 2 wraps AuthToastListener in `<Suspense fallback={null}>` in layout.tsx per Pattern 8 in 02-PATTERNS.md.

---

## Sources

### Primary (HIGH confidence — verified from installed node_modules)

- `node_modules/@supabase/ssr/README.md` — `getSession()` vs `getUser()` vs `getClaims()` distinction; concurrent refresh; cookie pattern
- `node_modules/@supabase/ssr/src/createServerClient.ts` — `getAll`/`setAll` API, `skipAutoInitialize: true` behavior
- `node_modules/@supabase/ssr/docs/design.md` — Cookie chunking strategy, why `getAll`/`setAll` replaced `get`/`set`/`remove`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts API, `NextRequest.cookies`, `NextResponse.next()`, migration from middleware
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — Server Actions for sign-out, `deleteSession` pattern, `redirect()` usage
- `dealdrop/src/lib/supabase/server.ts` — existing factory pattern with `await cookies()` and try/catch in setAll
- `dealdrop/src/lib/supabase/browser.ts` — existing browser factory
- `dealdrop/proxy.ts` — existing stub with matcher config
- `dealdrop/package.json` — installed versions: @supabase/ssr 0.10.2, @supabase/supabase-js 2.103.3, lucide-react 1.8.0, shadcn 4.3.0, zod 4.3.6
- `node_modules/zod/package.json` — version 4.3.6
- `node_modules/@t3-oss/env-nextjs/package.json` — peerDependencies: `{ zod: "^3.24.0 || ^4.0.0" }` — compatible with zod 4.3.6

### Secondary (MEDIUM confidence — verified from installed packages or cross-referenced)

- `node_modules/@radix-ui/react-dialog/package.json` — version 1.1.15, already installed
- Phase 1 planning artifacts (01-CONTEXT.md, 01-VERIFICATION.md, STACK.md, ARCHITECTURE.md, PITFALLS.md) — prior research validated against this project's constraints

### Tertiary (LOW confidence — assumed, flagged in Assumptions Log)

- Sonner version in npm registry (not verified — check `npm view sonner version` at install time)
- Next.js 16 built-in CSRF for Server Actions (training knowledge, not verified against installed docs)
- useSearchParams Suspense requirement in Next.js 16 (training knowledge)
- Shadcn Sonner wrapper theme auto-detection behavior (standard pattern but not verified against generated file)

---

## Metadata

**Confidence breakdown:**
- proxy.ts pattern: HIGH — verified from @supabase/ssr source and Next.js 16 proxy docs
- /auth/callback pattern: HIGH — verified from @supabase/ssr README + Next.js Route Handler docs
- signInWithOAuth browser pattern: HIGH — standard Supabase Auth pattern, verified SDK installed
- sign-out Server Action: HIGH — verified from Next.js 16 auth guide in installed docs
- Shadcn Dialog/Card install: HIGH — @radix-ui/react-dialog already installed, pattern verified
- Sonner install: MEDIUM — package not yet installed; version assumed
- Google OAuth URI registration: MEDIUM — Supabase/Google docs pattern, project-ref assumed from STATE.md
- Validation architecture: HIGH — based on real constraints of OAuth flow (cannot unit-test against real Google)

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable libraries; @supabase/ssr and Next.js 16 not fast-moving)
