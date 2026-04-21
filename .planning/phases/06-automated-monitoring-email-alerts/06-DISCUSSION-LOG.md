# Phase 6: Automated Monitoring & Email Alerts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 06-automated-monitoring-email-alerts
**Areas discussed:** Price-change detection & idempotency, Email template & rendering approach

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Price-change detection & idempotency | CRON-07/08: how the handler decides 'price changed' and how re-runs on the same day avoid duplicate price_history rows. | ✓ |
| Email template & rendering approach | EMAIL-02/03: how the HTML email is built (inline HTML vs react-email), CTA, copy structure, delivery grouping. | ✓ |
| Cron POST response body & observability | What POST returns after a run (plain ok vs structured summary vs audit table). | |
| Alert edge cases (the subtle stuff) | Currency-code change, floating-point tiny drops, multi-drops same day, first-ever check. | |

**Areas not selected** — handled as Claude's Discretion in CONTEXT.md with recommended defaults.

---

## Price-change detection & idempotency

### Q1: What does the handler compare the newly-scraped price against to decide 'changed'?

| Option | Description | Selected |
|--------|-------------|----------|
| products.current_price (Recommended) | Compare scraped price to products.current_price. One column read, no extra query. Kept in sync because the handler updates current_price whenever it writes a new price_history row. Matches CRON-07 literally. Simpler to reason about. | ✓ |
| Latest price_history row | SELECT price FROM price_history WHERE product_id = $1 ORDER BY checked_at DESC LIMIT 1. Treats price_history as source of truth; products.current_price becomes a denormalized cache. Adds one query per product. | |
| Both (belt-and-suspenders) | Compare against current_price for the decision; assert it equals the latest price_history row as an invariant check. Logs a warning if they diverge. | |

**User's choice:** products.current_price (Recommended)

### Q2: How is same-day re-run idempotency enforced (CRON-08)?

| Option | Description | Selected |
|--------|-------------|----------|
| Price-change gate only (Recommended) | Only INSERT a price_history row when scraped price != products.current_price. Same-day re-runs scrape again but don't duplicate rows because the price is identical. Manual re-trigger during Phase 7 DEP-06 is safe. Firecrawl cost doubles only if manually triggered — acceptable for portfolio bar. | ✓ |
| cron_runs audit table with early-return | Create cron_runs table. At cron start, if a row exists with started_at::date = today(), return early. Zero Firecrawl cost on re-trigger. BUT blocks intentional manual re-trigger during Phase 7 testing — need a ?force=1 escape hatch. | |
| Both: audit table + change gate | Write cron_runs audit row for every invocation (observability), but still use the price-change gate for INSERTs. No early-return. | |

**User's choice:** Price-change gate only (Recommended)

### Q3: On a failed re-scrape, what does the handler write?

| Option | Description | Selected |
|--------|-------------|----------|
| Set last_scrape_failed_at only (Recommended) | UPDATE products SET last_scrape_failed_at = now(). No price_history insert, current_price untouched. Matches the 'NULL = OK, non-NULL = failing' contract from Phase 4 D-07. | ✓ |
| Also log reason code to a new products.last_scrape_reason column | Extends products schema with last_scrape_reason TEXT NULL. Lets the UI badge show 'Tracking failed: invalid URL' vs generic. Adds a migration and widens DASH-08 scope. | |
| Also append to a scrape_failures audit table | Per-attempt history. Useful for 'failed N days in a row' feature. Overkill for v1 portfolio bar. | |

**User's choice:** Set last_scrape_failed_at only (Recommended)

### Q4: When a price change IS detected, what updates to products are atomic with the price_history insert?

| Option | Description | Selected |
|--------|-------------|----------|
| current_price + updated_at + last_scrape_failed_at=NULL (Recommended) | Single UPDATE sets all three: new price, timestamp, clear prior failure flag (successful re-scrape → no longer 'failing'). price_history INSERT first, then UPDATE. | ✓ |
| Only current_price + updated_at | Let last_scrape_failed_at stay as-is. Conditional UPDATE. Edge case: failing product that then succeeds but price is unchanged — clear the badge? | |
| Also clear flag on unchanged-price success | Every successful scrape clears the flag if previously non-NULL; only price-change triggers INSERT + UPDATE. Cleaner user-facing semantics. | |

**User's choice:** current_price + updated_at + last_scrape_failed_at=NULL (Recommended)

**Notes:** The CONTEXT.md D-04 also adopts the "clear flag on unchanged-price success" behavior from the third option as a secondary rule — one conditional UPDATE on healthy-but-previously-failing products so the DASH-08 badge stays honest.

---

## Email template & rendering approach

### Q1: How is the price-drop email HTML built?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline HTML template-literal in lib/resend.ts (Recommended) | Single exported function returning a template-literal string. Zero new deps. Table-based HTML layout (Outlook-safe). ~60 lines. | ✓ |
| react-email with JSX components | Install @react-email/components + @react-email/render. Prettier DX, preview UI, but adds 3-4 deps. | |
| Plain-text only (no HTML) | Dead simple. But violates EMAIL-03 which requires rendering the product image. | |

**User's choice:** Inline HTML template-literal in lib/resend.ts (Recommended)

### Q2: What does the 'View Product' button in the email link to?

| Option | Description | Selected |
|--------|-------------|----------|
| Original e-commerce URL (Recommended) | Button links directly to products.url. User one-click lands on the product page. Matches the 'never miss a price drop' core value — friction between email open and purchase is the failure mode. | ✓ |
| DealDrop dashboard URL | Button links to https://dealdrop.app/. User sees their full dashboard, finds the product, clicks again. Keeps users in the app but adds a hop. | |
| Both (hero CTA + secondary link) | Primary 'View Product' → original URL. Secondary 'View in DealDrop' → dashboard. Covers both intents but adds visual weight. | |

**User's choice:** Original e-commerce URL (Recommended)

### Q3: How is the percentage drop presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Hero number + old/new prices below (Recommended) | Big prominent '−18%' or 'SAVE 18%' at the top, then old price (strikethrough) and new price below. Percentage is the hook. Currency-agnostic. Rounds to whole percent. | ✓ |
| Inline sentence | 'Price dropped from $99 to $81 (18% off).' Single paragraph. Easier to scan in Gmail preview line. | |
| Old vs new only, no percentage | Just show old strikethrough → new. Violates EMAIL-03 which calls out 'percentage drop' specifically. | |

**User's choice:** Hero number + old/new prices below (Recommended)

### Q4: A single cron run may detect drops for multiple products the same user owns. How are alerts delivered?

| Option | Description | Selected |
|--------|-------------|----------|
| One email per dropped product (Recommended) | Iterate products, send one Resend call per drop. Each email is focused on one product. 3 drops = 3 emails. Simpler template, simpler handler. Matches 'never miss a price drop' literally. | ✓ |
| Digest: one email per user with all drops | Group drops by user email, send one email with a stacked list. Fewer inbox notifications, but adds grouping logic + multi-product template. | |
| Hybrid: single-drop → focused, 2+ → digest | Two templates to maintain. Over-engineered for v1. | |

**User's choice:** One email per dropped product (Recommended)

---

## Claude's Discretion

Areas the user did not deep-dive — planner uses sensible defaults captured in CONTEXT.md §"Claude's Discretion":

- Cron POST response body shape (recommended: structured summary `{ scraped, updated, dropped, failed[] }`)
- Alert edge cases — currency-code change (skip, log), floating-point tiny drops (treat as drop), first-ever check (use seeded baseline), multi-drops same day (price-change gate makes this safe)
- Vault SQL pattern — planner researches `vault.create_secret` + SECURITY DEFINER wrapper
- Sender display name — `"DealDrop <alerts@domain>"` reasonable default
- Scrape ordering + batching — `created_at ASC`, `p-limit(3)`, no chunking in v1
- p-limit ESM/CJS resolution — drop to v3.1.0 if v6+ breaks Turbopack

## Deferred Ideas

Captured in CONTEXT.md §"Deferred Ideas":
- `cron_runs` audit table (v1.5 if observability proves inadequate)
- `products.last_scrape_reason` column (v2+)
- `scrape_failures` per-attempt audit table (v2+)
- Postgres RPC wrapping INSERT + UPDATE atomically (v1.5)
- Cron POST `?force=1` override (not needed — idempotency is natural)
- Digest emails (v2+)
- Email-on-persistent-scrape-failure (v2+)
- Per-product alert thresholds (v2+)
- Resend retry on send failure (v1 locks "log but don't abort")
- Minimum-drop tolerance threshold (v2+ if noise)
- Cooldown for chronically-failing products (not in v1)
