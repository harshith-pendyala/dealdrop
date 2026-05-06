// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub next/image to a plain <img>. Pattern verbatim from ProductCard.test.tsx:6-9
// with width/height extension so we can assert dimensions, and className pass-through
// so we can assert dark-mode filter utilities (quick-260504-pap).
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; width?: number; height?: number; className?: string }) => (
    <img
      src={props.src}
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={props.className}
    />
  ),
}))

// Stub next/link to a plain <a>. No analog in dashboard tests — minimal pass-through.
vi.mock('next/link', () => ({
  default: (props: {
    href: string
    children: React.ReactNode
    'aria-label'?: string
    className?: string
  }) => (
    <a href={props.href} aria-label={props['aria-label']} className={props.className}>
      {props.children}
    </a>
  ),
}))

// Stub auth buttons so we can assert toggle behavior without dragging in Supabase.
vi.mock('@/components/auth/SignInButton', () => ({
  SignInButton: () => <button data-testid="sign-in-stub">Sign In</button>,
}))
vi.mock('@/components/auth/SignOutButton', () => ({
  SignOutButton: () => <button data-testid="sign-out-stub">Sign Out</button>,
}))

import { Header } from './Header'

afterEach(() => {
  cleanup()
})

describe('Header (BRAND-02)', () => {
  it('renders the DealDrop logo image with src and alt', () => {
    render(<Header user={null} />)
    const logo = screen.getByRole('img', { name: 'DealDrop' })
    expect(logo).toHaveAttribute('src', '/deal-drop-logo.png')
  })

  it('logo image has explicit width=95 and height=32 (D-03 + derived ratio)', () => {
    render(<Header user={null} />)
    const logo = screen.getByRole('img', { name: 'DealDrop' })
    expect(logo).toHaveAttribute('width', '95')
    expect(logo).toHaveAttribute('height', '32')
  })

  it('wraps the logo in a click-home link with aria-label', () => {
    render(<Header user={null} />)
    const link = screen.getByRole('link', { name: 'DealDrop home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders SignInButton when user is null', () => {
    render(<Header user={null} />)
    expect(screen.getByTestId('sign-in-stub')).toBeTruthy()
    expect(screen.queryByTestId('sign-out-stub')).toBeNull()
  })

  it('renders SignOutButton when user is present', () => {
    // Minimal User mock — Header only checks truthiness on `user` prop.
    render(<Header user={{ id: 'u1' } as never} />)
    expect(screen.getByTestId('sign-out-stub')).toBeTruthy()
    expect(screen.queryByTestId('sign-in-stub')).toBeNull()
  })

  it('logo has dark-mode invert+hue-rotate filter so white bg reads as black in dark mode (quick-260504-pap)', () => {
    render(<Header user={null} />)
    const logo = screen.getByRole('img', { name: 'DealDrop' })
    expect(logo.className).toContain('dark:invert')
    expect(logo.className).toContain('dark:hue-rotate-180')
  })

  // quick-260506-rk8 Task 1: email-beside-sign-out
  it('does NOT render "Signed in as" text when user is null', () => {
    render(<Header user={null} />)
    expect(screen.queryByText(/Signed in as/i)).toBeNull()
  })

  it('does NOT render "Signed in as" prefix when user is present but email is undefined', () => {
    render(<Header user={{ id: 'u1' } as never} />)
    expect(screen.queryByText(/Signed in as/i)).toBeNull()
    // SignOutButton still rendered.
    expect(screen.getByTestId('sign-out-stub')).toBeTruthy()
  })

  it('renders "Signed in as <email>" when user has an email', () => {
    render(<Header user={{ id: 'u1', email: 'foo@example.com' } as never} />)
    // Prefix text and email value are both present.
    expect(screen.getByText(/Signed in as/i)).toBeTruthy()
    expect(screen.getByText('foo@example.com')).toBeTruthy()
    // SignOutButton still rendered alongside.
    expect(screen.getByTestId('sign-out-stub')).toBeTruthy()
  })

  it('email span uses truncate utility class so narrow viewports do not wrap the header', () => {
    render(<Header user={{ id: 'u1', email: 'a-very-long-email-address@example.com' } as never} />)
    const emailEl = screen.getByText('a-very-long-email-address@example.com')
    // The email itself or its parent span should carry the truncate class.
    const truncateInChain =
      emailEl.className.includes('truncate') ||
      (emailEl.parentElement?.className?.includes('truncate') ?? false)
    expect(truncateInChain).toBe(true)
  })
})
