# Phase 8: Brand Polish — Research

**Researched:** 2026-05-02
**Domain:** Visual brand application across an already-shipped Next.js 16 + React 19 + Tailwind v4 + Shadcn UI codebase. Token-cascade theming, Next.js asset conventions, copy rename, accessibility verification.
**Confidence:** HIGH (the relevant docs ship in `node_modules/next/dist/docs/`, Tailwind v4 source has the exact oklch values, all target source files were read, the user-provided logo asset is already on disk)

## Summary

Phase 8 is a **closed-loop, low-risk restyle** of v1.0 surfaces — almost every "feature" is delivered by editing a single CSS custom property and letting the cascade propagate. Three things make planning straightforward: (a) the user-provided logo is already on disk at `dealdrop/public/deal-drop-logo.png` (620×210 PNG, ~64KB) so the asset question is closed, (b) every primary surface (Shadcn `<Button>`, `PriceChart` line, `FeatureCard` Lucide icons) already reads `bg-primary` / `text-primary` / `var(--primary)`, so D-06's redefine-`--primary` strategy is sufficient and verified by file inspection, and (c) the breaking changes in Next.js 16 docs for `next/image`, `<Link>`, and `app/icon` are minor and well-documented in the locally-bundled `node_modules/next/dist/docs/`.

Three things require care: (1) **the UI-SPEC has the wrong oklch value for `orange-500`** — it lists `oklch(0.646 0.222 41.116)`, which is actually Tailwind v4.2.2's stock orange-**600**. The planner must use the verified values from `node_modules/tailwindcss/theme.css` (captured below). (2) **`dealdrop/app/favicon.ico` is still on disk** as a 25KB binary working-tree file (Phase 7 D-07 said to delete it but it was never tracked by git — the file lingered). Phase 8 D-12 must explicitly delete this working-tree file regardless of which favicon path it picks. (3) **Five test files have hardcoded "Add Product" / "Product added!" string assertions** that the D-11 rename will break — the planner must update them in the same commit as the source rename.

**Primary recommendation:** Single phase plan with **3 plans**: (P1) Token + favicon + logo (BRAND-02 / BRAND-03 / BRAND-04 cascade); (P2) Hero gradient + footer cleanup + product-card price + small-text accent (BRAND-01 / BRAND-04 surfaces); (P3) "Add Product" → "Track Price" copy rename including test updates (D-11). Verification (BRAND-05) lives in `08-VERIFICATION.md` as a manual visual walk table mirroring Phase 7's POL-04 format.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logo asset & header treatment:**
- **D-01:** Logo is **PNG, in `dealdrop/public/`** (user provides; verified — `dealdrop/public/deal-drop-logo.png` already on disk, 620×210, 8-bit RGB non-interlaced, 65557 bytes). Planner picks filename; `deal-drop-logo.png` is the existing on-disk name and should be kept (saves a rename).
- **D-02:** Logo **replaces the "DealDrop" text node** in `Header.tsx:13` entirely. No side-by-side logo+wordmark. If the asset turns out to be symbol-only and the wordmark is lost, planner flags as a deviation.
- **D-03:** Logo renders at **32px tall** inside the existing 56px header (`h-14`). Width intrinsic. Use `next/image` with `height={32}` and a derived width.
- **D-04:** Logo wrapped in **`<Link href="/">`** with `aria-label="DealDrop home"`.

**Accent color & token strategy:**
- **D-05:** Brand palette = **stock Tailwind orange** (orange-50 / -500 / -600 / -700). No custom oklch tuning. orange-500 = primary buttons + prices + chart line + icons. orange-600 = hover. orange-700 = small-text accents (planner picks surfaces). orange-50 = Hero gradient only.
- **D-06:** Redefine **`--primary` and `--primary-foreground` only** in `:root` and `@media (prefers-color-scheme: dark)` blocks of `globals.css`. Do NOT introduce a new `--brand` token. Do NOT touch `--accent` (Shadcn neutral hover surface).
- **D-07:** **Per-mode contrast tuning** — light uses orange-500 oklch; dark uses a lifted L (orange-400 or tuned-500) for legibility on near-black background.
- **D-08:** Verify BRAND-05 via **manual visual walk + spot-check WCAG**. Document in `08-VERIFICATION.md` as Phase 7-style audit table (viewport / mode / surface / pass-or-fix-shipped). No Storybook, no snapshot harness.

**Hero gradient:**
- **D-09:** **orange-50 gradient on Hero `<section>` ONLY** (logged-out view). Dashboard / authed view stays clean. Implementation (linear vs radial vs corner-anchored) is Claude's discretion.

**Footer cleanup:**
- **D-10:** **Delete `Hero.tsx:31-33`** (the `<p className="mt-16 text-xs text-muted-foreground">Made with love</p>` block). No replacement copy.

**CTA copy rename:**
- **D-11:** Rename **"Add Product" → "Track Price"** across `AddProductDialog`, `AddProductForm`, related toasts, and affected component tests. **Do NOT rename** SQL columns, API routes, server actions, or React component file names. Pure copy change.

**Favicon refresh:**
- **D-12:** Favicon path is Claude's discretion. Two viable approaches:
  - (a) Static `app/icon.png` + delete `app/icon.tsx`.
  - (b) Keep `app/icon.tsx` ImageResponse, replace zinc-900 glyph with new orange palette.
  - Phase 7 D-07's "delete `app/favicon.ico`" must be respected — do not reintroduce.

### Claude's Discretion

The user explicitly did not deep-dive these. Planner uses defaults; flag as deviation only if any materially changes the plan:

- **Exact orange oklch values** (planner converts Tailwind v4 stock palette).
- **`--primary-foreground` choice** (planner picks; likely zinc-50 oklch).
- **orange-700 small-text surface** (planner picks among FeatureCard blurbs / Hero subheadline / feature card titles).
- **Hero gradient direction** (top→bottom linear is the safest default).
- **Dark-mode hue lift for `--primary`**.
- **Logo render technique** (`next/image` default; plain `<img>` acceptable).
- **Logo `alt` text** ("DealDrop" or "DealDrop logo").
- **Test assertion update strategy** (re-run Vitest, update assertions).

### Deferred Ideas (OUT OF SCOPE)

- Phase 9 (EMAIL-01..EMAIL-05) — Resend env config. Phase 8 must NOT touch `sendPriceDropAlert`, `env.server.ts`, `app/api/cron/check-prices/route.ts`, or the email HTML template.
- Email template orange brand styling — v1.2+.
- Custom domain / DNS / Resend domain verification / Vercel custom domain — v1.2.
- Multi-color theme variants / user-selectable accents — Out of Scope.
- Animated / interactive logo variants — v1.3+.
- Full palette / typography refresh — v1.3+.
- OG images / social cards / multi-size brand kit / apple-touch-icon manifest — v1.3+.
- Logo design work / SVG authoring — user provides asset.
- Storybook / snapshot regression harness — explicitly rejected.
- Side-by-side logo + wordmark composition — explicitly rejected.
- Component file renames (`AddProductForm` → `TrackPriceForm`) — out of scope.
- SQL column / API route / server-action renames.
- Dark mode toggle UI / class-based dark mode — separate decimal phase.
- Sticky header / nav menu / profile menu / account settings page.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRAND-01 | "Made with Love" line removed (logged-in + logged-out) | Source confirmed at `Hero.tsx:31-33`; logged-in dashboard has no footer (no separate cleanup needed). Anti-Pattern §1. |
| BRAND-02 | DealDrop logo image in app header | Asset verified at `dealdrop/public/deal-drop-logo.png` (620×210 PNG). `next/image` requires explicit `width`/`height` unless using static import or `fill` (Next.js Image docs §"width and height"). Header is a server component — `next/image` is safe to use directly without `'use client'`. |
| BRAND-03 | Browser tab favicon shows DealDrop logo | Two valid Next.js 16 paths: static `app/icon.png` (file convention, supports `.ico/.jpg/.jpeg/.png/.svg`) OR `app/icon.tsx` ImageResponse (still supported; `params` became a Promise in v16.0.0 but our icon takes no params so unaffected). |
| BRAND-04 | Single accent color via Tailwind theme token / CSS custom property | Verified: `Button` default variant uses `bg-primary hover:bg-primary/90` (button.tsx:12); `PriceChart` Line uses `stroke="var(--primary)"` (PriceChart.tsx:117); `FeatureCard` icon uses `text-primary` (FeatureCard.tsx:13); `globals.css` has `@theme inline` block mapping `--color-primary` → `var(--primary)` (globals.css:69-70). One-token cascade is sufficient. |
| BRAND-05 | Accent legibility in light + dark / default + hover + focus | Verified `globals.css` already ships per-mode `--primary` values via `@media (prefers-color-scheme: dark)` block (lines 81-114). Pattern reusable. WCAG AA = 4.5:1 for normal text, 3:1 for large text and UI components. |

## Project Constraints (from CLAUDE.md)

The project root `CLAUDE.md` declares the following constraints relevant to Phase 8:

- **Tech stack locked:** Next.js 16 + React 19 + TypeScript strict + Tailwind v4 (already scaffolded; no migration). Phase 8 must respect `'use client'` discipline.
- **UI kit:** Shadcn UI + Lucide. No new component libraries.
- **Bar:** Portfolio/demo quality — works end-to-end, presentable UI, not production-hardened. Justifies D-08's manual-walk verification over Storybook.
- **GSD Workflow Enforcement:** All file edits must flow through a GSD command (Phase 8 work must execute via `/gsd-execute-phase`, not ad-hoc edits).
- `dealdrop/CLAUDE.md` re-exports `dealdrop/AGENTS.md`: **"This is NOT the Next.js you know"** — read `node_modules/next/dist/docs/` before writing Next.js-specific code. The relevant docs are catalogued in §"Code Examples" below.
- No emojis in source files (established convention; applies to logo `alt` text, icon glyph, copy).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Logo asset rendering | Browser (Client) | Frontend Server (build-time optimization) | `next/image` runs at build time to optimize the PNG; the rendered `<img>` lives in the DOM. Header is a server component, but `<Image>` can be embedded without forcing `'use client'`. |
| Favicon delivery | CDN / Static (Next.js icon route) | — | `app/icon.png` is served at `/icon` as a static asset; `app/icon.tsx` is a Route Handler that returns a cached `ImageResponse`. Both are CDN-edge-cacheable. |
| Brand color token cascade | Browser (CSS custom property runtime) | — | `--primary` is defined in `:root`, read by Tailwind's `@theme inline`, consumed by Shadcn `bg-primary` utilities and direct `var(--primary)` references. Pure browser-side cascade; no server involvement. |
| Hero gradient rendering | Browser (CSS gradient utility) | — | Tailwind `bg-gradient-to-b from-orange-50 ...` is a CSS-only effect. |
| Copy rename ("Add Product" → "Track Price") | Browser (DOM text content) | — | Pure source-tree string replacement; rendered output lives in DOM. No backend, route, or storage implication. |
| Test assertions for new copy | Test runtime (Vitest jsdom) | — | Component tests use `@testing-library/react` queries (`getByRole`, `getByText`); assertions live alongside components. |
| Accessibility / contrast verification | Browser DevTools (rendered DOM + computed styles) | — | Manual visual walk + DevTools contrast checker. No automated harness in scope. |

**Why this matters for Phase 8:** Every change is browser-tier. There is no API/backend/database/email work. This makes the phase low-risk for cross-tier regressions but means **all verification is visual + DOM-based** — there is no API contract test that will catch a regression. The `08-VERIFICATION.md` audit walk is the only safety net.

## Standard Stack

### Core (already installed — verified `dealdrop/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4 | App Router, `next/image`, `<Link>`, `app/icon` conventions | Project lock; v16.2.4 confirmed. [VERIFIED: `dealdrop/package.json:14`] |
| `react` | 19.2.4 | Functional components for header / hero / dashboard | Project lock; React 19 strict. [VERIFIED: `dealdrop/package.json:18`] |
| `tailwindcss` | 4.2.2 | Utility classes, `@theme inline` semantics, oklch tokens, gradient utilities | Project lock; v4.2.2 in `node_modules`. [VERIFIED: `dealdrop/node_modules/tailwindcss/package.json`] |
| `@tailwindcss/postcss` | ^4 | PostCSS pipeline for v4 | Already configured. [VERIFIED: `dealdrop/package.json` devDeps] |
| `tw-animate-css` | ^1.4.0 | Imported in `globals.css:2` | Existing; not modified by Phase 8. [VERIFIED: `globals.css:2`] |
| `class-variance-authority` | ^0.7.1 | Shadcn `Button` variant typing (cva) | Used in `components/ui/button.tsx:7-39`; auto-cascades token. [VERIFIED] |
| `lucide-react` | ^1.8.0 | Existing icons (`Globe`, `BellRing`, `LineChart`, `Loader2`, `ChevronDown/Up`, `ExternalLink`) | No new icons in Phase 8. [VERIFIED: `dealdrop/package.json`] |
| `recharts` | 3.8.1 | `<Line stroke="var(--primary)" />` auto-cascades the orange | No code change required. [VERIFIED: `dealdrop/package.json:21`] |
| `vitest` | ^3.2.4 | Test runner for D-11 assertion updates | Already configured (`vitest.config.ts`). [VERIFIED: `dealdrop/vitest.config.ts` exists] |
| `@testing-library/react` | ^16.3.2 | Component test assertions (`getByRole`, `getByText`) | Pattern established Phase 4-7. [VERIFIED: `dealdrop/package.json` devDeps] |
| `@testing-library/jest-dom` | ^6.9.1 | `toHaveTextContent`, `toBeInTheDocument` matchers | Imported in every dashboard test file. [VERIFIED: `EmptyState.test.tsx:3`] |

### Supporting (no new packages — Phase 8 installs nothing)

Phase 8 installs **zero** new packages. Every change uses existing dependencies. The planner should not run `npm install` at all in this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/image` for logo | Plain `<img src="/deal-drop-logo.png">` | Simpler, but no automatic responsive `srcset`, no build-time optimization. CONTEXT.md D-03 already accepts plain `<img>` as fallback if `next/image` is overkill. Recommendation: **prefer `next/image`** because (a) it's the canonical pattern in this codebase (used in `ProductCard.tsx:19`), (b) the build-time optimization is free, (c) it's the path the project already uses for product images. [CITED: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`] |
| Static `app/icon.png` (path A) | Keep `app/icon.tsx` ImageResponse with new glyph (path B) | Path A is simpler — drop the PNG, delete the .tsx. Path B is more controllable but the existing zinc-900 glyph code reads as a "scaffold leftover" once a real wordmark logo exists. **Recommendation: Path A** if the PNG renders legibly at 32×32. Aspect ratio of the user's PNG is ~2.95:1 (620×210), which means at 32×32 it will need to be center-cropped or letterboxed; the planner may want to re-export the asset as a square 32×32 mark before committing path A. [VERIFIED: PNG dimensions via `file` command] |
| `bg-orange-500` direct utility on Buttons | `bg-primary` via redefined token (D-06) | Direct utility looks tempting because it's "explicit" but breaks D-06's single-token-cascade promise. Anti-pattern §1. |

**Installation:** None. No `npm install` in Phase 8.

**Version verification (run during planning if any doubt):**
```bash
npm view next version           # confirms 16.2.4 is current latest? Not required — locked.
npm view tailwindcss version    # confirms 4.2.2 is current latest? Not required — locked.
```

## Architecture Patterns

### System Architecture Diagram

```
[ User browser request ]
        │
        ▼
[ Next.js App Router (16.2.4) ]
        │
        ├─────────────────────────────────────────────┐
        │                                             │
        ▼                                             ▼
[ Server Components ]                         [ Static Assets ]
  app/page.tsx                                  ├─ /deal-drop-logo.png  (next/image optimized)
    ↓ (renders)                                 ├─ /icon              (from app/icon.png OR app/icon.tsx)
  Header (server)  ← reads user from Supabase   └─ /favicon.ico       (← DELETE; do not serve)
    ↓ (embeds)
  <Link href="/"> + <Image src="/deal-drop-logo.png">
    ↓
  Hero (server)  OR  DashboardShell (server)
    ↓                    ↓
  FeatureCard         ProductGrid (client)
   - text-primary       ↓
                      ProductCard (client)
                       - text-primary on price
                       - PriceChart: stroke="var(--primary)"
                       - AddProductDialog (client)
                          - Button "+ Track Price"
                          - DialogTitle "Track a price"
                          - AddProductForm: submit "Track Price"

[ globals.css :root + @media dark ]
   --primary: oklch(orange-500)         ← REDEFINE
   --primary-foreground: oklch(zinc-50) ← unchanged or verify
        │
        ▼ consumed by
   @theme inline { --color-primary: var(--primary); }
        │
        ▼ produces Tailwind utilities
   bg-primary, text-primary, hover:bg-primary/90, ring-primary, ...
        │
        ▼ used by
   Shadcn <Button variant="default">, <FeatureCard>, custom price <p>, etc.
```

The flow is **strictly client-rendered** for color application — once `:root --primary` is set, all consumers (Tailwind utilities, direct `var(--primary)` references) update synchronously.

### Recommended Project Structure (no changes needed)

```
dealdrop/
├── app/
│   ├── globals.css       # ← MODIFY: redefine --primary in :root and @media (dark)
│   ├── icon.tsx          # ← MODIFY (path B) or DELETE (path A)
│   ├── icon.png          # ← NEW (path A only; not present today)
│   ├── favicon.ico       # ← DELETE (working-tree leftover; 25KB)
│   ├── layout.tsx        # untouched
│   └── page.tsx          # untouched
├── public/
│   └── deal-drop-logo.png  # ← ALREADY ON DISK (620×210, 64KB) — do not re-add
├── src/components/
│   ├── header/Header.tsx        # ← MODIFY: replace text node with <Link><Image/></Link>
│   ├── hero/Hero.tsx            # ← MODIFY: delete "Made with love"; add gradient
│   ├── hero/FeatureCard.tsx     # untouched (auto-cascade via text-primary)
│   └── dashboard/
│       ├── AddProductDialog.tsx          # ← MODIFY: copy rename
│       ├── AddProductForm.tsx            # ← MODIFY: button label + toast text
│       ├── InlineAddProductWrapper.tsx   # ← MAYBE MODIFY (audit for surfaced labels)
│       ├── EmptyState.tsx                # untouched (heading already says "Track your first product")
│       ├── ProductCard.tsx               # ← MODIFY: text-primary on price <p>
│       ├── PriceChart.tsx                # untouched (auto-cascade)
│       └── *.test.tsx                    # ← MODIFY: assertion updates for rename
└── components/ui/
    ├── button.tsx        # untouched (auto-cascade via bg-primary)
    ├── card.tsx          # untouched
    └── dialog.tsx        # untouched
```

### Pattern 1: CSS Custom Property Cascade Theming (Shadcn-style)

**What:** A single `--primary` declaration at `:root` propagates to every Tailwind utility (`bg-primary`, `text-primary`, `hover:bg-primary/90`, `ring-primary`) and to every direct `var(--primary)` reference (Recharts, custom inline styles).

**When to use:** When a brand recolor must touch many surfaces with zero per-component code churn.

**Example (verified pattern, this codebase):**
```css
/* dealdrop/app/globals.css :root */
--primary: oklch(0.705 0.213 47.604);              /* orange-500 light mode */
--primary-foreground: oklch(0.985 0 0);            /* zinc-50 — high contrast on orange */
```
```css
/* dealdrop/app/globals.css @theme inline (already exists, no change) */
--color-primary: var(--primary);
--color-primary-foreground: var(--primary-foreground);
```
```tsx
// dealdrop/components/ui/button.tsx (no change needed)
default: "bg-primary text-primary-foreground hover:bg-primary/90"
```
```tsx
// dealdrop/src/components/dashboard/PriceChart.tsx (no change needed)
<Line stroke="var(--primary)" />
```
[VERIFIED: file inspection of `globals.css:13-14`, `globals.css:69-70`, `button.tsx:12`, `PriceChart.tsx:117`]

### Pattern 2: Per-Mode Color Tuning via `@media (prefers-color-scheme: dark)`

**What:** Different oklch values for the same token in light vs. dark mode. Pattern Shadcn ships verbatim.

**When to use:** When a single oklch fails AA contrast in one of the two modes.

**Example (verified existing pattern at `globals.css:81-114`):**
```css
:root {
  --primary: oklch(0.21 0.006 285.885);   /* zinc-900 — current light value */
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary: oklch(0.92 0.004 286.32);  /* zinc-200 — current dark value */
  }
}
```

Phase 8 replaces both values with orange equivalents. No new mechanism — drop-in substitution. [VERIFIED: `globals.css:13` and `globals.css:89`]

### Pattern 3: `next/image` with Explicit Dimensions

**What:** Pass `width` and `height` props as integer pixel values matching the asset's intrinsic ratio so Next.js can reserve layout space and prevent CLS.

**When to use:** Always, unless you use `fill` or static import.

**Example (verified — already used at `ProductCard.tsx:19-25`):**
```tsx
import Image from 'next/image'
<Image
  src="/deal-drop-logo.png"
  alt="DealDrop"
  width={95}     // 620 / (210/32) ≈ 94.48, round to 95
  height={32}    // D-03 locks to 32px tall
  priority       // logo is above the fold
/>
```
Logo intrinsic ratio: 620÷210 = 2.952. At `height=32`, derived width = 32 × 2.952 ≈ 94.48 → round to **95** (or 94, planner picks). [CITED: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` §"width and height"]

### Pattern 4: `<Link>` Wrapping `<Image>` for Click-to-Home

**What:** Wrap the logo in `next/link` `<Link href="/">`. `aria-label` on the Link communicates nav purpose to screen readers.

**Example:**
```tsx
import Link from 'next/link'
import Image from 'next/image'

<Link href="/" aria-label="DealDrop home" className="inline-flex items-center">
  <Image src="/deal-drop-logo.png" alt="DealDrop" width={95} height={32} priority />
</Link>
```
**No `'use client'` required** — `Link` and `Image` are both server-component-safe. [CITED: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`]

### Pattern 5: Tailwind v4 `@theme inline` Block

**What:** Tailwind v4's CSS-first theme declaration. The `@theme inline { --color-primary: var(--primary); }` block is what makes `bg-primary` resolve to whatever `--primary` is at runtime. Without this, redefining `--primary` would not affect `bg-primary` utilities — you'd need a JS-config bridge.

**Already in place:** `globals.css:41-79` ships the `@theme inline` block with `--color-primary: var(--primary)` at lines 69-70. **No change required to this block.** Phase 8 modifies only the `--primary` value in `:root` and the dark-mode block. [VERIFIED]

### Anti-Patterns to Avoid

- **Adding `bg-orange-500` directly to Shadcn `<Button>` instances.** Defeats D-06's single-token cascade. The whole reason D-06 redefines `--primary` is so that `<Button variant="default">` "just works." Bypassing the token to hardcode `bg-orange-500` creates two sources of truth — the next time the brand color shifts, half the buttons would update via cascade and half would need manual edits. **CONTEXT.md flag: this is a planning bug if any plan does it.**
- **Editing `--accent` instead of `--primary`.** Shadcn's `--accent` is the *neutral hover surface* (e.g., the zinc-tinted hover background on Ghost buttons). Touching `--accent` would tint the entire app's hover states. The brand accent is `--primary`. Naming-collision foot-gun documented in CONTEXT.md §Specific Ideas.
- **Reintroducing `dealdrop/app/favicon.ico`.** Phase 7 D-07 deleted it (working-tree file lingered; not git-tracked). Phase 8 must not add it back, regardless of which D-12 path is chosen.
- **Renaming SQL columns / API route paths / server action names** during the "Add Product" → "Track Price" copy rename. D-11 is copy-only.
- **Touching `sendPriceDropAlert`, `env.server.ts`, `app/api/cron/check-prices/route.ts`.** Phase 9 territory.
- **Adding `'use client'` to `Header.tsx`** when introducing `next/image` + `<Link>`. Both work in server components. Adding the directive would unnecessarily client-bundle the entire header.
- **Forgetting to delete `app/icon.tsx` if path A is chosen.** Both `app/icon.png` and `app/icon.tsx` would coexist if you only added the static and forgot the .tsx — Next.js would emit two `<link rel="icon">` tags with numeric ordering, leaving the wrong icon on the tab.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logo image with optimization | Hand-roll responsive `srcset` and `loading="lazy"` on a plain `<img>` | `next/image` | Build-time optimization, automatic ratio-preservation, CLS prevention, `srcset` for retina displays. [CITED: Next.js Image docs] |
| Click-to-home link | Hand-roll `<a href="/">` with `onClick` to call `router.push` | `next/link` | Prefetching, scroll restoration, client-side navigation without full reload. [CITED: Next.js Link docs] |
| Favicon at multiple sizes / formats | Hand-roll `<link rel="icon">` tags in `<head>` | `app/icon.png` (file convention) OR `app/icon.tsx` (ImageResponse) | Next.js auto-generates the correct `<link>` tags with `type` and `sizes` attributes from the asset. [CITED: Next.js app-icons docs] |
| Brand color application across components | Hand-edit every `<Button>`, `<Card>`, `<Line>`, etc. with `className="bg-orange-500"` | Redefine `--primary` in `globals.css` (D-06) | One-line change cascades to all Tailwind utilities (`bg-primary`, `text-primary`, etc.) AND to direct `var(--primary)` consumers (Recharts, inline styles). Already verified to cover Button, FeatureCard, PriceChart. |
| Hex / RGB color conversion | Hand-translate hex `#f97316` to oklch | Read `node_modules/tailwindcss/theme.css` | Tailwind v4 ships canonical oklch values for every color in its theme.css. No conversion needed; just copy the value. [VERIFIED — values captured below] |
| Per-mode contrast tuning | Hand-roll a `dark:` variant on every primary surface | `@media (prefers-color-scheme: dark) { :root { --primary: ... } }` | Token redefine; cascades same as light mode. Already shipped pattern at `globals.css:81-114`. |
| WCAG contrast verification | Hand-write a contrast calculator | Browser DevTools → Inspect → Contrast ratio in Color Picker | Built-in to Chrome/Firefox/Edge DevTools. Phase 7 D-05 used this pattern. |
| Component test assertion churn for the copy rename | Manually edit each test file from memory | Run `npm run test` after the source rename, watch for `expected ... received` failures, update each assertion in the same commit | Vitest's failure output names the exact file + line; deterministic update path. CONTEXT.md D-11 explicit. |

**Key insight:** Phase 8 is the canonical "ride the framework" phase — every problem already has a Next.js / Tailwind / Shadcn answer, and reaching for hand-rolled code is itself a smell. The planner's job is to recognize this and write tasks that compose framework primitives, not invent new infrastructure.

## Common Pitfalls

### Pitfall 1: Copying the wrong oklch value from training data

**What goes wrong:** Phase 8 UI-SPEC at line 108 says `--primary: oklch(0.646 0.222 41.116)` is "Tailwind orange-500". Tailwind v4.2.2's actual stock orange-500 is `oklch(70.5% 0.213 47.604)` (= `oklch(0.705 0.213 47.604)`). The UI-SPEC value is actually orange-**600** (`oklch(64.6% 0.222 41.116)`).

**Why it happens:** Tailwind has shifted its oklch scale across major versions. Training data may quote pre-v4 values, or the researcher confused row alignment in the palette table.

**How to avoid:** Always read `dealdrop/node_modules/tailwindcss/theme.css` directly. Phase 8 plans must cite the file path + line number when introducing oklch values.

**Warning signs:** A plan that introduces an oklch value without citing the source file. A plan that says "Tailwind orange-500" but lists a value with `64.6%` lightness (that's orange-600).

### Pitfall 2: Forgetting to delete `app/icon.tsx` when adding `app/icon.png`

**What goes wrong:** Path A (static asset) requires deleting `app/icon.tsx` in the same commit as adding `app/icon.png`. If both files coexist, Next.js generates two `<link rel="icon">` tags. Browser tab may show whichever the browser picks first — non-deterministic.

**Why it happens:** Mental model assumes "add" is the only action; "delete" is implicit. Plans that frame the work as "ship the new favicon" miss the deletion.

**How to avoid:** Plans must explicitly list both actions: (1) write `app/icon.png`, (2) delete `app/icon.tsx`. Verification step: `ls dealdrop/app/icon*` shows exactly one match.

**Warning signs:** A plan that only mentions creating the new file. A verification step that doesn't `ls` the directory.

### Pitfall 3: Test assertion churn from D-11 hidden across multiple files

**What goes wrong:** The D-11 copy rename ("Add Product" → "Track Price") breaks **at least 3 hardcoded test assertions** found by grep:
- `dealdrop/src/components/dashboard/ProductGrid.test.tsx:18` → `+ Add Product` (hardcoded in stub)
- `dealdrop/src/components/dashboard/AddProductForm.test.tsx:96` → `'Product added!'` (toast text)
- `dealdrop/src/components/dashboard/AddProductForm.test.tsx:30,36` → `/Track/i` regex (will still pass for "Track Price" — verify) and form button assertion

There may be additional matches in `RemoveProductDialog.test.tsx` or future-added tests. Updating only some leaves the suite half-failing.

**Why it happens:** D-11 is a "small copy change" but the test net is wider than the source net.

**How to avoid:** Run `grep -r "Add Product\|Product added" dealdrop/src` BEFORE and AFTER the rename; fail closed if any matches remain. The planner should include this grep as an explicit verification step.

**Warning signs:** A plan that touches `AddProductDialog.tsx` and `AddProductForm.tsx` but doesn't list any `.test.tsx` modifications.

### Pitfall 4: Hero gradient regressing legibility on `<h1>` and `<p>`

**What goes wrong:** `bg-gradient-to-b from-orange-50 via-background to-background` puts orange-50 at the top of the section, which is exactly where the h1 and subline render. orange-50 is `oklch(98% 0.016 73.684)` — close to white but tinted. zinc-900 text on orange-50 still passes AA easily (contrast ~17:1), but a careless choice like `text-muted-foreground` on top of orange-50 may fall under 4.5:1.

**Why it happens:** orange-50 looks neutral in a vacuum. Designers underweight its warmth.

**How to avoid:** During D-08 audit, contrast-test every text element rendered inside the gradient region. Specifically the FeatureCard `text-muted-foreground` blurbs and the Hero `<p className="text-muted-foreground">` subline (Hero.tsx:10-13).

**Warning signs:** A plan that adds the gradient class but doesn't include "verify h1, subline, and FeatureCard text contrast on orange-50" as a verification step.

### Pitfall 5: Dark-mode gradient creating an orange-tinted near-black

**What goes wrong:** orange-50 has very high lightness (~98%). On dark mode where `--background` is near-black (oklch(0.141 ...)), `from-orange-50` would create a stark light-to-dark gradient — visually jarring, possibly hurting Hero legibility.

**Why it happens:** Tailwind utility classes don't auto-adapt to mode unless you add `dark:` variants.

**How to avoid:** UI-SPEC §"Dark mode" at line 149-150 specifies `dark:from-transparent` (suppress gradient in dark mode). Plan must include this `dark:` variant, OR scope the gradient class to `@media (prefers-color-scheme: light)`.

**Warning signs:** A plan that applies `bg-gradient-to-b from-orange-50 ...` without a `dark:from-...` companion.

### Pitfall 6: Header `bg-background` conflicting with logo PNG transparency

**What goes wrong:** If the user's PNG has a transparent background but is designed for a light background, in dark mode (where `--background` flips to near-black), the logo may be unreadable (e.g., black text on near-black).

**Why it happens:** Brand assets are typically single-color and not mode-aware.

**How to avoid:** During D-08 dark-mode walk, verify the logo is legible. If not, two paths: (a) ask the user for a light-on-transparent variant, OR (b) add a CSS `filter: invert(1)` in dark mode (cheap; preserves single-asset commit). Document the choice in `08-VERIFICATION.md`.

**Warning signs:** A plan that ships the logo without any dark-mode legibility verification step.

### Pitfall 7: orange-50 hex equivalent off by a hair

**What goes wrong:** UI-SPEC line 154 says "orange-50 is `#fff7ed` in hex". Verified: Tailwind v4.2.2 ships orange-50 as `oklch(98% 0.016 73.684)`. The conversion is approximate — exact hex depends on the gamut-mapping. If a designer hardcodes `#fff7ed` somewhere instead of using the oklch token, the values will drift.

**How to avoid:** Use the oklch value directly via `bg-orange-50` Tailwind utility (which resolves to `var(--color-orange-50)` = the oklch). Don't introduce hex literals.

## Code Examples

### Example 1: Header logo replacement (BRAND-02, D-02/D-03/D-04)

```tsx
// dealdrop/src/components/header/Header.tsx
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'

type HeaderProps = Readonly<{
  user: User | null
}>

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        <Link href="/" aria-label="DealDrop home" className="inline-flex items-center">
          <Image
            src="/deal-drop-logo.png"
            alt="DealDrop"
            width={95}
            height={32}
            priority
          />
        </Link>
        {user ? <SignOutButton /> : <SignInButton />}
      </div>
    </header>
  )
}
```
[VERIFIED pattern via `node_modules/next/dist/docs/01-app/03-api-reference/02-components/{image,link}.md` and existing usage in `ProductCard.tsx:19-25`. Width 95 derives from intrinsic 620÷210 ratio at height=32.]

### Example 2: globals.css `--primary` redefinition (BRAND-04, D-06/D-07)

```css
/* dealdrop/app/globals.css — :root block, replace lines 13-14 */
:root {
  /* ...other tokens unchanged... */
  --primary: oklch(0.705 0.213 47.604);              /* Tailwind v4.2.2 orange-500 */
  --primary-foreground: oklch(0.985 0 0);            /* zinc-50 — passes AA on orange-500 */
  /* ...other tokens unchanged... */
}

/* dealdrop/app/globals.css — @media (prefers-color-scheme: dark), replace lines 89-90 */
@media (prefers-color-scheme: dark) {
  :root {
    /* ...other tokens unchanged... */
    --primary: oklch(0.75 0.183 55.934);             /* Tailwind v4.2.2 orange-400 — lifted L for dark */
    --primary-foreground: oklch(0.141 0.005 285.823); /* zinc-950 — passes AA on orange-400 */
    /* ...other tokens unchanged... */
  }
}
```
[VERIFIED oklch values from `dealdrop/node_modules/tailwindcss/theme.css:22-29`. Light orange-500 = `oklch(70.5% 0.213 47.604)`. Dark uses orange-400 = `oklch(75% 0.183 55.934)`. `--primary-foreground` for dark mode flips to a dark color since orange-400 is lighter than orange-500.]

> **Planner note on `--primary-foreground` in dark mode:** The current `globals.css:90` value is `oklch(0.21 0.006 285.885)` (zinc-900). The new orange-400 in dark mode has L=0.75 — to pass AA contrast, you need a dark text color, not a light one. The recommended `oklch(0.141 0.005 285.823)` is the existing `--background` value in dark mode — confirm AA contrast (3:1 minimum for UI components, 4.5:1 for normal text) on the actual rendered button during D-08 walk.

### Example 3: Hero gradient + footer cleanup (BRAND-01 D-10, D-09)

```tsx
// dealdrop/src/components/hero/Hero.tsx
import { Globe, BellRing, LineChart } from 'lucide-react'
import { FeatureCard } from './FeatureCard'

export function Hero() {
  return (
    <section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16 bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent">
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
      {/* "Made with love" <p> at lines 31-33 DELETED per BRAND-01 / D-10 */}
    </section>
  )
}
```
[VERIFIED targets: `Hero.tsx:31-33` deletion confirmed by file read. `dark:from-transparent` per UI-SPEC §"Dark mode" line 149-150.]

### Example 4: ProductCard price `text-primary` (BRAND-04 D-05)

```tsx
// dealdrop/src/components/dashboard/ProductCard.tsx — only the price <p> changes
<p className="text-xl font-semibold text-primary">
  {formatPrice(product.current_price, product.currency)}
</p>
```
[VERIFIED target: `ProductCard.tsx:29-31`. Adding `text-primary` to the existing class. Auto-cascades to orange-500 light / orange-400 dark via D-06. UI-SPEC line 30-31 confirms this is the alias of the "Subheading / Price" typography role.]

### Example 5: Path A favicon (D-12)

```bash
# Step 1: write 32x32 PNG to dealdrop/app/icon.png (planner generates from logo asset)
# Step 2: delete the ImageResponse:
rm dealdrop/app/icon.tsx
rm dealdrop/app/icon.test.tsx  # also delete the existing test if present
# Step 3: delete working-tree favicon.ico leftover:
rm -f dealdrop/app/favicon.ico
```
[CITED: `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` confirms `app/icon.png` is supported (`.ico/.jpg/.jpeg/.png/.svg`). Existing test file `app/icon.test.tsx` exists per `ls app/` — must also be deleted with path A.]

### Example 6: AddProductDialog rename (BRAND-01 D-11)

```tsx
// dealdrop/src/components/dashboard/AddProductDialog.tsx
<DialogTrigger asChild>
  <Button variant="default">+ Track Price</Button>
</DialogTrigger>
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Track a price</DialogTitle>
  </DialogHeader>
  ...
</DialogContent>
```
[VERIFIED target: `AddProductDialog.tsx:24,28`. UI-SPEC §"Copywriting Contract" lines 167-178 specifies these copy strings.]

### Example 7: AddProductForm submit + toast rename (BRAND-01 D-11)

```tsx
// dealdrop/src/components/dashboard/AddProductForm.tsx
// Line 44: success toast
toast.success('Now tracking') // UI-SPEC §line 197 says "Now tracking [product name]"; if product name is unavailable in this scope, drop to "Now tracking" or pass it through

// Line 132: submit button label
<Button type="submit" variant="default" disabled={pending}>
  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Track Price
</Button>
```
[VERIFIED targets: `AddProductForm.tsx:44` (toast), `AddProductForm.tsx:132` (button). Note: `AddProductForm.tsx:38` is a JSDoc comment that also says `'Product added!'` and should be updated for accuracy. `AddProductForm.test.tsx:96` asserts `toHaveBeenCalledWith('Product added!')` — must update.]

### Example 8: Test assertion update (D-11)

```tsx
// dealdrop/src/components/dashboard/AddProductForm.test.tsx — line 96
// BEFORE
expect(toastSuccess).toHaveBeenCalledWith('Product added!')
// AFTER (matches the new toast text)
expect(toastSuccess).toHaveBeenCalledWith('Now tracking')

// dealdrop/src/components/dashboard/ProductGrid.test.tsx — line 18 (inside AddProductDialog stub)
// BEFORE: <button data-testid="add-dialog-stub">+ Add Product</button>
// AFTER:  <button data-testid="add-dialog-stub">+ Track Price</button>
```
[VERIFIED targets via grep on `dealdrop/src`. The grep search must be re-run after the rename to catch any survivors.]

## Runtime State Inventory

> Phase 8 includes a copy rename ("Add Product" → "Track Price") which is a string-replacement operation. This section is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — verified by reading `dealdrop/src/types/database.ts` references in CONTEXT.md and confirming the `products` and `price_history` tables have no human-readable "Add Product" string in any column. The string lives only in UI source files. | None |
| **Live service config** | None — Phase 8 does not touch Resend templates, Supabase Auth UI, Vercel project settings, Datadog/monitoring, or any external service that might cache a literal "Add Product" string. | None |
| **OS-registered state** | None — DealDrop is a hosted Next.js app. No Windows Task Scheduler, launchd, systemd, or pm2 entries reference these strings. The pg_cron job description in `0006_cron_prod_url_cutover.sql` is `dealdrop-daily-price-check` and does NOT contain "Add Product". | None |
| **Secrets / env vars** | None — env var names (`SUPABASE_URL`, `RESEND_API_KEY`, `CRON_SECRET`, etc.) do not include "Add Product" or "Track Price". The new Phase 9 vars (`RESEND_FROM_EMAIL`, `RESEND_TEST_RECIPIENT`) are unrelated. | None |
| **Build artifacts / installed packages** | `dealdrop/.next/` build cache may contain pre-rename strings. Stale Next.js dev cache also possible. After the rename, `rm -rf dealdrop/.next` + `npm run build` ensures clean output. | Optional cache clear (`rm -rf .next`) before final dev/build verification. |

**Stored data category, expanded:** Confirmed by inspection — the toast text "Product added!" only appears in `AddProductForm.tsx:38,44` and `AddProductForm.test.tsx:96,104`. There is no database column, audit log, or persisted user-facing text that captures this string at write time. (It's a UI-render-time literal, not a column value.)

## Common Pitfalls (continued — see §"Common Pitfalls" above for 1–7)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + @testing-library/react 16.3.2 + jsdom 29.0.2 |
| Config file | `dealdrop/vitest.config.ts` (verified exists) |
| Quick run command | `cd dealdrop && npm run test -- src/components/dashboard/AddProductForm.test.tsx src/components/dashboard/ProductGrid.test.tsx` (run only the rename-affected files for fast feedback during D-11 work) |
| Full suite command | `cd dealdrop && npm run test` |
| Phase gate | Full suite green before `/gsd-verify-work` is invoked |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | "Made with love" line removed from Hero | unit (jsdom render) | `cd dealdrop && npx vitest run src/components/hero/Hero.test.tsx -t "no Made with love"` | ❌ Wave 0 (no `Hero.test.tsx` exists) |
| BRAND-02 | Logo `<Image>` rendered in Header with correct alt + Link wrapper | unit (jsdom render) | `cd dealdrop && npx vitest run src/components/header/Header.test.tsx -t "logo"` | ❌ Wave 0 (no `Header.test.tsx` exists) |
| BRAND-03 | Favicon path either (a) `app/icon.png` exists + `app/icon.tsx` does not, OR (b) `app/icon.tsx` ImageResponse returns valid Response with new orange palette | manual filesystem check + visual tab inspection | `ls dealdrop/app/icon*` (path A: exactly `icon.png`); for path B, run `npm run build` and verify generated `<link rel="icon">` in built HTML | manual-only (Next.js icon route is not unit-testable through Vitest) |
| BRAND-04 (cascade) | `--primary` resolves to orange-500 oklch in `:root`; Shadcn Button renders with `bg-primary` reading orange | snapshot of `globals.css` token block + manual visual walk | `grep -A1 -- "--primary:" dealdrop/app/globals.css` (assert orange oklch value) | manual + grep |
| BRAND-04 (price text) | ProductCard price `<p>` carries `text-primary` class | unit (jsdom DOM query) | `cd dealdrop && npx vitest run src/components/dashboard/ProductCard.test.tsx -t "price text-primary"` | ⚠️ existing `ProductCard.test.tsx` — extend with new test |
| BRAND-05 | Light + dark + hover + focus on every primary surface passes AA contrast (4.5:1 for text, 3:1 for UI) | manual-only (DevTools contrast checker) | walk app per UI-SPEC §"Accessibility Contract"; record findings in `08-VERIFICATION.md` | manual-only |
| D-11 (rename) | `npm run test` passes after copy change; no source or test file contains "Add Product" or "Product added!" | grep + Vitest full suite | `cd dealdrop && grep -r "Add Product\|Product added" src/ \| wc -l` (expect 0) AND `npm run test` | ✅ existing tests cover via assertion update |

### Sampling Rate

- **Per task commit:** Run only the affected test files (e.g., after editing `AddProductForm.tsx`, run `AddProductForm.test.tsx` + `InlineAddProductWrapper.test.tsx` + `ProductGrid.test.tsx` since they share the form path). ~5-10 seconds per cycle.
- **Per plan merge:** `cd dealdrop && npm run test` (full suite, ~30 seconds; ~108 tests).
- **Phase gate:** Full suite green + `grep -r "Add Product\|Product added" dealdrop/src/` returns zero matches + manual `08-VERIFICATION.md` walk completed.

### Wave 0 Gaps

- [ ] `dealdrop/src/components/header/Header.test.tsx` — covers BRAND-02 (logo presence, alt text, Link wrapper, aria-label). Optional at portfolio bar; CONTEXT.md does not require it. Recommendation: **add a lightweight test** (~10 lines) since Header has no test today and BRAND-02 is the most user-visible change.
- [ ] `dealdrop/src/components/hero/Hero.test.tsx` — covers BRAND-01 ("Made with love" absence) + presence of headline + presence of FeatureCards. Optional. Recommendation: **skip** — file has no test today and adding one is scope creep beyond CONTEXT.md.
- [ ] **Update `dealdrop/src/components/dashboard/AddProductForm.test.tsx`:**
  - Line 96: change `'Product added!'` to the new toast text.
  - Line 30/36: regex `/Track/i` matches both "Track" and "Track Price" — verify still passes; consider tightening to `/Track Price/i` for explicit assertion.
- [ ] **Update `dealdrop/src/components/dashboard/ProductGrid.test.tsx`:**
  - Line 18-21: stub button text `+ Add Product` → `+ Track Price`.
- [ ] **Verify `dealdrop/src/components/dashboard/ProductCard.test.tsx`:** existing test does not query the price element by class. Optional addition: assert price `<p>` has `text-primary` class. Cheap addition, ~3 lines.
- [ ] **`dealdrop/app/icon.test.tsx` exists** (per `ls dealdrop/app`). If path A is chosen for D-12, this test must be **deleted** with the .tsx. Confirm content of test before deciding.
- [ ] No new framework install needed — Vitest already configured.

## Environment Availability

> Phase 8 has no external service dependencies (no API calls, no database access, no email send, no cron scheduling). All work is in-source. The environment audit is minimal.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tooling | ✓ (per CLAUDE.md "Node.js 24.15.0") | 24.x | — |
| npm | Dependency mgmt + test runner | ✓ | 11.12.1 | — |
| Next.js | Build, dev server, `next/image` optimization | ✓ | 16.2.4 | — |
| Tailwind v4 | CSS compilation, oklch value reference | ✓ | 4.2.2 | — |
| Vitest | Test runner for D-11 assertion updates | ✓ | 3.2.4 | — |
| Logo PNG asset | BRAND-02 | ✓ on disk | 620×210, 65557B, 8-bit RGB non-interlaced | — |
| Browser DevTools (Chrome/Firefox/Edge) | D-08 manual contrast verification | ✓ (developer environment) | — | — |
| WCAG contrast checker (browser DevTools or webaim.org) | D-08 spot-check | ✓ (built into DevTools) | — | webaim.org/resources/contrastchecker/ as web fallback |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Security Domain

> `security_enforcement` is not explicitly set to `false` in `.planning/config.json` — treat as enabled. However, Phase 8 has minimal security surface area.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 8 does not touch auth flows. SignInButton/SignOutButton are restyled-only via the cascade. |
| V3 Session Management | no | No session changes. |
| V4 Access Control | no | No RLS, route protection, or authorization changes. |
| V5 Input Validation | no | Phase 8 does not introduce new input fields or accept user-provided data. |
| V6 Cryptography | no | No new keys, no token issuance. |
| V11 Business Logic | no | No new business rules. |
| V14 Configuration | partial | Favicon and icon route changes touch how Next.js generates `<head>` tags. No security impact, but the `<link rel="icon">` MIME type must match the actual file (Next.js handles this automatically per `app-icons.md`). |

### Known Threat Patterns for Brand Polish on Next.js 16

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Logo asset hosted from a third-party CDN with mutable content | Tampering | Logo is committed to `dealdrop/public/` — served from same origin. No third-party CDN dependency. ✓ |
| Tab-nabbing via logo Link with `target="_blank"` | Spoofing | Link has no `target="_blank"`; navigates internally to `/`. ✓ |
| `aria-label` overriding alt text on decorative images | Information Disclosure (low) | Verified pattern: `<Link aria-label="DealDrop home"><Image alt="DealDrop"/></Link>`. Both attributes present and accurate. ✓ |
| `next/image` URL parameter pollution if the `src` is derived from user input | Tampering | Logo `src` is a hardcoded literal `/deal-drop-logo.png`. Not user-derived. ✓ |
| ImageResponse route bundle exceeding 500KB ceiling (path B only) | DoS (low) | Existing `app/icon.tsx` is 47 lines and ships zero binary assets — well under the limit. If path B retains the ImageResponse and adds an orange-themed glyph, ceiling still safe. ✓ |
| CSS injection via custom property | Tampering | `--primary` is hardcoded in `globals.css`, not user-derived. ✓ |

**Net assessment:** Phase 8 has effectively no novel attack surface. The only file additions are a server-rendered PNG (already vetted), a redefined CSS token (no user input path), and copy strings.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 hex color tokens (`bg-orange-500` = `#f97316`) | Tailwind v4 oklch tokens (`bg-orange-500` = `oklch(70.5% 0.213 47.604)`) | Tailwind v4.0 (2025) | All v4 colors are oklch; pre-v4 tutorials with hex values are mismatched. |
| `tailwind.config.js` for theme extension | `@theme` / `@theme inline` blocks in CSS | Tailwind v4.0 | Already adopted in this codebase (`globals.css:41`). |
| `next/legacy/image` | `next/image` with required `width`+`height` | Next.js 13+ | Already adopted. |
| `app/icon.tsx` ImageResponse `params` as plain object | `params` as Promise (must await) | Next.js 16.0.0 | Existing `app/icon.tsx` does not use params, so unaffected. |
| `<a href="/">` with manual click handler for SPA nav | `<Link href="/">` from `next/link` | Next.js 13+ | Phase 8 is the first DealDrop usage of Link as a logo wrapper. |
| Hex-to-RGB-to-HSL color conversions | OKLCH (perceptually uniform) | CSS Color Module Level 4 (~2023) | Tailwind v4 + Shadcn now ship oklch by default. |

**Deprecated / outdated:**

- **`next/legacy/image`** — never used in DealDrop. Confirmed by grep.
- **`tailwind.config.js`** — should NOT be added in Phase 8. Tailwind v4 doesn't need it.
- **`onLoadingComplete` prop on `<Image>`** — deprecated per Image docs §line 51. Use `onLoad` instead. Phase 8 doesn't use either.

## Assumptions Log

> All claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that may need user confirmation.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The user's logo PNG (620×210) renders legibly at 32×32 if path A (static `app/icon.png`) is chosen for D-12 | "Alternatives Considered", "Pitfall 6" | Tab favicon may look squashed or unreadable; planner may need to re-export a square 32×32 mark. **Mitigation:** path A's verification step inspects the rendered tab icon at 32×32 zoom. |
| A2 | The user's logo PNG has a transparent background that works in both light AND dark mode (i.e., the logo strokes are not pure black or pure white) | Header rendering, Pitfall 6 | Logo could be invisible in one mode. **Mitigation:** D-08 dark-mode walk catches this; if found, apply `dark:filter:invert(1)` on the `<Image>` or request a second asset variant. |
| A3 | The new toast text "Now tracking" (or "Now tracking [name]") is what the user wants for the success path; UI-SPEC line 197 specifies this verbatim but the user did not directly approve it during discuss-phase | "Phase Requirements", D-11 | Cosmetic — easy to revise. |
| A4 | `oklch(0.985 0 0)` (zinc-50) passes WCAG AA contrast on the new `--primary` orange-500 background | "Code Examples §2", BRAND-05 | If contrast is < 4.5:1 (text) or < 3:1 (UI component), planner must lift the foreground or darken the primary. **Mitigation:** D-08 walk explicitly checks this. |
| A5 | Dark-mode `--primary-foreground` of `oklch(0.141 0.005 285.823)` (zinc-950) passes AA on dark-mode `--primary` of orange-400 | "Code Examples §2" | Same as A4. **Mitigation:** D-08 walk. |
| A6 | The orange-700 small-text accent surface is FeatureCard blurbs (UI-SPEC line 138 specifies this; CONTEXT.md flags it as Claude's discretion) | "User Constraints" | Cosmetic; if FeatureCard blurbs in `text-orange-700` reads too aggressive, fall back to Hero subheadline only. **Mitigation:** D-08 walk includes "subjective brand feel". |
| A7 | Path A for D-12 requires deleting `dealdrop/app/icon.test.tsx` (the existing ImageResponse test file). Path B keeps it but the test must be updated for the new orange palette | "Code Examples §5", "Wave 0 Gaps" | If the test file lingers when path A is chosen, the suite will fail with "cannot find module './icon'". **Mitigation:** explicit deletion step in plan. |
| A8 | Width=95 (or 94) is the right rendered pixel width for the logo at height=32. Computed from intrinsic 620÷210 ratio | "Pattern 3", "Code Examples §1" | If the ratio computation is off by a pixel, the rendered logo shifts micro-amounts. Cosmetic. **Mitigation:** the intrinsic ratio is preserved by `next/image` regardless of declared width — declared width affects layout reservation only. |

**Note:** Assumptions A4 and A5 (contrast pairs) are the only ones with non-cosmetic risk. They are explicitly addressed by D-08's manual contrast walk. The other assumptions are either cosmetic or cheaply verified during the verification phase.

## Open Questions

1. **Should the success toast include the product name?**
   - What we know: UI-SPEC line 197 specifies `"Now tracking [product name]"`. CONTEXT.md says "planner picks copy".
   - What's unclear: At the success branch in `AddProductForm.tsx:44`, the `state` object shape is `{ ok: true }` — it does not currently carry the product name. Reading the full server action shape is needed to confirm. Pulling the name into the toast may require widening the action's success return type.
   - Recommendation: **Plan starts with simple `'Now tracking'`** (no name interpolation). If the planner has the bandwidth to widen `AddProductResult` to carry the name on success, do so as a stretch goal — otherwise ship the simpler toast. Either is consistent with UI-SPEC §line 197.

2. **Is the existing `dealdrop/app/icon.test.tsx` worth keeping if path B is chosen for D-12?**
   - What we know: The test exists (per `ls dealdrop/app`). Its content is not yet inspected.
   - What's unclear: Whether the test is asserting on the zinc-900 glyph specifically or on the structural ImageResponse return.
   - Recommendation: Read `app/icon.test.tsx` during plan creation. If it asserts on color, update; if structural-only, no change. If path A is chosen, delete unconditionally.

3. **Path A vs Path B for favicon — final pick?**
   - What we know: CONTEXT.md D-12 leaves this to the planner. The user's PNG is 620×210 (wordmark-shaped, not square).
   - What's unclear: At 32×32, does the wordmark reduce legibly? Likely no — at that size the wordmark would be ~10×3 pixels of letterforms, illegible.
   - Recommendation: **Path B is more likely correct** — keep `app/icon.tsx` as the ImageResponse, replace the zinc-900 glyph with an orange-themed mark (e.g., a stylized "DD" or a tag glyph in orange-500). This keeps the tab icon legible at 32×32. The user's wordmark PNG remains in the header where there's room to render at 95×32. **Plan must not assume path A is the default.**

4. **Should the planner add a `Header.test.tsx` for BRAND-02?**
   - What we know: No test exists today. CONTEXT.md does not require one. Adding one is scope creep but cheap (~10 lines).
   - What's unclear: Whether the project's portfolio bar warrants a Header test.
   - Recommendation: **Add it.** The cost is trivial, the user-visible regression risk on BRAND-02 (logo missing) is the highest of any Phase 8 surface, and the assertion is straightforward (`getByAltText('DealDrop')` + `getByLabelText('DealDrop home')`).

## Sources

### Primary (HIGH confidence)

- `dealdrop/node_modules/tailwindcss/theme.css` lines 22-29 — exact stock Tailwind v4.2.2 oklch values for orange-50/-400/-500/-600/-700. **Authoritative source for D-05.**
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` — `next/image` `width`+`height` requirements, `src` import patterns, `priority` prop. Authoritative for BRAND-02.
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` — `<Link>` props, `href`, `aria-label` passthrough. Authoritative for D-04.
- `dealdrop/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` — `app/icon.png` (file convention) and `app/icon.tsx` (ImageResponse) both supported. v16.0.0 changelog: `params` is now Promise. Authoritative for BRAND-03 / D-12.
- `dealdrop/app/globals.css` — current `:root` and dark-mode tokens; `@theme inline` block already maps `--color-primary`. Authoritative for D-06.
- `dealdrop/components/ui/button.tsx:12` — Shadcn Button default variant uses `bg-primary text-primary-foreground hover:bg-primary/90`. Confirms cascade strategy.
- `dealdrop/src/components/dashboard/PriceChart.tsx:117` — `<Line stroke="var(--primary)" />`. Confirms cascade.
- `dealdrop/src/components/hero/FeatureCard.tsx:13` — `<Icon className="h-6 w-6 text-primary" />`. Confirms cascade.
- `dealdrop/public/deal-drop-logo.png` — verified existence (file size 65557 bytes, dimensions 620×210, format PNG 8-bit RGB non-interlaced) via `file` and `ls -la`.
- `dealdrop/package.json` — locked versions of Next.js (16.2.4), React (19.2.4), Tailwind (^4 / 4.2.2 in node_modules), Recharts (3.8.1), Vitest (^3.2.4), @testing-library/react (^16.3.2).
- `.planning/phases/08-brand-polish/08-CONTEXT.md` — comprehensive locked decisions D-01 through D-12.
- `.planning/phases/08-brand-polish/08-UI-SPEC.md` — visual contract; **note correction: line 108 oklch value is orange-600 not orange-500.**

### Secondary (MEDIUM confidence)

- `.planning/phases/07-polish-deployment/07-CONTEXT.md` §D-07 — Phase 7 favicon decision (keep `app/icon.tsx`, delete `app/favicon.ico`). Phase 8 inherits this.
- `.planning/phases/05-price-history-chart/05-CONTEXT.md` Claude's Discretion — confirms `var(--primary)` is the chart line color contract.
- WCAG 2.1 AA contrast spec: 4.5:1 for normal text, 3:1 for large text and UI components. Standard since 2008; well-known.

### Tertiary (LOW confidence — none for this phase)

No claims in this research depend on training data or single-source web findings. All facts are verified against on-disk source files or first-party documentation in `node_modules/`.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package version verified against `package.json` and `node_modules/`.
- Architecture: **HIGH** — code paths read directly; cascade verified by inspection of consumers (Button, PriceChart, FeatureCard).
- Pitfalls: **HIGH** — the UI-SPEC oklch error and the lingering `favicon.ico` are both observed facts, not extrapolations. Pitfall #6 (logo dark-mode legibility) is `[ASSUMED]` pending visual walk.

**Research date:** 2026-05-02

**Valid until:** 2026-06-02 (30 days; stable since the locked stack does not auto-update and no Phase 8 dependency is on a fast-moving library)

---

*Phase: 08-brand-polish*
*Research completed: 2026-05-02*
