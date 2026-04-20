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
import type { ScrapeResult } from './types'

export type { ScrapeResult, ProductData, ScrapeFailureReason } from './types'

const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/scrape'
const TIMEOUT_MS = 60_000
const RETRY_BACKOFF_MS = 2_000

const PROMPT =
  'Extract product_name, current_price (numeric), currency_code (ISO 4217 alpha-3), product_image_url from this e-commerce product page.'

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
        formats: [
          {
            type: 'json',
            schema: PRODUCT_JSON_SCHEMA,
            prompt: PROMPT,
          },
        ],
        onlyMainContent: true,
        timeout: TIMEOUT_MS,
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

    // 4. Delegate branch-ordered field validation to parseProductResponse (Plan 02).
    //    Each D-02 reason fires on its own condition; the helper logs per-branch.
    return parseProductResponse(envParsed.data.data.json)
  }

  // Unreachable under normal control flow — loop always returns.
  console.error('scrapeProduct: unreachable fallthrough', {
    url: normalizedUrl,
  })
  return { ok: false, reason: 'unknown' }
}
