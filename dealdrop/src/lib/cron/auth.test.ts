// File: dealdrop/src/lib/cron/auth.test.ts
// Plan 04: Flipped from Plan 01's RED skeleton to GREEN.
// Covers: CRON-02 (Bearer-token auth 401 on missing/wrong token).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'alerts@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })

type AuthMod = typeof import('@/lib/cron/auth')
let mod: AuthMod
beforeAll(async () => {
  mod = await import('@/lib/cron/auth')
})

describe('verifyCronBearer (CRON-02)', () => {
  const SECRET = 'a'.repeat(48)

  it('returns false when authHeader is null', () => {
    expect(mod.verifyCronBearer(null, SECRET)).toBe(false)
  })

  it('returns false when authHeader does not start with "Bearer "', () => {
    expect(mod.verifyCronBearer('Token ' + SECRET, SECRET)).toBe(false)
    expect(mod.verifyCronBearer('bearer ' + SECRET, SECRET)).toBe(false) // case-sensitive
    expect(mod.verifyCronBearer(SECRET, SECRET)).toBe(false)              // no prefix at all
  })

  it('returns false when provided token has different length than secret', () => {
    expect(mod.verifyCronBearer('Bearer short', SECRET)).toBe(false)
    expect(mod.verifyCronBearer('Bearer ' + 'a'.repeat(100), SECRET)).toBe(false)
  })

  it('returns false when provided token is same-length but wrong bytes', () => {
    const wrong = 'b'.repeat(48)
    expect(wrong.length).toBe(SECRET.length) // sanity
    expect(mod.verifyCronBearer('Bearer ' + wrong, SECRET)).toBe(false)
  })

  it('returns true when provided token exactly equals secret (constant-time compare)', () => {
    expect(mod.verifyCronBearer('Bearer ' + SECRET, SECRET)).toBe(true)
  })

  it('does not throw RangeError when lengths differ (timingSafeEqual length-safety)', () => {
    expect(() => mod.verifyCronBearer('Bearer short', SECRET)).not.toThrow()
  })
})
