/**
 * Server-side Metadata Helper Functions
 * Feature: 005-use-codebase-analysis
 * Task: T033
 *
 * Manages lockout state in auth.users.raw_user_meta_data for rate limiting
 * and security purposes. Implements 15-minute lockout after 5 failed login attempts.
 *
 * Security Requirements:
 * - FR-007: Atomic increment using PostgreSQL function (prevents race conditions)
 * - FR-008: Track failed attempts in user metadata
 * - FR-009: 15-minute lockout after 5 failed attempts
 * - FR-009a: Reset lockout timer on retry during active lockout
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lockout metadata stored in auth.users.raw_user_meta_data
 */
export interface LockoutMetadata {
  failed_login_attempts: number
  lockout_until: string | null // ISO 8601 timestamp
  last_failed_attempt: string | null // ISO 8601 timestamp
}

/**
 * User object with raw_user_meta_data field
 * (Supabase Admin API returns this structure)
 */
interface UserWithMetadata {
  id: string
  email?: string
  raw_user_meta_data?: Record<string, unknown>
}

/**
 * Maximum number of failed login attempts before lockout is enforced
 */
export const MAX_FAILED_ATTEMPTS = 5

/**
 * Duration of account lockout in minutes after exceeding max failed attempts
 */
export const LOCKOUT_DURATION_MINUTES = 15

/**
 * Get lockout metadata from user's raw_user_meta_data
 *
 * Safely extracts and validates lockout metadata from Supabase user object.
 * Returns default values if metadata is missing or invalid.
 *
 * @param user - Supabase User object with raw_user_meta_data
 * @returns LockoutMetadata with failed attempts and lockout timestamp
 *
 * @example
 * ```typescript
 * const { data: { user } } = await adminClient.auth.admin.getUserById(userId)
 * const metadata = getLockoutMetadata(user)
 * console.log(metadata.failed_login_attempts) // 0 if new user
 * ```
 */
export function getLockoutMetadata(user: UserWithMetadata): LockoutMetadata {
  // Handle missing or invalid raw_user_meta_data
  if (!user.raw_user_meta_data || typeof user.raw_user_meta_data !== 'object') {
    return {
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null,
    }
  }

  const metadata = user.raw_user_meta_data as Partial<LockoutMetadata>

  // Extract and validate each field with safe defaults
  const failedAttempts = typeof metadata.failed_login_attempts === 'number'
    ? metadata.failed_login_attempts
    : 0

  const lockoutUntil = typeof metadata.lockout_until === 'string'
    ? metadata.lockout_until
    : null

  const lastFailedAttempt = typeof metadata.last_failed_attempt === 'string'
    ? metadata.last_failed_attempt
    : null

  return {
    failed_login_attempts: Math.max(0, failedAttempts), // Ensure non-negative
    lockout_until: lockoutUntil,
    last_failed_attempt: lastFailedAttempt,
  }
}

/**
 * Check if user is currently locked out
 *
 * Determines if a lockout is active and calculates remaining lockout time.
 * Lockout is considered expired if lockout_until is in the past or null.
 *
 * @param metadata - LockoutMetadata from user's raw_user_meta_data
 * @returns Object with locked status and remainingSeconds (0 if not locked)
 *
 * @example
 * ```typescript
 * const { locked, remainingSeconds } = isUserLockedOut(metadata)
 * if (locked) {
 *   return { error: `Account locked. Try again in ${Math.ceil(remainingSeconds / 60)} minutes` }
 * }
 * ```
 */
export function isUserLockedOut(metadata: LockoutMetadata): {
  locked: boolean
  remainingSeconds: number
} {
  // No lockout if lockout_until is not set
  if (!metadata.lockout_until) {
    return {
      locked: false,
      remainingSeconds: 0,
    }
  }

  const now = Date.now()
  const lockoutUntil = new Date(metadata.lockout_until).getTime()

  // Handle invalid date format
  if (isNaN(lockoutUntil)) {
    return {
      locked: false,
      remainingSeconds: 0,
    }
  }

  // Check if lockout has expired
  if (now >= lockoutUntil) {
    return {
      locked: false,
      remainingSeconds: 0,
    }
  }

  // Calculate remaining lockout time in seconds (rounded up)
  const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000)

  return {
    locked: true,
    remainingSeconds,
  }
}

/**
 * Increment failed attempts using atomic PostgreSQL function
 *
 * Calls the increment_failed_login_attempts PostgreSQL function to atomically
 * increment the counter. This prevents race conditions where concurrent requests
 * could bypass the lockout threshold.
 *
 * After incrementing, checks if threshold (5 attempts) is reached and sets
 * lockout_until timestamp if needed.
 *
 * @param userId - Supabase user UUID
 * @param adminClient - Supabase client with service_role key
 * @returns Object with newCount and lockoutUntil (null if not locked)
 *
 * @example
 * ```typescript
 * const { newCount, lockoutUntil } = await incrementFailedAttempts(userId, adminClient)
 * if (lockoutUntil) {
 *   console.log(`Account locked until ${lockoutUntil}`)
 * }
 * ```
 */
export async function incrementFailedAttempts(
  userId: string,
  adminClient: SupabaseClient
): Promise<{ newCount: number; lockoutUntil: string | null }> {
  // Call PostgreSQL atomic function to increment counter
  const { data, error } = await adminClient.rpc(
    'increment_failed_login_attempts',
    { user_id: userId }
  )

  if (error) {
    throw new Error(`Failed to increment attempts: ${error.message}`)
  }

  // Extract new count from function result
  const result = Array.isArray(data) ? data[0] : data
  const newCount = result?.new_attempt_count || 0

  // Check if lockout threshold reached
  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()

    // Update user metadata with lockout timestamp
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        failed_login_attempts: newCount,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }
    })

    if (updateError) {
      throw new Error(`Failed to set lockout metadata: ${updateError.message}`)
    }

    return { newCount, lockoutUntil }
  }

  // Below threshold, update only failed attempts and timestamp
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      failed_login_attempts: newCount,
      last_failed_attempt: new Date().toISOString()
    }
  })

  if (updateError) {
    throw new Error(`Failed to update metadata: ${updateError.message}`)
  }

  return { newCount, lockoutUntil: null }
}

/**
 * Clear lockout and reset failed attempts
 *
 * Resets all lockout metadata fields to their default state.
 * Should be called after successful login to clear any previous failed attempts.
 *
 * @param userId - Supabase user UUID
 * @param adminClient - Supabase client with service_role key
 *
 * @example
 * ```typescript
 * // After successful login
 * await clearLockout(userId, adminClient)
 * ```
 */
export async function clearLockout(
  userId: string,
  adminClient: SupabaseClient
): Promise<void> {
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null
    }
  })

  if (error) {
    throw new Error(`Failed to clear lockout: ${error.message}`)
  }
}
