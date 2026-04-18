import type { User } from '@supabase/supabase-js'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'

type HeaderProps = Readonly<{
  user: User | null
}>

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        <span className="text-sm font-medium tracking-tight">DealDrop</span>
        {user ? <SignOutButton /> : <SignInButton />}
      </div>
    </header>
  )
}
