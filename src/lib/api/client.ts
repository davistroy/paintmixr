/**
 * Shared API Client Utilities
 * Contract: refactoring-contracts.md - Contract 1
 * Feature: 005-use-codebase-analysis
 */

/**
 * Typed API error class for consistent error handling
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Request options for API client
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  signal?: AbortSignal // For cancellation
}

/**
 * Low-level API request with error handling
 * All API calls should use this function
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    })

    const data = await response.json()

    if (!response.ok) {
      throw new APIError(
        response.status,
        data.error || data.code || 'unknown_error',
        data.message || 'An error occurred',
        data.details
      )
    }

    return { data: data as T }
  } catch (error) {
    if (error instanceof APIError) {
      return { error: { code: error.code, message: error.message, details: error.details } }
    }
    return { error: { code: 'network_error', message: 'Network request failed' } }
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  endpoint: string,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', signal })
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'POST', body, signal })
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'PUT', body, signal })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
  endpoint: string,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', signal })
}
