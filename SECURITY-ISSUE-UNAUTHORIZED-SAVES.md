# 🚨 CRITICAL SECURITY ISSUE: Unauthorized Session Saves

**Discovered**: 2025-10-05 14:30 UTC
**Severity**: **CRITICAL**
**Status**: ⚠️ **ACTIVE IN PRODUCTION**

## Summary

The `/api/sessions` POST endpoint allows **UNAUTHENTICATED** users to save mixing sessions to the database. This violates the fundamental security requirement that only authenticated users should be able to persist data.

## Evidence

###Test Performed
1. Navigated to https://paintmixr.vercel.app/ WITHOUT signing in
2. Calculated a color formula (#2ECC71 - Green)
3. Clicked "Save This Formula" button
4. Save dialog opened (should have prompted for login instead)
5. Filled session name: "Unauthorized Test"
6. Clicked "Save Session"
7. **API Response**: **201 Created** ✅ (should have been 401 Unauthorized ❌)

### Network Evidence
```
POST https://paintmixr.vercel.app/api/sessions
Status: 201 Created
Date: Sun, 05 Oct 2025 14:30:02 GMT
x-vercel-id: iad1::iad1::j7qzn-1759674601980-509b938d4d49
```

The request succeeded WITHOUT any authentication headers.

### Timeline
- **Previous Session (Authenticated)**: Earlier testing used troy@k4jda.com credentials
- **Current Session (Unauthenticated)**: Fresh page load, no login, save succeeded

## Impact Assessment

### Severity: CRITICAL

**Security Risks**:
1. **Unauthorized Data Creation**: Unauthenticated users can write to the database
2. **Data Integrity**: Cannot reliably associate sessions with users
3. **Resource Abuse**: Malicious actors could spam the database with sessions
4. **RLS Bypass**: If Row Level Security depends on authenticated user context, it's being bypassed

**Affected Functionality**:
- Session save feature
- Potentially session retrieval if using the same broken auth check

### User Impact
- All saved sessions may have incorrect or null `user_id` associations
- Legitimate users might see sessions from anonymous users
- Database bloat from spam saves

## Root Cause Analysis

### Expected Behavior
```typescript
// /api/sessions POST handler should check:
const supabase = await createClient()  // Route handler client
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

// Only proceed with user.id for RLS
```

### Actual Behavior
The `/api/sessions` POST endpoint is either:
1. Not checking for authentication at all, OR
2. Allowing saves with a null/anonymous user context

## Files to Investigate

1. `/src/app/api/sessions/route.ts` - POST handler
   - Check if `getUser()` is being called
   - Check if user existence is verified before insert
   - Check if user.id is being passed to the database

2. Supabase RLS policies on `sessions` table
   - Check if INSERT policy requires authentication
   - Check if policy allows anonymous inserts

3. `/src/lib/supabase/route-handler.ts`
   - Verify createClient() returns authenticated client

## Recommended Immediate Actions

### 1. Add Auth Check to API Route (HIGH PRIORITY)
```typescript
// src/app/api/sessions/route.ts
export async function POST(request: Request) {
  const supabase = await createClient()

  // CRITICAL: Check authentication BEFORE processing
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required to save sessions' },
      { status: 401 }
    )
  }

  // Rest of save logic using user.id...
}
```

### 2. Update Client-Side UX (MEDIUM PRIORITY)
```typescript
// src/app/page.tsx
// Check if user is authenticated before showing Save button
const { data: { session } } = await supabase.auth.getSession()

{session && canSave && (
  <button onClick={() => setShowSaveForm(true)}>
    Save This Formula
  </button>
)}

{!session && canSave && (
  <button onClick={() => router.push('/auth/signin?redirect=/')}>
    Sign in to Save
  </button>
)}
```

### 3. Database Cleanup (IF NEEDED)
If sessions table has records with NULL user_id:
```sql
-- Identify orphaned sessions
SELECT COUNT(*) FROM sessions WHERE user_id IS NULL;

-- Decision: Delete or quarantine these records
DELETE FROM sessions WHERE user_id IS NULL AND created_at > '2025-10-05';
```

### 4. Add RLS Policy (DEFENSE IN DEPTH)
```sql
-- Supabase RLS policy for sessions table
CREATE POLICY "Users can only insert their own sessions"
ON sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
```

## Testing Verification

After fix is deployed, verify:
1. ✅ Unauthenticated user clicking "Save" redirects to `/auth/signin`
2. ✅ Authenticated user can save sessions
3. ✅ API returns 401 when no session cookie present
4. ✅ Toast appears for authenticated saves (separate issue, but verify together)

## Related Issues

- **Toast Not Appearing**: Separate UX issue, not security-related
- **Session Retrieval**: May have same auth bypass - needs verification

## Production Impact

**Current State**: ❌ **BROKEN** - Unauthorized saves allowed
**Required Fix**: Add authentication check to /api/sessions POST handler
**Deployment Priority**: **IMMEDIATE** (security vulnerability)

## Comparison with Requirements

**Original Requirements (likely)**:
- Only authenticated users can save sessions
- Sessions associated with user accounts via user_id
- RLS enforces data isolation per user

**Current Implementation**:
- ❌ Anyone can save sessions (no auth check)
- ❌ Sessions might have NULL user_id
- ⚠️ RLS may not be protecting inserts

## Next Steps

1. **Verify**: Read `/src/app/api/sessions/route.ts` to confirm missing auth check
2. **Fix**: Add authentication check at top of POST handler
3. **Test**: Verify 401 response for unauthenticated requests
4. **Deploy**: Push fix to production immediately
5. **Audit**: Check other API routes for same vulnerability (/api/optimize, etc.)
6. **Cleanup**: Decide what to do with any orphaned sessions

---

**Discovered by**: Claude Code automated production testing
**Test Session**: Comprehensive Feature 008 validation
**User**: Unauthenticated (intentional test)
**Color Tested**: #2ECC71 (Green), ΔE=16.15, 5 paints
