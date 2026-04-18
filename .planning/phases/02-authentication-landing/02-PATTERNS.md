# Phase 2: Authentication & Landing — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 14 new/modified files + 3 Shadcn installs
**Analogs found:** 8 / 14 (all new files have at least a partial in-repo analog or a verified RESEARCH.md pattern)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `dealdrop/proxy.ts` | proxy/middleware | request-response (cookie read+write) | RESEARCH.md Pattern 1 (verified from `node_modules/@supabase/ssr`) | exact — body not yet written |
| `dealdrop/app/auth/callback/route.ts` | route handler | request-response (OAuth code exchange) | RESEARCH.md Pattern 2 + `src/lib/supabase/server.ts` | role-match |
| `dealdrop/app/page.tsx` | page (RSC) | request-response (session read, conditional branch) | `src/lib/supabase/server.ts` (factory) + RESEARCH.md Pattern 6 | role-match |
| `dealdrop/app/layout.tsx` | layout (RSC, modify) | — (provider mounting) | existing `app/layout.tsx` lines 1-33 | exact — additive only |
| `dealdrop/src/components/auth/AuthModal.tsx` | client component | event-driven (OAuth trigger) | `components/ui/button.tsx` (Shadcn primitive pattern) + RESEARCH.md Pattern 3 | role-match |
| `dealdrop/src/components/auth/AuthModalProvider.tsx` | provider/client component | event-driven (React context state) | RESEARCH.md Pattern 4 | exact from research |
| `dealdrop/src/components/auth/SignInButton.tsx` | client component | event-driven (context hook call) | `components/ui/button.tsx` (primitive) | partial-match |
| `dealdrop/src/components/auth/SignOutButton.tsx` | client component | event-driven (Server Action call) | `components/ui/button.tsx` (primitive) | partial-match |
| `dealdrop/src/actions/auth.ts` | server action | request-response (signOut + redirect) | RESEARCH.md Pattern 5 | exact from research |
| `dealdrop/src/components/hero/Hero.tsx` | server component | — (static render) | `app/page.tsx` (RSC structural shell) | partial-match |
| `dealdrop/src/components/hero/FeatureCard.tsx` | server component | — (static render, props-driven) | `components/ui/button.tsx` (Shadcn primitive usage pattern) | partial-match |
| `dealdrop/src/components/header/Header.tsx` | server component | request-response (receives user prop, branches) | `app/layout.tsx` (RSC wrapper with typed props) | partial-match |
| `dealdrop/src/components/dashboard/DashboardShell.tsx` | server component | — (static placeholder) | `app/page.tsx` (RSC shell structure) | partial-match |
| `dealdrop/components/ui/dialog.tsx`, `card.tsx`, `sonner.tsx` | Shadcn primitives | — (generated via CLI) | `components/ui/button.tsx` | exact — same generation path |

---

## Shared Patterns

### A. TypeScript strict component shape
**Source:** `dealdrop/app/layout.tsx` lines 20-24 and `dealdrop/components/ui/button.tsx` lines 44-53
**Apply to:** All new files (every component and action)

Two established component signatures in this repo:

```typescript
// RSC layout/page pattern — Readonly<{}> props, default export
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) { ... }

// Shadcn primitive pattern — React.ComponentProps spread, named export
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) { ... }
export { Button, buttonVariants }
```

Rules from CLAUDE.md / AGENTS.md:
- `Readonly<>` on all props objects
- `import type` for type-only imports
- No `any` under `strict: true`
- Default exports for pages/layouts; named exports for shared components
- Read `node_modules/next/dist/docs/` before writing Next.js-specific code (AGENTS.md)

### B. Path alias convention
**Source:** `dealdrop/tsconfig.json` line 22, `dealdrop/components.json` aliases block
**Apply to:** Every import in every new file

```
@/*  resolves to both  dealdrop/*  AND  dealdrop/src/*
```

Concrete import paths that work:
- `@/lib/supabase/server`  → `dealdrop/src/lib/supabase/server.ts`
- `@/lib/supabase/browser` → `dealdrop/src/lib/supabase/browser.ts`
- `@/components/ui/button` → `dealdrop/components/ui/button.tsx`
- `@/components/ui/dialog` → `dealdrop/components/ui/dialog.tsx` (after Shadcn add)
- `@/components/ui/card`   → `dealdrop/components/ui/card.tsx` (after Shadcn add)
- `@/components/ui/sonner` → `dealdrop/components/ui/sonner.tsx` (after Shadcn add)
- `@/actions/auth`         → `dealdrop/src/actions/auth.ts`
- `@/lib/utils`            → `dealdrop/src/lib/utils.ts`

Note: `components/ui/` lives at the repo root `dealdrop/components/`, NOT inside `src/`. Both resolve via the dual-path alias.

### C. Supabase server client factory
**Source:** `dealdrop/src/lib/supabase/server.ts` lines 1-30 (full file)
**Apply to:** `app/auth/callback/route.ts`, `app/page.tsx`, `src/actions/auth.ts`

```typescript
// Full file — copy this factory pattern verbatim; do NOT re-implement
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies() // Next.js 16: MUST await

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // RSC caller — cookie writes suppressed intentionally
          }
        },
      },
    }
  )
}
```

### D. Supabase browser client factory
**Source:** `dealdrop/src/lib/supabase/browser.ts` lines 1-10 (full file)
**Apply to:** `src/components/auth/AuthModal.tsx`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

Note: browser client is NOT async. RSC files must NOT import from `@/lib/supabase/browser`.

### E. Shadcn Button usage
**Source:** `dealdrop/components/ui/button.tsx` lines 1-67
**Apply to:** `AuthModal.tsx`, `SignInButton.tsx`, `SignOutButton.tsx`

Variants in this repo's Button (new-york/zinc preset — NOT the standard shadcn defaults):
- `default` — `bg-primary text-primary-foreground` (accent)
- `outline` — `border-border bg-background hover:bg-muted`
- `secondary`, `ghost`, `destructive`, `link`

Sizes: `default` (`h-8`), `sm` (`h-7`), `lg` (`h-9`), `xs`, `icon`, `icon-sm`, `icon-lg`, `icon-xs`

```typescript
import { Button } from '@/components/ui/button'
// Sign In — accent
<Button variant="default" size="default">Sign in</Button>
// Sign Out — outline (calmer)
<Button variant="outline" size="default">Sign out</Button>
// Modal CTA — accent, full width, lg
<Button variant="default" size="lg" className="w-full">Continue with Google</Button>
```

### F. cn() utility for className composition
**Source:** `dealdrop/src/lib/utils.ts` lines 1-6
**Apply to:** Any component combining conditional Tailwind classes

```typescript
import { cn } from '@/lib/utils'
// Usage: className={cn("base-classes", conditionalClass && "extra-class")}
```

---

## Pattern Assignments

### 1. `dealdrop/proxy.ts` (proxy, request-response)

**Analog:** RESEARCH.md Pattern 1 (verified from `node_modules/@supabase/ssr/README.md` and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)

**Existing stub** (`proxy.ts` lines 1-17 — keep `config` export verbatim):
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return NextResponse.next()  // <-- replace this body only
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
}
```

**Core pattern to replace the body with** (RESEARCH.md Pattern 1, lines 284-317):
```typescript
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getClaims()

  return supabaseResponse  // MUST return this object — not a new NextResponse.next()
}
```

**Import block for proxy.ts:**
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
```

**Gotchas:**
- Use `process.env.NEXT_PUBLIC_*` directly — do NOT import `@/lib/env` here. The Zod env validation uses Node.js modules that may not be edge-runtime compatible. The proxy runs at the Edge boundary.
- `supabaseResponse` MUST be the `let` variable rebuilt in `setAll`. Return that variable. Returning a new `NextResponse.next()` drops all `Set-Cookie` headers and breaks session refresh.
- Use `getClaims()` (local JWKS validation), NOT `getUser()` (network call per request). This is documented explicitly in the `@supabase/ssr` README.

---

### 2. `dealdrop/app/auth/callback/route.ts` (route handler, request-response)

**Analog:** RESEARCH.md Pattern 2 + `src/lib/supabase/server.ts` (cookie factory)

**Full file pattern** (RESEARCH.md Pattern 2, lines 338-360):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // No code param or exchange failed — signal error to client
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
```

**Gotchas:**
- `createClient()` from `@/lib/supabase/server` is `async` — must `await` it.
- In a Route Handler (not RSC), `setAll` in the server factory DOES write cookies — the try/catch suppresses only RSC callers. `exchangeCodeForSession` will write session cookies successfully.
- Per D-08: always redirect to `/`, never to a user-supplied `next` param.
- Per WR-03 (from Phase 1 VERIFICATION.md): fix `dealdrop/supabase/config.toml` to use `http://127.0.0.1:3000` (not `https://`) in `additional_redirect_urls` before testing OAuth locally.

---

### 3. `dealdrop/app/page.tsx` (page RSC, conditional branch)

**Analog:** RESEARCH.md Pattern 6 + existing `app/layout.tsx` (RSC shell pattern)

**Imports pattern** (derived from existing files):
```typescript
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header/Header'
import { Hero } from '@/components/hero/Hero'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
```

**Core pattern** (RESEARCH.md Pattern 6, lines 543-555):
```typescript
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

**Gotchas:**
- Use `getUser()`, NOT `getSession()` or `getClaims()`. `getUser()` hits the Auth server to verify the token — this is the security boundary for gating content. `getSession()` reads cookies without Auth server verification and can be spoofed.
- `createClient()` is `async` — `await` it.
- This file is a default export, no `'use client'` — it is a Server Component.
- The `User` type from `@supabase/supabase-js` is the correct type for the `user` prop passed to child components.

---

### 4. `dealdrop/app/layout.tsx` (layout RSC, additive modification)

**Analog:** Existing `dealdrop/app/layout.tsx` lines 1-33 — keep everything, add two insertions.

**Existing file structure to preserve** (lines 1-33):
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ... font setup, metadata export, RootLayout ...
// body: className="min-h-full flex flex-col"
```

**Two additions to make:**

Addition 1 — new imports at top:
```typescript
import { Toaster } from '@/components/ui/sonner'
import { AuthModalProvider } from '@/components/auth/AuthModalProvider'
```

Addition 2 — body content replacement:
```typescript
<body className="min-h-full flex flex-col">
  <AuthModalProvider>
    {children}
  </AuthModalProvider>
  <Toaster position="top-center" richColors />
</body>
```

**Gotchas:**
- `<Toaster />` is placed OUTSIDE `AuthModalProvider` (sibling after) so it renders at the root body level, not inside the provider's React tree. Either placement works for toasts, but outside is cleaner.
- `AuthModalProvider` is a `'use client'` component mounted inside a Server Component layout — this is the standard "client island at the root" App Router pattern. The children passed to it remain Server Components.
- Any component using `useSearchParams()` (e.g., an `AuthToastListener`) must be wrapped in `<Suspense fallback={null}>` here to satisfy Next.js 16's requirement.

---

### 5. `dealdrop/src/components/auth/AuthModalProvider.tsx` (client provider, event-driven)

**Analog:** RESEARCH.md Pattern 4 (lines 443-484)

**Full file pattern:**
```typescript
'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from './AuthModal'

type AuthModalContextValue = {
  openAuthModal: () => void
  setOpen: (open: boolean) => void
  isOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
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

**Gotchas:**
- `AuthModal` is rendered as a child of the Provider — this ensures the modal has access to context without prop drilling.
- `useAuthModal()` is a named export — Phase 4 imports it directly: `import { useAuthModal } from '@/components/auth/AuthModalProvider'`.
- `Readonly<{ children: ReactNode }>` — follow the established component prop convention from `layout.tsx`.
- This file MUST have `'use client'` — React context with state is client-only.

---

### 6. `dealdrop/src/components/auth/AuthModal.tsx` (client component, event-driven)

**Analog:** RESEARCH.md Pattern 3 (lines 374-431) + `components/ui/button.tsx` (Button usage)

**Imports pattern:**
```typescript
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
```

**Core pattern** (RESEARCH.md Pattern 3, lines 391-430):
```typescript
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
    // Browser redirects away — no setIsLoading(false) needed
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

**Gotchas:**
- `createClient()` from browser.ts is NOT async — no `await`.
- `redirectTo` MUST use `window.location.origin` — not a hardcoded URL. This makes `http://localhost:3000/auth/callback` and `https://dealdrop.vercel.app/auth/callback` both work automatically.
- Dialog import path is `@/components/ui/dialog` — resolves to `dealdrop/components/ui/dialog.tsx` (root-level, not `src/`).
- Modal title, subtitle, and button copy are locked by D-06 — do not rephrase.
- Do NOT import `@/lib/supabase/server` or `@/lib/env` here — both assume Node.js runtime; this is a client component.

---

### 7. `dealdrop/src/components/auth/SignInButton.tsx` (client component, event-driven)

**Analog:** `components/ui/button.tsx` (Button primitive) + `AuthModalProvider.tsx` (`useAuthModal` hook)

**Full file pattern:**
```typescript
'use client'

import { useAuthModal } from './AuthModalProvider'
import { Button } from '@/components/ui/button'

export function SignInButton() {
  const { openAuthModal } = useAuthModal()

  return (
    <Button variant="default" size="default" onClick={openAuthModal}>
      Sign in
    </Button>
  )
}
```

**Gotchas:**
- `useAuthModal()` can only be called in a `'use client'` component — it uses React context.
- `variant="default"` applies `bg-primary text-primary-foreground` — the accent color. This is the correct variant per UI-SPEC.md (Sign In = accent pull, Sign Out = outline/calm).
- No loading state needed — clicking just opens the modal; the OAuth loading state lives in `AuthModal.tsx`.
- Named export (not default) — consistent with Shared Pattern A for shared components.

---

### 8. `dealdrop/src/components/auth/SignOutButton.tsx` (client component, event-driven)

**Analog:** `components/ui/button.tsx` + RESEARCH.md Pattern 5 (sign-out action call)

**Full file pattern:**
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/actions/auth'

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    setIsPending(true)
    await signOut()
    // signOut() calls redirect() server-side; this line may not execute
  }

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
```

**Gotchas:**
- `variant="outline"` per UI-SPEC.md — signed-in state is the calmer state, no accent.
- The Server Action `signOut()` calls `redirect()` internally, so the `handleSignOut` async continuation may not run. `setIsPending(true)` still matters for the disabled/label change during the brief flight time.
- Toast for "Signed out" is triggered by a separate `AuthToastListener` component reading `?signed_out=1` — NOT triggered here. Keep `SignOutButton` simple.
- `isPending` replaces a full `useTransition`; either approach is acceptable. `useState` is simpler and sufficient at portfolio bar.

---

### 9. `dealdrop/src/actions/auth.ts` (server action, request-response)

**Analog:** RESEARCH.md Pattern 5 (lines 496-507) + `src/lib/supabase/server.ts` (factory)

**Full file pattern:**
```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/?signed_out=1')
}
```

**Gotchas:**
- `'use server'` directive at the top of the file — marks all exports as Server Actions.
- `createClient()` is `async` — `await` it.
- `signOut()` internally calls `setAll` to clear session cookies. In a Server Action context (not RSC), the try/catch in `server.ts` does NOT suppress cookie writes — they succeed. Session is properly cleared.
- `redirect()` from `next/navigation` throws internally (it uses a special Next.js error type) — do not wrap it in try/catch.
- `@/lib/env` is available here (Node.js runtime, not Edge) — but `createClient()` already uses it internally.

---

### 10. `dealdrop/src/components/hero/Hero.tsx` (server component, static render)

**Analog:** `app/page.tsx` (RSC shell structure) + UI-SPEC.md Hero anatomy section

**Imports pattern:**
```typescript
import { FeatureCard } from './FeatureCard'
import { Globe, BellRing, LineChart } from 'lucide-react'
```

**Structure skeleton** (derived from UI-SPEC.md Hero anatomy):
```typescript
export function Hero() {
  return (
    <section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16">
      <h1 className="text-3xl sm:text-5xl font-semibold leading-tight sm:leading-[1.1] tracking-tight max-w-2xl">
        Never miss a price drop
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-xl">
        Paste any product URL. We&apos;ll check the price daily and email you
        the moment it drops.
      </p>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl">
        <FeatureCard icon={Globe} title="Multi-site support" blurb="Track products from any e-commerce site in the world." />
        <FeatureCard icon={BellRing} title="Instant email alerts" blurb="Get an email the moment a price drops." />
        <FeatureCard icon={LineChart} title="Price history" blurb="See every price change on a clean chart." />
      </div>
      <p className="mt-16 text-xs text-muted-foreground">
        Made with love
      </p>
    </section>
  )
}
```

**Gotchas:**
- No `'use client'` — this is a Server Component.
- `h1` tagline is locked: "Never miss a price drop" — do not rephrase.
- Subtitle is locked by D-04 — do not rephrase.
- Icon names: `Globe`, `BellRing`, `LineChart` from `lucide-react` (version 1.8.0, already installed).
- Feature card blurbs are planner discretion — keep under ~12 words each.
- `aria-hidden="true"` goes on the Lucide icon inside FeatureCard (decorative — card title is the accessible name).

---

### 11. `dealdrop/src/components/hero/FeatureCard.tsx` (server component, props-driven static)

**Analog:** `components/ui/button.tsx` (Shadcn primitive composition pattern) + UI-SPEC.md FeatureCard anatomy

**Imports pattern:**
```typescript
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
```

**Full file pattern** (derived from UI-SPEC.md FeatureCard anatomy):
```typescript
type FeatureCardProps = Readonly<{
  icon: LucideIcon
  title: string
  blurb: string
}>

export function FeatureCard({ icon: Icon, title, blurb }: FeatureCardProps) {
  return (
    <Card className="p-6 text-left">
      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold leading-snug">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">{blurb}</p>
    </Card>
  )
}
```

**Gotchas:**
- `LucideIcon` from `lucide-react` is the correct type for icon components passed as props.
- `icon` prop destructured as `Icon` (capitalized) so it can be used as a JSX component.
- `text-primary` on the icon — this is the accent usage as specified in UI-SPEC.md Color section.
- `aria-hidden="true"` on the icon — the card title provides the accessible name.
- No hover effect — cards are static, not interactive (explicitly noted in UI-SPEC.md).
- Card import path: `@/components/ui/card` (generated by `npx shadcn@latest add card`).

---

### 12. `dealdrop/src/components/header/Header.tsx` (server component, receives user prop)

**Analog:** `app/layout.tsx` (RSC with typed children prop) + UI-SPEC.md Header anatomy

**Imports pattern:**
```typescript
import type { User } from '@supabase/supabase-js'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
```

**Full file pattern** (derived from UI-SPEC.md Header anatomy):
```typescript
type HeaderProps = Readonly<{
  user: User | null
}>

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        <span className="text-sm font-medium tracking-tight">DealDrop</span>
        {user ? <SignOutButton /> : <SignInButton />}
      </div>
    </header>
  )
}
```

**Gotchas:**
- `Header` is a Server Component — it receives `user` as a prop from `app/page.tsx` which already fetched the session. Do NOT call `createClient()` or `supabase.auth.getUser()` inside Header.
- `SignInButton` and `SignOutButton` are client components rendered inside this RSC — this is the "client island in a server tree" pattern. It works because Next.js serializes the boundary.
- Header wordmark is a `<span>`, not a link (no navigation needed for single-page app per UI-SPEC.md a11y section).
- `h-14` = 56px per UI-SPEC.md spacing exceptions.
- Header is static (not sticky) — no `fixed` or `sticky` Tailwind class.

---

### 13. `dealdrop/src/components/dashboard/DashboardShell.tsx` (server component, placeholder)

**Analog:** `app/page.tsx` (RSC shell) + UI-SPEC.md DashboardShell anatomy

**Imports pattern:**
```typescript
import type { User } from '@supabase/supabase-js'
```

**Full file pattern** (derived from UI-SPEC.md DashboardShell anatomy):
```typescript
type DashboardShellProps = Readonly<{
  user: User
}>

export function DashboardShell({ user: _ }: DashboardShellProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold leading-snug">Welcome back</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground max-w-xl">
          You&apos;re signed in. Your product tracker shows up here — adding
          products unlocks in the next update.
        </p>
      </div>
    </div>
  )
}
```

**Gotchas:**
- `user` prop received but may be unused in this placeholder — suppress lint with `user: _` or simply use `user.email` in a display if desired. Do NOT fetch any data here.
- `h1` is acceptable here — `Hero.tsx` and `DashboardShell.tsx` are mutually exclusive renders per `app/page.tsx` branch, so no duplicate `h1` exists on the page.
- No Add Product form, no products grid, no empty-state CTA — per CONTEXT.md D-07 and UI-SPEC.md out-of-scope list.
- Phase 4 will replace this component's body; keep the outer container div so the max-width/padding contract is already established.

---

### 14. `dealdrop/components/ui/dialog.tsx`, `card.tsx`, `sonner.tsx` (Shadcn CLI installs)

**Analog:** `dealdrop/components/ui/button.tsx` (existing Shadcn-generated primitive — same generation path)

**Install commands (must run from `dealdrop/` directory):**
```bash
cd /Users/harshithpendyala/Documents/DealDrop/dealdrop
npm install sonner
npx shadcn@latest add dialog
npx shadcn@latest add card
npx shadcn@latest add sonner
```

**Do NOT hand-edit these files.** Re-run the CLI if a primitive needs to change (per UI-SPEC.md Registry Safety section).

**Key facts from research:**
- `@radix-ui/react-dialog@1.1.15` already installed in `node_modules` — `add dialog` generates the TSX without new npm deps.
- Generated files land at `dealdrop/components/ui/{dialog,card,sonner}.tsx` — matching `button.tsx`'s location.
- Import paths after generation: `@/components/ui/dialog`, `@/components/ui/card`, `@/components/ui/sonner`.
- `Toaster` is the named export from `@/components/ui/sonner` (the Shadcn wrapper, not raw `sonner`).

---

### 15. `AuthToastListener` (unnamed utility client component, event-driven)

**File:** `dealdrop/src/components/auth/AuthToastListener.tsx` (implied by D-11/D-12 + RESEARCH.md Pattern 5 note)

**Analog:** No in-repo analog — pure React hook composition pattern

**Full file pattern:**
```typescript
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function AuthToastListener() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('signed_out') === '1') {
      toast.success('Signed out')
      router.replace('/')
    }
    if (searchParams.get('auth_error') === '1') {
      toast.error('Sign in failed. Please try again.')
      router.replace('/')
    }
  }, [searchParams, router])

  return null
}
```

**Mount in `app/layout.tsx`** wrapped in Suspense (required by Next.js 16 for `useSearchParams`):
```typescript
import { Suspense } from 'react'
import { AuthToastListener } from '@/components/auth/AuthToastListener'

// Inside <body>, alongside <Toaster />:
<Suspense fallback={null}>
  <AuthToastListener />
</Suspense>
```

**Gotchas:**
- `useSearchParams()` requires a `<Suspense>` boundary in Next.js App Router — without it, the component opts the entire layout out of static rendering and may produce a build warning or runtime mismatch.
- `toast` import is from raw `'sonner'`, NOT from `@/components/ui/sonner` — the Shadcn wrapper only exports `<Toaster />`.
- `router.replace('/')` cleans the query param from the URL after firing the toast.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/auth/callback/route.ts` | route handler | OAuth code exchange | No Route Handlers exist in this repo yet — RESEARCH.md Pattern 2 is the primary source |
| `src/actions/auth.ts` | server action | sign-out + redirect | No Server Actions exist in this repo yet — RESEARCH.md Pattern 5 is the primary source |
| `src/components/auth/AuthToastListener.tsx` | client utility | useSearchParams hook | No similar hook-based listeners in repo — standard React + Next.js hooks pattern |

---

## Critical Cross-File Gotchas

These apply to multiple files and must be checked by the planner at every step:

1. **AGENTS.md mandate:** Read `node_modules/next/dist/docs/` before writing Next.js API usage (proxy, Route Handlers, Server Actions, cookies). Relevant docs: `proxy.md`, `authentication.md`, route handler docs.

2. **`await cookies()` everywhere in server context.** Next.js 16 removed synchronous cookie access. `server.ts` already does this correctly — replicate the pattern.

3. **Three-client separation — never cross-import:**
   - `@/lib/supabase/server` → Route Handlers, Server Actions, RSC page.tsx
   - `@/lib/supabase/browser` → Client Components only (AuthModal.tsx)
   - proxy.ts → uses `createServerClient` directly with `process.env.*` (no factory import)

4. **`process.env.*` in proxy.ts, `env.*` everywhere else.** The `@/lib/env` Zod import is Node.js runtime; proxy runs at the Edge boundary.

5. **WR-03 fix required before OAuth testing:** `dealdrop/supabase/config.toml` `additional_redirect_urls` must use `http://` (not `https://`) for `127.0.0.1:3000`.

6. **Shadcn Dialog import path:** `@/components/ui/dialog` (root `components/`, not `src/components/`). The dual-path `@/*` alias handles both, but dialog.tsx is at the root level alongside button.tsx.

7. **Copy is locked for:** tagline, subtitle, modal title, modal subtitle, modal button text, feature card titles. See UI-SPEC.md Copywriting Contract.

---

## Metadata

**Analog search scope:** `dealdrop/app/`, `dealdrop/src/`, `dealdrop/components/ui/`, `node_modules/@supabase/ssr/`, `node_modules/next/dist/docs/` (via RESEARCH.md verified extracts)
**Files scanned:** 8 in-repo files read directly + RESEARCH.md patterns (verified from node_modules)
**Pattern extraction date:** 2026-04-18
