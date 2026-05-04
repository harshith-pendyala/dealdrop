# CONVENTIONS.md — Code Style & Patterns

## Language & Runtime
- TypeScript strict mode (`strict: true` in `dealdrop/tsconfig.json`)
- Target: ES2017, module resolution: bundler
- React 19 functional components only (no class components)

---

## Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase | `RootLayout`, `Home` |
| Variables / functions | camelCase | `geistSans`, `nextConfig` |
| Type imports | `import type` | `import type { Metadata }` |
| CSS custom properties | `--kebab-case` | `--font-geist-sans` |
| Tailwind classes | kebab-case utility | `flex-col`, `dark:bg-black` |
| Config files | camelCase + extension | `next.config.ts`, `eslint.config.mjs` |

---

## Import Order
1. Type imports (`import type { Metadata } from "next"`)
2. Framework/library imports (`import Image from "next/image"`)
3. CSS imports (`import "./globals.css"`)
4. Local imports via `@/*` alias

---

## Component Patterns
- Functional components with destructured typed props
- Props wrapped with `Readonly<>` for immutability
- Default exports for pages and layouts
- Named exports for shared utilities/types

---

## Styling
- Tailwind CSS v4 with PostCSS (`dealdrop/postcss.config.mjs`)
- Utility-first: compose classes directly on elements
- CSS custom properties in `globals.css` for theme tokens (`--background`, `--foreground`)
- Dark mode via `prefers-color-scheme` media query
- Responsive prefixes: `sm:`, `md:`, `lg:`

---

## Linting
- ESLint flat config format (`dealdrop/eslint.config.mjs`)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

---

## Error Handling
- No custom error handling established yet
- TypeScript strict mode catches type errors at compile time
- No error boundaries, logging framework, or monitoring configured

---

## Comments
- Minimal — code is self-documenting through TypeScript types
- No JSDoc or multi-line comment blocks in existing code
