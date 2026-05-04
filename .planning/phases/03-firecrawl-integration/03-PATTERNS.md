# Phase 3: Firecrawl Integration - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 7 (6 new + 1 modified)
**Analogs found:** 5 / 7 (2 files have no in-repo analog — flagged as Wave 0 new-pattern)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `dealdrop/src/lib/firecrawl/scrape-product.ts` | service (server-only HTTP client) | request-response | `dealdrop/src/lib/supabase/admin.ts` | role-match (server-only guard + env import + module export shape) |
| `dealdrop/src/lib/firecrawl/normalize-url.ts` | utility (pure function) | transform | `dealdrop/src/lib/utils.ts` | partial (both are small pure-fn utilities; env.ts is the closer match for Zod usage) |
| `dealdrop/src/lib/firecrawl/product-schema.ts` | config (schema constants + Zod schemas) | transform | `dealdrop/src/lib/env.ts` | role-match (Zod schema composition pattern) |
| `dealdrop/src/lib/firecrawl/types.ts` *(optional — may be colocated in scrape-product.ts per RESEARCH.md §Component Responsibilities)* | model (type definitions) | — | `dealdrop/src/types/database.ts` | partial (DB generated types drive `ProductData` shape) |
| `dealdrop/src/lib/firecrawl/scrape-product.test.ts` | test (unit) | request-response | *(none — no test files exist in repo)* | **NONE** — Wave 0 new-pattern |
| `dealdrop/src/lib/firecrawl/normalize-url.test.ts` | test (unit, pure-fn) | transform | *(none)* | **NONE** — Wave 0 new-pattern |
| `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` | fixture (committed JSON asset) | — | *(none)* | **NONE** — Wave 0 new-pattern |
| `dealdrop/vitest.config.ts` *(modified — new file)* | config (test runner) | — | *(none)* | **NONE** — Wave 0 new-pattern |
| `dealdrop/package.json` *(modified — add `test` scripts + vitest devDeps)* | config | — | existing scripts block at `dealdrop/package.json:5-10` | exact (script-block pattern) |

---

## Pattern Assignments

### `dealdrop/src/lib/firecrawl/scrape-product.ts` (service, request-response)

**Analog:** `dealdrop/src/lib/supabase/admin.ts`

**Why this analog:** Only in-repo file that combines (a) `import 'server-only'` as line 1, (b) `import { env } from '@/lib/env'` for a server-only API key, (c) exports a single server-only factory/function consumed by Server Actions. Same role (privileged HTTP client) and same data flow (request-response with an external service).

**Line-1 server-only guard** (`dealdrop/src/lib/supabase/admin.ts:1-3`):

```ts
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
```

**Copy verbatim** — keep the explanatory comment on line 2 identical. The URL reference on line 3 should be updated to the Firecrawl docs reference if relevant, or dropped.

**Env import pattern** (`dealdrop/src/lib/supabase/admin.ts:4-5`):

```ts
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
```

**Apply to Phase 3** — replace the `createClient` import with Phase 3's internal module imports. The `@/lib/env` import stays identical. `FIRECRAWL_API_KEY` is already declared in the server block at `dealdrop/src/lib/env.ts:8`.

**Env usage pattern** (`dealdrop/src/lib/supabase/admin.ts:7-18`):

```ts
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY, // server-only env var, never NEXT_PUBLIC_
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**Pattern to copy:**
- Read env values through `env.X` only — never `process.env.X`
- Add an inline `// server-only env var, never NEXT_PUBLIC_` comment next to the sensitive key access to make the invariant visible at callsite

**Applied to Phase 3:**

```ts
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`, // server-only env var, never NEXT_PUBLIC_
},
```

**Core request-response pattern** — no direct in-repo analog for `fetch` + retry + `AbortSignal.timeout`. Use the sketch in `RESEARCH.md` §"Full `scrapeProduct` implementation sketch" (lines 522-695) as the source of truth. Discriminated-union result shape mirrors the Phase 2 auth result style called out in `03-CONTEXT.md:103-104`.

**Error handling pattern:**
- Every failure path returns `{ ok: false, reason }` — see D-01 (`03-CONTEXT.md:37`)
- Before returning, `console.error(...)` with full context server-side — see D-04 (`03-CONTEXT.md:43`)
- NO `detail` field in the return — see D-04 (`03-CONTEXT.md:43`)
- NEVER log the Bearer token (security §"Logged secret leak" at `03-RESEARCH.md:863`)

**Cross-reference to avoid:** `dealdrop/src/actions/auth.ts:8-11` uses `redirect('/?auth_error=1')` on failure. **Do NOT copy this** — Server Action-level UX handling is Phase 4's job. `scrapeProduct` returns data; it does not redirect or set cookies.

---

### `dealdrop/src/lib/firecrawl/normalize-url.ts` (utility, transform)

**Analog:** `dealdrop/src/lib/utils.ts` (weak — only in-repo pure utility) + `dealdrop/src/lib/env.ts` (stronger — Zod schema composition precedent)

**Small-utility file shape** (`dealdrop/src/lib/utils.ts:1-6`):

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Pattern to copy:**
- Imports at top, single named export, no default export
- No `import 'server-only'` here — per `03-RESEARCH.md:222`, `normalizeProductUrl` should remain available for potential client reuse (Phase 4 form dedupe). If Phase 4 needs a client-callable copy, split; otherwise leave the guard off this specific file. Planner decides.

**Zod schema composition** (`dealdrop/src/lib/env.ts:5-28`):

```ts
import { z } from 'zod'

export const env = createEnv({
  server: {
    FIRECRAWL_API_KEY: z.string().min(1),
    // ...
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    // ...
  },
  // ...
})
```

**Pattern to copy:**
- `import { z } from 'zod'` (package name, not a path alias)
- Use Zod's composable validators: `.min`, `.max`, `.url`, `.regex`, `.refine`
- Keep schema definitions at module top-level as named exports when they're reused

**Applied to Phase 3** — the `UrlSchema` shown in `03-RESEARCH.md:425-439` chains `.max(2048).url().refine(...)` exactly in this style; use that sketch verbatim.

**Reference for WHATWG URL usage:** `03-RESEARCH.md` §"Don't Hand-Roll" row 2 mandates `new URL(url)` + `URLSearchParams` manipulation rather than string-split approaches.

---

### `dealdrop/src/lib/firecrawl/product-schema.ts` (config, transform)

**Analog:** `dealdrop/src/lib/env.ts` (same idiom: module-scope Zod schema + a typed exported constant)

**Module structure** (`dealdrop/src/lib/env.ts:1-5, 28`):

```ts
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({ /* ... */ })
```

**Pattern to copy:**
- Top-line `// Source:` comment citing the docs URL when the pattern is non-obvious (the JSON Schema for Firecrawl should cite `https://docs.firecrawl.dev/api-reference/endpoint/scrape`)
- Module-level exported constants (`export const PRODUCT_JSON_SCHEMA = {...} as const`) following the same placement as `env`
- Zod schemas as `export const XSchema = z.object({...})` alongside the plain JSON Schema constant — matches the research sketch at `03-RESEARCH.md:467-517`

**ProductData shape derivation** — `dealdrop/src/types/database.ts:50-60` is the source of truth:

```ts
products: {
  Row: {
    created_at: string
    currency: string
    current_price: number
    id: string
    image_url: string | null   // ← nullable at the DB layer; ProductData MUST mirror this
    name: string
    updated_at: string
    url: string
    user_id: string
  }
  // ...
}
```

**Applied to Phase 3 `ProductData` type** — fields must match the DB write keys exactly per `03-CONTEXT.md:118`. The four keys are: `name` (string), `current_price` (number), `currency_code` (string) — **note:** DB column is `currency`, the return-type field is `currency_code` per CONTEXT §specifics; Phase 4 is responsible for the `currency_code` → `currency` rename at insert time — and `image_url` (string | null). See Pitfall 6 at `03-RESEARCH.md:408-412` for the null-vs-required rule on `image_url`.

---

### `dealdrop/src/lib/firecrawl/types.ts` (model, optional)

**Note:** `03-RESEARCH.md:195` places types colocated in `scrape-product.ts` rather than a separate file. **Planner's call** whether to split. If split:

**Analog:** `dealdrop/src/types/database.ts`

**Pattern to copy:**
- Pure `.ts` file with only type exports (no runtime code)
- Export named types — the three exports are already specified in the research sketch at `03-RESEARCH.md:534-552`: `ScrapeFailureReason`, `ProductData`, `ScrapeResult`

**Recommendation:** Keep types in `scrape-product.ts` (as the research sketch does) to match the `supabase/admin.ts` precedent of not splitting trivial type exports into separate files. A separate `types.ts` is only warranted if Phase 4 or Phase 6 wants to import the types without paying the `server-only` guard at the type-only import site — which TypeScript type-only imports handle anyway. Recommend: do NOT create `types.ts`.

---

### `dealdrop/src/lib/firecrawl/scrape-product.test.ts` (test, unit)

**Analog:** **NONE — first test file in the repo.** Flag as Wave 0 new-pattern.

**Guidance (no in-repo analog):** Use the Vitest conventions from `03-RESEARCH.md` §"Test Framework" (lines 779-784) and §"Phase Requirements → Test Map" (lines 798-822). Minimal shape:

```ts
// File: dealdrop/src/lib/firecrawl/scrape-product.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { scrapeProduct } from './scrape-product'
import fixture from './__fixtures__/firecrawl-v2-scrape-response.json'

describe('scrapeProduct', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.restoreAllMocks() })

  it('invalid_url non-http', async () => {
    const result = await scrapeProduct('file:///etc/passwd')
    expect(result).toEqual({ ok: false, reason: 'invalid_url' })
  })
  // ... 20+ more, one per row in §"Phase Requirements → Test Map"
})
```

**Establishes (for the rest of the project):**
- Test files colocated with source (`foo.ts` + `foo.test.ts` in the same dir)
- Vitest `describe`/`it`/`expect` style (Jest-compatible API)
- `vi.stubGlobal('fetch', ...)` for HTTP mocking at the `scrapeProduct` seam
- Fixtures under `__fixtures__/` subdir of the module under test

**Explicit reason-vs-test mapping:** Every row in `03-RESEARCH.md:798-822` is a named test case and must become one `it(...)` block.

---

### `dealdrop/src/lib/firecrawl/normalize-url.test.ts` (test, unit, pure-fn)

**Analog:** NONE — same situation as above. Pure-function tests are simpler (no `fetch` mock required).

```ts
// File: dealdrop/src/lib/firecrawl/normalize-url.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeProductUrl } from './normalize-url'

describe('normalizeProductUrl', () => {
  it('normalize lowercase + trailing slash', () => {
    expect(normalizeProductUrl('HTTPS://Example.COM/X/')).toBe('https://example.com/X')
  })
  it('normalize tracking vs variant', () => {
    expect(
      normalizeProductUrl('https://shop.example.com/p?sku=123&utm_source=x&gclid=y')
    ).toBe('https://shop.example.com/p?sku=123')
  })
  // ... covers D-05, D-06, D-08 rows from Test Map
})
```

---

### `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` (fixture)

**Analog:** NONE — first committed fixture in the repo.

**Guidance:** A captured live Firecrawl v2 response against a stable product URL (e.g., `https://www.amazon.com/dp/B08N5WRWNW` per `03-RESEARCH.md:743`). Committed so unit tests are deterministic and decoupled from live Firecrawl rate limits/cost. `.json` extension, pretty-printed for diff-readability. Placed under a `__fixtures__/` subdir to match Jest's convention and make the test-supporting status obvious.

---

### `dealdrop/vitest.config.ts` (config, new file)

**Analog:** NONE — no vitest config exists. `dealdrop/next.config.ts` is the nearest TS config file shape but serves a different purpose.

**Guidance** (per `03-RESEARCH.md:779-784` and §"Wave 0 Gaps" lines 831-835):

```ts
// File: dealdrop/vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',         // per §Validation Architecture: test env 'node'
    include: ['src/**/*.test.ts'],
    globals: false,               // prefer explicit `import { describe, it } from 'vitest'`
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),  // match tsconfig.json `"@/*": ["./*", "./src/*"]`
    },
  },
})
```

**Match to tsconfig** — `dealdrop/tsconfig.json:21-22` defines `"@/*": ["./*", "./src/*"]`. The vitest alias must mirror this so `import { env } from '@/lib/env'` resolves under test.

---

### `dealdrop/package.json` (config, modified)

**Analog:** `dealdrop/package.json:5-10` (existing `scripts` block) and `dealdrop/package.json:31-41` (`devDependencies`)

**Pattern to copy:**
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to the scripts block, following the existing `dev`/`build`/`start`/`lint` ordering convention
- Add `"vitest": "^3"` and `"@vitest/coverage-v8": "^3"` to `devDependencies`, keeping alphabetical order

**Applied:**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

## Shared Patterns

### Pattern A: `server-only` Line-1 Guard

**Source of truth:** `dealdrop/src/lib/supabase/admin.ts:1-3`

```ts
import 'server-only'
// MUST be the first line — throws at bundle time if imported into a Client Component.
```

**Apply to:**
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — **mandatory** (reads `FIRECRAWL_API_KEY`)
- `dealdrop/src/lib/firecrawl/product-schema.ts` — **optional** (the file is pure data; the guard is cheap insurance if the JSON Schema constant ever grows to include secret fragments)
- `dealdrop/src/lib/firecrawl/normalize-url.ts` — **no** (kept client-importable to reserve optionality for Phase 4 client dedupe per `03-RESEARCH.md:222`)
- Test files — **no** (Vitest runs in node env; guard would be a no-op or a parse-time headache)

**Invariant:** The guard must be line 1, before any other import. Build-time enforcement is verified by the deliberate bad-import smoke test described in `03-RESEARCH.md:745-748` (Open Question 2).

### Pattern B: Env Access via Typed `env`

**Source of truth:** `dealdrop/src/lib/env.ts:1-28` + `dealdrop/src/lib/supabase/admin.ts:5, 10`

```ts
import { env } from '@/lib/env'
// ...
Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
```

**Apply to:**
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — read `env.FIRECRAWL_API_KEY`

**NEVER** use `process.env.FIRECRAWL_API_KEY` directly — `03-CONTEXT.md:81` and `03-RESEARCH.md:312` both lock this.

### Pattern C: Discriminated-Union Result (no throws for expected failures)

**Source of truth:** Pattern established in Phase 2 auth flow (see `03-CONTEXT.md:104`); the closed union is specified in D-02 at `03-CONTEXT.md:39`.

```ts
export type ScrapeResult =
  | { ok: true; data: ProductData }
  | { ok: false; reason: ScrapeFailureReason }
```

**Apply to:**
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — every return path

**Invariants:**
- No `detail` field on the failure branch (D-04 at `03-CONTEXT.md:43`)
- The reason union is **closed** — do not add new reason strings without a CONTEXT.md update; Phase 4 and Phase 6 both key on the exact strings
- Throws are reserved for programming errors only — D-04 mandates wrapping uncaught errors as `reason: 'unknown'` at the top level

### Pattern D: Validate-at-Boundary Zod

**Source of truth:** `dealdrop/src/lib/env.ts:5-28` — validates env at module load. Same idiom applies at Phase 3's two I/O boundaries (URL in, Firecrawl response out).

```ts
import { z } from 'zod'
// Schema declared at module top-level, reusable
const Schema = z.object({ /* ... */ })
// Validation applied at the seam
const parsed = Schema.safeParse(input)
if (!parsed.success) { /* ... return typed failure ... */ }
```

**Apply to:**
- `dealdrop/src/lib/firecrawl/normalize-url.ts` — input URL validation
- `dealdrop/src/lib/firecrawl/product-schema.ts` — output response shape validation
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — orchestrates the two parsers + branch-ordered field checks (Pitfall 3 at `03-RESEARCH.md:354-384`)

**Special case — branch-ordered validation for response:** Do NOT collapse `missing_name` / `missing_price` / `invalid_currency` into a single `safeParse`. Each gets its own pre-check before the final wide Zod parse. Phase 4 toast copy depends on the reason-level granularity.

### Pattern E: Server-side logging on failure (D-04)

**Apply to:** every failure path in `scrapeProduct`.

```ts
console.error('scrapeProduct: <specific reason>', { url: normalized, /* context */ })
return { ok: false, reason: 'missing_price' }
```

**Don't-log list** (security constraint from `03-RESEARCH.md:863`):
- NEVER log `env.FIRECRAWL_API_KEY` or the `Authorization` header value
- Logging the request body or URL is fine (the URL is user-supplied public data)
- Logging the Firecrawl error envelope is fine (no secrets in the response)

---

## No Analog Found

Files with no close match in the codebase — planner should use `03-RESEARCH.md` patterns as the primary source and flag these as new-pattern establishers for the rest of the project:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `dealdrop/src/lib/firecrawl/scrape-product.test.ts` | test | request-response | No test files exist in repo yet; Phase 3 establishes Vitest conventions |
| `dealdrop/src/lib/firecrawl/normalize-url.test.ts` | test | transform | Same — no test precedent |
| `dealdrop/src/lib/firecrawl/__fixtures__/firecrawl-v2-scrape-response.json` | fixture | — | No fixture directory convention exists; Phase 3 introduces `__fixtures__/` |
| `dealdrop/vitest.config.ts` | config | — | No test-runner config exists; Phase 3 introduces Vitest |

**Planner action for new-pattern files:** Surface "Wave 0 establishes repo test conventions" as an explicit Wave 0 scope item. Subsequent phases (4, 5, 6) will copy these test file shapes as their analogs.

---

## Metadata

**Analog search scope:**
- `dealdrop/src/lib/**` (utilities, server modules)
- `dealdrop/src/actions/**` (server actions — for error-handling idioms)
- `dealdrop/src/types/**` (type-definition conventions)
- `dealdrop/**/*.test.*` (test-file precedent — found none)
- `dealdrop/vitest.config.*` / `dealdrop/jest.config.*` (test config — found none)
- `dealdrop/package.json` (scripts + devDeps conventions)
- `dealdrop/tsconfig.json` (path alias to mirror in vitest.config.ts)

**Files scanned:** 16 source files + 3 config files

**Pattern extraction date:** 2026-04-19

**Key sources cited by line number:**
- `dealdrop/src/lib/supabase/admin.ts:1-18` — canonical server-only guard + env-based API key pattern
- `dealdrop/src/lib/env.ts:1-28` — Zod schema composition + `FIRECRAWL_API_KEY` declaration at line 8
- `dealdrop/src/lib/utils.ts:1-6` — small-utility file shape
- `dealdrop/src/types/database.ts:50-60` — `products` row columns that drive `ProductData` shape; `image_url` nullability at line 55
- `dealdrop/src/lib/supabase/server.ts:1-30` — server-side factory pattern (secondary reference; Phase 3 is not a factory but borrows the `import { env } from '@/lib/env'` convention)
- `dealdrop/src/actions/auth.ts:1-13` — Server Action error handling style (cited as what NOT to copy — Phase 3 does not redirect)
- `dealdrop/package.json:5-10, 11-30, 31-41` — scripts, deps, devDeps block formatting
- `dealdrop/tsconfig.json:21-22` — `@/*` path alias that vitest.config.ts must mirror
