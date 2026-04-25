import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// File: dealdrop/src/lib/resend.ts
// EMAIL-01/02/03/05/06: transactional email for Phase 6 price-drop alerts.
// D-05 (inline HTML template), D-06 (CTA to product.url, target=_blank),
// D-07 (hero percent + strikethrough old price), EMAIL-06 (log-but-don't-abort).
// Resend Node SDK v6.12.2 contract: emails.send returns { data, error } tuple;
// never throws for API errors. Source: resend.com/docs/send-with-nextjs.

import { Resend } from 'resend'
import { env } from '@/lib/env.server'

// ---------------------------------------------------------------------------
// Types — discriminated-union return, matches Phase 3 scrape-product.ts shape.
// ---------------------------------------------------------------------------

export type PriceDropInput = {
  to: string
  product: {
    name: string
    url: string
    image_url: string | null
    currency: string
  }
  oldPrice: number
  newPrice: number
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: 'rate_limited' | 'invalid_from' | 'validation' | 'unknown' }

// ---------------------------------------------------------------------------
// Module-scope SDK instance — mirrors the FIRECRAWL_URL constant pattern
// in scrape-product.ts. Construction happens once at module load.
// ---------------------------------------------------------------------------
const resend = new Resend(env.RESEND_API_KEY)

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested directly — no mocks needed)
// ---------------------------------------------------------------------------

export function computePercentDrop(oldPrice: number, newPrice: number): number {
  // Rounded whole integer per D-07. Works for any currency — percentage is unit-agnostic.
  // Caller must guarantee oldPrice > 0 (Phase 1 DB-03 CHECK constraint enforces this).
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100)
}

export function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount)
  } catch {
    // Intl.NumberFormat throws RangeError on invalid ISO 4217 codes (Pitfall 3).
    // Phase 3 rejects invalid codes at scrape-time so this rarely fires, but
    // legacy products or an ICU data gap in Node could trigger it.
    return `${amount.toFixed(2)} ${code}`
  }
}

export function escapeHtml(s: string): string {
  // Minimal HTML-entity escape for template interpolation.
  // Scraped product names can contain <, >, ", ', & — all must be escaped.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// HTML template — table-based layout, inline-style CSS, NO class names.
// Outlook + Gmail strip <style> blocks and don't support flexbox/grid reliably.
// ---------------------------------------------------------------------------

export function renderPriceDropEmailHtml(
  input: PriceDropInput & { percentDrop: number }
): string {
  const { product, oldPrice, newPrice, percentDrop } = input
  const oldFormatted = formatCurrency(oldPrice, product.currency)
  const newFormatted = formatCurrency(newPrice, product.currency)
  const safeName = escapeHtml(product.name)
  const safeUrl = escapeHtml(product.url)
  const imgTag = product.image_url
    ? `<img src="${escapeHtml(product.image_url)}" alt="" width="300" style="display:block;max-width:300px;height:auto;border:0;margin:0 auto;" />`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background-color:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 16px 32px;text-align:center;">
          <div style="font-size:48px;font-weight:700;color:#16a34a;line-height:1;">&minus;${percentDrop}%</div>
          <div style="font-size:14px;color:#71717a;margin-top:8px;">Price drop on a product you track</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px 32px;text-align:center;">
          ${imgTag}
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 24px 32px;text-align:center;">
          <div style="font-size:18px;font-weight:600;color:#18181b;">${safeName}</div>
          <div style="margin-top:12px;font-size:16px;color:#71717a;">
            <s style="color:#a1a1aa;">${oldFormatted}</s>
            &nbsp;&nbsp;
            <span style="font-size:20px;font-weight:700;color:#18181b;">${newFormatted}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px 32px;text-align:center;">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:12px 24px;background:#18181b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;">
            View Product &rarr;
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;font-size:12px;color:#a1a1aa;">
          You're getting this because you're tracking this product on DealDrop.
        </td>
      </tr>
    </table>
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// Public API — the cron orchestrator calls this for every price drop.
// ---------------------------------------------------------------------------

export async function sendPriceDropAlert(input: PriceDropInput): Promise<SendResult> {
  const percentDrop = computePercentDrop(input.oldPrice, input.newPrice)
  const html = renderPriceDropEmailHtml({ ...input, percentDrop })

  // Resend SDK v6.12.2: { data, error } tuple. NEVER throws for API errors
  // (auth, rate limit, invalid from, etc.) — only throws on network-layer
  // crashes. The cron handler's Promise.allSettled is belt-and-suspenders
  // for that rare path; per EMAIL-06, we log and continue either way.
  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: `Price drop: ${input.product.name} -${percentDrop}%`,
    html,
  })

  if (error) {
    // Structured log — never template-literal interpolate (log-injection; T-6-04).
    console.error('resend: send_failed', {
      productUrl: input.product.url,
      errorName: error.name,
      errorMessage: error.message,
    })
    // Map Resend's error.name to our coarse reason enum.
    // Full list: resend.com/docs/api-reference/errors
    type SendFailureReason = Extract<SendResult, { ok: false }>['reason']
    const reason: SendFailureReason =
      error.name === 'rate_limit_exceeded' || error.name === 'monthly_quota_exceeded'
        ? 'rate_limited'
        : error.name === 'invalid_from_address'
          ? 'invalid_from'
          : error.name === 'validation_error'
            ? 'validation'
            : 'unknown'
    return { ok: false, reason }
  }

  // WR-02 fix: defensive guard against the impossible-but-not-prevented
  // { data: null, error: null } SDK response (a future SDK regression, an
  // unexpected 200 with empty body, or a proxy mangling the response). Without
  // this guard, the non-null assertion would throw TypeError at runtime and
  // bubble to the cron orchestrator. Phase 6 is the core-value loop, so the
  // defensive guard has high ROI.
  if (!data || typeof data.id !== 'string') {
    console.error('resend: send_returned_no_data', {
      productUrl: input.product.url,
    })
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true, messageId: data.id }
}
