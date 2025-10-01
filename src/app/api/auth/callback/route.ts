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
import { serverExchangeCodeForSession } from '@/lib/auth/supabase-server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const redirectTo = requestUrl.searchParams.get('redirect_to')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)

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
    console.error('Missing authorization code in callback')

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
      console.error('Failed to exchange code for session:', exchangeError)

      const errorUrl = new URL('/auth/error', requestUrl.origin)
      errorUrl.searchParams.set('error', 'oauth_failed')
      errorUrl.searchParams.set(
        'error_description',
        exchangeError?.message || 'Failed to establish session'
      )

      return NextResponse.redirect(errorUrl)
    }

    // Successful authentication
    console.log('OAuth callback successful for user:', session.user.id)

    // Determine redirect destination
    let destination = redirectTo || '/'

    // Sanitize redirect URL to prevent open redirect
    try {
      const redirectUrl = new URL(destination, requestUrl.origin)

      // Only allow redirects to same origin
      if (redirectUrl.origin !== requestUrl.origin) {
        console.warn('Attempted open redirect:', destination)
        destination = '/'
      } else {
        destination = redirectUrl.pathname + redirectUrl.search
      }
    } catch (e) {
      // Invalid URL, default to home
      destination = '/'
    }

    // Redirect to destination
    const redirectUrl = new URL(destination, requestUrl.origin)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)

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
