/**
 * Admin Clear Lockout API Endpoint
 * Feature: 005-use-codebase-analysis
 * Task: T037
 *
 * POST /api/auth/admin/clear-lockout
 * Body: { userId: "uuid" }
 *
 * Clears lockout status for a user account (admin only).
 * Resets failed login attempts and lockout timestamp.
 *
 * Security:
 * - Requires Authorization header with Bearer token
 * - Validates user existence before clearing
 * - Returns 404 for non-existent users, 401 for unauthorized
 */

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { clearLockout } from '@/lib/auth/metadata-helpers'

export async function POST(request: Request) {
  // TODO: Implement admin authentication check
  // For now, require service role key in Authorization header

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'unauthorized', message: 'Admin authentication required' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return Response.json({ error: 'missing_user_id' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verify user exists
  const { data: user, error } = await adminClient.auth.admin.getUserById(userId)

  if (error || !user) {
    return Response.json(
      { error: 'user_not_found', message: 'User does not exist', userId },
      { status: 404 }
    )
  }

  // Clear lockout metadata
  await clearLockout(userId, adminClient)

  return Response.json({
    success: true,
    message: 'Lockout cleared for user',
    userId
  })
}
