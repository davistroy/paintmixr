'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDebug } from '@/contexts/DebugContext'
import { useModal } from '@/contexts/ModalContext'
import { AboutDialog } from '@/components/AboutDialog'
import { LogoutButton } from '@/components/LogoutButton'

/**
 * HamburgerMenu Component
 *
 * Main navigation menu with hamburger icon trigger.
 * Provides access to Session History, Debug Mode toggle, About dialog, and Logout.
 *
 * Requirements: FR-001, FR-002, FR-012, NFR-001, NFR-005, FR-013
 *
 * Features:
 * - Hamburger icon (3 horizontal lines) with 44px tap target
 * - 4 menu items: Session History, Debug Mode, About, Logout
 * - Hides when modals are open
 * - Closes on item click, outside click, ESC key (handled by Radix UI)
 * - 150ms animation with prefers-reduced-motion support
 * - Full keyboard navigation and ARIA attributes
 *
 * @example
 * ```tsx
 * <HamburgerMenu />
 * ```
 */
export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const router = useRouter()
  const { isDebugEnabled, enableDebug, disableDebug } = useDebug()
  const { isModalOpen } = useModal()

  /**
   * Handle Session History navigation
   * Navigate to /sessions route
   */
  const handleSessionHistory = () => {
    setIsOpen(false)
    router.push('/sessions')
  }

  /**
   * Handle Debug Mode toggle
   */
  const handleDebugModeToggle = () => {
    if (isDebugEnabled) {
      disableDebug()
    } else {
      enableDebug()
    }
    // Don't close menu immediately for checkbox toggle
  }

  /**
   * Handle About dialog open
   */
  const handleAboutClick = () => {
    setIsOpen(false)
    setShowAbout(true)
  }

  /**
   * Handle logout start
   * Close menu before logout process begins
   */
  const handleLogoutStart = () => {
    setIsOpen(false)
  }

  // Hide hamburger icon when modals are open
  if (isModalOpen) {
    return null
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-testid="hamburger-menu-icon"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="fixed top-4 right-4 z-50 p-3 hover:bg-gray-100 rounded-md transition-all duration-150 ease-in-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          data-testid="hamburger-menu-dropdown"
          align="end"
          className="w-56 transition-all duration-150 ease-in-out motion-reduce:transition-none"
        >
          {/* Session History */}
          <DropdownMenuItem
            data-testid="menu-item-session-history"
            role="menuitem"
            onClick={handleSessionHistory}
            className="cursor-pointer"
          >
            Session History
          </DropdownMenuItem>

          {/* Debug Mode (Checkbox) */}
          <DropdownMenuCheckboxItem
            data-testid="menu-item-debug-mode"
            role="menuitem"
            checked={isDebugEnabled}
            onCheckedChange={handleDebugModeToggle}
            className="cursor-pointer"
          >
            Debug Mode
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          {/* About */}
          <DropdownMenuItem
            data-testid="menu-item-about"
            role="menuitem"
            onClick={handleAboutClick}
            className="cursor-pointer"
          >
            About
          </DropdownMenuItem>

          {/* Logout */}
          <DropdownMenuItem
            data-testid="menu-item-logout"
            role="menuitem"
            className="cursor-pointer p-0"
          >
            <div className="w-full">
              <LogoutButton
                onLogoutStart={handleLogoutStart}
                className="w-full text-left px-2 py-1.5 text-sm"
              />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* About Dialog (conditionally rendered) */}
      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  )
}
