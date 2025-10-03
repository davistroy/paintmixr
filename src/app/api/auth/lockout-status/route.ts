/**
 * Lockout Status API Endpoint
 * Feature: 005-use-codebase-analysis
 * Task: T035
 *
 * GET /api/auth/lockout-status?email=user@example.com
 *
 * Returns lockout status for a given email address.
 * Used for client-side countdown timer display.
 *
 * Security:
 * - Returns "not locked" for non-existent users (prevents enumeration)
 * - Validates and normalizes email before lookup
 * - Only exposes lockout timing, not account existence
 */

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getLockoutMetadata, isUserLockedOut } from '@/lib/auth/metadata-helpers'
import { emailSigninSchema } from '@/lib/auth/validation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return Response.json({ error: 'missing_email' }, { status: 400 })
  }

  // Validate and normalize email (extract just the email field)
  const validation = emailSigninSchema.pick({ email: true }).safeParse({ email })
  if (!validation.success) {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }

  const normalizedEmail = validation.data.email
  const adminClient = createAdminClient()

  // Query user by email
  // Note: TypeScript types don't include 'filter' parameter, but it's supported by Supabase API
  const { data: users } = await adminClient.auth.admin.listUsers({
    filter: `email.eq.${normalizedEmail}`
  } as any)

  const user = users.users[0]

  // Return "not locked" for non-existent users (prevent enumeration)
  if (!user) {
    return Response.json({ locked: false, email: normalizedEmail })
  }

  const lockoutMetadata = getLockoutMetadata(user)
  const lockoutStatus = isUserLockedOut(lockoutMetadata)

  if (lockoutStatus.locked) {
    return Response.json({
      locked: true,
      email: normalizedEmail,
      lockedUntil: lockoutMetadata.lockout_until,
      remainingSeconds: lockoutStatus.remainingSeconds,
      failedAttempts: lockoutMetadata.failed_login_attempts
    })
  }

  return Response.json({ locked: false, email: normalizedEmail })
}
