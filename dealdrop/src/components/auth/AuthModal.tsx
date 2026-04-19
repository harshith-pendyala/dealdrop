'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { useAuthModal } from './AuthModalProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function AuthModal() {
  const { isOpen, setOpen } = useAuthModal()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGoogleSignIn() {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error('Could not start Google sign-in. Please try again.')
      setIsLoading(false)
    }
    // On success the browser is navigating away; leave isLoading=true so the
    // button stays disabled during the redirect.
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to DealDrop</DialogTitle>
          <DialogDescription>
            Sign in to start tracking prices
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
