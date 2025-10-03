/**
 * Contract Test: T008 - Lockout Status API
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-008, NFR-004
 *
 * Verifies GET /api/auth/lockout-status endpoint returns lockout status
 * for a given email. Returns generic response for non-existent users to
 * prevent user enumeration (security requirement NFR-004).
 *
 * EXPECTED: This test MUST FAIL until T022 (lockout status route) is implemented.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('Contract: T008 - Lockout Status API', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let adminClient: ReturnType<typeof createClient>
  const notLockedEmail = `not-locked-${Date.now()}@example.com`
  const lockedEmail = `locked-${Date.now()}@example.com`
  const nonExistentEmail = `non-existent-${Date.now()}@example.com`

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create user without lockout
    await adminClient.auth.admin.createUser({
      email: notLockedEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    })

    // Create locked-out user
    await adminClient.auth.admin.createUser({
      email: lockedEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
        last_failed_attempt: new Date().toISOString(),
      },
    })
  })

  afterAll(async () => {
    // Cleanup: Delete test users
    const { data: users } = await adminClient.auth.admin.listUsers()
    const notLockedUser = users.users.find(u => u.email === notLockedEmail)
    const lockedUser = users.users.find(u => u.email === lockedEmail)

    if (notLockedUser) {
      await adminClient.auth.admin.deleteUser(notLockedUser.id)
    }
    if (lockedUser) {
      await adminClient.auth.admin.deleteUser(lockedUser.id)
    }
  })

  it('should return {locked: false} for not locked user', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(notLockedEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.locked).toBe(false)
    expect(data.remainingSeconds).toBeUndefined()
    expect(data.lockoutUntil).toBeUndefined()
  })

  it('should return lockout details with remaining seconds for locked user', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(lockedEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.locked).toBe(true)
    expect(data.remainingSeconds).toBeGreaterThan(0)
    expect(data.remainingSeconds).toBeLessThanOrEqual(15 * 60) // Max 15 minutes
    expect(data.lockoutUntil).toBeTruthy()

    // Verify lockoutUntil is a valid ISO 8601 timestamp
    const lockoutDate = new Date(data.lockoutUntil)
    expect(lockoutDate.getTime()).toBeGreaterThan(Date.now())
  })

  it('should return {locked: false} for user not found (prevent enumeration)', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(nonExistentEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    // Should return same response as unlocked user to prevent enumeration
    expect(data.locked).toBe(false)
    expect(data.remainingSeconds).toBeUndefined()
  })

  it('should apply email normalization (lowercase + trim)', async () => {
    // Test with uppercase and whitespace
    const unnormalizedEmail = `  ${lockedEmail.toUpperCase()}  `

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(unnormalizedEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    // Should find the locked user despite case/whitespace differences
    expect(data.locked).toBe(true)
    expect(data.remainingSeconds).toBeGreaterThan(0)
  })

  it('should return 400 if email parameter missing', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  it('should return 400 for invalid email format', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=invalid-email`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  it('should calculate remaining seconds accurately', async () => {
    const beforeRequest = Date.now()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(lockedEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const afterRequest = Date.now()

    const data = await response.json()

    // Get expected remaining time from user metadata
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === lockedEmail)
    const lockoutUntil = new Date(user?.user_metadata?.lockout_until).getTime()

    const expectedRemaining = Math.ceil((lockoutUntil - afterRequest) / 1000)

    // Allow 2 second tolerance for processing time
    const diff = Math.abs(data.remainingSeconds - expectedRemaining)
    expect(diff).toBeLessThanOrEqual(2)
  })

  it('should handle expired lockout correctly', async () => {
    // Create user with expired lockout (lockout_until in the past)
    const expiredEmail = `expired-lockout-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: expiredEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() - (1 * 60 * 1000)).toISOString(), // 1 minute ago
        last_failed_attempt: new Date(Date.now() - (16 * 60 * 1000)).toISOString(),
      },
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(expiredEmail)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const data = await response.json()

    // Expired lockout should return locked: false
    expect(data.locked).toBe(false)

    // Cleanup
    const { data: users } = await adminClient.auth.admin.listUsers()
    const expiredUser = users.users.find(u => u.email === expiredEmail)
    if (expiredUser) {
      await adminClient.auth.admin.deleteUser(expiredUser.id)
    }
  })

  it('should support CORS for client-side requests', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/lockout-status?email=${encodeURIComponent(notLockedEmail)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
        },
      }
    )

    // Should include CORS headers
    const corsHeader = response.headers.get('Access-Control-Allow-Origin')
    expect(corsHeader).toBeTruthy()
  })
})
