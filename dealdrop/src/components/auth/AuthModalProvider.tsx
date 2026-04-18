'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthModal } from './AuthModal'

type AuthModalContextValue = {
  openAuthModal: () => void
  setOpen: (open: boolean) => void
  isOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)

  function openAuthModal() {
    setIsOpen(true)
  }

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, setOpen: setIsOpen, isOpen }}
    >
      {children}
      <AuthModal />
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return context
}
