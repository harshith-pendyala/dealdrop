// File: dealdrop/src/lib/resend.test.ts
// Wave 0 skeleton — RED until Plan 02 implements @/lib/resend.
// Covers: EMAIL-02 (Resend SDK wire-up), EMAIL-03 (template fields + percent math).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

beforeAll(() => {
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-key-fc-AAAAAAAAAAAAAAAA')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('RESEND_FROM_EMAIL', 'DealDrop <alerts@example.com>')
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

// RED-state probe — triggers the dynamic beforeAll import so "Cannot find module
// '@/lib/resend'" surfaces as an error instead of silently skipping. Plan 02 deletes
// this block after `@/lib/resend` exists.
describe('wave-0 import probe', () => {
  it('loads @/lib/resend (flips to expected RED: module not found)', () => {
    expect(mod).toBeDefined()
  })
})

describe('renderPriceDropEmailHtml (EMAIL-03, D-05, D-06, D-07)', () => {
  it.todo('contains the product image when image_url is present')
  it.todo('omits the image tag when image_url is null')
  it.todo('escapes HTML special chars in product.name (<script>alert</script>)')
  it.todo('renders the CTA link with href=product.url, target=_blank, rel=noopener noreferrer')
  it.todo('renders old price with strikethrough and new price prominently')
  it.todo('renders the percent-drop hero number with − prefix (e.g. −18%)')
  it.todo('rounds percent drop to whole integer via Math.round (9.99->8.99 = 10%)')
  it.todo('falls back to "42.00 XYZ" format when Intl.NumberFormat rejects currency')
})

describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', () => {
  it.todo('calls resend.emails.send with { from, to, subject, html } on happy path')
  it.todo('returns { ok: true, messageId } when SDK returns { data: { id }, error: null }')
  it.todo('returns { ok: false, reason: "rate_limited" } on rate_limit_exceeded')
  it.todo('returns { ok: false, reason: "rate_limited" } on monthly_quota_exceeded')
  it.todo('returns { ok: false, reason: "invalid_from" } on invalid_from_address')
  it.todo('returns { ok: false, reason: "validation" } on validation_error')
  it.todo('returns { ok: false, reason: "unknown" } on unrecognized error name')
  it.todo('structured-logs on failure: console.error("resend: send_failed", { productUrl, errorName, errorMessage })')
  it.todo('never throws for API errors (Resend SDK returns { data, error } tuple)')
})

// Reference `mod` to silence unused-var lint. Real tests in Plan 02 use mod.renderPriceDropEmailHtml + mod.sendPriceDropAlert.
void mod
void expect
