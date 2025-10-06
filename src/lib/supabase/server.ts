/**
 * Supabase Server Component Client Factory
 * Feature: 005-use-codebase-analysis
 * Task: T047
 *
 * Creates Supabase client for server components using @supabase/ssr.
 * Uses Next.js cookies() API for session management (Next.js 15 async pattern).
 *
 * Usage:
 * ```typescript
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = await createClient()
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'
import { logger } from '@/lib/logging/logger';

/**
 * Create Supabase server client with cookie-based session storage
 *
 * Returns a client for use in server components, server actions, and route handlers.
 * Sessions are managed via Next.js cookies API.
 *
 * IMPORTANT: This function is async in Next.js 15 (cookies() is async)
 *
 * @returns Promise<SupabaseClient> for server use
 * @throws Error if environment variables are missing
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}

/**
 * Get server-side session
 * Retrieves session from cookies on the server
 */
export async function getServerSession() {
  const supabase = await createClient()

  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error) {
    logger.error('Server get session error:', error)
    return { session: null, user: null, error }
  }

  if (!session) {
    return { session: null, user: null, error: null }
  }

  return { session, user: session.user, error: null }
}

/**
 * Validate server-side authentication
 * Checks if user is authenticated and session is valid
 */
export async function validateServerAuth() {
  const { session, user, error } = await getServerSession()

  const isAuthenticated = Boolean(session && user && !error)

  return {
    isAuthenticated,
    session,
    user,
    error
  }
}
