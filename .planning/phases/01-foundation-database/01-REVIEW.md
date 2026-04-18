---
phase: 01-foundation-database
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - dealdrop/.env.example
  - dealdrop/.gitignore
  - dealdrop/app/globals.css
  - dealdrop/app/layout.tsx
  - dealdrop/components.json
  - dealdrop/components/ui/button.tsx
  - dealdrop/next.config.ts
  - dealdrop/proxy.ts
  - dealdrop/src/lib/env.ts
  - dealdrop/src/lib/supabase/admin.ts
  - dealdrop/src/lib/supabase/browser.ts
  - dealdrop/src/lib/supabase/server.ts
  - dealdrop/src/lib/utils.ts
  - dealdrop/src/types/database.ts
  - dealdrop/supabase/.gitignore
  - dealdrop/supabase/config.toml
  - dealdrop/supabase/migrations/0001_init_schema.sql
  - dealdrop/supabase/migrations/0002_enable_rls.sql
  - dealdrop/supabase/migrations/0003_enable_extensions.sql
  - dealdrop/tsconfig.json
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 1 establishes a solid foundation. Typed env validation via `@t3-oss/env-nextjs`, the three Supabase client factories (server/browser/admin), the `server-only` guard on the admin client, and the RLS migration using the `(select auth.uid())` caching pattern are all correctly implemented. The `.env.example` separation from `.env.local` plus layered `.gitignore` shields secrets appropriately.

No critical security issues found. The warnings center on migration re-run safety (`create table`/`create policy` without `if not exists` or `drop if exists` guards), a likely-typo in `supabase/config.toml` (`https://127.0.0.1:3000` in `additional_redirect_urls`), an ambiguous dual `@/*` path alias in `tsconfig.json`, and a permissive `next.config.ts` `remotePatterns` wildcard that carries a known SSRF surface via Next's image optimizer. All are acceptable for a portfolio/demo target but should be tracked.

## Warnings

### WR-01: Migration 0001 is not idempotent — re-running fails on `create table` / `create trigger`

**File:** `dealdrop/supabase/migrations/0001_init_schema.sql:5, 23, 40`
**Issue:** `create table public.products (...)` and `create table public.price_history (...)` will error with `relation already exists` if the migration is replayed. Likewise, `create trigger products_set_updated_at` has no `drop trigger if exists` guard and will fail with `trigger already exists`. Supabase CLI tracks migration state in `supabase_migrations.schema_migrations`, so normal `supabase db push` flows skip already-applied files — but any manual re-run (local `supabase db reset` in a non-clean state, copy/paste into SQL editor, or recovery from a partial apply) will break. The `create or replace function public.set_updated_at()` is already idempotent, so the inconsistency is just the table and trigger.
**Fix:**
```sql
create table if not exists public.products (
  id            uuid         primary key default gen_random_uuid(),
  ...
);

create table if not exists public.price_history (
  ...
);

-- Trigger
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();
```
Note: `if not exists` on `create table` skips re-adding constraints if the table already exists with a different shape, so pair this with a deliberate migration discipline (never mutate an old file; write a new migration).

### WR-02: Migration 0002 policies are not idempotent — re-running fails on `create policy`

**File:** `dealdrop/supabase/migrations/0002_enable_rls.sql:9, 14, 20, 25, 31, 40`
**Issue:** `create policy "..."` has no `if not exists` support prior to Postgres 15+ syntax consistency. All six policies will fail on a re-run with `policy "..." for table "..." already exists`. Like WR-01, the normal migration flow avoids this, but any replay path (reset, manual apply, rollback recovery) will break. The RLS enable statements themselves (`alter table ... enable row level security`) are idempotent (no-op if already enabled), so the hazard is isolated to the policy creates.
**Fix:**
```sql
drop policy if exists "products_select_own" on public.products;
create policy "products_select_own"
  on public.products for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- repeat drop-then-create for each policy
```
Alternative: wrap each `create policy` with `create policy if not exists` on Postgres 15+ (DealDrop uses Postgres 17 per `supabase/config.toml:36`, so this syntax is available).

### WR-03: `additional_redirect_urls` likely has an incorrect `https://` scheme for local dev

**File:** `dealdrop/supabase/config.toml:156`
**Issue:** `additional_redirect_urls = ["https://127.0.0.1:3000"]` — the local Next.js dev server runs on `http://127.0.0.1:3000` (matching `site_url` on line 154). Supabase treats redirect URLs as exact-match, so an OAuth callback coming back to `http://127.0.0.1:3000/auth/callback` would fail to match this `https://` entry. This will surface as a Phase 2 OAuth bug the moment Google OAuth callback is wired up.
**Fix:**
```toml
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000", "http://localhost:3000"]
```
Also consider adding `http://localhost:3000` since browsers may hit either `127.0.0.1` or `localhost` depending on how the dev server is accessed.

### WR-04: Ambiguous dual path alias — `@/*` resolves to both `./*` and `./src/*`

**File:** `dealdrop/tsconfig.json:22`
**Issue:** `"paths": { "@/*": ["./*", "./src/*"] }` — TypeScript will try resolution targets in order, but IDE tooling, bundlers, and codegen tools handle this inconsistently. Concretely: `@/lib/utils` could in principle match `dealdrop/lib/utils` (doesn't exist today) before falling through to `dealdrop/src/lib/utils`. If someone later adds a top-level `lib/` directory (e.g. via a copy-paste of an older Next.js project structure), it will silently shadow the `src/lib/` files that Shadcn and existing code depend on — including `@/lib/utils` (used in `components/ui/button.tsx:5`) and `@/lib/env` (used in all three Supabase clients).
**Fix:** Pick one root. Since the project already standardizes on `src/`:
```json
"paths": {
  "@/*": ["./src/*"]
}
```
If `components/` must stay at the repo root (current Shadcn layout), add it explicitly instead of the broad `./*`:
```json
"paths": {
  "@/*": ["./src/*"],
  "@/components/*": ["./components/*"]
}
```

## Info

### IN-01: `next.config.ts` `remotePatterns` wildcard exposes Next.js image optimizer to SSRF-adjacent surface

**File:** `dealdrop/next.config.ts:8-11`
**Issue:** `{ protocol: "https", hostname: "**" }` plus `{ protocol: "http", hostname: "**" }` allows the Next.js image optimizer to fetch arbitrary URLs on behalf of the server. Historically this has been a documented attack surface (CVE-2024-34351-class issues) where attackers can trigger server-side fetches to internal networks or cloud metadata endpoints via crafted `/_next/image?url=...` requests. The inline comment already acknowledges this is "Phase 7 concern," so this is a tracking note, not a blocker.
**Fix (Phase 7):** Either run image optimization through a CDN proxy, or cache/re-host scraped product images server-side (via Supabase Storage) so the allowlist can collapse to your own domain(s).

### IN-02: `proxy.ts` matcher omits several common static-asset extensions

**File:** `dealdrop/proxy.ts:15`
**Issue:** The negative lookahead excludes `png|jpg|jpeg|gif|webp|svg` but misses `avif`, `ico`, `bmp`, `tiff`, `mp4`, `woff`, `woff2`, `ttf`, `txt` (`robots.txt`), and `xml` (`sitemap.xml`). When Phase 2 adds real session refresh logic, running the proxy on these paths is wasteful but not wrong. `_next/static` is already excluded so the font/image pipeline is safe; the main real-world leak is `robots.txt` and `sitemap.xml`. Since this is a Phase 1 stub that only returns `NextResponse.next()`, the cost today is zero.
**Fix (when session refresh lands):**
```ts
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf)$).*)',
],
```

### IN-03: `CRON_SECRET` min-length enforcement is good, but there's no rotation guidance

**File:** `dealdrop/src/lib/env.ts:11`
**Issue:** `z.string().min(32)` is the right idea for discouraging weak secrets, but 32 chars of a narrow alphabet still under-performs 24 chars of base64. Not a bug, just a documentation gap for Phase 6 when the cron endpoint is implemented.
**Fix:** When Phase 6 implements the cron endpoint, document the generation command in a README or script:
```bash
openssl rand -base64 48   # emits ~64 chars, high entropy
```

### IN-04: `supabase/config.toml` sets `minimum_password_length = 6`

**File:** `dealdrop/supabase/config.toml:175`
**Issue:** The project constraint specifies "Google OAuth only" (per `CLAUDE.md`), so email/password signup is not part of the product surface. This setting is effectively dead config but remains the local-default. If email signup is ever re-enabled, 6 chars is below modern recommendations.
**Fix:** Consider disabling email signup explicitly to match the product intent:
```toml
[auth.email]
enable_signup = false
```
Or raise the floor:
```toml
minimum_password_length = 12
```

### IN-05: `.env.example` does not document which vars are required for Phase 1 vs later phases

**File:** `dealdrop/.env.example:1-14`
**Issue:** `env.ts` treats all five server-only vars as required (`min(1)` / `email()`), which means `npm run build` or any code path that imports `@/lib/env` will fail validation until Phase 3 (`FIRECRAWL_API_KEY`) and Phase 6 (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`) values are supplied — even though nothing in Phase 1 uses them. The comments in `.env.example` label the phases (`# Phase 3 — scraping`, `# Phase 6 — email + cron`) but the schema is already strict. Contributors hitting Phase 1 setup will be blocked until they stub all five.
**Fix:** Either (a) stub plausible placeholder values in `.env.example` so dev can proceed, (b) relax the schema for later-phase vars with `.optional()` until those phases land, or (c) document the intended workflow in the project README. Example (b):
```ts
FIRECRAWL_API_KEY: z.string().min(1).optional(), // Phase 3
RESEND_API_KEY: z.string().min(1).optional(),    // Phase 6
// ...
```
Trade-off: `.optional()` weakens the build-time guarantee for later phases. Preferred is (a) or to rely on `SKIP_ENV_VALIDATION=1` during early-phase local dev (already supported on `env.ts:26`) — document that in onboarding.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
