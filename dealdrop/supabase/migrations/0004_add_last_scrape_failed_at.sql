-- File: dealdrop/supabase/migrations/0004_add_last_scrape_failed_at.sql
-- DASH-08: track whether the most recent scrape for a product failed.
-- Phase 4 adds the column + renders the badge when non-null.
-- Phase 6 cron writes the timestamp on failure; clears to NULL on next success.

alter table public.products
  add column last_scrape_failed_at timestamptz null;

-- No default; nullable by design. NULL = scraping OK (or never attempted yet).

create index products_last_scrape_failed_at_idx
  on public.products (last_scrape_failed_at)
  where last_scrape_failed_at is not null;
-- Partial index: Phase 6 cron can efficiently find still-failing products without
-- scanning the full table. Uses ~0 space for healthy products.
