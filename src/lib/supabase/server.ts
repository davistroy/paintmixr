/**
 * Re-export server client functions for compatibility with tests
 * This module provides backward compatibility for test mocks
 */

export {
  createServerComponentClient,
  createRouteHandlerClient as createClient,
  createServerActionClient,
  getServerSession,
  getServerUser,
  validateServerAuth,
  requireServerAuth,
  serverSignOut,
  serverExchangeCodeForSession,
  getUserIdentities,
  hasProviderLinked,
} from '@/lib/auth/supabase-server'
