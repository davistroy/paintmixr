# Quickstart Guide: Comprehensive Codebase Improvement

**Feature**: 005-use-codebase-analysis
**Created**: 2025-10-02
**Purpose**: End-to-end integration test scenarios validating critical improvements

---

## Prerequisites

Before running these quickstart scenarios:

1. **Development Environment**:
   - Node.js 18+ installed
   - PostgreSQL database running (or Supabase project configured)
   - Environment variables configured in `.env.local`

2. **Required Environment Variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Database Setup**:
   - Run all migrations in `supabase/migrations/`
   - Ensure `increment_failed_login_attempts` function exists
   - Verify `auth.users` and `auth.identities` tables accessible

4. **Build Verification**:
   ```bash
   npm install
   npm run build
   # Must complete with 0 TypeScript errors (FR-025)
   # Must complete with 0 ESLint errors (FR-026)
   ```

---

## Scenario 1: Authentication Performance at Scale

**Goal**: Verify authentication completes in <2 seconds regardless of user count (FR-002, NFR-008)

### Setup

1. **Seed Database** (10,000 test users):
   ```bash
   npm run seed:users -- --count=10000
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Test Steps

1. **Navigate to Sign-In Page**:
   ```
   http://localhost:3000/signin
   ```

2. **Attempt Sign-In** (with valid credentials from seed data):
   - Email: `user5000@example.com`
   - Password: `TestPassword123!`

3. **Measure Response Time** (use browser DevTools Network tab):
   - Request to `/api/auth/email-signin`
   - Expected: ≤2 seconds (server-side + 200ms network)

4. **Verify Database Query Plan**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM auth.users WHERE email = 'user5000@example.com';
   -- Must show index usage (Index Scan on auth_users_email_idx)
   -- Must NOT show Seq Scan (full table scan)
   ```

### Expected Results

✅ **Success**:
- Authentication completes in <2 seconds
- Database query uses email index (O(1) lookup)
- User redirected to dashboard
- Session cookie set correctly

❌ **Failure Indicators**:
- Response time increases linearly with user count (N+1 query issue)
- Database query plan shows `Seq Scan` (missing index)
- Response time >2 seconds

---

## Scenario 2: Rate Limiting Under Load

**Goal**: Verify rate limiting prevents DoS attacks on authentication endpoint (FR-010, FR-011, FR-012)

### Setup

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Install HTTP Load Testing Tool**:
   ```bash
   npm install -g artillery
   ```

### Test Steps

1. **Create Artillery Load Test** (`artillery-auth-load.yml`):
   ```yaml
   config:
     target: "http://localhost:3000"
     phases:
       - duration: 30
         arrivalRate: 10
         name: "Sustained load"
   scenarios:
     - name: "Rapid login attempts"
       flow:
         - post:
             url: "/api/auth/email-signin"
             json:
               email: "attacker@example.com"
               password: "wrongpassword"
   ```

2. **Run Load Test**:
   ```bash
   artillery run artillery-auth-load.yml
   ```

3. **Verify Rate Limiting**:
   - First 5 requests should return 401 (invalid credentials)
   - Subsequent requests should return 429 (rate limited)
   - Response should include `Retry-After` header

4. **Check Sliding Window Behavior**:
   - Wait 15 minutes
   - Attempt 6th request
   - Should be allowed (oldest attempt expired from window)

### Expected Results

✅ **Success**:
- Rate limit activates after 5 attempts within 15-minute window
- 429 status code with `Retry-After` header returned
- Server resources not exhausted (CPU/memory stable)
- Sliding window correctly prunes old timestamps

❌ **Failure Indicators**:
- More than 5 attempts allowed within window
- Server CPU/memory exhaustion during load test
- Missing `Retry-After` header in 429 response

---

## Scenario 3: Account Lockout Race Condition Prevention

**Goal**: Verify concurrent failed login attempts trigger lockout exactly once after 5 attempts (FR-007, FR-008, FR-009)

### Setup

1. **Create Test User**:
   ```bash
   npm run create-user -- --email=lockout-test@example.com --password=TestPassword123!
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Test Steps

1. **Simulate Concurrent Failed Attempts** (using `curl` or Postman):
   ```bash
   # Launch 10 parallel requests simultaneously
   for i in {1..10}; do
     curl -X POST http://localhost:3000/api/auth/email-signin \
       -H "Content-Type: application/json" \
       -d '{"email":"lockout-test@example.com","password":"wrongpassword"}' &
   done
   wait
   ```

2. **Verify Lockout Metadata** (using Supabase Dashboard or SQL):
   ```sql
   SELECT
     email,
     raw_user_meta_data->>'failed_login_attempts' AS attempts,
     raw_user_meta_data->>'lockout_until' AS lockout_until
   FROM auth.users
   WHERE email = 'lockout-test@example.com';
   ```

3. **Expected Values**:
   - `failed_login_attempts`: Exactly 5 (not 6, 7, or 10)
   - `lockout_until`: Timestamp 15 minutes in future

4. **Verify Lockout Enforcement**:
   - Attempt login with correct password
   - Should return 403 with "Account locked" message
   - Lockout timer should reset to full 15 minutes (FR-009a)

### Expected Results

✅ **Success**:
- Failed attempt counter stops at exactly 5 (atomic operation prevents race)
- Lockout triggered after 5th attempt
- Further attempts during lockout reset timer to full 15 minutes
- No attempts bypass lockout threshold

❌ **Failure Indicators**:
- Counter exceeds 5 (race condition allowed >5 attempts)
- Counter is less than 5 after 10 concurrent requests (lost updates)
- Lockout not enforced (authentication succeeds during lockout period)

---

## Scenario 4: OAuth Precedence Enforcement

**Goal**: Verify email/password authentication blocked when OAuth identity exists (FR-004, FR-005, FR-006)

### Setup

1. **Create OAuth Test User**:
   - Sign up using Google OAuth flow in browser
   - Verify user created in `auth.users` table
   - Verify Google identity in `auth.identities` table

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

### Test Steps

1. **Attempt Email/Password Sign-In** (with OAuth user's email):
   ```bash
   curl -X POST http://localhost:3000/api/auth/email-signin \
     -H "Content-Type: application/json" \
     -d '{"email":"oauth-user@gmail.com","password":"anypassword"}'
   ```

2. **Verify Response**:
   ```json
   {
     "error": "oauth_precedence",
     "message": "This account uses Google authentication. Please sign in with Google.",
     "provider": "google"
   }
   ```

3. **Verify Status Code**: 403 Forbidden

4. **Verify Database Query**:
   ```sql
   SELECT provider
   FROM auth.identities
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'oauth-user@gmail.com')
     AND provider != 'email';
   -- Should return: google
   ```

### Expected Results

✅ **Success**:
- Email/password authentication blocked for OAuth users
- Error message specifies detected provider (Google, GitHub, etc.)
- Status code is 403 Forbidden
- Failed attempt counter NOT incremented (OAuth precedence checked first)

❌ **Failure Indicators**:
- Authentication succeeds with email/password for OAuth user
- Generic error message (doesn't specify provider)
- Failed attempt counter incremented incorrectly

---

## Scenario 5: TypeScript Strict Mode Compilation

**Goal**: Verify TypeScript strict mode catches null/undefined bugs at compile-time (FR-018, FR-021)

### Setup

1. **Ensure Strict Mode Enabled** (`tsconfig.json`):
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "strictNullChecks": true
     }
   }
   ```

2. **Create Test File** (`test-strict-mode.ts`):
   ```typescript
   import { getUserById } from '@/lib/auth'

   // This should FAIL to compile (user might be null)
   export async function testNullSafety(userId: string) {
     const user = await getUserById(userId)
     console.log(user.email) // ERROR: Object is possibly 'null'
   }
   ```

### Test Steps

1. **Run Type Check**:
   ```bash
   npm run type-check
   ```

2. **Verify Compilation Failure**:
   ```
   test-strict-mode.ts:6:17 - error TS2531: Object is possibly 'null'.
   ```

3. **Fix with Null Check**:
   ```typescript
   export async function testNullSafety(userId: string) {
     const user = await getUserById(userId)
     if (user === null) {
       throw new Error('User not found')
     }
     console.log(user.email) // OK: user is non-null
   }
   ```

4. **Verify Compilation Success**:
   ```bash
   npm run type-check
   # Exit code: 0
   ```

### Expected Results

✅ **Success**:
- Compilation fails when null safety violated
- Error message clearly identifies issue
- Fix with null check allows compilation
- Build configuration prevents ignoring errors (FR-025)

❌ **Failure Indicators**:
- Code compiles despite null/undefined access
- `ignoreBuildErrors: true` in `next.config.js` (forbidden)
- Null safety violations in production build

---

## Scenario 6: Type Definition Consolidation

**Goal**: Verify all duplicate type definitions eliminated and imports use centralized index (FR-015, FR-017)

### Setup

1. **Ensure Type Index Exists**:
   ```bash
   ls src/lib/types/index.ts
   # Should exist with all shared types
   ```

### Test Steps

1. **Search for Duplicate Type Definitions**:
   ```bash
   # Search for ColorValue interface definitions
   grep -r "interface ColorValue" src/
   # Should return only: src/lib/types/index.ts
   ```

2. **Verify Centralized Imports**:
   ```bash
   # Search for ColorValue imports
   grep -r "from '@/lib/types'" src/
   # All imports should use centralized index
   ```

3. **Check for Legacy Local Types**:
   ```bash
   # Search for local type files (should not exist)
   find src/ -name "types.ts" -not -path "*/lib/types/*"
   # Should return empty (all deleted)
   ```

4. **Verify Domain-Specific Naming** (for incompatible duplicates):
   ```bash
   grep -r "VolumeConstraints" src/lib/types/index.ts
   # Should show:
   # - OptimizationVolumeConstraints (backend domain)
   # - UIVolumeConstraints (frontend domain)
   ```

### Expected Results

✅ **Success**:
- Single `ColorValue` definition in centralized index
- All imports reference `@/lib/types`
- Domain-specific types have unique names
- No duplicate type files in component directories

❌ **Failure Indicators**:
- Multiple `ColorValue` definitions found
- Components import from local type files
- Build errors due to conflicting type definitions

---

## Scenario 7: Supabase Client Pattern Consolidation

**Goal**: Verify legacy Supabase client files deleted and all code uses modern `@supabase/ssr` patterns (FR-022, FR-023, FR-024)

### Setup

1. **Ensure Modern Clients Exist**:
   ```bash
   ls src/lib/supabase/client.ts      # Browser client
   ls src/lib/supabase/server.ts      # Server component client
   ls src/lib/supabase/route-handler.ts # API route client
   ls src/lib/supabase/admin.ts       # Admin client
   ```

### Test Steps

1. **Search for Legacy Client Files** (should not exist):
   ```bash
   find src/ -name "*supabase*" -type f | grep -v "src/lib/supabase/"
   # Should return empty (all legacy files deleted)
   ```

2. **Verify Import Patterns**:
   ```bash
   # All Supabase imports should use modern patterns
   grep -r "createBrowserClient\|createServerClient" src/
   # Should only find imports from src/lib/supabase/*
   ```

3. **Check for Deprecated Patterns**:
   ```bash
   # Search for old @supabase/auth-helpers-nextjs imports (deprecated)
   grep -r "@supabase/auth-helpers-nextjs" src/
   # Should return empty
   ```

4. **Verify Session Management** (cookie-based only):
   ```bash
   # Search for localStorage session storage (deprecated)
   grep -r "localStorage.*session" src/
   # Should return empty (cookies only)
   ```

### Expected Results

✅ **Success**:
- Legacy client files deleted
- All imports use modern `@supabase/ssr` package
- Session management uses cookies exclusively
- One client pattern per context (browser, server, API route, admin)

❌ **Failure Indicators**:
- Legacy client files still exist
- Mixed usage of old and new patterns
- localStorage used for session storage

---

## Scenario 8: Code Duplication Reduction Verification

**Goal**: Verify overall code duplication reduced by 40-50% using token-based AST analysis (FR-032)

### Setup

1. **Install jscpd** (if not already installed):
   ```bash
   npm install -g jscpd
   ```

2. **Create jscpd Configuration** (`.jscpdrc.json`):
   ```json
   {
     "threshold": 5,
     "minTokens": 50,
     "minLines": 5,
     "mode": "strict",
     "format": ["typescript", "tsx"],
     "ignore": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**"],
     "reporters": ["json", "console"]
   }
   ```

### Test Steps

1. **Run Duplication Analysis**:
   ```bash
   jscpd src/ --output=./reports/jscpd
   ```

2. **Review Duplication Report**:
   ```bash
   cat reports/jscpd/jscpd-report.json
   ```

3. **Check Key Metrics**:
   - **Total Lines**: Baseline for percentage calculation
   - **Duplicate Lines**: Number of duplicated lines
   - **Duplicate Tokens**: Token-based similarity percentage
   - **Duplicate Percentage**: Should be 30-35% (down from ~60% baseline)

4. **Verify Shared Utilities Usage**:
   ```bash
   # Check that components use shared API client
   grep -r "apiPost\|apiGet" src/components/
   # Should return many results

   # Check that forms use shared validation schemas
   grep -r "from '@/lib/forms/schemas'" src/
   # Should return many results

   # Check that components use shared hooks
   grep -r "usePagination\|useFilters\|useDataFetch" src/
   # Should return many results
   ```

### Expected Results

✅ **Success**:
- Duplication percentage reduced to 30-35% (from ~60% baseline)
- Duplicate blocks reduced by 50% (from ~150 to <75)
- Components use shared utilities instead of duplicating logic
- jscpd report shows significant improvement

❌ **Failure Indicators**:
- Duplication percentage still >40%
- Many duplicate blocks remain (>100)
- Components still duplicate API calls, validation, pagination logic

---

## Scenario 9: Component Size Refactoring

**Goal**: Verify all components under 300 lines with large files split into focused units (FR-030)

### Setup

1. **Install Line Counting Tool**:
   ```bash
   npm install -g cloc
   ```

### Test Steps

1. **Find Large Components** (should return empty):
   ```bash
   find src/components/ -name "*.tsx" -exec sh -c 'wc -l "$1" | awk "{if (\$1 > 300) print \$1, \$2}"' _ {} \;
   # Should return empty (no files >300 lines)
   ```

2. **Check Files Previously Over 500 Lines** (from CODEBASE_ANALYSIS_REPORT):
   - `src/components/auth/EmailSigninForm.tsx` (was 542 lines)
   - `src/components/mixing/PaintMixerWorkspace.tsx` (was 687 lines)

3. **Verify Refactoring Strategy** (both strategies allowed):
   ```bash
   # Check for sub-component extraction
   ls src/components/auth/EmailSigninForm/
   # Might contain: EmailInput.tsx, PasswordInput.tsx, ErrorDisplay.tsx

   # Check for utility extraction
   ls src/lib/auth/
   # Might contain: validation.ts, rate-limit.ts, metadata-helpers.ts
   ```

4. **Calculate Average Component Size**:
   ```bash
   find src/components/ -name "*.tsx" -exec wc -l {} + | awk '{sum+=$1} END {print "Average:", sum/NR, "lines"}'
   # Should be under 250 lines average
   ```

### Expected Results

✅ **Success**:
- No component files over 300 lines
- Large components split using sub-components or utility functions
- Average component size under 250 lines
- Functionality preserved after refactoring

❌ **Failure Indicators**:
- Components over 500 lines still exist
- Average component size >300 lines
- Refactoring broke existing functionality

---

## Scenario 10: Test Coverage for Critical Paths

**Goal**: Verify 90%+ test coverage for authentication, color science, and mixing optimization (FR-037)

### Setup

1. **Ensure Jest Configured** (`jest.config.js`):
   ```javascript
   module.exports = {
     collectCoverage: true,
     coverageThreshold: {
       './src/lib/auth/': {
         branches: 90,
         functions: 90,
         lines: 90,
         statements: 90
       },
       './src/lib/color/': {
         branches: 90,
         functions: 90,
         lines: 90,
         statements: 90
       },
       './src/lib/mixing/': {
         branches: 90,
         functions: 90,
         lines: 90,
         statements: 90
       }
     }
   }
   ```

### Test Steps

1. **Run Tests with Coverage**:
   ```bash
   npm run test -- --coverage
   ```

2. **Verify Coverage Report**:
   ```
   ----------------------------|---------|----------|---------|---------|
   File                        | % Stmts | % Branch | % Funcs | % Lines |
   ----------------------------|---------|----------|---------|---------|
   All files                   |   94.23 |    91.45 |   93.67 |   94.01 |
    src/lib/auth/              |   95.12 |    92.34 |   94.56 |   95.00 |
    src/lib/color/             |   93.45 |    90.23 |   92.78 |   93.21 |
    src/lib/mixing/            |   94.01 |    91.12 |   93.45 |   93.89 |
   ----------------------------|---------|----------|---------|---------|
   ```

3. **Check Critical Path Coverage** (must be ≥90%):
   - **Authentication**: Email/password signin, OAuth precedence, lockout, rate limiting
   - **Color Science**: LAB conversions, Delta E calculations, color accuracy
   - **Mixing Optimization**: Kubelka-Munk mixing, volume constraints, formula generation

4. **Verify Test Quality** (no placeholders):
   ```bash
   # Search for placeholder tests (should return empty)
   grep -r "test.skip\|it.skip" src/ | grep -v "TODO:"
   # Skipped tests must have TODO comments
   ```

### Expected Results

✅ **Success**:
- All critical paths achieve ≥90% coverage (lines, branches, functions, statements)
- Tests fail if coverage drops below threshold
- No placeholder tests without TODO comments
- All tests have meaningful assertions

❌ **Failure Indicators**:
- Coverage below 90% for any critical path
- Tests pass but always return true (false positives)
- Placeholder tests without `.skip()` status

---

## Scenario 11: Cypress E2E Authentication Flow

**Goal**: Verify complete authentication flow works end-to-end with all security controls (FR-038)

### Setup

1. **Install Cypress**:
   ```bash
   npm install --save-dev cypress
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Start Cypress**:
   ```bash
   npx cypress open
   ```

### Test Steps

1. **Run E2E Test** (`cypress/e2e/auth-flow.cy.ts`):
   ```typescript
   describe('Authentication Flow', () => {
     it('should complete full authentication cycle', () => {
       // Visit signin page
       cy.visit('/signin')

       // Attempt signin with valid credentials
       cy.get('[data-testid="email-input"]').type('test@example.com')
       cy.get('[data-testid="password-input"]').type('TestPassword123!')
       cy.get('[data-testid="signin-button"]').click()

       // Verify redirect to dashboard
       cy.url().should('include', '/dashboard')

       // Verify session cookie set
       cy.getCookie('sb-access-token').should('exist')
     })

     it('should enforce rate limiting after 5 attempts', () => {
       cy.visit('/signin')

       // Attempt 6 failed logins
       for (let i = 0; i < 6; i++) {
         cy.get('[data-testid="email-input"]').clear().type('test@example.com')
         cy.get('[data-testid="password-input"]').clear().type('wrongpassword')
         cy.get('[data-testid="signin-button"]').click()
         cy.wait(500)
       }

       // Verify rate limit error displayed
       cy.get('[data-testid="error-message"]').should('contain', 'Too many login attempts')
     })

     it('should enforce account lockout after 5 failed attempts', () => {
       cy.visit('/signin')

       // Attempt 5 failed logins
       for (let i = 0; i < 5; i++) {
         cy.get('[data-testid="email-input"]').clear().type('lockout@example.com')
         cy.get('[data-testid="password-input"]').clear().type('wrongpassword')
         cy.get('[data-testid="signin-button"]').click()
         cy.wait(500)
       }

       // Verify lockout error displayed
       cy.get('[data-testid="error-message"]').should('contain', 'Account locked')
       cy.get('[data-testid="lockout-timer"]').should('be.visible')
     })
   })
   ```

2. **Verify Test Results**:
   - All tests pass
   - Screenshots captured on failure
   - Video recording available

### Expected Results

✅ **Success**:
- All E2E tests pass
- Authentication flow works end-to-end
- Rate limiting and lockout enforced in browser
- Error messages displayed correctly

❌ **Failure Indicators**:
- Tests timeout or fail
- Rate limiting not enforced
- Lockout not triggered after 5 attempts

---

## Scenario 12: Build Performance and Optimization

**Goal**: Verify production build completes successfully with all optimizations (FR-025, FR-026, FR-027)

### Test Steps

1. **Clean Build**:
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Verify Build Output**:
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages (12/12)
   ✓ Collecting build traces
   ✓ Finalizing page optimization

   Route (app)                                Size     First Load JS
   ┌ ○ /                                      1.2 kB         85.3 kB
   ├ ○ /dashboard                             2.5 kB         87.6 kB
   ├ ○ /signin                                1.8 kB         86.9 kB
   └ ○ /api/auth/email-signin                 0 kB           0 kB
   ```

3. **Verify No Errors or Warnings**:
   - No TypeScript errors (FR-025)
   - No ESLint errors (FR-026)
   - No warnings about ignored errors (FR-027)

4. **Check Bundle Size**:
   - First Load JS should be reasonable (<100 kB per page)
   - No excessive bundle bloat from duplicated code

### Expected Results

✅ **Success**:
- Build completes with exit code 0
- No TypeScript or ESLint errors
- No warnings in output
- Bundle sizes optimized

❌ **Failure Indicators**:
- Build fails with TypeScript errors
- Build fails with ESLint errors
- Warnings about ignored errors present
- Bundle sizes excessive (>200 kB per page)

---

## Scenario 13: Next.js 15 Compatibility

**Goal**: Verify application works with Next.js 15 and async searchParams pattern (FR-013, FR-014)

### Setup

1. **Verify Next.js Version** (`package.json`):
   ```json
   {
     "dependencies": {
       "next": "^15.0.0"
     }
   }
   ```

2. **Check for Async SearchParams** (all page components must use):
   ```bash
   grep -r "searchParams:" app/ | grep -v "async"
   # Should return empty (all searchParams must be async)
   ```

### Test Steps

1. **Visit Page with Query Parameters**:
   ```
   http://localhost:3000/signin?redirect=/dashboard&error=invalid_credentials
   ```

2. **Verify Page Component** (`app/signin/page.tsx`):
   ```typescript
   export default async function SignInPage({
     searchParams
   }: {
     searchParams: Promise<{ redirect?: string; error?: string }>
   }) {
     const params = await searchParams
     // Use params.redirect and params.error
   }
   ```

3. **Verify No Runtime Errors**:
   - Page renders correctly
   - Query parameters accessible
   - No console errors about searchParams

4. **Run Build** (must complete successfully):
   ```bash
   npm run build
   # Should complete without Next.js 15 compatibility errors
   ```

### Expected Results

✅ **Success**:
- All pages use async searchParams pattern
- Build completes with Next.js 15
- No runtime errors accessing query parameters
- Query parameters work correctly

❌ **Failure Indicators**:
- Runtime errors about searchParams
- Build fails with Next.js 15
- Pages use synchronous searchParams (deprecated)

---

## Success Criteria Summary

All scenarios must pass with the following overall success criteria:

1. ✅ **Performance**: Authentication <2 seconds at 10,000 user scale
2. ✅ **Security**: Rate limiting active after 5 attempts, lockout enforced, OAuth precedence works
3. ✅ **Type Safety**: TypeScript strict mode catches errors at compile-time
4. ✅ **Code Quality**: Duplication reduced to 30-35%, components under 300 lines
5. ✅ **Test Coverage**: 90%+ coverage for critical paths
6. ✅ **Build Success**: Zero TypeScript/ESLint errors, no warnings
7. ✅ **Next.js 15**: Async searchParams pattern works correctly
8. ✅ **E2E Testing**: Cypress tests pass for full authentication flow

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
