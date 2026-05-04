---
type: quick
quick_id: 260504-pap
slug: dealdrop-logo-black-background-in-dark-m
phase: quick-260504-pap
plan: 01
subsystem: branding
tags: [brand, dark-mode, header, logo, css-filter, regression-test]
requires:
  - dealdrop/app/globals.css#@custom-variant-dark (set up by quick-260503-ime)
  - dealdrop/public/deal-drop-logo.png (existing 8-bit RGB asset)
provides:
  - dealdrop/src/components/header/Header.tsx#dark-mode-logo-filter
affects:
  - dealdrop/src/components/header/Header.test.tsx (mock extension + new assertion)
tech-stack:
  added: []
  patterns:
    - "CSS-only dark-mode brand asset adaptation via `dark:invert dark:hue-rotate-180`"
    - "Test-side next/image mock className pass-through (enables styling regression locks)"
key-files:
  created: []
  modified:
    - dealdrop/src/components/header/Header.tsx
    - dealdrop/src/components/header/Header.test.tsx
decisions:
  - "Used `dark:invert dark:hue-rotate-180` filter combo (CSS-only) instead of asset swap, dark-mode PNG variant, or wrapper bg utility — pure CSS works with existing server component and existing dark-variant plumbing; preserves orange accent while flipping white→black."
  - "Rejected `dark:bg-black` wrapper — invisible because the logo PNG is 8-bit RGB without alpha (white pixels cover any background)."
  - "Rejected asset swap / dual-PNG approach — out of scope (no design work in v1.1; logo asset provided by user)."
  - "Rejected client component / theme hook — unnecessary; Tailwind `dark:` utilities resolve under both .dark class and prefers-color-scheme thanks to @custom-variant dark added in quick-260503-ime."
metrics:
  duration_minutes: 4
  completed_date: 2026-05-04
  tasks_completed: 1
  files_modified: 2
  commits: 1
requirements:
  - QUICK-260504-PAP
related:
  - .planning/quick/260503-ime-fix-dark-variant-in-globals-css-to-honor/SUMMARY.md
  - .planning/quick/260504-pap-dealdrop-logo-black-background-in-dark-m/260504-pap-PLAN.md
---

# Quick Task 260504-pap: DealDrop logo — black background in dark mode

## One-liner

Adds `dark:invert dark:hue-rotate-180` to the header logo `<Image>` so the baked-in white PNG background flips to black in dark mode while the orange wordmark accent stays orange — pure-CSS, zero asset work, regression-locked by test.

## Why

`dealdrop/public/deal-drop-logo.png` is an 8-bit RGB image (no alpha) with a white background baked into the pixels. In OS dark mode the page background is near-black, so the logo rendered as a stark white slab against a dark page — a visible brand defect. A wrapper `dark:bg-black` would have been invisible because the opaque PNG pixels cover anything behind them. The asset itself had to change visually, but without swapping files (no design work was in scope).

## What changed

### `dealdrop/src/components/header/Header.tsx` (1 line)

Added one className token to the existing `<Image>` element. Nothing else touched — same wrapping `<Link>`, same `<header>` background, same imports, same dimensions.

```tsx
<Image
  src="/deal-drop-logo.png"
  alt="DealDrop"
  width={95}
  height={32}
  priority
  className="dark:invert dark:hue-rotate-180"
/>
```

### `dealdrop/src/components/header/Header.test.tsx` (mock extension + 1 new test)

Two coordinated edits:

1. Extended the `next/image` `vi.mock` stub to forward `className` onto the rendered `<img>` (the prior stub dropped it on the floor, which would have made any styling assertion silently pass).
2. Added a new regression test inside the existing `describe('Header (BRAND-02)', ...)` block:

```tsx
it('logo has dark-mode invert+hue-rotate filter so white bg reads as black in dark mode (quick-260504-pap)', () => {
  render(<Header user={null} />)
  const logo = screen.getByRole('img', { name: 'DealDrop' })
  expect(logo.className).toContain('dark:invert')
  expect(logo.className).toContain('dark:hue-rotate-180')
})
```

The test asserts both filter tokens are present so any future cleanup that drops one of them (e.g., dropping `hue-rotate-180` because "invert alone looks fine in light mode") fails loudly in CI rather than shipping a blue-tinted logo to dark-mode users.

## Why `dark:invert dark:hue-rotate-180` (rejected alternatives)

| Approach | Verdict | Reason |
|---|---|---|
| `dark:invert dark:hue-rotate-180` (chosen) | Selected | Pure CSS, no asset work, preserves orange. `invert(1)` flips white bg → black and dark grey wordmark text → light grey. Side effect: orange → blue. `hue-rotate(180deg)` rotates the wheel back, restoring orange. Grayscale is unaffected by hue rotation, so the inverted white→black survives. Net effect: white bg → black, text → readable on black, orange → orange. |
| `dark:bg-black` wrapper | Rejected | Invisible. The PNG is 8-bit RGB without alpha; opaque white pixels cover any background utility. |
| Swap to a transparent-bg PNG / dual asset | Rejected | Out of scope. v1.1 explicitly excluded design work; the logo asset was provided by the user. Would have required a second file in `public/`, a media query / theme hook to choose, and design QA. |
| Client component + `useTheme` hook | Rejected | Unnecessary. Adding `'use client'` to `Header.tsx` would be an anti-pattern per Phase 8 P02 decision (RSC-safe today). The `dark:` utilities already work because `dealdrop/app/globals.css:4` declares `@custom-variant dark (&:where(.dark, .dark *), @media (prefers-color-scheme: dark));` — fixed in quick task `260503-ime`. |
| Inline `style={{ filter: ... }}` | Rejected | No mode awareness without media queries in JS — defeats Tailwind's `dark:` plumbing. |

## Test results

**Focused (per plan verify command):**
```
$ cd dealdrop && npm test -- src/components/header/Header.test.tsx --run

✓ src/components/header/Header.test.tsx (6 tests) 59ms
  ✓ renders the DealDrop logo image with src and alt
  ✓ logo image has explicit width=95 and height=32 (D-03 + derived ratio)
  ✓ wraps the logo in a click-home link with aria-label
  ✓ renders SignInButton when user is null
  ✓ renders SignOutButton when user is present
  ✓ logo has dark-mode invert+hue-rotate filter so white bg reads as black in dark mode (quick-260504-pap)

Test Files  1 passed (1)
     Tests  6 passed (6)
```

6/6 passing for the file (was 5/5 baseline; +1 new regression test).

**TDD gate sequence (within single commit):** RED phase verified before GREEN — ran the test suite after extending the mock and adding the new assertion (Header.tsx unchanged) and confirmed `1 failed | 5 passed (6)` with `expected '' to contain 'dark:invert'`. Then added the className to Header.tsx and confirmed `6 passed (6)`. Combined into a single feat commit per plan instruction (the two halves are coupled — neither is meaningful alone).

**Full suite:**
```
$ cd dealdrop && npm test --run

Test Files  22 passed (22)
     Tests  243 passed (243)
```

243/243 passing across the full suite. No regressions. (Baseline at quick-task start was 242 — the +1 is the new test added by this task.)

**Lint:**
```
$ cd dealdrop && npm run lint
```

The change introduces zero new lint errors or warnings on `Header.tsx`. The only Header-related lint output is the pre-existing `<img>` warning on `Header.test.tsx:11` (the existing next/image mock stub uses a plain `<img>` for testing — pre-existing pattern, not introduced by this task). All other lint errors in the codebase are pre-existing and out of scope per the executor's scope-boundary rules; they remain logged in `.planning/STATE.md` deferred items.

## Visual sanity check (operator may verify post-merge)

- Light mode: visit `http://localhost:3000` — logo background reads white, blends seamlessly with the page background. Unchanged from prior behavior. (Light mode applies neither `dark:invert` nor `dark:hue-rotate-180`.)
- Dark mode (toggle OS to `prefers-color-scheme: dark`): logo background reads black, blends with the near-black page background. The "dealdrop" wordmark text is now light/readable on black. The orange accent stays orange (no hue shift to blue or any other color).

## Deviations from plan

None — plan executed exactly as written. Two edits in one commit per `<action>` block; verify command produced the exact expected pass count; no auto-fixes triggered; no checkpoints in this plan.

## Commits

| Hash | Type | Message | Files |
|---|---|---|---|
| `470959f` | feat | feat(quick-260504-pap-01): dark-mode logo filter so white bg reads as black | `Header.tsx`, `Header.test.tsx` |

## Links

- Plan: `.planning/quick/260504-pap-dealdrop-logo-black-background-in-dark-m/260504-pap-PLAN.md`
- Prior dark-variant CSS plumbing fix that made `dark:` utilities work under `prefers-color-scheme: dark`: `.planning/quick/260503-ime-fix-dark-variant-in-globals-css-to-honor/SUMMARY.md`
- Header component (unchanged otherwise — same RSC pattern from Phase 08 P02): `dealdrop/src/components/header/Header.tsx`

## Self-Check: PASSED

Verified after writing SUMMARY:

- File `dealdrop/src/components/header/Header.tsx` exists and contains `dark:invert dark:hue-rotate-180`. FOUND.
- File `dealdrop/src/components/header/Header.test.tsx` exists and contains both the className-pass-through mock and the new regression test. FOUND.
- Commit `470959f` exists in `git log` on `master`. FOUND.
- Focused test run: 6/6 passing. FOUND.
- Full suite: 243/243 passing. FOUND.
