'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

/**
 * Modal context value interface
 */
interface ModalContextValue {
  /** Whether a modal is currently open */
  isModalOpen: boolean
  /** Open a modal (sets isModalOpen to true) */
  openModal: () => void
  /** Close a modal (sets isModalOpen to false) */
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

/**
 * ModalProvider - Manages global modal state
 *
 * Provides modal open/close state tracking for the entire application.
 * Used to coordinate UI behavior when modals are open (e.g., hiding hamburger menu).
 *
 * @example
 * ```tsx
 * <ModalProvider>
 *   <HamburgerMenu />
 *   <MyModal />
 * </ModalProvider>
 * ```
 */
export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  /**
   * Open a modal
   * Sets isModalOpen to true
   */
  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  /**
   * Close a modal
   * Sets isModalOpen to false
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      isModalOpen,
      openModal,
      closeModal,
    }),
    [isModalOpen, openModal, closeModal]
  )

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

/**
 * useModal hook - Access modal context
 *
 * @returns Modal context value
 * @throws Error if used outside ModalProvider
 *
 * @example
 * ```tsx
 * const { isModalOpen, openModal, closeModal } = useModal()
 *
 * // Open modal
 * openModal()
 *
 * // Close modal
 * closeModal()
 * ```
 */
export function useModal(): ModalContextValue {
  const context = useContext(ModalContext)

  if (context === null) {
    throw new Error('useModal must be used within a ModalProvider')
  }

  return context
}
