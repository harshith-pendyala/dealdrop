'use client'

import { useAuthModal } from './AuthModalProvider'
import { Button } from '@/components/ui/button'

export function SignInButton() {
  const { openAuthModal } = useAuthModal()

  return (
    <Button variant="default" size="default" onClick={openAuthModal}>
      Sign in
    </Button>
  )
}
