// src/lib/errors/user-messages.ts

/**
 * Represents an API error that can be translated to a user-friendly message.
 */
export interface ApiError {
  /** HTTP status code (e.g., 401, 500) */
  status?: number
  /** Named error code (e.g., 'NETWORK_ERROR', 'TIMEOUT') */
  code?: string
  /** Technical error message (for logging, not shown to users) */
  message?: string
}

/**
 * Mapping of HTTP status codes to user-friendly error messages.
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please sign in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  429: 'Too many requests. Please try again later.',
  500: 'Unable to complete request. Please try again.',
  503: 'Service temporarily unavailable. Please try again later.',
}

/**
 * Mapping of named error codes to user-friendly error messages.
 */
export const NAMED_ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Connection issue. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
}

/**
 * Translates API errors to user-friendly messages.
 *
 * Priority order:
 * 1. HTTP status code (if provided)
 * 2. Named error code (if provided)
 * 3. Error message (if provided)
 * 4. Generic fallback message
 *
 * @param error - The API error to translate
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = translateApiError({ status: 401 })
 * // Returns: "Session expired. Please sign in again."
 * ```
 */
export function translateApiError(error: ApiError): string {
  // HTTP status code mapping
  if (error.status) {
    return HTTP_STATUS_MESSAGES[error.status] || 'An unexpected error occurred.'
  }

  // Named error codes
  if (error.code) {
    return NAMED_ERROR_MESSAGES[error.code] || 'An unexpected error occurred.'
  }

  // Fallback to provided message or generic
  return error.message || 'An unexpected error occurred.'
}
