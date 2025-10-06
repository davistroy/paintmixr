/**
 * Fetch with automatic timeout retry
 * Requirements: FR-011, NFR-001
 */

interface FetchWithRetryOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

/**
 * Fetch wrapper with automatic retry on timeout
 * - Retries once after 500ms delay on timeout/network errors
 * - Does not retry on 4xx/5xx errors (those are server responses)
 * - 30 second timeout for Enhanced Mode calculations
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 1,
    retryDelay = 500,
    timeout = 30000
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Don't retry on successful responses or HTTP errors (4xx, 5xx)
      // Those are valid server responses, not network issues
      return response

    } catch (error) {
      lastError = error as Error

      // Check if it's a timeout or network error
      const isRetryable =
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('timeout')
        )

      // Only retry if we have retries left and error is retryable
      if (attempt < maxRetries && isRetryable) {
        // T030-T031: Log retry attempts (NFR-001c, NFR-006)
        logger.warn(`Request to ${url} timed out after ${timeout}ms, retrying... (attempt ${attempt + 1}/${maxRetries})`)
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }

      // T030-T031: Log final failure (NFR-006)
      logger.error(`Request to ${url} failed after ${attempt + 1} attempt(s):`, error)
      // No more retries or non-retryable error
      throw error
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Fetch with 401 retry logic
 * Automatically retries once after 500ms on 401 errors (session refresh)
 */
export async function fetchWithAuthRetry(
  url: string,
  init?: RequestInit,
  retryCount = 0
): Promise<Response> {
  const response = await fetch(url, init)

  // If 401 and first attempt, retry once after 500ms
  if (response.status === 401 && retryCount === 0) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return fetchWithAuthRetry(url, init, retryCount + 1)
  }

  // If still 401 after retry, redirect to signin
  if (response.status === 401 && retryCount > 0) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin?reason=session_expired'
    }
  }

  return response
}
