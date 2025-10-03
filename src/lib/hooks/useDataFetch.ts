/**
 * Shared Data Fetching Hook
 * Contract: refactoring-contracts.md - Contract 3
 * Feature: 005-use-codebase-analysis
 */

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api/client'

export interface DataFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic data fetching hook with loading/error states
 */
export function useDataFetch<T>(
  endpoint: string,
  dependencies: unknown[] = []
): DataFetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const response = await apiGet<T>(endpoint)

    if (response.error) {
      setError(response.error.message)
      setData(null)
    } else {
      setData(response.data!)
      setError(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, dependencies) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchData }
}
