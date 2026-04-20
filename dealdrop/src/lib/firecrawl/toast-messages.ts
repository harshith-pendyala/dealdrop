// NO `import 'server-only'` -- this file MUST be importable from Client Components.
// Maps every Phase-3 ScrapeFailureReason + the Phase-4 reason codes to a user-facing
// toast string. Exhaustive over ScrapeFailureReason union with {'duplicate_url',
// 'unauthenticated', 'db_error'}.
import type { ScrapeFailureReason } from '@/lib/firecrawl/types'

export type ToastableReason =
  | ScrapeFailureReason
  | 'duplicate_url'
  | 'unauthenticated'
  | 'db_error'

export function toastMessageForReason(reason: ToastableReason): string {
  switch (reason) {
    case 'invalid_url':       return "That URL doesn't look right. Check for typos."
    case 'network_error':     return "Couldn't reach that site \u2014 try again in a moment."
    case 'scrape_timeout':    return 'That page took too long to load. Try a different URL.'
    case 'missing_price':     return "We couldn't find a price on that page."
    case 'missing_name':      return "We couldn't find a product name on that page."
    case 'invalid_currency':  return "That page's currency format isn't supported yet."
    case 'duplicate_url':     return "You're already tracking this product."
    case 'unauthenticated':   return 'Please sign in and try again.'
    case 'db_error':          return 'Something went wrong saving that. Try again later.'
    case 'unknown':           return 'Something went wrong. Try again later.'
    default: {
      const _exhaustive: never = reason
      void _exhaustive
      return 'Something went wrong. Try again later.'
    }
  }
}
