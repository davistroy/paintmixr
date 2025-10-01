/**
 * Session Manager Utilities
 * Feature: 003-deploy-to-vercel
 * Task: T018
 *
 * Provides session validation and management utilities:
 * - JWT token parsing
 * - Session expiry validation
 * - Token refresh logic
 * - Cookie operations
 * - Session security checks
 */

/**
 * Session data structure
 * Matches Supabase Auth JWT payload
 */
export interface SessionData {
  user_id: string
  email: string
  exp: number // Unix timestamp (seconds)
  iat: number // Unix timestamp (seconds)
  role: string
  [key: string]: any // Allow additional fields
}

/**
 * Session validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Session expiry information
 */
export interface ExpiryInfo {
  secondsUntilExpiry: number
  expired: boolean
  formatted: string
}

/**
 * Parse JWT token and extract payload
 *
 * @param token - JWT token string
 * @returns Parsed session data or null if invalid
 */
export function parseSessionToken(token: string): SessionData | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')

    if (parts.length !== 3) {
      return null
    }

    // Decode base64 payload
    const payload = parts[1]
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    )

    return decoded as SessionData
  } catch (error) {
    console.error('Token parsing error:', error)
    return null
  }
}

/**
 * Check if session is expired
 *
 * @param exp - Expiry timestamp (Unix seconds)
 * @returns true if expired, false otherwise
 */
export function isSessionExpired(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return exp <= now
}

/**
 * Validate session data
 *
 * Checks for required fields and expiry
 *
 * @param session - Session data to validate
 * @returns Validation result with error message if invalid
 */
export function validateSession(session: SessionData): ValidationResult {
  // Check if session exists
  if (!session || typeof session !== 'object') {
    return {
      valid: false,
      error: 'Session data is missing or invalid'
    }
  }

  // Check required fields
  if (!session.user_id || typeof session.user_id !== 'string') {
    return {
      valid: false,
      error: 'user_id is missing or invalid'
    }
  }

  if (!session.user_id.trim()) {
    return {
      valid: false,
      error: 'user_id cannot be empty'
    }
  }

  if (!session.email || typeof session.email !== 'string') {
    return {
      valid: false,
      error: 'email is missing or invalid'
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(session.email)) {
    return {
      valid: false,
      error: 'email format is invalid'
    }
  }

  if (!session.exp || typeof session.exp !== 'number') {
    return {
      valid: false,
      error: 'exp (expiry) is missing or invalid'
    }
  }

  if (!session.iat || typeof session.iat !== 'number') {
    return {
      valid: false,
      error: 'iat (issued at) is missing or invalid'
    }
  }

  // Check if iat is not in the future
  const now = Math.floor(Date.now() / 1000)
  if (session.iat > now + 60) {
    // Allow 60s clock skew
    return {
      valid: false,
      error: 'iat (issued at) is in the future'
    }
  }

  // Check if session is expired
  if (isSessionExpired(session.exp)) {
    return {
      valid: false,
      error: 'Session has expired'
    }
  }

  // Validate role
  if (!session.role) {
    return {
      valid: false,
      error: 'role is missing'
    }
  }

  const validRoles = ['authenticated', 'anon', 'service_role']
  if (!validRoles.includes(session.role)) {
    return {
      valid: false,
      error: `role '${session.role}' is invalid`
    }
  }

  return { valid: true }
}

/**
 * Determine if token should be refreshed
 *
 * Tokens should be refreshed when:
 * - Less than 5 minutes until expiry
 * - Already expired
 *
 * @param exp - Expiry timestamp (Unix seconds)
 * @returns true if refresh recommended
 */
export function shouldRefreshToken(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const secondsUntilExpiry = exp - now

  // Refresh if < 5 minutes until expiry or already expired
  const REFRESH_THRESHOLD = 5 * 60 // 5 minutes
  return secondsUntilExpiry < REFRESH_THRESHOLD
}

/**
 * Get session expiry information
 *
 * @param exp - Expiry timestamp (Unix seconds)
 * @returns Expiry info including time until expiry and formatted string
 */
export function getSessionExpiry(exp: number): ExpiryInfo {
  const now = Math.floor(Date.now() / 1000)
  const secondsUntilExpiry = exp - now
  const expired = secondsUntilExpiry <= 0

  // Format expiry time
  let formatted: string

  if (expired) {
    const secondsSinceExpiry = Math.abs(secondsUntilExpiry)
    const minutesAgo = Math.floor(secondsSinceExpiry / 60)
    const hoursAgo = Math.floor(minutesAgo / 60)

    if (hoursAgo > 0) {
      formatted = `Expired ${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
    } else if (minutesAgo > 0) {
      formatted = `Expired ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
    } else {
      formatted = 'Expired just now'
    }
  } else {
    const minutes = Math.floor(secondsUntilExpiry / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      const remainingHours = hours % 24
      formatted = `Expires in ${days} day${days !== 1 ? 's' : ''}`
      if (remainingHours > 0) {
        formatted += ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
      }
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60
      formatted = `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`
      if (remainingMinutes > 0) {
        formatted += ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
      }
    } else {
      formatted = `Expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
  }

  return {
    secondsUntilExpiry,
    expired,
    formatted
  }
}

/**
 * Create session cookie string
 *
 * Generates Set-Cookie header value with security attributes
 *
 * @param sessionData - Session data to encode in cookie
 * @returns Cookie string for Set-Cookie header
 */
export function createSessionCookie(sessionData: SessionData): string {
  // Encode session data as base64
  const value = Buffer.from(JSON.stringify(sessionData)).toString('base64')

  // Calculate Max-Age from exp
  const now = Math.floor(Date.now() / 1000)
  const maxAge = Math.max(0, sessionData.exp - now)

  // Build cookie string with security attributes
  const cookieParts = [
    `sb-access-token=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ]

  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure')
  }

  return cookieParts.join('; ')
}

/**
 * Create cookie clear instruction
 *
 * Generates Set-Cookie header value to clear session cookie
 *
 * @returns Cookie string to clear session
 */
export function clearSessionCookie(): string {
  return [
    'sb-access-token=',
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ].join('; ')
}

/**
 * Extract session from cookie header
 *
 * @param cookieHeader - Cookie header string
 * @returns Parsed session data or null
 */
export function extractSessionFromCookie(cookieHeader: string): SessionData | null {
  try {
    // Parse cookie header
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const token = cookies['sb-access-token']

    if (!token) {
      return null
    }

    // Decode base64
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    return JSON.parse(decoded) as SessionData
  } catch (error) {
    console.error('Extract session from cookie error:', error)
    return null
  }
}

/**
 * Calculate session duration in seconds
 *
 * Returns the configured session duration (24 hours)
 *
 * @returns Session duration in seconds (86400 = 24 hours)
 */
export function getSessionDuration(): number {
  // 24 hours in seconds (as per requirements)
  return 24 * 60 * 60 // 86400
}

/**
 * Check if session is within refresh window
 *
 * Returns true if session should be proactively refreshed
 *
 * @param exp - Expiry timestamp
 * @returns true if within refresh window
 */
export function isWithinRefreshWindow(exp: number): boolean {
  return shouldRefreshToken(exp)
}

/**
 * Validate session security
 *
 * Performs security checks on session data
 *
 * @param session - Session to validate
 * @returns Validation result with security concerns
 */
export function validateSessionSecurity(session: SessionData): ValidationResult {
  // First validate basic session structure
  const basicValidation = validateSession(session)

  if (!basicValidation.valid) {
    return basicValidation
  }

  // Additional security checks
  const now = Math.floor(Date.now() / 1000)

  // Check if session duration is reasonable (not > 30 days)
  const sessionDuration = session.exp - session.iat
  const MAX_DURATION = 30 * 24 * 60 * 60 // 30 days

  if (sessionDuration > MAX_DURATION) {
    return {
      valid: false,
      error: 'Session duration exceeds maximum allowed (30 days)'
    }
  }

  // Check if exp and iat are reasonable dates (not too far in past/future)
  const MAX_TIMESTAMP = now + (365 * 24 * 60 * 60) // 1 year in future
  const MIN_TIMESTAMP = now - (365 * 24 * 60 * 60) // 1 year in past

  if (session.exp > MAX_TIMESTAMP || session.iat < MIN_TIMESTAMP) {
    return {
      valid: false,
      error: 'Session timestamps are unreasonable'
    }
  }

  return { valid: true }
}
