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

import { z } from 'zod'
import type { ProductData, ScrapeResult } from './types'

// --- 1. JSON Schema sent to Firecrawl ---
export const PRODUCT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    product_name: {
      type: ['string', 'null'],
      description:
        'Full product name as displayed on the page. Return null if not found.',
    },
    current_price: {
      type: ['number', 'null'],
      description:
        'Active checkout price — the single amount the buyer would pay right now if they clicked Buy / Add to Cart. Prefer the price displayed adjacent to the primary Buy / Add-to-Cart / Checkout button. If a discount is applied, return the post-discount deal price, NOT the pre-discount M.R.P. or "was" price. EXCLUDE: M.R.P. / list / regular / "was" / strike-through prices, the tax-inclusive sub-line near the M.R.P. (e.g. "M.R.P. inclusive of all taxes"), per-unit prices (per 100ml, per kg, per count), EMI / monthly installments, Subscribe & Save / subscription prices, bundle / combo / add-on prices, shipping or import fees, and prices for unselected variants. Parse formatting like "$1,299.99" to 1299.99. Return null if no checkout price is visible.',
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
  required: [
    'product_name',
    'current_price',
    'currency_code',
    'product_image_url',
  ],
} as const

// --- 2a. Envelope Zod schema (we only validate what we use) ---
export const FirecrawlScrapeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      json: z.unknown().optional(), // hand-validated below in parseProductResponse
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  error: z.string().optional(),
})

// --- 2b. ProductData Zod (used only as a final sanity net after branch checks pass) ---
export const ProductDataSchema = z.object({
  name: z.string().min(1),
  current_price: z.number().positive(),
  currency_code: z.string().length(3).regex(/^[A-Z]{3}$/),
  image_url: z.string().url().nullable(),
})

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
 */
export function parseProductResponse(raw: unknown): ScrapeResult {
  const r = (raw ?? {}) as Record<string, unknown>

  // 1. missing_name
  if (
    typeof r.product_name !== 'string' ||
    r.product_name.trim() === ''
  ) {
    console.error('scrapeProduct: missing_name', { raw })
    return { ok: false, reason: 'missing_name' }
  }

  // 2. missing_price
  if (
    typeof r.current_price !== 'number' ||
    !Number.isFinite(r.current_price) ||
    r.current_price <= 0
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

  const data: ProductData = {
    name: r.product_name.trim(),
    current_price: r.current_price,
    currency_code: r.currency_code,
    image_url: image,
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
