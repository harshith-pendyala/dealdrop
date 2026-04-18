-- Source: Supabase RLS docs + DealDrop REQUIREMENTS.md DB-01..DB-07
-- Creates the two core tables. RLS is enabled + policies written in 0002.

-- products
create table public.products (
  id            uuid         primary key default gen_random_uuid(),
  user_id       uuid         not null references auth.users(id) on delete cascade,
  url           text         not null,
  name          text         not null,
  current_price numeric      not null,
  currency      text         not null,
  image_url     text,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  constraint products_user_url_unique unique (user_id, url),
  constraint products_current_price_positive check (current_price > 0)
);

create index products_user_id_idx on public.products (user_id);

-- price_history
create table public.price_history (
  id          uuid         primary key default gen_random_uuid(),
  product_id  uuid         not null references public.products(id) on delete cascade,
  price       numeric      not null check (price > 0),
  currency    text         not null,
  checked_at  timestamptz  not null default now()
);

create index price_history_product_id_idx   on public.price_history (product_id);
create index price_history_checked_at_idx   on public.price_history (checked_at desc);

-- updated_at trigger for products
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();
