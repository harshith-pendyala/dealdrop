# Phase 4: Product Tracking & Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 04-product-tracking-dashboard
**Areas discussed:** Add Product form placement, Empty state design

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Add Product form placement | Where the URL input lives — always-visible bar, modal from + button, inline-on-empty + button-thereafter | ✓ |
| Empty state design | Minimal text+CTA, inline form, illustrated hero, or numbered how-it-works | ✓ |
| Product card actions & layout | All visible, hover-reveal, 3-dot menu, or primary-visible + secondary-menu | |
| Tracking-failed badge data source | New products column, derived from price_history, or separate scrape_attempts table | |

**User's choice:** Add Product form placement + Empty state design. Remaining two items deferred to Claude's Discretion with documented defaults in CONTEXT.md.

---

## Add Product Form Placement

### Q1: Where should the Add Product URL input live on the dashboard?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline form + modal (Recommended) | Empty state embeds form inline; populated grid gets "+ Add Product" button → Dialog | ✓ |
| Always-visible input bar | Slim URL input + Track button always at top of dashboard | |
| + Button → modal, always | Single trigger pattern; empty state also uses + button | |

**User's choice:** Inline form + modal (Recommended).
**Notes:** Progressive disclosure — zero-friction first add, clean grid after. Matches Phase 2 stacked-centered hero tone.

### Q2: While the scrape is in flight, what does the user see?

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic skeleton card (Recommended) | Skeleton card inserted immediately; swaps to real data on success, disappears on failure | ✓ |
| Button spinner only | Form button disabled + spinner; grid waits for server | |
| Both — spinner + skeleton | Maximally loud feedback | |

**User's choice:** Optimistic skeleton card (Recommended).
**Notes:** Perceived speed matters for the 10-30s Firecrawl round-trip. Pessimistic spinner feels broken at that duration. Submit button still shows spinner to prevent double-submit (additive).

### Q3: If a logged-out user pastes a URL and submits, what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Remember URL, auto-submit after sign-in (Recommended) | sessionStorage pending-add-url; auto-submit on OAuth callback | ✓ |
| Open auth modal, make user re-submit | Clear form, user pastes again after sign-in | |
| Block submit — redirect to auth, then back to empty form | Most conservative; worst UX | |

**User's choice:** Remember URL, auto-submit after sign-in (Recommended).
**Notes:** OAuth redirect is a UX cliff; sessionStorage (not localStorage) scopes the pending URL to the current tab. If auto-submit fails (expired session, network), URL stays pre-filled for retry.

---

## Empty State Design

### Q1: What does a signed-in user with zero products see?

| Option | Description | Selected |
|--------|-------------|----------|
| Centered headline + inline form (Recommended) | Heading + subtitle + inline paste form + muted sample-URL hint | ✓ |
| Numbered how-it-works + form | 3-step visual above the form | |
| Illustrated hero + CTA button (no inline form) | Large SVG + "Track your first product" button opens modal | |

**User's choice:** Centered headline + inline form (Recommended).
**Notes:** Action-focused, minimal chrome. Echoes Phase 2 Hero tone (stacked, centered) so the two auth states feel like the same app.

---

## Claude's Discretion

The user explicitly skipped deep-dive on these; planner uses documented defaults, surfaces deviation only if it materially changes the plan:

1. **Product card actions layout** — all 3 actions visible on card footer row (View / Show Chart / Remove); no hover-reveal or 3-dot menu.
2. **Card density & image** — 4:3 aspect, `object-contain`, `bg-muted` fallback, 2-line name clamp, `Intl.NumberFormat` price.
3. **Tracking-failed badge data source** — single `products.last_scrape_failed_at TIMESTAMPTZ NULL` column; Phase 6 cron populates; Phase 4 renders.
4. **Remove flow** — optimistic UI with rollback; Shadcn AlertDialog with destructive variant; wording discloses CASCADE delete.
5. **Duplicate URL handling** — unique-constraint violation (Postgres 23505) → `reason:'duplicate_url'` → toast + 2s ring-animation on existing card.
6. **Reason → toast-copy map** — exhaustive switch in `@/lib/firecrawl/toast-messages.ts` (client-safe) with compile-time exhaustiveness check.
7. **Revalidation** — `revalidatePath('/')` after each mutation; optimistic UI covers perceived speed.

## Deferred Ideas

(none — discussion stayed within phase scope)
