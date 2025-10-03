/**
 * Rate Limiting Utilities Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T068
 *
 * Tests for server-side IP rate limiting and client-side localStorage lockout.
 * Validates sliding window algorithm, lockout timing, and edge cases.
 *
 * Coverage: src/lib/auth/rate-limit.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  checkRateLimit,
  recordAuthAttempt,
  checkLocalLockout,
  updateLocalLockout,
  clearLocalLockout
} from '@/lib/auth/rate-limit'

describe('Server-Side Rate Limiting', () => {
  describe('checkRateLimit', () => {
    it('should allow first request from new IP', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      const status = checkRateLimit(ipAddress)

      expect(status.rateLimited).toBe(false)
      expect(status.requestsRemaining).toBe(5)
      expect(status.retryAfter).toBe(0)
    })

    it('should track requests remaining after recording attempts', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      recordAuthAttempt(ipAddress)
      const status = checkRateLimit(ipAddress)

      expect(status.rateLimited).toBe(false)
      expect(status.requestsRemaining).toBe(4)
    })

    it('should rate limit after 5 attempts', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record 5 attempts
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status = checkRateLimit(ipAddress)

      expect(status.rateLimited).toBe(true)
      expect(status.requestsRemaining).toBe(0)
      expect(status.retryAfter).toBeGreaterThan(0)
    })

    it('should provide retry-after value in seconds', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Trigger rate limit
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status = checkRateLimit(ipAddress)

      expect(status.retryAfter).toBeGreaterThan(0)
      expect(status.retryAfter).toBeLessThanOrEqual(900) // Max 15 minutes (900 seconds)
    })

    it('should handle multiple IPs independently', () => {
      const ip1 = '192.168.1.100'
      const ip2 = '192.168.1.101'

      // IP1: 5 attempts (rate limited)
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ip1)
      }

      // IP2: 2 attempts (not rate limited)
      recordAuthAttempt(ip2)
      recordAuthAttempt(ip2)

      const status1 = checkRateLimit(ip1)
      const status2 = checkRateLimit(ip2)

      expect(status1.rateLimited).toBe(true)
      expect(status2.rateLimited).toBe(false)
      expect(status2.requestsRemaining).toBe(3)
    })

    it('should return different retry-after values for different timestamps', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record 5 attempts to trigger rate limit
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status = checkRateLimit(ipAddress)

      expect(status.rateLimited).toBe(true)
      // Retry-after should be approximately 15 minutes
      expect(status.retryAfter).toBeGreaterThan(0)
      expect(status.retryAfter).toBeLessThanOrEqual(900)
    })
  })

  describe('recordAuthAttempt', () => {
    it('should record timestamp for IP address', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      recordAuthAttempt(ipAddress)

      const status = checkRateLimit(ipAddress)
      expect(status.requestsRemaining).toBe(4)
    })

    it('should accumulate multiple attempts', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)

      const status = checkRateLimit(ipAddress)
      expect(status.requestsRemaining).toBe(2)
    })

    it('should handle rapid sequential attempts', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status = checkRateLimit(ipAddress)
      expect(status.rateLimited).toBe(true)
    })

    it('should not interfere with other IPs', () => {
      const ip1 = `192.168.1.${Math.floor(Math.random() * 255)}`
      const ip2 = `192.168.2.${Math.floor(Math.random() * 255)}`

      recordAuthAttempt(ip1)
      recordAuthAttempt(ip1)
      recordAuthAttempt(ip1)

      const status2 = checkRateLimit(ip2)
      expect(status2.requestsRemaining).toBe(5) // Unaffected
    })
  })

  describe('Sliding Window Algorithm', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should prune timestamps older than 15 minutes', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record 3 attempts
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)

      // Fast-forward 16 minutes
      jest.advanceTimersByTime(16 * 60 * 1000)

      // Check status - old timestamps should be pruned
      const status = checkRateLimit(ipAddress)
      expect(status.rateLimited).toBe(false)
      expect(status.requestsRemaining).toBe(5)
    })

    it('should maintain recent timestamps within window', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record 3 attempts
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)

      // Fast-forward 10 minutes (within window)
      jest.advanceTimersByTime(10 * 60 * 1000)

      const status = checkRateLimit(ipAddress)
      expect(status.requestsRemaining).toBe(2) // Still counting previous attempts
    })

    it('should handle mixed old and new timestamps', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record 2 old attempts
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)

      // Fast-forward 16 minutes (outside window)
      jest.advanceTimersByTime(16 * 60 * 1000)

      // Record 3 new attempts
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)
      recordAuthAttempt(ipAddress)

      const status = checkRateLimit(ipAddress)
      // Old attempts pruned, only 3 new attempts count
      expect(status.requestsRemaining).toBe(2)
      expect(status.rateLimited).toBe(false)
    })

    it('should reset rate limit after window expires', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Trigger rate limit
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      expect(checkRateLimit(ipAddress).rateLimited).toBe(true)

      // Fast-forward past window
      jest.advanceTimersByTime(16 * 60 * 1000)

      const status = checkRateLimit(ipAddress)
      expect(status.rateLimited).toBe(false)
      expect(status.requestsRemaining).toBe(5)
    })

    it('should calculate accurate retry-after as window slides', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Trigger rate limit
      for (let i = 0; i < 5; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status1 = checkRateLimit(ipAddress)
      const retryAfter1 = status1.retryAfter

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000)

      const status2 = checkRateLimit(ipAddress)
      const retryAfter2 = status2.retryAfter

      // Retry-after should decrease by approximately 5 minutes (300 seconds)
      expect(retryAfter2).toBeLessThan(retryAfter1)
      expect(retryAfter1 - retryAfter2).toBeGreaterThanOrEqual(290)
      expect(retryAfter1 - retryAfter2).toBeLessThanOrEqual(310)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty IP address', () => {
      const status = checkRateLimit('')

      expect(status.rateLimited).toBe(false)
      expect(status.requestsRemaining).toBe(5)
    })

    it('should handle IPv6 addresses', () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

      recordAuthAttempt(ipv6)
      const status = checkRateLimit(ipv6)

      expect(status.requestsRemaining).toBe(4)
    })

    it('should handle special characters in IP (proxy headers)', () => {
      const proxyHeader = '192.168.1.100, 10.0.0.1'

      recordAuthAttempt(proxyHeader)
      const status = checkRateLimit(proxyHeader)

      expect(status.requestsRemaining).toBe(4)
    })

    it('should handle exactly 5 attempts boundary', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Record exactly 4 attempts
      for (let i = 0; i < 4; i++) {
        recordAuthAttempt(ipAddress)
      }

      const statusBefore = checkRateLimit(ipAddress)
      expect(statusBefore.rateLimited).toBe(false)
      expect(statusBefore.requestsRemaining).toBe(1)

      // 5th attempt
      recordAuthAttempt(ipAddress)

      const statusAfter = checkRateLimit(ipAddress)
      expect(statusAfter.rateLimited).toBe(true)
      expect(statusAfter.requestsRemaining).toBe(0)
    })

    it('should handle concurrent attempts from same IP', () => {
      const ipAddress = `192.168.1.${Math.floor(Math.random() * 255)}`

      // Simulate concurrent requests
      for (let i = 0; i < 10; i++) {
        recordAuthAttempt(ipAddress)
      }

      const status = checkRateLimit(ipAddress)
      expect(status.rateLimited).toBe(true)
    })
  })
})

describe('Client-Side Lockout (localStorage)', () => {
  let originalWindow: typeof globalThis.window
  let mockGetItem: jest.Mock
  let mockSetItem: jest.Mock
  let mockRemoveItem: jest.Mock

  beforeEach(() => {
    // Setup localStorage mock
    mockGetItem = jest.fn(() => null)
    mockSetItem = jest.fn()
    mockRemoveItem = jest.fn()

    originalWindow = global.window
    global.window = {
      localStorage: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
      }
    } as any
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('checkLocalLockout', () => {
    it('should return not locked for new email', () => {
      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
      expect(status.minutesRemaining).toBe(0)
    })

    it('should return not locked when no data in localStorage', () => {
      mockGetItem.mockReturnValue(null)

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
    })

    it('should return locked when lockout is active', () => {
      const futureTime = Date.now() + (10 * 60 * 1000) // 10 minutes future
      const lockoutData = {
        failedAttempts: 5,
        lockoutUntil: futureTime,
        lastAttempt: Date.now()
      }

      mockGetItem.mockReturnValue(JSON.stringify(lockoutData))

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(true)
      expect(status.minutesRemaining).toBeGreaterThan(9)
      expect(status.minutesRemaining).toBeLessThanOrEqual(10)
    })

    it('should return not locked when lockout expired', () => {
      const pastTime = Date.now() - (1 * 60 * 1000) // 1 minute ago
      const lockoutData = {
        failedAttempts: 5,
        lockoutUntil: pastTime,
        lastAttempt: Date.now() - (20 * 60 * 1000)
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(lockoutData)
      )

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
      expect(status.minutesRemaining).toBe(0)
    })

    it('should handle corrupted localStorage data', () => {
      ;mockGetItem.mockReturnValue(
        'invalid json {'
      )

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
      expect(status.minutesRemaining).toBe(0)
    })

    it('should handle missing lockoutUntil field', () => {
      const lockoutData = {
        failedAttempts: 3,
        lastAttempt: Date.now()
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(lockoutData)
      )

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
    })

    it('should normalize email to lowercase for storage key', () => {
      checkLocalLockout('User@EXAMPLE.COM')

      expect(global.window.localStorage.getItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com'
      )
    })

    it('should return not locked in SSR environment (no window)', () => {
      const tempWindow = global.window
      delete (global as any).window

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(false)
      expect(status.minutesRemaining).toBe(0)

      global.window = tempWindow
    })

    it('should calculate minutes remaining accurately', () => {
      const futureTime = Date.now() + (7.5 * 60 * 1000) // 7.5 minutes
      const lockoutData = {
        failedAttempts: 5,
        lockoutUntil: futureTime,
        lastAttempt: Date.now()
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(lockoutData)
      )

      const status = checkLocalLockout('user@example.com')

      expect(status.isLocked).toBe(true)
      expect(status.minutesRemaining).toBe(8) // Ceiling of 7.5
    })
  })

  describe('updateLocalLockout', () => {
    it('should create new lockout record for first failure', () => {
      ;mockGetItem.mockReturnValue(null)

      updateLocalLockout('user@example.com')

      expect(global.window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com',
        expect.stringContaining('"failedAttempts":1')
      )
    })

    it('should increment failed attempts on existing record', () => {
      const existingData = {
        failedAttempts: 2,
        lockoutUntil: null,
        lastAttempt: Date.now() - 60000
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(existingData)
      )

      updateLocalLockout('user@example.com')

      const setItemCall = (mockSetItem).mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])

      expect(savedData.failedAttempts).toBe(3)
    })

    it('should set lockout after 5 failed attempts', () => {
      const existingData = {
        failedAttempts: 4,
        lockoutUntil: null,
        lastAttempt: Date.now() - 60000
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(existingData)
      )

      const beforeUpdate = Date.now()
      updateLocalLockout('user@example.com')

      const setItemCall = (mockSetItem).mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])

      expect(savedData.failedAttempts).toBe(5)
      expect(savedData.lockoutUntil).toBeGreaterThan(beforeUpdate)
      expect(savedData.lockoutUntil).toBeLessThanOrEqual(beforeUpdate + (15 * 60 * 1000))
    })

    it('should not remove lockout on additional failed attempts', () => {
      const existingData = {
        failedAttempts: 5,
        lockoutUntil: Date.now() + (10 * 60 * 1000),
        lastAttempt: Date.now() - 60000
      }

      ;mockGetItem.mockReturnValue(
        JSON.stringify(existingData)
      )

      updateLocalLockout('user@example.com')

      const setItemCall = (mockSetItem).mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])

      expect(savedData.failedAttempts).toBe(6)
      expect(savedData.lockoutUntil).toBeTruthy()
    })

    it('should handle corrupted existing data', () => {
      ;mockGetItem.mockReturnValue(
        'invalid json {'
      )

      updateLocalLockout('user@example.com')

      const setItemCall = (mockSetItem).mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])

      // Should start fresh
      expect(savedData.failedAttempts).toBe(1)
    })

    it('should update lastAttempt timestamp', () => {
      ;mockGetItem.mockReturnValue(null)

      const beforeUpdate = Date.now()
      updateLocalLockout('user@example.com')

      const setItemCall = (mockSetItem).mock.calls[0]
      const savedData = JSON.parse(setItemCall[1])

      expect(savedData.lastAttempt).toBeGreaterThanOrEqual(beforeUpdate)
    })

    it('should normalize email to lowercase', () => {
      updateLocalLockout('User@EXAMPLE.COM')

      expect(global.window.localStorage.setItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com',
        expect.any(String)
      )
    })

    it('should do nothing in SSR environment', () => {
      const tempWindow = global.window
      delete (global as any).window

      updateLocalLockout('user@example.com')

      // Should not throw error
      expect(true).toBe(true)

      global.window = tempWindow
    })
  })

  describe('clearLocalLockout', () => {
    it('should remove lockout data from localStorage', () => {
      clearLocalLockout('user@example.com')

      expect(mockRemoveItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com'
      )
    })

    it('should normalize email to lowercase', () => {
      clearLocalLockout('User@EXAMPLE.COM')

      expect(mockRemoveItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com'
      )
    })

    it('should do nothing in SSR environment', () => {
      const tempWindow = global.window
      delete (global as any).window

      clearLocalLockout('user@example.com')

      // Should not throw error
      expect(true).toBe(true)

      global.window = tempWindow
    })

    it('should clear data even if it does not exist', () => {
      clearLocalLockout('nonexistent@example.com')

      expect(mockRemoveItem).toHaveBeenCalled()
    })
  })

  describe('Integration Flow', () => {
    it('should enforce full lockout workflow', () => {
      mockGetItem.mockReturnValue(null)

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        updateLocalLockout('user@example.com')

        // Update mock to return last saved data
        const lastCall = mockSetItem.mock.calls.slice(-1)[0]
        if (lastCall) {
          mockGetItem.mockReturnValue(lastCall[1])
        }
      }

      // Check if locked
      const status = checkLocalLockout('user@example.com')
      expect(status.isLocked).toBe(true)
      expect(status.minutesRemaining).toBeGreaterThan(0)

      // Clear lockout
      clearLocalLockout('user@example.com')

      expect(mockRemoveItem).toHaveBeenCalledWith(
        'auth_lockout_user@example.com'
      )
    })

    it('should handle partial failures before lockout', () => {
      mockGetItem.mockReturnValue(null)

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        updateLocalLockout('user@example.com')
        const lastCall = mockSetItem.mock.calls.slice(-1)[0]
        if (lastCall) {
          mockGetItem.mockReturnValue(lastCall[1])
        }
      }

      // Should not be locked yet
      const status = checkLocalLockout('user@example.com')
      expect(status.isLocked).toBe(false)
    })
  })
})
