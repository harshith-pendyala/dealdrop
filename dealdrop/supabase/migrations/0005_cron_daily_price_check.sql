-- File: dealdrop/supabase/migrations/0005_cron_daily_price_check.sql
-- CRON-10 / CRON-11: daily pg_cron job POSTs /api/cron/check-prices with a
-- Vault-backed Bearer token. cron.job.command is grep-clean of the plaintext
-- secret because the wrapper function reads vault.decrypted_secrets inside a
-- SECURITY DEFINER scope, constructs the Authorization header internally, and
-- calls net.http_post — pg_cron only ever invokes the wrapper by name.
--
-- Foundation: migration 0003 already enabled pg_cron + pg_net extensions.
-- Vault schema is managed by Supabase and available in all projects by default.
--
-- Source: https://supabase.com/docs/guides/database/vault
-- Source: https://supabase.com/docs/guides/database/extensions/pg_net
-- Source: https://github.com/citusdata/pg_cron
-- Source: https://supabase.com/docs/guides/cron/quickstart

-- ---------------------------------------------------------------------------
-- Step 1: Create the Vault secret (idempotent).
--
-- The committed placeholder 'CRON_SECRET-value-goes-here' is load-bearing:
-- it guarantees the file is grep-clean of any real token. The operator
-- REPLACES the placeholder string with the real CRON_SECRET value from
-- env.server.ts (matching `z.string().min(32)`) before running this
-- migration, OR — preferred — leaves this block commented-out and runs
-- vault.create_secret() directly in the Supabase SQL Editor as a one-shot
-- out-of-band operation. Either way, the committed SQL file must never
-- contain a real 48+ char random-looking token.
--
-- Verification post-apply:
--   SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret';
--   -- Expected: exactly one row
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'dealdrop_cron_secret') then
    perform vault.create_secret(
      'CRON_SECRET-value-goes-here',   -- PLACEHOLDER — replace before applying
      'dealdrop_cron_secret',
      'Bearer token for DealDrop /api/cron/check-prices (Phase 6 CRON-11)'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Step 2: SECURITY DEFINER wrapper function.
--
-- Why SECURITY DEFINER: without it, this function runs with the privileges
-- of the INVOKING role (pg_cron typically runs jobs as service_role). That
-- role does not by default have SELECT on vault.decrypted_secrets. Marking
-- the function SECURITY DEFINER makes it run with the OWNER's privileges
-- (the migration-applying role, typically postgres), which does have access.
--
-- Why `set search_path`: SECURITY DEFINER functions must pin search_path to
-- prevent search-path hijacking attacks. We whitelist only public, vault,
-- and net — the three schemas the function legitimately needs.
--
-- Why REVOKE/GRANT: by default, any role with CONNECT can EXECUTE public
-- functions. Without explicit REVOKE, an authenticated user could call this
-- function via the Supabase REST API and trigger cron out-of-schedule
-- (potential DoS on Firecrawl credits). Only service_role (used by
-- pg_cron internally) keeps EXECUTE.
--
-- Pitfall 10 (T-6-01 severity): DO NOT raise-notice or raise-log the decrypted
-- secret variable inside this function — Supabase log aggregation would index
-- the plaintext secret into a searchable log store. Non-sensitive trace
-- (`raise notice 'request_id = %', v_request_id;`) is safe.
-- ---------------------------------------------------------------------------

create or replace function public.trigger_price_check_cron()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $func$
declare
  v_secret text;
  v_request_id bigint;
begin
  -- Read the decrypted secret inside this function's elevated-privilege scope.
  -- The view is only queryable here because of SECURITY DEFINER.
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'dealdrop_cron_secret';

  if v_secret is null then
    -- Loud-but-safe failure: the job row is still recorded in cron.job_run_details
    -- as failed, giving operators a breadcrumb. We do NOT print v_secret anywhere.
    raise exception 'dealdrop_cron_secret not set in vault — run Step 1 of migration 0005 with a real token';
  end if;

  -- Call the Vercel Route Handler. The URL is the production hostname; update
  -- this string before deploying to a different production domain.
  -- timeout_milliseconds = 290000 sits just under the handler's maxDuration=300s
  -- (belt-and-suspenders; pg_net is async so this is advisory).
  select net.http_post(
    url := 'https://dealdrop.vercel.app/api/cron/check-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 290000
  ) into v_request_id;

  -- Non-sensitive trace is fine; DO NOT log v_secret.
  raise notice 'trigger_price_check_cron: request_id = %', v_request_id;

  return v_request_id;
end
$func$;

revoke execute on function public.trigger_price_check_cron() from public;
revoke execute on function public.trigger_price_check_cron() from anon;
revoke execute on function public.trigger_price_check_cron() from authenticated;
grant  execute on function public.trigger_price_check_cron() to service_role;

-- ---------------------------------------------------------------------------
-- Step 3: Schedule the daily job (idempotent).
--
-- `0 9 * * *` fires at 09:00 UTC every day. pg_cron does NOT support TZ
-- conversion in the schedule expression — the server clock is always UTC.
-- If "9 AM somewhere-else" is the product spec, pick a UTC offset instead
-- (e.g., `0 13 * * *` = 09:00 US Eastern Standard).
--
-- The cron.unschedule guard makes re-running this migration idempotent:
-- if the job already exists, drop it first; then schedule fresh. Prevents
-- Pitfall 4 (duplicate-name behavior is undocumented in pg_cron).
-- ---------------------------------------------------------------------------

do $$
begin
  perform cron.unschedule('dealdrop-daily-price-check')
  where exists (select 1 from cron.job where jobname = 'dealdrop-daily-price-check');
end $$;

select cron.schedule(
  'dealdrop-daily-price-check',
  '0 9 * * *',                              -- 09:00 UTC daily (Pitfall 2 — server clock is UTC)
  $$select public.trigger_price_check_cron()$$
);

-- ---------------------------------------------------------------------------
-- Grep-cleanliness post-check (to be run from the SQL Editor after apply):
--
--   SELECT jobname, command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check';
--   -- Expected command = 'select public.trigger_price_check_cron()'
--   -- Expected NO substring matching the real CRON_SECRET value.
--
--   SELECT has_function_privilege('anon', 'public.trigger_price_check_cron()', 'execute');          -- expect false
--   SELECT has_function_privilege('authenticated', 'public.trigger_price_check_cron()', 'execute'); -- expect false
--   SELECT has_function_privilege('service_role', 'public.trigger_price_check_cron()', 'execute');  -- expect true
-- ---------------------------------------------------------------------------
