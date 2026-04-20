---
phase: 4
slug: product-tracking-dashboard
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md § Validation Architecture`. Task-ID columns filled in by the planner revision pass (post plan-checker feedback).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (verified in `dealdrop/package.json`) |
| **Config file** | `dealdrop/vitest.config.ts` (exists — `server-only` alias + `@` → `src`). Wave 0 adds `jsdom` env for component tests via per-file `// @vitest-environment jsdom`. |
| **Quick run command** | `cd dealdrop && npx vitest run src/actions src/lib/firecrawl/toast-messages src/lib/products src/components/dashboard` |
| **Full suite command** | `cd dealdrop && npx vitest run` |
| **Estimated runtime** | ~15–25 seconds (component + action unit suites, no real network) |

---

## Sampling Rate

- **After every task commit:** Run `cd dealdrop && npx vitest run src/actions src/lib/firecrawl/toast-messages src/lib/products src/components/dashboard`
- **After every plan wave:** Run `cd dealdrop && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green AND `cd dealdrop && npm run build` must succeed AND one manual end-to-end smoke (paste URL, add, remove)
- **Max feedback latency:** ~25 seconds for per-task quick run

---

## Per-Task Verification Map

*Task IDs use the pattern `{plan}-{task_index}` (e.g. `04-01-01` = Phase 4 / Plan 01 / Task 1). Plans were revised after the plan-checker pass — rows reflect the final task allocation.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-05-01 | 05 | 2 | TRACK-01 | — | Empty state renders when RLS returns zero products | unit (component) | `npx vitest run src/components/dashboard/EmptyState.test.tsx` | ✅ Plan 05 Task 1 | ⬜ pending |
| 04-06-01 | 06 | 3 | TRACK-02 | — | Form submits URL via Server Action (no separate POST) | unit (component) | `npx vitest run src/components/dashboard/AddProductForm.test.tsx` | ✅ Plan 06 Task 1 | ⬜ pending |
| 04-04-01 / 04-04-02 | 04 | 1 | TRACK-06 | T-04-11 / T-04-17 | `addProduct` writes `products` + `price_history` atomically on success | unit (action) | `npx vitest run src/actions/products.test.ts -t "happy path"` | ✅ Plan 04 Tasks 1+2 | ⬜ pending |
| 04-04-01 / 04-04-02 | 04 | 1 | TRACK-07 | T-04-13 | `addProduct` returns `duplicate_url` when PostgrestError code is `23505` | unit (action) | `npx vitest run src/actions/products.test.ts -t "duplicate"` | ✅ Plan 04 Tasks 1+2 | ⬜ pending |
| 04-04-01 / 04-04-02 | 04 | 1 | TRACK-08 | — | `addProduct` calls `revalidatePath('/')` on success | unit (spy) | `npx vitest run src/actions/products.test.ts -t "revalidate"` | ✅ Plan 04 Tasks 1+2 | ⬜ pending |
| 04-06-01 | 06 | 3 | TRACK-09 | — | `dispatchToastForState` fires toast.success on `{ok:true}` + toast.error with `REASON_TO_TOAST[reason]` on each failure reason (B2 fix — extracted pure helper, directly tested) | unit (pure helper) | `npx vitest run src/components/dashboard/AddProductForm.test.tsx -t "toast"` | ✅ Plan 06 Task 1 (6 toast: tests) | ⬜ pending |
| 04-07-01 | 07 | 4 | DASH-01 | — | Count renders above grid with correct pluralization (1→"product tracked", 0/2+→"products tracked") | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "count"` | ✅ Plan 07 Task 1 | ⬜ pending |
| 04-07-01 | 07 | 4 | DASH-02 | — | Grid renders one `ProductCard` per product row | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "grid"` | ✅ Plan 07 Task 1 | ⬜ pending |
| 04-05-02 | 05 | 2 | DASH-03 | — | Card formats price via `Intl.NumberFormat` using stored `currency` column | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "price"` | ✅ Plan 05 Task 2 | ⬜ pending |
| 04-05-02 | 05 | 2 | DASH-04 | — | Show Chart toggle flips state + `aria-expanded` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "Show Chart"` | ✅ Plan 05 Task 2 | ⬜ pending |
| 04-05-02 | 05 | 2 | DASH-05 | T-04-19 | View Product link uses `target="_blank" rel="noopener noreferrer"` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "View Product"` | ✅ Plan 05 Task 2 | ⬜ pending |
| 04-06-02 | 06 | 3 | DASH-06 | T-04-29 | Remove opens Radix AlertDialog (focus-trapped) | unit (component) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "DASH-06"` | ✅ Plan 06 Task 2 | ⬜ pending |
| 04-06-02 | 06 | 3 | DASH-07 | T-04-30 | Confirm click invokes `removeProduct` action and fires success toast | unit (component + spy) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "DASH-07"` | ✅ Plan 06 Task 2 | ⬜ pending |
| 04-05-02 | 05 | 2 | DASH-08 | T-04-22 | "Tracking failed" badge renders iff `last_scrape_failed_at` is non-null (strict null check) | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "failed badge"` | ✅ Plan 05 Task 2 | ⬜ pending |
| 04-03-01 / 04-03-02 | 03 | 0 | — (internal) | T-04-09 | Toast map is exhaustive across `ScrapeFailureReason` ∪ `duplicate_url` ∪ `unauthenticated` ∪ `db_error` | unit | `npx vitest run src/lib/firecrawl/toast-messages.test.ts` | ✅ Plan 03 Tasks 1+2 | ⬜ pending |
| 04-03-02 | 03 | 0 | — (guard) | T-04-10 | `toast-messages.ts` does NOT import `server-only` (client-safe) | lint | `grep -c "server-only" dealdrop/src/lib/firecrawl/toast-messages.ts` → `0` | ✅ Plan 03 Task 2 | ⬜ pending |
| 04-07-01 | 07 | 4 | — (B1 fix) | T-04-32 | `useOptimistic` wired inside `useActionState` action — dispatching the wrapping action inserts a SkeletonCard within one render | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "B1: dispatching"` | ✅ Plan 07 Task 1 | ⬜ pending |
| 04-04-03 | 04 | 1 | — (W5 guard) | T-04-18 | `Product.last_scrape_failed_at` type exists (permanent probe file) | type-level | `cd dealdrop && npx tsc --noEmit` with `src/__probes__/product-type.probe.ts` present | ✅ Plan 04 Task 3 | ⬜ pending |
| 04-02-01 / 04-02-02 / 04-02-03 | 02 | 0 | DASH-08 (data source) | — | Migration `0004_add_last_scrape_failed_at.sql` applied; database.ts regen includes the column | CLI + tsc | `cd dealdrop && timeout 30 npx supabase db diff` + `grep -c last_scrape_failed_at dealdrop/src/types/database.ts` ≥ 3 | ✅ Plan 02 Tasks 1-3 | ⬜ pending |
| 04-07-03 | 07 | 4 | TRACK-02, TRACK-06, DASH-02, DASH-03, DASH-06, DASH-07 (end-to-end) | — | End-to-end smoke (human-verify checkpoint) | manual | 9-step protocol in Plan 07 Task 3 `<how-to-verify>` | ✅ Plan 07 Task 3 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist sampling note:** every listed row maps to a real task in the revised plan set. No 3-consecutive-tasks-without-automated-verify window exists — Plan 02 Task 1 (SQL authoring) is the only non-automated-test task in Wave 0 and is immediately followed by Plan 02 Task 2 (CLI diff) + Plan 02 Task 3 (tsc regen).

---

## Wave 0 Requirements

- [ ] Add dev deps: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` (Vitest is already installed; jsdom env enabled per-file via `// @vitest-environment jsdom`).
- [ ] `dealdrop/src/__mocks__/supabase-server.ts` — shared configurable Supabase client mock (success / PostgrestError 23505 / generic DB error / unauthenticated).
- [ ] `dealdrop/src/actions/products.test.ts` — stubs for TRACK-02, TRACK-06, TRACK-07, TRACK-08, plus unauth + DB-error rollback + `removeProduct` happy / unauth.
- [ ] `dealdrop/src/components/dashboard/AddProductForm.test.tsx` — stubs for TRACK-02, TRACK-09 (via the 6 `toast:` tests on the extracted `dispatchToastForState` helper, B2 fix), unauth→`openAuthModal` branch, `sessionStorage` auto-submit on remount.
- [ ] `dealdrop/src/components/dashboard/ProductCard.test.tsx` — stubs for DASH-03, DASH-04, DASH-05, DASH-08.
- [ ] `dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx` — stubs for DASH-06, DASH-07.
- [ ] `dealdrop/src/components/dashboard/ProductGrid.test.tsx` — stubs for DASH-01, DASH-02, plus the B1 fix test (dispatching the wrapping action inserts a SkeletonCard within one render).
- [ ] `dealdrop/src/components/dashboard/EmptyState.test.tsx` — stub for TRACK-01 (copy matches CONTEXT.md D-04 verbatim).
- [ ] `dealdrop/src/lib/firecrawl/toast-messages.test.ts` — exhaustive reason-to-copy coverage.
- [ ] `dealdrop/src/__probes__/product-type.probe.ts` — W5 fix: permanent type-level probe for `Product.last_scrape_failed_at`.
- [ ] Mock `next/cache` (`revalidatePath`) and `@/lib/firecrawl/scrape-product` via `vi.mock` in action tests, reusing the Phase 3 Plan 03-03 `vi.stubEnv` + dynamic-import pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end smoke: sign in → paste `https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html` → card appears with correct name/price/image → click Remove → confirm → card disappears and is gone after a reload | TRACK-02, TRACK-06, DASH-02, DASH-03, DASH-06, DASH-07 | Integration smoke hitting real Supabase + real Firecrawl is out of scope for unit tests | Run `cd dealdrop && npm run dev`, sign in with Google, perform the steps above, verify behavior matches expectations — and verify NO browser-console warning "optimistic state update occurred outside a transition boundary" (B1 regression guard) |
| `server-only` build-time guard: `scrapeProduct` cannot be imported from a `'use client'` module (Phase 3 Plan 03-04 regression) AND the W1 fix guarantees `products.ts` / `get-user-products.ts` have the same guard | — (architectural guard) | Build-level check, not a runtime test | Temporarily add `import { addProduct } from '@/actions/products'` or `import { getUserProducts } from '@/lib/products/get-user-products'` to a `'use client'` module, run `cd dealdrop && npm run build`, assert build fails with a `server-only` error, revert |
| RLS cross-user isolation (A cannot SELECT B's products) | — (inherited from Phase 1 Plan 01-04 verification) | Phase 4 relies on the same policies already verified; re-verifying requires a second live account | Optional second account test in staging; otherwise trust the existing Phase 1 test and the `products_select_own` policy audit in Phase 2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or an explicit Wave 0 dependency row
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers every ❌ row in the Per-Task Verification Map (all rows now ✅ — real task IDs filled in)
- [x] No watch-mode flags in the commands above (confirmed — all use `vitest run`)
- [x] Feedback latency < ~25 seconds for the quick run
- [x] `nyquist_compliant: true` set in frontmatter (every Per-Task row has a real task ID post plan-revision)
- [x] B1 fix has a dedicated test row (04-07-01 — "B1: dispatching the wrapping action inserts a SkeletonCard")
- [x] B2 fix has a dedicated test row (04-06-01 — `-t "toast"` matches 6 real tests against the extracted `dispatchToastForState` helper)
- [x] B3 fix has a precondition row in Plan 02 Task 2 read_first (SUPABASE_ACCESS_TOKEN) and a timeout-bounded verify
- [x] W1 fix acceptance criteria present in Plan 04 Tasks 2 & 3 (`import 'server-only'` grep)
- [x] W4 fix applied — migration filename `0004_add_last_scrape_failed_at.sql` aligns with RESEARCH.md + PATTERNS.md in all 8 occurrences in Plan 02
- [x] W5 fix applied — `src/__probes__/product-type.probe.ts` present as a permanent type-level regression guard

**Approval:** ready
