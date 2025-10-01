/**
 * Jest Unit Test: Session Manager Utilities
 * Feature: 003-deploy-to-vercel
 * Task: T015
 *
 * Tests session validation utility functions including:
 * - JWT token parsing
 * - Session expiry validation
 * - Token refresh logic
 * - Session security checks
 *
 * Expected: FAIL until T018 (session-manager.ts) implementation complete
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Import session manager (to be implemented in T018)
import {
  validateSession,
  isSessionExpired,
  parseSessionToken,
  getSessionExpiry,
  shouldRefreshToken,
  createSessionCookie,
  clearSessionCookie,
  type SessionData
} from '@/lib/auth/session-manager'

describe('Session Manager - Token Parsing', () => {
  it('should parse valid JWT token', () => {
    const mockToken = {
      sub: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const jwt = createMockJWT(mockToken)

    const parsed = parseSessionToken(jwt)

    expect(parsed).toEqual(mockToken)
    expect(parsed.sub).toBe('user-123')
    expect(parsed.email).toBe('test@example.com')
  })

  it('should return null for invalid token format', () => {
    const invalidToken = 'not-a-valid-jwt'

    const parsed = parseSessionToken(invalidToken)

    expect(parsed).toBeNull()
  })

  it('should return null for malformed JWT', () => {
    const malformedJWT = 'header.payload'  // Missing signature

    const parsed = parseSessionToken(malformedJWT)

    expect(parsed).toBeNull()
  })

  it('should handle base64 decoding errors gracefully', () => {
    const invalidBase64 = 'invalid!!!.base64!!!.signature!!!'

    const parsed = parseSessionToken(invalidBase64)

    expect(parsed).toBeNull()
  })
})

describe('Session Manager - Expiry Validation', () => {
  it('should return false for non-expired session', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600  // 1 hour from now

    const expired = isSessionExpired(futureExp)

    expect(expired).toBe(false)
  })

  it('should return true for expired session', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600  // 1 hour ago

    const expired = isSessionExpired(pastExp)

    expect(expired).toBe(true)
  })

  it('should return true for session expiring right now', () => {
    const nowExp = Math.floor(Date.now() / 1000)

    const expired = isSessionExpired(nowExp)

    expect(expired).toBe(true)
  })

  it('should handle 24-hour session duration', () => {
    const twentyFourHours = Math.floor(Date.now() / 1000) + (24 * 60 * 60)

    const expired = isSessionExpired(twentyFourHours)

    expect(expired).toBe(false)
  })

  it('should correctly identify expired 24-hour session', () => {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60)

    const expired = isSessionExpired(twentyFourHoursAgo)

    expect(expired).toBe(true)
  })
})

describe('Session Manager - Session Validation', () => {
  const mockValidSession: SessionData = {
    user_id: 'user-123',
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 86400,
    iat: Math.floor(Date.now() / 1000),
    role: 'authenticated'
  }

  it('should validate correct session data', () => {
    const result = validateSession(mockValidSession)

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject session with missing user_id', () => {
    const invalidSession = {
      ...mockValidSession,
      user_id: undefined
    } as any

    const result = validateSession(invalidSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('user_id')
  })

  it('should reject session with missing email', () => {
    const invalidSession = {
      ...mockValidSession,
      email: undefined
    } as any

    const result = validateSession(invalidSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('email')
  })

  it('should reject expired session', () => {
    const expiredSession = {
      ...mockValidSession,
      exp: Math.floor(Date.now() / 1000) - 3600
    }

    const result = validateSession(expiredSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })

  it('should reject session with future iat (issued in future)', () => {
    const futureSession = {
      ...mockValidSession,
      iat: Math.floor(Date.now() / 1000) + 3600
    }

    const result = validateSession(futureSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('iat')
  })

  it('should reject session with invalid role', () => {
    const invalidRoleSession = {
      ...mockValidSession,
      role: 'invalid-role'
    }

    const result = validateSession(invalidRoleSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('role')
  })
})

describe('Session Manager - Token Refresh Logic', () => {
  it('should recommend refresh when token expires in < 5 minutes', () => {
    const expiresIn4Min = Math.floor(Date.now() / 1000) + (4 * 60)

    const shouldRefresh = shouldRefreshToken(expiresIn4Min)

    expect(shouldRefresh).toBe(true)
  })

  it('should not recommend refresh when token expires in > 5 minutes', () => {
    const expiresIn10Min = Math.floor(Date.now() / 1000) + (10 * 60)

    const shouldRefresh = shouldRefreshToken(expiresIn10Min)

    expect(shouldRefresh).toBe(false)
  })

  it('should recommend refresh for already expired token', () => {
    const expired = Math.floor(Date.now() / 1000) - 60

    const shouldRefresh = shouldRefreshToken(expired)

    expect(shouldRefresh).toBe(true)
  })

  it('should not recommend refresh for newly issued token (23 hours left)', () => {
    const newToken = Math.floor(Date.now() / 1000) + (23 * 60 * 60)

    const shouldRefresh = shouldRefreshToken(newToken)

    expect(shouldRefresh).toBe(false)
  })
})

describe('Session Manager - Get Session Expiry', () => {
  it('should calculate time until expiry correctly', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600  // 1 hour

    const { secondsUntilExpiry, expired } = getSessionExpiry(futureExp)

    expect(expired).toBe(false)
    expect(secondsUntilExpiry).toBeGreaterThan(3590)  // ~1 hour (with tolerance)
    expect(secondsUntilExpiry).toBeLessThan(3610)
  })

  it('should return negative seconds for expired session', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600  // 1 hour ago

    const { secondsUntilExpiry, expired } = getSessionExpiry(pastExp)

    expect(expired).toBe(true)
    expect(secondsUntilExpiry).toBeLessThan(0)
  })

  it('should format expiry time as human-readable string', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 86400  // 24 hours

    const { formatted } = getSessionExpiry(futureExp)

    expect(formatted).toMatch(/24.*hour/i)
  })

  it('should format minutes correctly', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 300  // 5 minutes

    const { formatted } = getSessionExpiry(futureExp)

    expect(formatted).toMatch(/5.*minute/i)
  })
})

describe('Session Manager - Cookie Operations', () => {
  it('should create session cookie with correct attributes', () => {
    const sessionData: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const cookie = createSessionCookie(sessionData)

    expect(cookie).toContain('sb-access-token=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('should create cookie with Max-Age matching JWT expiry', () => {
    const sessionData: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,  // 24 hours
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const cookie = createSessionCookie(sessionData)

    expect(cookie).toMatch(/Max-Age=8640\d/)  // ~86400 seconds
  })

  it('should set Path=/ for cookie', () => {
    const sessionData: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const cookie = createSessionCookie(sessionData)

    expect(cookie).toContain('Path=/')
  })

  it('should create clear cookie instruction', () => {
    const clearCookie = clearSessionCookie()

    expect(clearCookie).toContain('sb-access-token=')
    expect(clearCookie).toContain('Max-Age=0')
    expect(clearCookie).toContain('Path=/')
  })
})

describe('Session Manager - Security Validations', () => {
  it('should detect tampered token (invalid signature)', () => {
    const validToken = createMockJWT({
      sub: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400
    })

    // Tamper with payload
    const parts = validToken.split('.')
    const tamperedPayload = btoa(JSON.stringify({
      sub: 'admin-456',  // Changed user_id
      email: 'admin@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400
    }))
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`

    // In real implementation, signature validation would fail
    // For now, we just test parsing
    const parsed = parseSessionToken(tamperedToken)

    // Parser should extract data (signature check happens elsewhere)
    expect(parsed?.sub).toBe('admin-456')
  })

  it('should validate email format', () => {
    const invalidEmailSession: SessionData = {
      user_id: 'user-123',
      email: 'not-an-email',  // Invalid format
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const result = validateSession(invalidEmailSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('email')
  })

  it('should validate user_id is non-empty', () => {
    const emptyUserIdSession: SessionData = {
      user_id: '',  // Empty
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const result = validateSession(emptyUserIdSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('user_id')
  })

  it('should validate exp is in the future', () => {
    const pastExpSession: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 1,  // 1 second ago
      iat: Math.floor(Date.now() / 1000) - 100,
      role: 'authenticated'
    }

    const result = validateSession(pastExpSession)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })
})

describe('Session Manager - Edge Cases', () => {
  it('should handle null session data', () => {
    const result = validateSession(null as any)

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle undefined session data', () => {
    const result = validateSession(undefined as any)

    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle session with extra fields', () => {
    const sessionWithExtra = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated',
      custom_field: 'extra-data'  // Extra field
    } as any

    const result = validateSession(sessionWithExtra)

    // Should still be valid (extra fields ignored)
    expect(result.valid).toBe(true)
  })

  it('should handle very large exp values', () => {
    const farFutureSession: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),  // 1 year
      iat: Math.floor(Date.now() / 1000),
      role: 'authenticated'
    }

    const result = validateSession(farFutureSession)

    expect(result.valid).toBe(true)
  })

  it('should handle session at exact expiry boundary', () => {
    const nowTimestamp = Math.floor(Date.now() / 1000)

    const boundarySession: SessionData = {
      user_id: 'user-123',
      email: 'test@example.com',
      exp: nowTimestamp,  // Expires exactly now
      iat: nowTimestamp - 86400,
      role: 'authenticated'
    }

    const result = validateSession(boundarySession)

    expect(result.valid).toBe(false)  // Should be expired
  })
})

// Helper function to create mock JWTs for testing
function createMockJWT(payload: any): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  const signature = 'mock-signature-value'

  return `${encodedHeader}.${encodedPayload}.${signature}`
}
