// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub FeatureCard so this test stays focused on the Hero shell.
// FeatureCard pulls lucide-react icons; stubbing keeps the test fast and isolated.
vi.mock('./FeatureCard', () => ({
  FeatureCard: (props: { title: string; blurb: string }) => (
    <div data-testid="feature-card-stub" data-title={props.title}>
      {props.title}
    </div>
  ),
}))

import { Hero } from './Hero'

afterEach(() => {
  cleanup()
})

describe('Hero (BRAND-01 + BRAND-04)', () => {
  it('renders the h1 headline copy "Never miss a price drop" (regression guard)', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Never miss a price drop',
    )
  })

  it('BRAND-01: does NOT render the "Made with love" footer copy', () => {
    render(<Hero />)
    expect(screen.queryByText('Made with love')).toBeNull()
  })

  it('BRAND-04: section className includes the orange-50 top-to-bottom gradient utilities', () => {
    const { container } = render(<Hero />)
    const section = container.querySelector('section')
    expect(section).not.toBeNull()
    const className = section!.getAttribute('class') ?? ''
    expect(className).toContain('bg-gradient-to-b')
    expect(className).toContain('from-orange-50')
    expect(className).toContain('via-background')
    expect(className).toContain('to-background')
    expect(className).toContain('dark:from-transparent')
  })

  it('regression: still renders three FeatureCard children (grid intact)', () => {
    render(<Hero />)
    const cards = screen.getAllByTestId('feature-card-stub')
    expect(cards).toHaveLength(3)
  })
})
