/**
 * Email Sign-In Form Component
 * Feature: 004-add-email-add
 * Task: T012
 *
 * Signin-only email/password form with:
 * - React Hook Form + Zod validation
 * - Client-side rate limiting
 * - Server-side lockout enforcement
 * - WCAG 2.1 AA accessibility
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { emailSigninSchema } from '@/lib/auth/validation'
import {
  checkLocalLockout,
  updateLocalLockout,
  clearLocalLockout
} from '@/lib/auth/rate-limit'
import { apiPost } from '@/lib/api/client'
import type { EmailSigninInput, EmailSigninResponse } from '@/types/auth'

interface EmailSigninFormProps {
  redirectTo?: string
  className?: string
}

export default function EmailSigninForm({
  redirectTo,
  className = ''
}: EmailSigninFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutMinutes, setLockoutMinutes] = useState(0)
  const [mounted, setMounted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues
  } = useForm<EmailSigninInput>({
    resolver: zodResolver(emailSigninSchema),
    mode: 'onSubmit'
  })

  // Set mounted flag to prevent SSR hydration issues with localStorage
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check lockout when component mounts and update countdown
  useEffect(() => {
    if (!mounted || !isLocked) return

    const interval = setInterval(() => {
      const email = getValues('email')
      if (!email) return

      const updatedLockout = checkLocalLockout(email)
      setIsLocked(updatedLockout.isLocked)
      setLockoutMinutes(updatedLockout.minutesRemaining)

      if (!updatedLockout.isLocked) {
        clearInterval(interval)
      }
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [mounted, isLocked, getValues])

  const onSubmit = async (data: EmailSigninInput) => {
    setError(null)

    // Check local lockout state (immediate client-side feedback) - only if mounted
    if (mounted) {
      const lockoutData = checkLocalLockout(data.email)
      if (lockoutData.isLocked) {
        setIsLocked(true)
        setLockoutMinutes(lockoutData.minutesRemaining)
        setError(
          `Account locked. Try again in ${lockoutData.minutesRemaining} minute${
            lockoutData.minutesRemaining !== 1 ? 's' : ''
          }.`
        )
        return
      }
    }

    try {
      // Call server-side API route using shared client
      const response = await apiPost<EmailSigninResponse>(
        '/api/auth/email-signin',
        data
      )

      if (response.data?.success) {
        // Success - clear lockout and redirect (only if mounted)
        if (mounted) {
          clearLocalLockout(data.email)
        }
        router.push(redirectTo || response.data.redirectUrl || '/')
        router.refresh()
      } else {
        // Error - display message and update local lockout tracking
        setError(
          response.error?.message ||
          response.data?.error ||
          'Sign-in failed. Please try again.'
        )

        // Update local lockout state (only if mounted)
        if (mounted) {
          updateLocalLockout(data.email)
        }

        // Check if now locked out (only if mounted)
        if (mounted) {
          const updatedLockout = checkLocalLockout(data.email)
          if (updatedLockout.isLocked) {
            setIsLocked(true)
            setLockoutMinutes(updatedLockout.minutesRemaining)
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-4 ${className}`}
      data-testid="email-signin-form"
      noValidate
    >
      {/* Lockout Warning */}
      {isLocked && (
        <div
          data-testid="lockout-message"
          role="alert"
          aria-live="polite"
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-800 dark:text-red-200" data-testid="lockout-timer">
            Account locked due to too many failed attempts. Try again in{' '}
            {lockoutMinutes} minute{lockoutMinutes !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          data-testid="email-input"
          autoComplete="email"
          disabled={isLocked || isSubmitting}
          aria-label="Email address"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white
                     disabled:opacity-50 disabled:cursor-not-allowed
                     aria-[invalid=true]:border-red-500"
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          data-testid="password-input"
          autoComplete="current-password"
          disabled={isLocked || isSubmitting}
          aria-label="Password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white
                     disabled:opacity-50 disabled:cursor-not-allowed
                     aria-[invalid=true]:border-red-500"
          {...register('password')}
        />
        {errors.password && (
          <p
            id="password-error"
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && !isLocked && (
        <div
          data-testid="signin-error"
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        data-testid="signin-button"
        disabled={isSubmitting || isLocked}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium
                   rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isSubmitting ? 'Signing in...' : 'Sign in with Email'}</span>
      </button>
    </form>
  )
}
