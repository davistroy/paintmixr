'use client'

import React, { useState } from 'react'
import type { ColorValue, MixingFormula, CreateSessionRequest } from '@/types/types'
import HexInput from '@/components/color-input/HexInput'
import ColorPicker from '@/components/color-input/ColorPicker'
import ImageUpload from '@/components/color-input/ImageUpload'
import RatioDisplay from '@/components/mixing-calculator/RatioDisplay'
import AccuracyIndicator from '@/components/mixing-calculator/AccuracyIndicator'
import SaveForm from '@/components/session-manager/SaveForm'
import ColorValueComponent from '@/components/color-display/ColorValue'

type InputMethod = 'color_picker' | 'hex_input' | 'image_upload'
type AppMode = 'color_matching' | 'ratio_prediction'

const PaintMixr: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('color_matching')
  const [inputMethod, setInputMethod] = useState<InputMethod>('color_picker')
  const [targetColor, setTargetColor] = useState<ColorValue | null>(null)
  const [calculatedColor, setCalculatedColor] = useState<ColorValue | null>(null)
  const [formula, setFormula] = useState<MixingFormula | null>(null)
  const [deltaE, setDeltaE] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [error, setError] = useState<string>('')

  const handleColorInput = (color: ColorValue) => {
    setTargetColor(color)
    setError('')
    if (appMode === 'color_matching') {
      calculateColorMatch(color)
    }
  }

  const calculateColorMatch = async (color: ColorValue) => {
    setIsCalculating(true)
    setError('')

    try {
      const response = await fetch('/api/color-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_color: color,
          max_paints: 5,
          volume_ml: 50,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to calculate color match')
      }

      const data = await response.json()
      setFormula(data.formula)
      setCalculatedColor(data.calculated_color)
      setDeltaE(data.delta_e)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate color match')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSaveSession = async (sessionData: CreateSessionRequest) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save session')
      }

      setShowSaveForm(false)
      // Show success message or redirect
    } catch (err) {
      throw err // Let SaveForm handle the error
    }
  }

  const resetResults = () => {
    setTargetColor(null)
    setCalculatedColor(null)
    setFormula(null)
    setDeltaE(null)
    setError('')
    setShowSaveForm(false)
  }

  const canSave = targetColor && (appMode === 'color_matching' ? (formula && calculatedColor && deltaE !== null) : true)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
              <h1 className="text-xl font-bold text-gray-900">PaintMixr</h1>
            </div>
            <nav className="flex items-center gap-4">
              <a
                href="/history"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Session History
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose Your Mixing Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setAppMode('color_matching')
                resetResults()
              }}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                appMode === 'color_matching'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium text-gray-800 mb-2">Color Matching</h3>
              <p className="text-sm text-gray-600">
                Choose a target color and get a paint mixing formula to achieve it
              </p>
            </button>
            <button
              onClick={() => {
                setAppMode('ratio_prediction')
                resetResults()
              }}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                appMode === 'ratio_prediction'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h3 className="font-medium text-gray-800 mb-2">Ratio Prediction</h3>
              <p className="text-sm text-gray-600">
                Enter paint ratios and predict the resulting color mix
              </p>
            </button>
          </div>
        </div>

        {/* Input Method Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Color Input Method</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setInputMethod('color_picker')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                inputMethod === 'color_picker'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Color Picker
            </button>
            <button
              onClick={() => setInputMethod('hex_input')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                inputMethod === 'hex_input'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Hex Code
            </button>
            <button
              onClick={() => setInputMethod('image_upload')}
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
                onColorChange={handleColorInput}
                disabled={isCalculating}
              />
            )}

            {inputMethod === 'hex_input' && (
              <HexInput
                onColorChange={handleColorInput}
                disabled={isCalculating}
              />
            )}

            {inputMethod === 'image_upload' && (
              <ImageUpload
                onColorExtracted={handleColorInput}
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

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isCalculating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-800 font-medium">
                {appMode === 'color_matching' ? 'Calculating paint formula...' : 'Predicting color...'}
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {appMode === 'color_matching' && formula && calculatedColor && deltaE !== null && (
          <div className="space-y-6">
            {/* Accuracy Indicator */}
            <AccuracyIndicator
              targetColor={targetColor!}
              achievedColor={calculatedColor}
              deltaE={deltaE}
              showColors={true}
            />

            {/* Formula Display */}
            <RatioDisplay
              formula={formula}
              showVolumes={true}
              showPercentages={true}
            />

            {/* Save Session Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowSaveForm(true)}
                disabled={!canSave}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save This Formula
              </button>
            </div>
          </div>
        )}

        {/* Save Form Modal */}
        {showSaveForm && canSave && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-lg w-full max-h-screen overflow-y-auto">
              <SaveForm
                sessionType={appMode}
                inputMethod={inputMethod}
                targetColor={targetColor!}
                calculatedColor={calculatedColor!}
                deltaE={deltaE!}
                formula={formula!}
                onSave={handleSaveSession}
                onCancel={() => setShowSaveForm(false)}
              />
            </div>
          </div>
        )}

        {/* Get Started Message */}
        {!targetColor && !isCalculating && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9a2 2 0 00-2 2v12a4 4 0 004 4h6a2 2 0 002-2V7a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Ready to Mix Colors?</h3>
            <p className="text-gray-600">
              Select a color using one of the input methods above to get started with paint mixing.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaintMixr