# Tasks: Technical Debt Remediation & Code Quality Improvements

**Input**: Design documents from `/home/davistroy/dev/paintmixr/specs/010-using-refactor-recommendations/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `010-using-refactor-recommendations`

## Execution Summary
This task list implements technical debt remediation in 5 phases: (1) Type consolidation, (2) Dependency updates, (3) Code refactoring, (4) Performance optimizations, (5) Security & observability. Tasks follow TDD principles with tests written before implementation. Total estimated time: 24-30 hours across 57 tasks.

---

## Path Conventions
- Next.js App Router web application at repository root
- Source: `/home/davistroy/dev/paintmixr/src/`
- Tests: `/home/davistroy/dev/paintmixr/__tests__/`
- Contracts: `/home/davistroy/dev/paintmixr/specs/010-using-refactor-recommendations/contracts/`

---

## Phase 1: Type System Consolidation (Foundation)

### T001 [X] [P] Audit duplicate type definitions
**File**: N/A (analysis task)
**Action**: Scan `/src/types/types.ts` and `/src/lib/types/index.ts` for duplicate type definitions
**Output**: List of duplicates and unique types to consolidate
**Validation**: Document findings (duplicate type names, usage counts)

### T002 [X] [P] Move unique types to centralized location
**File**: `/src/lib/types/index.ts`
**Action**: Copy all unique types from `/src/types/types.ts` to `/src/lib/types/index.ts`
**Validation**: All types exported from centralized location

### T003 [X] Update all imports to use @/lib/types
**File**: All TypeScript files importing from `@/types/types`
**Action**: Global search/replace `from '@/types/types'` → `from '@/lib/types'`
**Validation**: `npm run type-check` passes (zero errors)
**Estimated**: ~30 files to update

### T004 [X] [P] Delete legacy types directory
**File**: `/src/types/` directory
**Action**: Remove `/src/types/` directory entirely
**Validation**: Directory no longer exists, all imports working

### T005 [X] [P] Replace any/unknown with proper types (53 instances)
**File**: All files in `/src/lib/` with `any` or `unknown` types
**Action**: Replace generic types with specific types from `@/lib/types`
**Validation**: TypeScript strict mode passes, no any/unknown in lib/
**Estimated**: ~53 type replacements across multiple files

---

## Phase 2: Dependency Updates (Breaking Changes Inline)

### T006 [X] Run React 19 migration codemods
**File**: All `.ts`, `.tsx` files
**Action**: Execute `npx codemod@latest react/19/migration-recipe` and `npx types-react-codemod@latest preset-19 ./src`
**Validation**: Codemods complete successfully

### T007 [X] Update React dependencies to 19.x
**File**: `package.json`, `package-lock.json`
**Action**: `npm install --save-exact react@^19.0.0 react-dom@^19.0.0 @types/react@^19.0.0 @types/react-dom@^19.0.0`
**Validation**: Dependencies installed, lock file updated

### T008 [X] Fix React 19 breaking changes
**File**: Files with `useRef()` without arguments, test imports
**Action**: Add `useRef(undefined)` where needed, update test imports `import {act} from 'react'`
**Validation**: `npm run type-check` passes

### T009 [X] Run Next.js 15 migration codemod
**File**: All API routes, pages with `params`/`searchParams`
**Action**: Execute `npx @next/codemod@latest next-async-request-api .`
**Validation**: Async request APIs updated (cookies, headers, params)

### T010 [X] Update Next.js dependencies to 15.x
**File**: `package.json`
**Action**: `npm install next@^15.1.8`
**Validation**: Next.js 15 installed, Turbopack available

### T011 [X] Update dev script for Turbopack
**File**: `package.json`
**Action**: Change `"dev": "next dev"` → `"dev": "next dev --turbopack"`
**Validation**: Dev script uses Turbopack

### T012 [X] Update Zod to 4.x
**File**: `package.json`
**Action**: `npm install zod@^4.1.0`
**Validation**: Zod 4 installed

### T012b [X] Remove unused dependencies
**File**: `package.json`
**Action**: `npm uninstall react-color`
**Validation**: react-color no longer in package.json dependencies

### T013 [X] Refactor recursive Zod schemas (if any)
**File**: Schema files using `z.lazy()`
**Action**: Replace `z.lazy()` with `get` accessor pattern per research.md
**Validation**: All schemas compile, no z.lazy() usage

### T014 [X] Update Cypress to 15.x
**File**: `package.json`
**Action**: `npm install cypress@^15.3.2`
**Validation**: Cypress 15 installed, Node.js ≥20 verified

### T014b [X] Update ESLint to 9.x and migrate to flat config
**File**: `package.json`, `.eslintrc.json`, `eslint.config.js` (new)
**Action**: `npm install eslint@^9.37.0`, migrate `.eslintrc.json` to `eslint.config.js` flat config format
**Validation**: ESLint 9 installed, flat config working, all existing rules preserved

### T015 [X] [P] Run full test suite after dependency updates
**File**: All test files
**Action**: `npm run test && npm run test:e2e`
**Validation**: All tests pass, no breaking changes detected

---

## Phase 3: Code Refactoring (Oversized Components)

### T016 [X] Extract ColorMatchingMode component
**File**: `/src/components/modes/ColorMatchingMode.tsx` (new), `/src/app/page.tsx`
**Action**: Extract color_picker, hex_input, image_upload logic to separate component
**Validation**: page.tsx reduces by ~200 lines, component under 200 lines

### T017 [X] Extract RatioPredictionMode component
**File**: `/src/components/modes/RatioPredictionMode.tsx` (new), `/src/app/page.tsx`
**Action**: Extract manual paint ratio logic to separate component
**Validation**: page.tsx reduces by ~200 lines, component under 200 lines

### T018 [X] Extract useColorMatching custom hook
**File**: `/src/lib/hooks/useColorMatching.ts` (new), `/src/app/page.tsx`
**Action**: Extract API calls, state management to custom hook
**Validation**: page.tsx under 250 lines total (target achieved)

### T019 [DEFERRED] Split enhanced-paint-repository (CRUD operations)
**File**: `/src/lib/database/repositories/paint-crud.repository.ts` (new), `/src/lib/database/repositories/enhanced-paint-repository.ts`
**Action**: Extract create, read, update, delete operations to separate file
**Validation**: paint-crud.repository.ts under 300 lines

### T020 [DEFERRED] Split enhanced-paint-repository (Search operations)
**File**: `/src/lib/database/repositories/paint-search.repository.ts` (new), `/src/lib/database/repositories/enhanced-paint-repository.ts`
**Action**: Extract color search, filters, pagination to separate file
**Validation**: paint-search.repository.ts under 300 lines

### T021 [DEFERRED] Split enhanced-paint-repository (Stats operations)
**File**: `/src/lib/database/repositories/paint-stats.repository.ts` (new), `/src/lib/database/repositories/enhanced-paint-repository.ts`
**Action**: Extract usage stats, recommendations to separate file
**Validation**: All repository files under 600 lines total (target achieved)

### T022 [DEFERRED] Extract DE strategies from differential-evolution
**File**: `/src/lib/mixing-optimization/de-strategies/rand-1-bin.ts` (new), `/src/lib/mixing-optimization/differential-evolution.ts`
**Action**: Extract rand-1-bin strategy to separate file
**Validation**: Strategy file under 200 lines

### T023 [DEFERRED] Extract constraint handling from differential-evolution
**File**: `/src/lib/mixing-optimization/constraint-handler.ts` (new), `/src/lib/mixing-optimization/differential-evolution.ts`
**Action**: Extract constraint validation logic to separate file
**Validation**: constraint-handler.ts under 150 lines

### T024 [DEFERRED] Extract convergence detection from differential-evolution
**File**: `/src/lib/mixing-optimization/convergence-detector.ts` (new), `/src/lib/mixing-optimization/differential-evolution.ts`
**Action**: Extract convergence detection logic to separate file
**Validation**: differential-evolution.ts under 500 lines total (target achieved)

### T025 [X] [P] Delete orphaned Web Worker code
**File**: `/src/workers/` and `/src/lib/workers/` directories
**Action**: Remove Web Worker directories and files (replaced by serverless functions)
**Validation**: Directories deleted, no imports referencing workers/

### T026 [X] [P] Fix React hook dependency warnings (6 instances)
**File**: `/src/app/history/page.tsx`, `/src/components/color-input/ImageUpload.tsx`, `/src/components/dashboard/paint-mixing-dashboard.tsx`
**Action**: Add missing dependencies or wrap functions in useCallback per ESLint warnings
**Validation**: `npm run lint` passes, no exhaustive-deps warnings

### T027 [X] [P] Replace <img> tags with Next.js <Image />
**File**: `/src/components/color-input/ImageUpload.tsx`
**Action**: Replace `<img>` with `next/image` Image component
**Validation**: No ESLint warnings for img elements

### T027b [DEFERRED] Write unit tests for refactored components
**File**: `__tests__/unit/components/modes/` (new)
**Action**: Write unit tests for ColorMatchingMode, RatioPredictionMode, useColorMatching hook
**Validation**: Component test coverage ≥90%, all user interactions tested

### T027c [DEFERRED] Write unit tests for refactored repositories
**File**: `__tests__/unit/database/repositories/` (new)
**Action**: Write unit tests for paint-crud, paint-search, paint-stats repositories
**Validation**: Repository test coverage ≥90%, all CRUD operations tested

### T027d [DEFERRED] Write unit tests for refactored DE algorithm
**File**: `__tests__/unit/mixing-optimization/` (new)
**Action**: Write unit tests for DE strategies, constraint handler, convergence detector
**Validation**: Algorithm test coverage ≥90%, edge cases tested

### T027e [DEFERRED] Write Cypress E2E tests for refactored ColorMatchingMode
**File**: `__tests__/e2e/color-matching-refactored.cy.ts` (new)
**Action**: Write Cypress E2E tests covering color picker, hex input, image upload flows in refactored component
**Validation**: All critical user workflows tested, tests pass with refactored component

### T027f [DEFERRED] Write Cypress E2E tests for refactored RatioPredictionMode
**File**: `__tests__/e2e/ratio-prediction-refactored.cy.ts` (new)
**Action**: Write Cypress E2E tests covering manual paint ratio input and optimization flows in refactored component
**Validation**: All critical user workflows tested, tests pass with refactored component

### T027g [DEFERRED] Write Cypress E2E tests for refactored paint repository
**File**: `__tests__/e2e/paint-repository-refactored.cy.ts` (new)
**Action**: Write Cypress E2E tests covering CRUD operations, search, and stats via refactored repository modules
**Validation**: All database operations tested end-to-end, RLS policies validated

---

## Phase 4: Performance Optimizations (TDD - Tests First)

### T028 [X] [P] Contract test: API version headers
**File**: `__tests__/integration/api-headers.test.ts` (new)
**Action**: Test all API routes return `X-API-Version: 1.0` header
**Validation**: Test fails (headers not implemented yet)

### T029 [X] [P] Contract test: Rate limiting on /api/optimize
**File**: `__tests__/integration/rate-limit.test.ts` (new)
**Action**: Test /api/optimize returns 429 after 5 requests in 1 minute
**Validation**: Test fails (rate limiting not implemented yet)

### T030 [X] [P] Contract test: API DTOs match schema
**File**: `__tests__/integration/api-dto-contracts.test.ts` (new)
**Action**: Test API responses match DTO types from contracts/api-dto-types.ts
**Validation**: Test fails (DTOs not implemented yet)

### T031 [X] [P] Performance baseline test
**File**: `__tests__/performance/regression.test.ts` (new)
**Action**: Test API p95 <200ms, DB p95 <100ms, cache hit >70%
**Validation**: Test fails (baselines not recorded yet)

### T032 [X] Install SWR library
**File**: `package.json`
**Action**: `npm install swr`
**Validation**: SWR installed

### T033 [X] Create SWRProvider wrapper
**File**: `/src/lib/providers/SWRProvider.tsx` (new)
**Action**: Implement SWRProvider with `dedupingInterval: 5000`, `revalidateOnFocus: true`
**Validation**: Provider exports SWRConfig with global configuration

### T034 [X] Configure Supabase connection pooling
**File**: `.env.local`
**Action**: Add `DATABASE_URL` with pooler URL (port 6543, `?pgbouncer=true&connection_limit=1`)
**Validation**: Environment variable set, pooler URL configured

### T035 [X] Create structured logger (Pino)
**File**: `/src/lib/logging/logger.ts` (new)
**Action**: Implement Pino logger with severity levels, ISO timestamp, context injection
**Validation**: Logger exports `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`

### T036 [X] Replace console.log with structured logger
**File**: All files with `console.log`, `console.error`, `console.warn` (~30 files)
**Action**: Replace console calls with `logger.*()` calls
**Validation**: No console.* calls in src/, all logs structured

### T036b [X] Implement database query performance logging
**File**: `/src/lib/database/query-logger.ts` (new), `/src/lib/supabase/server.ts`
**Action**: Create query logger middleware to log database queries exceeding 100ms threshold
**Validation**: Structured logger emits warning for slow queries with query text, duration, and context

### T037 [X] Create API DTO types
**File**: `/src/lib/api/dtos/paint.dto.ts`, `/src/lib/api/dtos/session.dto.ts` (new)
**Action**: Define PaintDTO, SessionDTO interfaces based on contracts/api-dto-types.ts
**Validation**: DTOs exported, match contract types

### T038 [X] Create DTO mapper functions
**File**: `/src/lib/api/mappers/paint-mapper.ts`, `/src/lib/api/mappers/session-mapper.ts` (new)
**Action**: Implement `toPaintDTO()`, `toSessionDTO()` functions (Entity→DTO)
**Validation**: Mappers export pure functions, type-safe transformations

### T039 [X] Implement API version headers
**File**: All API route files in `/src/app/api/`
**Action**: Add `X-API-Version: 1.0` header to all responses using contracts/api-headers.ts
**Validation**: T028 contract test passes

### T040 [X] Implement rate limiting middleware
**File**: `/src/lib/middleware/rate-limit.ts` (new), `/src/app/api/optimize/route.ts`
**Action**: Implement Upstash Redis rate limiter (5 req/min) per contracts/rate-limit-policy.ts
**Validation**: T029 contract test passes

### T041 [X] Implement API response caching
**File**: All GET API routes in `/src/app/api/`
**Action**: Add `Cache-Control: private, max-age=300, stale-while-revalidate=60` headers
**Validation**: Curl shows cache headers, ETags generated

### T042 [X] Update API routes to return DTOs
**File**: `/src/app/api/paints/route.ts`, `/src/app/api/sessions/route.ts`
**Action**: Use DTO mappers to transform database entities before JSON response
**Validation**: T030 contract test passes

### T043 [X] Record performance baselines
**File**: `__tests__/performance/baselines.json` (new)
**Action**: Run benchmarks (100 iterations), record p95/p99 for API, DB, color calculations
**Validation**: baselines.json created, T031 test passes

---

## Phase 5: Security & Observability (Implementation)

### T044 [X] Implement XSS input sanitization
**File**: All Zod schemas in `/src/lib/forms/schemas.ts`
**Action**: Add `.regex(/^[a-zA-Z0-9\s\-_]+$/)` validators, `.max(500)` length limits
**Validation**: XSS attempts blocked (HTML tags stripped)

### T045 [X] [P] Audit Supabase client usage
**File**: All API routes in `/src/app/api/`
**Action**: Verify route handler client used (not admin client) for user operations
**Validation**: No admin client in user-facing routes, RLS enforced

### T046 [X] [P] Document environment variables
**File**: `.env.example` (new)
**Action**: Create `.env.example` with all public/private variables documented
**Validation**: .env.example lists all vars with comments (public vs private)

### T047 [X] [P] Fix test coverage timeout
**File**: `jest.config.js`, `package.json`
**Action**: Extend timeout incrementally (60s → 120s → 180s), add `--detectOpenHandles`
**Validation**: `npm run test:coverage` completes, root cause identified

### T048 [X] [P] Implement API contract testing
**File**: `__tests__/integration/api-contracts.test.ts` (new)
**Action**: Validate all API routes match OpenAPI schema (generated from contracts/)
**Validation**: Contract tests pass, no API drift detected

---

## Dependencies

### Critical Path (Must complete in order)
1. Phase 1 (T001-T005) blocks Phase 2 (T006-T015) - Type consolidation before dependency updates
2. Phase 2 (T006-T015) blocks Phase 3 (T016-T027) - Dependency updates before refactoring
3. Phase 4 Tests (T028-T031) block Phase 4 Implementation (T032-T043) - TDD approach
4. Phase 4 (T032-T043) blocks Phase 5 (T044-T048) - Infrastructure before security

### Parallel Execution Groups
**Group 1 - Phase 1 Parallel** (T001, T002, T004, T005):
```
Task: "Audit duplicate type definitions"
Task: "Move unique types to centralized location"
Task: "Delete legacy types directory"
Task: "Replace any/unknown with proper types"
```

**Group 2 - Phase 4 Tests Parallel** (T028, T029, T030, T031):
```
Task: "Contract test API version headers in __tests__/integration/api-headers.test.ts"
Task: "Contract test rate limiting in __tests__/integration/rate-limit.test.ts"
Task: "Contract test API DTOs in __tests__/integration/api-dto-contracts.test.ts"
Task: "Performance baseline test in __tests__/performance/regression.test.ts"
```

**Group 3 - Phase 5 Parallel** (T044, T045, T046, T047, T048):
```
Task: "Implement XSS input sanitization in Zod schemas"
Task: "Audit Supabase client usage in API routes"
Task: "Document environment variables in .env.example"
Task: "Fix test coverage timeout in jest.config.js"
Task: "Implement API contract testing in __tests__/integration/api-contracts.test.ts"
```

---

## Validation Checklist

### All Contracts Have Tests
- [x] T028: API version headers contract test
- [x] T029: Rate limiting contract test
- [x] T030: API DTO contract test
- [x] T031: Performance baseline test
- [x] T048: API contract testing (OpenAPI validation)

### All Entities Have Implementation
- [x] Type Definition (T001-T005): Centralized types
- [x] API DTO (T037-T038, T042): DTO layer implemented
- [x] Performance Baseline (T043): Baselines recorded
- [x] Structured Log Entry (T035-T036): Pino logger
- [x] Security Policy (T040, T044): Rate limiting + XSS sanitization

### Tests Before Implementation (TDD)
- [x] T028-T031 (tests) come before T032-T043 (implementation)
- [x] All tests in Phase 4 written first, then implementation

### Parallel Tasks Independent
- [x] Group 1: Different files, no dependencies
- [x] Group 2: Different test files, all [P]
- [x] Group 3: Different implementation areas, all [P]

### File Paths Specified
- [x] All tasks include exact file paths or directories
- [x] New files marked with "(new)"
- [x] Existing files referenced by absolute path

---

## Task Execution Notes

1. **Type Consolidation (T001-T005)**: Foundation for all other work, blocks dependency updates
2. **Dependency Updates (T006-T015)**: Fix breaking changes inline per clarification, run full test suite after each major update
3. **Code Refactoring (T016-T027)**: Meet 300-line component standard, delete orphaned code
4. **Performance (T028-T043)**: TDD approach - write failing tests first, then implement
5. **Security (T044-T048)**: Audit patterns, document variables, achieve >80% coverage

**Estimated Total Time**: 24-30 hours (assumes 1-2 developers working in parallel where possible)

**Success Criteria**: All quickstart.md validation steps pass, all tests green, all performance targets met
