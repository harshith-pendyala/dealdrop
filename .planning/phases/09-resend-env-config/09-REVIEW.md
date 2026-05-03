---
phase: 09-resend-env-config
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - dealdrop/src/lib/env.server.ts
  - dealdrop/src/lib/resend.ts
  - dealdrop/src/lib/resend.test.ts
  - dealdrop/.env.example
  - dealdrop/README.md
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: clean
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 5
**Status:** clean

## Summary

Phase 9 adds a `RESEND_TEST_RECIPIENT` optional env var that overrides the destination address in `resend.emails.send`, plus a one-time module-load `console.warn` for observability. The implementation is correct on every load-bearing dimension:

- The Zod schema (`z.string().email().optional()`) combined with `emptyStringAsUndefined: true` correctly produces `undefined` for unset/blank values, so the nullish-coalescing fallback `env.RESEND_TEST_RECIPIENT ?? input.to` has the right semantics: override wins iff a valid email was set; otherwise the user-of-record receives the alert.
- The override is narrowly scoped to the `to` field — subject, body, and product link still reference the original tracked product, matching the documented two-mode design.
- The module-load `console.warn` uses the structured-log payload form (not template-literal interpolation), preserving the T-6-04 / Phase-3 precedent against log injection. The recipient address it emits is operator-controlled (set in Vercel env by the deployer), not user PII or a secret — this is intentional observability per D-01, not a sensitive-data leak.
- Tests cover both override-set and override-unset paths via `vi.doMock` + `vi.resetModules` to defeat the module-load env capture, plus boot-time fail-fast validation for malformed override values (non-email and Zod-v4-rejecting mailbox format).
- `.env.example` and `README.md` document the new var, its two routing modes, and the cutover procedure.

No critical issues, no warnings. Four Info-level observations below — all are defensive-suggestion / cosmetic, none block ship.

## Info

### IN-01: Subject line interpolates raw `product.name` (header-injection consideration)

**File:** `dealdrop/src/lib/resend.ts:161`
**Issue:** `subject: \`Price drop: ${input.product.name} -${percentDrop}%\`` interpolates the scraped product name directly. Email subject lines are not HTML-rendered, so HTML escaping is not applicable, but unescaped CR/LF (`\r`/`\n`) characters in subjects can in theory enable SMTP header injection (additional headers, body smuggling). Risk in this codebase is low because (a) the Resend HTTP API sits between us and SMTP and almost certainly sanitizes header fields, and (b) Firecrawl-scraped product names rarely contain raw newlines. Still worth a pass.
**Fix:** Either rely on Resend's transport-layer sanitization (current behavior — acceptable) or strip control characters defensively before interpolation:
```ts
const safeSubjectName = input.product.name.replace(/[\r\n]+/g, ' ').slice(0, 200)
// ...
subject: `Price drop: ${safeSubjectName} -${percentDrop}%`,
```

### IN-02: `Intl.NumberFormat` output interpolated into HTML without escape

**File:** `dealdrop/src/lib/resend.ts:122,124`
**Issue:** `oldFormatted` / `newFormatted` come from `Intl.NumberFormat(...).format()` and are interpolated raw into the email HTML. `Intl.NumberFormat` output is, in practice, only digits, punctuation, currency symbols, and whitespace — none of which are HTML-special — so this is safe today. The fallback path (`${amount.toFixed(2)} ${code}`) is similarly safe because `code` is a 3-letter ISO 4217 string by the time it reaches the template. Belt-and-suspenders escaping would make this resilient to a future change that lets a less-trusted string flow into the template.
**Fix:** Optional defense-in-depth:
```ts
const oldFormatted = escapeHtml(formatCurrency(oldPrice, product.currency))
const newFormatted = escapeHtml(formatCurrency(newPrice, product.currency))
```

### IN-03: Module-load `console.warn` fires on every cold start in serverless

**File:** `dealdrop/src/lib/resend.ts:45-49`
**Issue:** The "test_recipient_override_active" warning fires once per module load. In Vercel's serverless model that means once per cold-start of any function importing `@/lib/resend`, which can be many times per day across instances. The signal-to-noise ratio in Vercel function logs may degrade once test-recipient mode has been active for a while. Not a bug — just a UX consideration for log scrolling.
**Fix:** Acceptable as-is for portfolio/demo bar. If log noise becomes an issue at v1.2 cutover, gate the warn behind `process.env.NODE_ENV !== 'production'` or behind a separate `RESEND_VERBOSE_LOGS` flag.

### IN-04: Override test does not assert that `console.warn` actually fired

**File:** `dealdrop/src/lib/resend.test.ts:247-268`
**Issue:** The override-active test verifies the SDK is called with the overridden `to` address, but does not spy on `console.warn` to confirm the observability beacon (Phase 9, D-01) actually fires when `RESEND_TEST_RECIPIENT` is set. If a future refactor accidentally drops or guards the warn, no test would fail. The current `errSpy` only spies on `console.error`. Adding a `warnSpy` and asserting it was called once with the `'resend: test_recipient_override_active'` literal would lock in the observability contract.
**Fix:**
```ts
it('logs test_recipient_override_active warning at module load when override is set', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.doMock('@/lib/env.server', () => ({ env: { /* ...with RESEND_TEST_RECIPIENT set */ } }))
  vi.resetModules()
  await import('@/lib/resend')
  expect(warnSpy).toHaveBeenCalledWith('resend: test_recipient_override_active', {
    recipient: 'demo@example.com',
  })
  warnSpy.mockRestore()
})
```

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
