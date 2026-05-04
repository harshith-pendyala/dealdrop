# ARCHITECTURE.md — System Design & Patterns

## Pattern
Next.js 16.2.4 App Router — React Server Components as default, with TypeScript strict mode. Currently a bootstrap scaffold with no custom business logic.

---

## Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Layout | `dealdrop/app/layout.tsx` | Root HTML structure, fonts, metadata |
| Page | `dealdrop/app/page.tsx` | Route-specific content (homepage `/`) |
| Styles | `dealdrop/app/globals.css` | Global styles, Tailwind imports, CSS vars |
| Static | `dealdrop/public/` | SVG icons, favicons |

---

## Entry Points

- `dealdrop/app/layout.tsx` — Root layout wrapping all routes; applies `geist` fonts, metadata, global CSS
- `dealdrop/app/page.tsx` — Homepage at `/`
- `dealdrop/next.config.ts` — Next.js runtime configuration

---

## Data Flow (current)

```
Browser → / → Next.js App Router
             → app/layout.tsx (fonts, metadata, global CSS)
               → app/page.tsx (homepage content)
                 → HTML streamed to browser
```

---

## Abstractions

- **Metadata API** — `export const metadata: Metadata` in layout.tsx for SEO
- **CSS Variables** — `--background`, `--foreground` in globals.css for theming; dark mode via `prefers-color-scheme`
- **Font loading** — `next/font/google` for Geist Sans and Geist Mono, injected as CSS vars

---

## Rendering Strategy
- Server Components by default (App Router)
- No client components (`"use client"`) yet
- No ISR, SSG, or dynamic route segments yet

---

## Not Yet Implemented
- API routes (`app/api/`)
- Authentication layer
- Database/ORM layer
- State management
- Shared component library
