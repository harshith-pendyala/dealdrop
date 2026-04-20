// Env must be stubbed BEFORE '@/lib/env' is transitively imported.
// vi.stubEnv is the supported Vitest API for this.
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest'
import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'

// Stub the env BEFORE any import that resolves '@/lib/env'.
// scrapeProduct is imported dynamically below to guarantee ordering.
beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => {
  vi.unstubAllEnvs()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baselineJson = (fixture as any).data.json as Record<string, unknown>

// Build an envelope Response for a given inner-json payload.
function envelopeResponse(
  innerJson: Record<string, unknown> | null,
  overrides: { success?: boolean; status?: number } = {},
): Response {
  const status = overrides.status ?? 200
  const body = {
    success: overrides.success ?? true,
    data: innerJson === null ? {} : { json: innerJson, metadata: {} },
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Build a plain (non-JSON) Response with an arbitrary status.
function statusOnlyResponse(status: number): Response {
  return new Response('error body', { status })
}

// Dynamic import so the env stubs above run before the module graph is evaluated.
type ScrapeProductModule = typeof import('./scrape-product')
let mod: ScrapeProductModule
beforeAll(async () => {
  mod = await import('./scrape-product')
})

let errSpy: ReturnType<typeof vi.spyOn>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  errSpy.mockRestore()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('scrapeProduct — URL entry (Seam 1 integration)', () => {
  it('B1: rejects file:// without calling fetch', async () => {
    const out = await mod.scrapeProduct('file:///etc/passwd')
    expect(out).toEqual({ ok: false, reason: 'invalid_url' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('B2: rejects malformed URL without calling fetch', async () => {
    const out = await mod.scrapeProduct('not a url')
    expect(out).toEqual({ ok: false, reason: 'invalid_url' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('scrapeProduct — happy path', () => {
  it('B3: 200 with valid fixture payload → ok:true', async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse(baselineJson))
    const out = await mod.scrapeProduct(
      'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBeGreaterThan(0)
      expect(out.data.currency_code).toMatch(/^[A-Z]{3}$/)
      expect(out.data.name.length).toBeGreaterThan(0)
    }
  })

  it('B4: happy path with product_image_url null → image_url null', async () => {
    const mutated = { ...baselineJson, product_image_url: null }
    fetchMock.mockResolvedValueOnce(envelopeResponse(mutated))
    const out = await mod.scrapeProduct(
      'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    )
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.image_url).toBeNull()
  })
})

describe('scrapeProduct — branch-ordered field failures', () => {
  it('B5: missing product_name → missing_name', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({ ...baselineJson, product_name: null }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'missing_name' })
  })

  it('B6: current_price 0 → missing_price', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({ ...baselineJson, current_price: 0 }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'missing_price' })
  })

  it("B7: currency_code '$' → invalid_currency", async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({ ...baselineJson, currency_code: '$' }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'invalid_currency' })
  })
})

describe('scrapeProduct — network layer (Seam 3)', () => {
  it('B8: 503 once then 200 → retry succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(statusOnlyResponse(503))
      .mockResolvedValueOnce(envelopeResponse(baselineJson))
    const promise = mod.scrapeProduct('https://books.toscrape.com/x')
    // Flush the 2s retry backoff
    await vi.advanceTimersByTimeAsync(2_000)
    const out = await promise
    expect(out.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('B9: 503 twice → network_error', async () => {
    fetchMock
      .mockResolvedValueOnce(statusOnlyResponse(503))
      .mockResolvedValueOnce(statusOnlyResponse(503))
    const promise = mod.scrapeProduct('https://books.toscrape.com/x')
    await vi.advanceTimersByTimeAsync(2_000)
    const out = await promise
    expect(out).toEqual({ ok: false, reason: 'network_error' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('B10: 400 → network_error, NO retry', async () => {
    fetchMock.mockResolvedValueOnce(statusOnlyResponse(400))
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'network_error' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('B10b: 429 rate limit → network_error, NO retry on 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Too Many Requests', { status: 429 }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'network_error' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('B11: TimeoutError DOMException → scrape_timeout, NO retry', async () => {
    fetchMock.mockRejectedValueOnce(
      new DOMException('timed out', 'TimeoutError'),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'scrape_timeout' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('B12: generic network error → retry then network_error', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
    const promise = mod.scrapeProduct('https://books.toscrape.com/x')
    await vi.advanceTimersByTimeAsync(2_000)
    const out = await promise
    expect(out).toEqual({ ok: false, reason: 'network_error' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('B13: envelope success:false → unknown', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse(null, { success: false }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'unknown' })
  })

  it('B14: envelope success:true but data.json missing → unknown', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const out = await mod.scrapeProduct('https://books.toscrape.com/x')
    expect(out).toEqual({ ok: false, reason: 'unknown' })
  })
})

describe('scrapeProduct — request shape (Seam 2)', () => {
  it('B15: fetch called with v2 endpoint, bearer header, correct formats body, normalized URL', async () => {
    fetchMock.mockResolvedValueOnce(envelopeResponse(baselineJson))
    await mod.scrapeProduct(
      'HTTPS://Shop.Example.COM/p?sku=123&utm_source=test',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [calledUrl, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(calledUrl).toBe('https://api.firecrawl.dev/v2/scrape')
    expect(init.method).toBe('POST')

    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toMatch(/^Bearer test-key-fc-/)
    expect(headers['Content-Type']).toBe('application/json')

    // Body assertions
    const body = JSON.parse(init.body as string) as {
      url: string
      formats: Array<{ type: string; schema: unknown; prompt: string }>
      onlyMainContent: boolean
      timeout: number
    }
    // Normalized: lowercased host, utm_source stripped, sku preserved
    expect(body.url).toBe('https://shop.example.com/p?sku=123')
    expect(body.formats).toHaveLength(1)
    expect(body.formats[0].type).toBe('json')
    expect(body.formats[0].prompt).toMatch(/product_name/i)
    expect(body.onlyMainContent).toBe(true)
    expect(body.timeout).toBe(60_000)

    // AbortSignal.timeout produces a signal — just assert the property exists
    expect(init.signal).toBeDefined()
  })
})
