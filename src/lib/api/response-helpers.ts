/**
 * API Response Helpers
 *
 * Utilities for creating consistent API responses with standard headers.
 *
 * Feature: 010-using-refactor-recommendations
 * Tasks: T039, T041
 * Requirements: FR-016, FR-028
 */

import { NextResponse } from 'next/server'
import { createAPIHeaders } from '@/lib/contracts/api-headers'
import crypto from 'crypto'

interface APIResponseOptions<T> {
  data: T
  status?: number
  deprecated?: boolean
  cacheMaxAge?: number
  rateLimit?: {
    limit: number
    remaining: number
    resetAt: Date
  }
}

/**
 * Create a standard API response with all required headers
 */
export function createAPIResponse<T>(options: APIResponseOptions<T>): NextResponse<T> {
  const { data, status = 200, deprecated, cacheMaxAge, rateLimit } = options

  // Calculate ETag from response body
  const bodyString = JSON.stringify(data)
  const etag = crypto.createHash('md5').update(bodyString).digest('hex')

  // Build cache control header for GET requests
  const cacheControl = cacheMaxAge
    ? `private, max-age=${cacheMaxAge}, stale-while-revalidate=60`
    : undefined

  // Create standard headers
  const headers = createAPIHeaders({
    deprecated,
    cacheControl,
    etag,
    rateLimit,
  })

  // Convert headers object to Headers instance
  const headersInit = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headersInit.set(key, value)
    }
  })

  return NextResponse.json(data, {
    status,
    headers: headersInit,
  })
}

/**
 * Create a cached GET response (5-minute cache)
 */
export function createCachedResponse<T>(
  data: T,
  options: Omit<APIResponseOptions<T>, 'cacheMaxAge'> = { data }
): NextResponse<T> {
  return createAPIResponse({
    ...options,
    cacheMaxAge: 300, // 5 minutes
  })
}

/**
 * Create an error response with standard headers
 */
export function createErrorResponse(
  error: {
    code: string
    message: string
    details?: unknown
  },
  status: number
): NextResponse {
  const headers = createAPIHeaders({})

  const headersInit = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headersInit.set(key, value)
    }
  })

  return NextResponse.json({ error }, {
    status,
    headers: headersInit,
  })
}

/**
 * Create a rate-limited error response (429)
 */
export function createRateLimitResponse(retryAfter: number): NextResponse {
  const headers = createAPIHeaders({
    rateLimit: {
      limit: 0,
      remaining: 0,
      resetAt: new Date(Date.now() + retryAfter * 1000),
    },
  })

  const headersInit = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headersInit.set(key, value)
    }
  })
  headersInit.set('Retry-After', retryAfter.toString())

  return NextResponse.json(
    {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      },
    },
    {
      status: 429,
      headers: headersInit,
    }
  )
}
