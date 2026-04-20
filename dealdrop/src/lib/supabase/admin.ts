import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
import { createClient } from '@supabase/supabase-js'
import { env as clientEnv } from '@/lib/env'
import { env as serverEnv } from '@/lib/env.server'

export function createAdminClient() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY, // server-only env var, never NEXT_PUBLIC_
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
