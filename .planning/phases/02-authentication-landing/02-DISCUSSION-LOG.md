# Phase 2: Authentication & Landing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in [02-CONTEXT.md](02-CONTEXT.md) — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 02-authentication-landing
**Areas discussed:** Hero content & density, Auth modal + deferred-add

---

## Gray-Area Selection

User was offered 4 gray areas, selected 2:

| Area | Offered | Selected |
|------|---------|----------|
| Hero content & density | ✓ | ✓ |
| Auth modal + deferred-add | ✓ | ✓ |
| Dashboard shell scope | ✓ | — (rolled into Claude's Discretion: thin placeholder, Phase 4 fills) |
| Header layout & mobile | ✓ | — (rolled into Claude's Discretion: compact responsive, no hamburger, inline Sign Out) |

---

## Hero content & density

### Q1 — How many feature cards, and what should they say?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 cards, service-benefit | Multi-site support · Instant email alerts · Price history | ✓ |
| 3 cards, verb-first | "Paste any URL" · "We watch daily" · "Get emailed on drops" | |
| 4 cards | Adds a fourth (e.g. "Any currency" or "Unlimited products") | |

**User's choice:** 3 cards, service-benefit (recommended).
**Notes:** Maps to the three roadmap examples verbatim.

### Q2 — Vertical structure for the hero?

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked, centered | Tagline + subtitle top, 3-column card grid below, collapses to 1-col on mobile | ✓ |
| Split (headline L, cards R) | Two-column desktop; harder to balance on narrow viewports | |
| Headline hero only, cards below fold | Dramatic full-screen headline; cards on scroll | |

**User's choice:** Stacked, centered (recommended).
**Notes:** Simple, portfolio-classic, responsive.

### Q3 — How prominent should the hero CTA be?

| Option | Description | Selected |
|--------|-------------|----------|
| Header Sign In only | Hero is purely descriptive; only sign-in entry is the header button | ✓ |
| Hero also has "Start tracking" button | A big CTA in the hero that opens the auth modal | |
| Hero has fake URL input (previews Phase 4 flow) | Disabled input that opens the modal when clicked | |

**User's choice:** Header Sign In only (recommended).
**Notes:** Matches success criterion 1 literally. Hero stays informational. Removes the risk of a Phase-4 UI stub in Phase 2.

### Q4 — Subtitle tone below "Never miss a price drop"?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain-spoken | "Paste any product URL. We'll check the price daily and email you the moment it drops." | ✓ |
| Benefit-led | "The universal price tracker for any e-commerce site — one dashboard, zero spreadsheets." | |
| You-Decide | Planner drafts to match the tone | |

**User's choice:** Plain-spoken (recommended).
**Notes:** Explains the mechanic in one line.

### Follow-up gate — more hero questions or next area?

**User's choice:** Next area.
**Notes:** Made-with-love placement, icons, and empty-state copy rolled into Claude's Discretion.

---

## Auth modal + deferred-add

### Q1 — AUTH-04 scope in Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Build the hook, defer the trigger | Ship `openAuthModal()` hook in Phase 2; Phase 4 Add Product form calls it verbatim | ✓ |
| Fully defer AUTH-04 to Phase 4 | Phase 2 only implements AUTH-03; AUTH-04 entirely moves to Phase 4 | |
| Build a dummy Add Product form in Phase 2 just to wire AUTH-04 | Conflicts with "Header Sign In only" hero decision | |

**User's choice:** Build the hook, defer the trigger (recommended).
**Notes:** Clean handoff, zero rework. REQUIREMENTS.md traceability for AUTH-04 updates to "Phase 2 (hook) + Phase 4 (trigger)".

### Q2 — Post-OAuth callback experience?

| Option | Description | Selected |
|--------|-------------|----------|
| Straight to `/`, server re-renders | `/auth/callback` exchanges code, redirects to `/`; server component renders dashboard shell. Feels instant. | ✓ |
| Brief loading screen during exchange | "Signing you in…" spinner while callback handler works | |
| One-time welcome/onboarding on first sign-in | Short welcome page for new users, returning users go straight to `/` | |

**User's choice:** Straight to `/` (recommended).
**Notes:** No loading screen, no welcome flow. Rejected first-sign-in detection as out-of-scope polish.

### Q3 — Auth modal density?

| Option | Description | Selected |
|--------|-------------|----------|
| Just the Google button + 1-line context | Title "Sign in to DealDrop", subtitle "Sign in to start tracking prices", "Continue with Google" button | ✓ |
| Minimal — button only | Button alone, no title or subtitle | |
| Full — brand + privacy line | Title + subtitle + button + "By signing in you agree to…" | |

**User's choice:** Just the Google button + 1-line context (recommended).
**Notes:** Matches AUTH-05 literally. Full option rejected because no actual terms doc exists — would be placeholder copy.

### Q4 — Sign Out behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Sign out + redirect to `/` + toast | Server Action calls signOut(), redirects to `/`, Sonner toast confirms | ✓ |
| Sign out + redirect silently | Same flow but no toast | |
| Sign out stays on current URL | No explicit redirect; session change triggers re-render | |

**User's choice:** Sign out + redirect to `/` + toast (recommended).
**Notes:** Triggered a follow-up because Sonner (POL-01) is currently Phase 7 scope — see next section.

### Follow-up Q5 — Sonner scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Pull POL-01 into Phase 2 | Install Sonner + mount `<Toaster />` in Phase 2; move POL-01 traceability from Phase 7 → Phase 2 | ✓ |
| Skip the toast in Phase 2 | Sign-Out redirects silently; Sonner stays a Phase 7 install | |
| Install Sonner now, wire the toast later | Install + mount in Phase 2 but skip the sign-out toast call | |

**User's choice:** Pull POL-01 into Phase 2 (recommended).
**Notes:** Future phases (add-product toast, error toasts) inherit a ready-to-use toast surface.

### Follow-up gate — more auth questions or ready for context?

**User's choice:** Ready for context.
**Notes:** OAuth error handling and AUTH-08 redirect URI registration rolled into Claude's Discretion with sensible defaults captured in CONTEXT.md.

---

## Claude's Discretion

Areas where user deferred to Claude / planner:
- OAuth error UX (toast vs inline vs silent)
- AUTH-08 Google Cloud Console redirect URI setup (ops checklist in plan)
- Dashboard shell exact copy (thin placeholder, no Phase 4 UI)
- Feature card icons (Lucide from installed `lucide-react`)
- "Made with love" placement + attribution
- Exact Tailwind responsive breakpoints
- Mobile header treatment (compact responsive, no hamburger)

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- OAuth error UX polish → Phase 7
- First-time user welcome/onboarding → rejected
- Profile menu / avatar dropdown → future phase if header grows
- Password / magic-link auth → v2+ (already out of scope)
- Account settings page → not in v1
- Sticky header → Phase 7 if desired
- Hero analytics / "sign in clicked" tracking → not in v1
