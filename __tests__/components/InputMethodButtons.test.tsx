/**
 * Input Method Buttons Component Tests
 * Tests for input method switching and state clearing behavior
 * Requirements: FR-005, FR-005a, FR-005b, FR-006
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

type InputMethod = 'color_picker' | 'hex_code' | 'image_upload'

interface InputMethodButtonsProps {
  currentMethod: InputMethod
  onMethodChange: (method: InputMethod) => void
  disabled?: boolean
}

// Mock component that mimics input method buttons behavior
const InputMethodButtons: React.FC<InputMethodButtonsProps> = ({
  currentMethod,
  onMethodChange,
  disabled = false
}) => {
  return (
    <div className="flex gap-2" role="group" aria-label="Input method selection">
      <button
        onClick={() => onMethodChange('color_picker')}
        disabled={disabled}
        data-testid="color-picker-button"
        aria-pressed={currentMethod === 'color_picker'}
        className={currentMethod === 'color_picker' ? 'active' : ''}
      >
        Color Picker
      </button>
      <button
        onClick={() => onMethodChange('hex_code')}
        disabled={disabled}
        data-testid="hex-code-button"
        aria-pressed={currentMethod === 'hex_code'}
        className={currentMethod === 'hex_code' ? 'active' : ''}
      >
        Hex Code
      </button>
      <button
        onClick={() => onMethodChange('image_upload')}
        disabled={disabled}
        data-testid="image-upload-button"
        aria-pressed={currentMethod === 'image_upload'}
        className={currentMethod === 'image_upload' ? 'active' : ''}
      >
        Image Upload
      </button>
    </div>
  )
}

// Parent component to test state clearing behavior
interface TestHarnessState {
  inputMethod: InputMethod
  hexInput: string
  selectedColor: string | null
  uploadedImage: string | null
  calculationResult: any
}

const TestHarness: React.FC = () => {
  const [state, setState] = React.useState<TestHarnessState>({
    inputMethod: 'color_picker',
    hexInput: '',
    selectedColor: null,
    uploadedImage: null,
    calculationResult: null
  })

  const handleMethodChange = (method: InputMethod) => {
    // FR-005a: Clear other input states when switching methods
    setState(prev => ({
      ...prev,
      inputMethod: method,
      // Clear Color Picker state when switching away
      selectedColor: method === 'color_picker' ? prev.selectedColor : null,
      // Clear Hex Code state when switching away
      hexInput: method === 'hex_code' ? prev.hexInput : '',
      // Clear Image Upload state when switching away
      uploadedImage: method === 'image_upload' ? prev.uploadedImage : null,
      // FR-005b: Always clear calculation results on method switch
      calculationResult: null
    }))
  }

  return (
    <div>
      <InputMethodButtons
        currentMethod={state.inputMethod}
        onMethodChange={handleMethodChange}
      />

      {/* Expose state for testing */}
      <div data-testid="current-method">{state.inputMethod}</div>
      <div data-testid="hex-input">{state.hexInput}</div>
      <div data-testid="selected-color">{state.selectedColor || 'null'}</div>
      <div data-testid="uploaded-image">{state.uploadedImage || 'null'}</div>
      <div data-testid="calculation-result">{state.calculationResult || 'null'}</div>

      {/* Simulate setting state values */}
      <button
        onClick={() => setState(prev => ({ ...prev, hexInput: '#FF5733' }))}
        data-testid="set-hex-input"
      >
        Set Hex Input
      </button>
      <button
        onClick={() => setState(prev => ({ ...prev, selectedColor: '#00FF00' }))}
        data-testid="set-color-picker"
      >
        Set Color Picker
      </button>
      <button
        onClick={() => setState(prev => ({ ...prev, uploadedImage: 'image-data-url' }))}
        data-testid="set-image-upload"
      >
        Set Image Upload
      </button>
      <button
        onClick={() => setState(prev => ({ ...prev, calculationResult: { formula: {} } }))}
        data-testid="set-calculation-result"
      >
        Set Calculation Result
      </button>
    </div>
  )
}

describe('InputMethodButtons Component', () => {
  describe('button rendering and selection (FR-005)', () => {
    it('should render all three input method buttons', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="color_picker"
          onMethodChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('color-picker-button')).toBeInTheDocument()
      expect(screen.getByTestId('hex-code-button')).toBeInTheDocument()
      expect(screen.getByTestId('image-upload-button')).toBeInTheDocument()
    })

    it('should mark current method as active', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="hex_code"
          onMethodChange={mockOnChange}
        />
      )

      const hexButton = screen.getByTestId('hex-code-button')
      expect(hexButton).toHaveAttribute('aria-pressed', 'true')
      expect(hexButton).toHaveClass('active')
    })

    it('should call onMethodChange when button clicked', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="color_picker"
          onMethodChange={mockOnChange}
        />
      )

      fireEvent.click(screen.getByTestId('hex-code-button'))
      expect(mockOnChange).toHaveBeenCalledWith('hex_code')
    })
  })

  describe('state clearing on method switch (FR-005a)', () => {
    it('should clear hex input when switching from Hex Code to Color Picker', () => {
      render(<TestHarness />)

      // Start with Hex Code method and set hex input
      fireEvent.click(screen.getByTestId('hex-code-button'))
      fireEvent.click(screen.getByTestId('set-hex-input'))

      expect(screen.getByTestId('hex-input')).toHaveTextContent('#FF5733')

      // Switch to Color Picker
      fireEvent.click(screen.getByTestId('color-picker-button'))

      // Hex input should be cleared
      expect(screen.getByTestId('hex-input')).toHaveTextContent('')
      expect(screen.getByTestId('current-method')).toHaveTextContent('color_picker')
    })

    it('should clear color picker state when switching from Color Picker to Hex Code', () => {
      render(<TestHarness />)

      // Start with Color Picker and set color
      fireEvent.click(screen.getByTestId('set-color-picker'))
      expect(screen.getByTestId('selected-color')).toHaveTextContent('#00FF00')

      // Switch to Hex Code
      fireEvent.click(screen.getByTestId('hex-code-button'))

      // Color picker state should be cleared
      expect(screen.getByTestId('selected-color')).toHaveTextContent('null')
      expect(screen.getByTestId('current-method')).toHaveTextContent('hex_code')
    })

    it('should clear image upload when switching from Image Upload to Color Picker', () => {
      render(<TestHarness />)

      // Switch to Image Upload and set image
      fireEvent.click(screen.getByTestId('image-upload-button'))
      fireEvent.click(screen.getByTestId('set-image-upload'))
      expect(screen.getByTestId('uploaded-image')).toHaveTextContent('image-data-url')

      // Switch to Color Picker
      fireEvent.click(screen.getByTestId('color-picker-button'))

      // Image upload state should be cleared
      expect(screen.getByTestId('uploaded-image')).toHaveTextContent('null')
      expect(screen.getByTestId('current-method')).toHaveTextContent('color_picker')
    })

    it('should preserve current method state when switching to same method', () => {
      render(<TestHarness />)

      // Set hex input
      fireEvent.click(screen.getByTestId('hex-code-button'))
      fireEvent.click(screen.getByTestId('set-hex-input'))
      expect(screen.getByTestId('hex-input')).toHaveTextContent('#FF5733')

      // Click hex code button again
      fireEvent.click(screen.getByTestId('hex-code-button'))

      // Hex input should be preserved
      expect(screen.getByTestId('hex-input')).toHaveTextContent('#FF5733')
    })
  })

  describe('calculation result clearing (FR-005b)', () => {
    it('should clear calculation results when switching from Color Picker to Hex Code', () => {
      render(<TestHarness />)

      // Set calculation result
      fireEvent.click(screen.getByTestId('set-calculation-result'))
      expect(screen.getByTestId('calculation-result')).not.toHaveTextContent('null')

      // Switch to Hex Code
      fireEvent.click(screen.getByTestId('hex-code-button'))

      // Calculation result should be cleared
      expect(screen.getByTestId('calculation-result')).toHaveTextContent('null')
    })

    it('should clear calculation results when switching from Hex Code to Image Upload', () => {
      render(<TestHarness />)

      // Start with Hex Code and set calculation
      fireEvent.click(screen.getByTestId('hex-code-button'))
      fireEvent.click(screen.getByTestId('set-calculation-result'))
      expect(screen.getByTestId('calculation-result')).not.toHaveTextContent('null')

      // Switch to Image Upload
      fireEvent.click(screen.getByTestId('image-upload-button'))

      // Calculation result should be cleared
      expect(screen.getByTestId('calculation-result')).toHaveTextContent('null')
    })

    it('should clear calculation results on any method switch', () => {
      render(<TestHarness />)

      // Set calculation result
      fireEvent.click(screen.getByTestId('set-calculation-result'))

      const methods = ['hex-code-button', 'color-picker-button', 'image-upload-button']

      for (const methodButton of methods) {
        // Set calculation again
        fireEvent.click(screen.getByTestId('set-calculation-result'))
        expect(screen.getByTestId('calculation-result')).not.toHaveTextContent('null')

        // Switch method
        fireEvent.click(screen.getByTestId(methodButton))

        // Verify cleared
        expect(screen.getByTestId('calculation-result')).toHaveTextContent('null')
      }
    })
  })

  describe('inputMethod tracking (FR-006)', () => {
    it('should update inputMethod to color_picker when Color Picker selected', () => {
      render(<TestHarness />)

      fireEvent.click(screen.getByTestId('color-picker-button'))
      expect(screen.getByTestId('current-method')).toHaveTextContent('color_picker')
    })

    it('should update inputMethod to hex_code when Hex Code selected', () => {
      render(<TestHarness />)

      fireEvent.click(screen.getByTestId('hex-code-button'))
      expect(screen.getByTestId('current-method')).toHaveTextContent('hex_code')
    })

    it('should update inputMethod to image_upload when Image Upload selected', () => {
      render(<TestHarness />)

      fireEvent.click(screen.getByTestId('image-upload-button'))
      expect(screen.getByTestId('current-method')).toHaveTextContent('image_upload')
    })

    it('should maintain inputMethod state across renders', () => {
      const { rerender } = render(<TestHarness />)

      fireEvent.click(screen.getByTestId('hex-code-button'))
      expect(screen.getByTestId('current-method')).toHaveTextContent('hex_code')

      rerender(<TestHarness />)
      expect(screen.getByTestId('current-method')).toHaveTextContent('hex_code')
    })
  })

  describe('disabled state', () => {
    it('should disable all buttons when disabled prop is true', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="color_picker"
          onMethodChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('color-picker-button')).toBeDisabled()
      expect(screen.getByTestId('hex-code-button')).toBeDisabled()
      expect(screen.getByTestId('image-upload-button')).toBeDisabled()
    })

    it('should not call onMethodChange when disabled button clicked', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="color_picker"
          onMethodChange={mockOnChange}
          disabled={true}
        />
      )

      fireEvent.click(screen.getByTestId('hex-code-button'))
      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper role and aria-label for button group', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="color_picker"
          onMethodChange={mockOnChange}
        />
      )

      const group = screen.getByRole('group', { name: 'Input method selection' })
      expect(group).toBeInTheDocument()
    })

    it('should use aria-pressed to indicate active button', () => {
      const mockOnChange = jest.fn()
      render(
        <InputMethodButtons
          currentMethod="hex_code"
          onMethodChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('color-picker-button')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('hex-code-button')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('image-upload-button')).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
