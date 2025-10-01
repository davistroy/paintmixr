/**
 * Sign-In Button Component
 * Feature: 003-deploy-to-vercel
 * Task: T021
 *
 * OAuth provider sign-in buttons:
 * - Google (red/white branding)
 * - Microsoft (blue/white branding)
 * - Facebook (blue branding)
 *
 * Handles OAuth flow initiation with loading states
 */

'use client'

import { useState } from 'react'
import { signInWithOAuth } from '@/lib/auth/supabase-client'
import { Loader2 } from 'lucide-react'

interface SignInButtonProps {
  provider: 'google' | 'microsoft' | 'facebook'
  redirectTo?: string
  className?: string
}

export default function SignInButton({
  provider,
  redirectTo,
  className = ''
}: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerConfig = getProviderConfig(provider)

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await signInWithOAuth(
        provider === 'microsoft' ? 'azure' : provider,
        redirectTo
      )

      if (error) {
        setError(error.message)
        setIsLoading(false)
      }

      // If successful, user will be redirected to OAuth provider
      // No need to update loading state
    } catch (err) {
      console.error('Sign-in error:', err)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        data-testid={`signin-${provider}`}
        aria-label={`Sign in with ${providerConfig.displayName}`}
        role="button"
        className={`
          w-full flex items-center justify-center gap-3 px-6 py-3
          ${providerConfig.bgColor} ${providerConfig.hoverBg}
          ${providerConfig.textColor}
          font-medium rounded-lg
          transition-all duration-200
          border ${providerConfig.borderColor}
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 ${providerConfig.focusRing}
          ${className}
        `}
      >
        {/* Provider Icon */}
        {isLoading ? (
          <Loader2
            className="w-5 h-5 animate-spin"
            data-testid="signin-loading"
          />
        ) : (
          <providerConfig.Icon className="w-5 h-5" />
        )}

        {/* Button Text */}
        <span>
          {isLoading
            ? 'Signing in...'
            : `Sign in with ${providerConfig.displayName}`}
        </span>
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Provider configuration
 * Includes branding, colors, and icons
 */
interface ProviderConfig {
  displayName: string
  Icon: React.FC<{ className?: string }>
  bgColor: string
  hoverBg: string
  textColor: string
  borderColor: string
  focusRing: string
}

function getProviderConfig(
  provider: 'google' | 'microsoft' | 'facebook'
): ProviderConfig {
  const configs: Record<string, ProviderConfig> = {
    google: {
      displayName: 'Google',
      Icon: GoogleIcon,
      bgColor: 'bg-white dark:bg-gray-800',
      hoverBg: 'hover:bg-gray-50 dark:hover:bg-gray-700',
      textColor: 'text-gray-900 dark:text-white',
      borderColor: 'border-gray-300 dark:border-gray-600',
      focusRing: 'focus:ring-blue-500'
    },
    microsoft: {
      displayName: 'Microsoft',
      Icon: MicrosoftIcon,
      bgColor: 'bg-white dark:bg-gray-800',
      hoverBg: 'hover:bg-gray-50 dark:hover:bg-gray-700',
      textColor: 'text-gray-900 dark:text-white',
      borderColor: 'border-gray-300 dark:border-gray-600',
      focusRing: 'focus:ring-blue-500'
    },
    facebook: {
      displayName: 'Facebook',
      Icon: FacebookIcon,
      bgColor: 'bg-[#1877F2]',
      hoverBg: 'hover:bg-[#166FE5]',
      textColor: 'text-white',
      borderColor: 'border-[#1877F2]',
      focusRing: 'focus:ring-blue-400'
    }
  }

  return configs[provider]
}

/**
 * Google Icon Component
 */
function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/**
 * Microsoft Icon Component
 */
function MicrosoftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f3f3f3" d="M0 0h23v23H0z" />
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}

/**
 * Facebook Icon Component
 */
function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * Help text component for Microsoft
 * Explains that both personal and work accounts are supported
 */
export function MicrosoftHelpText() {
  return (
    <p
      className="text-xs text-gray-500 dark:text-gray-400 mt-1"
      data-testid="microsoft-help-text"
    >
      Works with personal and work accounts
    </p>
  )
}
