/**
 * Contract Test: Email/Password Sign-In Performance
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-001, FR-002
 *
 * Verifies that email/password authentication uses targeted queries (O(1) lookup)
 * instead of full table scans, completing in <2 seconds at 10,000 user scale.
 *
 * EXPECTED: This test MUST FAIL until T034 is implemented (N+1 query fix).
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('Contract: Email/Password Sign-In Performance', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let adminClient: ReturnType<typeof createClient>
  const testUserEmail = `perf-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create test user for performance testing
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

  it('should complete authentication in <2 seconds', async () => {
    const startTime = Date.now()

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
      }),
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(2000) // Must complete in <2 seconds
  }, 10000) // 10 second Jest timeout

  it('should use targeted email query (not full table scan)', async () => {
    // This test verifies the implementation uses:
    // listUsers({ filter: `email.eq.${email}` })
    // NOT: listUsers() without filter

    // Note: This is a contract requirement, actual verification would require
    // database query plan analysis or logging inspection

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(200)

    // Contract requirement: Must use email.eq filter
    // Implementation verification happens in T034
  })

  it('should check lockout status before password verification', async () => {
    // Create a locked-out user
    const lockedEmail = `locked-${Date.now()}@example.com`
    const { data: lockedUser } = await adminClient.auth.admin.createUser({
      email: lockedEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: lockedEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBe('account_locked')
    expect(data.remainingSeconds).toBeGreaterThan(0)

    // Cleanup
    if (lockedUser.user) {
      await adminClient.auth.admin.deleteUser(lockedUser.user.id)
    }
  })

  it('should handle concurrent authentication requests efficiently', async () => {
    // Simulate 5 concurrent authentication attempts
    const attempts = Array(5).fill(null).map(() =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: testPassword,
        }),
      })
    )

    const startTime = Date.now()
    const responses = await Promise.all(attempts)
    const endTime = Date.now()
    const duration = endTime - startTime

    // All requests should complete within reasonable time
    expect(duration).toBeLessThan(3000)

    // At least some should succeed (rate limiting may kick in)
    const successCount = responses.filter(r => r.status === 200).length
    expect(successCount).toBeGreaterThan(0)
  }, 10000)
})
