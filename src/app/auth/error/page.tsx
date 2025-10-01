/**
 * Auth Error Page
 * Feature: 003-deploy-to-vercel
 * Task: T020
 *
 * Displays authentication errors with user-friendly messages
 * Provides options to retry or get help
 */

import Link from 'next/link'
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react'

export const metadata = {
  title: 'Authentication Error - PaintMixr',
  description: 'An error occurred during authentication'
}

interface ErrorPageProps {
  searchParams: {
    error?: string
    error_description?: string
    provider?: string
  }
}

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { error, error_description, provider } = searchParams

  const errorInfo = getErrorInfo(error || 'unknown', provider)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
            {errorInfo.title}
          </h1>

          {/* Error Message */}
          <div
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            data-testid="error-message"
          >
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error || 'unknown'}
            </p>
            {error_description && (
              <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                {error_description}
              </p>
            )}
          </div>

          {/* User-friendly explanation */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            {errorInfo.message}
          </p>

          {/* Troubleshooting tips */}
          {errorInfo.tips.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What you can try:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {errorInfo.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Link>
          </div>

          {/* Contact support */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Still having issues?
            </p>
            <a
              href="mailto:support@paintmixr.com?subject=Authentication Error"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>

        {/* Technical details (for developers) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
              <strong>Debug Info:</strong>
              <br />
              Error Code: {error || 'none'}
              <br />
              Provider: {provider || 'none'}
              <br />
              Description: {error_description || 'none'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Error information structure
 */
interface ErrorInfo {
  title: string
  message: string
  tips: string[]
}

/**
 * Get error information based on error code
 *
 * @param errorCode - Error code from OAuth provider
 * @param provider - OAuth provider name
 * @returns Error information with title, message, and tips
 */
function getErrorInfo(errorCode: string, provider?: string): ErrorInfo {
  const providerName = getProviderDisplayName(provider)

  const errorMap: Record<string, ErrorInfo> = {
    access_denied: {
      title: 'Access Denied',
      message: `You cancelled the sign-in process with ${providerName}.`,
      tips: [
        'Click "Try Again" to restart the sign-in process',
        'Make sure to grant the required permissions',
        'Try a different sign-in provider'
      ]
    },
    server_error: {
      title: 'Server Error',
      message: 'An error occurred on our servers during authentication.',
      tips: [
        'Wait a few moments and try again',
        'Check your internet connection',
        'If the problem persists, contact support'
      ]
    },
    temporarily_unavailable: {
      title: 'Service Unavailable',
      message: `${providerName} is temporarily unavailable.`,
      tips: [
        'Wait a few minutes and try again',
        'Try a different sign-in provider',
        'Check the provider\'s status page'
      ]
    },
    invalid_request: {
      title: 'Invalid Request',
      message: 'The authentication request was invalid or malformed.',
      tips: [
        'Try signing in again',
        'Clear your browser cookies and cache',
        'Contact support if the issue continues'
      ]
    },
    oauth_failed: {
      title: 'Authentication Failed',
      message: `Failed to authenticate with ${providerName}.`,
      tips: [
        'Verify your account with the provider',
        'Check that you\'re using the correct account',
        'Try a different browser or device'
      ]
    },
    invalid_client: {
      title: 'Configuration Error',
      message: 'There is an issue with the authentication configuration.',
      tips: [
        'Contact support - this is likely a configuration issue',
        'Try again later after the issue is resolved'
      ]
    },
    consent_required: {
      title: 'Consent Required',
      message: `${providerName} requires additional consent.`,
      tips: [
        'Try signing in again and accept all permissions',
        'Check your account settings with the provider',
        'Contact support if you believe this is an error'
      ]
    },
    interaction_required: {
      title: 'Interaction Required',
      message: `${providerName} requires additional interaction.`,
      tips: [
        'Complete the required steps with the provider',
        'Check for any verification emails',
        'Try signing in again'
      ]
    },
    session_expired: {
      title: 'Session Expired',
      message: 'Your authentication session has expired.',
      tips: [
        'Click "Try Again" to sign in',
        'Sessions expire after 24 hours of inactivity'
      ]
    },
    unknown: {
      title: 'Unknown Error',
      message: 'An unexpected error occurred during authentication.',
      tips: [
        'Try signing in again',
        'Try a different browser or device',
        'Clear your browser cache and cookies',
        'Contact support with the error details above'
      ]
    }
  }

  return errorMap[errorCode] || errorMap.unknown
}

/**
 * Get display name for OAuth provider
 *
 * @param provider - Provider code
 * @returns Display name
 */
function getProviderDisplayName(provider?: string): string {
  const providerMap: Record<string, string> = {
    google: 'Google',
    azure: 'Microsoft',
    facebook: 'Facebook'
  }

  return provider ? providerMap[provider] || provider : 'the provider'
}
