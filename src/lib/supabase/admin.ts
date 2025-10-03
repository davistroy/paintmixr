/**
 * Supabase Admin Client Factory
 * Feature: 005-use-codebase-analysis
 * Tasks: T034, T049
 *
 * Creates Supabase client with service_role key for admin operations.
 * Used for user metadata management, lockout enforcement, and privileged operations.
 *
 * Security Notes:
 * - Service role key bypasses Row Level Security (RLS)
 * - Only use server-side (never expose to client)
 * - Required for auth.users table operations (metadata updates)
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database/database.types'

/**
 * Create Supabase admin client with service_role key
 *
 * Returns a client with elevated privileges for server-side operations.
 * Session persistence is disabled as this is for server-only use.
 *
 * @returns SupabaseClient with admin privileges
 * @throws Error if environment variables are missing
 *
 * @example
 * ```typescript
 * const adminClient = createClient()
 * const { data: users } = await adminClient.auth.admin.listUsers({
 *   filter: `email.eq.${email}`
 * })
 * ```
 */
export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
