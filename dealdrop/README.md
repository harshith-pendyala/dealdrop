# DealDrop

DealDrop is a universal e-commerce price tracker. Paste any product URL, and DealDrop scrapes the product details, monitors the price daily, and sends an email alert the moment the price drops. Each user gets a private dashboard with price-history charts for every product they track.

For full project context (goal, constraints, decisions, deferred ideas), see [`.planning/PROJECT.md`](../.planning/PROJECT.md).

## Tech stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **Styling:** Tailwind CSS v4 + Shadcn UI + Lucide icons
- **Backend:** Supabase (Postgres + Auth + RLS + pg_cron)
- **Scraping:** Firecrawl (structured JSON, no per-site scrapers)
- **Email:** Resend (transactional)
- **Charts:** Recharts
- **Hosting:** Vercel

## Development

```bash
npm install
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint check
```

Vitest unit tests:

```bash
npx vitest run                    # full suite
npx vitest run src/lib/resend     # one module
```

## Environment configuration

Copy `.env.example` to `.env.local` and fill in the values. All server-only vars are validated by Zod at boot — missing or malformed required values fail fast (see `src/lib/env.server.ts`).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (browser-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase service-role key (server-only — never expose to the browser) |
| `FIRECRAWL_API_KEY` | yes | Firecrawl API key for product scraping |
| `RESEND_API_KEY` | yes | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | yes | Verified sender address (bare RFC-5321 format; must pass Zod `.email()`) |
| `CRON_SECRET` | yes | Bearer token for `POST /api/cron/check-prices` (>= 32 chars) |
| `RESEND_TEST_RECIPIENT` | no | Optional override — when set, every price-drop alert routes to this address |

## Email recipient modes

DealDrop supports two email-routing modes, controlled by a single optional env var.

- **Test-recipient mode** — set `RESEND_TEST_RECIPIENT=demo@example.com`. Every price-drop alert (regardless of which user added the product) routes to that single address. Useful before a custom domain is verified, or for portfolio demos where the alert inbox should be a single address you control.
- **Production mode** — leave `RESEND_TEST_RECIPIENT` unset (or blank). Each price-drop alert delivers to the email of the user who added the tracked product (resolved server-side via Supabase admin auth).

To flip from test-recipient mode to production mode (planned for v1.2 after a custom domain is verified in Resend): unset `RESEND_TEST_RECIPIENT` in Vercel env (or remove the line from `.env.local`) and redeploy. No code change is required at the cutover.

A one-time `console.warn` fires at module load when the override is active so you can confirm in Vercel function logs / dev terminal that test-recipient mode is on.

## Project planning

This repo follows the GSD (Get Shit Done) workflow. Roadmap, phase plans, and implementation summaries live under `.planning/`. Start with [`.planning/PROJECT.md`](../.planning/PROJECT.md) and [`.planning/ROADMAP.md`](../.planning/ROADMAP.md).
