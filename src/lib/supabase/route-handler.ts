/**
 * Supabase API Route Handler Client Factory
 * Feature: 005-use-codebase-analysis
 * Task: T048
 *
 * Creates Supabase client for API route handlers using @supabase/ssr.
 * Uses Next.js cookies() API for session management (same pattern as server.ts).
 *
 * Usage:
 * ```typescript
 * import { createClient } from '@/lib/supabase/route-handler'
 * const supabase = await createClient()
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'
import { logger } from '@/lib/logging/logger';

/**
 * Create Supabase client for API route handlers
 *
 * Returns a client for use in API route handlers (app/api/**\/route.ts).
 * Sessions are managed via Next.js cookies API.
 *
 * IMPORTANT: This function is async in Next.js 15 (cookies() is async)
 *
 * @returns Promise<SupabaseClient> for API route use
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
 * Exchange OAuth code for session in route handler
 * Called in callback route handler after OAuth redirect
 */
export async function serverExchangeCodeForSession(code: string) {
  const supabase = await createClient()

  const {
    data: { session },
    error
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logger.error('Server exchange code error:', error)
    return { session: null, error }
  }

  return { session, error: null }
}

/**
 * Sign out on server (route handler)
 * Clears session cookies and invalidates session
 */
export async function serverSignOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('Server sign-out error:', error)
    return { success: false, error }
  }

  return { success: true, error: null }
}
