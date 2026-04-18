# Pitfalls Research

**Domain:** E-commerce price-tracking web app (Next.js 16 + Supabase + Firecrawl + Resend + Vercel)
**Researched:** 2026-04-17
**Confidence:** MEDIUM — tool access restricted; findings drawn from high-confidence training knowledge of each technology's documented failure modes. Flag any item for re-verification once tools are available.

---

## Critical Pitfalls

### Pitfall 1: Vercel Cron Timeout — Sequential Scraping Kills the Daily Job

**What goes wrong:**
The `/api/cron/check-prices` route iterates every tracked product, calls Firecrawl for each, then writes to Postgres. With even 15–20 products this blows past Vercel's function timeout: 10 s on Hobby, 60 s on Pro (default; configurable to 300 s on Pro with `maxDuration`). The cron fires, processes a handful of products, then hard-stops. Remaining products never get re-scraped. Users see stale prices with no error surfaced.

**Why it happens:**
Developers assume the cron endpoint is just another API route with generous timeout, and scraping latency per product is underestimated. Firecrawl JS-heavy page renders can take 3–8 s each. 10 products × 5 s = 50 s — already at or over Hobby limit.

**How to avoid:**
- Set `export const maxDuration = 300` in the route file (requires Vercel Pro; document this as a deploy requirement).
- Never await scrapes sequentially. Use `Promise.allSettled` to fan out all Firecrawl calls in parallel (respecting Firecrawl concurrency limits — typically 2 concurrent requests on free tier).
- For portfolio scale (< 50 products total across all users) parallel fan-out with `maxDuration = 300` on Pro is sufficient.
- Log start and end timestamps so timeout truncation is immediately visible in Vercel logs.

**Warning signs:**
- Cron logs show fewer products processed than exist in DB.
- Products stop updating after a fixed number (the ones processed before timeout).
- Vercel function logs show `Task timed out` or abrupt end without a completion log line.

**Phase to address:** Automated monitoring phase (cron endpoint implementation). Set `maxDuration` and fan-out pattern from day one — retrofitting is easy but easy to forget.

---

### Pitfall 2: pg_cron → HTTP Webhook Secret Leak

**What goes wrong:**
`pg_cron` calls `net.http_post` (via `pg_net` extension) to hit the Vercel cron endpoint. The SQL job must embed the `CRON_SECRET` Bearer token somewhere in the database. Developers hardcode the literal secret string in the pg_cron job SQL, which means:
1. The secret is visible in `cron.job` system table — any Supabase team member with SQL editor access sees it.
2. The secret appears in migration files committed to git → leaks to version control.
3. If the endpoint accidentally accepts GET requests without auth (e.g., a health-check route on the same path), anyone can trigger the cron manually.

**Why it happens:**
The `net.http_post` call requires headers to be passed inline in SQL. There's no native secret-manager interpolation in pg_cron SQL strings. Developers copy-paste the token directly.

**How to avoid:**
- Store `CRON_SECRET` in Supabase Vault (encrypted secrets store, available in all Supabase projects) and retrieve it via `vault.decrypted_secrets` in the SQL function that wraps the HTTP call. This way no plaintext secret ever appears in `cron.job`.
- Alternatively: write a Supabase Database Function that reads the secret from a config row in a non-public schema, then call that function from pg_cron rather than inlining the HTTP call.
- Never commit a migration that contains the literal secret value. Use a placeholder and document that the value must be set via Supabase Dashboard → Vault after deployment.
- The `GET /api/cron/check-prices` health-check must NOT skip auth. Use a separate path (e.g., `/api/health`) for unauthenticated health checks.
- Rotate `CRON_SECRET` if it ever appears in a migration file or git history. Treat rotation as mandatory, not optional.

**Warning signs:**
- `SELECT * FROM cron.job` in Supabase SQL editor shows a recognizable token string in the `command` column.
- Migration files in git contain the word "Bearer" followed by a non-placeholder string.
- The cron fires when you hit the endpoint with a GET request from a browser (no auth check on GET).

**Phase to address:** Automated monitoring setup phase. Auth on the cron endpoint and secret storage strategy must be decided and implemented together, not retrofitted.

---

### Pitfall 3: Supabase RLS Misconfiguration — price_history Left Unprotected

**What goes wrong:**
Developers add RLS policies to `products` (easy, obvious) but forget `price_history`. Since `price_history` rows are only linkable to a user via a JOIN through `products`, the naive assumption is "if products is protected, history is too." It isn't. Without RLS policies on `price_history`, any authenticated user can query all price history rows for all products across all users by querying the table directly. In a portfolio demo this is a data privacy failure that will be noticed by any reviewer who checks the Network tab.

**Why it happens:**
RLS is opt-in per table. Supabase does not warn you that a referenced table lacks policies when you enable RLS on the parent. The anon/service key distinction is also frequently confused — the service role key bypasses RLS entirely, so tests run with the service key pass even when policies are broken.

**How to avoid:**
- Enable RLS on BOTH `products` AND `price_history` from the start.
- `price_history` policy: `USING (product_id IN (SELECT id FROM products WHERE user_id = auth.uid()))` — enforces the ownership chain at query time.
- NEVER use the service role key in browser-side code or Next.js client components. Service role key belongs only in server-side trusted contexts (the cron API route).
- Validate RLS by running queries from the Supabase SQL editor while impersonating a user (Dashboard → Authentication → Users → "Impersonate"). Confirm that querying `price_history` as User A returns zero rows from User B's products.
- In the cron route (which legitimately needs to read all products), use the service role client explicitly and document why.

**Warning signs:**
- Supabase table editor shows all rows across all users when you query `price_history` while logged in as a non-admin user.
- `supabase.from('price_history').select('*')` in the browser console returns rows for product IDs you don't own.
- Tests pass with `SUPABASE_SERVICE_ROLE_KEY` but fail with the anon key — this is a sign policies are missing, not that tests are wrong.

**Phase to address:** Database schema + RLS phase. Policies must be written alongside migrations, not added later. Add an explicit checklist item to verify RLS on every table before moving to feature phases.

---

### Pitfall 4: Firecrawl Schema Extraction Drift — Silent Price Nulls

**What goes wrong:**
Firecrawl's `extract` feature with a JSON schema returns structured data by inferring fields from page content. E-commerce sites change their markup, A/B test layouts, or geo-redirect to localized pages. When the layout drifts, Firecrawl returns `null` for `current_price` (or omits the field) without an HTTP error — the scrape "succeeds" with a 200 and an empty price field. The app dutifully writes `null` to `price_history`, which triggers a false positive "price dropped to null" or silently corrupts the product state. If the null propagates to the email alert, users get nonsensical messages.

**Why it happens:**
Developers check for HTTP errors from Firecrawl but don't validate the extracted payload. The JSON schema makes them feel safe — "if the schema says `current_price: number`, it'll be a number." Firecrawl doesn't enforce types strictly; it returns what it can infer.

**How to avoid:**
- After every Firecrawl call, validate the extracted object: `current_price` must be a finite positive number, `name` must be a non-empty string. Reject and mark the product `last_scraped_status = 'failed'` if validation fails.
- Never write a null price to `price_history`. Gate the insert: `if (scrapedPrice !== null && scrapedPrice > 0)`.
- Add a `NOT NULL` constraint on `price_history.price` at the DB level as a last-resort guard.
- Log what Firecrawl returned (sanitized, no PII) whenever validation fails so you can debug layout drift.
- Use Firecrawl's `actions` (click-to-expand, scroll) only when necessary — they increase latency and cost; test without them first.

**Warning signs:**
- `price_history` table has rows where `price IS NULL`.
- Products show `current_price = null` or `$NaN` in the UI.
- A specific retailer's products all fail on the same day (geo-redirect or A/B test rollout).

**Phase to address:** Scraping + product tracking phase. Validation must be part of the initial scrape handler, not added after a bug is noticed in prod.

---

### Pitfall 5: Firecrawl Cost Blowup — Unbounded Concurrent Scrapes

**What goes wrong:**
Firecrawl charges per page scrape (credits). A daily cron that fans out all products in parallel with `Promise.allSettled` will exhaust a free-tier credit allowance in days if many users are added, or if the cron is accidentally triggered multiple times (e.g., pg_cron misconfigured to run every minute instead of every day). The cron endpoint has no idempotency guard, so a double-fire doubles the cost.

**Why it happens:**
`0 9 * * *` vs `* 9 * * *` is a one-character difference in cron syntax. Portfolio projects don't implement idempotency because they're not expected to be abused.

**How to avoid:**
- Verify the pg_cron schedule string produces exactly one fire per day using a cron expression validator before deploying.
- Add a simple idempotency guard: record the last successful cron run timestamp in a `cron_runs` table. At cron start, check if a run already completed today (UTC); if so, return early with 200.
- Rate-limit Firecrawl calls even in the parallel fan-out: use a concurrency limiter (e.g., `p-limit` with `limit(2)`) so at most 2 concurrent Firecrawl requests are in flight. This respects free-tier concurrency limits and prevents credit burst.
- Track Firecrawl credit usage in the dashboard and set alerts at 80% consumption.
- For portfolio demo: cap tracked products at 20–30 total across all users (a reasonable portfolio-demo limit) to bound worst-case daily cost.

**Warning signs:**
- Firecrawl dashboard shows credit consumption spikes on specific days.
- Cron logs show multiple overlapping runs in the same hour.
- pg_cron `cron.job_run_details` table shows more rows per day than expected.

**Phase to address:** Automated monitoring phase. Concurrency limits and idempotency should be built into the initial cron implementation.

---

### Pitfall 6: Google OAuth Redirect URI Mismatch on Deploy

**What goes wrong:**
During local development, the Supabase Auth callback URL is `http://localhost:3000/auth/callback`. On Vercel deployment, it becomes `https://dealdrop.vercel.app/auth/callback` (or a custom domain). If the production callback URL is not added to both:
1. Supabase Dashboard → Auth → URL Configuration → Redirect URLs
2. Google Cloud Console → OAuth 2.0 Client → Authorized Redirect URIs

...then every production login attempt fails with an OAuth redirect URI mismatch error. The error message in the browser is cryptic (`redirect_uri_mismatch`), and Supabase's Auth logs don't always surface the root cause clearly.

**Why it happens:**
Auth is set up locally first and works. Developers forget that OAuth providers maintain their own whitelist of valid redirect URIs. Vercel preview deployments also generate unique URLs (`dealdrop-git-feature-abc123.vercel.app`) that aren't pre-registered.

**How to avoid:**
- In Google Cloud Console, register both `http://localhost:3000/auth/callback` (dev) and `https://dealdrop.vercel.app/auth/callback` (prod) before writing any auth code.
- In Supabase Auth settings, add the production URL to the allowed redirect list and set `NEXT_PUBLIC_SITE_URL` env var on Vercel to the canonical production URL.
- Use Supabase's wildcard redirect pattern for Vercel preview URLs: `https://*.vercel.app/auth/callback` (Supabase supports glob patterns in redirect URLs).
- Test the full OAuth flow on a Vercel preview deploy before merging to main.
- Set `NEXT_PUBLIC_SITE_URL` as a Vercel environment variable with distinct values for Production vs. Preview environments.

**Warning signs:**
- Google OAuth login works on localhost but returns a browser error on Vercel.
- Supabase Auth logs show `redirect_uri_mismatch`.
- Preview deployments get CORS or redirect errors after authentication.

**Phase to address:** Auth phase. Register all URLs (localhost + production + preview wildcard) as the very first step before any auth code is written.

---

### Pitfall 7: Next.js 15/16 App Router — Server Action Caching and Revalidation Traps

**What goes wrong:**
Three distinct failure modes in the App Router:

1. **Stale data after mutation:** A Server Action adds a product, but the dashboard still shows the old product list. The route segment is cached and `revalidatePath('/')` wasn't called (or was called incorrectly — e.g., with a different path string than the actual route). Users think their add failed.

2. **Server/client boundary serialization errors:** Passing non-serializable values (class instances, Dates as objects, functions) as props from Server Components to Client Components throws a cryptic runtime error. Recharts and Shadcn are client-side; the data fed to them must be plain JSON.

3. **Incorrect `use server` / `use client` directive placement:** A Server Action file that imports a browser API (or vice versa) causes a build error that's confusing to diagnose because the error points to a bundling issue, not the import itself.

**Why it happens:**
App Router caching is opt-out-by-default in Next.js 13–15 (partially reversed in 15+, but still has nuances). Developers coming from Pages Router expect mutations to trigger re-renders automatically.

**How to avoid:**
- After every Server Action that mutates data, call `revalidatePath('/', 'layout')` to bust the full layout cache. Use the exact path string your page is on.
- Alternatively, use `revalidateTag` with tagged fetches if you want fine-grained cache invalidation.
- Pass dates from Server Components to Client Components as ISO strings (`date.toISOString()`), not `Date` objects.
- Keep `'use server'` files free of any browser-only imports. Keep `'use client'` files free of server-only imports (`fs`, `crypto` node builtins, Supabase server client).
- Use Next.js `unstable_noStore()` or `export const dynamic = 'force-dynamic'` on routes where stale data is unacceptable (e.g., the dashboard).

**Warning signs:**
- Dashboard doesn't update immediately after adding/removing a product, but a hard refresh shows the new state.
- Build errors mentioning "cannot be used in Client Component" or "You're importing a component that needs `useState`."
- Recharts or other client components throw serialization errors about non-plain objects.

**Phase to address:** Dashboard + product tracking phase. Set `revalidatePath` calls from day one in every Server Action. Establish the pattern once in the first action and apply consistently.

---

### Pitfall 8: Resend Deliverability — Domain Verification and SPF/DKIM

**What goes wrong:**
Price drop alert emails land in spam or are rejected by receiving servers because:
1. Sending from a Resend sandbox domain (like `onboarding@resend.dev`) works in testing but is sandboxed — emails only deliver to the account owner's address, not arbitrary users.
2. A custom domain is configured in Resend but SPF and DKIM DNS records are missing or haven't propagated yet. Gmail and Outlook bulk-classify unauthenticated emails as spam.
3. The `from` address uses a different domain than the one verified in Resend (e.g., sending from `@gmail.com` via Resend — rejected immediately).

**Why it happens:**
Developers test against their own email address (which always receives), then deploy without verifying that custom domain DNS records are in place. The portfolio demo sends to real users who have strict spam filters.

**How to avoid:**
- For a portfolio project, it's acceptable to keep using `onboarding@resend.dev` for initial testing, but before inviting anyone else: register a real domain (even a cheap `.dev` or `.app` domain), add it to Resend, and configure all three DNS records Resend provides (SPF TXT, DKIM CNAME × 2).
- Verify domain with Resend's DNS checker before writing any email-sending code that targets non-owner addresses.
- Always set a `replyTo` field pointing to a monitored inbox so replies don't bounce.
- Use Resend's test mode in development (send to `delivered@resend.dev` to confirm delivery without hitting real inboxes).
- Include a plain-text version of the email alongside the HTML template — improves spam scores.

**Warning signs:**
- Emails arrive in your own inbox but users report never receiving them.
- Resend dashboard shows "delivered" but users check spam and it's not there either (silent reject).
- `nslookup -type=TXT yourdomain.com` doesn't show a Resend SPF record.
- Resend dashboard shows domain status as "Unverified" or "Pending."

**Phase to address:** Email alerting phase. Domain verification must be completed before the email-sending code is written, not after. Treat DNS propagation time (up to 48 h) as a scheduling constraint.

---

### Pitfall 9: Currency Handling — Intl.NumberFormat Gaps and Missing Codes

**What goes wrong:**
`Intl.NumberFormat(locale, { style: 'currency', currency: scrapedCurrencyCode })` throws a `RangeError: Invalid currency code` if Firecrawl scrapes an unexpected value (e.g., `"Rs"`, `"₹"`, `"points"`, empty string, or a numeric symbol instead of an ISO 4217 code). The error crashes the component that renders the product card. Since currency codes come from untrusted scrape output, any malformed value breaks the UI for that product.

**Why it happens:**
`Intl.NumberFormat` requires a strict ISO 4217 three-letter code (`USD`, `INR`, `EUR`). Scraped pages often display localized currency symbols or abbreviations that don't match this spec. Developers use the scraped `currency` field directly without sanitizing it.

**How to avoid:**
- Sanitize scraped `currency_code` before storage: validate it against a known ISO 4217 allowlist (a simple Set of the ~170 active codes) and default to `"USD"` (or flag as `"UNKNOWN"`) if it doesn't match.
- Wrap `Intl.NumberFormat` in a utility function with a try/catch that falls back to a raw string like `${price} ${currency}` if formatting throws.
- Consider storing the currency symbol separately from the code in the DB, as a belt-and-suspenders approach when the code is ambiguous.
- In the Firecrawl schema prompt, explicitly instruct: "Return currency as a 3-letter ISO 4217 code (e.g., USD, EUR, INR, GBP). If unsure, return 'USD'." This improves extraction accuracy.

**Warning signs:**
- Product cards for non-USD products show `NaN` or throw a JS error in the console.
- `RangeError: Invalid currency code in Intl.NumberFormat()` appears in Vercel function or browser error logs.
- Products from non-US sites show a blank or broken price display.

**Phase to address:** Product tracking phase (scraping + storage). The sanitization function and DB constraint should be added when the `products` table is created, not as a bug fix after launch.

---

### Pitfall 10: React 19 + Tailwind v4 — Breaking Differences from Common Examples

**What goes wrong:**
Two issues specific to this stack version combination:

1. **Tailwind v4 configuration:** Tailwind v4 eliminates `tailwind.config.js` in favor of CSS-first configuration (`@theme` in a CSS file). All tutorials, Shadcn docs, and community examples written for Tailwind v3 assume `content`, `theme.extend`, and `plugins` keys in a JS config. Shadcn UI's own init command may generate v3-style config that conflicts with v4. Custom theme tokens set in the old way silently have no effect.

2. **React 19 `use` API and Suspense:** React 19 introduces the `use()` hook for reading promises. Recharts and some Shadcn components have not been fully validated against React 19 concurrent rendering. There are known compatibility warnings (and occasional hydration mismatches) when using certain Recharts chart components with Server Component data passing patterns.

**Why it happens:**
The scaffold is on the cutting edge. Most documentation and Stack Overflow answers still target Tailwind v3 and React 18.

**How to avoid:**
- For Tailwind v4: configure all theme extensions in `app/globals.css` using `@theme` blocks. Do not create a `tailwind.config.js` unless you have a specific reason. Check Shadcn's v4-compatible setup instructions before running `shadcn init` (Shadcn released v4 support in late 2024 — verify you're using the correct init flags).
- For Recharts with React 19: wrap chart components in `'use client'` boundaries and in a `<Suspense>` wrapper with a fallback. Avoid passing `Date` objects directly to chart data arrays — serialize to timestamps (numbers) and format in the tooltip renderer.
- Pin Recharts to a known-working version (`^2.12.x`) and don't upgrade mid-project without testing.
- Check `npm ls react` after installing dependencies to confirm no package is pinning React 18 (dual-React bugs are cryptic).

**Warning signs:**
- Tailwind utility classes render correctly in dev but are missing in production build (indicates purge misconfiguration in v4 config).
- Recharts throws `Warning: An update to X inside a test was not wrapped in act(...)` or hydration mismatch errors in the console.
- `shadcn add button` generates a component that imports from the wrong Tailwind path.

**Phase to address:** Infrastructure/scaffold phase. Verify Tailwind v4 + Shadcn compatibility and React 19 + Recharts compatibility before writing any feature code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Sequential Firecrawl calls instead of parallel | Simpler code to write | Cron hits timeout at ~10 products | Never — parallelize from day one |
| Hardcoding CRON_SECRET in pg_cron SQL | Quick to set up | Secret visible in DB, leaks to git | Never — use Vault from day one |
| Skipping RLS on `price_history` | One fewer migration step | Any user can read all history | Never — add with initial migration |
| Using service role key in Next.js client components | Bypasses auth issues during dev | Full DB access from browser — catastrophic if leaked | Never |
| No currency validation (trust scraped value) | Faster to ship | UI crashes on non-standard codes | Never — add a 5-line sanitizer |
| Not calling `revalidatePath` after mutations | Simpler actions | Dashboard looks broken, user confusion | Never — always revalidate |
| Skipping Resend domain verification | Send immediately with sandbox | Emails only land in your inbox, not users' | Acceptable for personal testing only |
| No idempotency guard on cron endpoint | Simpler endpoint code | Double-fire doubles Firecrawl cost | Acceptable if pg_cron is verified correct |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Firecrawl | Trusting extracted fields as valid without validation | Always validate type and range of `current_price`, `name`, `currency_code` before writing to DB |
| Supabase Auth + Next.js | Using `createClient` (browser) in Server Components | Use `createServerClient` from `@supabase/ssr` in server context; `createBrowserClient` only in `'use client'` files |
| Supabase RLS | Testing only with the service role key | Test with an anon-key client impersonating a specific user to verify policies actually block unauthorized access |
| pg_cron + pg_net | Embedding secrets in SQL job definition | Store secrets in Supabase Vault; reference via a wrapper function |
| Resend | Sending from unverified domain in production | Complete DNS verification (SPF + DKIM) before sending to non-owner inboxes |
| Google OAuth | Registering only localhost redirect URI | Register both localhost, production URL, and Vercel preview wildcard in Google Console and Supabase Auth settings |
| Next.js Server Actions | Not calling `revalidatePath` after DB mutations | Always call `revalidatePath('/', 'layout')` or the relevant path at the end of every mutating action |
| Vercel cron / functions | Assuming default timeout is sufficient for scraping loops | Set `export const maxDuration = 300` in the route file (requires Pro plan) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential Firecrawl requests in cron | Cron times out; partial product updates | Use `Promise.allSettled` + `p-limit(2)` concurrency cap | ~10 products on Hobby, ~60 products on Pro without `maxDuration` |
| No DB index on `price_history.product_id` | Price history queries slow as history grows | Add `CREATE INDEX ON price_history(product_id)` in initial migration | At ~1,000 history rows per product |
| Fetching full price history for all products on dashboard load | Dashboard initial load slow | Fetch only the last 30 days of history per product; paginate or lazy-load chart data | At ~365 rows per product |
| No limit on `price_history` rows returned | Recharts receives thousands of data points, chart renders slowly | Cap history query with `LIMIT 90 ORDER BY checked_at DESC` | At ~1 year of daily tracking per product |
| Re-fetching all products server-side on every page visit | Slow TTFB on dashboard | Use Supabase real-time subscription or Next.js route caching with targeted revalidation | At ~50+ products in the list |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in client-side code or `NEXT_PUBLIC_` env var | Full unauthorized DB access from any browser | Keep service role key only in server-side env vars (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`) |
| No auth on `POST /api/cron/check-prices` | Anyone can trigger mass Firecrawl scrapes, draining credits and sending spam alerts | Enforce `Authorization: Bearer CRON_SECRET` check as the first line of the handler; return 401 immediately if absent or wrong |
| Accepting any URL in the "Add Product" form without validation | SSRF potential if Firecrawl is misconfigured; also enables scraping of internal network addresses | Validate that the URL starts with `https://` and matches a hostname allowlist (or at minimum, blocks private IP ranges) |
| Storing Firecrawl API key in client-accessible env var | API key exposed in page source; attacker can make unlimited scrape calls | Use `FIRECRAWL_API_KEY` (no `NEXT_PUBLIC_` prefix); only call Firecrawl from Server Actions or API routes |
| No rate limit on the "Add Product" Server Action | User can spam product adds, rapidly exhausting Firecrawl credits | Add a per-user product cap in the Server Action (e.g., `SELECT COUNT(*) WHERE user_id = auth.uid()` and reject if > 20) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during Firecrawl scrape (3–8 s) | User thinks submit did nothing; double-submits | Show a spinner/skeleton immediately on form submit; disable submit button during pending state |
| Showing raw scrape error to user | Confusing technical messages ("ERR_NAVIGATION_TIMEOUT") | Map scrape errors to friendly messages: "We couldn't reach that page — check the URL and try again" |
| No empty state for zero-product dashboard | Logged-in users with no products see a blank grid, assume app is broken | Show illustrated empty state with "Add your first product" prompt |
| Deleting product without confirmation | Accidental deletion of a tracked product with months of history | Shadcn AlertDialog for destructive confirmation — already planned |
| Price displayed without currency for non-USD products | "$42.00" when actual currency is INR ₹42 | Always display currency code or symbol alongside price |
| Email alert with no unsubscribe link | Regulatory risk (CAN-SPAM, GDPR) even for portfolio; poor UX | Add "You're receiving this because you track products on DealDrop — remove a product to stop alerts" footer |

---

## "Looks Done But Isn't" Checklist

- [ ] **Cron endpoint:** POST auth works — but verify GET route does NOT trigger scraping (health check only)
- [ ] **RLS:** `products` table has policies — but verify `price_history` also has policies enforcing ownership chain
- [ ] **Auth:** Google OAuth works on localhost — but verify production Vercel URL is registered in Google Console AND Supabase Auth settings
- [ ] **Firecrawl integration:** Product adds successfully — but verify cron re-scraping also handles scrape failures gracefully (sets `last_scraped_status = 'failed'`, doesn't write null to price_history)
- [ ] **Email alerts:** Resend `emails.send` returns success — but verify emails arrive in a non-owner inbox (the one you're sending TO is different from the Resend account email)
- [ ] **Price history chart:** Recharts renders — but verify it handles a single data point (no line to draw) and zero data points (product just added) without crashing
- [ ] **Currency display:** USD products render correctly — but verify a non-USD product (add an Amazon.in or Amazon.co.uk URL) formats without throwing `RangeError`
- [ ] **Supabase env vars:** App works in dev — but verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel production environment, not just locally
- [ ] **maxDuration:** Cron works for 2 test products — but verify behavior with 15+ products (check Vercel function logs for timeout)
- [ ] **Cascade delete:** "Remove" button deletes the product — but verify `price_history` rows are also deleted (FK cascade must be defined in migration, not assumed)

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CRON_SECRET leaked in git | HIGH | Rotate secret immediately: generate new value, update Supabase Vault + Vercel env var + Google OAuth client if needed; use `git filter-repo` to remove from history if public repo |
| RLS missing on `price_history` in production | MEDIUM | Write and apply a migration adding the policy; no data migration needed — policy applies immediately to future queries |
| Cron timing out silently | MEDIUM | Add `maxDuration = 300`, switch to parallel fan-out with `p-limit(2)`; re-run cron manually to catch up missed products |
| Firecrawl cost blowup | MEDIUM | Pause pg_cron immediately (`SELECT cron.unschedule('check-prices')`); audit Firecrawl dashboard; add idempotency guard before re-enabling |
| Emails landing in spam | MEDIUM | Complete domain DNS verification (SPF + DKIM); wait 24–48 h propagation; ask early testers to mark as "Not Spam" to train filters |
| Google OAuth broken on production | LOW | Register production URL in Google Console and Supabase Auth settings; fix takes < 5 min but requires Google Console access |
| Currency RangeError crashing card | LOW | Wrap `Intl.NumberFormat` in try/catch with raw fallback; deploy; no data migration needed |
| Tailwind classes not applying in production | LOW | Check `@import "tailwindcss"` is in globals.css; verify no conflicting `tailwind.config.js`; rebuild |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vercel cron timeout | Automated monitoring phase | Test cron with 15 mock products; check Vercel function logs for completion |
| pg_cron secret leak | Automated monitoring phase | `SELECT command FROM cron.job` — must not contain plaintext secret |
| RLS missing on price_history | DB schema phase | Query `price_history` as a non-owner user; assert zero rows returned |
| Firecrawl schema drift / null prices | Product tracking phase | Add a product from a non-English-locale e-commerce site; verify null price is caught |
| Firecrawl cost blowup | Automated monitoring phase | Verify pg_cron schedule string fires exactly once per day; check idempotency logic |
| Google OAuth redirect mismatch | Auth phase | Deploy to Vercel preview; complete full OAuth flow from preview URL |
| Server Action caching / revalidation | Dashboard phase | Add then immediately view product list — must reflect new product without hard refresh |
| Resend deliverability | Email alerting phase | Send test alert to a non-Resend-account email; verify inbox delivery, not spam |
| Currency RangeError | Product tracking phase | Add product from Amazon.in (INR); verify price renders without JS error |
| React 19 + Tailwind v4 compatibility | Infrastructure / scaffold phase | Run production build; verify no Tailwind purge gaps, no React hydration warnings |

---

## Sources

- Firecrawl documentation (docs.firecrawl.dev) — extraction schema behavior, error response shapes, concurrency limits
- Supabase documentation (supabase.com/docs) — RLS guide, pg_cron + pg_net setup, Vault secrets, Auth URL configuration
- Next.js 15 docs (nextjs.org/docs) — App Router caching, `revalidatePath`, Server Actions, `maxDuration` configuration
- Vercel documentation (vercel.com/docs) — Function timeout limits by plan, cron job limits
- Resend documentation (resend.com/docs) — Domain verification, SPF/DKIM setup, sandbox restrictions
- Google OAuth 2.0 documentation — Authorized redirect URI requirements
- React 19 release notes — `use()` hook, concurrent rendering changes
- Tailwind CSS v4 migration guide — CSS-first configuration, removal of JS config
- IETF RFC 4217 — ISO currency codes referenced by `Intl.NumberFormat`

---
*Pitfalls research for: DealDrop (e-commerce price tracker)*
*Researched: 2026-04-17*
*Confidence: MEDIUM — authoritative knowledge of each technology's documented failure modes; no live web verification due to tool restrictions. Re-verify Firecrawl pricing tiers and Vercel timeout limits at time of implementation as these change frequently.*
