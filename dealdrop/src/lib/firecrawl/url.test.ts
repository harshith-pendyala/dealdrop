import { describe, it, expect } from 'vitest'
import { validateUrl, normalizeUrl } from './url'

describe('validateUrl', () => {
  it('accepts https URL', () => {
    expect(validateUrl('https://www.amazon.com/dp/B0XYZ')).toEqual({
      ok: true,
      url: 'https://www.amazon.com/dp/B0XYZ',
    })
  })

  it('rejects empty string', () => {
    expect(validateUrl('')).toEqual({ ok: false })
  })

  it('invalid_url non-http: ftp', () => {
    expect(validateUrl('ftp://example.com')).toEqual({ ok: false })
  })

  it('invalid_url javascript', () => {
    expect(validateUrl('javascript:alert(1)')).toEqual({ ok: false })
  })

  it('invalid_url file scheme', () => {
    expect(validateUrl('file:///etc/passwd')).toEqual({ ok: false })
  })

  it('invalid_url too long (> 2048)', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2050)
    expect(validateUrl(longUrl)).toEqual({ ok: false })
  })

  it('invalid_url malformed', () => {
    expect(validateUrl('not a url')).toEqual({ ok: false })
  })
})

describe('normalizeUrl', () => {
  it('normalize lowercase + trailing slash', () => {
    expect(normalizeUrl('HTTPS://Example.COM/X/')).toBe('https://example.com/X')
  })

  it('preserves root slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('normalize tracking vs variant', () => {
    expect(
      normalizeUrl(
        'https://shop.example.com/p?sku=123&utm_source=x&gclid=y&fbclid=z',
      ),
    ).toBe('https://shop.example.com/p?sku=123')
  })

  it('preserves variant= and strips utm_campaign', () => {
    expect(
      normalizeUrl('https://shop.example.com/p?variant=red&utm_campaign=sale'),
    ).toBe('https://shop.example.com/p?variant=red')
  })

  it('is idempotent', () => {
    const input = 'https://shop.example.com/p?sku=123'
    const first = normalizeUrl(input)
    expect(normalizeUrl(first)).toBe(first)
  })
})
