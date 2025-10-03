/**
 * Contract Test: T006 - Lockout Race Conditions
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-003, FR-004, FR-005
 *
 * Verifies that atomic lockout counter prevents race conditions when multiple
 * failed authentication attempts occur simultaneously. Uses PostgreSQL atomic
 * increment function to ensure exactly 5 attempts trigger lockout.
 *
 * EXPECTED: This test MUST FAIL until T020 (PostgreSQL function) and
 * T034 (sign-in route integration) are implemented.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('Contract: T006 - Lockout Race Conditions', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let adminClient: ReturnType<typeof createClient>
  const testUserEmail = `race-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const wrongPassword = 'WrongPassword456!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create test user
    await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: testPassword,
      email_confirm: true,
    })
  })

  afterAll(async () => {
    // Cleanup: Delete test user
    const { data: users } = await adminClient.auth.admin.listUsers()
    const testUser = users.users.find(u => u.email === testUserEmail)
    if (testUser) {
      await adminClient.auth.admin.deleteUser(testUser.id)
    }
  })

  it('should increment counter atomically - 10 concurrent failures = exactly 5 count', async () => {
    // Simulate 10 concurrent failed authentication attempts
    const concurrentAttempts = Array(10).fill(null).map(() =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: wrongPassword,
        }),
      })
    )

    const responses = await Promise.all(concurrentAttempts)

    // Get user metadata to verify atomic counter
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === testUserEmail)

    // Atomic increment should result in exactly 5 failed attempts
    // (not 10, due to race condition prevention)
    expect(user?.user_metadata?.failed_login_attempts).toBe(5)

    // First 5 responses should be 401 (invalid credentials)
    const unauthorizedCount = responses.filter(r => r.status === 401).length
    expect(unauthorizedCount).toBe(5)

    // Remaining 5 should be 403 (account locked)
    const lockedCount = responses.filter(r => r.status === 403).length
    expect(lockedCount).toBe(5)
  }, 15000)

  it('should trigger lockout after exactly 5 attempts', async () => {
    const lockedEmail = `lockout-trigger-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: lockedEmail,
      password: testPassword,
      email_confirm: true,
    })

    // Make exactly 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lockedEmail,
          password: wrongPassword,
        }),
      })
      // Small delay to ensure sequential processing
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 6th attempt should be locked
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: lockedEmail,
        password: wrongPassword,
      }),
    })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('account_locked')

    // Cleanup
    const { data: users } = await adminClient.auth.admin.listUsers()
    const testUser = users.users.find(u => u.email === lockedEmail)
    if (testUser) {
      await adminClient.auth.admin.deleteUser(testUser.id)
    }
  }, 15000)

  it('should set lockout timer to +15 minutes from failure time', async () => {
    const timerEmail = `lockout-timer-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: timerEmail,
      password: testPassword,
      email_confirm: true,
    })

    const beforeFailure = Date.now()

    // Make 5 failed attempts to trigger lockout
    for (let i = 0; i < 5; i++) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: timerEmail,
          password: wrongPassword,
        }),
      })
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const afterFailure = Date.now()

    // Get user metadata to verify lockout_until timestamp
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === timerEmail)
    const lockoutUntil = new Date(user?.user_metadata?.lockout_until).getTime()

    // Lockout should be ~15 minutes from failure time
    const expectedLockout = beforeFailure + (15 * 60 * 1000)
    const lockoutDiff = Math.abs(lockoutUntil - expectedLockout)

    // Allow 5 second tolerance for processing time
    expect(lockoutDiff).toBeLessThan(5000)

    // Cleanup
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id)
    }
  }, 20000)

  it('should reset timer to full 15 minutes on attempt during lockout', async () => {
    const resetEmail = `lockout-reset-${Date.now()}@example.com`
    const { data: lockedUser } = await adminClient.auth.admin.createUser({
      email: resetEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + (5 * 60 * 1000)).toISOString(), // 5 minutes
      },
    })

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))

    const beforeAttempt = Date.now()

    // Attempt during lockout should reset timer
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetEmail,
        password: wrongPassword,
      }),
    })

    // Get updated metadata
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === resetEmail)
    const newLockoutUntil = new Date(user?.user_metadata?.lockout_until).getTime()

    // Timer should be reset to full 15 minutes from attempt time
    const expectedLockout = beforeAttempt + (15 * 60 * 1000)
    const lockoutDiff = Math.abs(newLockoutUntil - expectedLockout)

    // Allow 2 second tolerance
    expect(lockoutDiff).toBeLessThan(2000)

    // Cleanup
    if (lockedUser?.user) {
      await adminClient.auth.admin.deleteUser(lockedUser.user.id)
    }
  }, 20000)

  it('should return consistent results under concurrent load', async () => {
    const loadEmail = `concurrent-load-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: loadEmail,
      password: testPassword,
      email_confirm: true,
    })

    // Make 20 concurrent failed attempts
    const concurrentAttempts = Array(20).fill(null).map(() =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loadEmail,
          password: wrongPassword,
        }),
      })
    )

    const responses = await Promise.all(concurrentAttempts)

    // Verify atomic counter behavior
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === loadEmail)

    // Should have exactly 5 failed attempts (atomic increment)
    expect(user?.user_metadata?.failed_login_attempts).toBe(5)

    // Should have lockout_until timestamp
    expect(user?.user_metadata?.lockout_until).toBeTruthy()

    // All responses should be either 401 or 403
    const validStatuses = responses.every(r => r.status === 401 || r.status === 403)
    expect(validStatuses).toBe(true)

    // Cleanup
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id)
    }
  }, 25000)
})
