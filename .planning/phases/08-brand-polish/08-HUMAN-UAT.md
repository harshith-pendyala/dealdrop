---
status: partial
phase: 08-brand-polish
source: [08-VERIFICATION.md]
started: 2026-05-02T20:59:30Z
updated: 2026-05-02T20:59:30Z
requirement: BRAND-05
---

## Current Test

[awaiting human visual walk]

## Tests

### 1. Desktop light — Header logo at 32px (1x DPR)
expected: Logo renders crisp, correct DealDrop wordmark/glyph, click navigates to `/`.
result: [pending]

### 2. Desktop light — Track Price button default (Sign In + Track Price)
expected: Orange-500 background (`oklch(70.5% 0.213 47.604)`), zinc-50 text, ≥4.5:1 contrast.
result: [pending]

### 3. Desktop light — Track Price button hover
expected: `bg-primary/90` produces darker orange tint, foreground still legible.
result: [pending]

### 4. Desktop light — Track Price button focus (keyboard tab)
expected: Visible focus ring around button, AA contrast, no clipping.
result: [pending]

### 5. Desktop light — ProductCard price (text-primary cascade)
expected: Price renders in orange-500 on card; no contrast regression vs v1.0 zinc.
result: [pending]

### 6. Desktop light — PriceChart line (stroke=var(--primary))
expected: Chart line renders orange-500; data points visible against card background.
result: [pending]

### 7. Desktop light — FeatureCard icons (text-primary)
expected: Lucide icons render orange-500; legible against background, ≥3:1 contrast (UI graphic).
result: [pending]

### 8. Desktop light — Hero gradient warmest stop vs h1 contrast
expected: orange-50 (#fff7ed) gradient does not reduce h1 readability; ≥4.5:1 zinc-900 on warmest stop.
result: [pending]

### 9. Desktop dark — Header logo on near-black background
expected: Logo wordmark/glyph remains visible and crisp at dark `--background`.
result: [pending]

### 10. Desktop dark — Track Price button default (orange-400)
expected: Lighter orange (`oklch(75% 0.183 55.934)`) renders against zinc-950 fg, ≥4.5:1.
result: [pending]

### 11. Desktop dark — Track Price button hover
expected: Hover state remains legible in dark mode.
result: [pending]

### 12. Desktop dark — Track Price button focus
expected: Focus ring visible against dark card.
result: [pending]

### 13. Desktop dark — ProductCard price
expected: Orange-400 on dark card, ≥4.5:1 contrast.
result: [pending]

### 14. Desktop dark — PriceChart line on dark card
expected: Orange-400 line visible against dark surface, no flatness.
result: [pending]

### 15. Desktop dark — FeatureCard icons
expected: Icons remain legible at orange-400 on dark surfaces.
result: [pending]

### 16. Desktop dark — Hero gradient should be invisible (dark:from-transparent)
expected: No orange tint on dark background — `dark:from-transparent` collapses gradient. **Note:** Code review HIGH-01 flagged that media-query dark mode may not honor class-based `dark:` variant — this row will likely surface that issue.
result: [pending]

### 17. 375px light — Logo crisp at 2x DPR
expected: Logo renders crisply at mobile retina; no blur, correct intrinsic-ratio width.
result: [pending]

### 18. 375px light — Track Price button (mobile width)
expected: Button does not overflow card or hero; touch target ≥44px height.
result: [pending]

### 19. 375px light — ProductCard price (mobile grid)
expected: Price legible in single-column mobile grid layout.
result: [pending]

### 20. 375px light — Hero gradient + h1 contrast at narrow viewport
expected: Gradient does not cause readability regression at 375px width.
result: [pending]

### 21. 375px dark — Logo + buttons + price
expected: All three render correctly in mobile dark mode.
result: [pending]

### 22. Browser-tab light — Favicon in Chrome (default zoom)
expected: Orange `#f97316` background with white "D" glyph visible in Chrome tab.
result: [pending]

### 23. Browser-tab light — Favicon in Safari
expected: Same favicon renders in Safari tab.
result: [pending]

### 24. Browser-tab dark — Favicon in Chrome (dark theme)
expected: Favicon remains visible against dark Chrome chrome.
result: [pending]

## Summary

total: 24
passed: 0
issues: 0
pending: 24
skipped: 0
blocked: 0

## Gaps
