---
phase: 03-firecrawl-integration
plan: 04
subsystem: scraping
tags: [firecrawl, server-only, bundle-safety, env-split, t-3-01, wave-3]

# Dependency graph
requires:
  - phase: 03-firecrawl-integration
    plan: 03
    provides: "scrapeProduct(url) with `import 'server-only'` line 1; 40 passing Firecrawl tests"
provides:
  - "Operational proof that Next.js 16 Turbopack's `server-only` guard rejects compilation when scrape-product is imported from a `'use client'` file"
  - "Post-refactor proof that NO Firecrawl API-key VALUE (`fc-…` prefix) AND NO server env-var NAME (`FIRECRAWL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`) appears anywhere in `.next/static/**`"
  - "dealdrop/src/lib/env.server.ts — server-only guarded t3-oss/env-nextjs schema for all five server secrets"
  - "dealdrop/src/lib/env.ts — client-only schema (NEXT_PUBLIC_* block only)"
affects:
  - 04-product-ingestion (add-product Server Action must `import { env } from '@/lib/env.server'` when reading CRON_SECRET/RESEND_API_KEY; client-side pages continue using '@/lib/env' for NEXT_PUBLIC_ vars)
  - 05-email-integration (Resend module must import from env.server)
  - 06-cron-email (cron handler reads CRON_SECRET from env.server)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split env schema: server block lives in a dedicated `env.server.ts` guarded by `import 'server-only'`; client block stays in `env.ts`. The t3-oss/env-nextjs `createEnv` call in each file contains only the relevant schema half so server env-var NAMES are never imported from a module that could land in a client chunk. This is the belt-and-suspenders addition to the `server-only` runtime guard — if a server module is accidentally imported from a client boundary, the build fails (guard) AND the server var names were never there to leak (schema split)."
    - "Adversarial build test pattern: create a throwaway `'use client' + import { X } from '@/lib/.../X'` page under `app/`, run `npm run build`, assert non-zero exit AND `server-only` in stderr, then `rm -rf` the page and re-run build to prove the fail was import-driven not configuration-driven. Git state pre/post diff must be empty."

key-files:
  created:
    - dealdrop/src/lib/env.server.ts
  modified:
    - dealdrop/src/lib/env.ts
    - dealdrop/src/lib/supabase/admin.ts
    - dealdrop/src/lib/firecrawl/scrape-product.ts

key-decisions:
  - "Chose Option B (refactor env.ts) over Option A (accept name leak as non-secret). Env-var NAMES in a client bundle are an information-disclosure signal: they tell an attacker exactly which server-side secrets the app uses, narrowing attack surface reconnaissance and informing any attack that compromises a different layer (logs, repo leaks, endpoint enumeration). Splitting adds <30 lines of code, no runtime cost, and zero operational overhead — the T-3-01 mitigation is 'no server key material of any kind (value or name) in the client bundle.'"
  - "Kept import specifier `@/lib/env` semantically client-safe — every server-only module must explicitly import from `@/lib/env.server`. This surfaces intent at the import site and lets code review / future tooling lint for server-key usage on the client side. server.ts and browser.ts were intentionally NOT updated because they only read NEXT_PUBLIC_* vars; their existing `@/lib/env` import is correct."
  - "Plan 04's original `<how-to-verify>` referenced `dealdrop/src/app/_gsd-serveronly-test/page.tsx`, but this project's App Router root is `dealdrop/app/` (not `dealdrop/src/app/`) and Next.js 16 still treats underscore-prefixed top-level segments as private (which is actually fine for this test). The checkpoint used `dealdrop/app/gsd-serveronly-test/page.tsx` (no underscore) — the build still fails the import trace exactly as required, and the page.tsx is the only file needed. Documented as deviation below."

requirements-completed:
  - TRACK-04

# Metrics
duration: 8min
completed: 2026-04-20
---

# Phase 3 Plan 04: Bundle-Safety Regression Test + env.ts Split Refactor Summary

**Closed T-3-01 operational verification two ways: (1) an adversarial `'use client'` page that imports `scrapeProduct` still makes `npm run build` fail with the expected `server-only` error (production guard operative), AND (2) a post-refactor bundle grep confirms `.next/static/**` contains neither `fc-…` API-key material NOR the string `FIRECRAWL_API_KEY` (or any other server env-var name). The checkpoint surfaced a NAME-leak via `FIRECRAWL_API_KEY` appearing in a client chunk — root cause: the combined `env.ts` schema inlined server-block key names into any module that imported the universal `env`, which in turn was imported by `browser.ts` (a client-side file). User selected Option B — split env.ts into env.server.ts (server-only guarded) + env.ts (client-only). 40/40 Firecrawl tests still pass, tsc clean on src/, build green after cleanup, both grep counts are 0.**

## Performance

- **Duration:** ~8 min (refactor + re-test after checkpoint resume)
- **Started:** 2026-04-20T06:30:07Z
- **Completed:** 2026-04-20T06:38:14Z
- **Tasks:** 1 / 1 (Task 1 — adversarial build + bundle-safety verification, completed post-refactor)
- **Files created/modified:** 4 (1 created: env.server.ts; 3 modified: env.ts, admin.ts, scrape-product.ts)

## Accomplishments

- **Root cause of the NAME leak identified at the checkpoint.** Before the refactor, `dealdrop/src/lib/env.ts` held BOTH the server and client `createEnv` blocks. The `@t3-oss/env-nextjs` `createEnv` call captures the server-block key names inside the module's own code paths (for the not-safe-on-client getter that throws at runtime). When `browser.ts` (a client-side Supabase factory) imported `{ env }` from `@/lib/env`, the entire server-block identifier set traveled with it into the client chunk. That is why the original bundle grep — even with `scrape-product.ts` guarded by `server-only` — found `FIRECRAWL_API_KEY` as a string literal in `.next/static/**`.
- **Env schema split implemented.** Created `dealdrop/src/lib/env.server.ts` with `import 'server-only'` line 1 and the FIVE server vars (SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET). Shrunk `dealdrop/src/lib/env.ts` to the TWO NEXT_PUBLIC_* vars only. `createEnv` in each file carries only its half of the schema, so server key NAMES are physically absent from any module that a client file could reach.
- **Server-side consumers re-pointed to env.server.** `supabase/admin.ts` now imports `clientEnv` from `@/lib/env` (for NEXT_PUBLIC_SUPABASE_URL) and `serverEnv` from `@/lib/env.server` (for SUPABASE_SERVICE_ROLE_KEY). `firecrawl/scrape-product.ts` imports `env` from `@/lib/env.server` (for FIRECRAWL_API_KEY). `supabase/server.ts` and `supabase/browser.ts` only read NEXT_PUBLIC_* vars and correctly kept their `@/lib/env` import.
- **Adversarial build still fails as expected.** After refactor, re-created `dealdrop/app/gsd-serveronly-test/page.tsx` with `'use client' + import { scrapeProduct } from '@/lib/firecrawl/scrape-product'`, ran `npm run build`, got EXIT=1 with 4 errors from Turbopack — TWO `server-only` guards fired simultaneously (one from `scrape-product.ts` line 1, one from the newly-added `env.server.ts` line 1). This is the refactor paying for itself: belt (scrape-product guard) AND suspenders (env.server guard) both trigger.
- **Cleanup verified.** `rm -rf dealdrop/app/gsd-serveronly-test` then `git status --short --untracked-files=all` → identical to pre-test snapshot (diff exit 0). No throwaway file leaked into the repo.
- **Clean build green.** `npm run build` after cleanup → EXIT=0. 5 routes compiled, SSG generation succeeded.
- **Bundle grep counts both 0.** Post-refactor, `grep -rnE "fc-[a-zA-Z0-9]{16,}" dealdrop/.next/static/` → 0 matches, `grep -rn "FIRECRAWL_API_KEY" dealdrop/.next/static/` → 0 matches. Extended check — `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` all 0 matches.
- **40/40 Firecrawl tests still pass.** `npx vitest run src/lib/firecrawl` → 3 files, 40 passed, 0 failed, 189ms. No behavioral regression from the env split (the pre-existing vitest alias pattern — `server-only` → `empty.js` — carries over to `env.server.ts` unchanged because the alias is package-global).

## Build-Error Evidence (Step C — Adversarial Build)

First 20 lines of `npm run build` stderr after introducing the `'use client'` test page:

```
> dealdrop@0.1.0 build
> next build

▲ Next.js 16.2.4 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...

> Build error occurred
Error: Turbopack build failed with 4 errors:
./src/lib/env.server.ts:1:1
You're importing a module that depends on "server-only". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
    Learn more: https://nextjs.org/docs/app/building-your-application/rendering/server-components
> 1 | import 'server-only'
  |   ^^^^^^^^^^^^^^^^^^^^
  2 | // MUST be the first line — throws at bundle time if imported into a Client Component.
  3 | // Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
  4 | //
```

Full import trace captured (both Client Browser and Client SSR traces include the path `env.server.ts → scrape-product.ts → gsd-serveronly-test/page.tsx`). Final exit code: **1 (non-zero — expected)**.

## Cleanup Diff Evidence (Step D)

```
$ diff /tmp/gsd-pre-test-state-v2.txt /tmp/gsd-post-cleanup-state-v2.txt
$ echo $?
0
```

Empty diff, exit 0. The throwaway `dealdrop/app/gsd-serveronly-test/` directory does NOT exist in git state after cleanup.

## Clean Build Evidence (Step E)

```
$ cd dealdrop && npm run build
> dealdrop@0.1.0 build
> next build

▲ Next.js 16.2.4 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
✓ Compiled successfully in 1414ms
  Running TypeScript ...
  Finished TypeScript in 1058ms ...
  Collecting page data using 6 workers ...
✓ Generating static pages using 6 workers (5/5) in 175ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
└ ƒ /auth/callback

ƒ Proxy (Middleware)

$ echo $?
0
```

## Bundle Grep Evidence (Step F — Positive Bundle Check)

```
$ cd dealdrop
$ grep -rnE "fc-[a-zA-Z0-9]{16,}" .next/static/ 2>/dev/null | head -5
(no output)
$ FC_COUNT=$(grep -rE "fc-[a-zA-Z0-9]{16,}" .next/static/ 2>/dev/null | wc -l | tr -d ' ')
$ echo "fc- matches: $FC_COUNT"
fc- matches: 0

$ grep -rn "FIRECRAWL_API_KEY" .next/static/ 2>/dev/null | head -5
(no output)
$ KEY_NAME_COUNT=$(grep -rc "FIRECRAWL_API_KEY" .next/static/ 2>/dev/null | awk -F: '{sum+=$2} END{print sum+0}')
$ echo "FIRECRAWL_API_KEY matches: $KEY_NAME_COUNT"
FIRECRAWL_API_KEY matches: 0
```

Extended server-name sweep (not required by plan; added as follow-through safety check):

```
$ for NAME in SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY RESEND_FROM_EMAIL CRON_SECRET; do
    COUNT=$(grep -rc "$NAME" .next/static/ 2>/dev/null | awk -F: '{sum+=$2} END{print sum+0}')
    echo "$NAME: $COUNT matches"
  done
SUPABASE_SERVICE_ROLE_KEY: 0 matches
RESEND_API_KEY: 0 matches
RESEND_FROM_EMAIL: 0 matches
CRON_SECRET: 0 matches
```

All five server env-var names are now absent from the client bundle.

## Task Commits

1. **Refactor commit:** `750a9cd` (refactor): split env.ts into env.server.ts + env.ts. Four files touched: one created (env.server.ts), three modified (env.ts, supabase/admin.ts, firecrawl/scrape-product.ts). Commit message explicitly links the split to the T-3-01 belt-and-suspenders posture.

No source commit for the adversarial test itself — the test is verification-only, with all intermediate files deleted before the summary commit (by design, per plan `files_modified: []`).

## Files Created/Modified

- **Created** `dealdrop/src/lib/env.server.ts` — 30 lines. Line 1 = `import 'server-only'`. `createEnv({ server: {...}, runtimeEnv: {...} })` with the five server vars only. No client block.
- **Modified** `dealdrop/src/lib/env.ts` — shrunk from 29 lines (server+client combined) to 27 lines (client-only). `createEnv({ client: {...}, runtimeEnv: {...} })` with NEXT_PUBLIC_* only. Docblock explains the import rule for downstream consumers.
- **Modified** `dealdrop/src/lib/supabase/admin.ts` — replaced `import { env } from '@/lib/env'` with two named imports (`clientEnv` from `@/lib/env`, `serverEnv` from `@/lib/env.server`). `createClient` call body swapped to the two-prefixed form.
- **Modified** `dealdrop/src/lib/firecrawl/scrape-product.ts` — single line change: `import { env } from '@/lib/env.server'` (was `'@/lib/env'`). Everything else in the 179-line file is unchanged.

## `head -1` Verification

```
$ head -1 dealdrop/src/lib/env.server.ts
import 'server-only'
$ head -1 dealdrop/src/lib/firecrawl/scrape-product.ts
import 'server-only'
$ head -1 dealdrop/src/lib/supabase/admin.ts
import 'server-only'
```

Three server-only modules, three matching line-1 guards.

## Decisions Made

See `key-decisions` in frontmatter.

1. **Refactor chosen over "accept name leak"** — env-var NAMES are reconnaissance signal, and the fix is <30 lines.
2. **Two-prefixed import in admin.ts (not merged import)** — explicit `clientEnv` / `serverEnv` naming makes the security boundary legible at the call site.
3. **Throwaway test folder name** — used `gsd-serveronly-test` (no underscore) rather than the plan's `_gsd-serveronly-test`. Both work (underscore = private segment, which is fine for this test), but sticking to the project's existing convention (see STATE.md: underscore-prefixed folders bit Phase 1 Plans 04+05) keeps the test aligned with real-world page creation. Plan path `src/app/` was also corrected to `app/` to match this project's actual App Router root.

## Deviations from Plan

### Checkpoint-driven refactor (Option B) — user-approved architectural change

- **Found during:** initial Task 1 execution (pre-checkpoint run).
- **Issue:** `npm run build` exited 0 with `fc-…` count = 0 but `FIRECRAWL_API_KEY` count > 0 in `.next/static/**`. The plan's success-criteria required BOTH grep counts to be 0 — plan fails strictly.
- **Rule:** Rule 4 — architectural change (split env schema across files, touch three additional source modules). Checkpoint returned; user selected Option B (refactor).
- **Fix:** Split `env.ts` into `env.server.ts` + `env.ts`; re-point `admin.ts` and `scrape-product.ts` to `env.server`.
- **Files modified:** `dealdrop/src/lib/env.ts` (-2 lines), `dealdrop/src/lib/env.server.ts` (+30 lines, new), `dealdrop/src/lib/supabase/admin.ts` (+2 / -1), `dealdrop/src/lib/firecrawl/scrape-product.ts` (+1 / -1).
- **Verification:** Re-ran adversarial build (EXIT=1, `server-only` fired), cleanup (git diff empty), clean build (EXIT=0), bundle grep both 0.
- **Committed in:** `750a9cd`.
- **Rationale:** The T-3-01 threat posture is "no server key material in the client bundle." Whether the client sees the VALUE or just the NAME, that posture is broken. The name-leak is a reconnaissance signal: it tells a post-compromise attacker which server secrets the app consumes, informing lateral movement. Splitting the schema is cheap (<30 lines, no runtime cost) and gives defense-in-depth: (a) `server-only` guard on each server module stops import; (b) `env.server.ts` physically quarantines the server key NAMES from any file a client import could reach; (c) the new `env.server.ts` also has its own `import 'server-only'` line 1 — catches violations in source even if downstream consumers forget.

### Plan path correction — `src/app/` → `app/`

- **Found during:** initial Task 1 Step B.
- **Issue:** Plan specified `dealdrop/src/app/_gsd-serveronly-test/page.tsx`. This project's App Router root is `dealdrop/app/` (not `dealdrop/src/app/`); `dealdrop/src/` contains only `lib/`, `actions/`, `components/`, `types/`. Creating under `src/app/` would have Next.js ignore the page entirely, giving a false-negative (clean build even though `scrape-product.ts` was imported by a non-routed file — because Next.js wouldn't have seen the file).
- **Rule:** Rule 3 — blocking issue, fixed inline.
- **Fix:** Used `dealdrop/app/gsd-serveronly-test/page.tsx` (no underscore; not strictly required but consistent with project patterns).
- **Files modified:** none persistent (test file was deleted as required by plan).
- **Rationale:** The plan's file-path spec was stale. The adversarial test is only meaningful if Next.js actually compiles the client page — which requires the page to live under the real App Router root.

## Threat Flags

None. This plan did not introduce new trust-boundary surface — it tightened an existing one (env schema split narrows client-bundle surface, doesn't add to it).

## Issues Encountered

- **Pre-existing tsc noise.** `npx tsc --noEmit` emits errors from `.next/types/cache-life.d 2.ts`, `routes.d 2.ts`, etc. — these are rsync-duplicate files from pre-existing working-tree pollution (noted in Plan 01, 02, 03 summaries; out of scope for Phase 3). `src/` errors: 0. The pre-existing `eslint.config.mjs`-flagged files (also rsync duplicates) remain out of scope.
- **z.string().url() deprecation hint.** `dealdrop/src/lib/env.ts:19` emits a TypeScript "deprecated" hint on `z.string().url()`. This is a pre-existing warning carried over from the original env.ts (line 14 of the pre-refactor file used the same API) — out of scope per scope-boundary rule (not caused by the current task).

## Regression Smoke (post-plan)

Executed from `dealdrop/`:

| Command                                              | Exit | Notes                                                                                             |
|------------------------------------------------------|------|---------------------------------------------------------------------------------------------------|
| `npx tsc --noEmit` (src/ filter)                     | 0    | Zero errors in `src/`; `.next/types/*.d 2.ts` / `.d 3.ts` are pre-existing rsync duplicates       |
| `npx vitest run src/lib/firecrawl`                   | 0    | 40 passed (12 url + 12 schema + 16 scrape-product), 0 skipped, 189ms                              |
| `npx eslint src/lib/env.ts src/lib/env.server.ts src/lib/supabase/admin.ts src/lib/firecrawl/scrape-product.ts` | 0 | Clean on all four touched files                                                                   |
| `npm run build` (adversarial — test page present)    | 1    | FAILS as expected with 4 `server-only` errors; import trace references `scrape-product.ts` AND `env.server.ts` |
| `npm run build` (clean — test page deleted)          | 0    | 5 routes compiled; static generation succeeded                                                    |
| `grep -rE "fc-[a-zA-Z0-9]{16,}" .next/static/`       | —    | 0 matches                                                                                         |
| `grep -rc "FIRECRAWL_API_KEY" .next/static/`         | —    | 0 matches                                                                                         |
| `grep -rc "SUPABASE_SERVICE_ROLE_KEY" .next/static/` | —    | 0 matches                                                                                         |
| `grep -rc "RESEND_API_KEY" .next/static/`            | —    | 0 matches                                                                                         |
| `grep -rc "RESEND_FROM_EMAIL" .next/static/`         | —    | 0 matches                                                                                         |
| `grep -rc "CRON_SECRET" .next/static/`               | —    | 0 matches                                                                                         |

## Success Criteria Closure

From 03-04-PLAN.md `<success_criteria>` and resume-prompt `<success_criteria>`:

- ✅ **`npm run build` FAILS when `'use client'` imports `scrapeProduct`** — exit 1 with `server-only` error referencing both `scrape-product.ts` and `env.server.ts`.
- ✅ **`npm run build` SUCCEEDS after cleanup** — exit 0.
- ✅ **`.next/static/**` contains NO Firecrawl API key material** — `fc-` regex 0 matches.
- ✅ **`.next/static/**` contains NO `FIRECRAWL_API_KEY` string** — 0 matches (post-refactor).
- ✅ **Git state after the plan matches git state before the plan** — diff empty, exit 0.
- ✅ **SUMMARY.md records the build-error snippet, the cleanup diff, and the grep counts** — all above.
- ✅ **env.ts split into env.server.ts (server-only guarded) + env.ts (client-only)** — done; `750a9cd`.
- ✅ **All call sites updated to import from the correct module** — admin.ts + scrape-product.ts updated; server.ts + browser.ts were already correct (NEXT_PUBLIC_* only).
- ✅ **`npx tsc --noEmit` exits 0 on src/** — zero errors in src/.
- ✅ **`npx vitest run src/lib/firecrawl` exits 0 (40 tests still passing)** — 40/40, 189ms.
- ✅ **Throwaway file cleaned up (git status diff is empty)** — verified by diff exit 0.
- ✅ **Post-refactor grep: `fc-` = 0 AND `FIRECRAWL_API_KEY` = 0 in `dealdrop/.next/static/**`** — both 0.
- ✅ **TRACK-04 (Firecrawl scrape call proof)** — T-3-01 mitigation operationally verified (guard) AND belt-and-suspenders confirmed (bundle grep both 0).

## User Setup Required

None.

## Next Phase Readiness

**Phase 3 COMPLETE.** All four plans (Wave 1 fixture, Wave 2 contracts + scrapeProduct, Wave 3 bundle-safety) landed. Ready for `/gsd-verify-work`.

Phase 4 (Product Ingestion) downstream import rule for its Server Action:

```typescript
import 'server-only' // line 1 of any new server-side module
import { env as serverEnv } from '@/lib/env.server'  // for CRON_SECRET, RESEND_API_KEY, etc.
import { env as clientEnv } from '@/lib/env'         // only if Server Action also needs NEXT_PUBLIC_*
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
```

No blockers or concerns carried forward.

## Self-Check

Files verified present:
- FOUND: `dealdrop/src/lib/env.server.ts` (30 lines, line 1 = `import 'server-only'`)
- FOUND: `dealdrop/src/lib/env.ts` (27 lines, client-only schema)
- FOUND (modified): `dealdrop/src/lib/supabase/admin.ts`
- FOUND (modified): `dealdrop/src/lib/firecrawl/scrape-product.ts`
- FOUND: `.planning/phases/03-firecrawl-integration/03-04-SUMMARY.md` (this file)

Commits verified present (`git log --oneline -5`):
- FOUND: `750a9cd` — refactor(03-04): split env.ts into env.server.ts + env.ts to keep server key names off client bundle

Gates:
- `head -1 dealdrop/src/lib/env.server.ts` → `import 'server-only'` (exact)
- `head -1 dealdrop/src/lib/firecrawl/scrape-product.ts` → `import 'server-only'` (exact)
- `head -1 dealdrop/src/lib/supabase/admin.ts` → `import 'server-only'` (exact)
- `npm run build` (adversarial) → EXIT=1, stderr contains `server-only`
- `npm run build` (clean) → EXIT=0
- `grep -rE "fc-[a-zA-Z0-9]{16,}" dealdrop/.next/static/` → 0 matches
- `grep -rc "FIRECRAWL_API_KEY" dealdrop/.next/static/` → 0 matches
- Extended: 4 other server-var-name greps → 0 matches each
- `npx vitest run src/lib/firecrawl` → 40 passed / 0 failed / 189ms
- `diff /tmp/gsd-pre-test-state-v2.txt /tmp/gsd-post-cleanup-state-v2.txt` → empty (exit 0)
- `test ! -d dealdrop/app/gsd-serveronly-test` → true (directory cleaned up)

## Self-Check: PASSED

---
*Phase: 03-firecrawl-integration*
*Plan: 04 (Wave 3)*
*Completed: 2026-04-20*
