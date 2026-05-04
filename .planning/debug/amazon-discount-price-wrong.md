---
slug: amazon-discount-price-wrong
status: resolved
trigger: |
  Amazon product scrape returns wrong price — captures list/MRP-adjacent value (₹426.87) instead of the active sale price (₹363) when a 15% discount is applied.
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

- hypothesis: Firecrawl LLM extraction selects a non-checkout price (MRP-adjacent / per-100ml / EMI / Subscribe-&-Save / tax-inclusive sub-line) because both the request prompt and the JSON-Schema description for `current_price` are under-specified — they say "current price (not regular/was price)" but never enumerate the dozens of look-alike prices on Amazon's PDP nor anchor selection to the Buy button.
- next_action: (resolved — fix applied)
- test: Existing 16 firecrawl scrape-product tests pass unchanged; the only prompt assertion is `/product_name/i` which the new wording still matches.
- expecting: Re-adding https://amzn.in/d/04K6sdTU through the dashboard should now capture ≈ ₹363, not ₹426.87.

## Evidence

- timestamp: 2026-05-04 (cycle 1) — Static read of `dealdrop/src/lib/firecrawl/scrape-product.ts` showed PROMPT (line 28-29) is a single under-specified sentence: "Extract product_name, current_price (numeric), currency_code (ISO 4217 alpha-3), product_image_url from this e-commerce product page." No mention of checkout vs MRP, no exclusions, no anchor to the Buy button.
- timestamp: 2026-05-04 (cycle 1) — Static read of `dealdrop/src/lib/firecrawl/schema.ts` showed `current_price.description` (line 28-32) only says "Numeric current price (not regular/was price). Parse any formatting like '$1,299.99' to 1299.99. Return null if no price is visible." Insufficient guidance for Amazon-style PDPs that surface MRP, MRP-tax-inclusive sub-line, per-100ml unit price, EMI, Subscribe-&-Save, bundle, and post-discount price simultaneously.
- timestamp: 2026-05-04 (cycle 1) — Static read of `parseProductResponse` in schema.ts confirmed it does only nullability/shape checks (positive number, ISO-4217 regex). No price-selection logic. Whatever Firecrawl's LLM returns flows verbatim to `products.current_price`. Therefore the fix surface is the request layer (prompt + schema description), not the parser.
- timestamp: 2026-05-04 (cycle 1) — Captured value ₹426.87 ≈ ₹429 × 0.995, which is NOT the MRP and NOT the deal price. Most likely a secondary price field on the Amazon page (possibly a "deal of the day" stale figure, a per-100ml display, or a near-MRP figure from a JSON-LD island). Confirms the LLM is picking *some* price, just not the right one — consistent with under-specified guidance, inconsistent with a structural bug.

## Eliminated Hypotheses

- "URL normalization is stripping query params that select the right variant" — eliminated by reading `dealdrop/src/lib/firecrawl/url.ts`; normalization preserves the full path and host.
- "parseProductResponse is rounding or transforming the price" — eliminated by static read; it only checks `typeof number && isFinite && > 0` and passes the value through unchanged.
- "Firecrawl is returning a stale cached page" — implausible; the captured value doesn't match the live MRP either, so it's not a stale snapshot — it's a wrong-field selection.

## Resolution

- root_cause: The Firecrawl extraction layer delegates 100% of price selection to the LLM, but both signals that govern selection are under-specified. (1) The PROMPT in `dealdrop/src/lib/firecrawl/scrape-product.ts` (was lines 28-29) contained no guidance about which of an Amazon PDP's many price-like values to pick. (2) The `current_price.description` inside `PRODUCT_JSON_SCHEMA` in `dealdrop/src/lib/firecrawl/schema.ts` (was lines 28-32) only excluded "regular/was price" — it did not exclude M.R.P., MRP-tax-inclusive sub-line, per-unit prices, EMI, Subscribe-&-Save, bundle, shipping, or unselected-variant prices. With no anchor to the Buy / Add-to-Cart button and no enumeration of exclusions, the LLM selected a near-MRP secondary value (₹426.87) instead of the active deal price (₹363). The parser (`parseProductResponse`) is a passive shape-checker; it cannot rescue a bad selection.

- fix: Two surgical edits at the request layer, no code-flow change:
  1. **`dealdrop/src/lib/firecrawl/scrape-product.ts`** — Replaced the single-sentence PROMPT with a multi-line prompt that (a) defines `current_price` as the ACTIVE CHECKOUT PRICE the buyer would pay if they clicked Buy / Add to Cart, (b) anchors selection to the price displayed adjacent to the primary Buy / Add-to-Cart / Checkout button, (c) explicitly enumerates exclusions (M.R.P. / list / "was" / strike-through, the tax-inclusive sub-line near M.R.P., per-unit prices, EMI / monthly installments, Subscribe & Save, bundle / combo / add-on, shipping, unselected-variant prices), and (d) instructs that for discounted products the post-discount deal price MUST be returned, not the pre-discount M.R.P. The prompt still contains the literal token `product_name`, so the existing test assertion (`expect(body.formats[0].prompt).toMatch(/product_name/i)` in `scrape-product.test.ts:251`) still passes.
  2. **`dealdrop/src/lib/firecrawl/schema.ts`** — Tightened `PRODUCT_JSON_SCHEMA.properties.current_price.description` with the same anchor (Buy/Add-to-Cart-adjacent), the same enumerated exclusion list, and the same explicit "post-discount deal price, not M.R.P." instruction. Preserved the existing format-parsing instruction ("$1,299.99" → 1299.99) and the null-when-no-price clause.

- verification:
  - `npm test` — **177 / 177 tests pass**, including all 16 in `src/lib/firecrawl/scrape-product.test.ts` and all 12 in `src/lib/firecrawl/schema.test.ts`. No test changes were required.
  - `npx eslint src/lib/firecrawl/scrape-product.ts src/lib/firecrawl/schema.ts` — **clean** (no errors, no warnings on changed files). The repo-wide `npm run lint` reports 346 pre-existing errors / 111 warnings; none are in the changed files and none are introduced by this fix.
  - `npx tsc --noEmit` — three pre-existing errors (two in `.next/types/*` auto-generated files, one in `src/lib/products/get-user-products.test.ts:121`); zero new errors from this fix. The two changed files typecheck cleanly.
  - **Manual UAT (user-side, REQUIRED):** Re-add https://amzn.in/d/04K6sdTU through the DealDrop dashboard and confirm the captured price is ≈ ₹363 (the live Amazon deal price). For regression coverage, also add (a) one non-discounted Amazon product to confirm normal-price extraction still works, and (b) one non-Amazon product (e.g. Flipkart, Myntra, or any retailer used in earlier testing) to confirm no cross-site regression. The original ₹426.87 capture should not recur.

- files_changed:
  - `dealdrop/src/lib/firecrawl/scrape-product.ts` — replaced the `PROMPT` constant
  - `dealdrop/src/lib/firecrawl/schema.ts` — tightened `current_price.description` inside `PRODUCT_JSON_SCHEMA`
