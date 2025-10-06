/**
 * OAuth Callback Route Handler
 * Feature: 003-deploy-to-vercel
 * Task: T024
 *
 * Handles OAuth redirect from Supabase Auth:
 * - Exchanges authorization code for session
 * - Sets session cookies
 * - Redirects to app or intended destination
 * - Handles OAuth errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverExchangeCodeForSession } from '@/lib/supabase/route-handler'
import { logger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const redirectTo = requestUrl.searchParams.get('redirect_to')

  // Handle OAuth errors
  if (error) {
    logger.error({ error, errorDescription }, 'OAuth error')

    // Redirect to error page with error details
    const errorUrl = new URL('/auth/error', requestUrl.origin)
    errorUrl.searchParams.set('error', error)

    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }

    return NextResponse.redirect(errorUrl)
  }

  // Validate authorization code
  if (!code) {
    logger.error('Missing authorization code in callback')

    const errorUrl = new URL('/auth/error', requestUrl.origin)
    errorUrl.searchParams.set('error', 'invalid_request')
    errorUrl.searchParams.set(
      'error_description',
      'Authorization code is missing'
    )

    return NextResponse.redirect(errorUrl)
  }

  try {
    // Exchange code for session
    const { session, error: exchangeError } =
      await serverExchangeCodeForSession(code)

    if (exchangeError || !session) {
      logger.error({ err: exchangeError }, 'Failed to exchange code for session')

      const errorUrl = new URL('/auth/error', requestUrl.origin)
      errorUrl.searchParams.set('error', 'oauth_failed')
      errorUrl.searchParams.set(
        'error_description',
        exchangeError?.message || 'Failed to establish session'
      )

      return NextResponse.redirect(errorUrl)
    }

    // Successful authentication
    logger.info({ userId: session.user.id }, 'OAuth callback successful for user')

    // Determine redirect destination
    let destination = redirectTo || '/'

    // Sanitize redirect URL to prevent open redirect
    try {
      const redirectUrl = new URL(destination, requestUrl.origin)

      // Only allow redirects to same origin
      if (redirectUrl.origin !== requestUrl.origin) {
        logger.warn({ destination }, 'Attempted open redirect')
        destination = '/'
      } else {
        destination = redirectUrl.pathname + redirectUrl.search
      }
    } catch {
      // Invalid URL, default to home
      destination = '/'
    }

    // Redirect to destination
    const redirectUrl = new URL(destination, requestUrl.origin)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in OAuth callback')

    const errorUrl = new URL('/auth/error', requestUrl.origin)
    errorUrl.searchParams.set('error', 'server_error')
    errorUrl.searchParams.set(
      'error_description',
      'An unexpected error occurred'
    )

    return NextResponse.redirect(errorUrl)
  }
}

/**
 * Handle POST requests (not typically used for OAuth callback)
 * Redirect to GET handler
 */
export async function POST(request: NextRequest) {
  // OAuth callbacks use GET, but handle POST for completeness
  return GET(request)
}
