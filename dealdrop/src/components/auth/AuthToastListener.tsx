'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function AuthToastListener() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('signed_out') === '1') {
      toast.success('Signed out')
      router.replace('/')
    }
    if (searchParams.get('auth_error') === '1') {
      toast.error('Sign in failed. Please try again.')
      router.replace('/')
    }
  }, [searchParams, router])

  return null
}
