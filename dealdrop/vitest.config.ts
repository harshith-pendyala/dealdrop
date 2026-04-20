// File: dealdrop/vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    // The 'server-only' npm package uses export conditions { 'react-server': empty.js,
    // default: index.js (which throws) }. Under `next build`, the react-server condition
    // is set for Server Components so `import 'server-only'` is a silent noop in valid
    // server code and a build-time throw when imported from a `'use client'` file
    // (production guard — T-3-01; Plan 04 regression-tests this).
    //
    // Under plain Vitest/Node, neither condition is set, so the bare `default` resolves
    // to index.js which throws immediately on import. Mapping the specifier to the
    // package's own `empty.js` preserves the production guard (untouched in src) while
    // letting test processes import server-only modules. Standard pattern for testing
    // Next.js DAL code with Vitest. See Plan 03-03 deviation notes for rationale.
    server: {
      deps: {
        inline: ['server-only'],
      },
    },
  },
  resolve: {
    alias: [
      // tsconfig paths: "@/*": ["./*", "./src/*"]
      // Shadcn primitives live at dealdrop/components/ui/ (not under src/).
      // Specific prefix alias for @/components must come before the catch-all @ alias
      // so that `@/components/ui/card` resolves to ./components/ui/card correctly.
      { find: /^@\/components(.*)$/, replacement: path.resolve(__dirname, './components$1') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // NOTE: Aliases map the import *specifier* — this does not modify the server-only
      // package on disk. `npm run build` still resolves the real package via Next.js's
      // own resolver (where the react-server condition is set), so the production guard
      // behavior is unchanged.
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, './node_modules/server-only/empty.js'),
      },
    ],
  },
})
