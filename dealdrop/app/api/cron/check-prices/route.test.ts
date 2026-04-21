// File: dealdrop/app/api/cron/check-prices/route.test.ts
// Plan 05 GREEN — Route Handler contract: GET public health check + POST
// Bearer-guarded cron body. Covers CRON-01, CRON-02, CRON-03, CRON-05.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  // Plan 02 Deviation 2: env.server.ts validates RESEND_FROM_EMAIL with
  // Zod v4 z.email(), which rejects the "Name <addr@domain>" mailbox format.
  vi.stubEnv('RESEND_FROM_EMAIL', 'alerts@example.com')
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
// NOTE: @/lib/cron/auth is intentionally NOT mocked — we want the real
// verifyCronBearer (pure, cheap) to exercise the Bearer-comparison path
// end-to-end through the Route Handler.

// NOTE: Use co-located `./route` specifier — the Plan 01 skeleton originally
// used a 5-level `../../../../../app/api/cron/check-prices/route` path which
// resolves OUTSIDE the `dealdrop/` package root (the test file is already
// 4 levels deep from dealdrop/, so ../../../../../app/... escapes the project).
// Co-located specifier is the idiomatic Next.js App Router test pattern.
type RouteMod = typeof import('./route')
let routeMod: RouteMod
beforeAll(async () => {
  routeMod = await import('./route')
})

// Helper: construct a NextRequest-compatible mock via the Web Platform `Request`
// global. Vitest node env provides `Request`, `Response`, `Headers` from undici.
function makeRequest(authHeader?: string, method: 'GET' | 'POST' = 'POST'): Request {
  const headers = new Headers()
  if (authHeader) headers.set('Authorization', authHeader)
  return new Request('http://localhost/api/cron/check-prices', { method, headers })
}

describe('route handler config exports (CRON-05)', () => {
  it('exports maxDuration = 300', () => {
    expect(routeMod.maxDuration).toBe(300)
  })
  it('exports dynamic = "force-dynamic"', () => {
    expect(routeMod.dynamic).toBe('force-dynamic')
  })
  it('exports runtime = "nodejs"', () => {
    expect(routeMod.runtime).toBe('nodejs')
  })
})

describe('GET /api/cron/check-prices (CRON-01)', () => {
  it('returns 200 with { status: "ok" } without auth header', async () => {
    const response = await routeMod.GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('does NOT call runPriceCheck (health check only)', async () => {
    const { runPriceCheck } = await import('@/lib/cron/check-prices')
    vi.mocked(runPriceCheck).mockClear()
    await routeMod.GET()
    expect(runPriceCheck).not.toHaveBeenCalled()
  })
})

describe('POST /api/cron/check-prices (CRON-02/03)', () => {
  it('returns 401 when Authorization header missing', async () => {
    const res = await routeMod.POST(makeRequest() as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await routeMod.POST(makeRequest('Token ' + 'a'.repeat(48)) as never)
    expect(res.status).toBe(401)
  })

  it('returns 401 when Bearer token does not match CRON_SECRET', async () => {
    const res = await routeMod.POST(makeRequest('Bearer ' + 'b'.repeat(48)) as never)
    expect(res.status).toBe(401)
  })

  it('returns 200 when Bearer token matches CRON_SECRET', async () => {
    const res = await routeMod.POST(makeRequest('Bearer ' + 'a'.repeat(48)) as never)
    expect(res.status).toBe(200)
  })

  it('calls runPriceCheck with admin client on success (CRON-03)', async () => {
    const { runPriceCheck } = await import('@/lib/cron/check-prices')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(runPriceCheck).mockClear()
    vi.mocked(createAdminClient).mockClear()
    await routeMod.POST(makeRequest('Bearer ' + 'a'.repeat(48)) as never)
    expect(createAdminClient).toHaveBeenCalled()
    expect(runPriceCheck).toHaveBeenCalledTimes(1)
  })

  it('returns JSON body { status, scraped, updated, dropped, failed } on success', async () => {
    const res = await routeMod.POST(makeRequest('Bearer ' + 'a'.repeat(48)) as never)
    const body = await res.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('scraped')
    expect(body).toHaveProperty('updated')
    expect(body).toHaveProperty('dropped')
    expect(body).toHaveProperty('failed')
    expect(Array.isArray(body.failed)).toBe(true)
  })
})
