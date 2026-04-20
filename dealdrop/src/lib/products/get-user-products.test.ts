import {
  describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll,
} from 'vitest'
import { makeSupabaseMock } from '@/__mocks__/supabase-server'

// All 7 env vars required by the Zod env validator (see Phase 1 FND-02).
// Copied verbatim from dealdrop/src/actions/products.test.ts:9-18.
beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

type GetUserProductsModule = typeof import('@/lib/products/get-user-products')
let mod: GetUserProductsModule
beforeAll(async () => {
  mod = await import('@/lib/products/get-user-products')
})

let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  vi.clearAllMocks()
})

describe('getUserProducts', () => {
  it('CHART-02: returns products with nested price_history on happy path', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = makeSupabaseMock({
      selectProducts: {
        data: [
          {
            id: 'p1',
            user_id: 'u1',
            url: 'https://example.com/x',
            name: 'Item',
            current_price: 19.99,
            currency: 'USD',
            image_url: null,
            created_at: '2026-04-20T00:00:00Z',
            updated_at: '2026-04-20T00:00:00Z',
            last_scrape_failed_at: null,
            price_history: [
              { price: 10, currency: 'USD', checked_at: '2026-04-01T00:00:00Z' },
              { price: 12, currency: 'USD', checked_at: '2026-04-10T00:00:00Z' },
            ],
          },
        ],
        error: null,
      },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const result = await mod.getUserProducts()

    expect(result).toHaveLength(1)
    expect(result[0].price_history).toHaveLength(2)
    expect(result[0].price_history[0].price).toBe(10)
  })

  it('CHART-02: calls .select with exact nested-select string "*, price_history(price, currency, checked_at)"', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    await mod.getUserProducts()

    // Inspect the from('products') builder's .select mock
    const fromResults = (supabase.from as any).mock.results
    const productsBuilder = fromResults[0].value
    expect(productsBuilder.select).toHaveBeenCalledWith(
      '*, price_history(price, currency, checked_at)',
    )
  })

  it('CHART-02: outer .order call is ("created_at", { ascending: false }) — Phase 4 behavior preserved', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    await mod.getUserProducts()

    const fromResults = (supabase.from as any).mock.results
    const productsBuilder = fromResults[0].value
    const selectResult = productsBuilder.select.mock.results[0].value
    expect(selectResult.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('CHART-02: nested .order call is ("checked_at", { ascending: true, referencedTable: "price_history" }) — D-04 locked', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    await mod.getUserProducts()

    const fromResults = (supabase.from as any).mock.results
    const productsBuilder = fromResults[0].value
    const selectResult = productsBuilder.select.mock.results[0].value
    const firstOrderResult = selectResult.order.mock.results[0].value
    expect(firstOrderResult.order).toHaveBeenCalledWith('checked_at', {
      ascending: true,
      referencedTable: 'price_history',
    })
  })

  it('fail-open: returns [] and logs console.error on Supabase error', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = makeSupabaseMock({
      selectProducts: { data: null, error: { code: '42501', message: 'permission denied' } },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const result = await mod.getUserProducts()

    expect(result).toEqual([])
    expect(errSpy).toHaveBeenCalled()
  })
})
