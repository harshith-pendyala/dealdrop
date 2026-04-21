// File: dealdrop/src/lib/cron/check-prices.test.ts
// Wave 0 skeleton — RED until Plan 04 implements @/lib/cron/check-prices.
// Covers: CRON-03, CRON-04, CRON-06, CRON-07, CRON-08, CRON-09, EMAIL-01, EMAIL-05, EMAIL-06.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/lib/firecrawl/scrape-product', () => ({
  scrapeProduct: vi.fn(),
}))
vi.mock('@/lib/resend', () => ({
  sendPriceDropAlert: vi.fn(),
}))

type CronMod = typeof import('@/lib/cron/check-prices')
let mod: CronMod
beforeAll(async () => {
  mod = await import('@/lib/cron/check-prices')
})

let errSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  warnSpy.mockRestore()
  vi.clearAllMocks()
})

// RED-state probe — triggers the dynamic beforeAll import so "Cannot find module
// '@/lib/cron/check-prices'" surfaces as an error instead of silently skipping.
// Plan 04 deletes this block after `@/lib/cron/check-prices` exists.
describe('wave-0 import probe', () => {
  it('loads @/lib/cron/check-prices (flips to expected RED: module not found)', () => {
    expect(mod).toBeDefined()
  })
})

describe('runPriceCheck orchestrator (CRON-03/04/06/07/08/09, EMAIL-01/05/06)', () => {
  it.todo('calls admin.from("products").select("*").order("created_at", { ascending: true }) exactly once (CRON-03)')
  it.todo('calls scrapeProduct once per product (CRON-06)')
  it.todo('caps concurrent scrapeProduct calls at 3 via p-limit (CRON-04)')
  it.todo('on scrape_failed: updates products.last_scrape_failed_at and continues to next product (CRON-09)')
  it.todo('on scrape_failed: does NOT insert price_history row (CRON-09, D-03)')
  it.todo('on unchanged price: inserts zero price_history rows (CRON-08 idempotency)')
  it.todo('on unchanged price + previously failing: clears last_scrape_failed_at with conditional UPDATE')
  it.todo('on price change: INSERT price_history THEN UPDATE products (CRON-07, D-04)')
  it.todo('on price change: updates products.current_price, updated_at, last_scrape_failed_at=null (D-04)')
  it.todo('on price drop (new < old): calls sendPriceDropAlert with correct oldPrice/newPrice (EMAIL-01)')
  it.todo('on price drop: recipient email resolved via admin.auth.admin.getUserById (EMAIL-05)')
  it.todo('on price drop + user.email undefined: logs recipient_email_missing and skips email')
  it.todo('on currency_code mismatch: logs cron: currency_changed and skips insert/email (RESEARCH Pattern 8)')
  it.todo('on resend send_failed: logs but does not abort run; next product still processed (EMAIL-06)')
  it.todo('uses Promise.allSettled (not Promise.all) — single product rejection does not cancel batch')
  it.todo('returns CronSummary { status: "ok", scraped, updated, dropped, failed: [...] }')
})

// Reference `mod` to silence unused-var lint. Real tests in Plan 04 use mod.runPriceCheck.
void mod
void expect
