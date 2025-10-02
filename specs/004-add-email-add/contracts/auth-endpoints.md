# API Contracts: Authentication Endpoints

**Feature**: 004-add-email-add
**Date**: 2025-10-01
**Status**: Complete

## Overview
API contracts for email/password authentication endpoints. All endpoints follow REST conventions with JSON payloads. Server-side validation occurs before calling Supabase Auth APIs.

## Endpoint: Email/Password Sign-In

### POST /api/auth/email-signin

**Purpose**: Authenticate user with email and password after server-side validation

**Authentication**: None (public endpoint)

**Rate Limiting**: Enforced via lockout metadata (5 attempts → 15-30 min lockout)

### Request

**Headers**:
```
Content-Type: application/json
```

**Body Schema**:
```typescript
{
  email: string      // Required, valid email format, max 255 chars
  password: string   // Required, min 1 char (no max enforced)
}
```

**Validation Rules** (Zod schema):
```typescript
const EmailSigninSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email too long")
    .transform(val => val.toLowerCase().trim()),

  password: z.string()
    .min(1, "Password is required")
})
```

**Example Request**:
```json
POST /api/auth/email-signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

### Response: Success (200 OK)

**Body Schema**:
```typescript
{
  success: true
  redirectUrl: string  // URL to redirect after successful auth
}
```

**Example Response**:
```json
{
  "success": true,
  "redirectUrl": "/"
}
```

**Side Effects**:
- Session created in `auth.sessions`
- Session cookie set (httpOnly, secure, sameSite=lax)
- Metadata counters reset (`failed_login_attempts`, `lockout_until`, `last_failed_attempt`)
- `last_sign_in_at` timestamp updated

### Response: Auth Error (200 OK)

**Note**: Returns 200 with error field to prevent timing attacks. Generic message prevents user enumeration.

**Body Schema**:
```typescript
{
  success: false
  error: string  // Always "Invalid credentials" per FR-006
}
```

**Error Conditions** (all return same message):
- Email does not exist in auth.users
- Password is incorrect
- Account is disabled
- OAuth identity exists (OAuth takes precedence per FR-014)
- Account is locked out (failed attempts >= 5)

**Example Response**:
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Side Effects** (on auth failure):
- `failed_login_attempts` incremented in metadata
- `last_failed_attempt` timestamp updated
- `lockout_until` set to `now() + 15 minutes` if attempts >= 5

### Response: Validation Error (400 Bad Request)

**Body Schema**:
```typescript
{
  success: false
  error: string
  validation?: {
    field: string
    message: string
  }[]
}
```

**Example Responses**:
```json
// Invalid email format
{
  "success": false,
  "error": "Validation failed",
  "validation": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}

// Missing password
{
  "success": false,
  "error": "Validation failed",
  "validation": [
    {
      "field": "password",
      "message": "Password is required"
    }
  ]
}
```

### Response: Server Error (500 Internal Server Error)

**Body Schema**:
```typescript
{
  success: false
  error: string  // Generic message, no stack trace
}
```

**Example Response**:
```json
{
  "success": false,
  "error": "An error occurred during sign-in. Please try again."
}
```

**Logging**: Full error details logged server-side for debugging

## Endpoint Flow Diagram

```
Client → POST /api/auth/email-signin
            ↓
       Validate request body (Zod)
            ↓
       [Invalid] → 400 Bad Request
            ↓
       [Valid] Check lockout metadata
            ↓
       [Locked out] → 200 OK + error
            ↓
       [Not locked] Normalize email
            ↓
       Check OAuth precedence (query auth.identities)
            ↓
       [OAuth exists] → 200 OK + error
            ↓
       [No OAuth] Call supabase.auth.signInWithPassword()
            ↓
       ┌────────────┴────────────┐
       ↓                          ↓
   [Success]                  [Error]
       ↓                          ↓
  Reset metadata          Increment failed_login_attempts
  Create session          Set lockout if >= 5
       ↓                          ↓
  200 OK + redirectUrl    200 OK + error
```

## Server-Side Implementation Contract

### Function Signature

```typescript
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  // 2. Check rate limiting/lockout
  // 3. Check OAuth precedence
  // 4. Call Supabase signInWithPassword
  // 5. Handle success or error
  // 6. Return response
}
```

### Required Validations (in order)

1. **Request body parsing**
   - Valid JSON
   - Contains email and password fields

2. **Zod schema validation**
   - Email format check
   - Email length check
   - Password presence check

3. **Lockout check**
   - Query user's `raw_user_meta_data.lockout_until`
   - If `lockout_until > now()`, return error
   - If expired, allow signin attempt

4. **OAuth precedence check**
   - Query `auth.identities` for user's email
   - If any non-email provider exists, return error
   - If only email provider (or none), proceed

5. **Supabase Auth call**
   - Call `signInWithPassword({ email, password })`
   - Handle session creation
   - Handle errors generically

6. **Metadata update**
   - On success: Reset counters
   - On failure: Increment counters, set lockout if needed

### Error Handling Contract

**Generic Errors** (return "Invalid credentials"):
- `AuthApiError: Invalid login credentials` → Generic error
- `AuthApiError: Email not confirmed` → Generic error
- User not found → Generic error
- OAuth precedence block → Generic error
- Account locked out → Generic error

**Validation Errors** (return specific message):
- Invalid email format → "Invalid email format"
- Missing password → "Password is required"
- Email too long → "Email too long"

**Server Errors** (return generic server error):
- Database connection failed → 500 error
- Supabase API timeout → 500 error
- Unexpected exception → 500 error

## Client-Side Usage Contract

### EmailPasswordForm Component

```typescript
interface EmailPasswordFormProps {
  onSuccess?: (redirectUrl: string) => void
  onError?: (error: string) => void
}

async function handleSubmit(email: string, password: string) {
  // 1. Client-side validation (optional, UX improvement)
  // 2. Check local lockout state (immediate feedback)
  // 3. POST to /api/auth/email-signin
  // 4. Handle response
  //    - success: Call onSuccess or redirect
  //    - error: Display error message
}
```

### Local Lockout State

**Purpose**: Provide immediate UI feedback without server round-trip

**Storage**: `localStorage` or React state

**Schema**:
```typescript
{
  email: string
  failedAttempts: number
  lockoutUntil: string | null  // ISO 8601 timestamp
}
```

**Logic**:
- Check `lockoutUntil` before allowing submit
- Show disabled button + countdown timer if locked out
- Reset on successful signin
- Sync with server metadata (server is source of truth)

## Supabase Client Wrapper

### signInWithPassword Wrapper

**Location**: `src/lib/auth/supabase-client.ts`

**Signature**:
```typescript
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: true; redirectUrl: string } | { success: false; error: string }>
```

**Implementation**:
```typescript
export async function signInWithEmailPassword(email: string, password: string) {
  // Call server-side API route, not direct Supabase call
  // This ensures server-side validation runs

  const response = await fetch('/api/auth/email-signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  return await response.json()
}
```

**Note**: Does NOT call `supabase.auth.signInWithPassword()` directly. Server-side API route handles Supabase call after validation.

## Security Guarantees

### OWASP Compliance

**A01: Broken Access Control**
- ✅ Server-side validation prevents client bypass
- ✅ OAuth precedence enforced server-side
- ✅ Lockout metadata checked server-side

**A02: Cryptographic Failures**
- ✅ Passwords bcrypt hashed by Supabase
- ✅ Sessions use httpOnly cookies (no XSS theft)
- ✅ HTTPS enforced in production (Vercel default)

**A03: Injection**
- ✅ Zod schema validation prevents injection
- ✅ Parameterized queries via Supabase client
- ✅ No raw SQL in API route

**A04: Insecure Design**
- ✅ Generic error messages prevent enumeration
- ✅ Rate limiting prevents brute force
- ✅ OAuth precedence prevents account takeover

**A07: Identification and Authentication Failures**
- ✅ No password strength requirements (as specified)
- ✅ Session management handled by Supabase Auth
- ✅ Admin-only user creation prevents unauthorized access

## Testing Contracts

### Unit Test Cases

**Validation Schema**:
- ✅ Valid email and password → passes
- ✅ Invalid email format → fails
- ✅ Missing email → fails
- ✅ Missing password → fails
- ✅ Email too long (> 255 chars) → fails
- ✅ Email normalization (uppercase → lowercase)

**Lockout Logic**:
- ✅ 4 failed attempts → no lockout
- ✅ 5 failed attempts → lockout set
- ✅ Lockout expired → allows attempt
- ✅ Lockout active → blocks attempt
- ✅ Successful signin → resets counters

### Integration Test Cases

**API Route**:
- ✅ Valid credentials → 200 OK + success
- ✅ Invalid credentials → 200 OK + error
- ✅ Account locked out → 200 OK + error
- ✅ OAuth precedence → 200 OK + error
- ✅ Validation error → 400 Bad Request
- ✅ Server error → 500 Internal Server Error

### E2E Test Cases (Cypress)

**Happy Path**:
- ✅ Enter valid email and password → redirects to dashboard
- ✅ Session persists across page refresh
- ✅ Sign out → redirects to signin page

**Error Paths**:
- ✅ Invalid password → shows error message
- ✅ Non-existent email → shows error message
- ✅ 5 failed attempts → shows lockout message
- ✅ OAuth user tries email signin → shows error
- ✅ Locked out user → button disabled + countdown

**Accessibility**:
- ✅ Keyboard navigation works
- ✅ Screen reader announces errors
- ✅ Focus management correct
- ✅ Color contrast meets WCAG 2.1 AA

---

**API Contracts Status**: ✅ Complete
**Next**: Quickstart Integration Examples (quickstart.md)
