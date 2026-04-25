// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import GlobalError from './global-error'

afterEach(() => {
  cleanup()
})

describe('app/global-error.tsx (POL-03 root boundary)', () => {
  it('renders the friendly headline', () => {
    render(<GlobalError error={new Error('x') as Error & { digest?: string }} unstable_retry={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong')
  })

  it('Try again button calls unstable_retry', () => {
    const retry = vi.fn()
    render(<GlobalError error={new Error('x') as Error & { digest?: string }} unstable_retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('does NOT render error.message in the DOM', () => {
    const err = new Error('LEAK_ME_NOT') as Error & { digest?: string }
    render(<GlobalError error={err} unstable_retry={vi.fn()} />)
    expect(document.body.textContent ?? '').not.toContain('LEAK_ME_NOT')
  })
})
