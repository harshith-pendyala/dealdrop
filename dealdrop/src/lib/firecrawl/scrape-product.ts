import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// Public entrypoint of the Firecrawl integration. Consumed by:
//   - Phase 4: add-product Server Action
//   - Phase 6: daily cron Route Handler
//
// Returns a discriminated union per D-01. Every failure returns { ok: false, reason } — no throws
// for expected failures. Server-side console.error's each failure with full context (D-04);
// the public return carries ONLY the coarse reason code (no detail, no HTTP status, no stack).

import { env } from '@/lib/env.server'
import { validateUrl, normalizeUrl } from './url'
import {
  FirecrawlScrapeResponseSchema,
  PRODUCT_JSON_SCHEMA,
  parseProductResponse,
} from './schema'
import { extractStructuralPrice } from './price-extractor'
import type { ScrapeResult } from './types'

export type { ScrapeResult, ProductData, ScrapeFailureReason } from './types'

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape'
const TIMEOUT_MS = 60_000
const RETRY_BACKOFF_MS = 2_000

// Firecrawl v2 caches scrape results by URL (response metadata exposes
// `cacheState: "hit" | "miss"` and `cachedAt`). The default cache TTL is
// ~2 days, which means a re-scrape after a prompt/schema change will return
// the previously cached extraction — silently ignoring the new prompt.
//
// Setting `maxAge: 0` in the request body forces Firecrawl to bypass its
// cache and run a fresh scrape + extraction every time. This is what we want
// for the add-product flow: the user has just pasted the URL and expects the
// CURRENT live price, not whatever was extracted hours/days ago under an
// older prompt.
//
// Source: https://docs.firecrawl.dev/api-reference/endpoint/scrape (maxAge param)
const SCRAPE_MAX_AGE_MS = 0

// Cycle-4: prompt hardening for sites that ship NO structured data at all
// (e.g. Flipkart — no JSON-LD, no OG product meta, no microdata; the LLM
// fallback is the only path). The Galaxy A35 5G regression captured Flipkart's
// "best value with [bank] offer" promo (₹19,474) instead of the unconditional
// checkout price (₹20,499). The exclusion list now explicitly enumerates the
// classes of conditional offer the LLM kept gravitating toward, and a
// positive instruction anchors the choice to "any user, no bank/coupon/exchange
// required".
const PROMPT = [
  'Extract product_name, current_price (numeric), currency_code (ISO 4217 alpha-3),',
  'and product_image_url from this e-commerce product page.',
  '',
  'For current_price, return the ACTIVE CHECKOUT PRICE — the single amount the buyer',
  'would actually pay right now if they clicked Buy / Add to Cart. Prefer the price',
  'displayed adjacent to the primary Buy / Add-to-Cart / Checkout button.',
  '',
  'POSITIVE INSTRUCTION: If multiple prices appear, pick the price that ANY user would',
  'pay at checkout WITHOUT requiring a specific payment method, bank account, credit card,',
  'wallet, coupon code, or exchange. Choose the unconditional sale / deal price — the',
  'amount shown by default before any optional offer is applied.',
  '',
  'Do NOT return any of the following, even if they appear larger, more prominent, or are',
  'visually highlighted as "best value":',
  '- M.R.P., list price, "was" price, original price, strike-through price',
  '- Tax-inclusive sub-line near the M.R.P. (e.g. "M.R.P. inclusive of all taxes")',
  '- Per-unit prices (e.g. price per 100 ml, price per kg, price per count)',
  '- EMI / monthly installment amounts (e.g. "EMI starting at", "no-cost EMI of")',
  '- Subscribe & Save / subscription-only prices',
  '- Bundle, combo, "frequently bought together", or add-on prices',
  '- Shipping, delivery, or import fees',
  '- Prices for variants the user has not selected (different size / color / pack)',
  '- Bank offers, credit card offers, debit card offers (e.g. "with [Bank Name] bank offer",',
  '  "best value with [Bank] discount", "Buy at ₹X" preceded by an offer banner)',
  '- Prepaid / wallet / UPI discounts (e.g. "₹X off with prepaid", "wallet discount")',
  '- Coupon-conditional prices (e.g. "₹X off with coupon CODE")',
  '- Exchange offers / trade-in prices (e.g. "with exchange of old phone")',
  '',
  'If a discount is applied unconditionally (visible to every shopper, no payment method',
  'required), return the post-discount price (the deal price), not the pre-discount M.R.P.',
  'If multiple candidate prices appear, choose the one nearest the Buy button that matches',
  'the currently selected variant AND does not require a bank / card / coupon / exchange.',
].join(' ')

type FetchOutcome =
  | { kind: 'response'; res: Response }
  | { kind: 'timeout' }
  | { kind: 'network' }

async function doFetch(normalizedUrl: string): Promise<FetchOutcome> {
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`, // server-only env var, never NEXT_PUBLIC_
      },
      body: JSON.stringify({
        url: normalizedUrl,
        // Cycle-3: request `html` alongside the LLM-extracted `json` so the
        // structural price extractor can run on the raw page markup. Firecrawl
        // v2 supports mixing primitive format strings with structured format
        // objects in a single request — the response then carries `data.html`
        // and `data.json` side-by-side.
        formats: [
          {
            type: 'json',
            schema: PRODUCT_JSON_SCHEMA,
            prompt: PROMPT,
          },
          'html',
        ],
        onlyMainContent: true,
        timeout: TIMEOUT_MS,
        // Bypass Firecrawl's response cache — see SCRAPE_MAX_AGE_MS comment.
        maxAge: SCRAPE_MAX_AGE_MS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return { kind: 'response', res }
  } catch (err) {
    // Node 24 emits DOMException with name 'TimeoutError' for AbortSignal.timeout rejections.
    // See 03-RESEARCH.md Pitfall 4 — do NOT check for 'AbortError'.
    const isTimeout =
      (typeof DOMException !== 'undefined' &&
        err instanceof DOMException &&
        err.name === 'TimeoutError') ||
      (err instanceof Error && err.name === 'TimeoutError')
    if (isTimeout) return { kind: 'timeout' }
    return { kind: 'network' }
  }
}

/**
 * Scrape a product URL via Firecrawl v2 and return typed ProductData or a typed failure reason.
 * Never throws for expected failures — every caller must narrow on `ok`.
 *
 * Retry policy (per CONTEXT §Claude's Discretion):
 *   - 60s timeout via AbortSignal.timeout → reason: 'scrape_timeout' (NO retry)
 *   - 5xx OR network error → retry once after 2s backoff; if still failing → 'network_error'
 *   - 4xx → 'network_error' (Firecrawl won't change its mind; no retry — VALIDATION.md Seam 3)
 */
export async function scrapeProduct(rawUrl: string): Promise<ScrapeResult> {
  // 1. URL validation (D-05, D-07, D-08)
  const validated = validateUrl(rawUrl)
  if (!validated.ok) {
    // Pass rawUrl as a structured field so console.error uses util.inspect escaping.
    // Do NOT template-literal interpolate (e.g. NEVER: console.error(`...${rawUrl}`))
    // — that would be a log-injection vector per T-3-04.
    console.error('scrapeProduct: invalid_url', { rawUrl })
    return { ok: false, reason: 'invalid_url' }
  }
  // 2. URL normalization (D-06)
  const normalizedUrl = normalizeUrl(validated.url)

  // 3. Firecrawl call with targeted retry (1 retry on 5xx/network; none on timeout or 4xx)
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = await doFetch(normalizedUrl)

    if (outcome.kind === 'timeout') {
      // NEVER log the Authorization header or raw API key.
      console.error('scrapeProduct: timeout', { url: normalizedUrl })
      return { ok: false, reason: 'scrape_timeout' }
    }

    if (outcome.kind === 'network') {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }
      console.error('scrapeProduct: network_error after retry', {
        url: normalizedUrl,
      })
      return { ok: false, reason: 'network_error' }
    }

    // outcome.kind === 'response'
    const { res } = outcome

    // 4xx — never retry; mapped to network_error per VALIDATION.md Seam 3
    // (rate limits / client errors are network-class; `unknown` is reserved for
    // genuinely unexpected payload shapes, not documented HTTP error classes).
    if (res.status >= 400 && res.status < 500) {
      const body = await res.text().catch(() => '<unreadable>')
      console.error('scrapeProduct: Firecrawl 4xx', {
        url: normalizedUrl,
        status: res.status,
        body,
      })
      return { ok: false, reason: 'network_error' }
    }

    // 5xx — retry once
    if (res.status >= 500) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }
      console.error('scrapeProduct: Firecrawl 5xx after retry', {
        url: normalizedUrl,
        status: res.status,
      })
      return { ok: false, reason: 'network_error' }
    }

    // 2xx — parse the envelope
    let json: unknown
    try {
      json = await res.json()
    } catch (err) {
      console.error('scrapeProduct: envelope JSON parse failed', {
        url: normalizedUrl,
        err,
      })
      return { ok: false, reason: 'unknown' }
    }

    const envParsed = FirecrawlScrapeResponseSchema.safeParse(json)
    if (
      !envParsed.success ||
      !envParsed.data.success ||
      envParsed.data.data?.json === undefined
    ) {
      console.error('scrapeProduct: unexpected envelope', {
        url: normalizedUrl,
        body: json,
      })
      return { ok: false, reason: 'unknown' }
    }

    // Cycle-3: run the structural price extractor on the raw page HTML BEFORE
    // delegating to parseProductResponse. When the extractor finds a price
    // (e.g. Amazon's `.priceToPay .a-offscreen` deal-price block, or JSON-LD /
    // OG / microdata on other retailers) we use it to override the LLM-supplied
    // `current_price`. The LLM tends to trust schema.org JSON-LD canonical
    // values which can lag the visible deal price under an active discount.
    // When the extractor returns null the LLM value is used unchanged.
    const html = envParsed.data.data.html
    const structuralPrice = extractStructuralPrice({
      url: normalizedUrl,
      html,
    })

    // Cycle-2 + Cycle-3 instrumentation: log the raw `data.json` payload from
    // Firecrawl alongside the cache state and the structural price the
    // extractor selected. Lets us tell at a glance which source produced the
    // captured price (LLM vs. structural) and whether the cache was bypassed.
    const meta = envParsed.data.data.metadata as
      | { cacheState?: unknown; cachedAt?: unknown }
      | undefined
    console.log('scrapeProduct: Firecrawl response', {
      url: normalizedUrl,
      cacheState: meta?.cacheState,
      cachedAt: meta?.cachedAt,
      htmlLength: typeof html === 'string' ? html.length : 0,
      structuralPrice,
      json: envParsed.data.data.json,
    })

    // 4. Delegate branch-ordered field validation to parseProductResponse (Plan 02).
    //    The structuralPrice (if non-null) replaces `data.json.current_price`
    //    inside parseProductResponse; otherwise the LLM value is used.
    return parseProductResponse(
      envParsed.data.data.json,
      structuralPrice,
    )
  }

  // Unreachable under normal control flow — loop always returns.
  console.error('scrapeProduct: unreachable fallthrough', {
    url: normalizedUrl,
  })
  return { ok: false, reason: 'unknown' }
}
