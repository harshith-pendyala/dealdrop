---
status: diagnosed
phase: 08-brand-polish
source: [08-VERIFICATION.md]
started: 2026-05-02T20:59:30Z
updated: 2026-05-03T13:21:00Z
requirement: BRAND-05
---

## Current Test

[walk complete 2026-05-03 — 23/24 pass, 1 gap diagnosed (T16 hero gradient leaks into dark mode)]

## Tests

### 1. Desktop light — Header logo at 32px (1x DPR)
expected: Logo renders crisp, correct DealDrop wordmark/glyph, click navigates to `/`.
result: passed

### 2. Desktop light — Track Price button default (Sign In + Track Price)
expected: Orange-500 background (`oklch(70.5% 0.213 47.604)`), zinc-50 text, ≥4.5:1 contrast.
result: passed

### 3. Desktop light — Track Price button hover
expected: `bg-primary/90` produces darker orange tint, foreground still legible.
result: passed

### 4. Desktop light — Track Price button focus (keyboard tab)
expected: Visible focus ring around button, AA contrast, no clipping.
result: passed

### 5. Desktop light — ProductCard price (text-primary cascade)
expected: Price renders in orange-500 on card; no contrast regression vs v1.0 zinc.
result: passed

### 6. Desktop light — PriceChart line (stroke=var(--primary))
expected: Chart line renders orange-500; data points visible against card background.
result: passed

### 7. Desktop light — FeatureCard icons (text-primary)
expected: Lucide icons render orange-500; legible against background, ≥3:1 contrast (UI graphic).
result: passed

### 8. Desktop light — Hero gradient warmest stop vs h1 contrast
expected: orange-50 (#fff7ed) gradient does not reduce h1 readability; ≥4.5:1 zinc-900 on warmest stop.
result: passed

### 9. Desktop dark — Header logo on near-black background
expected: Logo wordmark/glyph remains visible and crisp at dark `--background`.
result: passed

### 10. Desktop dark — Track Price button default (orange-400)
expected: Lighter orange (`oklch(75% 0.183 55.934)`) renders against zinc-950 fg, ≥4.5:1.
result: passed

### 11. Desktop dark — Track Price button hover
expected: Hover state remains legible in dark mode.
result: passed

### 12. Desktop dark — Track Price button focus
expected: Focus ring visible against dark card.
result: passed

### 13. Desktop dark — ProductCard price
expected: Orange-400 on dark card, ≥4.5:1 contrast.
result: passed

### 14. Desktop dark — PriceChart line on dark card
expected: Orange-400 line visible against dark surface, no flatness.
result: passed

### 15. Desktop dark — FeatureCard icons
expected: Icons remain legible at orange-400 on dark surfaces.
result: passed

### 16. Desktop dark — Hero gradient should be invisible (dark:from-transparent)
expected: No orange tint on dark background — `dark:from-transparent` collapses gradient. **Note:** Code review HIGH-01 flagged that media-query dark mode may not honor class-based `dark:` variant — this row will likely surface that issue.
result: failed — confirmed HIGH-01. Hero renders a white-to-black gradient in OS dark mode and the subhead "Paste any product URL..." is unreadable on the lighter portion. Root cause: `globals.css:4` `@custom-variant dark (&:is(.dark *))` is class-only, but `.dark` class is never applied — dark theme switches via `@media (prefers-color-scheme: dark)` at globals.css:81. So `dark:from-transparent` never fires; `from-orange-50` paints over the dark background.

### 17. 375px light — Logo crisp at 2x DPR
expected: Logo renders crisply at mobile retina; no blur, correct intrinsic-ratio width.
result: passed

### 18. 375px light — Track Price button (mobile width)
expected: Button does not overflow card or hero; touch target ≥44px height.
result: passed

### 19. 375px light — ProductCard price (mobile grid)
expected: Price legible in single-column mobile grid layout.
result: passed

### 20. 375px light — Hero gradient + h1 contrast at narrow viewport
expected: Gradient does not cause readability regression at 375px width.
result: passed

### 21. 375px dark — Logo + buttons + price
expected: All three render correctly in mobile dark mode.
result: passed

### 22. Browser-tab light — Favicon in Chrome (default zoom)
expected: Orange `#f97316` background with white "D" glyph visible in Chrome tab.
result: passed

### 23. Browser-tab light — Favicon in Safari
expected: Same favicon renders in Safari tab.
result: passed

### 24. Browser-tab dark — Favicon in Chrome (dark theme)
expected: Favicon remains visible against dark Chrome chrome.
result: passed

## Summary

total: 24
passed: 23
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

### G1: Hero gradient leaks into dark mode (T16)
status: failed
requirement: BRAND-05
severity: visual + a11y (subhead `Paste any product URL...` unreadable on light gradient stop in OS dark mode)
evidence: User screenshot 2026-05-03 13:21 — confirms code review HIGH-01 prediction
root_cause: |
  `dealdrop/app/globals.css:4` declares `@custom-variant dark (&:is(.dark *))` (class-only),
  but the `.dark` class is never applied to `<html>` or any ancestor. Dark theme switches
  exclusively via `@media (prefers-color-scheme: dark)` at `globals.css:81` (CSS custom
  properties flip — background, foreground, primary, etc.). Result: `dark:from-transparent`
  on `Hero.tsx:6` never fires, so `from-orange-50` (light gradient stop) keeps painting
  over the now-dark background. The white-to-black gradient destroys subhead contrast.
fix_options:
  - "Option A (smallest, ~2 lines): broaden the `@custom-variant dark` rule in globals.css to also fire on `@media (prefers-color-scheme: dark)`. Catches all `dark:` utilities project-wide. Touches one file."
  - "Option B (targeted, ~3 lines): keep `dark:` as class-only but in `Hero.tsx` replace `dark:from-transparent` with a conditional gradient via CSS var (e.g. `--hero-from`) that swaps in the existing media-query block. Smaller blast radius, leaves the broken `dark:` semantics in place for other components."
  - "Option C (fold into v1.2): add a `useTheme` hook + `<html className={isDark ? 'dark' : ''}>` so class-based `dark:` actually fires. Largest scope; defer until a real theme-switcher UI is on the roadmap."
recommendation: Option A — fixes the root cause for all `dark:` utilities at once and avoids per-component workarounds.
