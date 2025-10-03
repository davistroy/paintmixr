/**
 * Rate Limit Status API Endpoint
 * Feature: 005-use-codebase-analysis
 * Task: T036
 *
 * GET /api/auth/rate-limit-status
 *
 * Returns rate limit status for the requesting IP address.
 * Used for client-side warnings about approaching rate limits.
 *
 * Security:
 * - Extracts IP from X-Forwarded-For header
 * - Uses sliding window rate limiting
 * - Returns retry-after duration if limited
 */

import { checkRateLimit } from '@/lib/auth/rate-limit'

export async function GET(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

  const status = checkRateLimit(ipAddress)

  if (status.rateLimited) {
    return Response.json({
      rateLimited: true,
      requestsRemaining: 0,
      retryAfter: status.retryAfter
    })
  }

  return Response.json({
    rateLimited: false,
    requestsRemaining: status.requestsRemaining
  })
}
