---
phase: 08-brand-polish
plan: 05
subsystem: ui
tags: [brand, copy, rename, dashboard, cta, d-11]

# Dependency graph
requires:
  - phase: 08-brand-polish
    plan: 01
    provides: Brand token foundation; the renamed "+ Track Price" trigger picks up the new orange via Shadcn `<Button variant="default">` reading `bg-primary` from Plan 01's --primary token
provides:
  - AddProductDialog renders "+ Track Price" trigger and "Track a price" dialog title
  - AddProductForm renders "Track Price" submit button and fires toast.success('Now tracking') on { ok: true }
  - AddProductForm.test.tsx assertion + test name updated to match new toast copy
  - ProductGrid.test.tsx stub mock factory updated to "+ Track Price" for repo-wide consistency
  - Repo-wide invariant: zero remaining matches for "Add Product", "Add a product", or "Product added!" anywhere in dealdrop/src
affects: [08-06-brand-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-side rename committed BEFORE test-side rename so the failing assertion functions as a regression gate (TDD RED → GREEN by file boundary, not by test framework cycle)"
    - "Stub-factory copy parity: vi.mock factories that hard-code rendered text are kept in lockstep with the real component's text even when the test never asserts on the literal — keeps grep audits trustworthy"

key-files:
  created: []
  modified:
    - dealdrop/src/components/dashboard/AddProductDialog.tsx
    - dealdrop/src/components/dashboard/AddProductForm.tsx
    - dealdrop/src/components/dashboard/AddProductForm.test.tsx
    - dealdrop/src/components/dashboard/ProductGrid.test.tsx

key-decisions:
  - "Followed plan exactly — zero deviations. Toast copy chosen as 'Now tracking' (no product name interpolation) per plan rationale: dispatchToastForState's { ok: true } payload carries no name."
  - "Component file names AND backend identifiers preserved per D-11 explicit boundary — no Form/Dialog file rename, addProduct server action and /api/cron/check-prices route untouched."
  - "AddProductForm.test.tsx line 36 regex /Track/i still matches 'Track Price' — no change needed to the existing button-presence assertion."

patterns-established:
  - "D-11 copy-rename boundary: ship user-facing strings only, freeze identifiers (component files, exported function names, props, server actions, API routes, SQL columns)"
  - "Cross-file stub parity: when test stubs render the same literal text as the real component, update both even when the test never asserts on the text"

requirements-completed: [BRAND-04]

# Metrics
duration: 2min
completed: 2026-05-02
---

# Phase 08 Plan 05: Add Product → Track Price Copy Rename Summary

**Two-task surgical rename of every user-facing "Add Product" / "Add a product" / "Product added!" string in dealdrop/src to "Track Price" / "Track a price" / "Now tracking" (D-11), with test assertions updated in lockstep. Component files and backend identifiers explicitly preserved. Full vitest suite (173/173) green.**

## Performance

- **Duration:** ~2 min wall clock
- **Started:** 2026-05-02T14:29:55Z
- **Completed:** 2026-05-02T14:31:45Z
- **Tasks:** 2
- **Files created:** 0
- **Files modified:** 4

## Accomplishments

- BRAND-04 (CTA copy rename) shipped at all four affected source/test surfaces
- Repo-wide grep audits clean: zero matches for "Add Product", "Add a product", "Product added!" anywhere in dealdrop/src
- D-11 boundary respected: component file names (AddProductForm.tsx, AddProductDialog.tsx, InlineAddProductWrapper.tsx, EmptyState.tsx) and backend identifiers (addProduct server action, /api/cron/check-prices route, sendPriceDropAlert) all unchanged
- AUDIT-ONLY files (no edits required) confirmed unaffected: EmptyState.tsx, EmptyState.test.tsx, InlineAddProductWrapper.tsx, InlineAddProductWrapper.test.tsx
- Full vitest suite green: 173/173 tests pass across 21 test files
- Full Next.js build green (npm run build → "Compiled successfully in 2.5s")
- Lint clean on all four modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename source — AddProductDialog + AddProductForm copy swaps** — `7bb4345` (feat)
2. **Task 2: Update test assertions — AddProductForm.test.tsx + ProductGrid.test.tsx** — `159db88` (test)

## Files Modified — Exact Line-Level Diffs

### `dealdrop/src/components/dashboard/AddProductDialog.tsx` (commit 7bb4345)

Two literal swaps inside the JSX. Component identifier, props, hooks, and `'use client'` preserved.

| Line | Before | After |
|------|--------|-------|
| 24 | `<Button variant="default">+ Add Product</Button>` | `<Button variant="default">+ Track Price</Button>` |
| 28 | `<DialogTitle>Add a product</DialogTitle>` | `<DialogTitle>Track a price</DialogTitle>` |

### `dealdrop/src/components/dashboard/AddProductForm.tsx` (commit 7bb4345)

Three changes (JSDoc comment, toast call argument, JSX text content). All identifiers preserved (`dispatchToastForState`, `REASON_TO_TOAST`, `AddProductActionResult`, `AddProductForm`, `PENDING_KEY`).

| Line | Before | After |
|------|--------|-------|
| 38 (JSDoc) | ` *   - { ok: true }   → toast.success('Product added!')` | ` *   - { ok: true }   → toast.success('Now tracking')` |
| 44 (toast call) | `    toast.success('Product added!')` | `    toast.success('Now tracking')` |
| 132 (submit button label) | `          Track` | `          Track Price` |

### `dealdrop/src/components/dashboard/AddProductForm.test.tsx` (commit 159db88)

Two literal swaps inside the dispatchToastForState describe block. Imports, vi.mock setup, and other tests untouched.

| Line | Before | After |
|------|--------|-------|
| 93 (test name) | `it('toast: { ok: true } fires toast.success once with "Product added!"', () => {` | `it('toast: { ok: true } fires toast.success once with "Now tracking"', () => {` |
| 96 (assertion) | `expect(toastSuccess).toHaveBeenCalledWith('Product added!')` | `expect(toastSuccess).toHaveBeenCalledWith('Now tracking')` |

### `dealdrop/src/components/dashboard/ProductGrid.test.tsx` (commit 159db88)

One literal swap inside the AddProductDialog vi.mock factory.

| Line | Before | After |
|------|--------|-------|
| 18 (stub button text) | `      + Add Product` | `      + Track Price` |

## Audit-Only Files (NO edits made)

Per 08-PATTERNS.md these four files were verified to already match the post-rename contract or not contain the legacy literals at all. They were read and confirmed but not modified:

- `dealdrop/src/components/dashboard/EmptyState.tsx` — heading already says "Track your first product"
- `dealdrop/src/components/dashboard/EmptyState.test.tsx` — already asserts the post-rename copy
- `dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx` — no user-facing string literals
- `dealdrop/src/components/dashboard/InlineAddProductWrapper.test.tsx` — no 'Add Product' literal

## Verification Output

### Repo-wide grep audits (post-rename, all show zero matches)

```
$ cd dealdrop && grep -rn "Add Product" src
(zero matches)

$ cd dealdrop && grep -rn "Product added!" src
(zero matches)

$ cd dealdrop && grep -rn "Add a product" src
(zero matches)
```

### Full vitest suite (173/173 green)

```
$ cd dealdrop && npm run test
 ✓ app/error.test.tsx (4 tests) 172ms
 ✓ src/components/dashboard/AddProductForm.test.tsx (10 tests) 198ms
 ✓ src/lib/resend.test.ts (19 tests) 77ms
 ✓ src/components/dashboard/ProductGrid.test.tsx (7 tests) 251ms
 ✓ src/actions/products.test.ts (14 tests) 36ms
 ✓ src/lib/firecrawl/scrape-product.test.ts (16 tests) 75ms
 ✓ src/components/dashboard/ProductCard.test.tsx (7 tests) 181ms
 ✓ src/components/dashboard/RemoveProductDialog.test.tsx (4 tests) 438ms
 ✓ app/api/cron/check-prices/route.test.ts (11 tests) 60ms
 ✓ src/lib/cron/check-prices.test.ts (13 tests) 56ms
 ✓ src/lib/products/get-user-products.test.ts (5 tests) 30ms
 ✓ src/lib/cron/auth.test.ts (6 tests) 8ms
 ✓ src/lib/firecrawl/schema.test.ts (12 tests) 8ms
 ✓ src/lib/firecrawl/toast-messages.test.ts (11 tests) 3ms
 ✓ src/lib/firecrawl/url.test.ts (12 tests) 3ms
 ✓ src/components/dashboard/InlineAddProductWrapper.test.tsx (2 tests) 14ms
 ✓ src/components/dashboard/PriceChart.test.tsx (5 tests) 38ms

 Test Files  21 passed (21)
      Tests  173 passed (173)
```

### Build (clean)

```
$ cd dealdrop && npm run build
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 2.5s
  Finished TypeScript in 1607ms
✓ Generating static pages using 7 workers (5/5) in 289ms
```

### Lint (clean on touched files)

```
$ npx eslint src/components/dashboard/AddProductDialog.tsx src/components/dashboard/AddProductForm.tsx src/components/dashboard/AddProductForm.test.tsx src/components/dashboard/ProductGrid.test.tsx
(no output → zero issues)
```

### D-11 boundary preservation (all confirmed)

```
$ test -f dealdrop/src/components/dashboard/AddProductForm.tsx       # PASS (component file not renamed)
$ test -f dealdrop/src/components/dashboard/AddProductDialog.tsx     # PASS
$ test -f dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx # PASS
$ test -f dealdrop/src/components/dashboard/EmptyState.tsx           # PASS

$ grep -c "addProduct" dealdrop/src/actions/products.ts              # 3 (server action preserved)
$ grep -rn "/api/cron/check-prices" dealdrop/src                     # references intact in cron auth + admin mock
```

### Identifier preservation (verified post-rename)

```
$ grep -c "function dispatchToastForState" dealdrop/src/components/dashboard/AddProductForm.tsx  # 1
$ grep -c "REASON_TO_TOAST" dealdrop/src/components/dashboard/AddProductForm.tsx                 # 3
$ grep -c "'use client'" dealdrop/src/components/dashboard/AddProductForm.tsx                    # 1
$ grep -c "'use client'" dealdrop/src/components/dashboard/AddProductDialog.tsx                  # 1
```

## D-11 Boundary Confirmation

Per the explicit D-11 boundaries documented in 08-CONTEXT.md and reaffirmed in this plan's frontmatter:

- **Component file names UNCHANGED:** AddProductForm.tsx, AddProductDialog.tsx, InlineAddProductWrapper.tsx, EmptyState.tsx all preserved at their original paths.
- **Server action UNCHANGED:** `addProduct` is still the export in `dealdrop/src/actions/products.ts` (3 references remain).
- **API route UNCHANGED:** `/api/cron/check-prices` references intact in `src/lib/cron/auth.ts` (CRON-02 doc comment) and the supabase-admin mock.
- **Email server action UNCHANGED:** `sendPriceDropAlert` (Phase 6) untouched — outside this plan's scope.
- **SQL identifiers UNCHANGED:** `products` table, all columns (Plan 5 only touches TSX files).
- **Internal variable/function/prop names UNCHANGED:** `AddProductFormProps`, `dispatchToastForState`, `REASON_TO_TOAST`, `AddProductActionResult`, `PENDING_KEY` all preserved.

## Note for BRAND-05 Visual Walk

The renamed CTAs render at three primary surfaces, all of which should read correctly during the Phase 08 Plan 06 verification walk:

1. **Logged-out hero** — InlineAddProductWrapper renders the form (no `+ Add Product` button on this surface; the wrapper has no user-facing strings, so this surface displays "Track Price" on the submit button only).
2. **Dashboard empty state** — EmptyState heading already reads "Track your first product" (audit-only, no rename needed); user paths over to the AddProductDialog trigger which now reads "+ Track Price".
3. **Dashboard with products** — ProductGrid header shows the AddProductDialog trigger button as "+ Track Price"; opening the dialog shows title "Track a price" and submit button "Track Price"; successful add fires toast "Now tracking".

The Plan 01 brand token cascade means the "+ Track Price" trigger button automatically picks up the new orange via `<Button variant="default">` reading `bg-primary` — no separate visual styling work needed in this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- **Files modified exist:**
  - `dealdrop/src/components/dashboard/AddProductDialog.tsx` — FOUND
  - `dealdrop/src/components/dashboard/AddProductForm.tsx` — FOUND
  - `dealdrop/src/components/dashboard/AddProductForm.test.tsx` — FOUND
  - `dealdrop/src/components/dashboard/ProductGrid.test.tsx` — FOUND
- **Commits exist:**
  - `7bb4345` — FOUND in `git log --oneline`
  - `159db88` — FOUND in `git log --oneline`
- **Repo-wide audits:** zero matches confirmed for all three legacy strings.
- **Test suite:** 173/173 green.
- **Build:** clean.
- **D-11 boundaries:** all preserved.
