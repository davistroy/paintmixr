/**
 * Supabase Browser Client Factory
 * Feature: 005-use-codebase-analysis
 * Task: T046
 *
 * Creates Supabase client for browser/client components using @supabase/ssr.
 * Sessions are persisted via cookies for security and SSR compatibility.
 *
 * Usage:
 * ```typescript
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import { logger } from '@/lib/logging/logger';

/**
 * Create Supabase browser client with cookie-based session storage
 *
 * Returns a client for use in client components and browser contexts.
 * Sessions are automatically persisted via cookies (not localStorage).
 *
 * @returns SupabaseClient for browser use
 * @throws Error if environment variables are missing
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Sign in with OAuth provider
 * Initiates OAuth flow for browser clients
 */
export async function signInWithOAuth(
  provider: 'google' | 'azure' | 'facebook',
  redirectTo?: string
) {
  const supabase = createClient()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      scopes: provider === 'google' ? 'email profile' : 'email',
      queryParams: redirectTo
        ? { redirect_to: encodeURIComponent(redirectTo) }
        : undefined
    }
  })

  if (error) {
    logger.error(`OAuth sign-in error (${provider}):`, error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Sign out the current user
 * Clears session cookies and signs out from Supabase Auth
 */
export async function signOut() {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('Sign-out error:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Subscribe to auth state changes
 * Useful for React components to listen for sign-in/sign-out events
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  const supabase = createClient()

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(callback)

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe()
  }
}
