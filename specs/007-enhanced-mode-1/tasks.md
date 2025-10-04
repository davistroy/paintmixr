# Tasks: Enhanced Accuracy Mode - Server-Side Optimization

**Feature Branch**: `007-enhanced-mode-1`
**Input**: Design documents from `/home/davistroy/dev/paintmixr/specs/007-enhanced-mode-1/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/optimize-api.yaml, quickstart.md

## Execution Strategy

This task list follows Test-Driven Development (TDD) with strict phase ordering:
1. **Phase 3.1**: Setup dependencies and project structure
2. **Phase 3.2**: Write ALL tests (contract, integration, E2E) - tests MUST FAIL
3. **Phase 3.3**: Implement core optimization logic to make tests pass
4. **Phase 3.4**: Integration with existing UI and API
5. **Phase 3.5**: Polish, validation, and documentation

**Parallel Execution**: Tasks marked `[P]` work on different files and can run simultaneously.

---

## Phase 3.1: Setup & Dependencies

### T001: Install ml-matrix library and verify version
**File**: `package.json`
**Description**: Verify `ml-matrix@6.12.1` is installed (already in package.json per research.md). No action needed unless missing.
**Dependencies**: None
**Validation**: Run `npm list ml-matrix` and confirm version 6.12.1

### T002: Create mixing-optimization directory structure
**Files**:
- `src/lib/mixing-optimization/` (new directory)
- `src/lib/mixing-optimization/algorithms.ts` (stub)
- `src/lib/mixing-optimization/constraints.ts` (already exists, verify)
- `src/lib/mixing-optimization/enhanced-optimizer.ts` (stub)

**Description**: Create directory structure for server-side optimization modules as defined in plan.md Project Structure.
**Dependencies**: None
**Validation**: Verify directory exists with 3 TypeScript files

### T002.5: Measure baseline Web Worker optimization performance

**File**: `__tests__/performance/web-worker-baseline.test.ts` (NEW)

**Description**: Capture performance baseline for current Web Worker-based optimization before deprecation:
- Measure optimization time for 5, 10, 20, 50 paint collections
- Measure Delta E accuracy achieved for reference target colors
- Measure convergence rate (% of optimizations achieving Delta E ≤ 2.0)
- Measure iterations completed per second
- Document results in `specs/007-enhanced-mode-1/baseline-performance.md`

Use same test paint collections and target colors that will be used in T028 for apples-to-apples comparison.

**Dependencies**: T002 (directory structure)

**Validation**: Baseline report generated with at least 10 test runs per collection size for statistical validity

**Note**: This baseline enables verification of NFR-002 "comparable or better accuracy" claim by providing quantitative comparison data.

### T003 [P]: Configure TypeScript types for optimization
**File**: `src/lib/types/index.ts`
**Description**: Add TypeScript interfaces from data-model.md:
- `EnhancedOptimizationRequest`
- `OptimizedPaintFormula`
- `OptimizationPerformanceMetrics`
- `EnhancedOptimizationResponse`

Export all types from central index.
**Dependencies**: None
**Validation**: Import types in test file without errors

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3.3

**CRITICAL**: All tests in this phase MUST be written and MUST FAIL before implementing any core logic in Phase 3.3.

### T004 [P]: Contract test for POST /api/optimize (Enhanced Mode)
**File**: `__tests__/contract/optimize-enhanced-api.test.ts` (NEW)
**Description**: Create contract test based on `contracts/optimize-api.yaml`:
- Test request schema validation (EnhancedOptimizationRequest)
- Test response schema validation (EnhancedOptimizationResponse)
- Test 400 error for invalid paint count (<2 or >100)
- Test 400 error for invalid LAB values (out of range)
- Test 400 error for invalid mode enum
- Test 200 success response structure
- Test partial result warning structure
- Test timeout scenario (mock 30s timeout)

Use Zod schema validation from data-model.md.
**Dependencies**: T003 (types)
**Validation**: All tests FAIL (no implementation yet)

### T005 [P]: Integration test for Enhanced Mode success scenario
**File**: `__tests__/integration/enhanced-mode-success.test.ts` (NEW)
**Description**: Based on quickstart.md Scenario 1 (Enhanced Mode Success):
- Mock paint collection with 4+ paints (Titanium White, Ultramarine Blue, Cadmium Yellow, Burnt Umber)
- Target color: L=65, a=18, b=-5
- Expect Delta E ≤ 2.0
- Expect 3-5 paint formula
- Expect accuracy rating "excellent"
- Expect optimization time < 30 seconds
- Expect Kubelka-Munk K/S coefficients in response

**Dependencies**: T003 (types)
**Validation**: Test FAILS (no optimizer implemented)

### T006 [P]: Integration test for partial result scenario
**File**: `__tests__/integration/enhanced-mode-partial.test.ts` (NEW)
**Description**: Based on quickstart.md Scenario 2 (Partial Result):
- Target color outside gamut: L=75, a=95, b=85 (neon pink)
- Expect Delta E > 2.0 (best achievable)
- Expect warnings array with "Target not met" message
- Expect convergenceAchieved: false
- Expect targetMet: false
- Expect accuracy rating "good" or "acceptable"

**Dependencies**: T003 (types)
**Validation**: Test FAILS (no optimizer implemented)

### T007 [P]: Integration test for timeout fallback
**File**: `__tests__/integration/enhanced-mode-timeout.test.ts` (NEW)
**Description**: Based on quickstart.md Scenario 3 (Timeout Fallback):
- Mock large paint collection (80-100 paints)
- Mock timeout at 28 seconds
- Expect graceful degradation (not 504 error)
- Expect earlyTermination: true
- Expect warnings: "Optimization timed out"
- Expect best solution returned (not null)
- Expect improvementRate > 0 (progress made)

**Dependencies**: T003 (types)
**Validation**: Test FAILS (no timeout handling implemented)

### T008 [P]: Integration test for minimum paint count (2 paints)
**File**: `__tests__/integration/enhanced-mode-min-paints.test.ts` (NEW)
**Description**: Based on quickstart.md Scenario 4 (Minimum Paint Count):
- Paint collection: Only 2 paints (Titanium White + Ivory Black)
- Target color: L=60, a=0, b=0 (neutral gray)
- Expect successful optimization (no validation error)
- Expect 2-paint formula
- Expect Delta E ≤ 2.0 for neutral grays (achievable)
- Expect warning if Delta E > 2.0 ("Limited paint collection")

**Dependencies**: T003 (types)
**Validation**: Test FAILS (no optimizer implemented)

### T009 [P]: E2E Cypress test for Enhanced Mode workflow
**File**: `cypress/e2e/enhanced-accuracy-mode.cy.ts` (NEW)
**Description**: Based on quickstart.md Scenarios 1-6:
- Load dashboard, enable Enhanced Mode checkbox
- Select target color (LAB input or image upload)
- Verify paint collection visible (4+ paints)
- Click "Find Best Match" button
- Verify loading spinner appears
- Verify progress indicator shown after 5 seconds
- Verify result displays with formula table, Delta E badge, accuracy rating
- Verify "Save to History" functionality
- Test Standard Mode fallback toggle

**Dependencies**: None (can stub API during E2E)
**Validation**: Test FAILS (UI not updated yet)

### T010 [P]: Accessibility test for progress indicator
**File**: `__tests__/accessibility/enhanced-mode-wcag.test.ts` (NEW)
**Description**: WCAG 2.1 AA compliance tests:
- Progress indicator has aria-live="polite"
- Loading spinner has aria-label="Optimizing paint formula"
- Delta E badge has sufficient color contrast (4.5:1)
- Accuracy rating text readable by screen readers
- Keyboard navigation works for Enhanced Mode toggle
- Focus management during loading state

**Dependencies**: None
**Validation**: Test FAILS (accessibility attributes not added)

### T011 [P]: Performance test for 95th percentile response time
**File**: `__tests__/performance/enhanced-mode-performance.test.ts` (NEW)
**Description**: Performance regression tests per research.md targets:
- Measure optimization time for 5, 10, 20, 50, 100 paint collections
- Assert p95 < 30 seconds for all scenarios
- Assert Delta E ≤ 2.0 for 85%+ of realistic targets
- Assert convergence rate > 85%
- Measure memory usage (no memory leaks)
- Test cold start vs. warm start performance

**Dependencies**: None (can mock optimization)
**Validation**: Test FAILS (no performance baseline)

---

## Phase 3.3: Core Implementation (ONLY after Phase 3.2 tests are failing)

**GATE**: Run `npm test` and confirm ALL tests from T004-T011 fail before proceeding.

### T012 [P]: Extract differential evolution algorithm from Web Worker
**File**: `src/lib/mixing-optimization/differential-evolution.ts` (NEW)
**Description**: Based on research.md recommendations:
- Extract DE algorithm from `src/lib/workers/color-optimization.worker.ts`
- Make callable from both client (Web Worker) and server (API route)
- Implement population-based search with mutation and crossover
- Support constraints via penalty functions
- Add timeout callback for graceful termination
- Use ml-matrix for covariance calculations

**Dependencies**: T002 (directory structure), T003 (types)
**Validation**: T004, T005 contract/integration tests start passing

### T013 [P]: Extract TPE hybrid algorithm from Web Worker
**File**: `src/lib/mixing-optimization/tpe-hybrid.ts` (NEW)
**Description**: Based on research.md recommendations:
- Extract TPE algorithm from `src/lib/workers/color-optimization.worker.ts`
- Implement Tree-Structured Parzen Estimator with Bayesian priors
- Support higher-dimensional search spaces (>15 paints)
- Add sequential optimization with Gaussian Mixture Models
- Use ml-matrix for matrix operations
- Add convergence detection

**Dependencies**: T002 (directory structure), T003 (types)
**Validation**: T005 integration test (success scenario) passes

### T014: Implement enhanced optimizer with auto-selection
**File**: `src/lib/mixing-optimization/enhanced-optimizer.ts`
**Description**: Main optimization orchestrator:
- Auto-select algorithm based on paint count and time budget (from research.md):
  ```typescript
  if (paintCount <= 8 && prioritize_speed) return 'differential_evolution';
  if (paintCount > 15 && timeLimit > 30000) return 'tpe_hybrid';
  if (prioritize_accuracy) return 'tpe_hybrid';
  return 'differential_evolution';
  ```
- Implement timeout handling at 28 seconds (2s safety buffer)
- Integrate Kubelka-Munk color prediction from `src/lib/kubelka-munk.ts`
- Calculate Delta E using CIE 2000 from `src/lib/color-science.ts`
- Return performance metrics (iterations, convergence, improvement rate)
- Handle graceful degradation on timeout

**Dependencies**: T012 (DE algorithm), T013 (TPE algorithm)
**Validation**: T005, T006, T007 integration tests pass

### T015: Create Zod validation schemas for API requests
**File**: `src/lib/forms/enhanced-optimization-schemas.ts` (NEW)
**Description**: Based on data-model.md validation rules:
- `enhancedOptimizationRequestSchema`: Validate targetColor LAB, availablePaints array (2-100), mode enum, volumeConstraints, maxPaintCount (2-5), timeLimit (1000-30000), accuracyTarget
- `labColorSchema`: Validate L (0-100), a (-128-127), b (-128-127)
- `paintSchema`: Validate all Paint properties (k_coefficient, s_coefficient, opacity, tinting_strength all 0-1)
- Export schemas for use in API route

**Dependencies**: T003 (types)
**Validation**: T004 contract test validation scenarios pass

### T016: Implement POST /api/optimize route handler
**File**: `src/app/api/optimize/route.ts` (MODIFY existing)
**Description**: Server-side optimization endpoint:
- Add `export const maxDuration = 30` for Vercel serverless config
- Parse and validate request body using T015 schemas
- Check mode: if 'standard', use existing logic; if 'enhanced', call T014 optimizer
- Call `enhancedOptimizer.optimize()` with 28-second timeout
- Handle errors gracefully (return 400 for validation, 500 for optimization failures)
- Return `EnhancedOptimizationResponse` schema from data-model.md
- Add warnings array for partial results, timeouts, target not met

**Dependencies**: T014 (optimizer), T015 (validation schemas)
**Validation**: T004 contract test fully passes, T005-T008 integration tests pass

---

## Phase 3.4: Integration with UI

### T017: Update paint-mixing-dashboard component with Enhanced Mode toggle
**File**: `src/components/dashboard/paint-mixing-dashboard.tsx` (MODIFY)
**Description**: Based on quickstart.md UI requirements:
- Add "Enhanced Accuracy Mode" checkbox (currently disabled with "Coming Soon")
- Remove "Coming Soon" message and enable checkbox
- Add tooltip: "Delta E ≤ 2.0 target (may take up to 30 seconds)"
- Update mode state: `'standard' | 'enhanced'`
- Pass mode to API request payload
- Update UI to show maxPaintCount selector (2-5 range) when Enhanced mode enabled

**Dependencies**: T016 (API route working)
**Validation**: E2E test T009 checkbox interaction passes

### T018: Implement progress indicator with 5-second threshold
**File**: `src/components/dashboard/paint-mixing-dashboard.tsx` (MODIFY)
**Description**: Based on quickstart.md Scenario 6 (Progress Indicator Thresholds):
- Start timer when optimization begins
- Show loading spinner immediately
- After 5 seconds: Display progress indicator with "Optimizing... Xs elapsed"
- Optionally show iteration count if API supports progress streaming (future SSE enhancement)
- Hide progress indicator on completion
- Add aria-live="polite" for accessibility (T010 requirement)

**Dependencies**: T017 (Enhanced Mode toggle)
**Validation**: T010 accessibility test passes, E2E test T009 progress indicator passes

### T018.5 [OPTIONAL]: Implement Server-Sent Events for real-time progress

**Files**:
- `src/app/api/optimize/route.ts` (MODIFY)
- `src/components/dashboard/paint-mixing-dashboard.tsx` (MODIFY)

**Description**: Phase 2 enhancement from research.md - streaming progress updates:
- Modify API route to use `ReadableStream` with SSE format
- Emit progress events every 2 seconds: `{ type: 'progress', iteration, bestDeltaE, timeElapsed }`
- Emit completion event: `{ type: 'complete', result }`
- Client uses `EventSource` to consume stream
- Update progress bar with current best Delta E in real-time
- Show iteration count and convergence progress
- Fallback to synchronous polling if EventSource unsupported (IE11)

**Dependencies**: T018 (basic progress indicator working)

**Validation**: E2E test shows iteration count updating during optimization, real-time Delta E display

**Priority**: OPTIONAL - Implement only if time permits after T001-T030 complete

**Estimated Effort**: 2-3 days (per research.md Section 4)

**Note**: This is the Phase 2 SSE enhancement documented in research.md. Deferred to post-MVP unless user testing reveals significant anxiety during 5-30 second optimization waits. See research.md "Implementation Decision: Phase 1 for MVP" section.

### T019: Update use-color-matching hook for Enhanced Mode
**File**: `src/hooks/use-color-matching.ts` (MODIFY)
**Description**: Extend color matching hook:
- Add `mode` parameter to API request
- Add `maxPaintCount` parameter (default: 5 for enhanced, 3 for standard)
- Handle `warnings` array in response
- Display warnings to user (toast notifications)
- Handle partial results (convergenceAchieved: false)
- Add timeout error handling (show user-friendly message, not 504)

**Dependencies**: T017 (UI component updated)
**Validation**: T005-T008 integration tests pass end-to-end

### T020: Add formula display for 4-5 paint formulas
**File**: `src/components/dashboard/paint-mixing-dashboard.tsx` (MODIFY)
**Description**: Update formula display table:
- Support 2-5 paint rows (currently limited to 3)
- Show mixing complexity badge ("Simple", "Moderate", "Complex")
- Display Kubelka-Munk K/S values
- Show accuracy rating badge with color coding:
  - "Excellent" (green): Delta E ≤ 2.0
  - "Good" (blue): 2.0 < Delta E ≤ 4.0
  - "Acceptable" (yellow): 4.0 < Delta E ≤ 6.0
  - "Poor" (red): Delta E > 6.0

**Dependencies**: T019 (hook updated)
**Validation**: E2E test T009 formula display passes

---

## Phase 3.5: Polish & Validation

### T021 [P]: Unit tests for differential evolution algorithm
**File**: `__tests__/unit/differential-evolution.test.ts` (NEW)
**Description**: Unit test algorithm behavior:
- Test convergence on known targets (sphere function, Rosenbrock)
- Test constraint handling (bounds violations)
- Test timeout handling (early termination)
- Test population initialization
- Test mutation and crossover operators
- Test covariance matrix adaptation

**Dependencies**: T012 (DE algorithm)
**Validation**: Unit tests pass with >90% coverage

### T022 [P]: Unit tests for TPE hybrid algorithm
**File**: `__tests__/unit/tpe-hybrid.test.ts` (NEW)
**Description**: Unit test TPE behavior:
- Test Bayesian optimization on known functions
- Test Gaussian Mixture Model fitting
- Test acquisition function (Expected Improvement)
- Test sequential sampling strategy
- Test higher-dimensional search (15+ dimensions)

**Dependencies**: T013 (TPE algorithm)
**Validation**: Unit tests pass with >90% coverage

### T023 [P]: Unit tests for enhanced optimizer orchestrator
**File**: `__tests__/unit/enhanced-optimizer.test.ts` (NEW)
**Description**: Unit test orchestration logic:
- Test algorithm auto-selection logic (8 paints → DE, 20 paints → TPE)
- Test timeout enforcement at 28 seconds
- Test Kubelka-Munk integration
- Test Delta E calculation integration
- Test performance metrics calculation (improvementRate)
- Test graceful error handling

**Dependencies**: T014 (optimizer)
**Validation**: Unit tests pass with >90% coverage

### T024 [P]: Update existing mixing-optimizer.test.ts for 5-paint support
**File**: `__tests__/unit/mixing-optimizer.test.ts` (MODIFY existing)
**Description**: Extend existing unit tests:
- Add test cases for 4-paint formulas
- Add test cases for 5-paint formulas
- Update `maxPaintCount` validation to allow 5 (currently limited to 3)
- Verify volume constraints work for 5 paints
- Verify percentage sum = 100% for 5 paints

**Dependencies**: T014 (optimizer)
**Validation**: Extended tests pass

### T025: Deprecate Web Worker optimization client
**File**: `src/workers/color-optimization.worker.ts` (MODIFY)
**Description**: Mark Web Worker as deprecated:
- Add deprecation comment at top of file
- Keep file functional for backward compatibility
- Add console.warn in development mode: "Web Worker optimization deprecated. Use server-side Enhanced Mode."
- Document migration path in comments
- Plan for future removal in next major version

**Dependencies**: T016 (server-side replacement working)
**Validation**: No breaking changes to existing Standard Mode

### T026: Run full E2E validation suite
**File**: `cypress/e2e/enhanced-accuracy-mode.cy.ts`
**Description**: Execute all quickstart.md scenarios:
- Scenario 1: Enhanced Mode Success ✓
- Scenario 2: Partial Result ✓
- Scenario 3: Timeout Fallback ✓
- Scenario 4: Minimum Paint Count ✓
- Scenario 5: Standard Mode Fallback ✓
- Scenario 6: Progress Indicator Thresholds ✓

Generate Cypress report with screenshots for each scenario.
**Dependencies**: T009 (E2E tests written), T017-T020 (UI implemented)
**Validation**: All 6 scenarios pass

### T027 [P]: Accessibility compliance validation
**File**: `__tests__/accessibility/enhanced-mode-wcag.test.ts`
**Description**: Run automated WCAG 2.1 AA tests:
- Use jest-axe for automated testing
- Verify Enhanced Mode toggle accessible
- Verify progress indicator aria-live
- Verify formula table keyboard navigation
- Verify color contrast ratios (4.5:1 minimum)
- Run Lighthouse accessibility audit (score ≥ 90)

**Dependencies**: T010 (accessibility tests written), T017-T020 (UI implemented)
**Validation**: WCAG compliance score ≥ 90

### T028 [P]: Performance regression validation
**File**: `__tests__/performance/enhanced-mode-performance.test.ts`
**Description**: Validate performance targets from research.md:
- Run optimization with 5, 10, 20, 50, 100 paint collections
- Assert p95 response time < 30 seconds for all
- Assert convergence rate > 85%
- Assert Delta E ≤ 2.0 achievement rate > 85% for realistic targets
- Generate performance baseline report
- Add performance monitoring alerts

**Dependencies**: T011 (performance tests written), T012-T016 (optimization implemented)
**Validation**: All performance targets met

### T029 [P]: Update CLAUDE.md with Enhanced Mode context
**File**: `CLAUDE.md`
**Description**: Document Enhanced Mode for future agent sessions:
- Add section: "## Enhanced Accuracy Mode (Feature 007)"
- Document server-side optimization pattern
- Document algorithm auto-selection logic
- Document timeout handling (28s with 2s buffer)
- Document maxDuration=30 Vercel config
- Add common pitfalls (504 errors, timeout handling)
- Keep under 150 lines total per constitution

**Dependencies**: T016 (implementation complete)
**Validation**: Agent context file updated, under 150 lines

### T030: Final integration test across all scenarios
**File**: `__tests__/integration/enhanced-mode-full-suite.test.ts` (NEW)
**Description**: Comprehensive integration test:
- Run all quickstart.md scenarios in sequence
- Verify no regressions in Standard Mode
- Test mode switching (Enhanced → Standard → Enhanced)
- Test error recovery (timeout → retry with Standard)
- Test formula saving to mixing_history table
- Verify Supabase RLS isolation (user paint collections)

**Dependencies**: All Phase 3.3-3.4 tasks complete
**Validation**: Full suite passes, no regressions

---

## Dependencies Graph

```
Setup (T001-T003)
    ↓
Tests Written (T004-T011) [ALL PARALLEL]
    ↓
Core Algorithms (T012, T013) [PARALLEL]
    ↓
Optimizer (T014)
    ↓
Validation & API (T015, T016)
    ↓
UI Integration (T017 → T018 → T019 → T020)
    ↓
Polish & Validation (T021-T030) [MOST PARALLEL]
```

**Sequential Dependencies**:
- T014 requires T012 AND T013 (both algorithms)
- T016 requires T014 AND T015 (optimizer + validation)
- T017-T020 are sequential (same component file)
- T026 requires T017-T020 (UI complete for E2E)

**Parallel Opportunities**:
- T004-T011: All tests can be written simultaneously (different files)
- T012 + T013: Algorithms are independent
- T021-T025, T027-T029: Different test/doc files

---

## Parallel Execution Examples

### Example 1: Write All Tests (Phase 3.2)
```bash
# Run these 8 tasks in parallel (different test files):
Task T004: Contract test POST /api/optimize
Task T005: Integration test Enhanced Mode success
Task T006: Integration test partial result
Task T007: Integration test timeout fallback
Task T008: Integration test minimum paint count
Task T009: E2E Cypress test workflow
Task T010: Accessibility WCAG test
Task T011: Performance regression test
```

### Example 2: Polish Phase (T021-T029)
```bash
# Run these 7 tasks in parallel (different files):
Task T021: Unit tests differential evolution
Task T022: Unit tests TPE hybrid
Task T023: Unit tests optimizer orchestrator
Task T024: Update existing mixing-optimizer tests
Task T027: Accessibility validation
Task T028: Performance validation
Task T029: Update CLAUDE.md context
```

---

## Validation Checklist

**GATE: Verify before marking feature complete**

- [x] All contracts have corresponding tests (T004 covers optimize-api.yaml)
- [x] All entities have model tasks (EnhancedOptimizationRequest, OptimizedPaintFormula, etc. in T003)
- [x] All tests come before implementation (Phase 3.2 before Phase 3.3)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (T004-T011 must fail before T012-T016)
- [x] Constitution principles followed:
  - Principle I: Delta E ≤ 2.0 target (exceeds ≤ 4.0 requirement) ✓
  - Principle III: TDD mandatory (Phase 3.2 before 3.3) ✓
  - Principle IV: Zod validation (T015), TypeScript strict mode ✓
  - Principle V: Performance <30s (T011, T028) ✓
  - Principle VI: Cypress E2E (T009, T026), WCAG (T010, T027) ✓

---

## Estimated Timeline

- **Phase 3.1** (Setup): 0.5 days
- **Phase 3.2** (Tests): 2 days (parallel: T004-T011)
- **Phase 3.3** (Core): 3 days (T012-T016, some parallel)
- **Phase 3.4** (UI Integration): 2 days (T017-T020, sequential)
- **Phase 3.5** (Polish): 1.5 days (T021-T030, mostly parallel)
- **Total**: 9 days (with parallelization: ~7 days actual calendar time)

---

## Success Criteria

✅ All 30 tasks completed
✅ All tests passing (unit, integration, E2E, accessibility, performance)
✅ Delta E ≤ 2.0 achieved for 85%+ of realistic targets
✅ Response time p95 < 30 seconds
✅ No 504 timeout errors (graceful degradation)
✅ WCAG 2.1 AA compliance (Lighthouse ≥ 90)
✅ No regressions in Standard Mode
✅ Convergence rate > 85%

---

**Based on**:
- Spec: `specs/007-enhanced-mode-1/spec.md`
- Plan: `specs/007-enhanced-mode-1/plan.md`
- Research: `specs/007-enhanced-mode-1/research.md`
- Data Model: `specs/007-enhanced-mode-1/data-model.md`
- Contract: `specs/007-enhanced-mode-1/contracts/optimize-api.yaml`
- Quickstart: `specs/007-enhanced-mode-1/quickstart.md`
