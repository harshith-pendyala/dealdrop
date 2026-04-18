import type { User } from '@supabase/supabase-js'

type DashboardShellProps = Readonly<{
  user: User
}>

export function DashboardShell({ user: _user }: DashboardShellProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold leading-snug">Welcome back</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground max-w-xl">
          You&apos;re signed in. Your product tracker shows up here — adding
          products unlocks in the next update.
        </p>
      </div>
    </div>
  )
}
