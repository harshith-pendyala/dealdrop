import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FirecrawlScrapeResponseSchema,
  parseProductResponse,
} from './schema'
import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'

// Silence the D-04 server-side logs during tests — they fire on every failure branch.
let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errSpy.mockRestore()
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
