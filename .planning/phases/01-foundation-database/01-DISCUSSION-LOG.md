# Phase 1: Foundation & Database - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 1 — Foundation & Database
**Areas discussed:** Project Layout

---

## Gray Areas Offered

| Area | Description | Selected |
|------|-------------|----------|
| Project layout | Subdir vs flat vs rename | ✓ |
| Shadcn look | Style, base color, radius, dark mode | |
| DB migrations | Supabase CLI vs dashboard SQL vs ORM | |
| Test framework | Vitest in Phase 1 vs Phase 7 vs skip | |

**User's choice:** Project layout only. Remaining areas resolved via Claude's Discretion (see CONTEXT.md `<decisions>` section).

---

## Project Layout

### Q1 — Where should the Next.js app code live?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep dealdrop/ subdir | Current state. Planning stays at root, app in dealdrop/. Future-proof if sibling services are added. | ✓ |
| Flatten to root | Move dealdrop/* up. Simpler paths. | |
| Rename to web/ | Rename dealdrop/ to web/. Subdir but monorepo-friendly name. | |

**User's choice:** Keep dealdrop/ subdir (Recommended)

---

### Q2 — When running npm/dev commands, where should Claude cd into?

| Option | Description | Selected |
|--------|-------------|----------|
| Always from app subdir | All npm/build/dev inside dealdrop/. | ✓ |
| Root with workspaces | npm workspaces at root with --workspace flag. | |
| Root with pass-through scripts | Root package.json proxies to dealdrop scripts. | |

**User's choice:** Always from app subdir

---

### Q3 — Where should the supabase/ folder live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside dealdrop/ | dealdrop/supabase/ colocated with app. Vercel Root = dealdrop. | ✓ |
| At workspace root | ./supabase/ separated from app. Good for sibling services. | |

**User's choice:** Inside dealdrop/

---

### Q4 — Env file location and .gitignore policy?

| Option | Description | Selected |
|--------|-------------|----------|
| dealdrop/.env.local + .env.example | .env.local gitignored, .env.example committed with var names. | ✓ |
| Workspace root .env.local | Single root .env.local loaded via dotenv path. | |

**User's choice:** dealdrop/.env.local + .env.example (Recommended)

---

### Q5 — More layout questions or move on?

**User's choice:** I'm ready for context

---

## Claude's Discretion

Applied to three unselected areas. Defaults chosen and documented in CONTEXT.md:

- **Shadcn look:** `new-york` style + `zinc` base color + `0.5rem` radius + system dark mode, no in-app toggle
- **DB migrations:** Supabase CLI migrations (`dealdrop/supabase/migrations/*.sql`) with `supabase db push`
- **Testing framework:** Deferred indefinitely — not installed in Phase 1, not carved out as a later phase; manual E2E validation in Phase 7 is the shipping gate

## Deferred Ideas

- Automated type regeneration via git hook or CI
- Pre-commit hooks (Husky)
- Error tracking / structured logging
- Test framework adoption
- Storybook / component playground
