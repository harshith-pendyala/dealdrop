---
phase: 01-foundation-database
plan: 03
subsystem: database
tags: [supabase, migrations, rls, pg_cron, pg_net, schema, cli-link]
requires:
  - phase: 01-foundation-database/01
    provides: "@t3-oss/env-nextjs + zod installed; .env.local contains 7 Zod-valid placeholder values; supabase CLI (2.92.1) installed as dev dep"
  - phase: 01-foundation-database/02
    provides: "@/lib/env validated env object; three Supabase client factories; proxy.ts pass-through stub"
provides:
  - supabase-project:vhlbdcsxccaknccawfdj (dealdrop-dev, Tokyo region, Free tier)
  - supabase-cli-link:local dealdrop/supabase/ ↔ remote vhlbdcsxccaknccawfdj
  - migration:0001_init_schema.sql (products + price_history tables, constraints, indexes, updated_at trigger)
  - migration:0002_enable_rls.sql (RLS enabled on both tables, 6 policies using (select auth.uid()) pattern)
  - migration:0003_enable_extensions.sql (pg_cron + pg_net, idempotent)
  - env-local:real-supabase-values (URL, anon, service-role keys replace Plan 01 placeholders; gitignored)
  - config:dealdrop/supabase/config.toml (project_id="dealdrop", default local-stack ports)
  - gitignore:supabase/.temp/ + supabase/.branches/ + supabase/.env excluded (belt-and-suspenders beyond internal supabase/.gitignore)
affects:
  - 01-foundation-database/04 (Wave 2 will `supabase db push` these three migrations simultaneously, gen TypeScript types, run RLS impersonation verification)
  - 02-auth (products + price_history schema + RLS + authenticated role plumbing available)
  - 03-scraping (products table + service-role key path for upsert)
  - 04-product-tracking (full RLS-gated CRUD on products)
  - 06-cron-email (pg_cron + pg_net extensions ready for scheduled HTTP-from-DB callback)
tech-stack:
  added:
    - "Supabase remote project: vhlbdcsxccaknccawfdj (dealdrop-dev, Tokyo ap-northeast-1, Free tier)"
    - "Supabase CLI link (access-token based, non-TTY compatible)"
  patterns:
    - "Shared Pattern 5: policy predicates use (select auth.uid()) not bare auth.uid() — ~95% perf gain"
    - "Shared Pattern 6: RLS enable + policies + table creation land in same db push — no exposure window"
    - "Shared Pattern 4: ownership-chain subquery on price_history — RLS on parent does not protect child"
    - "No UPDATE/DELETE policies on price_history — service-role-only writes from cron; user deletes via products cascade"
    - "Non-TTY Supabase CLI auth via SUPABASE_ACCESS_TOKEN env var (not interactive login)"
key-files:
  created:
    - dealdrop/supabase/config.toml
    - dealdrop/supabase/.gitignore
    - dealdrop/supabase/migrations/0001_init_schema.sql
    - dealdrop/supabase/migrations/0002_enable_rls.sql
    - dealdrop/supabase/migrations/0003_enable_extensions.sql
  modified:
    - dealdrop/.gitignore
    - dealdrop/.env.local (gitignored — not committed; three Supabase values swapped from placeholders to real JWTs)
decisions:
  - "Supabase project region: Northeast Asia (Tokyo, ap-northeast-1) — developer's geographic proximity"
  - "Project name: dealdrop-dev — matches Plan 01-03 Task 1 recommendation"
  - "Linked project ref (vhlbdcsxccaknccawfdj) captured here, not elsewhere — Plan 04's `supabase db push` reads it from dealdrop/supabase/.temp/ (CLI-managed)"
  - "Belt-and-suspenders .gitignore entries at dealdrop/.gitignore AND supabase/.gitignore — resilient even if CLI's internal gitignore is wiped"
  - "Supabase CLI authenticated via SUPABASE_ACCESS_TOKEN env var at link time — not persisted in repo; must be re-exported for subsequent `supabase db push`"
  - "Task 4/5/6 (SQL authoring) was completed before the human-action checkpoint paused Tasks 1-3 — migrations exist on disk but not pushed until Plan 04"
metrics:
  duration_min: 5
  tasks: 6
  completed: 2026-04-18
requirements_satisfied: [FND-04, DB-01, DB-02, DB-03, DB-04, DB-05, DB-06]
---

# Phase 1 Plan 01-03: Supabase Project + CLI Link + Migration Authoring Summary

Provisioned a real Supabase project (`vhlbdcsxccaknccawfdj` / `dealdrop-dev` / Tokyo), linked the local `dealdrop/supabase/` folder to it via the CLI, swapped `.env.local` placeholders for real URL + anon + service-role keys, and authored (but did not push) the three schema migrations that encode Phase 1's full database contract — `products` + `price_history` tables with constraints & indexes, RLS policies on both using `(select auth.uid())`, and `pg_cron` + `pg_net` extensions ready for Phase 6.

## Performance

- **Duration:** ~5 min (single session across the human-action checkpoint pause)
- **Started (Tasks 4-6):** 2026-04-18T12:42Z
- **Checkpoint pause:** after Task 6 committed (`cec26f4`)
- **Resumed (Tasks 1-3):** 2026-04-18T14:45Z (after user supplied credentials)
- **Completed:** 2026-04-18
- **Tasks:** 6 (3 autonomous SQL authoring + 3 human-action-gated project/CLI/secrets)
- **Files created:** 5 (3 migrations + `config.toml` + internal `supabase/.gitignore`)
- **Files modified (committed):** 1 (`dealdrop/.gitignore`)
- **Files modified (uncommitted — gitignored):** 1 (`dealdrop/.env.local`)

## Task Commits

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create Supabase project + capture keys (human-action) | n/a (user-provisioned remotely) | Complete — ref `vhlbdcsxccaknccawfdj` captured |
| 2 | `supabase init` + `supabase link` | `b805699` | Complete — CLI linked, `● LINKED` row confirmed |
| 3 | Paste real Supabase keys into `.env.local` (human-action) | n/a (gitignored, no commit) | Complete — placeholders swapped, JWTs verified |
| 4 | Write `0001_init_schema.sql` | `607fb8d` | Complete — products + price_history + indexes + trigger |
| 5 | Write `0002_enable_rls.sql` | `8fc980d` | Complete — RLS + 6 policies, all `(select auth.uid())` |
| 6 | Write `0003_enable_extensions.sql` | `cec26f4` | Complete — `pg_cron` + `pg_net` idempotent create |

Per-task execution order at this point was 4→5→6 (SQL authoring is parallelizable with no external deps), then the human-action checkpoint paused for user credentials, then 2→3 resumed after credentials arrived. Task 1 required no executor action — only that the user had provisioned the project before replying with keys.

## Supabase Project Metadata

| Field | Value |
|-------|-------|
| Project ref | `vhlbdcsxccaknccawfdj` |
| Project name | `dealdrop-dev` |
| Org ID | `mldkvinnscokphswztcm` |
| Region | Northeast Asia (Tokyo, `ap-northeast-1`) |
| Created (UTC) | 2026-04-18 07:59:15 |
| Pricing plan | Free |
| Project URL | `https://vhlbdcsxccaknccawfdj.supabase.co` |
| CLI link status | `● LINKED` (verified via `npx supabase projects list`) |

**Secrets in `dealdrop/.env.local`** (gitignored, not committed — listed here for Plan 04 reference only; real JWT values live only on the developer's machine and in Supabase Dashboard → Project Settings → API):

- `NEXT_PUBLIC_SUPABASE_URL` — real project URL (https://vhlbdcsxccaknccawfdj.supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — real anon JWT (starts `eyJ`, ~220 chars, browser-safe)
- `SUPABASE_SERVICE_ROLE_KEY` — real service-role JWT (starts `eyJ`, root credential, server-only)

The four other `.env.local` entries remain at Plan 01 placeholders — `FIRECRAWL_API_KEY` (Phase 3), `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (Phase 6), `CRON_SECRET` (Phase 6).

## Migration Contracts

### `0001_init_schema.sql` (products + price_history)

**products** (9 columns):
- `id uuid PK default gen_random_uuid()`
- `user_id uuid NOT NULL → auth.users(id) ON DELETE CASCADE`
- `url text NOT NULL`
- `name text NOT NULL`
- `current_price numeric NOT NULL` + `check (current_price > 0)` (DB-03)
- `currency text NOT NULL`
- `image_url text NULL`
- `created_at timestamptz NOT NULL default now()`
- `updated_at timestamptz NOT NULL default now()` (driven by trigger `products_set_updated_at`)
- `unique (user_id, url)` constraint `products_user_url_unique` (DB-02)
- Index: `products_user_id_idx` on `(user_id)`

**price_history** (5 columns):
- `id uuid PK default gen_random_uuid()`
- `product_id uuid NOT NULL → public.products(id) ON DELETE CASCADE` (DASH-07 depends on cascade)
- `price numeric NOT NULL check (price > 0)`
- `currency text NOT NULL`
- `checked_at timestamptz NOT NULL default now()`
- Indexes: `price_history_product_id_idx` on `(product_id)`, `price_history_checked_at_idx` on `(checked_at desc)`

**Trigger:** `public.set_updated_at()` PLpgSQL function + `products_set_updated_at` BEFORE UPDATE trigger — Phase 6 cron relies on this to detect scrape freshness.

### `0002_enable_rls.sql` (RLS + 6 policies)

- `alter table public.products enable row level security`
- `alter table public.price_history enable row level security`
- **products** (4 policies, all `to authenticated`):
  - `products_select_own` — `using ((select auth.uid()) = user_id)`
  - `products_insert_own` — `with check ((select auth.uid()) = user_id)`
  - `products_update_own` — `using` + `with check` both `(select auth.uid()) = user_id`
  - `products_delete_own` — `using ((select auth.uid()) = user_id)`
- **price_history** (2 policies, all `to authenticated`, ownership-chain subquery):
  - `price_history_select_own` — `product_id in (select id from public.products where user_id = (select auth.uid()))`
  - `price_history_insert_own` — same subquery in `with check`
- **No UPDATE/DELETE policies on price_history** — intentional. Cron Route Handler uses service-role key (RLS-bypassed) for inserts; cascade delete from `products` handles cleanup.

Every policy predicate uses `(select auth.uid())` — never bare `auth.uid()`. This turns the auth call into an initPlan cached once per statement (Supabase benchmarks report ~95% perf gain at scale). Verified by grep: 8 occurrences of `(select auth.uid())`, zero bare-auth-uid matches.

### `0003_enable_extensions.sql` (pg_cron + pg_net)

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Idempotent. Both extensions required for Phase 6's daily scrape-and-alert cron job — `pg_cron` schedules the tick; `pg_net` makes the HTTP-from-DB call to the Route Handler. `pg_cron` alone is insufficient (Pitfall 8 from RESEARCH.md).

## Must-Haves Verified

- [x] Supabase project `vhlbdcsxccaknccawfdj` exists and is reachable (`npx supabase projects list` shows `● LINKED` row)
- [x] `dealdrop/supabase/config.toml` committed (`b805699`); contains `project_id = "dealdrop"`
- [x] `dealdrop/supabase/.gitignore` committed — excludes `.branches`, `.temp`, `.env.local`, `.env.*.local`, `.env.keys` (CLI-generated runtime state)
- [x] Root `dealdrop/.gitignore` now also excludes `supabase/.temp/`, `supabase/.branches/`, `supabase/.env` (belt-and-suspenders)
- [x] `supabase/migrations/` and `supabase/config.toml` are NOT in any `.gitignore` (committed as intended)
- [x] `.env.local` has real Supabase URL + JWTs (grep for `placeholder-anon-key` and `placeholder-service-role-key` both return 0)
- [x] `.env.local` is gitignored (`git check-ignore .env.local` exits 0; `git status --porcelain .env.local` is empty)
- [x] All three migration files exist and pass grep-based structural checks (tables, constraints, indexes, policies, extensions)
- [x] No bare `auth.uid()` in any policy — only `(select auth.uid())` (8 occurrences in 0002)
- [x] No service-role key or access token in any committed file (verified via `git log -p | grep eyJ` returns only Zod/placeholder strings from Plan 01)

## Requirements Satisfied

- **FND-04** — `pg_cron` and `pg_net` extensions enabled via 0003 migration (idempotent `create extension if not exists`)
- **DB-01** — `products` table columns (id, user_id, url, name, current_price, currency, image_url, created_at, updated_at) with correct types
- **DB-02** — `unique (user_id, url)` constraint on products (named `products_user_url_unique`)
- **DB-03** — `check (current_price > 0)` constraint on products (named `products_current_price_positive`); mirrored `check (price > 0)` on price_history
- **DB-04** — `price_history` table columns (id, product_id, price, currency, checked_at) with FK cascade
- **DB-05** — 4 RLS policies on products (select/insert/update/delete), all `(select auth.uid()) = user_id`
- **DB-06** — 2 RLS policies on price_history (select/insert) via ownership-chain subquery

Note: DB-05 and DB-06 are **encoded** (SQL authored) but not yet **applied** to the remote DB — Plan 04 Task 1 (`[BLOCKING] supabase db push`) will apply them, and Plan 04 will then run the RLS impersonation verification test that actually confirms cross-user isolation. This split is intentional per `schema_push_requirement` in the phase plan.

## Key Links to Downstream Plans

| From | To | Mechanism | Status |
|------|----|-----------|--------|
| `dealdrop/supabase/migrations/0001..0003` | Plan 04 Task 1 `supabase db push` | CLI reads migrations/ in order, pushes all pending to linked project | Wired — files present, CLI linked |
| Linked project ref (vhlbdcsxccaknccawfdj) | Plan 04 `supabase gen types typescript --linked` | Ref stored in `supabase/.temp/` after link | Wired — link verified |
| Real `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` | Plan 04 debug page testing (Plan 02's `admin.ts` factory) | `@/lib/env` + `@/lib/supabase/admin` | Wired — real key replaces placeholder |
| Real `NEXT_PUBLIC_SUPABASE_URL` + anon key | Plan 04 debug page (browser client) | `@/lib/env` + `@/lib/supabase/browser` | Wired — real values in `.env.local` |
| RLS policies on products + price_history | Phase 2 auth (SELECT gated by Google OAuth session) | `(select auth.uid()) = user_id` evaluates against authenticated role | Wired (pending push) |
| `pg_cron` + `pg_net` extensions (declared) | Phase 6 cron-from-DB HTTP call to Route Handler | Extensions enabled → `cron.schedule(...)` + `net.http_post(...)` become available | Wired (pending push) |

## Deviations from Plan

None of substance. Plan executed verbatim with two micro-observations:

### Observations (not deviations)

1. **`supabase init` auto-generated an internal `supabase/.gitignore`** that already excludes `.branches`, `.temp`, `.env.local`, `.env.keys`, and `.env.*.local`. The plan acknowledges this as the likely outcome ("supabase init sometimes adds its own `.gitignore` inside `supabase/`") and directs belt-and-suspenders coverage in root `dealdrop/.gitignore` regardless. Both now exist.

2. **CLI link completed in non-TTY mode** without a DB password prompt. `SUPABASE_ACCESS_TOKEN` alone was sufficient — the CLI did not require the database password for the link step. (DB password is required only for `supabase db push` + `supabase migration repair`, which belong to Plan 04.) If Plan 04's push prompts for a DB password, the developer will need to retrieve it from their password manager or reset via Dashboard → Project Settings → Database.

### Deferred (foreshadowed for Plan 04)

Per Pitfall 8 of RESEARCH.md: on Supabase Free tier, `create extension pg_cron` / `create extension pg_net` via SQL migration can fail with role-permission errors. If `supabase db push` fails on 0003 in Plan 04, the fallback is:
1. Dashboard → Database → Extensions → toggle `pg_cron` + `pg_net` on
2. `npx supabase migration repair --status applied 0003`
3. Record the fallback in Plan 04's SUMMARY and deviation log

No action needed from this plan — just flagging for Plan 04.

## Auth Gates

Two `checkpoint:human-action` tasks (1 and 3) were honored. Task 1 (create Supabase project + generate personal access token) and Task 3 (paste real secrets into `.env.local`) are inherently unautomatable — Supabase Dashboard project creation requires interactive account flow, and service-role key retrieval is UI-only. The executor paused after Task 6, returned a structured checkpoint message listing Tasks 4–6 as committed, and resumed after the user replied with credentials. No deviations introduced by the pause.

## Threat Model Coverage

All eight threats in the plan's STRIDE register are either mitigated by this plan's actions or carry explicit follow-up in Plan 04:

- **T-03-01** (cross-user read on products) — MITIGATED: 4 RLS policies in 0002 gate every operation on `(select auth.uid()) = user_id`. Verification test (Plan 04) will impersonate a second user and confirm zero rows returned.
- **T-03-02** (cross-user read on price_history) — MITIGATED: 2 ownership-chain subquery policies in 0002. Plan 04 impersonation test explicitly covers both tables.
- **T-03-03** (SERVICE_ROLE_KEY committed via .env.local) — MITIGATED: `.env.local` still gitignored post-swap (verified: `git status --porcelain .env.local` empty; `git check-ignore .env.local` exits 0). No secret in any commit from this plan.
- **T-03-04** (RLS exposure window between 0001 and 0002) — MITIGATED: Plan 04 Task 1 pushes all three migrations in one `supabase db push` transaction — tables and RLS land atomically.
- **T-03-05** (bare `auth.uid()` policy — re-evaluated per row) — MITIGATED: grep verification — 8 `(select auth.uid())` occurrences, zero bare matches.
- **T-03-06** (committed supabase/.env CLI cache) — MITIGATED: internal `supabase/.gitignore` excludes `.env.*.local` + `.env.keys`; root `dealdrop/.gitignore` excludes `supabase/.env` too.
- **T-03-07** (UPDATE/DELETE on price_history from user) — MITIGATED: policies intentionally omitted; only service-role writes (cron); user-side delete via cascade.
- **T-03-08** (pg_cron/pg_net extension enablement fails on Free tier) — ACCEPTED with fallback: documented Plan 04 fallback via Dashboard toggle + `supabase migration repair --status applied 0003`.

No new threat surface introduced beyond what the plan anticipated.

## Issues Encountered

None. Both CLI operations (`supabase init`, `supabase link`) completed cleanly on first try. `npx supabase projects list` confirms linked status with a single `●` row.

## Known Stubs

None introduced by this plan.

Prior stubs carry forward (tracked in earlier SUMMARYs):
- `dealdrop/.env.local` still has 4 placeholder values for Phase 3 + Phase 6 (`FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`). Resolved by those phases. Intentional; documented in Plan 01-01 SUMMARY.
- `dealdrop/proxy.ts` still pass-through. Resolved by Phase 2 auth plan. Intentional; documented in Plan 01-02 SUMMARY.

## Deferred Issues

1. **Pending schema push** — the three migrations are authored but not yet applied to the remote Postgres instance. This is deliberate per `schema_push_requirement`: Plan 04 Task 1 is the `[BLOCKING]` push step, and Plan 04 also runs the RLS impersonation verification. Tracking in Plan 04 backlog.

2. **Potential pg_cron/pg_net free-tier SQL enablement failure** — foreshadowed in RESEARCH.md Pitfall 8. Fallback (Dashboard toggle + `supabase migration repair`) documented inline above. No action in Plan 03.

3. **DB password not captured by executor** — the CLI link did not require it, but Plan 04's `supabase db push` may. Developer should retrieve from password manager or reset via Dashboard → Project Settings → Database before running Plan 04.

## Self-Check: PASSED

Created files verified:
- `FOUND: dealdrop/supabase/config.toml`
- `FOUND: dealdrop/supabase/.gitignore`
- `FOUND: dealdrop/supabase/migrations/0001_init_schema.sql`
- `FOUND: dealdrop/supabase/migrations/0002_enable_rls.sql`
- `FOUND: dealdrop/supabase/migrations/0003_enable_extensions.sql`

Modified files verified:
- `FOUND: dealdrop/.gitignore` (contains `supabase/.temp/`, `supabase/.branches/`, `supabase/.env`)
- `FOUND: dealdrop/.env.local` (gitignored; real JWTs start `eyJ`; zero placeholder strings remain)

Commits verified:
- `FOUND: 607fb8d` (Task 4 — 0001 init schema)
- `FOUND: 8fc980d` (Task 5 — 0002 enable RLS)
- `FOUND: cec26f4` (Task 6 — 0003 enable extensions)
- `FOUND: b805699` (Task 2 — supabase init + link)

CLI link verified: `npx supabase projects list` shows `● LINKED` for `vhlbdcsxccaknccawfdj` / `dealdrop-dev` / Tokyo.

Secret hygiene verified:
- `grep -r "sbp_" dealdrop/supabase/ dealdrop/.gitignore` returns no matches — no access token in any committed file
- `git log -p --all | grep 'eyJhbGci'` returns only Plan 01 placeholder Zod strings, never the real JWTs (real JWTs live only in gitignored `.env.local`)
- `git status --porcelain dealdrop/.env.local` returns empty (file still gitignored, never staged)

---
*Phase: 01-foundation-database*
*Completed: 2026-04-18*
