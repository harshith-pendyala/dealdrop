import 'server-only'
// MUST be the first line — pure server-side helper. No DOM, no browser globals.
//
// Cycle-3 fix for amazon-discount-price-wrong:
// Prompt engineering alone can't reliably beat structural data — the LLM
// trusts schema.org JSON-LD `Product.offers.price`, which on Amazon's PDPs
// often lags the visible deal price (e.g. ₹426.87 stale vs ₹363 deal price
// for B01CCGW4OE under a 15% discount). When the page HTML is available we
// extract `current_price` structurally and fall back to the LLM only when
// no structural price can be found.
//
// Cycle-4 extension (flipkart bank-offer regression):
// On non-Amazon hosts we now consult more universal signals BEFORE falling
// through to the LLM. Order: JSON-LD (with @graph + AggregateOffer support),
// OpenGraph product meta tags (og:price:amount, product:price:amount, …),
// and Microdata itemprop="price". Sites like Flipkart that emit none of
// these still fall through to the LLM, but the LLM prompt has been hardened
// to exclude conditional / bank-card / wallet / EMI / exchange offers
// (cycle-4 PROMPT update in scrape-product.ts).
//
// Priority order:
//   Amazon host:
//     1. Site-specific selectors (.priceToPay .a-offscreen, etc.). On a miss,
//        return null — DO NOT fall through to JSON-LD/OG, which on Amazon is
//        exactly the stale value we're trying to avoid.
//   Other hosts:
//     1. JSON-LD `Product.offers.price` (with @graph + AggregateOffer support)
//     2. OpenGraph `og:price:amount` / `product:price:amount`
//     3. Microdata `itemprop="price"` (meta or text-node)
//     4. null (caller falls back to LLM)
//
// We deliberately avoid pulling in a DOM parser dep (jsdom is dev-only,
// node-html-parser/cheerio aren't installed). The selectors above each
// resolve to a small, well-bounded HTML fragment, so regex is sufficient
// and keeps the runtime footprint at zero new packages.

const PRICE_NUMBER_RE = /[\d.,]+/

// Strip currency symbols, NBSPs, RTL marks, thousand separators; parse to float.
// Examples: "₹363.00" → 363, "$1,299.99" → 1299.99, " 1\u00a0299,99\u00a0€" → 1299 (best effort).
function parsePriceText(raw: string): number | null {
  if (!raw) return null
  // Drop everything that isn't a digit, dot, comma or minus.
  const cleaned = raw.replace(/[\u00a0\u200e\u200f\s]/g, ' ').trim()
  const m = cleaned.match(PRICE_NUMBER_RE)
  if (!m) return null
  // Handle "1,299.99" (US) vs "1.299,99" (EU). Heuristic: if both `,` and `.`
  // are present, the LAST occurrence wins as the decimal separator. If only
  // `,` is present and it appears as a 2-digit suffix, treat as decimal.
  let token = m[0]
  const hasComma = token.includes(',')
  const hasDot = token.includes('.')
  if (hasComma && hasDot) {
    const lastComma = token.lastIndexOf(',')
    const lastDot = token.lastIndexOf('.')
    if (lastComma > lastDot) {
      // EU-style: "1.299,99"
      token = token.replace(/\./g, '').replace(',', '.')
    } else {
      // US-style: "1,299.99"
      token = token.replace(/,/g, '')
    }
  } else if (hasComma && !hasDot) {
    // If the comma is followed by exactly 2 digits at the end → decimal.
    if (/,\d{2}$/.test(token)) token = token.replace(',', '.')
    else token = token.replace(/,/g, '')
  }
  const n = parseFloat(token)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Walk a list of regexes in priority order. Each regex must capture the inner
// text of the price element in group 1. First match wins.
function firstMatchingPrice(
  html: string,
  patterns: readonly RegExp[],
): number | null {
  for (const re of patterns) {
    const m = re.exec(html)
    if (m && m[1]) {
      const n = parsePriceText(m[1])
      if (n != null) return n
    }
  }
  return null
}

// --- Amazon ---
// Amazon's deal-price block has shape:
//   <span class="a-price priceToPay" ...><span class="a-offscreen">₹363.00</span>...</span>
// The `.a-offscreen` span is the screen-reader-only canonical price text. The
// `.priceToPay` modifier is what Amazon uses for the green active checkout
// price block adjacent to the Buy button — distinct from `.a-text-price` which
// styles the strike-through M.R.P.
//
// The patterns below are tolerant of attribute order and extra classes.
const AMAZON_PATTERNS: readonly RegExp[] = [
  // .priceToPay .a-offscreen — primary active price (most reliable).
  // Match an <span> whose class contains "priceToPay", then the first
  // <span class="...a-offscreen...">PRICE</span> within ~1KB.
  /<span[^>]*class="[^"]*priceToPay[^"]*"[^>]*>[\s\S]{0,1500}?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/i,
  // #corePriceDisplay_desktop_feature_div → first .a-price .a-offscreen inside.
  /id="corePriceDisplay_desktop_feature_div"[\s\S]{0,3000}?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/i,
  // [data-a-color="price"] .a-offscreen — used in some PDP variants.
  /data-a-color="price"[^>]*>[\s\S]{0,1500}?<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)<\/span>/i,
  // Legacy single-price PDPs.
  /id="priceblock_dealprice"[^>]*>([^<]+)</i,
  /id="priceblock_ourprice"[^>]*>([^<]+)</i,
  /id="priceblock_saleprice"[^>]*>([^<]+)</i,
]

function isAmazonHost(host: string): boolean {
  // Match amazon.com, amazon.in, amazon.co.uk, etc.
  return /(^|\.)amazon\.[a-z.]{2,}$/i.test(host)
}

function extractAmazonPrice(html: string): number | null {
  return firstMatchingPrice(html, AMAZON_PATTERNS)
}

// --- JSON-LD fallback ---
// Parse <script type="application/ld+json">…</script> islands and look for a
// Product node with offers.price. Handles single Offer and AggregateOffer.
const JSONLD_BLOCK_RE =
  /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

function extractJsonLdPrice(html: string): number | null {
  let match: RegExpExecArray | null
  // Reset lastIndex defensively (the global flag means state carries between calls).
  JSONLD_BLOCK_RE.lastIndex = 0
  while ((match = JSONLD_BLOCK_RE.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    const price = findProductPriceInJsonLd(parsed)
    if (price != null) return price
  }
  return null
}

// Recursively search a JSON-LD value (object, array, or @graph wrapper) for a
// Product node and return offers.price as a number.
function findProductPriceInJsonLd(node: unknown): number | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const p = findProductPriceInJsonLd(item)
      if (p != null) return p
    }
    return null
  }
  if (!node || typeof node !== 'object') return null
  const obj = node as Record<string, unknown>

  // Some sites use { "@graph": [ ... ] } at the top level.
  if (Array.isArray(obj['@graph'])) {
    const p = findProductPriceInJsonLd(obj['@graph'])
    if (p != null) return p
  }

  const type = obj['@type']
  const isProduct =
    type === 'Product' ||
    (Array.isArray(type) && type.includes('Product'))

  if (isProduct && obj.offers !== undefined) {
    const p = priceFromOffers(obj.offers)
    if (p != null) return p
  }

  // Recurse into any nested object values (covers wrappers like ItemPage,
  // mainEntity, mainEntityOfPage).
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const p = findProductPriceInJsonLd(v)
      if (p != null) return p
    }
  }
  return null
}

function priceFromOffers(offers: unknown): number | null {
  if (Array.isArray(offers)) {
    for (const o of offers) {
      const p = priceFromOffers(o)
      if (p != null) return p
    }
    return null
  }
  if (!offers || typeof offers !== 'object') return null
  const o = offers as Record<string, unknown>
  const direct =
    typeof o.price === 'number'
      ? o.price
      : typeof o.price === 'string'
        ? parsePriceText(o.price)
        : null
  if (direct != null && direct > 0) return direct
  // AggregateOffer uses lowPrice / highPrice — prefer lowPrice (active deal).
  const low =
    typeof o.lowPrice === 'number'
      ? o.lowPrice
      : typeof o.lowPrice === 'string'
        ? parsePriceText(o.lowPrice)
        : null
  if (low != null && low > 0) return low
  return null
}

// --- OpenGraph product meta fallback ---
// Many retailers emit one or more of these on PDP pages:
//   <meta property="og:price:amount" content="20499">
//   <meta property="og:price:currency" content="INR">
//   <meta property="product:price:amount" content="20499">
//   <meta property="og:product:price:amount" content="20499">
// Spec refs:
//   - https://ogp.me/#type_product (legacy "og:price:*")
//   - https://developers.facebook.com/docs/marketing-api/catalog/reference/  ("product:price:*")
// Capture group 1 = the amount string (digits + optional decimal/comma).
const OG_PRICE_PATTERNS: readonly RegExp[] = [
  // <meta property="og:price:amount" content="20499">
  /<meta[^>]*\bproperty=["'](?:og:price:amount|og:product:price:amount|product:price:amount)["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i,
  // attribute-order swap: content first, property second.
  /<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["'](?:og:price:amount|og:product:price:amount|product:price:amount)["'][^>]*>/i,
]

function extractOpenGraphPrice(html: string): number | null {
  return firstMatchingPrice(html, OG_PRICE_PATTERNS)
}

// --- Microdata itemprop="price" fallback ---
// Two common shapes:
//   <meta itemprop="price" content="999.99">
//   <span itemprop="price">$999.99</span>
// We accept both attribute orders for the meta variant. For the text-node
// variant we capture the inner text of the element (parsePriceText then
// strips currency symbols).
const MICRODATA_PRICE_PATTERNS: readonly RegExp[] = [
  // <meta itemprop="price" content="...">
  /<meta[^>]*\bitemprop=["']price["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i,
  // attribute-order swap: content first, itemprop second.
  /<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bitemprop=["']price["'][^>]*>/i,
  // <span/div itemprop="price">$999.99</span>
  /<(?:span|div|p|strong|b)[^>]*\bitemprop=["']price["'][^>]*>([^<]+)</i,
]

function extractMicrodataPrice(html: string): number | null {
  return firstMatchingPrice(html, MICRODATA_PRICE_PATTERNS)
}

/**
 * Best-effort structural price extractor. Pure function; no I/O.
 *
 * Returns a positive number when a structural price is found, otherwise null.
 * Callers are expected to fall back to their own LLM-derived value on null.
 *
 * Inputs are trusted to come from Firecrawl (not user input). We never
 * eval/execute the HTML; we only run regex over the raw string.
 */
export function extractStructuralPrice(args: {
  url: string
  html: string | undefined | null
}): number | null {
  const html = args.html
  if (typeof html !== 'string' || html.length === 0) return null

  let host = ''
  try {
    host = new URL(args.url).hostname
  } catch {
    return null
  }

  if (isAmazonHost(host)) {
    const amzn = extractAmazonPrice(html)
    if (amzn != null) return amzn
    // Amazon also ships JSON-LD, but its JSON-LD price is exactly the stale
    // value we're trying to AVOID. Do NOT fall through to JSON-LD or OG on
    // Amazon — Amazon's OG/microdata price likewise lags the visible deal.
    return null
  }

  // Non-Amazon: try universal structured-data signals in priority order.
  const jsonLd = extractJsonLdPrice(html)
  if (jsonLd != null) return jsonLd

  const og = extractOpenGraphPrice(html)
  if (og != null) return og

  const md = extractMicrodataPrice(html)
  if (md != null) return md

  return null
}

// Exported for tests.
export const __testing = {
  parsePriceText,
  isAmazonHost,
  extractAmazonPrice,
  extractJsonLdPrice,
  extractOpenGraphPrice,
  extractMicrodataPrice,
}
