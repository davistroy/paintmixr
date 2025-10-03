/**
 * Auth Provider Component
 * Feature: 003-deploy-to-vercel
 * Task: T023
 *
 * Provides authentication context to React components:
 * - Current user data
 * - Session state
 * - Auth state change listeners
 * - Loading states
 *
 * Wraps the app to provide auth throughout component tree
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

/**
 * Auth context value
 */
interface AuthContextValue {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialSession?: Session | null
}

/**
 * Auth Provider Component
 *
 * Wrap your app with this component to provide auth state
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <YourApp />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  children,
  initialUser = null,
  initialSession = null
}: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialUser)

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((event, session) => {
      console.log('Auth state change:', event)

      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          // User signed in
          router.refresh() // Refresh server components
          break

        case 'SIGNED_OUT':
          // User signed out
          setUser(null)
          setSession(null)
          router.push('/auth/signin')
          router.refresh()
          break

        case 'TOKEN_REFRESHED':
          // Token was refreshed
          console.log('Token refreshed')
          break

        case 'USER_UPDATED':
          // User data was updated
          console.log('User updated')
          break

        case 'PASSWORD_RECOVERY':
          // Password recovery email sent
          router.push('/auth/reset-password')
          break
      }
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [router])

  /**
   * Sign out handler
   */
  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/supabase/client')

    try {
      const { error } = await signOut()

      if (error) {
        console.error('Sign out error:', error)
        throw error
      }

      // State will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('Failed to sign out:', error)
      throw error
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: Boolean(user && session),
    signOut: handleSignOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 *
 * Must be used within AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuth()
 *   return <div>{user?.email}</div>
 * }
 * ```
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

/**
 * Hook to require authentication
 *
 * Redirects to sign-in if user is not authenticated
 *
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const { user } = useRequireAuth()
 *   // user is guaranteed to be non-null here
 *   return <div>Hello {user.email}</div>
 * }
 * ```
 */
export function useRequireAuth(): AuthContextValue & { user: User } {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to sign-in if not authenticated
      router.push('/auth/signin')
    }
  }, [auth.isLoading, auth.isAuthenticated, router])

  // TypeScript assertion: user is non-null when authenticated
  return auth as AuthContextValue & { user: User }
}

/**
 * Hook to get current user
 *
 * Returns null if not authenticated
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const user = useUser()
 *   if (!user) return <div>Not signed in</div>
 *   return <div>{user.email}</div>
 * }
 * ```
 */
export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

/**
 * Hook to get current session
 *
 * Returns null if no active session
 *
 * @example
 * ```tsx
 * function SessionInfo() {
 *   const session = useSession()
 *   if (!session) return null
 *   return <div>Expires: {new Date(session.expires_at * 1000).toLocaleString()}</div>
 * }
 * ```
 */
export function useSession(): Session | null {
  const { session } = useAuth()
  return session
}

/**
 * HOC to protect a component
 *
 * Wraps component and requires authentication
 *
 * @example
 * ```tsx
 * const ProtectedComponent = withAuth(MyComponent)
 * ```
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useRequireAuth()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      // Redirect happens in useRequireAuth
      return null
    }

    return <Component {...props} />
  }
}
