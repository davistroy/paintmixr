import { useState, useEffect, useCallback } from 'react'

interface PaintColor {
  id: string
  name: string
  description?: string
  category: 'primary' | 'earth' | 'transparent' | 'opaque'
  price_per_ml?: number
}

interface PaintColorsResponse {
  paints: PaintColor[]
}

interface UsePaintColorsState {
  paints: PaintColor[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
}

interface UsePaintColorsResult extends UsePaintColorsState {
  fetchPaints: () => Promise<void>
  getPaintById: (id: string) => PaintColor | undefined
  getPaintsByCategory: (category: string) => PaintColor[]
  searchPaints: (query: string) => PaintColor[]
  refresh: () => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export const usePaintColors = (): UsePaintColorsResult => {
  const [state, setState] = useState<UsePaintColorsState>({
    paints: [],
    isLoading: false,
    error: null,
    lastFetched: null,
  })

  const fetchPaints = useCallback(async (): Promise<void> => {
    // Check cache validity
    if (
      state.lastFetched &&
      Date.now() - state.lastFetched < CACHE_DURATION &&
      state.paints.length > 0
    ) {
      return // Use cached data
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/paints')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch paint colors')
      }

      const data: PaintColorsResponse = await response.json()

      setState(prev => ({
        ...prev,
        isLoading: false,
        paints: data.paints,
        lastFetched: Date.now(),
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch paint colors',
      }))
    }
  }, [state.lastFetched, state.paints.length])

  const getPaintById = useCallback((id: string): PaintColor | undefined => {
    return state.paints.find(paint => paint.id === id)
  }, [state.paints])

  const getPaintsByCategory = useCallback((category: string): PaintColor[] => {
    return state.paints.filter(paint => paint.category === category)
  }, [state.paints])

  const searchPaints = useCallback((query: string): PaintColor[] => {
    if (!query.trim()) return state.paints

    const searchTerm = query.toLowerCase().trim()
    return state.paints.filter(paint =>
      paint.name.toLowerCase().includes(searchTerm) ||
      paint.id.toLowerCase().includes(searchTerm) ||
      paint.description?.toLowerCase().includes(searchTerm) ||
      paint.category.toLowerCase().includes(searchTerm)
    )
  }, [state.paints])

  const refresh = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, lastFetched: null }))
    await fetchPaints()
  }, [fetchPaints])

  // Auto-fetch on mount
  useEffect(() => {
    fetchPaints()
  }, [fetchPaints])

  return {
    ...state,
    fetchPaints,
    getPaintById,
    getPaintsByCategory,
    searchPaints,
    refresh,
  }
}