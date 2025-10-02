# Research: Email/Password Authentication

**Feature**: 004-add-email-add
**Date**: 2025-10-01
**Status**: Complete

## Overview
Research for implementing email/password authentication in PaintMixr using Supabase Auth best practices. Focus on admin-only user provisioning, rate limiting, and security patterns.

## Research Areas

### 1. Supabase Password-Based Authentication

**Decision**: Use `signInWithPassword()` method from @supabase/supabase-js

**Key Findings**:
- Supabase Auth provides built-in email/password authentication
- Method signature: `supabase.auth.signInWithPassword({ email, password })`
- Returns: `{ data: { session, user }, error }`
- Error handling: Intentionally vague errors to prevent user enumeration
  - Does NOT distinguish between: non-existent account, wrong password, or social-only account
  - This aligns with our FR-006 requirement for generic error messages

**Source**: https://supabase.com/docs/reference/javascript/auth-signinwithpassword

**Rationale**:
- Built-in method handles password hashing, session management automatically
- Security-first design with generic error messages
- No additional dependencies required

**Alternatives Considered**:
- Custom password validation: Rejected - reinventing the wheel, security risks
- Third-party auth library: Rejected - unnecessary complexity, Supabase handles it

### 2. Disabling Self-Signup

**Decision**: Use Supabase Auth Hooks (`before-user-created` hook) to reject all signups

**Key Findings**:
- Auth hooks allow server-side logic before user creation
- Two implementation options:
  1. HTTP endpoint (external service)
  2. Postgres function (database function)
- Hook receives user metadata and can return error to block signup
- Admin user creation via Supabase Console or Admin API bypasses hooks

**Source**: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook

**Implementation Approach**:
```typescript
// Postgres function approach (recommended for simplicity)
CREATE OR REPLACE FUNCTION public.block_email_signups()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  -- Always reject email/password signups
  -- Allow OAuth signups (different hook path)
  RETURN jsonb_build_object(
    'decision', 'reject',
    'message', 'Email registration is disabled. Please contact an administrator.'
  );
END;
$$;
```

**Rationale**:
- Postgres function is simpler to deploy and maintain
- No external service dependencies
- Runs within database transaction for consistency
- Admin API calls bypass this hook (admin provisioning works)

**Alternatives Considered**:
- Remove signup endpoint: Rejected - too invasive, breaks OAuth
- Client-side only hiding: Rejected - insecure, easily bypassed
- HTTP hook: Rejected - adds infrastructure complexity

### 3. Rate Limiting & Account Lockout

**Decision**: Track failed attempts in `auth.users.raw_user_meta_data` with client-side lockout UI

**Key Findings**:
- Supabase Auth doesn't provide built-in rate limiting for login attempts
- Can store custom metadata in `raw_user_meta_data` JSONB field
- Client-side tracking needed for immediate UI feedback
- Server-side validation in API route prevents bypass

**Implementation Strategy**:
```typescript
// Metadata schema in raw_user_meta_data
{
  "failed_login_attempts": 3,
  "lockout_until": "2025-10-01T14:30:00Z",
  "last_failed_attempt": "2025-10-01T14:15:00Z"
}
```

**Lockout Logic**:
1. Check `lockout_until` timestamp before allowing signin
2. If locked out: Show error, reject signin
3. On failed attempt: Increment counter, set lockout if >= 5
4. On successful signin: Reset counters to 0

**Rationale**:
- Protects against brute force attacks (NFR-002 requirement)
- 15-30 minute lockout is industry standard
- Metadata persists across sessions
- Client-side provides immediate feedback without server round-trip

**Alternatives Considered**:
- Separate lockout table: Rejected - over-engineering, metadata sufficient
- IP-based rate limiting: Rejected - doesn't help with distributed attacks, penalizes shared IPs
- CAPTCHA after failures: Rejected - not in requirements, adds UX friction

### 4. Case-Insensitive Email Handling

**Decision**: Normalize emails to lowercase on client-side before API calls

**Key Findings**:
- Supabase Auth stores emails case-insensitively by default
- Email field in auth.users is lowercased automatically
- Best practice: Normalize in UI to match backend behavior

**Implementation**:
```typescript
const normalizedEmail = email.trim().toLowerCase()
await supabase.auth.signInWithPassword({
  email: normalizedEmail,
  password
})
```

**Rationale**:
- Prevents user confusion ("why won't User@Example.com work?")
- Aligns with RFC 5321 email standards (local part is case-sensitive but providers ignore)
- Consistent with Supabase's internal handling

**Alternatives Considered**:
- Case-sensitive matching: Rejected - poor UX, not email standard
- Server-side normalization only: Rejected - still confuses users

### 5. OAuth Precedence Check

**Decision**: Query `auth.identities` table in server-side API route before allowing email signin

**Key Findings**:
- `auth.identities` table tracks all auth methods per user
- `provider` field indicates auth type: 'email', 'google', 'azure', 'facebook'
- Single user can have multiple identities
- Need to check if OAuth identity exists before allowing email/password signin

**Implementation**:
```typescript
// Server-side check
const { data: identities } = await supabase.auth.admin.listUserIdentities(userId)
const hasOAuth = identities.some(id => id.provider !== 'email')

if (hasOAuth) {
  return { error: 'Invalid credentials' } // Generic message per FR-006
}
```

**Query Approach**:
```sql
SELECT provider FROM auth.identities
WHERE user_id = (SELECT id FROM auth.users WHERE email = $1)
AND provider IN ('google', 'azure', 'facebook')
LIMIT 1
```

**Rationale**:
- Prevents account takeover via email/password when OAuth is primary method
- Enforces FR-014 requirement (OAuth takes precedence)
- Server-side check prevents client bypass
- Generic error maintains security (no provider enumeration)

**Alternatives Considered**:
- Allow both methods: Rejected - violates FR-014 requirement
- Block OAuth if email exists: Rejected - OAuth should take precedence per requirements

## Security Considerations

### Password Storage
- **Handled by Supabase**: Uses bcrypt hashing automatically
- **No client-side validation**: Per requirements (no password strength requirements)
- **Admin responsibility**: Admins creating users should choose strong passwords

### Error Messages
- **Always generic**: "Invalid credentials" for all auth failures
- **Never reveal**: Whether email exists, is disabled, or has wrong auth method
- **Prevents enumeration**: Can't discover valid emails through signin errors

### Session Management
- **Supabase SSR**: Handles cookie-based sessions automatically
- **PKCE flow**: Enhanced security for auth code exchange
- **Token refresh**: Automatic token rotation via Supabase client
- **Matches OAuth**: Same session duration as existing OAuth auth (FR-011)

### Input Validation
- **Zod schemas**: Email format, required fields
- **Server-side**: All validation happens in API route before Supabase call
- **XSS prevention**: React handles escaping automatically
- **SQL injection**: Parameterized queries via Supabase client

## Performance Considerations

### Response Time Target
- **Requirement**: < 5 seconds (NFR-001)
- **Expected**: 1-2 seconds for typical signin
- **Factors**: Network latency, Supabase API response, database query time

### Optimization Strategies
1. Minimal API route logic (< 100ms overhead)
2. Single database query for OAuth precedence check
3. Client-side lockout check before server call
4. Cached session state reduces redundant calls

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Color contrast**: 4.5:1 for text, 3:1 for interactive elements
- **Keyboard navigation**: Tab order, Enter to submit
- **Screen readers**: ARIA labels on all inputs, error announcements
- **Touch targets**: 44x44px minimum button size
- **Focus indicators**: Visible focus rings on all interactive elements

### Implementation Checklist
- [ ] Email input has `aria-label="Email address"`
- [ ] Password input has `aria-label="Password"` and `type="password"`
- [ ] Submit button is keyboard accessible
- [ ] Error messages use `aria-live="polite"` for screen reader announcements
- [ ] Form has proper `<label>` elements or `aria-labelledby`

## Integration Patterns

### Component Structure
```
EmailPasswordForm (client component)
├── Email input (controlled)
├── Password input (controlled)
├── Submit button (with loading state)
├── Error display (conditional)
└── Rate limit lockout message (conditional)
```

### API Flow
```
1. User submits form
2. Client: Validate inputs with Zod
3. Client: Check local lockout state
4. Client: POST /api/auth/email-signin
5. Server: Validate email format
6. Server: Check OAuth precedence
7. Server: Check lockout metadata
8. Server: Call supabase.auth.signInWithPassword()
9. Server: Update failed attempt metadata (if failed)
10. Server: Return generic response
11. Client: Handle success (redirect) or error (display)
```

### Testing Strategy
- **Unit tests**: Zod schemas, validation functions
- **Component tests**: Form submission, error display, lockout UI
- **Integration tests**: API route behavior, Supabase calls
- **E2E tests**: Full signin flow, lockout enforcement, OAuth precedence

## Dependencies

### NPM Packages (Existing)
- @supabase/ssr ^0.7.0
- @supabase/supabase-js ^2.50.0
- zod ^3.24.1
- react-hook-form ^7.54.0
- next ^14.2.33

### No New Dependencies Required
All functionality can be implemented with existing packages.

## Risks & Mitigation

### Risk 1: Auth hook deployment complexity
**Mitigation**: Use Postgres function (simpler than HTTP endpoint), provide clear deployment docs

### Risk 2: Metadata race conditions on concurrent logins
**Mitigation**: Use Postgres row-level locking, accept eventual consistency for lockout counts

### Risk 3: User confusion about OAuth precedence
**Mitigation**: Clear error messages in admin docs, support contact info on signin page

### Risk 4: Lockout metadata not syncing across devices
**Mitigation**: Metadata stored server-side in auth.users, syncs automatically

## Recommendations

1. **Deploy auth hook first**: Before enabling email signin, ensure hook blocks signups
2. **Test with admin user**: Create test user via Console, verify signin works
3. **Monitor lockout metrics**: Track failed attempt rates in production
4. **Document admin process**: Clear instructions for provisioning email users
5. **Consider future enhancements**: Password reset flow, account recovery options

---

**Research Status**: ✅ Complete
**Next Phase**: Design & Contracts (Phase 1)
