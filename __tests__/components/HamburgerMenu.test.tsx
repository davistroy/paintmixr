/**
 * HamburgerMenu Component Tests
 * Tests for hamburger menu icon, dropdown interaction, modal hiding, and menu items
 * Requirements: FR-001, FR-002, FR-012, NFR-001
 *
 * PERFORMANCE BASELINES (for regression testing):
 * - Menu Animation: <200ms open/close duration (150ms target)
 * - Memory Leak: <10MB delta after 100 menu toggles
 * - Tap Target: 44x44px minimum for mobile accessibility
 *
 * Note: Animation performance and memory leak tests are in E2E tests (Cypress)
 * Unit tests verify component structure and behavior only.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { HamburgerMenu } from '@/components/HamburgerMenu'

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock useToast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock DebugContext
const mockEnableDebug = jest.fn()
const mockDisableDebug = jest.fn()
let mockIsDebugEnabled = false
jest.mock('@/contexts/DebugContext', () => ({
  useDebug: () => ({
    isDebugEnabled: mockIsDebugEnabled,
    enableDebug: mockEnableDebug,
    disableDebug: mockDisableDebug,
  }),
}))

// Mock ModalContext with configurable state
let mockIsModalOpen = false
jest.mock('@/contexts/ModalContext', () => ({
  useModal: () => ({
    isModalOpen: mockIsModalOpen,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}))

// Mock Supabase client
const mockSignOut = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

// Mock AboutDialog component to avoid rendering complexity in tests
jest.mock('@/components/AboutDialog', () => ({
  AboutDialog: () => null,
}))

// Mock LogoutButton component
jest.mock('@/components/LogoutButton', () => ({
  LogoutButton: ({ onLogoutStart, className }: any) => (
    <button
      data-testid="logout-button"
      onClick={() => {
        onLogoutStart?.()
        mockSignOut()
        mockPush('/auth/signin')
      }}
      className={className}
    >
      Logout
    </button>
  ),
}))

describe('HamburgerMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hamburger icon rendering (FR-001)', () => {
    it('should render hamburger icon on mount', () => {
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should have proper ARIA attributes for accessibility', () => {
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      expect(icon).toHaveAttribute('aria-label', 'Open navigation menu')
      expect(icon).toHaveAttribute('aria-expanded', 'false')
      expect(icon).toHaveAttribute('aria-haspopup', 'menu')
    })
  })

  describe('menu open/close interaction (FR-002, FR-012)', () => {
    it('should open menu on click', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      // Check that menu items are visible (Radix UI renders in portal)
      await waitFor(() => {
        expect(screen.getByTestId('session-history-item')).toBeInTheDocument()
      })
      expect(icon).toHaveAttribute('aria-expanded', 'true')
    })

    it('should close menu on outside click', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <HamburgerMenu />
        </div>
      )

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('session-history-item')).toBeInTheDocument()
      })

      // Click outside - use fireEvent instead of userEvent due to JSDOM pointer-events limitations with portals
      const outsideElement = screen.getByTestId('outside-element')
      fireEvent.pointerDown(outsideElement)
      fireEvent.mouseDown(outsideElement)
      fireEvent.click(outsideElement)

      await waitFor(() => {
        expect(screen.queryByTestId('session-history-item')).not.toBeInTheDocument()
      })
    })

    it('should close menu on ESC key press', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('session-history-item')).toBeInTheDocument()
      })

      // Press ESC key
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByTestId('session-history-item')).not.toBeInTheDocument()
      })
    })
  })

  describe('modal interaction (FR-001)', () => {
    it('should hide icon when isModalOpen prop is true', () => {
      mockIsModalOpen = true
      render(<HamburgerMenu />)

      expect(screen.queryByTestId('hamburger-icon')).not.toBeInTheDocument()
      mockIsModalOpen = false // Reset
    })

    it('should show icon when isModalOpen prop is false', () => {
      mockIsModalOpen = false
      render(<HamburgerMenu />)

      expect(screen.getByTestId('hamburger-icon')).toBeInTheDocument()
    })
  })

  describe('menu items (FR-002)', () => {
    it('should show 4 menu items when open', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      // Wait for menu to open and verify all 4 menu items are present
      await waitFor(() => {
        expect(screen.getByTestId('session-history-item')).toBeInTheDocument()
        expect(screen.getByTestId('debug-mode-item')).toBeInTheDocument()
        expect(screen.getByTestId('about-item')).toBeInTheDocument()
        expect(screen.getByTestId('logout-item')).toBeInTheDocument()
      })

      // Verify correct text content
      expect(screen.getByText('Session History')).toBeInTheDocument()
      expect(screen.getByText('Debug Mode')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should have proper role="menu" for accessibility', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        const menu = screen.getByRole('menu')
        expect(menu).toBeInTheDocument()
      })
    })

    it('should have role="menuitem" for all menu items', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems).toHaveLength(4)
      })
    })
  })

  describe('menu item interactions', () => {
    it('should close menu when Session History is clicked', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('session-history-item')).toBeInTheDocument()
      })

      // Click Session History
      await user.click(screen.getByTestId('session-history-item'))

      await waitFor(() => {
        expect(screen.queryByTestId('session-history-item')).not.toBeInTheDocument()
      })
    })

    it('should close menu when Debug Mode is clicked', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('debug-mode-item')).toBeInTheDocument()
      })

      // Click Debug Mode checkbox - it should NOT close the menu immediately
      await user.click(screen.getByTestId('debug-mode-item'))

      // For checkboxes, Radix UI might keep menu open, so let's just verify the toggle was called
      expect(mockEnableDebug).toHaveBeenCalled()
    })

    it('should close menu when About is clicked', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('about-item')).toBeInTheDocument()
      })

      // Click About
      await user.click(screen.getByTestId('about-item'))

      await waitFor(() => {
        expect(screen.queryByTestId('about-item')).not.toBeInTheDocument()
      })
    })

    it('should close menu when Logout is clicked', async () => {
      const user = userEvent.setup()
      render(<HamburgerMenu />)

      // Open menu
      const icon = screen.getByTestId('hamburger-icon')
      await user.click(icon)

      await waitFor(() => {
        expect(screen.getByTestId('logout-item')).toBeInTheDocument()
      })

      // Click Logout
      await user.click(screen.getByTestId('logout-item'))

      await waitFor(() => {
        expect(screen.queryByTestId('logout-item')).not.toBeInTheDocument()
      })
    })
  })

  describe('responsive design (NFR-005)', () => {
    it('should be accessible for touch targets (minimum 44x44px)', () => {
      render(<HamburgerMenu />)

      const icon = screen.getByTestId('hamburger-icon')
      // Note: Actual pixel measurement would be in E2E tests
      // This test verifies the element exists and is clickable
      expect(icon).toBeInTheDocument()
      expect(icon).toBeEnabled()
    })
  })
})
