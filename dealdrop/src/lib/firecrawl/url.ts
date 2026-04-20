// Source: WHATWG URL spec + Zod 4 docs
// Pure functions — no I/O, no env access. Safe to import from any runtime (server or client).
// See 03-CONTEXT.md D-05 (protocol allowlist), D-06 (normalization rules), D-08 (max length 2048).

import { z } from 'zod'

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$)/i

const UrlSchema = z
  .string()
  .max(2048) // D-08
  .url() // D-05 (shape via WHATWG URL parser)
  .refine(
    (raw) => {
      try {
        const u = new URL(raw)
        return u.protocol === 'http:' || u.protocol === 'https:' // D-05 (protocol allowlist)
      } catch {
        return false
      }
    },
    { message: 'Only http/https URLs are accepted' },
  )

/**
 * Validates an incoming URL string against D-05/D-08 rules.
 * Returns a discriminated union — never throws.
 */
export function validateUrl(
  raw: string,
): { ok: true; url: string } | { ok: false } {
  const parsed = UrlSchema.safeParse(raw)
  if (!parsed.success) return { ok: false }
  return { ok: true, url: parsed.data }
}

/**
 * Normalizes a URL per D-06:
 *   - lowercase scheme and host
 *   - strip trailing slash from path (but preserve root "/")
 *   - strip utm_*, fbclid, gclid query params
 *   - preserve everything else (variant=, sku=, etc.) verbatim
 *
 * MUST be called with an already-validated URL (validateUrl() → normalizeUrl()).
 * If given an invalid URL string, the `new URL()` call throws — caller is expected to
 * have validated first. This matches the contract in scrape-product.ts which chains the two.
 */
export function normalizeUrl(url: string): string {
  const u = new URL(url)
  // D-06: lowercase scheme and host
  u.protocol = u.protocol.toLowerCase()
  u.hostname = u.hostname.toLowerCase()
  // D-06: strip trailing slash from path (but preserve root "/")
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1)
  }
  // D-06: strip tracking params, preserve everything else verbatim
  const keys = Array.from(u.searchParams.keys())
  for (const k of keys) {
    if (TRACKING_PARAM.test(k)) u.searchParams.delete(k)
  }
  return u.toString()
}
