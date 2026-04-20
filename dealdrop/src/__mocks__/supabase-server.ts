// File: dealdrop/src/__mocks__/supabase-server.ts
// Shared Vitest mock factory for @/lib/supabase/server `createClient()`.
// Consumed by: src/actions/products.test.ts + any future action/component test that
// needs a configurable Supabase client without touching real env or network.

import { vi } from 'vitest'

type PostgrestErrorShape = { code: string; message?: string; details?: string } | null

export interface SupabaseMockOverrides {
  user?: { id: string } | null
  insertProduct?: { data: { id: string } | null; error: PostgrestErrorShape }
  insertHistory?: { error: PostgrestErrorShape }
  deleteError?: PostgrestErrorShape
  selectProducts?: { data: unknown[]; error: PostgrestErrorShape }
}

export function makeSupabaseMock(overrides: SupabaseMockOverrides = {}) {
  const user = overrides.user === undefined ? { id: 'user-test-uuid' } : overrides.user
  const insertProduct = overrides.insertProduct ?? { data: { id: 'p1' }, error: null }
  const insertHistory = overrides.insertHistory ?? { error: null }
  const deleteError = overrides.deleteError ?? null
  const selectProducts = overrides.selectProducts ?? { data: [], error: null }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((_table: string) => ({
      insert: vi.fn((_row: unknown) => ({
        select: vi.fn((_cols?: string) => ({
          single: vi.fn().mockResolvedValue(insertProduct),
        })),
        // price_history insert doesn't chain .select().single() — resolves directly
        then: (onFulfilled: (v: { error: PostgrestErrorShape }) => unknown) =>
          Promise.resolve(insertHistory).then(onFulfilled),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: deleteError }),
      })),
      select: vi.fn((_cols?: string) => ({
        order: vi.fn().mockResolvedValue(selectProducts),
      })),
    })),
  }
}
