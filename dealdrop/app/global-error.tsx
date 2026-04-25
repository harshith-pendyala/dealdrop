'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

// No Shadcn imports here on purpose. If app/layout.tsx is the thing that
// crashed, the CSS variables Card/Button rely on may not be present.
// Inline styles approximate Shadcn new-york/zinc dark theme so the fallback
// still reads as DealDrop.
//
// metadata / generateMetadata exports are NOT supported in this file per
// Next.js 16 docs.

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('app/global-error.tsx caught:', { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#0a0a0a',
          color: '#fafafa',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            border: '1px solid #262626',
            borderRadius: '0.75rem',
            padding: '2rem',
            background: '#171717',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#a3a3a3', margin: '0 0 1.25rem 0' }}>
            DealDrop ran into an unexpected problem. Try again, or refresh the page.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '0',
              background: '#fafafa',
              color: '#0a0a0a',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
