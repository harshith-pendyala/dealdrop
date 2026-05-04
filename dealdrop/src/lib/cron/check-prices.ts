import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// File: dealdrop/src/lib/cron/check-prices.ts
// Phase 6 cron orchestrator — iterates all tracked products, re-scrapes each
// under a concurrency cap, writes price_history + updates products on change,
// emails product owners on price drops.
//
// Implements D-01 through D-08 (CONTEXT.md):
//   D-01/D-02: price-change gate against products.current_price is the entire
//              idempotency story. No cron_runs audit table; no ?force=1.
//   D-03:      on scrape failure, UPDATE products.last_scrape_failed_at = now().
//              No price_history insert; no current_price mutation.
//   D-04:      on price change, INSERT price_history THEN UPDATE products with
//              (current_price, updated_at, last_scrape_failed_at=null). Two
//              sequential admin-client calls; divergence on failure is logged.
//              On unchanged-price + previously-failing: conditional UPDATE
//              clears last_scrape_failed_at to NULL.
//   D-05..D-07: email template is owned by @/lib/resend; this module only
//               constructs the PriceDropInput payload.
//   D-08:      one email per drop per cron run (no digest grouping).
//
// Anti-pattern reminder (RESEARCH.md §Anti-Patterns):
//   - Do NOT add a server-action directive here — this is a Route Handler helper.
//   - NO Promise.all — use Promise.allSettled so one rejection doesn't cancel batch.
//   - NO template-literal console.error — structured object payloads only.

import pLimit from 'p-limit'
// NOTE: p-limit@3.x is CJS with a DEFAULT export. `import { pLimit }` does not
// work (RESEARCH.md §Pitfall 9).
import type { SupabaseClient } from '@supabase/supabase-js'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import type { ScrapeFailureReason } from '@/lib/firecrawl/types'
import { sendPriceDropAlert } from '@/lib/resend'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Subset of the products row this module reads/writes. Matches the generated
// Database['public']['Tables']['products']['Row'] shape — kept as a local type
// to decouple this module from the exact generated-types path.
type ProductRow = {
  id: string
  user_id: string
  url: string
  name: string
  current_price: number
  currency: string
  image_url: string | null
  last_scrape_failed_at: string | null
  mrp: number | null
  created_at: string
  updated_at: string
}

export type ProductResult =
  | { kind: 'drop'; productId: string; oldPrice: number; newPrice: number; emailOk: boolean }
  | { kind: 'update'; productId: string; newPrice: number }
  | { kind: 'unchanged'; productId: string }
  | { kind: 'scrape_failed'; productId: string; reason: ScrapeFailureReason }

export type CronSummary = {
  status: 'ok'
  scraped: number
  updated: number
  dropped: number
  failed: { product_id: string; reason: ScrapeFailureReason }[]
}

// ---------------------------------------------------------------------------
// Per-product worker — NEVER throws; returns a discriminated ProductResult.
// Matches the Phase 3 scrape-product.ts "no throws, always return discriminated"
// contract (Pattern SP-6 in 06-PATTERNS.md).
// ---------------------------------------------------------------------------

async function processOneProduct(
  admin: SupabaseClient,
  product: ProductRow
): Promise<ProductResult> {
  const result = await scrapeProduct(product.url)

  // --- Scrape failure branch (D-03, CRON-09) ---
  if (!result.ok) {
    const { error: updErr } = await admin
      .from('products')
      .update({ last_scrape_failed_at: new Date().toISOString() })
      .eq('id', product.id)
    if (updErr) {
      console.error('cron: last_scrape_failed_at_update_failed', {
        productId: product.id,
        err: updErr,
      })
    }
    console.error('cron: scrape_failed', {
      productId: product.id,
      reason: result.reason,
    })
    return { kind: 'scrape_failed', productId: product.id, reason: result.reason }
  }

  const scraped = result.data

  // --- Currency-change guard (Pattern 8 + CONTEXT Claude's Discretion) ---
  // Different currency = non-comparable price. Log, skip insert+email, treat as unchanged.
  if (scraped.currency_code !== product.currency) {
    console.warn('cron: currency_changed', {
      productId: product.id,
      oldCurrency: product.currency,
      scrapedCurrency: scraped.currency_code,
    })
    return { kind: 'unchanged', productId: product.id }
  }

  // --- Price-change gate (D-01, D-02, CRON-08 idempotency) ---
  // Compare against products.current_price (single-column read, authoritative cache).
  if (scraped.current_price === product.current_price) {
    // Healthy-but-unchanged. If this product was previously flagged failing,
    // clear the flag so DASH-08 badge honestly reflects "not currently failing".
    // Cycle-5: also opportunistically refresh mrp if the scraper found one
    // (or a different one than what's stored). MRP rarely changes, but if a
    // retailer adjusts it the dashboard should pick it up next cron.
    if (
      product.last_scrape_failed_at !== null ||
      scraped.mrp !== product.mrp
    ) {
      const { error: clearErr } = await admin
        .from('products')
        .update({
          last_scrape_failed_at: null,
          updated_at: new Date().toISOString(),
          mrp: scraped.mrp,
        })
        .eq('id', product.id)
      if (clearErr) {
        console.error('cron: clear_failed_flag_failed', {
          productId: product.id,
          err: clearErr,
        })
      }
    }
    return { kind: 'unchanged', productId: product.id }
  }

  // --- Price CHANGED — two-step atomic(ish) write (D-04) ---
  const nowIso = new Date().toISOString()

  // Step 1: INSERT price_history row.
  // Cycle-5: price_history schema unchanged — only current_price gets recorded
  // per cron tick. MRP lives on the product row (rarely changes).
  const { error: histErr } = await admin.from('price_history').insert({
    product_id: product.id,
    price: scraped.current_price,
    currency: scraped.currency_code,   // column rename: scraped.currency_code → DB.currency
    checked_at: nowIso,
  })
  if (histErr) {
    console.error('cron: price_history_insert_failed', {
      productId: product.id,
      err: histErr,
    })
    // Fail-closed: don't attempt the UPDATE — the next cron reconciles.
    return { kind: 'unchanged', productId: product.id }
  }

  // Step 2: UPDATE products (current_price, updated_at, last_scrape_failed_at=null, mrp).
  const { error: updErr } = await admin
    .from('products')
    .update({
      current_price: scraped.current_price,
      updated_at: nowIso,
      last_scrape_failed_at: null,
      mrp: scraped.mrp,
    })
    .eq('id', product.id)
  if (updErr) {
    // Pitfall 5 divergence: price_history committed, products.current_price stale.
    // Log and continue — next successful cron reconciles.
    console.error('cron: products_update_failed_after_history_insert', {
      productId: product.id,
      err: updErr,
      insertedPrice: scraped.current_price,
    })
    // Do NOT return early — still try to email if this was a drop.
  }

  // --- Email branch (EMAIL-01, EMAIL-05, EMAIL-06) — only for genuine drops ---
  if (scraped.current_price < product.current_price) {
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
      product.user_id
    )
    if (userErr || !userData?.user?.email) {
      console.error('cron: recipient_email_missing', {
        productId: product.id,
        userId: product.user_id,
      })
      return {
        kind: 'drop',
        productId: product.id,
        oldPrice: product.current_price,
        newPrice: scraped.current_price,
        emailOk: false,
      }
    }

    // WR-01 fix: Resend SDK contract is "never throws for API errors", but the
    // SDK can still throw on lower-level network failures (DNS, TLS, socket
    // reset). Without this try/catch, such a throw would propagate to
    // Promise.allSettled in runPriceCheck and produce a 'failed/unknown'
    // summary entry — even though price_history was already INSERTed and
    // products.current_price was already UPDATEd. Convert any throw into a
    // truthful { kind: 'drop', emailOk: false } outcome.
    let emailOk = false
    try {
      const sendResult = await sendPriceDropAlert({
        to: userData.user.email,
        product: {
          name: product.name,
          url: product.url,
          image_url: product.image_url,
          currency: product.currency,
        },
        oldPrice: product.current_price,
        newPrice: scraped.current_price,
      })
      // EMAIL-06: log but don't abort. sendPriceDropAlert already logged the
      // 'resend: send_failed' structured entry on its failure branch.
      emailOk = sendResult.ok
    } catch (err) {
      console.error('cron: resend_threw', {
        productId: product.id,
        err,
      })
      emailOk = false
    }
    return {
      kind: 'drop',
      productId: product.id,
      oldPrice: product.current_price,
      newPrice: scraped.current_price,
      emailOk,
    }
  }

  // Price INCREASED — still recorded the history row + updated current_price,
  // but no email (EMAIL-01 gate requires new < old).
  return {
    kind: 'update',
    productId: product.id,
    newPrice: scraped.current_price,
  }
}

// ---------------------------------------------------------------------------
// Public API — the Route Handler's POST calls this with an admin client.
// ---------------------------------------------------------------------------

export async function runPriceCheck(admin: SupabaseClient): Promise<CronSummary> {
  // CRON-03: admin client bypasses RLS; cron is a privileged background worker.
  const { data: products, error } = await admin
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('cron: products_select_failed', { err: error })
    return { status: 'ok', scraped: 0, updated: 0, dropped: 0, failed: [] }
  }

  const rows = (products ?? []) as ProductRow[]

  // CRON-04: bounded concurrency via p-limit — cap at 3 simultaneous scrapes.
  // Matches PITFALLS.md §"Concurrent fan-out exhausts Firecrawl credits".
  const limit = pLimit(3)

  // Promise.allSettled so a single rejection doesn't cancel the batch. Per-product
  // worker is designed to never throw (always returns ProductResult), but this is
  // belt-and-suspenders.
  const settled = await Promise.allSettled(
    rows.map((product) => limit(() => processOneProduct(admin, product)))
  )

  // Aggregate summary.
  const summary: CronSummary = {
    status: 'ok',
    scraped: rows.length,
    updated: 0,
    dropped: 0,
    failed: [],
  }

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i]
    const product = rows[i]
    if (outcome.status === 'rejected') {
      // Should not happen given no-throw worker contract, but cover it.
      console.error('cron: worker_unexpected_throw', {
        productId: product.id,
        err: outcome.reason,
      })
      summary.failed.push({ product_id: product.id, reason: 'unknown' })
      continue
    }
    const r = outcome.value
    switch (r.kind) {
      case 'drop':
      case 'update':
        summary.updated += 1
        if (r.kind === 'drop') summary.dropped += 1
        break
      case 'scrape_failed':
        summary.failed.push({ product_id: r.productId, reason: r.reason })
        break
      case 'unchanged':
        // no-op for summary counters
        break
    }
  }

  return summary
}
