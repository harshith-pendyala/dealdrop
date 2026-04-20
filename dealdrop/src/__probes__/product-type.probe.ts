// W5 fix: permanent type-level regression guard. `tsc --noEmit` will fail
// if `Product.last_scrape_failed_at` is ever removed from the generated
// `Tables<'products'>` type (e.g., if Plan 02 migration regen ever regresses).
//
// This file intentionally has no runtime effect — the `void` discards the
// access expression at zero cost, and the file is excluded from the
// production build output (src/__probes__/ is not imported by any app code).

import type { Product } from '@/lib/products/get-user-products'

const p = {} as Product
void p.last_scrape_failed_at // MUST type-check; fails compilation if the column is missing
