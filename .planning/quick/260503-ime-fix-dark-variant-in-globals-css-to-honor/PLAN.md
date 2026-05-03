---
type: quick
quick_id: 260503-ime
slug: fix-dark-variant-in-globals-css-to-honor
description: fix dark variant in globals.css to honor prefers-color-scheme
created: 2026-05-03
links:
  - .planning/phases/08-brand-polish/08-HUMAN-UAT.md (G1)
  - .planning/phases/08-brand-polish/08-REVIEW.md (HIGH-01)
---

## Problem

`dealdrop/app/globals.css:4` declares `@custom-variant dark (&:is(.dark *))` — class-based only. The `.dark` class is never applied to `<html>` or any ancestor anywhere in the app. Dark theme switches via `@media (prefers-color-scheme: dark)` at `globals.css:81` (CSS custom properties flip).

Consequence: every `dark:` Tailwind utility silently fails. BRAND-05 visual walk T16 surfaced this — `dark:from-transparent` on `Hero.tsx:6` never fires, so `from-orange-50` paints over the dark background producing a white-to-black hero gradient that destroys subhead contrast in OS dark mode.

## Fix

Broaden the `@custom-variant dark` declaration to also fire on `@media (prefers-color-scheme: dark)`. One-line change.

```css
/* before (class-only): */
@custom-variant dark (&:is(.dark *));

/* after (class OR OS preference): */
@custom-variant dark (&:where(.dark, .dark *), @media (prefers-color-scheme: dark));
```

This activates every `dark:` utility under both:
- explicit `.dark` class on an ancestor (future theme-switcher support, no behavior change)
- OS-level `prefers-color-scheme: dark` (current behavior — matches how `--background`, `--foreground`, etc. already flip)

## Tasks

1. Edit `dealdrop/app/globals.css:4` — replace the `@custom-variant dark` declaration as shown above.
2. Run `npm test` — verify Hero.test.tsx still asserts `dark:from-transparent` on the hero className (no test change needed).
3. Manually re-walk T16 in browser dark mode — gradient should collapse, subhead should be readable.

## Acceptance

- `globals.css:4` updated
- 177/177 tests still pass
- T16 visual: hero is uniform dark background in OS dark mode, subhead readable
