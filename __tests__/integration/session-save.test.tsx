/**
 * Session Save Workflow Integration Test
 * Tests the complete flow from calculation to session save
 * Requirements: FR-003, FR-004, FR-006, Integration testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock useToast
jest.mock('@/hooks/use-toast')
import { useToast } from '@/hooks/use-toast'

// Mock fetch
global.fetch = jest.fn()

type InputMethod = 'color_picker' | 'hex_code' | 'image_upload'
type Mode = 'Standard' | 'Enhanced' | 'Ratio Prediction'

interface CalculationResult {
  formula: {
    paints: Array<{ name: string; volume: number }>
  }
  calculatedColor: { hex: string; lab: { l: number; a: number; b: number } }
  deltaE: number
}

interface SessionSaveWorkflowProps {
  initialInputMethod?: InputMethod
  initialMode?: Mode
}

// Integration component simulating the full workflow
const SessionSaveWorkflow: React.FC<SessionSaveWorkflowProps> = ({
  initialInputMethod = 'hex_code',
  initialMode = 'Standard'
}) => {
  const [inputMethod, setInputMethod] = React.useState<InputMethod>(initialInputMethod)
  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [targetColor, setTargetColor] = React.useState<{ hex: string; lab: { l: number; a: number; b: number } } | null>(null)
  const [calculationResult, setCalculationResult] = React.useState<CalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const { toast } = useToast()

  const handleCalculate = async () => {
    if (!targetColor) return

    setIsCalculating(true)
    try {
      // Simulate calculation
      await new Promise(resolve => setTimeout(resolve, 100))

      setCalculationResult({
        formula: {
          paints: [
            { name: 'Titanium White', volume: 50 },
            { name: 'Cadmium Red', volume: 30 }
          ]
        },
        calculatedColor: targetColor,
        deltaE: 1.5
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSaveSession = async (sessionName: string) => {
    if (!calculationResult || !targetColor) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          input_method: inputMethod,
          mode,
          target_color: targetColor,
          calculated_color: calculationResult.calculatedColor,
          delta_e: calculationResult.deltaE,
          formula: calculationResult.formula
        })
      })

      if (response.ok) {
        setSaveDialogOpen(false)
        toast({
          title: "Session saved successfully",
          variant: "success",
          duration: 3000
        })
      } else {
        const error = await response.json()
        toast({
          title: "Failed to save session",
          description: error.message,
          variant: "destructive"
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Input method selection */}
      <div data-testid="input-method-buttons">
        <button
          onClick={() => setInputMethod('color_picker')}
          data-testid="select-color-picker"
        >
          Color Picker
        </button>
        <button
          onClick={() => setInputMethod('hex_code')}
          data-testid="select-hex-code"
        >
          Hex Code
        </button>
      </div>

      {/* Mode selection */}
      <div data-testid="mode-selection">
        <label>
          <input
            type="checkbox"
            checked={mode === 'Enhanced'}
            onChange={(e) => setMode(e.target.checked ? 'Enhanced' : 'Standard')}
            data-testid="enhanced-mode-checkbox"
          />
          Enhanced Mode
        </label>
      </div>

      {/* Color input */}
      <input
        type="text"
        placeholder="Enter hex color"
        onChange={(e) => {
          const hex = e.target.value
          setTargetColor({
            hex,
            lab: { l: 50, a: 40, b: 30 }
          })
        }}
        data-testid="color-input"
      />

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={isCalculating || !targetColor}
        data-testid="calculate-button"
      >
        {isCalculating ? 'Calculating...' : 'Calculate'}
      </button>

      {/* Results */}
      {calculationResult && (
        <div data-testid="calculation-result">
          <div>Delta E: {calculationResult.deltaE}</div>
          <button
            onClick={() => setSaveDialogOpen(true)}
            data-testid="open-save-dialog"
          >
            Save Session
          </button>
        </div>
      )}

      {/* Save dialog */}
      {saveDialogOpen && (
        <div role="dialog" data-testid="save-dialog">
          <input
            type="text"
            placeholder="Session name"
            data-testid="session-name-input"
          />
          <button
            onClick={() => {
              const input = document.querySelector('[data-testid="session-name-input"]') as HTMLInputElement
              handleSaveSession(input?.value || 'Test Session')
            }}
            disabled={isSaving}
            data-testid="save-button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setSaveDialogOpen(false)}
            data-testid="cancel-button"
          >
            Cancel
          </button>
        </div>
      )}

      {/* State inspection for tests */}
      <div data-testid="current-input-method">{inputMethod}</div>
      <div data-testid="current-mode">{mode}</div>
    </div>
  )
}

describe('Session Save Workflow Integration', () => {
  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('complete workflow: color input → calculation → save', () => {
    it('should complete full workflow from hex input to saved session', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow />)

      // Step 1: Enter color
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })

      // Step 2: Calculate
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Wait for calculation
      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      // Step 3: Open save dialog
      fireEvent.click(screen.getByTestId('open-save-dialog'))
      expect(screen.getByTestId('save-dialog')).toBeInTheDocument()

      // Step 4: Enter session name and save
      const sessionNameInput = screen.getByTestId('session-name-input')
      fireEvent.change(sessionNameInput, { target: { value: 'My Red Mix' } })
      fireEvent.click(screen.getByTestId('save-button'))

      // Step 5: Verify save request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/sessions',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('My Red Mix')
          })
        )
      })

      // Step 6: Verify success toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Session saved successfully",
          variant: "success",
          duration: 3000
        })
      })

      // Step 7: Verify dialog closed
      expect(screen.queryByTestId('save-dialog')).not.toBeInTheDocument()
    })

    it('should include input_method in saved session metadata (FR-006)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow initialInputMethod="color_picker" />)

      // Complete workflow
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#00FF00' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      // Verify input_method in request body
      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody.input_method).toBe('color_picker')
      })
    })

    it('should include mode in saved session metadata', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow initialMode="Enhanced" />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#0000FF' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody.mode).toBe('Enhanced')
      })
    })

    it('should include all required session fields', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FFFF00' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)

        expect(requestBody).toMatchObject({
          name: expect.any(String),
          input_method: expect.stringMatching(/color_picker|hex_code|image_upload/),
          mode: expect.stringMatching(/Standard|Enhanced|Ratio Prediction/),
          target_color: expect.objectContaining({
            hex: expect.any(String),
            lab: expect.any(Object)
          }),
          calculated_color: expect.any(Object),
          delta_e: expect.any(Number),
          formula: expect.any(Object)
        })
      })
    })
  })

  describe('input method tracking across workflow', () => {
    it('should preserve input_method when switching before calculation', async () => {
      render(<SessionSaveWorkflow />)

      // Switch input method
      fireEvent.click(screen.getByTestId('select-color-picker'))
      expect(screen.getByTestId('current-input-method')).toHaveTextContent('color_picker')

      // Complete workflow
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      // Verify input method persisted
      expect(screen.getByTestId('current-input-method')).toHaveTextContent('color_picker')
    })

    it('should update input_method when changed after calculation but before save', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow initialInputMethod="hex_code" />)

      // Calculate with hex_code
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      // Switch to color picker
      fireEvent.click(screen.getByTestId('select-color-picker'))

      // Save session
      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      // Verify saved with updated input_method
      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody.input_method).toBe('color_picker')
      })
    })
  })

  describe('error handling in workflow', () => {
    it('should handle save failure and allow retry', async () => {
      // First attempt fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Network error' })
      })

      render(<SessionSaveWorkflow />)

      // Complete calculation
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      // Try to save
      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      // Verify error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Failed to save session",
          description: "Network error",
          variant: "destructive"
        })
      })

      // Dialog should remain open
      expect(screen.getByTestId('save-dialog')).toBeInTheDocument()

      // Second attempt succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Session saved successfully",
          variant: "success",
          duration: 3000
        })
      })

      // Dialog should close
      expect(screen.queryByTestId('save-dialog')).not.toBeInTheDocument()
    })

    it('should disable save button when no calculation result', () => {
      render(<SessionSaveWorkflow />)

      // No calculation performed
      expect(screen.queryByTestId('open-save-dialog')).not.toBeInTheDocument()
    })
  })

  describe('mode changes during workflow', () => {
    it('should save with current mode setting', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'session-123' })
      })

      render(<SessionSaveWorkflow />)

      // Enable Enhanced mode
      fireEvent.click(screen.getByTestId('enhanced-mode-checkbox'))
      expect(screen.getByTestId('current-mode')).toHaveTextContent('Enhanced')

      // Complete workflow
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('calculation-result')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('open-save-dialog'))
      fireEvent.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody.mode).toBe('Enhanced')
      })
    })
  })
})
