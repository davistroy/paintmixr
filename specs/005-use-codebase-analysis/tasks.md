# Tasks: Comprehensive Codebase Improvement & Technical Debt Resolution

**Input**: Design documents from `/home/davistroy/dev/paintmixr/specs/005-use-codebase-analysis/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow

```
1. Load plan.md → Tech stack: Next.js 15, TypeScript 5.x, Supabase, PostgreSQL
2. Load design documents:
   ✓ data-model.md: 3 security metadata entities, type definitions, metrics
   ✓ contracts/: 3 contract files (auth-fixes, type-consolidation, refactoring-contracts)
   ✓ research.md: 8 technical decisions
   ✓ quickstart.md: 13 integration test scenarios
3. Generate tasks by category: Setup (3) → Tests (28) → Core (35) → Integration (7) → Polish (12)
4. Apply TDD ordering: All tests before implementation
5. Mark parallel tasks [P]: Different files, no dependencies
6. Total: 85 tasks across 5 phases
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root
- TDD enforced: Tests written and failing before implementation

## Path Conventions

This is a **Web application** with Next.js structure:
- Frontend/Backend: `/home/davistroy/dev/paintmixr/src/` (Next.js app router)
- Tests: `/home/davistroy/dev/paintmixr/__tests__/`
- E2E Tests: `/home/davistroy/dev/paintmixr/cypress/e2e/`
- Types: `/home/davistroy/dev/paintmixr/src/lib/types/`
- Database: `/home/davistroy/dev/paintmixr/supabase/migrations/`

---

## Phase 3.1: Setup (T001-T003)

### T001: [X] Create PostgreSQL Atomic Counter Function
**Type**: SETUP
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1-2 hours

**Description**: Create PostgreSQL function for atomic failed login attempt increment to prevent race conditions (FR-007, FR-008).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/supabase/migrations/20251002_atomic_lockout_counter.sql`

**Implementation**:
```sql
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

**Acceptance**: Function exists, increments atomically, returns new count, handles concurrent calls.

---

### T002: [X] Configure TypeScript Strict Mode (Preparation)
**Type**: SETUP
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Update `tsconfig.json` to enable strict mode flags (FR-018). Do NOT build yet - this task only configures, errors will be fixed in later tasks.

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/tsconfig.json`

**Changes**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": false
  }
}
```

**Acceptance**: Config updated, strict mode enabled.

---

### T003: [X] Update Next.js Build Configuration
**Type**: SETUP
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 15 minutes

**Description**: Remove error ignore flags from `next.config.js` to enforce type safety and linting (FR-025, FR-026).

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/next.config.js`

**Changes**:
```javascript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false // Changed from true
  },
  eslint: {
    ignoreDuringBuilds: false // Changed from true
  }
}
```

**Acceptance**: Build configuration enforces TypeScript and ESLint errors.

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation in Phase 3.3.

### Authentication Security Tests (T004-T012)

### T004: [X] Contract Test - Email/Password Sign-In Performance
**Type**: TEST
**Depends On**: T001 (atomic counter function)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write contract test verifying email/password authentication uses targeted queries (O(1) lookup) instead of full table scans, completing in <2 seconds at 10,000 user scale (FR-001, FR-002).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/auth-performance.test.ts`

**Test Cases**:
1. Authentication with 10,000 users completes in <2 seconds
2. Database query uses email index (EXPLAIN ANALYZE verification)
3. No full table scans (Seq Scan) detected
4. Lockout check occurs before password verification

**Expected**: Test FAILS (N+1 query pattern still exists).

**Acceptance**: Test written, runs, fails as expected.

---

### T005: [X] Contract Test - Rate Limiting Enforcement
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write contract test verifying rate limiting activates after 5 authentication attempts within 15-minute sliding window (FR-010, FR-011, FR-012).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/rate-limiting.test.ts`

**Test Cases**:
1. 5 attempts within window succeed, 6th returns 429
2. Sliding window correctly prunes old timestamps
3. `Retry-After` header present in 429 response
4. Rate limit per IP address (not per user)
5. Concurrent requests from same IP handled correctly

**Expected**: Test FAILS (rate limiting not implemented).

**Acceptance**: Test written, covers all scenarios, fails.

---

### T006: Contract Test - Account Lockout Race Conditions
**Type**: TEST
**Depends On**: T001 (atomic counter function)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write contract test verifying atomic lockout counter prevents race conditions where concurrent requests bypass threshold (FR-007, FR-008, FR-009).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/lockout-race-conditions.test.ts`

**Test Cases**:
1. 10 concurrent failed attempts result in exactly 5 count (not 6+)
2. Lockout triggered after exactly 5 attempts
3. Lockout timer set to current time + 15 minutes
4. Attempt during lockout resets timer to full 15 minutes (FR-009a)
5. PostgreSQL function returns consistent results under load

**Expected**: Test FAILS (atomic counter not integrated).

**Acceptance**: Test written, simulates concurrency, fails.

---

### T007: Contract Test - OAuth Precedence Enforcement
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying email/password authentication blocked when OAuth identity exists (FR-004, FR-005, FR-006).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/oauth-precedence.test.ts`

**Test Cases**:
1. User with Google OAuth identity cannot sign in with email/password
2. Error message specifies provider: "This account uses Google authentication"
3. Status code is 403 Forbidden
4. Failed attempt counter NOT incremented (OAuth check happens first)
5. Multiple OAuth providers handled correctly

**Expected**: Test FAILS (OAuth precedence not checked).

**Acceptance**: Test written, covers all providers, fails.

---

### T008: Contract Test - Lockout Status Check API
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write contract test for GET /api/auth/lockout-status endpoint verifying lockout metadata retrieval (Contract 2 in auth-fixes.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/lockout-status-api.test.ts`

**Test Cases**:
1. Not locked user returns `{locked: false}`
2. Locked user returns lockout details with remaining seconds
3. User not found returns `{locked: false}` (prevent enumeration)
4. Email normalization (lowercase + trim) applied

**Expected**: Test FAILS (endpoint doesn't exist).

**Acceptance**: Test written, covers security requirements, fails.

---

### T009: Contract Test - Rate Limit Status Check API
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write contract test for GET /api/auth/rate-limit-status endpoint verifying sliding window tracking (Contract 3 in auth-fixes.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/rate-limit-status-api.test.ts`

**Test Cases**:
1. Under limit returns remaining requests and window reset time
2. Rate limited returns retry-after seconds
3. Sliding window calculation accurate
4. IP address extraction from X-Forwarded-For header

**Expected**: Test FAILS (endpoint doesn't exist).

**Acceptance**: Test written, validates sliding window, fails.

---

### T010: Contract Test - Admin Clear Lockout API
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write contract test for POST /api/auth/admin/clear-lockout endpoint verifying admin-only access (Contract 4 in auth-fixes.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/admin-clear-lockout.test.ts`

**Test Cases**:
1. Admin can clear lockout metadata for user
2. Non-admin returns 401 Unauthorized
3. User not found returns 404
4. Metadata correctly cleared (all fields null/0)

**Expected**: Test FAILS (endpoint doesn't exist).

**Acceptance**: Test written, enforces admin auth, fails.

---

### T011: Contract Test - Next.js 15 Async SearchParams
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write contract test verifying all page components use async searchParams pattern for Next.js 15 compatibility (FR-013, FR-014).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/nextjs15-searchparams.test.ts`

**Test Cases**:
1. Sign-in page accepts `redirect` and `error` query parameters
2. SearchParams accessed via async/await pattern
3. No runtime errors when query parameters present
4. Build completes successfully with Next.js 15

**Expected**: Test FAILS (pages still use sync searchParams).

**Acceptance**: Test written, validates async pattern, fails.

---

### T012: Integration Test - Full Authentication Cycle (E2E)
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write Cypress E2E test for complete authentication flow including rate limiting and lockout (Scenario 11 in quickstart.md, FR-038).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/cypress/e2e/auth-full-cycle.cy.ts`

**Test Cases**:
1. Successful sign-in with valid credentials → dashboard redirect
2. Rate limiting after 6 rapid failed attempts
3. Account lockout after 5 failed attempts → lockout timer displayed
4. Lockout timer resets when user retries during lockout
5. Session cookie set correctly

**Expected**: Test FAILS (features not implemented).

**Acceptance**: Test written, covers all scenarios, fails.

---

### Type Safety & Consolidation Tests (T013-T018)

### T013: Contract Test - Centralized Type Index
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying single source of truth for all shared types (FR-015, FR-017).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/type-index.test.ts`

**Test Cases**:
1. All ColorValue imports resolve to `@/lib/types`
2. No duplicate type definitions in codebase (AST search)
3. Domain-specific types have unique names
4. Type guards validate correctly (isColorValue, isLABColor)

**Expected**: Test FAILS (duplicate types still exist).

**Acceptance**: Test written, searches for duplicates, fails.

---

### T014: Contract Test - TypeScript Strict Mode Compilation
**Type**: TEST
**Depends On**: T002 (strict mode config)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write contract test verifying TypeScript strict mode catches null/undefined bugs at compile-time (FR-018, FR-021).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/strict-mode-compilation.test.ts`

**Test Cases**:
1. Null access without check triggers compiler error
2. Implicit `any` types rejected
3. Uninitialized properties caught
4. Build fails when strict mode violations exist

**Expected**: Test PASSES if compiler rejects bad code, FAILS if violations slip through.

**Acceptance**: Test written, validates compiler behavior.

---

### T015: Contract Test - Supabase Client Pattern Consolidation
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying exactly one modern Supabase client pattern per context (FR-022, FR-023, FR-024).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/supabase-client-patterns.test.ts`

**Test Cases**:
1. No legacy client files exist (search for deprecated patterns)
2. All imports use `@supabase/ssr` package
3. Session management uses cookies exclusively (no localStorage)
4. One client pattern per context: browser, server, API route, admin

**Expected**: Test FAILS (legacy clients still exist).

**Acceptance**: Test written, searches codebase, fails.

---

### T016: Contract Test - Build Configuration Enforcement
**Type**: TEST
**Depends On**: T003 (build config update)
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Write contract test verifying production build fails on TypeScript/ESLint errors (FR-025, FR-026, FR-027).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/build-enforcement.test.ts`

**Test Cases**:
1. `ignoreBuildErrors: false` in next.config.js
2. `ignoreDuringBuilds: false` in next.config.js
3. Build fails when TypeScript errors introduced
4. Build fails when ESLint errors introduced

**Expected**: Test PASSES (config already enforces).

**Acceptance**: Test written, validates config values.

---

### T017: Integration Test - Type Safety End-to-End
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test verifying type definitions work correctly across component boundaries (Scenario 6 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/type-safety-e2e.test.ts`

**Test Cases**:
1. ColorValue interface used consistently across components
2. Paint type matches database schema
3. Form validation schemas type-safe with Zod
4. API client responses correctly typed

**Expected**: Test FAILS (type inconsistencies exist).

**Acceptance**: Test written, validates cross-boundary types, fails.

---

### T018: Integration Test - TypeScript Strict Mode Migration
**Type**: TEST
**Depends On**: T002 (strict mode config)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test for incremental strict mode migration strategy (Scenario 5 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/strict-mode-migration.test.ts`

**Test Cases**:
1. Null/undefined safety violations counted
2. Implicit `any` types counted
3. Suppressions documented with `@ts-expect-error` + comments
4. First-party code has no suppressions (third-party only)

**Expected**: Test FAILS (many strict mode violations).

**Acceptance**: Test written, counts violations, fails.

---

### Code Reuse & Refactoring Tests (T019-T024)

### T019: Contract Test - Shared API Client Utilities
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying shared API client provides consistent error handling (FR-028, FR-029).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/api-client-utilities.test.ts`

**Test Cases**:
1. APIError class handles all HTTP status codes
2. Request/response typing works correctly
3. Error codes consistent across components
4. Fetch operations cancelable with AbortSignal

**Expected**: Test FAILS (shared API client doesn't exist).

**Acceptance**: Test written, validates API client interface, fails.

---

### T020: Contract Test - Shared Form Utilities
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying reusable form validation and submission hooks (FR-033, FR-034).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/form-utilities.test.ts`

**Test Cases**:
1. Email schema normalizes (lowercase + trim)
2. Password schema validates strength requirements
3. useFormSubmit hook manages loading/error states
4. React Hook Form integration with Zod resolver

**Expected**: Test FAILS (shared utilities don't exist).

**Acceptance**: Test written, validates form patterns, fails.

---

### T021: Contract Test - Shared Data Fetching Hooks
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write contract test verifying reusable hooks for pagination, filtering, data fetching (FR-031).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/contract/data-fetching-hooks.test.ts`

**Test Cases**:
1. usePagination hook manages page state correctly
2. useFilters hook tracks filter changes
3. useDataFetch hook handles loading/error/refetch
4. Hooks composable (pagination + filtering + fetching)

**Expected**: Test FAILS (shared hooks don't exist).

**Acceptance**: Test written, validates hook interfaces, fails.

---

### T022: Integration Test - Component Size Verification
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test verifying all components under 300 lines (FR-030, Scenario 9 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/component-size.test.ts`

**Test Cases**:
1. No component files >300 lines (find all .tsx files, count lines)
2. Previously large files refactored (EmailSigninForm, PaintMixerWorkspace)
3. Average component size <250 lines
4. Refactoring strategies documented (sub-components or utilities)

**Expected**: Test FAILS (large components still exist).

**Acceptance**: Test written, scans codebase, fails.

---

### T023: Integration Test - Code Duplication Measurement
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test measuring code duplication with token-based AST analysis (FR-032, Scenario 8 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/code-duplication.test.ts`

**Test Cases**:
1. Run jscpd with token-based mode
2. Capture baseline duplication percentage (~60%)
3. After refactoring: Assert 40-50% reduction (30-35% final)
4. Duplicate blocks reduced by 50% (from ~150 to <75)

**Expected**: Test FAILS (duplication still high).

**Acceptance**: Test written, runs jscpd, fails.

---

### T024: Integration Test - Shared Utilities Usage
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test verifying components use shared utilities instead of duplicating logic (Scenario 8 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/shared-utilities-usage.test.ts`

**Test Cases**:
1. 10+ components use shared API client (grep for apiPost/apiGet)
2. Forms use shared validation schemas (grep for signinSchema imports)
3. Components use shared hooks (grep for usePagination/useFilters)
4. No duplicate API fetch patterns remain

**Expected**: Test FAILS (components still duplicate logic).

**Acceptance**: Test written, searches for patterns, fails.

---

### Testing & Quality Tests (T025-T031)

### T025: Integration Test - Test Coverage for Critical Paths
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Write integration test verifying 90%+ test coverage for authentication, color science, mixing (FR-037, Scenario 10 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/test-coverage.test.ts`

**Test Cases**:
1. Run Jest with --coverage flag
2. Assert ≥90% coverage for src/lib/auth/
3. Assert ≥90% coverage for src/lib/color/
4. Assert ≥90% coverage for src/lib/mixing/
5. Branch and condition coverage ≥90%

**Expected**: Test FAILS (coverage below 90%).

**Acceptance**: Test written, runs coverage report, fails.

---

### T026: Integration Test - Placeholder Test Conversion
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Write integration test verifying no placeholder tests remain active (FR-035, FR-036).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/placeholder-tests.test.ts`

**Test Cases**:
1. Search for placeholder patterns (empty tests, TODO without .skip())
2. Assert all placeholders converted to .skip() with TODO comments
3. No false positive tests (always pass)
4. Test assertion coverage ≥95%

**Expected**: Test FAILS (placeholders still exist).

**Acceptance**: Test written, searches for patterns, fails.

---

### T027: Integration Test - Build Performance
**Type**: TEST
**Depends On**: T002, T003 (config updates)
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Write integration test verifying production build completes successfully (FR-025, FR-026, FR-027, Scenario 12 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/integration/build-performance.test.ts`

**Test Cases**:
1. `npm run build` completes with exit code 0
2. No TypeScript errors in output
3. No ESLint errors in output
4. No warnings about ignored errors
5. Bundle sizes reasonable (<100 KB per page)

**Expected**: Test FAILS (build fails due to strict mode errors).

**Acceptance**: Test written, runs build, fails.

---

### T028: E2E Test - Authentication Performance at Scale
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write Cypress E2E test verifying authentication <2 seconds at 10,000 user scale (Scenario 1 in quickstart.md, FR-002).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/cypress/e2e/auth-performance-scale.cy.ts`

**Test Cases**:
1. Seed database with 10,000 test users
2. Attempt sign-in with user #5000
3. Measure response time (must be <2 seconds)
4. Verify database query plan uses index (no Seq Scan)

**Expected**: Test FAILS (N+1 query causes timeout).

**Acceptance**: Test written, includes seeding, fails.

---

### T029: E2E Test - Rate Limiting Under Load
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Write Artillery load test verifying rate limiting prevents DoS (Scenario 2 in quickstart.md, FR-010).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/cypress/e2e/rate-limiting-load.cy.ts`
- Create: `/home/davistroy/dev/paintmixr/artillery-auth-load.yml`

**Test Cases**:
1. Artillery load test: 10 requests/second for 30 seconds
2. First 5 requests return 401 (invalid credentials)
3. Subsequent requests return 429 (rate limited)
4. `Retry-After` header present
5. Server resources stable (CPU/memory monitored)

**Expected**: Test FAILS (rate limiting not implemented).

**Acceptance**: Test written, load config created, fails.

---

### T030: E2E Test - Accessibility Compliance
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write automated accessibility test for WCAG 2.1 AA compliance (Principle V, Scenario 11 in quickstart.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/cypress/e2e/accessibility-wcag.cy.ts`

**Test Cases**:
1. Color contrast ratios ≥4.5:1 for normal text
2. Touch targets minimum 44px for mobile
3. Keyboard navigation works for all forms
4. Screen reader labels present
5. Automated axe-core scan passes

**Expected**: Test FAILS (65% compliance, need 90%+).

**Acceptance**: Test written, uses axe-core, fails.

---

### T031: Performance Test - Response Time Baselines
**Type**: TEST
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Write performance regression test with established baselines (Principle V).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/performance/response-times.test.ts`

**Test Cases**:
1. Authentication response time <2 seconds
2. Color calculation <500ms
3. UI interaction at 60fps (16.67ms per frame)
4. Performance monitoring captures metrics
5. Regression detection triggers on >10% slowdown

**Expected**: Test FAILS (no baseline established yet).

**Acceptance**: Test written, captures metrics, fails.

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**GATE**: All tests in Phase 3.2 must be written and failing before proceeding.

### Authentication Security Implementation (T032-T045)

### T032: Create Rate Limiting Utility (In-Memory)
**Type**: CORE
**Depends On**: T005 (rate limiting test)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Implement sliding window rate limiting with in-memory Map structure (FR-012, Research decision).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/auth/rate-limit.ts`

**Implementation**:
```typescript
interface RateLimitRecord {
  timestamps: number[] // Unix timestamps
}

const rateLimitCache = new Map<string, RateLimitRecord>()

export function checkRateLimit(ipAddress: string): {
  rateLimited: boolean
  requestsRemaining: number
  retryAfter: number
} {
  const now = Date.now()
  const windowStart = now - (15 * 60 * 1000) // 15 minutes

  const record = rateLimitCache.get(ipAddress) || { timestamps: [] }
  const validTimestamps = record.timestamps.filter(ts => ts > windowStart)

  const rateLimited = validTimestamps.length >= 5

  return {
    rateLimited,
    requestsRemaining: Math.max(0, 5 - validTimestamps.length),
    retryAfter: rateLimited
      ? Math.ceil((validTimestamps[0] + (15 * 60 * 1000) - now) / 1000)
      : 0
  }
}

export function recordAuthAttempt(ipAddress: string): void {
  const now = Date.now()
  const windowStart = now - (15 * 60 * 1000)

  const record = rateLimitCache.get(ipAddress) || { timestamps: [] }
  record.timestamps = record.timestamps
    .filter(ts => ts > windowStart)
    .concat(now)

  rateLimitCache.set(ipAddress, record)
}
```

**Acceptance**: T005 test passes, sliding window works correctly.

---

### T033: Create Lockout Metadata Helper Utilities
**Type**: CORE
**Depends On**: T006 (lockout race condition test)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Implement metadata helper functions for lockout tracking (FR-007, data-model.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/auth/metadata-helpers.ts`

**Implementation**:
```typescript
import { LockoutMetadata } from '@/lib/types'

export function getLockoutMetadata(user: any): LockoutMetadata {
  return {
    failed_login_attempts: user.raw_user_meta_data?.failed_login_attempts || 0,
    lockout_until: user.raw_user_meta_data?.lockout_until || null,
    last_failed_attempt: user.raw_user_meta_data?.last_failed_attempt || null
  }
}

export function isUserLockedOut(metadata: LockoutMetadata): {
  locked: boolean
  remainingSeconds: number
} {
  if (!metadata.lockout_until) {
    return { locked: false, remainingSeconds: 0 }
  }

  const lockoutUntil = new Date(metadata.lockout_until).getTime()
  const now = Date.now()

  if (lockoutUntil > now) {
    return {
      locked: true,
      remainingSeconds: Math.ceil((lockoutUntil - now) / 1000)
    }
  }

  return { locked: false, remainingSeconds: 0 }
}

export async function incrementFailedAttempts(
  userId: string,
  adminClient: any
): Promise<{ newCount: number; lockoutUntil: string | null }> {
  // Call PostgreSQL atomic function
  const { data, error } = await adminClient.rpc(
    'increment_failed_login_attempts',
    { user_id: userId }
  )

  if (error) throw new Error(`Failed to increment attempts: ${error.message}`)

  const newCount = data[0].new_attempt_count

  // Set lockout if threshold reached
  if (newCount >= 5) {
    const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        failed_login_attempts: newCount,
        lockout_until: lockoutUntil,
        last_failed_attempt: new Date().toISOString()
      }
    })

    return { newCount, lockoutUntil }
  }

  return { newCount, lockoutUntil: null }
}

export async function clearLockout(
  userId: string,
  adminClient: any
): Promise<void> {
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      failed_login_attempts: 0,
      lockout_until: null,
      last_failed_attempt: null
    }
  })
}
```

**Acceptance**: T006 test passes, atomic increment works.

---

### T034: Implement N+1 Query Fix in Email Sign-In Route
**Type**: CORE
**Depends On**: T001 (atomic counter), T004 (performance test), T032 (rate limiting), T033 (lockout helpers)
**Parallel**: No (depends on multiple tasks)
**Time Estimate**: 3-4 hours

**Description**: Replace full table scan with targeted email query, integrate atomic lockout counter and rate limiting (FR-001, FR-002, FR-003).

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/src/app/api/auth/email-signin/route.ts`

**Implementation**:
```typescript
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { emailSigninSchema } from '@/lib/auth/validation'
import { checkRateLimit, recordAuthAttempt } from '@/lib/auth/rate-limit'
import {
  getLockoutMetadata,
  isUserLockedOut,
  incrementFailedAttempts,
  clearLockout
} from '@/lib/auth/metadata-helpers'

export async function POST(request: Request) {
  // Extract IP address for rate limiting
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

  // Check rate limit FIRST (before any DB queries)
  const rateLimitStatus = checkRateLimit(ipAddress)
  if (rateLimitStatus.rateLimited) {
    return Response.json(
      {
        error: 'rate_limited',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: rateLimitStatus.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': rateLimitStatus.retryAfter.toString() }
      }
    )
  }

  // Parse and validate input
  const body = await request.json()
  const validation = emailSigninSchema.safeParse(body)

  if (!validation.success) {
    return Response.json(
      { error: 'validation_error', message: 'Invalid input' },
      { status: 400 }
    )
  }

  const { email, password } = validation.data
  const adminClient = createAdminClient()

  // CRITICAL: Targeted query with email filter (O(1) with index)
  const { data: users } = await adminClient.auth.admin.listUsers({
    filter: `email.eq.${email}` // NOT listUsers() without filter!
  })

  const user = users.users[0]

  // Generic error if user not found (prevent enumeration)
  if (!user) {
    recordAuthAttempt(ipAddress)
    return Response.json(
      { error: 'invalid_credentials', message: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Check lockout status BEFORE password verification
  const lockoutMetadata = getLockoutMetadata(user)
  const lockoutStatus = isUserLockedOut(lockoutMetadata)

  if (lockoutStatus.locked) {
    // Reset lockout timer if user attempts during lockout (FR-009a)
    const newLockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...lockoutMetadata,
        lockout_until: newLockoutUntil
      }
    })

    return Response.json(
      {
        error: 'account_locked',
        message: 'Account locked due to too many failed login attempts.',
        lockedUntil: newLockoutUntil,
        remainingSeconds: 900 // Reset to full 15 minutes
      },
      { status: 403 }
    )
  }

  // Check OAuth precedence (query auth.identities)
  const { data: identities } = await adminClient
    .from('auth.identities')
    .select('provider')
    .eq('user_id', user.id)
    .neq('provider', 'email')
    .limit(1)

  if (identities && identities.length > 0) {
    const provider = identities[0].provider
    return Response.json(
      {
        error: 'oauth_precedence',
        message: `This account uses ${provider} authentication. Please sign in with ${provider}.`,
        provider
      },
      { status: 403 }
    )
  }

  // Attempt password authentication
  const { error: signInError } = await adminClient.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    // Increment failed attempts atomically
    await incrementFailedAttempts(user.id, adminClient)
    recordAuthAttempt(ipAddress)

    return Response.json(
      { error: 'invalid_credentials', message: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Success: Clear lockout metadata
  await clearLockout(user.id, adminClient)

  return Response.json({
    success: true,
    message: 'Signed in successfully',
    redirectTo: '/dashboard'
  })
}
```

**Acceptance**: T004 test passes, authentication <2s at 10K users, T006 passes (no race conditions), T005 passes (rate limiting works), T007 passes (OAuth precedence enforced).

---

### T035: Implement Lockout Status API Endpoint
**Type**: CORE
**Depends On**: T008 (lockout status test), T033 (lockout helpers)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create GET /api/auth/lockout-status endpoint for client-side lockout countdown (Contract 2).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/app/api/auth/lockout-status/route.ts`

**Implementation**:
```typescript
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getLockoutMetadata, isUserLockedOut } from '@/lib/auth/metadata-helpers'
import { emailSchema } from '@/lib/forms/schemas'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return Response.json({ error: 'missing_email' }, { status: 400 })
  }

  // Validate and normalize email
  const validation = emailSchema.safeParse(email)
  if (!validation.success) {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }

  const normalizedEmail = validation.data
  const adminClient = createAdminClient()

  // Query user by email
  const { data: users } = await adminClient.auth.admin.listUsers({
    filter: `email.eq.${normalizedEmail}`
  })

  const user = users.users[0]

  // Return "not locked" for non-existent users (prevent enumeration)
  if (!user) {
    return Response.json({ locked: false, email: normalizedEmail })
  }

  const lockoutMetadata = getLockoutMetadata(user)
  const lockoutStatus = isUserLockedOut(lockoutMetadata)

  if (lockoutStatus.locked) {
    return Response.json({
      locked: true,
      email: normalizedEmail,
      lockedUntil: lockoutMetadata.lockout_until,
      remainingSeconds: lockoutStatus.remainingSeconds,
      failedAttempts: lockoutMetadata.failed_login_attempts
    })
  }

  return Response.json({ locked: false, email: normalizedEmail })
}
```

**Acceptance**: T008 test passes.

---

### T036: Implement Rate Limit Status API Endpoint
**Type**: CORE
**Depends On**: T009 (rate limit status test), T032 (rate limiting utility)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create GET /api/auth/rate-limit-status endpoint for client-side rate limit warnings (Contract 3).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/app/api/auth/rate-limit-status/route.ts`

**Implementation**:
```typescript
import { checkRateLimit } from '@/lib/auth/rate-limit'

export async function GET(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'

  const status = checkRateLimit(ipAddress)

  if (status.rateLimited) {
    return Response.json({
      rateLimited: true,
      requestsRemaining: 0,
      retryAfter: status.retryAfter
    })
  }

  return Response.json({
    rateLimited: false,
    requestsRemaining: status.requestsRemaining
  })
}
```

**Acceptance**: T009 test passes.

---

### T037: Implement Admin Clear Lockout API Endpoint
**Type**: CORE
**Depends On**: T010 (admin clear lockout test), T033 (lockout helpers)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create POST /api/auth/admin/clear-lockout endpoint with admin authentication (Contract 4).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/app/api/auth/admin/clear-lockout/route.ts`

**Implementation**:
```typescript
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { clearLockout } from '@/lib/auth/metadata-helpers'

export async function POST(request: Request) {
  // TODO: Implement admin authentication check
  // For now, require service role key in Authorization header

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'unauthorized', message: 'Admin authentication required' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return Response.json({ error: 'missing_user_id' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verify user exists
  const { data: user, error } = await adminClient.auth.admin.getUserById(userId)

  if (error || !user) {
    return Response.json(
      { error: 'user_not_found', message: 'User does not exist', userId },
      { status: 404 }
    )
  }

  // Clear lockout metadata
  await clearLockout(userId, adminClient)

  return Response.json({
    success: true,
    message: 'Lockout cleared for user',
    userId
  })
}
```

**Acceptance**: T010 test passes.

---

### T038: Update Sign-In Page for Next.js 15 Async SearchParams
**Type**: CORE
**Depends On**: T011 (async searchParams test)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Convert sign-in page to use async searchParams pattern (FR-013, FR-014).

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/src/app/signin/page.tsx`

**Changes**:
```typescript
// BEFORE (sync, deprecated)
export default function SignInPage({
  searchParams
}: {
  searchParams: { redirect?: string; error?: string }
}) {
  return <EmailSigninForm redirectTo={searchParams.redirect} />
}

// AFTER (async, Next.js 15)
export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const params = await searchParams
  return <EmailSigninForm redirectTo={params.redirect} error={params.error} />
}
```

**Acceptance**: T011 test passes, page renders correctly with query parameters.

---

### T039: Update All Remaining Pages for Async SearchParams
**Type**: CORE
**Depends On**: T011 (async searchParams test)
**Parallel**: No (same architectural change)
**Time Estimate**: 2 hours

**Description**: Convert all remaining pages to async searchParams pattern (FR-013).

**Files** (search for all pages with searchParams):
- Edit: `/home/davistroy/dev/paintmixr/src/app/**/page.tsx` (multiple files)

**Strategy**:
1. Search: `grep -r "searchParams:" src/app/ | grep page.tsx`
2. Convert each to async pattern
3. Test build with Next.js 15

**Acceptance**: T011 test passes, build succeeds with Next.js 15.

---

### Type Safety & Consolidation Implementation (T040-T053)

### T040: Create Centralized Type Index
**Type**: CORE
**Depends On**: T013 (type index test)
**Parallel**: Yes [P]
**Time Estimate**: 3 hours

**Description**: Create single source of truth for all shared types (FR-015, FR-017, Contract 1 in type-consolidation.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/types/index.ts`

**Implementation**: Copy all type definitions from contracts/type-consolidation.md Contract 1:
- LABColor, RGBColor, ColorValue
- KubelkaMunkCoefficients, Paint
- OptimizationVolumeConstraints, UIVolumeConstraints
- MixingSession, MixingResult, PaintProportion
- LockoutMetadata, RateLimitStatus
- Type guards: isValidHexColor, isColorValue, isLABColor

**Acceptance**: T013 test passes, all types exported from single index.

---

### T041: Identify and Rename Duplicate Type Definitions
**Type**: CORE
**Depends On**: T013 (type index test), T040 (type index created)
**Parallel**: No (depends on T040)
**Time Estimate**: 2 hours

**Description**: Find all duplicate type definitions and rename domain-specific versions (FR-016).

**Strategy**:
1. Search: `grep -r "interface ColorValue" src/`
2. Search: `grep -r "interface VolumeConstraints" src/`
3. Rename duplicates with domain prefix (e.g., OptimizationVolumeConstraints vs UIVolumeConstraints)
4. Update imports to use centralized types

**Files** (examples, actual search will find more):
- Edit: `/home/davistroy/dev/paintmixr/src/lib/mixing/optimizer.ts`
- Edit: `/home/davistroy/dev/paintmixr/src/components/forms/VolumeInput.tsx`

**Acceptance**: T013 test passes, no duplicate definitions remain.

---

### T042: Migrate All Imports to Centralized Type Index
**Type**: CORE
**Depends On**: T040 (type index), T041 (duplicates renamed)
**Parallel**: No (depends on T040, T041)
**Time Estimate**: 2-3 hours

**Description**: Update all type imports to use `@/lib/types` (FR-017).

**Strategy**:
1. Search: `grep -r "from.*types" src/ --include="*.ts" --include="*.tsx"`
2. Replace local imports with centralized imports
3. Delete local type definition files

**Files** (many):
- Edit: All files importing ColorValue, Paint, LABColor, etc.
- Delete: Local type definition files (e.g., `src/components/auth/types.ts`)

**Acceptance**: T013 test passes, all imports use `@/lib/types`.

---

### T043: Fix TypeScript Strict Mode - Null/Undefined Checks
**Type**: CORE
**Depends On**: T002 (strict mode config), T014 (strict mode test)
**Parallel**: Yes [P]
**Time Estimate**: 6-8 hours

**Description**: Fix null/undefined safety violations revealed by strict mode (FR-021, Category 1 from research.md).

**Strategy**:
1. Run: `npm run build` to collect all null/undefined errors
2. Fix incrementally by adding null checks:
   ```typescript
   // BEFORE
   const user = await getUserById(id)
   console.log(user.email) // ERROR

   // AFTER
   const user = await getUserById(id)
   if (user === null) throw new Error('User not found')
   console.log(user.email) // OK
   ```
3. Use optional chaining where appropriate: `user?.email`
4. Use nullish coalescing: `user?.email ?? 'No email'`

**Files** (many, determined by compiler errors):
- Edit: All files with null/undefined access violations

**Acceptance**: T014 test passes, null safety violations eliminated.

---

### T044: Fix TypeScript Strict Mode - Implicit Any Types
**Type**: CORE
**Depends On**: T002 (strict mode config), T014 (strict mode test)
**Parallel**: Yes [P]
**Time Estimate**: 4-6 hours

**Description**: Eliminate all implicit `any` types from first-party code (FR-019, Category 2 from research.md).

**Strategy**:
1. Run: `npm run build` to collect implicit any errors
2. Add explicit type annotations:
   ```typescript
   // BEFORE
   function processData(data) { // ERROR: implicit any

   // AFTER
   function processData(data: { value: string }) {
   ```
3. Use `@ts-expect-error` only for third-party library issues (FR-021a)

**Files** (many):
- Edit: All files with implicit any violations

**Acceptance**: T014 test passes, T018 passes, no implicit any in first-party code.

---

### T045: Fix TypeScript Strict Mode - Function Types & Properties
**Type**: CORE
**Depends On**: T002 (strict mode config), T014 (strict mode test)
**Parallel**: Yes [P]
**Time Estimate**: 3-4 hours

**Description**: Fix strict function type checking and uninitialized properties (FR-020, Categories 3-4 from research.md).

**Strategy**:
1. Fix function parameter types (strict function types)
2. Initialize class properties or make optional
3. Fix strictBindCallApply violations

**Files** (many):
- Edit: All files with function type or property violations

**Acceptance**: T014 test passes, all strict mode flags satisfied.

---

### T046: Create Modern Supabase Browser Client
**Type**: CORE
**Depends On**: T015 (client patterns test)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create modern browser client using `@supabase/ssr` (FR-023, FR-024, data-model.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/supabase/client.ts`

**Implementation**:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Acceptance**: Client exports correctly, uses @supabase/ssr.

---

### T047: Create Modern Supabase Server Component Client
**Type**: CORE
**Depends On**: T015 (client patterns test)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create modern server component client using `@supabase/ssr` (FR-023, FR-024).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/supabase/server.ts`

**Implementation**:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, '', options)
      }
    }
  )
}
```

**Acceptance**: Client exports correctly, uses cookies.

---

### T048: Create Modern Supabase API Route Client
**Type**: CORE
**Depends On**: T015 (client patterns test)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Create modern API route client using `@supabase/ssr` (FR-023).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/supabase/route-handler.ts`

**Implementation**: Same as server.ts (Next.js API routes use same pattern)

**Acceptance**: Client exports correctly.

---

### T049: Create Supabase Admin Client
**Type**: CORE
**Depends On**: T015 (client patterns test)
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Create admin client for server-side user metadata operations (data-model.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/supabase/admin.ts`

**Implementation**:
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

**Acceptance**: Admin client exports correctly.

---

### T050: Delete Legacy Supabase Client Files
**Type**: CORE
**Depends On**: T046, T047, T048, T049 (modern clients created)
**Parallel**: No (depends on modern clients)
**Time Estimate**: 30 minutes

**Description**: Delete all legacy Supabase client files (FR-022).

**Strategy**:
1. Search: `find src/ -name "*supabase*" -type f | grep -v "src/lib/supabase/"`
2. Delete identified legacy files

**Files** (examples, actual search will find):
- Delete: `/home/davistroy/dev/paintmixr/src/utils/supabase.ts` (if exists)
- Delete: `/home/davistroy/dev/paintmixr/src/lib/supabaseClient.ts` (if exists)

**Acceptance**: T015 test passes, no legacy clients remain.

---

### T051: Migrate All Supabase Client Imports
**Type**: CORE
**Depends On**: T046-T049 (modern clients), T050 (legacy deleted)
**Parallel**: No (breaking change, sequential)
**Time Estimate**: 3-4 hours

**Description**: Update all imports to use modern Supabase clients (FR-022).

**Strategy**:
1. Search: `grep -r "from.*supabase" src/`
2. Replace with modern client imports:
   - Browser components → `@/lib/supabase/client`
   - Server components → `@/lib/supabase/server`
   - API routes → `@/lib/supabase/route-handler`
   - Admin operations → `@/lib/supabase/admin`
3. Build will guide migration (errors on import failures)

**Files** (many):
- Edit: All files importing Supabase clients

**Acceptance**: T015 test passes, build succeeds, all imports use modern patterns.

---

### T052: Verify Build Success with Strict Mode
**Type**: CORE
**Depends On**: T043, T044, T045 (all strict mode fixes)
**Parallel**: No (integration verification)
**Time Estimate**: 1 hour

**Description**: Verify production build completes with TypeScript strict mode enabled (FR-025, FR-026, FR-027).

**Command**: `npm run build`

**Expected**: Exit code 0, no TypeScript errors, no ESLint errors, no warnings.

**Acceptance**: T016 test passes, T027 test passes.

---

### T053: Update EmailSigninForm Component for Rate Limiting UI
**Type**: CORE
**Depends On**: T034 (sign-in route), T035 (lockout status API), T036 (rate limit status API)
**Parallel**: No (depends on APIs)
**Time Estimate**: 2 hours

**Description**: Update EmailSigninForm to display rate limit warnings and lockout countdown timer.

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/src/components/auth/EmailSigninForm.tsx`

**Features**:
1. Check lockout status before form submission
2. Display lockout countdown timer (15 minutes)
3. Check rate limit status and show warning
4. Disable form when rate limited or locked out

**Acceptance**: T012 E2E test passes, UI displays lockout/rate limit feedback.

---

### Code Reuse & Refactoring Implementation (T054-T066)

### T054: Create Shared API Client Utility
**Type**: CORE
**Depends On**: T019 (API client test)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Implement shared API client with consistent error handling (FR-028, FR-029, Contract 1 in refactoring-contracts.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/api/client.ts`

**Implementation**: Copy full implementation from Contract 1:
- APIError class
- apiRequest() function
- Convenience methods: apiGet, apiPost, apiPut, apiDelete

**Acceptance**: T019 test passes, error handling consistent.

---

### T055: Create Shared Form Validation Schemas
**Type**: CORE
**Depends On**: T020 (form utilities test)
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Create reusable Zod validation schemas (FR-033, Contract 2 in refactoring-contracts.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/forms/schemas.ts`

**Implementation**: Copy schemas from Contract 2:
- emailSchema, passwordSchema, signinSchema
- volumeConstraintsSchema

**Acceptance**: T020 test passes, schemas validate correctly.

---

### T056: Create Shared Form Hooks
**Type**: CORE
**Depends On**: T020 (form utilities test)
**Parallel**: Yes [P]
**Time Estimate**: 1.5 hours

**Description**: Create reusable form error display and submission hooks (FR-034, Contract 2).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/forms/useFormErrors.ts`
- Create: `/home/davistroy/dev/paintmixr/src/lib/forms/useFormSubmit.ts`

**Implementation**: Copy hooks from Contract 2.

**Acceptance**: T020 test passes, hooks integrate with React Hook Form.

---

### T057: Create Shared Data Fetching Hooks
**Type**: CORE
**Depends On**: T021 (data fetching hooks test)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Create reusable hooks for pagination, filtering, data fetching (FR-031, Contract 3 in refactoring-contracts.md).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/src/lib/hooks/usePagination.ts`
- Create: `/home/davistroy/dev/paintmixr/src/lib/hooks/useFilters.ts`
- Create: `/home/davistroy/dev/paintmixr/src/lib/hooks/useDataFetch.ts`

**Implementation**: Copy hooks from Contract 3.

**Acceptance**: T021 test passes, hooks composable.

---

### T058: Migrate Components to Shared API Client
**Type**: CORE
**Depends On**: T054 (API client created)
**Parallel**: No (same file modifications)
**Time Estimate**: 3-4 hours

**Description**: Update 10+ components to use shared API client instead of direct fetch calls (FR-028).

**Strategy**:
1. Search: `grep -r "fetch(" src/components/`
2. Replace with apiPost/apiGet/apiPut/apiDelete from shared client
3. Update error handling to use APIError class

**Files** (many):
- Edit: Components with direct fetch calls

**Acceptance**: T024 test passes, shared API client used widely.

---

### T059: Migrate Forms to Shared Validation Schemas
**Type**: CORE
**Depends On**: T055 (schemas created)
**Parallel**: No (architectural change)
**Time Estimate**: 2-3 hours

**Description**: Update forms to use shared Zod schemas (FR-034).

**Strategy**:
1. Search: `grep -r "z.object" src/components/`
2. Replace inline schemas with imports from `@/lib/forms/schemas`

**Files** (examples):
- Edit: `/home/davistroy/dev/paintmixr/src/components/auth/EmailSigninForm.tsx`
- Edit: Other forms with validation

**Acceptance**: T024 test passes, shared schemas used.

---

### T060: Identify Large Components Requiring Refactoring
**Type**: CORE
**Depends On**: T022 (component size test)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Identify all components >300 lines for refactoring (FR-030).

**Command**: `find src/components/ -name "*.tsx" -exec sh -c 'wc -l "$1" | awk "{if (\$1 > 300) print \$1, \$2}"' _ {} \;`

**Expected Targets** (from CODEBASE_ANALYSIS_REPORT):
- EmailSigninForm.tsx (542 lines)
- PaintMixerWorkspace.tsx (687 lines)

**Acceptance**: List created, tracked for refactoring tasks.

---

### T061: Refactor EmailSigninForm Component (<300 lines)
**Type**: CORE
**Depends On**: T060 (large components identified), T055 (schemas), T056 (hooks)
**Parallel**: Yes [P]
**Time Estimate**: 3 hours

**Description**: Split EmailSigninForm into focused sub-components under 300 lines each (FR-030).

**Strategy** (both allowed per clarifications):
1. Extract sub-components: EmailInput.tsx, PasswordInput.tsx, ErrorDisplay.tsx
2. Extract utility functions: form submission logic into hooks

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/src/components/auth/EmailSigninForm.tsx`
- Create: `/home/davistroy/dev/paintmixr/src/components/auth/EmailInput.tsx`
- Create: `/home/davistroy/dev/paintmixr/src/components/auth/PasswordInput.tsx`
- Create: `/home/davistroy/dev/paintmixr/src/components/auth/ErrorDisplay.tsx`

**Acceptance**: T022 test passes, EmailSigninForm <300 lines.

---

### T062: Refactor PaintMixerWorkspace Component (<300 lines)
**Type**: CORE
**Depends On**: T060 (large components identified), T057 (data hooks)
**Parallel**: Yes [P]
**Time Estimate**: 4-5 hours

**Description**: Split PaintMixerWorkspace into focused units under 300 lines (FR-030).

**Strategy**:
1. Extract: ColorPicker.tsx, PaintSelector.tsx, MixingResults.tsx, VolumeControls.tsx
2. Extract data fetching logic into useDataFetch hook

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/src/components/mixing/PaintMixerWorkspace.tsx`
- Create: Sub-components (4-5 files)

**Acceptance**: T022 test passes, PaintMixerWorkspace <300 lines.

---

### T063: Refactor Remaining Large Components
**Type**: CORE
**Depends On**: T060 (large components identified)
**Parallel**: No (depends on T060 identification)
**Time Estimate**: 2-4 hours per component

**Description**: Refactor any remaining components >300 lines identified in T060.

**Strategy**: Sub-component extraction or utility function extraction as appropriate.

**Acceptance**: T022 test passes, all components <300 lines.

---

### T064: Measure Code Duplication Baseline
**Type**: CORE
**Depends On**: T023 (duplication test)
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Run jscpd to capture baseline duplication metrics (FR-032).

**Command**: `jscpd src/ --output=./reports/jscpd-baseline`

**Expected Baseline** (from CODEBASE_ANALYSIS_REPORT):
- Duplicate tokens: ~60% of codebase
- Duplicate blocks: 150+ instances

**Acceptance**: Baseline captured, documented for comparison.

---

### T065: Refactor Duplicate Patterns Identified by AST Analysis
**Type**: CORE
**Depends On**: T054-T057 (shared utilities), T064 (baseline)
**Parallel**: No (depends on utilities)
**Time Estimate**: 6-8 hours

**Description**: Refactor duplicate patterns using shared utilities (FR-032).

**Strategy**:
1. Run jscpd to identify top duplicate blocks
2. Extract into shared utilities or hooks
3. Replace duplicates with shared code
4. Re-run jscpd to verify reduction

**Files** (many, identified by jscpd):
- Edit: Files with duplicate patterns

**Acceptance**: T023 test passes, duplication reduced to 30-35% (40-50% reduction).

---

### T066: Verify Code Duplication Reduction Target
**Type**: CORE
**Depends On**: T065 (refactoring complete)
**Parallel**: No (verification task)
**Time Estimate**: 30 minutes

**Description**: Run final duplication measurement and verify 40-50% reduction achieved (FR-032).

**Command**: `jscpd src/ --output=./reports/jscpd-final`

**Target**:
- Duplicate tokens: 30-35% (down from ~60%)
- Duplicate blocks: <75 (down from ~150)

**Acceptance**: T023 test passes, reduction target met.

---

## Phase 3.4: Integration (T067-T073)

### T067: Convert Placeholder Tests to .skip() with TODO Comments
**Type**: INTEGRATION
**Depends On**: T026 (placeholder test)
**Parallel**: Yes [P]
**Time Estimate**: 2-3 hours

**Description**: Find all placeholder tests and convert to .skip() status (FR-035).

**Strategy**:
1. Search: `grep -r "test(" __tests__/ | grep -v ".skip"` + manual review
2. For each placeholder: Convert to `test.skip()` with TODO comment
3. Remove false positive tests

**Files** (many):
- Edit: Placeholder test files throughout `__tests__/`

**Acceptance**: T026 test passes, no active placeholders.

---

### T068: Add Authentication Flow Unit Tests
**Type**: INTEGRATION
**Depends On**: T034 (sign-in route implementation)
**Parallel**: Yes [P]
**Time Estimate**: 3-4 hours

**Description**: Write unit tests for authentication utilities (rate limiting, lockout helpers, metadata).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/rate-limit.test.ts`
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/metadata-helpers.test.ts`
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/auth-validation.test.ts`

**Test Cases**:
- Rate limiting: 27 tests (from CLAUDE.md)
- Metadata helpers: 18 tests
- Zod validation: 36 tests

**Acceptance**: Tests written, pass, increase coverage.

---

### T069: Add Color Science Validation Tests
**Type**: INTEGRATION
**Depends On**: T040 (type index with ColorValue)
**Parallel**: Yes [P]
**Time Estimate**: 3 hours

**Description**: Write unit tests for color science calculations (FR-037).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/color-conversions.test.ts`
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/delta-e.test.ts`

**Test Cases**:
- LAB conversions with known reference values
- Delta E ≤ 4.0 requirement validation
- ColorValue type guards

**Acceptance**: Tests written, pass, ≥90% coverage for color science.

---

### T070: Add Paint Mixing Optimization Tests
**Type**: INTEGRATION
**Depends On**: T040 (type index)
**Parallel**: Yes [P]
**Time Estimate**: 3 hours

**Description**: Write unit tests for mixing optimization algorithms (FR-037).

**Files**:
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/kubelka-munk.test.ts`
- Create: `/home/davistroy/dev/paintmixr/__tests__/unit/mixing-optimizer.test.ts`

**Test Cases**:
- Kubelka-Munk mixing with known inputs/outputs
- Volume constraint validation
- Optimization accuracy (Delta E targets)

**Acceptance**: Tests written, pass, ≥90% coverage for mixing.

---

### T071: Run Full Test Suite with Coverage Report
**Type**: INTEGRATION
**Depends On**: T067-T070 (all new tests)
**Parallel**: No (verification task)
**Time Estimate**: 1 hour

**Description**: Run full test suite and verify 90%+ coverage for critical paths (FR-037).

**Command**: `npm test -- --coverage`

**Target Coverage**:
- src/lib/auth/: ≥90% (lines, branches, functions, statements)
- src/lib/color/: ≥90%
- src/lib/mixing/: ≥90%

**Acceptance**: T025 test passes, coverage targets met.

---

### T072: Configure and Run Cypress E2E Tests
**Type**: INTEGRATION
**Depends On**: T012 (E2E auth test), T028 (performance test), T029 (load test), T030 (accessibility test)
**Parallel**: No (integration verification)
**Time Estimate**: 2 hours

**Description**: Configure Cypress and run all E2E tests (Principle VI).

**Setup**:
1. Install Cypress: `npm install --save-dev cypress`
2. Configure: `cypress.config.ts`
3. Run: `npx cypress run`

**Expected Tests**:
- T012: Full authentication cycle
- T028: Performance at scale
- T029: Rate limiting under load
- T030: Accessibility compliance

**Acceptance**: All E2E tests pass.

---

### T073: Run Performance Regression Testing
**Type**: INTEGRATION
**Depends On**: T031 (performance test), T034 (sign-in optimized)
**Parallel**: No (verification task)
**Time Estimate**: 1 hour

**Description**: Run performance tests and establish baselines (Principle V).

**Tests**:
1. Authentication response time <2 seconds
2. Color calculations <500ms
3. UI interactions at 60fps

**Acceptance**: T031 test passes, baselines established, no regressions.

---

## Phase 3.5: Polish (T074-T085)

### T075: Run Accessibility Audit with axe-core
**Type**: POLISH
**Depends On**: T030 (accessibility test)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Run automated accessibility audit and fix violations (Principle V).

**Command**: `npx cypress run --spec "cypress/e2e/accessibility-wcag.cy.ts"`

**Target**: 90%+ WCAG 2.1 AA compliance (up from 65% baseline).

**Acceptance**: T030 test passes, compliance target met.

---

### T076: Verify Next.js 15 Build Compatibility
**Type**: POLISH
**Depends On**: T038, T039 (async searchParams), T052 (strict mode build)
**Parallel**: No (verification task)
**Time Estimate**: 1 hour

**Description**: Verify application builds and runs with Next.js 15 (FR-014, Scenario 13 in quickstart.md).

**Commands**:
1. `npm run build`
2. `npm run start`
3. Test navigation to pages with query parameters

**Acceptance**: T011 test passes, T027 test passes, no Next.js 15 errors.

---

### T077: Run All Quickstart Scenarios End-to-End
**Type**: POLISH
**Depends On**: ALL previous tasks
**Parallel**: No (final verification)
**Time Estimate**: 4-6 hours

**Description**: Execute all 13 quickstart scenarios manually to verify complete feature implementation.

**Scenarios** (from quickstart.md):
1. Authentication performance at scale
2. Rate limiting under load
3. Account lockout race conditions
4. OAuth precedence enforcement
5. TypeScript strict mode compilation
6. Type definition consolidation
7. Supabase client pattern consolidation
8. Code duplication reduction
9. Component size refactoring
10. Test coverage for critical paths
11. Cypress E2E authentication flow
12. Build performance and optimization
13. Next.js 15 compatibility

**Acceptance**: All scenarios pass, all acceptance criteria met.

---

### T078: Update Project Documentation
**Type**: POLISH
**Depends On**: ALL previous tasks
**Parallel**: Yes [P]
**Time Estimate**: 2-3 hours

**Description**: Update README, CLAUDE.md, and other documentation with implemented changes.

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/README.md`
- Edit: `/home/davistroy/dev/paintmixr/CLAUDE.md` (manual additions)

**Updates**:
- Document new authentication patterns
- Document shared utilities usage
- Document TypeScript strict mode requirements
- Document code quality metrics achieved

**Acceptance**: Documentation current and accurate.

---

### T079: Create Database Migration Documentation
**Type**: POLISH
**Depends On**: T001 (atomic counter function)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Document database migration for atomic counter function.

**Files**:
- Create: `/home/davistroy/dev/paintmixr/supabase/migrations/README.md`

**Contents**:
- Migration order
- Rollback procedures
- Testing in staging

**Acceptance**: Migration documented.

---

### T080: Remove Unused Dependencies
**Type**: POLISH
**Depends On**: T050 (legacy clients deleted), T051 (migration complete)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Remove unused npm packages after migration.

**Strategy**:
1. Check: `npm run depcheck` or manual review of package.json
2. Remove: Deprecated @supabase/auth-helpers-nextjs if present
3. Verify: Build still succeeds

**Files**:
- Edit: `/home/davistroy/dev/paintmixr/package.json`

**Acceptance**: Unused dependencies removed, build succeeds.

---

### T081: Run ESLint and Fix Warnings
**Type**: POLISH
**Depends On**: T052 (build success)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Fix all ESLint warnings for code quality (FR-026).

**Command**: `npm run lint -- --fix`

**Strategy**:
1. Auto-fix what's possible
2. Manually fix remaining warnings
3. Ensure 0 warnings remain

**Acceptance**: `npm run lint` exits with 0 warnings.

---

### T082: Run Prettier Formatting
**Type**: POLISH
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 30 minutes

**Description**: Format all code with Prettier for consistency.

**Command**: `npx prettier --write "src/**/*.{ts,tsx}"`

**Acceptance**: All files formatted consistently.

---

### T083: Verify Performance Budget (Lighthouse)
**Type**: POLISH
**Depends On**: T066 (duplication reduced), T076 (Next.js 15 build)
**Parallel**: Yes [P]
**Time Estimate**: 1 hour

**Description**: Run Lighthouse audit and verify performance/accessibility scores ≥90 (Production Standards).

**Command**: `npx lighthouse http://localhost:3000 --view`

**Targets**:
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥90

**Acceptance**: All scores ≥90.

---

### T084: Final Build Verification
**Type**: POLISH
**Depends On**: ALL previous tasks
**Parallel**: No (final gate)
**Time Estimate**: 1 hour

**Description**: Run final production build and verify all requirements met.

**Commands**:
1. `npm run build` (must succeed)
2. `npm test -- --coverage` (≥90% coverage)
3. `npm run lint` (0 errors, 0 warnings)

**Acceptance**: T027 test passes, T016 test passes, T025 test passes.

---

### T085: Create Feature Summary Report
**Type**: POLISH
**Depends On**: T077 (all scenarios complete)
**Parallel**: Yes [P]
**Time Estimate**: 2 hours

**Description**: Create comprehensive summary report of all improvements.

**Files**:
- Create: `/home/davistroy/dev/paintmixr/specs/005-use-codebase-analysis/SUMMARY.md`

**Contents**:
- Security improvements: N+1 query fix, OAuth precedence, lockout, rate limiting
- Type safety: Strict mode enabled, duplicate types eliminated
- Code quality: 40-50% duplication reduction, components <300 lines
- Test coverage: 90%+ for critical paths
- Performance: <2s authentication, <500ms calculations
- Metrics: Before/after comparison

**Acceptance**: Summary report complete, accurate, comprehensive.

---

## Dependencies

### Phase Boundaries
- **Setup → Tests**: T001-T003 must complete before T004-T031
- **Tests → Core**: T004-T031 must be FAILING before T032-T066
- **Core → Integration**: T032-T066 must complete before T067-T073
- **Integration → Polish**: T067-T073 must complete before T074-T085

### Critical Dependencies
- T034 (sign-in route) blocks: T053 (UI update), T068 (unit tests), T073 (performance test)
- T040 (type index) blocks: T041 (rename duplicates), T042 (migrate imports)
- T046-T049 (modern clients) block: T050 (delete legacy), T051 (migrate imports)
- T054-T057 (shared utilities) block: T058-T059 (migration), T065 (refactoring)
- T060 (identify large components) blocks: T061-T063 (refactor them)

### Parallel Execution Groups
**Group 1 - Setup** (can run together):
- T001, T002, T003

**Group 2 - Contract Tests** (can run together):
- T004, T005, T006, T007, T008, T009, T010, T011, T013, T014, T015, T016, T019, T020, T021

**Group 3 - Integration Tests** (can run together):
- T012, T017, T018, T022, T023, T024, T025, T026, T027, T028, T029, T030, T031

**Group 4 - Modern Client Creation** (can run together):
- T046, T047, T048, T049

**Group 5 - Shared Utilities** (can run together):
- T054, T055, T056, T057

**Group 6 - Strict Mode Fixes** (can run together):
- T043, T044, T045

**Group 7 - Component Refactoring** (can run together):
- T061, T062

**Group 8 - Final Polish** (can run together):
- T075, T078, T079, T080, T081, T082, T083, T085

---

## Parallel Execution Examples

### Launch All Setup Tasks Together (T001-T003)
```bash
# Terminal 1
npm run migrate:apply -- 20251002_atomic_lockout_counter.sql

# Terminal 2
code tsconfig.json # Update strict mode flags

# Terminal 3
code next.config.js # Remove ignoreBuildErrors
```

### Launch Contract Tests Together (T004-T011, T013-T016, T019-T021)
```typescript
// All can be written simultaneously (different files)
// T004: __tests__/contract/auth-performance.test.ts
// T005: __tests__/contract/rate-limiting.test.ts
// T006: __tests__/contract/lockout-race-conditions.test.ts
// T007: __tests__/contract/oauth-precedence.test.ts
// T008: __tests__/contract/lockout-status-api.test.ts
// T009: __tests__/contract/rate-limit-status-api.test.ts
// T010: __tests__/contract/admin-clear-lockout.test.ts
// T011: __tests__/contract/nextjs15-searchparams.test.ts
// T013: __tests__/contract/type-index.test.ts
// T014: __tests__/contract/strict-mode-compilation.test.ts
// T015: __tests__/contract/supabase-client-patterns.test.ts
// T016: __tests__/contract/build-enforcement.test.ts
// T019: __tests__/contract/api-client-utilities.test.ts
// T020: __tests__/contract/form-utilities.test.ts
// T021: __tests__/contract/data-fetching-hooks.test.ts
```

### Launch Modern Clients Together (T046-T049)
```bash
# Terminal 1
code src/lib/supabase/client.ts

# Terminal 2
code src/lib/supabase/server.ts

# Terminal 3
code src/lib/supabase/route-handler.ts

# Terminal 4
code src/lib/supabase/admin.ts
```

### Launch Shared Utilities Together (T054-T057)
```bash
# Terminal 1
code src/lib/api/client.ts

# Terminal 2
code src/lib/forms/schemas.ts

# Terminal 3
code src/lib/forms/useFormErrors.ts
code src/lib/forms/useFormSubmit.ts

# Terminal 4
code src/lib/hooks/usePagination.ts
code src/lib/hooks/useFilters.ts
code src/lib/hooks/useDataFetch.ts
```

---

## Notes

### TDD Discipline
- **CRITICAL**: All tests in Phase 3.2 must be written and failing before any implementation in Phase 3.3
- Verify tests fail with meaningful error messages
- Tests guide implementation (write tests to describe what you want)

### Parallel Task Rules
- **[P] tasks**: Different files, no dependencies, can run simultaneously
- **Sequential tasks**: Same file, has dependencies, must run in order
- Build will guide you when tasks have hidden dependencies (compile errors)

### Commit Strategy
- Commit after each task completion
- Use descriptive commit messages referencing task ID
- Example: "T034: Fix N+1 query in email signin route"

### Avoid Common Pitfalls
- Don't skip tests (TDD mandatory)
- Don't implement before tests fail
- Don't modify same file in parallel tasks
- Don't ignore strict mode errors (fix systematically)

### Constitutional Compliance
- Color accuracy preserved (no modifications to color science)
- TDD enforced (tests before implementation)
- Type safety mandatory (strict mode, no suppressions in first-party code)
- Performance monitored (<2s auth, <500ms calculations, 60fps UI)
- Accessibility validated (WCAG 2.1 AA, 90%+ compliance)
- E2E testing required (Cypress for critical flows)

---

## Validation Checklist

**GATE: Verify before considering tasks complete**

- [x] All contracts (auth-fixes, type-consolidation, refactoring-contracts) have corresponding tests
- [x] All entities (LockoutMetadata, RateLimitRecord, TypeDefinition entities) have implementation tasks
- [x] All tests come before implementation (TDD enforced)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] All quickstart scenarios have corresponding tasks
- [x] Dependencies clearly documented
- [x] Estimated time: ~150-180 hours total (85 tasks)

---

**Generated**: 2025-10-02
**Feature**: 005-use-codebase-analysis
**Total Tasks**: 85 (Setup: 3, Tests: 28, Core: 35, Integration: 7, Polish: 12)
**Estimated Effort**: 150-180 developer hours
**Parallel Opportunities**: 45 tasks marked [P] for parallel execution
