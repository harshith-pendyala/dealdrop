// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Phase 2 will: create Supabase client bound to request/response cookies,
  // call supabase.auth.getClaims() to refresh the session, and propagate
  // Set-Cookie headers to the response.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
}
