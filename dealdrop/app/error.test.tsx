// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/link', () => ({
  default: (props: { href: string; children: React.ReactNode }) => (
    <a href={props.href}>{props.children}</a>
  ),
}))

import ErrorBoundary from './error'

afterEach(() => {
  cleanup()
})

describe('app/error.tsx (POL-03 page-level boundary)', () => {
  it('renders the friendly headline and apology copy', () => {
    render(<ErrorBoundary error={new Error('boom') as Error & { digest?: string }} unstable_retry={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong')
  })

  it('Try again button calls unstable_retry', () => {
    const retry = vi.fn()
    render(<ErrorBoundary error={new Error('x') as Error & { digest?: string }} unstable_retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('Go home link points at /', () => {
    render(<ErrorBoundary error={new Error('x') as Error & { digest?: string }} unstable_retry={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
  })

  it('does NOT render error.message in the DOM (V7 — no leak)', () => {
    const err = new Error('SECRET_DETAIL_DO_NOT_LEAK') as Error & { digest?: string }
    render(<ErrorBoundary error={err} unstable_retry={vi.fn()} />)
    expect(document.body.textContent ?? '').not.toContain('SECRET_DETAIL_DO_NOT_LEAK')
  })
})
