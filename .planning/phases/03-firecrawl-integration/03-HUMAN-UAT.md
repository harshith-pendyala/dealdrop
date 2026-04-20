---
status: resolved
phase: 03-firecrawl-integration
source: [03-VERIFICATION.md]
started: 2026-04-20T00:00:00Z
updated: 2026-04-20T00:00:00Z
---

## Current Test

[all 3 passed]

## Tests

### 1. Real end-to-end scrape against a live Firecrawl account
expected: Calling scrapeProduct('https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html') with a real FIRECRAWL_API_KEY in dealdrop/.env.local returns `{ ok: true, data: { name: 'A Light in the Attic', current_price: 51.77, currency_code: 'GBP', image_url: '...' } }`.
result: passed — live Firecrawl returned the expected happy-path shape via temporary `app/api/uat-scrape` route.

### 2. scrape_timeout path against a slow real endpoint
expected: scrapeProduct pointed at a URL Firecrawl genuinely takes >60s to return on (or with Firecrawl's timeout parameter exceeded) returns `{ ok: false, reason: 'scrape_timeout' }` without retry, and logs `scrapeProduct: timeout` server-side. Confirms Node 20+/24 actually emits `DOMException('...', 'TimeoutError')` (not `AbortError`) per Research Pitfall 4.
result: passed — with `TIMEOUT_MS` temporarily lowered to 50ms and then reverted, fetch aborted as `TimeoutError`, returning `{ok:false, reason:'scrape_timeout'}` with a single log line and no retry.

### 3. Phase 4 consumer integration — import-surface ergonomics
expected: A Phase 4 add-product Server Action can write `import { scrapeProduct } from '@/lib/firecrawl/scrape-product'` and `import type { ScrapeResult, ScrapeFailureReason } from '@/lib/firecrawl/scrape-product'` without needing to reach into ./types, ./url, or ./schema. normalizeUrl is reachable client-side (no server-only pull-in) for paste-time dedupe.
result: passed — under project tsconfig, `scrapeProduct` + types resolve from `@/lib/firecrawl/scrape-product`; `normalizeUrl` resolves from `@/lib/firecrawl/url` (client-safe). Intentional split: not re-exporting normalizeUrl through scrape-product.ts preserves the server-only boundary.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
