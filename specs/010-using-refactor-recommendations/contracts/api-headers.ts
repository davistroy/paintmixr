/**
 * API Response Headers Contract
 *
 * Defines standard headers for all API responses.
 *
 * Feature: 010-using-refactor-recommendations
 * Requirement: FR-028 (API version headers)
 */

export interface StandardAPIHeaders {
  /**
   * API version for tracking compatibility
   * Format: "MAJOR.MINOR" (e.g., "1.0")
   *
   * Requirement: FR-028
   */
  'X-API-Version': string

  /**
   * Deprecation status (optional)
   * Only present if endpoint is deprecated
   *
   * Values:
   * - "true": Endpoint deprecated, will be removed in next major version
   * - "false": Endpoint active, not deprecated
   */
  'X-Deprecated'?: 'true' | 'false'

  /**
   * Cache control for GET requests
   * Format: "private, max-age=<seconds>, stale-while-revalidate=<seconds>"
   *
   * Requirement: FR-016
   */
  'Cache-Control'?: string

  /**
   * ETag for cache validation
   * Format: MD5 hash of response body
   *
   * Requirement: FR-016
   */
  'ETag'?: string

  /**
   * Rate limit headers (for rate-limited endpoints)
   */
  'X-RateLimit-Limit'?: string // Max requests per window
  'X-RateLimit-Remaining'?: string // Remaining requests in current window
  'X-RateLimit-Reset'?: string // Unix timestamp when window resets
}

/**
 * Current API version constant
 */
export const CURRENT_API_VERSION = '1.0'

/**
 * Helper to create standard response headers
 */
export function createAPIHeaders(options: {
  deprecated?: boolean
  cacheControl?: string
  etag?: string
  rateLimit?: {
    limit: number
    remaining: number
    resetAt: Date
  }
}): StandardAPIHeaders {
  const headers: StandardAPIHeaders = {
    'X-API-Version': CURRENT_API_VERSION,
  }

  if (options.deprecated !== undefined) {
    headers['X-Deprecated'] = options.deprecated ? 'true' : 'false'
  }

  if (options.cacheControl) {
    headers['Cache-Control'] = options.cacheControl
  }

  if (options.etag) {
    headers['ETag'] = options.etag
  }

  if (options.rateLimit) {
    headers['X-RateLimit-Limit'] = options.rateLimit.limit.toString()
    headers['X-RateLimit-Remaining'] = options.rateLimit.remaining.toString()
    headers['X-RateLimit-Reset'] = Math.floor(options.rateLimit.resetAt.getTime() / 1000).toString()
  }

  return headers
}
