---
phase: 04-product-tracking-dashboard
plan: "04"
subsystem: server-actions
tags: [server-actions, supabase, tdd, rls, audit-log, server-only]
dependency_graph:
  requires: [04-01, 04-02, 04-03]
  provides: [addProduct, removeProduct, getUserProducts, AddProductResult, Product]
  affects: [Wave-2 dashboard UI components, DashboardShell]
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN cycle for server actions"
    - "'use server' + import 'server-only' double guard (W1)"
    - "I-NEW-1 audit console.log before revalidatePath on removeProduct success"
    - "best-effort two-table rollback (Pitfall 7)"
    - "explicit currency_code -> currency column rename (Pitfall 1)"
    - "W5 permanent type-level probe via tsc --noEmit"
key_files:
  created:
    - dealdrop/src/actions/products.ts
    - dealdrop/src/actions/products.test.ts
    - dealdrop/src/lib/products/get-user-products.ts
    - dealdrop/src/__probes__/product-type.probe.ts
  modified: []
decisions:
  - "I-NEW-1: removeProduct emits console.log({ action, productId, userId }) before revalidatePath on success only — no audit table at portfolio bar, structured log line captured by Vercel runtime"
  - "W1: products.ts uses 'use server' on line 1 AND import 'server-only' on line 2 for double-guard; get-user-products.ts uses import 'server-only' on line 1"
  - "W5: product-type probe file at src/__probes__/product-type.probe.ts permanently guards Product.last_scrape_failed_at via tsc --noEmit"
  - "TDD: currency-rename assertion inspects insert mock call args through the from() builder chain rather than from.mock.results directly"
metrics:
  duration: "~15 min"
  completed_date: "2026-04-20"
  tasks: 3
  files: 4
---

# Phase 4 Plan 04: Server Actions + DAL Helper Summary

**One-liner:** Server Actions `addProduct`/`removeProduct` with auth re-check, currency rename, rollback, and I-NEW-1 structured audit log; plus RLS-scoped `getUserProducts` DAL helper, all guarded by `import 'server-only'`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Write addProduct + removeProduct action tests | 46b6b26 | dealdrop/src/actions/products.test.ts |
| 2 (GREEN) | Implement addProduct + removeProduct Server Actions | cb8e541 | dealdrop/src/actions/products.ts, dealdrop/src/actions/products.test.ts |
| 3 | getUserProducts DAL helper + product-type probe | bca4996 | dealdrop/src/lib/products/get-user-products.ts, dealdrop/src/__probes__/product-type.probe.ts |

## What Was Built

### `dealdrop/src/actions/products.ts`

Two `'use server'` Server Actions with double bundle guard:

- **`addProduct(_prevState, formData)`** — validates auth, scrapes via Phase 3 `scrapeProduct`, inserts `products` row with explicit `currency: result.data.currency_code` rename, inserts `price_history` row, calls `revalidatePath('/')` on success. Best-effort rollback deletes the `products` row if `price_history` insert fails.
- **`removeProduct(productId)`** — validates auth, deletes product (RLS + cascade handles `price_history`), emits `console.log({ action: 'removeProduct', productId, userId })` audit line BEFORE `revalidatePath('/')`.
- **`AddProductResult`** type union exported for `useActionState` consumption.

Key constraints enforced:
- Line 1: `'use server'`; Line 2: `import 'server-only'` (W1 double guard)
- `getUser()` called in both actions (never `getSession()`)
- `user_id` always from `supabase.auth.getUser()`, never from `FormData`
- No `redirect()` calls — structured returns for `useActionState`
- `ScrapeFailureReason` imported from `@/lib/firecrawl/types` (not `scrape-product`)

### `dealdrop/src/actions/products.test.ts`

14 test cases (TDD RED then GREEN):

- **8 addProduct tests:** happy path + currency rename, unauthenticated, scrape failure (no DB writes), duplicate_url (23505), generic db_error, price_history rollback, explicit currency mapping assertion, revalidatePath spy
- **6 removeProduct tests:** happy path, unauthenticated, DB error, + 3 I-NEW-1 audit tests (success emits, unauth does not, db-error does not)

All 14 pass. `vitest run -t "audit"` matches 3 audit cases.

### `dealdrop/src/lib/products/get-user-products.ts`

RLS-scoped DAL helper:
- Line 1: `import 'server-only'` (W1 bundle guard for DAL)
- `Product` type re-exported as `Tables<'products'>`
- `getUserProducts()`: `SELECT *` ordered `created_at desc`, fails-open to `[]`
- No manual `.eq('user_id', ...)` — RLS policy `products_select_own` is the source of truth

### `dealdrop/src/__probes__/product-type.probe.ts`

Permanent W5 type regression guard: `void p.last_scrape_failed_at` causes `tsc --noEmit` to fail if the column is ever removed from `Tables<'products'>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Currency-rename assertion used `from.mock.results` which captured builder objects, not insert args**
- **Found during:** Task 2 GREEN phase — first test run showed `expected '...' to contain '"currency":"GBP"'` because `mock.results` on `from` contains the builder return values, not the insert payloads
- **Fix:** Changed assertion to traverse `from.mock.calls.flatMap(...)` and access `builder.insert.mock.calls` to get the actual insert arguments
- **Files modified:** dealdrop/src/actions/products.test.ts
- **Commit:** cb8e541

**2. [Rule 2 - Missing test coverage] Added 14th dedicated currency-mapping test**
- **Found during:** Task 2 — test count was 13 (happy path combined currency + revalidatePath assertions); plan acceptance criterion requires `>= 14`
- **Fix:** Added a separate `'currency mapping (Pitfall 1)'` test case with EUR currency to explicitly assert the rename separately from the happy path
- **Files modified:** dealdrop/src/actions/products.test.ts
- **Commit:** cb8e541

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced beyond what the plan's `<threat_model>` already covers. All T-04-11 through T-04-18 mitigations are implemented as specified.

## Known Stubs

None. `getUserProducts` returns live Supabase data. Server Actions perform real DB writes.

## Self-Check

- `dealdrop/src/actions/products.ts` — FOUND
- `dealdrop/src/actions/products.test.ts` — FOUND
- `dealdrop/src/lib/products/get-user-products.ts` — FOUND
- `dealdrop/src/__probes__/product-type.probe.ts` — FOUND
- Commit 46b6b26 (RED tests) — FOUND
- Commit cb8e541 (GREEN implementation) — FOUND
- Commit bca4996 (DAL + probe) — FOUND
- `npx vitest run src/actions/products.test.ts` — 14 passed
- `npx vitest run src/actions/products.test.ts -t "audit"` — 3 passed
- `npx tsc --noEmit` — 0 errors

## Self-Check: PASSED
