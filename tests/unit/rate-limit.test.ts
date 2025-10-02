import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  checkLocalLockout,
  updateLocalLockout,
  clearLocalLockout,
} from '@/lib/auth/rate-limit'

describe('Rate Limiting Logic', () => {
  const testEmail = 'test@example.com'
  const lockoutKey = `lockout_${testEmail.toLowerCase()}`

  // Mock localStorage
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // Reset localStorage mock before each test
    localStorageMock = {}

    // Mock localStorage methods
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value
        },
        removeItem: (key: string) => {
          delete localStorageMock[key]
        },
        clear: () => {
          localStorageMock = {}
        },
        key: (index: number) => Object.keys(localStorageMock)[index] || null,
        get length() {
          return Object.keys(localStorageMock).length
        },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Clean up after each test
    localStorageMock = {}
  })

  describe('checkLocalLockout', () => {
    it('should return unlocked state when no lockout data exists', () => {
      const result = checkLocalLockout(testEmail)

      expect(result.isLocked).toBe(false)
      expect(result.minutesRemaining).toBe(0)
    })

    it('should return unlocked state when lockoutUntil is null', () => {
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 3,
        lockoutUntil: null,
      })

      const result = checkLocalLockout(testEmail)

      expect(result.isLocked).toBe(false)
      expect(result.minutesRemaining).toBe(0)
    })

    it('should return locked state when lockout is active', () => {
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 10)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      const result = checkLocalLockout(testEmail)

      expect(result.isLocked).toBe(true)
      expect(result.minutesRemaining).toBeGreaterThan(9)
      expect(result.minutesRemaining).toBeLessThanOrEqual(10)
    })

    it('should return unlocked state and clear data when lockout has expired', () => {
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() - 5) // Expired 5 minutes ago

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      const result = checkLocalLockout(testEmail)

      expect(result.isLocked).toBe(false)
      expect(result.minutesRemaining).toBe(0)
      expect(localStorageMock[lockoutKey]).toBeUndefined()
    })

    it('should handle invalid JSON data gracefully', () => {
      localStorageMock[lockoutKey] = 'invalid-json-data'

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = checkLocalLockout(testEmail)

      expect(result.isLocked).toBe(false)
      expect(result.minutesRemaining).toBe(0)
      expect(localStorageMock[lockoutKey]).toBeUndefined()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse lockout state:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should normalize email to lowercase for lookups', () => {
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 10)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      // Test with uppercase email
      const result = checkLocalLockout('TEST@EXAMPLE.COM')

      expect(result.isLocked).toBe(true)
      expect(result.minutesRemaining).toBeGreaterThan(0)
    })
  })

  describe('updateLocalLockout', () => {
    it('should increment failed attempts without lockout (4 failures)', () => {
      // Simulate 4 failed attempts
      for (let i = 0; i < 4; i++) {
        updateLocalLockout(testEmail)
      }

      const data = JSON.parse(localStorageMock[lockoutKey])

      expect(data.email).toBe(testEmail.toLowerCase())
      expect(data.failedAttempts).toBe(4)
      expect(data.lockoutUntil).toBeNull()
    })

    it('should set lockout on 5th failed attempt', () => {
      const beforeLockout = new Date()

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(testEmail)
      }

      const afterLockout = new Date()
      const data = JSON.parse(localStorageMock[lockoutKey])

      expect(data.email).toBe(testEmail.toLowerCase())
      expect(data.failedAttempts).toBe(5)
      expect(data.lockoutUntil).not.toBeNull()

      const lockoutTime = new Date(data.lockoutUntil)
      const expectedLockoutTime = new Date(beforeLockout)
      expectedLockoutTime.setMinutes(expectedLockoutTime.getMinutes() + 15)

      // Lockout should be approximately 15 minutes from now
      const timeDiff = Math.abs(lockoutTime.getTime() - expectedLockoutTime.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second tolerance
    })

    it('should handle invalid JSON data by starting fresh', () => {
      localStorageMock[lockoutKey] = 'invalid-json-data'

      updateLocalLockout(testEmail)

      const data = JSON.parse(localStorageMock[lockoutKey])

      expect(data.email).toBe(testEmail.toLowerCase())
      expect(data.failedAttempts).toBe(1)
      expect(data.lockoutUntil).toBeNull()
    })

    it('should increment existing failed attempts count', () => {
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 2,
        lockoutUntil: null,
      })

      updateLocalLockout(testEmail)

      const data = JSON.parse(localStorageMock[lockoutKey])

      expect(data.failedAttempts).toBe(3)
      expect(data.lockoutUntil).toBeNull()
    })

    it('should normalize email to lowercase', () => {
      updateLocalLockout('TEST@EXAMPLE.COM')

      const data = JSON.parse(localStorageMock[lockoutKey])

      expect(data.email).toBe('test@example.com')
    })

    it('should maintain lockout duration of exactly 15 minutes', () => {
      const beforeUpdate = new Date()

      // Trigger lockout with 5 attempts
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(testEmail)
      }

      const data = JSON.parse(localStorageMock[lockoutKey])
      const lockoutTime = new Date(data.lockoutUntil)

      const minutesDiff = (lockoutTime.getTime() - beforeUpdate.getTime()) / 60000

      expect(minutesDiff).toBeGreaterThanOrEqual(14.99)
      expect(minutesDiff).toBeLessThanOrEqual(15.01)
    })
  })

  describe('clearLocalLockout', () => {
    it('should clear lockout state on successful signin', () => {
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: new Date(Date.now() + 900000).toISOString(), // 15 min in future
      })

      clearLocalLockout(testEmail)

      expect(localStorageMock[lockoutKey]).toBeUndefined()
    })

    it('should handle clearing non-existent lockout gracefully', () => {
      // Should not throw error
      expect(() => clearLocalLockout(testEmail)).not.toThrow()
      expect(localStorageMock[lockoutKey]).toBeUndefined()
    })

    it('should normalize email to lowercase', () => {
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 3,
        lockoutUntil: null,
      })

      clearLocalLockout('TEST@EXAMPLE.COM')

      expect(localStorageMock[lockoutKey]).toBeUndefined()
    })

    it('should clear lockout with active lockout status', () => {
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 10)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      // Verify lockout is active before clearing
      const beforeClear = checkLocalLockout(testEmail)
      expect(beforeClear.isLocked).toBe(true)

      clearLocalLockout(testEmail)

      // Verify lockout is cleared
      const afterClear = checkLocalLockout(testEmail)
      expect(afterClear.isLocked).toBe(false)
      expect(afterClear.minutesRemaining).toBe(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('should enforce complete lockout workflow: 4 failures → no lockout', () => {
      // Simulate 4 failed attempts
      for (let i = 0; i < 4; i++) {
        updateLocalLockout(testEmail)
        const lockoutStatus = checkLocalLockout(testEmail)
        expect(lockoutStatus.isLocked).toBe(false)
      }
    })

    it('should enforce complete lockout workflow: 5 failures → lockout active', () => {
      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(testEmail)
      }

      const lockoutStatus = checkLocalLockout(testEmail)
      expect(lockoutStatus.isLocked).toBe(true)
      expect(lockoutStatus.minutesRemaining).toBeGreaterThan(14)
      expect(lockoutStatus.minutesRemaining).toBeLessThanOrEqual(15)
    })

    it('should enforce complete lockout workflow: lockout expired → allows attempt', () => {
      // Set expired lockout
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() - 1) // Expired 1 minute ago

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      const lockoutStatus = checkLocalLockout(testEmail)
      expect(lockoutStatus.isLocked).toBe(false)
      expect(lockoutStatus.minutesRemaining).toBe(0)
    })

    it('should enforce complete lockout workflow: lockout active → blocks attempt', () => {
      // Set active lockout
      const lockoutUntil = new Date()
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      const lockoutStatus = checkLocalLockout(testEmail)
      expect(lockoutStatus.isLocked).toBe(true)
      expect(lockoutStatus.minutesRemaining).toBeGreaterThan(0)
    })

    it('should enforce complete lockout workflow: successful signin → clears lockout', () => {
      // Set up locked account
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(testEmail)
      }

      // Verify lockout is active
      const beforeClear = checkLocalLockout(testEmail)
      expect(beforeClear.isLocked).toBe(true)

      // Simulate successful signin
      clearLocalLockout(testEmail)

      // Verify lockout is cleared
      const afterClear = checkLocalLockout(testEmail)
      expect(afterClear.isLocked).toBe(false)
      expect(afterClear.minutesRemaining).toBe(0)
      expect(localStorageMock[lockoutKey]).toBeUndefined()
    })

    it('should handle multiple users independently', () => {
      const user1 = 'user1@example.com'
      const user2 = 'user2@example.com'

      // Lock user1
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(user1)
      }

      // User1 should be locked
      expect(checkLocalLockout(user1).isLocked).toBe(true)

      // User2 should not be affected
      expect(checkLocalLockout(user2).isLocked).toBe(false)

      // Give user2 3 failed attempts
      for (let i = 0; i < 3; i++) {
        updateLocalLockout(user2)
      }

      // User2 should still not be locked
      expect(checkLocalLockout(user2).isLocked).toBe(false)

      // User1 should still be locked
      expect(checkLocalLockout(user1).isLocked).toBe(true)
    })

    it('should handle progressive lockout timing correctly', () => {
      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        updateLocalLockout(testEmail)
      }

      // Check lockout immediately
      const immediate = checkLocalLockout(testEmail)
      expect(immediate.isLocked).toBe(true)
      expect(immediate.minutesRemaining).toBe(15)

      // Simulate time passing by modifying lockout to have only 5 minutes remaining
      const lockoutSoon = new Date()
      lockoutSoon.setMinutes(lockoutSoon.getMinutes() + 5)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutSoon.toISOString(),
      })

      const laterCheck = checkLocalLockout(testEmail)
      expect(laterCheck.isLocked).toBe(true)
      expect(laterCheck.minutesRemaining).toBeGreaterThan(4)
      expect(laterCheck.minutesRemaining).toBeLessThanOrEqual(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing failedAttempts field', () => {
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        lockoutUntil: null,
      })

      updateLocalLockout(testEmail)

      const data = JSON.parse(localStorageMock[lockoutKey])
      expect(data.failedAttempts).toBe(1)
    })

    it('should handle undefined window (server-side rendering)', () => {
      // Save original window
      const originalWindow = global.window

      // Simulate SSR by removing window
      // @ts-expect-error - Testing SSR scenario
      delete global.window

      const result = checkLocalLockout(testEmail)
      expect(result.isLocked).toBe(false)
      expect(result.minutesRemaining).toBe(0)

      // These should not throw errors
      expect(() => updateLocalLockout(testEmail)).not.toThrow()
      expect(() => clearLocalLockout(testEmail)).not.toThrow()

      // Restore window
      global.window = originalWindow as any
    })

    it('should calculate minutes remaining with ceiling rounding', () => {
      // Set lockout to expire in 90 seconds (1.5 minutes)
      const lockoutUntil = new Date()
      lockoutUntil.setSeconds(lockoutUntil.getSeconds() + 90)

      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 5,
        lockoutUntil: lockoutUntil.toISOString(),
      })

      const result = checkLocalLockout(testEmail)
      expect(result.isLocked).toBe(true)
      expect(result.minutesRemaining).toBe(2) // Should round up to 2 minutes
    })

    it('should handle simultaneous lockout updates', () => {
      // Simulate race condition where two updates happen
      localStorageMock[lockoutKey] = JSON.stringify({
        email: testEmail.toLowerCase(),
        failedAttempts: 4,
        lockoutUntil: null,
      })

      // First update (5th attempt)
      updateLocalLockout(testEmail)

      const data1 = JSON.parse(localStorageMock[lockoutKey])
      expect(data1.failedAttempts).toBe(5)
      expect(data1.lockoutUntil).not.toBeNull()

      // Second update (6th attempt, should maintain lockout)
      updateLocalLockout(testEmail)

      const data2 = JSON.parse(localStorageMock[lockoutKey])
      expect(data2.failedAttempts).toBe(6)
      expect(data2.lockoutUntil).not.toBeNull()
    })
  })
})
