/**
 * useModalDetection Hook
 *
 * Provides convenient access to the global modal state from ModalContext.
 * This hook is a simple wrapper that extracts the `isModalOpen` boolean state.
 *
 * Used primarily by components that need to respond to modal open/close events,
 * such as the HamburgerMenu component which hides when any modal is open.
 *
 * @example
 * ```typescript
 * import { useModalDetection } from '@/hooks/useModalDetection'
 *
 * function HamburgerMenu() {
 *   const { isModalOpen } = useModalDetection()
 *
 *   // Hide hamburger icon when any modal is open
 *   if (isModalOpen) {
 *     return null
 *   }
 *
 *   return <button>Menu</button>
 * }
 * ```
 *
 * @returns Object containing the isModalOpen boolean state from ModalContext
 */

import { useModal } from '@/contexts/ModalContext'

export function useModalDetection() {
  const { isModalOpen } = useModal()

  return { isModalOpen }
}
