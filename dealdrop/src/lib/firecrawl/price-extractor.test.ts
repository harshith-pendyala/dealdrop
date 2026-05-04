// Env stubs (price-extractor itself doesn't read env, but the file imports
// 'server-only' which Next sometimes wires through env-gated code paths).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

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

// Dynamic import to keep the env-stub ordering consistent with the rest of
// this folder's test suite.
type Mod = typeof import('./price-extractor')
let mod: Mod
beforeAll(async () => {
  mod = await import('./price-extractor')
})

// Realistic Amazon PDP fragment. The .priceToPay block and the strike-through
// .a-text-price block coexist; the extractor must pick the priceToPay one.
const AMAZON_PRICE_TO_PAY = `<!doctype html><html><body>
  <div id="corePriceDisplay_desktop_feature_div">
    <span class="a-price a-text-price" data-a-strike="true" data-a-color="secondary">
      <span class="a-offscreen">₹429.00</span>
      <span aria-hidden="true">₹429</span>
    </span>
    <span class="a-price priceToPay" data-a-color="base">
      <span class="a-offscreen">₹363.00</span>
      <span aria-hidden="true">
        <span class="a-price-symbol">₹</span>
        <span class="a-price-whole">363</span>
      </span>
    </span>
  </div>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer","price":"426.87","priceCurrency":"INR"}}
  </script>
</body></html>`

describe('extractStructuralPrice — Amazon', () => {
  it('picks .priceToPay .a-offscreen over JSON-LD on Amazon', () => {
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.in/dp/B01CCGW4OE',
      html: AMAZON_PRICE_TO_PAY,
    })
    expect(p).toBe(363)
  })

  it('returns null on Amazon when no priceToPay block is present (does NOT fall back to JSON-LD)', () => {
    const html = `<html><body>
      <div>no price block</div>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer","price":"426.87","priceCurrency":"INR"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.in/dp/B0X',
      html,
    })
    // Critical: must NOT return 426.87 on Amazon — that's the stale JSON-LD.
    expect(p).toBeNull()
  })

  it('falls through to legacy priceblock_dealprice if no priceToPay', () => {
    const html = `<html><body>
      <span id="priceblock_dealprice">₹299.00</span>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.com/dp/B0X',
      html,
    })
    expect(p).toBe(299)
  })

  it('matches multi-TLD amazon hosts (amazon.co.uk)', () => {
    const html = `<html><body>
      <span class="a-price priceToPay">
        <span class="a-offscreen">£12.99</span>
      </span>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.co.uk/dp/B0X',
      html,
    })
    expect(p).toBe(12.99)
  })

  it('Cycle-4: Amazon page that ALSO ships og:price=999 still uses the Amazon-specific selectors first', () => {
    // og:price MUST NOT win on Amazon — Amazon's structured data lags the
    // visible deal price, so we deliberately do NOT fall through to OG.
    const html = `<html>
      <head><meta property="og:price:amount" content="999"></head>
      <body>
        <span class="a-price priceToPay">
          <span class="a-offscreen">₹363.00</span>
        </span>
      </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.in/dp/B0X',
      html,
    })
    expect(p).toBe(363)
  })

  it('Cycle-4: Amazon with NO priceToPay but WITH og:price still returns null (no OG fallback on Amazon)', () => {
    const html = `<html>
      <head><meta property="og:price:amount" content="999"></head>
      <body><div>no priceToPay</div></body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.amazon.in/dp/B0X',
      html,
    })
    // Amazon path is short-circuit: priceToPay or null. OG must not rescue.
    expect(p).toBeNull()
  })
})

describe('extractStructuralPrice — JSON-LD fallback (non-Amazon)', () => {
  it('extracts a numeric Offer.price', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer","price":19.99,"priceCurrency":"USD"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(19.99)
  })

  it('extracts a string Offer.price (with currency in symbol form)', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","offers":{"@type":"Offer","price":"$1,299.99","priceCurrency":"USD"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(1299.99)
  })

  it('handles AggregateOffer with lowPrice', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":"45.00","highPrice":"60.00","priceCurrency":"USD"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(45)
  })

  it('handles @graph wrapper', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@graph":[
          {"@type":"WebPage","name":"X"},
          {"@type":"Product","offers":{"@type":"Offer","price":"7.50"}}
        ]}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(7.5)
  })

  it('Cycle-4: @graph wrapper with the Product nested inside (Flipkart-fixture style) → returns 20499', () => {
    const fixturePath = path.resolve(
      __dirname,
      '__fixtures__',
      'flipkart-product.html',
    )
    const html = fs.readFileSync(fixturePath, 'utf8')
    const p = mod.extractStructuralPrice({
      url: 'https://www.flipkart.com/samsung-galaxy-a35-5g-awesome-lilac-256-gb/p/itm8f49f29e842cc',
      html,
    })
    // JSON-LD wins (priority 1) — value is 20499, NOT 19474 (bank offer) or 36999 (MRP).
    expect(p).toBe(20499)
  })

  it('returns null when no Product node is present', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"WebPage","name":"X"}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBeNull()
  })

  it('skips malformed JSON blocks and continues', () => {
    const html = `<html><body>
      <script type="application/ld+json">{ this is not json }</script>
      <script type="application/ld+json">
        {"@type":"Product","offers":{"price":"33.00"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(33)
  })
})

describe('extractStructuralPrice — OpenGraph fallback (Cycle 4)', () => {
  it('extracts og:price:amount when no JSON-LD is present', () => {
    const html = `<html>
      <head><meta property="og:price:amount" content="20499"></head>
      <body>...</body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(20499)
  })

  it('extracts product:price:amount', () => {
    const html = `<html>
      <head><meta property="product:price:amount" content="49.99"></head>
      <body>...</body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(49.99)
  })

  it('extracts og:product:price:amount', () => {
    const html = `<html>
      <head><meta property="og:product:price:amount" content="79.50"></head>
      <body>...</body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(79.5)
  })

  it('tolerates content-attr-before-property attribute order', () => {
    const html = `<html>
      <head><meta content="123.45" property="og:price:amount"></head>
      <body>...</body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(123.45)
  })

  it('priority: JSON-LD wins when both JSON-LD and OG are present', () => {
    const html = `<html>
      <head><meta property="og:price:amount" content="20499"></head>
      <body>
        <script type="application/ld+json">
          {"@type":"Product","offers":{"@type":"Offer","price":"42.00"}}
        </script>
      </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    // JSON-LD is priority 1 — must beat OG even if OG appears earlier in the document.
    expect(p).toBe(42)
  })
})

describe('extractStructuralPrice — Microdata fallback (Cycle 4)', () => {
  it('extracts <meta itemprop="price" content="999.99">', () => {
    const html = `<html><body>
      <div itemtype="https://schema.org/Product">
        <meta itemprop="price" content="999.99">
      </div></body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(999.99)
  })

  it('extracts <span itemprop="price">$999.99</span>', () => {
    const html = `<html><body>
      <div itemtype="https://schema.org/Product">
        <span itemprop="price">$999.99</span>
      </div></body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(999.99)
  })

  it('priority: OG wins over microdata when both are present', () => {
    // OG is priority 2, microdata is priority 3. OG must win.
    const html = `<html>
      <head><meta property="og:price:amount" content="11"></head>
      <body><meta itemprop="price" content="22"></body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(11)
  })

  it('priority: only OG present → OG wins over null', () => {
    const html = `<html>
      <head><meta property="og:price:amount" content="55"></head>
      <body><div>no microdata, no json-ld</div></body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(55)
  })

  it('returns null when html has no JSON-LD, no OG, and no microdata (Flipkart-real-world case)', () => {
    // This mirrors the production Flipkart HTML — no structural signals at all.
    // The caller (scrape-product.ts) will then fall back to the LLM value.
    const html = `<html><body>
      <div>₹20,499</div>
      <div style="text-decoration-line:line-through">36,999</div>
      <div>Buy at ₹19,474</div>
    </body></html>`
    const p = mod.extractStructuralPrice({
      url: 'https://www.flipkart.com/x/p/itmABC',
      html,
    })
    expect(p).toBeNull()
  })
})

describe('extractStructuralPrice — guard rails', () => {
  it('returns null for empty html', () => {
    const p = mod.extractStructuralPrice({
      url: 'https://shop.example.com/x',
      html: '',
    })
    expect(p).toBeNull()
  })

  it('returns null for null/undefined html', () => {
    expect(
      mod.extractStructuralPrice({
        url: 'https://shop.example.com/x',
        html: null,
      }),
    ).toBeNull()
    expect(
      mod.extractStructuralPrice({
        url: 'https://shop.example.com/x',
        html: undefined,
      }),
    ).toBeNull()
  })

  it('returns null for an unparseable URL', () => {
    const p = mod.extractStructuralPrice({
      url: 'not a url',
      html: '<html></html>',
    })
    expect(p).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Cycle-5: structural MRP extractor
// ---------------------------------------------------------------------------

describe('extractStructuralMrp — Amazon (Cycle 5)', () => {
  it('extracts MRP from data-a-strike="true" .a-offscreen', () => {
    const p = mod.extractStructuralMrp({
      url: 'https://www.amazon.in/dp/B01CCGW4OE',
      html: AMAZON_PRICE_TO_PAY,
    })
    // The strike-through block in AMAZON_PRICE_TO_PAY is ₹429.00.
    expect(p).toBe(429)
  })

  it('extracts MRP from .basisPrice .a-offscreen', () => {
    const html = `<html><body>
      <span class="basisPrice">
        <span class="a-offscreen">$1,299.00</span>
      </span>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://www.amazon.com/dp/B0X',
      html,
    })
    expect(p).toBe(1299)
  })

  it('extracts MRP from .a-text-strike (alternative class)', () => {
    const html = `<html><body>
      <span class="a-price a-text-strike">
        <span class="a-offscreen">€89.99</span>
      </span>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://www.amazon.de/dp/B0X',
      html,
    })
    expect(p).toBe(89.99)
  })

  it('returns null on Amazon when no strike-through block is present', () => {
    const html = `<html><body>
      <span class="a-price priceToPay">
        <span class="a-offscreen">₹363.00</span>
      </span>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://www.amazon.in/dp/B0X',
      html,
    })
    expect(p).toBeNull()
  })
})

describe('extractStructuralMrp — non-Amazon JSON-LD (Cycle 5)', () => {
  it('extracts AggregateOffer.highPrice', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":"45.00","highPrice":"60.00","priceCurrency":"USD"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(60)
  })

  it('extracts priceSpecification.maxPrice', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@type":"Product","offers":{"@type":"Offer","price":"800","priceSpecification":{"@type":"PriceSpecification","maxPrice":1000,"price":800}}}
      </script>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBe(1000)
  })

  it('returns null when JSON-LD has no MRP-equivalent field', () => {
    const html = `<html><body>
      <script type="application/ld+json">
        {"@type":"Product","offers":{"@type":"Offer","price":"19.99"}}
      </script>
    </body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBeNull()
  })

  it('returns null when the page has no JSON-LD at all (non-Amazon)', () => {
    const html = `<html><body><div>plain content</div></body></html>`
    const p = mod.extractStructuralMrp({
      url: 'https://shop.example.com/x',
      html,
    })
    expect(p).toBeNull()
  })
})

describe('parsePriceText (internal)', () => {
  it('parses INR rupee', () => {
    expect(mod.__testing.parsePriceText('₹363.00')).toBe(363)
  })
  it('parses US thousands', () => {
    expect(mod.__testing.parsePriceText('$1,299.99')).toBe(1299.99)
  })
  it('parses EU style', () => {
    expect(mod.__testing.parsePriceText('1.299,99 €')).toBe(1299.99)
  })
  it('parses comma-decimal short form', () => {
    expect(mod.__testing.parsePriceText('19,99')).toBe(19.99)
  })
  it('returns null for non-numeric', () => {
    expect(mod.__testing.parsePriceText('out of stock')).toBeNull()
  })
})

describe('isAmazonHost (internal)', () => {
  it('matches www.amazon.in', () => {
    expect(mod.__testing.isAmazonHost('www.amazon.in')).toBe(true)
  })
  it('matches amazon.com', () => {
    expect(mod.__testing.isAmazonHost('amazon.com')).toBe(true)
  })
  it('matches amazon.co.uk', () => {
    expect(mod.__testing.isAmazonHost('www.amazon.co.uk')).toBe(true)
  })
  it('does not match amazonaws.com', () => {
    expect(mod.__testing.isAmazonHost('s3.amazonaws.com')).toBe(false)
  })
  it('does not match books.toscrape.com', () => {
    expect(mod.__testing.isAmazonHost('books.toscrape.com')).toBe(false)
  })
})
