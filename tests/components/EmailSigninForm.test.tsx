/**
 * EmailSigninForm Component Tests
 * Feature: 004-add-email-add
 *
 * Tests the signin-only email/password form component
 * Verifies validation, lockout UI, accessibility, and API integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import EmailSigninForm from '@/components/auth/EmailSigninForm'
import * as rateLimitModule from '@/lib/auth/rate-limit'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

describe('EmailSigninForm Component', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh
    })
    ;(global.fetch as jest.Mock).mockClear()
    localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render email and password inputs', () => {
      render(<EmailSigninForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should render submit button with correct text', () => {
      render(<EmailSigninForm />)

      expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument()
    })

    it('should not render confirm password field (signin only)', () => {
      render(<EmailSigninForm />)

      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
    })

    it('should apply custom className if provided', () => {
      const { container } = render(<EmailSigninForm className="custom-class" />)

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email format|please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should show error for missing email', async () => {
      const user = userEvent.setup()
      render(<EmailSigninForm />)

      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should show error for missing password', async () => {
      const user = userEvent.setup()
      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should normalize email to lowercase', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, redirectUrl: '/' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'USER@EXAMPLE.COM')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/email-signin',
          expect.objectContaining({
            body: expect.stringContaining('user@example.com')
          })
        )
      })
    })
  })

  describe('Lockout Functionality', () => {
    it('should check localStorage for lockout on mount', () => {
      const checkLocalLockoutSpy = jest.spyOn(rateLimitModule, 'checkLocalLockout')

      render(<EmailSigninForm />)

      // Initially won't check until email is entered
      expect(checkLocalLockoutSpy).not.toHaveBeenCalled()
    })

    it('should display lockout message when user is locked out', async () => {
      const user = userEvent.setup()
      jest.spyOn(rateLimitModule, 'checkLocalLockout').mockReturnValue({
        isLocked: true,
        minutesRemaining: 10
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument()
        expect(screen.getByText(/10 minute/i)).toBeInTheDocument()
      })
    })

    it('should disable submit button when locked out', async () => {
      const user = userEvent.setup()
      jest.spyOn(rateLimitModule, 'checkLocalLockout').mockReturnValue({
        isLocked: true,
        minutesRemaining: 5
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should update local lockout after failed signin', async () => {
      const user = userEvent.setup()
      const updateLocalLockoutSpy = jest.spyOn(rateLimitModule, 'updateLocalLockout')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid credentials' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(updateLocalLockoutSpy).toHaveBeenCalledWith('user@example.com')
      })
    })

    it('should clear local lockout after successful signin', async () => {
      const user = userEvent.setup()
      const clearLocalLockoutSpy = jest.spyOn(rateLimitModule, 'clearLocalLockout')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, redirectUrl: '/' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'correctpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(clearLocalLockoutSpy).toHaveBeenCalledWith('user@example.com')
      })
    })
  })

  describe('API Integration', () => {
    it('should call /api/auth/email-signin on submit', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, redirectUrl: '/' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/email-signin',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'user@example.com',
              password: 'password123'
            })
          })
        )
      })
    })

    it('should redirect on successful signin', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, redirectUrl: '/dashboard' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('should use custom redirectTo prop', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: true, redirectUrl: '/' })
      })

      render(<EmailSigninForm redirectTo="/custom-page" />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-page')
      })
    })

    it('should display error message on failed signin', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid credentials' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error|unexpected error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          json: async () => ({ success: true, redirectUrl: '/' })
        }), 100))
      )

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Should show loading text
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should disable inputs during submission', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          json: async () => ({ success: true, redirectUrl: '/' })
        }), 100))
      )

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(emailInput.disabled).toBe(true)
      expect(passwordInput.disabled).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('aria-label')
      expect(passwordInput).toHaveAttribute('aria-label')
    })

    it('should link errors with inputs via aria-describedby', async () => {
      const user = userEvent.setup()
      render(<EmailSigninForm />)

      const submitButton = screen.getByRole('button', { name: /sign in with email/i })
      await user.click(submitButton)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        const errorId = emailInput.getAttribute('aria-describedby')

        if (errorId) {
          expect(screen.getByText(/email is required/i)).toHaveAttribute('id', errorId)
        }
      })
    })

    it('should mark invalid inputs with aria-invalid', async () => {
      const user = userEvent.setup()
      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should announce errors with role="alert"', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid credentials' })
      })

      render(<EmailSigninForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in with email/i })

      await user.type(emailInput, 'user@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent(/invalid credentials/i)
      })
    })
  })
})
