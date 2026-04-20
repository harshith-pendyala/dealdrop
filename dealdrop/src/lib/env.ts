// Client-safe env schema. Consumed by Server Components, Client Components, and
// anything that only needs NEXT_PUBLIC_* vars. The SERVER block lives in
// `./env.server.ts` (guarded by `import 'server-only'`) so server env-var NAMES
// do NOT reach the client bundle. Splitting is required because `@t3-oss/env-nextjs`
// emits the server-block keys into any module that imports the combined `env` —
// if one of those consumers is bundled for the client, the key NAMES leak even
// though the VALUES stay empty at runtime.
//
// Import rule:
//   - Anything that reads NEXT_PUBLIC_* only  → `import { env } from '@/lib/env'`
//   - Anything that reads server-only secrets → `import { env } from '@/lib/env.server'`
//
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
