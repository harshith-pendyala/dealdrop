import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
//
// File: dealdrop/src/lib/cron/auth.ts
// CRON-02: constant-time Bearer-token verification for /api/cron/check-prices POST.
// Uses node:crypto timingSafeEqual — the standard Node way to avoid timing-attack
// oracles on secret comparisons. Length-checks before the compare because
// timingSafeEqual throws RangeError on length mismatch.

import { timingSafeEqual } from 'node:crypto'

export function verifyCronBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice(7) // strip literal "Bearer "
  const providedBuf = Buffer.from(provided)
  const secretBuf = Buffer.from(secret)
  // Length-check first: timingSafeEqual RangeError's on mismatched lengths.
  // This SHORT-CIRCUITS on length, which is a minor side-channel (attacker learns
  // expected length). Acceptable because CRON_SECRET length is Zod-validated at
  // build time (>= 32 chars) — knowing the length does not materially help.
  if (providedBuf.length !== secretBuf.length) return false
  return timingSafeEqual(providedBuf, secretBuf)
}
