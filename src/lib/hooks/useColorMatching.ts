import { useState } from 'react'
import type { ColorValue, MixingFormula } from '@/lib/types'
import { labToHex } from '@/lib/color-science'
import { fetchWithRetry } from '@/lib/api/fetch-with-retry'

/**
 * useColorMatching Hook
 *
 * Manages color matching state and API calls for both Standard and Enhanced modes.
 * Extracted from page.tsx (T018) to meet 300-line component standard.
 *
 * @returns State and handler functions for color matching operations
 */
export function useColorMatching(enhancedMode: boolean) {
  const [calculatedColor, setCalculatedColor] = useState<ColorValue | null>(null)
  const [formula, setFormula] = useState<MixingFormula | null>(null)
  const [deltaE, setDeltaE] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string>('')

  const calculateColorMatch = async (color: ColorValue) => {
    setIsCalculating(true)
    setError('')

    try {
      // Choose API endpoint based on mode
      const endpoint = enhancedMode ? '/api/optimize' : '/api/color-match'

      // Get all user paint IDs (for enhanced mode, we need to fetch from database)
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
      // Clear results on error
      setCalculatedColor(null)
      setFormula(null)
      setDeltaE(null)
    } finally {
      setIsCalculating(false)
    }
  }

  const resetResults = () => {
    setCalculatedColor(null)
    setFormula(null)
    setDeltaE(null)
    setError('')
  }

  return {
    calculatedColor,
    formula,
    deltaE,
    isCalculating,
    error,
    calculateColorMatch,
    resetResults,
    setError
  }
}
