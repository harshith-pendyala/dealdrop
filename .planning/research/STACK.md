# Stack Research

**Domain:** E-commerce price-tracker web app (universal URL scraping, daily cron, email alerts)
**Researched:** 2026-04-17
**Confidence:** HIGH (Next.js verified from installed node_modules docs; third-party library versions from training data, cutoff August 2025 — flag for version pin verification before install)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.4 (pinned, already installed) | Full-stack framework, App Router, Route Handlers, Server Actions | Already scaffolded. v16 has Turbopack-by-default, async-only Request APIs, `proxy.ts` instead of `middleware.ts`. Do not upgrade without a separate migration pass. |
| React | 19.2.4 (pinned, already installed) | UI rendering | Paired with Next.js 16. Includes View Transitions, `useEffectEvent`, `Activity`. |
| TypeScript | ^5.1 | Type safety across server + client | Next.js 16 requires TypeScript ≥ 5.1. Strict mode already enabled. |
| Tailwind CSS | ^4 (already installed) | Utility-first styling | Already configured. v4 has significant API changes from v3 — do not mix v3 patterns. |
| @supabase/supabase-js | ^2 (latest 2.x at install) | Supabase client — DB queries, Auth | The base SDK. Needed on server for admin-level queries in the cron route handler. |
| @supabase/ssr | ^0.5 (latest at install) | Cookie-based Supabase session in Next.js App Router | Mandatory companion to supabase-js in App Router. Replaces the old `auth-helpers-nextjs`. Creates server/browser client factories that correctly handle cookies in async Next.js 16 context. |
| @mendable/firecrawl-js | ^1 (latest at install) | Universal web scraping with structured JSON extraction | Firecrawl's `scrape` endpoint with a JSON schema returns structured product fields without per-site code. Use `extractorOptions.extractionSchema` (Zod or plain JSON Schema). |
| resend | ^4 (latest at install) | Transactional email | Official Resend Node.js SDK. `emails.send()` from a Server Action or Route Handler. Generous free tier (3,000/mo). No SMTP config needed. |
| zod | ^3 | Schema validation and Firecrawl output typing | Next.js 16 docs explicitly recommend Zod for Server Action input validation. Also used to define the Firecrawl extraction schema so scraped output is type-safe. Required — not optional. |
| recharts | ^2 | Price-history line charts | React-native charting library. Must be rendered inside a Client Component (`'use client'`). Wrap in a thin client wrapper; keep all data fetching in Server Components. |
| @shadcn/ui (shadcn CLI) | latest CLI, components pinned at install | Copy-paste component library (Dialog, Card, Button, Badge) | Not an npm package — installed per-component via `npx shadcn@latest add`. Components live in `components/ui/` and are owned by the project. Requires Tailwind v4 compat mode (shadcn has a v4 path). |
| lucide-react | ^0.400+ | Icon set | Ships with shadcn; install alongside. Tree-shakeable SVG icons. |
| sonner | ^1 | Toast notifications | The default shadcn toast library. `<Toaster />` in root layout, `toast()` calls from anywhere. Fully compatible with React 19. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @t3-oss/env-nextjs | ^0.11 | Type-safe, validated environment variables at startup | Install this. Catches missing secrets at build time rather than at runtime. Define a schema of all required env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FIRECRAWL_API_KEY, RESEND_API_KEY, CRON_SECRET, RESEND_FROM_EMAIL). |
| server-only | latest | Prevents server modules from being imported in Client Components | Import at top of any file that contains secrets or DB logic. Next.js 16 docs recommend this pattern for DAL (Data Access Layer) files. |
| @types/node | ^20 (already installed) | Node.js type definitions | Already present. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest + @vitejs/plugin-react + jsdom | Unit testing | Next.js 16 ships a Vitest guide. **Vitest is recommended over Jest for this project** because Turbopack (now default in v16) integrates better with the Vite ecosystem. Jest is still supported but adds friction. Vitest cannot test async Server Components — use for utility functions, Server Action logic, and client component snapshots only. |
| @testing-library/react + @testing-library/dom | Component testing | Pair with Vitest for Client Component tests. |
| Playwright | End-to-end testing | For the critical path: add product → cron fires → email sent. Next.js 16 ships a Playwright guide. This is the correct tool for testing async Server Components and full user flows. Optional for portfolio bar but strongly recommended for the cron alert flow. |
| vite-tsconfig-paths | Vitest config | Resolves `@/` path aliases in Vitest without duplication. |
| ESLint (eslint-config-next) | Linting | Already installed. **`next lint` command is removed in Next.js 16** — run ESLint CLI directly: `npx eslint .` or update `package.json` scripts. `eslint-config-next` 16.2.4 already handles flat config format. |

---

## Installation

```bash
# Supabase (client + SSR adapter)
npm install @supabase/supabase-js @supabase/ssr

# Scraping
npm install @mendable/firecrawl-js

# Email
npm install resend

# Schema validation (required, not optional)
npm install zod

# Charts
npm install recharts

# UI components
npm install lucide-react sonner
npx shadcn@latest init          # follow prompts for Tailwind v4 path
npx shadcn@latest add button card dialog badge

# Env validation
npm install @t3-oss/env-nextjs

# Server-only guard
npm install server-only

# Dev: Testing
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths

# Dev: E2E (optional but recommended for cron flow)
npm init playwright@latest
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | Never — auth-helpers is deprecated. @supabase/ssr is its successor. |
| Vitest | Jest | If the team already has deep Jest knowledge and an existing test suite. For greenfield with Turbopack, Vitest is simpler to configure. |
| @t3-oss/env-nextjs | Raw `process.env` access | Never in a project with secrets — missing env vars silently return `undefined`, causing cryptic runtime errors. |
| zod (for Firecrawl schema) | Plain JSON Schema object | Either works with Firecrawl. Zod is preferred because it gives TypeScript types at compile time, not just runtime validation. |
| Recharts (client component) | Chart.js via react-chartjs-2 | If you need more chart types or Canvas-based rendering. Recharts' SVG approach is simpler for a line chart. |
| Resend | Nodemailer + SMTP | If you need self-hosted email. Resend is far simpler for a portfolio project. |
| Playwright (E2E) | Cypress | Playwright has native support in Next.js 16 docs and handles async Server Component flows better. Cypress is fine but adds more config. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `middleware.ts` | **Removed in Next.js 16.** The file is now `proxy.ts` and the exported function must be named `proxy`. Using `middleware.ts` will silently fail or be ignored. | `proxy.ts` |
| Synchronous `cookies()`, `headers()`, `params` access | **Breaking change in Next.js 16.** Synchronous fallback was removed. All Request-time APIs must be `await`-ed. | `const cookieStore = await cookies()` |
| `next lint` CLI command | **Removed in Next.js 16.** `next build` no longer runs linting. | `npx eslint .` or `./node_modules/.bin/eslint .` — update package.json scripts. |
| `@supabase/auth-helpers-nextjs` | Deprecated — replaced by `@supabase/ssr`. | `@supabase/ssr` |
| `serverRuntimeConfig` / `publicRuntimeConfig` in next.config | **Removed in Next.js 16.** These APIs no longer exist. | Environment variables via `process.env` + `@t3-oss/env-nextjs` for validation. |
| `experimental.ppr: true` in next.config | **Removed in Next.js 16.** PPR is now controlled by `cacheComponents: true` with a different model. Don't enable PPR for this project — no benefit for a dynamic authenticated app. | Not needed; leave `cacheComponents` off. |
| Webpack custom config | Next.js 16 defaults to Turbopack for both `dev` and `build`. A custom `webpack` config causes `next build` to fail unless you pass `--webpack`. | Avoid custom webpack. Use Turbopack-compatible options. |
| `next/legacy/image` | Deprecated in Next.js 16. | `next/image` (already the default) |
| `images.domains` in next.config | Deprecated. | `images.remotePatterns` — needed if displaying scraped product images from external hosts. |
| React context for auth state in Server Components | React context is Client-only; Server Components cannot read it. | Pass session data from Server Components directly to child components as props, or use `@supabase/ssr` server client in each Server Component that needs auth. |

---

## Stack Patterns by Variant

**For the Supabase server client (Route Handlers, Server Actions):**
- Create a server-side Supabase client using `@supabase/ssr`'s `createServerClient` with `cookies()` from `next/headers`.
- Always `await cookies()` — sync access throws in Next.js 16.
- For the cron Route Handler, use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS and read all users' products.
- For user-facing Server Actions, use the **anon key** with RLS enforced.

**For Firecrawl scraping:**
- Use `firecrawl.scrapeUrl(url, { formats: ['extract'], extract: { schema: productSchema } })` where `productSchema` is a Zod schema coerced to JSON Schema via `zodToJsonSchema` (from the `zod-to-json-schema` package) OR pass a plain JSON Schema object directly.
- Always validate the returned extraction with `.safeParse()` — Firecrawl can return `null` fields if the page is behind a bot wall.
- Handle scrape failures gracefully: update `products.scrape_failed = true` rather than throwing.

**For the cron Route Handler (`app/api/cron/check-prices/route.ts`):**
- Export both `GET` (health check, public) and `POST` (cron trigger, secret-protected).
- In `POST`: read `Authorization` header with `await headers()`, compare against `CRON_SECRET`. Return 401 if missing/mismatched.
- pg_cron SQL: `SELECT cron.schedule('check-prices', '0 9 * * *', $$SELECT net.http_post(url:='https://your-domain.com/api/cron/check-prices', headers:='{"Authorization":"Bearer <secret>","Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb) AS request_id$$);`
- Note: pg_cron requires Supabase's `pg_net` extension for HTTP calls. Enable both in Supabase dashboard → Database → Extensions.

**For auth with Supabase + Google OAuth:**
- Auth callback goes to `/auth/callback` — a Route Handler that exchanges the code for a session using `supabase.auth.exchangeCodeForSession(code)`.
- Store session in cookies via `@supabase/ssr` — the library handles cookie management automatically.
- The `proxy.ts` file (Next.js 16's replacement for `middleware.ts`) refreshes the session on every request by calling `supabase.auth.getUser()`.
- Never rely on `supabase.auth.getSession()` on the server — it reads from cookie without re-validating with Supabase servers. Always use `getUser()` for secure server-side auth checks.

**For env validation with @t3-oss/env-nextjs:**
```typescript
// lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().email(),
    CRON_SECRET: z.string().min(32),
  },
  client: {},
  runtimeEnv: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    CRON_SECRET: process.env.CRON_SECRET,
  },
})
```
Import `env` in any server file instead of `process.env` directly. Build fails immediately if a var is missing.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.2.4 | React 19.2.4 | Paired. Do not mix v15 patterns. |
| @supabase/ssr ^0.5 | @supabase/supabase-js ^2 | Must be installed together. |
| Tailwind CSS ^4 | @tailwindcss/postcss ^4 | Both already installed. Tailwind v4 has no `tailwind.config.js` — config is in CSS file. |
| shadcn/ui | Tailwind v4 | Shadcn has a dedicated Tailwind v4 setup path. Follow it — the v3 install instructions produce broken styles. |
| recharts ^2 | React 19 | Compatible. Must be in a `'use client'` component. |
| zod ^3 | @t3-oss/env-nextjs ^0.11 | @t3-oss/env-nextjs depends on Zod v3. |
| Vitest latest | Next.js 16 / Turbopack | Vitest runs outside of Next.js's build pipeline, so there's no direct conflict. Configure with `vite-tsconfig-paths` to resolve `@/` aliases. |
| Playwright latest | Next.js 16 | Compatible. Start dev server separately before running E2E tests. |
| Node.js | ≥ 20.9.0 | Next.js 16 hard minimum. The scaffold runs Node.js 24.15.0 — fine. |

---

## Missing Pieces (Gaps in Current Stack)

These are not yet chosen but are needed for a complete, working implementation:

| Gap | Recommendation | Priority |
|-----|---------------|----------|
| Supabase client + SSR adapter | `@supabase/supabase-js` + `@supabase/ssr` | Critical — nothing works without this |
| Scraping SDK | `@mendable/firecrawl-js` | Critical — core feature |
| Email SDK | `resend` | Critical — core feature |
| Schema validation | `zod` | Critical — needed for Firecrawl extraction schema AND env validation AND Server Action input validation |
| Env validation | `@t3-oss/env-nextjs` | High — prevents silent `undefined` secrets causing runtime failures |
| Server module guard | `server-only` | High — prevents accidental import of DB/secret code in Client Components |
| Charts | `recharts` | High — required for product card chart feature |
| UI components | shadcn CLI + `lucide-react` + `sonner` | High — required for UI |
| Testing framework | Vitest + React Testing Library | Medium — zero tests currently; add during Phase 1 |
| E2E testing | Playwright | Medium — validate cron alert flow end-to-end |
| Auth callback route | Manual implementation | Critical — `/auth/callback` Route Handler needed for Google OAuth code exchange |
| `proxy.ts` (was middleware) | Manual implementation | High — session refresh on every request |
| `images.remotePatterns` in next.config | Config change | Medium — scraped product images come from external domains; `next/image` requires allowlisting or use plain `<img>` |
| `pg_net` extension in Supabase | Supabase Dashboard config | Critical — pg_cron needs it to make HTTP calls to the cron Route Handler |

---

## Sources

- Next.js 16.2.4 installed docs (`node_modules/next/dist/docs/`) — HIGH confidence (authoritative, version-specific)
  - `01-app/02-guides/upgrading/version-16.md` — Breaking changes confirmed
  - `01-app/02-guides/authentication.md` — Auth patterns, DAL, `getUser()` vs `getSession()`
  - `01-app/02-guides/environment-variables.md` — Env var handling
  - `01-app/02-guides/testing/vitest.md` — Vitest setup
  - `01-app/02-guides/testing/playwright.md` — Playwright setup
  - `01-app/01-getting-started/15-route-handlers.md` — Route Handler caching semantics
- Training data (cutoff August 2025) — MEDIUM confidence for third-party library APIs and version numbers
  - @supabase/ssr, @supabase/supabase-js, firecrawl-js, resend, zod, recharts, shadcn, sonner, @t3-oss/env-nextjs
  - **Action required:** Verify exact versions with `npm info <package> version` before pinning in package.json

---

## Next.js 16 Breaking Changes Summary (Critical for All Phases)

These are confirmed from the installed Next.js 16.2.4 docs. Treat as hard constraints:

1. **`proxy.ts` not `middleware.ts`** — File renamed. Function name renamed from `middleware` to `proxy`.
2. **All Request APIs are fully async** — `await cookies()`, `await headers()`, `await params`. No sync access at all.
3. **`next lint` removed** — Update `package.json` scripts to use ESLint CLI directly.
4. **Turbopack is default** — Both `next dev` and `next build` use Turbopack. Custom `webpack` config breaks `next build`.
5. **`revalidateTag` requires second argument** — `revalidateTag('tag', 'max')` — single-arg form is deprecated.
6. **`serverRuntimeConfig` / `publicRuntimeConfig` removed** — Use `process.env` + env validation library.
7. **`images.domains` deprecated** — Use `images.remotePatterns`.
8. **`experimental.ppr` removed** — Use `cacheComponents: true` if PPR is needed (it isn't for this project).
9. **`next build` output** — No longer shows `size` or `First Load JS` metrics.
10. **Concurrent dev/build** — `next dev` outputs to `.next/dev`, not `.next`. Don't reference `.next` in scripts assuming it contains dev artifacts.

---

*Stack research for: DealDrop — universal e-commerce price tracker*
*Researched: 2026-04-17*
