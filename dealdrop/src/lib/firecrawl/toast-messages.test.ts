import { describe, it, expect } from 'vitest'
import {
  toastMessageForReason,
  type ToastableReason,
} from './toast-messages'

describe('toastMessageForReason', () => {
  const cases: Array<[ToastableReason, string]> = [
    ['invalid_url',      "That URL doesn't look right. Check for typos."],
    ['network_error',    "Couldn't reach that site \u2014 try again in a moment."],
    ['scrape_timeout',   'That page took too long to load. Try a different URL.'],
    ['missing_price',    "We couldn't find a price on that page."],
    ['missing_name',     "We couldn't find a product name on that page."],
    ['invalid_currency', "That page's currency format isn't supported yet."],
    ['duplicate_url',    "You're already tracking this product."],
    ['unauthenticated',  'Please sign in and try again.'],
    ['db_error',         'Something went wrong saving that. Try again later.'],
    ['unknown',          'Something went wrong. Try again later.'],
  ]

  for (const [reason, expected] of cases) {
    it(`${reason} -> ${JSON.stringify(expected)}`, () => {
      expect(toastMessageForReason(reason)).toBe(expected)
    })
  }

  it('returns a non-empty string for every case', () => {
    for (const [reason] of cases) {
      expect(toastMessageForReason(reason).length).toBeGreaterThan(0)
    }
  })
})
