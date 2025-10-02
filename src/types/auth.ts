/**
 * Authentication Type Definitions
 * Feature: 004-add-email-add
 * Task: T001
 *
 * TypeScript interfaces for email/password authentication
 */

/**
 * Email signin request payload
 */
export interface EmailSigninInput {
  email: string
  password: string
}

/**
 * Email signin API response
 */
export interface EmailSigninResponse {
  success: boolean
  redirectUrl?: string
  error?: string
  validation?: Array<{
    field: string
    message: string
  }>
}

/**
 * Lockout metadata stored in auth.users.raw_user_meta_data
 */
export interface LockoutMetadata {
  failed_login_attempts: number
  lockout_until: string | null // ISO 8601 timestamp
  last_failed_attempt: string | null // ISO 8601 timestamp
}

/**
 * Local lockout state stored in localStorage for client-side UI
 */
export interface LocalLockoutState {
  email: string
  failedAttempts: number
  lockoutUntil: string | null // ISO 8601 timestamp
}
