---
phase: "04-product-tracking-dashboard"
plan: "02"
subsystem: "database-schema"
status: "partial"
tags: ["schema", "migration", "supabase", "dash-08"]
dependency_graph:
  requires: []
  provides: ["products.last_scrape_failed_at column", "products_last_scrape_failed_at_idx partial index", "database.ts last_scrape_failed_at types"]
  affects: ["04-03 (ProductCard reads last_scrape_failed_at)", "04-05 (Wave 2 dashboard components)"]
tech_stack:
  added: []
  patterns: ["supabase migration ALTER TABLE + partial index", "supabase gen types typescript regen"]
key_files:
  created:
    - dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql
  modified:
    - dealdrop/src/types/database.ts (pending Task 3 after schema push)
decisions:
  - "last_scrape_failed_at is nullable by design — NULL means scraping OK; Phase 6 cron writes timestamp on failure, clears on success"
  - "Partial index (WHERE NOT NULL) keeps index size ~0 for healthy products — Phase 6 cron efficiency"
metrics:
  duration: "in-progress"
  completed_date: ""
  tasks_total: 3
  tasks_completed: 1
---

# Phase 4 Plan 02: DASH-08 Schema Migration Summary

**One-liner:** Add `last_scrape_failed_at TIMESTAMPTZ NULL` column + partial index to `products`, then regenerate TypeScript types so `ProductCard` can render the tracking-failed badge.

**Status: PARTIAL — paused at Task 2 (checkpoint:human-action)**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Author migration 0004_add_last_scrape_failed_at.sql | 1c6cc7a | dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql |

## Tasks Pending

| Task | Name | Blocked By |
|------|------|-----------|
| 2 | Push migration to linked Supabase project | SUPABASE_ACCESS_TOKEN environment variable missing |
| 3 | Regenerate database.ts types | Task 2 (push must precede type regen) |

## Checkpoint Reached: human-action

**Blocked by:** `SUPABASE_ACCESS_TOKEN` environment variable not set.

**Required action:** Export the Supabase access token before re-running Task 2:

```bash
export SUPABASE_ACCESS_TOKEN=<your-token>
# Token available at: https://supabase.com/dashboard/account/tokens
```

Then in the `dealdrop/` directory:
```bash
cd dealdrop && timeout 60 npx supabase db push
```

After push succeeds:
```bash
timeout 60 npx supabase gen types typescript --project-id vhlbdcsxccaknccawfdj > src/types/database.ts
```

## Deviations from Plan

None — Task 1 executed exactly as written.

## Artifacts

### Task 1 — Migration File

File: `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql`

SQL adds:
- `ALTER TABLE public.products ADD COLUMN last_scrape_failed_at timestamptz null`
- Partial index `products_last_scrape_failed_at_idx` (WHERE NOT NULL)

## Self-Check: PARTIAL

- [x] Migration file created: `dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql`
- [x] Task 1 commit exists: `1c6cc7a`
- [ ] Migration pushed to remote (blocked: SUPABASE_ACCESS_TOKEN missing)
- [ ] `database.ts` regenerated (blocked: depends on push)
