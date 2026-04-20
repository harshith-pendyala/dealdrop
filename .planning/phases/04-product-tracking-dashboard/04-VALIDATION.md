---
phase: 4
slug: product-tracking-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `04-RESEARCH.md § Validation Architecture`. Planner must fill the Per-Task Verification Map once plans exist.

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

*Filled by planner once PLAN.md files exist. Every task must map to a row below or explicitly depend on a Wave 0 item.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD     | TBD  | TBD  | TRACK-01 | — | Empty state renders when RLS returns zero products | unit (component) | `npx vitest run src/components/dashboard/EmptyState.test.tsx` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | TRACK-02 | — | Form submits URL via Server Action (no separate POST) | unit (component) | `npx vitest run src/components/dashboard/AddProductForm.test.tsx` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | TRACK-06 | — | `addProduct` writes `products` + `price_history` atomically on success | unit (action) | `npx vitest run src/actions/products.test.ts -t "happy path"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | TRACK-07 | — | `addProduct` returns `duplicate_url` when PostgrestError code is `23505` | unit (action) | `npx vitest run src/actions/products.test.ts -t "duplicate"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | TRACK-08 | — | `addProduct` calls `revalidatePath('/')` on success | unit (spy) | `npx vitest run src/actions/products.test.ts -t "revalidate"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | TRACK-09 | — | Toast fires on action success + every failure reason | unit (component) | `npx vitest run src/components/dashboard/AddProductForm.test.tsx -t "toast"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-01 | — | Count renders above grid with correct pluralization | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "count"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-02 | — | Grid renders one `ProductCard` per product row | unit (component) | `npx vitest run src/components/dashboard/ProductGrid.test.tsx -t "grid"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-03 | — | Card formats price via `Intl.NumberFormat` using stored `currency` column | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "price format"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-04 | — | Show Chart toggle flips state + `aria-expanded` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "chart toggle"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-05 | — | View Product link uses `target="_blank" rel="noopener noreferrer"` | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "view link"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-06 | — | Remove opens Radix AlertDialog (focus-trapped) | unit (component) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "opens"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-07 | — | Confirm click invokes `removeProduct` action and fires success toast | unit (component + spy) | `npx vitest run src/components/dashboard/RemoveProductDialog.test.tsx -t "confirms"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | DASH-08 | — | "Tracking failed" badge renders iff `last_scrape_failed_at` is non-null | unit (component) | `npx vitest run src/components/dashboard/ProductCard.test.tsx -t "failed badge"` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | — (internal) | — | Toast map is exhaustive across `ScrapeFailureReason` ∪ `duplicate_url` | unit | `npx vitest run src/lib/firecrawl/toast-messages.test.ts` | ❌ W0 | ⬜ pending |
| TBD     | TBD  | TBD  | — (guard) | — | `toast-messages.ts` does NOT import `server-only` (client-safe) | lint | `grep -c "server-only" dealdrop/src/lib/firecrawl/toast-messages.ts` → `0` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add dev deps: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` (Vitest is already installed; jsdom env enabled per-file via `// @vitest-environment jsdom`).
- [ ] `dealdrop/src/__mocks__/supabase-server.ts` — shared configurable Supabase client mock (success / PostgrestError 23505 / generic DB error / unauthenticated).
- [ ] `dealdrop/src/actions/products.test.ts` — stubs for TRACK-02, TRACK-06, TRACK-07, TRACK-08, plus unauth + DB-error rollback + `removeProduct` happy / unauth.
- [ ] `dealdrop/src/components/dashboard/AddProductForm.test.tsx` — stubs for TRACK-02, TRACK-09, unauth→`openAuthModal` branch, `sessionStorage` auto-submit on remount.
- [ ] `dealdrop/src/components/dashboard/ProductCard.test.tsx` — stubs for DASH-03, DASH-04, DASH-05, DASH-08.
- [ ] `dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx` — stubs for DASH-06, DASH-07.
- [ ] `dealdrop/src/components/dashboard/ProductGrid.test.tsx` — stubs for DASH-01, DASH-02.
- [ ] `dealdrop/src/components/dashboard/EmptyState.test.tsx` — stub for TRACK-01 (copy matches CONTEXT.md D-04 verbatim).
- [ ] `dealdrop/src/lib/firecrawl/toast-messages.test.ts` — exhaustive reason-to-copy coverage.
- [ ] Mock `next/cache` (`revalidatePath`) and `@/lib/firecrawl/scrape-product` via `vi.mock` in action tests, reusing the Phase 3 Plan 03-03 `vi.stubEnv` + dynamic-import pattern.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end smoke: sign in → paste `https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html` → card appears with correct name/price/image → click Remove → confirm → card disappears and is gone after a reload | TRACK-02, TRACK-06, DASH-02, DASH-03, DASH-06, DASH-07 | Integration smoke hitting real Supabase + real Firecrawl is out of scope for unit tests | Run `cd dealdrop && npm run dev`, sign in with Google, perform the steps above, verify behavior matches expectations |
| `server-only` build-time guard: `scrapeProduct` cannot be imported from a `'use client'` module (Phase 3 Plan 03-04 regression) | — (architectural guard) | Build-level check, not a runtime test | Temporarily add `import { scrapeProduct } from '@/lib/firecrawl/scrape-product'` to a client module, run `cd dealdrop && npm run build`, assert build fails with a `server-only` error, revert |
| RLS cross-user isolation (A cannot SELECT B's products) | — (inherited from Phase 1 Plan 01-04 verification) | Phase 4 relies on the same policies already verified; re-verifying requires a second live account | Optional second account test in staging; otherwise trust the existing Phase 1 test and the `products_select_own` policy audit in Phase 2 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or an explicit Wave 0 dependency row
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers every ❌ row in the Per-Task Verification Map
- [ ] No watch-mode flags in the commands above (confirmed — all use `vitest run`)
- [ ] Feedback latency < ~25 seconds for the quick run
- [ ] `nyquist_compliant: true` set in frontmatter once the table is filled by the planner

**Approval:** pending
