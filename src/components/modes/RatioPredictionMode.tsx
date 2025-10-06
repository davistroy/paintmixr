'use client'

import React from 'react'
import { getUserPaintOptions } from '@/lib/user-paints'

interface PaintRatioInput {
  paint_id: string
  volume_ml: number
}

interface RatioPredictionModeProps {
  paintRatios: PaintRatioInput[]
  isCalculating: boolean
  onUpdatePaintRatio: (index: number, field: 'paint_id' | 'volume_ml', value: string | number) => void
  onAddPaintRatio: () => void
  onRemovePaintRatio: (index: number) => void
  onCalculateRatioPrediction: () => void
}

/**
 * RatioPredictionMode Component
 *
 * Handles manual paint ratio input and color prediction:
 * - Add/remove paint selections (2-5 paints)
 * - Configure volume for each paint
 * - Predict resulting color from ratios
 *
 * Extracted from page.tsx (T017) to meet 300-line component standard.
 */
const RatioPredictionMode: React.FC<RatioPredictionModeProps> = ({
  paintRatios,
  isCalculating,
  onUpdatePaintRatio,
  onAddPaintRatio,
  onRemovePaintRatio,
  onCalculateRatioPrediction
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Enter Paint Ratios</h2>
      <p className="text-sm text-gray-600 mb-6">
        Specify the paint types and their ratios to predict the resulting mixed color.
      </p>

      {/* Paint Ratio Inputs */}
      <div className="space-y-4">
        {paintRatios.map((ratio, index) => (
          <div key={index} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paint {index + 1} {index >= 2 ? '(Optional)' : ''}
              </label>
              <select
                value={ratio.paint_id}
                onChange={(e) => onUpdatePaintRatio(index, 'paint_id', e.target.value)}
                disabled={isCalculating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Select Paint</option>
                {getUserPaintOptions().map(paint => (
                  <option key={paint.value} value={paint.value}>
                    {paint.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume (ml)
              </label>
              <input
                type="number"
                value={ratio.volume_ml || ''}
                onChange={(e) => onUpdatePaintRatio(index, 'volume_ml', parseFloat(e.target.value) || 0)}
                disabled={isCalculating}
                placeholder="Volume (ml)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                min="0.1"
                step="0.1"
              />
            </div>
            {paintRatios.length > 2 && (
              <button
                onClick={() => onRemovePaintRatio(index)}
                disabled={isCalculating}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Remove paint"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Add Paint Button */}
        {paintRatios.length < 5 && (
          <div className="flex justify-center">
            <button
              onClick={onAddPaintRatio}
              disabled={isCalculating}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Paint
            </button>
          </div>
        )}

        {/* Predict Color Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onCalculateRatioPrediction}
            disabled={isCalculating}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9a2 2 0 00-2 2v12a4 4 0 004 4h6a2 2 0 002-2V7a2 2 0 00-2-2z" />
            </svg>
            Predict Resulting Color
          </button>
        </div>
      </div>
    </div>
  )
}

export default RatioPredictionMode
