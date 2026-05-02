# Phase 9: Resend Env Config - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 9-resend-env-config
**Areas discussed:** Override layer placement

---

## Gray Area Selection

User selected 1 of 4 surfaced gray areas to deep-dive. The other three (RESEND_FROM_EMAIL strictness, override observability, EMAIL-05 docs surface) were left as Claude's Discretion with sensible defaults captured in CONTEXT.md.

| Gray area | Description | Selected for deep-dive |
|-----------|-------------|------------------------|
| Override layer placement | Where the test-recipient swap happens (resend.ts internal vs cron orchestrator vs new helper) | ✓ |
| RESEND_FROM_EMAIL strictness | Required vs optional-with-default | (Claude's Discretion) |
| Override observability | Silent / once at load / per-send warning | (Claude's Discretion) |
| EMAIL-05 docs surface | README / .env.example / dedicated docs file | (Claude's Discretion) |

---

## Override layer placement

### Q1: Where does the RESEND_TEST_RECIPIENT swap happen?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside sendPriceDropAlert | resend.ts reads env.RESEND_TEST_RECIPIENT and overrides `to` internally before the SDK call. Caller (cron) keeps passing user-of-record's email. Encapsulation: email module owns 'who actually receives this'. | ✓ |
| In the cron orchestrator | processOneProduct (cron/check-prices.ts) reads env and chooses what to pass as `to`. resend.ts stays oblivious. Visibility at call site; cost: orchestrator gets email-policy concerns. | |
| resolveRecipient() helper | New tiny module @/lib/email/resolve-recipient.ts. Both cron and any future caller use it. Testable in isolation. Cost: new file for a single decision. | |

**User's choice:** Inside sendPriceDropAlert (Recommended)
**Notes:** Drives D-01 + D-03. Caller stays unchanged from v1.0 — cleanest preservation of EMAIL-03 ("production code path delivers alerts to the user-of-record's email").

---

### Q2: Where does the override layer read the env var from?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct env.server import | Module imports env from @/lib/env.server and reads env.RESEND_TEST_RECIPIENT directly. Matches existing pattern in resend.ts. | ✓ |
| Injected as a parameter | Override is passed into sendPriceDropAlert as an explicit arg. Testable without env stubbing. Cost: every call site has to thread it through. | |

**User's choice:** Direct env.server import (Recommended)
**Notes:** Drives D-02. Tests stub via vi.stubEnv exactly as resend.test.ts already does for RESEND_API_KEY/RESEND_FROM_EMAIL.

---

### Q3: What does PriceDropInput.to mean after the refactor?

| Option | Description | Selected |
|--------|-------------|----------|
| Always user-of-record | Caller always passes user-of-record's email as `to`. Override (if set) swaps internally before resend.emails.send. Production code path stays literally unchanged when override is unset. | ✓ |
| Already-resolved recipient | Caller resolves recipient (override-or-user) and passes that as `to`. resend.ts stays naive. Couples the routing decision to the orchestrator. | |

**User's choice:** Always user-of-record (Recommended)
**Notes:** Drives D-03. PriceDropInput.to becomes a business-intent type (this user's alert) rather than a wire-level type (whatever lands in Resend's `to:`). Type contract stays stable across v1.1 → v1.2.

---

### Q4: Where do override-routing tests live?

| Option | Description | Selected |
|--------|-------------|----------|
| resend.test.ts | Add 2-3 tests to existing file: 'override unset → user-of-record', 'override set → routes to override', 'env validation rejects invalid override'. | ✓ |
| cron/check-prices.test.ts | Tests live with orchestrator integration tests. Cost: mixes email-policy with cron orchestration testing. | |
| New env.server.test.ts only | Only test env parsing; rely on manual verification. Lightest test surface. | |
| Both unit + integration | resend.test.ts owns swap behavior; cron/check-prices.test.ts gets one smoke test. Most coverage; most churn. | |

**User's choice:** resend.test.ts (Recommended)
**Notes:** Drives D-04. Re-uses existing vi.stubEnv + sendMock infrastructure. No new tests in cron/check-prices.test.ts because per D-01 the cron orchestrator does not change at all.

---

## Done check

| Question | Selected |
|----------|----------|
| Explore more gray areas (FROM_EMAIL strictness / observability / docs) | |
| I'm ready for context | ✓ |

**User's choice:** I'm ready for context (Recommended)
**Notes:** Three undiscussed gray areas captured in CONTEXT.md as Claude's Discretion with explicit recommended defaults: keep RESEND_FROM_EMAIL required, one console.warn at module load when override is active, README.md note + .env.example comments.

---

## Claude's Discretion

Per the user's "ready for context" choice, three surfaced gray areas were not deep-dived and are captured in 09-CONTEXT.md §"Claude's Discretion" with sensible defaults:

- **RESEND_FROM_EMAIL strictness** — Keep required (z.string().email()). No Zod default added. Operational reality already satisfies the "sensible default for local dev" framing in EMAIL-01.
- **Override observability** — One module-load `console.warn('resend: test_recipient_override_active', { recipient })` when env.RESEND_TEST_RECIPIENT is set. No per-send warnings.
- **Email subject/body adjustment** — None. The bytes Resend receives are identical regardless of recipient routing. Cleanest interpretation of EMAIL-03.
- **README copy length** — Short DealDrop intro + Environment configuration section + Email recipient modes subsection. Portfolio-bar tone.
- **.env.example comment style** — Match existing `# Phase 6 — email + cron` header pattern, or add a new `# Phase 9 — email recipient override` block. Either acceptable.
- **Test describe-block organization** — Recommended: nested `describe('with RESEND_TEST_RECIPIENT override (EMAIL-02, EMAIL-03)', ...)` inside the existing `describe('sendPriceDropAlert', ...)`.
- **Optional `resolveRecipient(userEmail)` helper extraction** — Planner's call. Inline `env.RESEND_TEST_RECIPIENT ?? input.to` is the entire decision either way.

## Deferred Ideas

None surfaced during discussion. Items captured in 09-CONTEXT.md §"Deferred Ideas" are extracted from prior phase context (`PROJECT.md` Future, `REQUIREMENTS.md` Out of Scope, Phase 8 deferred ideas) rather than from new user input in this discussion.
