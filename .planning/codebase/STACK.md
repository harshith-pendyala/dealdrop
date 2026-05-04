# Technology Stack

**Analysis Date:** 2026-04-17

## Languages

**Primary:**
- TypeScript 5.x - Application logic and type definitions
- TSX/JSX - React component markup and page definitions

**Secondary:**
- JavaScript (ES2017 target) - Build configuration files (postcss.config.mjs, eslint.config.mjs, next.config.ts)
- CSS - Styling (globals.css)

## Runtime

**Environment:**
- Node.js 24.15.0 (current)
- npm 11.12.1 (package manager)

**Package Manager:**
- npm - Defined in package-lock.json
- Lockfile: Present (package-lock.json)

## Frameworks

**Core:**
- Next.js 16.2.4 - Full-stack React framework with App Router
- React 19.2.4 - UI component library
- React DOM 19.2.4 - React rendering for web

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind

**Linting & Code Quality:**
- ESLint 9.x - JavaScript/TypeScript linter
- eslint-config-next 16.2.4 - Next.js specific ESLint rules

## Key Dependencies

**Critical:**
- next (16.2.4) - Provides routing, server-side rendering, static generation, and development server
- react (19.2.4) - UI library for components
- react-dom (19.2.4) - Renders React components to the DOM
- tailwindcss (4.x) - CSS framework for styling

**Type Definitions:**
- @types/node (20.x) - Node.js type definitions
- @types/react (19.x) - React type definitions
- @types/react-dom (19.x) - React DOM type definitions

## Configuration

**Environment:**
- TypeScript configuration: `tsconfig.json`
  - Target: ES2017
  - JSX mode: react-jsx
  - Strict mode enabled
  - Module resolution: bundler
  - Path aliases: `@/*` maps to root directory
- Environment variables: Managed via `.env*` files (not committed)
- No explicit secrets management detected

**Build:**
- Next.js config: `next.config.ts` (minimal, no custom configuration)
- PostCSS config: `postcss.config.mjs`
  - Tailwind CSS plugin configured
- ESLint config: `eslint.config.mjs`
  - Uses Next.js core web vitals rules
  - Uses Next.js TypeScript rules

## Platform Requirements

**Development:**
- Node.js 24.15.0+
- npm 11.12.1+
- TypeScript 5.x
- Modern terminal/shell for npm commands

**Production:**
- Deployment target: Vercel (mentioned in README and default Next.js setup)
- Server: Next.js built-in production server
- No explicit database or external service requirements detected

## Build & Development Commands

**Development:**
- `npm run dev` - Start development server with hot reload

**Production:**
- `npm run build` - Build for production
- `npm start` - Start production server

**Code Quality:**
- `npm run lint` - Run ESLint checks

---

*Stack analysis: 2026-04-17*
