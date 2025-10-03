/**
 * Sign-Out API Route Handler
 * Feature: 003-deploy-to-vercel
 * Task: T025
 *
 * Handles user sign-out:
 * - Clears session cookies
 * - Invalidates session on server
 * - Returns success response
 */

import { NextRequest, NextResponse } from 'next/server'
import { serverSignOut } from '@/lib/supabase/route-handler'

/**
 * POST /api/auth/signout
 *
 * Signs out the current user
 */
export async function POST(_request: NextRequest) {
  try {
    // Sign out on server (clears cookies)
    const { success, error } = await serverSignOut()

    if (error) {
      console.error('Sign-out error:', error)

      return NextResponse.json(
        {
          error: {
            code: 'SIGNOUT_FAILED',
            message: error.message || 'Failed to sign out'
          }
        },
        { status: 500 }
      )
    }

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: 'SIGNOUT_FAILED',
            message: 'Sign-out was not successful'
          }
        },
        { status: 500 }
      )
    }

    // Successful sign-out
    return NextResponse.json(
      {
        message: 'Signed out successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error during sign-out:', error)

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/signout
 *
 * Alternative GET endpoint for sign-out
 * Redirects to sign-in page after sign-out
 */
export async function GET(request: NextRequest) {
  try {
    const { success, error } = await serverSignOut()

    if (error || !success) {
      // Redirect to error page
      const requestUrl = new URL(request.url)
      const errorUrl = new URL('/auth/error', requestUrl.origin)
      errorUrl.searchParams.set('error', 'signout_failed')

      return NextResponse.redirect(errorUrl)
    }

    // Redirect to sign-in page
    const requestUrl = new URL(request.url)
    const signinUrl = new URL('/auth/signin', requestUrl.origin)

    return NextResponse.redirect(signinUrl)
  } catch (error) {
    console.error('Unexpected error during sign-out:', error)

    const requestUrl = new URL(request.url)
    const errorUrl = new URL('/auth/error', requestUrl.origin)
    errorUrl.searchParams.set('error', 'server_error')

    return NextResponse.redirect(errorUrl)
  }
}

/**
 * Handle OPTIONS for CORS
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
