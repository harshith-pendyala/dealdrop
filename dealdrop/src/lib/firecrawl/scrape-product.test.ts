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
  overrides: { success?: boolean; status?: number; html?: string } = {},
): Response {
  const status = overrides.status ?? 200
  const dataPart =
    innerJson === null
      ? {}
      : {
          json: innerJson,
          metadata: {},
          ...(overrides.html !== undefined ? { html: overrides.html } : {}),
        }
  const body = {
    success: overrides.success ?? true,
    data: dataPart,
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
let logSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  errSpy.mockRestore()
  logSpy.mockRestore()
  warnSpy.mockRestore()
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
      formats: Array<unknown>
      onlyMainContent: boolean
      timeout: number
      maxAge: number
    }
    // Normalized: lowercased host, utm_source stripped, sku preserved
    expect(body.url).toBe('https://shop.example.com/p?sku=123')
    // Cycle-3: formats now contains the structured json descriptor AND 'html'.
    expect(body.formats).toHaveLength(2)
    const jsonFormat = body.formats[0] as {
      type: string
      schema: { properties: Record<string, unknown>; required: string[] }
      prompt: string
    }
    expect(jsonFormat.type).toBe('json')
    expect(jsonFormat.prompt).toMatch(/product_name/i)
    // Cycle-5: prompt and schema must mention all three price slots.
    expect(jsonFormat.prompt).toMatch(/mrp/i)
    expect(jsonFormat.prompt).toMatch(/lowest_conditional_price/i)
    expect(jsonFormat.prompt).toMatch(/current_price/i)
    expect(jsonFormat.schema.properties).toHaveProperty('mrp')
    expect(jsonFormat.schema.properties).toHaveProperty('current_price')
    expect(jsonFormat.schema.properties).toHaveProperty(
      'lowest_conditional_price',
    )
    // current_price stays required; mrp / lowest_conditional_price optional.
    expect(jsonFormat.schema.required).toContain('current_price')
    expect(jsonFormat.schema.required).not.toContain('mrp')
    expect(jsonFormat.schema.required).not.toContain(
      'lowest_conditional_price',
    )
    expect(body.formats[1]).toBe('html')
    expect(body.onlyMainContent).toBe(true)
    expect(body.timeout).toBe(60_000)
    // Cycle-2: cache bypass.
    expect(body.maxAge).toBe(0)

    // AbortSignal.timeout produces a signal — just assert the property exists
    expect(init.signal).toBeDefined()
  })
})

describe('scrapeProduct — structural price extractor wiring (Cycle 3)', () => {
  // Amazon's deal-price block. The structural extractor should pick 363.00
  // even though the LLM-supplied current_price says 426.87 — this is the
  // exact production failure mode for amzn.in/d/04K6sdTU (Cetaphil).
  const AMAZON_DEAL_HTML = `<!doctype html><html><body>
    <div id="corePriceDisplay_desktop_feature_div">
      <span class="a-price priceToPay">
        <span class="a-offscreen">₹363.00</span>
        <span aria-hidden="true">
          <span class="a-price-symbol">₹</span>
          <span class="a-price-whole">363</span>
        </span>
      </span>
      <span class="a-price a-text-price" data-a-strike="true">
        <span class="a-offscreen">₹429.00</span>
      </span>
    </div>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer","price":"426.87","priceCurrency":"INR"}}
    </script>
  </body></html>`

  it('B16: Amazon URL with deal HTML → uses structural price (363) not LLM price (426.87) and extracts MRP 429', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse(
        {
          ...baselineJson,
          product_name: 'Cetaphil Gentle Skin Hydrating Face Wash 118ml',
          current_price: 426.87,
          currency_code: 'INR',
          product_image_url: 'https://example.com/img.jpg',
        },
        { html: AMAZON_DEAL_HTML },
      ),
    )
    const out = await mod.scrapeProduct(
      'https://www.amazon.in/Cetaphil-Hydrating/dp/B01CCGW4OE',
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(363)
      // Cycle-5: structural MRP from the strike-through block.
      expect(out.data.mrp).toBe(429)
    }
  })

  it('B17: non-Amazon site without HTML → falls through to LLM price', async () => {
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({ ...baselineJson, current_price: 51.77 }),
    )
    const out = await mod.scrapeProduct(
      'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    )
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.current_price).toBe(51.77)
  })

  it('B18: non-Amazon site with JSON-LD html → uses JSON-LD price', async () => {
    const jsonLdHtml = `<html><body>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"X","offers":{"@type":"Offer","price":"19.99","priceCurrency":"USD"}}
      </script>
    </body></html>`
    fetchMock.mockResolvedValueOnce(
      envelopeResponse(
        { ...baselineJson, current_price: 9999.99, currency_code: 'USD' },
        { html: jsonLdHtml },
      ),
    )
    const out = await mod.scrapeProduct('https://shop.example.com/p/abc')
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.current_price).toBe(19.99)
  })

  it('B19: Amazon URL but no priceToPay block in HTML → falls through to LLM price', async () => {
    const sparseHtml = `<html><body><div>no price markers here</div></body></html>`
    fetchMock.mockResolvedValueOnce(
      envelopeResponse(
        { ...baselineJson, current_price: 555.55, currency_code: 'INR' },
        { html: sparseHtml },
      ),
    )
    const out = await mod.scrapeProduct(
      'https://www.amazon.in/dp/B0XXXXXXXX',
    )
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.current_price).toBe(555.55)
  })
})

describe('scrapeProduct — multi-slot Cycle 5 wiring', () => {
  it('B20: Flipkart-style three-slot LLM payload → captures current_price 20499 and mrp 36999 (no structural HTML)', async () => {
    // Real Flipkart returns no structural data; the LLM with the multi-slot
    // schema now categorizes the three prices, and we keep current_price.
    fetchMock.mockResolvedValueOnce(
      envelopeResponse({
        product_name: 'Samsung Galaxy A35 5G (Awesome Lilac, 256 GB) (8 GB RAM)',
        mrp: 36999,
        current_price: 20499,
        lowest_conditional_price: 19474,
        currency_code: 'INR',
        product_image_url:
          'https://rukminim2.flixcart.com/image/x.jpeg',
      }),
    )
    const out = await mod.scrapeProduct(
      'https://www.flipkart.com/samsung-galaxy-a35-5g-awesome-lilac-256-gb/p/itm8f49f29e842cc',
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(20499)
      expect(out.data.mrp).toBe(36999)
    }
  })

  it('B21: structural MRP override beats LLM mrp on Amazon (override wins)', async () => {
    // LLM thinks MRP is 999, but the strike-through block on the Amazon page
    // is 429 — structural value should win, matching the priority rule for
    // current_price.
    const amazonHtml = `<html><body>
      <span class="a-price priceToPay">
        <span class="a-offscreen">₹363.00</span>
      </span>
      <span class="a-price a-text-price" data-a-strike="true">
        <span class="a-offscreen">₹429.00</span>
      </span>
    </body></html>`
    fetchMock.mockResolvedValueOnce(
      envelopeResponse(
        {
          product_name: 'Cetaphil',
          mrp: 999, // wrong; structural override should win
          current_price: 426.87, // wrong; structural override should win
          lowest_conditional_price: null,
          currency_code: 'INR',
          product_image_url: null,
        },
        { html: amazonHtml },
      ),
    )
    const out = await mod.scrapeProduct(
      'https://www.amazon.in/Cetaphil/dp/B01CCGW4OE',
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(363)
      expect(out.data.mrp).toBe(429)
    }
  })
})
