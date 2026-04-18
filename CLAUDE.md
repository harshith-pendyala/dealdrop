<!-- GSD:project-start source:PROJECT.md -->
## Project

**DealDrop**

DealDrop is a universal e-commerce price tracker. Users paste a product URL from any site in the world, and DealDrop scrapes the product details, monitors the price daily, and sends an email alert the moment the price drops. Each user gets a private dashboard with price-history charts for every product they track.

**Core Value:** **Users never miss a price drop on products they care about — regardless of which e-commerce site the product lives on.**

If everything else fails (auth edge cases, charts, fancy UI), the daily price check + email alert loop must work end-to-end.

### Constraints

- **Tech stack**: Next.js 16 + React 19 + TypeScript strict + Tailwind v4 — Already scaffolded; don't migrate
- **Backend**: Supabase — Chosen for Postgres + Auth + RLS + pg_cron in one platform
- **Scraping**: Firecrawl — Chosen for structured JSON output without per-site scrapers
- **Email**: Resend — Chosen for generous free tier (3k/mo) and clean Next.js SDK
- **Charts**: Recharts — Chosen for React-native line charts
- **UI kit**: Shadcn UI + Lucide — Drop-in components, portfolio-friendly look
- **Toasts**: Sonner — Established Shadcn-compatible toast lib
- **Hosting**: Vercel — Matches Next.js defaults, built-in cron-trigger path via pg_cron calling the API
- **Scrape cadence**: Daily (pg_cron, e.g. 9:00 AM) — Single frequency for all products, keeps cost/complexity low
- **Alert rule**: Any price drop — Simple rule, no per-product config
- **Auth**: Google OAuth only — One-click sign-in, no password UX
- **Bar**: Portfolio/demo quality — Works end-to-end, presentable UI, not production-hardened
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - Application logic and type definitions
- TSX/JSX - React component markup and page definitions
- JavaScript (ES2017 target) - Build configuration files (postcss.config.mjs, eslint.config.mjs, next.config.ts)
- CSS - Styling (globals.css)
## Runtime
- Node.js 24.15.0 (current)
- npm 11.12.1 (package manager)
- npm - Defined in package-lock.json
- Lockfile: Present (package-lock.json)
## Frameworks
- Next.js 16.2.4 - Full-stack React framework with App Router
- React 19.2.4 - UI component library
- React DOM 19.2.4 - React rendering for web
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind
- ESLint 9.x - JavaScript/TypeScript linter
- eslint-config-next 16.2.4 - Next.js specific ESLint rules
## Key Dependencies
- next (16.2.4) - Provides routing, server-side rendering, static generation, and development server
- react (19.2.4) - UI library for components
- react-dom (19.2.4) - Renders React components to the DOM
- tailwindcss (4.x) - CSS framework for styling
- @types/node (20.x) - Node.js type definitions
- @types/react (19.x) - React type definitions
- @types/react-dom (19.x) - React DOM type definitions
## Configuration
- TypeScript configuration: `tsconfig.json`
- Environment variables: Managed via `.env*` files (not committed)
- No explicit secrets management detected
- Next.js config: `next.config.ts` (minimal, no custom configuration)
- PostCSS config: `postcss.config.mjs`
- ESLint config: `eslint.config.mjs`
## Platform Requirements
- Node.js 24.15.0+
- npm 11.12.1+
- TypeScript 5.x
- Modern terminal/shell for npm commands
- Deployment target: Vercel (mentioned in README and default Next.js setup)
- Server: Next.js built-in production server
- No explicit database or external service requirements detected
## Build & Development Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & Runtime
- TypeScript strict mode (`strict: true` in `dealdrop/tsconfig.json`)
- Target: ES2017, module resolution: bundler
- React 19 functional components only (no class components)
## Naming
| Construct | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase | `RootLayout`, `Home` |
| Variables / functions | camelCase | `geistSans`, `nextConfig` |
| Type imports | `import type` | `import type { Metadata }` |
| CSS custom properties | `--kebab-case` | `--font-geist-sans` |
| Tailwind classes | kebab-case utility | `flex-col`, `dark:bg-black` |
| Config files | camelCase + extension | `next.config.ts`, `eslint.config.mjs` |
## Import Order
## Component Patterns
- Functional components with destructured typed props
- Props wrapped with `Readonly<>` for immutability
- Default exports for pages and layouts
- Named exports for shared utilities/types
## Styling
- Tailwind CSS v4 with PostCSS (`dealdrop/postcss.config.mjs`)
- Utility-first: compose classes directly on elements
- CSS custom properties in `globals.css` for theme tokens (`--background`, `--foreground`)
- Dark mode via `prefers-color-scheme` media query
- Responsive prefixes: `sm:`, `md:`, `lg:`
## Linting
- ESLint flat config format (`dealdrop/eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
## Error Handling
- No custom error handling established yet
- TypeScript strict mode catches type errors at compile time
- No error boundaries, logging framework, or monitoring configured
## Comments
- Minimal — code is self-documenting through TypeScript types
- No JSDoc or multi-line comment blocks in existing code
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern
## Layers
| Layer | Location | Responsibility |
|-------|----------|----------------|
| Layout | `dealdrop/app/layout.tsx` | Root HTML structure, fonts, metadata |
| Page | `dealdrop/app/page.tsx` | Route-specific content (homepage `/`) |
| Styles | `dealdrop/app/globals.css` | Global styles, Tailwind imports, CSS vars |
| Static | `dealdrop/public/` | SVG icons, favicons |
## Entry Points
- `dealdrop/app/layout.tsx` — Root layout wrapping all routes; applies `geist` fonts, metadata, global CSS
- `dealdrop/app/page.tsx` — Homepage at `/`
- `dealdrop/next.config.ts` — Next.js runtime configuration
## Data Flow (current)
```
```
## Abstractions
- **Metadata API** — `export const metadata: Metadata` in layout.tsx for SEO
- **CSS Variables** — `--background`, `--foreground` in globals.css for theming; dark mode via `prefers-color-scheme`
- **Font loading** — `next/font/google` for Geist Sans and Geist Mono, injected as CSS vars
## Rendering Strategy
- Server Components by default (App Router)
- No client components (`"use client"`) yet
- No ISR, SSG, or dynamic route segments yet
## Not Yet Implemented
- API routes (`app/api/`)
- Authentication layer
- Database/ORM layer
- State management
- Shared component library
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
