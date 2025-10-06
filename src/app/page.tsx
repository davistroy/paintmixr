'use client'

import React, { useState, useEffect } from 'react'
import type { ColorValue, CreateSessionRequest } from '@/lib/types'
import ColorMatchingMode from '@/components/modes/ColorMatchingMode'
import RatioPredictionMode from '@/components/modes/RatioPredictionMode'
import RatioDisplay from '@/components/mixing-calculator/RatioDisplay'
import AccuracyIndicator from '@/components/mixing-calculator/AccuracyIndicator'
import DeltaEWarning from '@/components/mixing-calculator/DeltaEWarning'
import SaveForm from '@/components/session-manager/SaveForm'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useModal } from '@/contexts/ModalContext'
import { useColorMatching } from '@/lib/hooks/useColorMatching'

type InputMethod = 'color_picker' | 'hex_input' | 'image_upload'
type AppMode = 'color_matching' | 'ratio_prediction'

interface PaintRatioInput {
  paint_id: string
  volume_ml: number
}

const PaintMixr: React.FC = () => {
  const { toast } = useToast()
  const { openModal, closeModal } = useModal()
  const [appMode, setAppMode] = useState<AppMode>('color_matching')
  const [inputMethod, setInputMethod] = useState<InputMethod>('color_picker')
  const [targetColor, setTargetColor] = useState<ColorValue | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(true)

  // Use color matching hook
  const {
    calculatedColor,
    formula,
    deltaE,
    isCalculating,
    error,
    calculateColorMatch,
    resetResults,
    setError
  } = useColorMatching(enhancedMode)

  // State for ratio prediction mode
  const [paintRatios, setPaintRatios] = useState<PaintRatioInput[]>([
    { paint_id: '', volume_ml: 0 },
    { paint_id: '', volume_ml: 0 },
  ])

  // Track modal state for ModalContext integration
  useEffect(() => {
    if (showSaveForm) {
      openModal()
    } else {
      closeModal()
    }
  }, [showSaveForm, openModal, closeModal])

  const handleColorInput = (color: ColorValue) => {
    setTargetColor(color)
    setError('')
    if (appMode === 'color_matching') {
      calculateColorMatch(color)
    }
  }

  const handleInputMethodChange = (method: InputMethod) => {
    setInputMethod(method)
    resetResults()
  }

  const calculateRatioPrediction = async () => {
    try {
      setError('')
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
      setTargetColor(data.resulting_color)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict color')
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

    toast({
      title: 'Session saved successfully',
      variant: 'success',
      duration: 3000,
    })

    setTimeout(() => setShowSaveForm(false), 500)
  }

  const resetAll = () => {
    setTargetColor(null)
    resetResults()
    setShowSaveForm(false)
    setPaintRatios([
      { paint_id: '', volume_ml: 0 },
      { paint_id: '', volume_ml: 0 },
    ])
  }

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
                resetAll()
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
                resetAll()
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

        {/* Color Matching Mode */}
        {appMode === 'color_matching' && (
          <ColorMatchingMode
            inputMethod={inputMethod}
            targetColor={targetColor}
            isCalculating={isCalculating}
            onInputMethodChange={handleInputMethodChange}
            onColorInput={handleColorInput}
          />
        )}

        {/* Ratio Prediction Mode */}
        {appMode === 'ratio_prediction' && (
          <RatioPredictionMode
            paintRatios={paintRatios}
            isCalculating={isCalculating}
            onUpdatePaintRatio={updatePaintRatio}
            onAddPaintRatio={addPaintRatio}
            onRemovePaintRatio={removePaintRatio}
            onCalculateRatioPrediction={calculateRatioPrediction}
          />
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
            <AccuracyIndicator
              targetColor={targetColor!}
              achievedColor={calculatedColor}
              deltaE={deltaE}
              showColors={true}
            />

            <DeltaEWarning
              deltaE={deltaE}
              mode={enhancedMode ? 'Enhanced' : 'Standard'}
            />

            <RatioDisplay
              formula={formula}
              showVolumes={true}
              showPercentages={true}
            />

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
