# Phase 3: Firecrawl Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 03-firecrawl-integration
**Areas discussed:** Failure taxonomy & error UX, URL validation strictness

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Failure taxonomy & error UX | Specific typed failures vs generic single failure; downstream consumers need to know what to show | ✓ |
| URL validation strictness | Strict (http/https only, block private IPs, allowlist?) vs lenient | ✓ |
| Currency handling | ISO 4217 only vs best-effort symbol-to-code mapping | |
| Retry/timeout policy | Timeout duration, retry count, backoff | |

---

## Failure taxonomy & error UX

### Q1 — Return shape

| Option | Description | Selected |
|--------|-------------|----------|
| Discriminated union | `{ ok: true, data } \| { ok: false, reason }` — type system prevents silent misuse | ✓ |
| Throw on failure | Typed Error subclass; caller wraps in try/catch | |
| Result tuple | Go-style `[data, null] \| [null, error]` | |

**User's choice:** Discriminated union (recommended)

### Q2 — Failure granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Specific kinds | `invalid_url \| network_error \| scrape_timeout \| missing_price \| missing_name \| invalid_currency \| unknown` | ✓ |
| Two kinds | `user_error` vs `scrape_error` | |
| One generic kind | Single `scrape_failed` with free-text detail | |

**User's choice:** Specific kinds (recommended)

### Q3 — Toast copy strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Per-reason tailored copy | Phase 4 owns a reason→copy map (e.g. missing_price → "We couldn't find a price on that page") | ✓ |
| One friendly generic | Single toast regardless of reason | |
| Two categories | Check-your-URL vs something-went-wrong | |

**User's choice:** Per-reason tailored (recommended)

### Q4 — Logging vs return payload

| Option | Description | Selected |
|--------|-------------|----------|
| Log detail server-side, return reason only | console.error full response; return only `{ ok: false, reason }` — no `detail` field in production return | ✓ |
| Also return sanitized detail | Return `{ ok: false, reason, detail }` | |
| Minimal logging | Log reason only; don't log raw responses | |

**User's choice:** Log detail, return reason only (recommended)

---

## URL validation strictness

### Q1 — URL shape validation

| Option | Description | Selected |
|--------|-------------|----------|
| Zod url + http/https only | `z.string().url()` + protocol check; rejects ftp/file/javascript | ✓ |
| Also block localhost/private IPs | Defense-in-depth vs SSRF | |
| Strict allowlist | Only known e-commerce domains | |

**User's choice:** Zod url + http/https only (recommended). Rationale: Firecrawl runs in their infra so SSRF surface is theirs; allowlist breaks the "any URL" core value.

### Q2 — URL normalization

| Option | Description | Selected |
|--------|-------------|----------|
| Light normalization | Lowercase scheme+host, strip trailing slash, strip utm_*/fbclid/gclid | ✓ |
| No normalization | Store raw | |
| Aggressive canonicalization | Follow 301/302 redirects | |

**User's choice:** Light normalization (recommended)

### Q3 — Validation location

| Option | Description | Selected |
|--------|-------------|----------|
| Inside scrapeProduct | scrapeProduct is the gatekeeper; Phase 4 form also validates for client feedback | ✓ |
| Only in Phase 4 form | Trust the caller | |
| Separate validateUrl() export | DRY, both consumers use it | |

**User's choice:** Inside scrapeProduct (recommended). Defense in depth + Phase 6 cron future-proofing.

### Q4 — DB contract length cap

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce max(2048) | Matches HTTP URL caps; accommodates Amazon variant URLs (~1500 chars) | ✓ |
| No length cap | Trust text column | |
| Tighter cap (1024) | More conservative | |

**User's choice:** Enforce max 2048 (recommended)

---

## Unselected areas — Claude's Discretion

User opted for Claude's discretion on the remaining gray areas. Planner defaults:

### Currency handling
- Accept ISO 4217 alpha-3 codes from Firecrawl (`USD`, `EUR`, `INR`, `GBP`, `JPY`, …)
- Reject symbols (`$`, `€`, `₹`) and non-standard codes → return `{ ok: false, reason: 'invalid_currency' }`
- Rationale: Firecrawl's JSON-schema extraction can be prompted to prefer ISO codes; symbol mapping has edge cases (`$` could mean USD/CAD/AUD/MXN).

### Retry/timeout policy
- 60s Firecrawl timeout
- 1 retry on transient 5xx or network errors with 2s exponential backoff (2s, then give up)
- No retry on 4xx (Firecrawl won't change its mind on client errors)
- Timeouts map to `scrape_timeout`; network errors to `network_error`

---

## Deferred Ideas

- Scrape-result caching (Phase 7 polish candidate if Firecrawl cost becomes a concern)
- Aggressive URL canonicalization (redirect-following)
- Domain allowlist (rejected — breaks "any URL" core value)
- Retry-with-different-scrape-mode fallback (e.g., JSON schema fails → retry with markdown)
