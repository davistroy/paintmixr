/**
 * Contract Test: Rate Limiting
 *
 * Validates that /api/optimize enforces 5 requests/minute rate limit.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T029
 * Requirement: FR-007
 */

import { RATE_LIMIT_POLICIES } from '@/lib/contracts/rate-limit-policy'

describe('Rate Limiting Contract', () => {
  const OPTIMIZE_ENDPOINT = '/api/optimize'
  const policy = RATE_LIMIT_POLICIES[OPTIMIZE_ENDPOINT]

  const createOptimizationRequest = () => ({
    targetColor: {
      hex: '#FF0000',
      lab: { l: 50, a: 50, b: 0 },
    },
    availablePaints: [],
    mode: 'standard' as const,
  })

  beforeEach(() => {
    // Clear any rate limit state between tests
    // Note: In-memory rate limiter will reset between test runs
  })

  describe('/api/optimize rate limiting', () => {
    it('should allow up to 5 requests in 1 minute', async () => {
      // This test will fail until T040 is implemented
      const requests = Array.from({ length: 5 }, () =>
        fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createOptimizationRequest()),
        })
      )

      const responses = await Promise.all(requests)

      // All 5 requests should succeed (or fail for reasons other than rate limiting)
      responses.forEach((response) => {
        expect(response.status).not.toBe(429)
      })
    }, 30000) // 30s timeout for 5 concurrent requests

    it('should return 429 on 6th request within window', async () => {
      // This test will fail until T040 is implemented
      // Make 5 requests to fill the rate limit bucket
      const initialRequests = Array.from({ length: 5 }, () =>
        fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createOptimizationRequest()),
        })
      )

      await Promise.all(initialRequests)

      // 6th request should be rate limited
      const sixthResponse = await fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createOptimizationRequest()),
      })

      expect(sixthResponse.status).toBe(429)
    }, 30000)

    it('should return retry-after information in 429 response', async () => {
      // This test will fail until T040 is implemented
      // Fill rate limit bucket
      const initialRequests = Array.from({ length: 5 }, () =>
        fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createOptimizationRequest()),
        })
      )

      await Promise.all(initialRequests)

      // Get rate limited response
      const rateLimitedResponse = await fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createOptimizationRequest()),
      })

      expect(rateLimitedResponse.status).toBe(429)

      const body = await rateLimitedResponse.json()
      expect(body).toHaveProperty('error', 'Rate limit exceeded')
      expect(body).toHaveProperty('retryAfter')
      expect(body).toHaveProperty('limit', policy.maxRequests)
      expect(body).toHaveProperty('windowMs', policy.windowMs)
    }, 30000)

    it('should include rate limit headers in all responses', async () => {
      // This test will fail until T040 is implemented
      const response = await fetch(`http://localhost:3000${OPTIMIZE_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createOptimizationRequest()),
      })

      expect(response.headers.get('X-RateLimit-Limit')).toBe(policy.maxRequests.toString())
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })
})
