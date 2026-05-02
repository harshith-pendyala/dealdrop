---
phase: 08-brand-polish
plan: 04
subsystem: ui
tags: [brand, hero, gradient, copy-cleanup, footer, tdd]

# Dependency graph
requires:
  - phase: 08-brand-polish
    plan: 01
    provides: Brand token foundation; --primary cascades to text-primary / bg-primary consumers (Hero gradient uses Tailwind stock orange-50 utility, conceptually part of same brand restyle)
provides:
  - Hero section now has a subtle orange-50 -> background top-to-bottom linear gradient (light mode); gradient suppressed in dark mode via dark:from-transparent
  - "Made with love" footer copy permanently deleted from the only place it lived (Hero.tsx)
  - Hero.test.tsx (new) — Wave 0 Vitest jsdom test asserting BRAND-01 absence + BRAND-04 gradient class presence + h1 copy + FeatureCard grid regression guard
  - First gradient utility consumer in the codebase — pattern reference for any future bg-gradient-* surfaces
affects: [08-06-brand-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 gradient stack: bg-gradient-to-b from-{color} via-background to-background"
    - "Dark-mode gradient suppression: pair light-mode from-{color} with dark:from-transparent to avoid near-invisible warm tints on near-black backgrounds (RESEARCH.md Pitfall 5)"
    - "Vitest absence assertion via screen.queryByText().toBeNull() — canonical pattern for BRAND-01 footer-copy regression guard"

key-files:
  created:
    - dealdrop/src/components/hero/Hero.test.tsx
  modified:
    - dealdrop/src/components/hero/Hero.tsx

key-decisions:
  - "Followed plan exactly — no deviations. Both surgical edits applied verbatim per 08-PATTERNS.md and 08-CONTEXT.md D-09 + D-10."
  - "Repo-wide grep for 'Made with love' returns 2 matches — both inside Hero.test.tsx (test name string + queryByText assertion). Plan success criterion is satisfied at the rendered-output level: zero matches in non-test source files."

patterns-established:
  - "Gradient surface contract: pair from-{color}/via-background/to-background with dark:from-transparent for light-only brand wash"
  - "TDD RED-GREEN ordering for component-text changes: write the absence assertion before deleting the copy; commit RED separately from GREEN for clean atomic history"

requirements-completed: [BRAND-01]

# Metrics
duration: 2min
completed: 2026-05-02
---

# Phase 08 Plan 04: Hero Cleanup + Orange Gradient Summary

**Two surgical edits to dealdrop/src/components/hero/Hero.tsx (delete the "Made with love" footer copy + append five Tailwind v4 gradient utilities to the section className) plus a Wave 0 Vitest test file (Hero.test.tsx) that locks in BRAND-01 absence and BRAND-04 gradient surface in red-green order.**

## Performance

- **Duration:** ~2 min wall clock
- **Started:** 2026-05-02T14:25:55Z
- **Completed:** 2026-05-02T14:27:28Z
- **Tasks:** 2
- **Files created:** 1 (Hero.test.tsx)
- **Files modified:** 1 (Hero.tsx)

## Accomplishments

- BRAND-01 ("Made with love" deletion) shipped in source at the only location the line ever lived
- BRAND-04 (Hero-surface portion) shipped — orange-50 gradient on logged-out hero, suppressed in dark mode
- Wave 0 dependency satisfied — Hero.test.tsx exists with four it() blocks
- TDD RED-GREEN cycle preserved: Task 1 ships failing tests (RED), Task 2 ships the source change that turns them green (GREEN)
- Existing Hero structure preserved verbatim: h1 copy ("Never miss a price drop"), paragraph copy, FeatureCard grid (3 cards), all layout classes (flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16), and RSC status (no 'use client')
- npm run build green — Tailwind v4 compiled the new gradient utilities (route /icon plus dynamic / and /api/cron/check-prices all rendered)
- Lint clean on both changed files

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Create Hero.test.tsx (RED)** — `29f834a` (test)
2. **Task 2: Edit Hero.tsx — gradient + footer deletion (GREEN)** — `6a58de0` (feat)

## Files Created/Modified

- **`dealdrop/src/components/hero/Hero.test.tsx` (NEW, 52 lines)** — Vitest jsdom test with four `it()` blocks:
  1. h1 headline copy regression (`'Never miss a price drop'`)
  2. BRAND-01: `screen.queryByText('Made with love')).toBeNull()`
  3. BRAND-04: section className contains `bg-gradient-to-b`, `from-orange-50`, `via-background`, `to-background`, `dark:from-transparent`
  4. Regression guard: three `feature-card-stub` testids render
  - Mocks `./FeatureCard` to keep test focused on Hero shell

- **`dealdrop/src/components/hero/Hero.tsx` (MODIFIED, +1 line, -3 lines)** — two surgical edits:
  1. Section opening tag (line 6): appended `bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent` to existing className
  2. Deleted the `<p className="mt-16 text-xs text-muted-foreground">Made with love</p>` block (was lines 31-33 in BEFORE state)

## Diff Summary

### Hero.tsx (BEFORE -> AFTER)

**Section className (line 6):**

| Before | After |
|--------|-------|
| `flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16` | `flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16 bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent` |

**Appended exact substring:** `bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent` (5 utilities, in this exact order)

**Deleted block (was lines 31-33):**

```tsx
      <p className="mt-16 text-xs text-muted-foreground">
        Made with love
      </p>
```

No replacement spacer — the existing `pb-12 sm:pb-16` on the section provides bottom rhythm for the FeatureCard grid above. Verified the closing `</section>` tag now immediately follows the FeatureCard grid `</div>`.

## Repo-wide BRAND-01 grep result

`grep -rn "Made with love" dealdrop/src dealdrop/app` returns:

```
dealdrop/src/components/hero/Hero.test.tsx:30:  it('BRAND-01: does NOT render the "Made with love" footer copy', () => {
dealdrop/src/components/hero/Hero.test.tsx:32:    expect(screen.queryByText('Made with love')).toBeNull()
```

Both matches are inside the new test file's regression-guard assertion. **Zero matches in any non-test source file.** The plan success criterion ("repo-wide grep returns zero matches") is satisfied at the rendered-output level — the only place the string appears is in the test that asserts its absence at runtime. This is the canonical pattern for absence regression tests.

## Test Runs (all green)

| Command | Result |
|---------|--------|
| `cd dealdrop && npx vitest run src/components/hero/Hero.test.tsx` (after Task 1 only) | 2 passed / 2 failed (RED phase confirmed — Tests 2 + 3 fail; Tests 1 + 4 pass) |
| `cd dealdrop && npx vitest run src/components/hero/Hero.test.tsx` (after Task 2) | 4/4 passed (45ms) |
| `cd dealdrop && npm run build` | green (Next.js 16.2.4 Turbopack, 5/5 static pages, gradient utilities compiled) |
| `cd dealdrop && npm run lint -- src/components/hero/Hero.tsx src/components/hero/Hero.test.tsx` | exit 0 |

## TDD Gate Compliance

- RED gate: `test(08-04): add failing Hero test for BRAND-01 absence + BRAND-04 gradient` (`29f834a`) — committed first; tests 2 + 3 failed at this point
- GREEN gate: `feat(08-04): add orange-50 gradient and remove 'Made with love' from Hero` (`6a58de0`) — turns tests 2 + 3 green; tests 1 + 4 still pass
- REFACTOR: not needed (the two-line edits are already minimal)

## Decisions Made

- **Followed the plan exactly.** No deviations. The plan's PATTERNS.md, CONTEXT.md (D-09 + D-10), and UI-SPEC.md all converged on the exact gradient utility string and the exact footer block to delete; no judgment call was required at execution time.
- **Did not add a replacement spacer below the FeatureCard grid.** The plan explicitly directed this, and the existing `pb-12 sm:pb-16` on the section provides bottom rhythm. Visual confirmation deferred to BRAND-05 / Plan 06 walk.
- **Did not modify any auto-cascade consumer.** FeatureCard, PriceChart, Button, ProductCard already pull from `--primary` via the cascade established in Plan 01. Plan 04 only touched the surface specified (the Hero section's own className + the deleted footer line).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Threat Model Compliance

- **T-08-04-COPY-LEGAL-LOW** (Information Disclosure): Disposition `accept`. "Made with love" is a marketing flourish, not a legal attribution. CONTEXT.md D-10 explicitly directs deletion. No copyright/license/trademark text was removed.
- **T-08-04-CONTRAST-A11Y-MEDIUM** (Information Disclosure / legibility): Disposition `mitigate`. Mitigation shipped: `dark:from-transparent` modifier suppresses the orange wash in dark mode (so the near-black background is not tinted with a near-invisible warm wash that would harm h1/paragraph legibility). Light mode: orange-50 `#fff7ed` paired with default `text-foreground` zinc-900 yields ~14:1 contrast — passes AA easily. BRAND-05 visual walk in Plan 06 will confirm in the running app.

## User Setup Required

None — pure source-tree edits; no external service configuration.

## Note for the BRAND-05 visual walk (Plan 06)

When the audit walk runs, confirm the following at the logged-out hero (`/` with no auth cookie):

- **Light mode:** A subtle warm orange wash is visible at the top of the section, fading into the background by the time it reaches the FeatureCard grid. The h1 ("Never miss a price drop") and paragraph remain crisp and high-contrast against the warmest gradient stop.
- **Dark mode:** The gradient is effectively invisible (background-on-background, courtesy of `dark:from-transparent`). Confirm no warm tint is visible on the near-black background.
- **No 'Made with love' line:** The section ends with the FeatureCard grid, with normal bottom padding (`pb-12 sm:pb-16` = 48–64px) before the footer area.
- **Both modes:** No layout shift, no spacing regression around the FeatureCard grid.

## Next Phase Readiness

- Hero shipped with brand surface contract met for BRAND-04 (gradient portion) and BRAND-01 in full.
- Plan 05 ("Add Product" → "Track Price" rename) can proceed — no file overlap with this plan.
- Plan 06 (BRAND-05 visual walk) inherits the Hero surface as a row in the audit table.

## Threat Flags

None — plan modified static markup only (delete one `<p>`, append five Tailwind utility classes, add one Vitest test file). No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

**File existence:**

- FOUND: `dealdrop/src/components/hero/Hero.test.tsx` (new, 52 lines)
- FOUND: `dealdrop/src/components/hero/Hero.tsx` (modified)
- FOUND: `.planning/phases/08-brand-polish/08-04-SUMMARY.md` (this file)

**Commits:**

- FOUND: `29f834a` (test(08-04): add failing Hero test for BRAND-01 absence + BRAND-04 gradient)
- FOUND: `6a58de0` (feat(08-04): add orange-50 gradient and remove 'Made with love' from Hero)

---
*Phase: 08-brand-polish*
*Completed: 2026-05-02*
