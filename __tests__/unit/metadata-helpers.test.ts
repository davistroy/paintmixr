/**
 * Server-side Metadata Helper Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T068
 *
 * Tests for lockout metadata management functions that operate on
 * auth.users.raw_user_meta_data via Supabase Admin API.
 *
 * Coverage: src/lib/auth/metadata-helpers.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getLockoutMetadata,
  isUserLockedOut,
  incrementFailedAttempts,
  clearLockout,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  type LockoutMetadata
} from '@/lib/auth/metadata-helpers'

// Mock user interface
interface MockUser {
  id: string
  email?: string
  raw_user_meta_data?: Record<string, unknown>
}

describe('Metadata Helpers - Server-side Lockout Management', () => {
  describe('getLockoutMetadata', () => {
    it('should return default metadata when raw_user_meta_data is missing', () => {
      const user: MockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata).toEqual({
        failed_login_attempts: 0,
        lockout_until: null,
        last_failed_attempt: null
      })
    })

    it('should return default metadata when raw_user_meta_data is null', () => {
      const user: MockUser = {
        id: 'user-123',
        email: 'test@example.com',
        raw_user_meta_data: null as any
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata).toEqual({
        failed_login_attempts: 0,
        lockout_until: null,
        last_failed_attempt: null
      })
    })

    it('should extract valid lockout metadata from user object', () => {
      const lockoutUntil = new Date(Date.now() + 900000).toISOString() // 15 min future
      const lastAttempt = new Date().toISOString()

      const user: MockUser = {
        id: 'user-123',
        email: 'test@example.com',
        raw_user_meta_data: {
          failed_login_attempts: 3,
          lockout_until: lockoutUntil,
          last_failed_attempt: lastAttempt
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.failed_login_attempts).toBe(3)
      expect(metadata.lockout_until).toBe(lockoutUntil)
      expect(metadata.last_failed_attempt).toBe(lastAttempt)
    })

    it('should handle missing failed_login_attempts field', () => {
      const user: MockUser = {
        id: 'user-123',
        raw_user_meta_data: {
          lockout_until: null,
          last_failed_attempt: null
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.failed_login_attempts).toBe(0)
    })

    it('should handle non-numeric failed_login_attempts', () => {
      const user: MockUser = {
        id: 'user-123',
        raw_user_meta_data: {
          failed_login_attempts: 'invalid' as any
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.failed_login_attempts).toBe(0)
    })

    it('should handle non-string lockout_until value', () => {
      const user: MockUser = {
        id: 'user-123',
        raw_user_meta_data: {
          failed_login_attempts: 2,
          lockout_until: 12345 as any
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.lockout_until).toBeNull()
    })

    it('should ensure failed attempts is never negative', () => {
      const user: MockUser = {
        id: 'user-123',
        raw_user_meta_data: {
          failed_login_attempts: -5
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.failed_login_attempts).toBe(0)
    })

    it('should handle complex metadata objects with extra fields', () => {
      const user: MockUser = {
        id: 'user-123',
        raw_user_meta_data: {
          failed_login_attempts: 1,
          lockout_until: null,
          last_failed_attempt: new Date().toISOString(),
          custom_field: 'value',
          another_field: 123
        }
      }

      const metadata = getLockoutMetadata(user)

      expect(metadata.failed_login_attempts).toBe(1)
      expect(metadata.lockout_until).toBeNull()
      expect(metadata.last_failed_attempt).toBeTruthy()
    })
  })

  describe('isUserLockedOut', () => {
    it('should return unlocked when lockout_until is null', () => {
      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: null,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })

    it('should return locked when lockout_until is in future', () => {
      const lockoutUntil = new Date(Date.now() + 600000).toISOString() // 10 min future

      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(true)
      expect(result.remainingSeconds).toBeGreaterThan(590) // ~10 minutes
      expect(result.remainingSeconds).toBeLessThanOrEqual(600)
    })

    it('should return unlocked when lockout_until has expired', () => {
      const lockoutUntil = new Date(Date.now() - 60000).toISOString() // 1 min past

      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })

    it('should handle invalid date format in lockout_until', () => {
      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: 'invalid-date-format',
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })

    it('should calculate remaining seconds accurately', () => {
      const lockoutUntil = new Date(Date.now() + 300000).toISOString() // 5 min future

      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(true)
      expect(result.remainingSeconds).toBeGreaterThan(295)
      expect(result.remainingSeconds).toBeLessThanOrEqual(300)
    })

    it('should round up remaining seconds to nearest second', () => {
      const lockoutUntil = new Date(Date.now() + 1500).toISOString() // 1.5 seconds

      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      expect(result.locked).toBe(true)
      expect(result.remainingSeconds).toBe(2) // Rounded up
    })

    it('should handle lockout_until exactly at current time', () => {
      const lockoutUntil = new Date().toISOString()

      const metadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }

      const result = isUserLockedOut(metadata)

      // Should be unlocked as we've reached the lockout time
      expect(result.locked).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })
  })

  describe('incrementFailedAttempts', () => {
    let mockAdminClient: jest.Mocked<SupabaseClient>

    beforeEach(() => {
      // Create mock Supabase Admin client
      mockAdminClient = {
        rpc: jest.fn(),
        auth: {
          admin: {
            updateUserById: jest.fn()
          }
        }
      } as any
    })

    it('should increment attempts below threshold without lockout', async () => {
      const userId = 'user-123'
      const newCount = 3

      // Mock RPC call to increment_failed_login_attempts
      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: { new_attempt_count: newCount },
        error: null
      })

      // Mock updateUserById
      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await incrementFailedAttempts(userId, mockAdminClient)

      expect(result.newCount).toBe(newCount)
      expect(result.lockoutUntil).toBeNull()

      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'increment_failed_login_attempts',
        { user_id: userId }
      )

      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            failed_login_attempts: newCount,
            last_failed_attempt: expect.any(String)
          })
        })
      )
    })

    it('should set lockout when reaching MAX_FAILED_ATTEMPTS', async () => {
      const userId = 'user-123'
      const newCount = MAX_FAILED_ATTEMPTS

      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: { new_attempt_count: newCount },
        error: null
      })

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      const beforeCall = Date.now()
      const result = await incrementFailedAttempts(userId, mockAdminClient)
      const afterCall = Date.now()

      expect(result.newCount).toBe(newCount)
      expect(result.lockoutUntil).not.toBeNull()

      // Verify lockout duration is 15 minutes
      const lockoutTime = new Date(result.lockoutUntil!).getTime()
      const expectedLockoutMin = beforeCall + (LOCKOUT_DURATION_MINUTES * 60 * 1000)
      const expectedLockoutMax = afterCall + (LOCKOUT_DURATION_MINUTES * 60 * 1000)

      expect(lockoutTime).toBeGreaterThanOrEqual(expectedLockoutMin)
      expect(lockoutTime).toBeLessThanOrEqual(expectedLockoutMax)

      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            failed_login_attempts: newCount,
            lockout_until: expect.any(String),
            last_failed_attempt: expect.any(String)
          })
        })
      )
    })

    it('should set lockout when exceeding MAX_FAILED_ATTEMPTS', async () => {
      const userId = 'user-123'
      const newCount = 6

      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: { new_attempt_count: newCount },
        error: null
      })

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await incrementFailedAttempts(userId, mockAdminClient)

      expect(result.newCount).toBe(newCount)
      expect(result.lockoutUntil).not.toBeNull()
    })

    it('should throw error when RPC call fails', async () => {
      const userId = 'user-123'

      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(incrementFailedAttempts(userId, mockAdminClient)).rejects.toThrow(
        'Failed to increment attempts: Database error'
      )
    })

    it('should throw error when updateUserById fails', async () => {
      const userId = 'user-123'

      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: { new_attempt_count: 3 },
        error: null
      })

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      await expect(incrementFailedAttempts(userId, mockAdminClient)).rejects.toThrow(
        'Failed to update metadata: Update failed'
      )
    })

    it('should handle array response from RPC function', async () => {
      const userId = 'user-123'
      const newCount = 2

      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: [{ new_attempt_count: newCount }],
        error: null
      })

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await incrementFailedAttempts(userId, mockAdminClient)

      expect(result.newCount).toBe(newCount)
    })
  })

  describe('clearLockout', () => {
    let mockAdminClient: jest.Mocked<SupabaseClient>

    beforeEach(() => {
      mockAdminClient = {
        auth: {
          admin: {
            updateUserById: jest.fn()
          }
        }
      } as any
    })

    it('should clear all lockout metadata fields', async () => {
      const userId = 'user-123'

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      await clearLockout(userId, mockAdminClient)

      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        userId,
        {
          user_metadata: {
            failed_login_attempts: 0,
            lockout_until: null,
            last_failed_attempt: null
          }
        }
      )
    })

    it('should throw error when updateUserById fails', async () => {
      const userId = 'user-123'

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Clear failed' }
      })

      await expect(clearLockout(userId, mockAdminClient)).rejects.toThrow(
        'Failed to clear lockout: Clear failed'
      )
    })

    it('should successfully clear lockout on successful login', async () => {
      const userId = 'user-123'

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: userId } },
        error: null
      })

      await expect(clearLockout(userId, mockAdminClient)).resolves.not.toThrow()
    })
  })

  describe('Integration Scenarios', () => {
    let mockAdminClient: jest.Mocked<SupabaseClient>

    beforeEach(() => {
      mockAdminClient = {
        rpc: jest.fn(),
        auth: {
          admin: {
            updateUserById: jest.fn()
          }
        }
      } as any
    })

    it('should enforce lockout workflow: 4 attempts → 5th triggers lockout', async () => {
      const userId = 'user-123'

      // First 4 attempts
      for (let i = 1; i <= 4; i++) {
        ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
          data: { new_attempt_count: i },
          error: null
        })

        ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
          data: null,
          error: null
        })

        const result = await incrementFailedAttempts(userId, mockAdminClient)

        expect(result.newCount).toBe(i)
        expect(result.lockoutUntil).toBeNull()
      }

      // 5th attempt triggers lockout
      ;(mockAdminClient.rpc as jest.Mock).mockResolvedValueOnce({
        data: { new_attempt_count: 5 },
        error: null
      })

      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await incrementFailedAttempts(userId, mockAdminClient)

      expect(result.newCount).toBe(5)
      expect(result.lockoutUntil).not.toBeNull()
    })

    it('should allow clearing lockout after successful authentication', async () => {
      const userId = 'user-123'

      // Simulate locked state
      const lockoutMetadata: LockoutMetadata = {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + 900000).toISOString(),
        last_failed_attempt: new Date().toISOString()
      }

      expect(isUserLockedOut(lockoutMetadata).locked).toBe(true)

      // Clear lockout
      ;(mockAdminClient.auth.admin.updateUserById as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: null
      })

      await clearLockout(userId, mockAdminClient)

      // Verify cleared metadata
      expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          user_metadata: {
            failed_login_attempts: 0,
            lockout_until: null,
            last_failed_attempt: null
          }
        })
      )
    })
  })
})
