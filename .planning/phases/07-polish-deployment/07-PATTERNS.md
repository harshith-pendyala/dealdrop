# Phase 7: Polish & Deployment - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 7 files (5 new, 1 delete, ~1-6 empirical mobile-audit modifications)
**Analogs found:** 7 / 7 (100% — all new files have a close analog in-repo)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `dealdrop/app/error.tsx` | error-boundary (client component) | request-response (render-time) | `dealdrop/src/components/auth/AuthModal.tsx` (client component using Shadcn Card-equivalent + Button) **and** `dealdrop/src/components/dashboard/EmptyState.tsx` (centered card-shaped fallback layout) | role-match (no existing error boundary; closest analogs are centered-card client components) |
| `dealdrop/app/global-error.tsx` | root error-boundary (client component, owns `<html><body>`) | request-response (render-time) | `dealdrop/app/layout.tsx` (current `<html><body>` shell — for the structural contract) | role-match (no existing global boundary; layout supplies the html/body structural pattern) |
| `dealdrop/app/error.test.tsx` | test (Vitest, jsdom) | static-shape | `dealdrop/src/components/dashboard/EmptyState.test.tsx` (RSC-shape assertion via render + screen) | exact (same static-shape pattern) |
| `dealdrop/app/global-error.test.tsx` | test (Vitest, jsdom) | static-shape | `dealdrop/src/components/dashboard/EmptyState.test.tsx` | exact |
| `dealdrop/app/icon.tsx` | dynamic-icon route (Next.js file convention) | request-response (one-off `ImageResponse`) | None in-repo — first `ImageResponse` use. Closest structural analog: `dealdrop/app/layout.tsx` (top-level app/ exports + `Metadata` typed exports pattern) | no analog (use Next.js docs verbatim — RESEARCH §Pattern 2) |
| `dealdrop/app/favicon.ico` (DELETE) | static asset | n/a | n/a | n/a — pure deletion, paired with `app/icon.tsx` introduction in same commit |
| `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql` | migration (DDL) | batch (one-shot SQL apply) | `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` | exact (same wrapper function, same idempotent unschedule, same Vault read pattern) |
| `dealdrop/src/components/{hero,header,dashboard}/*.tsx` (mobile audit, EMPIRICAL) | component (existing — Tailwind class tweaks only) | n/a | Self (already-established `sm:`/`md:`/`lg:` vocabulary in `Hero.tsx`, `Header.tsx`, `DashboardShell.tsx`, `ProductGrid.tsx`) | exact (existing files modify themselves) |

---

## Pattern Assignments

### `dealdrop/app/error.tsx` (client error boundary, page-level)

**Primary analog (centered-card fallback shape):** `dealdrop/src/components/dashboard/EmptyState.tsx`
**Secondary analog (`'use client'` + Shadcn Card + Button):** `dealdrop/src/components/auth/AuthModal.tsx`
**Authoritative spec:** `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` (read FIRST per `dealdrop/AGENTS.md`)

**Imports pattern** — copy from `dealdrop/src/components/auth/AuthModal.tsx:1-15` (the established 'use client' + React + Shadcn UI + Lucide layering):

```tsx
'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
```

**Centered-fallback layout pattern** — copy the centered-section idiom from `dealdrop/src/components/dashboard/EmptyState.tsx:6-15` (centered text, max-w container, gap-4):

```tsx
// EmptyState.tsx:6-15 — centered, gap-4, max-w-xl pattern
<section className="flex flex-col items-center text-center gap-4">
  <h1 className="text-xl font-semibold leading-snug">Track your first product</h1>
  <p className="text-base leading-relaxed text-muted-foreground max-w-xl">
    ...
  </p>
  ...
</section>
```

**Card wrapper pattern** — copy Shadcn Card usage shape from `dealdrop/src/components/hero/FeatureCard.tsx:11-17` (Card + padded inner content):

```tsx
// FeatureCard.tsx:11-17
<Card className="p-6 text-left">
  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
  <h3 className="mt-4 text-xl font-semibold leading-snug">{title}</h3>
  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{blurb}</p>
</Card>
```

**Button pair pattern (action + outline secondary)** — copy from `dealdrop/src/components/dashboard/RemoveProductDialog.tsx:43-51` (Cancel + Action footer pattern, here adapted to Button + asChild Link):

```tsx
// RemoveProductDialog.tsx:43-51 — two-button footer idiom
<AlertDialogFooter>
  <AlertDialogCancel>Cancel</AlertDialogCancel>
  <AlertDialogAction
    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    onClick={handleConfirm}
  >
    Remove
  </AlertDialogAction>
</AlertDialogFooter>
```

For error.tsx the equivalent is the "Try again" (default Button) + "Go home" (outline Button asChild Link) pair. Use `Button` `variant="outline"` + `asChild` per `dealdrop/components/ui/button.tsx:14-21` (variants table) — `asChild` is supported (`button.tsx:45-51` Slot.Root branch). `Link` import is from `next/link`.

**Error logging pattern** — Next.js docs example (do NOT log `error.message`, only `error.digest` per CONTEXT.md D-02 + RESEARCH §V7):

```tsx
useEffect(() => {
  // No external logger in v1; structured console.error of digest only.
  // Next.js 16 already strips Server Component error.message in production.
  console.error('app/error.tsx caught:', { digest: error.digest })
}, [error])
```

**Composite (the full file shape)** — verbatim from RESEARCH §Pattern 1:

```tsx
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
    console.error('app/error.tsx caught:', { digest: error.digest })
  }, [error])

  return (
    <main className="flex flex-col min-h-full items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col gap-4 py-8 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
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

**Critical contract notes (from local Next.js 16.2 docs verified at `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:25-50`):**
- Prop name is `unstable_retry`, NOT `reset` (Next 16.2 change). CONTEXT.md D-02 says `reset()`; **follow the docs, not CONTEXT**.
- `'use client'` is REQUIRED — error boundaries must be Client Components.
- `error.digest` is the safe identifier; `error.message` is stripped in production for Server Component errors and must NOT be rendered (CONTEXT.md D-02 forbids stack/`<details>` reveal).

---

### `dealdrop/app/global-error.tsx` (root error boundary, replaces `<html><body>`)

**Primary analog (html/body structural shape):** `dealdrop/app/layout.tsx:29-44`
**Authoritative spec:** `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` § "global-error"

**Imports pattern** — minimal (intentionally NO Shadcn imports per RESEARCH §Pattern 1 "the error inside the error trap"):

```tsx
'use client'

import { useEffect } from 'react'
```

**`<html lang="en"><body>` shell pattern** — adapted from `dealdrop/app/layout.tsx:29-44` (root layout shape) but with inline styles instead of Tailwind classes (because the layout itself may have crashed):

```tsx
// layout.tsx:29-44 — the structural contract that global-error.tsx inherits
return (
  <html
    lang="en"
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
  >
    <body className="min-h-full flex flex-col">
      ...
    </body>
  </html>
)
```

**Composite (the full file shape)** — verbatim from RESEARCH §Pattern 1 (inline styles intentional):

```tsx
'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

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

**Critical contract notes:**
- Must define its own `<html>` + `<body>` (replaces the root layout when active).
- `metadata` / `generateMetadata` exports are NOT supported in this file.
- Do NOT import `@/components/ui/card` or `@/components/ui/button` — Shadcn primitives rely on layout-injected CSS variables that may be missing if the layout itself crashed (defensive coding rationale in RESEARCH).
- Inline styles use raw hex colors approximating zinc-900/50/900 from the Shadcn dark theme so the fallback still reads as DealDrop-branded.

---

### `dealdrop/app/error.test.tsx` (static-shape test)

**Primary analog:** `dealdrop/src/components/dashboard/EmptyState.test.tsx`
**Secondary analog (mock pattern for child components):** `dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx`

**Imports + setup pattern** — copy from `dealdrop/src/components/dashboard/EmptyState.test.tsx:1-19`:

```tsx
// EmptyState.test.tsx:1-19
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub child components that drag in unrelated runtime concerns
vi.mock('./InlineAddProductWrapper', () => ({
  InlineAddProductWrapper: (props: { authed: boolean }) => (
    <div data-testid="inline-add-product-wrapper" data-authed={String(props.authed)} />
  ),
}))

import { EmptyState } from './EmptyState'

afterEach(() => {
  cleanup()
})
```

**Static-shape assertion pattern** — copy `EmptyState.test.tsx:21-40` (heading + body text + child-prop pass-through). For error.tsx the assertions become: heading "Something went wrong" present, "Try again" button present, "Go home" link with `href="/"` present, `unstable_retry` prop is invoked when Try again is clicked.

**Stub strategy** — `EmptyState.test.tsx:9-13` shows the canonical pattern for stubbing imported children. For `error.test.tsx` you may stub `next/link` similar to how `ProductCard.test.tsx:7-9` stubs `next/image`:

```tsx
// ProductCard.test.tsx:7-9 — stub Next.js components to keep test pure
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))
```

For `error.test.tsx` the equivalent:

```tsx
vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))
```

**Composite test (recommended skeleton):**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}))

import Error from './error'

afterEach(() => {
  cleanup()
})

describe('app/error.tsx (POL-03 page-level boundary)', () => {
  it('renders the friendly headline and apology copy', () => {
    const retry = vi.fn()
    render(<Error error={new Error('boom') as Error & { digest?: string }} unstable_retry={retry} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong')
  })

  it('Try again button calls unstable_retry', () => {
    const retry = vi.fn()
    render(<Error error={new Error('x') as Error & { digest?: string }} unstable_retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('Go home link points at /', () => {
    render(<Error error={new Error('x') as Error & { digest?: string }} unstable_retry={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
  })

  it('does NOT render error.message in the DOM (security: V7 — no leak)', () => {
    const err = new Error('SECRET_DETAIL_DO_NOT_LEAK') as Error & { digest?: string }
    render(<Error error={err} unstable_retry={vi.fn()} />)
    expect(document.body.textContent).not.toContain('SECRET_DETAIL_DO_NOT_LEAK')
  })
})
```

**Vitest config awareness:** `dealdrop/vitest.config.ts:10` already includes `app/**/*.test.{ts,tsx}` in the test glob and aliases `@/components/ui/*` → `./components/ui/*` (Shadcn root) and `@` → `./src`. No new config required.

---

### `dealdrop/app/global-error.test.tsx` (static-shape test)

**Primary analog:** `dealdrop/src/components/dashboard/EmptyState.test.tsx` (same shape; no children to stub)

**Distinguishing assertion:** verify the rendered DOM includes `<html>` and `<body>` shell (or, since RTL renders into a div, assert the inline styled div + h2 + button exist). Because RTL renders test components into a host `<div>`, asserting on the `<html>` tag literally is brittle — instead assert on the contained `<button>{Try again}</button>` and inline-style presence:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import GlobalError from './global-error'

afterEach(() => {
  cleanup()
})

describe('app/global-error.tsx (POL-03 root boundary)', () => {
  it('renders the friendly headline', () => {
    render(<GlobalError error={new Error('x') as Error & { digest?: string }} unstable_retry={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong')
  })

  it('Try again button calls unstable_retry', () => {
    const retry = vi.fn()
    render(<GlobalError error={new Error('x') as Error & { digest?: string }} unstable_retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('does NOT render error.message in the DOM', () => {
    const err = new Error('LEAK_ME_NOT') as Error & { digest?: string }
    render(<GlobalError error={err} unstable_retry={vi.fn()} />)
    expect(document.body.textContent).not.toContain('LEAK_ME_NOT')
  })
})
```

**Note on `<html>` rendering under jsdom:** RTL's `render` injects into a div under document.body, so the `<html>` and `<body>` tags written by GlobalError end up as nested elements (not the document root). This is fine for static-shape — Vitest is asserting the component's JSX, not Next.js's actual page render. The behavioral check (Next.js properly mounts `<html><body>` at the document root in prod) is covered by the manual UAT in `07-VERIFICATION.md` per RESEARCH §Pattern 1.

---

### `dealdrop/app/icon.tsx` (dynamic icon, ImageResponse)

**Primary analog:** None in-repo — first `ImageResponse` use in DealDrop. Use Next.js docs verbatim.
**Authoritative specs:**
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md:83-100` (the canonical file shape)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` (constraints: flexbox-only, 500KB cap, ttf/otf/woff fonts)

**Top-level-app/-export pattern (typed exports + default function)** — closest in-repo analog is `dealdrop/app/layout.tsx:1-22` (typed `Metadata` export + default-exported component):

```tsx
// layout.tsx:1-22 — pattern of `import type` + typed exported constants + default export
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// ...
export const metadata: Metadata = {
  title: "DealDrop — Universal Price Tracker",
  description: "Track products from any e-commerce site. Get email alerts the moment the price drops.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // ...
}
```

The `app/icon.tsx` shape mirrors this structure: typed constants exports + default function.

**Composite (verbatim from RESEARCH §Pattern 2):**

```tsx
// dealdrop/app/icon.tsx
import { ImageResponse } from 'next/og'

// Image metadata — Next.js reads these to build the <link rel="icon"> tag.
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Default export returns Response | Blob | ArrayBuffer | TypedArray | DataView | ReadableStream.
// ImageResponse satisfies this and is the documented "easiest way to generate an icon".
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          background: '#18181b', // zinc-900 (matches Shadcn theme)
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

**Critical constraint reminders (from `image-response.md`):**
- Flexbox + a subset of CSS only. NO `display: grid`. NO `gap` on grid containers.
- 500KB bundle ceiling.
- Custom fonts must be ttf, otf, or woff.
- No emojis (project convention) — the "D" letterform is the simplest legal glyph at 32×32.

**Pair with deletion of `dealdrop/app/favicon.ico`** in the same plan/commit (RESEARCH §R-04 — browser cache race between the two conventions).

---

### `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql`

**Primary analog:** `dealdrop/supabase/migrations/0005_cron_daily_price_check.sql` (Match Quality: **exact** — same wrapper function, same idempotent unschedule, same Vault read pattern, only the URL string differs)

**Header comment pattern** — copy from `0005_cron_daily_price_check.sql:1-14` (file-purpose comment + source citations):

```sql
-- File: dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
-- CRON-10 / CRON-11: daily pg_cron job POSTs /api/cron/check-prices with a
-- Vault-backed Bearer token. cron.job.command is grep-clean of the plaintext
-- secret because the wrapper function reads vault.decrypted_secrets inside a
-- SECURITY DEFINER scope, ...
--
-- Source: https://supabase.com/docs/guides/database/vault
-- Source: https://supabase.com/docs/guides/database/extensions/pg_net
-- Source: https://github.com/citusdata/pg_cron
-- Source: https://supabase.com/docs/guides/cron/quickstart
```

**SECURITY DEFINER wrapper function pattern** — copy verbatim from `0005_cron_daily_price_check.sql:90-131` and change ONLY the URL constant on line 117:

```sql
-- 0005_cron_daily_price_check.sql:90-131 — the wrapper to recreate-or-replace
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
    raise exception 'dealdrop_cron_secret not set in vault — run Step 1 of migration 0005 with a real token';
  end if;

  select net.http_post(
    url := 'https://dealdrop.vercel.app/api/cron/check-prices',  -- <<< CHANGE THIS LINE in 0006
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
```

**REVOKE/GRANT pattern** — copy verbatim from `0005_cron_daily_price_check.sql:133-136`:

```sql
revoke execute on function public.trigger_price_check_cron() from public;
revoke execute on function public.trigger_price_check_cron() from anon;
revoke execute on function public.trigger_price_check_cron() from authenticated;
grant  execute on function public.trigger_price_check_cron() to service_role;
```

**Idempotent unschedule + reschedule pattern** — copy verbatim from `0005_cron_daily_price_check.sql:151-161`:

```sql
-- 0005_cron_daily_price_check.sql:151-161 — exactly the idempotency pattern 0006 needs
do $$
begin
  perform cron.unschedule('dealdrop-daily-price-check')
  where exists (select 1 from cron.job where jobname = 'dealdrop-daily-price-check');
end $$;

select cron.schedule(
  'dealdrop-daily-price-check',
  '0 9 * * *',                              -- 09:00 UTC daily (Pitfall 2 — server clock is UTC)
  $$select public.trigger_price_check_cron()$$
);
```

**Composite (verbatim from RESEARCH §Pattern 5):** see RESEARCH lines 440-518 for the complete `0006_cron_prod_url_cutover.sql` skeleton. The only delta from 0005 is:
1. Different leading comment (DEP-05 cutover purpose, prerequisite Vault note).
2. URL constant on the `net.http_post` call: `'https://<PROD-URL>.vercel.app/api/cron/check-prices'` (placeholder — operator replaces at apply time).

**Vault prerequisite (R-03):** Migration 0006 will fail with `dealdrop_cron_secret not set in vault` if applied to a fresh prod project. Plan 07-05 must create the Vault secret in prod via SQL Editor BEFORE applying 0006. This is the same precondition documented in `0005_cron_daily_price_check.sql:54-63`.

---

### `dealdrop/src/components/{hero,header,dashboard}/*.tsx` (mobile audit — empirical modifications)

**Primary analog:** Self — each modified file uses its own established Tailwind responsive vocabulary. No new abstractions per CONTEXT.md D-05 ("fix-as-found audit pass… NO opportunistic refactor of breakpoints").

**Established responsive vocabulary in the codebase (DO NOT introduce new prefixes):**

| File | Lines | Pattern |
|------|-------|---------|
| `dealdrop/src/components/hero/Hero.tsx:6` | `px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16` | mobile-first padding scale (3-tier) |
| `dealdrop/src/components/hero/Hero.tsx:7` | `text-3xl sm:text-5xl` + `leading-tight sm:leading-[1.1]` | mobile-first typography scale |
| `dealdrop/src/components/hero/Hero.tsx:14` | `grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6` | mobile-first grid columns |
| `dealdrop/src/components/header/Header.tsx:12` | `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full` | container + responsive horizontal padding |
| `dealdrop/src/components/dashboard/DashboardShell.tsx:12` | `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16` | matches Header container width + scaled vertical padding |
| `dealdrop/src/components/dashboard/ProductGrid.tsx:98` | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6` | 3-tier responsive product grid (canonical) |
| `dealdrop/src/components/dashboard/ProductCard.tsx:36` | `flex items-center justify-between px-4 pb-4` | unscaled inner card footer (mobile breakpoint candidate if Show Chart wraps) |
| `dealdrop/src/components/auth/AuthModal.tsx:40` | `<DialogContent className="sm:max-w-md">` | dialog max-width mobile-first |
| `dealdrop/src/components/dashboard/AddProductDialog.tsx:26` | `<DialogContent className="sm:max-w-md">` | matches AuthModal dialog sizing |

**Common mobile-break fix patterns to apply during audit (RESEARCH §Pattern 6 — apply only if observed):**

| Symptom | Tailwind fix (in established vocabulary) |
|---------|-------------------------------------------|
| Header overflow at 320px | `flex-wrap` on the inner div + `truncate` on `<span>` logo |
| ProductCard image squashed on flex children | Replace any `min-w-*` on flex children with `min-w-0` |
| AddProductDialog body cut off at 320px | `max-w-[90vw] sm:max-w-md` (extend the existing `sm:max-w-md`) |
| ProductCard footer buttons wrap badly | `flex-wrap gap-2` on the footer div (extending the existing `flex items-center justify-between px-4 pb-4`) |
| Long product URL forces horizontal scroll | Add `truncate` + `min-w-0` on the flex parent + `break-words` on text |
| Show Chart label too long at 320px | `text-xs sm:text-sm` (mobile-down scale) |

**Constraints to honor (from RESEARCH §R-11 + CONTEXT D-05):**
- Single Tailwind tweak per break (default).
- > ~6 distinct breaks at 320px = flag deviation to user before tweaking.
- No new abstractions, no breakpoint primitives, no container queries (`@container`), no `@theme` blocks.
- Use existing prefixes only: `sm:` (640px), `md:` (768px), `lg:` (1024px).
- Document every fix in `07-VERIFICATION.md` as a `viewport / observed break / fix shipped` row (table format from RESEARCH lines 601-612).

---

## Shared Patterns

### `'use client'` directive (first line, before all imports)

**Source:** `dealdrop/src/components/auth/AuthModal.tsx:1`, `dealdrop/src/components/dashboard/ProductGrid.tsx:1`, `dealdrop/src/components/dashboard/ProductCard.tsx:1`, `dealdrop/src/components/dashboard/RemoveProductDialog.tsx:1`, `dealdrop/src/components/dashboard/AddProductForm.tsx:1`, `dealdrop/src/components/dashboard/AddProductDialog.tsx:1`, `dealdrop/src/components/auth/AuthModalProvider.tsx:1`, `dealdrop/src/components/auth/SignInButton.tsx:1`, `dealdrop/src/components/auth/SignOutButton.tsx`

**Apply to:** `dealdrop/app/error.tsx`, `dealdrop/app/global-error.tsx`

```tsx
'use client'  // line 1, no blank line above

import { ... } from 'react'
```

NOTE: Per `dealdrop/AGENTS.md` (this is NOT the Next.js you know), `'use client'` is the only directive needed for error boundaries — error boundaries CANNOT be Server Components. Do NOT add `import 'server-only'` here (that's for server modules only — established in `dealdrop/src/lib/env.server.ts`).

### Path alias `@/*`

**Source:** Used uniformly across the codebase. Examples:
- `dealdrop/src/components/dashboard/ProductGrid.tsx:5` — `import { SkeletonCard } from './SkeletonCard'`
- `dealdrop/src/components/dashboard/ProductGrid.tsx:6` — `import { AddProductDialog } from './AddProductDialog'`
- `dealdrop/src/components/dashboard/ProductCard.tsx:6` — `import { Card } from '@/components/ui/card'`
- `dealdrop/src/components/dashboard/ProductCard.tsx:7` — `import { Badge } from '@/components/ui/badge'`

**Apply to:** `dealdrop/app/error.tsx` (Card + Button imports), `dealdrop/app/error.test.tsx`, `dealdrop/app/global-error.test.tsx`

```tsx
// Shadcn primitives — always under @/components/ui/ (resolved by vitest.config.ts:36 alias)
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
```

### Functional components with `Readonly<>` props

**Source:** `dealdrop/src/components/header/Header.tsx:5-9`, `dealdrop/src/components/hero/FeatureCard.tsx:4-8`, `dealdrop/src/components/dashboard/DashboardShell.tsx:6-7`, `dealdrop/app/layout.tsx:24-28`

```tsx
// Header.tsx:5-9 — canonical typed-props pattern
type HeaderProps = Readonly<{
  user: User | null
}>

export function Header({ user }: HeaderProps) {
  ...
}
```

**Apply to:** error.tsx + global-error.tsx accept the Next.js-prescribed prop shape (which is NOT wrapped in `Readonly<>` — Next.js docs use the inline-type pattern). This is a justified deviation because the prop shape is dictated by the framework. Document in plan that Next.js docs win over project convention here.

### Vitest test header (`@vitest-environment jsdom` + setup)

**Source:** `dealdrop/src/components/dashboard/EmptyState.test.tsx:1-19`, `dealdrop/src/components/dashboard/ProductCard.test.tsx:1-22`, `dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx:1-21`, `dealdrop/src/components/dashboard/PriceChart.test.tsx:1-23`

**Apply to:** `dealdrop/app/error.test.tsx`, `dealdrop/app/global-error.test.tsx`

```tsx
// First line — the magic comment Vitest reads for per-file env override.
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// (optional) child-component stubs via vi.mock here

import { ComponentUnderTest } from './ComponentUnderTest'

afterEach(() => {
  cleanup()
})

describe('ComponentUnderTest', () => {
  it('renders foo', () => { ... })
})
```

**Vitest config awareness:** `dealdrop/vitest.config.ts:10` already includes `app/**/*.test.{ts,tsx}` so `app/error.test.tsx` and `app/global-error.test.tsx` will be picked up with no config change.

### No emojis in source files

**Source:** Established across all phases (CONTEXT.md `<code_context>` §Established Patterns).

**Apply to:** error boundary fallback copy ("Something went wrong" + apology text — NO emojis), `app/icon.tsx` glyph (use the "D" letterform, NOT an emoji glyph).

### Error logging — digest only, never message

**Source:** RESEARCH §V7 + `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:104-115` (production strips `error.message` for Server Component errors).

**Apply to:** `dealdrop/app/error.tsx`, `dealdrop/app/global-error.tsx`

```tsx
useEffect(() => {
  // Log digest only. Do NOT log error.message — Next.js 16 strips it in prod
  // for SC errors, and CONTEXT.md D-02 forbids any UI reveal of stack/message.
  console.error('app/error.tsx caught:', { digest: error.digest })
}, [error])
```

### Migration-per-concern (never reopen a prior migration)

**Source:** `dealdrop/CLAUDE.md` (project convention) + RESEARCH "Project Constraints" §"Migration-per-concern" + the existing `0001..0005` migration sequence.

**Apply to:** Phase 7's pg_cron prod cutover ships as `dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql`. **Do NOT edit `0005_cron_daily_price_check.sql` in place.** The wrapper function is replaced via `create or replace` in 0006, leaving the 0005 audit trail intact.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `dealdrop/app/icon.tsx` | dynamic-icon route | `ImageResponse` one-off render | First `next/og` use in DealDrop — no prior `ImageResponse` call site exists. Use the verbatim Next.js docs pattern (RESEARCH §Pattern 2 + `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md:83-100`). |

The error boundaries (`error.tsx` and `global-error.tsx`) had no exact analog either (no error boundary in the repo before Phase 7), but the centered-card layout + Shadcn imports + `'use client'` patterns from existing client components (`AuthModal.tsx`, `EmptyState.tsx`, `FeatureCard.tsx`, `RemoveProductDialog.tsx`) compose into a high-quality role-match. Combined with the verbatim Next.js 16.2 docs spec, the planner has a complete picture.

---

## Cross-Cutting Notes for the Planner

1. **CONTEXT-vs-docs delta on the prop name** (R-01, RESEARCH §Pattern 1): CONTEXT.md says `reset()`. Next.js 16.2 docs (verified at `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:25-50`) say `unstable_retry`. **Follow the docs**. Per `dealdrop/AGENTS.md` ("This is NOT the Next.js you know"), the plan's Wave 0 task 0 must be a `Read` of that error.md doc before any of error.tsx / global-error.tsx are written.

2. **Ordering matters for Phase 7 plans** (RESEARCH §"Recommended Plan Decomposition"):
   - Plan 07-01 (error boundaries) — independent, ship first.
   - Plan 07-02 (icon.tsx + favicon.ico delete) — independent, ship next.
   - Plan 07-03 (POL-01/02/05 verification sweep) — independent.
   - Plan 07-04 (mobile audit) — depends on 07-01 shipping (audit also covers error fallback).
   - Plan 07-05 (Vercel + prod Supabase) — must precede 07-06, 07-07, 07-08 (all need the prod URL).
   - Plan 07-06 (OAuth) — depends on 07-05's prod URL + Supabase ref.
   - Plan 07-07 (pg_cron cutover migration) — depends on 07-05's prod URL + Vault secret created.
   - Plan 07-08 (DEP-06 end-to-end) — synthesis; depends on all above.

3. **Vault secret precondition for migration 0006** (R-03): The plan for 07-07 must include "operator runs `vault.create_secret('<48-char-prod-token>', 'dealdrop_cron_secret', '...')` in Supabase SQL Editor for the prod project" as an explicit step BEFORE `npx supabase db push --linked`. The same value must match Vercel `production` env's `CRON_SECRET`.

4. **No imports of `@/components/ui/*` in `global-error.tsx`** — defensive coding because the layout itself may have crashed (RESEARCH §Pattern 1 "the error inside the error trap"). Use inline styles. This is the explicit divergence from the `error.tsx` / `EmptyState.tsx` / `FeatureCard.tsx` analog pattern.

5. **Mobile audit is bounded** (R-11): default budget is "single Tailwind tweak per break"; > ~6 distinct breaks at 320px is the threshold to flag a deviation. The set of files modified is empirical — only the components/files with observed breaks change. No opportunistic refactor.

---

## Metadata

**Analog search scope:**
- `dealdrop/app/` (root app dir + layout/page)
- `dealdrop/src/components/{auth,dashboard,header,hero}/` (all React components)
- `dealdrop/components/ui/` (Shadcn primitives — Card, Button, AlertDialog, Dialog, Sonner)
- `dealdrop/src/lib/` (env split, utils, products, firecrawl, resend)
- `dealdrop/supabase/migrations/` (0001..0005)
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` (error.md, app-icons.md)

**Files scanned:** ~30 source files + 5 migrations + 2 Next.js docs

**Pattern extraction date:** 2026-04-25
