---
phase: 06-automated-monitoring-email-alerts
plan: 02
subsystem: email
tags: [resend, email, template, html, xss-escape, tdd, green-flip, email-02, email-03, email-06]

# Dependency graph
requires:
  - phase: 06-automated-monitoring-email-alerts
    plan: 01
    provides: "resend@6.12.2 dependency, RED-state skeleton at src/lib/resend.test.ts (17 it.todo + 1 probe), env-stub + vi.mock('resend') boilerplate"
  - phase: 03-firecrawl-integration
    provides: "discriminated-union { ok, reason } return pattern + structured console.error vocabulary (scrape-product.ts precedent)"
  - phase: 01-foundation-database
    plan: 04
    provides: "env.server.ts with RESEND_API_KEY + RESEND_FROM_EMAIL (z.email()) + CRON_SECRET (min 32 chars)"
provides:
  - "sendPriceDropAlert(input) public API — Promise<SendResult> never-throws contract"
  - "renderPriceDropEmailHtml — D-05/D-06/D-07 inline table template"
  - "escapeHtml, computePercentDrop, formatCurrency — pure unit-testable helpers"
  - "Resend error.name → coarse reason mapping (rate_limited | invalid_from | validation | unknown)"
  - "T-6-04 structured-log payload: console.error('resend: send_failed', { productUrl, errorName, errorMessage })"
  - "T-6-06 XSS-safe HTML interpolation (escape before interpolate on name/url/image_url)"
affects: [06-04-cron-orchestrator]

# Tech tracking
tech-stack:
  added: []  # resend@6.12.2 already installed by Plan 01
  patterns:
    - "Discriminated-union return { ok: true, messageId } | { ok: false, reason } — matches scrape-product.ts canonical shape"
    - "Extract<SendResult, { ok: false }>['reason'] type helper for error-name → reason mapping (avoids conditional-type distribution-over-union producing `never`)"
    - "Module-scope SDK singleton: `const resend = new Resend(env.RESEND_API_KEY)` — mirrors FIRECRAWL_URL constant pattern"

key-files:
  created:
    - "dealdrop/src/lib/resend.ts"
  modified:
    - "dealdrop/src/lib/resend.test.ts"

key-decisions:
  - "Used Extract<SendResult, { ok: false }>['reason'] helper instead of the plan's SendResult extends { reason: infer R } ? R : never because conditional types distribute over unions — the plan's version evaluated to `never` under tsc strict. Extract<> produces the correct 4-union reason type."
  - "Env stub RESEND_FROM_EMAIL uses bare 'alerts@example.com' (not the plan's 'DealDrop <alerts@example.com>' mailbox format) because Zod v4 z.email() rejects mailbox syntax. Production can still use the full mailbox format via Resend's own `from` parameter; env.server.ts validation is narrower than Resend's wire format."
  - "Placed explanatory comment AFTER `import 'server-only'` on line 1 (vs the plan's line-1-is-the-import-with-no-preceding-lines). Line 1 is still the import; this matches admin.ts and env.server.ts precedent — comments span lines 2-10 with plain block syntax."

requirements-completed: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-05, EMAIL-06]

# Metrics
duration: ~12min
completed: 2026-04-21
---

# Phase 6 Plan 2: resend-implementation Summary

**Shipped `sendPriceDropAlert` — the single server-only function that renders the price-drop HTML email and hands it to Resend's SDK — with 19 GREEN tests covering happy path + every error-name branch + T-6-04 structured-log + T-6-06 HTML-escape contract.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-21T20:30:00Z
- **Completed:** 2026-04-21T20:42:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 flipped RED → GREEN)

## Accomplishments

- `dealdrop/src/lib/resend.ts` shipped at **178 lines** with full HTML template, SDK wrapper, 4 exported helpers + 2 exported types
- `dealdrop/src/lib/resend.test.ts` flipped from 17 it.todo + 1 probe → **19 GREEN tests** across 5 describes (0 todos remain, 0 probes remain)
- Resend SDK contract verified via mock: `emails.send` returns `{ data: { id: string }, error: null }` on success; `{ data: null, error: { name, message, status? } }` on API errors; never throws for documented failures
- EMAIL-01 + EMAIL-02 + EMAIL-03 + EMAIL-05 + EMAIL-06 all mitigated in code
- T-6-04 (log injection) mitigated: all `console.error` calls use structured object payload; grep-clean for backtick-in-same-line-as-console.error
- T-6-06 (HTML injection) mitigated: `escapeHtml` applied to `product.name`, `product.url`, `product.image_url` before interpolation; unit test asserts `<script>alert("x")</script>` renders as `&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;`
- Build green: `npm run build` exits 0
- Zero regressions on Phase 1-5 tests: 127/127 tests pass in 14 test files (excluding Wave 2 RED-state skeletons for Plans 04/05 which remain RED by design)

## Task Commits

Each task was committed atomically with `--no-verify` (parallel worktree mode):

1. **Task 1: Implement lib/resend.ts — HTML template + Resend SDK wrapper** — `15ea6b2` (feat)
2. **Task 2: Flip resend.test.ts from RED to GREEN** — `213b6b7` (test)

## Final resend.ts line count

`178 lines` (plan minimum: 120 — exceeded)

## Vitest output for resend.test.ts

```
✓ src/lib/resend.test.ts > escapeHtml > escapes < > & " ' correctly 0ms
✓ src/lib/resend.test.ts > computePercentDrop > rounds to whole integer via Math.round 0ms
✓ src/lib/resend.test.ts > formatCurrency > formats known ISO 4217 codes via Intl.NumberFormat 7ms
✓ src/lib/resend.test.ts > formatCurrency > falls back to "N.NN CODE" when Intl rejects the code 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > contains the image tag when image_url is present 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > omits the image tag when image_url is null 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > escapes HTML special chars in product.name (T-6-06) 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > renders the CTA link with href=product.url, target=_blank, rel=noopener noreferrer 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > renders old price with strikethrough and formatted new price prominently 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > renders the percent-drop hero with − (minus) prefix 0ms
✓ src/lib/resend.test.ts > renderPriceDropEmailHtml > falls back to "N.NN CODE" format when currency code is invalid 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > calls resend.emails.send with { from, to, subject, html } on happy path 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > returns { ok: false, reason: "rate_limited" } on rate_limit_exceeded 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > returns { ok: false, reason: "rate_limited" } on monthly_quota_exceeded 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > returns { ok: false, reason: "invalid_from" } on invalid_from_address 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > returns { ok: false, reason: "validation" } on validation_error 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > returns { ok: false, reason: "unknown" } on unrecognized error name 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > structured-logs on every failure branch (no template literals; T-6-04) 0ms
✓ src/lib/resend.test.ts > sendPriceDropAlert > never throws for API errors — always returns a SendResult 0ms

Test Files  1 passed (1)
     Tests  19 passed (19)
  Duration  ~230-280ms (transform 28ms, collect 18ms, tests 39ms)
```

## Resend SDK Type Surprises

- **`error.name` is wider than expected.** The SDK ships `error.name: string` (not a union of known error codes). Documented error names live in docs only — the type allows any string. Our switch-chain on known names (`rate_limit_exceeded`, `monthly_quota_exceeded`, `invalid_from_address`, `validation_error`) falls through to `'unknown'` for anything else, so unknown future error names remain safely handled.
- **`data!.id` non-null assertion required no adjustment.** SDK types `data` as `CreateEmailResponseSuccess | null` and `error` as `ErrorResponse | null`, but the types do NOT enforce the mutual exclusivity (you can't express "exactly one is non-null" in TS without a discriminated union on the SDK side). Our branch guard `if (error) return ...; return { ok: true, messageId: data!.id }` lets tsc accept the non-null assertion because we've already handled the `error != null` case. Runtime guarantee upheld by SDK contract.
- **Zod v4 `z.email()` rejects mailbox format.** `env.server.ts` Zod schema is `z.string().email()`, which matches RFC-5321 local-part + domain only — NOT `"Name <addr@domain>"`. Plan 01's env stub value `'DealDrop <alerts@example.com>'` would have blown up env validation at test import time. This is why the test env stub was changed to bare `'alerts@example.com'` (see Deviation 2 below). Production deployment can still use mailbox format by setting `RESEND_FROM_EMAIL=alerts@yourdomain.dev` (bare) and passing `from: \`DealDrop <\${env.RESEND_FROM_EMAIL}>\`` at send-time if desired — but current code just passes the env value verbatim, which Resend accepts as a bare address.

## Files Created/Modified

### Created

- **`dealdrop/src/lib/resend.ts`** (178 lines)
  - Line 1: `import 'server-only'` (T-6-01 bundle-time guard)
  - Line 12: `import { Resend } from 'resend'` (named, not default)
  - Line 13: `import { env } from '@/lib/env.server'`
  - Line 39: `const resend = new Resend(env.RESEND_API_KEY)` module-scope singleton
  - Exports: `PriceDropInput`, `SendResult`, `sendPriceDropAlert`, `renderPriceDropEmailHtml`, `computePercentDrop`, `formatCurrency`, `escapeHtml`

### Modified

- **`dealdrop/src/lib/resend.test.ts`** (+196 / -30 lines)
  - 0 `it.todo(` remain (was 17)
  - 0 import probes remain (was 1)
  - 19 real `it(...)` tests across 5 describes
  - Preserved Plan 01 env-stub `beforeAll` + `vi.mock('resend', ...)` + dynamic-import `beforeAll` + `errSpy` scaffolding
  - One env-stub value edited: `RESEND_FROM_EMAIL` from `'DealDrop <alerts@example.com>'` → `'alerts@example.com'` (see Deviation 2)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reinstalled worktree `node_modules` (resend + p-limit missing)**
- **Found during:** Task 1 (tsc verification)
- **Issue:** Worktree base commit `83dced0` post-dated Plan 01's npm install (commit `34c2627`), but the worktree's `node_modules` directory did NOT carry the `resend` package — plan-01's install was only reflected in `package.json` / `package-lock.json` entries, not in the worktree's node_modules tree (git worktrees share `.git` but NOT `node_modules`). Result: `tsc` errored with `Cannot find module 'resend'` and vitest would have crashed on dynamic import.
- **Fix:** Ran `npm install` once inside the worktree. Added 7 packages in 614ms (lockfile already up-to-date per Plan 01 commits; install was just syncing worktree node_modules).
- **Files modified:** Worktree-local `node_modules/` only — no git history changes, no package.json / lockfile writes.
- **Verification:** `npm ls resend` shows `6.12.2`; `tsc` no longer errors on the `import { Resend } from 'resend'` line.
- **Committed in:** None (intentional — environment fix, not code change, matches Plan 01 Deviation 3 pattern).

**2. [Rule 3 - Blocking] Env-stub `RESEND_FROM_EMAIL` value changed from mailbox format to bare address**
- **Found during:** Task 2 (first vitest run)
- **Issue:** Plan 01's test skeleton + Plan 02's verbatim test body both set `vi.stubEnv('RESEND_FROM_EMAIL', 'DealDrop <alerts@example.com>')`. But `env.server.ts` validates this field with `z.string().email()`, and Zod v4's `.email()` regex rejects the mailbox-format `"Name <addr@domain>"`. First test run failed with:
  ```
  Invalid environment variables: [{ path: ['RESEND_FROM_EMAIL'], message: 'Invalid email address', format: 'email' }]
  ```
  Both the env-stub value AND the happy-path assertion (`expect(sendArgs.from).toBe('DealDrop <alerts@example.com>')`) had to change.
- **Fix:** Changed env stub to bare `'alerts@example.com'` and updated the happy-path `from` assertion to match. Added an explanatory inline comment documenting the Zod mailbox-rejection.
- **Files modified:** `dealdrop/src/lib/resend.test.ts` (2 string literals changed, 1 comment added)
- **Verification:** All 19 tests pass; env validation no longer fires.
- **Committed in:** `213b6b7` (Task 2 commit).
- **Production impact:** None. Production can still ship `RESEND_FROM_EMAIL=alerts@yourdomain.dev` (bare) and let Resend infer sender name from the verified domain; or introduce a separate `RESEND_FROM_NAME` env var if Phase 7 wants display-name support. Plan 04 (cron orchestrator) should consult this deviation before asserting on `from` format.

**3. [Rule 1 - Bug] Reason type `SendResult extends { reason: infer R } ? R : never` produced `never` under tsc**
- **Found during:** Task 1 (tsc verification)
- **Issue:** The plan's verbatim action used `const reason: SendResult extends { reason: infer R } ? R : never = ...`. Under TypeScript strict, conditional types distribute over naked union type parameters — so `SendResult` (a union of `{ ok: true, messageId }` and `{ ok: false, reason: ... }`) was evaluated branch-by-branch. The `{ ok: true, messageId }` branch has no `reason` property → does NOT extend `{ reason: infer R }` → resolves to `never`. The union of `never | 'rate_limited' | 'invalid_from' | 'validation' | 'unknown'` simplifies to the reason union, but the declared type on the left-hand side (annotated as the same conditional expression) ALSO evaluated to `never` because of how `extends { reason: infer R }` unifies across the union context. tsc reported: `Type '"rate_limited" | "invalid_from" | "validation" | "unknown"' is not assignable to type 'never'`.
- **Fix:** Replaced the conditional type with the `Extract<>` utility type: `type SendFailureReason = Extract<SendResult, { ok: false }>['reason']`. `Extract` DOES distribute, but it narrows to the failure branch first and then indexes `.reason`, yielding the exact 4-member union.
- **Files modified:** `dealdrop/src/lib/resend.ts` line 164-165 (2 lines changed; behavior identical).
- **Verification:** `tsc --noEmit` exits 0 on resend.ts.
- **Committed in:** `15ea6b2` (Task 1 commit — applied before commit).

---

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking, 1 Rule 1 bug)
**Impact on plan:** Zero scope creep. All three auto-fixes address env-layer / type-system edge cases that block the plan's verification commands. No feature added, no library swapped, no architectural change. The Zod mailbox-format deviation (2) is the only one that materially changes plan text (an env-stub string); it does not change the production contract because `env.server.ts` validation rules are unchanged.

## Known Stubs

None. All exports are fully wired; the HTML template interpolates real data (not placeholder text), the SDK call is real, the error-name mapping covers all documented Resend error codes.

## Threat Flags

None. Plan 02's threat model (T-6-04, T-6-06, T-6-07, RESEND_API_KEY leak) is complete — no new security-relevant surface introduced.

## Issues Encountered

1. **Worktree node_modules out of sync with package.json.** First tsc run errored on `import { Resend } from 'resend'`. Resolved by running `npm install` inside the worktree. Flagged here so orchestrator-level worktree bootstrapping can pre-run `npm install` in future waves.
2. **Zod v4 email regex rejects mailbox format.** Plan 02's verbatim env stub value would have crashed env validation at test-load time. Resolved by using a bare address + documenting the deviation. Phase 7 may want to introduce `RESEND_FROM_DISPLAY_NAME` to recover the "DealDrop" branding in emails without relaxing the email regex.
3. **TypeScript conditional-type distribution pitfall.** The plan's verbatim reason-type declaration evaluated to `never` under strict tsc. Resolved with `Extract<>` utility type — same runtime behavior, correct type inference.

## Next Plan Readiness

- **Plan 03 (Wave 1 parallel — pg_cron setup):** independent of resend.ts, not gated by this plan.
- **Plan 04 (cron orchestrator):** ready. `sendPriceDropAlert` import path is `@/lib/resend`; type contract `PriceDropInput → Promise<SendResult>` is stable and grep-anchored in resend.test.ts. Plan 04 consumers should handle `{ ok: false, reason }` per EMAIL-06 (log and continue).
- **Plan 05 (route handler):** ready — uses Plan 04 outputs, no direct resend.ts consumption.

## Self-Check: PASSED

Verified files exist:
- `dealdrop/src/lib/resend.ts` — FOUND (178 lines)
- `dealdrop/src/lib/resend.test.ts` — FOUND (236 lines, 0 it.todo, 19 it())

Verified commits exist in git history:
- `15ea6b2` (feat(06-02): implement lib/resend.ts price-drop email module) — FOUND
- `213b6b7` (test(06-02): flip resend.test.ts from RED to GREEN) — FOUND

Verified contract-grep checks pass:
- Line 1 is `import 'server-only'` — PASS
- Named `import { Resend } from 'resend'` — PASS
- `from '@/lib/env.server'` — PASS
- No `process.env.` — PASS
- `new Resend(env.RESEND_API_KEY)` — PASS
- `console.error('resend: send_failed'` — PASS
- `target="_blank"` + `rel="noopener noreferrer"` — PASS
- `role="presentation"` — PASS
- `<s style=` strikethrough — PASS
- `&minus;${percentDrop}%` hero — PASS

Verified tests pass:
- `npx vitest run src/lib/resend.test.ts` → 19/19 GREEN
- Full test suite (excluding Plan 01 Wave 2 RED-state skeletons): 127/127 GREEN
- Pre-existing Wave 2 RED skeletons (cron/auth, cron/check-prices, route.test.ts) remain RED BY DESIGN per Plan 01 summary — not a regression

Verified build passes:
- `npm run build` exits 0

## TDD Gate Compliance

Both tasks had `tdd="true"`. Gate sequence:
- **RED:** Plan 01 commit `ec8fa2b` landed `resend.test.ts` with 17 `it.todo` + 1 import probe. `npx vitest run src/lib/resend.test.ts` at worktree HEAD (pre-Task-1) reported `Test Files 1 failed · Error: Cannot find module '@/lib/resend'`. RED verified.
- **GREEN:** Task 1 commit `15ea6b2` landed `resend.ts`. Task 2 commit `213b6b7` flipped the 17 todos into 19 real tests. `npx vitest run src/lib/resend.test.ts` now reports `Test Files 1 passed (1) · Tests 19 passed (19)`. GREEN verified.
- **REFACTOR:** Not needed. Implementation shipped verbatim from plan action (plus the 2 Extract<> / env-stub deviations documented above, which were applied pre-commit, not as a separate refactor pass).

---
*Phase: 06-automated-monitoring-email-alerts*
*Plan: 02*
*Completed: 2026-04-21*
