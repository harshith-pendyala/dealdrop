// Type contracts for the Firecrawl integration.
// Source of truth for the closed failure-reason union (D-02) and ProductData shape (CONTEXT §specifics).
// Consumed by: scrape-product.ts (this phase), add-product Server Action (Phase 4), cron handler (Phase 6).
//
// Do NOT add a `detail` field to the failure branch (D-04 — no scraping internals leak to callers).
// Do NOT add new reason strings without updating CONTEXT.md — Phase 4 toast map and Phase 6 metrics key on exact strings.

export type ScrapeFailureReason =
  | 'invalid_url'
  | 'network_error'
  | 'scrape_timeout'
  | 'missing_price'
  | 'missing_name'
  | 'invalid_currency'
  | 'unknown'

// Cycle-5: `mrp` is OPTIONAL. The LLM emits it as a separate slot when the
// page shows a strike-through / "was" / list price; otherwise null. Structural
// (Amazon / JSON-LD) paths may also populate it. Adding the field here is
// non-breaking — every existing consumer continues to ignore it.
export type ProductData = {
  name: string
  current_price: number
  currency_code: string
  image_url: string | null
  mrp: number | null
}

export type ScrapeResult =
  | { ok: true; data: ProductData }
  | { ok: false; reason: ScrapeFailureReason }

// --- Compile-time assertion that the union is exactly the 7 reasons above.
// If someone adds, removes, or renames a reason, either _ExpectedReasons or _ActualReasons below
// becomes wrong and `_ExhaustivenessCheck` fails typecheck.
type _ExpectedReasons =
  | 'invalid_url'
  | 'network_error'
  | 'scrape_timeout'
  | 'missing_price'
  | 'missing_name'
  | 'invalid_currency'
  | 'unknown'
type _Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false
type _ExhaustivenessCheck = _Equal<ScrapeFailureReason, _ExpectedReasons> extends true
  ? true
  : never
// If this line ever shows a TS error, the reason union drifted from the CONTEXT.md D-02 contract.
const _exhaustiveness: _ExhaustivenessCheck = true
void _exhaustiveness
