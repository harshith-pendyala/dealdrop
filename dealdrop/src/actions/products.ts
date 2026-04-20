'use server'
import 'server-only'
// W1 fix: `'use server'` must be line 1 (directive rules). `import 'server-only'`
// on line 2 is a bundle-time guard that throws if this module is ever included
// in a client bundle. Defense-in-depth alongside the `'use server'` directive.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { scrapeProduct } from '@/lib/firecrawl/scrape-product'
import { normalizeUrl } from '@/lib/firecrawl/url'
import type { ScrapeFailureReason } from '@/lib/firecrawl/types'

export type AddProductResult =
  | { ok: true }
  | { ok: false; reason: ScrapeFailureReason | 'duplicate_url' | 'unauthenticated' | 'db_error' }

export async function addProduct(
  _prevState: AddProductResult | null,
  formData: FormData,
): Promise<AddProductResult> {
  const rawUrl = String(formData.get('url') ?? '')

  const supabase = await createClient()
  // Auth re-check inside every Server Action (Pitfall 2; Next.js 16 data-security.md).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthenticated' }

  // scrapeProduct re-validates + normalizes URL internally (D-07 defense-in-depth).
  const result = await scrapeProduct(rawUrl)
  if (!result.ok) return { ok: false, reason: result.reason }

  const normalizedUrl = normalizeUrl(rawUrl)
  // Pitfall 1: ProductData.currency_code maps to products.currency — explicit rename.
  const { data: product, error: insertProductErr } = await supabase
    .from('products')
    .insert({
      user_id: user.id,
      url: normalizedUrl,
      name: result.data.name,
      current_price: result.data.current_price,
      currency: result.data.currency_code,
      image_url: result.data.image_url,
    })
    .select('id')
    .single()

  if (insertProductErr) {
    if (insertProductErr.code === '23505') return { ok: false, reason: 'duplicate_url' }
    console.error('addProduct: products insert failed', { err: insertProductErr })
    return { ok: false, reason: 'db_error' }
  }

  const { error: insertHistoryErr } = await supabase.from('price_history').insert({
    product_id: product.id,
    price: result.data.current_price,
    currency: result.data.currency_code,
  })

  if (insertHistoryErr) {
    // Pitfall 7: best-effort rollback — RLS allows own-row delete.
    await supabase.from('products').delete().eq('id', product.id)
    console.error('addProduct: price_history insert failed; rolled back product', { err: insertHistoryErr })
    return { ok: false, reason: 'db_error' }
  }

  revalidatePath('/')
  return { ok: true }
}

export async function removeProduct(productId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase.from('products').delete().eq('id', productId)
  // RLS policy products_delete_own enforces user_id = auth.uid(); .eq('id', ...) is just selector.
  if (error) {
    console.error('removeProduct: delete failed', { productId, err: error })
    return { ok: false }
  }
  // price_history cascades via FK (DB-04 migration).
  // I-NEW-1: minimal audit log per RESEARCH.md Open Question #2 resolution.
  // Single structured log line — no separate audit table needed at portfolio bar.
  // MUST fire BEFORE revalidatePath so the log order reflects the semantic order
  // (delete → audit → revalidate).
  console.log({ action: 'removeProduct', productId, userId: user.id })
  revalidatePath('/')
  return { ok: true }
}
