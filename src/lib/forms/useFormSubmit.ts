/**
 * Shared Form Submission Hook
 * Contract: refactoring-contracts.md - Contract 2
 * Feature: 005-use-codebase-analysis
 */

import { useState } from 'react'
import { APIResponse } from '@/lib/api/client'

/**
 * Generic form submission handler with loading/error states
 */
export function useFormSubmit<TInput, TOutput>() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (
    data: TInput,
    apiCall: (data: TInput) => Promise<APIResponse<TOutput>>
  ): Promise<TOutput | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiCall(data)

      if (response.error) {
        setError(response.error.message)
        return null
      }

      return response.data!
    } catch (err) {
      // Handle exceptions from apiCall (e.g., network errors)
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = () => setError(null)

  return { submit, isSubmitting, error, clearError }
}
