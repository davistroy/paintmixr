# Admin User Creation Guide

This guide explains how to create email/password users for PaintMixr. Self-registration is disabled for security - only administrators can create email/password accounts.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Method 1: Supabase Dashboard (Recommended)](#method-1-supabase-dashboard-recommended)
- [Method 2: Supabase Admin API](#method-2-supabase-admin-api)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Access to Supabase Dashboard with admin privileges
- User's email address
- Strong password (see security best practices below)

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Navigate to Authentication

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your PaintMixr project
3. Click **Authentication** in the left sidebar
4. Click **Users** tab

### Step 2: Create New User

1. Click the **Add user** button (top right)
2. Select **Create new user**
3. Fill in the form:
   - **Email**: User's email address (case-insensitive)
   - **Password**: Strong password (see best practices below)
   - **Auto Confirm Email**: ✓ Check this box
     - This bypasses email verification
     - User can sign in immediately
4. Click **Create user**

### Step 3: Verify Creation

1. User appears in the users list
2. Check the following columns:
   - **Email**: Correct email address
   - **Provider**: Shows "email" badge
   - **Last Sign In**: Initially empty (will populate after first signin)
   - **Created**: Shows creation timestamp

### Step 4: Test Sign-In

1. Navigate to your app's sign-in page
2. Enter the created email and password
3. Verify successful authentication
4. User should be redirected to the dashboard

## Method 2: Supabase Admin API

For bulk user creation or automation, use the Admin API:

```typescript
import { createClient } from '@supabase/supabase-js'

// Server-side only - NEVER expose service role key in client code
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createAdminUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      created_by: 'admin',
      created_at: new Date().toISOString()
    }
  })

  if (error) {
    console.error('Failed to create user:', error)
    return { success: false, error: error.message }
  }

  console.log('User created successfully:', data.user.id)
  return { success: true, user: data.user }
}

// Example usage
createAdminUser('user@example.com', 'SecurePassword123!')
```

### Running the Script

1. Create a new file: `scripts/create-user.ts`
2. Add the code above
3. Run with:
   ```bash
   npx tsx scripts/create-user.ts
   ```

## Security Best Practices

### Password Requirements

While the application doesn't enforce password complexity, follow these guidelines:

**Minimum Requirements:**
- At least 12 characters long
- Mix of uppercase and lowercase letters
- At least one number
- At least one special character (@, #, $, %, etc.)

**Good Password Examples:**
- `Tr0pic@lSunset2025!`
- `B1ue$kyM0untain#47`
- `Coff33&Coding@Dawn`

**Bad Password Examples:**
- ❌ `password123` (too common)
- ❌ `abc123` (too short)
- ❌ `companyname` (easily guessed)

### Password Generation

Use a password manager or generator:

```bash
# Generate strong password (Linux/Mac)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9!@#$%^&*()' | head -c 16

# Or use online generator
# https://passwordsgenerator.net/
```

### Email Validation

- Email must be unique across all users
- Emails are case-insensitive (USER@EXAMPLE.COM = user@example.com)
- Invalid emails are rejected during signin
- Maximum email length: 255 characters

## Account Lockout

### Automatic Lockout

- **Trigger**: 5 failed sign-in attempts
- **Duration**: 15 minutes
- **Behavior**: Sign-in disabled during lockout period

### Clearing Lockout (Admin Only)

If a user is locked out and needs immediate access:

```typescript
async function clearUserLockout(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null
    }
  })

  if (error) {
    console.error('Failed to clear lockout:', error)
    return { success: false }
  }

  console.log('Lockout cleared for user:', userId)
  return { success: true }
}
```

## OAuth Precedence

⚠️ **Important**: If a user has signed in with OAuth (Google, Microsoft, Facebook), they **cannot** use email/password signin for security reasons.

### Checking User's Auth Methods

```typescript
async function getUserAuthMethods(userId: string) {
  const { data: identities, error } = await supabaseAdmin
    .from('identities')
    .select('provider')
    .eq('user_id', userId)

  if (error) return { providers: [], error }

  const providers = identities.map(i => i.provider)
  return { providers, error: null }
}

// Example usage
const { providers } = await getUserAuthMethods('user-id-here')
console.log('User can sign in with:', providers)
// Output: ['google', 'email'] or ['email'] or ['google', 'facebook']
```

### Converting OAuth User to Email/Password

This is **not recommended** for security reasons. If absolutely necessary:

1. Delete OAuth identity from `auth.identities` table
2. Create email/password identity
3. User must reset password via email

## Troubleshooting

### "Email already exists"

**Problem**: Email is already registered in the system.

**Solution**:
1. Check existing users in Supabase Dashboard
2. If user exists:
   - Reset their password instead of creating new account
   - Or use different email address

### "User created but can't sign in"

**Problem**: User was created but signin fails.

**Possible Causes**:
1. **Email not confirmed**:
   - Check "Auto Confirm Email" was enabled
   - Or manually confirm via Dashboard

2. **OAuth precedence**:
   - User may have existing OAuth identity
   - Check identities table for this user
   - Email/password signin is blocked if OAuth exists

3. **Account locked**:
   - Check user metadata for lockout status
   - Clear lockout using admin script

### "Invalid credentials" on correct password

**Problem**: Password is correct but signin fails.

**Debug Steps**:
1. Check user's provider in Dashboard:
   - If shows "google", "azure", or "facebook" → OAuth user
   - Email/password signin is disabled for OAuth users

2. Check lockout status:
   ```sql
   SELECT raw_user_meta_data FROM auth.users WHERE email = 'user@example.com';
   ```
   - If `lockout_until` is set and in the future → user is locked out

3. Verify password was set correctly:
   - Try resetting password via Dashboard
   - Or recreate user with new password

### "Too many requests"

**Problem**: Supabase rate limiting triggered.

**Solution**:
- Wait 1 hour before retrying
- Or upgrade Supabase plan for higher limits
- Avoid bulk user creation scripts

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Admin API Reference](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Authentication Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## Support

For additional help:
- Email: support@paintmixr.com
- Supabase Community: https://github.com/supabase/supabase/discussions

---

**Last Updated**: 2025-10-01
**Version**: 1.0.0
