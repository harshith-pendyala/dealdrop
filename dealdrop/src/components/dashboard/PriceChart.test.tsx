// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'

// Bypass ResponsiveContainer in jsdom (no ResizeObserver → container otherwise renders null).
// See 05-RESEARCH.md §6 Strategy A. Mock must be registered BEFORE importing PriceChart.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 300, height: 200 }}>{children}</div>
    ),
  }
})

import { PriceChart, xTickFormatter, yTickFormatter } from './PriceChart'
import type { PricePoint } from '@/lib/products/get-user-products'

afterEach(() => {
  cleanup()
})

const makeHistory = (n: number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({
    price: 10 + i,
    currency: 'USD',
    checked_at: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  }))

describe('PriceChart', () => {
  it('CHART-04: renders empty-state copy when history is empty', () => {
    render(<PriceChart history={[]} currency="USD" />)
    expect(screen.getByText('No price history yet.')).toBeInTheDocument()
  })

  it('CHART-04: renders without crash when given 1 point', () => {
    render(<PriceChart history={makeHistory(1)} currency="USD" />)
    expect(screen.queryByText('No price history yet.')).not.toBeInTheDocument()
  })

  it('CHART-01: renders line chart container when history has many points', () => {
    render(<PriceChart history={makeHistory(10)} currency="USD" />)
    expect(screen.queryByText('No price history yet.')).not.toBeInTheDocument()
  })

  it('CHART-03: yTickFormatter produces compact currency label (no decimals)', () => {
    const label = yTickFormatter(12, 'USD')
    expect(label).toMatch(/\$12|US\$12/)
    expect(label).not.toMatch(/\.\d/)
  })

  it('CHART-03: xTickFormatter produces short "MMM d" date label (no year)', () => {
    const label = xTickFormatter('2026-04-20T00:00:00Z')
    expect(label).toMatch(/Apr\s*20/)
    expect(label).not.toMatch(/2026/)
  })
})
