---
phase: 03-firecrawl-integration
plan: 01
subsystem: testing
tags: [vitest, firecrawl, fixtures, test-infrastructure, wave-0]

# Dependency graph
requires:
  - phase: 01-foundation-database
    provides: "FIRECRAWL_API_KEY in dealdrop/.env.local (via FND-02 env template), tsconfig @/* path alias"
provides:
  - dev-deps:vitest@3.2.4
  - dev-deps:@vitest/coverage-v8@3.2.4
  - test-config:dealdrop/vitest.config.ts (node env, @→./src alias, include src/**/*.test.ts)
  - npm-scripts:test (vitest run), test:watch (vitest)
  - test-skeleton:dealdrop/src/lib/firecrawl/url.test.ts (describe.skip — Plan 02 fills)
  - test-skeleton:dealdrop/src/lib/firecrawl/schema.test.ts (describe.skip — Plan 02 fills)
  - test-skeleton:dealdrop/src/lib/firecrawl/scrape-product.test.ts (describe.skip — Plan 03 fills)
  - fixture:dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json (live v2 /scrape response, 4-field product schema)
  - assumption-closure:A1 currency-symbol→ISO (PASS, £→GBP)
  - assumption-closure:A2 price-as-number (PASS, 51.77 as JSON number)
  - assumption-closure:A5 product_image_url shape (PASS — string URL observed; downstream schema must accept string | null)
affects:
  - 03-02 (Plan 02 consumes skeletons + fixture for URL/schema branch tests)
  - 03-03 (Plan 03 consumes scrape-product.test.ts skeleton + fixture for mocked-fetch tests)
  - 03-04 (Plan 04 inherits vitest config for build-time guard regression test)

# Tech tracking
tech-stack:
  added:
    - "vitest 3.2.4 (devDependency, ^3.2.4 pin)"
    - "@vitest/coverage-v8 3.2.4 (devDependency)"
  patterns:
    - "Vitest config mirrors tsconfig.json path alias (@ → ./src) so test-time and src-time imports resolve identically"
    - "Committed live API fixtures under __fixtures__/ for deterministic mocked-fetch tests (no network in test suite)"
    - "describe.skip() skeletons preserve file structure while awaiting implementation (prevents 'no tests found' noise)"
    - "Secret-load pattern for one-shot captures: set -a; source .env.local; set +a (keeps key out of shell history; Threat T-3-01 mitigated)"

key-files:
  created:
    - dealdrop/vitest.config.ts
    - dealdrop/src/lib/firecrawl/url.test.ts
    - dealdrop/src/lib/firecrawl/schema.test.ts
    - dealdrop/src/lib/firecrawl/scrape-product.test.ts
    - dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json
  modified:
    - dealdrop/package.json
    - dealdrop/package-lock.json

key-decisions:
  - "Target URL changed from Amazon B08N5WRWNW to books.toscrape.com/a-light-in-the-attic — Amazon returned HTTP 404 on the original target; books-to-scrape is an intentional scraping sandbox with zero bot-block risk, real HTTP 200 HTML, and all four schema fields populate with real values"
  - "Fixture committed with cacheState: hit and creditsUsed: 5 intact — preserves the exact on-the-wire shape for downstream replay; no stripping/redaction needed (no secrets reflected back)"
  - "Vitest config kept minimal (no coverage block, no reporters, no setupFiles) — Phase 7 polish can extend; Wave 0 only needs the environment + alias"
  - "describe.skip() chosen over empty describe() or deferred file creation because Plan 02/03 will use Edit (requires prior Read) rather than Write, so skeletons must already exist as valid TypeScript"

patterns-established:
  - "Wave 0 fixture-first testing: capture one live third-party response before writing any validation code, so branch tests replay known-real payload shapes instead of hand-crafted guesses"
  - "Path alias parity: vitest resolve.alias must exactly match tsconfig compilerOptions.paths to prevent test-vs-src drift"

requirements-completed:
  - TRACK-03
  - TRACK-04
  - TRACK-05

# Metrics
duration: 2h 2min
completed: 2026-04-19
---

# Phase 3 Plan 01: Wave 0 Test Infrastructure Summary

**Vitest 3.2.4 installed with node env + `@` → `./src` alias, three describe.skip skeletons for url/schema/scrape-product, and one committed live Firecrawl v2 /scrape response fixture closing research assumptions A1, A2, A5.**

## Performance

- **Duration:** ~2h 2min (17:31 → 19:33 local)
- **Started:** 2026-04-19T12:01:57Z (Task 1 commit `ca20b3e`)
- **Completed:** 2026-04-19T14:03:31Z (Task 3 commit `a0d38f1`)
- **Tasks:** 3 / 3
- **Files created/modified:** 7 (2 modified, 5 created)

## Accomplishments

- Vitest test runner wired end-to-end: `cd dealdrop && npx vitest run src/lib/firecrawl` exits 0 with 3 skipped suites.
- Live Firecrawl v2 /scrape payload captured, committed, and shape-verified via `jq -e` — downstream plans can `import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'` without any network call at test time.
- Three research assumptions closed with real data (details in Assumption Closure below), unblocking Plan 02 schema work.

## Task Commits

Each task committed atomically:

1. **Task 1: Install Vitest + config** — `ca20b3e` (chore): `vitest@^3.2.4` + `@vitest/coverage-v8@^3.2.4` devDeps, `test` / `test:watch` npm scripts, `vitest.config.ts` with node env and `@` → `./src` alias.
2. **Task 2: Skeleton test files** — `bbc1659` (test): `url.test.ts`, `schema.test.ts`, `scrape-product.test.ts` each importing `describe` from `'vitest'` and holding exactly one `describe.skip(...)` block keyed to 03-VALIDATION.md's three seams.
3. **Task 3: Live Firecrawl fixture capture** — `a0d38f1` (feat): `__fixtures__/firecrawl-v2-scrape-response.json` (2104 bytes) with `success: true`, four-field `data.json` populated, and metadata confirming `statusCode: 200`.

**Plan metadata commit:** (final docs commit — captures this SUMMARY + STATE + ROADMAP)

## Captured Fixture Shape

Real payload from the live curl call (books.toscrape target). Downstream validation and mock tests MUST match these field types:

| Field               | Type   | Example value                                                                                                         |
|---------------------|--------|-----------------------------------------------------------------------------------------------------------------------|
| `success`           | bool   | `true`                                                                                                                |
| `data.metadata.statusCode` | number | `200`                                                                                                                 |
| `data.json.product_name`   | string | `"A Light in the Attic"`                                                                                              |
| `data.json.current_price`  | number | `51.77` (JSON number, NOT a formatted string)                                                                         |
| `data.json.currency_code`  | string | `"GBP"` (3-letter ISO 4217, inferred from `£` — confirms LLM extraction works)                                        |
| `data.json.product_image_url` | string \| null | `"https://books.toscrape.com/media/cache/fe/72/fe72f0532301ec28892ae79a629a293c.jpg"` (string URL in this capture) |

## Assumption Closure (Research §Assumptions A1/A2/A5)

| ID | Assumption                                       | Outcome | Evidence                                                                                  |
|----|--------------------------------------------------|---------|-------------------------------------------------------------------------------------------|
| A1 | Firecrawl LLM infers ISO 4217 code from symbol   | PASS    | `£` sign on page → `"currency_code": "GBP"` (3-letter uppercase)                          |
| A2 | `current_price` returns as a JSON number         | PASS    | `51.77` — `jq -e '.data.json.current_price \| type == "number"'` exits 0                  |
| A5 | `product_image_url` may be null                  | PASS (string URL observed) | Captured payload returned a string URL; downstream schema must still accept `string \| null` (non-empty image on this target does not prove the null branch is unreachable — Plan 02 covers it with a unit-test branch). |

Implication for Plan 02: `schema.ts` can type `current_price: z.number().positive()` without a string-coercion branch, and `currency_code: z.string().regex(/^[A-Z]{3}$/)`. `product_image_url` stays `z.string().url().nullable()`.

## Decisions Made

See `key-decisions` in frontmatter. Highlights:
- Target URL swap (Amazon 404 → books.toscrape sandbox) — preserves fixture realism while unblocking capture.
- Minimal `vitest.config.ts` — no coverage/reporters/setupFiles yet; Phase 7 polish extends it.
- `describe.skip()` over empty `describe()` — future Edit-based modifications from Plan 02/03 require the files to already exist as valid TS.

## Deviations from Plan

### Rule 3 — Blocking: Target URL swap (Amazon → books.toscrape)

- **Found during:** Task 3 (human-action checkpoint).
- **Issue:** The research-planned target `https://www.amazon.com/dp/B08N5WRWNW` returned HTTP 404 ("Looking for something?" error page) — the ASIN appears to be deprecated/delisted. A stale target breaks the "real HTTP 200 payload" guarantee that the fixture relies on.
- **Fix:** Re-ran curl against `https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html` — Firecrawl's intentional sandbox test target, zero bot-block risk, real HTTP 200 HTML, all four schema fields populate.
- **Files modified:** `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` (committed with the replacement payload).
- **Verification:** `jq -e '.success == true and (.data.json.current_price | type == "number") and (.data.json.currency_code | test("^[A-Z]{3}$"))'` exits 0; `grep -c "fc-" fixture` returns 0 (no Bearer token leak — T-3-01 mitigation held).
- **Committed in:** `a0d38f1` (Task 3 commit).
- **Rationale:** Fixture realism is preserved (it's still a live API response, not synthetic). Assumption validity is unaffected — A1/A2/A5 test the Firecrawl LLM's extraction contract, not Amazon-specific DOM. Downstream Plan 03 mocked-fetch tests consume the payload shape, not the URL.

### Rule 2 — Missing Critical (planner-addressed at commit time): Fixture-only atomic commit

- **Found during:** Task 3 pre-commit hygiene check.
- **Issue:** The working tree contains pre-existing untracked pollution (rsync-duplicate `* 2.*` files, new `.claude/` tooling, `dealdrop/.env.local` from FND-02). A naive `git add .` would stage those alongside the fixture.
- **Fix:** Staged the fixture file explicitly via `gsd-tools.cjs commit ... --files dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` — atomic single-file commit.
- **Verification:** `git show --stat a0d38f1` reports exactly 1 file changed, 30 insertions, 0 deletions.
- **Committed in:** `a0d38f1`.

---

**Total deviations:** 2 (1 Rule 3 blocking, 1 Rule 2 hygiene). Both necessary; zero scope creep.
**Impact on plan:** Task 3 acceptance criteria fully met with the replacement target. All three Wave 0 must-haves (vitest wired, fixture captured, skeletons committed) landed on schedule.

## Issues Encountered

- **Pre-existing lint noise out of scope:** `npm run lint` exits 1 on the working tree (158 errors, 52 warnings), but every single error originates in either `dealdrop/.claude/hooks/*.js` (GSD tooling, tracked from Phase 1), `dealdrop/.claude/get-shit-done/bin/**` (CLI vendored files), or the rsync-duplicate `dealdrop/app/layout 2.tsx` / `components 2.json` / etc. (untracked). **No error comes from any file in Task 1/2/3.** Our commits touched `package.json`, `vitest.config.ts`, three `*.test.ts` skeletons, and one `.json` fixture — none of which can produce ESLint errors. Per execution scope boundary: out-of-scope, logged here for visibility. Phase 7 polish should add `.claude/**` to `eslint.config.mjs` globalIgnores and purge the `* 2.*` rsync duplicates.

## Regression Smoke (post-plan)

Executed from `dealdrop/`:

| Command                             | Exit | Notes                                                                                                                              |
|-------------------------------------|------|------------------------------------------------------------------------------------------------------------------------------------|
| `npm run lint`                      | 1    | Pre-existing errors only (see Issues Encountered); zero regressions introduced by Plan 03-01. No tracked src/ file added a new error. |
| `npm run build`                     | 0    | Next.js 16 production build succeeds; 3 routes compiled; fixture JSON does not break the build (not imported by any build graph yet). |
| `npx vitest run src/lib/firecrawl`  | 0    | 3 test files, all 3 skipped suites, 0 tests, 0 failures. Vitest 3.2.4 confirmed in banner.                                           |

## Commands for Downstream Plans

Run the firecrawl test slice only (Plan 02/03 will add real tests here):

```bash
cd dealdrop && npx vitest run src/lib/firecrawl
```

Load the captured fixture in tests (Plan 03 will import this in `scrape-product.test.ts`):

```ts
import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'
// fixture.success === true
// fixture.data.json.current_price // 51.77 (number)
// fixture.data.json.currency_code // "GBP"
```

## User Setup Required

None — FIRECRAWL_API_KEY was already provisioned in Phase 1 (FND-02, `dealdrop/.env.local`); Task 3 consumed it via `set -a; source dealdrop/.env.local; set +a` without inlining.

## Next Phase Readiness

**Plan 03-02 (Wave 1) unblocked.** The skeleton test files are ready for Edit-based fill-in, the fixture is ready for import, and vitest wiring is verified clean. Specifically:

- `url.test.ts` → Plan 02 fills per 03-VALIDATION.md §Seam 1 (URL entry guard).
- `schema.test.ts` → Plan 02 fills per §Seam 2 (Firecrawl response exit guard) — A1/A2/A5 outcomes mean no string-coercion branch is required for `current_price`.
- `scrape-product.test.ts` → Plan 03 fills per §Seam 3 (network layer timeout/retry) using the committed fixture for the success-branch mock.

No blockers or concerns carried forward.

## Self-Check

Files verified present:
- FOUND: `dealdrop/vitest.config.ts`
- FOUND: `dealdrop/src/lib/firecrawl/url.test.ts`
- FOUND: `dealdrop/src/lib/firecrawl/schema.test.ts`
- FOUND: `dealdrop/src/lib/firecrawl/scrape-product.test.ts`
- FOUND: `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` (2104 bytes)

Commits verified present (`git log --oneline`):
- FOUND: `ca20b3e` — chore(03-01): install vitest and add test scripts
- FOUND: `bbc1659` — test(03-01): add skeleton test files for firecrawl url, schema, scrape-product
- FOUND: `a0d38f1` — feat(03-01): capture live Firecrawl v2 scrape response fixture

Fixture schema gate (jq -e): PASS
Secret-leak gate (grep -c "fc-"): PASS (0 matches)

## Self-Check: PASSED

---
*Phase: 03-firecrawl-integration*
*Plan: 01 (Wave 0)*
*Completed: 2026-04-19*
