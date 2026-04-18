-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Note: (select auth.uid()) is used instead of auth.uid() for per-statement caching.
-- Supabase benchmarks show up to ~95% performance improvement.

alter table public.products      enable row level security;
alter table public.price_history enable row level security;

-- products: owner-only access
create policy "products_select_own"
  on public.products for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "products_update_own"
  on public.products for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- price_history: ownership-chain via products
create policy "price_history_select_own"
  on public.price_history for select
  to authenticated
  using (
    product_id in (
      select id from public.products where user_id = (select auth.uid())
    )
  );

create policy "price_history_insert_own"
  on public.price_history for insert
  to authenticated
  with check (
    product_id in (
      select id from public.products where user_id = (select auth.uid())
    )
  );

-- No UPDATE / DELETE policies for price_history from the user side.
-- Cron Route Handler uses service-role key, bypasses RLS, and handles cron inserts + cleanup.
-- Cascade delete from products handles the cleanup on product removal.
