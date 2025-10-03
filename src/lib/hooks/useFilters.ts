/**
 * Shared Filtering Hook
 * Contract: refactoring-contracts.md - Contract 3
 * Feature: 005-use-codebase-analysis
 */

import { useState, useMemo } from 'react'

export type FilterValue = string | number | boolean | null

export interface FilterState {
  [key: string]: FilterValue
}

/**
 * Generic filtering hook with type safety
 */
export function useFilters<T extends Record<string, FilterValue>>(
  initialFilters: T
) {
  const [filters, setFilters] = useState<T>(initialFilters)

  const controls = useMemo(() => ({
    filters,
    setFilter: <K extends keyof T>(key: K, value: T[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    clearFilter: <K extends keyof T>(key: K) => {
      setFilters(prev => ({ ...prev, [key]: initialFilters[key] }))
    },
    clearAllFilters: () => {
      setFilters(initialFilters)
    },
    hasActiveFilters: () => {
      return Object.keys(filters).some(
        key => filters[key] !== initialFilters[key as keyof T]
      )
    }
  }), [filters, initialFilters])

  return controls
}
