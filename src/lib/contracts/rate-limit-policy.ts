/**
 * Rate Limiting Policy Contract
 *
 * Defines rate limits for expensive API operations.
 *
 * Feature: 010-using-refactor-recommendations
 * Requirement: FR-007 (rate limiting on /api/optimize)
 */

export interface RateLimitPolicy {
  endpoint: string
  maxRequests: number
  windowMs: number
  keyBy: 'userId' | 'ip'
  message?: string
}

/**
 * Rate limit policies for all endpoints
 */
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  '/api/optimize': {
    endpoint: '/api/optimize',
    maxRequests: 5,
    windowMs: 60_000, // 1 minute
    keyBy: 'userId',
    message: 'Rate limit exceeded for optimization requests. Maximum 5 requests per minute.',
  },
  // Future endpoints can be added here
  // '/api/sessions': { ... },
}

/**
 * Rate limit error response structure
 */
export interface RateLimitError {
  error: 'Rate limit exceeded'
  retryAfter: number // seconds
  limit: number
  windowMs: number
}

/**
 * Helper to create rate limit error response
 */
export function createRateLimitError(policy: RateLimitPolicy, retryAfterMs: number): RateLimitError {
  return {
    error: 'Rate limit exceeded',
    retryAfter: Math.ceil(retryAfterMs / 1000),
    limit: policy.maxRequests,
    windowMs: policy.windowMs,
  }
}

/**
 * Helper to check if endpoint has rate limiting
 */
export function isRateLimited(endpoint: string): boolean {
  return endpoint in RATE_LIMIT_POLICIES
}

/**
 * Get rate limit policy for endpoint
 */
export function getRateLimitPolicy(endpoint: string): RateLimitPolicy | null {
  return RATE_LIMIT_POLICIES[endpoint] || null
}
