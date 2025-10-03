/**
 * Email/Password Form Component
 * Feature: 004-add-email-add
 * Task: T012
 *
 * Email/password authentication form with:
 * - React Hook Form + Zod validation
 * - Rate limiting integration
 * - Login and signup modes
 * - Accessible form structure
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { checkLocalLockout, clearLocalLockout } from '@/lib/auth/rate-limit'
import { apiPost } from '@/lib/api/client'
import { emailSchema } from '@/lib/forms/schemas'

interface EmailPasswordFormProps {
  mode: 'login' | 'signup'
  onSuccess: () => void
  onError: (error: string) => void
}

// Login validation schema - simpler validation for login
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Signup validation schema with password confirmation and stronger requirements
const signupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>

export default function EmailPasswordForm({
  mode,
  onSuccess,
  onError
}: EmailPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutMinutes, setLockoutMinutes] = useState(0)

  const schema = mode === 'login' ? loginSchema : signupSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  // Check lockout when component mounts and update countdown
  useEffect(() => {
    if (!isLocked) return

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
  }, [isLocked, getValues])

  const onSubmit = async (data: LoginFormData | SignupFormData) => {
    // Check lockout before submission
    const lockout = checkLocalLockout(data.email)
    if (lockout.isLocked) {
      setIsLocked(true)
      setLockoutMinutes(lockout.minutesRemaining)
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const payload =
        mode === 'login'
          ? { email: data.email, password: data.password }
          : {
              email: data.email,
              password: (data as SignupFormData).password
            }

      const response = await apiPost<{ success: boolean; lockedUntil?: string; error?: string }>(
        endpoint,
        payload
      )

      if (response.data?.success || !response.error) {
        // Success - clear form and lockout
        clearLocalLockout(data.email)
        reset()
        onSuccess()
      } else {
        // Check if lockout error
        if (response.data?.lockedUntil) {
          const lockoutTime = new Date(response.data.lockedUntil)
          const now = new Date()
          const minutesRemaining = Math.ceil(
            (lockoutTime.getTime() - now.getTime()) / 60000
          )
          setIsLocked(true)
          setLockoutMinutes(minutesRemaining)
        }

        onError(
          response.error?.message ||
          response.data?.error ||
          'Authentication failed'
        )
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitButtonText = mode === 'login' ? 'Sign In' : 'Sign Up'
  const loadingText = mode === 'login' ? 'Signing in...' : 'Signing up...'

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} noValidate>
      {/* Lockout Message */}
      {isLocked && (
        <div
          role="alert"
          className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            Your account has been locked due to too many failed login attempts.
            Please try again in {lockoutMinutes} minute
            {lockoutMinutes !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Email Field */}
      <div className="mb-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Email
        </label>
        <input
          {...register('email')}
          id="email"
          type="email"
          autoComplete="email"
          disabled={isLocked || isSubmitting}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     aria-[invalid=true]:border-red-500"
        />
        {errors.email && (
          <p
            id="email-error"
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {String(errors.email.message)}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="mb-4">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Password
        </label>
        <input
          {...register('password')}
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isLocked || isSubmitting}
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     aria-[invalid=true]:border-red-500"
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {String(errors.password.message)}
          </p>
        )}
      </div>

      {/* Confirm Password Field (Signup Only) */}
      {mode === 'signup' && (
        <div className="mb-4">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Confirm Password
          </label>
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            disabled={isLocked || isSubmitting}
            aria-invalid={
              errors.confirmPassword ? 'true' : 'false'
            }
            aria-describedby={
              errors.confirmPassword ? 'confirmPassword-error' : undefined
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       aria-[invalid=true]:border-red-500"
          />
          {errors.confirmPassword && (
            <p
              id="confirmPassword-error"
              role="alert"
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {String(errors.confirmPassword.message)}
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLocked || isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3
                   bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
        <span>{isSubmitting ? loadingText : submitButtonText}</span>
      </button>
    </form>
  )
}
