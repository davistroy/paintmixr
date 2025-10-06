/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter for API endpoints.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T040
 * Requirement: FR-007
 */

import type { RateLimitPolicy } from '@/lib/contracts/rate-limit-policy'
import { createRateLimitError } from '@/lib/contracts/rate-limit-policy'

interface RateLimitEntry {
  count: number
  resetAt: Date
}

// In-memory store for rate limit tracking
// Key format: "userId:endpoint" or "ip:endpoint"
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if request should be rate limited
 *
 * @param identifier - User ID or IP address
 * @param policy - Rate limit policy for the endpoint
 * @returns null if allowed, RateLimitError if exceeded
 */
export function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy
): {
  allowed: boolean
  remaining: number
  resetAt: Date
  error?: ReturnType<typeof createRateLimitError>
} {
  const key = `${identifier}:${policy.endpoint}`
  const now = new Date()

  let entry = rateLimitStore.get(key)

  // Clean up expired entry
  if (entry && entry.resetAt <= now) {
    rateLimitStore.delete(key)
    entry = undefined
  }

  // Create new entry if none exists
  if (!entry) {
    const resetAt = new Date(now.getTime() + policy.windowMs)
    entry = { count: 0, resetAt }
    rateLimitStore.set(key, entry)
  }

  // Increment request count
  entry.count++

  // Check if limit exceeded
  if (entry.count > policy.maxRequests) {
    const retryAfterMs = entry.resetAt.getTime() - now.getTime()
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      error: createRateLimitError(policy, retryAfterMs),
    }
  }

  return {
    allowed: true,
    remaining: policy.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Clean up expired rate limit entries
 * Call periodically to prevent memory leaks
 */
export function cleanupExpiredEntries() {
  const now = new Date()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}
