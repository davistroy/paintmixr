# Research: Comprehensive Codebase Improvement & Technical Debt Resolution

**Feature**: 005-use-codebase-analysis
**Date**: 2025-10-02
**Status**: Complete

## Research Overview

This document consolidates findings from 8 technical research tasks using Context7 MCP and web search to resolve implementation decisions for the codebase improvement feature. All research was conducted using latest documentation to ensure currency per Constitutional Principle II.

---

## 1. Next.js 15 Async SearchParams Pattern

### Decision
Use async/await pattern for `searchParams` in page components. Server Components await the Promise prop, Client Components use React's `use()` hook.

### Rationale
Next.js 15 makes `searchParams` and `params` asynchronous to enable Partial Prerendering (PPR) and better streaming performance. The async API prevents blocking page renders when dynamic URL parameters aren't needed for static shell content.

### Implementation Pattern

**Server Components (Recommended)**:
```typescript
export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const params = await searchParams
  const redirectTo = params.redirect || '/'
  const error = params.error

  return <EmailSigninForm redirectTo={redirectTo} error={error} />
}
```

**Client Components**:
```typescript
'use client'
import { use } from 'react'

export default function Page(props: {
  searchParams: Promise<{ query?: string }>
}) {
  const searchParams = use(props.searchParams)
  const { query } = searchParams
  return <div>Search: {query}</div>
}
```

### Migration Steps
1. **Run automated codemod**: `npx @next/codemod@latest next-async-request-api .`
2. **Review failures**: Codemod adds `@next-codemod-error` comments where auto-migration failed
3. **Manual fixes**:
   - Make page components `async`
   - Update type signatures to `Promise<T>`
   - Use `use()` hook in Client Components
   - Update `generateMetadata` functions to be `async`

### Test-First Approach
- Write E2E tests verifying URL query params flow correctly (Cypress)
- Create component tests mocking `searchParams` as resolved Promise
- Run type safety tests ensuring TypeScript compilation succeeds
- Establish regression tests before applying codemod
- Verify all tests pass after migration

### Alternatives Considered
- **UnsafeUnwrappedSearchParams typecast**: Rejected - logs warnings in dev, may break in future Next.js versions
- **Defer upgrade to Next.js 15**: Rejected - spec requires Next.js 15 compatibility (FR-013, FR-014)

---

## 2. Supabase Admin API for User Lookup

### Decision
Use `supabaseAdmin.auth.admin.listUsers()` with pagination as the official approach. Direct `auth.users` table queries are not supported.

### Rationale
Supabase does **not** provide a `getUserByEmail()` method in the Admin API. The `auth.users` table is not exposed through PostgREST, even with service role keys. Admin SDK methods use internal service APIs bypassing the PostgREST interface.

### Implementation Pattern

**Current approach (O(n) but official)**:
```typescript
const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
const user = userData.users.find(u => u.email?.toLowerCase() === email)
```

**With pagination for large databases**:
```typescript
let page = 1
let user = null
while (!user) {
  const { data } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage: 1000
  })
  user = data?.users?.find(u => u.email?.toLowerCase() === email)
  if (!data?.users?.length) break // No more pages
  page++
}
```

### Performance Impact
- For <10,000 users: O(n) scan is acceptable (sub-100ms)
- For larger databases: Pagination mitigates impact
- Alternative: Maintain separate `profiles` table with indexed email for lookups

### Alternatives Considered
- **Direct SQL query via `auth.users`**: Rejected - schema not exposed to PostgREST
- **Custom PostgreSQL function**: Rejected - adds complexity, not officially supported
- **Caching email→ID mapping**: Rejected - staleness issues when users change emails
- **Targeted query `supabaseAdmin.from('auth.users').select().eq('email')`**: Rejected - fails with "relation auth.users does not exist" error

### Notes
The existing `listUsers()` implementation in the codebase is correct and the only officially supported method. The CODEBASE_ANALYSIS_REPORT incorrectly suggests direct table queries which will fail.

---

## 3. Sliding Window Rate Limiting Algorithm

### Decision
Implement custom in-memory sliding window log algorithm using timestamp arrays per user/IP.

### Rationale
Sliding window prevents the **boundary problem** where fixed windows allow 2x the intended rate at window edges. Libraries like `@upstash/ratelimit` require external Redis infrastructure, adding unnecessary complexity for single-server Next.js deployment.

### Algorithm Implementation

```typescript
// Data structure: Map<userId, timestamp[]>
const requestLog = new Map<string, number[]>()

function isAllowed(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs

  // Get user's request history (or initialize)
  let timestamps = requestLog.get(userId) || []

  // Prune expired timestamps (cleanup)
  timestamps = timestamps.filter(ts => ts > windowStart)

  // Check if under limit
  if (timestamps.length < limit) {
    timestamps.push(now)
    requestLog.set(userId, timestamps)
    return true
  }

  // Over limit - update map with pruned timestamps
  requestLog.set(userId, timestamps)
  return false
}
```

### Edge Cases & Solutions

**1. Memory Management**: Implement periodic cleanup with `setInterval()` to delete user entries with no timestamps in last `windowMs * 2` period. Alternative: Use LRU cache with max size (10,000 users).

**2. Clock Skew**: Use `Date.now()` (acceptable for server-side checks on same instance). Monotonic clock (`process.hrtime.bigint()`) available if needed.

**3. Concurrency**: Store timestamps in array (not Set) to allow duplicates for simultaneous requests at identical milliseconds.

**4. Server Restart**: In-memory Map is wiped on deployment. For critical security, persist to Supabase `user_metadata` as source of truth. In-memory serves as fast path for UX feedback.

### Alternatives Considered
- **Fixed window**: Rejected - allows burst at boundaries (10 requests in 2 minutes)
- **Token bucket**: Rejected - more complex, allows bursts (not needed for auth)
- **@upstash/ratelimit**: Rejected - requires Redis infrastructure (violates "simplest approach")
- **Edge Config (Vercel)**: Rejected - adds external dependency

---

## 4. PostgreSQL Atomic Counter Implementation

### Decision
Use PL/pgSQL function with `UPDATE...RETURNING` for atomic JSONB field increment.

### Rationale
PostgreSQL's row-level locking in UPDATE statements prevents race conditions. Using relative updates (`counter + 1`) instead of absolute values ensures concurrent transactions increment from committed values.

### SQL Implementation

```sql
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(
    user_id UUID
)
RETURNS TABLE(
    new_attempt_count INT,
    lockout_until TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
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

**Usage**:
```typescript
const { data } = await supabaseAdmin.rpc('increment_failed_login_attempts', {
  user_id: userId
})
const newCount = data[0].new_attempt_count
```

### Atomicity Guarantee
- Row-level locking: First transaction acquires implicit lock during UPDATE
- Blocking behavior: Subsequent transactions wait for lock release
- Read-after-commit: Waiting transactions see committed value
- Relative updates: `COALESCE(field, 0) + 1` ensures increment from current value

### Testing Concurrent Behavior

**pgbench load test** (50 concurrent clients, 1000 total increments):
```bash
export TEST_USER_ID="00000000-0000-0000-0000-000000000001"
pgbench -c 50 -j 4 -t 20 \
    -f increment_test.sql \
    -D user_id=$TEST_USER_ID \
    your_database

# Verify final count is exactly 1000 (no lost updates)
```

**Success criteria**:
- Final counter = expected total increments (no lost updates)
- No deadlocks during testing
- Performance <50ms per increment under load
- Works across all isolation levels (READ COMMITTED, REPEATABLE READ)

### Alternatives Considered
- **Read-modify-write in application**: Rejected - race conditions inevitable
- **Database-level locks (SELECT FOR UPDATE)**: Rejected - explicit locking adds complexity
- **Serializable isolation level**: Rejected - performance penalty, not needed with relative updates
- **Optimistic concurrency (version field)**: Rejected - retry logic complexity

---

## 5. TypeScript Strict Mode Migration Strategy

### Decision
Enable all strict flags immediately, suppress existing errors with `@ts-expect-error`, fix systematically by category.

### Rationale
Category-based fixing builds team expertise faster than file-by-file. Tooling (codemods, ts-migrate) can automate entire categories. Prevents new violations while allowing controlled incremental fixes.

### Error Categories - Priority Order

**Tier 1 (Fix First - Foundation)**:
1. **`noImplicitAny`**: Add explicit types or `unknown` for third-party interop
   - Example: `function handle(data)` → `function handle(data: unknown)`
2. **`strictBindCallApply`**: Low-hanging fruit, few errors
   - Ensures `.bind()`, `.call()`, `.apply()` have correct signatures

**Tier 2 (Medium Priority - Safety)**:
3. **`strictNullChecks`**: Largest category, highest ROI
   - Example: `user.profile.name` → `user?.profile?.name`
   - Use optional chaining (`?.`) or nullish coalescing (`??`)
4. **`strictFunctionTypes`**: Function parameter bivariance
   - Affects event handlers and callbacks

**Tier 3 (Last - Polish)**:
5. **`strictPropertyInitialization`**: Class properties must initialize in constructor
6. **`noImplicitThis`**: Context binding issues (rare in modern React)

### Tooling

- **ts-migrate** (Airbnb): Automated codemod for bulk fixes (50k+ LOC capable)
- **typescript-strict-plugin**: Adds `//@ts-strict-ignore` to non-compliant files
- **Betterer**: Snapshot-based regression testing (prevents new errors)

### Workflow Per Category
1. Enable flag → Run `tsc --noEmit` → Generate error list
2. Add `@ts-expect-error` suppressions (with descriptions)
3. Commit baseline
4. Fix errors in small PRs (10-20 at a time)
5. Remove suppressions
6. Verify tests pass
7. Repeat for next category

### Testing Strategy

**Three-layer safety net**:
1. **Betterer snapshots**: CI fails if error count increases
2. **Existing test suite**: Run full Jest/Cypress after each category fix
3. **Incremental gates**: typescript-strict-plugin enforces strict mode only on fixed files

### Timeline Estimate
For 100-150 errors: 2-3 sprints (Tier 1: 1 sprint, Tier 2: 1-2 sprints, Tier 3: concurrent)

### Alternatives Considered
- **File-by-file migration**: Rejected - unpredictable velocity, merge conflicts
- **Enable one flag at a time**: Rejected - allows new violations of disabled flags
- **Use `@ts-ignore` instead of `@ts-expect-error`**: Rejected - doesn't self-document fixes

---

## 6. Token-Based Code Duplication Detection

### Decision
Use **jscpd** (Copy/Paste Detector) for measuring 40-50% duplication reduction.

### Rationale
- Actively maintained (latest 2024 vs jsinspect abandoned 2017)
- Rabin-Karp algorithm with token-based detection
- Supports 150+ languages (TypeScript, JavaScript, JSX)
- Lightweight CLI (vs SonarQube enterprise overhead)
- Comprehensive reporting (JSON, HTML, console)
- CI/CD integration with threshold system

### Configuration

**`.jscpd.json`**:
```json
{
  "minTokens": 50,
  "minLines": 5,
  "mode": "mild",
  "gitignore": true,
  "threshold": 9,
  "reporters": ["json", "html", "console"],
  "ignore": [
    "**/__tests__/**",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/*.d.ts"
  ]
}
```

### Baseline Establishment
1. Run initial scan: `jscpd ./src --reporters json,console`
2. Record baseline percentage from `jscpd-report.json`
3. Calculate target: If baseline 15%, target 40% reduction → 9% threshold (15% * 0.6)
4. Configure `.jscpd.json` with `threshold: 9`
5. CI fails if duplication exceeds threshold

### Reporting & Progress Tracking

- **HTML reporter**: Visual reports with side-by-side duplicate blocks, clickable file locations
- **JSON reporter**: Structured data for programmatic analysis
- **CI/CD integration**: jscpd exits non-zero if threshold exceeded
- **Trend analysis**: Archive JSON reports as CI artifacts, compare percentage over time

### Pattern Identification
Review HTML reports to spot common sources:
- Repeated validation logic
- Similar component structures
- Duplicated API handlers
- Prioritize high-impact duplicates (large token counts, multiple occurrences)

### Alternatives Considered
- **jsinspect**: Rejected - abandoned since 2017, limited language support
- **ESLint no-dupe-***: Rejected - only catches syntactic duplicates (keys, args)
- **SonarQube**: Rejected - expensive licensing, server infrastructure overkill
- **Manual code review**: Rejected - not measurable, subjective

---

## 7. React Component Splitting Strategies

### Decision
Hybrid approach: Sub-components + Custom Hooks + Utility Functions

### Rationale
Apply Single Responsibility Principle pragmatically—split when experiencing real problems (performance, maintainability, collaboration) not prematurely. "Duplication is cheaper than wrong abstraction" (Kent C. Dodds).

### When to Use Each Strategy

**1. Sub-component Extraction** - When:
- UI sections have clear visual boundaries (headers, forms, lists)
- Components render too many elements
- State management irrelevant to parent functionality
- Pattern: **Compound Components** with Context API for interconnected components sharing state

**2. Custom Hooks** - When:
- Stateful logic repeats across components
- Complex system interactions need abstraction (API, WebSocket)
- Making code more declarative by hiding implementation details
- Pattern: Name descriptively (`use[Feature]` not `use[GenericAction]`)

**3. Utility Functions** - When:
- Pure functions perform calculations/transformations
- Business logic is framework-independent
- Validation schemas can be shared
- Pattern: "Views change more than logic" - enables cross-framework reuse

### Splitting a 664-Line Component

**Identify boundaries**:
- **Feature-based modules**: Colocate components, hooks, utilities, tests
- **Layered architecture**: Presentation (components) → Domain (hooks) → Data (API/utils)
- **State ownership**: Parent handles submissions, children manage focused UI
- **UI sections**: Split by rendering responsibility (inputs, errors, actions)

**Example split for paint-mixing-dashboard.tsx**:
1. `PaintMixingDashboard.tsx` (parent, <150 lines) - orchestration, final submission
2. `MixingControls.tsx` (<150 lines) - input controls, volume constraints
3. `ColorPreview.tsx` (<150 lines) - real-time color display, Delta E indicator
4. `FormulaResults.tsx` (<150 lines) - mixing formula display, export buttons
5. `useMixingCalculation.ts` (custom hook) - calculation logic, Web Worker integration
6. `colorUtils.ts` (utilities) - LAB conversions, Delta E calculations

### Testing Refactored Components

1. **Write tests first**: Black-box tests validating inputs → outputs before refactoring
2. **Contract testing**: Test component interfaces (props, events, rendering) not implementation
3. **Integration tests**: After splitting, test parent-child interactions
4. **Incremental refactoring**: Extract one boundary, run tests, commit, repeat

### Alternatives Considered
- **Premature abstraction**: Rejected - creates wrong abstractions, increases complexity
- **File-per-component**: Rejected - without clear boundaries, creates artificial splits
- **Generic reusable components**: Rejected - over-engineering, YAGNI principle

---

## 8. Cypress E2E Test Patterns for Auth Flows

### Decision
Use Custom Commands for auth helpers, Fixtures for test data, Intercepts for API mocking, cy.clock() for time manipulation.

### Rationale
Custom commands provide reusable authentication setup. Fixtures ensure test isolation with unique users. Intercepts mock Supabase endpoints for controlled testing. cy.clock() enables fast-forwarding through time-based scenarios (lockouts) without actual delays.

### Test Structure

**Custom Commands** (`cypress/support/commands.ts`):
```typescript
// Programmatic signin (bypasses UI)
Cypress.Commands.add('emailSignin', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/email-signin', { email, password })
  })
})

// Setup locked-out state
Cypress.Commands.add('setupLockout', (email: string) => {
  const lockoutUntil = Date.now() + (15 * 60 * 1000)
  cy.window().then((win) => {
    win.localStorage.setItem(`lockout_${email}`, JSON.stringify({
      attempts: 5,
      lockoutUntil
    }))
  })
})

// Mock OAuth user
Cypress.Commands.add('mockOAuthUser', (email: string, provider: string) => {
  cy.intercept('POST', '/api/auth/email-signin', {
    statusCode: 403,
    body: {
      error: 'oauth_precedence',
      message: `This account uses OAuth. Please sign in with ${provider}.`
    }
  })
})
```

**API Intercepts**:
```typescript
// Mock rate limiting (429 response)
cy.intercept('POST', '/api/auth/email-signin', {
  statusCode: 429,
  headers: { 'Retry-After': '900' },
  body: { error: 'Too many attempts', retryAfter: 900 }
}).as('rateLimited')

// Mock account lockout (423 response)
cy.intercept('POST', '/api/auth/email-signin', {
  statusCode: 423,
  body: { error: 'Account locked', retryAfter: 900 }
}).as('accountLocked')
```

### Testing 15-Minute Lockout Without Waiting

**Option 1: cy.clock() for Client-Side Timers**:
```typescript
it('should unlock after 15-minute lockout period', () => {
  cy.clock() // Freeze time

  cy.setupLockout('test@example.com')
  cy.get('[data-testid="lockout-message"]').should('be.visible')

  // Fast-forward 15 minutes
  cy.tick(15 * 60 * 1000)

  cy.get('[data-testid="lockout-message"]').should('not.exist')
  cy.get('[data-testid="signin-button"]').should('not.be.disabled')
})
```

**Option 2: Intercept Updates for Server-Side Lockout**:
```typescript
it('should respect server-side lockout expiration', () => {
  // Mock locked state
  cy.intercept('POST', '/api/auth/email-signin', {
    statusCode: 429,
    body: { error: 'account_locked', remainingMs: 900000 }
  }).as('locked')

  cy.get('[data-testid="signin-button"]').click()
  cy.wait('@locked')
  cy.get('[data-testid="lockout-message"]').should('be.visible')

  // Update intercept to unlocked state (simulate time passage)
  cy.intercept('POST', '/api/auth/email-signin', {
    statusCode: 200,
    body: { success: true, redirectUrl: '/' }
  }).as('unlocked')

  cy.reload()
  cy.get('[data-testid="email-input"]').type('test@example.com')
  cy.get('[data-testid="password-input"]').type('password123')
  cy.get('[data-testid="signin-button"]').click()
  cy.wait('@unlocked')
})
```

### Best Practices

1. **User Fixtures**: Create unique test users per spec file for parallel execution
2. **Database Cleanup**: Use `beforeEach()` hooks to reset user state
3. **Independent Tests**: Each test creates/destroys its own data
4. **Avoid Shared State**: Use `cy.clearCookies()`, `cy.clearLocalStorage()` in beforeEach

### Existing Implementation
The codebase already has `/home/davistroy/dev/paintmixr/cypress/e2e/email-auth.cy.ts` with proper intercept patterns for rate limiting tests. This should be extended with custom commands and additional scenarios (lockout, OAuth precedence).

### Alternatives Considered
- **Real Supabase calls**: Rejected - flakiness, test pollution, slow execution
- **Fixtures for API responses**: Rejected - less flexible than intercepts
- **Actual time delays**: Rejected - 15-minute tests unacceptable
- **Cypress tasks for DB manipulation**: Deferred - use intercepts first, tasks if needed

---

## Research Validation

All 8 research tasks completed using:
- ✅ Context7 MCP for Next.js, Supabase documentation (Principle II compliance)
- ✅ Web search for rate limiting, PostgreSQL, TypeScript, jscpd, React, Cypress patterns
- ✅ Existing codebase analysis for current implementation patterns
- ✅ Constitutional requirements considered (TDD, color accuracy preservation, performance)

**Status**: All NEEDS CLARIFICATION resolved. Ready for Phase 1 (Design & Contracts).

---
*Research conducted 2025-10-02 | Constitution v1.1.0 | Context7 MCP used for library documentation*
