'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { ColorValue } from '@/types/types'
import { hexToLab } from '@/lib/color-science'

interface ColorPickerProps {
  value?: ColorValue
  onChange: (color: ColorValue) => void
  className?: string
  disabled?: boolean
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentColor, setCurrentColor] = useState(value?.hex || '#FF5733')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value?.hex) {
      setCurrentColor(value.hex)
    }
  }, [value])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  const handleColorChange = (hex: string) => {
    setCurrentColor(hex)

    try {
      const lab = hexToLab(hex)
      const colorValue: ColorValue = { hex: hex.toUpperCase(), lab }
      onChange(colorValue)
    } catch (err) {
      console.error('Error converting color:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value
    handleColorChange(hex)
  }

  // Predefined color palette
  const presetColors = [
    '#FF5733', '#E74C3C', '#9B59B6', '#3498DB',
    '#1ABC9C', '#2ECC71', '#F1C40F', '#E67E22',
    '#95A5A6', '#34495E', '#000000', '#FFFFFF',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#F8BBD0', '#FFB74D'
  ]

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {/* Color Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all
          ${disabled
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}
      >
        {/* Color Swatch */}
        <div
          className="w-8 h-8 rounded border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: currentColor }}
        />

        {/* Hex Value */}
        <span className="font-mono text-sm text-gray-700">
          {currentColor.toUpperCase()}
        </span>

        {/* Arrow Icon */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Color Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50 min-w-[280px]">
          {/* HTML5 Color Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Color
            </label>
            <input
              type="color"
              value={currentColor}
              onChange={handleInputChange}
              className="w-full h-12 rounded border-2 border-gray-300 cursor-pointer"
            />
          </div>

          {/* Preset Colors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preset Colors
            </label>
            <div className="grid grid-cols-6 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`
                    w-8 h-8 rounded border-2 transition-all hover:scale-110
                    ${currentColor.toLowerCase() === color.toLowerCase()
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Recent Colors (placeholder for future enhancement) */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>Tip: Click the color swatch to copy the hex value</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ColorPicker