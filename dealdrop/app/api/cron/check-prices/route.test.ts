// File: dealdrop/app/api/cron/check-prices/route.test.ts
// Wave 0 skeleton — RED until Plan 05 implements the Route Handler.
// Covers: CRON-01 (GET ok), CRON-02 (POST 401 on bad bearer), CRON-05 (maxDuration export).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'DealDrop <alerts@example.com>')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })

vi.mock('@/lib/cron/check-prices', () => ({
  runPriceCheck: vi.fn().mockResolvedValue({
    status: 'ok', scraped: 0, updated: 0, dropped: 0, failed: [],
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ /* admin client mock */ })),
}))

type RouteMod = typeof import('../../../../../app/api/cron/check-prices/route')
let routeMod: RouteMod
beforeAll(async () => {
  routeMod = await import('../../../../../app/api/cron/check-prices/route')
})

// RED-state probe — triggers the dynamic beforeAll import so "Cannot find module
// '../../../../../app/api/cron/check-prices/route'" surfaces as an error instead of
// silently skipping. Plan 05 deletes this block after the route handler exists.
describe('wave-0 import probe', () => {
  it('loads the route module (flips to expected RED: module not found)', () => {
    expect(routeMod).toBeDefined()
  })
})

describe('route handler config exports (CRON-05)', () => {
  it.todo('exports maxDuration = 300')
  it.todo('exports dynamic = "force-dynamic"')
  it.todo('exports runtime = "nodejs"')
})

describe('GET /api/cron/check-prices (CRON-01)', () => {
  it.todo('returns 200 with { status: "ok" } without auth header')
  it.todo('does NOT call runPriceCheck (health check only)')
})

describe('POST /api/cron/check-prices (CRON-02)', () => {
  it.todo('returns 401 when Authorization header missing')
  it.todo('returns 401 when Authorization header does not start with Bearer')
  it.todo('returns 401 when Bearer token does not match CRON_SECRET')
  it.todo('returns 200 when Bearer token matches CRON_SECRET')
  it.todo('calls runPriceCheck with admin client on success')
  it.todo('returns JSON body { status, scraped, updated, dropped, failed } on success')
})

// Reference `routeMod` to silence unused-var lint. Real tests in Plan 05 use routeMod.GET + routeMod.POST.
void routeMod
void expect
