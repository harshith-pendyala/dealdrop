---
phase: 3
slug: firecrawl-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (Wave 0 installs if missing) |
| **Config file** | `dealdrop/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `cd dealdrop && npx vitest run src/lib/firecrawl` |
| **Full suite command** | `cd dealdrop && npx vitest run` |
| **Estimated runtime** | ~5 seconds (mocked fetch — no live network) |

---

## Sampling Rate

- **After every task commit:** Run `cd dealdrop && npx vitest run src/lib/firecrawl`
- **After every plan wave:** Run `cd dealdrop && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build` must succeed (proves server-only guard)
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Populated by planner. Planner MUST map each task to a requirement + test command. Placeholder below:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | — | — | Vitest installed, fixture captured | infra | `cd dealdrop && npx vitest --version` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | TRACK-03 | — | Protocol allowlist + normalization | unit | `npx vitest run src/lib/firecrawl/url.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | TRACK-04 | T-3-01, T-3-02, T-3-04 | Firecrawl v2 fetch + JSON schema | unit | `npx vitest run src/lib/firecrawl/scrape-product.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | TRACK-05 | T-3-02 | missing_price / missing_name / invalid_currency branches | unit | `npx vitest run src/lib/firecrawl/scrape-product.test.ts` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 3 | — | T-3-01 | server-only guard causes build failure on client import | integration | `npm run build` (negative test file gated) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dealdrop/vitest.config.ts` — vitest config (Node env, alias `@` → `src`)
- [ ] `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` — captured live response fixture (closes research assumptions A1, A2, A5)
- [ ] `vitest` + `@vitest/ui` devDependencies installed
- [ ] `package.json` script `"test": "vitest run"`

*Reason fixtures are captured up front: research flagged that Firecrawl may return `current_price` as string vs number (A2). A single live call before test authoring eliminates guess-and-check.*

---

## Validation Seams (Nyquist Dimension 8)

Three seams MUST be independently testable:

### Seam 1 — URL Entry Guard
**Where:** `validateUrl(raw: string)` inside scrapeProduct
**Proves:** Zod + protocol allowlist + max length + normalization work independently of Firecrawl
**Cases:**
- happy: `https://www.amazon.com/dp/B0XYZ?utm_source=x` → normalized, no tracking params
- reject: `ftp://...` → `invalid_url`
- reject: `javascript:alert(1)` → `invalid_url`
- reject: empty / malformed → `invalid_url`
- reject: length > 2048 → `invalid_url`
- preserve: `?variant=red&sku=123` round-trips unchanged

### Seam 2 — Firecrawl Response Exit Guard
**Where:** Zod schema + branch-ordered reason assignment after Firecrawl returns
**Proves:** Each D-02 reason code fires on its own condition, no lumped errors
**Cases (using captured fixture, mutated per-test):**
- happy: full valid payload → `{ ok: true, data }`
- `product_name` null/empty → `missing_name`
- `current_price` null → `missing_price`
- `current_price` 0 → `missing_price`
- `current_price` negative → `missing_price`
- `currency_code` "$" → `invalid_currency`
- `currency_code` "us" → `invalid_currency` (must be ISO alpha-3, uppercase)
- `currency_code` "XYZ123" → `invalid_currency`
- unexpected schema (Firecrawl shape drift) → `unknown`

### Seam 3 — Network Layer Timeout/Retry
**Where:** `fetch` call with `AbortSignal.timeout(60_000)` + retry logic
**Proves:** Correct reason-code mapping for each failure mode
**Cases (mock fetch):**
- 200 happy → `{ ok: true, data }`
- 503 once then 200 → `{ ok: true, data }` (retry succeeded)
- 503 twice → `network_error` (retry exhausted)
- 429 → `network_error` (no retry on 4xx, but rate limit = network-class)
- 400 → `network_error` (no retry)
- `TimeoutError` DOMException → `scrape_timeout` (Node 24 name is `TimeoutError` not `AbortError`)
- `fetch` rejects with network error → `network_error`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Firecrawl API key never leaks to browser bundle | TRACK-03 | Requires inspecting built client JS | `npm run build && grep -r "FIRECRAWL_API_KEY\|fc-[a-z0-9]" dealdrop/.next/static/` — must return 0 matches |
| Server-only build-time guard blocks client import | — | Next.js build must fail when scrape-product is imported from a `'use client'` file | Temporarily create `dealdrop/src/app/test-client-import/page.tsx` with `'use client'` + `import { scrapeProduct }`; `npm run build` must fail; delete test file |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (vitest install, fixture capture)
- [ ] No watch-mode flags (all runs use `vitest run`, never `vitest` or `--watch`)
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter once Wave 0 complete

**Approval:** pending
