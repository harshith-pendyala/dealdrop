# Phase 8: Brand Polish — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 15 (8 modified source, 1 new asset already on disk, 3 modified tests, 1 new test, 1 modify-or-delete favicon, 1 conditional working-tree delete)
**Analogs found:** 14 / 15 (the only "no analog" case is the orange-50 gradient utility — no `bg-gradient-*` exists anywhere in the codebase today; pattern is sourced from RESEARCH.md instead)

---

## File Classification

| File | Action | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `dealdrop/app/globals.css` | modify | config (CSS theme tokens) | request-response (browser CSS cascade) | self — `:root` block + `@media (prefers-color-scheme: dark)` block already ship the exact pattern | exact (token-value swap, not structural) |
| `dealdrop/src/components/header/Header.tsx` | modify | component (RSC) | request-response (server-render) | `dealdrop/src/components/dashboard/ProductCard.tsx:19-25` (only existing `next/image` use) + `dealdrop/src/components/dashboard/ProductCard.tsx:38-40` (existing `<a>` href pattern → upgrade to `<Link>`) | role-match (RSC w/ `next/image`) — no existing `next/link` use in src to copy from |
| `dealdrop/src/components/hero/Hero.tsx` | modify | component (RSC) | request-response (server-render) | self — keep section/grid structure; delete one `<p>` block; add gradient utility to existing className | exact (structural shape unchanged) |
| `dealdrop/app/globals.css` (gradient consumer side) | n/a | — | — | RESEARCH.md §"Hero gradient specification" — no in-repo `bg-gradient-*` precedent | no analog (use Tailwind utility from research) |
| `dealdrop/src/components/dashboard/ProductCard.tsx` | modify | component (client) | request-response | self — line 29 already uses `text-xl font-semibold`; D-05 adds `text-primary` | exact (single-class addition) |
| `dealdrop/src/components/dashboard/AddProductDialog.tsx` | modify | component (client) | request-response | self — string-literal copy swap on `lines 24, 28` | exact (copy-only) |
| `dealdrop/src/components/dashboard/AddProductForm.tsx` | modify | component (client) | request-response | self — string-literal copy swap on `lines 38, 44, 132` | exact (copy-only) |
| `dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx` | audit-only | component (client) | request-response | self — file has no user-facing string literals; verify nothing surfaced | exact (no change expected) |
| `dealdrop/src/components/dashboard/EmptyState.tsx` | audit-only | component (RSC) | request-response | self — heading already says `Track your first product`; no rename needed | exact (no change expected) |
| `dealdrop/src/components/dashboard/AddProductForm.test.tsx` | modify | test (vitest jsdom) | test-render | self — `lines 30, 36, 96, 104` carry `Track` regex + `Product added!` literal assertions | exact (assertion swap) |
| `dealdrop/src/components/dashboard/ProductGrid.test.tsx` | modify | test (vitest jsdom) | test-render | self — `line 19` stub button text `+ Add Product` | exact (literal swap inside `vi.mock` factory) |
| `dealdrop/src/components/dashboard/EmptyState.test.tsx` | audit-only | test (vitest jsdom) | test-render | self — already asserts `Track your first product` (the post-rename copy) | exact (no change expected) |
| `dealdrop/src/components/dashboard/InlineAddProductWrapper.test.tsx` | audit-only | test (vitest jsdom) | test-render | self — only stubs structural props; no `Add Product` literal assertion | exact (no change expected) |
| `dealdrop/src/components/header/Header.test.tsx` | NEW | test (vitest jsdom) | test-render | `dealdrop/src/components/dashboard/EmptyState.test.tsx` (closest "RSC component test with text + role assertions") and `dealdrop/src/components/dashboard/ProductCard.test.tsx:6-9` (canonical `next/image` stub for tests) | exact (compose both into a new minimal test) |
| `dealdrop/app/icon.tsx` | modify (path B) OR delete (path A) | route handler (ImageResponse) | request-response | self — D-12 path B keeps the file shape and only swaps the inline color values + glyph | exact (Path B is a 3-line value swap) |
| `dealdrop/app/icon.png` (path A only) | NEW | static asset | static-serve | `dealdrop/public/deal-drop-logo.png` already on disk; Next.js icon-route file convention | role-match (Next.js auto-generates `<link rel="icon">`) |
| `dealdrop/app/favicon.ico` | DELETE | static asset (working-tree leftover) | n/a | RESEARCH.md §"Common Pitfalls" pitfall 2; Phase 7 D-07 already directed deletion | n/a (untrack + remove) |

---

## Pattern Assignments

### `dealdrop/app/globals.css` — token redefinition (BRAND-04 / D-06 / D-07)

**Role:** config (CSS custom properties consumed by Tailwind v4 `@theme inline` + Shadcn utility classes + direct `var(--primary)` consumers)
**Data flow:** browser CSS cascade — synchronous re-resolve on every consumer when `--primary` changes
**Analog:** self. The light-mode `:root` and dark-mode `@media (prefers-color-scheme: dark)` blocks already define `--primary` and `--primary-foreground`. Phase 8 only swaps the oklch values; the surrounding structure is verbatim Shadcn new-york + zinc preset and must NOT be reshaped.

**Existing structure to preserve verbatim** (`dealdrop/app/globals.css:6-39`, light mode `:root`):

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);              /* ← CHANGE THIS LINE ONLY */
  --primary-foreground: oklch(0.985 0 0);            /* ← keep value (zinc-50 still passes AA) */
  --secondary: oklch(0.967 0.001 286.375);
  /* ...rest unchanged... */
  --accent: oklch(0.967 0.001 286.375);              /* ← DO NOT TOUCH (Shadcn neutral hover) */
  --accent-foreground: oklch(0.21 0.006 285.885);    /* ← DO NOT TOUCH */
  /* ...rest unchanged... */
}
```

**Existing structure to preserve verbatim** (`dealdrop/app/globals.css:81-114`, dark mode block):

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.141 0.005 285.823);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.21 0.006 285.885);
    /* ... */
    --primary: oklch(0.92 0.004 286.32);             /* ← CHANGE THIS LINE */
    --primary-foreground: oklch(0.21 0.006 285.885); /* ← CHANGE THIS LINE (flip light→dark on orange-400 bg) */
    /* ... */
    --accent: oklch(0.274 0.006 286.033);            /* ← DO NOT TOUCH */
    /* ...rest unchanged... */
  }
}
```

**Existing `@theme inline` consumer** (`dealdrop/app/globals.css:69-70`) — auto-cascades and requires zero edits:

```css
@theme inline {
  /* ...other token bindings... */
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  /* ...other token bindings... */
}
```

**New oklch values to substitute** (RESEARCH.md §"Code Examples Example 2"; verified against `dealdrop/node_modules/tailwindcss/theme.css`):

| Block | Token | Before | After |
|-------|-------|--------|-------|
| `:root` | `--primary` | `oklch(0.21 0.006 285.885)` (zinc-900) | `oklch(0.705 0.213 47.604)` (Tailwind v4.2.2 orange-500) |
| `:root` | `--primary-foreground` | `oklch(0.985 0 0)` (zinc-50) | `oklch(0.985 0 0)` (unchanged — passes AA on orange-500) |
| `@media (dark)` | `--primary` | `oklch(0.92 0.004 286.32)` (zinc-200) | `oklch(0.75 0.183 55.934)` (Tailwind v4.2.2 orange-400, lifted L) |
| `@media (dark)` | `--primary-foreground` | `oklch(0.21 0.006 285.885)` (zinc-900) | `oklch(0.141 0.005 285.823)` (zinc-950 — flips dark on lighter orange-400) |

> WARNING: UI-SPEC line 108 lists `oklch(0.646 0.222 41.116)` as orange-500 — that value is actually orange-**600**. Use the value above (verified in `dealdrop/node_modules/tailwindcss/theme.css`, per RESEARCH.md §"Common Pitfalls Pitfall 1"). Cite the file path + line in the plan.

---

### `dealdrop/src/components/header/Header.tsx` — logo replacement (BRAND-02 / D-02..D-04)

**Role:** component (RSC — receives `user: User | null` from `app/page.tsx`, no `'use client'`)
**Data flow:** request-response (server-render once per request; props are server-resolved Supabase user)
**Analog (closest by data flow + role):** No existing component uses `next/link`. The closest analog for `next/image` usage in this codebase is **`dealdrop/src/components/dashboard/ProductCard.tsx:19-25`**.

**Imports pattern to copy** (composes from existing files):

```tsx
// Header.tsx already has:
import type { User } from '@supabase/supabase-js'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'

// ADD these two — both server-component-safe (no 'use client' needed):
import Link from 'next/link'
import Image from 'next/image'
```

**`next/image` usage pattern** (copy structure from `dealdrop/src/components/dashboard/ProductCard.tsx:19-25`):

```tsx
// Existing pattern in ProductCard.tsx:
<Image
  src={product.image_url ?? '/placeholder-product.svg'}
  alt={product.name}
  width={400}
  height={300}
  className="object-contain w-full h-full"
/>
```

Apply that shape to the header logo (no `priority` or `className` precedent in this codebase, but `priority` is correct for an above-the-fold logo per Next.js docs; RESEARCH.md §"Pattern 3" verifies):

```tsx
<Image
  src="/deal-drop-logo.png"
  alt="DealDrop"
  width={95}     // 620 ÷ (210/32) ≈ 94.48; round to 95 (RESEARCH.md §"Pattern 3")
  height={32}    // D-03: locked to 32px
  priority       // above-the-fold; logo loads eagerly
/>
```

**Core pattern — shell to keep verbatim** (`dealdrop/src/components/header/Header.tsx:9-18`, only the inner `<span>` is replaced):

```tsx
export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        <span className="text-sm font-medium tracking-tight">DealDrop</span>   {/* ← REPLACE THIS LINE */}
        {user ? <SignOutButton /> : <SignInButton />}
      </div>
    </header>
  )
}
```

**Replace inner span with** (D-02 + D-03 + D-04 — RESEARCH.md §"Pattern 4" verified `<Link>` + `<Image>` is server-component-safe):

```tsx
<Link href="/" aria-label="DealDrop home" className="inline-flex items-center">
  <Image src="/deal-drop-logo.png" alt="DealDrop" width={95} height={32} priority />
</Link>
```

**Anti-patterns to avoid** (from RESEARCH.md §"Anti-Patterns to Avoid"):
- Do NOT add `'use client'` to `Header.tsx` — both `Link` and `Image` are server-component-safe.
- Do NOT improvise side-by-side logo + wordmark composition. If the user's PNG is symbol-only, flag as deviation per D-02.

---

### `dealdrop/src/components/hero/Hero.tsx` — gradient + footer cleanup (BRAND-01 / D-09 / D-10)

**Role:** component (RSC, no client boundary)
**Data flow:** request-response
**Analog:** self. Two surgical edits:
1. **Delete** `lines 31-33` (the `<p className="mt-16 text-xs text-muted-foreground">Made with love</p>` block).
2. **Modify** the `<section>` className on `line 6` to add the orange-50 gradient utility (and `dark:from-transparent` to suppress in dark mode).

**Existing section className to extend** (`dealdrop/src/components/hero/Hero.tsx:6`):

```tsx
<section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16">
```

**Replace with** (RESEARCH.md §"Code Examples Example 3" — note the `dark:from-transparent` to dodge Pitfall 5):

```tsx
<section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16 bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent">
```

**Footer block to delete verbatim** (`dealdrop/src/components/hero/Hero.tsx:31-33`):

```tsx
<p className="mt-16 text-xs text-muted-foreground">
  Made with love
</p>
```

**No analog precedent for `bg-gradient-to-*`** in this codebase (verified — no other component uses a gradient utility). Pattern is sourced directly from Tailwind v4 docs via RESEARCH.md §"Hero gradient specification".

**Verify post-deletion** that the FeatureCard grid above still has reasonable bottom rhythm via the existing `pb-12 sm:pb-16` on the section — no spacer replacement needed.

---

### `dealdrop/src/components/dashboard/ProductCard.tsx` — price `text-primary` (BRAND-04 / D-05)

**Role:** component (client — `'use client'` at line 1)
**Data flow:** request-response
**Analog:** self. Single utility-class addition.

**Existing price element** (`dealdrop/src/components/dashboard/ProductCard.tsx:29-31`):

```tsx
<p className="text-xl font-semibold">
  {formatPrice(product.current_price, product.currency)}
</p>
```

**Replace with** (UI-SPEC §"Typography" line 71 — Price is the Subheading-with-accent alias):

```tsx
<p className="text-xl font-semibold text-primary">
  {formatPrice(product.current_price, product.currency)}
</p>
```

`text-primary` resolves via the `@theme inline { --color-primary: var(--primary); }` binding, which means the orange auto-cascades from the `globals.css` redefinition.

---

### `dealdrop/src/components/dashboard/AddProductDialog.tsx` — copy rename (D-11)

**Role:** component (client)
**Data flow:** request-response
**Analog:** self. Two literal swaps.

**Existing copy to rename** (`dealdrop/src/components/dashboard/AddProductDialog.tsx:23-29`):

```tsx
<DialogTrigger asChild>
  <Button variant="default">+ Add Product</Button>      {/* ← line 24: rename */}
</DialogTrigger>
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Add a product</DialogTitle>             {/* ← line 28: rename */}
  </DialogHeader>
```

**Replace with** (UI-SPEC §"Copywriting Contract" lines 167-178):

```tsx
<DialogTrigger asChild>
  <Button variant="default">+ Track Price</Button>
</DialogTrigger>
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Track a price</DialogTitle>
  </DialogHeader>
```

---

### `dealdrop/src/components/dashboard/AddProductForm.tsx` — copy rename (D-11)

**Role:** component (client) — also exports the pure `dispatchToastForState` function and the `REASON_TO_TOAST` registry.
**Data flow:** request-response (form submit → server action) + side-effect (Sonner toast)
**Analog:** self. Three literal swaps in source plus a JSDoc comment update.

**JSDoc to update** (`dealdrop/src/components/dashboard/AddProductForm.tsx:32-40`):

```tsx
/**
 * ...
 * Semantics:
 *   - null           → no-op (no toast)
 *   - { ok: true }   → toast.success('Product added!')      ← line 38: change comment string
 *   - { ok: false }  → toast.error(REASON_TO_TOAST[state.reason])
 */
```

**Toast literal to rename** (`dealdrop/src/components/dashboard/AddProductForm.tsx:41-48`):

```tsx
export function dispatchToastForState(state: AddProductActionResult | null): void {
  if (!state) return
  if (state.ok) {
    toast.success('Product added!')   // ← line 44: rename to UI-SPEC §line 197 copy
  } else {
    toast.error(REASON_TO_TOAST[state.reason])
  }
}
```

**Submit-button label to rename** (`dealdrop/src/components/dashboard/AddProductForm.tsx:130-133`):

```tsx
<Button type="submit" variant="default" disabled={pending}>
  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Track                              {/* ← line 132: rename to "Track Price" */}
</Button>
```

**Replace toast (line 44 + matching JSDoc on line 38) with**: `'Now tracking'` — UI-SPEC §line 197 specifies `'Now tracking [product name]'`, but the dispatcher does not have access to the product name at the call site. The simplest portfolio-bar copy is `'Now tracking'`. RESEARCH.md §"Code Examples Example 7" notes this tradeoff.

**Replace button label (line 132) with**: `Track Price`.

> **Test impact:** This rename breaks the `'Product added!'` literal assertion at `AddProductForm.test.tsx:96, 104`. See test pattern below.

---

### `dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx` — audit-only (D-11)

**Role:** component (client wrapper for `useActionState` + `dispatchToastForState`)
**Data flow:** request-response
**Analog:** self.

**Audit confirmation** — file inspected; no user-facing string literals appear. `lines 32-54` only render `<AddProductForm>` with forwarded props. No rename needed. Plan should grep `Add Product` against this file as a verification step but expect zero matches.

---

### `dealdrop/src/components/dashboard/EmptyState.tsx` — audit-only (D-11)

**Role:** component (RSC)
**Data flow:** request-response
**Analog:** self.

**Audit confirmation** — `EmptyState.tsx:8` already renders `Track your first product` (the post-rename copy). No further rename needed. The CTA is delegated to `<InlineAddProductWrapper>` which renders `<AddProductForm>` (whose button label is being renamed in the AddProductForm plan above), so EmptyState gets the new "Track Price" button transitively.

---

### `dealdrop/src/components/dashboard/AddProductForm.test.tsx` — assertion updates (D-11)

**Role:** test (vitest jsdom)
**Data flow:** test-render
**Analog:** self. The existing test file already uses the canonical patterns (vitest mocks for `sonner` + `useAuthModal`, `@vitest-environment jsdom`, `cleanup()` after each, `'@testing-library/jest-dom/vitest'` matchers).

**Imports + setup pattern to keep verbatim** (`AddProductForm.test.tsx:1-22`):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

const toastSuccess = vi.fn()
const toastError = vi.fn()
const openAuthModal = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))
vi.mock('@/components/auth/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal, isOpen: false, setOpen: vi.fn() }),
}))

import { AddProductForm, dispatchToastForState, REASON_TO_TOAST } from './AddProductForm'
```

**Assertions to update**:

| Line | Before | After |
|------|--------|-------|
| 30 (test name) | `'TRACK-02: renders a form with a URL input and Track button'` | optional tighten to `'...Track Price button'` |
| 36 | `expect(screen.getByRole('button', { name: /Track/i })).toBeTruthy()` | leave as-is (regex `/Track/i` still matches `"Track Price"`); or tighten to `/Track Price/i` for explicitness |
| 93 (test name) | `'toast: { ok: true } fires toast.success once with "Product added!"'` | `'toast: { ok: true } fires toast.success once with "Now tracking"'` |
| 96 | `expect(toastSuccess).toHaveBeenCalledWith('Product added!')` | `expect(toastSuccess).toHaveBeenCalledWith('Now tracking')` |

> Verification step: after the rename, run `cd dealdrop && npx vitest run src/components/dashboard/AddProductForm.test.tsx` — should pass green.

---

### `dealdrop/src/components/dashboard/ProductGrid.test.tsx` — stub literal swap (D-11)

**Role:** test (vitest jsdom)
**Data flow:** test-render
**Analog:** self.

**Existing AddProductDialog stub** (`ProductGrid.test.tsx:15-21`):

```tsx
vi.mock('./AddProductDialog', () => ({
  AddProductDialog: (props: { authed: boolean }) => (
    <button data-testid="add-dialog-stub" data-authed={String(props.authed)}>
      + Add Product                            {/* ← line 19: rename */}
    </button>
  ),
}))
```

**Replace with**:

```tsx
vi.mock('./AddProductDialog', () => ({
  AddProductDialog: (props: { authed: boolean }) => (
    <button data-testid="add-dialog-stub" data-authed={String(props.authed)}>
      + Track Price
    </button>
  ),
}))
```

> The test never asserts on this string text — it only asserts `data-authed` and the `data-testid` — so this swap is purely "keep the stub honest with shipped copy" and the test passes either way. Still update for consistency.

---

### `dealdrop/src/components/dashboard/EmptyState.test.tsx` — audit-only (D-11)

**Role:** test (vitest jsdom)
**Data flow:** test-render
**Analog:** self. `line 24` asserts `'Track your first product'` which is already the shipped copy (no rename happening there). No change needed; planner should explicitly note "EmptyState.test.tsx audit pass — no edits".

---

### `dealdrop/src/components/dashboard/InlineAddProductWrapper.test.tsx` — audit-only (D-11)

**Role:** test (vitest jsdom)
**Data flow:** test-render
**Analog:** self. The file only stubs structural prop forwarding. No `Add Product` literal assertion. No change needed.

---

### `dealdrop/src/components/header/Header.test.tsx` — NEW (BRAND-02 — recommended per RESEARCH.md §"Wave 0 Gaps")

**Role:** test (vitest jsdom)
**Data flow:** test-render
**Analog:** **`dealdrop/src/components/dashboard/EmptyState.test.tsx`** (closest "RSC component test with text + role assertions") + **`dealdrop/src/components/dashboard/ProductCard.test.tsx:6-9`** (canonical `next/image` stub). Compose both.

**`next/image` stub pattern from `ProductCard.test.tsx:6-9`** (copy verbatim):

```tsx
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))
```

**Auth-button stub pattern modeled on `EmptyState.test.tsx:9-13`** (replace InlineAddProductWrapper with SignIn/Out):

```tsx
vi.mock('@/components/auth/SignInButton', () => ({
  SignInButton: () => <button data-testid="sign-in-stub">Sign In</button>,
}))
vi.mock('@/components/auth/SignOutButton', () => ({
  SignOutButton: () => <button data-testid="sign-out-stub">Sign Out</button>,
}))
```

**Test scaffold modeled on `EmptyState.test.tsx:1-19`** + assertions modeled on `EmptyState.test.tsx:21-39`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; width?: number; height?: number }) => (
    <img src={props.src} alt={props.alt} width={props.width} height={props.height} />
  ),
}))
vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode; 'aria-label'?: string }) => (
    <a href={props.href} aria-label={props['aria-label']}>{props.children}</a>
  ),
}))
vi.mock('@/components/auth/SignInButton', () => ({
  SignInButton: () => <button data-testid="sign-in-stub">Sign In</button>,
}))
vi.mock('@/components/auth/SignOutButton', () => ({
  SignOutButton: () => <button data-testid="sign-out-stub">Sign Out</button>,
}))

import { Header } from './Header'

afterEach(() => {
  cleanup()
})

describe('Header (BRAND-02)', () => {
  it('renders the DealDrop logo image with alt text', () => {
    render(<Header user={null} />)
    const logo = screen.getByRole('img', { name: 'DealDrop' })
    expect(logo).toHaveAttribute('src', '/deal-drop-logo.png')
  })

  it('wraps the logo in a click-home link with aria-label', () => {
    render(<Header user={null} />)
    const link = screen.getByRole('link', { name: 'DealDrop home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders SignInButton when user is null', () => {
    render(<Header user={null} />)
    expect(screen.getByTestId('sign-in-stub')).toBeTruthy()
    expect(screen.queryByTestId('sign-out-stub')).toBeNull()
  })

  it('renders SignOutButton when user is present', () => {
    // Minimal User mock — Header only checks truthiness on `user` prop.
    render(<Header user={{ id: 'u1' } as never} />)
    expect(screen.getByTestId('sign-out-stub')).toBeTruthy()
    expect(screen.queryByTestId('sign-in-stub')).toBeNull()
  })
})
```

**Why this scaffold:** EmptyState.test.tsx is the cleanest "RSC component test that stubs a child boundary and asserts heading + role" — its shape (mock first, import second, `afterEach(cleanup)`, three or four small `it` blocks) is the project's idiomatic test contract.

---

### `dealdrop/app/icon.tsx` — Path B (modify) OR Path A (delete) (BRAND-03 / D-12)

**Role:** route handler (Next.js icon-route — returns `ImageResponse`)
**Data flow:** request-response (CDN-edge cacheable)
**Analog:** self.

**Path B (modify — keep ImageResponse, swap glyph + colors).** Preserves the existing route handler shape verbatim except for the inline `style` color values:

```tsx
// dealdrop/app/icon.tsx (existing — lines 22-46)
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          background: '#18181b',     // ← change to orange (e.g. '#f97316' = Tailwind orange-500 hex)
          color: '#fafafa',          // ← keep zinc-50 for contrast on orange
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
        }}
      >
        D                              {/* ← keep "D" or swap to wordmark-derived glyph */}
      </div>
    ),
    { ...size },
  )
}
```

The `export const size = { width: 32, height: 32 }` and `export const contentType = 'image/png'` exports stay verbatim.

> ImageResponse uses Satori, which only supports flexbox + a CSS subset (no grid). The existing structure already complies; do not introduce grid layout.

**Path A (delete + add static asset)** — RESEARCH.md §"Code Examples Example 5":

```bash
rm dealdrop/app/icon.tsx        # required — both files cannot coexist
# write dealdrop/app/icon.png   # 32×32 PNG derived from public/deal-drop-logo.png
rm -f dealdrop/app/favicon.ico  # working-tree leftover; Phase 7 D-07 already directed deletion
```

> RESEARCH.md confirms `dealdrop/app/icon.test.tsx` does **not** exist (despite the research document's mention of it). No companion test deletion needed.

> Do NOT pick Path A unless the planner can produce a 32×32 export that reads legibly. The user's logo is 620×210 (~2.95:1 aspect), so a center-cropped 32×32 of the wordmark will be illegible — Path B (ImageResponse with a single-letter glyph and orange background) is the safer default.

---

### `dealdrop/app/favicon.ico` — DELETE (RESEARCH.md §"Common Pitfalls" + Phase 7 D-07)

**Action:** `rm -f dealdrop/app/favicon.ico` regardless of Path A vs Path B for `app/icon.*`. Working-tree leftover from Next.js scaffold; Phase 7 D-07 directed deletion but the file lingered (not git-tracked, so previous deletion never landed in commits). Phase 8 must delete it once and for all to avoid Next.js auto-serving a stale icon.

---

## Shared Patterns

### Token Cascade (BRAND-04 — D-06)

**Source pattern:** `dealdrop/app/globals.css` `:root` + `@media (prefers-color-scheme: dark)` blocks; `@theme inline { --color-primary: var(--primary); }` binding.
**Apply to:** Every component that already uses `bg-primary`, `text-primary`, `hover:bg-primary/90`, or direct `var(--primary)`. Verified consumers (zero code changes required for any of these):

- `dealdrop/components/ui/button.tsx:12` — default variant `bg-primary text-primary-foreground hover:bg-primary/90`
- `dealdrop/src/components/dashboard/PriceChart.tsx:117-120` — `<Line stroke="var(--primary)" />`, `dot.fill: 'var(--card)'` + `dot.stroke: 'var(--primary)'`, `activeDot.fill: 'var(--primary)'`
- `dealdrop/src/components/hero/FeatureCard.tsx:13` — `<Icon className="h-6 w-6 text-primary" />`
- `dealdrop/src/components/dashboard/ProductCard.tsx:29` — Phase 8 ADDS `text-primary` to the price `<p>`

**Anti-pattern (RESEARCH.md §"Anti-Patterns"):** Never add `bg-orange-500` directly to a Shadcn `<Button>` instance. The token cascade is the single source of truth — bypassing it creates two sources of brand color.

---

### Vitest Component Test Scaffold (D-11 + new Header.test.tsx)

**Source pattern:** `dealdrop/src/components/dashboard/EmptyState.test.tsx` (canonical RSC component test).
**Apply to:** Any new or updated component test in this phase.

**Mandatory header** (every dashboard test file already uses this — copy verbatim):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})
```

**Mock-then-import discipline** (verified across `EmptyState.test.tsx:9-15`, `ProductCard.test.tsx:6-9`, `AddProductForm.test.tsx:11-22`):

```tsx
// 1. Declare all vi.mock() factories FIRST (hoisted by Vitest).
vi.mock('./SomeChild', () => ({ /* ... */ }))

// 2. Import the system-under-test SECOND.
import { ComponentUnderTest } from './ComponentUnderTest'
```

**Assertion idioms** (use these consistently — pulled from `EmptyState.test.tsx`, `ProductCard.test.tsx`, `AddProductForm.test.tsx`):

| Goal | Pattern |
|------|---------|
| Find a heading | `screen.getByRole('heading', { level: 1 })` |
| Assert heading text | `expect(...).toHaveTextContent('...')` |
| Find a button | `screen.getByRole('button', { name: /Track Price/i })` |
| Find an image | `screen.getByRole('img', { name: 'DealDrop' })` |
| Find a link | `screen.getByRole('link', { name: 'DealDrop home' })` |
| Find an attribute | `expect(...).toHaveAttribute('href', '/')` |
| Negative existence | `expect(screen.queryByTestId(...)).toBeNull()` |

---

### Copy-Rename Verification (D-11)

**Source pattern:** RESEARCH.md §"Common Pitfalls Pitfall 3".
**Apply to:** Plan that performs the "Add Product" → "Track Price" rename.

**Mandatory verification step**:

```bash
cd dealdrop && grep -r "Add Product\|Product added" src/ | wc -l
# Expected: 0 (any nonzero result fails the rename plan).
cd dealdrop && npm run test
# Expected: full suite green.
```

---

### Manual Visual Walk (BRAND-05 / D-08)

**Source pattern:** Phase 7 POL-04 audit table format documented in `.planning/phases/07-polish-deployment/07-VERIFICATION.md` (per RESEARCH.md §"User Constraints").
**Apply to:** `08-VERIFICATION.md` deliverable.

**Row shape**:

| Viewport | Mode | Surface | Result | Fix Shipped |
|----------|------|---------|--------|-------------|
| desktop | light | Track Price button default | pass (orange-500 / zinc-50, 4.6:1) | — |
| desktop | dark | Track Price button hover | (fill in) | (fill in) |
| 375px | light | ProductCard price | (fill in) | (fill in) |
| 375px | dark | Hero gradient → h1 | (fill in — verify orange-50 doesn't regress contrast on h1) | — |
| desktop | dark | Logo on near-black bg | (fill in — RESEARCH.md Pitfall 6) | (fill in) |

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `bg-gradient-to-b from-orange-50 ...` utility on `Hero.tsx` | Tailwind v4 utility class | CSS render | No existing `bg-gradient-*` utility in the codebase. Pattern is sourced from RESEARCH.md §"Hero gradient specification" and Tailwind v4 docs in `node_modules/tailwindcss/`. Planner ships this as a first-of-its-kind utility for the project. |

---

## Metadata

**Analog search scope:** `dealdrop/src/components/`, `dealdrop/components/ui/`, `dealdrop/app/`
**Files scanned:** 18 (all 8 modified source files + 4 modified/audit-only test files + 6 sibling files for cross-reference: ProductCard.tsx, FeatureCard.tsx, PriceChart.tsx, ProductCard.test.tsx, ProductGrid.test.tsx, button.tsx)
**Pattern extraction date:** 2026-05-02
**Verified upstream sources:** 08-CONTEXT.md (decisions D-01..D-12), 08-RESEARCH.md (oklch values, anti-patterns, code examples 1-8), 08-UI-SPEC.md (typography roles, copy contract, accessibility table)
