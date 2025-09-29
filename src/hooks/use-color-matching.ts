import { useState, useCallback } from 'react'
import type { ColorValue, MixingFormula, ColorMatchRequest, ColorMatchResponse } from '@/types/types'

interface UseColorMatchingState {
  isCalculating: boolean
  calculatedColor: ColorValue | null
  formula: MixingFormula | null
  deltaE: number | null
  error: string | null
  lastRequest: { target_color: ColorValue; total_volume_ml: number; optimization_preference: 'accuracy' | 'cost' | 'simplicity' } | null
}

interface UseColorMatchingResult extends UseColorMatchingState {
  calculateColorMatch: (targetColor: ColorValue, options?: { total_volume_ml?: number; optimization_preference?: 'accuracy' | 'cost' | 'simplicity' }) => Promise<void>
  reset: () => void
  retry: () => Promise<void>
}

const defaultOptions = {
  total_volume_ml: 200,
  optimization_preference: 'accuracy' as const,
}

export const useColorMatching = (): UseColorMatchingResult => {
  const [state, setState] = useState<UseColorMatchingState>({
    isCalculating: false,
    calculatedColor: null,
    formula: null,
    deltaE: null,
    error: null,
    lastRequest: null,
  })

  const calculateColorMatch = useCallback(async (
    targetColor: ColorValue,
    options: { total_volume_ml?: number; optimization_preference?: 'accuracy' | 'cost' | 'simplicity' } = {}
  ) => {
    const request = {
      target_color: targetColor,
      ...defaultOptions,
      ...options,
    }

    setState(prev => ({
      ...prev,
      isCalculating: true,
      error: null,
      lastRequest: request,
    }))

    try {
      const response = await fetch('/api/color-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to calculate color match')
      }

      const data: ColorMatchResponse = await response.json()

      setState(prev => ({
        ...prev,
        isCalculating: false,
        calculatedColor: data.calculated_color,
        formula: data.formula,
        deltaE: data.delta_e,
        error: null,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isCalculating: false,
        error: err instanceof Error ? err.message : 'Failed to calculate color match',
      }))
    }
  }, [])

  const retry = useCallback(async () => {
    if (state.lastRequest) {
      await calculateColorMatch(state.lastRequest.target_color, {
        total_volume_ml: state.lastRequest.total_volume_ml,
        optimization_preference: state.lastRequest.optimization_preference,
      })
    }
  }, [state.lastRequest, calculateColorMatch])

  const reset = useCallback(() => {
    setState({
      isCalculating: false,
      calculatedColor: null,
      formula: null,
      deltaE: null,
      error: null,
      lastRequest: null,
    })
  }, [])

  return {
    ...state,
    calculateColorMatch,
    retry,
    reset,
  }
}