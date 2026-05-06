// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { ScrapeProgress, SCRAPE_STEPS } from './ScrapeProgress'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('ScrapeProgress (quick-260506-rk8 Task 2)', () => {
  it('renders nothing when pending=false initially', () => {
    const { container } = render(<ScrapeProgress pending={false} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('renders the first step "Checking the link" as active immediately when pending flips to true', () => {
    const { rerender } = render(<ScrapeProgress pending={false} />)
    act(() => {
      rerender(<ScrapeProgress pending={true} />)
    })
    // First step row is in the active state.
    const firstRow = screen.getByTestId('scrape-step-0')
    expect(firstRow).toHaveAttribute('data-state', 'active')
    // Step label is rendered.
    expect(screen.getByText(SCRAPE_STEPS[0].label)).toBeTruthy()
  })

  it('advances the active step to "Visiting the page" after 600ms', () => {
    const { rerender } = render(<ScrapeProgress pending={false} />)
    act(() => {
      rerender(<ScrapeProgress pending={true} />)
    })
    act(() => {
      vi.advanceTimersByTime(600)
    })
    // Step 0 now complete, step 1 active.
    expect(screen.getByTestId('scrape-step-0')).toHaveAttribute('data-state', 'complete')
    expect(screen.getByTestId('scrape-step-1')).toHaveAttribute('data-state', 'active')
    expect(screen.getByText(SCRAPE_STEPS[1].label)).toBeTruthy()
  })

  it('holds on the last step "Finishing up..." when pending stays true past 9000ms', () => {
    const { rerender } = render(<ScrapeProgress pending={false} />)
    act(() => {
      rerender(<ScrapeProgress pending={true} />)
    })
    // Drive past the last scheduled atMs.
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    const lastIdx = SCRAPE_STEPS.length - 1
    const lastRow = screen.getByTestId(`scrape-step-${lastIdx}`)
    expect(lastRow).toHaveAttribute('data-state', 'active')
    // No further index is rendered.
    expect(screen.queryByTestId(`scrape-step-${lastIdx + 1}`)).toBeNull()
    // The hold label is the last entry.
    expect(SCRAPE_STEPS[lastIdx].label).toMatch(/finishing/i)
  })

  it('snaps progressbar to 100 and unmounts after the post-completion grace period when pending flips back to false', () => {
    const { rerender, container } = render(<ScrapeProgress pending={false} />)
    act(() => {
      rerender(<ScrapeProgress pending={true} />)
    })
    // Advance the timer a bit so the bar is mid-flight.
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // Action resolves: pending flips to false.
    act(() => {
      rerender(<ScrapeProgress pending={false} />)
    })
    // Bar snaps to 100 immediately while in 'completing' phase.
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    // Grace period elapses (~250ms) -> component unmounts.
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('progressbar element exposes aria-valuemin=0 and aria-valuemax=100 while pending=true', () => {
    const { rerender } = render(<ScrapeProgress pending={false} />)
    act(() => {
      rerender(<ScrapeProgress pending={true} />)
    })
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })
})
