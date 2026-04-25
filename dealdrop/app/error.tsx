'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Digest only — Next.js 16 strips error.message in production for SC errors,
    // and CONTEXT.md D-02 forbids any UI reveal of stack/message (V7 ASVS).
    console.error('app/error.tsx caught:', { digest: error.digest })
  }, [error])

  return (
    <main className="flex flex-col min-h-full items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col gap-4 py-8 text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We hit a snag rendering this page. Try again, or head back home.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
