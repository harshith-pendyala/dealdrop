---
phase: 08-brand-polish
plan: 01
subsystem: ui
tags: [brand, theming, tailwind-v4, css, oklch, shadcn, primary-token]

# Dependency graph
requires:
  - phase: 07-polish-deployment
    provides: Shadcn token plumbing in globals.css; @theme inline mapping --color-primary -> var(--primary); ProductCard structure with current_price <p>
provides:
  - Single-token brand cascade — --primary now resolves to Tailwind v4 orange-500 (light) / orange-400 (dark)
  - Dashboard product prices participate in cascade via text-primary on the price <p>
  - Auto-restyled surfaces (zero per-component churn): Shadcn <Button> default variant, PriceChart line/dot fills, FeatureCard Lucide icons
  - --primary-foreground per-mode contrast tuning (light unchanged zinc-50, dark flipped to zinc-950)
affects: [08-02-header-logo, 08-03-favicon, 08-04-hero-cleanup, 08-05-cta-rename, 08-06-brand-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-token brand cascade — redefining --primary in :root + dark @media is the only source of brand color in source"
    - "Per-mode --primary-foreground tuning — flips between zinc-50 and zinc-950 to maintain WCAG AA on lighter dark-mode primary"
    - "Token-cascade purity — text-primary preferred over text-orange-500 to keep one source of truth"

key-files:
  created: []
  modified:
    - dealdrop/app/globals.css
    - dealdrop/src/components/dashboard/ProductCard.tsx

key-decisions:
  - "Used verified Tailwind v4.2.2 oklch values from node_modules/tailwindcss/theme.css (orange-500 = 70.5% 0.213 47.604, orange-400 = 75% 0.183 55.934), NOT the value listed at 08-UI-SPEC.md line 108 which was orange-600"
  - "Light-mode --primary-foreground left at zinc-50 oklch(0.985 0 0) — verified RESEARCH.md states zinc-50 still passes AA on orange-500"
  - "Dark-mode --primary-foreground flipped to zinc-950 oklch(0.141 0.005 285.823) for AA contrast on lighter orange-400"
  - "ProductCard price uses text-primary (token cascade) rather than direct text-orange-500 to keep a single source of brand color"

patterns-established:
  - "Token cascade: redefine globals.css custom property once; all bg-primary / text-primary / var(--primary) consumers auto-restyle"
  - "Verify oklch palette from node_modules tailwindcss/theme.css, not from secondary documentation"

requirements-completed: [BRAND-04]

# Metrics
duration: 2min
completed: 2026-05-02
---

# Phase 08 Plan 01: Brand Token Foundation Summary

**Redefined --primary CSS custom property to verified Tailwind v4 orange oklch values (orange-500 light / orange-400 dark) so every existing bg-primary, text-primary, and var(--primary) consumer auto-restyles via the cascade; added text-primary to ProductCard price <p> as the only consumer that needed a class addition.**

## Performance

- **Duration:** 2 min (~119s wall clock)
- **Started:** 2026-05-02T14:11:37Z
- **Completed:** 2026-05-02T14:13:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- BRAND-04 single-source-of-truth contract is now in place — editing --primary in globals.css is the only way to change brand color in source
- Light-mode `:root --primary` swapped from zinc-900 to verified Tailwind v4.2.2 orange-500 oklch
- Dark-mode @media `--primary` swapped from zinc-200 to verified Tailwind v4.2.2 orange-400 oklch (lifted L for legibility)
- Dark-mode `--primary-foreground` flipped to zinc-950 to maintain AA contrast on the lighter dark-mode primary
- ProductCard price `<p>` now reads `text-xl font-semibold text-primary` so dashboard prices participate in the cascade
- All other Shadcn tokens byte-for-byte unchanged (confirmed --accent identical in both light and dark blocks)
- Auto-cascade verified: Shadcn `<Button>` default variant, PriceChart line/dot fills (`var(--primary)`), and FeatureCard icons (`text-primary`) inherit the new orange with zero per-component edits

## Task Commits

Each task was committed atomically:

1. **Task 1: Redefine --primary and --primary-foreground tokens in globals.css** — `4e9935d` (feat)
2. **Task 2: Apply text-primary to ProductCard price <p>** — `df1ad4c` (feat)

## Files Created/Modified

- `dealdrop/app/globals.css` — Light `:root` `--primary` set to `oklch(70.5% 0.213 47.604)` (orange-500); dark `@media` `--primary` set to `oklch(75% 0.183 55.934)` (orange-400); dark `--primary-foreground` set to `oklch(0.141 0.005 285.823)` (zinc-950); light `--primary-foreground` left at `oklch(0.985 0 0)` (zinc-50, unchanged); all other tokens untouched.
- `dealdrop/src/components/dashboard/ProductCard.tsx` — Price `<p>` className changed from `text-xl font-semibold` to `text-xl font-semibold text-primary` (single utility added).

## Diff Summary

**globals.css** — three value substitutions on three lines (the light-mode `--primary-foreground` line was deliberately left unchanged because zinc-50 still passes AA on orange-500 per RESEARCH.md):

| Line | Block | Before | After |
|------|-------|--------|-------|
| 13 | `:root` | `--primary: oklch(0.21 0.006 285.885);` | `--primary: oklch(70.5% 0.213 47.604);` |
| 14 | `:root` | `--primary-foreground: oklch(0.985 0 0);` | `--primary-foreground: oklch(0.985 0 0);` (unchanged) |
| 89 | dark `@media` | `--primary: oklch(0.92 0.004 286.32);` | `--primary: oklch(75% 0.183 55.934);` |
| 90 | dark `@media` | `--primary-foreground: oklch(0.21 0.006 285.885);` | `--primary-foreground: oklch(0.141 0.005 285.823);` |

**ProductCard.tsx** — one-class addition (single line edit):

```diff
-        <p className="text-xl font-semibold">
+        <p className="text-xl font-semibold text-primary">
```

## --primary-foreground (light) audit

**Was the light-mode `--primary-foreground` touched? No.**

The `:root` `--primary-foreground: oklch(0.985 0 0);` (zinc-50) was deliberately preserved. RESEARCH.md and 08-UI-SPEC.md line 109 both confirm zinc-50 on orange-500 still passes WCAG AA contrast. Touching it would have been an unnecessary deviation and would have flipped the dark/light contrast model away from Shadcn's per-mode pattern.

## Other Tokens — No-Change Audit

Confirmed unchanged after Task 1 (verified via `grep "^\s*--accent:" dealdrop/app/globals.css`):

- Light `--accent` = `oklch(0.967 0.001 286.375)` (Shadcn neutral hover bg)
- Dark `--accent` = `oklch(0.274 0.006 286.033)` (Shadcn neutral hover bg, dark mode)

Other tokens not touched: `--secondary`, `--muted`, `--popover`, `--card`, `--border`, `--input`, `--ring`, `--destructive`, `--radius`, all `--sidebar-*`, all `--chart-*`. The `@theme inline { --color-primary: var(--primary); }` plumbing line was also untouched — it is what enables the cascade.

## Test Runs (all green)

| Test File | Result |
|-----------|--------|
| `dealdrop/src/components/dashboard/ProductCard.test.tsx` | 7/7 passed (98ms) |
| `dealdrop/src/components/dashboard/PriceChart.test.tsx` | 5/5 passed (36ms) |
| `cd dealdrop && npm run build` | green (Next.js 16.2.4 Turbopack, 6/6 static pages, TypeScript clean) |
| `cd dealdrop && npm run lint -- app/globals.css src/components/dashboard/ProductCard.tsx` | exit 0 (1 ESLint config ignore-warning on globals.css — flat config does not lint CSS by design; not an error) |

## Decisions Made

- **Used verified oklch values from `dealdrop/node_modules/tailwindcss/theme.css`** rather than the value listed at 08-UI-SPEC.md line 108 (`oklch(0.646 0.222 41.116)` — that's actually orange-600 per RESEARCH.md §"Common Pitfalls Pitfall 1"). Plan explicitly flagged this and steered to the verified values.
- **Light-mode `--primary-foreground` not touched** — zinc-50 still passes AA on orange-500 (D-07 / RESEARCH.md / 08-UI-SPEC.md line 109).
- **Dark-mode `--primary-foreground` flipped to zinc-950** — lighter dark-mode `--primary` (orange-400) needs darker text for AA.
- **ProductCard price uses `text-primary`** (cascade) rather than `text-orange-500` (utility) — preserves single source of truth (D-06 + 08-PATTERNS.md §"Token Cascade").

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Threat Model Compliance

- **T-08-01-CSS-CONTRAST-LOW** (Information Disclosure / legibility): Disposition `accept`. Verified per-mode oklch values against Tailwind v4 source; AA contrast spot-check is BRAND-05's responsibility (Plan 06 manual walk).
- **T-08-01-TOKEN-COLLISION-LOW** (Tampering with `--accent`): Disposition `mitigate`. Verified `--accent` byte-for-byte identical (light: `oklch(0.967 0.001 286.375)`, dark: `oklch(0.274 0.006 286.033)`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Token foundation in place; Plans 02-05 build on top of this cascade.
- Plan 02 (header logo) can proceed — no dependency conflict.
- Plan 03 (favicon) can proceed — independent file scope.
- Plan 04 (Hero cleanup + gradient) can proceed — `--primary` cascade does not affect the `from-orange-50` Tailwind utility used in the gradient.
- Plan 05 ("Add Product" → "Track Price" rename) can proceed.
- Plan 06 (BRAND-05 visual walk) is the natural verifier for the cascade once 02-05 ship.

## Threat Flags

None — plan modified CSS custom property values only. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

**File existence:**
- FOUND: `dealdrop/app/globals.css` (modified)
- FOUND: `dealdrop/src/components/dashboard/ProductCard.tsx` (modified)
- FOUND: `.planning/phases/08-brand-polish/08-01-SUMMARY.md` (this file)

**Commits:**
- FOUND: `4e9935d` (Task 1: feat(08-01): redefine --primary to Tailwind v4 orange oklch values)
- FOUND: `df1ad4c` (Task 2: feat(08-01): apply text-primary to ProductCard price for brand cascade)

---
*Phase: 08-brand-polish*
*Completed: 2026-05-02*
