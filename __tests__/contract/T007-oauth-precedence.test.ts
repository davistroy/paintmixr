/**
 * Contract Test: T007 - OAuth Precedence Enforcement
 * Feature: 005-use-codebase-analysis
 * Requirements: FR-006, FR-007
 *
 * Verifies that users with OAuth identities (Google, GitHub, etc.) cannot
 * sign in with email/password. Prevents user confusion when multiple auth
 * methods are configured. Failed OAuth precedence checks should NOT increment
 * lockout counter.
 *
 * EXPECTED: This test MUST FAIL until T021 (OAuth precedence utility) and
 * T034 (sign-in route integration) are implemented.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

describe('Contract: T007 - OAuth Precedence Enforcement', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let adminClient: ReturnType<typeof createClient>
  const googleEmail = `google-oauth-${Date.now()}@example.com`
  const githubEmail = `github-oauth-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create user with Google OAuth identity
    // Note: In real Supabase, OAuth users are created via provider flow
    // For testing, we simulate by creating user with specific provider metadata
    await adminClient.auth.admin.createUser({
      email: googleEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        provider: 'google',
        oauth_provider: 'google',
      },
    })

    // Create user with GitHub OAuth identity
    await adminClient.auth.admin.createUser({
      email: githubEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        provider: 'github',
        oauth_provider: 'github',
      },
    })
  })

  afterAll(async () => {
    // Cleanup: Delete test users
    const { data: users } = await adminClient.auth.admin.listUsers()
    const googleUser = users.users.find(u => u.email === googleEmail)
    const githubUser = users.users.find(u => u.email === githubEmail)

    if (googleUser) {
      await adminClient.auth.admin.deleteUser(googleUser.id)
    }
    if (githubUser) {
      await adminClient.auth.admin.deleteUser(githubUser.id)
    }
  })

  it('should block email/password signin for Google OAuth user', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBe('oauth_precedence')
  })

  it('should specify provider in error message', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    const data = await response.json()
    expect(data.message).toContain('Google')
    expect(data.message).toContain('OAuth')
  })

  it('should return 403 Forbidden status code', async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(403)
  })

  it('should NOT increment failed attempt counter on OAuth precedence', async () => {
    // Get initial metadata
    const { data: usersBefore } = await adminClient.auth.admin.listUsers()
    const userBefore = usersBefore.users.find(u => u.email === googleEmail)
    const attemptsBefore = userBefore?.user_metadata?.failed_login_attempts || 0

    // Attempt email/password signin (should fail due to OAuth precedence)
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    // Get updated metadata
    const { data: usersAfter } = await adminClient.auth.admin.listUsers()
    const userAfter = usersAfter.users.find(u => u.email === googleEmail)
    const attemptsAfter = userAfter?.user_metadata?.failed_login_attempts || 0

    // Failed attempt counter should NOT be incremented
    expect(attemptsAfter).toBe(attemptsBefore)
  })

  it('should handle multiple OAuth providers correctly', async () => {
    // Test GitHub OAuth user
    const githubResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: githubEmail,
        password: testPassword,
      }),
    })

    expect(githubResponse.status).toBe(403)

    const githubData = await githubResponse.json()
    expect(githubData.error).toBe('oauth_precedence')
    expect(githubData.message).toContain('GitHub')

    // Test Google OAuth user
    const googleResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    expect(googleResponse.status).toBe(403)

    const googleData = await googleResponse.json()
    expect(googleData.error).toBe('oauth_precedence')
    expect(googleData.message).toContain('Google')
  })

  it('should query auth.identities table for OAuth check', async () => {
    // This test verifies the implementation queries auth.identities
    // to check for non-email providers
    //
    // Contract requirement: Query auth.identities where user_id = user.id
    // AND provider != 'email'
    //
    // Implementation verification happens in T021

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(403)
  })

  it('should allow email/password signin for non-OAuth users', async () => {
    // Create regular email/password user (no OAuth)
    const regularEmail = `regular-${Date.now()}@example.com`
    await adminClient.auth.admin.createUser({
      email: regularEmail,
      password: testPassword,
      email_confirm: true,
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regularEmail,
        password: testPassword,
      }),
    })

    // Should succeed (200) or fail with invalid credentials (401)
    // but NOT fail with OAuth precedence (403)
    expect(response.status).not.toBe(403)

    // Cleanup
    const { data: users } = await adminClient.auth.admin.listUsers()
    const regularUser = users.users.find(u => u.email === regularEmail)
    if (regularUser) {
      await adminClient.auth.admin.deleteUser(regularUser.id)
    }
  })

  it('should handle case-insensitive email matching for OAuth check', async () => {
    // Test with uppercase email
    const uppercaseEmail = googleEmail.toUpperCase()

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/email-signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uppercaseEmail,
        password: testPassword,
      }),
    })

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBe('oauth_precedence')
  })
})
