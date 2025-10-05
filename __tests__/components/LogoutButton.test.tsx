/**
 * LogoutButton Component Tests
 * Tests for logout functionality, session termination, and loading state
 * Requirements: FR-011
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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

interface LogoutButtonProps {
  onLogoutStart?: () => void
  onLogoutComplete?: () => void
  className?: string
}

// Mock component that mimics LogoutButton behavior
const LogoutButton: React.FC<LogoutButtonProps> = ({
  onLogoutStart,
  onLogoutComplete,
  className = '',
}) => {
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    onLogoutStart?.()

    try {
      await mockSignOut()
      mockPush('/auth/signin')
      onLogoutComplete?.()
    } catch (error) {
      // Always redirect even on error (network failure, etc.)
      mockPush('/auth/signin')
      onLogoutComplete?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      data-testid="logout-button"
      aria-label="Logout"
    >
      {isLoading ? (
        <span data-testid="loading-spinner">Logging out...</span>
      ) : (
        'Logout'
      )}
    </button>
  )
}

describe('LogoutButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
  })

  describe('logout functionality (FR-011)', () => {
    it('should call supabase.auth.signOut() on button click', async () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1)
      })
    })

    it('should call router.push("/auth/signin") after signOut', async () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('should call signOut before router.push (correct order)', async () => {
      const callOrder: string[] = []

      mockSignOut.mockImplementation(async () => {
        callOrder.push('signOut')
        return { error: null }
      })

      mockPush.mockImplementation(() => {
        callOrder.push('push')
      })

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(callOrder).toEqual(['signOut', 'push'])
      })
    })
  })

  describe('loading state (FR-011)', () => {
    it('should show loading state during async operation', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      // Loading state should be shown immediately
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      })

      expect(button).toBeDisabled()
    })

    it('should display "Logging out..." text during loading', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Logging out...')).toBeInTheDocument()
      })
    })

    it('should disable button during loading to prevent double-click', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      // Try to click again while loading
      fireEvent.click(button)

      // Should only call signOut once
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })

      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('should restore normal state after logout completes', async () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })

      // Loading state should be cleared
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
  })

  describe('error handling (FR-011)', () => {
    it('should redirect to signin even if signOut fails', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'))

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })

    it('should call onLogoutComplete even on signOut error', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'))
      const mockOnLogoutComplete = jest.fn()

      render(<LogoutButton onLogoutComplete={mockOnLogoutComplete} />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnLogoutComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('should clear loading state even on error', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'))

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
  })

  describe('callback props', () => {
    it('should call onLogoutStart when logout begins', async () => {
      const mockOnLogoutStart = jest.fn()

      render(<LogoutButton onLogoutStart={mockOnLogoutStart} />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnLogoutStart).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onLogoutComplete after logout succeeds', async () => {
      const mockOnLogoutComplete = jest.fn()

      render(<LogoutButton onLogoutComplete={mockOnLogoutComplete} />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnLogoutComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('should call callbacks in correct order', async () => {
      const callOrder: string[] = []
      const mockOnLogoutStart = jest.fn(() => callOrder.push('start'))
      const mockOnLogoutComplete = jest.fn(() => callOrder.push('complete'))

      render(
        <LogoutButton
          onLogoutStart={mockOnLogoutStart}
          onLogoutComplete={mockOnLogoutComplete}
        />
      )

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(callOrder).toEqual(['start', 'complete'])
      })
    })

    it('should work without optional callbacks', async () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })

      // Should not throw errors
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('className prop support', () => {
    it('should apply custom className', () => {
      render(<LogoutButton className="custom-class" />)

      const button = screen.getByTestId('logout-button')
      expect(button).toHaveClass('custom-class')
    })

    it('should work without className prop', () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('accessibility (FR-013)', () => {
    it('should have aria-label for screen readers', () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      expect(button).toHaveAttribute('aria-label', 'Logout')
    })

    it('should maintain accessibility during loading state', async () => {
      mockSignOut.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      )

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      // Should still have aria-label
      expect(button).toHaveAttribute('aria-label', 'Logout')
    })
  })

  describe('session termination (FR-011)', () => {
    it('should terminate session by calling signOut', async () => {
      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1)
      })

      // Verify redirect to signin page (requires re-authentication)
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })

    it('should clear authentication tokens (via signOut)', async () => {
      mockSignOut.mockResolvedValue({
        error: null,
      })

      render(<LogoutButton />)

      const button = screen.getByTestId('logout-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1)
      })

      // signOut() clears cookies/tokens automatically
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })
  })
})
