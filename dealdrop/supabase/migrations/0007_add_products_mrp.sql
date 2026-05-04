-- File: dealdrop/supabase/migrations/0007_add_products_mrp.sql
-- Cycle-5: multi-slot price extraction.
--
-- The Firecrawl LLM-extract schema now categorizes prices into three slots
-- (mrp, current_price, lowest_conditional_price). We persist `mrp` so the
-- dashboard can later render "₹20,499 (was ₹36,999)" without re-scraping.
-- `lowest_conditional_price` is intentionally NOT persisted — it's an
-- extraction-time signal used by the local sanity-check logic, not a
-- product-level fact worth tracking over time.
--
-- price_history is intentionally UNCHANGED — MRP rarely moves, only
-- current_price does. Adding mrp to price_history would 5x the table size
-- for near-zero observability gain.

alter table public.products
  add column mrp numeric null;

-- No default; nullable by design. NULL = no MRP shown on the page (regular
-- priced item, or a small retailer that doesn't surface a list price).

-- No new index — mrp is read alongside the existing row, never queried on
-- its own. RLS policies are inherited from the existing table — no policy
-- changes needed.

-- No CHECK constraint mirroring products_current_price_positive: an MRP of 0
-- is meaningless but a typo of 0 here would be a UI bug (display "was $0")
-- not a data corruption. The application layer (schema.ts) already coerces
-- non-positive numbers to null before insert.
