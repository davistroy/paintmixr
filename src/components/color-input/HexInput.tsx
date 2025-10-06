'use client'

import React, { useState, useEffect } from 'react'
import type { ColorValue } from '@/lib/types'
import { hexToLab } from '@/lib/color-science'

interface HexInputProps {
  value?: string
  onChange: (color: ColorValue) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
}

const HexInput: React.FC<HexInputProps> = ({
  value = '',
  onChange,
  placeholder = '#FF5733',
  className = '',
  disabled = false,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value)
  const [isValid, setIsValid] = useState(true)
  const [localError, setLocalError] = useState<string>('')

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const validateHex = (hex: string): boolean => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/
    return hexPattern.test(hex)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    // Auto-add # if missing
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue
    }

    // Remove any invalid characters
    newValue = newValue.replace(/[^#0-9A-Fa-f]/g, '')

    // Limit to 7 characters (#RRGGBB)
    if (newValue.length > 7) {
      newValue = newValue.slice(0, 7)
    }

    setInputValue(newValue)

    // Validate and update parent
    if (newValue.length === 7 && validateHex(newValue)) {
      setIsValid(true)
      setLocalError('')

      try {
        const lab = hexToLab(newValue)
        const colorValue: ColorValue = {
          hex: newValue.toUpperCase(),
          lab,
        }
        onChange(colorValue)
      } catch {
        setIsValid(false)
        setLocalError('Invalid hex color format')
      }
    } else if (newValue.length === 7) {
      setIsValid(false)
      setLocalError('Invalid hex color format')
    } else {
      setIsValid(true)
      setLocalError('')
    }
  }

  const handleBlur = () => {
    // If input is incomplete but has some content, try to validate
    if (inputValue && inputValue.length < 7) {
      setIsValid(false)
      setLocalError('Hex color must be 6 characters (e.g., #FF5733)')
    }
  }

  const handleFocus = () => {
    // Clear errors on focus
    setLocalError('')
  }

  const displayError = error || localError

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2 rounded-lg border-2 font-mono text-lg
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isValid && !displayError
              ? 'border-gray-300 focus:border-blue-500'
              : 'border-red-300 focus:border-red-500 focus:ring-red-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
          maxLength={7}
        />

        {/* Color Preview */}
        {inputValue && validateHex(inputValue) && (
          <div
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded border-2 border-gray-200"
            style={{ backgroundColor: inputValue }}
          />
        )}
      </div>

      {/* Error Message */}
      {displayError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {displayError}
        </p>
      )}

      {/* Help Text */}
      {!displayError && (
        <p className="text-sm text-gray-500">
          Enter a hex color code (e.g., #FF5733)
        </p>
      )}
    </div>
  )
}

export default HexInput