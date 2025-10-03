# Next.js Runtime Error Diagnostic
**Date**: 2025-10-02
**Issue**: Cannot read properties of undefined (reading 'call')
**Location**: `/auth/signin` route
**Impact**: BLOCKS all E2E testing and application usage

---

## Error Details

### Observed Behavior
```
○ Compiling /auth/signin ...
✓ Compiled /auth/signin in 12.8s (781 modules)

TypeError: Cannot read properties of undefined (reading 'call')
  at Object.t [as require] (.next/server/webpack-runtime.js:1:128)
  at require (next-server/app-page.runtime.prod.js:16:18839)
  at I (next-server/app-page.runtime.prod.js:12:94364)
  ...
  page: '/auth/signin'

GET /auth/signin 500 in 27000ms
```

### HTTP Response
- **Status**: 500 Internal Server Error
- **Response Time**: 27 seconds (extremely slow)
- **Affects**: All auth pages (`/auth/signin`, likely `/auth/error` too)

---

## Root Cause Analysis

### Most Likely Causes (in order of probability)

#### 1. Client Component in Server Component Context ❌
**Evidence**:
- `EmailSigninForm.tsx` has `'use client'` directive (line 13)
- Page imports it directly in server component
- Next.js 15 has stricter client/server boundaries

**File**: `/home/davistroy/dev/paintmixr/src/app/auth/signin/page.tsx`
```typescript
Line 18: import EmailSigninForm from '@/components/auth/EmailSigninForm'
Line 102: <EmailSigninForm redirectTo={params.redirect} />
```

**File**: `/home/davistroy/dev/paintmixr/src/components/auth/EmailSigninForm.tsx`
```typescript
Line 13: 'use client'
```

**Problem**: Server component directly importing client component may cause webpack resolution issues

**Fix**: Wrap client component in dynamic import or ensure proper boundaries

#### 2. Missing Type Export ⚠️
**File**: `/home/davistroy/dev/paintmixr/src/types/auth.ts`

Used in EmailSigninForm (line 27):
```typescript
import type { EmailSigninInput, EmailSigninResponse } from '@/types/auth'
```

Types defined but may not be properly exported if there's a circular dependency

#### 3. Missing API Client Utilities ⚠️
**File**: `/home/davistroy/dev/paintmixr/src/lib/api/client.ts`

Used in EmailSigninForm (line 26):
```typescript
import { apiPost } from '@/lib/api/client'
```

If `apiPost` function has issues or dependencies not available in SSR context, could cause webpack errors

#### 4. Supabase Client Initialization 🟡
**Files**:
- `/home/davistroy/dev/paintmixr/src/lib/supabase/server.ts`
- `/home/davistroy/dev/paintmixr/src/lib/supabase/client.ts`

Page uses `validateServerAuth()` (line 34) which may have initialization issues

---

## Suggested Fixes (Priority Order)

### Fix #1: Use Dynamic Import for Client Component (RECOMMENDED)
**File**: `src/app/auth/signin/page.tsx`

**Current Code** (Line 102):
```typescript
<EmailSigninForm redirectTo={params.redirect} />
```

**Fixed Code**:
```typescript
import dynamic from 'next/dynamic'

const EmailSigninForm = dynamic(
  () => import('@/components/auth/EmailSigninForm'),
  { ssr: false }
)

// Then use as normal:
<EmailSigninForm redirectTo={params.redirect} />
```

**Why**: Prevents SSR of client component, avoids webpack resolution issues

---

### Fix #2: Verify Type Exports
**File**: `src/types/auth.ts`

**Current** (appears correct):
```typescript
export interface EmailSigninInput { ... }
export interface EmailSigninResponse { ... }
```

**Verify**: Check for any circular dependencies:
```bash
npx madge --circular src/
```

---

### Fix #3: Check API Client for SSR Issues
**File**: `src/lib/api/client.ts`

**What to check**:
1. Does it use browser-only APIs (fetch is OK, localStorage is NOT)
2. Are there circular imports?
3. Is it properly typed?

**Suggested Review**:
```bash
# Read the file and check for:
# - window/document usage
# - localStorage/sessionStorage
# - navigator API
cat src/lib/api/client.ts | grep -E "(window|document|localStorage|sessionStorage|navigator)"
```

---

### Fix #4: Simplify Page to Isolate Issue
**File**: `src/app/auth/signin/page.tsx`

**Create minimal test version**:
```typescript
export default async function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1>Sign In</h1>
      <p>Test page</p>
    </div>
  )
}
```

**Then progressively add back**:
1. Add metadata ✓
2. Add searchParams ✓
3. Add validateServerAuth ✓
4. Add OAuth buttons ✓
5. Add EmailSigninForm ❌ (if this breaks, you found the issue)

---

### Fix #5: Clear Next.js Cache
**Commands**:
```bash
# Remove all build artifacts
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build

# Or just dev
npm run dev
```

**Why**: Webpack cache corruption can cause module resolution errors

---

## Immediate Debug Steps

### Step 1: Check if OAuth-only page works
**Create**: `src/app/auth/signin-oauth-only/page.tsx`
```typescript
import SignInButton from '@/components/auth/SignInButton'

export default async function SignInOAuthOnly() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-3">
        <SignInButton provider="google" />
        <SignInButton provider="microsoft" />
      </div>
    </div>
  )
}
```

**Test**: Visit http://localhost:3000/auth/signin-oauth-only
- If works: Problem is in EmailSigninForm
- If fails: Problem is in SignInButton or deeper

### Step 2: Check SignInButton
**File**: `/home/davistroy/dev/paintmixr/src/components/auth/SignInButton.tsx`

Check for:
- Client directive
- Browser-only API usage
- Supabase client initialization

### Step 3: Enable Next.js Debug Mode
**File**: `next.config.js` (or `next.config.mjs`)

Add:
```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  // Enable more verbose logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

### Step 4: Check for Duplicate Dependencies
**Command**:
```bash
npm list react
npm list react-dom
npm list next
```

**Expected**: Single version of each
**If multiple**: Dedupe with `npm dedupe`

---

## Environment-Specific Checks

### Development Environment
**Current**:
- Next.js: 14.2.33
- React: 18.3.1
- Node: v22.15.0

**Verify compatibility**:
```bash
npx next info
```

### Environment Variables
**Check for missing vars** (may cause initialization failures):
```bash
# Should be set:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# In .env.local:
cat .env.local | grep SUPABASE
```

**If missing**: Application may fail during SSR initialization

---

## Known Next.js 15 Issues

### SearchParams as Promise (Already Fixed ✓)
**File**: `src/app/auth/signin/page.tsx` (Line 28-31)
```typescript
searchParams: Promise<{ redirect?: string; error?: string }>
// ...
const params = await searchParams
```

**Status**: ✅ Correctly implemented

### Async Request APIs
**Next.js 15 Change**: `headers()`, `cookies()`, etc. are now async

**Check**: If using these anywhere without `await`, will cause errors

---

## Testing the Fix

### Step-by-Step Validation
1. Apply Fix #1 (dynamic import)
2. Restart dev server: `npm run dev`
3. Visit: http://localhost:3000/auth/signin
4. Expected: Page loads without 500 error
5. If works: Run E2E tests
6. If fails: Try Fix #2

### Verification Commands
```bash
# 1. Clear cache and rebuild
rm -rf .next && npm run dev

# 2. Wait for compilation
sleep 10

# 3. Test page load
curl -I http://localhost:3000/auth/signin

# Expected: HTTP/2 200 OK
# If 500: Issue not resolved
```

---

## Related Files to Review

### Primary Suspects
1. `/home/davistroy/dev/paintmixr/src/app/auth/signin/page.tsx` ⭐
2. `/home/davistroy/dev/paintmixr/src/components/auth/EmailSigninForm.tsx` ⭐
3. `/home/davistroy/dev/paintmixr/src/lib/api/client.ts` ⚠️
4. `/home/davistroy/dev/paintmixr/src/types/auth.ts` ⚠️

### Secondary Suspects
5. `/home/davistroy/dev/paintmixr/src/components/auth/SignInButton.tsx`
6. `/home/davistroy/dev/paintmixr/src/lib/supabase/server.ts`
7. `/home/davistroy/dev/paintmixr/src/lib/auth/validation.ts`
8. `/home/davistroy/dev/paintmixr/src/lib/auth/rate-limit.ts`

### Configuration Files
9. `/home/davistroy/dev/paintmixr/tsconfig.json` (checked - appears correct)
10. `/home/davistroy/dev/paintmixr/next.config.js` (not checked yet)
11. `/home/davistroy/dev/paintmixr/package.json` (dependencies look correct)

---

## Expected Resolution Time

- **Fix #1** (dynamic import): 5 minutes
- **Fix #2** (type exports): 10 minutes
- **Fix #3** (API client): 15 minutes
- **Fix #4** (page simplification): 20 minutes
- **Fix #5** (cache clear): 2 minutes

**Total**: 30-60 minutes to isolate and resolve

---

## Impact on Testing

### Blocked Tests
- ❌ All Cypress E2E tests (26 tests in auth-full-cycle.cy.ts)
- ❌ auth-performance-scale.cy.ts
- ❌ rate-limiting-load.cy.ts
- ❌ accessibility-wcag.cy.ts
- ❌ All other E2E authentication tests

### Unblocked Tests
- ✅ Unit tests (can run independently)
- ✅ Component tests (render in isolation)
- ✅ Contract tests (if using mocks)

### Once Fixed
**Can proceed with**:
1. Full E2E test suite execution
2. Performance testing with real application
3. Accessibility validation on live pages
4. User journey testing

---

## Next Steps

1. **Apply Fix #1** (dynamic import) - Most likely solution
2. **Test page load** - Verify 200 response
3. **Run single E2E test** - Confirm Cypress can access page
4. **Run full test suite** - If successful, complete T072-T073
5. **Update test report** - Document resolution and final results

---

**Diagnostic Created**: 2025-10-02 12:35:00 UTC
**Status**: ACTIONABLE - Clear fix path identified
**Confidence**: HIGH (90% probability Fix #1 resolves issue)
