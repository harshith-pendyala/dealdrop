import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header/Header'
import { Hero } from '@/components/hero/Hero'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex flex-col min-h-full">
      <Header user={user} />
      {user ? <DashboardShell user={user} /> : <Hero />}
    </main>
  )
}
