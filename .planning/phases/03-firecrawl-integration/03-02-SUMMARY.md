---
phase: 03-firecrawl-integration
plan: 02
subsystem: scraping
tags: [firecrawl, zod, url-validation, json-schema, type-contracts, wave-1]

# Dependency graph
requires:
  - phase: 03-firecrawl-integration
    plan: 01
    provides: "vitest 3.2.4 runner + describe.skip skeletons for url/schema + committed Firecrawl v2 fixture (books.toscrape, A Light in the Attic, GBP/51.77)"
  - phase: 01-foundation-database
    provides: "Zod 4.3.6, tsconfig @/* alias, env.FIRECRAWL_API_KEY contract (unused here — Plan 03 consumes)"
provides:
  - "dealdrop/src/lib/firecrawl/types.ts — closed ScrapeFailureReason union (7 codes, compile-time exhaustiveness checked), ProductData shape (name/current_price/currency_code/image_url), ScrapeResult discriminated union"
  - "dealdrop/src/lib/firecrawl/url.ts — validateUrl (Zod + protocol allowlist + 2048 cap) and normalizeUrl (lowercase + strip utm_*/fbclid/gclid + preserve variants)"
  - "dealdrop/src/lib/firecrawl/schema.ts — PRODUCT_JSON_SCHEMA (Firecrawl v2 request literal), FirecrawlScrapeResponseSchema (Zod envelope), ProductDataSchema (final-sanity net), parseProductResponse (branch-ordered missing_name → missing_price → invalid_currency → unknown)"
  - "24 passing unit tests (12 url + 12 schema), 0 skipped in implementation files"
  - "Seam 1 (URL Entry Guard) and Seam 2 (Firecrawl Response Exit Guard) both closed end-to-end"
affects:
  - 03-03 (Plan 03 imports validateUrl, normalizeUrl, PRODUCT_JSON_SCHEMA, FirecrawlScrapeResponseSchema, parseProductResponse to compose scrapeProduct — this plan did the contract work so Plan 03 only owns HTTP + retry orchestration)
  - 03-04 (Plan 04 inherits the `server-only`-free types.ts and url.ts so the build-time guard regression test can confirm only scrape-product.ts fails on client import)
  - 04-product-ingestion (Phase 4 add-product form will reuse normalizeUrl for paste-time client-side dedupe, and the ScrapeFailureReason exact strings for toast map)
  - 06-cron-email (Phase 6 keys metrics on the exact 7 reason strings from D-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closed discriminated unions with compile-time exhaustiveness checks via the _Equal<X,Y> type trick — catches future drift of the reason-code contract at typecheck time, not runtime"
    - "Branch-ordered response validation (vs. one monolithic z.object) to preserve per-failure reason granularity for downstream toast/metric consumers"
    - "Server-only guard deferred to the module that actually reads secrets — types/url/schema remain pure and client-importable, keeping Phase 4 paste-dedupe optionality open"

key-files:
  created:
    - dealdrop/src/lib/firecrawl/types.ts
    - dealdrop/src/lib/firecrawl/url.ts
    - dealdrop/src/lib/firecrawl/schema.ts
  modified:
    - dealdrop/src/lib/firecrawl/url.test.ts (replaced skeleton describe.skip with 12-test suite)
    - dealdrop/src/lib/firecrawl/schema.test.ts (replaced skeleton describe.skip with 12-test suite)

key-decisions:
  - "Kept types in a separate types.ts rather than colocating in scrape-product.ts (03-PATTERNS.md recommended the latter) — justified by the closed-union exhaustiveness check, which is cleaner as a self-contained module with no runtime imports; also lets Phase 4 and Phase 6 type-import without a server-only guard even if future refactor adds one to scrape-product.ts"
  - "url.ts deliberately omits `import 'server-only'` — pure functions, no env access, matches 03-PATTERNS.md Pattern A row 3 and RESEARCH.md Pitfall 5 (client-safe reuse for Phase 4 paste-feedback)"
  - "Branch-ordered parseProductResponse lives in schema.ts (not scrape-product.ts per Plan 03) — keeps Plan 03's HTTP orchestration simple and matches the plan's explicit split in §Action"
  - "Comment `Do NOT add a detail field...` kept in types.ts verbatim from plan action, even though it causes `grep -c 'detail' types.ts` to return 1 instead of 0 — the comment's future-warning value outweighs the tripped grep (which would self-defeat on the plan's own verbatim text)"

patterns-established:
  - "Type-only module pattern: exports type (no runtime code) + a compile-time exhaustiveness const guarded by _Equal<X,Y>; any future consumer of ScrapeFailureReason gets TS-enforced closed-union guarantees without runtime cost"
  - "Nullable-field pattern for third-party JSON schemas: declare `type: ['string', 'null']` or `['number', 'null']` at the JSON Schema level AND handle the null branch at the parse layer (parseProductResponse converts empty/null image_url → null rather than treating as missing)"

requirements-completed:
  - TRACK-03
  - TRACK-05

# Metrics
duration: 38min
completed: 2026-04-20
---

# Phase 3 Plan 02: Type Contracts + URL + Schema Validation Summary

**Closed 7-reason ScrapeFailureReason union with compile-time exhaustiveness, Zod-backed validateUrl/normalizeUrl pure functions, and a branch-ordered parseProductResponse that maps Firecrawl v2 payloads to `{ok, data | reason}` — 24 passing unit tests, Seams 1 and 2 closed.**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-04-20T04:32:26Z
- **Completed:** 2026-04-20T05:10:33Z
- **Tasks:** 3 / 3
- **Files created/modified:** 5 (3 created, 2 modified)

## Accomplishments

- **Type contract finalized.** `ScrapeFailureReason` union is compile-time exhaustiveness-checked (via the `_Equal<X,Y>` type trick) against an explicit `_ExpectedReasons` duplicate — any future drift of the 7-code union fails typecheck with a clear error. `ProductData` shape matches the DB write contract exactly (name / current_price / currency_code / image_url) with `image_url: string | null` mirroring `products.image_url` nullability.
- **URL entry guard closed (Seam 1).** `validateUrl` chains Zod `.max(2048).url().refine(protocol allowlist)` and returns a discriminated union; `normalizeUrl` lowercases scheme+host, strips utm_*/fbclid/gclid, preserves variant params (sku=, variant=) verbatim, and is idempotent. 12 unit tests cover 7 reject paths + 5 normalization invariants.
- **Firecrawl response exit guard closed (Seam 2).** `PRODUCT_JSON_SCHEMA` is the exact `as const` literal sent to Firecrawl v2 `/scrape` under `formats: [{ type: 'json', schema }]` with all 4 fields nullable. `parseProductResponse` enforces the missing_name → missing_price → invalid_currency branch order so Phase 4 toasts and Phase 6 metrics get the correct granular reason, not a collapsed `invalid_response`. 12 unit tests replay the captured books.toscrape fixture as the happy baseline, then mutate per-failure-branch.

## Task Commits

Each task committed atomically:

1. **Task 1: types.ts with closed ScrapeFailureReason + ProductData + ScrapeResult** — `25f505e` (feat): Type-only module, 7-code union, `_Equal`-based exhaustiveness check, no `server-only` guard.
2. **Task 2: url.ts + filled url.test.ts** — `e227ea7` (feat): Pure-function module, Zod protocol allowlist, WHATWG URL normalization, 12 passing tests.
3. **Task 3: schema.ts + filled schema.test.ts** — `9dfc55b` (feat): JSON Schema literal, Zod envelope + product schema, branch-ordered parser, 12 passing tests against the live fixture.

**Plan metadata commit:** (final docs commit — captures this SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `dealdrop/src/lib/firecrawl/types.ts` — Closed ScrapeFailureReason + ProductData + ScrapeResult with compile-time exhaustiveness check
- `dealdrop/src/lib/firecrawl/url.ts` — validateUrl + normalizeUrl (pure functions, no server-only guard)
- `dealdrop/src/lib/firecrawl/schema.ts` — PRODUCT_JSON_SCHEMA + FirecrawlScrapeResponseSchema + ProductDataSchema + parseProductResponse
- `dealdrop/src/lib/firecrawl/url.test.ts` — 12 URL unit tests (replaced Plan 01 describe.skip skeleton)
- `dealdrop/src/lib/firecrawl/schema.test.ts` — 12 schema unit tests (replaced Plan 01 describe.skip skeleton)

## Decisions Made

See `key-decisions` in frontmatter. Three anchor points:
1. `types.ts` split out from `scrape-product.ts` — supersedes 03-PATTERNS.md's "do not create types.ts" recommendation because the exhaustiveness-check self-containment is cleaner and Phase 4/6 type-only imports are free either way.
2. `url.ts` deliberately omits `server-only` — aligns with 03-RESEARCH.md Pitfall 5 and 03-CONTEXT.md D-06 (client-side paste-feedback optionality).
3. Branch-ordered `parseProductResponse` lives in `schema.ts`, not `scrape-product.ts` — Plan 03 inherits only HTTP + retry orchestration.

## Why parseProductResponse Lives in schema.ts

Plan 03's `scrape-product.ts` wraps three seams: (a) validateUrl + normalizeUrl, (b) HTTP fetch with `AbortSignal.timeout` + retry-on-5xx, (c) response parsing. Keeping (c) inside `schema.ts` — alongside the request JSON schema and the response Zod envelope — means Plan 03's file stays focused on the network layer. A `scrape-product.ts` that ends up orchestrating 200 lines of branch-ordered field validation AND retry logic becomes hard to read; a `scrape-product.ts` that calls `parseProductResponse(data.json)` stays under 100 lines and is the single HTTP seam.

## Schema.ts Exports (for Plan 03)

```ts
import {
  PRODUCT_JSON_SCHEMA,           // send in request body
  FirecrawlScrapeResponseSchema, // safeParse the envelope
  parseProductResponse,          // convert data.json → ScrapeResult
} from './schema'
```

Plan 03's `scrapeProduct` composes these with validateUrl + normalizeUrl from `./url` and returns a `ScrapeResult` from `./types`.

## Compile-time Exhaustiveness Check

`types.ts` ends with:

```ts
type _ExhaustivenessCheck = _Equal<ScrapeFailureReason, _ExpectedReasons> extends true
  ? true
  : never
const _exhaustiveness: _ExhaustivenessCheck = true
```

If anyone adds an 8th reason to `ScrapeFailureReason` without updating `_ExpectedReasons`, `_Equal` returns `false`, `_ExhaustivenessCheck` becomes `never`, and the `const _exhaustiveness: never = true` assignment fails typecheck with: `Type 'true' is not assignable to type 'never'`. Build-time smoke test, zero runtime cost. Confirmed working via `npx tsc --noEmit` (EXIT=0) after each task.

## Deviations from Plan

### Minor — Plan action/acceptance-criteria self-contradiction in types.ts `detail` grep

- **Found during:** Task 1 acceptance verification.
- **Issue:** Plan §Action instructs writing types.ts verbatim including the warning comment `// Do NOT add a `detail` field to the failure branch (D-04 — no scraping internals leak to callers).`. Plan §Acceptance Criteria separately states `grep -c "detail" types.ts` must equal 0. These two instructions are mutually exclusive — verbatim action text trips the grep.
- **Fix:** Kept the plan's verbatim action text (future-warning value is real). The spirit of D-04 — no `detail` field on the failure return — is satisfied (`grep -c "reason:.*detail" types.ts` returns 0; `grep -c "detail:" types.ts` returns 0).
- **Files affected:** `dealdrop/src/lib/firecrawl/types.ts` (committed as-written).
- **Rationale:** This is a plan-authorship inconsistency, not an implementation choice. Flagging so Phase 7 polish (or a future planner review) can decide whether to tighten the grep to `grep -c "detail:" types.ts` or drop the warning comment.

### Minor — Plan action/acceptance-criteria self-contradiction in schema.ts `['string', 'null']` count

- **Found during:** Task 3 acceptance verification.
- **Issue:** Plan §Acceptance Criteria: `grep -c "\\['string', 'null'\\]" schema.ts` ≥ 4. Plan §Action text has 3 fields as `['string', 'null']` and `current_price` as `['number', 'null']`. The "all 4 fields declared nullable" intent is met but the specific grep pattern only matches 3 (string-typed) fields.
- **Fix:** Kept the plan's verbatim action text (the `current_price` field correctly uses `['number', 'null']` — any other value would be a bug). Documented so downstream verifier understands the 3/4 count is correct.
- **Files affected:** `dealdrop/src/lib/firecrawl/schema.ts` (committed as-written).
- **Rationale:** Intent over exact grep — all 4 fields are nullable at the JSON Schema level (3× `['string', 'null']` + 1× `['number', 'null']`). Counting the `'null'` string literal alone returns 4 matches across the four `type: [...]` lines.

---

**Total deviations:** 2 (both are plan-authorship inconsistencies between §Action and §Acceptance Criteria, not implementation choices). Zero scope creep; zero behavioral divergence from the plan's intent.
**Impact on plan:** None. All behavior matches spec; only verification greps would spuriously fail.

## Issues Encountered

- **Pre-existing working-tree pollution remains.** Same rsync-duplicate `* 2.*` files and untracked `.claude/`/`AGENTS.md`/etc. noted in the Plan 01 summary. My staging was strict (explicit file args, never `git add .`), so only task files landed in commits. Out of scope — will need a hygiene pass at some point but not here.
- **No test framework regression.** `vitest run src/lib/firecrawl` exits 0 (24 passing, 1 skipped file for Plan 03 scrape-product). `npm run build` exits 0 (Next.js 16 production build succeeds).

## Regression Smoke (post-plan)

Executed from `dealdrop/`:

| Command                                           | Exit | Notes                                                                                             |
|---------------------------------------------------|------|---------------------------------------------------------------------------------------------------|
| `npx vitest run src/lib/firecrawl/url.test.ts`    | 0    | 12 passing                                                                                        |
| `npx vitest run src/lib/firecrawl/schema.test.ts` | 0    | 12 passing                                                                                        |
| `npx vitest run src/lib/firecrawl`                | 0    | 24 passing (12 url + 12 schema), 1 file skipped (scrape-product — Plan 03 fills)                  |
| `npx tsc --noEmit`                                | 0    | Clean — compile-time exhaustiveness check passes                                                  |
| `npm run build`                                   | 0    | Next.js production build succeeds; types.ts/url.ts/schema.ts tree-shaken (not imported by pages)  |
| `npx eslint src/lib/firecrawl/`                   | 0    | Clean on new files                                                                                |

## Requirements Closed

- **TRACK-03 (URL format validation with Zod)** — Closed by `url.ts` `validateUrl` (Zod `.max(2048).url().refine(protocol allowlist)`) + 7 rejection tests covering empty, ftp://, javascript:, file://, >2048 chars, malformed. Verified in url.test.ts.
- **TRACK-05 (null/missing fields reject with user-facing error)** — Closed by `schema.ts` `parseProductResponse` branch-ordered checks + 11 schema.test.ts branch cases (missing_name null/whitespace, missing_price null/zero/negative, invalid_currency dollar/lowercase/too-long, branch-order deterministic).

## Commands for Downstream Plans

Import contract for Plan 03 `scrape-product.ts`:

```ts
import { validateUrl, normalizeUrl } from './url'
import {
  PRODUCT_JSON_SCHEMA,
  FirecrawlScrapeResponseSchema,
  parseProductResponse,
} from './schema'
import type { ScrapeResult, ScrapeFailureReason, ProductData } from './types'
```

Run the test slice after Plan 03 adds scrape-product.test.ts:

```bash
cd dealdrop && npx vitest run src/lib/firecrawl
```

## User Setup Required

None — no external service configuration, no new env vars. All tests run offline against the committed fixture.

## Next Phase Readiness

**Plan 03-03 (Wave 2) unblocked.** The three contract files are committed and green; Plan 03 only needs to:
1. Add `import 'server-only'` to `scrape-product.ts`
2. Compose validateUrl + normalizeUrl + fetch + parseProductResponse into the orchestrated `scrapeProduct(url)` function
3. Fill in `scrape-product.test.ts` (`describe.skip` skeleton from Plan 01) with the Seam 3 mocked-fetch cases (200 happy / 503-retry / 429 / 400 / timeout / network-error)

No blockers or concerns carried forward. Wave 1 target files all exist and pass tsc + vitest + build + eslint.

## Self-Check

Files verified present:
- FOUND: `dealdrop/src/lib/firecrawl/types.ts`
- FOUND: `dealdrop/src/lib/firecrawl/url.ts`
- FOUND: `dealdrop/src/lib/firecrawl/schema.ts`
- FOUND: `dealdrop/src/lib/firecrawl/url.test.ts` (replaced skeleton)
- FOUND: `dealdrop/src/lib/firecrawl/schema.test.ts` (replaced skeleton)

Commits verified present (`git log --oneline`):
- FOUND: `25f505e` — feat(03-02): add firecrawl types.ts with closed ScrapeFailureReason union
- FOUND: `e227ea7` — feat(03-02): add URL validation + normalization with 12 unit tests
- FOUND: `9dfc55b` — feat(03-02): add Firecrawl JSON schema + branch-ordered response parser

Test gates:
- `npx vitest run src/lib/firecrawl` → 24 passed, 0 failed (scrape-product skeleton still skipped per plan)
- `npx tsc --noEmit` → EXIT=0 (exhaustiveness check passes)
- `npm run build` → EXIT=0

## Self-Check: PASSED

---
*Phase: 03-firecrawl-integration*
*Plan: 02 (Wave 1)*
*Completed: 2026-04-20*
