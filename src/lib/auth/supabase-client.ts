/**
 * Client-Side Supabase Client
 * Feature: 003-deploy-to-vercel
 * Task: T016
 *
 * Provides a Supabase client for browser/client-side operations including:
 * - OAuth sign-in flows
 * - Session management
 * - Real-time subscription to auth state changes
 *
 * Usage: Import this in React components and client-side code
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/types'

/**
 * Creates a Supabase client for client-side operations
 *
 * This client:
 * - Automatically manages session cookies
 * - Handles OAuth redirects
 * - Refreshes tokens automatically
 * - Provides real-time auth state updates
 *
 * @returns Supabase browser client instance
 */
export function createClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Use default cookie handling from @supabase/ssr
  // The package handles cookies automatically for browser environments
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Sign in with OAuth provider
 *
 * @param provider - OAuth provider ('google', 'azure', 'facebook')
 * @param redirectTo - Optional redirect URL after successful auth
 * @returns Promise with OAuth redirect data or error
 */
export async function signInWithOAuth(
  provider: 'google' | 'azure' | 'facebook',
  redirectTo?: string
) {
  const supabase = createClient()

  // Always use the environment variable for production, fallback to origin only for local dev
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${appUrl}/api/auth/callback`,
      scopes: provider === 'google' ? 'email profile' : 'email',
      // Query params to preserve state
      queryParams: redirectTo
        ? {
            redirect_to: encodeURIComponent(redirectTo)
          }
        : undefined
    }
  })

  if (error) {
    console.error(`OAuth sign-in error (${provider}):`, error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Sign out the current user
 *
 * Clears session cookies and signs out from Supabase Auth
 *
 * @returns Promise with success or error
 */
export async function signOut() {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign-out error:', error)
    return { error }
  }

  return { error: null }
}

/**
 * Get the current session
 *
 * @returns Promise with session data or null
 */
export async function getSession() {
  const supabase = createClient()

  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Get session error:', error)
    return { session: null, error }
  }

  return { session, error: null }
}

/**
 * Get the current user
 *
 * @returns Promise with user data or null
 */
export async function getUser() {
  const supabase = createClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Get user error:', error)
    return { user: null, error }
  }

  return { user, error: null }
}

/**
 * Refresh the current session
 *
 * Manually triggers token refresh using refresh token
 *
 * @returns Promise with new session or error
 */
export async function refreshSession() {
  const supabase = createClient()

  const {
    data: { session },
    error
  } = await supabase.auth.refreshSession()

  if (error) {
    console.error('Refresh session error:', error)
    return { session: null, error }
  }

  return { session, error: null }
}

/**
 * Subscribe to auth state changes
 *
 * Useful for React components to listen for sign-in/sign-out events
 *
 * @param callback - Function called on auth state change
 * @returns Unsubscribe function
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

/**
 * Exchange OAuth code for session
 *
 * Called in callback route after OAuth provider redirect
 *
 * @param code - Authorization code from OAuth provider
 * @returns Promise with session data or error
 */
export async function exchangeCodeForSession(code: string) {
  const supabase = createClient()

  const {
    data: { session },
    error
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Exchange code error:', error)
    return { session: null, error }
  }

  return { session, error: null }
}

/**
 * Sign in with email and password
 *
 * Authenticates a user using email/password credentials.
 * Email is normalized to lowercase before authentication.
 *
 * @param email - User's email address (will be normalized to lowercase)
 * @param password - User's password
 * @returns Promise with session/user data or error
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
) {
  const supabase = createClient()

  // Normalize email to lowercase for consistency
  const normalizedEmail = email.toLowerCase().trim()

  const {
    data: { session, user },
    error
  } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  })

  if (error) {
    console.error('Email/password sign-in error:', error)
    return { session: null, user: null, error }
  }

  return { session, user, error: null }
}

// Export singleton instance for convenience
export const supabase = createClient()
