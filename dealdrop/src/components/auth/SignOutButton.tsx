'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/actions/auth'

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false)

  async function handleSignOut() {
    setIsPending(true)
    await signOut()
  }

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
