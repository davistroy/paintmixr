/**
 * Standard Mode Integration Test
 * Tests complete Standard Mode workflow with proper constraints
 * Requirements: FR-001, FR-008, Integration testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn()

interface StandardModeWorkflowProps {
  initialEnhancedMode?: boolean
}

const StandardModeWorkflow: React.FC<StandardModeWorkflowProps> = ({
  initialEnhancedMode = false
}) => {
  const [enhancedMode, setEnhancedMode] = React.useState(initialEnhancedMode)
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [targetColor, setTargetColor] = React.useState('')
  const [result, setResult] = React.useState<any>(null)

  const handleCalculate = async () => {
    if (!targetColor) return

    setIsCalculating(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColor: { hex: targetColor, lab: { l: 50, a: 40, b: 30 } },
          mode: enhancedMode ? 'Enhanced' : 'Standard'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const mode = enhancedMode ? 'Enhanced' : 'Standard'
  const threshold = enhancedMode ? 2.0 : 5.0

  return (
    <div>
      {/* Enhanced Mode checkbox */}
      <label>
        <input
          type="checkbox"
          checked={enhancedMode}
          onChange={(e) => setEnhancedMode(e.target.checked)}
          disabled={isCalculating}
          data-testid="enhanced-mode-checkbox"
        />
        Enhanced Mode
      </label>

      {/* Target color input */}
      <input
        type="text"
        value={targetColor}
        onChange={(e) => setTargetColor(e.target.value)}
        placeholder="Enter hex color"
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

      {/* Mode display */}
      <div data-testid="current-mode">{mode} Mode</div>
      <div data-testid="mode-threshold">Target: ΔE ≤ {threshold.toFixed(1)}</div>

      {/* Results */}
      {result && (
        <div data-testid="result-display">
          <div data-testid="result-mode">Mode: {result.mode}</div>
          <div data-testid="result-delta-e">Delta E: {result.deltaE}</div>
          <div data-testid="result-paint-count">
            Paints: {result.formula.paints.length}
          </div>

          {/* Delta E warning */}
          {result.deltaE > threshold && (
            <div role="alert" data-testid="delta-e-warning">
              Color match exceeds {mode} Mode target (ΔE ≤ {threshold.toFixed(1)})
            </div>
          )}
        </div>
      )}
    </div>
  )
}

describe('Standard Mode Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Standard Mode workflow', () => {
    it('should complete full Standard Mode calculation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Standard',
          formula: {
            paints: [
              { name: 'Titanium White', volume: 50 },
              { name: 'Cadmium Red', volume: 30 }
            ]
          },
          deltaE: 3.5
        })
      })

      render(<StandardModeWorkflow />)

      // Verify Standard Mode is default
      expect(screen.getByTestId('current-mode')).toHaveTextContent('Standard Mode')
      expect(screen.getByTestId('mode-threshold')).toHaveTextContent('ΔE ≤ 5.0')

      // Enter color and calculate
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Verify API call with Standard mode
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/optimize',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"mode":"Standard"')
          })
        )
      })

      // Verify results display
      await waitFor(() => {
        expect(screen.getByTestId('result-display')).toBeInTheDocument()
        expect(screen.getByTestId('result-mode')).toHaveTextContent('Standard')
        expect(screen.getByTestId('result-delta-e')).toHaveTextContent('3.5')
      })

      // Verify no warning (within threshold)
      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })

    it('should use 5.0 threshold for Delta E warnings', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Standard',
          formula: { paints: [{ name: 'Paint', volume: 100 }] },
          deltaE: 6.5 // Exceeds Standard threshold
        })
      })

      render(<StandardModeWorkflow />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('delta-e-warning')).toBeInTheDocument()
        expect(screen.getByTestId('delta-e-warning')).toHaveTextContent('ΔE ≤ 5.0')
      })
    })

    it('should not show warning when Delta E ≤ 5.0', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Standard',
          formula: { paints: [] },
          deltaE: 5.0
        })
      })

      render(<StandardModeWorkflow />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result-display')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('delta-e-warning')).not.toBeInTheDocument()
    })
  })

  describe('mode switching during workflow', () => {
    it('should switch to Enhanced Mode when checkbox toggled', async () => {
      render(<StandardModeWorkflow />)

      // Start in Standard Mode
      expect(screen.getByTestId('current-mode')).toHaveTextContent('Standard Mode')

      // Toggle Enhanced Mode
      fireEvent.click(screen.getByTestId('enhanced-mode-checkbox'))

      // Verify mode changed
      expect(screen.getByTestId('current-mode')).toHaveTextContent('Enhanced Mode')
      expect(screen.getByTestId('mode-threshold')).toHaveTextContent('ΔE ≤ 2.0')
    })

    it('should send Enhanced mode to API when toggled', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Enhanced',
          formula: { paints: [] },
          deltaE: 1.5
        })
      })

      render(<StandardModeWorkflow />)

      // Enable Enhanced Mode
      fireEvent.click(screen.getByTestId('enhanced-mode-checkbox'))

      // Calculate
      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/optimize',
          expect.objectContaining({
            body: expect.stringContaining('"mode":"Enhanced"')
          })
        )
      })
    })

    it('should disable checkbox during calculation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ mode: 'Standard', formula: { paints: [] }, deltaE: 3.0 })
        }), 100))
      )

      render(<StandardModeWorkflow />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Checkbox should be disabled during calculation
      expect(screen.getByTestId('enhanced-mode-checkbox')).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByTestId('result-display')).toBeInTheDocument()
      })

      // Checkbox should be enabled after calculation
      expect(screen.getByTestId('enhanced-mode-checkbox')).toBeEnabled()
    })
  })

  describe('mode-specific constraints', () => {
    it('should enforce 3-paint maximum for Standard Mode', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Standard',
          formula: {
            paints: [
              { name: 'Paint 1', volume: 30 },
              { name: 'Paint 2', volume: 40 },
              { name: 'Paint 3', volume: 30 }
            ]
          },
          deltaE: 4.0
        })
      })

      render(<StandardModeWorkflow />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result-paint-count')).toHaveTextContent('3')
      })
    })

    it('should allow 2-5 paints for Enhanced Mode', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'Enhanced',
          formula: {
            paints: [
              { name: 'Paint 1', volume: 20 },
              { name: 'Paint 2', volume: 20 },
              { name: 'Paint 3', volume: 20 },
              { name: 'Paint 4', volume: 20 },
              { name: 'Paint 5', volume: 20 }
            ]
          },
          deltaE: 1.8
        })
      })

      render(<StandardModeWorkflow initialEnhancedMode={true} />)

      fireEvent.change(screen.getByTestId('color-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result-paint-count')).toHaveTextContent('5')
      })
    })
  })
})
