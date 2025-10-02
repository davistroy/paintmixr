/**
 * Server-side Metadata Helper Functions
 * Feature: 004-add-email-add
 * Task: T015
 *
 * Manages lockout state in auth.users.user_metadata (maps to raw_user_meta_data in DB)
 * for rate limiting and security purposes. Implements 15-minute lockout after 5 failed
 * login attempts.
 *
 * Security Requirements:
 * - FR-010: Track failed login attempts
 * - NFR-002: 15-minute lockout after 5 failed attempts
 * - NFR-003: Server-side secure storage
 */

import type { User } from '@supabase/supabase-js';
import type { LockoutMetadata } from '../../types/auth';

/**
 * Maximum number of failed login attempts before lockout is enforced
 */
export const MAX_FAILED_ATTEMPTS = 5;

/**
 * Duration of account lockout in minutes after exceeding max failed attempts
 */
export const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Get lockout metadata from user's user_metadata
 *
 * Safely extracts and validates lockout metadata from Supabase user object.
 * Returns default values if metadata is missing or invalid.
 *
 * Note: user_metadata in the User type maps to raw_user_meta_data in the database.
 *
 * @param user - Supabase User object
 * @returns LockoutMetadata with failed attempts and lockout timestamp
 *
 * @example
 * ```typescript
 * const metadata = getLockoutMetadata(user);
 * console.log(metadata.failed_login_attempts); // 0 if new user
 * ```
 */
export function getLockoutMetadata(user: User): LockoutMetadata {
  // Handle missing or invalid user_metadata
  if (!user.user_metadata || typeof user.user_metadata !== 'object') {
    return {
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null,
    };
  }

  const metadata = user.user_metadata as Partial<LockoutMetadata>;

  // Extract and validate each field with safe defaults
  const failedAttempts = typeof metadata.failed_login_attempts === 'number'
    ? metadata.failed_login_attempts
    : 0;

  const lockoutUntil = typeof metadata.lockout_until === 'string'
    ? metadata.lockout_until
    : null;

  const lastFailedAttempt = typeof metadata.last_failed_attempt === 'string'
    ? metadata.last_failed_attempt
    : null;

  return {
    failed_login_attempts: Math.max(0, failedAttempts), // Ensure non-negative
    lockout_until: lockoutUntil,
    last_failed_attempt: lastFailedAttempt,
  };
}

/**
 * Check if user is currently locked out
 *
 * Determines if a lockout is active and calculates remaining lockout time.
 * Lockout is considered expired if lockout_until is in the past or null.
 *
 * @param metadata - LockoutMetadata from user's user_metadata
 * @returns Object with isLocked status and minutesRemaining (0 if not locked)
 *
 * @example
 * ```typescript
 * const { isLocked, minutesRemaining } = isUserLockedOut(metadata);
 * if (isLocked) {
 *   return { error: `Try again in ${minutesRemaining} minutes` };
 * }
 * ```
 */
export function isUserLockedOut(metadata: LockoutMetadata): {
  isLocked: boolean;
  minutesRemaining: number;
} {
  // No lockout if lockout_until is not set
  if (!metadata.lockout_until) {
    return {
      isLocked: false,
      minutesRemaining: 0,
    };
  }

  const now = new Date();
  const lockoutUntil = new Date(metadata.lockout_until);

  // Handle invalid date format
  if (isNaN(lockoutUntil.getTime())) {
    return {
      isLocked: false,
      minutesRemaining: 0,
    };
  }

  // Check if lockout has expired
  if (now >= lockoutUntil) {
    return {
      isLocked: false,
      minutesRemaining: 0,
    };
  }

  // Calculate remaining lockout time in minutes (rounded up)
  const millisecondsRemaining = lockoutUntil.getTime() - now.getTime();
  const minutesRemaining = Math.ceil(millisecondsRemaining / (60 * 1000));

  return {
    isLocked: true,
    minutesRemaining,
  };
}

/**
 * Increment failed attempts and set lockout if threshold reached
 *
 * Tracks failed login attempts and enforces lockout after MAX_FAILED_ATTEMPTS.
 * Sets lockout_until to LOCKOUT_DURATION_MINUTES from now when threshold is reached.
 * Updates last_failed_attempt timestamp on every call.
 *
 * @param metadata - Current LockoutMetadata from user
 * @returns Updated LockoutMetadata to save back to user_metadata
 *
 * @example
 * ```typescript
 * const updatedMetadata = incrementFailedAttempts(currentMetadata);
 * // Save to database via Supabase Admin API
 * await supabase.auth.admin.updateUserById(userId, {
 *   user_metadata: updatedMetadata
 * });
 * ```
 */
export function incrementFailedAttempts(metadata: LockoutMetadata): LockoutMetadata {
  const now = new Date();
  const newAttemptCount = metadata.failed_login_attempts + 1;

  // Check if we've reached the lockout threshold
  if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
    // Set lockout until LOCKOUT_DURATION_MINUTES from now
    const lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);

    return {
      failed_login_attempts: newAttemptCount,
      lockout_until: lockoutUntil.toISOString(),
      last_failed_attempt: now.toISOString(),
    };
  }

  // Increment attempt count without setting lockout
  return {
    failed_login_attempts: newAttemptCount,
    lockout_until: metadata.lockout_until, // Preserve existing lockout if any
    last_failed_attempt: now.toISOString(),
  };
}

/**
 * Clear lockout and reset failed attempts
 *
 * Resets all lockout metadata fields to their default state.
 * Should be called after successful login to clear any previous failed attempts.
 *
 * @param metadata - Current LockoutMetadata (parameter exists for API consistency)
 * @returns Reset LockoutMetadata with all fields cleared
 *
 * @example
 * ```typescript
 * // After successful login
 * const clearedMetadata = clearLockout(currentMetadata);
 * await supabase.auth.admin.updateUserById(userId, {
 *   user_metadata: clearedMetadata
 * });
 * ```
 */
export function clearLockout(metadata: LockoutMetadata): LockoutMetadata {
  // Return fresh metadata with all fields reset
  // Parameter is included for API consistency but not used
  return {
    failed_login_attempts: 0,
    lockout_until: null,
    last_failed_attempt: null,
  };
}
