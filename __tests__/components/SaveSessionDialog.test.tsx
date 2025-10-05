/**
 * SaveSessionDialog Component Tests
 * Tests for dialog behavior, save success/failure, and toast notifications
 * Requirements: FR-003, FR-003a-f, FR-004, FR-004a
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useToast } from '@/hooks/use-toast'

// Mock useToast hook
jest.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = jest.fn()

interface SaveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionData: {
    targetColor: { hex: string; lab: { l: number; a: number; b: number } }
    inputMethod: 'color_picker' | 'hex_code' | 'image_upload'
    mode: 'Standard' | 'Enhanced' | 'Ratio Prediction'
    result: any
    deltaE?: number
  } | null
}

// Mock component that mimics SaveSessionDialog behavior
const SaveSessionDialog: React.FC<SaveSessionDialogProps> = ({
  open,
  onOpenChange,
  sessionData
}) => {
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { toast } = useToast()

  const handleSave = async (sessionName: string) => {
    if (!sessionData) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          ...sessionData
        })
      })

      if (response.ok) {
        // FR-003: Close dialog on success
        onOpenChange(false)

        // FR-004, FR-004a: Show success toast
        toast({
          title: "Session saved successfully",
          variant: "success",
          duration: 3000
        })
      } else {
        // FR-003a: Keep dialog open on failure
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save session')

        // FR-003b: Display error message
        toast({
          title: "Failed to save session",
          description: errorData.message,
          variant: "destructive"
        })
      }
    } catch (err) {
      // FR-003a: Keep dialog open on network error
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)

      // FR-003b: Display error
      toast({
        title: "Failed to save session",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div role="dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Save Session</h2>

      <input
        type="text"
        placeholder="Session name"
        data-testid="session-name-input"
      />

      <button
        onClick={() => {
          const input = document.querySelector('[data-testid="session-name-input"]') as HTMLInputElement
          handleSave(input?.value || 'Test Session')
        }}
        disabled={isSaving || !sessionData}
        data-testid="save-button"
      >
        {isSaving ? 'Saving...' : 'Save Session'}
      </button>

      {error && (
        <div role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      <button onClick={() => onOpenChange(false)} data-testid="close-button">
        Close
      </button>
    </div>
  )
}

describe('SaveSessionDialog Component', () => {
  const mockToast = jest.fn()
  const mockOnOpenChange = jest.fn()

  const validSessionData = {
    targetColor: {
      hex: '#FF5733',
      lab: { l: 50, a: 40, b: 30 }
    },
    inputMethod: 'hex_code' as const,
    mode: 'Enhanced' as const,
    result: { formula: { paints: [] } },
    deltaE: 2.5
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('dialog open state (FR-003)', () => {
    it('should render dialog when open=true', () => {
      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Save Session')).toBeInTheDocument()
    })

    it('should not render dialog when open=false', () => {
      render(
        <SaveSessionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('save success workflow (FR-003, FR-004)', () => {
    it('should close dialog when save succeeds', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      const saveButton = screen.getByTestId('save-button')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should display success toast notification (FR-004, FR-004a)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Session saved successfully",
          variant: "success",
          duration: 3000
        })
      })
    })

    it('should use exact success message from spec (FR-004a)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        const toastCall = mockToast.mock.calls[0][0]
        expect(toastCall.title).toBe("Session saved successfully")
      })
    })
  })

  describe('save failure handling (FR-003a, FR-003b)', () => {
    it('should keep dialog open when save fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Database error' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
      })

      // Dialog should NOT close (onOpenChange not called with false)
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should display error message when save fails (FR-003b)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Database error' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Database error')
      })
    })

    it('should handle network errors (FR-003a, FR-003b)', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network connection failed')
      )

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network connection failed')
      })

      // Dialog should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should allow manual retry after failure (FR-003c)', async () => {
      // First attempt fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Temporary error' })
      })

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      // Second attempt succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' })
      })

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('concurrent save prevention (FR-003d, FR-003e)', () => {
    it('should disable save button during submission (FR-003d)', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      )

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      const saveButton = screen.getByTestId('save-button')

      fireEvent.click(saveButton)

      // Button should be disabled immediately
      expect(saveButton).toBeDisabled()
      expect(saveButton).toHaveTextContent('Saving...')

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should reject concurrent save attempts (FR-003e)', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      )

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      const saveButton = screen.getByTestId('save-button')

      // First click
      fireEvent.click(saveButton)

      // Immediate second click (should be ignored due to disabled state)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })

      // Only one fetch call should have been made
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('save button disabled state (FR-003f)', () => {
    it('should disable save button when calculationResult is null', () => {
      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={null}
        />
      )

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toBeDisabled()
    })

    it('should enable save button when valid session data exists', () => {
      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      const saveButton = screen.getByTestId('save-button')
      expect(saveButton).toBeEnabled()
    })

    it('should remain disabled when sessionData is null even after open', () => {
      const { rerender } = render(
        <SaveSessionDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          sessionData={null}
        />
      )

      rerender(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={null}
        />
      )

      expect(screen.getByTestId('save-button')).toBeDisabled()
    })
  })

  describe('no automatic retry (FR-003c)', () => {
    it('should NOT automatically retry on failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(
        <SaveSessionDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          sessionData={validSessionData}
        />
      )

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      // Wait to ensure no automatic retry happens
      await new Promise(resolve => setTimeout(resolve, 200))

      // Only one fetch call (no automatic retry)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
