'use client'

import React from 'react'
import type { ColorValue } from '@/lib/types'
import HexInput from '@/components/color-input/HexInput'
import ColorPicker from '@/components/color-input/ColorPicker'
import ImageUpload from '@/components/color-input/ImageUpload'
import ColorValueComponent from '@/components/color-display/ColorValue'

type InputMethod = 'color_picker' | 'hex_input' | 'image_upload'

interface ColorMatchingModeProps {
  inputMethod: InputMethod
  targetColor: ColorValue | null
  isCalculating: boolean
  onInputMethodChange: (method: InputMethod) => void
  onColorInput: (color: ColorValue) => void
}

/**
 * ColorMatchingMode Component
 *
 * Handles color input selection via multiple methods:
 * - Color picker (visual selection)
 * - Hex code input (manual entry)
 * - Image upload (extraction from image)
 *
 * Extracted from page.tsx (T016) to meet 300-line component standard.
 */
const ColorMatchingMode: React.FC<ColorMatchingModeProps> = ({
  inputMethod,
  targetColor,
  isCalculating,
  onInputMethodChange,
  onColorInput
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Color Input Method</h2>

      {/* Input Method Selection Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => onInputMethodChange('color_picker')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            inputMethod === 'color_picker'
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Color Picker
        </button>
        <button
          onClick={() => onInputMethodChange('hex_input')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            inputMethod === 'hex_input'
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Hex Code
        </button>
        <button
          onClick={() => onInputMethodChange('image_upload')}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            inputMethod === 'image_upload'
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Image Upload
        </button>
      </div>

      {/* Color Input Components */}
      <div className="space-y-4">
        {inputMethod === 'color_picker' && (
          <ColorPicker
            onChange={onColorInput}
            disabled={isCalculating}
          />
        )}

        {inputMethod === 'hex_input' && (
          <HexInput
            onChange={onColorInput}
            disabled={isCalculating}
          />
        )}

        {inputMethod === 'image_upload' && (
          <ImageUpload
            onColorExtracted={onColorInput}
            disabled={isCalculating}
          />
        )}
      </div>

      {/* Selected Color Display */}
      {targetColor && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Target Color:</h3>
          <ColorValueComponent
            color={targetColor}
            size="lg"
            showDetails={true}
            className="justify-start"
          />
        </div>
      )}
    </div>
  )
}

export default ColorMatchingMode
