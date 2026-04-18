# Feature Research

**Domain:** E-commerce price tracking (universal, any-site)
**Researched:** 2026-04-17
**Confidence:** MEDIUM — Web search and WebFetch were unavailable; findings draw on training-data knowledge of Keepa, CamelCamelCamel, Honey, Pricepulse, and ShopSavvy (all mature, stable products). Feature sets are unlikely to have changed materially. Cross-referenced against PROJECT.md v1 scope.

---

## Competitor Reference Map

| Competitor | Model | Scope | Key differentiator |
|------------|-------|-------|--------------------|
| Keepa | Browser ext + web app | Amazon-only | Richest Amazon data (sales rank, deal notifications, API) |
| CamelCamelCamel | Web app | Amazon-only | Simplest free Amazon price history; wishlist import |
| Honey (PayPal) | Browser extension | Multi-site (coupon-first) | Auto-applies coupons at checkout; Droplist for price watches |
| Pricepulse | Web app + ext | Amazon-only | AI "best time to buy" prediction |
| ShopSavvy | Mobile app + web | Multi-site, barcode scan | Barcode scanner; in-store price matching |
| PriceGrabber | Web app | Multi-site (aggregator) | Shopping comparison engine; not user-defined watchlists |

**DealDrop's unique position:** Universal any-URL tracking via Firecrawl — no competitor does this without a browser extension. DealDrop works purely from a pasted URL, server-side, with no per-site scraper maintenance.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product URL ingestion | Entry point to tracking; without it there's nothing to track | LOW | DealDrop: paste-URL form — covered in v1 |
| Scraped product metadata (name, image, price) | Users need to confirm "yes, this is the right product" | LOW | DealDrop: Firecrawl JSON schema — covered in v1 |
| Price history chart | "How has this product's price changed?" — the core value display | MEDIUM | DealDrop: Recharts line chart per card — covered in v1 |
| Price drop email alert | The reason users sign up; without it the app is just a dashboard | MEDIUM | DealDrop: Resend email on any drop — covered in v1 |
| Tracked products dashboard | Users need to see all products they're watching in one place | LOW | DealDrop: responsive product grid — covered in v1 |
| Remove / stop tracking | Users need to manage their list; missing this creates list bloat | LOW | DealDrop: Remove button with confirm + cascade delete — covered in v1 |
| Auth / account | Price watches must persist across sessions and be private | LOW | DealDrop: Google OAuth via Supabase — covered in v1 |
| Link back to original product page | Users need to act on a drop; must be able to buy from the alert | LOW | DealDrop: "View Product" link on card — covered in v1 |
| Duplicate tracking prevention | Adding the same URL twice is a silent UX failure | LOW | DealDrop: unique constraint on (user_id, url) — covered in v1 |
| Scrape failure surfacing | Users need to know tracking is broken, not just silently stale | LOW | DealDrop: "tracking failed" badge on card — covered in v1 |

**Assessment:** DealDrop's v1 scope covers all 10 table-stakes features. No gaps.

---

### Differentiators (Competitive Advantage)

Features that set a product apart. Not universally expected, but create switching costs or delight.

#### DealDrop has (competitors lack)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Universal any-URL tracking (no extension required) | Track any e-commerce site in the world by pasting a URL — Keepa/CamelCamelCamel are Amazon-only; Honey requires a browser extension installed | HIGH | Core DealDrop differentiator. Firecrawl handles this; per-site parsers are not needed. Risk: Firecrawl cost scales with tracked products × daily scrapes |
| Server-side scraping with no browser extension | Works on any device (mobile, shared computer) without installing anything | MEDIUM | Extension-based competitors (Honey, Keepa ext) require desktop Chrome/Firefox |

#### Competitors have (DealDrop could add in v2+)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Target price alert threshold | User sets "alert me when price drops below $X" rather than "any drop" — reduces alert noise for slowly falling prices | MEDIUM | DealDrop v1 is "any drop" (deliberate). Add in v2 if alert fatigue is reported |
| Percentage-drop threshold | "Alert me only if price drops ≥ 15%" — filters out $0.01 micro-drops | LOW | Same rationale as target price; v2 enhancement |
| Lowest-price-ever badge | Keepa/CamelCamelCamel surface "all-time low" prominently — gives buy urgency | LOW | Computable from price_history table with no schema change |
| In-app deal summary email (digest) | Weekly/monthly email round-up of all tracked products and their trend | MEDIUM | Different from per-alert email; keeps users engaged when no drops occur |
| Stock tracking (in-stock alerts) | CamelCamelCamel and Keepa track stock availability alongside price | HIGH | Requires scraping stock status field — Firecrawl schema change; v2+ |
| Sales rank / demand trends | Keepa tracks Amazon sales rank — tells you if a deal is actually popular | HIGH | Amazon-specific; not applicable to universal tracker |
| "Best time to buy" prediction | Pricepulse uses ML to forecast price trajectory | HIGH | Requires sufficient price_history depth (30+ data points per product); premature for v1 |
| Coupon / promo code auto-application | Honey's primary feature — applies codes at checkout | HIGH | Requires extension; orthogonal to DealDrop's model |
| Wishlist import (Amazon) | CamelCamelCamel can import an Amazon wishlist URL and bulk-add products | MEDIUM | Amazon-specific; conflicts with universal positioning |
| Public deal feed | Community-surfaced deals visible to all users | HIGH | Explicitly out of scope in PROJECT.md |
| Price comparison across retailers | PriceGrabber shows same product at multiple stores | HIGH | Requires product identity matching (UPC/EAN) — significant complexity |
| Mobile barcode scanner | ShopSavvy's signature feature for in-store price matching | HIGH | Requires mobile app; out of scope |

---

### Anti-Features (Deliberate Exclusions)

Features that seem good but create disproportionate cost, scope creep, or are already correctly ruled out.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Browser extension | Users are familiar with Honey/Keepa extensions; extensions feel "seamless" | Requires publishing to Chrome Web Store (review latency, policy risk), maintaining a separate codebase, handling Manifest V3 restrictions. Destroys the "paste a URL anywhere" simplicity of DealDrop | Paste-URL server-side flow covers the same need without the overhead |
| Real-time / sub-hourly price checks | Flash sales are short-lived; users want to catch them | Firecrawl costs scale directly with scrape frequency × product count. At daily cadence, cost is predictable. Sub-hourly turns a portfolio project into a $50+/month infra cost. Flash-sale windows are also often shorter than any scrape cadence | Daily cron is correct for portfolio scope; note this as a paid-tier upgrade path |
| Email/password auth | Some users dislike OAuth; they want to "just use an email" | Adds password reset flow, verification emails, brute-force protection, and GDPR considerations — all of which are non-trivial. Google OAuth covers 95%+ of demo users | Google OAuth only — one-click, zero password UX |
| Currency conversion (FX) | Multi-currency users want a unified dashboard in their home currency | Live FX rates require a third-party API (open.er-api.com or similar), rate caching, and historical FX for chart normalization — significant complexity for marginal portfolio value | Display price in original scraped currency. Note currency_code on each card |
| Per-product alert configuration | Power users want custom rules per product | Fine-grained configuration (per-product target price, per-product scrape cadence, per-product notification channel) explodes the UI and data model complexity for v1 | "Any drop" rule for all products; add threshold config as a v2 feature if needed |
| Social / public deal feed | Gamification; community curation surfaces better deals | Requires moderation, abuse prevention, privacy model, and conflicts with the private-by-default RLS architecture | Keep data private to each user; this is a fundamentally different product type |
| Historical data retention limits / pruning | Production systems need storage hygiene | For a portfolio project with low volume, retention policy adds operational complexity for no real gain | Keep history forever in v1; add retention config only if storage becomes a cost concern |
| Multi-site scrape failure email | Users should know tracking broke, not just see it in UI | Email noise: if Firecrawl goes down globally, every user gets a flood of failure emails. The UI badge approach is less spammy | Surface failure state on product card; email only on price drops |
| Payments / subscriptions | Monetization path | Portfolio/demo project; billing adds Stripe integration, webhook handling, plan gating logic | Not needed; out of scope |

---

## Feature Dependencies

```
Google OAuth (Supabase)
    └──required by──> Product Tracking (user_id FK)
                          └──required by──> Dashboard (products to show)
                                               └──required by──> Price History Chart (data to render)

Product Tracking (URL scrape via Firecrawl)
    └──required by──> Automated Monitoring (cron re-scrapes same products)
                          └──required by──> Price Drop Email Alert (cron triggers alert)

Price History Table (price_history rows)
    └──required by──> Price History Chart
    └──required by──> Price Drop Comparison (new price < last recorded price)
    └──enables (v2)──> Lowest-Price-Ever Badge
    └──enables (v2)──> Best-Time-To-Buy Prediction

RLS Policies
    └──required by──> Dashboard (users see only their products)
    └──required by──> Cron endpoint security (CRON_SECRET protects mutation)
```

### Dependency Notes

- **Auth requires before everything:** user_id is a non-null FK on products; no product can be tracked without an authenticated user
- **price_history requires products:** cascade delete means products must exist before history rows
- **Email alert requires price history comparison:** the "new price < last recorded price" check is only possible once at least one historical row exists per product — the initial scrape on add handles this bootstrap
- **Charts require at minimum 2 data points:** day-1 chart will show a flat line (one point); meaningful chart emerges after day 2+. Consider surfacing a "check back tomorrow" hint in empty chart state

---

## MVP Definition

### Launch With (v1) — All Covered in PROJECT.md

- [x] Google OAuth sign-in / sign-out — identity required for everything
- [x] Paste-URL product add with Firecrawl scrape — core ingestion flow
- [x] Dashboard with product grid (name, image, current price, currency) — visibility
- [x] Price history chart per product (Recharts) — core value display
- [x] Daily cron (pg_cron) re-scraping all products — monitoring engine
- [x] Price drop email alert via Resend — the reason users sign up
- [x] Scrape failure badge on product card — trust signal
- [x] Remove product with confirmation — list management
- [x] RLS policies (users see only own data) — data isolation
- [x] Toast notifications (Sonner) — confirmation feedback
- [x] Responsive Tailwind layout — mobile-accessible

**Gap check:** No gaps identified between v1 scope and table stakes.

**Over-scope check:** v1 does not include any differentiators or out-of-scope items. Clean.

### Add After Validation (v1.x)

- [ ] Lowest-price-ever badge on product card — computable from existing price_history, zero schema change, add after users ask "is this the best price it's been?"
- [ ] Target price alert threshold — add if users report alert fatigue from "any drop" on slowly falling items
- [ ] Percentage-drop threshold — pair with target price threshold as configurable alert options
- [ ] In-app price trend summary email (weekly digest) — add if engagement drops between drops (keeps users returning)

### Future Consideration (v2+)

- [ ] Stock-availability alerts — requires Firecrawl schema extension for `in_stock` field; meaningful only once user base is established
- [ ] "Best time to buy" prediction — requires 30+ data points per product; premature until product has been running for weeks
- [ ] Multi-retailer price comparison — requires product identity resolution (UPC/EAN matching); architectural departure from current model
- [ ] Paid tiers with higher scrape frequency — sub-hourly monitoring for flash sales; requires billing integration and per-product cron tuning

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL ingestion + Firecrawl scrape | HIGH | MEDIUM | P1 |
| Price drop email alert | HIGH | MEDIUM | P1 |
| Daily cron monitoring | HIGH | MEDIUM | P1 |
| Auth (Google OAuth) | HIGH | LOW | P1 |
| Dashboard product grid | HIGH | LOW | P1 |
| Price history chart | HIGH | MEDIUM | P1 |
| RLS data isolation | HIGH | LOW | P1 |
| Remove product | MEDIUM | LOW | P1 |
| Scrape failure badge | MEDIUM | LOW | P1 |
| Toast notifications | MEDIUM | LOW | P1 |
| Lowest-price-ever badge | MEDIUM | LOW | P2 |
| Target price alert threshold | HIGH | MEDIUM | P2 |
| % drop threshold | MEDIUM | LOW | P2 |
| Weekly digest email | MEDIUM | MEDIUM | P2 |
| Stock availability alerts | MEDIUM | HIGH | P3 |
| Best-time-to-buy prediction | LOW | HIGH | P3 |
| Multi-retailer comparison | LOW | HIGH | P3 |
| Sub-hourly scrape (paid tier) | MEDIUM | HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | Keepa | CamelCamelCamel | Honey | Pricepulse | ShopSavvy | DealDrop v1 |
|---------|-------|-----------------|-------|------------|-----------|-------------|
| Any-site tracking | No (Amazon only) | No (Amazon only) | Partial (extension on select sites) | No (Amazon only) | Partial (barcode + select sites) | YES — core differentiator |
| No extension required | No (ext recommended) | Yes (web-only OK) | No (extension required) | Yes (web-only OK) | No (mobile app) | YES |
| Price history chart | YES — rich | YES — simple | Limited (Droplist shows range) | YES | Basic | YES (Recharts) |
| Email alert on drop | YES | YES | YES (push + email) | YES | YES (push) | YES |
| Target price threshold | YES | YES | YES | YES | YES | NO (v1: any drop) |
| % drop threshold | YES | NO | NO | YES | NO | NO (v1) |
| Stock availability alert | YES | YES | NO | NO | NO | NO |
| Scrape failure surfacing | Partial | NO | NO | NO | NO | YES (UI badge) |
| Browser extension | YES | Optional | Required | Optional | Required (mobile) | NO (deliberate) |
| Lowest-price-ever label | YES | YES | NO | YES | NO | NO (v1.x) |
| Price prediction / ML | NO | NO | NO | YES | NO | NO |
| Coupon auto-apply | NO | NO | YES (core) | NO | Partial | NO (anti-feature) |
| Public deal feed | YES (deals page) | NO | YES (Honey Gold) | NO | YES | NO (anti-feature) |
| API access | YES (paid) | NO | NO | NO | NO | NO |
| Multi-retailer comparison | NO | NO | YES (limited) | NO | YES | NO |
| Barcode scanning | NO | NO | NO | NO | YES | NO |
| Wishlist import | NO | YES (Amazon) | NO | NO | NO | NO |
| Mobile app | NO | NO | YES (via PayPal) | NO | YES | NO (responsive web) |

---

## Sources

- Training-data knowledge of Keepa, CamelCamelCamel, Honey, Pricepulse, ShopSavvy, PriceGrabber features (MEDIUM confidence — stable mature products, knowledge cutoff August 2025)
- PROJECT.md v1 scope cross-referenced for gap and over-scope analysis (HIGH confidence)
- Web search and WebFetch unavailable during this research session; findings should be spot-checked against current competitor feature pages before treating the competitor matrix as authoritative

---
*Feature research for: E-commerce universal price tracking (DealDrop)*
*Researched: 2026-04-17*
