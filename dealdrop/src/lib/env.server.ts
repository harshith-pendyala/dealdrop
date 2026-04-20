import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// This file carries the SERVER block of the t3-oss/env-nextjs schema. It is split from
// `./env.ts` (client-only) so the server env-var NAMES never reach the client bundle.
// Plan 03-04 proved that co-locating the server schema with the client schema leaked
// the literal string `FIRECRAWL_API_KEY` into `.next/static/**`. Keeping the names off
// the client bundle is the T-3-01 belt-and-suspenders mitigation.
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    CRON_SECRET: z.string().min(32), // enforce length to discourage weak secrets
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
