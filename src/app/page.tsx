'use client'

import React, { useState } from 'react' // Cache bust: 2025-10-04-v2
import type { ColorValue, MixingFormula, CreateSessionRequest } from '@/types/types'
import { getUserPaintOptions } from '@/lib/user-paints'
import { labToHex } from '@/lib/color-science'
import HexInput from '@/components/color-input/HexInput'
import ColorPicker from '@/components/color-input/ColorPicker'
import ImageUpload from '@/components/color-input/ImageUpload'
import RatioDisplay from '@/components/mixing-calculator/RatioDisplay'
import AccuracyIndicator from '@/components/mixing-calculator/AccuracyIndicator'
import DeltaEWarning from '@/components/mixing-calculator/DeltaEWarning'
import SaveForm from '@/components/session-manager/SaveForm'
import ColorValueComponent from '@/components/color-display/ColorValue'
import { Checkbox } from '@/components/ui/checkbox'
import { fetchWithRetry } from '@/lib/api/fetch-with-retry'

type InputMethod = 'color_picker' | 'hex_input' | 'image_upload'
type AppMode = 'color_matching' | 'ratio_prediction'

interface PaintRatioInput {
  paint_id: string
  volume_ml: number
}

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
  const [enhancedMode, setEnhancedMode] = useState(true)

  // State for ratio prediction mode
  const [paintRatios, setPaintRatios] = useState<PaintRatioInput[]>([
    { paint_id: '', volume_ml: 0 },
    { paint_id: '', volume_ml: 0 },
  ])

  const handleColorInput = (color: ColorValue) => {
    setTargetColor(color)
    setError('')
    if (appMode === 'color_matching') {
      calculateColorMatch(color)
    }
  }

  // FR-005a, FR-005b: Clear state when switching input methods
  const handleInputMethodChange = (method: InputMethod) => {
    setInputMethod(method)
    // Clear calculation results (FR-005b)
    setCalculatedColor(null)
    setFormula(null)
    setDeltaE(null)
    setError('')
  }

  const calculateColorMatch = async (color: ColorValue) => {
    setIsCalculating(true)
    setError('')

    try {
      // Choose API endpoint based on mode
      const endpoint = enhancedMode ? '/api/optimize' : '/api/color-match'

      // Get all user paint IDs (for enhanced mode, we need to fetch from database)
      // For now, we'll fetch user's paints from the API
      let paintIds: string[] = []

      if (enhancedMode) {
        // Fetch user's paint collection from Supabase
        const paintsResponse = await fetch('/api/paints')
        if (paintsResponse.ok) {
          const paintsData = await paintsResponse.json()
          paintIds = paintsData.data?.map((p: any) => p.id) || []
        }

        // If no paints found, show error
        if (paintIds.length === 0) {
          throw new Error('No paints found in your collection. Please add paints first.')
        }
      }

      // Prepare request body based on endpoint
      const requestBody = enhancedMode
        ? {
            // Enhanced mode expects camelCase with lowercase LAB keys
            targetColor: {
              l: color.lab.l,
              a: color.lab.a,
              b: color.lab.b,
            },
            availablePaints: paintIds, // Array of paint ID strings
            mode: 'enhanced' as const,
            maxPaintCount: 5,
            timeLimit: 28000,
            accuracyTarget: 2.0,
            volumeConstraints: {
              min_total_volume_ml: 200,
              max_total_volume_ml: 200,
              allow_scaling: false,
            },
          }
        : {
            // Standard mode
            target_color: color,
            total_volume_ml: 200,
            optimization_preference: 'accuracy',
          }

      const response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }, {
        timeout: enhancedMode ? 30000 : 10000,
        maxRetries: 1,
        retryDelay: 500
      })

      if (!response.ok) {
        // If Enhanced mode fails, automatically fallback to Standard mode
        if (enhancedMode && endpoint === '/api/optimize') {
          console.warn('Enhanced mode failed, falling back to Standard mode')
          setError('Enhanced Accuracy Mode temporarily unavailable. Using Standard Mode.')
          setEnhancedMode(false)
          // Retry with Standard mode
          return calculateColorMatch(color)
        }

        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || errorData.message || `API error: ${response.status}`
        throw new Error(errorMessage)
      }

      const responseData = await response.json()

      // Check for error response structure (error field exists AND is not null)
      if ('error' in responseData && responseData.error !== null) {
        throw new Error(responseData.error.message || responseData.error || 'Color matching failed')
      }

      // Handle different response formats for enhanced vs standard mode
      if (enhancedMode) {
        // Enhanced mode response format from /api/optimize
        // Response structure: { success, formula, metrics, warnings, error }
        if (!responseData.success || !responseData.formula) {
          throw new Error(responseData.error || 'Optimization failed')
        }

        const formulaData = responseData.formula

        // Convert predicted color from LAB format to ColorValue format
        const predictedLab = {
          l: formulaData.predictedColor.l,
          a: formulaData.predictedColor.a,
          b: formulaData.predictedColor.b,
        }
        const predictedColor: ColorValue = {
          hex: labToHex(predictedLab),
          lab: predictedLab,
        }

        // Build formula from paintRatios
        const formula: MixingFormula = {
          total_volume_ml: formulaData.totalVolume,
          paint_ratios: formulaData.paintRatios.map((ratio: any) => ({
            paint_id: ratio.paint_id,
            paint_name: ratio.paint_name || '',
            volume_ml: ratio.volume_ml,
            percentage: ratio.percentage,
          })),
        }

        setFormula(formula)
        setCalculatedColor(predictedColor)
        setDeltaE(formulaData.deltaE)

        // Show warnings if any
        if (responseData.warnings && responseData.warnings.length > 0) {
          console.warn('Optimization warnings:', responseData.warnings)
        }
      } else {
        // Standard mode response format
        setFormula(responseData.formula)
        setCalculatedColor(responseData.calculated_color || responseData.achieved_color)
        setDeltaE(responseData.delta_e)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate color match')
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateRatioPrediction = async () => {
    setIsCalculating(true)
    setError('')

    try {
      // Filter out empty ratios and validate
      const validRatios = paintRatios.filter(ratio => ratio.paint_id && ratio.volume_ml > 0)

      if (validRatios.length === 0) {
        throw new Error('Please select at least one paint with a volume greater than 0')
      }

      const response = await fetch('/api/ratio-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paint_ratios: validRatios,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to predict color')
      }

      const data = await response.json()
      setCalculatedColor(data.resulting_color)
      setFormula(data.formula)
      setDeltaE(null) // No delta E for ratio prediction
      setTargetColor(data.resulting_color) // Set as target for saving
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict color')
    } finally {
      setIsCalculating(false)
    }
  }

  const updatePaintRatio = (index: number, field: 'paint_id' | 'volume_ml', value: string | number) => {
    const newRatios = [...paintRatios]
    if (field === 'paint_id') {
      newRatios[index].paint_id = value as string
    } else {
      newRatios[index].volume_ml = Math.max(0, Number(value))
    }
    setPaintRatios(newRatios)
  }

  const addPaintRatio = () => {
    if (paintRatios.length < 5) {
      setPaintRatios([...paintRatios, { paint_id: '', volume_ml: 0 }])
    }
  }

  const removePaintRatio = (index: number) => {
    if (paintRatios.length > 1) {
      const newRatios = paintRatios.filter((_, i) => i !== index)
      setPaintRatios(newRatios)
    }
  }

  const handleSaveSession = async (sessionData: CreateSessionRequest) => {
    try {
      // T024: Add mode field to session data
      const sessionDataWithMode = {
        ...sessionData,
        mode: enhancedMode ? 'Enhanced' : 'Standard',
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionDataWithMode),
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
    setPaintRatios([
      { paint_id: '', volume_ml: 0 },
      { paint_id: '', volume_ml: 0 },
    ])
  }

  // T024: Validate inputMethod is set before enabling save
  const canSave = targetColor && inputMethod && (appMode === 'color_matching' ? (formula && calculatedColor && deltaE !== null) : true)

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

          {/* Enhanced Mode Toggle */}
          {appMode === 'color_matching' && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-300">
              <label className="flex items-center cursor-pointer">
                <Checkbox
                  checked={enhancedMode}
                  onCheckedChange={(checked) => setEnhancedMode(checked === true)}
                  disabled={isCalculating}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Enhanced Accuracy Mode
                </span>
              </label>
              <p className="mt-2 text-xs text-gray-600">
                {enhancedMode
                  ? 'Advanced optimization algorithms for professional-grade color matching (Target ΔE ≤ 2.0, supports 2-5 paint formulas, 30s processing time).'
                  : 'Standard color matching (Target ΔE ≤ 5.0, maximum 3 paints, <10s processing time).'}
              </p>
            </div>
          )}
        </div>

        {/* Input Method Selection */}
        {appMode === 'color_matching' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Color Input Method</h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={() => handleInputMethodChange('color_picker')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  inputMethod === 'color_picker'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Color Picker
              </button>
              <button
                onClick={() => handleInputMethodChange('hex_input')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  inputMethod === 'hex_input'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Hex Code
              </button>
              <button
                onClick={() => handleInputMethodChange('image_upload')}
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
                  onChange={handleColorInput}
                  disabled={isCalculating}
                />
              )}

              {inputMethod === 'hex_input' && (
                <HexInput
                  onChange={handleColorInput}
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
        )}

        {/* Ratio Prediction Mode */}
        {appMode === 'ratio_prediction' && (
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
                      onChange={(e) => updatePaintRatio(index, 'paint_id', e.target.value)}
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
                      onChange={(e) => updatePaintRatio(index, 'volume_ml', parseFloat(e.target.value) || 0)}
                      disabled={isCalculating}
                      placeholder="Volume (ml)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  {paintRatios.length > 2 && (
                    <button
                      onClick={() => removePaintRatio(index)}
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
                    onClick={addPaintRatio}
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
                  onClick={calculateRatioPrediction}
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
        )}

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

            {/* Delta E Warning */}
            <DeltaEWarning
              deltaE={deltaE}
              mode={enhancedMode ? 'Enhanced' : 'Standard'}
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
                onSuccess={() => setShowSaveForm(false)}
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