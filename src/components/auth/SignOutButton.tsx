/**
 * Sign-Out Button Component
 * Feature: 003-deploy-to-vercel
 * Task: T022
 *
 * Button to sign out current user
 * - Clears session
 * - Redirects to sign-in page
 * - Shows loading state
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/supabase-client'
import { LogOut, Loader2 } from 'lucide-react'

interface SignOutButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  redirectTo?: string
  children?: React.ReactNode
}

export default function SignOutButton({
  variant = 'ghost',
  className = '',
  redirectTo = '/auth/signin',
  children
}: SignOutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await signOut()

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Redirect to sign-in page
      router.push(redirectTo)
      router.refresh() // Refresh server components
    } catch (err) {
      console.error('Sign-out error:', err)
      setError('Failed to sign out')
      setIsLoading(false)
    }
  }

  const variantStyles = getVariantStyles(variant)

  return (
    <div>
      <button
        onClick={handleSignOut}
        disabled={isLoading}
        data-testid="signout-button"
        aria-label="Sign out"
        className={`
          inline-flex items-center gap-2 px-4 py-2
          ${variantStyles.bg} ${variantStyles.hover}
          ${variantStyles.text} ${variantStyles.border}
          font-medium rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        <span>{children || (isLoading ? 'Signing out...' : 'Sign out')}</span>
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

/**
 * Variant styles for different button appearances
 */
interface VariantStyles {
  bg: string
  hover: string
  text: string
  border: string
}

function getVariantStyles(
  variant: 'primary' | 'secondary' | 'ghost'
): VariantStyles {
  const styles: Record<string, VariantStyles> = {
    primary: {
      bg: 'bg-red-600',
      hover: 'hover:bg-red-700',
      text: 'text-white',
      border: 'border border-red-600'
    },
    secondary: {
      bg: 'bg-white dark:bg-gray-800',
      hover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
      text: 'text-gray-900 dark:text-white',
      border: 'border border-gray-300 dark:border-gray-600'
    },
    ghost: {
      bg: 'bg-transparent',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-none'
    }
  }

  return styles[variant]
}

/**
 * Compact Sign-Out Button
 * Icon-only button for use in nav bars or tight spaces
 */
export function SignOutIconButton({
  className = ''
}: {
  className?: string
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)

    try {
      const { error } = await signOut()

      if (!error) {
        router.push('/auth/signin')
        router.refresh()
      }
    } catch (err) {
      console.error('Sign-out error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      data-testid="signout-icon-button"
      aria-label="Sign out"
      className={`
        p-2 rounded-lg
        text-gray-700 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <LogOut className="w-5 h-5" />
      )}
    </button>
  )
}

/**
 * Sign-Out Menu Item
 * For use in dropdown menus
 */
export function SignOutMenuItem({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)

    try {
      const { error } = await signOut()

      if (!error) {
        router.push('/auth/signin')
        router.refresh()
      }
    } catch (err) {
      console.error('Sign-out error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      data-testid="signout-menu-item"
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-left
        text-sm text-red-600 dark:text-red-400
        hover:bg-red-50 dark:hover:bg-red-900/20
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
    </button>
  )
}
