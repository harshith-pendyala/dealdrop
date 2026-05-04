import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FirecrawlScrapeResponseSchema,
  parseProductResponse,
} from './schema'
import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'

// Silence the D-04 server-side logs during tests — they fire on every failure branch.
let errSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
  warnSpy.mockRestore()
})

// Extract the inner product payload once — tests clone + mutate.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseline = (fixture as any).data.json as Record<string, unknown>

describe('FirecrawlScrapeResponseSchema', () => {
  it('accepts the captured v2 fixture', () => {
    const result = FirecrawlScrapeResponseSchema.safeParse(fixture)
    expect(result.success).toBe(true)
  })

  it('accepts an envelope that additionally carries `data.html`', () => {
    const withHtml = {
      success: true,
      data: {
        json: { product_name: 'X', current_price: 1, currency_code: 'USD' },
        html: '<html><body>x</body></html>',
        metadata: {},
      },
    }
    const result = FirecrawlScrapeResponseSchema.safeParse(withHtml)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data?.html).toBe('<html><body>x</body></html>')
    }
  })
})

describe('parseProductResponse branch order', () => {
  it('happy path from fixture', () => {
    const out = parseProductResponse(baseline)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(typeof out.data.name).toBe('string')
      expect(out.data.name.length).toBeGreaterThan(0)
      expect(out.data.current_price).toBeGreaterThan(0)
      expect(out.data.currency_code).toMatch(/^[A-Z]{3}$/)
      // Cycle-5: `mrp` always present on the validated shape (null when not provided).
      expect(out.data.mrp).toBeNull()
    }
  })

  it('image_url null is accepted (DB-01 nullable)', () => {
    const mutated = { ...baseline, product_image_url: null }
    const out = parseProductResponse(mutated)
    expect(out).toEqual({
      ok: true,
      data: expect.objectContaining({ image_url: null }),
    })
  })

  it('missing_name: null product_name', () => {
    const out = parseProductResponse({ ...baseline, product_name: null })
    expect(out).toEqual({ ok: false, reason: 'missing_name' })
  })

  it('missing_name: whitespace-only product_name', () => {
    const out = parseProductResponse({ ...baseline, product_name: '   ' })
    expect(out).toEqual({ ok: false, reason: 'missing_name' })
  })

  it('missing_price: null current_price', () => {
    const out = parseProductResponse({ ...baseline, current_price: null })
    expect(out).toEqual({ ok: false, reason: 'missing_price' })
  })

  it('missing_price: zero current_price', () => {
    const out = parseProductResponse({ ...baseline, current_price: 0 })
    expect(out).toEqual({ ok: false, reason: 'missing_price' })
  })

  it('missing_price: negative current_price', () => {
    const out = parseProductResponse({ ...baseline, current_price: -10 })
    expect(out).toEqual({ ok: false, reason: 'missing_price' })
  })

  it('invalid_currency: dollar sign', () => {
    const out = parseProductResponse({ ...baseline, currency_code: '$' })
    expect(out).toEqual({ ok: false, reason: 'invalid_currency' })
  })

  it('invalid_currency: lowercase', () => {
    const out = parseProductResponse({ ...baseline, currency_code: 'usd' })
    expect(out).toEqual({ ok: false, reason: 'invalid_currency' })
  })

  it('invalid_currency: too long', () => {
    const out = parseProductResponse({ ...baseline, currency_code: 'USDXY' })
    expect(out).toEqual({ ok: false, reason: 'invalid_currency' })
  })

  it('branch order: missing name AND missing price → missing_name fires first', () => {
    const out = parseProductResponse({
      ...baseline,
      product_name: null,
      current_price: null,
    })
    expect(out).toEqual({ ok: false, reason: 'missing_name' })
  })
})

describe('parseProductResponse priceOverride (Cycle 3)', () => {
  it('positive override replaces the LLM-extracted current_price', () => {
    const out = parseProductResponse(
      { ...baseline, current_price: 999.99 },
      363,
    )
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.current_price).toBe(363)
  })

  it('null/undefined override → LLM value used unchanged', () => {
    const out1 = parseProductResponse({ ...baseline, current_price: 12 }, null)
    const out2 = parseProductResponse(
      { ...baseline, current_price: 12 },
      undefined,
    )
    expect(out1.ok && out1.data.current_price).toBe(12)
    expect(out2.ok && out2.data.current_price).toBe(12)
  })

  it('non-positive override is ignored (LLM value used)', () => {
    const out = parseProductResponse(
      { ...baseline, current_price: 50 },
      0,
    )
    expect(out.ok && out.data.current_price).toBe(50)
  })

  it('override that flips the LLM null/0 to a valid number → ok', () => {
    const out = parseProductResponse(
      { ...baseline, current_price: null },
      77,
    )
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.data.current_price).toBe(77)
  })
})

// ---------------------------------------------------------------------------
// Cycle-5: multi-slot price extraction — { mrp, current_price, lowest_conditional_price }
// ---------------------------------------------------------------------------

describe('parseProductResponse multi-slot extraction (Cycle 5)', () => {
  it('Flipkart-style three-price scenario: { mrp: 36999, current_price: 20499, lowest_conditional_price: 19474 } → captures 20499 / mrp 36999', () => {
    const out = parseProductResponse({
      product_name: 'Samsung Galaxy A35 5G (Awesome Lilac, 256 GB)',
      mrp: 36999,
      current_price: 20499,
      lowest_conditional_price: 19474,
      currency_code: 'INR',
      product_image_url: 'https://example.com/img.jpg',
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(20499)
      expect(out.data.mrp).toBe(36999)
    }
  })

  it('LLM swap: mrp/current_price reversed ({ mrp: 20499, current_price: 36999, … }) is repaired to { mrp: 36999, current_price: 20499 }', () => {
    const out = parseProductResponse({
      product_name: 'Galaxy A35 5G',
      mrp: 20499,
      current_price: 36999,
      lowest_conditional_price: 19474,
      currency_code: 'INR',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(20499)
      expect(out.data.mrp).toBe(36999)
    }
    // Sanity-check warning was logged.
    expect(warnSpy).toHaveBeenCalledWith(
      'scrapeProduct: repaired mrp/current_price swap',
      expect.any(Object),
    )
  })

  it('LLM swap: current_price/lowest_conditional_price reversed (current 19474, conditional 20499) is repaired so current_price ≥ conditional', () => {
    const out = parseProductResponse({
      product_name: 'Galaxy A35 5G',
      mrp: 36999,
      current_price: 19474,
      lowest_conditional_price: 20499,
      currency_code: 'INR',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      // After repair, current_price should be the larger of the two (20499).
      expect(out.data.current_price).toBe(20499)
      expect(out.data.mrp).toBe(36999)
    }
    expect(warnSpy).toHaveBeenCalledWith(
      'scrapeProduct: repaired current_price/lowest_conditional_price swap',
      expect.any(Object),
    )
  })

  it('regular-priced product (no mrp, no conditional offer) → current_price used as-is, mrp null', () => {
    const out = parseProductResponse({
      product_name: 'Plain T-shirt',
      mrp: null,
      current_price: 19.99,
      lowest_conditional_price: null,
      currency_code: 'USD',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(19.99)
      expect(out.data.mrp).toBeNull()
    }
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('all three slots present and ordered correctly → pass-through', () => {
    const out = parseProductResponse({
      product_name: 'Phone',
      mrp: 1000,
      current_price: 800,
      lowest_conditional_price: 750,
      currency_code: 'USD',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(800)
      expect(out.data.mrp).toBe(1000)
    }
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('lowest_conditional_price >= current_price (no MRP) → current_price trusted, suspicious-log emitted', () => {
    const out = parseProductResponse({
      product_name: 'X',
      mrp: null,
      current_price: 100,
      lowest_conditional_price: 100, // equal → suspicious but trust LLM
      currency_code: 'USD',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(100)
      expect(out.data.mrp).toBeNull()
    }
    expect(warnSpy).toHaveBeenCalledWith(
      'scrapeProduct: lowest_conditional_price not actually lower than current_price; trusting LLM judgment',
      expect.any(Object),
    )
  })

  it('mrpOverride replaces LLM-extracted mrp', () => {
    const out = parseProductResponse(
      {
        product_name: 'Phone',
        mrp: 999, // LLM said 999
        current_price: 363,
        lowest_conditional_price: null,
        currency_code: 'INR',
        product_image_url: null,
      },
      undefined,
      429, // structural extractor said 429 — should win
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(363)
      expect(out.data.mrp).toBe(429)
    }
  })

  it('non-positive mrpOverride is ignored (LLM value used)', () => {
    const out = parseProductResponse(
      {
        product_name: 'Phone',
        mrp: 500,
        current_price: 363,
        lowest_conditional_price: null,
        currency_code: 'INR',
        product_image_url: null,
      },
      undefined,
      0,
    )
    expect(out.ok && out.data.mrp).toBe(500)
  })

  it('mrpOverride that ends up smaller than current_price is dropped (defensive)', () => {
    // Caller wired a wrong override; we should not store an MRP that's smaller
    // than the active price.
    const out = parseProductResponse(
      {
        product_name: 'Phone',
        mrp: null,
        current_price: 500,
        lowest_conditional_price: null,
        currency_code: 'INR',
        product_image_url: null,
      },
      undefined,
      100, // smaller than current_price → should be discarded
    )
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(500)
      expect(out.data.mrp).toBeNull()
    }
  })

  it('legacy payload without mrp / lowest_conditional_price slots → still ok, mrp null', () => {
    // Backward-compat: if an old callsite somehow passes the cycle-3 shape,
    // we should not blow up.
    const out = parseProductResponse({
      product_name: 'Old shape',
      current_price: 42,
      currency_code: 'USD',
      product_image_url: null,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.data.current_price).toBe(42)
      expect(out.data.mrp).toBeNull()
    }
  })
})
