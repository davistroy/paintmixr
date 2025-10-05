'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * LogoutButton component props
 */
interface LogoutButtonProps {
  /** Callback invoked when logout starts (before signOut call) */
  onLogoutStart?: () => void
  /** Callback invoked after logout completes (after signOut and redirect) */
  onLogoutComplete?: () => void
  /** Optional Tailwind CSS classes */
  className?: string
}

/**
 * LogoutButton Component
 *
 * Handles user logout via Supabase Auth and redirects to signin page.
 * Always redirects even if signOut fails (network errors, etc).
 *
 * Requirements: FR-011
 *
 * @example
 * ```tsx
 * <LogoutButton
 *   onLogoutStart={() => console.log('Logging out...')}
 *   onLogoutComplete={() => console.log('Logged out')}
 *   className="text-sm"
 * />
 * ```
 */
export function LogoutButton({
  onLogoutStart,
  onLogoutComplete,
  className = '',
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  /**
   * Handle logout flow
   * 1. Set loading state
   * 2. Call onLogoutStart callback
   * 3. Attempt Supabase signOut
   * 4. Redirect to signin (always, even on error)
   * 5. Call onLogoutComplete callback
   */
  const handleLogout = async () => {
    setIsLoading(true)
    onLogoutStart?.()

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/signin')
      onLogoutComplete?.()
    } catch (error) {
      // Always redirect even on error (network failure, etc.)
      console.error('Logout error:', error)
      router.push('/auth/signin')
      onLogoutComplete?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
      data-testid="logout-button"
      aria-label="Logout"
    >
      {isLoading ? (
        <span data-testid="loading-spinner" className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Logging out...
        </span>
      ) : (
        'Logout'
      )}
    </button>
  )
}
