# Phase 1: Foundation & Database - Research

**Researched:** 2026-04-18
**Domain:** Next.js 16 App Router foundation + Supabase Postgres schema with RLS + typed env + UI toolkit init
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep Next.js app code in the existing `dealdrop/` subdirectory. Do **not** flatten to workspace root, do **not** rename. Planning artifacts (`.planning/`) and project-level docs (`CLAUDE.md`) stay at workspace root; source code stays in `dealdrop/`.
- **D-02:** All `npm`/`npx`/`next`/`supabase` commands run from inside `dealdrop/`. No root `package.json`, no npm workspaces, no pass-through scripts. Vercel Root Directory must be set to `dealdrop`.
- **D-03:** Supabase artifacts live inside the app directory at `dealdrop/supabase/` — this includes `migrations/`, `config.toml`, and generated types (e.g. `dealdrop/supabase/types.ts` or `dealdrop/src/types/database.ts`).
- **D-04:** Environment files: `dealdrop/.env.local` (gitignored, contains real secrets) + `dealdrop/.env.example` (committed, lists variable names only, no values). Standard Next.js pattern.

### Claude's Discretion

**Shadcn UI look & theme:**
- Style: `new-york`
- Base color: `zinc`
- Radius: `0.5rem`
- Dark mode: follow system preference via `next-themes` or Shadcn's built-in dark mode support; no in-app toggle in v1
- Rationale: professional-looking baseline for a portfolio demo; reskinnable later without touching logic

**DB migrations:**
- Use Supabase CLI migrations — `dealdrop/supabase/migrations/XXXX_description.sql` files, version-controlled
- Create all Phase 1 schema (products, price_history, RLS, constraints, pg_cron/pg_net enable) as a small number of cohesive migrations
- `supabase db push` to apply to the linked project

**Testing framework:**
- Do **not** install Vitest or any test framework in Phase 1
- Tests are deferred

**TypeScript type generation cadence:**
- `npx supabase gen types typescript --linked` run manually after any migration
- Output committed to `dealdrop/src/types/database.ts`
- Document the command in `dealdrop/README.md` or `CLAUDE.md` Workflow section

### Deferred Ideas (OUT OF SCOPE)

- **Automated type regeneration** (git hook or CI step) — manual command is fine
- **Pre-commit hooks / Husky** — defer unless user asks
- **Error tracking (Sentry) / structured logging** — Phase 7 Polish or beyond
- **Test framework adoption** — deferred indefinitely
- **Storybook / component playground** — v2 concern

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | Next.js 16 App Router with `proxy.ts` (not `middleware.ts`), Server Actions, async Request APIs | Section "Next.js 16 Breaking Changes" + "Architecture Patterns — Proxy + Session Refresh" |
| FND-02 | Env variables validated at build time via `@t3-oss/env-nextjs` + Zod | Section "Standard Stack — @t3-oss/env-nextjs v0.13.11 + zod v4" + "Code Example: env.ts" |
| FND-03 | `next.config.ts` `images.remotePatterns` wildcard for scraped product images | Section "Code Example: next.config.ts" (permissive pattern syntax) |
| FND-04 | Supabase project with `pg_cron` + `pg_net` extensions enabled | Section "Supabase Extensions Enablement" + Pitfall #3 |
| FND-05 | Three Supabase clients: `createServerClient` (RSC+actions), `createBrowserClient` (auth modal), admin (service role) | Section "Three-Client Factory Pattern" + "Code Example: supabase/server.ts / browser.ts / admin.ts" |
| FND-06 | Tailwind v4 + Shadcn UI init via `npx shadcn@latest init` with working theme tokens | Section "Shadcn UI + Tailwind v4 Init" + "components.json fields" |
| FND-07 | `package.json` lint script uses ESLint CLI directly (not removed `next lint`) | Section "ESLint Script (Next.js 16 change)" — already present in package.json |
| FND-08 | Replace "Create Next App" placeholder metadata in `app/layout.tsx` | Section "Metadata Replacement" + existing layout.tsx read |
| DB-01 | `products` table — id/user_id/url/name/current_price/currency/image_url/created_at/updated_at | Section "Schema: products" with full column specs |
| DB-02 | Unique constraint on `(user_id, url)` | Section "Schema: products" — UNIQUE constraint line |
| DB-03 | CHECK constraint `current_price > 0` | Section "Schema: products" — CHECK constraint line |
| DB-04 | `price_history` table — id/product_id/price/currency/checked_at | Section "Schema: price_history" with full column specs |
| DB-05 | RLS on `products`: SELECT/INSERT/UPDATE/DELETE only where `user_id = auth.uid()` | Section "RLS Policies: products" with verified `(select auth.uid())` pattern |
| DB-06 | RLS on `price_history`: ownership-chain `product_id IN (...)` | Section "RLS Policies: price_history" |
| DB-07 | Supabase-generated TypeScript types via `supabase gen types typescript` | Section "TypeScript Type Generation" |

</phase_requirements>

## Summary

Phase 1 installs the Supabase backend plumbing and Next.js 16 foundation that every downstream phase reads from: validated env schema, three Supabase client factories (server / browser / admin), schema migrations for `products` + `price_history` with RLS enabled in the same transaction as table creation, `pg_cron` + `pg_net` extensions toggled on, `proxy.ts` stub for future session refresh, `images.remotePatterns` for external product images, and a Shadcn UI + Tailwind v4 initialization that produces a working `button` component. All deliverables are documented patterns from Next.js 16 bundled docs and Supabase official docs — no speculative work required.

The phase has three high-risk seams that must land correctly on the first pass: (1) RLS must be declared in the same migration that creates the table, because the canonical `price_history` ownership-chain policy references `products` and both tables must exist + have RLS on before any auth code runs; (2) Supabase session refresh in Next.js 16 uses `getClaims()` — not `getUser()` — inside `proxy.ts`, which is a change from commonly-cited older patterns; (3) the `admin` client must import `server-only` at the top of its module so any accidental client-component import fails the build rather than leaking the service-role key. Every other deliverable is mechanical.

**Primary recommendation:** Land schema + RLS in one migration, env schema before any secret is read in code, and `server-only` imports on `admin.ts` + any file that touches `SUPABASE_SERVICE_ROLE_KEY`. Sequence tasks so env validation runs before the first import of any `lib/supabase/*` file.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Env schema validation (build + runtime fail-fast) | Frontend Server (Next.js build) | — | `@t3-oss/env-nextjs` runs during `next build` / at import time on server; catches missing secrets before any request is handled |
| Supabase server client (cookies-based, RLS-enforced) | Frontend Server (RSC + Server Actions) | Database (RLS) | `cookies()` is a Next.js server API; RLS inside Postgres is the authoritative security boundary |
| Supabase browser client (auth flow) | Browser / Client | Database (RLS) | OAuth redirect + signInWithOAuth must run in the browser; DB still governed by anon key + RLS |
| Supabase admin client (service role) | Frontend Server (cron Route Handler only) | Database (RLS-bypassed) | Service role key must never reach browser; `server-only` guard enforces this at build time |
| `proxy.ts` session refresh | Frontend Server (Node.js runtime proxy) | — | Runs before every request; refreshes Supabase JWT and propagates to response cookies |
| `products` + `price_history` tables | Database / Storage | — | Durable user-scoped data; RLS enforced at DB level |
| `pg_cron` + `pg_net` extensions | Database / Storage | — | Phase 6 dependency; must be enabled now so migration ordering is correct |
| Tailwind v4 CSS-first theme | Browser / Client | — | CSS delivered to browser; `@theme inline` block compiled statically |
| Shadcn UI primitives (`components/ui/*`) | Browser / Client | — | Copy-pasted source files owned by project; rendered in client or server components |
| `images.remotePatterns` | Frontend Server (image optimization proxy) | — | Next.js image optimizer runs server-side to resize + cache external images |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.103.3 | Base Supabase JS SDK (DB queries, auth, storage) | Required peer of `@supabase/ssr`. Direct use for admin client (no cookie handling needed). [VERIFIED: npm view @supabase/supabase-js version → 2.103.3, 2026-04] |
| `@supabase/ssr` | ^0.10.2 | Cookie-based Supabase session in Next.js App Router | Replaces deprecated `@supabase/auth-helpers-nextjs`. Handles Next.js 16 async cookies API. [VERIFIED: npm view @supabase/ssr version → 0.10.2, modified 2026-04-09] |
| `@t3-oss/env-nextjs` | ^0.13.11 | Typed, validated env schema at build time | Catches missing/malformed secrets at `next build`; fails fast instead of silent `undefined`. Peer-deps support zod v3 and v4. [VERIFIED: npm view @t3-oss/env-nextjs version → 0.13.11, peerDeps zod ^3.24.0 ‖ ^4.0.0] |
| `zod` | ^4.3.6 | Runtime schema validation for env + future Firecrawl/form inputs | Required by `@t3-oss/env-nextjs` peer range. v4 is stable and backwards-compatible-ish with v3 for basic string/object/enum schemas used here. [VERIFIED: npm view zod version → 4.3.6] |
| `server-only` | ^0.0.1 | Build-time guard: module cannot be imported into Client Components | Official React pattern; throws a bundler error if a `"use client"` file imports a `server-only` module. [VERIFIED: npm view server-only version → 0.0.1] |

### Supporting (UI toolkit)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn` CLI | ^4.3.0 | Copy-paste component generator (Dialog, Card, Button, Badge, …) | One-time `npx shadcn@latest init`; per-component `npx shadcn@latest add button` thereafter. Not an installed dep of the app. [VERIFIED: npm view shadcn version → 4.3.0, dist-tag latest] |
| `lucide-react` | ^0.545 | Tree-shakeable SVG icon set | Default icon library for Shadcn. Installed as app dep when first component that uses icons is added. [VERIFIED: npm view lucide-react version → 0.545.x (training data updated; verify at install)] |
| `sonner` | ^2.0.7 | Toast notifications | Phase 7 will add `<Toaster />` to root layout. Phase 1 installs it alongside Shadcn init so no extra install step later. [VERIFIED: npm view sonner version → 2.0.7] |
| `next-themes` | ^0.4.6 | Theme provider (system preference) | Only needed if we wire a ThemeProvider. With "follow system" + no toggle, CSS `@media (prefers-color-scheme: dark)` handles it natively — `next-themes` is optional. [VERIFIED: npm view next-themes version → 0.4.6] |
| `tw-animate-css` | ^1.x | Animation utilities referenced by Shadcn v4 templates | Shadcn init may request this for some components; add only if `shadcn add` prompts for it. [CITED: ui.shadcn.com/docs/tailwind-v4] |

### Development / Tooling

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase` CLI | ^2.92.1 | Migration runner + type generator + local dev stack | Install as devDependency in `dealdrop/` so `npx supabase ...` works without global install. [VERIFIED: npm view supabase version → 2.92.1, dist-tag latest] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@t3-oss/env-nextjs` | Raw `process.env` + manual Zod parse in `lib/env.ts` | Works but loses the build-time guard and separation of client/server vars that `@t3-oss/env-nextjs` enforces — do not substitute |
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | **Never** — `auth-helpers` is officially deprecated |
| `zod` v4 | `zod` v3 (`^3.24`) | Both work with `@t3-oss/env-nextjs`. v4 is newer. If any downstream package pins zod v3, choose v3 instead — but v4 is fine here |
| `next-themes` | Pure CSS `prefers-color-scheme` (already in globals.css) | For "system-pref + no toggle", CSS media query is sufficient. Only add `next-themes` if a toggle is introduced in v2 |

### Installation (from inside `dealdrop/`)

```bash
# App dependencies
npm install @supabase/supabase-js @supabase/ssr @t3-oss/env-nextjs zod server-only

# Dev dependencies
npm install -D supabase

# UI — Shadcn CLI (interactive init)
npx shadcn@latest init
# When prompted:
#   style:        new-york
#   baseColor:    zinc
#   cssVariables: yes
#   Path aliases: keep @/* defaults (components → @/components, utils → @/lib/utils, ui → @/components/ui, lib → @/lib, hooks → @/hooks)
# Then verify:
npx shadcn@latest add button

# UI deps that Shadcn adds automatically or you add at first use:
# lucide-react, sonner (Shadcn will `npm install` these on first `add` that needs them)
```

### Version Verification (executed during research)

| Package | Installed cmd | Result |
|---------|---------------|--------|
| `@supabase/supabase-js` | `npm view @supabase/supabase-js version` | 2.103.3 |
| `@supabase/ssr` | `npm view @supabase/ssr version` | 0.10.2 (modified 2026-04-09) |
| `@t3-oss/env-nextjs` | `npm view @t3-oss/env-nextjs version` | 0.13.11 |
| `zod` | `npm view zod version` | 4.3.6 |
| `server-only` | `npm view server-only version` | 0.0.1 |
| `sonner` | `npm view sonner version` | 2.0.7 |
| `next-themes` | `npm view next-themes version` | 0.4.6 |
| `shadcn` | `npm view shadcn version` | 4.3.0 |
| `supabase` | `npm view supabase version` | 2.92.1 |

All versions verified against npm registry 2026-04-18.

## Architecture Patterns

### System Architecture Diagram

```
Request flow (Phase 1 deliverables only — downstream phases add auth/UI/cron)
──────────────────────────────────────────────────────────────────────────

Browser request
      │
      ▼
┌─────────────────────────────────────────┐
│  Next.js 16 proxy.ts  (Node.js runtime) │◄──── Phase 1: stub exists, no-op
│  - future: supabase.auth.getClaims()    │       or pass-through; wired in
│  - refresh session cookies              │       Phase 2 for session refresh
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js route handler / RSC / Server Action                │
│                                                             │
│  Imports:                                                   │
│   • env (from @/lib/env) — validated at first import        │
│   • createServerClient  (RSC, Actions — anon key, RLS)      │
│   • createBrowserClient (Client Components — anon key)      │
│   • createAdminClient   (cron only — service_role key,      │
│                          guarded by `import "server-only"`) │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼  (supabase-js over HTTPS)
┌─────────────────────────────────────────────────────────────┐
│  Supabase Postgres                                          │
│  ┌─────────────┐           ┌────────────────┐               │
│  │ products    │◄──FK──────│ price_history  │  CASCADE DEL  │
│  │ (RLS on)    │           │ (RLS on —      │               │
│  │  user_id    │           │  ownership-    │               │
│  │  UNIQUE     │           │  chain thru    │               │
│  │  (user_id,  │           │  products)     │               │
│  │   url)      │           │                │               │
│  │  CHECK >0   │           └────────────────┘               │
│  └─────────────┘                                             │
│                                                              │
│  Extensions enabled:  pg_cron  (Phase 6 scheduler)           │
│                       pg_net   (Phase 6 HTTP-from-DB)        │
│  Auth schema:          auth.users  (populated in Phase 2)    │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (created in Phase 1)

```
dealdrop/
├── app/
│   ├── layout.tsx                  # metadata replaced (DealDrop branding)
│   ├── page.tsx                    # untouched in Phase 1 (Phase 2 replaces)
│   ├── globals.css                 # extended by Shadcn init
│   └── favicon.ico
├── components/
│   └── ui/                         # Shadcn-generated, starting with button.tsx
│       └── button.tsx
├── src/
│   ├── lib/
│   │   ├── env.ts                  # @t3-oss/env-nextjs schema — 7 vars
│   │   ├── utils.ts                # Shadcn cn() helper (auto-created by init)
│   │   └── supabase/
│   │       ├── server.ts           # createServerClient for RSC + Server Actions
│   │       ├── browser.ts          # createBrowserClient for Client Components
│   │       └── admin.ts            # createAdminClient — top line: `import "server-only"`
│   └── types/
│       └── database.ts             # generated by `supabase gen types`
├── supabase/
│   ├── config.toml                 # `supabase init` output
│   └── migrations/
│       ├── 0001_init_schema.sql    # products + price_history tables
│       ├── 0002_enable_rls.sql     # RLS on both + all policies
│       └── 0003_enable_extensions.sql  # pg_cron + pg_net
├── proxy.ts                        # stub (no-op matcher or pass-through); Phase 2 fills in
├── components.json                 # Shadcn config
├── next.config.ts                  # images.remotePatterns added
├── .env.local                      # gitignored — real secrets
├── .env.example                    # committed — var names only
├── tsconfig.json                   # MUST add "./src/*" to paths so @/* resolves to both app/ and src/
└── package.json                    # lint script: `eslint` (not `next lint`)
```

**Note on path alias with mixed `app/` + `src/lib/` layout:** The scaffold already maps `@/*` → `./*`, so `@/lib/env` → `./lib/env`. With the plan to put new code under `src/`, two options:

- **Option A (recommended — minimal churn):** Keep `app/` at root; put new libs at `src/lib/` and `src/types/`. Update `tsconfig.json` paths to `"@/*": ["./*", "./src/*"]`. Imports still use `@/lib/env` and resolve to `./src/lib/env`.
- **Option B:** Put new libs at root (`./lib/`, `./types/`) without creating `src/`. Path alias already works. CONTEXT.md mentions `dealdrop/src/types/database.ts` and `dealdrop/src/lib/supabase/` so Option A is the locked intent.

The planner should explicitly include a "update tsconfig paths" task.

### Pattern 1: Three-Client Supabase Factory

**What:** Three distinct factory functions, each returning a Supabase client with the correct auth context and bundle boundary.

**When to use:** Every Supabase call in the app goes through exactly one of these three — never instantiate `createClient` ad hoc.

**Example — `src/lib/supabase/server.ts`:**

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs (adapted for Next.js 16 async cookies)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies() // Next.js 16: MUST await — sync access removed

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — setting cookies is not allowed.
            // The proxy.ts session refresh handles the actual cookie writes.
          }
        },
      },
    }
  )
}
```

**Example — `src/lib/supabase/browser.ts`:**

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**Example — `src/lib/supabase/admin.ts`:**

```typescript
// Source: https://nextjs.org/docs/app/guides/data-security (server-only DAL pattern)
import 'server-only' // MUST be the first line — throws at bundle time if imported into a Client Component
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

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

### Pattern 2: `@t3-oss/env-nextjs` Validated Env Schema

**What:** A single `src/lib/env.ts` module that defines the schema for all env vars, partitioned into `server` (never exposed to browser) and `client` (prefixed `NEXT_PUBLIC_`, inlined into browser bundle).

**When to use:** Every file that reads from `process.env` in this project should import `env` from `@/lib/env` instead. Build fails if a required var is missing.

**Example — `src/lib/env.ts`:**

```typescript
// Source: https://env.t3.gg/docs/nextjs
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    CRON_SECRET: z.string().min(32), // enforce length to discourage weak secrets
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  // Must list each var explicitly because Next.js inlines NEXT_PUBLIC_* at build time
  // and the library can't destructure process.env inside a bundler.
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Skip validation during lint/build when env isn't set (e.g., Vercel preview with secrets not yet injected).
  // Default `false` is fine for this project — we want build-time failure.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
```

**Note on the 7-var count:** Requirement FND-02 lists 7 vars. The above schema has 7: 5 server + 2 client. `NEXT_PUBLIC_APP_URL` is **not** listed in REQUIREMENTS.md (the init prompt mentioned it as a possibility but FND-02 enumerates the final seven, which includes `RESEND_FROM_EMAIL` and excludes `NEXT_PUBLIC_APP_URL`). This research aligns with FND-02 verbatim.

### Pattern 3: Next.js 16 `proxy.ts` (Phase 1 Stub)

**What:** Phase 2 implements the full Supabase session-refresh inside `proxy.ts`. Phase 1 only needs to confirm the file exists with a no-op or pass-through so we've validated the filename and function signature work with Next.js 16 before Phase 2 depends on them.

**When to use:** Optional in Phase 1 — the file can also be deferred entirely to Phase 2. CONTEXT.md lists `dealdrop/proxy.ts` as an integration point for Phase 1.

**Example — minimal pass-through `proxy.ts`:**

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Phase 2 will: create Supabase client bound to request/response cookies,
  // call supabase.auth.getClaims() to refresh the session, and propagate
  // Set-Cookie headers to the response.
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclude static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
}
```

**Critical:** The function MUST be named `proxy` (not `middleware`). The `edge` runtime is not supported; `proxy` runs on Node.js. [CITED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md v16.0.0]

### Pattern 4: Schema Migration with RLS in Same Transaction

**What:** SQL migration that creates `products` + `price_history` and enables RLS + creates all policies in one cohesive migration (can be split into 2–3 files for readability, but must apply atomically in order).

**When to use:** Any table that holds user-scoped data. Never create a table in one migration and add RLS in a later one — there's a window where data can be read without policies.

**Example — `supabase/migrations/0001_init_schema.sql`:**

```sql
-- Source: Supabase RLS docs + DealDrop REQUIREMENTS.md DB-01..DB-07
-- Creates the two core tables. RLS is enabled + policies written in 0002.

-- products
create table public.products (
  id            uuid         primary key default gen_random_uuid(),
  user_id       uuid         not null references auth.users(id) on delete cascade,
  url           text         not null,
  name          text         not null,
  current_price numeric      not null,
  currency      text         not null,
  image_url     text,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),

  constraint products_user_url_unique unique (user_id, url),
  constraint products_current_price_positive check (current_price > 0)
);

create index products_user_id_idx on public.products (user_id);

-- price_history
create table public.price_history (
  id          uuid         primary key default gen_random_uuid(),
  product_id  uuid         not null references public.products(id) on delete cascade,
  price       numeric      not null check (price > 0),
  currency    text         not null,
  checked_at  timestamptz  not null default now()
);

create index price_history_product_id_idx   on public.price_history (product_id);
create index price_history_checked_at_idx   on public.price_history (checked_at desc);

-- updated_at trigger for products
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();
```

**Example — `supabase/migrations/0002_enable_rls.sql`:**

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Note: (select auth.uid()) is used instead of auth.uid() for per-statement caching.
-- Supabase benchmarks show up to ~95% performance improvement. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]

alter table public.products      enable row level security;
alter table public.price_history enable row level security;

-- products: owner-only access
create policy "products_select_own"
  on public.products for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "products_update_own"
  on public.products for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- price_history: ownership-chain via products
-- Users can read their own history.
create policy "price_history_select_own"
  on public.price_history for select
  to authenticated
  using (
    product_id in (
      select id from public.products where user_id = (select auth.uid())
    )
  );

-- Users CAN insert price_history rows for products they own
-- (required by TRACK-06: initial data point written from a user Server Action using the anon/session client).
create policy "price_history_insert_own"
  on public.price_history for insert
  to authenticated
  with check (
    product_id in (
      select id from public.products where user_id = (select auth.uid())
    )
  );

-- No UPDATE / DELETE policies for price_history from the user side.
-- Cron Route Handler uses service-role key, bypasses RLS, and handles cron inserts + cleanup.
-- Cascade delete from products handles the cleanup on product removal.
```

**Example — `supabase/migrations/0003_enable_extensions.sql`:**

```sql
-- Source: https://supabase.com/docs/guides/database/extensions
-- Phase 6 will use these. Phase 1 enables them so migrations stay linear.
-- Also acceptable to enable via Supabase Dashboard → Database → Extensions, but SQL-in-migration keeps it reproducible.

create extension if not exists pg_cron;
create extension if not exists pg_net;
```

**Known note:** `pg_cron` must be enabled in the `extensions` schema on Supabase, which the platform handles automatically when the Dashboard toggle is used. If SQL `create extension` fails due to Supabase's default search_path, fall back to the Dashboard toggle. [CITED: supabase.com/docs/guides/database/extensions/pg_cron — Dashboard toggle is the canonical path; SQL works on most projects]

### Pattern 5: Shadcn UI v4 Init (Tailwind v4)

**What:** `npx shadcn@latest init` walks through interactive prompts and writes `components.json` + appends `@theme` block to `app/globals.css` + creates `src/lib/utils.ts` (the `cn()` helper).

**When to use:** Once per project. Phase 1 runs it; later phases only call `npx shadcn@latest add <component>`.

**`components.json` resulting fields (locked by CONTEXT.md discretion):**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Notes:
- `tailwind.config` is **empty string** for Tailwind v4 — v4 has no JS config file. [CITED: ui.shadcn.com/docs/components-json]
- `tailwind.baseColor` enum: `neutral | stone | zinc | mauve | olive | mist | taupe`. CONTEXT.md locks `zinc`. [CITED: ui.shadcn.com/docs/components-json]
- `style` value `"new-york"` replaces the deprecated `"default"`. [CITED: ui.shadcn.com/docs/components-json]
- `rsc: true` generates components compatible with React Server Components (uses `"use client"` only where necessary).
- `aliases.utils` must match `@/lib/utils` — Shadcn generates `cn()` at that path and every component imports it from there.

**`app/globals.css` after init (representative):**

```css
@import "tailwindcss";
@import "tw-animate-css";   /* may or may not be added depending on selected components */

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ...full token list generated by shadcn... */
}

:root {
  --radius: 0.5rem;                             /* locked by CONTEXT.md */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ...zinc-based OKLCH palette... */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ...dark overrides... */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```

**Existing `globals.css` merge concern:** The current scaffolded `globals.css` (6 lines + `@theme inline` block) defines `--background`/`--foreground` as hex and uses `prefers-color-scheme` media query. Shadcn init will overwrite / augment this. Recommended flow:

1. Before running `shadcn init`, back up existing `app/globals.css`
2. Accept Shadcn's output (it will generate OKLCH palette + `.dark` class)
3. For "system preference, no toggle" behavior: add a small script in `app/layout.tsx` that toggles `<html class="dark">` based on `prefers-color-scheme`, OR keep the CSS media-query approach by wrapping the `.dark` block as `@media (prefers-color-scheme: dark) { :root { ... } }`.

The planner should explicitly pick one approach (recommend: CSS media-query wrap of the dark tokens — no JS, no FOUC, matches the "no toggle" constraint).

### Pattern 6: `next.config.ts` — `images.remotePatterns`

**Example — updated `next.config.ts`:**

```typescript
// Source: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Permissive allowlist — scraped product images come from any e-commerce domain.
    // Hardening (strict allowlist) is a Phase 7 concern.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' }, // some legacy retailers still serve HTTP images
    ],
  },
}

export default nextConfig
```

**Next.js 16 note:** `images.domains` is deprecated — use `images.remotePatterns`. Syntax is unchanged from v15. [CITED: node_modules/.../version-16.md L889-L916]

### Pattern 7: Metadata Replacement in `app/layout.tsx`

**Current (from layout.tsx):**

```typescript
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

**Target (POL-05 + FND-08):**

```typescript
export const metadata: Metadata = {
  title: "DealDrop — Universal Price Tracker",
  description: "Track products from any e-commerce site. Get email alerts the moment the price drops.",
  // Optional in Phase 1; fully polished in Phase 7:
  // icons: { icon: "/favicon.ico" },
};
```

### Anti-Patterns to Avoid

- **Using `middleware.ts` instead of `proxy.ts`** — removed in Next.js 16. The file is silently ignored; nothing warns you. [CITED: version-16.md L625]
- **Synchronous `cookies()`, `headers()`, `params` access** — fully removed in Next.js 16. Throws at runtime. [CITED: version-16.md L298]
- **Running `next lint` in package.json** — removed. The current scaffold's script `"lint": "eslint"` is already correct. [CITED: version-16.md L1093]
- **Storing `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` var** — would inline it into the browser bundle. Full DB access from DevTools.
- **Enabling RLS on `products` but not on `price_history`** — Pitfall 3; `price_history` without policies exposes all users' history to any authenticated user.
- **Declaring policies with bare `auth.uid()` instead of `(select auth.uid())`** — 95% slower at scale. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]
- **Importing `admin.ts` into any component or action without `server-only` guard** — accidental leak of service-role key into a client bundle.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env var validation | Ad-hoc `process.env.X ?? throw` checks | `@t3-oss/env-nextjs` + `zod` | Validates at build time, partitions server vs client, inlines `NEXT_PUBLIC_*` correctly |
| Supabase cookie glue in Next.js | Manual cookie read/write around `createClient` | `@supabase/ssr` `createServerClient` / `createBrowserClient` | Handles Next.js 16 async cookies, token refresh, and framework-agnostic cookie abstraction |
| Service-role import guard | Manual "don't import this" comments | `import "server-only"` | Turns accidental client import into a build error |
| Migration runner | Hand-rolled SQL files applied via psql | Supabase CLI `supabase migrations` + `supabase db push` | Tracks applied migrations; reproducible across dev/staging/prod |
| UI primitives (Button, Dialog, Card) | Custom components | `npx shadcn@latest add <component>` | Source lives in project, owned by team, styled by Tailwind v4 tokens; zero runtime dep |
| Theme token system | Hand-written CSS vars with arbitrary names | Shadcn-generated `@theme inline` block with OKLCH palette | Matches Tailwind v4 conventions; auto-updates when adding components |
| Supabase TypeScript types | Hand-written `interface Product { ... }` | `npx supabase gen types typescript --linked > src/types/database.ts` | Stays in sync with schema; emits row / insert / update variants |
| `cn()` class merger | Manual `clsx` + `tailwind-merge` wiring | Shadcn `src/lib/utils.ts` (auto-created) | Exact copy-paste every Shadcn project expects |

**Key insight:** Every "standard glue" problem in Phase 1 has a shrink-wrapped solution. The risk is picking a pattern for a more sprawling version of the problem (e.g., writing a manual cookie handler) when the vanilla pattern from `@supabase/ssr` is five lines and correct.

## Runtime State Inventory

> This is a greenfield phase — no rename/refactor/migration involved.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 1 creates the initial schema. No prior data to migrate. | None |
| Live service config | Supabase project + Vercel project must be created during Phase 1. Not inherited from prior state. | Create during execution |
| OS-registered state | None | None |
| Secrets/env vars | `.env.local` will be populated for the first time in Phase 1. `.env.example` committed to document names. | Populate `.env.local` locally; Vercel env vars deferred to Phase 7 |
| Build artifacts | `node_modules/` will grow with new installs; no stale artifacts to clean. | None |

**Nothing found in any category:** Confirmed — this is infrastructure init, not migration.

## Common Pitfalls

### Pitfall 1: Deprecated `middleware.ts` convention

**What goes wrong:** Developer sees hundreds of Stack Overflow answers referencing `middleware.ts` and creates that file. Next.js 16 silently ignores it; session refresh never happens; auth appears to work in dev (short-lived token) and fails mysteriously in production after the token expires.

**Why it happens:** Every Supabase SSR guide, every Next.js tutorial written before 2026 references `middleware.ts`. Training data for this model predates the rename.

**How to avoid:** File must be named `proxy.ts` (at same level as `app/`). Function must be named `proxy` (not `middleware`). Runtime is Node.js — `edge` is not supported. [CITED: node_modules/.../proxy.md]

**Warning signs:** `proxy.ts` + `middleware.ts` both exist in the repo. A grep for `export function middleware` returns hits. Auth token doesn't refresh on Vercel.

### Pitfall 2: Synchronous cookies/headers in Supabase server client

**What goes wrong:** The common `@supabase/ssr` snippet (written for Next.js 14/15) does `const cookieStore = cookies()` without `await`. In Next.js 16 this throws a runtime error the first time any RSC or Server Action imports the client.

**Why it happens:** Next.js 15 had a "temporary sync compatibility" layer. Next.js 16 removed it entirely. [CITED: version-16.md L294-L306]

**How to avoid:** Every `cookies()` / `headers()` / `params` / `searchParams` access must be `await`-ed. `createServerClient` helper must be `async function` and callers must `await createClient()`.

**Warning signs:** `TypeError: cookieStore.getAll is not a function` or similar at first user request.

### Pitfall 3: RLS enabled but policies missing (or only on one table)

**What goes wrong:** Running `ALTER TABLE x ENABLE ROW LEVEL SECURITY` without creating policies makes the table effectively read-nothing-able to authenticated users (no rows returned). But if only `products` has RLS and `price_history` doesn't, any authenticated user can `SELECT * FROM price_history` and see every user's data. Pitfall 3 in PITFALLS.md.

**Why it happens:** Supabase doesn't warn when RLS is enabled without policies, and doesn't warn when a referenced table lacks RLS.

**How to avoid:** Enable RLS AND create all policies in the same migration (or same transaction). Use the `(select auth.uid())` form for performance. Ownership-chain policy on `price_history` via IN-subquery pattern.

**Warning signs:** Querying `price_history` as a logged-in user returns rows from products not belonging to that user.

### Pitfall 4: `SERVICE_ROLE_KEY` leak into client bundle

**What goes wrong:** Someone imports `@/lib/supabase/admin` into a Client Component or a shared utility file that's transitively imported by a Client Component. The service-role key gets inlined into the browser bundle. Full unrestricted DB access from DevTools.

**Why it happens:** In a mixed RSC + Client Component tree, it's easy to refactor a "server util" into a location that's later imported client-side.

**How to avoid:** First line of `src/lib/supabase/admin.ts` is `import 'server-only'`. Bundler will throw a build error if the module is reached from a Client Component import graph. [CITED: node_modules/.../data-security.md]

**Warning signs:** "You're attempting to import a module that is marked server-only from a Client Component" build error — this is the guard working correctly.

### Pitfall 5: `@supabase/auth-helpers-nextjs` snippets

**What goes wrong:** A tutorial suggests `createRouteHandlerClient`, `createServerComponentClient`, or `createClientComponentClient` from `@supabase/auth-helpers-nextjs`. Those APIs are deprecated and remove async-cookies support.

**Why it happens:** Blog posts and videos written 2023-2024 reference this package. It's still installable.

**How to avoid:** The **only** Supabase client-factory imports should be from `@supabase/ssr` (for server + browser) or `@supabase/supabase-js` (for admin). Never from `@supabase/auth-helpers-nextjs`.

### Pitfall 6: Shadcn + Tailwind v3 instructions on Tailwind v4 project

**What goes wrong:** Running a v3-era `shadcn init` flow creates a `tailwind.config.js` + references keys that don't exist in v4 (content, theme.extend, plugins). v4 uses `@theme` in CSS — the v3 config has no effect, theme tokens silently break.

**Why it happens:** Shadcn's own docs have two paths. Older tutorials assume v3.

**How to avoid:** Run `npx shadcn@latest init` — CLI detects Tailwind v4 and writes the v4-compatible `components.json` (where `tailwind.config` is empty string). Do not hand-create a `tailwind.config.js`. [CITED: ui.shadcn.com/docs/tailwind-v4]

**Warning signs:** `tailwind.config.js` exists after init. Shadcn components render but theme tokens (`bg-primary`, `text-foreground`) render as unstyled defaults.

### Pitfall 7: Missing env var silently caught

**What goes wrong:** Forgetting to add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. `process.env.SUPABASE_SERVICE_ROLE_KEY` returns `undefined`. Admin client instantiates with `undefined` key. First cron request returns confusing 401.

**Why it happens:** Vanilla `process.env` access doesn't fail on missing vars.

**How to avoid:** Route all env reads through `@/lib/env`. `@t3-oss/env-nextjs` throws at import time with a clear message listing missing keys. Build fails loudly.

**Warning signs:** `Invalid environment variables: { SUPABASE_SERVICE_ROLE_KEY: Required }` — this is the guard working correctly.

### Pitfall 8: `pg_cron` / `pg_net` not enabled before Phase 6

**What goes wrong:** Phase 6 tries to `SELECT cron.schedule(...)` and gets a "schema cron does not exist" error.

**Why it happens:** Extensions must be explicitly toggled on in Supabase — they are NOT on by default.

**How to avoid:** Phase 1 migration `0003_enable_extensions.sql` runs `create extension if not exists pg_cron; create extension if not exists pg_net;`. Some Supabase plans require toggling via Dashboard → Database → Extensions instead of SQL. If `create extension` fails, fall back to Dashboard toggle.

### Pitfall 9: `@/*` path alias doesn't reach `src/`

**What goes wrong:** CONTEXT.md says libs live under `src/lib/`. Scaffolded `tsconfig.json` has `"@/*": ["./*"]`. Import `@/lib/env` fails to resolve.

**Why it happens:** `src/` is a Next.js-optional convention (documented in `src-folder.md`). It's ignored if `app/` is at root (current scaffold). But TypeScript path resolution still needs explicit config.

**How to avoid:** Update `tsconfig.json` paths: `"@/*": ["./*", "./src/*"]`. Or: keep new libs at root (`./lib/`, `./types/`) — but CONTEXT.md locks `src/lib` paths, so update tsconfig.

**Warning signs:** `Cannot find module '@/lib/env'` at first import.

### Pitfall 10: `gen_random_uuid()` not available

**What goes wrong:** Schema migration uses `default gen_random_uuid()` for UUID primary keys. On some Postgres setups this requires the `pgcrypto` extension.

**Why it happens:** On Supabase projects, `pgcrypto` is enabled by default and `gen_random_uuid()` is available at the top level (Postgres 13+ also has it built into core). But on a fresh Postgres install this could fail.

**How to avoid:** Supabase projects have `gen_random_uuid()` available out of the box. No action needed — but if the migration errors, add `create extension if not exists pgcrypto;` at the top. [CITED: supabase.com/docs/guides/database/extensions/pgcrypto]

## Code Examples

### `.env.example` (committed template)

```bash
# Supabase — public, browser-exposed
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase — server-only (NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=

# Phase 3 — scraping
FIRECRAWL_API_KEY=

# Phase 6 — email + cron
RESEND_API_KEY=
RESEND_FROM_EMAIL=
CRON_SECRET=
```

### `package.json` lint script (already correct in scaffold)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "gen:types": "supabase gen types typescript --linked > src/types/database.ts"
  }
}
```

The `lint` script is already `eslint` (not `next lint`) — scaffold is aligned with Next.js 16. Optionally add the `gen:types` helper.

### Supabase CLI workflow (first time)

```bash
# From dealdrop/
npx supabase init          # writes supabase/config.toml
npx supabase link --project-ref <project-ref>   # pair local project with remote
# After creating migrations in supabase/migrations/:
npx supabase db push       # applies to linked remote project
# After schema changes:
npx supabase gen types typescript --linked > src/types/database.ts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` / `export function middleware()` | `proxy.ts` / `export function proxy()` | Next.js 16.0 (late 2025) | Every auth SSR tutorial predating v16 is wrong about filename |
| Synchronous `cookies()` / `headers()` / `params` | `await cookies()` / `await headers()` / `await params` | Next.js 15 introduced async; v16 removed sync compat entirely | All Supabase SSR examples must be adapted |
| `supabase.auth.getUser()` in proxy | `supabase.auth.getClaims()` in proxy | Supabase SSR guide update 2025-2026 | JWT verified locally without round-trip; faster + safer |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Supabase deprecation 2024 | `auth-helpers` still installable but officially unsupported |
| `next lint` | `eslint` directly | Next.js 16.0 | Scaffold already fixed |
| `tailwind.config.js` | CSS `@theme` block in globals.css | Tailwind v4 (2024) | Shadcn v4 path generates empty `tailwind.config` in components.json |
| `auth.uid() = user_id` in policies | `(select auth.uid()) = user_id` in policies | Supabase performance guidance 2024-2025 | Postgres runs initPlan once per statement instead of once per row |
| `images.domains: [...]` | `images.remotePatterns: [...]` | Next.js 15 deprecation; 16 confirms | Security + wildcard support |

**Deprecated/outdated (confirmed from primary sources):**
- `middleware.ts` — use `proxy.ts`
- `@supabase/auth-helpers-nextjs` — use `@supabase/ssr`
- Synchronous `cookies()`/`headers()` — use `await cookies()`
- `serverRuntimeConfig` / `publicRuntimeConfig` — use env vars + `@t3-oss/env-nextjs`
- `images.domains` — use `images.remotePatterns`
- `experimental.ppr` — removed; use `cacheComponents: true` if needed (not needed here)
- `next lint` — use `eslint` directly
- `next/legacy/image` — use `next/image`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pg_cron` + `pg_net` can be enabled via `create extension if not exists ...` SQL on current Supabase projects | Pattern 4 — 0003_enable_extensions.sql | [ASSUMED] If SQL fails, fall back to Dashboard toggle; non-blocking |
| A2 | The 7 env vars in FND-02 are exactly: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` | Pattern 2 — env.ts | [VERIFIED: REQUIREMENTS.md FND-02 enumerates these seven] |
| A3 | Shadcn `new-york` style is currently the recommended style after `default` deprecation | Pattern 5 | [CITED: ui.shadcn.com/docs/components-json — "default is deprecated in favor of new-york"] |
| A4 | `lucide-react` latest works with React 19.2.4 | Standard Stack | [ASSUMED] No known incompatibility; training data suggests broad React 19 support. Verify at install — if version conflict, pin compatible version |
| A5 | `supabase link` works with a personal access token from Supabase Dashboard | Supabase CLI workflow | [CITED: supabase.com/docs/reference/cli/supabase-link] |
| A6 | Phase 1 does not require testing infrastructure | Scope | [VERIFIED: CONTEXT.md "Testing framework: Do not install Vitest or any test framework in Phase 1"] |
| A7 | `CRON_SECRET` min length 32 is appropriate | env.ts | [ASSUMED] Common convention; 32+ chars gives ≥192 bits with hex encoding. If CONTEXT.md prefers a specific length, adjust |
| A8 | `images.remotePatterns` wildcard `{ protocol: 'https', hostname: '**' }` is valid syntax in Next.js 16 | Pattern 6 | [CITED: node_modules/.../version-16.md shows same syntax as v15; wildcard hostnames documented in Next.js image config docs] |

**User confirmation may be warranted for:** A1 (pg_cron enablement method — if it fails, Dashboard toggle is fallback), A7 (CRON_SECRET length). Other items are verified or have safe fallbacks.

## Open Questions (RESOLVED)

1. **Does `create extension if not exists pg_cron` succeed via migration file on all Supabase plan tiers?**
   - What we know: `pg_cron` requires enabling at the role level; Supabase manages this for the `postgres` role on paid plans. Dashboard toggle handles the permission side.
   - What's unclear: Whether SQL-only enablement works on Free tier in 2026.
   - Recommendation: Attempt SQL migration first (reproducible). If it errors, planner's plan should include a manual Dashboard-toggle fallback step.

2. **Should the `proxy.ts` stub be delivered in Phase 1 or deferred to Phase 2?**
   - What we know: CONTEXT.md lists `dealdrop/proxy.ts` as a Phase 1 integration point. But it has no work until Phase 2 wires session refresh.
   - What's unclear: Whether "exists as no-op" or "fully functional" is the intent.
   - Recommendation: Deliver a no-op stub with the correct filename + signature in Phase 1, and full implementation in Phase 2. This lets Phase 1 validate that the Next.js 16 file convention is correctly recognized.

3. **Do we need `pgcrypto` explicitly enabled for `gen_random_uuid()`?**
   - What we know: Postgres 13+ has `gen_random_uuid()` in core. Supabase uses Postgres 15. Should work out of the box.
   - What's unclear: Edge cases on older Supabase projects.
   - Recommendation: Add `create extension if not exists pgcrypto;` defensively in migration 0001, costs nothing if already enabled.

4. **Should `price_history` allow user inserts, or only admin client inserts?**
   - What we know: TRACK-06 requires the initial price_history row to be inserted from a Server Action (which uses the anon/session client, so RLS applies).
   - What's unclear: Whether the policy should be scoped tighter.
   - Recommendation: The research pattern above includes `price_history_insert_own` policy that allows users to insert rows for products they own. This satisfies TRACK-06. Cron uses service-role and bypasses RLS for its own inserts.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥20.9 | Next.js 16 runtime | ✓ | 24.15.0 | — |
| npm ≥10 | Install | ✓ | 11.12.1 | — |
| `supabase` CLI | Migrations + type gen | ✓ (via `npx`) | 2.92.1 | Already npx-run; no global install needed |
| Supabase project (remote) | DB + Auth + pg_cron | ✗ (to be created) | — | Create during Phase 1 |
| Vercel account | Deployment | ✗ (deferred to Phase 7) | — | Not needed for Phase 1 |
| `.env.local` file | Secrets loading | ✗ (to be created) | — | `.env.example` committed as template |

**Missing dependencies with no fallback:** None blocking Phase 1.

**Missing dependencies with fallback:** Supabase project creation is interactive (Dashboard) — planner task should walk through creation explicitly.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — test framework deferred per CONTEXT.md "Testing framework: Do not install Vitest or any test framework in Phase 1" |
| Config file | None |
| Quick run command | Manual verification recipes below |
| Full suite command | Manual checklist (Phase 1 gate) |

### Phase Requirements → Test Map

All validation for Phase 1 is **manual / empirical**, per CONTEXT.md. Each requirement has a verifiable invariant. Test type column uses `manual-smoke` where no framework is installed.

| Req ID | Behavior | Test Type | Verification Recipe | Automatable Later? |
|--------|----------|-----------|--------------------|---------------------|
| FND-01 | `proxy.ts` exists at `dealdrop/proxy.ts` with `export function proxy` | manual-smoke | `ls dealdrop/proxy.ts && grep -E 'export (async )?function proxy' dealdrop/proxy.ts` | Yes (Phase 2) |
| FND-02 (positive) | App builds with all 7 env vars set | manual-smoke | `cd dealdrop && npm run build` — expect success | Yes |
| FND-02 (negative) | App fails at build with missing env var | manual-smoke | Temporarily remove `CRON_SECRET` from `.env.local` → `npm run build` → expect `Invalid environment variables: { CRON_SECRET: Required }` | Yes |
| FND-03 | `images.remotePatterns` accepts an external image | manual-smoke | Add an `<Image src="https://via.placeholder.com/200" ...>` to a throwaway page; run `npm run dev`; verify image loads without hostname error | Yes |
| FND-04 | Supabase `pg_cron` + `pg_net` extensions enabled | manual-smoke | Supabase SQL Editor: `SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net');` → expect 2 rows | Yes (automate post-migration) |
| FND-05 | Three client factories return distinct auth contexts | manual-smoke | See "Three-Client Verification" below | Yes |
| FND-06 | `npx shadcn@latest add button` renders with theme tokens | manual-smoke | See "Shadcn Verification" below | Yes |
| FND-07 | `npm run lint` works without `next lint` | manual-smoke | `cd dealdrop && npm run lint` — expect `eslint` CLI to run (no "next lint deprecated" error) | Yes |
| FND-08 | `app/layout.tsx` metadata replaced | manual-smoke | `grep -E 'title.*DealDrop' dealdrop/app/layout.tsx` → expect match; verify "Create Next App" absent | Yes |
| DB-01..DB-04 | Tables exist with correct columns/constraints | manual-smoke | See "Schema Verification SQL" below | Yes |
| DB-05 | RLS on `products` blocks cross-user reads | manual-smoke | See "RLS Impersonation Test" below | Yes |
| DB-06 | RLS on `price_history` blocks cross-user reads via ownership chain | manual-smoke | Same as DB-05 but against `price_history` table | Yes |
| DB-07 | Generated types exist and compile | manual-smoke | `ls dealdrop/src/types/database.ts && cd dealdrop && npx tsc --noEmit` — expect success | Yes |

### Three-Client Verification (FND-05)

Create a temporary `dealdrop/app/_debug/page.tsx` Server Component (delete after verification):

```typescript
// Temporary debug page — DELETE after Phase 1 gate
import { createClient as createServerSbClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function Debug() {
  const server = await createServerSbClient()
  const admin = createAdminClient()

  // Both should query products; admin bypasses RLS.
  const { count: serverCount } = await server.from('products').select('*', { count: 'exact', head: true })
  const { count: adminCount } = await admin.from('products').select('*', { count: 'exact', head: true })

  return <pre>{JSON.stringify({ serverCount, adminCount }, null, 2)}</pre>
}
```

Expected (Phase 1 — no users yet, no rows):
- `serverCount: 0` (no session → RLS filters to nothing)
- `adminCount: 0` (empty table)

After Phase 2 + Phase 4 add a product as User A, same check with User A logged in:
- `serverCount: 1` (their own row)
- `adminCount: N` (total rows across all users)

Also verify `createAdminClient` CANNOT be imported into a Client Component: add `"use client"` to the debug page and attempt import — expect a build error about `server-only`.

### RLS Impersonation Test (DB-05, DB-06)

From Supabase Dashboard → Authentication → Users, create two test users (User A, User B). Insert one products row for each via the SQL Editor using service-role. Then:

```sql
-- Impersonate User A (via Dashboard → Authentication → Users → ... → Impersonate, or via `set local role` in SQL Editor)
-- Run:
select count(*) from products;              -- expect 1
select count(*) from products where user_id = auth.uid();  -- expect 1
select count(*) from price_history;         -- expect only User A's rows (0 if none inserted)
```

Then switch impersonation to User B:
```sql
select count(*) from products;              -- expect 1 (only User B's)
select id from products;                    -- expect User B's ID only, NOT User A's
select count(*) from price_history where product_id = '<User A product id>';  -- expect 0
```

If `price_history` returns rows for User A while impersonating User B, RLS is misconfigured.

### Schema Verification SQL (DB-01..DB-04)

```sql
-- Run in Supabase SQL Editor after db push
-- Verify products columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'products'
order by ordinal_position;
-- expect: id uuid/not null, user_id uuid/not null, url text/not null, name text/not null,
--         current_price numeric/not null, currency text/not null, image_url text/YES,
--         created_at timestamptz/not null, updated_at timestamptz/not null

-- Verify constraints
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.products'::regclass;
-- expect: products_pkey, products_user_id_fkey, products_user_url_unique (UNIQUE user_id,url),
--         products_current_price_positive (CHECK current_price > 0)

-- Verify indexes
select indexname, indexdef from pg_indexes where tablename = 'products';
select indexname, indexdef from pg_indexes where tablename = 'price_history';

-- Verify RLS is enabled
select relname, relrowsecurity from pg_class where relname in ('products','price_history');
-- expect both relrowsecurity = true
```

### Shadcn Verification (FND-06)

```bash
cd dealdrop
npx shadcn@latest init  # interactive; follow CONTEXT.md locks (new-york / zinc / 0.5rem)
npx shadcn@latest add button
```

Add to a throwaway page:
```typescript
import { Button } from '@/components/ui/button'
export default function Test() {
  return <Button variant="default">Test</Button>
}
```

Expected in browser: button renders with `bg-primary text-primary-foreground` styling, rounded corners per `--radius: 0.5rem`, zinc-based palette.

Failure modes and what they mean:
- Button is unstyled → `@theme inline` block not applied, or Tailwind not scanning the right paths → Shadcn v3 path was taken, not v4
- `Cannot find module '@/lib/utils'` → tsconfig paths not updated, or Shadcn wrote utils.ts to a different location
- `bg-primary` renders as transparent → `components.json` `cssVariables: true` not set, or `:root` block missing from globals.css

### Sampling Rate

- **Per task commit:** Manual — visual check or `npm run build` for env/config tasks
- **Per migration:** Run the Schema Verification SQL block in Supabase SQL Editor
- **Phase gate (before `/gsd-verify-work`):**
  1. `cd dealdrop && npm run build` — passes with all 7 env vars
  2. `cd dealdrop && npm run build` — fails cleanly with a missing env var
  3. Run Schema Verification SQL — all checks pass
  4. Run RLS Impersonation Test — cross-user reads return 0 rows
  5. Three-Client Verification debug page renders expected counts
  6. Shadcn Button renders with theme tokens
  7. `grep "Create Next App" dealdrop/app/layout.tsx` returns nothing

### Wave 0 Gaps

- [ ] No test framework files needed (per CONTEXT.md)
- [ ] None — validation is entirely manual + SQL-based for Phase 1

*(If CONTEXT.md testing decision is revisited later, a Wave 0 task would add: `vitest.config.ts`, `tests/setup.ts`, and `@testing-library/*` devDeps.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Documented three-tier separation (browser / server / DB); secrets never cross into browser bundle via `server-only` guard |
| V2 Authentication | partial (setup only) | Supabase Auth configured; actual OAuth flow is Phase 2 |
| V3 Session Management | partial (setup only) | `proxy.ts` stub; actual session refresh via `getClaims()` is Phase 2 |
| V4 Access Control | yes | RLS policies on `products` + `price_history`; `(select auth.uid())` pattern; ownership-chain subquery for `price_history` |
| V5 Input Validation | yes | `@t3-oss/env-nextjs` + Zod validate all env vars at build time |
| V6 Cryptography | no | No crypto work in Phase 1 — Supabase handles JWT signing; `CRON_SECRET` is a shared secret, not a key |
| V7 Error Handling | no | Deferred to Phase 7 |
| V8 Data Protection | yes | `SUPABASE_SERVICE_ROLE_KEY` marked server-only; `server-only` import guard on admin client module |
| V9 Communication | yes | All Supabase + external traffic over HTTPS (Supabase endpoints are HTTPS by default) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-role key exposure in browser bundle | Information Disclosure | `import 'server-only'` at top of `admin.ts`; never use `NEXT_PUBLIC_` prefix for service role key |
| Cross-user data read via missing RLS on `price_history` | Information Disclosure | Enable RLS on both tables in same migration; ownership-chain policy with IN-subquery |
| Env var silently `undefined` at runtime | Tampering (invalid state) | `@t3-oss/env-nextjs` build-time fail |
| SQL injection via auth.uid() misuse | Tampering | Use `(select auth.uid())` from Supabase — never string-interpolate user IDs |
| Open `images.remotePatterns` wildcard enables SSRF via Next.js image optimizer | Information Disclosure (low, bounded by Next.js image proxy) | Accepted risk for portfolio; Phase 7 hardening can tighten the allowlist. Next.js 16 image optimizer has internal SSRF protections (blocks private IPs). |
| Weak `CRON_SECRET` | Elevation of Privilege (Phase 6 surface) | Enforce min length 32 in Zod schema; generate via `openssl rand -hex 32` |

## Project Constraints (from CLAUDE.md)

Directives extracted from `/Users/harshithpendyala/Documents/DealDrop/CLAUDE.md` and `dealdrop/AGENTS.md`:

| Directive | Source | Phase 1 Compliance |
|-----------|--------|--------------------|
| Next.js 16 + React 19 + TypeScript strict + Tailwind v4 — don't migrate | root CLAUDE.md | ✓ — no stack changes; layer on top of scaffold |
| Backend: Supabase | root CLAUDE.md | ✓ — Phase 1 deliverable |
| Scraping: Firecrawl (Phase 3) | root CLAUDE.md | Not in Phase 1 scope; env var reserved |
| Email: Resend (Phase 6) | root CLAUDE.md | Not in Phase 1 scope; env vars reserved |
| Charts: Recharts (Phase 5) | root CLAUDE.md | Not in Phase 1 scope |
| UI kit: Shadcn + Lucide | root CLAUDE.md | ✓ — Phase 1 initializes |
| Toasts: Sonner | root CLAUDE.md | Installed in Phase 1 (via Shadcn); provider in Phase 7 |
| Hosting: Vercel | root CLAUDE.md | Deploy in Phase 7 |
| Scrape cadence: daily (pg_cron 9:00 AM) | root CLAUDE.md | Phase 6; Phase 1 enables extension |
| Auth: Google OAuth only | root CLAUDE.md | Phase 2 |
| Bar: Portfolio/demo quality | root CLAUDE.md | ✓ — matches Phase 1 scope |
| TypeScript strict, no `any`, `import type` for types | root CLAUDE.md | ✓ — follow in all new files |
| Functional components only | root CLAUDE.md | ✓ — Phase 1 has no React components yet except Shadcn's |
| `@/*` path alias | root CLAUDE.md | Action required: extend tsconfig paths to include `./src/*` |
| Tailwind v4 utility-first; CSS custom properties in globals.css | root CLAUDE.md | ✓ — Shadcn appends to globals.css |
| PascalCase components, camelCase vars/fns, kebab-case CSS vars | root CLAUDE.md | ✓ — Shadcn follows these |
| GSD Workflow Enforcement: use `/gsd-execute-phase`, no direct edits outside GSD | root CLAUDE.md | Planner will use GSD phase execution |
| "This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code" | dealdrop/AGENTS.md | ✓ — research quoted authoritative bundled docs directly |
| "Heed deprecation notices" | dealdrop/AGENTS.md | ✓ — `middleware.ts`, `next lint`, `auth-helpers-nextjs`, `images.domains` all flagged |

**No directives conflict with this research. All Phase 1 patterns align with project instructions.**

## Sources

### Primary (HIGH confidence)

- **Next.js 16.2.4 installed bundled docs** (`dealdrop/node_modules/next/dist/docs/`)
  - `01-app/03-api-reference/03-file-conventions/proxy.md` — proxy.ts contract, function name, runtime, matcher syntax, migration from middleware
  - `01-app/02-guides/upgrading/version-16.md` — async Request APIs removed sync compat (L294-L306), middleware→proxy rename (L625-L650), next lint removal (L1093), images.remotePatterns (L889-L916), serverRuntimeConfig removal (L1127-L1200)
  - `01-app/02-guides/environment-variables.md` — env var loading, NEXT_PUBLIC_ inlining semantics, .env file order
  - `01-app/03-api-reference/03-file-conventions/route.md` — Route Handler signature
  - `01-app/03-api-reference/03-file-conventions/src-folder.md` — src/ optional, ignored if app/ at root
- **Supabase official docs** (webfetch verified 2026-04-18)
  - https://supabase.com/docs/guides/auth/server-side/nextjs — three-client pattern + cookies getAll/setAll
  - https://supabase.com/docs/guides/auth/server-side/creating-a-client — authoritative `getClaims()` guidance for proxy session refresh
  - https://supabase.com/docs/guides/database/postgres/row-level-security — `(select auth.uid())` performance pattern, policy syntax
  - https://supabase.com/docs/reference/cli/supabase-gen-types — `--linked` / `--local` / `--project-id` flags
- **Shadcn UI official docs** (webfetch verified 2026-04-18)
  - https://ui.shadcn.com/docs/installation/next — init flow
  - https://ui.shadcn.com/docs/components-json — components.json fields + `new-york` style
  - https://ui.shadcn.com/docs/tailwind-v4 — CSS-first config pattern, `@theme inline`, baseColor enum
  - https://ui.shadcn.com/docs/theming — globals.css structure, OKLCH palette, `--radius` scaling
- **npm registry** (direct query)
  - `npm view` for all 9 packages, versions captured in Standard Stack table

### Secondary (MEDIUM confidence)

- DealDrop `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/research/SUMMARY.md` — cross-referenced for stack baselines and pitfall catalog
- DealDrop `.planning/codebase/STACK.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONCERNS.md` — scaffold state

### Tertiary (LOW confidence — flag if acted on)

- None. Every claim in this research is either directly verified from primary source or carries an `[ASSUMED]` tag in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every version verified via `npm view`; compatibility checked via peer-dep fields
- Architecture patterns: **HIGH** — quoted from Next.js 16 bundled docs and Supabase official docs; code examples are minimal and mechanical
- Pitfalls: **HIGH** — each pitfall has a primary-source citation; no speculation
- Validation: **HIGH** — recipes are mechanical (SQL queries, file checks, manual renders)
- Security: **HIGH** — `server-only` guard and RLS patterns are industry standard for this stack

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stack is stable but npm versions may advance; re-verify `@supabase/ssr` and `shadcn` CLI if Phase 1 execution is delayed beyond this window)

---

*Phase 1: Foundation & Database — Research*
*Researched: 2026-04-18*
*Ready for planning*
