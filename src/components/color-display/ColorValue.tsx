'use client'

import React from 'react'
import type { ColorValue } from '@/types/types'

interface ColorValueProps {
  color: ColorValue
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  showHex?: boolean
  showLab?: boolean
  className?: string
}

const ColorValueComponent: React.FC<ColorValueProps> = ({
  color,
  size = 'md',
  showDetails = true,
  showHex = true,
  showLab = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const formatLabValue = (value: number): string => {
    return Math.round(value * 100) / 100 + ''
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Color Swatch */}
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer transition-transform hover:scale-105`}
        style={{ backgroundColor: color.hex }}
        onClick={() => copyToClipboard(color.hex)}
        title={`Click to copy: ${color.hex}`}
      />

      {/* Color Details */}
      {showDetails && (
        <div className={`flex flex-col gap-1 ${textSizeClasses[size]}`}>
          {/* Hex Value */}
          {showHex && (
            <button
              onClick={() => copyToClipboard(color.hex)}
              className="text-left font-mono text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
              title="Click to copy hex value"
            >
              {color.hex.toUpperCase()}
            </button>
          )}

          {/* LAB Values */}
          {showLab && (
            <div className="font-mono text-gray-600 space-y-0.5">
              <div className="flex gap-2">
                <span className="text-gray-500">L:</span>
                <span>{formatLabValue(color.lab.l)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500">a:</span>
                <span>{formatLabValue(color.lab.a)}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500">b:</span>
                <span>{formatLabValue(color.lab.b)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ColorValueComponent