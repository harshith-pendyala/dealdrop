# STRUCTURE.md — Directory Layout & Organization

## Root Layout

```
DealDrop/
├── dealdrop/               # Next.js application root
│   ├── app/                # App Router directory
│   │   ├── layout.tsx      # Root layout (33 lines) — fonts, metadata, body wrapper
│   │   ├── page.tsx        # Homepage at / (65 lines) — default scaffold content
│   │   ├── globals.css     # Global styles: Tailwind @import + CSS custom properties
│   │   └── favicon.ico     # Browser favicon
│   ├── public/             # Static assets served at /
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── next.config.ts      # Next.js configuration
│   ├── tsconfig.json       # TypeScript config (strict, ES2017, path alias @/*)
│   ├── eslint.config.mjs   # ESLint flat config (Next.js + TypeScript presets)
│   ├── postcss.config.mjs  # PostCSS with @tailwindcss/postcss plugin
│   ├── package.json        # Dependencies and scripts
│   └── .gitignore          # Standard Next.js ignores
└── .planning/              # GSD planning artifacts
    └── codebase/           # This codebase map
```

---

## Key Locations

| Purpose | Path |
|---------|------|
| App entry / routes | `dealdrop/app/` |
| Root layout | `dealdrop/app/layout.tsx` |
| Homepage | `dealdrop/app/page.tsx` |
| Global styles | `dealdrop/app/globals.css` |
| Static files | `dealdrop/public/` |
| Next.js config | `dealdrop/next.config.ts` |
| TS config | `dealdrop/tsconfig.json` |

---

## Naming Conventions

- **Files:** `.tsx` for React components, `.ts` for config/utilities, `.mjs` for ES module configs
- **Components:** PascalCase (`RootLayout`, `Home`)
- **Variables/functions:** camelCase (`geistSans`, `nextConfig`)
- **CSS custom properties:** `--kebab-case` (`--font-geist-sans`, `--background`)
- **Route directories:** kebab-case (Next.js convention)

---

## Path Aliases
- `@/*` → `dealdrop/*` (configured in `tsconfig.json`)

---

## Planned Directories (not yet created)
- `dealdrop/app/api/` — API routes
- `dealdrop/components/` — Shared UI components
- `dealdrop/lib/` — Utilities and helpers
- `dealdrop/types/` — Shared TypeScript types
