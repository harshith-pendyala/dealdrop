import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type Product = Tables<'products'>

export async function getUserProducts(): Promise<Product[]> {
  const supabase = await createClient()
  // RLS policy products_select_own enforces user_id = auth.uid() — no manual .eq needed.
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getUserProducts: select failed', { err: error })
    return []  // fail-open to empty grid rather than crash the dashboard
  }
  return data ?? []
}
