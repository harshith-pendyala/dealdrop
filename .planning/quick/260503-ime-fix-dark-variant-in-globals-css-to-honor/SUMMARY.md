---
type: quick
quick_id: 260503-ime
slug: fix-dark-variant-in-globals-css-to-honor
status: complete
created: 2026-05-03
completed: 2026-05-03
links:
  - .planning/phases/08-brand-polish/08-HUMAN-UAT.md (G1 — closes)
  - .planning/phases/08-brand-polish/08-REVIEW.md (HIGH-01 — closes)
files_modified:
  - dealdrop/app/globals.css
---

## What Changed

`dealdrop/app/globals.css:4` — broadened the `@custom-variant dark` declaration so `dark:` Tailwind utilities fire on either a `.dark` class ancestor OR `@media (prefers-color-scheme: dark)`.

```diff
- @custom-variant dark (&:is(.dark *));
+ @custom-variant dark (&:where(.dark, .dark *), @media (prefers-color-scheme: dark));
```

## Why

The codebase swaps theme tokens (`--background`, `--foreground`, `--primary`, etc.) via `@media (prefers-color-scheme: dark)` at `globals.css:81`. The `.dark` class is never applied to `<html>` or any ancestor. So every Tailwind `dark:` utility silently failed under OS dark mode — including `dark:from-transparent` on the hero gradient at `Hero.tsx:6`, which surfaced as G1 in BRAND-05 (`08-HUMAN-UAT.md`).

The new rule honors both mechanisms:
- `.dark` class — future theme-switcher support, no behavior change today
- `@media (prefers-color-scheme: dark)` — current OS-driven behavior, now consistent with how custom properties already flip

## Verification

- 177/177 tests pass (`cd dealdrop && npm test`)
- `Hero.test.tsx:44` already asserts `className.toContain('dark:from-transparent')` — no test change needed; the assertion held because className inspection is independent of CSS resolution
- Visual re-walk of T16 needed by user — gradient should collapse and subhead should be readable in OS dark mode

## Closes

- BRAND-05 G1 (`08-HUMAN-UAT.md`) — hero gradient dark-mode leak
- Code review HIGH-01 (`08-REVIEW.md`) — predicted this exact issue

## Commits

- `fix(quick-260503-ime): broaden dark variant in globals.css to honor prefers-color-scheme`
