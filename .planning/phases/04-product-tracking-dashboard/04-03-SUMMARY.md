---
status: complete
phase: 04-product-tracking-dashboard
plan: 03
wave: 0
type: tdd
completed_tasks: 2
total_tasks: 2
requirements: [TRACK-07, TRACK-09]
---

## Plan 04-03: Client-Safe Reason → Toast Copy Map

### Tasks Completed (TDD)

| # | Gate | Commit |
|---|------|--------|
| 1 | RED — failing test file for `toastMessageForReason` | `1a0629e` |
| 2 | GREEN — exhaustive switch implementation | `54ca4f3` |

### Key Files Created

- `dealdrop/src/lib/firecrawl/toast-messages.ts` — exhaustive map over `ToastableReason = ScrapeFailureReason | 'duplicate_url' | 'unauthenticated' | 'db_error'` with a `never` guard in the default branch
- `dealdrop/src/lib/firecrawl/toast-messages.test.ts` — 10 case assertions + 1 non-empty assertion (11 total)

### Verification

- `npx vitest run src/lib/firecrawl/toast-messages.test.ts` — 11/11 passing
- `npx tsc --noEmit` — clean
- `grep -c "server-only" dealdrop/src/lib/firecrawl/toast-messages.ts` → 0 (client-safe)
- `const _exhaustive: never = reason` default branch present — adding a new reason without updating the switch fails compilation

### Decisions

- Used straight apostrophes (U+0027) throughout to match test assertions exactly
- Used `\u2014` for the em-dash in `network_error` copy to match test file byte-for-byte
- Imported `ScrapeFailureReason` from `@/lib/firecrawl/types` (canonical per Phase 3 Plan 03-02) instead of `scrape-product.ts` which carries `import 'server-only'`

### Self-Check: PASSED

Closes Phase 3 D-03. Wave 2's `AddProductForm` can import `toastMessageForReason` with no server-only contamination.

### Deviations

- **Executor restart:** The original RED test was authored in a subagent but blocked on `git commit` by a permission denial. Test file salvaged and re-committed inline in the orchestrator. No content drift — byte-identical to the salvaged version.
