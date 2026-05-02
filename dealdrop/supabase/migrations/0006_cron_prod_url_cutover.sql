-- File: dealdrop/supabase/migrations/0006_cron_prod_url_cutover.sql
-- DEP-05: Cut the dealdrop-daily-price-check pg_cron job over to the production
-- Vercel URL (https://dealdrop-khaki.vercel.app). Idempotent — safe to re-run on
-- a fresh prod project that never had the dev URL job. Re-creates the
-- SECURITY DEFINER wrapper with the prod URL constant and re-registers the
-- cron schedule.
--
-- Source: https://supabase.com/docs/guides/database/vault
-- Source: https://supabase.com/docs/guides/database/extensions/pg_net
-- Source: https://github.com/citusdata/pg_cron
-- Source: https://supabase.com/docs/guides/cron/quickstart
--
-- Prerequisite (out-of-repo): the Vault secret `dealdrop_cron_secret` must
-- already exist in this Supabase project. Plan 07-05 Task 1 Step 5 created it
-- in the prod project. If applying to a different fresh project, run this in
-- the SQL Editor FIRST (and only there — never commit the plaintext value):
--
--   SELECT vault.create_secret(
--     '<paste real prod CRON_SECRET (>=32 chars; project convention is 48)>',
--     'dealdrop_cron_secret',
--     'Bearer token for DealDrop /api/cron/check-prices (prod)'
--   );
--
-- The exact same value MUST be set as `CRON_SECRET` in Vercel `production`
-- env scope (verifyCronBearer compares them; they must match bit-for-bit).
--
-- Verification post-apply (run from SQL Editor):
--   SELECT name FROM vault.secrets WHERE name = 'dealdrop_cron_secret';   -- 1 row
--   SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check';
--   SELECT pg_get_functiondef('public.trigger_price_check_cron'::regprocedure);
--
-- Why a new migration instead of editing 0005: CONTEXT.md "migration-per-concern,
-- never reopen a prior migration". 0005 stays as the reference for what dev was
-- pointing at; 0006 records the intentional cutover to the prod URL. The wrapper
-- function body is identical to migration 0005 EXCEPT for the URL string and
-- the raise-exception hint message.

-- ---------------------------------------------------------------------------
-- Step 1: Re-create the SECURITY DEFINER wrapper with the PROD URL.
-- All other invariants from 0005 are preserved verbatim:
--   - SECURITY DEFINER + pinned search_path (search-path hijack defence)
--   - vault.decrypted_secrets read inside elevated scope
--   - non-sensitive raise notice (Pitfall 10 — never log the secret)
--   - REVOKE FROM public/anon/authenticated, GRANT TO service_role
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
    raise exception 'dealdrop_cron_secret not set in vault — create it via vault.create_secret() in the prod project before applying 0006';
  end if;

  -- PROD URL — cut over from the dev placeholder (dealdrop.vercel.app) to the
  -- assigned prod stable alias (dealdrop-khaki.vercel.app). timeout_milliseconds
  -- = 290000 sits just under the handler maxDuration=300s (belt-and-suspenders;
  -- pg_net is async so this is advisory).
  select net.http_post(
    url := 'https://dealdrop-khaki.vercel.app/api/cron/check-prices',
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
-- Step 2: Idempotent unschedule + reschedule.
--
-- The WHERE EXISTS guard makes re-running this migration on a brand-new prod
-- project (where the dev URL job was never registered) a no-op for the
-- unschedule call (no error). Then schedule fresh — cron.schedule by name is
-- itself idempotent, so a second run just no-ops the schedule too.
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
-- Grep-cleanliness post-check (run from SQL Editor after apply):
--
--   SELECT jobname, command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check';
--   -- Expected command = 'select public.trigger_price_check_cron()'
--   -- Expected NO substring matching the real CRON_SECRET value.
--
--   SELECT has_function_privilege('anon', 'public.trigger_price_check_cron()', 'execute');          -- expect false
--   SELECT has_function_privilege('authenticated', 'public.trigger_price_check_cron()', 'execute'); -- expect false
--   SELECT has_function_privilege('service_role', 'public.trigger_price_check_cron()', 'execute');  -- expect true
-- ---------------------------------------------------------------------------
