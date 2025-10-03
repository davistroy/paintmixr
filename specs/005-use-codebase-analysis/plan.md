# Implementation Plan: Comprehensive Codebase Improvement & Technical Debt Resolution

**Branch**: `005-use-codebase-analysis` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/005-use-codebase-analysis/spec.md`

## Summary

This feature addresses critical security vulnerabilities, performance bottlenecks, type safety gaps, and code duplication identified through comprehensive codebase analysis by 6 parallel specialized agents. The implementation proceeds through 4 coordinated phases: (1) Critical Security & Performance fixes including N+1 query elimination, OAuth precedence repair, atomic lockout counters, and Next.js 15 compatibility; (2) Type Safety & Pattern Consolidation with strict mode enablement, duplicate type elimination, and Supabase client standardization; (3) Code Reuse & Maintainability achieving 40-50% duplication reduction through shared utilities and component refactoring; (4) Testing & Code Quality with 90%+ coverage and E2E validation. The approach enables parallel execution of independent tasks across phases while respecting dependencies, uses token-based AST analysis for duplication measurement, and accepts breaking changes for legacy client migration in a single coordinated phase.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (upgrade target), Node.js 22.15.0
**Primary Dependencies**:
- Frontend: Next.js 15, React 18, Radix UI, Tailwind CSS, React Hook Form + Zod
- Backend: Supabase (@supabase/ssr for auth), PostgreSQL with RLS
- Testing: Jest, Cypress (E2E), Testing Library
- Color Science: Custom LAB/CIE implementations, Kubelka-Munk mixing theory
- Build: TypeScript strict mode (currently disabled, must enable), ESLint, Prettier

**Storage**:
- Supabase PostgreSQL for user data (auth.users, paint collections, sessions)
- User metadata in `raw_user_meta_data` for lockout tracking
- In-memory rate limiting (simplest approach, cleared on expiry)

**Testing**:
- Jest + Testing Library (208 test files, many placeholders)
- Cypress E2E (required by constitution, not fully implemented)
- Target: 90%+ coverage for critical paths with branch/condition coverage
- Placeholder tests → `.skip()` with TODO comments

**Target Platform**:
- Vercel (single-region cloud deployment)
- PWA-capable web application
- Browser: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- No custom infrastructure, managed services only

**Project Type**: Web application (Next.js frontend + Supabase backend)

**Performance Goals**:
- Authentication: <2s total (server-side + 200ms network budget)
- Color calculations: <500ms (constitutional requirement)
- Concurrent users: Support 100-500 without degradation
- UI interactions: 60fps (constitutional requirement)

**Constraints**:
- Uptime: 95-98% best-effort (no formal SLA)
- Scale: 10,000 registered users, 100-500 concurrent users
- Security: Proactive monitoring, case-by-case vulnerability response
- Rate limiting: Sliding window algorithm, 5 attempts/15min
- Lockout: 15min after 5 failed attempts, reset on retry during lockout

**Scale/Scope**:
- 85 TypeScript files, 23 components, 208 test files
- 40 files with `any` type (47% of codebase)
- Average component: 280 lines, largest: 664 lines
- 12+ duplicate type definitions (3 INCOMPATIBLE)
- 4 different Supabase client implementations
- ~100-150 type errors hidden by disabled strict mode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: N/A - This feature does not modify color calculation algorithms, display logic, or paint database. Existing color science implementation (Delta E ≤ 4.0, LAB color space, Kubelka-Munk coefficients) remains unchanged and is preserved through refactoring.

**Principle II - Documentation Currency**: PASS - Context7 MCP will be used for all library documentation research (Next.js 15 async patterns, @supabase/ssr migration, TypeScript strict mode best practices, rate limiting algorithms). No cached documentation will be relied upon for technical decisions.

**Principle III - Test-First Development**: PASS - TDD approach planned: (1) Convert placeholder tests to `.skip()` with TODO comments, (2) Write new tests for security fixes (rate limiting, lockout, OAuth precedence), (3) Tests must fail, (4) Implement fixes, (5) Verify tests pass. Performance tests will verify <2s authentication and <500ms calculations with regression detection.

**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode will be enabled (Phase 2), all implicit `any` types eliminated from first-party code, Zod validation already in place for user inputs. ColorValue interface preservation is guaranteed through type consolidation. Type suppressions allowed liberally for third-party library issues.

**Principle V - Performance & Accessibility**: PASS - Web Workers already in use for color calculations. WCAG 2.1 AA compliance will be verified (current 65% → target 90%+). 60fps UI interactions preserved. Performance monitoring will track authentication response times and color calculation durations with baseline comparison.

**Principle VI - Real-World Testing**: PASS - Cypress E2E tests will be created/fixed for authentication flows (lockout, rate limiting, OAuth precedence), color science validation, and paint mixing workflows. Accessibility testing automated. Performance regression testing with established baselines. Rate limiting and lockout scenarios will be validated end-to-end.

**Production Standards Compliance**: PASS - PWA manifest already exists. Supabase RLS policies will be verified for user data isolation. Session management improvements (atomic lockout counter, sliding window rate limiting). Offline functionality preserved. Performance budgets enforced (Lighthouse ≥90 for Performance/Accessibility).

*No violations - all principles satisfied. This is primarily a refactoring and security hardening feature that preserves existing functionality while eliminating technical debt.*

## Project Structure

### Documentation (this feature)
```
specs/005-use-codebase-analysis/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification with clarifications
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── auth-fixes.md    # Authentication API contract changes
│   ├── type-consolidation.md  # Type system contracts
│   └── refactoring-contracts.md  # Component refactoring contracts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
Next.js 15 application structure:
src/
├── app/                         # Next.js 15 app router
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   │   └── email-signin/route.ts  # CRITICAL FIX: N+1 query, lockout race condition
│   │   └── [other routes]
│   ├── auth/                    # Auth pages
│   │   ├── signin/page.tsx      # CRITICAL FIX: Async searchParams for Next.js 15
│   │   └── error/page.tsx       # CRITICAL FIX: Async searchParams for Next.js 15
│   └── [other pages]
├── components/                  # React components (23 total)
│   ├── auth/
│   │   └── EmailSigninForm.tsx  # Email auth form
│   ├── dashboard/
│   │   └── paint-mixing-dashboard.tsx  # 664 lines → refactor to <300
│   └── [other components]
├── lib/                         # Shared utilities
│   ├── auth/
│   │   ├── supabase-client.ts   # ✅ KEEP: Modern @supabase/ssr browser client
│   │   ├── supabase-server.ts   # ✅ KEEP: Modern @supabase/ssr server client
│   │   │                        # CRITICAL FIX: getUserIdentities() broken query
│   │   ├── rate-limit.ts        # Client-side rate limit tracking (UX only)
│   │   ├── metadata-helpers.ts  # Lockout metadata utilities
│   │   └── validation.ts        # Zod schemas for auth
│   ├── supabase/
│   │   └── client.ts            # ❌ DELETE: Legacy client, migrate to auth/
│   ├── database/
│   │   └── supabase-client.ts   # ❌ DELETE: Duplicate client, migrate to auth/
│   ├── color-science.ts         # LAB color utilities (preserve)
│   ├── kubelka-munk.ts          # Paint mixing algorithms (preserve)
│   └── [other utilities]
├── types/                       # TypeScript type definitions
│   ├── types.ts                 # ✅ CANONICAL: Main type definitions
│   ├── mixing.ts                # ✅ CANONICAL: Mixing-related types
│   │                            # CONTAINS: LABColor, VolumeConstraints, PerformanceMetrics
│   ├── optimization.ts          # Domain-specific optimization types
│   ├── precision.ts             # Precision-related types
│   ├── auth.ts                  # Auth-related types
│   └── index.ts                 # NEW: Centralized type index for imports
├── hooks/                       # React hooks
│   └── use-paint-colors.ts      # DELETE duplicate PaintColor type
└── [other directories]

tests/
├── unit/                        # Jest unit tests (208 files, many placeholders)
├── integration/                 # Integration tests
└── e2e/                         # NEW: Cypress E2E tests
    ├── auth/
    │   ├── email-signin.cy.ts   # E2E test for email auth with lockout
    │   ├── rate-limiting.cy.ts  # E2E test for rate limiting
    │   └── oauth-precedence.cy.ts  # E2E test for OAuth blocking
    └── [other e2e tests]

Configuration files at root:
├── tsconfig.json                # CRITICAL FIX: Enable strict mode
├── next.config.js               # CRITICAL FIX: Remove ignoreBuildErrors flags
├── .eslintrc.json               # ESLint config
└── package.json                 # Dependencies
```

**Structure Decision**: Next.js 15 app router architecture with `src/` directory. Authentication logic centralized in `src/lib/auth/` with modern `@supabase/ssr` patterns. Type definitions consolidated in `src/types/` with centralized index. Legacy Supabase clients in `src/lib/supabase/` and `src/lib/database/` will be deleted and consumers migrated to `src/lib/auth/` clients. Component refactoring will split large files (>500 lines) into sub-components or extract utilities as appropriate. E2E tests added to `tests/e2e/` directory structure.

## Phase 0: Outline & Research

**Unknowns Extracted from Technical Context**: None - all clarifications resolved through /clarify session. Technical stack and approach fully defined.

**Research Tasks**:
1. **Next.js 15 Async SearchParams Pattern** (context7)
   - Decision needed: Proper async/await pattern for searchParams in page components
   - Codemod: `npx @next/codemod@latest next-async-request-api .`
   - Constitutional requirement: Test-first (write failing tests before applying codemod)

2. **Supabase Admin API for User Lookup** (context7)
   - Decision needed: Replace `listUsers()` with targeted query
   - Options: `auth.admin.getUserByEmail()` vs direct table query
   - Constitutional requirement: O(1) performance, RLS compliance

3. **Atomic Counter Implementation for PostgreSQL** (context7)
   - Decision needed: PostgreSQL function for atomic increment vs database-level locks
   - Use case: Failed login attempt counter without race conditions
   - Constitutional requirement: Prevent race conditions under concurrent load

4. **Sliding Window Rate Limiting Algorithm** (context7)
   - Decision needed: In-memory implementation details for sliding window
   - Libraries: Custom vs `@upstash/ratelimit` (deferred to simplest in-memory)
   - Constitutional requirement: Smooth rate enforcement, no burst at boundaries

5. **TypeScript Strict Mode Migration Strategy** (context7)
   - Decision needed: Incremental enablement approach for ~100-150 errors
   - Categories: null checks, implicit any, function types, uninitialized properties
   - Constitutional requirement: Zero implicit any in first-party code

6. **Token-Based Code Duplication Detection** (context7)
   - Decision needed: Tool selection for AST-level duplicate pattern detection
   - Options: jscpd, jsinspect, ESLint no-dupe-*, custom analysis
   - Measurement: Baseline → target (40-50% reduction)

7. **Component Splitting Strategies** (context7)
   - Decision needed: Sub-component extraction vs utility function extraction patterns
   - React patterns: Compound components, hooks extraction, feature slicing
   - Constitutional requirement: <300 lines per component file

8. **Cypress E2E Test Patterns for Auth Flows** (context7)
   - Decision needed: Test structure for rate limiting, lockout, OAuth scenarios
   - Patterns: Custom commands, fixtures, intercepts for Supabase APIs
   - Constitutional requirement: Validate all auth flows end-to-end

**Output**: research.md with consolidated findings, decisions, rationale, and alternatives considered for each research task. All NEEDS CLARIFICATION resolved.

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model Extraction

**Entities from Specification** (output to `data-model.md`):

#### Security Metadata Entities

**Entity: Lockout Metadata**
- **Location**: `auth.users.raw_user_meta_data` (Supabase user metadata)
- **Fields**:
  - `failed_login_attempts`: number (0-5, incremented atomically)
  - `lockout_until`: ISO 8601 timestamp | null (expires after 15 minutes)
  - `last_failed_attempt`: ISO 8601 timestamp | null (tracking for reset logic)
- **Validation Rules**:
  - `failed_login_attempts` resets to 0 on successful login
  - `lockout_until` set when `failed_login_attempts` reaches 5
  - Lockout timer resets to full 15 minutes if user attempts login during lockout (FR-009a)
  - Cleared immediately upon expiry (simplest approach, no historical retention)
- **State Transitions**:
  ```
  Initial → Failed Attempt → ... → 5th Failed Attempt → Locked (15min)
  Locked → Attempt During Lockout → Locked (timer reset to 15min)
  Locked → 15min Expires → Initial (metadata cleared)
  Any State → Successful Login → Initial (cleared)
  ```

**Entity: Rate Limit Record**
- **Location**: In-memory Map structure (server-side, not persisted)
- **Fields**:
  - `ip_address`: string (key, from x-forwarded-for header)
  - `attempt_timestamps`: number[] (Unix timestamps in sliding 15min window)
  - `window_start`: number (Unix timestamp, sliding window tracking)
- **Validation Rules**:
  - Maximum 5 attempts in sliding 15-minute window
  - Timestamps older than 15 minutes automatically pruned
  - Cleared immediately upon expiry (simplest approach)
- **State Transitions**:
  ```
  No Record → First Attempt → Record Created [attempt_count: 1]
  Record Exists → Attempt Within Window → Increment [attempt_count++]
  Record Exists → Attempt After 15min → Prune Old + Increment
  Record Exists → 5 Attempts → Rate Limited (429 response)
  Record Exists → 15min Since Last Attempt → Record Cleared
  ```

**Entity: User Identity** (existing Supabase auth schema)
- **Location**: `auth.identities` table (read via Admin API)
- **Fields**:
  - `user_id`: UUID (foreign key to auth.users)
  - `provider`: string (e.g., "google", "email")
  - `created_at`: timestamp
- **Validation Rules**:
  - If non-email provider exists, block email/password signin (FR-005)
  - OAuth precedence check happens before password validation
- **Relationships**:
  - One-to-many: `auth.users` → `auth.identities` (user can have multiple providers)

#### Type Definition Entities

**Entity: Canonical Type Definitions** (consolidation in `src/types/`)
- **LABColor** (3 duplicate definitions → 1 canonical in `types/mixing.ts`)
  - Fields: `l: number`, `a: number`, `b: number`
  - Ranges: l=0-100, a=-128 to 127, b=-128 to 127
  - Constitutional requirement: Preserve for color accuracy calculations

- **VolumeConstraints** (3 INCOMPATIBLE definitions → rename domain-specific)
  - Canonical: `types/mixing.ts` → `VolumeConstraints` (keep existing)
  - Rename: `lib/mixing-optimization/constraints.ts` → `OptimizationVolumeConstraints`
  - Delete: `components/dashboard/paint-mixing-dashboard.tsx` (import canonical)

- **PerformanceMetrics** (3 different structures → rename all domain-specific)
  - Rename: `types/mixing.ts` → `OptimizationPerformanceMetrics`
  - Rename: `lib/monitoring/performance-metrics.ts` → `DetailedPerformanceMetrics`
  - Rename: `components/optimization/optimization-results.tsx` → `UIPerformanceMetrics`

- **Type Index** (new `types/index.ts`)
  - Exports all types from types/*.ts for centralized imports
  - Pattern: `export * from './types'`, `export * from './mixing'`, etc.

### 2. API Contract Generation

**Contract files** (output to `contracts/` directory):

#### Authentication API Contracts (`contracts/auth-fixes.md`)

**Contract 1: Email Signin Route - Fixed N+1 Query**
- **Endpoint**: `POST /api/auth/email-signin`
- **Changes**:
  - **Before**: `supabaseAdmin.auth.admin.listUsers()` → O(n) scan
  - **After**: Direct query `supabaseAdmin.from('auth.users').select().eq('email').limit(1)` → O(1)
  - **Performance**: <100ms for user lookup regardless of user count (target <2s total with 200ms network budget)
- **Request**: `{ email: string, password: string }`
- **Response Success**: `{ success: true, redirectUrl: string }`
- **Response Errors**:
  - 429: `{ error: "Too many login attempts", retryAfter: number (seconds) }`
  - 403: `{ error: "This account uses OAuth authentication. Please sign in with {Provider}." }`
  - 423: `{ error: "Account locked due to failed attempts", retryAfter: number (seconds) }`
  - 401: `{ error: "Invalid credentials" }` (generic, no user enumeration)

**Contract 2: Lockout Metadata - Atomic Counter**
- **Storage**: `auth.users.raw_user_meta_data`
- **Atomic Operation**: PostgreSQL function `increment_failed_attempts(user_id UUID) RETURNS INTEGER`
- **Logic**:
  ```sql
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{failed_login_attempts}',
    to_jsonb(COALESCE((raw_user_meta_data->>'failed_login_attempts')::int, 0) + 1)
  )
  WHERE id = user_id
  RETURNING (raw_user_meta_data->>'failed_login_attempts')::int
  ```
- **Race Condition Prevention**: Single atomic UPDATE with RETURNING clause

**Contract 3: OAuth Precedence Check - Fixed Query**
- **Function**: `getUserIdentities(userId: string): Promise<Identity[]>`
- **Before**: `supabase.from('auth.identities')` (fails - RLS protected)
- **After**: `supabaseAdmin.auth.admin.getUserById(userId)` → `user.identities`
- **Return**: Array of identity objects `{ provider: string, ... }`
- **Usage**: Check if non-email provider exists before allowing email/password signin

**Contract 4: Rate Limiting Middleware**
- **Scope**: All `/api/auth/*` routes
- **Algorithm**: Sliding window (continuous tracking, no burst at boundaries)
- **Threshold**: 5 attempts per 15 minutes per IP address
- **Response Headers**:
  - `X-RateLimit-Limit: 5`
  - `X-RateLimit-Remaining: {0-5}`
  - `X-RateLimit-Reset: {Unix timestamp}`
  - `Retry-After: {seconds}` (when rate limited)

#### Type Consolidation Contracts (`contracts/type-consolidation.md`)

**Contract 5: Type Definition Consolidation**
- **Canonical Source**: `src/types/` directory (single source of truth)
- **Migration Pattern**:
  ```typescript
  // Before (scattered definitions)
  // src/lib/color-science.ts
  interface LABColor { l: number; a: number; b: number }

  // After (centralized import)
  // src/lib/color-science.ts
  import { LABColor } from '@/types'
  ```
- **Incompatible Types**: Rename with domain prefix (e.g., `OptimizationVolumeConstraints`)
- **Type Index**: `src/types/index.ts` exports all types for easier imports

**Contract 6: TypeScript Strict Mode Configuration**
- **File**: `tsconfig.json`
- **Changes**:
  ```json
  {
    "compilerOptions": {
      "strict": true,  // Enable all strict checks
      "skipLibCheck": true,  // Preserve (skip third-party lib checks)
      "noImplicitAny": true,  // Included in strict, explicit for clarity
      "strictNullChecks": true,  // Included in strict
      "strictFunctionTypes": true,  // Included in strict
      "strictPropertyInitialization": true  // Included in strict
    }
  }
  ```
- **Suppressions**: Liberal use of `@ts-expect-error` and `@ts-ignore` allowed for third-party library issues
- **Build Configuration**: Remove `next.config.js` ignore flags
  ```javascript
  // DELETE these lines:
  // typescript: { ignoreBuildErrors: true },
  // eslint: { ignoreDuringBuilds: true },
  ```

#### Component Refactoring Contracts (`contracts/refactoring-contracts.md`)

**Contract 7: Component Size Limits**
- **Rule**: All components MUST be <300 lines
- **Refactoring Strategies**:
  - **Sub-component extraction**: Create child components with own files (e.g., `DashboardHeader.tsx`, `MixingControls.tsx`)
  - **Utility function extraction**: Move helper functions to `src/lib/utils/` (e.g., color calculations, formatters)
- **Target Components** (>500 lines):
  - `components/dashboard/paint-mixing-dashboard.tsx` (664 lines → split into 3-4 components)
  - [Other large components identified in analysis]

**Contract 8: Shared API Client Utilities**
- **File**: `src/lib/api-client.ts` (new)
- **Exports**:
  ```typescript
  export class ApiError extends Error {
    constructor(message: string, public status: number, public code?: string)
  }

  export async function apiPost<T>(url: string, data: any): Promise<T>
  export async function apiGet<T>(url: string): Promise<T>
  export async function apiPut<T>(url: string, data: any): Promise<T>
  export async function apiDelete<T>(url: string): Promise<T>
  ```
- **Error Handling**: Uniform error responses with typed ApiError class
- **Usage**: Replace 10+ duplicate fetch patterns across components

**Contract 9: Supabase Client Migration**
- **DELETE Files**:
  - `src/lib/supabase/client.ts` (198 lines - legacy @supabase/supabase-js)
  - `src/lib/database/supabase-client.ts` (157 lines - duplicate)
- **KEEP Files** (modern `@supabase/ssr`):
  - `src/lib/auth/supabase-client.ts` (browser client)
  - `src/lib/auth/supabase-server.ts` (server client)
- **Migration Pattern**:
  ```typescript
  // Before
  import { supabase } from '@/lib/supabase/client'

  // After (browser/client components)
  import { createClient } from '@/lib/auth/supabase-client'
  const supabase = createClient()

  // After (server components)
  import { createServerComponentClient } from '@/lib/auth/supabase-server'
  const supabase = await createServerComponentClient()

  // After (API routes)
  import { createRouteHandlerClient } from '@/lib/auth/supabase-server'
  const supabase = await createRouteHandlerClient()
  ```
- **Breaking Change**: All imports updated in single coordinated phase (15+ files affected)

### 3. Contract Test Generation

**Test files** (initial failing tests):
- `tests/contract/auth-fixes.test.ts` - Email signin route contract tests (N+1 fix, lockout, OAuth precedence)
- `tests/contract/rate-limiting.test.ts` - Rate limiting middleware contract tests
- `tests/contract/type-system.test.ts` - Type consolidation verification (import tests, no duplicates)
- `tests/contract/component-size.test.ts` - Component size limit enforcement (<300 lines)
- `tests/contract/api-client.test.ts` - Shared API client utility contract tests
- `tests/contract/supabase-migration.test.ts` - Verify no legacy client imports remain

### 4. Integration Test Scenarios

**Extracted from user stories** (output to `quickstart.md`):

#### Phase 1 Quickstart Scenarios
1. **Authentication Performance Test**:
   - Create 10,000 test users in database
   - Attempt email/password signin
   - Assert: Response time <2 seconds (server + 200ms network budget)
   - Verify: No `listUsers()` call in logs (should use targeted query)

2. **Rate Limiting Test**:
   - Send 6 rapid login attempts from same IP
   - Assert: Requests 1-5 return 200/401, request 6 returns 429
   - Verify: `Retry-After` header present on 429 response
   - Wait 15 minutes, verify rate limit resets

3. **OAuth Precedence Test**:
   - Create user with Google OAuth identity
   - Attempt email/password signin
   - Assert: 403 response with "This account uses OAuth authentication. Please sign in with Google."

4. **Atomic Lockout Counter Test**:
   - Send 5 concurrent failed login attempts
   - Assert: Account locked after exactly 5 attempts (no race condition allowing 6+)
   - Verify: `lockout_until` timestamp set to current time + 15 minutes

5. **Lockout Timer Reset Test**:
   - Trigger account lockout (5 failed attempts)
   - Attempt login during lockout period
   - Assert: 423 response, lockout timer reset to full 15 minutes from new attempt

6. **Next.js 15 SearchParams Test**:
   - Navigate to `/auth/signin?redirect=/dashboard&error=unauthorized`
   - Assert: No runtime errors with async searchParams pattern
   - Verify: Query params correctly extracted and used

#### Phase 2 Quickstart Scenarios
7. **TypeScript Strict Mode Compilation**:
   - Run `tsc --noEmit`
   - Assert: Zero implicit any errors in first-party code
   - Assert: No null/undefined access without checks
   - Verify: Build succeeds with `npm run build`

8. **Type Definition Uniqueness**:
   - Import `LABColor` from `@/types`
   - Verify: No duplicate definitions in color-science.ts
   - Assert: Single canonical source in types/mixing.ts

9. **Supabase Client Migration**:
   - Grep codebase for `@/lib/supabase/client` and `@/lib/database/supabase-client` imports
   - Assert: Zero matches (all legacy imports removed)
   - Verify: All imports use `@/lib/auth/supabase-client` or `@/lib/auth/supabase-server`

#### Phase 3 Quickstart Scenarios
10. **Component Size Verification**:
    - Run script to count lines in all component files
    - Assert: No component file >300 lines
    - Verify: paint-mixing-dashboard.tsx split into 3-4 sub-components

11. **Code Duplication Measurement**:
    - Run token-based similarity analysis (jscpd or equivalent)
    - Capture baseline duplication percentage
    - After refactoring: Assert 40-50% reduction
    - Verify: Shared API client used in 10+ files

#### Phase 4 Quickstart Scenarios
12. **Test Coverage Verification**:
    - Run `npm test -- --coverage`
    - Assert: ≥90% coverage for auth/, color-science.ts, kubelka-munk.ts
    - Assert: Branch coverage ≥90% for critical paths
    - Verify: No placeholder tests remain (all converted to `.skip()` with TODO or implemented)

13. **E2E Authentication Flow**:
    - Cypress test: Full email signin → dashboard → logout flow
    - Cypress test: Rate limiting with 6 rapid attempts
    - Cypress test: Account lockout and timer reset
    - Assert: All flows pass without errors

### 5. Update Agent Context File

**Execute**: `.specify/scripts/bash/update-agent-context.sh claude`
- **Target**: `/home/davistroy/dev/paintmixr/CLAUDE.md`
- **Updates**:
  - Add Phase 1-4 security fixes to "Recent Technical Decisions"
  - Document N+1 query fix pattern (targeted queries with `.eq()`)
  - Document OAuth precedence check pattern (Admin API getUserById)
  - Document atomic counter pattern (PostgreSQL function)
  - Document rate limiting pattern (sliding window, in-memory)
  - Document TypeScript strict mode migration (incremental category-based fixes)
  - Document type consolidation pattern (canonical in `types/`, domain-specific renamed)
  - Document Supabase client migration (delete legacy, use `@supabase/ssr` exclusively)
  - Preserve existing manual additions
  - Keep token count <150 lines

**Output**:
- `data-model.md` with 3 security metadata entities, type definition entities
- `contracts/auth-fixes.md` with 4 authentication contracts
- `contracts/type-consolidation.md` with 3 type system contracts
- `contracts/refactoring-contracts.md` with 3 refactoring contracts
- Initial failing contract tests in `tests/contract/`
- `quickstart.md` with 13 integration test scenarios
- Updated `/home/davistroy/dev/paintmixr/CLAUDE.md` with implementation patterns

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base template
- Generate tasks from Phase 1 design artifacts:
  - Each contract in `contracts/*.md` → multiple tasks (setup, test, implementation, validation)
  - Each entity in `data-model.md` → type definition + migration tasks
  - Each scenario in `quickstart.md` → E2E test task
- TDD order enforced: All test tasks before implementation tasks
- Dependency analysis: Identify blockers (e.g., atomic counter function before auth route fix)
- Parallel execution marking: Independent tasks marked [P] (e.g., type consolidation parallel to auth fixes)

**Phase-Based Task Grouping**:

**Phase 1: Critical Security & Performance (Tasks 1-20)**
- Setup tasks: PostgreSQL atomic counter function, rate limiting data structures
- Test tasks: Contract tests for N+1 fix, OAuth precedence, lockout, rate limiting
- Implementation tasks:
  - Fix N+1 query in email-signin route
  - Fix getUserIdentities() OAuth precedence check
  - Implement atomic lockout counter
  - Add server-side rate limiting middleware
  - Apply Next.js 15 async searchParams codemod
- Validation tasks: Run quickstart scenarios 1-6, performance benchmarks

**Phase 2: Type Safety & Pattern Consolidation (Tasks 21-35)**
- Setup tasks: Create `types/index.ts`, identify all duplicate types
- Test tasks: Type system contract tests, Supabase client migration verification
- Implementation tasks:
  - Enable TypeScript strict mode in tsconfig.json
  - Fix revealed type errors by category (null checks → implicit any → function types → properties)
  - Consolidate duplicate types (LABColor, VolumeConstraints, PerformanceMetrics)
  - Rename incompatible domain-specific types
  - Delete legacy Supabase client files
  - Migrate all imports to modern `@supabase/ssr` clients
  - Remove build error ignore flags from next.config.js
- Validation tasks: Run `tsc --noEmit`, `npm run build`, quickstart scenarios 7-9

**Phase 3: Code Reuse & Maintainability (Tasks 36-50)**
- Setup tasks: Create `src/lib/api-client.ts`, identify components >500 lines
- Test tasks: Component size verification, API client contract tests, duplication baseline measurement
- Implementation tasks:
  - Create shared API client utility (apiPost, apiGet, apiPut, apiDelete)
  - Migrate 10+ components to use shared API client
  - Split paint-mixing-dashboard.tsx (664 lines → 3-4 components)
  - Extract reusable hooks (pagination, filtering, data fetching)
  - Create shared form utilities
  - Refactor duplicate patterns identified by AST analysis
- Validation tasks: Token-based duplication measurement (40-50% reduction), component size checks, quickstart scenarios 10-11

**Phase 4: Testing & Code Quality (Tasks 51-65)**
- Setup tasks: Install/configure Cypress, create E2E test structure
- Test tasks:
  - Convert placeholder tests to `.skip()` with TODO comments
  - Write E2E tests for authentication flows (lockout, rate limiting, OAuth)
  - Write E2E tests for color science validation
  - Write E2E tests for paint mixing workflows
  - Add performance regression tests
  - Add accessibility tests (WCAG 2.1 AA)
- Implementation tasks:
  - Fix failing tests (implement missing assertions)
  - Remove false positive tests
  - Add coverage for critical paths (auth, color science, mixing)
- Validation tasks: Run full test suite, coverage report (≥90%), quickstart scenarios 12-13

**Ordering Strategy**:
1. **Dependencies First**: Atomic counter function → auth route fixes
2. **TDD Order**: All tests written before implementation
3. **Phase Gating**: Phase 1 must complete before Phase 2 (security critical)
4. **Parallel Opportunities**:
   - [P] Type consolidation can run parallel to auth fixes
   - [P] Component refactoring can run parallel to test writing
   - [P] Multiple contract test suites can be written simultaneously
   - [P] E2E test creation can happen while unit tests are being fixed
5. **Constitutional Compliance**: All tasks respect TDD, color accuracy preservation, performance budgets

**Estimated Output**: 60-70 numbered, dependency-ordered tasks in tasks.md with clear [P] parallel markers

**Task Template Example**:
```markdown
### Task 1: Create PostgreSQL Atomic Counter Function [SETUP]
**Phase**: 1 - Critical Security & Performance
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour
**Description**: Create PostgreSQL function for atomic failed login attempt increment
**Acceptance**: Function exists, returns new count, no race conditions under concurrent calls
**Test**: `tests/contract/auth-fixes.test.ts` - atomic counter test

### Task 2: Write Contract Test for N+1 Query Fix [TEST]
**Phase**: 1 - Critical Security & Performance
**Depends On**: None
**Parallel**: Yes [P]
**Time Estimate**: 1 hour
**Description**: Write failing test asserting email signin uses targeted query, not listUsers()
**Acceptance**: Test fails (N+1 query still present), covers 10K user scenario
**Test**: `tests/contract/auth-fixes.test.ts` - N+1 query test

### Task 3: Implement N+1 Query Fix in Email Signin Route [IMPLEMENTATION]
**Phase**: 1 - Critical Security & Performance
**Depends On**: Task 1 (atomic counter function), Task 2 (contract test written)
**Parallel**: No (depends on setup + test)
**Time Estimate**: 2-3 hours
**Description**: Replace listUsers() with targeted query, implement atomic lockout counter
**Acceptance**: Task 2 test passes, performance <100ms for user lookup
**Files**: `src/app/api/auth/email-signin/route.ts`
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan. The /plan command only describes the approach above.

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with 60-70 numbered tasks)
**Phase 4**: Implementation (execute tasks.md following constitutional principles, TDD approach, parallel execution where marked)
**Phase 5**: Validation (run full test suite, execute all quickstart.md scenarios, verify 90%+ coverage, performance benchmarks, duplication reduction measurement)

## Complexity Tracking

*No complexity violations - constitution check passed for all principles. This feature improves code quality, security, and maintainability without introducing new complexity.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 2025-10-02
- [x] Phase 1: Design complete (/plan command) - 2025-10-02
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - 2025-10-02
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - 2025-10-02
- [x] Post-Design Constitution Check: PASS - 2025-10-02
- [x] All NEEDS CLARIFICATION resolved: PASS (via /clarify session) - 2025-10-02
- [x] Complexity deviations documented: N/A (no violations)

**Artifacts Created**:
- [x] research.md - 8 research tasks consolidated
- [x] data-model.md - Security metadata, type definitions, code quality metrics
- [x] contracts/auth-fixes.md - 4 authentication security contracts
- [x] contracts/type-consolidation.md - 3 type system contracts
- [x] contracts/refactoring-contracts.md - 3 code reuse contracts
- [x] quickstart.md - 13 integration test scenarios
- [x] CLAUDE.md - Updated with Phase 1-4 technical decisions

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
