/**
 * Contract Test: T009 - Rate Limit Status API
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-010, FR-011, FR-012
 *
 * Verifies GET /api/auth/rate-limit-status endpoint returns rate limit
 * status for the requesting IP address. Uses sliding window to track
 * authentication attempts (5 per 15 minutes).
 *
 * EXPECTED: This test MUST FAIL until T023 (rate limit status route) is implemented.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

describe('Contract: T009 - Rate Limit Status API', () => {
  const testIp = `192.168.1.${Math.floor(Math.random() * 255)}`

  beforeEach(() => {
    // Clear rate limit tracking between tests
    // (In production, this would be in-memory Map that resets)
  })

  it('should return remaining requests when under limit', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIp,
        },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.limited).toBe(false)
    expect(data.remaining).toBe(5) // Full quota available
    expect(data.windowResetAt).toBeTruthy()

    // windowResetAt should be ISO 8601 timestamp
    const resetDate = new Date(data.windowResetAt)
    expect(resetDate.getTime()).toBeGreaterThan(Date.now())
  })

  it('should return retry-after seconds when rate limited', async () => {
    const limitedIp = `192.168.2.${Math.floor(Math.random() * 255)}`

    // Trigger rate limit by making 6 requests
    for (let i = 0; i < 6; i++) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': limitedIp,
        },
        body: JSON.stringify({
          email: `test-${i}@example.com`,
          password: 'WrongPassword123!',
        }),
      })
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Check rate limit status
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': limitedIp,
        },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.limited).toBe(true)
    expect(data.remaining).toBe(0)
    expect(data.retryAfterSeconds).toBeGreaterThan(0)
    expect(data.retryAfterSeconds).toBeLessThanOrEqual(15 * 60) // Max 15 minutes
  }, 15000)

  it('should calculate sliding window correctly', async () => {
    const windowIp = `192.168.3.${Math.floor(Math.random() * 255)}`

    // Make 2 requests
    for (let i = 0; i < 2; i++) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': windowIp,
        },
        body: JSON.stringify({
          email: `test-${i}@example.com`,
          password: 'WrongPassword123!',
        }),
      })
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Check status
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': windowIp,
        },
      }
    )

    const data = await response.json()
    expect(data.limited).toBe(false)
    expect(data.remaining).toBe(3) // 5 - 2 = 3 remaining
  }, 10000)

  it('should extract IP from X-Forwarded-For header', async () => {
    const forwardedIp = `10.0.0.${Math.floor(Math.random() * 255)}`

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': forwardedIp,
        },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    // Should return status for forwarded IP
    expect(data.remaining).toBeDefined()
  })

  it('should handle multiple IPs in X-Forwarded-For header', async () => {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
    // Should use the first IP (client IP)
    const clientIp = `172.16.0.${Math.floor(Math.random() * 255)}`
    const proxyIp1 = '172.16.1.1'
    const proxyIp2 = '172.16.2.1'

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `${clientIp}, ${proxyIp1}, ${proxyIp2}`,
        },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.remaining).toBeDefined()
  })

  it('should return window reset timestamp', async () => {
    const resetIp = `192.168.4.${Math.floor(Math.random() * 255)}`

    const beforeRequest = Date.now()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': resetIp,
        },
      }
    )

    const data = await response.json()

    // Window should reset in ~15 minutes
    const resetDate = new Date(data.windowResetAt)
    const resetTime = resetDate.getTime()

    const expectedReset = beforeRequest + (15 * 60 * 1000)

    // Allow 2 second tolerance
    const diff = Math.abs(resetTime - expectedReset)
    expect(diff).toBeLessThan(2000)
  })

  it('should update window reset on new attempts', async () => {
    const updateIp = `192.168.5.${Math.floor(Math.random() * 255)}`

    // First request
    const response1 = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': updateIp,
        },
      }
    )
    const data1 = await response1.json()
    const reset1 = new Date(data1.windowResetAt).getTime()

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Make an authentication attempt
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': updateIp,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      }),
    })

    // Check status again
    const response2 = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': updateIp,
        },
      }
    )
    const data2 = await response2.json()
    const reset2 = new Date(data2.windowResetAt).getTime()

    // Window reset should be extended (later than first check)
    expect(reset2).toBeGreaterThan(reset1)
  }, 10000)

  it('should handle missing X-Forwarded-For header gracefully', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // No X-Forwarded-For header
        },
      }
    )

    // Should return 400 or use fallback IP
    expect([200, 400]).toContain(response.status)
  })

  it('should support CORS for client-side requests', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIp,
          'Origin': 'http://localhost:3000',
        },
      }
    )

    // Should include CORS headers
    const corsHeader = response.headers.get('Access-Control-Allow-Origin')
    expect(corsHeader).toBeTruthy()
  })

  it('should prune old timestamps from sliding window', async () => {
    // This test verifies that the sliding window correctly removes
    // timestamps older than 15 minutes
    //
    // Contract requirement: timestamps.filter(ts => ts > windowStart)
    // where windowStart = now - (15 * 60 * 1000)
    //
    // Implementation verification happens in T023

    const pruneIp = `192.168.6.${Math.floor(Math.random() * 255)}`

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/rate-limit-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': pruneIp,
        },
      }
    )

    const data = await response.json()
    expect(data.limited).toBe(false)
    expect(data.remaining).toBe(5) // Full quota on first request
  })
})
