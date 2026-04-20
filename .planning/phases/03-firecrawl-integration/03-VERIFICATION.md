---
phase: 03-firecrawl-integration
verified: 2026-04-19T12:35:00Z
status: human_needed
score: 3/3 roadmap-success-criteria verified; 20/20 plan-frontmatter truths verified; 3/3 requirements satisfied
overrides_applied: 0
requirements:
  - id: TRACK-03
    description: "Server Action validates URL format with Zod before scraping"
    status: satisfied
    evidence: "src/lib/firecrawl/url.ts lines 9-23 (Zod chain .max(2048).url().refine(protocol allowlist)); 7 url.test.ts validateUrl cases (empty, ftp, javascript, file, too-long, malformed, https-happy); integration tests B1 (file://) + B2 (malformed) in scrape-product.test.ts confirm fetch not called for invalid URLs"
  - id: TRACK-04
    description: "Server Action calls Firecrawl scrape with JSON schema extracting product_name, current_price, currency_code, product_image_url"
    status: satisfied
    evidence: "src/lib/firecrawl/schema.ts lines 20-50 PRODUCT_JSON_SCHEMA as const literal with all 4 required fields; scrape-product.ts line 24 POSTs to https://api.firecrawl.dev/v2/scrape with formats:[{type:'json',schema:PRODUCT_JSON_SCHEMA,prompt}]; scrape-product.test.ts B15 asserts endpoint URL + Bearer auth + body shape (formats/onlyMainContent/timeout:60_000/normalized URL)"
  - id: TRACK-05
    description: "Scraped payload validated with Zod — null/missing fields reject the insert with a user-facing error"
    status: satisfied
    evidence: "schema.ts parseProductResponse lines 83-140 enforces branch order missing_name → missing_price → invalid_currency → unknown; schema.test.ts 11 branch cases plus B5/B6/B7/B14 integration tests; ScrapeFailureReason closed union (types.ts lines 8-15) with compile-time exhaustiveness check (lines 39-47) guarantees Phase 4 toast map stays in sync"
human_verification:
  - test: "Real end-to-end scrape against a live Firecrawl account"
    expected: "Calling scrapeProduct('https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html') with a real FIRECRAWL_API_KEY in dealdrop/.env.local returns { ok: true, data: { name: 'A Light in the Attic', current_price: 51.77, currency_code: 'GBP', image_url: '...' } }"
    why_human: "Unit tests mock global.fetch against the captured fixture — they cannot prove the real Firecrawl v2 endpoint still accepts the request shape and returns the expected JSON. The fixture was captured 2026-04-19; any future Firecrawl API drift (endpoint deprecation, response-shape change, rate-limit behavior) would not show up in the mocked tests. Recommended: run the captured curl script from 03-01-PLAN.md Task 3 one more time before Phase 4 consumes scrapeProduct, compare response shape to the committed fixture."
  - test: "scrape_timeout path against a slow real endpoint"
    expected: "scrapeProduct pointed at a URL Firecrawl genuinely takes >60s to return on (or with Firecrawl's timeout parameter exceeded) returns { ok: false, reason: 'scrape_timeout' } without retry, and logs 'scrapeProduct: timeout' server-side"
    why_human: "The B11 unit test asserts the correct branch for a DOMException('timed out', 'TimeoutError'), but only the real Node 24 runtime actually produces that exception type from AbortSignal.timeout under a real network stall. Research Pitfall 4 specifically warned that Node versions before 20 emitted AbortError — verifying on the deployed runtime (Vercel Node 20+ / local Node 24.15.0) is the only way to confirm the name-based check in doFetch (scrape-product.ts lines 62-66) matches production behavior."
  - test: "Phase 4 consumer integration — confirm import surface is ergonomic"
    expected: "A Phase 4 add-product Server Action can write: `import { scrapeProduct } from '@/lib/firecrawl/scrape-product'; import type { ScrapeResult, ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'` without needing to reach into ./types, ./url, or ./schema"
    why_human: "Phase 4 hasn't been planned yet. Verifier confirmed the re-exports exist (scrape-product.ts:22 re-exports ScrapeResult/ProductData/ScrapeFailureReason from ./types), but only Phase 4 execution can confirm the toast-map ergonomics and that normalizeUrl is also reachable client-side for paste-time dedupe without dragging in server-only."
---

# Phase 3: Firecrawl Integration Verification Report

**Phase Goal (from ROADMAP.md line 61-62):** A typed `scrapeProduct(url)` function exists that calls Firecrawl, validates the response with Zod, and returns structured product data or a typed failure — ready to be consumed by both the add-product Server Action and the cron handler.

**Verified:** 2026-04-19T12:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### ROADMAP Success Criteria (primary contract)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC-1 | Calling scrapeProduct() with a valid e-commerce URL returns a typed object with name, current_price, currency_code, and image_url | VERIFIED | scrape-product.ts:81 exports `scrapeProduct(rawUrl: string): Promise<ScrapeResult>`. `ScrapeResult` is `{ ok: true; data: ProductData } \| { ok: false; reason }` (types.ts:24-26). `ProductData` has exactly those 4 keys with `image_url: string \| null` (types.ts:17-22). scrape-product.test.ts B3 runs the happy path and asserts the return shape. |
| SC-2 | A Firecrawl response with a null or zero current_price is rejected and returns a typed failure (not written to the DB) | VERIFIED | schema.ts:95-103 rejects null/non-number/NaN/<=0. schema.test.ts branch cases cover null, 0, -10 all returning `{ ok: false, reason: 'missing_price' }`. scrape-product.test.ts B6 confirms integrated path: fetch returns `{ current_price: 0 }` → scrapeProduct returns `{ ok: false, reason: 'missing_price' }` — no DB write path reachable from failure branch (DB writes live in Phase 4 and are gated on `result.ok`). |
| SC-3 | The Firecrawl API key is never accessible in the browser bundle (server-only guard in place) | VERIFIED | Line 1 of scrape-product.ts is exactly `import 'server-only'`. env.server.ts line 1 is `import 'server-only'`. Post-build bundle grep `.next/static/` → 0 matches for `FIRECRAWL_API_KEY`, 0 matches for `fc-[a-zA-Z0-9]{16,}`, 0 matches for SUPABASE_SERVICE_ROLE_KEY/RESEND_API_KEY/RESEND_FROM_EMAIL/CRON_SECRET. Plan 04 adversarial build (pre-cleanup) confirmed `npm run build` exits 1 with `server-only` error when scrapeProduct is imported from a `'use client'` file. |

**ROADMAP SC score: 3/3 VERIFIED**

### Plan-Frontmatter Must-Have Truths (merged across 4 plans)

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | 03-01 | vitest is installed as a devDependency and `npx vitest --version` runs without error | VERIFIED | package.json devDeps contain `vitest@^3.2.4` + `@vitest/coverage-v8@^3.2.4`; test run banner shows "RUN v3.2.4" |
| 2 | 03-01 | A live Firecrawl v2 /scrape response has been captured into a committed JSON fixture so downstream unit tests are deterministic and closed assumptions A1/A2/A5 | VERIFIED | `__fixtures__/firecrawl-v2-scrape-response.json` 2104 bytes; A1/A2/A5 all PASS per 03-01-SUMMARY (£→GBP, price as number 51.77, product_image_url as string URL) |
| 3 | 03-01 | Colocated `*.test.ts` skeletons exist for url.ts, schema.ts, and scrape-product.ts | VERIFIED | All three test files present and now filled in (Plans 02/03); 40 tests total |
| 4 | 03-02 | A `ScrapeFailureReason` union type exists with exactly the 7 reason codes from D-02 | VERIFIED | types.ts:8-15 exports the 7-code union (invalid_url, network_error, scrape_timeout, missing_price, missing_name, invalid_currency, unknown); compile-time `_Equal<>` exhaustiveness check on lines 39-47 |
| 5 | 03-02 | A `ProductData` type exists whose keys match what Phase 4 will write to the products table | VERIFIED | types.ts:17-22 — name, current_price, currency_code, image_url (matches DB-01 products columns with currency_code→currency rename at insert) |
| 6 | 03-02 | `validateUrl(raw)` rejects non-http protocols, >2048-char URLs, and malformed strings — returns a discriminated union, never throws | VERIFIED | url.ts:29-35 wraps Zod `safeParse`, returns `{ok:true,url} \| {ok:false}`; url.test.ts covers ftp/javascript/file/too-long/malformed — all 7 rejection paths pass |
| 7 | 03-02 | `normalizeUrl(raw)` strips utm_*/fbclid/gclid, lowercases scheme+host, strips trailing slash, preserves variant params | VERIFIED | url.ts:48-63; 5 normalizeUrl tests in url.test.ts including idempotence |
| 8 | 03-02 | Firecrawl JSON schema constant mirrors the 4-field product shape and is a TS `as const` literal | VERIFIED | schema.ts:20-50 `PRODUCT_JSON_SCHEMA = {...} as const` with all 4 fields + required array |
| 9 | 03-02 | Response Zod schemas are exported from schema.ts for reuse by scrapeProduct in Plan 03 | VERIFIED | schema.ts exports FirecrawlScrapeResponseSchema, ProductDataSchema, parseProductResponse; scrape-product.ts:15-19 imports all three |
| 10 | 03-03 | `scrapeProduct(url)` returns `{ok:true,data} \| {ok:false,reason}` for EVERY code path — never throws for expected failures | VERIFIED | scrape-product.ts structure: all 7 returns are `{ok:false,reason:<literal>}` or `{ok:true,...}` (via parseProductResponse); 16 scrape-product.test.ts cases cover B1-B15+B10b with no `.rejects` assertions — every test asserts a returned ScrapeResult |
| 11 | 03-03 | Line 1 of scrape-product.ts is literally `import 'server-only'` | VERIFIED | `head -1` returns exactly `import 'server-only'` |
| 12 | 03-03 | `FIRECRAWL_API_KEY` is read only via `env.FIRECRAWL_API_KEY` — NOT `process.env.*` | VERIFIED | `grep -c "process.env"` → 0; `grep "env.FIRECRAWL_API_KEY"` → line 42 Authorization header; import from `@/lib/env.server` on line 13 |
| 13 | 03-03 | Fetch POSTs to exactly `https://api.firecrawl.dev/v2/scrape` with correct body shape | VERIFIED | scrape-product.ts:24 `FIRECRAWL_URL` constant; lines 44-55 body with formats/onlyMainContent/timeout; B15 test asserts exact URL + Bearer + body shape + normalized URL |
| 14 | 03-03 | Timeout is 60s via `AbortSignal.timeout(60_000)` and triggers `reason: 'scrape_timeout'` (DOMException TimeoutError, NOT AbortError) with NO retry | VERIFIED | scrape-product.ts:56 `AbortSignal.timeout(TIMEOUT_MS)` with TIMEOUT_MS=60_000; lines 62-66 check `err.name === 'TimeoutError'` (grep confirms 0 occurrences of `'AbortError'`); B11 test confirms no retry (fetchMock called 1x) |
| 15 | 03-03 | Retry fires exactly once on 5xx OR thrown network errors, with 2s backoff; 4xx returns `network_error` with no retry | VERIFIED | scrape-product.ts:95 `for (attempt = 0; attempt < 2)`; 4xx branch lines 121-129 returns without `continue`; 5xx branch lines 132-142 retries once on attempt 0. B8/B9/B10/B10b/B12 test all these paths. |
| 16 | 03-03 | The failure-branch return payload contains NO `detail`, `message`, `stack`, or HTTP-status field | VERIFIED | Every failure `return` is `{ ok: false, reason: <literal> }` — grep for `return \{ ok: false, .*(detail\|message\|status\|stack\|cause):` returns 0 matches |
| 17 | 03-04 | A build-time regression test has been run proving importing scrapeProduct from a 'use client' file causes `npm run build` to FAIL | VERIFIED | 03-04-SUMMARY documents EXIT=1 with 4 `server-only` errors; import trace references both scrape-product.ts and env.server.ts (belt-and-suspenders after the env split) |
| 18 | 03-04 | Post-build grep confirms NO Firecrawl API key (`fc-`) OR the literal string `FIRECRAWL_API_KEY` appears in `.next/static/**` | VERIFIED | Re-confirmed by verifier: `grep -c "fc-[a-zA-Z0-9]{16,}"` → 0; `grep -c "FIRECRAWL_API_KEY"` → 0 |
| 19 | 03-04 | The temporary 'use client' test file is DELETED and NOT committed | VERIFIED | `ls dealdrop/app/` shows no `gsd-serveronly-test/` dir; git status shows no leaked file. Plan 04's pre/post cleanup diff was empty (exit 0). |
| 20 | 03-04 | (Implicit) env schema split so server env-var NAMES never reach the client bundle | VERIFIED | env.server.ts created with 5 server vars + line-1 server-only guard; env.ts shrunk to NEXT_PUBLIC_* only; admin.ts + scrape-product.ts re-pointed to env.server; all 5 server var names grep to 0 in client bundle |

**Plan-truth score: 20/20 VERIFIED**

### Deferred Items

None. All must-haves are either satisfied in this phase or explicitly in-scope for it.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `dealdrop/src/lib/firecrawl/types.ts` | Type contracts (ScrapeFailureReason, ProductData, ScrapeResult) | VERIFIED | 47 lines; exports match plan; exhaustiveness check compiles |
| `dealdrop/src/lib/firecrawl/url.ts` | validateUrl + normalizeUrl pure functions | VERIFIED | 63 lines; no server-only guard (intentional); no process.env; no @/lib/env import |
| `dealdrop/src/lib/firecrawl/schema.ts` | PRODUCT_JSON_SCHEMA + FirecrawlScrapeResponseSchema + ProductDataSchema + parseProductResponse | VERIFIED | 140 lines; 4 named exports; branch order textually missing_name→missing_price→invalid_currency (awk ordering check) |
| `dealdrop/src/lib/firecrawl/scrape-product.ts` | Public scrapeProduct(url) server-only function | VERIFIED | 179 lines; line 1 = `import 'server-only'` exact; exports scrapeProduct + re-exports 3 types; `min_lines: 100` requirement met |
| `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` | Captured live Firecrawl v2 scrape response | VERIFIED | 2104 bytes; `success: true`; all 4 fields populated (product_name, current_price, currency_code, product_image_url) |
| `dealdrop/src/lib/firecrawl/url.test.ts` | 12 tests covering validateUrl + normalizeUrl | VERIFIED | 12 passing tests (7 validateUrl + 5 normalizeUrl); no describe.skip |
| `dealdrop/src/lib/firecrawl/schema.test.ts` | Branch-ordered validation tests against captured fixture | VERIFIED | 12 passing tests; mutates baseline fixture; branch order test present |
| `dealdrop/src/lib/firecrawl/scrape-product.test.ts` | B1-B15 + B10b branch coverage | VERIFIED | 16 passing tests in 31ms; mocked fetch via vi.stubGlobal; env stubbed via vi.stubEnv; fake timers for retry backoff |
| `dealdrop/vitest.config.ts` | Vitest config with node env, @→src alias, server-only alias | VERIFIED | Present; aliases `@` → `./src` (matches tsconfig) and `server-only` → `empty.js` (test-only, does not affect build) |
| `dealdrop/src/lib/env.server.ts` | Server-only env schema split from env.ts | VERIFIED | 30 lines; line 1 = `import 'server-only'`; 5 server vars (SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET) |
| `dealdrop/src/lib/env.ts` | Client-safe env schema (NEXT_PUBLIC_* only) | VERIFIED | 29 lines; client block only; no server block; no `server-only` guard (intentional — client-reachable) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| scrape-product.ts | env.server.ts | `import { env } from '@/lib/env.server'` | WIRED | line 13; Authorization header at line 42 references `env.FIRECRAWL_API_KEY` |
| scrape-product.ts | url.ts | `import { validateUrl, normalizeUrl } from './url'` | WIRED | line 14; both functions used at lines 83 and 92 |
| scrape-product.ts | schema.ts | `import { FirecrawlScrapeResponseSchema, PRODUCT_JSON_SCHEMA, parseProductResponse }` | WIRED | lines 15-19; all three used (schema in body line 49, envelope at 156, parser at 171) |
| scrape-product.ts | types.ts | `import type { ScrapeResult } from './types'` + re-exports | WIRED | lines 20 + 22; return type of scrapeProduct is ScrapeResult |
| scrape-product.ts | Firecrawl v2 API | fetch POST to `https://api.firecrawl.dev/v2/scrape` with Bearer token | WIRED | line 24 constant; line 38 fetch call; line 42 Bearer header |
| schema.ts | types.ts | `import type { ProductData, ScrapeResult } from './types'` | WIRED | line 17; parseProductResponse return type is ScrapeResult |
| url.ts | zod | `z.string().max(2048).url().refine(...)` | WIRED | import zod line 5; schema lines 9-23 |
| url.test.ts | url.ts | `import { validateUrl, normalizeUrl } from './url'` | WIRED | line 2 |
| schema.test.ts | schema.ts | `import { FirecrawlScrapeResponseSchema, parseProductResponse } from './schema'` | WIRED | test file imports verified; 12 tests pass |
| scrape-product.test.ts | scrape-product.ts | dynamic import via `await import('./scrape-product')` | WIRED | lines 440-443; ordering guarantees env stubs land before env module evaluates |
| package.json `scripts.test` | vitest | `"test": "vitest run"` | WIRED | npm script invokes vitest; `npx vitest --version` returns 3.2.4 |

---

## Data-Flow Trace (Level 4)

Not applicable for this phase — Phase 3 delivers a library module, not a component that renders dynamic data. The data flow is inbound (Firecrawl response) → transformed → returned as a typed union. The B3 happy-path test asserts that real fixture data flows through: fixture → FirecrawlScrapeResponseSchema.safeParse → parseProductResponse → typed ProductData with `out.data.current_price > 0` and `out.data.currency_code` matching `/^[A-Z]{3}$/`. The source-to-return trace is fully exercised by the unit tests.

For downstream consumers (Phase 4 Server Action, Phase 6 cron), the wiring will be re-verified in those phases. Verifier confirmed the import surface (re-exports of ScrapeResult/ProductData/ScrapeFailureReason at scrape-product.ts:22) is intact.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Firecrawl slice tests pass | `npx vitest run src/lib/firecrawl` | "Test Files 3 passed (3); Tests 40 passed (40); Duration 214ms" | PASS |
| TypeScript strict compiles cleanly on src/ | `npx tsc --noEmit` filtered to `src/` paths | 0 src/ errors (only pre-existing `.next/types/*.d 4.ts` rsync-duplicate noise) | PASS |
| Next.js production build succeeds | `npm run build` | Exit 0; 5 routes compiled; static generation succeeded; "Finished TypeScript in 1056ms" | PASS |
| Post-build client bundle contains no Firecrawl API key | `grep -rE "fc-[a-zA-Z0-9]{16,}" .next/static/` | 0 matches | PASS |
| Post-build client bundle contains no FIRECRAWL_API_KEY literal | `grep -rc "FIRECRAWL_API_KEY" .next/static/` | 0 matches | PASS |
| Post-build client bundle contains no other server env var names | `grep` for SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY / RESEND_FROM_EMAIL / CRON_SECRET | 0 matches all 4 | PASS |
| Line 1 server-only guards on all server modules | `head -1` on scrape-product.ts, env.server.ts, supabase/admin.ts | All exactly `import 'server-only'` | PASS |
| scrape-product.ts has no `process.env` references | `grep -c "process.env"` | 0 | PASS |
| scrape-product.ts never checks AbortError (only TimeoutError) | `grep -c "'AbortError'"` | 0; `grep "TimeoutError"` returns 4 (1 comment + 2 runtime checks + 1 secondary) | PASS |

**Spot-checks: 9/9 PASS**

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TRACK-03 | 03-01, 03-02, 03-03 | Server Action validates URL format with Zod before scraping | SATISFIED | url.ts:9-23 Zod schema; 7 rejection tests in url.test.ts; B1/B2 integration tests assert fetch not called for invalid URL; REQUIREMENTS.md line 184 marked Complete |
| TRACK-04 | 03-01, 03-03, 03-04 | Server Action calls Firecrawl scrape with JSON schema extracting 4 fields | SATISFIED | schema.ts:20-50 PRODUCT_JSON_SCHEMA; scrape-product.ts:24 endpoint; B15 request-shape test; REQUIREMENTS.md line 185 marked Complete |
| TRACK-05 | 03-01, 03-02, 03-03 | Scraped payload validated with Zod — null/missing fields reject with user-facing error | SATISFIED | schema.ts:83-140 parseProductResponse with branch-ordered checks; 11 schema.test.ts branch cases + 4 scrape-product.test.ts integration cases (B5/B6/B7/B14); REQUIREMENTS.md line 186 marked Complete |

**Requirements: 3/3 SATISFIED. No orphans.** ROADMAP.md assigns only TRACK-03/TRACK-04/TRACK-05 to Phase 3; REQUIREMENTS.md traceability table confirms these three are the complete scope for this phase. No plan declared additional requirement IDs.

---

## Anti-Patterns Found

Reference: 03-REVIEW.md findings (0 critical, 2 warning, 4 info).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scrape-product.ts | 88 | `console.error('...', { rawUrl })` with no length cap before logging | Warning (WR-01) | Pathologically long (e.g. 1MB) pasted input would be copied verbatim into server logs. Not a correctness issue; log-bloat surface. Not a blocker — recommended fix is a 2048-char slice before logging. |
| scrape-product.ts | 95-178 | Retry loop uses sequential `if` checks instead of exhaustive `switch` on `outcome.kind` | Warning (WR-02) | Future 4th FetchOutcome variant would compile silently. Today's control flow is correct (verifier confirmed all paths terminate); the unreachable fallthrough on line 175-178 is structural defense. Not a blocker. |
| schema.ts | 87-93 | Defensive `typeof` check on product_name despite JSON Schema listing it in `required` | Info (IN-01) | Clarity nit — Firecrawl v2 historically returns null for required fields when LLM extraction fails; defensive check is correct, one-line comment would age code better. |
| scrape-product.ts | 156-167 | `success: true` with missing `data.json` maps to `reason: 'unknown'` (not a dedicated reason) | Info (IN-02) | Documented Firecrawl behavior funneled into `unknown` per D-02. Covered by B14 test. |
| scrape-product.ts | 26, 106, 134 | Fixed 2s retry backoff with no jitter | Info (IN-03) | Fine for Phase 4 single-user flow; Phase 6 cron will want jitter. Flagged for Phase 6. |
| vitest.config.ts | 34-37 | `server-only` aliased to `./node_modules/server-only/empty.js` (internal package file path) | Info (IN-04) | Works today; future patch release of `server-only` package reorganizing internals would silently break. Recommended fix: repo-owned `test/stubs/server-only.ts`. |

**No blocker anti-patterns. All 2 warnings are logic-robustness nits (log-bloat surface, structural fragility), not correctness bugs. Pre-existing lint noise from `.claude/**` and rsync-duplicate `* 2.*` files is out of scope per prior summaries.**

---

## Human Verification Required

Automated checks cannot verify that (1) the committed fixture still matches the live Firecrawl v2 response shape today, (2) `AbortSignal.timeout` in production Node 24 actually emits `TimeoutError` (not `AbortError`), and (3) Phase 4 consumers find the import surface ergonomic. Three items need human confirmation before Phase 4 consumes `scrapeProduct`:

### 1. Real end-to-end scrape against live Firecrawl

**Test:** Ensure `dealdrop/.env.local` has a valid `FIRECRAWL_API_KEY`, then from a Node REPL or a throwaway script run `await scrapeProduct('https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html')`.

**Expected:** Returns `{ ok: true, data: { name: 'A Light in the Attic', current_price: 51.77, currency_code: 'GBP', image_url: 'https://books.toscrape.com/media/cache/...' } }` (price may differ if the sandbox page has been updated; key is that all 4 fields populate and the return is `ok: true`).

**Why human:** Unit tests mock `global.fetch` against the captured 2026-04-19 fixture. If Firecrawl has since changed response shape, deprecated v2, rate-limited the key, or altered the `data.json` envelope, the production code path would fail at runtime even though all 40 mocked tests pass. Verifier cannot invoke a real paid API call.

### 2. `scrape_timeout` path against a slow real endpoint

**Test:** Temporarily lower `TIMEOUT_MS` in scrape-product.ts to e.g. 500ms, run scrapeProduct against any real URL, confirm the return is `{ ok: false, reason: 'scrape_timeout' }` with one `console.error('scrapeProduct: timeout', ...)` log line. Revert the timeout before committing.

**Expected:** `reason === 'scrape_timeout'`, `fetch` called exactly once (no retry).

**Why human:** The B11 unit test rejects with a manually-constructed `DOMException('timed out', 'TimeoutError')`, which is what `AbortSignal.timeout` is documented to emit on Node 20+. But the name-check in `doFetch` (lines 62-66) hard-codes `'TimeoutError'` — Research Pitfall 4 warned that earlier Node versions emitted `'AbortError'`. Verifier cannot prove at static-analysis time that the target runtime (Vercel Node 20+ or local Node 24.15.0) produces the expected name. A 30-second live test confirms the exception type matches the code's expectation.

### 3. Phase 4 consumer integration smoke

**Test:** In a throwaway Server Action stub for Phase 4, write:
```ts
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import type { ScrapeResult, ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'
import { normalizeUrl } from '@/lib/firecrawl/url'  // client-safe; use for paste-time dedupe
```
Confirm all imports resolve, `ScrapeFailureReason` narrows correctly in a switch statement, and TypeScript does not complain. Delete the stub.

**Expected:** Imports resolve, narrowing works, no TS errors. `normalizeUrl` can also be imported into a Client Component page without dragging in `server-only`.

**Why human:** Phase 4 hasn't been planned; the verifier confirmed `scrape-product.ts:22` re-exports the 3 types and that `url.ts` has no `server-only` guard, but the ergonomics ("is it ugly to import normalizeUrl from a different module than scrapeProduct?") is a design-quality judgment Phase 4 needs to make before final sign-off on the public contract.

---

## Gaps Summary

**No implementation gaps found.** All ROADMAP Success Criteria are verified, all plan-frontmatter must-haves are verified, all 3 requirements are satisfied, all artifacts exist and are substantive and wired, all key links are wired, all 9 behavioral spot-checks pass, and the post-build bundle grep confirms the T-3-01 mitigation holds.

**Status is `human_needed`, not `passed`, because three aspects of the phase goal cannot be verified programmatically:** (a) the fixture's real-world freshness against live Firecrawl, (b) the Node runtime actually emitting `TimeoutError` (not `AbortError`) for `AbortSignal.timeout`, and (c) Phase 4 consumer import ergonomics. These are not defects — they are boundaries of what static verification can cover for an integration with an external paid API and an external runtime.

The 2 Warning anti-patterns (WR-01, WR-02) from the code review are logic-robustness nits, not correctness bugs — they do not block phase sign-off per REVIEW findings `status: issues_found` meaning "review-level issues found, but no critical blockers".

---

_Verified: 2026-04-19T12:35:00Z_
_Verifier: Claude (gsd-verifier)_
