# Phase 9: Resend Env Config - Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 5 in-scope (+ 1 optional helper)
**Analogs found:** 6 / 6

All in-scope files for Phase 9 are **modifications to existing files** rather than new files. The "analog" for each modified file is **its own current state** — Phase 9 is a small additive refactor that must preserve every existing pattern verbatim and only extend by the minimum needed for D-01..D-07. The one exception is the optional `lib/email/resolve-recipient.ts` helper (Claude's Discretion), where the analog is `dealdrop/src/lib/cron/auth.ts` (a tiny single-export server-only utility module).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `dealdrop/src/lib/env.server.ts` | config | build-time validation | self (current state) | exact (additive) |
| `dealdrop/src/lib/resend.ts` | service / email-sender | request-response (SDK call) | self (current state) | exact (single-expression edit + module-load warn) |
| `dealdrop/src/lib/resend.test.ts` | test | unit | self (current state, `describe('sendPriceDropAlert', ...)` block) | exact (extend block) |
| `dealdrop/.env.example` | config / docs | n/a | self (`# Phase 6 — email + cron` block) | exact (append a line) |
| `dealdrop/README.md` | docs | n/a | none in repo (scaffold copy); use PROJECT.md tone | no analog → write fresh |
| `dealdrop/src/lib/email/resolve-recipient.ts` *(optional)* | utility | pure-function | `dealdrop/src/lib/cron/auth.ts` | role-match (tiny single-export server-only helper) |

---

## Pattern Assignments

### `dealdrop/src/lib/env.server.ts` (config, build-time validation)

**Analog:** self — extend the Zod schema with exactly one new optional field; do not touch the existing five entries.

**Current full file** (`dealdrop/src/lib/env.server.ts:1-30`):

```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// This file carries the SERVER block of the t3-oss/env-nextjs schema. It is split from
// `./env.ts` (client-only) so the server env-var NAMES never reach the client bundle.
// Plan 03-04 proved that co-locating the server schema with the client schema leaked
// the literal string `FIRECRAWL_API_KEY` into `.next/static/**`. Keeping the names off
// the client bundle is the T-3-01 belt-and-suspenders mitigation.
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    CRON_SECRET: z.string().min(32), // enforce length to discourage weak secrets
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
```

**Schema-additivity pattern to follow** — copy the `RESEND_FROM_EMAIL: z.string().email()` shape verbatim, downgrade to `.optional()` per D-05:

```typescript
// In the `server` block (insert after line 19, alongside the other email validator):
RESEND_TEST_RECIPIENT: z.string().email().optional(),

// In the `runtimeEnv` block (insert after line 26):
RESEND_TEST_RECIPIENT: process.env.RESEND_TEST_RECIPIENT,
```

**Hard constraints (per CONTEXT.md `<canonical_refs>` "Existing Code Contracts"):**
- Do NOT touch the existing five fields' validators (D-05).
- Do NOT touch `emptyStringAsUndefined: true` (line 29) — Phase 9 relies on it to coerce `RESEND_TEST_RECIPIENT=` (empty value) to `undefined` so the `?? input.to` fallback fires.
- Do NOT touch `skipValidation` (line 28).
- Do NOT change `RESEND_FROM_EMAIL` from required → optional (Claude's Discretion §"FROM_EMAIL strictness" is explicit: "Phase 9 makes zero changes").
- The new field MUST appear in BOTH the `server` block AND the `runtimeEnv` block — that's the t3-env-nextjs contract; omitting either side fails at runtime.

---

### `dealdrop/src/lib/resend.ts` (service / email-sender, request-response)

**Analog:** self — single-expression change at the SDK call site + one module-load `console.warn`.

**Imports / module header** (`dealdrop/src/lib/resend.ts:1-13`) — already correct, no change:

```typescript
import 'server-only'
// ... (10 lines of comments)
import { Resend } from 'resend'
import { env } from '@/lib/env.server'
```

The `env` import already exists — Phase 9 reads `env.RESEND_TEST_RECIPIENT` from this same import (D-02). No new imports required.

**Module-scope SDK construction** (`dealdrop/src/lib/resend.ts:39`) — already correct, no change:

```typescript
const resend = new Resend(env.RESEND_API_KEY)
```

**NEW: module-load `console.warn` to add immediately after line 39** (per Claude's Discretion §"Override observability"):

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

**Justification for the `console.warn` shape** — copy this pattern from the existing structured-warn already in the codebase (`dealdrop/src/lib/cron/check-prices.ts:107-111`):

```typescript
console.warn('cron: currency_changed', {
  productId: product.id,
  oldCurrency: product.currency,
  scrapedCurrency: scraped.currency_code,
})
```

Note the `module: phase` prefix in the message string (`resend:` / `cron:` / `scrapeProduct:`) — every existing log line in `lib/` follows this convention. Do NOT use a template literal in the message string (e.g., do NOT write ``console.warn(`resend: override active for ${env.RESEND_TEST_RECIPIENT}`)`` — log-injection vector per T-6-04).

**Core change: the `to:` expression in `sendPriceDropAlert`** (`dealdrop/src/lib/resend.ts:140-153`):

Current (line 148-153):

```typescript
const { data, error } = await resend.emails.send({
  from: env.RESEND_FROM_EMAIL,
  to: input.to,
  subject: `Price drop: ${input.product.name} -${percentDrop}%`,
  html,
})
```

After Phase 9 (D-01, D-02 — the entire override expression is the `??`):

```typescript
const { data, error } = await resend.emails.send({
  from: env.RESEND_FROM_EMAIL,
  to: env.RESEND_TEST_RECIPIENT ?? input.to,
  subject: `Price drop: ${input.product.name} -${percentDrop}%`,
  html,
})
```

**Hard constraints (per CONTEXT.md `<canonical_refs>`):**
- Do NOT touch `renderPriceDropEmailHtml`, `computePercentDrop`, `formatCurrency`, `escapeHtml` (lines 45-134).
- Do NOT touch the `Resend` SDK construction (line 39).
- Do NOT touch the `from`, `subject`, or `html` fields in the `emails.send` payload.
- Do NOT touch the error-mapping / failure branch (lines 155-188) — `SendResult` shape stays exactly as is.
- Do NOT modify `PriceDropInput` type (lines 19-29). `to` semantics stay "user-of-record's email" (D-03).
- The override expression `env.RESEND_TEST_RECIPIENT ?? input.to` is the **entire** routing logic. No config object, no strategy pattern, no per-call options bag (per CONTEXT.md `<specifics>`: "Two operands, one nullish coalesce, done").
- Do NOT add a per-send `console.warn` (Claude's Discretion §"Override observability" forbids it — would clutter cron logs).

**Optional helper extraction** (Claude's Discretion §"Whether to also export a pure helper"):

If the planner picks the helper extraction, replace `env.RESEND_TEST_RECIPIENT ?? input.to` with `resolveRecipient(input.to)` and create the helper module — see the optional-file section below. Either inline OR helper-extracted is acceptable; planner's call.

---

### `dealdrop/src/lib/resend.test.ts` (test, unit)

**Analog:** self — the existing `describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', ...)` block at `dealdrop/src/lib/resend.test.ts:139-236`.

**Imports / setup pattern** (`dealdrop/src/lib/resend.test.ts:1-44`) — already complete, no changes required:

```typescript
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'alerts@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })

const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}))

type ResendMod = typeof import('@/lib/resend')
let mod: ResendMod
beforeAll(async () => {
  mod = await import('@/lib/resend')
})

let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  sendMock.mockReset()
})
afterEach(() => { errSpy.mockRestore() })
```

**Existing happy-path test to copy as the override-test template** (`dealdrop/src/lib/resend.test.ts:152-164`):

```typescript
it('calls resend.emails.send with { from, to, subject, html } on happy path', async () => {
  sendMock.mockResolvedValueOnce({ data: { id: 'msg_123' }, error: null })
  const res = await mod.sendPriceDropAlert(baseInput)
  expect(res).toEqual({ ok: true, messageId: 'msg_123' })
  expect(sendMock).toHaveBeenCalledTimes(1)
  const sendArgs = sendMock.mock.calls[0][0]
  // Must match the env stub above (bare address; env.server.ts z.email()).
  expect(sendArgs.from).toBe('alerts@example.com')
  expect(sendArgs.to).toBe('user@example.com')
  expect(sendArgs.subject).toBe('Price drop: Cool Headphones -18%')
  expect(typeof sendArgs.html).toBe('string')
  expect(sendArgs.html.length).toBeGreaterThan(100)
})
```

**Pattern to copy:**
- Stub the SDK return with `sendMock.mockResolvedValueOnce({ data: { id: ... }, error: null })`.
- Call `mod.sendPriceDropAlert(baseInput)` and assert on the return shape.
- Inspect the SDK call via `sendMock.mock.calls[0][0]` — assert on `.to`, `.from`, `.subject`, `.html`.

**`baseInput` fixture to reuse** (`dealdrop/src/lib/resend.test.ts:140-150`) — the new override tests use the same fixture verbatim:

```typescript
const baseInput: Parameters<typeof mod.sendPriceDropAlert>[0] = {
  to: 'user@example.com',
  product: {
    name: 'Cool Headphones',
    url: 'https://shop.example.com/headphones',
    image_url: 'https://cdn.example.com/img.jpg',
    currency: 'USD',
  },
  oldPrice: 100,
  newPrice: 82,
}
```

**NEW tests to add (D-04)** — recommended placement: a new nested `describe('with RESEND_TEST_RECIPIENT override (EMAIL-02, EMAIL-03)', ...)` block inside the existing `describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', ...)` (Claude's Discretion §"Test names / describe-block organization"):

The three D-04 tests:
1. **Override unset** → SDK called with `to = input.to` (already covered by the existing happy-path test at line 152-164 — planner may either rely on it or duplicate explicitly inside the new nested describe).
2. **Override set** → SDK called with `to = env.RESEND_TEST_RECIPIENT`, regardless of `input.to`. Use `vi.stubEnv('RESEND_TEST_RECIPIENT', 'demo@example.com')` inside the test (and `vi.unstubAllEnvs()` / restore in `afterEach` if scoped); be aware the module is loaded once at file load via `mod = await import('@/lib/resend')` so per-test env stubbing of the override at the SDK call site requires re-importing — see "Test loading caveat" below.
3. **Env-validation rejects malformed override** — assert that loading the env module with `RESEND_TEST_RECIPIENT='not-an-email'` throws. Mirror the FROM_EMAIL test reasoning at line 12-19 — Zod v4's `.email()` rejects mailbox format; the same regex applies here.

**Test loading caveat (CRITICAL — flag to planner):**

The current file uses `mod = await import('@/lib/resend')` in a top-level `beforeAll` (line 35-37). Because env-vars are read at module-load time (line 39 reads `env.RESEND_API_KEY`; the new module-load `console.warn` reads `env.RESEND_TEST_RECIPIENT`), per-test `vi.stubEnv('RESEND_TEST_RECIPIENT', ...)` will NOT change the value the module sees unless the test uses `vi.resetModules() + await import('@/lib/resend')` to force a re-import. However, the SDK call inside `sendPriceDropAlert` reads `env.RESEND_TEST_RECIPIENT` **on every call** (per the Phase 9 D-01 expression `env.RESEND_TEST_RECIPIENT ?? input.to`), so per-test stubbing DOES work for the SDK-call-time override behavior — only the module-load `console.warn` is captured at file-load time.

**Test #2 implementation (the override-active assertion) — recommended shape:**

```typescript
it('routes to env.RESEND_TEST_RECIPIENT when override is set, ignoring input.to', async () => {
  vi.stubEnv('RESEND_TEST_RECIPIENT', 'demo@example.com')
  sendMock.mockResolvedValueOnce({ data: { id: 'msg_456' }, error: null })
  const res = await mod.sendPriceDropAlert(baseInput) // baseInput.to = 'user@example.com'
  expect(res).toEqual({ ok: true, messageId: 'msg_456' })
  const sendArgs = sendMock.mock.calls[0][0]
  expect(sendArgs.to).toBe('demo@example.com') // override wins
  expect(sendArgs.from).toBe('alerts@example.com') // unchanged
  // Restore for subsequent tests:
  vi.stubEnv('RESEND_TEST_RECIPIENT', '') // emptyStringAsUndefined → undefined
})
```

**Test #3 implementation (env-validation rejection) — recommended shape:**

```typescript
it('env.server.ts rejects malformed RESEND_TEST_RECIPIENT (not an email)', async () => {
  vi.stubEnv('RESEND_TEST_RECIPIENT', 'not-an-email')
  vi.resetModules()
  await expect(import('@/lib/env.server')).rejects.toThrow()
})
```

(The exact `vi.resetModules()` + import-rejects pattern may need tuning — planner verifies in REFINE.)

**Hard constraints:**
- Do NOT touch the `escapeHtml`, `computePercentDrop`, `formatCurrency`, `renderPriceDropEmailHtml` describe-blocks (lines 46-137).
- Do NOT touch the existing setup at lines 1-44.
- Re-use `sendMock` and `baseInput` — zero new test scaffolding (per CONTEXT.md `<code_context>` "Reusable Assets").
- The `vi.stubEnv('RESEND_TEST_RECIPIENT', ...)` calls must clean up after themselves (either restore to empty in the test or use `afterEach(() => vi.unstubAllEnvs())` if scoped — but be aware unstubbing all env-vars defeats the file-level setup at line 8-24).

---

### `dealdrop/.env.example` (config / docs)

**Analog:** self — the existing `# Phase 6 — email + cron` block at `dealdrop/.env.example:11-14`.

**Current full file** (`dealdrop/.env.example:1-14`):

```
# Supabase — public, browser-exposed
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — server-only (NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=

# Phase 3 — scraping
FIRECRAWL_API_KEY=

# Phase 6 — email + cron
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
```

**Pattern to follow:**
- One blank line between groups.
- `# Phase N — concern` header preceding each group.
- Bare keys with `=` and no value.
- No inline comments on the key lines themselves (existing convention).

**Phase 9 addition (Claude's Discretion §".env.example comment style") — recommended option A: append to the existing Phase 6 block:**

```
# Phase 6 — email + cron
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
# When set, all price-drop alerts route to this address (test mode).
# Leave blank for production user-of-record routing.
RESEND_TEST_RECIPIENT=
```

**Recommended option B: new dedicated header block (also acceptable per Claude's Discretion):**

```
# Phase 6 — email + cron
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=

# Phase 9 — email recipient override (optional, test mode)
# When set, all price-drop alerts route to this address.
# Leave blank for production user-of-record routing.
RESEND_TEST_RECIPIENT=
```

Planner picks A or B; both are acceptable (CONTEXT.md `<decisions>` Claude's Discretion explicitly notes "either is acceptable").

**Hard constraints:**
- The key must be exactly `RESEND_TEST_RECIPIENT` (D-05).
- The value must be empty (`RESEND_TEST_RECIPIENT=` with nothing after the `=`) — this is the "leave it blank for production" UX (per `emptyStringAsUndefined: true` in `env.server.ts:29`).
- Do NOT delete or reorder the existing five env vars.

---

### `dealdrop/README.md` (docs)

**Analog:** none in repo. The current README (`dealdrop/README.md:1-37`) is `create-next-app` scaffold copy and gets fully replaced per D-07 + Claude's Discretion §"README copy length and tone".

**Current scaffold** (`dealdrop/README.md:1-37`) — to be replaced:

```markdown
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started
[... 36 more lines of scaffold ...]
```

**No code analog exists** for the new README content. The closest stylistic precedents are project-internal Markdown files:
- `.planning/PROJECT.md` — full project description, tone reference for what DealDrop is.
- `dealdrop/CLAUDE.md` (delegates to AGENTS.md) — short, instruction-style.

**Required README sections (per CONTEXT.md Claude's Discretion §"README copy length"):**

1. **Title + one-paragraph DealDrop intro** — what it is. Optionally link to `.planning/PROJECT.md` for full context.
2. **Getting Started / Development** — keep `npm run dev` / `npm run build` / `npm run lint`. (Rationale: this is the only useful piece of the scaffold copy.)
3. **Environment configuration** — list every required env var with a one-line description. Keys (in this exact order to match `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (browser-safe)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (browser-safe)
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server-only — never expose)
   - `FIRECRAWL_API_KEY` — Firecrawl API key for product scraping
   - `RESEND_API_KEY` — Resend API key for transactional email
   - `RESEND_FROM_EMAIL` — verified sender address (must pass Zod `.email()`)
   - `CRON_SECRET` — bearer token for `/api/cron/check-prices` (≥ 32 chars)
   - `RESEND_TEST_RECIPIENT` *(optional)* — overrides the user-of-record recipient
4. **Email recipient modes** — three lines (per CONTEXT.md):
   - `RESEND_TEST_RECIPIENT` set → all alerts go to that single test address (demo / pre-domain-verification mode).
   - `RESEND_TEST_RECIPIENT` unset → alerts go to each product's tracking-user-of-record (production mode).
   - For v1.2, after Resend domain verification, unset `RESEND_TEST_RECIPIENT` in Vercel — zero code change required.

**Tone constraints (per CONTEXT.md):**
- Portfolio-bar — informative, not exhaustive.
- Short. Reference `PROJECT.md` for the full picture instead of duplicating it.
- No exhaustive deployment guide; no Vercel walkthrough.
- No emoji unless explicitly requested (per project CLAUDE.md user-rules).

**Hard constraints:**
- The README is a **side-quest** of Phase 9 (per CONTEXT.md `<specifics>`). Don't expand its scope to a full deployment manual.
- Do NOT replace `.planning/PROJECT.md` or `.planning/REQUIREMENTS.md` content — link to them.
- Do NOT touch any other Markdown file in the repo.

---

### `dealdrop/src/lib/email/resolve-recipient.ts` *(OPTIONAL — Claude's Discretion)* (utility, pure-function)

**Decision:** Whether to extract is the planner's call (CONTEXT.md `<decisions>` Claude's Discretion §"Whether to also export a pure helper"). Inline `env.RESEND_TEST_RECIPIENT ?? input.to` reads cleanly; extracting helps test readability if the planner finds it useful. Both options are acceptable.

**Analog:** `dealdrop/src/lib/cron/auth.ts` — a tiny single-export server-only utility module with `import 'server-only'` + comment header + one named function.

**Full analog file** (`dealdrop/src/lib/cron/auth.ts:1-25`):

```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// File: dealdrop/src/lib/cron/auth.ts
// CRON-02: constant-time Bearer-token verification for /api/cron/check-prices POST.
// Uses node:crypto timingSafeEqual — the standard Node way to avoid timing-attack
// oracles on secret comparisons. Length-checks before the compare because
// timingSafeEqual throws RangeError on length mismatch.

import { timingSafeEqual } from 'node:crypto'

export function verifyCronBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice(7) // strip literal "Bearer "
  const providedBuf = Buffer.from(provided)
  const secretBuf = Buffer.from(secret)
  if (providedBuf.length !== secretBuf.length) return false
  return timingSafeEqual(providedBuf, secretBuf)
}
```

**Pattern to copy from `cron/auth.ts`:**
1. `import 'server-only'` — mandatory first line.
2. Comment header: `// MUST be the first line — throws at bundle time...` (verbatim from line 2-3).
3. `// File: <full repo path>` and `// <CONTEXT-locator>: <one-line summary>` block.
4. One named export — the public function.
5. No default export. No barrel file.

**Recommended new-file shape (if planner picks the extraction):**

```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// File: dealdrop/src/lib/email/resolve-recipient.ts
// EMAIL-02 / Phase 9 D-01: routes price-drop alerts either to the test recipient
// (when env.RESEND_TEST_RECIPIENT is set) or to the user-of-record (production).
// Pure function — env reads happen via the @/lib/env.server module-scope import,
// not via a parameter, matching the existing resend.ts pattern (D-02).

import { env } from '@/lib/env.server'

export function resolveRecipient(userEmail: string): string {
  return env.RESEND_TEST_RECIPIENT ?? userEmail
}
```

**Test placement (if extracted):**
- Extend `dealdrop/src/lib/resend.test.ts` with calls to `resolveRecipient` directly (no separate test file unless the helper grows beyond one expression — premature for a single line).
- The existing override-routing tests still assert on `sendMock.mock.calls[0][0].to` because `sendPriceDropAlert` is the integration point.

**Hard constraints (if planner extracts):**
- Module path is exactly `dealdrop/src/lib/email/resolve-recipient.ts` (per CONTEXT.md "Optional" scope item).
- `import 'server-only'` MUST be line 1 (CONTEXT.md `<code_context>` "Established Patterns").
- Single named export `resolveRecipient`. No default export.
- Do NOT introduce a second helper, a router config, or a strategy enum (per `<specifics>`: "should not over-engineer this").

---

## Shared Patterns

### `import 'server-only'` first line

**Source:** `dealdrop/src/lib/env.server.ts:1`, `dealdrop/src/lib/resend.ts:1`, `dealdrop/src/lib/cron/check-prices.ts:1`, `dealdrop/src/lib/cron/auth.ts:1`, `dealdrop/src/lib/firecrawl/scrape-product.ts:1`, `dealdrop/src/lib/supabase/admin.ts:1`.

**Apply to:** Any new `lib/` module Phase 9 introduces (only the optional `resolve-recipient.ts`).

```typescript
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
```

This is a hard repo-wide convention (per CONTEXT.md `<code_context>` "Established Patterns"). Phase 9's existing modifications already comply (the existing `resend.ts:1` and `env.server.ts:1` already start with `import 'server-only'`).

### Structured `console.warn` / `console.error` — never template-literal interpolate

**Source:** `dealdrop/src/lib/firecrawl/scrape-product.ts:88` (canonical T-6-04 / T-3-04 precedent), `dealdrop/src/lib/cron/check-prices.ts:107-111` (canonical `console.warn` precedent), `dealdrop/src/lib/resend.ts:157-161` (existing in-file precedent).

**Apply to:** The new module-load `console.warn` in `resend.ts` (Phase 9's only new log line).

**Pattern (verbatim shape from `check-prices.ts:107-111`):**

```typescript
console.warn('module: event_name', {
  field1: value1,
  field2: value2,
})
```

**Anti-pattern (DO NOT WRITE):**

```typescript
// WRONG — log-injection vulnerability:
console.warn(`resend: override active for ${env.RESEND_TEST_RECIPIENT}`)
```

**Specific call for Phase 9** (place at `resend.ts` ~line 40, immediately after the `Resend` SDK construction):

```typescript
if (env.RESEND_TEST_RECIPIENT) {
  console.warn('resend: test_recipient_override_active', {
    recipient: env.RESEND_TEST_RECIPIENT,
  })
}
```

### Zod schema additivity (no restructuring)

**Source:** `dealdrop/src/lib/env.server.ts:13-30` (the schema's existing five-field shape).

**Apply to:** The one new field in `env.server.ts`.

**Rule:** Append to the existing `server` object and the existing `runtimeEnv` object. Do not reorder existing entries. Do not introduce sub-objects, namespaces, or grouped configs.

```typescript
server: {
  // ... five existing entries unchanged ...
  RESEND_TEST_RECIPIENT: z.string().email().optional(), // NEW
},
runtimeEnv: {
  // ... five existing entries unchanged ...
  RESEND_TEST_RECIPIENT: process.env.RESEND_TEST_RECIPIENT, // NEW
},
```

### Discriminated-union return shape (`SendResult`) is stable

**Source:** `dealdrop/src/lib/resend.ts:31-33`.

**Apply to:** All Phase 9 changes to `resend.ts` — DO NOT change this shape.

```typescript
export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_from' | 'validation' | 'unknown' }
```

The override is invisible from the outside (per CONTEXT.md `<code_context>` "Established Patterns" + Claude's Discretion §"Type/interface changes": "If the planner discovers a reason to surface 'what address was actually used' in the return shape, that's a deviation — flag and ask"). No new `actualRecipient` field; no new `reason` enum member.

### Test infrastructure reuse — `vi.stubEnv` + `sendMock`

**Source:** `dealdrop/src/lib/resend.test.ts:8-44` (file-level `beforeAll` + `vi.mock('resend', ...)` + `sendMock`).

**Apply to:** All new Phase 9 tests in `resend.test.ts`.

**Rule:** Phase 9 tests add zero new top-level scaffolding (per CONTEXT.md `<code_context>` "Reusable Assets"). Per-test additions to the existing setup:
- `vi.stubEnv('RESEND_TEST_RECIPIENT', '<value>')` inside the `it(...)` body.
- `sendMock.mockResolvedValueOnce({ data: { id: 'msg_NNN' }, error: null })` for happy paths.
- Assert via `sendMock.mock.calls[0][0].to`.
- Restore the override at end-of-test (`vi.stubEnv('RESEND_TEST_RECIPIENT', '')` to coerce to undefined via `emptyStringAsUndefined: true`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `dealdrop/README.md` (rewrite) | docs | n/a | The current README is `create-next-app` scaffold copy; no prior portfolio-bar README exists in the repo. Use `.planning/PROJECT.md` as a tone reference. |

The README rewrite is the only "no analog" file. All other in-scope files are modifications to existing well-established files, and the optional `resolve-recipient.ts` has a strong analog in `cron/auth.ts`.

---

## Metadata

**Analog search scope:**
- `dealdrop/src/lib/**/*.ts` (24 files scanned)
- `dealdrop/src/lib/**/*.test.ts`
- `dealdrop/.env.example`
- `dealdrop/README.md`
- `dealdrop/AGENTS.md` / `dealdrop/CLAUDE.md` (project conventions)
- `.planning/phases/09-resend-env-config/09-CONTEXT.md` (decisions + canonical refs)
- `.planning/phases/06-automated-monitoring-email-alerts/06-CONTEXT.md` (Phase 6 contracts Phase 9 inherits)

**Files scanned:** 24 in `dealdrop/src/lib/` + 4 docs/config files.

**Pattern extraction date:** 2026-05-02

**Key takeaway for the planner:** Phase 9 is an additive refactor. Every code change copies an existing in-file pattern. The biggest risk is **scope creep** (touching the HTML template, the SDK construction, or anything in the Phase 8 brand-polish surface) — the file-level "Hard constraints" callouts above are the planner's checklist for staying inside D-01..D-07.
