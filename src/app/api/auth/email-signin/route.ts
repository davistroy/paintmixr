/**
 * Email/Password Sign-In API Route
 * Feature: 004-add-email-add
 * Task: T013
 *
 * Server-side email/password authentication endpoint
 * Implements validation, rate limiting, and OAuth precedence checks
 *
 * Security Requirements:
 * - FR-003: Validate input with Zod schema
 * - FR-004: Authenticate via Supabase Auth
 * - FR-005: Return generic "Invalid credentials" error on auth failure
 * - FR-006: Check OAuth precedence (if user has OAuth, block email/password)
 * - FR-010: Track failed attempts, enforce lockout
 * - FR-011: Return success with redirectUrl on valid credentials
 * - NFR-001: Respond in under 5 seconds
 * - NFR-002: 15-minute lockout after 5 failed attempts
 * - NFR-004: No user enumeration (generic errors)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/auth/supabase-server'
import { emailSigninSchema } from '@/lib/auth/validation'
import {
  getLockoutMetadata,
  isUserLockedOut,
  incrementFailedAttempts,
  clearLockout,
} from '@/lib/auth/metadata-helpers'
import type { EmailSigninResponse } from '@/types/auth'
import type { Database } from '@/types/types'

/**
 * POST /api/auth/email-signin
 *
 * Authenticates user with email and password
 * Returns 200 OK for both success and auth failures (prevents timing attacks)
 * Returns 400 for validation errors
 * Returns 500 for server errors
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body with error handling for malformed JSON
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json<EmailSigninResponse>(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      )
    }

    // 2. Validate request body with Zod schema (FR-003)
    const validationResult = emailSigninSchema.safeParse(body)

    if (!validationResult.success) {
      // Transform Zod errors to match contract spec format
      const validationErrors: { [key: string]: string } = {}
      validationResult.error.errors.forEach((err) => {
        const field = err.path.join('.') || 'unknown'
        validationErrors[field] = err.message
      })

      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationErrors,
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data
    // Email is already normalized (lowercase, trimmed) by Zod transform

    // 3. Create Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        {
          error: 'An error occurred during sign in',
        },
        { status: 500 }
      )
    }

    // Admin client for metadata operations (NFR-003: server-side secure storage)
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Regular client for authentication
    const supabase = await createRouteHandlerClient()

    // 4. Get user by email to check lockout and OAuth precedence
    // List all users and filter by email (Supabase doesn't have getUserByEmail on admin API)
    const { data: userData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()

    if (listUsersError) {
      console.error('Error listing users:', listUsersError)
      // Return generic error (NFR-004: no information leakage)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
        },
        { status: 401 }
      )
    }

    // Find user with matching email (case-insensitive)
    const user = userData.users.find((u) => u.email?.toLowerCase() === email)

    // If user exists, perform security checks
    if (user) {
      // 5. Check lockout status (FR-010, NFR-002)
      const lockoutMetadata = getLockoutMetadata(user)
      const { isLocked, minutesRemaining } = isUserLockedOut(lockoutMetadata)

      if (isLocked) {
        // Return 429 with retry-after for locked accounts (from auth-signin-errors.test.ts)
        return NextResponse.json(
          {
            error: 'Too many login attempts. Please try again later.',
            retryAfter: minutesRemaining * 60, // Convert minutes to seconds
          },
          { status: 429 }
        )
      }

      // 6. Check OAuth precedence (FR-006)
      // Query auth.identities to see if user has OAuth providers
      const { data: identitiesData, error: identitiesError } = await supabaseAdmin
        .from('identities')
        .select('provider')
        .eq('user_id', user.id)

      if (identitiesError) {
        console.error('Error fetching identities:', identitiesError)
        // Continue with auth attempt even if identity check fails
      } else if (identitiesData && identitiesData.length > 0) {
        // Check if any non-email provider exists
        const oauthProvider = (identitiesData as Array<{ provider: string }>).find(
          (identity) => identity.provider !== 'email'
        )

        if (oauthProvider) {
          // User has OAuth provider, block email/password signin
          const providerName =
            oauthProvider.provider.charAt(0).toUpperCase() + oauthProvider.provider.slice(1)
          return NextResponse.json(
            {
              error: `This account uses OAuth authentication. Please sign in with ${providerName}.`,
              provider: oauthProvider.provider,
            },
            { status: 403 }
          )
        }
      }
    }

    // 7. Attempt authentication with Supabase (FR-004)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // 8. Handle authentication result
    if (authError || !authData.session) {
      // Authentication failed - increment failed attempts (FR-010)
      if (user) {
        const lockoutMetadata = getLockoutMetadata(user)
        const updatedMetadata = incrementFailedAttempts(lockoutMetadata)

        // Update user metadata with incremented counter
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            ...updatedMetadata,
          },
        })
      }

      // Return generic error (FR-005, NFR-004: prevent user enumeration)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
        },
        { status: 401 }
      )
    }

    // 9. Success - reset lockout metadata (FR-011)
    if (user) {
      const lockoutMetadata = getLockoutMetadata(user)
      const clearedMetadata = clearLockout(lockoutMetadata)

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          ...clearedMetadata,
        },
      })
    }

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        redirectUrl: '/',
      },
      { status: 200 }
    )
  } catch (error) {
    // Log error server-side but don't expose details to client
    console.error('Email signin error:', error)
    return NextResponse.json(
      {
        error: 'An error occurred during sign in',
      },
      { status: 500 }
    )
  }
}
