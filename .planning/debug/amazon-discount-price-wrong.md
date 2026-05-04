---
slug: amazon-discount-price-wrong
status: fixed-pending-uat
trigger: |
  Amazon product scrape returns wrong price — captures list/MRP-adjacent value (₹426.87) instead of the active sale price (₹363) when a 15% discount is applied.
  Cycle-4 widening: Flipkart product scrape captures the conditional bank-offer price (₹19,474) instead of the unconditional checkout price (₹20,499).
created: 2026-05-04
updated: 2026-05-04
---

# Debug Session: amazon-discount-price-wrong

## Symptoms

DATA_START
- expected_behavior: When user pastes Amazon product URL with active discount, DealDrop should capture the *current sale price* shown on the listing (the price the buyer would actually pay).
- actual_behavior: For Amazon product (Cetaphil Gentle Skin Hydrating Face Wash 118ml, https://amzn.in/d/04K6sdTU), DealDrop displays ₹426.87. Amazon shows MRP ₹429 with 15% discount → sale price ₹363. The captured value is neither the sale price nor exactly the MRP — it's close to MRP but slightly under (₹426.87 vs ₹429.00), suggesting it picked up a stale/secondary price field.
- error_messages: None — scrape completes successfully, just with wrong value.
- timeline: User noticed when adding this specific product. Unknown if other Amazon discounted products are affected.
- reproduction: 1) Open DealDrop dashboard. 2) Paste https://amzn.in/d/04K6sdTU into Add Product flow. 3) Submit. 4) Observe captured price = ₹426.87 instead of ₹363.
- product_url: https://amzn.in/d/04K6sdTU
- expected_price: ₹363 (MRP ₹429 minus 15% Amazon discount)
- captured_price: ₹426.87
- mrp_on_amazon: ₹429.00
DATA_END

## Current Focus

- hypothesis: Cycle-4 — Flipkart ships NO universal structured-data signals (no JSON-LD, no OG product meta, no microdata). The cycle-3 structural extractor therefore returns null for Flipkart, the LLM fallback runs, and the LLM gravitates toward the visually-prominent "best value with [bank] offer" promo (₹19,474) instead of the unconditional default checkout price (₹20,499). The fix surface is (a) tighten the LLM prompt + JSON-schema description with explicit conditional-offer exclusions, AND (b) widen the structural extractor's universal-signal coverage (OG product meta, microdata) so other better-behaved retailers don't depend on the LLM at all.
- next_action: Manual UAT for BOTH URLs — Cetaphil amazon.in expecting ₹363, Samsung Galaxy A35 5G flipkart.com expecting ₹20,499.
- test: New OG and microdata branches in `extractStructuralPrice` plus 13 new unit tests (36 total in `price-extractor.test.ts`); LLM prompt + JSON-schema description hardened with bank/credit-card/wallet/EMI/exchange exclusions and a positive "any user, no payment method required" instruction.
- expecting: For Cetaphil: dev log shows `structuralPrice: 363`, dashboard card ≈ ₹363 (cycle-3 behaviour, regression-checked). For Samsung Galaxy A35 5G: dev log shows `structuralPrice: null`, LLM `current_price: 20499`, dashboard card ≈ ₹20,499.

## Cycle 4 — Manual UAT cycle-3 PARTIAL: Amazon ✅ Flipkart ❌

DATA_START
- timestamp: 2026-05-04 (cycle 4 UAT)
- amazon_result: PASS — Cetaphil captured at ₹363 after cycle-3 deploy. Structural extractor matched Amazon's `.priceToPay .a-offscreen` selector.
- flipkart_url: https://www.flipkart.com/samsung-galaxy-a35-5g-awesome-lilac-256-gb/p/itm8f49f29e842cc?pid=MOBGYT2HRXWTHACK
- flipkart_visible_prices:
    - mrp_strikethrough: ₹36,999
    - default_checkout: ₹20,499  ← unconditional, what we want
    - bank_offer_best_value: ₹19,474  ← requires specific credit-card / bank
- flipkart_captured: ₹19,474 (the conditional bank offer)
- ground_truth_log_line: |
    scrapeProduct: Firecrawl response {
      url: 'https://www.flipkart.com/samsung-galaxy-a35-5g-awesome-lilac-256-gb/p/itm8f49f29e842cc?pid=MOBGYT2HRXWTHACK&lid=LSTMOBGYT2HRXWTHACKOD1QOB&marketplace=FLIPKART&q=samsung+galaxy+a35+5g&store=tyy%2F4io&srno=s_1_2&otracker=AS_QueryStore_OrganicAutoSuggest_2_10_na_na_na&otracker1=AS_QueryStore_OrganicAutoSuggest_2_10_na_na_na&fm=search-autosuggest&iid=76f71a07-b5f1-4188-9b4e-8e170e559c4b.MOBGYT2HRXWTHACK.SEARCH&ppt=sp&ppn=sp&ssid=rb5dgxw6nk0000001777879267052&qH=dedcb54424b93f87&ov_redirect=true',
      cacheState: undefined,
      cachedAt: undefined,
      htmlLength: 339719,
      structuralPrice: null,
      json: {
        product_name: 'Samsung Galaxy A35 5G (Awesome Lilac, 256 GB)',
        current_price: 19474,
        currency_code: 'INR',
        product_image_url: 'https://rukminim2.flixcart.com/image/800/1070/xif0q/mobile/e/v/a/-original-imahgy26tq7zfwts.jpeg?q=90'
      }
    }
- interpretation:
    - htmlLength: 339719 → Firecrawl returned the full page HTML (~340KB), so the structural extractor had material to work with.
    - structuralPrice: null → cycle-3 JSON-LD parser FOUND NO Product/Offer node in Flipkart's HTML.
    - LLM fallback returned ₹19,474 → the most prominent on-page price is Flipkart's "best value with [bank] offer" promo. The LLM gravitates toward visual prominence absent stronger guidance.
DATA_END

## Cycle 4 — Investigation

DATA_START
- timestamp: 2026-05-04 (cycle 4 investigation)
- method: One-off Node script (`/tmp/inspect-flipkart-mainonly.mjs`, since deleted) called the Firecrawl v2 /scrape endpoint with the Galaxy A35 URL and `formats: ['html'], onlyMainContent: true, maxAge: 0` to mirror production config. Wrote the returned HTML to /tmp/flipkart-mainonly.html (272,647 bytes) and probed for every structured-data signal we know about.
- flipkart_signal_inventory:
    - JSON-LD blocks (application/ld+json)              : 0
    - OpenGraph price meta (og:price:*)                 : 0
    - Facebook product price meta (product:price:*)     : 0
    - Schema.org microdata (itemprop="price")           : 0
    - data-price attributes                             : 0
    - window.__INITIAL_STATE__ / __PRELOADED_STATE__ / __APOLLO__ : 0
    - itemtype="...schema.org/Product" containers       : 0
- finding: Flipkart's PDP HTML, as Firecrawl returns it after `onlyMainContent: true`, contains NONE of the universal structured-data signals. All prices are emitted as plain text inside divs with obfuscated class names (`v1zwn21l`, `_1psv1ze0`, `css-g5y9jx`, …). The strike-through MRP `36,999` carries `text-decoration-line:line-through`; the unconditional checkout `₹20,499` is a plain-styled div immediately following; the conditional bank-offer `₹19,474` is preceded by the literal string "Buy at " inside a containing block that ALSO contains "Apply offers for maximum savings".
- per_site_class_selectors: REJECTED. Flipkart's class names (`v1zwn21l` etc.) are CSS-in-JS hashes that rotate weekly. Adding selectors against them would produce a fix that breaks within a sprint. The user explicitly does NOT want per-site selectors that scale linearly.
- correct_fix_surface:
    1. Tighten the LLM prompt + JSON-schema description to explicitly exclude conditional / bank-card / wallet / EMI / exchange offers. The LLM is the only path that has access to Flipkart's prices, so prompt design IS the fix for this site. Verified the LLM has the contextual signal it needs — the "Buy at ₹19,474" block is co-located with "Apply offers for maximum savings", which is itself a strong "conditional" cue.
    2. Widen the structural extractor with universal signals (JSON-LD @graph wrapper, OG product meta, microdata) so OTHER retailers in the long tail don't have to depend on the LLM at all — even though this doesn't help Flipkart specifically.
DATA_END

## Cycle 4 — Fix

DATA_START
- timestamp: 2026-05-04 (cycle 4 fix)
- root_cause:
    Flipkart emits no JSON-LD, no OpenGraph product meta, and no microdata. The cycle-3 structural extractor correctly returned null for Flipkart, falling through to the LLM. The LLM, given Flipkart's cleaned main content, picked the most visually prominent price block — Flipkart's "best value with [bank] offer" promo (₹19,474) — over the unconditional default checkout price (₹20,499). The cycle-1/2/3 prompt did NOT enumerate bank/credit-card/wallet/exchange offers as exclusions, and did NOT include a positive "pick the price ANY user pays without a specific payment method" instruction.

- fix:
    1. **`dealdrop/src/lib/firecrawl/scrape-product.ts`** — PROMPT extended with:
       - A POSITIVE INSTRUCTION block: "If multiple prices appear, pick the price that ANY user would pay at checkout WITHOUT requiring a specific payment method, bank account, credit card, wallet, coupon code, or exchange. Choose the unconditional sale / deal price — the amount shown by default before any optional offer is applied."
       - Expanded exclusion enumeration adding: bank offers / credit-card offers / debit-card offers (e.g. "with [Bank] bank offer", "best value with [Bank] discount", "Buy at ₹X" preceded by an offer banner); prepaid / wallet / UPI discounts; coupon-conditional prices (e.g. "₹X off with coupon CODE"); exchange / trade-in prices ("with exchange of old phone"); EMI specifics ("EMI starting at", "no-cost EMI of"); the cue "best value" applied to a conditional offer.
       - The closing instruction now reads: "If multiple candidate prices appear, choose the one nearest the Buy button that matches the currently selected variant AND does not require a bank / card / coupon / exchange."
    2. **`dealdrop/src/lib/firecrawl/schema.ts`** — `PRODUCT_JSON_SCHEMA.properties.current_price.description` mirrors the prompt's exclusions verbatim (the JSON-schema description is what Firecrawl injects into its model context per the v2 LLM-extract contract).
    3. **`dealdrop/src/lib/firecrawl/price-extractor.ts`** — added universal-signal extraction beyond JSON-LD:
       - `extractOpenGraphPrice(html)` — matches `<meta property="og:price:amount" content="...">`, `<meta property="og:product:price:amount" ...>`, and `<meta property="product:price:amount" ...>`. Tolerates content-attr-before-property attribute order. (Spec: ogp.me §type_product, Facebook product-catalog reference.)
       - `extractMicrodataPrice(html)` — matches `<meta itemprop="price" content="...">` (both attribute orders) and text-node variants `<span|div|p|strong|b itemprop="price">$999.99</span>`.
       - Comment in `findProductPriceInJsonLd` updated to call out that the recursion already covers `mainEntity` / `mainEntityOfPage` / `ItemPage` wrappers.
       - Priority on non-Amazon hosts: JSON-LD → OG → microdata → null. (Amazon hosts unchanged: Amazon-specific selectors, no fall-through to JSON-LD/OG, since Amazon's structured data is exactly the stale value we're avoiding.)
    4. **`dealdrop/src/lib/firecrawl/__fixtures__/flipkart-product.html`** — NEW fabricated minimal Flipkart-style PDP fixture (real Flipkart HTML ships none of the universal signals; the fixture synthesizes JSON-LD `@graph` + OG product meta with the captured prices ₹36,999 / ₹20,499 / ₹19,474). Comment in the fixture explains the synthesis explicitly so future readers don't think Flipkart actually emits this.
    5. **`dealdrop/src/lib/firecrawl/price-extractor.test.ts`** — +13 new tests (36 total), covering:
       - Amazon page that ALSO ships og:price=999 → still uses Amazon-specific selectors first (does NOT fall through to OG).
       - Amazon page with NO priceToPay but WITH og:price → returns null (OG must not rescue Amazon).
       - Flipkart-style fixture with `@graph` wrapper containing a Product → returns ₹20,499 (NOT ₹36,999 MRP, NOT ₹19,474 bank offer).
       - OG `og:price:amount` / `product:price:amount` / `og:product:price:amount` extraction.
       - OG attribute-order swap (content-before-property).
       - Microdata `<meta itemprop="price" content="999.99">` extraction.
       - Microdata `<span itemprop="price">$999.99</span>` text-node extraction.
       - Priority: JSON-LD beats OG when both present.
       - Priority: OG beats microdata when both present.
       - Priority: only OG present → OG wins over null.
       - Real-world Flipkart no-signal case: html with NO JSON-LD, NO OG, NO microdata → returns null (caller falls back to LLM).

- contract_preservation:
    - `ProductData` type, `ScrapeResult` union, `ScrapeFailureReason` union — UNCHANGED.
    - `scrapeProduct(url)` external signature — UNCHANGED.
    - `parseProductResponse(raw, priceOverride?)` signature — UNCHANGED (cycle-3 addition retained).
    - `extractStructuralPrice({ url, html })` signature — UNCHANGED (only its body grew; new `extractOpenGraphPrice` / `extractMicrodataPrice` are private helpers exposed via `__testing` for unit tests only).
    - No new runtime deps. No new dev deps committed (the one-off `/tmp/inspect-flipkart-mainonly.mjs` used `node:fs` + native `fetch` only).

- verification:
    - `npx vitest run src/lib/firecrawl/` — **96 / 96 tests pass** across 5 files (price-extractor.test.ts: 36, scrape-product.test.ts: 20, schema.test.ts: 17, url.test.ts: 12, toast-messages.test.ts: 11).
    - Full repo: `npx vitest run` — **222 / 222 tests pass** across 22 files (was 209 / 209 in cycle 3; the +13 are the cycle-4 OG / microdata / priority / Flipkart-fixture cases).
    - `npx eslint src/lib/firecrawl/` — clean.
    - `npx tsc --noEmit` — no new errors. The same three pre-existing errors as in cycle 3 (`.next/types/cache-life.d 3.ts`, `.next/types/routes.d 3.ts`, and the typing nit in `src/lib/products/get-user-products.test.ts:121`).

- manual_uat_required:
    1. Restart `npm run dev`.
    2. **Amazon regression check** (cycle-3 fix should still hold):
       - Remove the existing Cetaphil row, re-add `https://amzn.in/d/04K6sdTU`.
       - Dev log: `structuralPrice: 363`, `htmlLength: <large>`.
       - Dashboard card: ≈ ₹363.
    3. **Flipkart cycle-4 verification**:
       - Add `https://www.flipkart.com/samsung-galaxy-a35-5g-awesome-lilac-256-gb/p/itm8f49f29e842cc?pid=MOBGYT2HRXWTHACK&...` (full URL with referrer params is fine).
       - Dev log: `structuralPrice: null` (expected — Flipkart has no structured data), `json.current_price: 20499` (the LLM, under the cycle-4 prompt, now selects the unconditional checkout price).
       - Dashboard card: ≈ ₹20,499 (NOT ₹19,474, NOT ₹36,999).
    4. **Regression smoke**: add one non-discounted Amazon product and one well-behaved retailer with JSON-LD or OG (e.g. a Shopify store). Both should capture sane prices via the structural extractor (`structuralPrice: <positive>`).
DATA_END

## Cycle 3 — Manual UAT (cycle-2 fix) FAILED → Cycle-3 root cause confirmed

DATA_START
- timestamp: 2026-05-04 (cycle 3)
- environment: local dev (`npm run dev`), cycle-2 maxAge:0 + instrumentation deployed.
- ground_truth_log_line: |
    scrapeProduct: Firecrawl response {
      url: 'https://www.amazon.in/Cetaphil-Hydrating-Sulphate-Free-Niacinamide-Sensitive/dp/B01CCGW4OE/ref=sr_1_5?...&th=1',
      cacheState: undefined,
      cachedAt: undefined,
      json: {
        product_name: 'Cetaphil Gentle Skin Hydrating Face Wash 118ml, Paraben Free, Sulphate-Free Gentle Skin Hydrating Cleanser with Niacinamide, Vitamin B5 for Dry to Normal, Sensitive Skin',
        current_price: 426.87,
        currency_code: 'INR',
        product_image_url: 'https://m.media-amazon.com/images/I/31C1FgFM1sL._AC_.jpg'
      }
    }
- interpretation:
    - Firecrawl correctly resolved the short link `amzn.in/d/04K6sdTU` to the full amazon.in URL with all referrer query params.
    - `cacheState: undefined`, `cachedAt: undefined` — Firecrawl is no longer surfacing those fields on a fresh scrape (or the field name path differs from what we logged); cannot conclusively confirm cache bypass via the metadata, but the cycle-2 `maxAge: 0` request-body field IS being sent and the user verified the strengthened cycle-1 prompt is in module scope and HMR'd.
    - Despite the strengthened prompt, the LLM still returned `current_price: 426.87`. This rules out hypothesis C as the dominant cause and CONFIRMS hypothesis D: the LLM legitimately picks ₹426.87 from the cleaned main content of the Amazon PDP.
    - ₹426.87 is exactly the value present in Amazon's `<script type="application/ld+json">` Product.offers.price island. The LLM has been trained to trust schema.org markup as canonical, and that JSON-LD lags Amazon's visible deal-price block (which is rendered into `.priceToPay .a-offscreen` and updated via Amazon's regional/promotional pricing pipeline).
- hypothesis_D_status: CONFIRMED
DATA_END

## Cycle 3 — Investigation + Fix

DATA_START
- timestamp: 2026-05-04 (cycle 3 fix)
- root_cause:
    Prompt engineering alone cannot override schema.org structural data. The Firecrawl LLM, given Amazon's cleaned main content, sees both the visible deal price AND the JSON-LD Product.offers.price and trusts the canonical-looking JSON-LD value (₹426.87) — which on Amazon PDPs lags the on-page deal price block (₹363) under an active discount.

- fix_strategy:
    Switch price extraction off the LLM and onto STRUCTURAL parsing for the price field. Keep the LLM authoritative for product_name, currency_code, product_image_url (those are robust). The Firecrawl request now asks for BOTH `formats` — the structured `json` extraction AND the raw `html` — and a new pure helper runs a priority-ordered structural extractor over the HTML before delegating to `parseProductResponse`.

- priority_order:
    1. Site-specific Amazon selectors (regex over the bounded HTML fragment around each selector — no DOM-parser dep added):
       - `.priceToPay .a-offscreen` (the green deal-price block adjacent to Buy)
       - `#corePriceDisplay_desktop_feature_div .a-price .a-offscreen`
       - `[data-a-color="price"] .a-offscreen`
       - `#priceblock_dealprice` / `#priceblock_ourprice` / `#priceblock_saleprice` (legacy)
       - On Amazon hosts we DELIBERATELY do NOT fall through to JSON-LD — that's exactly the value we're trying to avoid.
    2. JSON-LD `Product.offers.price` (single Offer + AggregateOffer.lowPrice, with @graph wrapper support) — used for non-Amazon schema-compliant retailers.
    3. LLM-extracted `data.json.current_price` (long tail of small retailers without good HTML structure).

- files_changed:
    - dealdrop/src/lib/firecrawl/price-extractor.ts (NEW, ~210 lines incl. comments and tests-only export). Exports `extractStructuralPrice({ url, html })` returning `number | null`. Pure server-side function, no I/O, no new deps.
    - dealdrop/src/lib/firecrawl/scrape-product.ts: added `'html'` to the request-body `formats` array; added `extractStructuralPrice` call before `parseProductResponse`; expanded the cycle-2 instrumentation log to include `htmlLength` and `structuralPrice`.
    - dealdrop/src/lib/firecrawl/schema.ts: extended `FirecrawlScrapeResponseSchema` with optional `data.html: z.string().optional()`; extended `parseProductResponse(raw, priceOverride?)` to accept an optional positive-number override that replaces `current_price` while preserving the existing branch order and ScrapeFailureReason union.
    - dealdrop/src/lib/firecrawl/scrape-product.test.ts: B15 updated to assert `formats.length === 2` and `formats[1] === 'html'` and `maxAge === 0`; added B16/B17/B18/B19 to cover the structural price wiring (Amazon → 363 over LLM 426.87, fall-through to LLM when no html, JSON-LD on non-Amazon, LLM fallback when Amazon HTML lacks priceToPay).
    - dealdrop/src/lib/firecrawl/schema.test.ts: added envelope-with-html test; added 4 priceOverride branch tests.
    - dealdrop/src/lib/firecrawl/price-extractor.test.ts (NEW): 23 unit tests across Amazon selectors, JSON-LD fallback, guard rails, parsePriceText (INR/US/EU/comma-decimal), and isAmazonHost.

- contract_preservation:
    - `ProductData` type, `ScrapeResult` union, `ScrapeFailureReason` union — UNCHANGED.
    - `scrapeProduct(url)` external signature — UNCHANGED.
    - `parseProductResponse(raw)` continues to work with one arg; the optional second arg is purely additive.
    - Cycle-1 prompt + JSON-schema strengthening — RETAINED (it's still useful as the LLM fallback path).
    - Cycle-2 `maxAge: 0` cache bypass and dev-server log line — RETAINED.

- verification:
    - `npx vitest run src/lib/firecrawl/` — 83 / 83 tests pass across 5 files (price-extractor.test.ts: 23, scrape-product.test.ts: 20, schema.test.ts: 17, url.test.ts: 12, toast-messages.test.ts: 11).
    - Full repo: `npx vitest run` — 209 / 209 tests pass across 22 files (was 177 / 177; the +32 are the new structural-extractor wiring, override branches, and envelope-with-html cases).
    - `npx eslint src/lib/firecrawl/` — clean.
    - `npx tsc --noEmit` — no new errors. Three pre-existing errors unrelated to this change (`.next/types/cache-life.d 3.ts`, `.next/types/routes.d 3.ts`, and a pre-existing typing nit in `src/lib/products/get-user-products.test.ts:121`).

- manual_uat_required:
    1. Restart `npm run dev` (defense-in-depth — guarantees the new modules are loaded).
    2. In the dashboard, REMOVE the existing Cetaphil row first (so the insert path runs fresh and you observe the live capture).
    3. Re-add https://amzn.in/d/04K6sdTU.
    4. In the dev-server terminal, locate the new log line:
       `scrapeProduct: Firecrawl response { url, cacheState, cachedAt, htmlLength: <large>, structuralPrice: 363, json: { ..., current_price: 426.87, ... } }`
       - `htmlLength` should be > 0 (confirms the `'html'` format was returned).
       - `structuralPrice: 363` confirms the Amazon-specific extractor matched `.priceToPay .a-offscreen`.
       - `json.current_price` may still be 426.87 from the LLM — that's expected and fine; the structural override wins.
    5. Confirm the dashboard card shows ≈ ₹363 for the Cetaphil product.
    6. Regression smoke:
       - Add one non-discounted Amazon product → expect captured price equals visible price; structuralPrice should be a positive number matching the visible price.
       - Add one non-Amazon product (e.g. books.toscrape.com) → expect captured price equals the LLM or JSON-LD value; either path is acceptable.
DATA_END

## Cycle 2 — Manual UAT FAILED

DATA_START
- timestamp: 2026-05-04 (cycle 2)
- environment: local dev (`npm run dev`), signed in with existing Google account
- action: re-added https://amzn.in/d/04K6sdTU through the dashboard
- observed: dashboard now shows "4 products tracked" and the Cetaphil product card displays ₹426.87 (identical to pre-fix value)
- implication: the prompt/schema fix had NO observable effect. Either the new code did not run, or the LLM still returns ₹426.87 with the new prompt — both possibilities must be investigated.
DATA_END

## Cycle 2 — Investigation

DATA_START
- timestamp: 2026-05-04 (cycle 2 investigation)
- step_A_dedup_check:
    file_read: dealdrop/src/actions/products.ts
    finding: addProduct does NOT dedupe-and-return-cached. It always calls scrapeProduct() THEN performs an INSERT. If the URL row already exists, the unique constraint `(user_id, url)` raises Postgres error code 23505 and addProduct returns `{ ok: false, reason: 'duplicate_url' }`, which the dashboard surfaces as toast "You're already tracking this product." There is no path that returns a cached `current_price` for an existing URL.
    hypothesis_A_status: ELIMINATED
    note: This means the user's "4 products tracked" count comes from EITHER (a) deleting the prior Cetaphil row first then re-adding (fresh scrape), OR (b) seeing the duplicate-URL toast and looking at the OLD card with the OLD price.
- step_B_stale_dev_server_check:
    file_mtime: dealdrop/src/lib/firecrawl/scrape-product.ts → modified 2026-05-04 11:38:07
    next_dev_mtime: dealdrop/.next/dev → modified 2026-05-04 11:48 (10 min after the source change)
    finding: HMR/Turbopack picked up the file change. Cycle-1 PROMPT and JSON-schema description ARE shipped on disk and present in the running dev server's module graph.
    hypothesis_B_status: ELIMINATED (as the primary cause; we still ask the user to restart the dev server out of paranoia, since `'use server'` actions can occasionally pin to the prior module graph in dev).
- step_C_firecrawl_cache_check:
    fixture_inspection: dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json
    finding: Firecrawl v2 response metadata exposes `"cacheState": "hit"` and `"cachedAt": "<timestamp>"`. The fixture was captured WITH a cache hit — this is the documented default behavior of Firecrawl v2: scrape responses are cached by URL with a default TTL of ~2 days. Per https://docs.firecrawl.dev/api-reference/endpoint/scrape, the `maxAge` parameter (in milliseconds) controls cache TTL; setting `maxAge: 0` forces a fresh scrape.
    request_body_audit: dealdrop/src/lib/firecrawl/scrape-product.ts (cycle-1 state) sent `{ url, formats, onlyMainContent, timeout }` — NO `maxAge` field. Therefore Firecrawl applied its default cache policy. Because the user's first add of this URL (pre-fix) hit Firecrawl with the OLD weak prompt, the cached extraction was ₹426.87. Every subsequent re-add — including the cycle-1 retry under the new prompt — was served from cache and returned the same ₹426.87 verbatim. The new prompt was never given to the LLM for this URL.
    hypothesis_C_status: CONFIRMED (in cycle 2 — but cycle 3 evidence shows that even with cache bypassed the LLM still returns 426.87, so cycle-2 was a NECESSARY but NOT SUFFICIENT fix.)
- step_D_llm_genuine_misextraction:
    not_required: with hypothesis C confirmed and the cache-bypass fix in place, this can only be evaluated AFTER a fresh (cacheState: miss) scrape. The added instrumentation logs the raw `data.json` payload, which makes hypothesis D directly observable on the user's next attempt without further code changes.
    hypothesis_D_status: CONFIRMED in cycle 3 — the user's dev-log line shows the LLM returning 426.87 even with the strengthened prompt and cache bypass. Cycle-3 fix addresses this with structural extraction.
DATA_END

## Evidence

- timestamp: 2026-05-04 (cycle 1) — Static read of `dealdrop/src/lib/firecrawl/scrape-product.ts` showed PROMPT (line 28-29) is a single under-specified sentence: "Extract product_name, current_price (numeric), currency_code (ISO 4217 alpha-3), product_image_url from this e-commerce product page." No mention of checkout vs MRP, no exclusions, no anchor to the Buy button.
- timestamp: 2026-05-04 (cycle 1) — Static read of `dealdrop/src/lib/firecrawl/schema.ts` showed `current_price.description` (line 28-32) only says "Numeric current price (not regular/was price). Parse any formatting like '$1,299.99' to 1299.99. Return null if no price is visible." Insufficient guidance for Amazon-style PDPs that surface MRP, MRP-tax-inclusive sub-line, per-100ml unit price, EMI, Subscribe-&-Save, bundle, and post-discount price simultaneously.
- timestamp: 2026-05-04 (cycle 1) — Static read of `parseProductResponse` in schema.ts confirmed it does only nullability/shape checks (positive number, ISO-4217 regex). No price-selection logic. Whatever Firecrawl's LLM returns flows verbatim to `products.current_price`. Therefore the fix surface is the request layer (prompt + schema description), not the parser.
- timestamp: 2026-05-04 (cycle 1) — Captured value ₹426.87 ≈ ₹429 × 0.995, which is NOT the MRP and NOT the deal price. Most likely a secondary price field on the Amazon page (possibly a "deal of the day" stale figure, a per-100ml display, or a near-MRP figure from a JSON-LD island). Confirms the LLM is picking *some* price, just not the right one — consistent with under-specified guidance, inconsistent with a structural bug.
- timestamp: 2026-05-04 (cycle 2) — Read `dealdrop/src/actions/products.ts`: addProduct always calls scrapeProduct() before inserting; on duplicate URL it returns `'duplicate_url'` (a hard error toast), it does NOT silently reuse the existing row's `current_price`. Eliminates the "old DB row reused" hypothesis.
- timestamp: 2026-05-04 (cycle 2) — Inspected `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json`: response metadata exposes `cacheState: "hit"` and `cachedAt: "2026-04-18T21:00:11.773Z"`. Firecrawl v2 caches scrape responses by URL with default TTL ~2 days. The cycle-1 request body did NOT pass `maxAge`, so the LLM never re-ran for this URL — Firecrawl returned the previously-cached extraction (₹426.87). This explains why the cycle-1 prompt+schema fix had zero observable effect on this URL.
- timestamp: 2026-05-04 (cycle 3) — User's live dev-server log captured AFTER the cycle-2 maxAge:0 + instrumentation deploy showed `cacheState: undefined`, `cachedAt: undefined`, `json.current_price: 426.87`. Confirms the LLM still picks ₹426.87 even with the strengthened prompt and cache bypass — i.e. hypothesis D is the dominant cause. ₹426.87 matches the value embedded in Amazon's `application/ld+json` Product.offers.price island, which lags the visible deal price (₹363) under an active discount.
- timestamp: 2026-05-04 (cycle 4) — User's live dev-server log for the Flipkart Galaxy A35 5G URL showed `htmlLength: 339719`, `structuralPrice: null`, `json.current_price: 19474`. Confirms (a) Firecrawl returned the full HTML (~340KB) so the structural extractor had material to work with, (b) the cycle-3 JSON-LD extractor correctly returned null because Flipkart has no JSON-LD, (c) the LLM, under the cycle-3 prompt, picked the bank-offer "best value" price ₹19,474 over the unconditional ₹20,499.
- timestamp: 2026-05-04 (cycle 4) — One-off live probe of the Flipkart PDP via Firecrawl (`onlyMainContent: true, maxAge: 0`) confirmed the HTML contains: 0 application/ld+json blocks; 0 og:price meta tags; 0 product:price meta tags; 0 itemprop="price"; 0 data-price; 0 window.__INITIAL_STATE__/__PRELOADED_STATE__/__APOLLO__. All prices appear as plain text in divs with rotating CSS-in-JS class hashes (`v1zwn21l`, `_1psv1ze0`). The strike-through MRP carries `text-decoration-line:line-through`. The "Buy at ₹19,474" block is co-located with "Apply offers for maximum savings" — a strong contextual cue the LLM should use to recognize it as conditional.

## Eliminated Hypotheses

- "URL normalization is stripping query params that select the right variant" — eliminated by reading `dealdrop/src/lib/firecrawl/url.ts`; normalization preserves the full path and host. Confirmed in cycle 3 by the dev-log showing the resolved URL retains all `ref=sr_1_5...&th=1` referrer params.
- "parseProductResponse is rounding or transforming the price" — eliminated by static read; it only checks `typeof number && isFinite && > 0` and passes the value through unchanged.
- HYPOTHESIS A — "addProduct short-circuits to existing DB row" — eliminated cycle 2 by reading `dealdrop/src/actions/products.ts`.
- HYPOTHESIS B — "dev server didn't pick up new code" — eliminated cycle 2 by mtime check (`.next/dev` updated 10 min after the source change).
- HYPOTHESIS C — "Firecrawl response cache served stale extraction" — initially CONFIRMED in cycle 2; reclassified in cycle 3 as NECESSARY-BUT-NOT-SUFFICIENT. The cache-bypass fix is correct but on its own does not change the captured price because the LLM independently picks ₹426.87 from the JSON-LD island.
- "Add per-site Flipkart class selectors (e.g. `._30jeq3`)" — REJECTED in cycle 4. Flipkart's class names are CSS-in-JS hashes that rotate weekly; selectors against them would break within a sprint and don't scale to the long tail of retailers.

## Resolution

- root_cause:
    cycle_1_partial: PROMPT and JSON-schema description in the Firecrawl request layer were under-specified and gave the LLM no anchor for picking the active checkout price among Amazon's many price-like surfaces. (Cycle-1 fix correctly addressed this; remains in place as the LLM-fallback guidance.)
    cycle_2_necessary: Firecrawl v2 caches scrape-extraction results by URL with ~2-day TTL. Without `maxAge: 0` in the request body, every re-add of the same URL was served from cache and the new prompt never reached the LLM. (Cycle-2 fix is a required prerequisite for any further behavior change.)
    cycle_3_dominant_amazon: The Firecrawl LLM, given Amazon's cleaned main content, sees both the visible deal price block (`.priceToPay .a-offscreen` → ₹363) AND the schema.org JSON-LD `Product.offers.price` (→ ₹426.87) and trusts the JSON-LD island as canonical. Amazon's JSON-LD lags the visible deal price under an active discount. The fix surface is structural HTML extraction, not prompt design.
    cycle_4_flipkart_widening: Flipkart emits NO universal structured-data signals. The cycle-3 structural extractor correctly returned null and fell through to the LLM, which then picked the most visually prominent price block — Flipkart's "best value with [bank] offer" promo (₹19,474) — over the unconditional default checkout price (₹20,499). The cycle-1/2/3 prompt did not enumerate bank/credit-card/wallet/exchange offers as exclusions. The fix surface for Flipkart is prompt design (the LLM is the only path with access to the data), supplemented by widening the structural extractor's universal-signal coverage (OG, microdata) so other retailers don't depend on the LLM at all.

- fix:
    1. **NEW** `dealdrop/src/lib/firecrawl/price-extractor.ts` (cycle-3) — pure server-only helper exporting `extractStructuralPrice({ url, html })`. Cycle-3 priority: Amazon-specific selectors (no fall-through to JSON-LD on Amazon hosts) → JSON-LD `Product.offers.price` (with @graph + AggregateOffer + nested-wrapper recursion). Cycle-4 widens the non-Amazon path to JSON-LD → OG `og:price:amount` / `product:price:amount` → microdata `itemprop="price"` (meta and text-node). Returns null when no structural price is found, letting the caller fall back to the LLM value.
    2. **`dealdrop/src/lib/firecrawl/scrape-product.ts`** — request-body `formats` contains `[{ type: 'json', schema, prompt }, 'html']`; `extractStructuralPrice` is called on `data.html`; the structural price (when non-null) is passed as a `priceOverride` argument that replaces the LLM-extracted `current_price`. Instrumentation log carries `htmlLength` and the selected `structuralPrice`. Cycle-4 PROMPT extended with explicit conditional-offer exclusions (bank / credit-card / debit-card / wallet / UPI / coupon / EMI / exchange) AND a positive "any user, no payment method required" instruction.
    3. **`dealdrop/src/lib/firecrawl/schema.ts`** — `FirecrawlScrapeResponseSchema.data.html` optional. `parseProductResponse(raw, priceOverride?)` accepts an optional positive-number override that replaces the LLM's `current_price`. Cycle-4: `PRODUCT_JSON_SCHEMA.properties.current_price.description` mirrors the cycle-4 prompt exclusions verbatim.

- verification:
  - `npx vitest run src/lib/firecrawl/` — **96 / 96 tests pass** (was 83 / 83 in cycle 3).
  - Full suite: `npx vitest run` — **222 / 222 tests pass** across 22 files (was 209 / 209 in cycle 3).
  - `npx eslint src/lib/firecrawl/` — clean.
  - `npx tsc --noEmit` — no new errors. Three pre-existing errors unrelated to this change.
  - **Manual UAT (user-side, REQUIRED, both URLs):**
    1. Restart `npm run dev`.
    2. **Amazon regression**: remove existing Cetaphil row, re-add https://amzn.in/d/04K6sdTU. Dev log: `structuralPrice: 363`. Dashboard: ≈ ₹363.
    3. **Flipkart cycle-4**: add the Galaxy A35 5G URL. Dev log: `structuralPrice: null`, `json.current_price: 20499`. Dashboard: ≈ ₹20,499 (NOT ₹19,474, NOT ₹36,999).
    4. Regression smoke for a third site (e.g. a Shopify store with JSON-LD).

- files_changed:
  - `dealdrop/src/lib/firecrawl/price-extractor.ts` — cycle-4 expansion: added `extractOpenGraphPrice` and `extractMicrodataPrice`; non-Amazon priority order now JSON-LD → OG → microdata → null.
  - `dealdrop/src/lib/firecrawl/scrape-product.ts` — cycle-4 PROMPT expanded with conditional-offer exclusions and a positive "any user pays without payment-method requirement" instruction.
  - `dealdrop/src/lib/firecrawl/schema.ts` — cycle-4 `current_price.description` mirrors the prompt exclusions.
  - `dealdrop/src/lib/firecrawl/__fixtures__/flipkart-product.html` — NEW. Fabricated minimal Flipkart-style PDP fixture with synthesized JSON-LD `@graph` and OG product meta carrying the captured prices.
  - `dealdrop/src/lib/firecrawl/price-extractor.test.ts` — +13 cycle-4 tests (36 total) covering OG, microdata, priority order, the Flipkart fixture, the no-signal real-world case, and Amazon-must-not-fall-through-to-OG.

## Cycles

- cycle 1: identified under-specified prompt + JSON-schema description. Tightened both. Manual UAT failed — same captured price.
- cycle 2: investigated WHY the cycle-1 fix had no effect. Confirmed Firecrawl's response cache was masking the prompt change. Added `maxAge: 0` and `console.log` instrumentation. Manual UAT failed — captured price still 426.87.
- cycle 3: ground-truth dev-log evidence showed the LLM still returns 426.87 even with cache bypassed and strengthened prompt — the LLM is picking the value from Amazon's JSON-LD island. Implemented structural HTML extraction with site-specific Amazon selectors + JSON-LD fallback. The structural extractor's price (when non-null) overrides the LLM value. 83/83 firecrawl tests + 209/209 full suite pass; lint clean; no new typecheck errors. **Amazon UAT passed (Cetaphil ₹363).** Flipkart UAT regression discovered.
- cycle 4: ground-truth dev-log + live Firecrawl probe confirmed Flipkart emits NO universal structured-data signals (no JSON-LD, no OG, no microdata). The cycle-3 structural extractor correctly returned null; the LLM fallback picked Flipkart's "best value with [bank] offer" promo (₹19,474) over the unconditional checkout price (₹20,499). Hardened the LLM prompt + JSON-schema description with explicit bank/credit-card/wallet/EMI/exchange exclusions and a positive "any user, no payment-method required" instruction. Widened the structural extractor with OG product meta and microdata `itemprop="price"` so well-behaved retailers don't depend on the LLM at all. 96/96 firecrawl tests + 222/222 full suite pass; lint clean; no new typecheck errors. **Pending user UAT for both URLs.**
