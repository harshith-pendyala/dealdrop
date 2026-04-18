// TEMPORARY — delete after Phase 1 gate (Task 7 of 01-04-PLAN.md)
import { createClient as createServerSbClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function Debug() {
  const server = await createServerSbClient()
  const admin = createAdminClient()

  const { count: serverCount } = await server
    .from('products')
    .select('*', { count: 'exact', head: true })

  const { count: adminCount } = await admin
    .from('products')
    .select('*', { count: 'exact', head: true })

  return <pre>{JSON.stringify({ serverCount, adminCount }, null, 2)}</pre>
}
