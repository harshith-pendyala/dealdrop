import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY, // server-only env var, never NEXT_PUBLIC_
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
