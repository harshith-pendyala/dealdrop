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
import {
  extractStructuralPrice,
  extractStructuralMrp,
} from './price-extractor'
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

// Cycle-5: multi-slot price prompt. Cycle-4's pure prompt-engineering
// approach failed UAT for Flipkart — the LLM kept choosing the most
// visually prominent price even when told to exclude conditional offers,
// because it was being asked to pick ONE price out of three plausible
// candidates. We now ask the LLM to CATEGORIZE prices into three slots
// (`mrp`, `current_price`, `lowest_conditional_price`) instead of choosing
// one. Local sanity-check logic in `parseProductResponse` repairs slot
// swaps and selects `current_price` as the DealDrop value.
//
// The exclusion list is kept (it still helps the LLM put the right number
// in the right slot) but is now framed as classification guidance rather
// than rejection criteria.
const PROMPT = [
  'Extract product_name, three price slots (mrp, current_price,',
  'lowest_conditional_price), currency_code (ISO 4217 alpha-3), and',
  'product_image_url from this e-commerce product page.',
  '',
  'You must CATEGORIZE every visible price into ONE of three slots — not pick',
  'just one price. Read the per-slot guidance carefully:',
  '',
  '* mrp — the MAXIMUM RETAIL PRICE / list price / "was" price / regular price',
  '  / strike-through price. The PRE-discount reference price. Look for prices',
  '  rendered with line-through styling, prefixed with "M.R.P.", "List", "Was",',
  '  or "Regular", or shown crossed out next to the active price. Return null',
  '  if no MRP / list / "was" price is shown (regular-priced items typically',
  '  have no MRP).',
  '',
  '* current_price — the DEFAULT checkout price the buyer pays right now if',
  '  they click Buy / Add to Cart WITHOUT applying any payment-method-specific',
  '  offer (no bank offer, no credit-card offer, no debit-card offer, no',
  '  wallet/UPI/prepaid discount, no coupon code, no exchange / trade-in, no',
  '  no-cost EMI). Prefer the price displayed adjacent to the primary Buy /',
  '  Add-to-Cart / Checkout button. If a discount is applied unconditionally',
  '  (visible to every shopper, no payment method required), return the',
  '  POST-discount price, NOT the pre-discount MRP. This slot is REQUIRED;',
  '  every product page has a default checkout price.',
  '',
  '* lowest_conditional_price — the LOWEST price visible on the page that is',
  '  CONDITIONAL on a specific payment method, payment instrument, or offer',
  '  code. Includes: bank offers, credit-card offers, debit-card offers',
  '  (e.g. "with [Bank] bank offer", "best value with [Bank] discount"),',
  '  prepaid / wallet / UPI discounts, coupon-conditional prices ("₹X off',
  '  with coupon CODE"), exchange / trade-in prices ("with exchange of old',
  '  phone"), no-cost-EMI conditional prices. Cues: "Buy at ₹X", "best value",',
  '  "Apply offers for maximum savings". Return null if no conditional offer',
  '  is shown.',
  '',
  'Important rules:',
  '- The MRP must be GREATER than or equal to current_price (a discount can',
  '  never make the price exceed the list price). If you only see one price,',
  '  it goes in current_price and mrp is null.',
  '- The lowest_conditional_price must be LESS than or equal to current_price',
  '  when present (a conditional offer is by definition cheaper than the',
  '  default price).',
  '- Do NOT pick per-unit prices (e.g. price per 100 ml, price per kg), EMI',
  '  monthly amounts ("EMI starting at"), Subscribe & Save / subscription',
  '  prices, bundle / combo prices, shipping or import fees, or prices for',
  '  unselected variants. Skip them entirely.',
  '- Parse formatting like "$1,299.99" to 1299.99 and "₹36,999" to 36999.',
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

    // Cycle-3 / Cycle-5: run the structural extractors on the raw page HTML
    // BEFORE delegating to parseProductResponse. We extract two values:
    //
    //   • `structuralPrice` — overrides `current_price` (the cycle-3 path —
    //     Amazon `.priceToPay`, JSON-LD / OG / microdata for other hosts).
    //   • `structuralMrp` — overrides `mrp` (cycle-5 — Amazon `.basisPrice`
    //     / `.a-text-strike` strike-through, JSON-LD `priceSpecification.
    //     maxPrice` / `Offer.highPrice`). Optional — when null, the LLM's
    //     `mrp` slot is used instead.
    //
    // When both extractors return null, the LLM-supplied slots are used
    // unchanged.
    const html = envParsed.data.data.html
    const structuralPrice = extractStructuralPrice({
      url: normalizedUrl,
      html,
    })
    const structuralMrp = extractStructuralMrp({
      url: normalizedUrl,
      html,
    })

    // Cycle-2 + Cycle-3 + Cycle-5 instrumentation: log the raw `data.json`
    // payload from Firecrawl alongside the cache state and BOTH structural
    // values the extractors selected. Lets us tell at a glance which source
    // produced each captured value.
    const meta = envParsed.data.data.metadata as
      | { cacheState?: unknown; cachedAt?: unknown }
      | undefined
    console.log('scrapeProduct: Firecrawl response', {
      url: normalizedUrl,
      cacheState: meta?.cacheState,
      cachedAt: meta?.cachedAt,
      htmlLength: typeof html === 'string' ? html.length : 0,
      structuralPrice,
      structuralMrp,
      json: envParsed.data.data.json,
    })

    // 4. Delegate branch-ordered field validation to parseProductResponse (Plan 02).
    //    The structuralPrice / structuralMrp (if non-null) replace the
    //    corresponding LLM slots inside parseProductResponse.
    return parseProductResponse(
      envParsed.data.data.json,
      structuralPrice,
      structuralMrp,
    )
  }

  // Unreachable under normal control flow — loop always returns.
  console.error('scrapeProduct: unreachable fallthrough', {
    url: normalizedUrl,
  })
  return { ok: false, reason: 'unknown' }
}
