---
phase: 08-brand-polish
plan: 02
subsystem: ui
tags: [brand, logo, header, next-image, next-link, accessibility, rsc]

# Dependency graph
requires:
  - phase: 08-brand-polish
    provides: Plan 01 redefined --primary to Tailwind v4 orange-500/400 oklch (cascade affects SignInButton next to logo); ProductCard price uses text-primary
provides:
  - DealDrop PNG logo (95x32) rendered in header via next/image with priority hint
  - Click-home affordance via next/link wrapping the logo with aria-label="DealDrop home"
  - Header.test.tsx (NEW) — Wave 0 scaffold with 5 it() blocks (logo src/alt, dimensions, link href + aria-label, signin/signout toggle)
  - Header.tsx remains a server component (no 'use client') — RESEARCH.md Pattern 4 verified
affects: [08-03-favicon, 08-04-hero-cleanup, 08-06-brand-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/link + next/image are server-component-safe in this codebase — no 'use client' needed when consuming them"
    - "Test stub pattern for next/link: minimal pass-through anchor with href, aria-label, className, children"
    - "Logo width derivation: explicit width/height from intrinsic ratio (620x210 → 95x32 at 32px height)"

key-files:
  created:
    - dealdrop/src/components/header/Header.test.tsx
  modified:
    - dealdrop/src/components/header/Header.tsx

key-decisions:
  - "Width=95 derived from intrinsic 620x210 PNG ratio at height=32 (32 * 620/210 = 94.48 → rounded up to 95)"
  - "Header.tsx remains a server component — Link and Image from Next.js are RSC-safe per RESEARCH.md Pattern 4"
  - "alt='DealDrop' (logomark assumption per D-02) and aria-label='DealDrop home' on Link (per D-04 + 08-UI-SPEC.md lines 208-209)"
  - "next/link test stub written from scratch (no analog in dashboard tests) — minimal pass-through <a>"
  - "Did NOT introduce a side-by-side logo+wordmark composition (per D-02); the user's PNG is assumed to carry its own wordmark"

patterns-established:
  - "Header logo pattern: <Link href='/' aria-label='...'><Image src='/...' alt='...' width={W} height={H} priority /></Link>"
  - "RSC test pattern with three stubs: next/image, next/link, internal client subcomponent — keeps test in jsdom without dragging Supabase or Next.js runtime"

requirements-completed: [BRAND-02]

# Metrics
duration: 2min
completed: 2026-05-02
---

# Phase 08 Plan 02: Header Logo Summary

**Replaced the text wordmark in Header.tsx with a click-home logo block (`<Link href="/" aria-label="DealDrop home"><Image src="/deal-drop-logo.png" alt="DealDrop" width={95} height={32} priority /></Link>`) and shipped a 5-test Header.test.tsx as the Wave 0 scaffold for BRAND-02.**

## Performance

- **Duration:** 2 min (~108s wall clock)
- **Started:** 2026-05-02T14:17:41Z
- **Completed:** 2026-05-02T14:19:29Z
- **Tasks:** 2
- **Files modified:** 1 (Header.tsx) + 1 created (Header.test.tsx)

## Accomplishments

- BRAND-02 shipped — DealDrop logo image now renders in the application header at 32px tall on every route that mounts Header.tsx
- Click-home affordance: clicking the logo navigates to `/` (free convention; useful once additional routes ship)
- Accessibility: `aria-label="DealDrop home"` on the Link gives screen readers an explicit nav purpose; `alt="DealDrop"` on the Image provides image semantics
- Server-component preserved: Header.tsx has no `'use client'` directive — confirmed both `Link` and `Image` work in RSC (RESEARCH.md Pattern 4)
- Wave 0 closed: Header.test.tsx is the first listed Wave 0 file in 08-VALIDATION.md and now exists with 5 it() blocks
- TDD ordering preserved: Task 1 created the test (RED — 3 fail / 2 pass), Task 2 satisfied it (GREEN — 5/5 pass)
- No file-modification overlap with Plan 01 — token cascade still drives the SignInButton next to the new logo

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Header.test.tsx (Wave 0 RED phase)** — `373fd29` (test)
2. **Task 2: Replace Header.tsx text wordmark with logo (GREEN phase)** — `ca18892` (feat)

## Files Created/Modified

- `dealdrop/src/components/header/Header.test.tsx` (NEW, 74 lines) — vitest jsdom suite. Stubs: `next/image` to `<img>` (with width/height extension over the canonical ProductCard.test.tsx:6-9 pattern), `next/link` to `<a>` (new pattern, no analog in dashboard tests), `SignInButton` and `SignOutButton` to button stubs. Five `it()` blocks cover: image src/alt, image dimensions (95x32), link href + aria-label, SignIn renders when user is null, SignOut renders when user is truthy.
- `dealdrop/src/components/header/Header.tsx` (modified) — Two new imports added below existing imports (`Link` from `next/link`, `Image` from `next/image`). Inner `<span className="text-sm font-medium tracking-tight">DealDrop</span>` replaced with the logo block. Outer `<header>` shell, `max-w-6xl` wrapper, `h-14` height class, and SignIn/SignOut conditional all byte-for-byte unchanged.

## Exact JSX Block Written into Header.tsx

```tsx
<Link href="/" aria-label="DealDrop home" className="inline-flex items-center">
  <Image
    src="/deal-drop-logo.png"
    alt="DealDrop"
    width={95}
    height={32}
    priority
  />
</Link>
```

This block sits in place of the prior `<span className="text-sm font-medium tracking-tight">DealDrop</span>` on what was line 13 of Header.tsx.

## Width Derivation (D-03 + RESEARCH.md Pattern 3)

| Input | Value |
|-------|-------|
| Intrinsic width (PNG) | 620 px |
| Intrinsic height (PNG) | 210 px |
| Aspect ratio | 620 ÷ 210 = 2.952 |
| Target height (D-03) | 32 px |
| Derived width | 32 × 2.952 = 94.48 |
| Final width (rounded up) | **95 px** |

`priority` prop applied because the logo is above-the-fold (Next.js docs §"Image properties priority"). Asset path `/deal-drop-logo.png` resolves to `dealdrop/public/deal-drop-logo.png` via Next.js's public-folder static-asset convention.

## 'use client' Audit

**Was `'use client'` added to Header.tsx? No.**

Both `Link` (from `next/link`) and `Image` (from `next/image`) are server-component-safe per 08-RESEARCH.md §"Pattern 4". Adding `'use client'` here would be an anti-pattern (08-PATTERNS.md §"Anti-patterns to avoid"). Confirmed via `! grep "'use client'" dealdrop/src/components/header/Header.tsx`.

## Test Pass Output (5/5)

```
RUN  v3.2.4 /Users/harshithpendyala/Documents/DealDrop/dealdrop

✓ src/components/header/Header.test.tsx (5 tests) 60ms

Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  657ms
```

| Test | Result |
|------|--------|
| renders the DealDrop logo image with src and alt | ✅ |
| logo image has explicit width=95 and height=32 (D-03 + derived ratio) | ✅ |
| wraps the logo in a click-home link with aria-label | ✅ |
| renders SignInButton when user is null | ✅ |
| renders SignOutButton when user is present | ✅ |

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | `373fd29` (test) | ✅ Test ran with 3 fail / 2 pass before Task 2 — exactly as plan specified |
| GREEN (feat commit) | `ca18892` (feat) | ✅ All 5 tests pass after Task 2 |
| REFACTOR | n/a | Not needed — implementation matches plan; no cleanup ship |

## Build + Lint Results

| Check | Result |
|-------|--------|
| `cd dealdrop && npx vitest run src/components/header/Header.test.tsx` | exit 0 (5/5 GREEN) |
| `cd dealdrop && npm run build` | exit 0 (Next.js 16.2.4 Turbopack, 6/6 static pages, TypeScript clean) |
| `cd dealdrop && npm run lint -- src/components/header/Header.tsx src/components/header/Header.test.tsx` | exit 0 (1 expected warning on the test stub `<img>` — that's the next/image stub pattern from ProductCard.test.tsx:8 verbatim; not an error) |
| `test -f dealdrop/public/deal-drop-logo.png` | PASS (asset on disk, 65557 bytes) |

The single ESLint warning (`@next/next/no-img-element` on Header.test.tsx:10) is intentional and matches the canonical stub pattern in ProductCard.test.tsx — the test stubs `next/image` to a plain `<img>` so the test doesn't need to pull the Next.js runtime. The warning is expected; lint exits 0.

## Decisions Made

- **Width derivation = 95 px** (rounded from 94.48 = 32 × 620/210). Plan locked this value in §<interfaces>; planner verified against intrinsic PNG dimensions.
- **`priority` on the Image** because the logo is above the fold on every route. Next.js docs flag this as the correct hint for LCP elements.
- **`alt="DealDrop"`** matches 08-UI-SPEC.md line 209. The PNG is assumed to be a wordmark (D-02 specifies no symbol-only fallback). If later visual review reveals it reads symbol-only, that's a Plan 06 BRAND-05 deviation, NOT a Plan 02 fix.
- **`aria-label="DealDrop home"`** matches D-04 + 08-UI-SPEC.md line 208. Provides screen-reader nav purpose distinct from the image alt.
- **`className="inline-flex items-center"`** on the Link — keeps the logo vertically centered in the existing 56px header row without adding any wrapper element.
- **next/link test stub written from scratch** — no analog exists in dashboard tests. Minimal pass-through anchor that forwards `href`, `aria-label`, `className`, and `children`. Pattern documented for future planners in 08-PATTERNS.md.

## Deviations from Plan

None - plan executed exactly as written.

The plan was unusually precise (pre-extracted JSX block, locked width=95, locked alt/aria-label values, lock-list of preserved class strings on the header shell) and the implementation matched it byte-for-byte. No deviations triggered Rules 1-3.

## Symbol-Only Wordmark Check (per D-02 / plan output instruction)

The PNG asset is the user-provided 620x210 logo. Visual confirmation that the asset reads as a wordmark vs. symbol-only is deferred to Plan 06's BRAND-05 manual visual walk (per the plan's `<output>` instruction: "do NOT improvise side-by-side composition"). No deviation flagged at this layer.

## Issues Encountered

None.

## Threat Model Compliance

- **T-08-02-LOGO-XSS-LOW** (Cross-site scripting on alt + href): Disposition `accept`. Both `alt="DealDrop"` and `href="/"` are hard-coded string literals; no user-controlled value reaches them. Next.js Image sanitizes `src` against the configured remote-pattern allowlist (only `/public` used here).
- **T-08-02-A11Y-LOGO-LABEL-LOW** (Accessibility regression): Disposition `mitigate`. Implemented as planned — `aria-label="DealDrop home"` on `<Link>` provides nav purpose to screen readers; `alt="DealDrop"` on `<Image>` provides image semantics. Both verified by Header.test.tsx tests "wraps the logo in a click-home link with aria-label" and "renders the DealDrop logo image with src and alt".

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BRAND-02 done — Plan 03 (favicon refresh per BRAND-03) can proceed; no file-modification overlap.
- Plan 04 (Hero cleanup + orange-50 gradient) can proceed.
- Plan 05 ("Add Product" → "Track Price" rename) can proceed.
- Plan 06 (BRAND-05 visual walk) is the natural verifier — will inspect the logo at 1x and 2x DPR for crispness and confirm the wordmark assumption is correct.
- The token cascade from Plan 01 (orange `--primary`) is still in effect on the SignInButton next to the logo; no regression.

## Threat Flags

None — plan modified one source component and added one test file. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Self-Check: PASSED

**File existence:**
- FOUND: `dealdrop/src/components/header/Header.test.tsx` (created)
- FOUND: `dealdrop/src/components/header/Header.tsx` (modified)
- FOUND: `dealdrop/public/deal-drop-logo.png` (preserved on disk, 65557 bytes)
- FOUND: `.planning/phases/08-brand-polish/08-02-SUMMARY.md` (this file)

**Commits:**
- FOUND: `373fd29` (Task 1: test(08-02): add failing test for header logo and click-home link)
- FOUND: `ca18892` (Task 2: feat(08-02): replace header text wordmark with logo image and click-home link)

---
*Phase: 08-brand-polish*
*Completed: 2026-05-02*
