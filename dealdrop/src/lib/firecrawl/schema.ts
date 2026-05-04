// Source: https://docs.firecrawl.dev/api-reference/endpoint/scrape
// Source: https://docs.firecrawl.dev/features/llm-extract
//
// Two responsibilities:
//   1. PRODUCT_JSON_SCHEMA — the JSON Schema payload we send in the Firecrawl v2 request body
//      under `formats: [{ type: 'json', schema }]`.
//   2. Response parsing — an envelope Zod schema for the shape Firecrawl returns, plus a
//      BRANCH-ORDERED helper (`parseProductResponse`) that maps the `data.json` inner payload
//      to ScrapeResult. Branch order matters — see 03-RESEARCH.md Pitfall 3.
//
// Why not a single safeParse? Because ScrapeFailureReason is a closed union (D-02) and the
// three product-field failures (missing_name, missing_price, invalid_currency) each carry a
// distinct Phase 4 toast + Phase 6 metric. Collapsing them into one 'invalid_response' reason
// destroys that information.
//
// Cycle-5 update — multi-slot price extraction:
//   The single `current_price` LLM field was replaced with THREE slots so the LLM is forced
//   to CATEGORIZE every visible price instead of picking one. We then locally pick the
//   DealDrop value with sanity checks. Slots:
//     - mrp                       : list / "was" / strike-through (nullable)
//     - current_price             : the unconditional default checkout price (REQUIRED)
//     - lowest_conditional_price  : the lowest price gated on a payment method / coupon /
//                                   exchange / EMI etc. (nullable)
//   This was driven by the Flipkart Galaxy A35 5G regression (cycle 4): pure prompt
//   engineering kept failing because the LLM was being asked to make a single judgment
//   call between visually-prominent candidates. With three slots, the LLM no longer
//   chooses — it categorizes — and we have explicit values to sanity-check against.

import { z } from 'zod'
import type { ProductData, ScrapeResult } from './types'

// --- 1. JSON Schema sent to Firecrawl ---
// The Firecrawl v2 LLM-extract contract injects each property's `description`
// into the model context, so the per-field guidance HERE is what the LLM
// actually sees during extraction. Keep these descriptions tightly aligned
// with the prompt in scrape-product.ts.
export const PRODUCT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    product_name: {
      type: ['string', 'null'],
      description:
        'Full product name as displayed on the page. Return null if not found.',
    },
    mrp: {
      type: ['number', 'null'],
      description:
        'Maximum Retail Price / list price / regular price / "was" price / strike-through price — the PRE-DISCOUNT reference price. Look for prices rendered with line-through styling, prefixed with "M.R.P.", "List", "Was", or "Regular", or shown crossed out next to the active price. Parse formatting like "₹36,999" to 36999. Return null if no MRP / list / "was" price is shown (regular-priced items typically have no MRP).',
    },
    current_price: {
      type: ['number', 'null'],
      description:
        'The DEFAULT checkout price — the single amount ANY user pays right now if they click Buy / Add to Cart WITHOUT applying any payment-method-specific offer (no bank offer, no credit-card offer, no debit-card offer, no wallet/UPI/prepaid discount, no coupon code, no exchange / trade-in, no EMI). If the listing has an unconditional discount applied (e.g. "15% off" visible to every shopper without payment-method requirement), this is the POST-DISCOUNT deal price, NOT the pre-discount MRP. Prefer the price displayed adjacent to the primary Buy / Add-to-Cart / Checkout button. Required — pick the unconditional default checkout price even if a lower conditional offer is visually highlighted as "best value". Parse formatting like "$1,299.99" to 1299.99. Return null only if no checkout price is visible.',
    },
    lowest_conditional_price: {
      type: ['number', 'null'],
      description:
        'The LOWEST price visible on the page that is CONDITIONAL on a specific payment method, payment instrument, or offer code. Includes: bank offers, credit-card offers, debit-card offers (e.g. "with [Bank] bank offer", "best value with [Bank] discount"), prepaid / wallet / UPI discounts, coupon-conditional prices (e.g. "₹X off with coupon CODE"), exchange / trade-in prices ("with exchange of old phone"), and no-cost-EMI conditional prices. Look for cues like "Buy at ₹X", "with [Bank] bank offer", "Apply offers for maximum savings". Return null if no conditional offer is shown.',
    },
    currency_code: {
      type: ['string', 'null'],
      description:
        'ISO 4217 alpha-3 currency code (e.g. USD, EUR, GBP, JPY, INR). If only a symbol is visible, infer the code. Return null if the currency cannot be determined.',
    },
    product_image_url: {
      type: ['string', 'null'],
      description:
        'Absolute URL of the primary product image. Return null if no image is visible.',
    },
  },
  // current_price stays REQUIRED — every page that's a product page has a
  // checkout price. mrp and lowest_conditional_price are optional because
  // many products are regular-priced (no MRP) and most have no conditional
  // offer.
  required: [
    'product_name',
    'current_price',
    'currency_code',
    'product_image_url',
  ],
} as const

// --- 2a. Envelope Zod schema (we only validate what we use) ---
// `html` is optional — it's only present when the request body asks for the
// 'html' format alongside the structured-json format. See scrape-product.ts.
export const FirecrawlScrapeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      json: z.unknown().optional(), // hand-validated below in parseProductResponse
      html: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  error: z.string().optional(),
})

// --- 2b. ProductData Zod (used only as a final sanity net after branch checks pass) ---
// Cycle-5: `mrp` is nullable but always present on the validated shape (set to
// null when not provided). Keeping it on the schema means a typo in the
// branch logic surfaces here as a programming-error log instead of silently
// dropping the field.
export const ProductDataSchema = z.object({
  name: z.string().min(1),
  current_price: z.number().positive(),
  currency_code: z.string().length(3).regex(/^[A-Z]{3}$/),
  image_url: z.string().url().nullable(),
  mrp: z.number().positive().nullable(),
})

/**
 * Cycle-5 — sanity-repair the raw multi-slot LLM payload.
 *
 * The LLM occasionally swaps slots. Cheap structural checks let us repair
 * the most common mistakes before they reach `current_price`:
 *
 *   (a) `mrp < current_price` — clearly a swap. The MRP should be the
 *       larger of the two; swap them.
 *   (b) `current_price < lowest_conditional_price` — clearly a swap.
 *       The conditional offer should be the cheaper one; swap them.
 *   (c) `lowest_conditional_price >= current_price` and no MRP — suspicious
 *       (a "conditional" price isn't conditional if it's not actually
 *       cheaper) but we trust the LLM's `current_price` rather than
 *       second-guess it. We log so this is observable.
 *
 * Returns a normalized `{ mrp, current_price, lowest_conditional_price }`
 * triple with non-numeric inputs coerced to null. Never throws.
 */
function repairPriceSlots(
  raw: Record<string, unknown>,
): {
  mrp: number | null
  current_price: number | null
  lowest_conditional_price: number | null
} {
  const toFinitePos = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null

  let mrp = toFinitePos(raw.mrp)
  let current_price = toFinitePos(raw.current_price)
  let lowest_conditional_price = toFinitePos(raw.lowest_conditional_price)

  // (a) MRP < current_price → likely swapped. The MRP is the larger reference price.
  if (mrp != null && current_price != null && current_price > mrp) {
    console.warn('scrapeProduct: repaired mrp/current_price swap', {
      original: { mrp, current_price },
    })
    const swap = mrp
    mrp = current_price
    current_price = swap
  }

  // (b) current_price < lowest_conditional_price → likely swapped. The
  // conditional offer is supposed to be the cheaper one.
  if (
    current_price != null &&
    lowest_conditional_price != null &&
    current_price < lowest_conditional_price
  ) {
    console.warn(
      'scrapeProduct: repaired current_price/lowest_conditional_price swap',
      { original: { current_price, lowest_conditional_price } },
    )
    const swap = current_price
    current_price = lowest_conditional_price
    lowest_conditional_price = swap
  }

  // (c) Suspicious but not load-bearing: log only.
  if (
    lowest_conditional_price != null &&
    current_price != null &&
    lowest_conditional_price >= current_price
  ) {
    console.warn(
      'scrapeProduct: lowest_conditional_price not actually lower than current_price; trusting LLM judgment',
      { current_price, lowest_conditional_price },
    )
  }

  return { mrp, current_price, lowest_conditional_price }
}

// --- 2c. Branch-ordered helper that converts Firecrawl's `data.json` payload into ScrapeResult ---
/**
 * Branch-ordered validation (Pitfall 3). The ORDER matters:
 *   1. missing_name   (must check first — prevents cascade)
 *   2. missing_price
 *   3. invalid_currency
 *   4. image_url null is allowed (DB-01)
 *
 * Each branch console.error's the full raw payload server-side (D-04 observability)
 * before returning the coarse reason. NEVER include `detail` in the return.
 *
 * `priceOverride`: when set (positive number), it REPLACES the LLM-extracted
 * `current_price`. Used by scrapeProduct() to substitute a structurally-extracted
 * price (e.g. from Amazon's `.priceToPay .a-offscreen` block) when available.
 * If the override is null/undefined the LLM value is used unchanged. The branch
 * order and ScrapeFailureReason union are unchanged — only the source of the
 * `current_price` number differs.
 *
 * `mrpOverride`: when set (positive number), it REPLACES the LLM-extracted `mrp`.
 * Used by scrapeProduct() to substitute a structurally-extracted MRP (e.g. from
 * Amazon's `.basisPrice .a-offscreen` strike-through block, or JSON-LD
 * `priceSpecification.maxPrice`). The structural value still wins over the LLM,
 * matching the cycle-3 priority for `current_price`.
 */
export function parseProductResponse(
  raw: unknown,
  priceOverride?: number | null,
  mrpOverride?: number | null,
): ScrapeResult {
  const r = (raw ?? {}) as Record<string, unknown>

  // 1. missing_name
  if (
    typeof r.product_name !== 'string' ||
    r.product_name.trim() === ''
  ) {
    console.error('scrapeProduct: missing_name', { raw })
    return { ok: false, reason: 'missing_name' }
  }

  // Cycle-5: repair LLM slot swaps before we look at the price slots.
  const repaired = repairPriceSlots(r)

  // Substitute the structurally-extracted price BEFORE the missing_price branch
  // so the same nullability/positivity checks apply uniformly.
  const effectivePrice =
    typeof priceOverride === 'number' &&
    Number.isFinite(priceOverride) &&
    priceOverride > 0
      ? priceOverride
      : repaired.current_price

  // 2. missing_price
  if (
    typeof effectivePrice !== 'number' ||
    !Number.isFinite(effectivePrice) ||
    effectivePrice <= 0
  ) {
    console.error('scrapeProduct: missing_price', { raw })
    return { ok: false, reason: 'missing_price' }
  }

  // 3. invalid_currency
  if (
    typeof r.currency_code !== 'string' ||
    !/^[A-Z]{3}$/.test(r.currency_code)
  ) {
    console.error('scrapeProduct: invalid_currency', { raw })
    return { ok: false, reason: 'invalid_currency' }
  }

  // 4. image_url is nullable (DB-01 / Pitfall 6)
  const image: string | null =
    typeof r.product_image_url === 'string' &&
    r.product_image_url.length > 0
      ? r.product_image_url
      : null

  // Cycle-5: pick the effective MRP. Structural override (cycle-3 path,
  // extended in cycle-5 to capture Amazon's `.basisPrice` strike-through)
  // takes precedence over the LLM value, matching the priority rule for
  // `current_price`. Non-positive MRPs are coerced to null.
  const effectiveMrp: number | null =
    typeof mrpOverride === 'number' &&
    Number.isFinite(mrpOverride) &&
    mrpOverride > 0
      ? mrpOverride
      : repaired.mrp

  // Defense-in-depth: if MRP ends up smaller than current_price after the
  // overrides applied, drop it. We never want to display "MRP 100, sale 200".
  const safeMrp: number | null =
    effectiveMrp != null && effectiveMrp >= effectivePrice
      ? effectiveMrp
      : null

  const data: ProductData = {
    name: r.product_name.trim(),
    current_price: effectivePrice,
    currency_code: r.currency_code,
    image_url: image,
    mrp: safeMrp,
  }

  // Final sanity net — asserts the ProductDataSchema shape even though every field was hand-checked.
  // If this fails, it's a programming error (our branch logic diverged from the Zod schema).
  const parsed = ProductDataSchema.safeParse(data)
  if (!parsed.success) {
    console.error('scrapeProduct: response shape mismatch (programming error)', {
      issues: parsed.error.issues,
      data,
    })
    return { ok: false, reason: 'unknown' }
  }

  return { ok: true, data: parsed.data }
}
