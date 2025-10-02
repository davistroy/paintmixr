/**
 * Rate Limiting Utilities
 * Feature: 004-add-email-add
 * Task: T003
 *
 * Client-side lockout tracking using localStorage for immediate UI feedback
 * Server-side metadata is the source of truth for actual lockout enforcement
 */

import type { LocalLockoutState } from '@/types/auth'

const LOCKOUT_DURATION_MINUTES = 15
const MAX_FAILED_ATTEMPTS = 5

/**
 * Get localStorage key for email lockout state
 */
function getLockoutKey(email: string): string {
  return `lockout_${email.toLowerCase()}`
}

/**
 * Check if email is currently locked out
 *
 * @param email - User's email address
 * @returns Object with lockout status and minutes remaining
 */
export function checkLocalLockout(email: string): {
  isLocked: boolean
  minutesRemaining: number
} {
  if (typeof window === 'undefined') {
    return { isLocked: false, minutesRemaining: 0 }
  }

  const key = getLockoutKey(email)
  const data = localStorage.getItem(key)

  if (!data) {
    return { isLocked: false, minutesRemaining: 0 }
  }

  try {
    const state: LocalLockoutState = JSON.parse(data)

    if (!state.lockoutUntil) {
      return { isLocked: false, minutesRemaining: 0 }
    }

    const lockoutTime = new Date(state.lockoutUntil)
    const now = new Date()

    if (now < lockoutTime) {
      const minutesRemaining = Math.ceil(
        (lockoutTime.getTime() - now.getTime()) / 60000
      )
      return { isLocked: true, minutesRemaining }
    }

    // Lockout expired, clear it
    localStorage.removeItem(key)
    return { isLocked: false, minutesRemaining: 0 }
  } catch (error) {
    // Invalid JSON, clear and allow
    console.error('Failed to parse lockout state:', error)
    localStorage.removeItem(key)
    return { isLocked: false, minutesRemaining: 0 }
  }
}

/**
 * Update failed attempt count and set lockout if threshold reached
 *
 * @param email - User's email address
 */
export function updateLocalLockout(email: string): void {
  if (typeof window === 'undefined') return

  const key = getLockoutKey(email)
  const data = localStorage.getItem(key)

  let state: LocalLockoutState

  if (data) {
    try {
      state = JSON.parse(data)
    } catch (error) {
      // Invalid JSON, start fresh
      state = {
        email: email.toLowerCase(),
        failedAttempts: 0,
        lockoutUntil: null
      }
    }
  } else {
    state = {
      email: email.toLowerCase(),
      failedAttempts: 0,
      lockoutUntil: null
    }
  }

  // Increment failed attempts
  state.failedAttempts = (state.failedAttempts || 0) + 1

  // Set lockout if threshold reached
  if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date()
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES)
    state.lockoutUntil = lockoutUntil.toISOString()
  }

  localStorage.setItem(key, JSON.stringify(state))
}

/**
 * Clear lockout state on successful signin
 *
 * @param email - User's email address
 */
export function clearLocalLockout(email: string): void {
  if (typeof window === 'undefined') return

  const key = getLockoutKey(email)
  localStorage.removeItem(key)
}
