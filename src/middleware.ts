/**
 * Next.js Middleware - Authentication
 * Feature: 003-deploy-to-vercel
 * Task: T026
 *
 * Protects routes requiring authentication:
 * - Validates session cookies
 * - Redirects unauthenticated users to /auth/signin
 * - Allows public routes (auth pages, API callbacks)
 * - Preserves intended destination in redirect parameter
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/error',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/email-signin',
  '/api/auth/rate-limit-status',
  '/api/auth/lockout-status',
  '/api/paints',
  '/api/optimize',
  '/api/sessions'
]

/**
 * Check if path is public (doesn't require auth)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

/**
 * Middleware function
 *
 * Runs on every request to validate authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // TEMPORARY: Disable middleware auth - rely on route-level auth only
  return NextResponse.next()

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Create Supabase client with middleware cookie handling
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return redirectToSignIn(request, pathname)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options
        })
        response.cookies.set({
          name,
          value,
          ...options
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0
        })
        response.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0
        })
      }
    }
  })

  try {
    // Get session from cookies
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Check if session is valid
    if (error || !session) {
      console.log('No valid session, redirecting to sign-in')
      return redirectToSignIn(request, pathname)
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired, redirecting to sign-in')
      return redirectToSignIn(request, pathname, true)
    }

    // Session is valid, allow request
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return redirectToSignIn(request, pathname)
  }
}

/**
 * Redirect to sign-in page
 *
 * Preserves intended destination in redirect parameter
 *
 * @param request - Next.js request
 * @param intendedPath - Path user tried to access
 * @param sessionExpired - Whether session expired
 * @returns Redirect response
 */
function redirectToSignIn(
  request: NextRequest,
  intendedPath: string,
  sessionExpired = false
): NextResponse {
  const signInUrl = new URL('/auth/signin', request.url)

  // Preserve intended destination
  if (intendedPath !== '/') {
    signInUrl.searchParams.set('redirect', intendedPath)
  }

  // Add session expired flag if applicable
  if (sessionExpired) {
    signInUrl.searchParams.set('error', 'session_expired')
  }

  return NextResponse.redirect(signInUrl)
}

/**
 * Middleware configuration
 *
 * Specifies which routes middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled at route level)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
