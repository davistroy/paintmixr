/**
 * Rate Limiting Utilities
 * Feature: 005-use-codebase-analysis
 * Task: T032
 *
 * Server-side IP-based rate limiting using sliding window algorithm.
 * Prevents brute force attacks by limiting authentication attempts per IP address.
 *
 * Requirements:
 * - FR-010: Rate limit authentication attempts
 * - FR-011: 5 requests per 15-minute window per IP
 * - FR-012: Sliding window (not fixed window)
 */

/**
 * Rate limit record for an IP address
 * Stores array of Unix timestamps for authentication attempts
 */
interface RateLimitRecord {
  timestamps: number[] // Unix timestamps in milliseconds
}

/**
 * In-memory cache for rate limit tracking
 * Key: IP address, Value: RateLimitRecord with timestamp array
 */
const rateLimitCache = new Map<string, RateLimitRecord>()

/**
 * Rate limit configuration constants
 */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5

/**
 * Check if IP address is currently rate limited
 *
 * Uses sliding window algorithm: prunes timestamps older than 15 minutes,
 * then checks if remaining count exceeds threshold.
 *
 * @param ipAddress - Client IP address from X-Forwarded-For or connection
 * @returns Object with rateLimited status, requestsRemaining, and retryAfter seconds
 *
 * @example
 * ```typescript
 * const status = checkRateLimit('192.168.1.100')
 * if (status.rateLimited) {
 *   return res.status(429).json({
 *     error: 'rate_limited',
 *     retryAfter: status.retryAfter
 *   })
 * }
 * ```
 */
export function checkRateLimit(ipAddress: string): {
  rateLimited: boolean
  requestsRemaining: number
  retryAfter: number
} {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  // Get existing record or create empty one
  const record = rateLimitCache.get(ipAddress) || { timestamps: [] }

  // Sliding window: filter out timestamps older than window start
  const validTimestamps = record.timestamps.filter(ts => ts > windowStart)

  // Check if limit exceeded
  const rateLimited = validTimestamps.length >= MAX_REQUESTS_PER_WINDOW

  // Calculate retry-after: time until oldest timestamp expires from window
  let retryAfter = 0
  if (rateLimited && validTimestamps.length > 0) {
    const oldestTimestamp = validTimestamps[0]
    const windowResetTime = oldestTimestamp + RATE_LIMIT_WINDOW_MS
    retryAfter = Math.ceil((windowResetTime - now) / 1000) // Convert to seconds
  }

  return {
    rateLimited,
    requestsRemaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - validTimestamps.length),
    retryAfter
  }
}

/**
 * Record an authentication attempt for rate limiting
 *
 * Adds current timestamp to the IP's record and prunes old timestamps
 * outside the sliding window. Should be called BEFORE processing auth request.
 *
 * @param ipAddress - Client IP address from X-Forwarded-For or connection
 *
 * @example
 * ```typescript
 * // Record attempt before checking credentials
 * recordAuthAttempt(ipAddress)
 *
 * // Then proceed with authentication
 * const result = await supabase.auth.signInWithPassword(...)
 * ```
 */
export function recordAuthAttempt(ipAddress: string): void {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  // Get existing record or create empty one
  const record = rateLimitCache.get(ipAddress) || { timestamps: [] }

  // Prune old timestamps and add new one
  record.timestamps = record.timestamps
    .filter(ts => ts > windowStart)
    .concat(now)

  // Update cache
  rateLimitCache.set(ipAddress, record)
}

/**
 * Client-side lockout tracking using localStorage
 * Provides immediate UI feedback before server-side validation
 */

const CLIENT_LOCKOUT_KEY = 'auth_lockout'
const CLIENT_MAX_ATTEMPTS = 5
const CLIENT_LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

interface ClientLockoutData {
  failedAttempts: number
  lockoutUntil: number | null
  lastAttempt: number
}

/**
 * Check if user is locked out based on client-side localStorage
 */
export function checkLocalLockout(email: string): {
  isLocked: boolean
  minutesRemaining: number
} {
  if (typeof window === 'undefined') {
    return { isLocked: false, minutesRemaining: 0 }
  }

  const key = `${CLIENT_LOCKOUT_KEY}_${email.toLowerCase()}`
  const stored = localStorage.getItem(key)

  if (!stored) {
    return { isLocked: false, minutesRemaining: 0 }
  }

  try {
    const data: ClientLockoutData = JSON.parse(stored)
    const now = Date.now()

    if (data.lockoutUntil && data.lockoutUntil > now) {
      const minutesRemaining = Math.ceil((data.lockoutUntil - now) / 60000)
      return { isLocked: true, minutesRemaining }
    }

    return { isLocked: false, minutesRemaining: 0 }
  } catch {
    return { isLocked: false, minutesRemaining: 0 }
  }
}

/**
 * Update client-side lockout state after failed attempt
 */
export function updateLocalLockout(email: string): void {
  if (typeof window === 'undefined') return

  const key = `${CLIENT_LOCKOUT_KEY}_${email.toLowerCase()}`
  const stored = localStorage.getItem(key)
  const now = Date.now()

  let data: ClientLockoutData = {
    failedAttempts: 0,
    lockoutUntil: null,
    lastAttempt: now
  }

  if (stored) {
    try {
      data = JSON.parse(stored)
    } catch {
      // Invalid data, start fresh
    }
  }

  // Increment failed attempts
  data.failedAttempts += 1
  data.lastAttempt = now

  // Check if should be locked out
  if (data.failedAttempts >= CLIENT_MAX_ATTEMPTS) {
    data.lockoutUntil = now + CLIENT_LOCKOUT_DURATION_MS
  }

  localStorage.setItem(key, JSON.stringify(data))
}

/**
 * Clear client-side lockout state after successful signin
 */
export function clearLocalLockout(email: string): void {
  if (typeof window === 'undefined') return

  const key = `${CLIENT_LOCKOUT_KEY}_${email.toLowerCase()}`
  localStorage.removeItem(key)
}
