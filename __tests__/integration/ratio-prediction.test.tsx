/**
 * Ratio Prediction Mode Integration Test
 * Tests complete Ratio Prediction workflow with volume validation
 * Requirements: FR-007, FR-012, Integration testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { z } from 'zod'

// Mock fetch
global.fetch = jest.fn()

// Mock useToast
jest.mock('@/hooks/use-toast')
import { useToast } from '@/hooks/use-toast'

// Validation schemas
const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

interface Paint {
  id: string
  name: string
  volume: number
}

interface RatioPredictionWorkflowProps {
  availablePaints: Array<{ id: string; name: string }>
}

const RatioPredictionWorkflow: React.FC<RatioPredictionWorkflowProps> = ({
  availablePaints
}) => {
  const [paints, setPaints] = React.useState<Paint[]>([
    { id: '', name: '', volume: 0 },
    { id: '', name: '', volume: 0 }
  ])
  const [mode, setMode] = React.useState<'Standard' | 'Enhanced'>('Standard')
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [result, setResult] = React.useState<any>(null)
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({})
  const { toast } = useToast()

  const handlePaintChange = (index: number, field: keyof Paint, value: any) => {
    const newPaints = [...paints]
    newPaints[index] = { ...newPaints[index], [field]: value }
    setPaints(newPaints)
  }

  const handleAddPaint = () => {
    if (paints.length < 5) {
      setPaints([...paints, { id: '', name: '', volume: 0 }])
    }
  }

  const handleRemovePaint = (index: number) => {
    if (paints.length > 2) {
      setPaints(paints.filter((_, i) => i !== index))
    }
  }

  const validatePaints = (): boolean => {
    const errors: Record<string, string> = {}

    paints.forEach((paint, index) => {
      if (!paint.id) {
        errors[`paint-${index}`] = 'Paint selection is required'
      }

      const volumeResult = paintVolumeSchema.safeParse(paint.volume)
      if (!volumeResult.success) {
        errors[`volume-${index}`] = volumeResult.error.errors[0].message
      }
    })

    if (paints.length < 2) {
      errors.general = 'Ratio Prediction requires at least 2 paints'
    }

    if (paints.length > 5) {
      errors.general = 'Ratio Prediction allows maximum 5 paints'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCalculate = async () => {
    if (!validatePaints()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before calculating',
        variant: 'destructive'
      })
      return
    }

    setIsCalculating(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'Ratio Prediction',
          calculationMode: mode,
          paints: paints.map(p => ({ id: p.id, volume: p.volume }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const error = await response.json()
        toast({
          title: 'Calculation Failed',
          description: error.message,
          variant: 'destructive'
        })
      }
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div>
      <h2>Ratio Prediction Mode</h2>

      {/* Paint selections */}
      {paints.map((paint, index) => (
        <div key={index} data-testid={`paint-row-${index}`}>
          <select
            value={paint.id}
            onChange={(e) => {
              const selected = availablePaints.find(p => p.id === e.target.value)
              handlePaintChange(index, 'id', e.target.value)
              handlePaintChange(index, 'name', selected?.name || '')
            }}
            data-testid={`paint-select-${index}`}
          >
            <option value="">Select paint...</option>
            {availablePaints.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            type="number"
            value={paint.volume || ''}
            onChange={(e) => handlePaintChange(index, 'volume', parseFloat(e.target.value) || 0)}
            data-testid={`volume-input-${index}`}
            min={5}
            max={1000}
          />

          {validationErrors[`volume-${index}`] && (
            <div role="alert" data-testid={`volume-error-${index}`}>
              {validationErrors[`volume-${index}`]}
            </div>
          )}

          {paints.length > 2 && (
            <button
              onClick={() => handleRemovePaint(index)}
              data-testid={`remove-paint-${index}`}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleAddPaint}
        disabled={paints.length >= 5}
        data-testid="add-paint-button"
      >
        Add Paint ({paints.length}/5)
      </button>

      {/* Mode selection */}
      <div>
        <label>
          <input
            type="radio"
            value="Standard"
            checked={mode === 'Standard'}
            onChange={() => setMode('Standard')}
            data-testid="mode-standard"
          />
          Standard
        </label>
        <label>
          <input
            type="radio"
            value="Enhanced"
            checked={mode === 'Enhanced'}
            onChange={() => setMode('Enhanced')}
            data-testid="mode-enhanced"
          />
          Enhanced
        </label>
      </div>

      {/* General errors */}
      {validationErrors.general && (
        <div role="alert" data-testid="general-error">
          {validationErrors.general}
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={isCalculating}
        data-testid="calculate-button"
      >
        {isCalculating ? 'Calculating...' : 'Calculate Ratio'}
      </button>

      {/* Results */}
      {result && (
        <div data-testid="result-display">
          <div data-testid="result-color">Color: {result.resultColor}</div>
          <div data-testid="result-delta-e">Delta E: {result.deltaE}</div>
        </div>
      )}
    </div>
  )
}

describe('Ratio Prediction Integration', () => {
  const mockToast = jest.fn()
  const mockPaints = [
    { id: 'paint-1', name: 'Titanium White' },
    { id: 'paint-2', name: 'Cadmium Red' },
    { id: 'paint-3', name: 'Ultramarine Blue' },
    { id: 'paint-4', name: 'Yellow Ochre' },
    { id: 'paint-5', name: 'Burnt Sienna' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('complete workflow with valid inputs', () => {
    it('should complete Ratio Prediction calculation with 2 paints', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultColor: '#FF8866',
          deltaE: 3.2
        })
      })

      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      // Select paints
      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })

      // Set volumes
      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '50' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '30' }
      })

      // Calculate
      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/optimize',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"mode":"Ratio Prediction"')
          })
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('result-display')).toBeInTheDocument()
        expect(screen.getByTestId('result-delta-e')).toHaveTextContent('3.2')
      })
    })

    it('should complete calculation with 5 paints (maximum)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultColor: '#AABBCC',
          deltaE: 2.1
        })
      })

      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      // Add 3 more paints (starts with 2)
      fireEvent.click(screen.getByTestId('add-paint-button'))
      fireEvent.click(screen.getByTestId('add-paint-button'))
      fireEvent.click(screen.getByTestId('add-paint-button'))

      // Select and set volumes for all 5
      for (let i = 0; i < 5; i++) {
        fireEvent.change(screen.getByTestId(`paint-select-${i}`), {
          target: { value: `paint-${i + 1}` }
        })
        fireEvent.change(screen.getByTestId(`volume-input-${i}`), {
          target: { value: '100' }
        })
      }

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('result-display')).toBeInTheDocument()
      })
    })
  })

  describe('volume validation (FR-012d, FR-012e)', () => {
    it('should reject volume below 5ml', async () => {
      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })

      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '4' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '100' }
      })

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('volume-error-0')).toHaveTextContent(
          'Paint volume must be between 5ml and 1000ml'
        )
      })

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error'
        })
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should reject volume above 1000ml', async () => {
      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })

      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '1001' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '100' }
      })

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(screen.getByTestId('volume-error-0')).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should accept volume at boundaries (5ml and 1000ml)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultColor: '#FFFFFF', deltaE: 1.0 })
      })

      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })

      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '5' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '1000' }
      })

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('paint count constraints (FR-007a, FR-012f)', () => {
    it('should prevent adding more than 5 paints', () => {
      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      const addButton = screen.getByTestId('add-paint-button')

      // Add to 5 paints
      fireEvent.click(addButton)
      fireEvent.click(addButton)
      fireEvent.click(addButton)

      expect(screen.getByTestId('paint-row-4')).toBeInTheDocument()
      expect(addButton).toBeDisabled()
      expect(addButton).toHaveTextContent('5/5')
    })

    it('should prevent removing below 2 paints', () => {
      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      // Initially 2 paints, no remove buttons
      expect(screen.queryByTestId('remove-paint-0')).not.toBeInTheDocument()
      expect(screen.queryByTestId('remove-paint-1')).not.toBeInTheDocument()

      // Add third paint
      fireEvent.click(screen.getByTestId('add-paint-button'))
      expect(screen.getByTestId('remove-paint-2')).toBeInTheDocument()

      // Remove it
      fireEvent.click(screen.getByTestId('remove-paint-2'))

      // Back to 2 paints, no remove buttons again
      expect(screen.queryByTestId('remove-paint-0')).not.toBeInTheDocument()
      expect(screen.queryByTestId('remove-paint-1')).not.toBeInTheDocument()
    })
  })

  describe('mode selection', () => {
    it('should send Standard mode to API', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultColor: '#FF0000', deltaE: 2.0 })
      })

      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      // Select Standard mode (default)
      expect(screen.getByTestId('mode-standard')).toBeChecked()

      // Setup and calculate
      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })
      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '50' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '50' }
      })

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const body = JSON.parse(fetchCall[1].body)
        expect(body.calculationMode).toBe('Standard')
      })
    })

    it('should send Enhanced mode to API when selected', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultColor: '#00FF00', deltaE: 1.5 })
      })

      render(<RatioPredictionWorkflow availablePaints={mockPaints} />)

      // Select Enhanced mode
      fireEvent.click(screen.getByTestId('mode-enhanced'))

      // Setup and calculate
      fireEvent.change(screen.getByTestId('paint-select-0'), {
        target: { value: 'paint-1' }
      })
      fireEvent.change(screen.getByTestId('paint-select-1'), {
        target: { value: 'paint-2' }
      })
      fireEvent.change(screen.getByTestId('volume-input-0'), {
        target: { value: '50' }
      })
      fireEvent.change(screen.getByTestId('volume-input-1'), {
        target: { value: '50' }
      })

      fireEvent.click(screen.getByTestId('calculate-button'))

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const body = JSON.parse(fetchCall[1].body)
        expect(body.calculationMode).toBe('Enhanced')
      })
    })
  })
})
