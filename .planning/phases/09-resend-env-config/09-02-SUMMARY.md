---
phase: 09-resend-env-config
plan: "02"
subsystem: email-override
tags: [email, resend, override, observability, env]
requirements: [EMAIL-01, EMAIL-02, EMAIL-03]

dependency_graph:
  requires:
    - "env.RESEND_TEST_RECIPIENT typed as string | undefined (Plan 09-01)"
  provides:
    - "sendPriceDropAlert with internal recipient override + module-load observability warn"
  affects:
    - dealdrop/src/lib/resend.ts

tech_stack:
  added: []
  patterns:
    - "Nullish coalesce override: env.RESEND_TEST_RECIPIENT ?? input.to — two operands, inline, no helper"
    - "Module-load observability: if(env.X) console.warn('module: event', { payload }) — fires once per boot"
    - "Structured log payload (object, not template literal) per T-6-04 log-injection mitigation"

key_files:
  created:
    - dealdrop/src/lib/resend.ts
    - dealdrop/src/lib/env.server.ts
  modified: []

decisions:
  - "Inline override expression chosen over helper function extraction — 1 call site, inline reads cleanly, no test-readability gain at this scale (Claude's Discretion §'Whether to also export a pure helper' — OPTIONAL, declined)"
  - "Module-load warn fires once per boot (not per sendPriceDropAlert call) — per-send warn explicitly forbidden by CONTEXT Claude's Discretion §'Override observability'"
  - "env.server.ts included in worktree as dependency from Plan 09-01 (wave 1 changes not yet merged to branch base)"

metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_modified: 2
  completed_date: "2026-05-02"
---

# Phase 09 Plan 02: resend.ts Override Expression + Module-Load Warn Summary

One-liner: Added `env.RESEND_TEST_RECIPIENT ?? input.to` override expression at the Resend SDK call site and a module-load `console.warn` for observability, preserving all v1.0 surfaces byte-identical.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add module-load console.warn for override observability | f4dad98 | dealdrop/src/lib/resend.ts |
| 2 | Apply override expression at resend.emails.send call site | f4dad98 | dealdrop/src/lib/resend.ts |

## Exact Changes Made

### Change 1 — Module-load observability warn (Task 1)

**Insert location:** Immediately after `const resend = new Resend(env.RESEND_API_KEY)` (line 39), before the pure-helpers section header.

**Line range before:** Line 39 was followed directly by the pure-helpers comment block (`// ---------------------------------------------------------------------------`).

**Line range after:** Lines 41-49 now contain the new observability block:

```typescript
// Visible-once observability for the test-recipient override (Phase 9, D-01).
// Fires at module load when env.RESEND_TEST_RECIPIENT is set; appears in Vercel
// function logs and the dev terminal. Structured-log payload — never template-literal
// interpolate (T-6-04 / Phase 3 scrape-product.ts:88 precedent).
if (env.RESEND_TEST_RECIPIENT) {
  console.warn('resend: test_recipient_override_active', {
    recipient: env.RESEND_TEST_RECIPIENT,
  })
}
```

### Change 2 — Override expression at SDK call site (Task 2)

**Location:** Inside `sendPriceDropAlert`, the `resend.emails.send` call `to:` field (line 160).

**Before:**
```typescript
    to: input.to,
```

**After:**
```typescript
    to: env.RESEND_TEST_RECIPIENT ?? input.to,
```

All other payload fields (`from`, `subject`, `html`) are byte-identical to v1.0. The error branch and defensive guard are unchanged.

## Unchanged Surfaces (v1.0 byte-identical)

- `PriceDropInput` type — `to: string` semantics preserved as "user-of-record's email" (D-03)
- `SendResult` discriminated union — no new fields, no new reason enum values
- `computePercentDrop`, `formatCurrency`, `escapeHtml`, `renderPriceDropEmailHtml` — pure helpers untouched (4 exports verified)
- `from: env.RESEND_FROM_EMAIL` — EMAIL-01 verified: from-address still env-sourced, no hardcoded literal
- `subject` template literal — unchanged
- Error branch (`if (error) { ... }`) — unchanged
- Defensive null guard (`if (!data || typeof data.id !== 'string')`) — unchanged
- `import 'server-only'` on line 1 — unchanged
- `const resend = new Resend(env.RESEND_API_KEY)` — unchanged

## Behavioral Guarantees

| Scenario | `env.RESEND_TEST_RECIPIENT` | `to` sent to SDK | console.warn fires |
|----------|----------------------------|------------------|--------------------|
| Production (override unset) | `undefined` | `input.to` (user-of-record) | No |
| Demo mode (override set) | `"demo@example.com"` | `"demo@example.com"` | Yes (once at boot) |

## Test Regression Status

The existing test suite in `src/lib/resend.test.ts` (19 tests per Plan 09-01 SUMMARY, 18 per Plan 09-02 spec) was written against v1.0 stubs that do NOT set `RESEND_TEST_RECIPIENT`. This means:
- In all existing tests, `env.RESEND_TEST_RECIPIENT` is `undefined`
- The `??` expression falls back to `input.to` — EMAIL-03 production code path preserved
- Zero test modifications required for regression-free execution
- New tests for the override branch (Plan 09-03) can assert `sendMock.mock.calls[0][0].to === 'demo@example.com'`

TypeScript compilation: The `env.RESEND_TEST_RECIPIENT` type is `string | undefined`. The expression `env.RESEND_TEST_RECIPIENT ?? input.to` where `input.to: string` narrows to `string` — TypeScript strict mode accepts this at the `to:` field position.

## Helper Extraction Decision (Claude's Discretion)

The plan's Claude's Discretion §"Whether to also export a pure helper" offered an OPTIONAL `resolveRecipient(userEmail: string): string` extraction. This was **declined** for the following reasons:

1. **1 call site** — there is exactly one invocation of the override logic (the `sendPriceDropAlert` function). A helper function at 1 call site adds indirection with no clarity benefit.
2. **Inline readability** — `env.RESEND_TEST_RECIPIENT ?? input.to` is a self-documenting 2-operand expression. Its intent (prefer override, fallback to user email) is immediately clear from operator precedence alone.
3. **Minimal diff** — keeping the change inline reduces the diff to a single line change, preserving the plan's stated goal of "two-line edit" scope.
4. **No test-readability gain** — the helper would simply re-expose the same logic in a wrapper. Plan 09-03 tests will assert on `sendMock.mock.calls[0][0].to` directly, which requires no helper.

## Lock-in for Plan 09-03

The override expression and warn block are now in place. Plan 09-03 tests can:
- Assert `sendMock.mock.calls[0][0].to === 'demo@example.com'` when `vi.stubEnv('RESEND_TEST_RECIPIENT', 'demo@example.com')` is set
- Assert `sendMock.mock.calls[0][0].to === input.to` when `RESEND_TEST_RECIPIENT` is unset (existing v1.0 happy-path stubs already cover this)
- Assert exactly one `console.warn` fires with `('resend: test_recipient_override_active', { recipient: 'demo@example.com' })` when the override is set

## Deviations from Plan

**1. [Rule 3 - Blocking] Added env.server.ts to worktree**

- **Found during:** Task 1 setup — worktree branch `worktree-agent-a29e6777` is based on `dde2648` (initial commit) which does not include Plan 09-01's `env.server.ts` changes (commit `809a59f` is on a different branch)
- **Issue:** `resend.ts` imports `env.RESEND_TEST_RECIPIENT` from `@/lib/env.server`. Without `env.server.ts` in this worktree, the import would fail and TypeScript would error.
- **Fix:** Created `src/lib/env.server.ts` in this worktree with the same content as Plan 09-01 produced (including `RESEND_TEST_RECIPIENT: z.string().email().optional()`). This is an exact copy of the 09-01 artifact — no new decisions required.
- **Files modified:** `src/lib/env.server.ts` (created)
- **Commit:** f4dad98 (combined with resend.ts changes per single-file-creation pattern)

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The `console.warn` writes to operator-controlled logs only (Vercel dashboard, dev terminal). T-9-05 (operator email in logs, accepted), T-9-06 (log-injection mitigated via structured payload), T-9-07 (spoofing mitigated — both operands are server-trusted), T-9-08 (repudiation accepted by design for demo mode), T-9-09 (per-send log flood mitigated — warn fires once at module load) — all threats addressed per plan's threat model.

## Self-Check: PASSED

- `src/lib/resend.ts` exists in worktree — FOUND
- `src/lib/env.server.ts` exists in worktree — FOUND
- Task commit f4dad98 — FOUND (confirmed via `git rev-parse --short HEAD`)
- `grep -E "to: env\.RESEND_TEST_RECIPIENT \?\? input\.to," src/lib/resend.ts` — VERIFIED
- `grep -c "test_recipient_override_active" src/lib/resend.ts` returns 1 — VERIFIED
- `grep -n "const resend = new Resend" src/lib/resend.ts` returns line 39, `grep -n "console.warn" src/lib/resend.ts` returns line 46 (39 < 46, ordering correct) — VERIFIED
- `grep -c "^export function" src/lib/resend.ts` returns 4 — VERIFIED
- `grep "from: env.RESEND_FROM_EMAIL," src/lib/resend.ts` — VERIFIED (EMAIL-01)
- No template literal interpolation of RESEND_TEST_RECIPIENT — VERIFIED
- `to: input.to,` NOT present in file — VERIFIED
- File starts with `import 'server-only'` — VERIFIED
