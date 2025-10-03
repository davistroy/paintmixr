# API Contract: Authentication Security Fixes

**Feature**: 005-use-codebase-analysis
**Created**: 2025-10-02
**Purpose**: Define API contracts for critical authentication security improvements

---

## Contract 1: Email/Password Sign-In with Performance Optimization

**Endpoint**: `POST /api/auth/email-signin`

**Description**: Authenticate user with email/password using targeted database queries (O(1) lookup) instead of full table scans. Implements OAuth precedence checking, rate limiting, and lockout enforcement.

**Requirements**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-009a, FR-010, FR-011, FR-012

### Request

**Headers**:
```
Content-Type: application/json
X-Forwarded-For: <client-ip> (optional, for rate limiting)
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation**:
- `email`: Required, valid email format, normalized to lowercase + trim
- `password`: Required, minimum 1 character (Supabase enforces minimum at signup)

### Response: Success (200 OK)

```json
{
  "success": true,
  "message": "Signed in successfully",
  "redirectTo": "/dashboard"
}
```

**Side Effects**:
- Session cookie set via `@supabase/ssr` (httpOnly, secure, sameSite)
- Lockout metadata cleared if previously set
- Rate limit counter updated for IP address

### Response: Rate Limited (429 Too Many Requests)

```json
{
  "error": "rate_limited",
  "message": "Too many login attempts. Please try again later.",
  "retryAfter": 900
}
```

**Headers**:
```
Retry-After: 900
```

**Conditions**:
- More than 5 authentication requests from same IP within 15-minute sliding window
- Rate limit applies before database queries (FR-003)

### Response: Account Locked (403 Forbidden)

```json
{
  "error": "account_locked",
  "message": "Account locked due to too many failed login attempts. Try again in 15 minutes.",
  "lockedUntil": "2025-10-02T15:30:00Z",
  "remainingSeconds": 782
}
```

**Conditions**:
- User has 5 failed login attempts within lockout window
- `lockout_until` timestamp is in the future
- Lockout check occurs before password verification (FR-003)
- If user attempts login during lockout, `lockout_until` resets to current time + 15 minutes (FR-009a)

### Response: OAuth Precedence (403 Forbidden)

```json
{
  "error": "oauth_precedence",
  "message": "This account uses Google authentication. Please sign in with Google.",
  "provider": "google"
}
```

**Conditions**:
- User has linked OAuth identity (Google, GitHub, etc.) in `auth.identities` table
- Email/password authentication is blocked when OAuth identity exists (FR-005)
- Provider name must be specific and accurate (FR-006)

### Response: Invalid Credentials (401 Unauthorized)

```json
{
  "error": "invalid_credentials",
  "message": "Invalid email or password"
}
```

**Conditions**:
- Email not found in database OR password incorrect OR account disabled
- Generic message prevents user enumeration (same for all failure cases)
- Failed attempt counter incremented atomically if user exists (FR-007, FR-008)

### Response: Validation Error (400 Bad Request)

```json
{
  "error": "validation_error",
  "message": "Invalid input",
  "fields": {
    "email": "Invalid email format"
  }
}
```

**Conditions**:
- Email fails Zod validation (not valid email format)
- Password missing from request

### Performance Requirements

- **Response Time**: ≤ 2 seconds (server-side processing + 200ms network budget) regardless of user count (FR-002, NFR-008)
- **Query Optimization**: Use `.eq('email', normalizedEmail)` for O(1) lookup instead of `.select()` full scan (FR-001)
- **Lockout Check**: Query user metadata before expensive password verification (FR-003)

### Implementation Notes

**Database Query Pattern**:
```typescript
// CORRECT: Targeted query with email filter (O(1) with index)
const { data: user } = await supabase.auth.admin.listUsers({
  filter: `email.eq.${normalizedEmail}`
})

// INCORRECT: Full table scan (O(n) performance degradation)
const { data: users } = await supabase.auth.admin.listUsers()
const user = users.find(u => u.email === normalizedEmail)
```

**Atomic Lockout Counter**:
```sql
-- PostgreSQL function for atomic increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(user_id UUID)
RETURNS TABLE(new_attempt_count INT, lockout_until TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{failed_login_attempts}',
    to_jsonb(COALESCE((raw_user_meta_data->>'failed_login_attempts')::int, 0) + 1)
  )
  WHERE id = user_id
  RETURNING
    (raw_user_meta_data->>'failed_login_attempts')::int AS new_attempt_count,
    (raw_user_meta_data->>'lockout_until')::timestamptz AS lockout_until;
END;
$$;
```

---

## Contract 2: Account Lockout Status Check

**Endpoint**: `GET /api/auth/lockout-status`

**Description**: Check if user account is currently locked due to failed login attempts. Used by client-side UI to display lockout countdown timer.

**Requirements**: FR-009, FR-009a

### Request

**Headers**:
```
Content-Type: application/json
```

**Query Parameters**:
```
?email=user@example.com
```

**Validation**:
- `email`: Required, valid email format, normalized to lowercase + trim

### Response: Not Locked (200 OK)

```json
{
  "locked": false,
  "email": "user@example.com"
}
```

### Response: Locked (200 OK)

```json
{
  "locked": true,
  "email": "user@example.com",
  "lockedUntil": "2025-10-02T15:30:00Z",
  "remainingSeconds": 782,
  "failedAttempts": 5
}
```

**Conditions**:
- User has `lockout_until` timestamp in future
- `remainingSeconds` calculated as `lockout_until - current_time`

### Response: User Not Found (200 OK)

```json
{
  "locked": false,
  "email": "user@example.com"
}
```

**Security Note**: Returns same structure as "Not Locked" to prevent user enumeration

---

## Contract 3: Rate Limit Status Check

**Endpoint**: `GET /api/auth/rate-limit-status`

**Description**: Check current rate limit status for client IP address. Used by client-side UI to display rate limit warnings before submission.

**Requirements**: FR-010, FR-011, FR-012

### Request

**Headers**:
```
X-Forwarded-For: <client-ip> (optional, fallback to connection IP)
```

### Response: Under Limit (200 OK)

```json
{
  "rateLimited": false,
  "requestsRemaining": 3,
  "windowResetAt": "2025-10-02T15:45:00Z"
}
```

**Conditions**:
- IP address has made < 5 authentication requests within current 15-minute sliding window
- `requestsRemaining` = 5 - current_attempt_count

### Response: Rate Limited (200 OK)

```json
{
  "rateLimited": true,
  "requestsRemaining": 0,
  "windowResetAt": "2025-10-02T15:45:00Z",
  "retryAfter": 543
}
```

**Conditions**:
- IP address has made ≥ 5 authentication requests within 15-minute sliding window
- `retryAfter` = seconds until oldest request timestamp expires from window

### Implementation Notes

**Sliding Window Algorithm**:
```typescript
// Sliding window: continuous tracking, smoother rate enforcement (FR-012)
function checkRateLimit(ipAddress: string): RateLimitStatus {
  const now = Date.now()
  const windowStart = now - (15 * 60 * 1000) // 15 minutes ago

  // Get existing record
  const record = rateLimitCache.get(ipAddress) || { timestamps: [] }

  // Remove timestamps outside window (sliding window maintenance)
  const validTimestamps = record.timestamps.filter(ts => ts > windowStart)

  // Check if limit exceeded
  const rateLimited = validTimestamps.length >= 5

  return {
    rateLimited,
    requestsRemaining: Math.max(0, 5 - validTimestamps.length),
    windowResetAt: new Date(validTimestamps[0] + (15 * 60 * 1000)),
    retryAfter: rateLimited ? Math.ceil((validTimestamps[0] + (15 * 60 * 1000) - now) / 1000) : 0
  }
}
```

---

## Contract 4: Clear Lockout Metadata (Admin)

**Endpoint**: `POST /api/auth/admin/clear-lockout`

**Description**: Administrative endpoint to manually clear lockout metadata for user account. Requires admin authentication.

**Requirements**: FR-009

### Request

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

**Body**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation**:
- `userId`: Required, valid UUID format
- Admin authentication required (check user role or service key)

### Response: Success (200 OK)

```json
{
  "success": true,
  "message": "Lockout cleared for user",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Side Effects**:
- `failed_login_attempts` reset to 0
- `lockout_until` cleared (null)
- `last_failed_attempt` cleared (null)

### Response: User Not Found (404 Not Found)

```json
{
  "error": "user_not_found",
  "message": "User does not exist",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response: Unauthorized (401 Unauthorized)

```json
{
  "error": "unauthorized",
  "message": "Admin authentication required"
}
```

---

## Contract Testing Requirements

Each contract must have automated tests verifying:

1. **Request Validation**:
   - Valid inputs accepted
   - Invalid inputs rejected with appropriate error messages
   - Required fields enforced

2. **Response Formats**:
   - Success responses match schema
   - Error responses match schema
   - HTTP status codes correct

3. **Error Scenarios** (28 scenarios from CODEBASE_ANALYSIS_REPORT):
   - Empty email/password
   - Invalid email format
   - User not found
   - Wrong password
   - Account disabled
   - OAuth precedence blocking
   - Rate limit exceeded (various window positions)
   - Account locked (various time remaining)
   - Lockout reset on retry during active lockout
   - Race conditions prevented (concurrent lockout increments)

4. **Performance Requirements**:
   - Authentication response < 2 seconds at 10,000 user scale
   - Query plans use indexes (EXPLAIN ANALYZE verification)

5. **Security Requirements**:
   - User enumeration prevented (same error messages)
   - Timing attack resistance (consistent response times)
   - Generic error codes in API responses

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
