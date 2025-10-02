# Quickstart: Email/Password Authentication Integration

**Feature**: 004-add-email-add
**Date**: 2025-10-01
**Status**: Complete

## Overview
Quick reference for integrating email/password authentication into PaintMixr. Covers common scenarios, code examples, and integration steps.

## Prerequisites

- Supabase project configured with Auth enabled
- Next.js 14+ with App Router
- Existing OAuth authentication setup (Google, Microsoft, Facebook)
- @supabase/ssr and @supabase/supabase-js installed

## Scenario 1: Adding Email Form to Sign-In Page

### Goal
Modify `/app/auth/signin/page.tsx` to include email/password form alongside OAuth buttons.

### Implementation

**1. Import new components:**
```typescript
import EmailPasswordForm from '@/components/auth/EmailPasswordForm'
```

**2. Add visual separator:**
```tsx
{/* OAuth Providers */}
<div className="space-y-3">
  <SignInButton provider="google" redirectTo={searchParams.redirect} />
  <SignInButton provider="microsoft" redirectTo={searchParams.redirect} />
  <SignInButton provider="facebook" redirectTo={searchParams.redirect} />
</div>

{/* Divider */}
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">
      Or continue with email
    </span>
  </div>
</div>

{/* Email/Password Form */}
<EmailPasswordForm redirectTo={searchParams.redirect} />
```

**3. Update error handling:**
```tsx
// Add new error codes for email auth
const errorMessages: Record<string, string> = {
  // ... existing OAuth errors
  account_locked: 'Account temporarily locked. Please try again in 15-30 minutes.',
  oauth_precedence: 'This email is linked to a social login. Please use that method.',
}
```

### File Changes
- **Modified**: `src/app/auth/signin/page.tsx`
- **New**: `src/components/auth/EmailPasswordForm.tsx`

## Scenario 2: Creating Email/Password Form Component

### Goal
Build reusable form component with validation, loading states, and error handling.

### Implementation

**File**: `src/components/auth/EmailPasswordForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { emailSigninSchema } from '@/lib/auth/validation'
import type { EmailSigninInput } from '@/types/auth'

interface EmailPasswordFormProps {
  redirectTo?: string
  className?: string
}

export default function EmailPasswordForm({
  redirectTo,
  className = ''
}: EmailPasswordFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<EmailSigninInput>({
    resolver: zodResolver(emailSigninSchema)
  })

  const onSubmit = async (data: EmailSigninInput) => {
    setError(null)

    // Check local lockout state
    const lockoutData = checkLocalLockout(data.email)
    if (lockoutData.isLocked) {
      setIsLocked(true)
      setError(`Account locked. Try again in ${lockoutData.minutesRemaining} minutes.`)
      return
    }

    // Call API route
    const response = await fetch('/api/auth/email-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (result.success) {
      // Success - redirect
      router.push(redirectTo || result.redirectUrl)
      router.refresh()
    } else {
      // Error - display message
      setError(result.error)

      // Update local lockout tracking
      updateLocalLockout(data.email)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className}`}>
      {/* Email Input */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-label="Email address"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white"
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-label="Password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     dark:bg-gray-700 dark:text-white"
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isLocked}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium
                   rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isSubmitting ? 'Signing in...' : 'Sign in with Email'}
      </button>
    </form>
  )
}

// Helper functions for local lockout tracking
function checkLocalLockout(email: string): { isLocked: boolean; minutesRemaining: number } {
  const key = `lockout_${email.toLowerCase()}`
  const data = localStorage.getItem(key)
  if (!data) return { isLocked: false, minutesRemaining: 0 }

  const { lockoutUntil } = JSON.parse(data)
  if (!lockoutUntil) return { isLocked: false, minutesRemaining: 0 }

  const lockoutTime = new Date(lockoutUntil)
  const now = new Date()

  if (now < lockoutTime) {
    const minutesRemaining = Math.ceil((lockoutTime.getTime() - now.getTime()) / 60000)
    return { isLocked: true, minutesRemaining }
  }

  // Lockout expired, clear it
  localStorage.removeItem(key)
  return { isLocked: false, minutesRemaining: 0 }
}

function updateLocalLockout(email: string) {
  const key = `lockout_${email.toLowerCase()}`
  const data = localStorage.getItem(key)
  const current = data ? JSON.parse(data) : { failedAttempts: 0 }

  current.failedAttempts = (current.failedAttempts || 0) + 1

  if (current.failedAttempts >= 5) {
    // Set lockout for 15 minutes
    const lockoutUntil = new Date()
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15)
    current.lockoutUntil = lockoutUntil.toISOString()
  }

  localStorage.setItem(key, JSON.stringify(current))
}
```

### File Changes
- **New**: `src/components/auth/EmailPasswordForm.tsx`
- **New**: `src/lib/auth/validation.ts` (Zod schemas)
- **New**: `src/types/auth.ts` (TypeScript types)

## Scenario 3: Server-Side API Route

### Goal
Create API route for server-side validation and Supabase Auth integration.

### Implementation

**File**: `src/app/api/auth/email-signin/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { emailSigninSchema } from '@/lib/auth/validation'
import type { EmailSigninInput } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body: unknown = await request.json()
    const validationResult = emailSigninSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          validation: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // 2. Create Supabase client (server-side)
    const supabase = await createClient()

    // 3. Check for OAuth precedence
    const { data: identities } = await supabase
      .from('auth.identities')
      .select('provider')
      .eq('user_id', supabase.auth.session()?.user.id)
      .in('provider', ['google', 'azure', 'facebook'])
      .limit(1)

    if (identities && identities.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials' // Generic message
      })
    }

    // 4. Attempt sign-in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // Increment failed attempt counter (via Admin API)
      await incrementFailedAttempts(email)

      return NextResponse.json({
        success: false,
        error: 'Invalid credentials' // Always generic per FR-006
      })
    }

    // 5. Success - reset lockout metadata
    await resetFailedAttempts(email)

    return NextResponse.json({
      success: true,
      redirectUrl: '/'
    })

  } catch (error) {
    console.error('Email signin error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during sign-in. Please try again.'
      },
      { status: 500 }
    )
  }
}

// Helper: Increment failed login attempts in metadata
async function incrementFailedAttempts(email: string) {
  const supabase = await createClient()

  // Query user by email
  const { data: user } = await supabase.auth.admin.getUserByEmail(email)
  if (!user) return

  // Get current metadata
  const metadata = user.raw_user_meta_data || {}
  const failedAttempts = (metadata.failed_login_attempts || 0) + 1

  // Update metadata
  const updates: any = {
    failed_login_attempts: failedAttempts,
    last_failed_attempt: new Date().toISOString()
  }

  // Set lockout if >= 5 attempts
  if (failedAttempts >= 5) {
    const lockoutUntil = new Date()
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 15)
    updates.lockout_until = lockoutUntil.toISOString()
  }

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...metadata, ...updates }
  })
}

// Helper: Reset lockout metadata on successful signin
async function resetFailedAttempts(email: string) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.admin.getUserByEmail(email)
  if (!user) return

  const metadata = user.raw_user_meta_data || {}

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null
    }
  })
}
```

### File Changes
- **New**: `src/app/api/auth/email-signin/route.ts`
- **Modified**: `src/lib/auth/supabase-server.ts` (if needed for Admin API)

## Scenario 4: Validation Schemas

### Goal
Define Zod schemas for email/password validation and type safety.

### Implementation

**File**: `src/lib/auth/validation.ts`

```typescript
import { z } from 'zod'

/**
 * Email/password signin validation schema
 */
export const emailSigninSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(val => val.toLowerCase().trim()),

  password: z
    .string()
    .min(1, 'Password is required')
    // No max length or complexity requirements per specs
})

/**
 * Infer TypeScript type from schema
 */
export type EmailSigninInput = z.infer<typeof emailSigninSchema>
```

**File**: `src/types/auth.ts`

```typescript
/**
 * Authentication types
 */

export interface EmailSigninInput {
  email: string
  password: string
}

export interface EmailSigninResponse {
  success: boolean
  redirectUrl?: string
  error?: string
  validation?: Array<{
    field: string
    message: string
  }>
}

export interface LockoutMetadata {
  failed_login_attempts: number
  lockout_until: string | null
  last_failed_attempt: string | null
}

export interface LocalLockoutState {
  email: string
  failedAttempts: number
  lockoutUntil: string | null
}
```

### File Changes
- **New**: `src/lib/auth/validation.ts`
- **New**: `src/types/auth.ts`

## Scenario 5: Deploying Auth Hook to Block Signups

### Goal
Prevent self-registration via email/password (admin-only user creation).

### Implementation

**Option A: Postgres Function (Recommended)**

```sql
-- Create function to block email/password signups
CREATE OR REPLACE FUNCTION public.block_email_password_signups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  provider TEXT;
BEGIN
  -- Extract email and provider from hook payload
  user_email := (SELECT jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb, 'email'));
  provider := (SELECT jsonb_extract_path_text(current_setting('request.jwt.claims', true)::jsonb, 'app_metadata', 'provider'));

  -- Allow OAuth signups (google, azure, facebook)
  IF provider IN ('google', 'azure', 'facebook') THEN
    RETURN jsonb_build_object('decision', 'continue');
  END IF;

  -- Block email/password signups
  IF provider = 'email' THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Email registration is disabled. Please contact an administrator.'
    );
  END IF;

  -- Default: allow (for future providers)
  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.block_email_password_signups() TO authenticated;
```

**Configure in Supabase Dashboard**:
1. Go to Authentication → Hooks
2. Select "Before User Created" hook
3. Choose "Postgres Function"
4. Select `public.block_email_password_signups()`
5. Save

**Option B: HTTP Endpoint (Alternative)**

```typescript
// src/app/api/auth/hooks/before-user-created/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Check provider
  const provider = body.app_metadata?.provider

  // Allow OAuth signups
  if (['google', 'azure', 'facebook'].includes(provider)) {
    return NextResponse.json({ decision: 'continue' })
  }

  // Block email/password signups
  if (provider === 'email') {
    return NextResponse.json({
      decision: 'reject',
      message: 'Email registration is disabled. Please contact an administrator.'
    })
  }

  // Default allow
  return NextResponse.json({ decision: 'continue' })
}
```

### File Changes
- **New**: SQL migration for Postgres function, OR
- **New**: `src/app/api/auth/hooks/before-user-created/route.ts`

## Scenario 6: Admin User Creation

### Goal
Create email/password users via Supabase Console (admin-only).

### Steps

1. **Navigate to Supabase Dashboard**
   - Go to your project at app.supabase.com
   - Click "Authentication" in sidebar
   - Click "Users" tab

2. **Create New User**
   - Click "Add user" button
   - Select "Create new user"
   - Enter email address
   - Enter password (strong password recommended)
   - Optionally check "Auto Confirm Email" (bypass confirmation)
   - Click "Create user"

3. **Verify User Created**
   - User appears in users list
   - Identity record created with provider='email'
   - No `failed_login_attempts` metadata initially

4. **Test Signin**
   - Go to app sign-in page
   - Enter created email and password
   - Should successfully authenticate

### Alternative: Admin API

```typescript
// Create user via Admin API (server-side only)
import { createClient } from '@/lib/auth/supabase-server'

async function createAdminUser(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true // Auto-confirm email
  })

  if (error) {
    console.error('Failed to create user:', error)
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}
```

## Common Integration Patterns

### Pattern 1: Conditional Form Display

Show email form only if OAuth fails or user prefers email:

```tsx
const [showEmailForm, setShowEmailForm] = useState(false)

return (
  <div>
    {!showEmailForm ? (
      <>
        <OAuthButtons />
        <button onClick={() => setShowEmailForm(true)}>
          Use email instead
        </button>
      </>
    ) : (
      <>
        <EmailPasswordForm />
        <button onClick={() => setShowEmailForm(false)}>
          Use social login instead
        </button>
      </>
    )}
  </div>
)
```

### Pattern 2: Remember Me Functionality

Store email (not password!) in localStorage:

```typescript
// On successful signin
localStorage.setItem('remembered_email', email)

// On form load
const rememberedEmail = localStorage.getItem('remembered_email')
form.setValue('email', rememberedEmail || '')
```

### Pattern 3: Loading States

Provide visual feedback during signin:

```tsx
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="animate-spin mr-2" />
      Signing in...
    </>
  ) : (
    'Sign in'
  )}
</button>
```

## Testing Integration

### Cypress E2E Test Example

```typescript
describe('Email/Password Authentication', () => {
  it('successfully signs in with valid credentials', () => {
    cy.visit('/auth/signin')

    // Fill form
    cy.get('input[type="email"]').type('user@example.com')
    cy.get('input[type="password"]').type('password123')

    // Submit
    cy.get('button[type="submit"]').click()

    // Verify redirect
    cy.url().should('eq', Cypress.config().baseUrl + '/')

    // Verify session
    cy.getCookie('sb-access-token').should('exist')
  })

  it('shows error on invalid credentials', () => {
    cy.visit('/auth/signin')

    cy.get('input[type="email"]').type('user@example.com')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    // Verify error message
    cy.contains('Invalid credentials').should('be.visible')

    // Should NOT redirect
    cy.url().should('include', '/auth/signin')
  })

  it('enforces account lockout after 5 failed attempts', () => {
    cy.visit('/auth/signin')

    // Attempt 5 failed signins
    for (let i = 0; i < 5; i++) {
      cy.get('input[type="email"]').clear().type('user@example.com')
      cy.get('input[type="password"]').clear().type(`wrong${i}`)
      cy.get('button[type="submit"]').click()
      cy.wait(500)
    }

    // Verify lockout message
    cy.contains(/Account locked|Try again in \d+ minutes/).should('be.visible')

    // Verify button disabled
    cy.get('button[type="submit"]').should('be.disabled')
  })
})
```

## Troubleshooting

### Issue: "Invalid credentials" on correct password
**Cause**: OAuth identity exists for email
**Solution**: User must sign in via OAuth provider (Google, Microsoft, Facebook)

### Issue: Account lockout not resetting
**Cause**: Metadata not updated on successful signin
**Solution**: Verify `resetFailedAttempts()` function is called in API route

### Issue: Validation errors not displaying
**Cause**: Zod schema not integrated with react-hook-form
**Solution**: Ensure `zodResolver` is passed to `useForm({ resolver: zodResolver(emailSigninSchema) })`

### Issue: Session not persisting
**Cause**: Cookies not set correctly
**Solution**: Verify `@supabase/ssr` client is used, check cookie settings in Supabase dashboard

---

**Quickstart Status**: ✅ Complete
**Next**: Task Generation (/tasks command)
