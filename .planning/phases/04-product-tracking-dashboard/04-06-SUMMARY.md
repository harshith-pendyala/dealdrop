---
phase: 04-product-tracking-dashboard
plan: "06"
subsystem: dashboard-interactions
tags: [react19, use-action-state, client-components, toast, session-storage, alert-dialog, tdd]
dependency_graph:
  requires: [04-01, 04-03, 04-04, 04-05]
  provides: [AddProductForm, AddProductDialog, InlineAddProductWrapper, RemoveProductDialog, dispatchToastForState, REASON_TO_TOAST]
  affects: [EmptyState (Plan 05), ProductGrid (Plan 07), DashboardShell]
tech_stack:
  added: []
  patterns:
    - "B1 fix: AddProductForm is a pure renderer — useActionState lives in callers (AddProductDialog, InlineAddProductWrapper, ProductGrid)"
    - "B2 fix: dispatchToastForState extracted as pure testable helper; REASON_TO_TOAST delegates to Plan 03 toastMessageForReason"
    - "B-NEW fix: InlineAddProductWrapper owns useActionState(addProduct) as empty-state client boundary replacing Plan 05 stub"
    - "D-03: sessionStorage['dealdrop:pending-add-url'] stash on unauth submit, auto-submit via requestSubmit on mount when authed"
    - "vi.hoisted() for mock variables referenced inside vi.mock() factories (vitest hoist TDZ fix)"
    - "afterEach(cleanup) for DOM isolation in jsdom test files"
    - "vitest.config.ts alias narrowed: @/components/ui/* -> ./components/ui/* only; @/components/auth/* and @/components/dashboard/* resolve via catch-all @->./src"
key_files:
  created:
    - dealdrop/src/components/dashboard/AddProductForm.tsx
    - dealdrop/src/components/dashboard/AddProductForm.test.tsx
    - dealdrop/src/components/dashboard/AddProductDialog.tsx
    - dealdrop/src/components/dashboard/InlineAddProductWrapper.test.tsx
    - dealdrop/src/components/dashboard/RemoveProductDialog.test.tsx
  modified:
    - dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx (Plan 05 stub overwritten with real impl)
    - dealdrop/src/components/dashboard/RemoveProductDialog.tsx (Plan 05 stub overwritten with real impl)
    - dealdrop/vitest.config.ts (alias fix for src vs Shadcn components)
decisions:
  - "B1: AddProductForm is stateless — callers own useActionState. Aligns with React 19 form action pattern."
  - "B2: dispatchToastForState extracted to pure helper for direct unit testing without driving form state."
  - "B-NEW: InlineAddProductWrapper (not EmptyState) owns useActionState — RSCs cannot call hooks."
  - "No useOptimistic in InlineAddProductWrapper — empty-state has no grid to insert into; revalidatePath replaces EmptyState with ProductGrid on success."
  - "afterEach(cleanup) required in all jsdom test files — vitest does not auto-cleanup between tests in the same file."
  - "vi.hoisted() required when mock factory references module-level variables — avoids hoist TDZ errors."
  - "vitest @/components alias narrowed to /ui/* only — @/components/auth/* must resolve through src not Shadcn root."
metrics:
  duration: "~32 minutes"
  completed: "2026-04-20T12:09:38Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
  tests_added: 16
  tests_total: 92
---

# Phase 04 Plan 06: Wave 3 Interactive Components Summary

**One-liner:** Pure-renderer AddProductForm with extracted dispatchToastForState helper, useActionState-owning wrappers (AddProductDialog + InlineAddProductWrapper B-NEW), and AlertDialog RemoveProductDialog — 16 new tests, 92 total.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AddProductForm + dispatchToastForState + AddProductDialog + InlineAddProductWrapper (B-NEW) + tests | 61c146a | AddProductForm.tsx, AddProductForm.test.tsx, AddProductDialog.tsx, InlineAddProductWrapper.tsx (overwrite), InlineAddProductWrapper.test.tsx, vitest.config.ts |
| 2 | RemoveProductDialog (AlertDialog) overwriting Plan 05 stub + test | 5d1381f | RemoveProductDialog.tsx (overwrite), RemoveProductDialog.test.tsx |

## Verification

- `npx vitest run src/components/dashboard` — 27 tests pass (all Phase 4 dashboard components)
- `npx vitest run src/components/dashboard/AddProductForm.test.tsx -t "toast"` — 6 toast tests pass
- `npx vitest run` — 92 tests pass (76 Wave 1+2 baseline + 16 new)
- `npx tsc --noEmit` — 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest alias too broad — @/components/auth/* resolved to Shadcn root**
- **Found during:** Task 1 test run
- **Issue:** vitest.config.ts mapped `@/components(.*)` → `./components$1` (entire Shadcn root). This caused `@/components/auth/AuthModalProvider` to resolve to `./components/auth/AuthModalProvider` which does not exist — only `./components/ui/*` (Shadcn) lives there; auth/dashboard components live in `./src/components/`.
- **Fix:** Narrowed alias to `@/components/ui(.*)` → `./components/ui$1` only. The catch-all `@` → `./src` alias now handles `@/components/auth/*` and `@/components/dashboard/*` correctly.
- **Files modified:** `dealdrop/vitest.config.ts`
- **Commit:** 61c146a

**2. [Rule 1 - Bug] Missing afterEach(cleanup) — DOM accumulation between tests**
- **Found during:** Task 1 test run (AUTH-04/D-03 unauth submit test failed because first test's `authed=true` form was still in DOM)
- **Issue:** `fireEvent.submit` on the second test found the first test's `authed=true` form (no cleanup), so `handleSubmit` took the authed early-return path instead of the unauth stash path.
- **Fix:** Added `afterEach(cleanup)` to AddProductForm.test.tsx and InlineAddProductWrapper.test.tsx.
- **Files modified:** Both test files
- **Commit:** 61c146a

**3. [Rule 3 - Blocking] vi.hoisted() required for useActionState spy in InlineAddProductWrapper.test.tsx**
- **Found during:** Task 1 test run
- **Issue:** `vi.mock('react', ...)` factory is hoisted to the top of the file by vitest, but the `useActionStateSpy` variable was declared after it — ReferenceError: Cannot access before initialization.
- **Fix:** Wrapped spy declarations in `vi.hoisted()` so they are available before the hoisted mock factory executes.
- **Files modified:** `InlineAddProductWrapper.test.tsx`
- **Commit:** 61c146a

**4. [Minor] Plan acceptance criterion AddProductDialog useActionState count: expected 1, actual 2**
- **Found during:** Post-task criteria check
- **Issue:** `grep -c "useActionState" AddProductDialog.tsx` returns 2 (import line + call line), but plan spec says "=> 1". The intent — "dialog wrapper owns its own action state" — is fully satisfied by both lines.
- **Impact:** None — the contract is met. Both occurrences prove the wrapper correctly imports and uses the hook.

## Known Stubs

None — both Plan 05 stubs (InlineAddProductWrapper, RemoveProductDialog) are fully overwritten with real implementations.

## Threat Flags

None — all T-04-24 through T-04-30 and T-04-37 mitigations implemented as specified in the plan's threat model.

## Self-Check: PASSED

All created/modified files found on disk. Both task commits verified in git log:
- 61c146a — Task 1 (AddProductForm + helpers + wrappers + tests)
- 5d1381f — Task 2 (RemoveProductDialog + test)
