/**
 * Input Method Tracking Integration Test
 * Tests that input_method is correctly tracked and persisted throughout user session
 * Requirements: FR-005, FR-006, Integration testing
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

type InputMethod = 'color_picker' | 'hex_code' | 'image_upload'

interface InputMethodTrackingAppProps {
  onSessionSave?: (data: any) => void
}

// Integration component simulating input method tracking
const InputMethodTrackingApp: React.FC<InputMethodTrackingAppProps> = ({
  onSessionSave
}) => {
  const [inputMethod, setInputMethod] = React.useState<InputMethod>('hex_code')
  const [hexInput, setHexInput] = React.useState('')
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = React.useState<string | null>(null)
  const [calculationResult, setCalculationResult] = React.useState<any>(null)

  const handleMethodChange = (method: InputMethod) => {
    // Clear other input states (FR-005a)
    setInputMethod(method)
    setSelectedColor(method === 'color_picker' ? selectedColor : null)
    setHexInput(method === 'hex_code' ? hexInput : '')
    setUploadedImage(method === 'image_upload' ? uploadedImage : null)
    // Clear calculation results (FR-005b)
    setCalculationResult(null)
  }

  const handleCalculate = () => {
    setCalculationResult({
      formula: { paints: [] },
      deltaE: 2.5,
      inputMethodUsed: inputMethod // Track method used for calculation
    })
  }

  const handleSave = () => {
    if (onSessionSave) {
      onSessionSave({
        input_method: inputMethod, // FR-006: Include in session metadata
        result: calculationResult
      })
    }
  }

  return (
    <div>
      {/* Input method buttons */}
      <div role="group" aria-label="Input method selection">
        <button
          onClick={() => handleMethodChange('color_picker')}
          data-testid="method-color-picker"
          aria-pressed={inputMethod === 'color_picker'}
        >
          Color Picker
        </button>
        <button
          onClick={() => handleMethodChange('hex_code')}
          data-testid="method-hex-code"
          aria-pressed={inputMethod === 'hex_code'}
        >
          Hex Code
        </button>
        <button
          onClick={() => handleMethodChange('image_upload')}
          data-testid="method-image-upload"
          aria-pressed={inputMethod === 'image_upload'}
        >
          Image Upload
        </button>
      </div>

      {/* Conditional inputs based on method */}
      {inputMethod === 'color_picker' && (
        <div data-testid="color-picker-input">
          <button
            onClick={() => setSelectedColor('#FF0000')}
            data-testid="pick-color"
          >
            Pick Color
          </button>
          <div data-testid="selected-color">{selectedColor || 'none'}</div>
        </div>
      )}

      {inputMethod === 'hex_code' && (
        <div data-testid="hex-code-input">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="Enter hex code"
            data-testid="hex-input"
          />
        </div>
      )}

      {inputMethod === 'image_upload' && (
        <div data-testid="image-upload-input">
          <button
            onClick={() => setUploadedImage('image-data-url')}
            data-testid="upload-image"
          >
            Upload Image
          </button>
          <div data-testid="uploaded-image">{uploadedImage || 'none'}</div>
        </div>
      )}

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        data-testid="calculate-button"
        disabled={
          (inputMethod === 'color_picker' && !selectedColor) ||
          (inputMethod === 'hex_code' && !hexInput) ||
          (inputMethod === 'image_upload' && !uploadedImage)
        }
      >
        Calculate
      </button>

      {/* Results */}
      {calculationResult && (
        <div data-testid="result-display">
          <div>Delta E: {calculationResult.deltaE}</div>
          <div data-testid="result-input-method">
            Method used: {calculationResult.inputMethodUsed}
          </div>
          <button onClick={handleSave} data-testid="save-button">
            Save Session
          </button>
        </div>
      )}

      {/* State inspection */}
      <div data-testid="current-input-method">{inputMethod}</div>
    </div>
  )
}

describe('Input Method Tracking Integration', () => {
  describe('input method persistence (FR-006)', () => {
    it('should track hex_code method through calculation to save', async () => {
      const mockSave = jest.fn()
      render(<InputMethodTrackingApp onSessionSave={mockSave} />)

      // Select hex code (default)
      expect(screen.getByTestId('current-input-method')).toHaveTextContent('hex_code')

      // Enter hex code
      fireEvent.change(screen.getByTestId('hex-input'), {
        target: { value: '#FF5733' }
      })

      // Calculate
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Verify method tracked in result
      expect(screen.getByTestId('result-input-method')).toHaveTextContent('hex_code')

      // Save session
      fireEvent.click(screen.getByTestId('save-button'))

      // Verify input_method included
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          input_method: 'hex_code'
        })
      )
    })

    it('should track color_picker method through workflow', async () => {
      const mockSave = jest.fn()
      render(<InputMethodTrackingApp onSessionSave={mockSave} />)

      // Switch to color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))
      expect(screen.getByTestId('current-input-method')).toHaveTextContent('color_picker')

      // Pick color
      fireEvent.click(screen.getByTestId('pick-color'))

      // Calculate
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Verify method tracked
      expect(screen.getByTestId('result-input-method')).toHaveTextContent('color_picker')

      // Save
      fireEvent.click(screen.getByTestId('save-button'))

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          input_method: 'color_picker'
        })
      )
    })

    it('should track image_upload method through workflow', async () => {
      const mockSave = jest.fn()
      render(<InputMethodTrackingApp onSessionSave={mockSave} />)

      // Switch to image upload
      fireEvent.click(screen.getByTestId('method-image-upload'))
      expect(screen.getByTestId('current-input-method')).toHaveTextContent('image_upload')

      // Upload image
      fireEvent.click(screen.getByTestId('upload-image'))

      // Calculate
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Verify method tracked
      expect(screen.getByTestId('result-input-method')).toHaveTextContent('image_upload')

      // Save
      fireEvent.click(screen.getByTestId('save-button'))

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          input_method: 'image_upload'
        })
      )
    })
  })

  describe('method switching clears states (FR-005a)', () => {
    it('should clear hex input when switching to color picker', () => {
      render(<InputMethodTrackingApp />)

      // Enter hex code
      fireEvent.change(screen.getByTestId('hex-input'), {
        target: { value: '#FF5733' }
      })
      expect(screen.getByTestId('hex-input')).toHaveValue('#FF5733')

      // Switch to color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))

      // Verify hex input cleared (component re-renders without hex input)
      expect(screen.queryByTestId('hex-input')).not.toBeInTheDocument()
      expect(screen.getByTestId('color-picker-input')).toBeInTheDocument()

      // Switch back to hex code
      fireEvent.click(screen.getByTestId('method-hex-code'))

      // Verify hex input is empty
      expect(screen.getByTestId('hex-input')).toHaveValue('')
    })

    it('should clear color picker when switching to hex code', () => {
      render(<InputMethodTrackingApp />)

      // Switch to color picker and select color
      fireEvent.click(screen.getByTestId('method-color-picker'))
      fireEvent.click(screen.getByTestId('pick-color'))
      expect(screen.getByTestId('selected-color')).toHaveTextContent('#FF0000')

      // Switch to hex code
      fireEvent.click(screen.getByTestId('method-hex-code'))

      // Switch back to color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))

      // Verify color cleared
      expect(screen.getByTestId('selected-color')).toHaveTextContent('none')
    })

    it('should clear image upload when switching to hex code', () => {
      render(<InputMethodTrackingApp />)

      // Switch to image upload and upload
      fireEvent.click(screen.getByTestId('method-image-upload'))
      fireEvent.click(screen.getByTestId('upload-image'))
      expect(screen.getByTestId('uploaded-image')).toHaveTextContent('image-data-url')

      // Switch to hex code
      fireEvent.click(screen.getByTestId('method-hex-code'))

      // Switch back to image upload
      fireEvent.click(screen.getByTestId('method-image-upload'))

      // Verify image cleared
      expect(screen.getByTestId('uploaded-image')).toHaveTextContent('none')
    })
  })

  describe('calculation result clearing (FR-005b)', () => {
    it('should clear calculation when switching from hex code to color picker', () => {
      render(<InputMethodTrackingApp />)

      // Calculate with hex code
      fireEvent.change(screen.getByTestId('hex-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))
      expect(screen.getByTestId('result-display')).toBeInTheDocument()

      // Switch to color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))

      // Verify result cleared
      expect(screen.queryByTestId('result-display')).not.toBeInTheDocument()
    })

    it('should clear calculation when switching from color picker to image upload', () => {
      render(<InputMethodTrackingApp />)

      // Calculate with color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))
      fireEvent.click(screen.getByTestId('pick-color'))
      fireEvent.click(screen.getByTestId('calculate-button'))
      expect(screen.getByTestId('result-display')).toBeInTheDocument()

      // Switch to image upload
      fireEvent.click(screen.getByTestId('method-image-upload'))

      // Verify result cleared
      expect(screen.queryByTestId('result-display')).not.toBeInTheDocument()
    })

    it('should clear calculation when switching between any methods', () => {
      render(<InputMethodTrackingApp />)

      const methods = [
        { button: 'method-hex-code', input: 'hex-input', action: (e: any) => fireEvent.change(e, { target: { value: '#FF5733' } }) },
        { button: 'method-color-picker', input: 'pick-color', action: fireEvent.click },
        { button: 'method-image-upload', input: 'upload-image', action: fireEvent.click }
      ]

      for (const method of methods) {
        // Select method
        fireEvent.click(screen.getByTestId(method.button))

        // Perform input action
        const inputElement = screen.getByTestId(method.input)
        method.action(inputElement)

        // Calculate
        fireEvent.click(screen.getByTestId('calculate-button'))
        expect(screen.getByTestId('result-display')).toBeInTheDocument()

        // Switch to next method
        const nextMethod = methods[(methods.indexOf(method) + 1) % methods.length]
        fireEvent.click(screen.getByTestId(nextMethod.button))

        // Verify result cleared
        expect(screen.queryByTestId('result-display')).not.toBeInTheDocument()
      }
    })
  })

  describe('method change after calculation but before save', () => {
    it('should save with current input_method even if changed after calculation', () => {
      const mockSave = jest.fn()
      render(<InputMethodTrackingApp onSessionSave={mockSave} />)

      // Calculate with hex code
      fireEvent.change(screen.getByTestId('hex-input'), {
        target: { value: '#FF5733' }
      })
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Result cleared, so need to recalculate with new method
      // Switch to color picker (clears result)
      fireEvent.click(screen.getByTestId('method-color-picker'))
      expect(screen.queryByTestId('result-display')).not.toBeInTheDocument()

      // Recalculate with color picker
      fireEvent.click(screen.getByTestId('pick-color'))
      fireEvent.click(screen.getByTestId('calculate-button'))

      // Save
      fireEvent.click(screen.getByTestId('save-button'))

      // Should save with color_picker (current method)
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          input_method: 'color_picker'
        })
      )
    })
  })

  describe('accessibility of input method buttons', () => {
    it('should use aria-pressed to indicate active method', () => {
      render(<InputMethodTrackingApp />)

      // Initial state: hex_code active
      expect(screen.getByTestId('method-hex-code')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('method-color-picker')).toHaveAttribute('aria-pressed', 'false')

      // Switch to color picker
      fireEvent.click(screen.getByTestId('method-color-picker'))

      expect(screen.getByTestId('method-color-picker')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('method-hex-code')).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have proper role and label for button group', () => {
      render(<InputMethodTrackingApp />)

      const group = screen.getByRole('group', { name: 'Input method selection' })
      expect(group).toBeInTheDocument()
    })
  })
})
