import type { User } from '@supabase/supabase-js'
import { SignInButton } from '@/components/auth/SignInButton'
import { SignOutButton } from '@/components/auth/SignOutButton'
import Link from 'next/link'
import Image from 'next/image'

type HeaderProps = Readonly<{
  user: User | null
}>

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
        <Link href="/" aria-label="DealDrop home" className="inline-flex items-center">
          <Image
            src="/deal-drop-logo.png"
            alt="DealDrop"
            width={95}
            height={32}
            priority
            className="dark:invert dark:hue-rotate-180"
          />
        </Link>
        {user ? (
          <div className="flex items-center gap-3 min-w-0">
            {user.email ? (
              <span className="text-sm text-muted-foreground truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">
                Signed in as{' '}
                <span className="text-foreground font-medium">{user.email}</span>
              </span>
            ) : null}
            <SignOutButton />
          </div>
        ) : (
          <SignInButton />
        )}
      </div>
    </header>
  )
}
