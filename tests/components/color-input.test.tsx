import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPicker } from '@/components/ui/color-picker'
import { ImageUpload } from '@/components/ui/image-upload'
import { ColorWheel } from '@/components/ui/color-wheel'
import { ColorSwatch } from '@/components/ui/color-swatch'
import type { ColorValue } from '@/lib/types'

// Mock dependencies
jest.mock('@/hooks/use-image-processing', () => ({
  useImageProcessing: () => ({
    isProcessing: false,
    uploadedImage: null,
    extractedColor: null,
    error: null,
    extractionMethod: 'dominant',
    clickCoordinates: null,
    uploadImage: jest.fn(),
    extractColor: jest.fn(),
    setExtractionMethod: jest.fn(),
    setClickCoordinates: jest.fn(),
    reset: jest.fn(),
  }),
}))

describe('Color Input Components', () => {
  const mockColorValue: ColorValue = {
    hex: '#ff6b35',
    rgb: { r: 255, g: 107, b: 53 },
    lab: { l: 66.5, a: 40.2, b: 45.3 },
  }

  describe('ColorPicker Component', () => {
    const defaultProps = {
      value: mockColorValue,
      onChange: jest.fn(),
      label: 'Pick a color',
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render with correct initial value', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorInput = screen.getByDisplayValue('#ff6b35')
      expect(colorInput).toBeInTheDocument()

      const label = screen.getByText('Pick a color')
      expect(label).toBeInTheDocument()
    })

    it('should call onChange when color value changes', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const colorInput = screen.getByDisplayValue('#ff6b35')
      await user.clear(colorInput)
      await user.type(colorInput, '#00ff00')

      expect(onChange).toHaveBeenCalled()
    })

    it('should validate hex color format', async () => {
      const user = userEvent.setup()
      render(<ColorPicker {...defaultProps} />)

      const colorInput = screen.getByDisplayValue('#ff6b35')
      await user.clear(colorInput)
      await user.type(colorInput, 'invalid-color')

      // Should show validation error
      expect(screen.getByText(/invalid hex color/i)).toBeInTheDocument()
    })

    it('should display RGB values correctly', () => {
      render(<ColorPicker {...defaultProps} />)

      expect(screen.getByText('255')).toBeInTheDocument() // R value
      expect(screen.getByText('107')).toBeInTheDocument() // G value
      expect(screen.getByText('53')).toBeInTheDocument()  // B value
    })

    it('should be disabled when specified', () => {
      render(<ColorPicker {...defaultProps} disabled />)

      const colorInput = screen.getByDisplayValue('#ff6b35')
      expect(colorInput).toBeDisabled()
    })

    it('should show error state', () => {
      render(<ColorPicker {...defaultProps} error="Invalid color selection" />)

      expect(screen.getByText('Invalid color selection')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ColorPicker {...defaultProps} />)

      const colorInput = screen.getByDisplayValue('#ff6b35')
      await user.click(colorInput)
      await user.keyboard('{Tab}')

      // Should focus next element (RGB inputs or color wheel)
      expect(document.activeElement).not.toBe(colorInput)
    })
  })

  describe('ImageUpload Component', () => {
    const defaultProps = {
      onColorExtracted: jest.fn(),
      extractionMethod: 'dominant' as const,
      onExtractionMethodChange: jest.fn(),
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render upload area', () => {
      render(<ImageUpload {...defaultProps} />)

      expect(screen.getByText(/drag.*drop.*image/i)).toBeInTheDocument()
      expect(screen.getByText(/click to select/i)).toBeInTheDocument()
    })

    it('should show extraction method options', () => {
      render(<ImageUpload {...defaultProps} />)

      expect(screen.getByText('Dominant Color')).toBeInTheDocument()
      expect(screen.getByText('Average Color')).toBeInTheDocument()
      expect(screen.getByText('Point Color')).toBeInTheDocument()
    })

    it('should handle file selection', async () => {
      const user = userEvent.setup()
      render(<ImageUpload {...defaultProps} />)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload image/i)

      await user.upload(input, file)

      expect(input.files).toHaveLength(1)
      expect(input.files?.[0]).toBe(file)
    })

    it('should validate file type', async () => {
      const user = userEvent.setup()
      render(<ImageUpload {...defaultProps} />)

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText(/upload image/i)

      await user.upload(input, file)

      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    })

    it('should validate file size', async () => {
      const user = userEvent.setup()
      render(<ImageUpload {...defaultProps} />)

      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      })
      const input = screen.getByLabelText(/upload image/i)

      await user.upload(input, largeFile)

      expect(screen.getByText(/file too large/i)).toBeInTheDocument()
    })

    it('should show loading state during processing', () => {
      // Mock the hook to return loading state
      const mockUseImageProcessing = require('@/hooks/use-image-processing').useImageProcessing
      mockUseImageProcessing.mockReturnValue({
        isProcessing: true,
        uploadedImage: null,
        extractedColor: null,
        error: null,
        extractionMethod: 'dominant',
        clickCoordinates: null,
        uploadImage: jest.fn(),
        extractColor: jest.fn(),
        setExtractionMethod: jest.fn(),
        setClickCoordinates: jest.fn(),
        reset: jest.fn(),
      })

      render(<ImageUpload {...defaultProps} />)

      expect(screen.getByText(/processing/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should display uploaded image', () => {
      const mockUseImageProcessing = require('@/hooks/use-image-processing').useImageProcessing
      mockUseImageProcessing.mockReturnValue({
        isProcessing: false,
        uploadedImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ',
        extractedColor: null,
        error: null,
        extractionMethod: 'dominant',
        clickCoordinates: null,
        uploadImage: jest.fn(),
        extractColor: jest.fn(),
        setExtractionMethod: jest.fn(),
        setClickCoordinates: jest.fn(),
        reset: jest.fn(),
      })

      render(<ImageUpload {...defaultProps} />)

      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', expect.stringContaining('data:image/jpeg'))
    })

    it('should handle extraction method change', async () => {
      const user = userEvent.setup()
      const onExtractionMethodChange = jest.fn()

      render(<ImageUpload {...defaultProps} onExtractionMethodChange={onExtractionMethodChange} />)

      const averageOption = screen.getByLabelText('Average Color')
      await user.click(averageOption)

      expect(onExtractionMethodChange).toHaveBeenCalledWith('average')
    })
  })

  describe('ColorWheel Component', () => {
    const defaultProps = {
      value: mockColorValue,
      onChange: jest.fn(),
      size: 300,
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render color wheel canvas', () => {
      render(<ColorWheel {...defaultProps} />)

      const canvas = screen.getByRole('img', { name: /color wheel/i })
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveAttribute('width', '300')
      expect(canvas).toHaveAttribute('height', '300')
    })

    it('should handle mouse clicks', async () => {
      const onChange = jest.fn()
      render(<ColorWheel {...defaultProps} onChange={onChange} />)

      const canvas = screen.getByRole('img', { name: /color wheel/i })
      fireEvent.click(canvas, { clientX: 150, clientY: 100 })

      expect(onChange).toHaveBeenCalled()
    })

    it('should handle touch events on mobile', async () => {
      const onChange = jest.fn()
      render(<ColorWheel {...defaultProps} onChange={onChange} />)

      const canvas = screen.getByRole('img', { name: /color wheel/i })
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 150, clientY: 100 }]
      })

      expect(onChange).toHaveBeenCalled()
    })

    it('should show current color position', () => {
      render(<ColorWheel {...defaultProps} />)

      // Should render a marker/indicator at the current color position
      const marker = screen.getByRole('button', { name: /current color/i })
      expect(marker).toBeInTheDocument()
    })

    it('should be accessible via keyboard', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<ColorWheel {...defaultProps} onChange={onChange} />)

      const canvas = screen.getByRole('img', { name: /color wheel/i })
      await user.click(canvas)
      await user.keyboard('{ArrowRight}')

      expect(onChange).toHaveBeenCalled()
    })

    it('should respect disabled state', () => {
      render(<ColorWheel {...defaultProps} disabled />)

      const canvas = screen.getByRole('img', { name: /color wheel/i })
      expect(canvas).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('ColorSwatch Component', () => {
    const defaultProps = {
      color: mockColorValue,
      size: 'medium' as const,
      label: 'Selected Color',
    }

    it('should render color swatch with correct background', () => {
      render(<ColorSwatch {...defaultProps} />)

      const swatch = screen.getByLabelText('Selected Color')
      expect(swatch).toBeInTheDocument()
      expect(swatch).toHaveStyle({ backgroundColor: '#ff6b35' })
    })

    it('should display color information on hover', async () => {
      const user = userEvent.setup()
      render(<ColorSwatch {...defaultProps} showTooltip />)

      const swatch = screen.getByLabelText('Selected Color')
      await user.hover(swatch)

      await waitFor(() => {
        expect(screen.getByText('#ff6b35')).toBeInTheDocument()
        expect(screen.getByText('RGB(255, 107, 53)')).toBeInTheDocument()
      })
    })

    it('should handle click events', async () => {
      const user = userEvent.setup()
      const onClick = jest.fn()

      render(<ColorSwatch {...defaultProps} onClick={onClick} />)

      const swatch = screen.getByLabelText('Selected Color')
      await user.click(swatch)

      expect(onClick).toHaveBeenCalledWith(mockColorValue)
    })

    it('should render different sizes correctly', () => {
      const { rerender } = render(<ColorSwatch {...defaultProps} size="small" />)

      let swatch = screen.getByLabelText('Selected Color')
      expect(swatch).toHaveClass('w-8', 'h-8')

      rerender(<ColorSwatch {...defaultProps} size="large" />)

      swatch = screen.getByLabelText('Selected Color')
      expect(swatch).toHaveClass('w-16', 'h-16')
    })

    it('should show selected state', () => {
      render(<ColorSwatch {...defaultProps} selected />)

      const swatch = screen.getByLabelText('Selected Color')
      expect(swatch).toHaveClass('ring-2', 'ring-blue-500')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const onClick = jest.fn()

      render(<ColorSwatch {...defaultProps} onClick={onClick} />)

      const swatch = screen.getByLabelText('Selected Color')
      await user.click(swatch)
      await user.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('Integration Tests', () => {
    it('should work together in a color selection workflow', async () => {
      const user = userEvent.setup()
      const onColorChange = jest.fn()

      const TestComponent = () => {
        return (
          <div>
            <ColorPicker
              value={mockColorValue}
              onChange={onColorChange}
              label="Choose color"
            />
            <ColorWheel
              value={mockColorValue}
              onChange={onColorChange}
              size={200}
            />
            <ColorSwatch
              color={mockColorValue}
              label="Current selection"
            />
          </div>
        )
      }

      render(<TestComponent />)

      // Test that all components are rendered
      expect(screen.getByLabelText('Choose color')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /color wheel/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Current selection')).toBeInTheDocument()

      // Test interaction
      const colorInput = screen.getByDisplayValue('#ff6b35')
      await user.clear(colorInput)
      await user.type(colorInput, '#00ff00')

      expect(onColorChange).toHaveBeenCalled()
    })

    it('should maintain accessibility standards', () => {
      render(
        <div>
          <ColorPicker
            value={mockColorValue}
            onChange={jest.fn()}
            label="Color picker"
          />
          <ImageUpload
            onColorExtracted={jest.fn()}
            extractionMethod="dominant"
            onExtractionMethodChange={jest.fn()}
          />
        </div>
      )

      // Check for proper labeling
      expect(screen.getByLabelText('Color picker')).toBeInTheDocument()
      expect(screen.getByLabelText(/upload image/i)).toBeInTheDocument()

      // Check for keyboard navigation
      const inputs = screen.getAllByRole('textbox')
      inputs.forEach(input => {
        expect(input).toHaveAttribute('tabIndex')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockUseImageProcessing = require('@/hooks/use-image-processing').useImageProcessing
      mockUseImageProcessing.mockReturnValue({
        isProcessing: false,
        uploadedImage: null,
        extractedColor: null,
        error: 'Failed to process image',
        extractionMethod: 'dominant',
        clickCoordinates: null,
        uploadImage: jest.fn(),
        extractColor: jest.fn(),
        setExtractionMethod: jest.fn(),
        setClickCoordinates: jest.fn(),
        reset: jest.fn(),
      })

      render(<ImageUpload {...defaultProps} />)

      expect(screen.getByText('Failed to process image')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should validate color values bounds', async () => {
      const user = userEvent.setup()
      render(<ColorPicker {...defaultProps} />)

      // Try to enter invalid RGB values
      const rgbInputs = screen.getAllByRole('spinbutton')
      await user.clear(rgbInputs[0])
      await user.type(rgbInputs[0], '300') // > 255

      expect(screen.getByText(/value must be between 0 and 255/i)).toBeInTheDocument()
    })
  })
})