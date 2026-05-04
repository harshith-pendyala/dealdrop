// File: dealdrop/src/lib/cron/check-prices.test.ts
// Plan 04: Flipped from Plan 01's RED skeleton to GREEN.
// Covers: CRON-03, CRON-04, CRON-06, CRON-07, CRON-08, CRON-09, EMAIL-01, EMAIL-05, EMAIL-06.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  // Plan 02 deviation 2: Zod v4 z.email() rejects mailbox format.
  // Use bare address here — env.server.ts validation is stricter than Resend's wire format.
  vi.stubEnv('RESEND_FROM_EMAIL', 'alerts@example.com')
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

import { makeSupabaseAdminMock } from '@/__mocks__/supabase-admin'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import { sendPriceDropAlert } from '@/lib/resend'

// Helper: build a realistic ProductRow for tests.
type ProductRow = {
  id: string
  user_id: string
  url: string
  name: string
  current_price: number
  currency: string
  image_url: string | null
  last_scrape_failed_at: string | null
  created_at: string
  updated_at: string
}
const makeProduct = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: 'p-1',
  user_id: 'u-1',
  url: 'https://shop.example.com/item-1',
  name: 'Product One',
  current_price: 100,
  currency: 'USD',
  image_url: 'https://cdn.example.com/1.jpg',
  last_scrape_failed_at: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...over,
})

describe('runPriceCheck orchestrator (CRON-03/04/06/07/08/09, EMAIL-01/05/06)', () => {
  it('calls admin.from("products").select("*").order("created_at", { ascending: true }) once (CRON-03)', async () => {
    const products = [makeProduct()]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Product One', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)
    const fromCalls = (admin.from as unknown as { mock: { calls: [string][] } }).mock.calls
    const productsCall = fromCalls.findIndex((c) => c[0] === 'products')
    expect(productsCall).toBeGreaterThanOrEqual(0)
  })

  it('calls scrapeProduct once per product (CRON-06)', async () => {
    const products = [
      makeProduct({ id: 'p-1' }),
      makeProduct({ id: 'p-2', url: 'https://shop.example.com/2' }),
    ]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'x', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)
    expect(scrapeProduct).toHaveBeenCalledTimes(2)
    expect(scrapeProduct).toHaveBeenCalledWith('https://shop.example.com/item-1')
    expect(scrapeProduct).toHaveBeenCalledWith('https://shop.example.com/2')
  })

  it('caps concurrent scrapeProduct calls at 3 via p-limit (CRON-04)', async () => {
    // Observe the peak simultaneous in-flight count.
    const products = Array.from({ length: 8 }, (_, i) =>
      makeProduct({ id: `p-${i}`, url: `https://shop.example.com/i${i}` })
    )
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    let inFlight = 0
    let peak = 0
    vi.mocked(scrapeProduct).mockImplementation(async () => {
      inFlight++
      if (inFlight > peak) peak = inFlight
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return {
        ok: true,
        data: { name: 'x', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
      }
    })
    await mod.runPriceCheck(admin as never)
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(0)
  })

  it('on scrape_failed: updates products.last_scrape_failed_at and continues (CRON-09, D-03)', async () => {
    const products = [
      makeProduct({ id: 'p-fail' }),
      makeProduct({ id: 'p-ok', url: 'https://shop.example.com/ok' }),
    ]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct)
      .mockResolvedValueOnce({ ok: false, reason: 'scrape_timeout' })
      .mockResolvedValueOnce({
        ok: true,
        data: { name: 'x', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
      })
    const summary = await mod.runPriceCheck(admin as never)
    expect(summary.failed).toEqual([{ product_id: 'p-fail', reason: 'scrape_timeout' }])
    expect(summary.scraped).toBe(2)
    expect(scrapeProduct).toHaveBeenCalledTimes(2)

    // Assert a products.update() was called that sets last_scrape_failed_at (non-null).
    const fromMock = (admin.from as unknown as {
      mock: {
        calls: [string][]
        results: { value: { update: ReturnType<typeof vi.fn> } }[]
      }
    }).mock
    const anyUpdateWithFailedAt = fromMock.results.some((r, i) => {
      if (fromMock.calls[i][0] !== 'products') return false
      const calls = r.value.update.mock.calls
      return calls.some(
        (c: unknown[]) =>
          typeof c[0] === 'object' &&
          c[0] !== null &&
          'last_scrape_failed_at' in (c[0] as object) &&
          (c[0] as { last_scrape_failed_at: unknown }).last_scrape_failed_at !== null
      )
    })
    expect(anyUpdateWithFailedAt).toBe(true)

    // Structured-log check
    expect(errSpy).toHaveBeenCalledWith(
      'cron: scrape_failed',
      expect.objectContaining({ productId: 'p-fail', reason: 'scrape_timeout' })
    )
  })

  it('on scrape_failed: does NOT insert price_history row (CRON-09, D-03)', async () => {
    const products = [makeProduct({ id: 'p-fail' })]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct).mockResolvedValueOnce({ ok: false, reason: 'network_error' })
    await mod.runPriceCheck(admin as never)
    const fromCalls = (admin.from as unknown as { mock: { calls: [string][] } }).mock.calls
    expect(fromCalls.find((c) => c[0] === 'price_history')).toBeUndefined()
  })

  it('on unchanged price: inserts zero price_history rows (CRON-08 idempotency)', async () => {
    const products = [makeProduct({ id: 'p-1', current_price: 100 })]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Product One', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)

    const fromCalls = (admin.from as unknown as { mock: { calls: [string][] } }).mock.calls
    expect(fromCalls.find((c) => c[0] === 'price_history')).toBeUndefined()
  })

  it('on unchanged price + previously failing: conditional UPDATE clears last_scrape_failed_at', async () => {
    const products = [
      makeProduct({
        id: 'p-recover',
        current_price: 100,
        last_scrape_failed_at: '2026-04-10T00:00:00Z',
      }),
    ]
    const admin = makeSupabaseAdminMock({ selectProducts: { data: products, error: null } })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'x', current_price: 100, currency_code: 'USD', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)

    // Assert at least one update payload { last_scrape_failed_at: null } on products.
    const fromMock = (admin.from as unknown as {
      mock: {
        calls: [string][]
        results: { value: { update: ReturnType<typeof vi.fn> } }[]
      }
    }).mock
    let sawClear = false
    for (let i = 0; i < fromMock.calls.length; i++) {
      if (fromMock.calls[i][0] !== 'products') continue
      const upd = fromMock.results[i].value.update.mock.calls
      for (const c of upd) {
        if (
          typeof c[0] === 'object' &&
          c[0] !== null &&
          (c[0] as { last_scrape_failed_at?: unknown }).last_scrape_failed_at === null
        ) {
          sawClear = true
        }
      }
    }
    expect(sawClear).toBe(true)
  })

  it('on price change: INSERT price_history THEN UPDATE products (CRON-07, D-04)', async () => {
    const products = [makeProduct({ current_price: 100 })]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: { 'u-1': { id: 'u-1', email: 'user@example.com' } },
    })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'x', current_price: 82, currency_code: 'USD', image_url: null, mrp: null },
    })
    vi.mocked(sendPriceDropAlert).mockResolvedValue({ ok: true, messageId: 'm1' })

    await mod.runPriceCheck(admin as never)

    // Assert a price_history insert was called with the new price.
    const fromMock = (admin.from as unknown as {
      mock: {
        calls: [string][]
        results: {
          value: {
            insert: ReturnType<typeof vi.fn>
            update: ReturnType<typeof vi.fn>
          }
        }[]
      }
    }).mock
    const historyIdx = fromMock.calls.findIndex((c) => c[0] === 'price_history')
    expect(historyIdx).toBeGreaterThanOrEqual(0)
    const insertPayload = fromMock.results[historyIdx].value.insert.mock.calls[0][0]
    expect(insertPayload).toMatchObject({
      product_id: 'p-1',
      price: 82,
      currency: 'USD',
    })

    // Assert a products update with current_price: 82 and last_scrape_failed_at: null.
    let sawProductsUpdate = false
    for (let i = 0; i < fromMock.calls.length; i++) {
      if (fromMock.calls[i][0] !== 'products') continue
      const upd = fromMock.results[i].value.update.mock.calls
      for (const c of upd) {
        if (
          typeof c[0] === 'object' &&
          c[0] !== null &&
          (c[0] as { current_price?: unknown }).current_price === 82 &&
          (c[0] as { last_scrape_failed_at?: unknown }).last_scrape_failed_at === null
        ) {
          sawProductsUpdate = true
        }
      }
    }
    expect(sawProductsUpdate).toBe(true)
  })

  it('on price drop: calls sendPriceDropAlert with correct input (EMAIL-01, EMAIL-05)', async () => {
    const products = [makeProduct({ current_price: 100, user_id: 'u-1' })]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: { 'u-1': { id: 'u-1', email: 'buyer@example.com' } },
    })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: {
        name: 'Product One',
        current_price: 82,
        currency_code: 'USD',
        image_url: 'https://cdn.example.com/scraped.jpg',
        mrp: null,
      },
    })
    vi.mocked(sendPriceDropAlert).mockResolvedValue({ ok: true, messageId: 'm1' })

    await mod.runPriceCheck(admin as never)

    expect(sendPriceDropAlert).toHaveBeenCalledTimes(1)
    expect(sendPriceDropAlert).toHaveBeenCalledWith({
      to: 'buyer@example.com',
      product: {
        name: 'Product One',
        url: 'https://shop.example.com/item-1',
        image_url: 'https://cdn.example.com/1.jpg', // DB row image_url (not scraped)
        currency: 'USD',
      },
      oldPrice: 100,
      newPrice: 82,
    })
  })

  it('on price drop + missing email: logs recipient_email_missing and skips email', async () => {
    const products = [makeProduct({ current_price: 100, user_id: 'u-missing' })]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: {}, // u-missing absent → getUserById returns error
    })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'x', current_price: 82, currency_code: 'USD', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)
    expect(sendPriceDropAlert).not.toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalledWith(
      'cron: recipient_email_missing',
      expect.objectContaining({ productId: 'p-1', userId: 'u-missing' })
    )
  })

  it('on currency_code mismatch: warns and skips insert + email (Pattern 8)', async () => {
    const products = [makeProduct({ current_price: 100, currency: 'USD' })]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: { 'u-1': { id: 'u-1', email: 'buyer@example.com' } },
    })
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'x', current_price: 82, currency_code: 'EUR', image_url: null, mrp: null },
    })
    await mod.runPriceCheck(admin as never)

    const fromCalls = (admin.from as unknown as { mock: { calls: [string][] } }).mock.calls
    expect(fromCalls.find((c) => c[0] === 'price_history')).toBeUndefined()
    expect(sendPriceDropAlert).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      'cron: currency_changed',
      expect.objectContaining({
        productId: 'p-1',
        oldCurrency: 'USD',
        scrapedCurrency: 'EUR',
      })
    )
  })

  it('on resend send_failed: logs and continues run (EMAIL-06)', async () => {
    const products = [
      makeProduct({ id: 'p-1', current_price: 100 }),
      makeProduct({ id: 'p-2', current_price: 200, url: 'https://shop.example.com/2' }),
    ]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: { 'u-1': { id: 'u-1', email: 'a@x.com' } },
    })
    vi.mocked(scrapeProduct)
      .mockResolvedValueOnce({
        ok: true,
        data: { name: 'x', current_price: 80, currency_code: 'USD', image_url: null, mrp: null },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { name: 'y', current_price: 150, currency_code: 'USD', image_url: null, mrp: null },
      })
    // First drop fails to send; second should still be attempted.
    vi.mocked(sendPriceDropAlert)
      .mockResolvedValueOnce({ ok: false, reason: 'rate_limited' })
      .mockResolvedValueOnce({ ok: true, messageId: 'm2' })

    const summary = await mod.runPriceCheck(admin as never)

    // Both products processed despite p-1 email failure.
    expect(scrapeProduct).toHaveBeenCalledTimes(2)
    expect(summary.dropped).toBe(2)
    // Both drops resolved to the same u-1 user via default makeProduct user_id.
    expect(sendPriceDropAlert).toHaveBeenCalledTimes(2)
  })

  it('returns CronSummary with correct counters on mixed-outcome batch', async () => {
    const products = [
      makeProduct({ id: 'p-1', current_price: 100 }), // will drop
      makeProduct({ id: 'p-2', current_price: 50 }), // unchanged
      makeProduct({ id: 'p-3', current_price: 10 }), // scrape fails
    ]
    const admin = makeSupabaseAdminMock({
      selectProducts: { data: products, error: null },
      userById: { 'u-1': { id: 'u-1', email: 'buyer@example.com' } },
    })
    vi.mocked(scrapeProduct)
      .mockResolvedValueOnce({
        ok: true,
        data: { name: 'x', current_price: 82, currency_code: 'USD', image_url: null, mrp: null },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { name: 'y', current_price: 50, currency_code: 'USD', image_url: null, mrp: null },
      })
      .mockResolvedValueOnce({ ok: false, reason: 'network_error' })
    vi.mocked(sendPriceDropAlert).mockResolvedValue({ ok: true, messageId: 'm' })

    const summary = await mod.runPriceCheck(admin as never)
    expect(summary.status).toBe('ok')
    expect(summary.scraped).toBe(3)
    expect(summary.updated).toBe(1) // only p-1 changed
    expect(summary.dropped).toBe(1) // only p-1 was a drop
    expect(summary.failed).toEqual([{ product_id: 'p-3', reason: 'network_error' }])
  })
})
