# Phase 4: Product Tracking & Dashboard - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the end-to-end user-facing product management loop: an authenticated user pastes an e-commerce URL → it is scraped via the Phase 3 `scrapeProduct()` function → the resulting product is persisted with an initial `price_history` row → the dashboard renders a responsive grid of product cards with per-product actions (View Product, Remove with confirm, Show Chart placeholder for Phase 5). Covers TRACK-01, TRACK-02, TRACK-06, TRACK-07, TRACK-08, TRACK-09 and DASH-01 through DASH-08.

**In scope:**
- Add Product form (client component) and `addProduct` Server Action
- `removeProduct` Server Action + AlertDialog confirmation
- Empty state for users with zero products
- Responsive product grid (Shadcn Card)
- Per-product actions visible on the card (View Product external link, Show Chart toggle — Phase 5 fills the chart body, Phase 4 wires the toggle; Remove)
- Tracking-failed badge (DASH-08) — this phase renders the badge; data source is defined here so Phase 6 cron knows what column to write
- `openAuthModal()` wiring (completes AUTH-04)
- Reason-code → toast-copy map consuming the Phase 3 `ScrapeFailureReason` union (closes P3 D-03)
- Install Shadcn primitives: AlertDialog, Badge, Input, Label (and Form wrapper if needed)

**Not in scope:**
- Price history chart body — Phase 5 (DASH-04 toggle button only; chart itself deferred)
- Daily cron, email alerts, tracking-failed population — Phase 6
- Loading skeletons for the full grid on first paint — Phase 7 polish (a per-card skeleton during add IS in scope per D-02)
- Search/filter/sort of products — not in requirements, future phase candidate
- Multi-user sharing, public product links — explicit out-of-scope per PROJECT.md

</domain>

<decisions>
## Implementation Decisions

### Add Product Form Placement

- **D-01:** **Inline form on empty state + modal Dialog thereafter.** A user with zero products sees the add form embedded inline directly under the empty-state headline. Once at least one product exists, the dashboard header shows a "+ Add Product" button that opens a Shadcn Dialog containing the same form. The form component is shared between both surfaces. Rationale: progressive disclosure — zero-friction first add, clean grid after. Matches Phase 2's stacked-centered hero tone.

### Submit UX (scrape-in-flight)

- **D-02:** **Optimistic skeleton card.** When the user submits a valid URL, the client component:
  1. Validates URL shape with the same Zod rules exported from `@/lib/firecrawl/url` (defense-in-depth; `scrapeProduct` validates again server-side per P3 D-07).
  2. Immediately inserts a skeleton card into the grid (shimmer placeholder using Tailwind `animate-pulse`) with a temporary client-side ID.
  3. Fires the Server Action. On `{ok:true}` → skeleton replaced with real card (server re-render via `revalidatePath('/')`). On `{ok:false}` → skeleton removed, error toast shown via Sonner with reason-mapped copy (see D-07).
  4. Submit button is also disabled with a spinner to prevent double-submit — this is additive, not instead of, the skeleton.
  
  Rationale: perceived speed matters for the paste flow; full round-trip can take 10-30s against Firecrawl. Pessimistic spinner-only feels broken at that duration.

### Unauth Paste Persistence

- **D-03:** **Stash URL in sessionStorage across auth.** If a logged-out user submits the Add Product form:
  1. The form detects unauth (no session) and calls `openAuthModal()` (P2 D-07) — no scrape attempted.
  2. Before opening the modal, the pasted URL is written to `sessionStorage['dealdrop:pending-add-url']`.
  3. On a successful Google OAuth callback, the app re-mounts with a valid session. A `useEffect` in the Add Product form (or an equivalent mount-time hook in DashboardShell) reads the pending URL, clears it from sessionStorage, and auto-submits.
  4. If the auto-submit fails (rare — expired session, network), the URL stays pre-filled in the form so the user can retry without re-pasting.
  
  Rationale: the OAuth redirect is a UX cliff — "paste, click, get bounced, forget what I pasted" is a real drop-off point. sessionStorage (not localStorage) ensures the pending URL is scoped to the current tab and auto-expires.

### Empty State Design

- **D-04:** **Centered headline + inline form + muted sample-URL hint.** The empty state is:
  - Centered heading: **"Track your first product"** (not "No products yet" — action-framed, not absence-framed)
  - One-line subtitle: *"Paste a product URL from any site — we'll check the price daily and email you when it drops."*
  - Inline Add Product form (URL input + Track button) directly below
  - Muted helper text under the input: *"e.g., https://www.amazon.com/dp/XXXXXXXXXX"* (one neutral example — stays within PROJECT.md Core Value of "any e-commerce URL")
  - No illustration, no numbered steps, no social proof. Matches Phase 2's stacked-centered hero composition so the two auth states feel like the same app.

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner should use these defaults; surface as a deviation if any materially changes the plan or user-visible behavior.

- **Product card actions layout:** All three actions visible on the card footer row at all times (no hover-reveal, no 3-dot menu). Left: "View Product" external link (new tab, `rel="noopener noreferrer"`). Right: "Show Chart" Ghost button (Phase 5 will wire the chart body — Phase 4 ships the toggle + empty slot). Far right: "Remove" destructive-variant Ghost icon button (Lucide `Trash2`) that opens an AlertDialog. Rationale: portfolio bar — all affordances discoverable; no hover-only on mobile.

- **Card density & image:** Card width fills grid column (responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Product image is rendered via `next/image` at a fixed 4:3 aspect ratio (`aspect-[4/3]`, `object-contain`, background `bg-muted` so transparent product images don't look broken). Name below image (2-line clamp). Current price formatted with `Intl.NumberFormat(undefined, { style: 'currency', currency: <code> })` — uses the user's browser locale for symbol rendering but the stored currency code for correctness.

- **Tracking-failed badge data source:** Add a single nullable column to the existing `products` table: `last_scrape_failed_at TIMESTAMPTZ NULL`. Populated by Phase 6 cron when a re-scrape returns `{ok:false}`; cleared to NULL on the next successful re-scrape. DASH-08 renders a red `<Badge variant="destructive">Tracking failed</Badge>` when this column is non-null AND more than 0 days old (always non-null → always show, but the cleared-on-success behavior keeps it transient). Phase 4 adds the column in a migration and renders the badge; Phase 4 itself never writes to it (initial add is always success — failure at initial-add time shows a toast and no row is inserted, so no failed state to badge yet). Rationale: single nullable timestamp column is the cheapest model that answers "is this product currently failing?" without a separate table.

- **Remove flow & optimistic update:** Remove is optimistic — clicking the confirm button in the AlertDialog immediately removes the card from the grid client-side while the Server Action runs. On error, the card reappears and an error toast shows. Uses Shadcn AlertDialog with "Remove" (destructive variant) and "Cancel" buttons. Confirmation copy: *"Remove this product? Its price history will be deleted."* Wording matches the DB CASCADE DELETE behavior without pretending it's reversible.

- **Duplicate URL handling (TRACK-07):** Detected via the `products (user_id, url)` unique constraint. `addProduct` Server Action catches the Postgres error code `23505` and returns `{ok:false, reason:'duplicate_url'}` — a new failure reason code specific to Phase 4 (not in the Phase 3 `ScrapeFailureReason` union; this is a database-layer failure, not a scrape-layer failure). Toast copy: *"You're already tracking this product."* After showing the toast, the grid scrolls to the existing card and briefly outlines it (2s ring animation) so the user sees where the duplicate lives.

- **Reason → toast-copy map (closes P3 D-03):** Maintained in a single module `@/lib/firecrawl/toast-messages.ts` (client-safe — no server-only). Maps every `ScrapeFailureReason` variant + the Phase 4 `duplicate_url` case:
  - `invalid_url` → "That URL doesn't look right. Check for typos."
  - `network_error` → "Couldn't reach that site — try again in a moment."
  - `scrape_timeout` → "That page took too long to load. Try a different URL."
  - `missing_price` → "We couldn't find a price on that page."
  - `missing_name` → "We couldn't find a product name on that page."
  - `invalid_currency` → "That page's currency format isn't supported yet."
  - `unknown` → "Something went wrong. Try again later."
  - `duplicate_url` → "You're already tracking this product."
  
  Exhaustive switch with a compile-time exhaustiveness check (mirror Phase 3 types.ts pattern) so adding a future reason forces the copy map to update.

- **Revalidation strategy:** `revalidatePath('/')` after every successful mutation (add, remove). Surgical tag-based revalidation is over-engineered for a single page. The optimistic updates cover perceived speed; revalidation ensures eventual consistency with DB state.

### Folded Todos

(none — cross-reference check found no pending todos matching Phase 4 scope)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — TRACK-01, TRACK-02, TRACK-06, TRACK-07, TRACK-08, TRACK-09 + DASH-01 through DASH-08 acceptance criteria
- `.planning/ROADMAP.md` §"Phase 4: Product Tracking & Dashboard" — goal + 5 success criteria
- `.planning/PROJECT.md` — Core Value (any-site URL support is non-negotiable); Portfolio/demo quality bar

### Prior Phase Context (locked decisions this phase consumes)
- `.planning/phases/02-authentication-landing/02-CONTEXT.md` §D-07 — `openAuthModal()` hook contract (AUTH-04 trigger lives here in Phase 4)
- `.planning/phases/02-authentication-landing/02-CONTEXT.md` §D-13 — Sonner toast surface (already mounted in `app/layout.tsx`)
- `.planning/phases/03-firecrawl-integration/03-CONTEXT.md` §D-01–D-08 — `scrapeProduct` discriminated-union contract, failure taxonomy, URL normalization rules
- `.planning/phases/03-firecrawl-integration/03-CONTEXT.md` §D-03 — *"Phase 4 owns the reason → toast-copy map"* (closed by D-07 Claude's Discretion above)
- `.planning/phases/03-firecrawl-integration/03-03-SUMMARY.md` — `scrapeProduct` implementation summary + `normalizeUrl` client-safe import path

### Existing Code Contracts (reuse verbatim)
- `dealdrop/src/lib/firecrawl/scrape-product.ts` — `scrapeProduct(url: string): Promise<ScrapeResult>` (server-only)
- `dealdrop/src/lib/firecrawl/url.ts` — `normalizeUrl(raw: string): string`, `validateUrl(raw: string)` (client-safe; no server-only)
- `dealdrop/src/lib/firecrawl/types.ts` — `ScrapeResult`, `ScrapeFailureReason`, `ProductData`
- `dealdrop/src/lib/supabase/server.ts` — `createClient()` for Server Action DB writes
- `dealdrop/src/components/auth/AuthModalProvider.tsx` — `openAuthModal()` context hook (completes AUTH-04 here)
- `dealdrop/src/components/dashboard/DashboardShell.tsx` — placeholder authenticated surface; Phase 4 replaces the `<div>`-welcome body with the grid + empty state
- `dealdrop/app/layout.tsx` — Sonner `<Toaster />` mount (already wired)
- `dealdrop/app/page.tsx` — auth-branch root; DashboardShell rendered when session present

### Database Schema (locked, no Phase 4 schema work except DASH-08 column)
- `dealdrop/supabase/migrations/*` — `products` (unique `(user_id, url)`, CHECK `current_price > 0`) and `price_history` (CASCADE DELETE on product_id) per FND/DB requirements
- **New in Phase 4:** single migration adding `products.last_scrape_failed_at TIMESTAMPTZ NULL` (DASH-08 data source per Claude's Discretion above)

### Shadcn Primitives (need install in this phase)
- `AlertDialog` — Remove confirmation (DASH-06)
- `Badge` — Tracking-failed status (DASH-08)
- `Input` + `Label` — Add Product form
- `Form` (optional — use if react-hook-form is worth it for one field; plain `<form action={addProduct}>` with useFormState is also acceptable)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scrapeProduct(url)`** — Phase 3 public API. Phase 4 `addProduct` Server Action calls this directly, narrows on `result.ok`, writes rows on success, maps reason to toast on failure.
- **`normalizeUrl(raw)`** — client-safe; use in the Add Product form for paste-time dedupe hint (optional UX nicety) and always server-side before the unique-constraint insert.
- **`openAuthModal()`** — already exported from `AuthModalProvider`; Phase 4 calls this when unauth user submits (D-03).
- **Sonner `toast.success` / `toast.error`** — already available globally via the Phase 2 `<Toaster />` mount.
- **Shadcn `Card`** — already installed; used in FeatureCard. Product card reuses the same base.
- **Shadcn `Dialog`** — already installed; used for AuthModal. Add Product modal (D-01 populated-state path) reuses the same base.
- **Shadcn `Button`** — already installed; variants `default` (Track), `ghost` (Show Chart), `destructive` (Remove).

### Established Patterns
- **Server Action → revalidatePath('/')** — add/remove mutations trigger full-page re-render (simple, correct for a single-page app).
- **Supabase RLS owns authorization** — `createClient()` from `@/lib/supabase/server` picks up the user's session; RLS policies (DB-05, DB-06) enforce per-user scoping at query time. Phase 4 Server Actions never pass `user_id` manually; the DB does it via `auth.uid()`.
- **Typed discriminated unions for failures** — `{ ok: true, data } | { ok: false, reason }` everywhere; client narrows on `result.ok` with TS-enforced exhaustiveness.
- **`import 'server-only'` on any module that reads `env.server`** — `addProduct`/`removeProduct` Server Actions live in a file that imports scrapeProduct (which is server-only), so the action file is implicitly server-only too.
- **Client-safe utils live in `@/lib/firecrawl/url` or similar** — never re-export server-only modules from client-safe paths; `normalizeUrl` stays accessible to the Add Product client component without pulling server-only into the bundle.

### Integration Points
- **`app/page.tsx`** — existing `if (session) <DashboardShell /> else <Hero />` branch. Phase 4 replaces DashboardShell body, doesn't touch the branch.
- **`DashboardShell` component** — becomes the authenticated page surface. Needs to fetch the user's products on the server (RLS-scoped query), branch to empty-state or grid+add-button, and render the auto-submit hook for D-03.
- **`AuthModalProvider`** — Phase 4 form consumer calls `openAuthModal()`. No changes to the provider itself.
- **Supabase client** — use `createClient()` (server) for Server Actions; no new client factory needed.

</code_context>

<specifics>
## Specific Ideas

- **Tone alignment:** Empty state copy ("Track your first product" / "Paste a product URL from any site — we'll check the price daily and email you when it drops.") echoes the Phase 2 Hero tagline ("Never miss a price drop") and subtitle ("Paste any product URL. We'll check the price daily and email you the moment it drops.") — same mental model, same voice.
- **Sample URL in hint:** `https://www.amazon.com/dp/XXXXXXXXXX` — generic ASIN shape, no real product, no commitment to Amazon as the canonical example. Stays inside "any e-commerce URL" promise.
- **Remove confirmation wording:** *"Remove this product? Its price history will be deleted."* — honest about the CASCADE DELETE without pretending recovery is possible.
- **Duplicate toast copy:** *"You're already tracking this product."* — plus a 2-second ring-outline animation on the existing card (D-07 Claude's Discretion). No "View existing" button in the toast — too noisy; the animation is the locator.

</specifics>

<deferred>
## Deferred Ideas

- **Search / filter / sort products** — not in REQUIREMENTS.md. Candidate for a post-v1 phase once product counts justify it.
- **Bulk actions (select multiple → remove)** — same as above; not in scope.
- **Product categories / tags** — would require schema changes; out of portfolio scope.
- **Multi-currency conversion** — explicitly excluded in PROJECT.md ("Display price in its original currency; no FX logic needed for v1").
- **Share a tracked product with another user** — excluded in PROJECT.md ("Social / sharing features … Privacy-first").
- **In-app notification center** (vs email-only) — v1 is email-only per PROJECT.md.
- **Per-product alert threshold** (e.g., "email when drops >20%") — explicitly excluded in PROJECT.md ("v1 uses 'any drop' rule").

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-product-tracking-dashboard*
*Context gathered: 2026-04-20*
