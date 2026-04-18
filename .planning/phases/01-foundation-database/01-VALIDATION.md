---
phase: 1
slug: foundation-database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Mode:** Manual-only — test framework is explicitly deferred per CONTEXT.md § Testing framework.
> Validation is empirical: build checks, file-existence greps, SQL queries, and browser render checks.
> Source: RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — deferred per CONTEXT.md (no Vitest/Jest in Phase 1) |
| **Config file** | none |
| **Quick run command** | `cd dealdrop && npm run build` (covers env schema + types) |
| **Full suite command** | Manual checklist (see "Phase Gate" below) |
| **Estimated runtime** | ~60s for `npm run build`; ~5 min full manual gate |

---

## Sampling Rate

- **After every task commit:** `cd dealdrop && npm run build` for any task touching `env.ts`, schema-dependent code, `next.config.ts`, `proxy.ts`, or imports from `@/lib/supabase`. File-only tasks (e.g. `.env.example` edit) skip build.
- **After every plan wave:** Run applicable manual recipes from the Per-Task Verification Map below.
- **Before `/gsd-verify-work`:** Full Phase Gate checklist (7 checks) must pass.
- **Max feedback latency:** ~60 seconds for build-based checks; SQL checks are instant in Supabase SQL Editor.

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command / Manual Recipe | Status |
|--------|----------|-----------|------------------------------------|--------|
| FND-01 | `dealdrop/proxy.ts` exists with `export function proxy` | manual-smoke | `ls dealdrop/proxy.ts && grep -E 'export (async )?function proxy' dealdrop/proxy.ts` | ⬜ pending |
| FND-02 (+) | Build succeeds with all 7 env vars | manual-smoke | `cd dealdrop && npm run build` — expect success | ⬜ pending |
| FND-02 (−) | Build fails cleanly with missing env var | manual-smoke | Remove `CRON_SECRET` from `.env.local`; `npm run build` — expect `Invalid environment variables: { CRON_SECRET: Required }`; restore | ⬜ pending |
| FND-03 | `images.remotePatterns` allows arbitrary scraped hostnames | manual-smoke | Temporarily add `<Image src="https://via.placeholder.com/200" width=... height=... />`; `npm run dev` — image loads without hostname error; revert | ⬜ pending |
| FND-04 | `pg_cron` + `pg_net` extensions enabled | manual-smoke | Supabase SQL Editor: `select extname from pg_extension where extname in ('pg_cron','pg_net');` — expect 2 rows | ⬜ pending |
| FND-05 | Three client factories return distinct auth contexts | manual-smoke | Three-Client Verification recipe below | ⬜ pending |
| FND-05 (guard) | `createAdminClient` cannot import into a Client Component | manual-smoke | Add `"use client"` to debug page and import admin — expect `server-only` build error | ⬜ pending |
| FND-06 | Shadcn `Button` renders with theme tokens (new-york/zinc/0.5rem) | manual-smoke | Shadcn Verification recipe below | ⬜ pending |
| FND-07 | `npm run lint` runs via ESLint CLI (not `next lint`) | manual-smoke | `cd dealdrop && npm run lint` — exit 0, no deprecation warning | ⬜ pending |
| FND-08 | App metadata updated (no "Create Next App") | manual-smoke | `grep -q 'DealDrop' dealdrop/app/layout.tsx && ! grep -q 'Create Next App' dealdrop/app/layout.tsx` | ⬜ pending |
| DB-01 | `products` table has required columns | manual-smoke | Schema Verification SQL block below | ⬜ pending |
| DB-02 | `price_history` table has required columns with FK cascade | manual-smoke | Schema Verification SQL block below | ⬜ pending |
| DB-03 | Constraints present (UNIQUE, CHECK, FK, cascade) | manual-smoke | Schema Verification SQL — `pg_constraint` check | ⬜ pending |
| DB-04 | Indexes on `user_id`, `product_id`, `recorded_at` | manual-smoke | Schema Verification SQL — `pg_indexes` check | ⬜ pending |
| DB-05 | RLS on `products` blocks cross-user reads | manual-smoke | RLS Impersonation Test below | ⬜ pending |
| DB-06 | RLS on `price_history` blocks via ownership-chain subquery | manual-smoke | RLS Impersonation Test below | ⬜ pending |
| DB-07 | Generated Supabase types exist and compile | manual-smoke | `ls dealdrop/src/types/database.ts && cd dealdrop && npx tsc --noEmit` — exit 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

All Phase 1 verifications are manual — test framework deferred. Detailed recipes below.

### Three-Client Verification (FND-05)

Create a temporary `dealdrop/app/_debug/page.tsx` Server Component (delete after verification):

```typescript
import { createClient as createServerSbClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function Debug() {
  const server = await createServerSbClient()
  const admin = createAdminClient()
  const { count: serverCount } = await server.from('products').select('*', { count: 'exact', head: true })
  const { count: adminCount } = await admin.from('products').select('*', { count: 'exact', head: true })
  return <pre>{JSON.stringify({ serverCount, adminCount }, null, 2)}</pre>
}
```

**Phase 1 expected (empty DB, no session):** `serverCount: 0`, `adminCount: 0`.
**Guard check:** Add `"use client"` to the page and import `createAdminClient` — expect build error about `server-only`. Revert / delete page after check.

### RLS Impersonation Test (DB-05, DB-06)

Supabase Dashboard → Authentication → create two test users (A, B). Insert one product row per user via SQL Editor using service_role, then impersonate A and run:

```sql
select count(*) from products;                                            -- expect 1 (A's)
select count(*) from products where user_id = auth.uid();                 -- expect 1
select count(*) from price_history where product_id = '<A_product_id>';   -- expect only A's rows
select count(*) from price_history where product_id = '<B_product_id>';   -- expect 0
```

Switch impersonation to B; repeat. If `price_history` returns rows owned by the other user, RLS is misconfigured.

### Schema Verification SQL (DB-01..DB-04)

Run in Supabase SQL Editor after `supabase db push`:

```sql
-- Columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('products','price_history')
order by table_name, ordinal_position;

-- Constraints (FK cascade, UNIQUE, CHECK)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in ('public.products'::regclass, 'public.price_history'::regclass);

-- Indexes
select tablename, indexname, indexdef from pg_indexes
where tablename in ('products','price_history');

-- RLS enabled
select relname, relrowsecurity from pg_class where relname in ('products','price_history');
-- expect both relrowsecurity = true

-- RLS policies
select tablename, policyname, cmd, qual from pg_policies
where tablename in ('products','price_history');
-- expect policies use `(select auth.uid())` pattern
```

### Shadcn Verification (FND-06)

```bash
cd dealdrop
npx shadcn@latest init   # interactive — follow CONTEXT.md locks: style=new-york, base=zinc, radius=0.5rem
npx shadcn@latest add button
```

Temporarily add:
```tsx
import { Button } from '@/components/ui/button'
export default function Test() { return <Button>Test</Button> }
```

Expected: button renders with `bg-primary`, `0.5rem` rounded corners, zinc palette. Failure modes (from RESEARCH.md):
- Unstyled button → `@theme inline` missing from globals.css → v3 path taken
- `Cannot find '@/lib/utils'` → tsconfig paths not updated (`./src/*` missing)
- Transparent `bg-primary` → `components.json` `cssVariables: true` missing OR `:root` vars absent

### Env Validation Negative Test (FND-02)

```bash
cd dealdrop
cp .env.local .env.local.bak
# Remove one required var from .env.local (e.g. CRON_SECRET line)
npm run build 2>&1 | head -20
# expect: "Invalid environment variables:" containing the removed var name
mv .env.local.bak .env.local
npm run build  # sanity: passes again
```

---

## Phase Gate (before `/gsd-verify-work`)

1. ✅ `cd dealdrop && npm run build` — passes with all 7 env vars
2. ✅ Env negative test — missing var produces clear error
3. ✅ Schema Verification SQL — all structural checks pass
4. ✅ RLS Impersonation Test — cross-user reads return 0 rows for both tables
5. ✅ Three-Client Verification debug page renders expected counts; `server-only` guard fires on client import
6. ✅ Shadcn Button renders with theme tokens (new-york/zinc/0.5rem)
7. ✅ `grep 'Create Next App' dealdrop/app/` returns nothing AND `grep DealDrop dealdrop/app/layout.tsx` matches

---

## Wave 0 Requirements

Wave 0 = dependency installs + scaffold setup that later waves depend on. No test framework files needed.

- [ ] Install Phase 1 npm packages: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `@t3-oss/env-nextjs`, `server-only`, `next-themes`, `lucide-react`, `sonner`
- [ ] Install dev: `supabase` CLI, `@types/node` (already present)
- [ ] Update `tsconfig.json` paths to include `./src/*` (Shadcn + lib code location)
- [ ] Update `package.json` `lint` script: `"lint": "eslint ."` (remove `next lint`)
- [ ] Create `dealdrop/.env.example` with 7 variable names (no values)

*No test framework install. If testing stance changes post-Phase 1, a later Wave 0 adds: `vitest`, `@testing-library/*`, `vitest.config.ts`.*

---

## Validation Sign-Off

- [ ] Every requirement (FND-01..08, DB-01..07) maps to a manual recipe above
- [ ] Sampling continuity: `npm run build` runs after every task that touches env/config/schema-typed code
- [ ] Phase Gate checklist covers all 5 ROADMAP success criteria
- [ ] No watch-mode flags (N/A — no framework)
- [ ] Feedback latency acceptable (~60s build; instant SQL)
- [ ] Wave 0 covers all scaffold prerequisites before any code-writing task starts
- [ ] `nyquist_compliant: true` set in frontmatter after checker verifies every task has an automated command or manual recipe

**Approval:** pending
