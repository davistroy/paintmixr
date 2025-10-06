/**
 * Email/Password Sign-In API Route
 * Feature: 005-use-codebase-analysis
 * Task: T034
 *
 * Server-side email/password authentication endpoint with performance optimization.
 * Implements targeted email query (O(1) lookup), rate limiting, OAuth precedence,
 * and atomic lockout enforcement.
 *
 * Security Requirements:
 * - FR-001: O(1) targeted query with email filter (NOT full table scan)
 * - FR-002: Sub-2-second authentication at 10K user scale
 * - FR-003: Rate limit check BEFORE database queries
 * - FR-004: Generic error messages (prevent user enumeration)
 * - FR-005: OAuth precedence check
 * - FR-006: Provider-specific error messages
 * - FR-007: Atomic failed attempt counter
 * - FR-008: Track lockout in user metadata
 * - FR-009: 15-minute lockout after 5 failed attempts
 * - FR-009a: Reset lockout timer on retry during active lockout
 * - FR-010: Clear lockout on successful login
 * - FR-011: Return redirect URL on success
 * - FR-012: Lockout check before password verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { createClient as createRouteClient } from '@/lib/supabase/route-handler'
import { emailSigninSchema } from '@/lib/auth/validation'
import { checkRateLimit, recordAuthAttempt } from '@/lib/auth/rate-limit'
import { logger } from '@/lib/logging/logger';
import {
  getLockoutMetadata,
  isUserLockedOut,
  incrementFailedAttempts,
  clearLockout
} from '@/lib/auth/metadata-helpers'

/**
 * POST /api/auth/email-signin
 *
 * Authenticates user with email and password
 *
 * Request Body:
 * - email: string (required, valid email format)
 * - password: string (required, min 1 char)
 *
 * Responses:
 * - 200: Success with redirectTo
 * - 400: Validation error
 * - 401: Invalid credentials
 * - 403: Account locked or OAuth precedence
 * - 429: Rate limited
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Extract IP address for rate limiting (from X-Forwarded-For header)
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

    // CRITICAL: Check rate limit FIRST (before any DB queries)
    const rateLimitStatus = checkRateLimit(ipAddress)
    if (rateLimitStatus.rateLimited) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimitStatus.retryAfter
        },
        {
          status: 429,
          headers: { 'Retry-After': rateLimitStatus.retryAfter.toString() }
        }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validation = emailSigninSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    const adminClient = createAdminClient()

    // CRITICAL: Targeted query with email filter (O(1) with index)
    // DO NOT use listUsers() without filter - this causes N+1 query problem!
    // Note: TypeScript types don't include 'filter' parameter, but it's supported by Supabase API
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers({
      filter: `email.eq.${email}`
    } as { filter: string })

    if (listError) {
      logger.error({ err: listError }, 'Error querying user by email')
      // Generic error (prevent enumeration)
      recordAuthAttempt(ipAddress)
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users.users[0]

    // Generic error if user not found (prevent enumeration)
    if (!user) {
      recordAuthAttempt(ipAddress)
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check lockout status BEFORE password verification (FR-012)
    const lockoutMetadata = getLockoutMetadata(user)
    const lockoutStatus = isUserLockedOut(lockoutMetadata)

    if (lockoutStatus.locked) {
      // Reset lockout timer if user attempts during lockout (FR-009a)
      const newLockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...lockoutMetadata,
          lockout_until: newLockoutUntil
        }
      })

      return NextResponse.json(
        {
          error: 'account_locked',
          message: 'Account locked due to too many failed login attempts.',
          lockedUntil: newLockoutUntil,
          remainingSeconds: 900 // Reset to full 15 minutes
        },
        { status: 403 }
      )
    }

    // Check OAuth precedence (query auth.identities via RPC)
    // Note: auth.identities requires RPC function or direct admin query
    // For now, skip OAuth check if user exists with email provider
    // This will be handled by Supabase Auth hooks in production
    const hasEmailProvider = user.identities?.some((identity: { provider: string }) => identity.provider === 'email')
    const hasOAuthProvider = user.identities?.some((identity: { provider: string }) => identity.provider !== 'email')

    if (hasOAuthProvider && !hasEmailProvider) {
      const oauthProvider = user.identities?.find((identity: { provider: string }) => identity.provider !== 'email')?.provider
      return NextResponse.json(
        {
          error: 'oauth_precedence',
          message: `This account uses ${oauthProvider} authentication. Please sign in with ${oauthProvider}.`,
          provider: oauthProvider
        },
        { status: 403 }
      )
    }

    // Attempt password authentication using route client (sets session cookies)
    const routeClient = await createRouteClient()
    const { error: signInError } = await routeClient.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      // Increment failed attempts atomically (prevents race conditions)
      await incrementFailedAttempts(user.id, adminClient)
      recordAuthAttempt(ipAddress)

      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Success: Clear lockout metadata
    await clearLockout(user.id, adminClient)

    return NextResponse.json({
      success: true,
      message: 'Signed in successfully',
      redirectTo: '/dashboard'
    })
  } catch (error) {
    logger.error({ err: error }, 'Email signin error')
    return NextResponse.json(
      {
        error: 'An error occurred during sign in',
      },
      { status: 500 }
    )
  }
}
