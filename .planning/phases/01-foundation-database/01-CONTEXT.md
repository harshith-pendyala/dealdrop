# Phase 1: Foundation & Database - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the infrastructure layer so every downstream phase has a working backend and typed data access:

- Next.js 16 App Router conventions (`proxy.ts`, async Request APIs, ESLint CLI)
- Environment variable validation at build time (`@t3-oss/env-nextjs` + Zod)
- Scraped-image remote pattern allowlist in `next.config.ts`
- Supabase project with `pg_cron` + `pg_net` extensions enabled
- `products` + `price_history` tables with constraints, RLS policies, cascade delete
- Three distinct Supabase clients (`createServerClient`, `createBrowserClient`, `createAdminClient`) — admin guarded by `server-only`
- Tailwind v4 + Shadcn UI initialized with a working theme
- Generated Supabase TypeScript types wired into codebase
- App metadata replaced (no "Create Next App" placeholders)

**Not in scope for this phase:** auth flows (Phase 2), Firecrawl wrapper (Phase 3), any user-facing UI beyond whatever Shadcn init produces.

</domain>

<decisions>
## Implementation Decisions

### Project Layout
- **D-01:** Keep Next.js app code in the existing `dealdrop/` subdirectory. Do **not** flatten to workspace root, do **not** rename. Planning artifacts (`.planning/`) and project-level docs (`CLAUDE.md`) stay at workspace root; source code stays in `dealdrop/`.
- **D-02:** All `npm`/`npx`/`next`/`supabase` commands run from inside `dealdrop/`. No root `package.json`, no npm workspaces, no pass-through scripts. Vercel Root Directory must be set to `dealdrop`.
- **D-03:** Supabase artifacts live inside the app directory at `dealdrop/supabase/` — this includes `migrations/`, `config.toml`, and generated types (e.g. `dealdrop/supabase/types.ts` or `dealdrop/src/types/database.ts`).
- **D-04:** Environment files: `dealdrop/.env.local` (gitignored, contains real secrets) + `dealdrop/.env.example` (committed, lists variable names only, no values). Standard Next.js pattern.

### Claude's Discretion

The user did not select these areas for deep discussion — use sensible defaults during planning. If any of these choices would materially change the plan, surface the decision in the plan's deviations log rather than silently picking.

**Shadcn UI look & theme:**
- Style: `new-york` (cleaner lines, works well with price/data dashboards)
- Base color: `zinc` (neutral, photo-friendly — product images won't clash)
- Radius: `0.5rem`
- Dark mode: follow system preference via `next-themes` or Shadcn's built-in dark mode support; no in-app toggle in v1
- Rationale: picks a professional-looking baseline for a portfolio demo; can be reskinned later without touching logic

**DB migrations:**
- Use Supabase CLI migrations — `dealdrop/supabase/migrations/XXXX_description.sql` files, version-controlled
- Create all Phase 1 schema (products, price_history, RLS, constraints, pg_cron/pg_net enable) as a small number of cohesive migrations
- `supabase db push` to apply to the linked project
- Rationale: keeps schema reproducible, demo-able, and safe to re-deploy; overkill to bring in Drizzle/Prisma on top of Supabase

**Testing framework:**
- Do **not** install Vitest or any test framework in Phase 1
- Tests are deferred — not carved out as a separate phase, not blocking this phase
- Rationale: portfolio-bar project; manual E2E validation in Phase 7 is the shipping gate, not unit test coverage. If testing needs emerge during a phase, surface as a deferred idea.

**TypeScript type generation cadence:**
- `npx supabase gen types typescript --project-id <id>` run manually after any migration
- Output committed to `dealdrop/src/types/database.ts`
- Document the command in `dealdrop/README.md` or `CLAUDE.md` Workflow section
- Rationale: low ceremony, matches portfolio bar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- [.planning/PROJECT.md](../../PROJECT.md) — Product vision, core value, out-of-scope list, key decisions
- [.planning/REQUIREMENTS.md](../../REQUIREMENTS.md) — REQ-IDs FND-01 through FND-08 + DB-01 through DB-07 define acceptance for this phase
- [.planning/ROADMAP.md](../../ROADMAP.md) — Phase 1 goal, success criteria, UI hint=no

### Research outputs (read in full before planning)
- [.planning/research/STACK.md](../../research/STACK.md) — Next.js 16 breaking changes (`proxy.ts` not `middleware.ts`, async Request APIs, removed `next lint`), missing packages (`@supabase/ssr`, `zod`, `@t3-oss/env-nextjs`, `server-only`), testing stance
- [.planning/research/ARCHITECTURE.md](../../research/ARCHITECTURE.md) — Three-client Supabase pattern, folder structure recommendation, RLS policy design for products + price_history (ownership-chain subquery)
- [.planning/research/PITFALLS.md](../../research/PITFALLS.md) — Critical pitfalls: CRON_SECRET must never be inline in `cron.job`, RLS must be enabled on price_history in the same migration that creates the table, Firecrawl null-price propagation, pg_net extension enablement
- [.planning/research/SUMMARY.md](../../research/SUMMARY.md) — Cross-cutting synthesis

### Existing codebase map
- [.planning/codebase/STACK.md](../../codebase/STACK.md) — Current scaffold: Next.js 16.2.4, React 19.2.4, TypeScript strict, Tailwind v4
- [.planning/codebase/STRUCTURE.md](../../codebase/STRUCTURE.md) — Current file layout under `dealdrop/`
- [.planning/codebase/CONCERNS.md](../../codebase/CONCERNS.md) — Missing infrastructure this phase must establish

### External docs (planner should fetch if planning touches these)
- Next.js 16 docs (bundled in `dealdrop/node_modules/next/dist/docs/` — authoritative for `proxy.ts`, async cookies/headers, Route Handlers)
- Supabase SSR guide (`@supabase/ssr` package — verify current version at install time)
- Shadcn UI Tailwind v4 init flow (`npx shadcn@latest init` — do not use v3 tutorials)
- `@t3-oss/env-nextjs` README for env schema patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [dealdrop/app/layout.tsx](../../../dealdrop/app/layout.tsx) — already has Geist font wiring; replace metadata only, don't rebuild
- [dealdrop/app/page.tsx](../../../dealdrop/app/page.tsx) — default "Create Next App" page; will be fully replaced in Phase 2, left alone in Phase 1
- [dealdrop/app/globals.css](../../../dealdrop/app/globals.css) — existing Tailwind v4 globals + CSS custom properties; Shadcn init will append/extend
- [dealdrop/tsconfig.json](../../../dealdrop/tsconfig.json) — strict mode, `@/*` path alias already configured — keep
- [dealdrop/eslint.config.mjs](../../../dealdrop/eslint.config.mjs) — flat config with Next.js + TypeScript presets — keep
- [dealdrop/next.config.ts](../../../dealdrop/next.config.ts) — minimal config; add `images.remotePatterns` here

### Established Patterns
- **TypeScript strict everywhere** — no `any`, type imports via `import type`
- **Functional components only** — no classes
- **`@/*` path alias** — use for internal imports once `src/` lib/ is created
- **Tailwind v4 utility-first** — CSS custom properties in globals.css for theme tokens (Shadcn will extend)

### Integration Points
- `dealdrop/src/lib/supabase/` — new folder for three client factories (server, browser, admin)
- `dealdrop/src/lib/env.ts` — new file for Zod-validated env schema via `@t3-oss/env-nextjs`
- `dealdrop/src/types/database.ts` — new file for generated Supabase types
- `dealdrop/proxy.ts` — new file at app root for Supabase session refresh (replaces the no-longer-supported `middleware.ts`)
- `dealdrop/supabase/migrations/` — new folder for schema migrations

### Gotchas from Research
- Every server file touching cookies/headers/params MUST `await` them — v15 tutorials will silently or loudly break
- `@supabase/auth-helpers-nextjs` is deprecated — must use `@supabase/ssr`
- `next lint` command removed — update `package.json` lint script to call ESLint CLI directly (e.g. `"lint": "eslint ."`)
- pg_cron alone is not enough — **pg_net** extension must also be enabled in Supabase dashboard before any HTTP-from-DB call works
- RLS on `products` does NOT protect `price_history` — ownership-chain policy is mandatory and must land in the same migration as the table

</code_context>

<specifics>
## Specific Ideas

- The user sketched the DB schema in PROJECT.md exactly — columns, constraints, cascade behavior are already specified. Planner should treat those as locked contracts, not open questions.
- `CRON_SECRET` storage in Supabase Vault is a Phase 6 concern — Phase 1 just needs the env var validated and a working test-token pattern. Actual Vault wiring happens when pg_cron gets scheduled.
- The `images.remotePatterns` should be a permissive wildcard for v1 (scraped products come from any e-commerce domain) — a stricter allowlist belongs in a later hardening phase.

</specifics>

<deferred>
## Deferred Ideas

- **Automated type regeneration** (git hook or CI step to run `supabase gen types` on migration change) — out of scope for portfolio bar; manual command is fine
- **Pre-commit hooks / Husky** — not discussed; defer unless the user asks
- **Error tracking (Sentry) / structured logging** — Phase 7 Polish or beyond
- **Test framework adoption** — deferred indefinitely; add only if a specific need emerges
- **Storybook / component playground for Shadcn components** — v2 concern

</deferred>

---

*Phase: 01-foundation-database*
*Context gathered: 2026-04-18*
