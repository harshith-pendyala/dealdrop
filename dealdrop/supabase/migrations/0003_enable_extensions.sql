-- Source: https://supabase.com/docs/guides/database/extensions
-- Phase 6 will use these. Phase 1 enables them so migrations stay linear.

create extension if not exists pg_cron;
create extension if not exists pg_net;
