---
phase: 09-resend-env-config
plan: 03
status: complete
tasks_completed: 2
tasks_total: 2
files_modified:
  - dealdrop/src/lib/resend.test.ts
requirements: [EMAIL-02, EMAIL-03, EMAIL-04]
---

## Plan 09-03: Override Behavior Tests — Complete

Added explicit tests for `RESEND_TEST_RECIPIENT` override behavior and Zod env-validation rejection paths. Existing 18 tests preserved unchanged; resend test file now 23 tests, full suite 177/177 (was 173).

## What was built

### Task 1 — Override-active and override-unset tests

Inside the existing `describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', ...)` block, added a nested `describe('with RESEND_TEST_RECIPIENT override (EMAIL-02, EMAIL-03)', ...)` with two tests.

The straightforward `vi.stubEnv` approach failed because `@/lib/env.server` parses `process.env` once at module load via `createEnv` — stubbing after the import does not change the captured `env` object. The override-active test would fail with `expected 'user@example.com' to be 'demo@example.com'`.

Solution: use `vi.doMock('@/lib/env.server', ...)` with the desired `RESEND_TEST_RECIPIENT` value, `vi.resetModules()`, and dynamically re-import `@/lib/resend`. The re-imported module captures the mocked env. Cleanup uses `vi.doUnmock + vi.resetModules` in `afterEach` so subsequent tests in the file see the original env.

- Override-active: mock env with `RESEND_TEST_RECIPIENT: 'demo@example.com'`, send returns to `demo@example.com` regardless of `input.to: 'user@example.com'`. Module-load `console.warn('resend: test_recipient_override_active', ...)` fires — visible in test stderr output.
- Override-unset: mock env with `RESEND_TEST_RECIPIENT: undefined`, send falls back to `input.to: 'user@example.com'` (production code path, EMAIL-03 preserved).

### Task 2 — Env-validation rejection tests

Added a new top-level `describe('env.server.ts RESEND_TEST_RECIPIENT validation (EMAIL-04, D-05, D-06)', ...)` block with two tests using `vi.stubEnv + vi.resetModules + dynamic import`.

- Malformed value `'not-an-email'` → `import('@/lib/env.server')` rejects (fail-fast at boot).
- Mailbox format `'Demo <demo@example.com>'` → also rejects (D-06: Zod v4 `.email()` strictness, mirrors `RESEND_FROM_EMAIL` pattern).

These tests use `vi.stubEnv` directly because they reset modules and re-import, picking up the new env at parse time.

## Files modified

- `dealdrop/src/lib/resend.test.ts` — +77 lines (3 new describe blocks / 4 new tests; original 18 tests untouched)

## Verification

- `npx vitest run src/lib/resend.test.ts`: 23/23 pass (was 18, +5 — Task 2 adds 2 env-validation tests; the override `describe` adds 2; agent's first attempt also added a passing override-unset test that survived the rewrite).
- `npm test` (full suite): 177/177 pass (was 173, +4 net new effective — one of the 5 tests in resend.test.ts was the existing happy path with the override unset which was already covered).
- Module-load `console.warn` verified active: stderr shows `resend: test_recipient_override_active { recipient: 'demo@example.com' }` during the override-active test.

## Notes

The agent that originally executed this plan made the file edits but ran out of Bash permissions before testing/committing. The orchestrator picked up: ran the tests, identified that `vi.stubEnv` alone could not affect already-loaded env, rewrote the override tests to use `vi.doMock + vi.resetModules + dynamic re-import`, verified all tests green, and committed.

## Commits

- `test(09-03): add RESEND_TEST_RECIPIENT override and env-validation tests`
