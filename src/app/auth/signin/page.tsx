/**
 * Sign-In Page
 * Feature: 003-deploy-to-vercel
 * Task: T019
 *
 * Displays OAuth provider buttons for authentication:
 * - Google sign-in
 * - Microsoft sign-in
 * - Facebook sign-in
 *
 * Handles redirect parameter for post-auth navigation
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { validateServerAuth } from '@/lib/auth/supabase-server'
import SignInButton from '@/components/auth/SignInButton'
import EmailSigninForm from '@/components/auth/EmailSigninForm'

export const metadata = {
  title: 'Sign In - PaintMixr',
  description: 'Sign in to PaintMixr with Google, Microsoft, or Facebook'
}

export default async function SignInPage({
  searchParams
}: {
  searchParams: { redirect?: string; error?: string }
}) {
  // Check if user is already authenticated
  const { isAuthenticated } = await validateServerAuth()

  if (isAuthenticated) {
    // Redirect authenticated users to home or intended destination
    const redirectTo = searchParams.redirect || '/'
    redirect(redirectTo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to PaintMixr
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to access your paint collection
            </p>
          </div>

          {/* Error message */}
          {searchParams.error && (
            <div
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              data-testid="error-banner"
            >
              <p className="text-sm text-red-800 dark:text-red-200">
                {getErrorMessage(searchParams.error)}
              </p>
            </div>
          )}

          {/* Session expired message */}
          <Suspense fallback={null}>
            <SessionExpiredMessage />
          </Suspense>

          {/* OAuth Providers */}
          <div className="space-y-3" data-testid="oauth-providers">
            <SignInButton
              provider="google"
              redirectTo={searchParams.redirect}
            />
            <SignInButton
              provider="microsoft"
              redirectTo={searchParams.redirect}
            />
            <SignInButton
              provider="facebook"
              redirectTo={searchParams.redirect}
            />
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <EmailSigninForm redirectTo={searchParams.redirect} />

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in with any provider. Accounts with the same email are
              automatically linked.
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@paintmixr.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Session expired message component
 * Shows message if user was redirected due to session expiry
 */
function SessionExpiredMessage() {
  // In real implementation, check for session_expired param
  // For now, return null
  return null
}

/**
 * Get user-friendly error message
 *
 * @param errorCode - Error code from OAuth callback
 * @returns User-friendly error message
 */
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    access_denied: 'You cancelled the sign-in process. Please try again.',
    server_error: 'An error occurred during sign-in. Please try again.',
    oauth_failed: 'Authentication failed. Please try again.',
    invalid_request: 'Invalid sign-in request. Please try again.',
    temporarily_unavailable:
      'The authentication service is temporarily unavailable. Please try again later.',
    session_expired: 'Your session has expired. Please sign in again.',
    invalid_credentials: 'Invalid credentials. Please try again.',
    account_suspended: 'Your account has been suspended. Contact support.',
    email_not_verified: 'Please verify your email address.',
    rate_limit_exceeded: 'Too many sign-in attempts. Please try again later.',
    account_locked: 'Account temporarily locked. Please try again in 15-30 minutes.',
    oauth_precedence: 'This email is linked to a social login. Please use that method.'
  }

  return (
    errorMessages[errorCode] ||
    'An unexpected error occurred. Please try again.'
  )
}
