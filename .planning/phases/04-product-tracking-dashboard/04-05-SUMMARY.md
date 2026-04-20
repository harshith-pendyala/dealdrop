---
phase: 04-product-tracking-dashboard
plan: "05"
subsystem: dashboard-ui
tags: [react, components, shadcn, accessibility, testing]
dependency_graph:
  requires: [04-01, 04-02, 04-04]
  provides: [EmptyState, SkeletonCard, ProductCard, InlineAddProductWrapper-stub, RemoveProductDialog-stub]
  affects: [04-06, 04-07]
tech_stack:
  added: []
  patterns:
    - next/image with wildcard remotePatterns for scraped product images
    - Intl.NumberFormat(undefined, currency) for locale-aware price formatting
    - 'use client' boundary via InlineAddProductWrapper wrapper pattern
    - strict !== null badge conditional (not truthy check)
    - Vitest alias array form for multi-root @/* tsconfig path resolution
key_files:
  created:
    - dealdrop/public/placeholder-product.svg
    - dealdrop/src/components/dashboard/SkeletonCard.tsx
    - dealdrop/src/components/dashboard/EmptyState.tsx
    - dealdrop/src/components/dashboard/EmptyState.test.tsx
    - dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx
    - dealdrop/src/components/dashboard/ProductCard.tsx
    - dealdrop/src/components/dashboard/ProductCard.test.tsx
    - dealdrop/src/components/dashboard/RemoveProductDialog.tsx
  modified:
    - dealdrop/vitest.config.ts
decisions:
  - "EmptyState renders InlineAddProductWrapper (stub) not AddProductForm directly — B-NEW constraint prevents RSC from owning useActionState"
  - "InlineAddProductWrapper and RemoveProductDialog ship as stubs in Plan 05; Plan 06 overwrites both with real implementations"
  - "Vitest alias changed from object to array form to support @/components -> ./components (root-level shadcn) alongside @/* -> ./src"
  - "strict !== null check for last_scrape_failed_at badge (not truthy) per T-04-22 threat model"
metrics:
  duration_seconds: 1780
  completed_date: "2026-04-20"
  tasks_completed: 2
  files_created: 8
  files_modified: 1
---

# Phase 04 Plan 05: Wave 2 Presentation Components Summary

Dashboard presentation layer: EmptyState (zero-product surface with D-04 verbatim copy), SkeletonCard (accessible animate-pulse placeholder), ProductCard (Intl price format, rel=noopener, aria-expanded chart toggle, strict-null failed badge), plus InlineAddProductWrapper and RemoveProductDialog stubs for Plan 06 to overwrite.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add placeholder SVG + SkeletonCard + EmptyState + InlineAddProductWrapper stub | 89ede01 | placeholder-product.svg, SkeletonCard.tsx, EmptyState.tsx, EmptyState.test.tsx, InlineAddProductWrapper.tsx |
| 2 | Implement ProductCard (client) with tests + RemoveProductDialog stub | 4c0899a | ProductCard.tsx, ProductCard.test.tsx, RemoveProductDialog.tsx, vitest.config.ts |

## Verification Results

- `npx vitest run` — 76 tests pass (65 prior Wave 1 + 11 new: 4 EmptyState + 7 ProductCard)
- `npx tsc --noEmit` — 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmptyState test missing jest-dom import and DOM cleanup**
- **Found during:** Task 1
- **Issue:** Plan's test template omitted `import '@testing-library/jest-dom/vitest'` (needed for `toHaveTextContent`, `toHaveAttribute`) and `afterEach(cleanup)` (needed to prevent multiple-element errors across tests in the same file)
- **Fix:** Added `import '@testing-library/jest-dom/vitest'` and `afterEach(() => { cleanup() })` to EmptyState.test.tsx; same pattern applied proactively to ProductCard.test.tsx
- **Files modified:** dealdrop/src/components/dashboard/EmptyState.test.tsx, dealdrop/src/components/dashboard/ProductCard.test.tsx
- **Commit:** 4c0899a

**2. [Rule 3 - Blocking] Vitest @/components alias missing for root-level shadcn primitives**
- **Found during:** Task 2
- **Issue:** vitest.config.ts mapped `@` to `./src` only, but shadcn primitives live at `./components/ui/` (root-level, not under src/). `@/components/ui/card` resolved to `./src/components/ui/card` which doesn't exist — import resolution failure.
- **Fix:** Changed `resolve.alias` from object to array form; added `{ find: /^@\/components(.*)$/, replacement: './components$1' }` before the catch-all `@` alias to mirror the tsconfig `"@/*": ["./*", "./src/*"]` dual-root paths.
- **Files modified:** dealdrop/vitest.config.ts
- **Commit:** 4c0899a

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| InlineAddProductWrapper renders null | dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx | Plan 06 Task 1 overwrites with real useActionState + AddProductForm wiring |
| RemoveProductDialog renders null | dealdrop/src/components/dashboard/RemoveProductDialog.tsx | Plan 06 Task 2 overwrites with full AlertDialog implementation |

Both stubs are intentional per plan design — EmptyState and ProductCard type-check and render correctly with stubs present. Visual layout is preserved (heading, subtitle, hint text all visible; remove button absent until Plan 06).

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. All threat model items from plan applied:

| Threat ID | Mitigation Applied |
|-----------|-------------------|
| T-04-19 | `rel="noopener noreferrer"` on View Product anchor — test asserts DOM attribute |
| T-04-21 | try/catch wraps `new Intl.NumberFormat(...)` with `${code} ${amount.toFixed(2)}` fallback |
| T-04-22 | `product.last_scrape_failed_at !== null` strict check — test covers both null and non-null cases |
| T-04-36 | EmptyState imports InlineAddProductWrapper (not AddProductForm); acceptance criterion `grep -c "AddProductForm" EmptyState.tsx => 0` enforced |

## Self-Check: PASSED

- `dealdrop/public/placeholder-product.svg` — FOUND
- `dealdrop/src/components/dashboard/SkeletonCard.tsx` — FOUND
- `dealdrop/src/components/dashboard/EmptyState.tsx` — FOUND
- `dealdrop/src/components/dashboard/EmptyState.test.tsx` — FOUND
- `dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx` — FOUND
- `dealdrop/src/components/dashboard/ProductCard.tsx` — FOUND
- `dealdrop/src/components/dashboard/ProductCard.test.tsx` — FOUND
- `dealdrop/src/components/dashboard/RemoveProductDialog.tsx` — FOUND
- Commit 89ede01 — FOUND
- Commit 4c0899a — FOUND
- 76 tests pass, 0 TypeScript errors
