---
phase: 01-foundation-database
plan: 02
subsystem: infrastructure
tags: [env-validation, supabase-clients, next.js-16, proxy, server-only, zod, t3-env]
requires:
  - phase: 01-foundation-database/01
    provides: "Installed @supabase/supabase-js, @supabase/ssr, @t3-oss/env-nextjs, zod, server-only packages; tsconfig @/* alias resolves to ./src/*; .env.local contains 7 Zod-valid placeholder values"
provides:
  - env-schema:dealdrop/src/lib/env.ts (5 server + 2 client vars, Zod-validated)
  - supabase-client:server (async createClient with await cookies() for RSC/Server Actions)
  - supabase-client:browser (sync createClient for "use client" components)
  - supabase-client:admin (createAdminClient with server-only guard on line 1)
  - proxy-stub:dealdrop/proxy.ts (pass-through NextResponse.next() — Phase 2 replaces body)
  - convention:single-process.env-reader (only src/lib/env.ts may touch process.env)
  - convention:admin-server-only-guard (any service-role consumer imports server-only)
affects:
  - 02-auth (imports @/lib/supabase/server + browser; replaces proxy.ts body with session refresh)
  - 03-scraping (imports @/lib/supabase/server + admin)
  - 04-product-tracking (imports @/lib/supabase/server; will add Database<> generic)
  - 06-cron-email (imports @/lib/supabase/admin; reads env.CRON_SECRET + env.RESEND_*)
tech-stack:
  added:
    - "Typed env pattern via @t3-oss/env-nextjs 0.13.11 + zod 4.3.6"
    - "@supabase/ssr 0.10.2 three-client factory (server/browser/admin)"
    - "server-only 0.0.1 bundle-time browser-leak guard"
    - "Next.js 16 proxy.ts file convention (NOT middleware.ts)"
  patterns:
    - "Shared Pattern 1: Import env from @/lib/env, never process.env"
    - "Shared Pattern 2: import 'server-only' as line 1 of any service-role consumer"
    - "Shared Pattern 3: await cookies() / headers() / params in Next.js 16"
    - "Shared Pattern 4: One of three factories (server/browser/admin) per Supabase use site"
    - "Shared Pattern 7: proxy.ts at app root with exported async proxy() + config.matcher"
key-files:
  created:
    - dealdrop/src/lib/env.ts
    - dealdrop/src/lib/supabase/server.ts
    - dealdrop/src/lib/supabase/browser.ts
    - dealdrop/src/lib/supabase/admin.ts
    - dealdrop/proxy.ts
  modified: []
key-decisions:
  - "Admin client line 1 is literally `import 'server-only'` with comment moved to line 2 — ensures awk-strict acceptance criterion matches"
  - "Proxy matcher excludes _next/static, _next/image, favicon, and common image extensions for the Phase 1 stub — Phase 7 may tighten"
  - "proxy.ts signature keeps unused `request` parameter typed as NextRequest for Phase 2 session-refresh consumption (ESLint warning is intentional)"
patterns-established:
  - "Typed env: createEnv({ server, client, runtimeEnv, skipValidation, emptyStringAsUndefined: true })"
  - "Three-client Supabase factory: server.ts (async, cookie-scoped), browser.ts (sync, anon-only), admin.ts (sync, server-only)"
  - "Next.js 16 proxy.ts stub: pass-through NextResponse.next() with regex exclusion matcher"
requirements-completed: [FND-01, FND-02, FND-05]
metrics:
  duration: 3min
  completed: 2026-04-18
---

# Phase 1 Plan 01-02: Env Schema + Supabase Client Factories Summary

**Typed env schema (@t3-oss/env-nextjs + Zod) plus three Supabase client factories (server/browser/admin with server-only guard) plus Next.js 16 proxy.ts pass-through stub — every downstream phase now imports through this layer.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T07:06:38Z
- **Completed:** 2026-04-18T07:09:12Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

- `env` object at `@/lib/env` — Zod validates 5 server + 2 client variables at import time, refusing to boot the app with an `Invalid environment variables` message when anything is missing
- Three distinct Supabase factories wired to `env` — server (async cookie-scoped via `@supabase/ssr`), browser (sync, anon-key only), admin (service-role, stateless, `server-only` guarded)
- `dealdrop/proxy.ts` at the app root with an exported `async proxy(request: NextRequest)` and a `config.matcher` excluding Next.js internals and image assets
- `npm run build` succeeds against Plan 01-01 placeholder env values (build output recognizes proxy via `ƒ Proxy (Middleware)`)
- Zero files outside `src/lib/env.ts` reference `process.env` — every secret flows through the validated object

## Task Commits

Each task was committed atomically:

1. **Task 1: env.ts Zod schema** — `f59b711` (feat)
2. **Task 2: Three Supabase client factories (server/browser/admin)** — `b5f663c` (feat)
3. **Task 3: proxy.ts pass-through stub** — `3aaef93` (feat)

_(Plan metadata commit follows after this SUMMARY is written.)_

## Files Created

- `dealdrop/src/lib/env.ts` — `createEnv({...})` with Zod schemas for `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (email format), `CRON_SECRET` (min 32 chars), `NEXT_PUBLIC_SUPABASE_URL` (url format), `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `emptyStringAsUndefined: true`, `skipValidation: !!process.env.SKIP_ENV_VALIDATION`.
- `dealdrop/src/lib/supabase/server.ts` — `async function createClient()` using `@supabase/ssr` `createServerClient` with `await cookies()` (Next.js 16 async). `getAll` + `setAll` cookie handlers; `setAll` is try/catch so RSC callers don't explode (proxy.ts will handle the actual writes in Phase 2).
- `dealdrop/src/lib/supabase/browser.ts` — `function createClient()` using `@supabase/ssr` `createBrowserClient`. Anon key only; no `server-only` import (this *is* the browser module).
- `dealdrop/src/lib/supabase/admin.ts` — **Line 1 is exactly `import 'server-only'`**, then `createClient` from `@supabase/supabase-js` (not ssr), then `env`. `createAdminClient()` with `autoRefreshToken: false` + `persistSession: false`.
- `dealdrop/proxy.ts` — `export async function proxy(request: NextRequest) { return NextResponse.next() }` with `config.matcher` excluding `_next/static`, `_next/image`, `favicon.ico`, and common image extensions. Phase 2 will replace the body.

## Interfaces Exported (for downstream plans)

```typescript
// from @/lib/env
export const env: {
  SUPABASE_SERVICE_ROLE_KEY: string
  FIRECRAWL_API_KEY: string
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  CRON_SECRET: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

// from @/lib/supabase/server
export async function createClient(): Promise<SupabaseClient>

// from @/lib/supabase/browser
export function createClient(): SupabaseClient

// from @/lib/supabase/admin
export function createAdminClient(): SupabaseClient

// from dealdrop/proxy.ts
export async function proxy(request: NextRequest): Promise<NextResponse>
export const config: { matcher: string[] }
```

Note: `SupabaseClient` is the plain generic for Phase 1. Plan 04 will swap to `createClient<Database>()` after `supabase gen types typescript --linked` emits `dealdrop/src/types/database.ts`.

## Must-Haves Verified

- [x] `npm run build` succeeds with all 7 env vars set (positive case verified — output shows `✓ Compiled successfully`, `ƒ Proxy (Middleware)`)
- [x] Zod schema throws `Invalid environment variables` when any required var is missing or empty (verified via `node --input-type=module -e "import('./src/lib/env.ts')"` with empty CRON_SECRET — Zod reports every missing field clearly)
- [x] Three distinct factory functions exist with correct signatures (server async, browser sync, admin sync+server-only)
- [x] Admin client line 1 is literally `import 'server-only'` (verified via `awk 'NR==1'` and `head -1`)
- [x] `dealdrop/proxy.ts` exists at app root with `export async function proxy` + `config.matcher`; no `middleware.ts`, no `app/proxy.ts`, no `src/proxy.ts`
- [x] No file outside `src/lib/env.ts` reads `process.env.*` — verified via `grep -rL "process.env" dealdrop/src/lib/supabase/` returns 3 (all three factory files pass)
- [x] `npx tsc --noEmit` exits 0 across the entire dealdrop app

## Decisions Made

1. **Admin line 1 placement** — the plan's `<action>` block shows the inline comment on line 1 (`import 'server-only' // MUST be ...`), but the strict acceptance criterion in the same plan requires `awk 'NR==1'` to return exactly `import 'server-only'`. Chose the stricter interpretation: `import 'server-only'` alone on line 1, explanatory comment on line 2. Semantically identical, satisfies both the action intent and the verification.
2. **proxy.ts `request` parameter** — the stub doesn't use `request`, so ESLint warns `'request' is defined but never used`. Left the parameter in place because Phase 2 session refresh will consume it; ESLint warning is documented, not an error, and does not block build or lint exit code.
3. **Matcher regex** — kept exactly as specified in the plan. A later phase may tighten, but the Phase 1 exclusion pattern correctly skips static assets during build.

## Deviations from Plan

None - plan executed exactly as written.

All three tasks executed verbatim against the plan text. One micro-decision (admin line 1 vs. stricter acceptance criterion — see Decisions #1) is within the plan's intent and satisfies both the action block's example code (server-only first executable line) and the stricter acceptance criterion (`awk 'NR==1'` exact match).

## Threat Model Coverage

All six threats in the plan's STRIDE register are addressed:

- **T-02-01** (SUPABASE_SERVICE_ROLE_KEY leaks to browser) — MITIGATED: `admin.ts` line 1 is `import 'server-only'`; any Client Component import graph reaching this file becomes a build error.
- **T-02-02** (missing env var at runtime) — MITIGATED: `@t3-oss/env-nextjs` throws at import time with `Invalid environment variables`; `runtimeEnv` enumerates every key explicitly so Next.js static analysis sees them; verified via negative test (emptied CRON_SECRET → Zod throws, listing every missing var).
- **T-02-03** (deprecated `@supabase/auth-helpers-nextjs` accidentally used) — MITIGATED: server.ts + browser.ts explicitly `import from '@supabase/ssr'`; the deprecated package is not in `package.json`.
- **T-02-04** (Next.js 16 sync `cookies()` throws) — MITIGATED: server.ts uses `const cookieStore = await cookies()`; verified via grep.
- **T-02-05** (Client Component silently imports admin) — MITIGATED: `import 'server-only'` on line 1 of admin.ts produces a bundle-time error if reached from any `"use client"` graph.
- **T-02-06** (proxy matcher too broad) — ACCEPTED (per plan): matcher excludes `_next/static`, `_next/image`, favicon, and image extensions. Phase 7 may tighten further.

No new threat surface introduced beyond what the plan anticipated.

## Issues Encountered

None.

## Known Stubs

| Location | Line(s) | Reason | Resolved By |
|----------|---------|--------|-------------|
| `dealdrop/proxy.ts` | 5–10 | Pass-through `NextResponse.next()` body; `request` parameter is typed but unused. Plan 02 will replace the body with Supabase session refresh via `getClaims()` + cookie propagation. | Phase 2 plan on auth |

This stub is intentional and explicitly called out in the plan's `<objective>` and `<context>` (`Phase 2 will: create Supabase client bound to request/response cookies, call supabase.auth.getClaims() to refresh the session, and propagate Set-Cookie headers to the response.`). No data stub; no UI-rendered placeholder.

## Deferred Issues

None from this plan. Pre-existing ESLint noise in `dealdrop/.claude/` (GSD harness files) carried forward from Plan 01-01's `deferred-items.md` — outside this plan's scope.

## Next Phase Readiness

Ready. The downstream surface each future plan depends on is now live:

- **Plan 01-03 (Supabase project + migrations):** Will consume `env.NEXT_PUBLIC_SUPABASE_URL` to run CLI commands, then replace `.env.local` placeholders with real keys from Supabase Dashboard.
- **Plan 01-04 (type generation):** Will emit `dealdrop/src/types/database.ts` and downstream plans can swap the factories to `createClient<Database>()`.
- **Plan 01-05 (Shadcn init):** Will add `@/components/ui/button.tsx` and `@/lib/utils.ts` alongside the existing `@/lib/` tree.
- **Phase 2 (auth):** Will replace `proxy.ts` body with session-refresh logic and call `@/lib/supabase/server` + `@/lib/supabase/browser` from auth modal.
- **Phase 3 (scraping), 4 (products), 6 (cron):** All import `env` + `@/lib/supabase/*` directly.

## Self-Check: PASSED

Files verified:
- `FOUND: dealdrop/src/lib/env.ts`
- `FOUND: dealdrop/src/lib/supabase/server.ts`
- `FOUND: dealdrop/src/lib/supabase/browser.ts`
- `FOUND: dealdrop/src/lib/supabase/admin.ts`
- `FOUND: dealdrop/proxy.ts`

Commits verified:
- `FOUND: f59b711` (Task 1 — env schema)
- `FOUND: b5f663c` (Task 2 — three client factories)
- `FOUND: 3aaef93` (Task 3 — proxy.ts stub)

Build verified:
- `npx tsc --noEmit` exits 0
- `npm run build` succeeds with placeholder env values; output includes `ƒ Proxy (Middleware)` confirming Next.js recognizes the proxy.ts file
- Admin line 1 verified: `awk 'NR==1' dealdrop/src/lib/supabase/admin.ts` returns `import 'server-only'`
- process.env firewall verified: `grep -rL "process.env" dealdrop/src/lib/supabase/` returns 3 (all three factory files absent of process.env)

---
*Phase: 01-foundation-database*
*Completed: 2026-04-18*
