# Data Model: Deploy to Vercel with OAuth Authentication

**Feature**: 003-deploy-to-vercel
**Date**: 2025-10-01

## Overview

This feature primarily leverages existing Supabase Auth managed tables and introduces no new application-level entities. The data model focuses on understanding how Supabase Auth structures OAuth authentication and sessions.

## Supabase Auth Managed Entities

### auth.users (Managed by Supabase)

**Purpose**: Core user identity table managed entirely by Supabase Auth

**Key Fields**:
```typescript
{
  id: uuid                    // Primary key, referenced by application tables
  email: string               // User's email address (from OAuth provider)
  encrypted_password: string? // null for OAuth-only users
  email_confirmed_at: timestamp?
  created_at: timestamp
  updated_at: timestamp
  last_sign_in_at: timestamp
  raw_app_meta_data: jsonb    // Provider-specific data
  raw_user_meta_data: jsonb   // User profile data from OAuth
  is_super_admin: boolean
  role: string                // typically 'authenticated'
}
```

**Relationships**:
- Referenced by `enhanced_paints.user_id` (existing)
- Referenced by `paint_collections.user_id` (existing)
- Referenced by `mixing_history.user_id` (existing)

**OAuth Behavior**:
- Created automatically on first OAuth sign-in
- `email` populated from OAuth provider
- `encrypted_password` is null (password-less authentication)
- `raw_app_meta_data` contains provider info (e.g., `{provider: 'google', providers: ['google']}`)
- `raw_user_meta_data` contains profile info from provider (name, avatar, etc.)

**Validation Rules**:
- Email must be valid format
- Email must be unique (enforced by Supabase)
- Cannot be modified directly by application (use Supabase Auth API)

---

### auth.identities (Managed by Supabase)

**Purpose**: Tracks multiple OAuth providers linked to a single user account

**Key Fields**:
```typescript
{
  id: uuid                    // Identity ID
  user_id: uuid               // References auth.users.id
  identity_data: jsonb        // Provider-specific identity data
  provider: string            // 'google' | 'azure' | 'facebook'
  provider_id: string         // Unique ID from provider
  last_sign_in_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

**Relationships**:
- `user_id` → `auth.users.id` (many-to-one)
- Multiple identities can share the same `user_id` (account merging)

**OAuth Behavior**:
- One row created per OAuth provider per user
- Example: User signs in with Google → 1 identity row (provider: 'google')
- Same user signs in with Microsoft → 2nd identity row added (provider: 'azure')
- Both rows share same `user_id` → account automatically merged

**Account Merging Logic**:
```
IF email from new provider == email in existing auth.users THEN
  Link new identity to existing user_id
ELSE
  Create new auth.users row and new identity
END IF
```

**Validation Rules**:
- `provider` + `provider_id` must be unique (one Google account = one identity)
- `email` from `identity_data` must match `auth.users.email` for merging
- Cannot be modified directly by application

---

### auth.sessions (Managed by Supabase)

**Purpose**: Manages active user sessions with JWT tokens

**Key Fields**:
```typescript
{
  id: uuid                    // Session ID
  user_id: uuid               // References auth.users.id
  created_at: timestamp
  updated_at: timestamp
  factor_id: uuid?            // For MFA (not used in this feature)
  aal: string                 // Authentication Assurance Level
  not_after: timestamp?       // Session expiry (24 hours from creation)
}
```

**Relationships**:
- `user_id` → `auth.users.id`

**Session Behavior**:
- Created on successful OAuth callback
- TTL: 24 hours (configured in Supabase project settings)
- Automatically refreshed if user is active before expiry
- Deleted on explicit sign-out
- Stored as HTTP-only cookie in browser (managed by Supabase client)

**JWT Token Structure** (embedded in session):
```typescript
{
  sub: string        // user_id
  email: string
  role: string       // 'authenticated'
  aal: string        // 'aal1'
  exp: number        // Unix timestamp (24 hours from iat)
  iat: number        // Issued at timestamp
  session_id: string
}
```

**Validation Rules**:
- Session expires after 24 hours (NFR-004)
- Refresh token valid for refresh within expiry window
- Cannot be modified directly by application

---

## Application-Level Entities (Existing, No Changes)

### enhanced_paints (Existing)

**Relationship to OAuth**:
- `user_id` field already references `auth.users.id`
- Row Level Security (RLS) already configured
- No schema changes needed

**RLS Policy** (existing):
```sql
-- Users can only see their own paints
CREATE POLICY "Users can view own paints"
  ON enhanced_paints
  FOR SELECT
  USING (auth.uid() = user_id);
```

**OAuth Impact**:
- User signs in with Google → `auth.uid()` returns their `user_id`
- User signs in with Microsoft (same email) → `auth.uid()` returns same `user_id`
- Result: Same paint collection accessible via any linked provider

---

### paint_collections (Existing)

**Relationship to OAuth**:
- `user_id` field references `auth.users.id`
- RLS policies protect user collections
- No schema changes needed

---

### mixing_history (Existing)

**Relationship to OAuth**:
- `user_id` field references `auth.users.id`
- RLS policies protect user history
- No schema changes needed

---

## State Transitions

### User Sign-In Flow (OAuth)

```
State 1: Unauthenticated
  └─> User clicks "Sign in with Google"
  └─> Redirect to Google OAuth

State 2: At Provider
  └─> User consents to app permissions
  └─> Provider redirects to Supabase callback

State 3: Callback Processing
  └─> Supabase validates OAuth response
  └─> Check: Does email exist in auth.users?
      ├─> YES: Link new identity to existing user
      └─> NO: Create new auth.users + identity
  └─> Create auth.sessions row
  └─> Generate JWT tokens
  └─> Set HTTP-only cookie

State 4: Authenticated
  └─> User redirected to app with session
  └─> Can access protected resources
```

### Account Merging Flow

```
Initial State: User exists with Google identity
  email: user@example.com
  auth.identities: [{ provider: 'google', ... }]

Action: Same user signs in with Microsoft
  Microsoft returns: email = user@example.com

Supabase Auth Logic:
  1. Check auth.users for email = user@example.com
  2. Email exists → Merge accounts
  3. Add new identity: { provider: 'azure', user_id: <existing-user-id> }
  4. Create new session for existing user

Result: User can now sign in with Google OR Microsoft
  auth.identities: [
    { provider: 'google', user_id: <same-id> },
    { provider: 'azure', user_id: <same-id> }
  ]
```

### Session Expiry Flow

```
State: Active Session (23 hours 50 minutes old)
  └─> Supabase client detects expiry approaching
  └─> Automatic refresh attempt
      ├─> SUCCESS: New 24-hour session created
      └─> FAIL: Prompt user to re-authenticate

State: Expired Session (>24 hours)
  └─> User attempts protected action
  └─> Redirect to /auth/signin
  └─> Must complete OAuth flow again
```

---

## Data Integrity Rules

### Email Uniqueness
- **Rule**: One email address = one `auth.users.id`
- **Enforcement**: Supabase Auth database constraint
- **Impact**: Automatic account merging by email

### Provider Identity Uniqueness
- **Rule**: One OAuth provider account = one `auth.identities` row
- **Enforcement**: Unique constraint on (`provider`, `provider_id`)
- **Example**: user@gmail.com via Google can only link once

### User Data Isolation
- **Rule**: Users can only access their own data
- **Enforcement**: Row Level Security policies on all user data tables
- **Verification**: `auth.uid() = user_id` in RLS policies

### Session Security
- **Rule**: Sessions stored as HTTP-only cookies (not accessible via JavaScript)
- **Enforcement**: Supabase Auth client configuration
- **Protection**: Prevents XSS token theft

---

## Environment-Specific Behavior

### OAuth Callback URLs

**Production**:
- Supabase callback: `https://[project-ref].supabase.co/auth/v1/callback`
- App redirect: `https://[production-domain].com/auth/callback`

**Preview (Vercel)**:
- Supabase callback: Same as production (single Supabase project)
- App redirect: `https://[project]-[hash].vercel.app/auth/callback`

**Development**:
- Supabase callback: Same as production
- App redirect: `http://localhost:3000/auth/callback`

**Note**: Supabase callback URL is constant; only app redirect URL varies by environment

---

## Migration Requirements

### No Database Migrations Needed

This feature uses:
- Supabase Auth managed tables (already exist)
- Existing application tables (no schema changes)

### Configuration Changes Only

**Supabase Dashboard**:
1. Enable OAuth providers (Google, Microsoft, Facebook)
2. Configure JWT expiry (24 hours)
3. Add OAuth client IDs and secrets

**Vercel**:
1. Add environment variables
2. No database migration commands needed

---

## Data Volume Estimates

### auth.users
- Current: ~0 rows (new project)
- Expected: 1-10 users (per clarification)
- Growth: Minimal (small team use)

### auth.identities
- Ratio: 1-3 identities per user (multi-provider sign-in)
- Expected: 3-30 rows total
- Growth: Linear with user count

### auth.sessions
- Active sessions: 1-10 concurrent (per clarification)
- Total sessions: Grows with sign-ins, old sessions pruned automatically
- Retention: 24 hours per session

---

## Summary

**New Entities**: 0 (all managed by Supabase Auth)
**Modified Entities**: 0 (existing tables already compatible)
**RLS Policies**: 0 new (existing policies already reference `auth.uid()`)
**Migrations**: 0 required
**Configuration**: Supabase Dashboard + Vercel environment variables only

This is a configuration-focused feature with no application-level data model changes.
