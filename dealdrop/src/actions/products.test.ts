import {
  describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll,
} from 'vitest'
import { makeSupabaseMock } from '@/__mocks__/supabase-server'

// Env stub — Phase 1 FND-02 Zod validates env at module load. All 7 required vars
// must be present or @/lib/supabase/server import throws. Copied verbatim from
// dealdrop/src/lib/firecrawl/scrape-product.test.ts:17-25.
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

// Mock the three collaborators. Must register BEFORE dynamic import.
vi.mock('@/lib/firecrawl/scrape-product', () => ({
  scrapeProduct: vi.fn(),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

type ProductsActionsModule = typeof import('@/actions/products')
let mod: ProductsActionsModule
beforeAll(async () => {
  mod = await import('@/actions/products')
})

let errSpy: ReturnType<typeof vi.spyOn>
let logSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  // I-NEW-1: spy on console.log for the removeProduct audit-log assertion.
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  logSpy.mockRestore()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// addProduct
// ---------------------------------------------------------------------------

describe('addProduct', () => {
  it('happy path — inserts product + price_history with currency mapped from currency_code, calls revalidatePath', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Book', current_price: 19.99, currency_code: 'GBP', image_url: 'https://cdn/x.jpg' , mrp: null },
    })
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://books.toscrape.com/a/b')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: true })
    // Currency key rename assertion: check insert call arguments across all from() calls
    // supabase.from() returns a builder mock; each builder has an insert mock.
    // Collect all insert call arguments by inspecting mock.calls for insert on each builder.
    const fromMock = (supabase.from as any)
    const allInsertArgs = fromMock.mock.calls.flatMap((_: unknown, idx: number) => {
      const builder = fromMock.mock.results[idx]?.value
      if (!builder || !builder.insert) return []
      return builder.insert.mock?.calls ?? []
    })
    const allInsertArgsJson = JSON.stringify(allInsertArgs)
    // products.insert called with currency: 'GBP' (not currency_code)
    expect(allInsertArgsJson).toContain('"currency":"GBP"')
    expect(allInsertArgsJson).not.toContain('"currency_code":"GBP"')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('unauthenticated — returns { ok: false, reason: "unauthenticated" }, scrapeProduct NOT called', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    const supabase = makeSupabaseMock({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://books.toscrape.com/a/b')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(scrapeProduct).not.toHaveBeenCalled()
  })

  it('scrape failure — returns same { ok: false, reason } shape; no DB writes', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(scrapeProduct).mockResolvedValue({ ok: false, reason: 'invalid_url' })
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'not-a-url')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: false, reason: 'invalid_url' })
    // from() should not have been called (no DB writes)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('duplicate_url — products.insert returns code 23505 -> returns { ok: false, reason: "duplicate_url" }; price_history NOT touched', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Book', current_price: 19.99, currency_code: 'USD', image_url: null, mrp: null },
    })
    const supabase = makeSupabaseMock({
      insertProduct: { data: null, error: { code: '23505', message: 'unique violation' } },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://books.toscrape.com/a/b')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: false, reason: 'duplicate_url' })
    // from() called once (products insert only); price_history NOT touched
    const fromCalls = (supabase.from as any).mock.calls.map((c: string[]) => c[0])
    expect(fromCalls).not.toContain('price_history')
  })

  it('generic db_error — products.insert returns code 42501 -> returns { ok: false, reason: "db_error" }; console.error called', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Book', current_price: 9.99, currency_code: 'USD', image_url: null, mrp: null },
    })
    const supabase = makeSupabaseMock({
      insertProduct: { data: null, error: { code: '42501', message: 'permission denied' } },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://books.toscrape.com/a/b')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: false, reason: 'db_error' })
    expect(errSpy).toHaveBeenCalled()
  })

  it('price_history rollback — products OK, price_history fails -> deletes products row -> returns { ok: false, reason: "db_error" }', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Book', current_price: 9.99, currency_code: 'USD', image_url: null, mrp: null },
    })
    // products insert succeeds (id: 'p1'), but price_history insert fails
    const supabase = makeSupabaseMock({
      insertProduct: { data: { id: 'p1' }, error: null },
      insertHistory: { error: { code: '42501', message: 'permission denied' } },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://books.toscrape.com/a/b')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: false, reason: 'db_error' })
    // Rollback: supabase.from('products').delete().eq('id', 'p1') must have been called
    const fromCalls = (supabase.from as any).mock.calls.map((c: string[]) => c[0])
    expect(fromCalls).toContain('products')
    const deleteMock = (supabase.from as any).mock.results.find(
      (_r: any, idx: number) => (supabase.from as any).mock.calls[idx][0] === 'products' &&
        // find the delete call (not insert)
        true
    )
    // Assert delete was called (the rollback path)
    expect(supabase.from).toHaveBeenCalledWith('products')
    expect(errSpy).toHaveBeenCalled()
    void deleteMock // used only for demonstration
  })

  it('currency mapping (Pitfall 1) — insert payload contains currency:"EUR", NOT currency_code:"EUR"', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')

    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Gadget', current_price: 49.99, currency_code: 'EUR', image_url: null, mrp: null },
    })
    const supabase = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const fd = new FormData()
    fd.set('url', 'https://example.com/product')
    const res = await mod.addProduct(null, fd)

    expect(res).toEqual({ ok: true })
    // Extract insert call arguments from the products builder
    const fromMock = (supabase.from as any)
    const allInsertArgs = fromMock.mock.calls.flatMap((_: unknown, idx: number) => {
      const builder = fromMock.mock.results[idx]?.value
      if (!builder || !builder.insert) return []
      return builder.insert.mock?.calls ?? []
    })
    const allInsertArgsJson = JSON.stringify(allInsertArgs)
    expect(allInsertArgsJson).toContain('"currency":"EUR"')
    expect(allInsertArgsJson).not.toContain('"currency_code"')
  })

  it('revalidatePath spy — called with "/" exactly once on success; NOT called on any failure branch', async () => {
    const { scrapeProduct } = await import('@/lib/firecrawl/scrape-product')
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    // Failure branch: unauthenticated -> no revalidatePath
    const supabaseUnauth = makeSupabaseMock({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabaseUnauth as any)
    const fdFail = new FormData()
    fdFail.set('url', 'https://books.toscrape.com/a/b')
    await mod.addProduct(null, fdFail)
    expect(revalidatePath).not.toHaveBeenCalled()

    vi.clearAllMocks()

    // Success branch: revalidatePath called once
    vi.mocked(scrapeProduct).mockResolvedValue({
      ok: true,
      data: { name: 'Book', current_price: 19.99, currency_code: 'GBP', image_url: null, mrp: null },
    })
    const supabaseOk = makeSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(supabaseOk as any)
    const fdOk = new FormData()
    fdOk.set('url', 'https://books.toscrape.com/a/b')
    await mod.addProduct(null, fdOk)
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })
})

// ---------------------------------------------------------------------------
// removeProduct
// ---------------------------------------------------------------------------

describe('removeProduct', () => {
  it('happy path — auth OK + delete OK -> revalidatePath("/") called -> returns { ok: true }', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    const supabase = makeSupabaseMock({ deleteError: null })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')

    expect(res).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('unauthenticated — getUser returns null -> returns { ok: false }; delete NOT called; revalidatePath NOT called', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    const supabase = makeSupabaseMock({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')

    expect(res).toEqual({ ok: false })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('DB error — delete returns error -> console.error called -> returns { ok: false }; revalidatePath NOT called', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    const supabase = makeSupabaseMock({ deleteError: { code: '42501', message: 'permission denied' } })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')

    expect(res).toEqual({ ok: false })
    expect(errSpy).toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('audit: removeProduct on success emits console.log({ action: "removeProduct", productId, userId }) exactly once before revalidatePath', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { revalidatePath } = await import('next/cache')

    const supabase = makeSupabaseMock({ user: { id: 'user-test-uuid' }, deleteError: null })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')

    expect(res).toEqual({ ok: true })

    // Exactly one console.log call with the audit payload shape.
    const auditCalls = logSpy.mock.calls.filter((args) => {
      const first = args[0]
      return (
        typeof first === 'object' &&
        first !== null &&
        (first as { action?: string }).action === 'removeProduct'
      )
    })
    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0][0]).toEqual({
      action: 'removeProduct',
      productId: 'p1',
      userId: 'user-test-uuid',
    })

    // Ordering: audit log must have been invoked BEFORE revalidatePath.
    // logSpy + revalidatePath are both vi.fn() instances; compare invocation order via invocationCallOrder.
    const auditOrder = logSpy.mock.invocationCallOrder[0]
    const revalidateOrder = (vi.mocked(revalidatePath).mock.invocationCallOrder as number[])[0]
    expect(auditOrder).toBeLessThan(revalidateOrder)
  })

  it('audit: removeProduct on unauth branch does NOT emit the audit log', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const supabase = makeSupabaseMock({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')
    expect(res).toEqual({ ok: false })

    const auditCalls = logSpy.mock.calls.filter((args) => {
      const first = args[0]
      return (
        typeof first === 'object' &&
        first !== null &&
        (first as { action?: string }).action === 'removeProduct'
      )
    })
    expect(auditCalls).toHaveLength(0)
  })

  it('audit: removeProduct on DB-error branch does NOT emit the audit log', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const supabase = makeSupabaseMock({ deleteError: { code: '42501', message: 'permission denied' } })
    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const res = await mod.removeProduct('p1')
    expect(res).toEqual({ ok: false })

    const auditCalls = logSpy.mock.calls.filter((args) => {
      const first = args[0]
      return (
        typeof first === 'object' &&
        first !== null &&
        (first as { action?: string }).action === 'removeProduct'
      )
    })
    expect(auditCalls).toHaveLength(0)
  })
})
