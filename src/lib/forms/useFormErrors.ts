/**
 * Shared Form Error Display Hook
 * Contract: refactoring-contracts.md - Contract 2
 * Feature: 005-use-codebase-analysis
 */

import { FieldErrors, FieldError } from 'react-hook-form'

/**
 * Extract first error message from React Hook Form errors
 */
export function useFormErrors<T extends Record<string, unknown>>(
  errors: FieldErrors<T>
): string | null {
  const errorKeys = Object.keys(errors)
  if (errorKeys.length === 0) return null

  const firstError = errors[errorKeys[0] as keyof T] as FieldError | undefined
  return firstError?.message?.toString() || 'Validation error'
}

/**
 * Get error message for specific field
 */
export function getFieldError<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  field: keyof T
): string | null {
  const error = errors[field] as FieldError | undefined
  return error?.message || null
}
