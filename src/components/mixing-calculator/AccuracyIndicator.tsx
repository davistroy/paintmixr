'use client'

import React from 'react'
import type { ColorValue } from '@/lib/types'
import ColorValueComponent from '@/components/color-display/ColorValue'

interface AccuracyIndicatorProps {
  targetColor: ColorValue
  achievedColor: ColorValue
  deltaE: number
  className?: string
  showColors?: boolean
  compactMode?: boolean
}

const AccuracyIndicator: React.FC<AccuracyIndicatorProps> = ({
  targetColor,
  achievedColor,
  deltaE,
  className = '',
  showColors = true,
  compactMode = false,
}) => {
  // Delta E rating based on industry standards
  const getAccuracyRating = (deltaE: number): {
    rating: string
    description: string
    color: string
    bgColor: string
  } => {
    if (deltaE <= 1.0) {
      return {
        rating: 'Excellent',
        description: 'Imperceptible difference',
        color: 'text-green-800',
        bgColor: 'bg-green-100 border-green-300',
      }
    } else if (deltaE <= 2.0) {
      return {
        rating: 'Very Good',
        description: 'Barely perceptible difference',
        color: 'text-green-700',
        bgColor: 'bg-green-50 border-green-200',
      }
    } else if (deltaE <= 3.5) {
      return {
        rating: 'Good',
        description: 'Perceptible but acceptable',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50 border-yellow-200',
      }
    } else if (deltaE <= 5.0) {
      return {
        rating: 'Fair',
        description: 'Noticeable difference',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50 border-orange-200',
      }
    } else {
      return {
        rating: 'Poor',
        description: 'Significant difference',
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-200',
      }
    }
  }

  const accuracy = getAccuracyRating(deltaE)

  // Progress bar calculation (inverted - lower Delta E = higher accuracy)
  const maxDeltaE = 10 // Scale for progress bar
  const accuracyPercentage = Math.max(0, Math.min(100, ((maxDeltaE - deltaE) / maxDeltaE) * 100))

  if (compactMode) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Delta E Value */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">ΔE:</span>
          <span className={`font-bold text-sm ${accuracy.color}`}>
            {deltaE.toFixed(2)}
          </span>
        </div>

        {/* Rating Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${accuracy.bgColor} ${accuracy.color}`}>
          {accuracy.rating}
        </div>

        {/* Mini Progress Bar */}
        <div className="flex-1 max-w-20">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                accuracyPercentage >= 80 ? 'bg-green-500' :
                accuracyPercentage >= 60 ? 'bg-yellow-500' :
                accuracyPercentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${accuracyPercentage}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Color Accuracy</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${accuracy.bgColor} ${accuracy.color}`}>
          {accuracy.rating}
        </div>
      </div>

      {/* Delta E Display */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-gray-800 mb-1">
          ΔE {deltaE.toFixed(2)}
        </div>
        <p className={`text-sm ${accuracy.color} font-medium`}>
          {accuracy.description}
        </p>
      </div>

      {/* Accuracy Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              accuracyPercentage >= 80 ? 'bg-green-500' :
              accuracyPercentage >= 60 ? 'bg-yellow-500' :
              accuracyPercentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${accuracyPercentage}%` }}
          />
        </div>
        <div className="text-center text-xs text-gray-500 mt-1">
          {accuracyPercentage.toFixed(0)}% match
        </div>
      </div>

      {/* Color Comparison */}
      {showColors && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">Target Color</p>
              <ColorValueComponent
                color={targetColor}
                size="lg"
                showDetails={false}
                className="justify-center"
              />
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {targetColor.hex}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">Achieved Color</p>
              <ColorValueComponent
                color={achievedColor}
                size="lg"
                showDetails={false}
                className="justify-center"
              />
              <p className="text-xs text-gray-500 mt-1 font-mono">
                {achievedColor.hex}
              </p>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex h-16">
              <div
                className="flex-1 flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: targetColor.hex }}
              >
                Target
              </div>
              <div
                className="flex-1 flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: achievedColor.hex }}
              >
                Result
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delta E Scale Reference */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Delta E Scale Reference:</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-green-700">0.0 - 1.0</span>
            <span className="text-gray-600">Imperceptible difference</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">1.0 - 2.0</span>
            <span className="text-gray-600">Barely perceptible</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-600">2.0 - 3.5</span>
            <span className="text-gray-600">Perceptible but acceptable</span>
          </div>
          <div className="flex justify-between">
            <span className="text-orange-600">3.5 - 5.0</span>
            <span className="text-gray-600">Noticeable difference</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-600">&gt; 5.0</span>
            <span className="text-gray-600">Significant difference</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccuracyIndicator