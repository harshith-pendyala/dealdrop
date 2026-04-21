// File: dealdrop/app/api/cron/check-prices/route.ts
// Phase 6 Route Handler — GET (public health) + POST (Bearer-guarded cron).
//
// CRON-01: GET returns { status: 'ok' } without authentication.
// CRON-02: POST returns 401 on missing/wrong Bearer token.
// CRON-03: POST uses admin client to bypass RLS.
// CRON-05: maxDuration = 300 — Vercel Node runtime execution limit for cron.
//
// Next.js 16 reference: node_modules/next/dist/docs/01-app/03-api-reference/
//   03-file-conventions/route.md + .../02-route-segment-config/maxDuration.md.
// Per dealdrop/AGENTS.md: this is NOT the Next.js you know — exports must match
// the installed package's docs, not external tutorials.
//
// Note: `import 'server-only'` is OPTIONAL on route.ts files (Route Handlers
// are server-only by virtue of the App Router — they never enter the client
// bundle). Helper modules under src/lib/cron/ still require it as line 1.

import type { NextRequest } from 'next/server'
import { env } from '@/lib/env.server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronBearer } from '@/lib/cron/auth'
import { runPriceCheck } from '@/lib/cron/check-prices'

// Route Segment Config — module-scope constants.
// Verified against node_modules/next/dist/docs/.../maxDuration.md
// and .../caching-without-cache-components.md (this project does NOT
// enable cacheComponents in next.config.ts, so `dynamic` is valid).
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// -----------------------------------------------------------------
// GET /api/cron/check-prices — public health check.
// No auth, no admin client, no scraping. Used by uptime monitors and
// the Phase 7 DEP-06 manual-trigger smoke test ("is the endpoint alive?").
// -----------------------------------------------------------------
export async function GET() {
  return Response.json({ status: 'ok' })
}

// -----------------------------------------------------------------
// POST /api/cron/check-prices — the actual cron body.
// Called by pg_cron (via the Vault-backed wrapper function in migration
// 0005) with the Authorization: Bearer <CRON_SECRET> header.
// -----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const header = request.headers.get('Authorization')
  if (!verifyCronBearer(header, env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const summary = await runPriceCheck(admin)
  return Response.json(summary)
}
