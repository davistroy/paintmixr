'use client'

import React from 'react'
import type { MixingFormula } from '@/types/types'
import ColorValueComponent from '@/components/color-display/ColorValue'

interface RatioDisplayProps {
  formula: MixingFormula
  showVolumes?: boolean
  showPercentages?: boolean
  className?: string
  compactMode?: boolean
}

const RatioDisplay: React.FC<RatioDisplayProps> = ({
  formula,
  showVolumes = true,
  showPercentages = true,
  className = '',
  compactMode = false,
}) => {
  const formatVolume = (volume: number): string => {
    return volume < 1 ? volume.toFixed(2) : volume.toFixed(1)
  }

  const formatPercentage = (percentage: number): string => {
    return percentage.toFixed(1) + '%'
  }

  const getPaintColor = (paintId: string): string => {
    // Map paint IDs to approximate hex colors for visualization
    const paintColors: Record<string, string> = {
      'titanium-white': '#F8F8FF',
      'cadmium-red-medium': '#E34234',
      'cadmium-yellow-medium': '#FDD017',
      'ultramarine-blue': '#4166F5',
      'burnt-umber': '#8A3324',
      'yellow-ochre': '#CC7722',
      'raw-sienna': '#D2691E',
      'alizarin-crimson': '#E32636',
    }
    return paintColors[paintId] || '#808080'
  }

  const sortedRatios = [...formula.paint_ratios].sort((a, b) => b.percentage - a.percentage)

  if (compactMode) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Total Volume:</span>
          <span className="font-mono">{formatVolume(formula.total_volume_ml)} ml</span>
        </div>

        <div className="space-y-1">
          {sortedRatios.map((ratio, index) => (
            <div key={`${ratio.paint_id}-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: getPaintColor(ratio.paint_id) }}
              />
              <span className="text-sm text-gray-600 flex-1 truncate">
                {ratio.paint_name || ratio.paint_id}
              </span>
              <span className="text-xs font-mono text-gray-500">
                {showPercentages && formatPercentage(ratio.percentage)}
                {showVolumes && showPercentages && ' • '}
                {showVolumes && `${formatVolume(ratio.volume_ml)}ml`}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Paint Formula</h3>
        <div className="text-sm text-gray-600">
          Total: <span className="font-mono font-medium">{formatVolume(formula.total_volume_ml)} ml</span>
        </div>
      </div>

      {/* Paint Ratios */}
      <div className="space-y-3">
        {sortedRatios.map((ratio, index) => (
          <div key={`${ratio.paint_id}-${index}`} className="border-l-4 pl-4 py-2" style={{ borderColor: getPaintColor(ratio.paint_id) }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border-2 border-gray-200 shadow-sm"
                  style={{ backgroundColor: getPaintColor(ratio.paint_id) }}
                />
                <div>
                  <p className="font-medium text-gray-800">
                    {ratio.paint_name || ratio.paint_id}
                  </p>
                  {ratio.paint_name && ratio.paint_id !== ratio.paint_name && (
                    <p className="text-xs text-gray-500 font-mono">{ratio.paint_id}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                {showPercentages && (
                  <div className="text-lg font-bold text-gray-800">
                    {formatPercentage(ratio.percentage)}
                  </div>
                )}
                {showVolumes && (
                  <div className="text-sm text-gray-600 font-mono">
                    {formatVolume(ratio.volume_ml)} ml
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {showPercentages && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${ratio.percentage}%`,
                      backgroundColor: getPaintColor(ratio.paint_id),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mixing Order */}
      {formula.mixing_order && formula.mixing_order.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Mixing Order:</h4>
          <div className="flex flex-wrap gap-2">
            {formula.mixing_order.map((paintId, index) => {
              const ratio = formula.paint_ratios.find(r => r.paint_id === paintId)
              return (
                <div
                  key={`order-${paintId}-${index}`}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <span className="text-xs bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: getPaintColor(paintId) }}
                  />
                  <span className="text-gray-700">
                    {ratio?.paint_name || paintId}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Add paints in this order for best results
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3">
          <h5 className="text-sm font-medium text-blue-800 mb-1">Mixing Tips:</h5>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Start with the largest volume paint first</li>
            <li>• Add smaller amounts gradually while mixing</li>
            <li>• Mix thoroughly between each addition</li>
            <li>• Test color on a small sample before applying</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RatioDisplay