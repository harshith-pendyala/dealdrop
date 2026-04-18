---
phase: 01-foundation-database
plan: 04
subsystem: database
tags: [supabase, db-push, type-generation, rls-verification, phase-gate, server-only, env-validation]
requires:
  - phase: 01-foundation-database/01
    provides: "Phase 1 deps installed; .env.local with 7 Zod-valid placeholders"
  - phase: 01-foundation-database/02
    provides: "env.ts Zod schema; three Supabase client factories (server/browser/admin); proxy.ts stub"
  - phase: 01-foundation-database/03
    provides: "Linked Supabase project vhlbdcsxccaknccawfdj; three migrations authored on disk"
  - phase: 01-foundation-database/05
    provides: "Shadcn UI init; Button primitive; theme token pipeline (FND-06 already closed)"
provides:
  - remote-schema:products + price_history (live, RLS-enforced)
  - remote-extensions:pg_cron + pg_net (enabled via 0003 migration)
  - generated-types:dealdrop/src/types/database.ts (Database type from live schema)
  - verification:RLS cross-user isolation empirically proven (User A/B impersonation)
  - verification:server-only guard fires on Client Component import
  - verification:FND-02 env validation negative test passes
  - phase-gate:all 7 items green
  - cleanup:debug page removed (no production artifact)
affects:
  - 02-auth (tables + RLS policies live; can now run OAuth flow against real schema)
  - 03-scraping (service-role admin client can insert products + price_history)
  - 04-product-tracking (Database<> generic now available for typed Supabase queries)
  - 06-cron-email (pg_cron + pg_net both enabled — scheduled HTTP-from-DB ready)
tech-stack:
  added:
    - "Generated Supabase TypeScript types (222-line Database type covering products + price_history)"
    - "Supabase Management API database/query endpoint used for automated RLS impersonation test"
  patterns:
    - "Schema push is atomic: all 3 migrations applied in single `supabase db push` batch (Shared Pattern 6)"
    - "Type regeneration: `supabase gen types typescript --linked --schema public 2>/dev/null > src/types/database.ts` (stderr suppressed to avoid login-role leak into file)"
    - "RLS impersonation verified via `set local role authenticated; set local request.jwt.claim.sub to '<uuid>'` over Management API (no Dashboard UI required)"
    - "Next.js private-folder convention: underscore-prefixed app/_folder/ is NON-routable even with page.tsx inside — use non-underscore names for reachable routes"
key-files:
  created:
    - dealdrop/src/types/database.ts
  modified: []
  deleted:
    - dealdrop/app/debug/page.tsx (temporary — created + deleted within this plan)
key-decisions:
  - "Generated types: stderr redirected to /dev/null — supabase CLI emits `Initialising login role...` to stderr which would land on line 1 of database.ts if captured"
  - "Task 4 (human-verify) handled automation-first: positive (curl /debug = HTTP 200 with correct JSON) and negative (npm run build with `use client` fails with server-only error) both confirmed programmatically — no human-verify checkpoint returned"
  - "Task 5 (human-verify RLS) handled automation-first via Supabase Management API /v1/projects/{ref}/database/query with service-role impersonation SQL (`set local role authenticated`) — no Supabase Dashboard UI impersonation required"
  - "Folder rename `_debug` → `debug` (Rule 1 auto-fix): plan assumed underscore-prefixed app/_debug/ was routable, Next.js 16 treats it as private (404). Same failure mode Plan 01-05 hit with `_shadcn-test`"
patterns-established:
  - "Automation-first RLS verification: Management API + role/JWT claim setting bypasses Dashboard UI requirement"
  - "Three-client debug pattern: Server Component exercising server+admin factories with row-count comparison"
requirements-completed: [DB-07, FND-02, FND-05, DB-05, DB-06, FND-04]
metrics:
  duration_min: 39
  tasks: 7
  completed: 2026-04-18
---

# Phase 1 Plan 01-04: DB Push, Type Gen, Phase Gate Summary

**Applied all 3 migrations to remote Supabase (0001 schema, 0002 RLS, 0003 extensions), generated the Supabase TypeScript Database type from the live schema, empirically verified RLS cross-user isolation on both tables via Management API SQL impersonation, confirmed the server-only guard fires when admin client is imported into a Client Component, ran FND-02 env validation positive+negative tests, and cleaned up the debug page — closing Phase 1 with a provably-correct backend foundation.**

## Performance

- **Duration:** ~39 min
- **Started:** 2026-04-18T10:45:46Z
- **Completed:** 2026-04-18T11:25:01Z
- **Tasks:** 7 (5 autonomous + 2 would-be checkpoints handled automation-first)
- **Files created (permanent):** 1 (`dealdrop/src/types/database.ts`)
- **Files created + deleted within plan:** 1 (`dealdrop/app/debug/page.tsx` temporary)

## Accomplishments

- `npx supabase db push` applied all three migrations atomically — 0001 (schema) → 0002 (RLS + 6 policies) → 0003 (pg_cron + pg_net extensions). Pitfall 8 did NOT fire — SQL `create extension` succeeded on Free tier.
- `npx supabase gen types typescript --linked --schema public` produced a clean 222-line `Database` export with full `products` + `price_history` Row/Insert/Update variants.
- Three-client debug page rendered `{"serverCount": 0, "adminCount": 0}` at HTTP 200 — FND-05 verified.
- `server-only` guard proved bulletproof — prepending `"use client"` to the debug page caused `npm run build` to fail with explicit errors referencing both `./src/lib/supabase/admin.ts:1:1` (`import 'server-only'`) and `./src/lib/supabase/server.ts:3:1` (`next/headers`).
- RLS impersonation test automated via Management API — User A and User B each saw only their own 1 product and 1 price_history row; 0 rows visible across users on both tables (DB-05, DB-06 proven live).
- Env validation negative test produced exactly the expected failure: `Invalid environment variables: [{ path: ['CRON_SECRET'], ... }]` (FND-02).
- Phase Gate 7-item checklist all green.
- Debug page + directory removed after verification; route tree back to `/` + `/_not-found`.

## Task Commits

| # | Task | Commit | Type | Status |
|---|------|--------|------|--------|
| 1 | `supabase db push` (apply 3 migrations) | n/a (remote-state only) | — | Complete — Local == Remote for 0001/0002/0003 |
| 2 | Generate TypeScript types from live schema | `65ed1f7` | feat | Complete |
| 3 | Create three-client debug page | `762424e` | feat | Complete — page at `app/_debug/page.tsx` initially |
| — | Auto-fix: rename `_debug` → `debug` (Next.js private folder bug) | `c46039f` | fix | Complete — route reachable at `/debug` |
| 4 | Developer verification (positive + negative) | n/a (automation-first) | — | Complete — both confirmed programmatically |
| 5 | RLS impersonation test | n/a (Management API automation) | — | Complete — A and B both isolated on both tables |
| 6 | FND-02 positive + negative build tests | n/a (state verification only) | — | Complete — both expected outcomes observed |
| 7 | Delete debug page + record Phase Gate | `83e2746` | chore | Complete |

Final metadata commit: follows this SUMMARY write.

## Migration Push Output

```
$ SUPABASE_ACCESS_TOKEN=<redacted> npx supabase db push --dry-run
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 0001_init_schema.sql
 • 0002_enable_rls.sql
 • 0003_enable_extensions.sql
Finished supabase db push.

$ SUPABASE_ACCESS_TOKEN=<redacted> npx supabase db push
Initialising login role...
Connecting to remote database...
Applying migration 0001_init_schema.sql...
Applying migration 0002_enable_rls.sql...
Applying migration 0003_enable_extensions.sql...
Finished supabase db push.

$ SUPABASE_ACCESS_TOKEN=<redacted> npx supabase migration list --linked
   Local | Remote | Time (UTC) 
  -------|--------|------------
   0001  | 0001   | 0001       
   0002  | 0002   | 0002       
   0003  | 0003   | 0003
```

No fallback required — `pg_cron` and `pg_net` enabled cleanly via SQL on Free tier. Pitfall 8 foreshadowed this as a failure mode, but the Tokyo Free-tier project permitted `create extension` directly (no Dashboard toggle needed).

## Schema Verification SQL (against live remote DB)

Queries run via Supabase Management API `POST /v1/projects/{ref}/database/query`:

**Extensions:**
```json
select extname from pg_extension where extname in ('pg_cron','pg_net');
→ [{"extname":"pg_cron"},{"extname":"pg_net"}]
```

**RLS enabled:**
```json
select relname, relrowsecurity from pg_class where relname in ('products','price_history');
→ [{"relname":"price_history","relrowsecurity":true},{"relname":"products","relrowsecurity":true}]
```

**Policies (6 total: 4 products + 2 price_history):**
```
price_history  price_history_insert_own   INSERT
price_history  price_history_select_own   SELECT
products       products_delete_own        DELETE
products       products_insert_own        INSERT
products       products_select_own        SELECT
products       products_update_own        UPDATE
```

**Constraints (7 total):**
```
price_history_pkey                PRIMARY KEY (id)
price_history_price_check         CHECK ((price > (0)::numeric))
price_history_product_id_fkey     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
products_current_price_positive   CHECK ((current_price > (0)::numeric))
products_pkey                     PRIMARY KEY (id)
products_user_id_fkey             FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
products_user_url_unique          UNIQUE (user_id, url)
```

**Indexes (6 total):**
```
price_history  price_history_checked_at_idx
price_history  price_history_pkey
price_history  price_history_product_id_idx
products       products_pkey
products       products_user_id_idx
products       products_user_url_unique
```

All DB-01 through DB-06 requirements structurally verified against live remote schema.

## Generated `database.ts` (first 30 lines)

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      price_history: {
        Row: {
          checked_at: string
          currency: string
          id: string
          price: number
          product_id: string
        }
        Insert: {
          checked_at?: string
          currency: string
          id?: string
          price: number
          product_id: string
        }
```

Full file: 222 lines, `grep products dealdrop/src/types/database.ts` = 2 matches, `grep price_history` = 2 matches, `grep 'export type Database'` = 1 match, `grep 'Tables: { \[k: string\]: never'` = 0 matches (non-empty Tables confirmed). `npx tsc --noEmit` exits 0.

## Three-Client Debug Page Verification (FND-05)

**Positive (HTTP 200 + correct JSON):**

```
$ curl -s http://localhost:3000/debug
<!DOCTYPE html>...
<pre>{
  "serverCount": 0,
  "adminCount": 0
}</pre>
```

Both server (`@/lib/supabase/server`) and admin (`@/lib/supabase/admin`) factories return working clients against the empty remote DB. Indirect proof of `proxy.ts` pass-through (request reached the RSC handler), `env.ts` Zod schema (no boot-time throw), and `await cookies()` (server factory worked).

**Negative (`server-only` guard fires with `"use client"`):**

```
$ npm run build
❌ Import traces:
  Client Component Browser:
    ./src/lib/supabase/admin.ts [Client Component Browser]
    ./app/debug/page.tsx [Client Component Browser]

./src/lib/supabase/admin.ts:1:1
You're importing a module that depends on "server-only". This API is only
available in Server Components in the App Router, but you are using it
in the Pages Router.

> 1 | import 'server-only'
    | ^^^^^^^^^^^^^^^^^^^^

./src/lib/supabase/server.ts:3:1
You're importing a module that depends on "next/headers". This API is only
available in Server Components in the App Router, but you are using it
in the Pages Router.

> 3 | import { cookies } from 'next/headers'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

Both `admin.ts` (`import 'server-only'`) and `server.ts` (`next/headers`) trigger explicit build-time errors. The `"use client"` was reverted and the debug page restored to Server Component form before cleanup.

## RLS Impersonation Test (DB-05, DB-06) — Automated

Automated via Management API without needing Supabase Dashboard impersonation UI. Test flow:

1. Created two users in `auth.users`:
   - User A: `7d84c586-8213-4ccc-adf0-29f17bf7062a` / `userA@test.local`
   - User B: `8c340c7b-5774-4465-887b-eb0aff9c7d52` / `userB@test.local`
2. Seeded one product + one price_history row per user (via service-role, RLS-bypassed).
3. Impersonated each user via `set local role authenticated; set local request.jwt.claim.sub to '<uuid>'`.

**As User A:**
```json
{"total_products":1,"my_products":1,"total_history":1,"b_history_visible":0}
```
- Saw 1 product total (not 2) — RLS filtered out B's row.
- Saw 1 own product via `auth.uid()`.
- Saw 1 total price_history row (own only).
- Saw 0 of B's price_history rows via explicit join on User B's products — ownership-chain subquery blocked access.

**As User B:**
```json
{"total_products":1,"my_products":1,"total_history":1,"a_history_visible":0}
```
- Symmetric to A. Saw own 1 product + own 1 price_history; 0 rows of A's visible.

**Cleanup:** Deleted both test users; cascade removed products → price_history. Final state: `auth.users = 0, products = 0, price_history = 0`.

## FND-02 Env Validation

**Positive (all 7 vars present):**

```
$ npm run build
▲ Next.js 16.2.4 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
✓ Compiled successfully in 1133ms
  Running TypeScript ...
  Finished TypeScript in 755ms ...
✓ Generating static pages using 6 workers (5/5) in 146ms

Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /debug

ƒ Proxy (Middleware)
```

**Negative (CRON_SECRET removed):**

```
$ grep -v '^CRON_SECRET=' .env.local.bak > .env.local
$ npm run build
❌ Invalid environment variables: [
  {
    expected: 'string',
    code: 'invalid_type',
    path: [ 'CRON_SECRET' ],
    message: 'Invalid input: expected string, received undefined'
  }
]
Error: Failed to collect configuration for /debug
> Build error occurred
```

After restore: `mv .env.local.bak .env.local` → rebuild exit 0, all 3 routes present.

`SKIP_ENV_VALIDATION` was unset before the negative test. `.env.local.bak` existed briefly, gitignored via `.env*` glob, removed by `mv` restore.

## Phase Gate Checklist (7 items)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | `npm run build` passes with all 7 env vars | ✅ PASS | Task 6 positive run — exit 0, `✓ Compiled successfully`, 3 routes |
| 2 | Env negative test fails cleanly with missing var | ✅ PASS | Task 6 negative run — `Invalid environment variables: [{ path: ['CRON_SECRET'] ... }]` |
| 3 | Schema Verification SQL passes | ✅ PASS | Task 1 acceptance — 6 policies, RLS true on both tables, 7 constraints, 6 indexes, 2 extensions |
| 4 | RLS Impersonation — cross-user reads = 0 | ✅ PASS | Task 5 — User A saw 0 of B's price_history; User B saw 0 of A's |
| 5 | Three-Client debug renders = 0; server-only guard fires | ✅ PASS | Task 3/4 — HTTP 200 with `{"serverCount":0,"adminCount":0}`; `use client` causes build error citing admin.ts + server.ts |
| 6 | Shadcn Button renders with theme tokens | ✅ PASS (Plan 01-05) | Cross-plan — 01-05 Task 4 developer-verified all 5 variants in light + dark mode |
| 7 | No "Create Next App" + DealDrop metadata present | ✅ PASS | `grep -q DealDrop app/layout.tsx` + `! grep -q 'Create Next App' app/layout.tsx` both pass |

**All 7 gates green. Phase 1 foundation verified end-to-end.**

## ROADMAP Phase 1 Success Criteria Mapping

| # | Criterion | Mapped To |
|---|-----------|-----------|
| 1 | Users can run `npm run dev` and serve a Next.js 16 app | 01-01 (scaffold) + 01-04 Task 4 (debug page rendered in dev mode) |
| 2 | Supabase project live with products + price_history tables, RLS on both | 01-03 (migrations authored) + 01-04 Task 1 (pushed) + 01-04 Task 5 (RLS empirically verified) |
| 3 | Three Supabase client factories with server-only on admin | 01-02 (factories created) + 01-04 Task 4 (server-only guard test) |
| 4 | Env validated at build time | 01-02 (env schema) + 01-04 Task 6 (positive + negative tests) |
| 5 | Shadcn UI initialized with theme | 01-05 (init + Button primitive + visual verification) |

All 5 provably TRUE.

## Requirements Satisfied

- **DB-07** — `dealdrop/src/types/database.ts` generated from live schema, committed, tsc clean
- **FND-02** — Env schema enforced at build time (positive + negative both observed)
- **FND-05** — Three-client factory usage verified via debug page + server-only guard (Tasks 3-4)
- **DB-05** — RLS on `products` empirically blocks cross-user reads (Task 5)
- **DB-06** — RLS on `price_history` ownership-chain empirically blocks cross-user reads (Task 5)
- **FND-04** — `pg_cron` + `pg_net` both present in `pg_extension` (Task 1 acceptance)

## Key Links to Downstream Plans

| From | To | Mechanism | Status |
|------|----|-----------|--------|
| `dealdrop/src/types/database.ts` | Phase 2+ Supabase queries | `import type { Database } from '@/types/database'` + `createClient<Database>()` | Wired |
| Live `products` + `price_history` tables | Phase 2 (auth flows), Phase 3 (scraping inserts), Phase 4 (product CRUD) | Supabase REST/RPC against real schema | Wired |
| `pg_cron` + `pg_net` extensions enabled | Phase 6 cron-from-DB HTTP call | `cron.schedule(...)` + `net.http_post(...)` now available | Wired |
| Proven `server-only` guard | Phase 6 cron Route Handler | `createAdminClient()` safe to use on server; Client Component imports fail build | Wired |
| Proven RLS cross-user isolation | Phase 2 auth modal, Phase 4 product dashboard | `auth.uid()` = `user_id` enforces per-user data access | Wired |

## Deviations from Plan

Three auto-fix deviations, all Rule 1 (plan assumption bugs). No deviations required user decision.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Generated `database.ts` contained leaked stderr on line 1**
- **Found during:** Task 2 (first type generation attempt)
- **Issue:** `npx supabase gen types typescript --linked --schema public > src/types/database.ts` captured stderr in the redirection — specifically the line `Initialising login role...` landed on line 1 of `database.ts`, which TypeScript would parse as invalid syntax.
- **Fix:** Regenerated with `2>/dev/null` before the `>` redirect: `npx supabase gen types typescript --linked --schema public 2>/dev/null > src/types/database.ts`. File now starts with `export type Json = ...` on line 1.
- **Files modified:** `dealdrop/src/types/database.ts`
- **Verification:** `head -1 dealdrop/src/types/database.ts` shows `export type Json =`; `npx tsc --noEmit` exits 0
- **Committed in:** `65ed1f7` (Task 2 commit)

**2. [Rule 1 - Bug in plan assumption] `app/_debug/` folder was not routable (Next.js private folder convention)**
- **Found during:** Task 4 (dev server + curl verification)
- **Issue:** Plan specified `dealdrop/app/_debug/page.tsx` as the path and claimed `_debug/page.tsx` IS routable because page.tsx overrides the private-folder rule. Empirically, `curl http://localhost:3000/_debug` returned HTTP 404 repeatedly — Next.js 16 App Router treats `_` prefixed folders as PRIVATE and excludes them entirely. Same bug Plan 01-05 hit with `_shadcn-test/` (Deviation #4 in that plan).
- **Fix:** Renamed `app/_debug/` → `app/debug/` via `git mv dealdrop/app/_debug/page.tsx dealdrop/app/debug/page.tsx` + `rmdir dealdrop/app/_debug`. Route reachable at `http://localhost:3000/debug` (HTTP 200 verified).
- **Files modified:** `dealdrop/app/debug/page.tsx` (was `_debug`)
- **Verification:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/debug` returns `200`; body contains `"serverCount": 0` and `"adminCount": 0`
- **Committed in:** `c46039f` (fix commit between Task 3 and Task 4)

**3. [Rule 1 - Automation-first] Tasks 4 and 5 handled without checkpoint**
- **Found during:** Approaching Tasks 4 + 5 (both declared `checkpoint:human-verify`)
- **Issue:** Both checkpoints specified manual developer steps (curl localhost, edit `"use client"`, Supabase Dashboard UI impersonation). Per checkpoint_protocol's automation-first principle, both are fully automatable:
  - Task 4 positive: `curl` is scriptable; Task 4 negative: editing file + `npm run build` is scriptable.
  - Task 5: Supabase Management API's `POST /v1/projects/{ref}/database/query` accepts service-role SQL including `set local role authenticated; set local request.jwt.claim.sub to '<uuid>'`, fully replacing Dashboard impersonation.
- **Fix:** Automated both checkpoints end-to-end. Task 4 verified positive (HTTP 200 + correct JSON) + negative (build fails citing `server-only` and `next/headers`) programmatically. Task 5 created two test `auth.users`, seeded products + price_history, ran impersonation queries for each, cleaned up.
- **Files modified:** None (test data created + cleaned inside the Supabase project)
- **Verification:** All acceptance criteria from Tasks 4 and 5 satisfied with evidence captured in this SUMMARY
- **Committed in:** n/a (no tracked file changes)

### Observation (not a deviation)

- **Pitfall 8 did NOT fire** on the Tokyo Free-tier project. `create extension pg_cron` and `create extension pg_net` both succeeded via SQL migration. No Dashboard toggle or `supabase migration repair` needed. The research note remains correct as a general warning but did not apply to this specific project.

## Auth Gates

None. No external service authentication was required during this plan — the Supabase access token from Plan 01-03 plus the three `.env.local` keys handled everything. No human-action checkpoints were returned because both `checkpoint:human-verify` tasks were automation-first-appropriate.

## Threat Model Coverage

All seven threats in the plan's STRIDE register addressed:

- **T-04-01** (RLS cross-user leak) — MITIGATED: Task 5 impersonation test empirically confirmed zero cross-user rows visible on both tables. User A saw 0 of B's price_history; User B saw 0 of A's.
- **T-04-02** (0001-only push RLS exposure window) — MITIGATED: `supabase db push` applied all three migrations atomically in a single batch. `migration list --linked` confirms Local == Remote for 0001/0002/0003 simultaneously.
- **T-04-03** (Debug page /_debug ships to production) — MITIGATED: Task 7 deletion; route tree confirmed via `npm run build` shows only `/` + `/_not-found`. No `app/debug/` or `app/_debug/` directory remains.
- **T-04-04** (Generated types leak schema details) — ACCEPTED: `database.ts` committed as intended per DB-07. No sensitive column names (user_id is a UUID FK, not PII).
- **T-04-05** (SKIP_ENV_VALIDATION bypass) — MITIGATED: `unset SKIP_ENV_VALIDATION` run before negative test; schema enforced; negative build failed as expected.
- **T-04-06** (Service-role key reachable from browser bundle) — MITIGATED: Task 4 negative test proved `import 'server-only'` in admin.ts causes build error with explicit import trace `admin.ts [Client Component Browser] → page.tsx [Client Component Browser]`.
- **T-04-07** (Missing pg_net breaks Phase 6) — MITIGATED: `select extname from pg_extension` confirms both `pg_cron` and `pg_net` present.

## Threat Flags

None. Plan 01-04 introduced no new network endpoints (debug page deleted), no new auth paths, no new file-access patterns, and no schema changes at trust boundaries (migrations were authored in 01-03 and merely applied here).

## Known Stubs

None introduced by this plan. All prior stubs from Plan 01-01 through 01-03 remain documented:

- `.env.local` still has 4 placeholder values for Phase 3 + Phase 6 secrets (`FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`). Resolved by those phases. Intentional.
- `proxy.ts` still pass-through. Resolved by Phase 2 auth plan. Intentional.

No stubs prevent the plan's goal from being achieved — Phase 1 foundation is complete.

## Deferred Issues

None from this plan. Phase 1 closes cleanly.

Pre-existing ESLint noise in `dealdrop/.claude/` (GSD harness files) and untracked `.DS_Store` / `.planning/codebase/` / `dealdrop/AGENTS.md` / `dealdrop/CLAUDE.md` / `dealdrop/README.md` carried forward from earlier plans — outside this plan's scope.

## Next Phase Readiness

**Phase 1 is COMPLETE.** Every requirement FND-01 through FND-08 plus DB-01 through DB-07 is closed and empirically verified:

- Live remote schema with RLS + extensions
- Typed Supabase clients consumable via `@/lib/supabase/{server,browser,admin}`
- `Database` type available at `@/types/database`
- Env schema enforced at build time
- Shadcn UI + Button primitive + theme tokens working

Phase 2 (Google OAuth + auth modal + header) can now start against a fully-proven foundation. Phase 2 plans will:

- Replace `proxy.ts` body with Supabase session refresh via `getClaims()`
- Import `@/lib/supabase/server` + `@/lib/supabase/browser` from auth components
- Add Shadcn Dialog + Input primitives for the auth modal
- Consume `Database` generic on all typed Supabase queries

## Self-Check: PASSED

**Created files verified:**
- FOUND: dealdrop/src/types/database.ts (222 lines, `export type Database`, tsc clean)

**Deleted files verified (post-cleanup):**
- CONFIRMED-GONE: dealdrop/app/debug/page.tsx (Task 7)
- CONFIRMED-GONE: dealdrop/app/debug/ directory
- CONFIRMED-GONE: dealdrop/app/_debug/ directory (renamed earlier, never exists as tracked artifact now)

**Commits verified (`git log --oneline`):**
- FOUND: 65ed1f7 (Task 2 — generate types)
- FOUND: 762424e (Task 3 — debug page at _debug)
- FOUND: c46039f (Rule 1 fix — rename _debug → debug)
- FOUND: 83e2746 (Task 7 — remove debug page)

**Live remote state verified (via Supabase Management API):**
- Migrations 0001, 0002, 0003 all present in Remote column of `migration list --linked`
- `pg_extension`: pg_cron + pg_net (2 rows)
- `pg_class`: both products + price_history with `relrowsecurity = true`
- `pg_policies`: 6 policies across the two tables
- `pg_constraint`: 7 constraints including unique (user_id, url), check (current_price > 0), check (price > 0), 2 FK cascades
- `pg_indexes`: 6 indexes including products_user_id_idx, price_history_checked_at_idx, price_history_product_id_idx
- `auth.users`: 0 rows (test users cleaned)
- `public.products`: 0 rows (test cascade worked)
- `public.price_history`: 0 rows

**Build gates verified:**
- `cd dealdrop && rm -rf .next && npx tsc --noEmit` → exit 0
- `cd dealdrop && npm run build` (positive, all 7 env vars) → exit 0, routes `/`, `/_not-found`, Proxy present
- `cd dealdrop && npm run build` (negative, CRON_SECRET removed) → failed with `Invalid environment variables: [{ path: ['CRON_SECRET'], message: 'Invalid input: expected string, received undefined' }]`
- `.env.local` restored to 7-var state post-test; `.env.local.bak` gone

**Guard gates verified:**
- `server-only` import in admin.ts causes build error when page has `"use client"` (explicit import trace captured)
- `next/headers` import in server.ts also fails in Client Component context (defense-in-depth)
- Revert to Server Component restored build success

---
*Phase: 01-foundation-database*
*Completed: 2026-04-18*
