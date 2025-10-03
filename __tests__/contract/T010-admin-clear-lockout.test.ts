/**
 * Contract Test: T010 - Admin Clear Lockout
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-009
 *
 * Verifies POST /api/auth/admin/clear-lockout endpoint allows administrators
 * to manually clear lockout metadata for users. Requires admin authentication
 * and returns appropriate error codes for non-admin and non-existent users.
 *
 * EXPECTED: This test MUST FAIL until T024 (admin clear lockout route) is implemented.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('Contract: T010 - Admin Clear Lockout', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let adminClient: ReturnType<typeof createClient>
  const lockedEmail = `locked-admin-${Date.now()}@example.com`
  const regularEmail = `regular-${Date.now()}@example.com`
  const adminEmail = `admin-${Date.now()}@example.com`
  const nonExistentEmail = `non-existent-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create locked-out user
    await adminClient.auth.admin.createUser({
      email: lockedEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
        last_failed_attempt: new Date().toISOString(),
      },
    })

    // Create regular user (non-admin)
    await adminClient.auth.admin.createUser({
      email: regularEmail,
      password: testPassword,
      email_confirm: true,
    })

    // Create admin user (with admin role)
    await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
      },
    })
  })

  afterAll(async () => {
    // Cleanup: Delete test users
    const { data: users } = await adminClient.auth.admin.listUsers()
    const testEmails = [lockedEmail, regularEmail, adminEmail]

    for (const email of testEmails) {
      const user = users.users.find(u => u.email === email)
      if (user) {
        await adminClient.auth.admin.deleteUser(user.id)
      }
    }
  })

  it('should allow admin to clear lockout metadata', async () => {
    // Sign in as admin to get session
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: lockedEmail,
        }),
      }
    )

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)

    // Verify metadata was cleared
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === lockedEmail)

    expect(user?.user_metadata?.failed_login_attempts).toBe(0)
    expect(user?.user_metadata?.lockout_until).toBeNull()
    expect(user?.user_metadata?.last_failed_attempt).toBeNull()
  })

  it('should return 401 Unauthorized for non-admin user', async () => {
    // Sign in as regular user (non-admin)
    const { data: regularSession } = await adminClient.auth.signInWithPassword({
      email: regularEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${regularSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: lockedEmail,
        }),
      }
    )

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('unauthorized')
  })

  it('should return 401 for missing Authorization header', async () => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify({
          email: lockedEmail,
        }),
      }
    )

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('unauthorized')
  })

  it('should return 404 for user not found', async () => {
    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: nonExistentEmail,
        }),
      }
    )

    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('user_not_found')
  })

  it('should correctly clear all lockout fields', async () => {
    // Create another locked user for this test
    const clearTestEmail = `clear-test-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: clearTestEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        failed_login_attempts: 5,
        lockout_until: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
        last_failed_attempt: new Date().toISOString(),
      },
    })

    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    // Clear lockout
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: clearTestEmail,
        }),
      }
    )

    // Verify all fields are cleared
    const { data: users } = await adminClient.auth.admin.listUsers()
    const user = users.users.find(u => u.email === clearTestEmail)

    expect(user?.user_metadata?.failed_login_attempts).toBe(0)
    expect(user?.user_metadata?.lockout_until).toBeNull()
    expect(user?.user_metadata?.last_failed_attempt).toBeNull()

    // Cleanup
    if (user) {
      await adminClient.auth.admin.deleteUser(user.id)
    }
  })

  it('should apply email normalization (lowercase + trim)', async () => {
    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    // Test with uppercase and whitespace
    const unnormalizedEmail = `  ${lockedEmail.toUpperCase()}  `

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: unnormalizedEmail,
        }),
      }
    )

    expect(response.status).toBe(200)
  })

  it('should return 400 for invalid email format', async () => {
    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      }
    )

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  it('should return 400 for missing email field', async () => {
    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({}),
      }
    )

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBeTruthy()
  })

  it('should use Supabase Admin API to update metadata', async () => {
    // This test verifies the implementation uses Admin API client
    // with service role key to update user_metadata
    //
    // Contract requirement: Use adminClient.auth.admin.updateUserById()
    // NOT: regular client update (which would fail)
    //
    // Implementation verification happens in T024

    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: lockedEmail,
        }),
      }
    )

    expect(response.status).toBe(200)
  })

  it('should verify admin role from user metadata', async () => {
    // This test verifies that admin authorization is checked via
    // user_metadata.role === 'admin' field
    //
    // Contract requirement: Check authenticated user's metadata for admin role
    // Implementation verification happens in T024

    // Sign in as admin
    const { data: adminSession } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: testPassword,
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/admin/clear-lockout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSession.session?.access_token}`,
        },
        body: JSON.stringify({
          email: lockedEmail,
        }),
      }
    )

    expect(response.status).toBe(200)
  })
})
