import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type PricePoint = {
  price: number
  currency: string
  checked_at: string
}

export type Product = Tables<'products'> & {
  price_history: PricePoint[]
}

export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createClient()
  // RLS policy products_select_own enforces user_id = auth.uid() on the outer table.
  // DB-06 ownership-chain policy on price_history applies automatically to the nested
  // embedded resource via PostgREST — no manual equality filter on user id is needed. Per D-02.
  const { data, error } = await supabase
    .from('products')
    .select('*, price_history(price, currency, checked_at)')
    .order('created_at', { ascending: false })
    .order('checked_at', { ascending: true, referencedTable: 'price_history' })
  if (error) {
    console.error('getUserProducts: select failed', { err: error })
    return []  // fail-open to empty grid rather than crash the dashboard
  }
  return (data ?? []) as Product[]
}
