// File: dealdrop/src/lib/cron/auth.test.ts
// Wave 0 skeleton — RED until Plan 04 implements @/lib/cron/auth.
// Covers: CRON-02 (Bearer-token auth 401 on missing/wrong token).
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

type AuthMod = typeof import('@/lib/cron/auth')
let mod: AuthMod
beforeAll(async () => {
  mod = await import('@/lib/cron/auth')
})

// RED-state probe — triggers the dynamic beforeAll import so "Cannot find module
// '@/lib/cron/auth'" surfaces as an error instead of silently skipping. Plan 04 deletes
// this block after `@/lib/cron/auth` exists.
describe('wave-0 import probe', () => {
  it('loads @/lib/cron/auth (flips to expected RED: module not found)', () => {
    expect(mod).toBeDefined()
  })
})

describe('verifyCronBearer (CRON-02)', () => {
  it.todo('returns false when authHeader is null')
  it.todo('returns false when authHeader does not start with "Bearer "')
  it.todo('returns false when provided token has different length than secret')
  it.todo('returns false when provided token is same-length but wrong bytes')
  it.todo('returns true when provided token exactly equals secret (constant-time compare)')
  it.todo('does not throw RangeError when lengths differ (timingSafeEqual length-safety)')
})

// Reference `mod` to silence unused-var lint. Real tests in Plan 04 use mod.verifyCronBearer.
void mod
void expect
