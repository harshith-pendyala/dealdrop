// File: dealdrop/src/lib/resend.test.ts
// Wave 1 (Plan 06-02): GREEN tests for @/lib/resend.
// Covers: EMAIL-02 (Resend SDK wire-up), EMAIL-03 (template fields + percent math),
//         EMAIL-06 (log-but-don't-abort), T-6-04 (structured log payload),
//         T-6-06 (HTML-injection escape).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  // NOTE: env.server.ts validates RESEND_FROM_EMAIL with z.string().email() — the
  // "Name <email@domain>" mailbox format does NOT pass Zod v4 email regex. Plan 01's
  // stub used 'DealDrop <alerts@example.com>' but never exercised env validation
  // because the module never loaded (RED-state it.todo only). Now that Plan 02 loads
  // @/lib/resend, we must use a bare RFC-5321 address. Matches firecrawl test's
  // 'test@example.com' pattern. Production can still use mailbox format via Resend's
  // own `from` parameter at send-time — env.server.ts is narrower than Resend's wire
  // format. Deviation Rule 3 (Blocking) — documented in 06-02-SUMMARY.md.
  vi.stubEnv('RESEND_FROM_EMAIL', 'alerts@example.com')
  vi.stubEnv('CRON_SECRET', 'a'.repeat(48))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
})
afterAll(() => { vi.unstubAllEnvs() })

// Mock the Resend SDK — named export `Resend`.
const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}))

type ResendMod = typeof import('@/lib/resend')
let mod: ResendMod
beforeAll(async () => {
  mod = await import('@/lib/resend')
})

let errSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  sendMock.mockReset()
})
afterEach(() => { errSpy.mockRestore() })

describe('escapeHtml', () => {
  it('escapes < > & " \' correctly', () => {
    expect(mod.escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(mod.escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s')
  })
})

describe('computePercentDrop', () => {
  it('rounds to whole integer via Math.round', () => {
    expect(mod.computePercentDrop(100, 80)).toBe(20)
    expect(mod.computePercentDrop(100, 100)).toBe(0)
    expect(mod.computePercentDrop(100, 99.99)).toBe(0) // 0.01% rounds to 0
    expect(mod.computePercentDrop(9.99, 8.99)).toBe(10) // 10.01% rounds to 10
    expect(mod.computePercentDrop(50, 25)).toBe(50)
  })
})

describe('formatCurrency', () => {
  it('formats known ISO 4217 codes via Intl.NumberFormat', () => {
    expect(mod.formatCurrency(42.5, 'USD')).toMatch(/\$42\.50/)
    expect(mod.formatCurrency(1234, 'EUR')).toMatch(/€1,234/)
  })
  it('falls back to "N.NN CODE" when Intl rejects the code', () => {
    // Force RangeError with a non-ISO code. Intl throws for 2-letter codes.
    expect(mod.formatCurrency(42, 'ZZ')).toBe('42.00 ZZ')
  })
})

describe('renderPriceDropEmailHtml (EMAIL-03, D-05, D-06, D-07)', () => {
  const baseInput: Parameters<typeof mod.renderPriceDropEmailHtml>[0] = {
    to: 'user@example.com',
    product: {
      name: 'Cool Headphones',
      url: 'https://shop.example.com/headphones',
      image_url: 'https://cdn.example.com/img.jpg',
      currency: 'USD',
    },
    oldPrice: 100,
    newPrice: 82,
    percentDrop: 18,
  }

  it('contains the image tag when image_url is present', () => {
    const html = mod.renderPriceDropEmailHtml(baseInput)
    expect(html).toContain('<img src="https://cdn.example.com/img.jpg"')
    expect(html).toContain('width="300"')
  })

  it('omits the image tag when image_url is null', () => {
    const html = mod.renderPriceDropEmailHtml({
      ...baseInput,
      product: { ...baseInput.product, image_url: null },
    })
    expect(html).not.toContain('<img')
  })

  it('escapes HTML special chars in product.name (T-6-06)', () => {
    const html = mod.renderPriceDropEmailHtml({
      ...baseInput,
      product: { ...baseInput.product, name: '<script>alert("x")</script>' },
    })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('renders the CTA link with href=product.url, target=_blank, rel=noopener noreferrer', () => {
    const html = mod.renderPriceDropEmailHtml(baseInput)
    expect(html).toMatch(/<a\s+href="https:\/\/shop\.example\.com\/headphones"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
  })

  it('renders old price with strikethrough and formatted new price prominently', () => {
    const html = mod.renderPriceDropEmailHtml(baseInput)
    expect(html).toContain('<s style="color:#a1a1aa;">')
    expect(html).toMatch(/\$100\.00/)
    expect(html).toMatch(/\$82\.00/)
  })

  it('renders the percent-drop hero with − (minus) prefix', () => {
    const html = mod.renderPriceDropEmailHtml(baseInput)
    expect(html).toContain('&minus;18%')
  })

  it('falls back to "N.NN CODE" format when currency code is invalid', () => {
    const html = mod.renderPriceDropEmailHtml({
      ...baseInput,
      product: { ...baseInput.product, currency: 'ZZ' },
    })
    expect(html).toContain('100.00 ZZ')
    expect(html).toContain('82.00 ZZ')
  })
})

describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', () => {
  const baseInput: Parameters<typeof mod.sendPriceDropAlert>[0] = {
    to: 'user@example.com',
    product: {
      name: 'Cool Headphones',
      url: 'https://shop.example.com/headphones',
      image_url: 'https://cdn.example.com/img.jpg',
      currency: 'USD',
    },
    oldPrice: 100,
    newPrice: 82,
  }

  it('calls resend.emails.send with { from, to, subject, html } on happy path', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'msg_123' }, error: null })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: true, messageId: 'msg_123' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const sendArgs = sendMock.mock.calls[0][0]
    // Must match the env stub above (bare address; env.server.ts z.email()).
    expect(sendArgs.from).toBe('alerts@example.com')
    expect(sendArgs.to).toBe('user@example.com')
    expect(sendArgs.subject).toBe('Price drop: Cool Headphones -18%')
    expect(typeof sendArgs.html).toBe('string')
    expect(sendArgs.html.length).toBeGreaterThan(100)
  })

  it('returns { ok: false, reason: "rate_limited" } on rate_limit_exceeded', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'Too many' },
    })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: false, reason: 'rate_limited' })
    expect(errSpy).toHaveBeenCalledWith('resend: send_failed', {
      productUrl: 'https://shop.example.com/headphones',
      errorName: 'rate_limit_exceeded',
      errorMessage: 'Too many',
    })
  })

  it('returns { ok: false, reason: "rate_limited" } on monthly_quota_exceeded', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'monthly_quota_exceeded', message: 'Over cap' },
    })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('returns { ok: false, reason: "invalid_from" } on invalid_from_address', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'invalid_from_address', message: 'Not verified' },
    })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: false, reason: 'invalid_from' })
  })

  it('returns { ok: false, reason: "validation" } on validation_error', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'validation_error', message: 'Bad payload' },
    })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: false, reason: 'validation' })
  })

  it('returns { ok: false, reason: "unknown" } on unrecognized error name', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'random_future_error', message: 'huh' },
    })
    const res = await mod.sendPriceDropAlert(baseInput)
    expect(res).toEqual({ ok: false, reason: 'unknown' })
  })

  it('structured-logs on every failure branch (no template literals; T-6-04)', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'authentication_error', message: 'Bad key' },
    })
    await mod.sendPriceDropAlert(baseInput)
    // Verify console.error called with (string, object) — NOT interpolated string.
    expect(errSpy).toHaveBeenCalled()
    const callArgs = errSpy.mock.calls[0]
    expect(callArgs[0]).toBe('resend: send_failed')
    expect(typeof callArgs[1]).toBe('object')
  })

  it('never throws for API errors — always returns a SendResult', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'authentication_error', message: 'Bad key' },
    })
    await expect(mod.sendPriceDropAlert(baseInput)).resolves.toBeDefined()
  })

  describe('with RESEND_TEST_RECIPIENT override (EMAIL-02, EMAIL-03)', () => {
    // env is parsed once at module load — vi.stubEnv after import won't affect
    // env.RESEND_TEST_RECIPIENT inside @/lib/resend. We mock @/lib/env.server,
    // reset modules, and dynamically re-import resend so it captures the
    // mocked env. Restored after each test by vi.unmock + resetModules.
    afterEach(() => {
      vi.doUnmock('@/lib/env.server')
      vi.resetModules()
    })

    it('routes to env.RESEND_TEST_RECIPIENT when override is set, ignoring input.to', async () => {
      vi.doMock('@/lib/env.server', () => ({
        env: {
          FIRECRAWL_API_KEY: 'test-key-fc-AAAAAAAAAAAAAAAA',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
          RESEND_API_KEY: 'test-resend-key',
          RESEND_FROM_EMAIL: 'alerts@example.com',
          CRON_SECRET: 'a'.repeat(48),
          RESEND_TEST_RECIPIENT: 'demo@example.com',
        },
      }))
      vi.resetModules()
      const overrideMod = await import('@/lib/resend')
      sendMock.mockResolvedValueOnce({ data: { id: 'msg_456' }, error: null })
      const res = await overrideMod.sendPriceDropAlert(baseInput) // baseInput.to = 'user@example.com'
      expect(res).toEqual({ ok: true, messageId: 'msg_456' })
      expect(sendMock).toHaveBeenCalledTimes(1)
      const sendArgs = sendMock.mock.calls[0][0]
      expect(sendArgs.to).toBe('demo@example.com')        // override wins (EMAIL-02)
      expect(sendArgs.from).toBe('alerts@example.com')    // unchanged (EMAIL-01)
      expect(sendArgs.subject).toBe('Price drop: Cool Headphones -18%')
    })

    it('falls back to input.to when override is unset (production code path — EMAIL-03)', async () => {
      vi.doMock('@/lib/env.server', () => ({
        env: {
          FIRECRAWL_API_KEY: 'test-key-fc-AAAAAAAAAAAAAAAA',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
          RESEND_API_KEY: 'test-resend-key',
          RESEND_FROM_EMAIL: 'alerts@example.com',
          CRON_SECRET: 'a'.repeat(48),
          RESEND_TEST_RECIPIENT: undefined, // emptyStringAsUndefined → undefined
        },
      }))
      vi.resetModules()
      const overrideMod = await import('@/lib/resend')
      sendMock.mockResolvedValueOnce({ data: { id: 'msg_789' }, error: null })
      const res = await overrideMod.sendPriceDropAlert(baseInput) // baseInput.to = 'user@example.com'
      expect(res).toEqual({ ok: true, messageId: 'msg_789' })
      const sendArgs = sendMock.mock.calls[0][0]
      expect(sendArgs.to).toBe('user@example.com')        // user-of-record (EMAIL-03)
    })
  })
})

describe('env.server.ts RESEND_TEST_RECIPIENT validation (EMAIL-04, D-05, D-06)', () => {
  afterEach(() => {
    // Restore override to empty + clear module cache so subsequent describes
    // (and other test files) see a fresh, valid env on next import.
    vi.stubEnv('RESEND_TEST_RECIPIENT', '')
    vi.resetModules()
  })

  it('rejects malformed RESEND_TEST_RECIPIENT (not an email) — fail-fast at boot', async () => {
    vi.stubEnv('RESEND_TEST_RECIPIENT', 'not-an-email')
    vi.resetModules() // force re-parse with the new stubbed value
    await expect(import('@/lib/env.server')).rejects.toThrow()
  })

  it('rejects mailbox-format RESEND_TEST_RECIPIENT (Zod v4 .email() — D-06)', async () => {
    // Mirrors the RESEND_FROM_EMAIL strictness comment at resend.test.ts:12-19.
    // The mailbox format "Name <addr@host>" does NOT pass Zod v4's .email() regex.
    vi.stubEnv('RESEND_TEST_RECIPIENT', 'Demo <demo@example.com>')
    vi.resetModules()
    await expect(import('@/lib/env.server')).rejects.toThrow()
  })
})
