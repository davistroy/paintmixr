# Feature 005 Completion Plan
## Comprehensive Codebase Improvement & Technical Debt Resolution

**Generated**: 2025-10-02
**Feature Branch**: 005-use-codebase-analysis
**Total Tasks**: 85
**Status**: Phase 3.1 Complete, Phase 3.2 Sample Tests Complete, Parallel Work In Progress

---

## 1. Executive Summary

### Current State
- **Completed Tasks**: 5 (T001-T005) - 5.9% complete
- **In Progress Tasks**: ~15 (T006-T021, T032-T033, T040) - 17.6% underway
- **Remaining Tasks**: 65 (76.5%)
- **Estimated Remaining Effort**: 120-150 developer hours

### Phase Breakdown
| Phase | Tasks | Status | Effort Remaining |
|-------|-------|--------|------------------|
| 3.1 Setup | 3 | Complete (100%) | 0 hours |
| 3.2 Tests (TDD) | 28 | 2 complete, 13 in progress (54% started) | 30-35 hours |
| 3.3 Core Implementation | 35 | 2 in progress (6% started) | 60-70 hours |
| 3.4 Integration | 7 | Not started | 15-20 hours |
| 3.5 Polish | 12 | Not started | 15-25 hours |

### Critical Success Factors
1. **TDD Discipline**: All Phase 3.2 tests MUST fail before Phase 3.3 implementation begins
2. **Parallel Execution**: 45 tasks marked [P] enable aggressive parallelization
3. **Sequential Dependencies**: 15 blocking tasks require careful ordering
4. **Strict Mode Migration**: Largest effort (10-18 hours across T043-T045)
5. **Code Duplication Reduction**: Second-largest effort (6-8 hours for T065)

### Key Risks
- **Strict mode violations**: May uncover hidden type issues requiring additional fixes
- **Large component refactoring**: EmailSigninForm (542 lines) and PaintMixerWorkspace (687 lines) are complex
- **Test coverage gaps**: May require additional unit tests beyond planned scope
- **E2E test infrastructure**: Cypress setup and seeding 10K users could reveal issues

---

## 2. Critical Path Analysis

### Blocking Tasks (Must Complete Before Others)

**High-Priority Blockers**:

1. **T034 (N+1 Query Fix in Sign-In Route)** - BLOCKS:
   - T053: Update EmailSigninForm UI for rate limiting
   - T068: Add authentication flow unit tests
   - T073: Run performance regression testing
   - **Estimated**: 3-4 hours
   - **Currently In Progress**

2. **T040 (Create Centralized Type Index)** - BLOCKS:
   - T041: Identify and rename duplicate type definitions
   - T042: Migrate all imports to centralized type index
   - T069: Add color science validation tests
   - T070: Add paint mixing optimization tests
   - **Estimated**: 3 hours
   - **Currently In Progress**

3. **T046-T049 (Modern Supabase Clients)** - BLOCKS:
   - T050: Delete legacy Supabase client files
   - T051: Migrate all Supabase client imports (3-4 hours, breaking change)
   - **Estimated**: 3.5 hours total
   - **Status**: Not started, but prerequisite tests (T015) in progress

4. **T054-T057 (Shared Utilities)** - BLOCKS:
   - T058: Migrate components to shared API client (3-4 hours)
   - T059: Migrate forms to shared validation schemas (2-3 hours)
   - T065: Refactor duplicate patterns (6-8 hours, largest single task)
   - **Estimated**: 7 hours total
   - **Status**: Not started, but prerequisite tests (T019-T021) in progress

5. **T060 (Identify Large Components)** - BLOCKS:
   - T061: Refactor EmailSigninForm (<300 lines) - 3 hours
   - T062: Refactor PaintMixerWorkspace (<300 lines) - 4-5 hours
   - T063: Refactor remaining large components - 2-4 hours per component
   - **Estimated**: 1 hour
   - **Status**: Not started

6. **T043-T045 (Strict Mode Fixes)** - BLOCKS:
   - T052: Verify build success with strict mode
   - T076: Verify Next.js 15 build compatibility
   - T084: Final build verification
   - **Estimated**: 13-18 hours total (longest combined effort)
   - **Status**: Not started, but config (T002) complete

### Dependency Chain Visualization

```
SETUP (Complete)
├── T001 → T004, T006, T033 (atomic counter)
├── T002 → T014, T018, T043-T045, T052 (strict mode)
└── T003 → T016, T027, T052 (build config)

TESTS (54% Started)
├── T004-T012 → T034 (auth security tests → implementation)
├── T013 → T040-T042 (type tests → consolidation)
├── T015 → T046-T051 (client tests → migration)
├── T019-T021 → T054-T059, T065 (utilities tests → refactoring)
├── T022-T024 → T060-T066 (quality tests → refactoring)
└── T025-T031 → T067-T073 (coverage/E2E tests → integration)

CORE (6% Started)
├── T032, T033 → T034 (utilities → sign-in route)
├── T034 → T053, T068, T073 (sign-in → UI/tests/perf)
├── T040 → T041 → T042 (type index → rename → migrate)
├── T046-T049 → T050 → T051 (modern clients → delete → migrate)
├── T054-T057 → T058, T059, T065 (shared utils → migrations)
└── T060 → T061, T062, T063 (identify → refactor components)

INTEGRATION (Not Started)
├── T067-T070 → T071 (new tests → coverage report)
└── T071, T072, T073 → T074-T085 (verification → polish)

POLISH (Not Started)
└── T074-T084 → T085 (all polish → final summary)
```

### Recommended Execution Order (Post-Phase 3.2)

**Week 1 Focus** (30-35 hours):
1. T032-T033: Rate limiting and lockout utilities (4 hours) - **In Progress**
2. T034: N+1 query fix in sign-in route (4 hours) - **In Progress**
3. T035-T039: Authentication API endpoints and async searchParams (6 hours)
4. T040: Centralized type index (3 hours) - **In Progress**
5. T041-T042: Type consolidation (4-5 hours)
6. T046-T051: Supabase client migration (8 hours)

**Week 2 Focus** (35-40 hours):
1. T043-T045: TypeScript strict mode fixes (13-18 hours, largest effort)
2. T054-T057: Shared utilities creation (7 hours)
3. T058-T059: Component migration to shared utilities (5-7 hours)
4. T060-T063: Large component refactoring (9-13 hours)

**Week 3 Focus** (30-35 hours):
1. T064-T066: Code duplication reduction (7-9 hours)
2. T052-T053: Build verification and UI updates (3 hours)
3. T067-T073: Integration phase (15-20 hours)

**Week 4 Focus** (20-25 hours):
1. T074-T085: Polish phase (15-25 hours)

---

## 3. Phase-by-Phase Breakdown

### Phase 3.2: Tests First (TDD) - 30-35 Hours Remaining

**Status**: 2 complete (T004-T005), 13 in progress (T006-T021)
**Critical Gate**: ALL 28 tests MUST be written and failing before Phase 3.3

#### Authentication Security Tests (T006-T012) - 11 Hours
- **T006**: Lockout race conditions test (2h) - **In Progress**
- **T007**: OAuth precedence test (1.5h) - **In Progress**
- **T008**: Lockout status API test (1h) - **In Progress**
- **T009**: Rate limit status API test (1h) - **In Progress**
- **T010**: Admin clear lockout API test (1h) - **In Progress**
- **T011**: Next.js 15 async searchParams test (1h) - **In Progress**
- **T012**: Full auth cycle E2E test (2h) - **In Progress**
- **Parallel Opportunity**: All can run simultaneously (different test files)

#### Type Safety & Consolidation Tests (T013-T018) - 7.5 Hours
- **T013**: Centralized type index test (1.5h) - **In Progress**
- **T014**: Strict mode compilation test (1h) - **In Progress**
- **T015**: Supabase client patterns test (1.5h) - **In Progress**
- **T016**: Build enforcement test (0.5h) - **In Progress**
- **T017**: Type safety E2E test (1h) - **In Progress**
- **T018**: Strict mode migration test (1h) - **In Progress**
- **Parallel Opportunity**: All can run simultaneously

#### Code Reuse & Refactoring Tests (T019-T024) - 8 Hours
- **T019**: Shared API client test (1.5h) - **In Progress**
- **T020**: Shared form utilities test (1.5h) - **In Progress**
- **T021**: Shared data fetching hooks test (1.5h) - **In Progress**
- **T022**: Component size verification test (1h)
- **T023**: Code duplication measurement test (1h)
- **T024**: Shared utilities usage test (1h)
- **Parallel Opportunity**: All can run simultaneously

#### Testing & Quality Tests (T025-T031) - 10 Hours
- **T025**: Test coverage critical paths (1h)
- **T026**: Placeholder test conversion (0.5h)
- **T027**: Build performance test (0.5h)
- **T028**: Auth performance at scale E2E test (2h)
- **T029**: Rate limiting load test (2h)
- **T030**: Accessibility WCAG test (1.5h)
- **T031**: Response time baselines test (1.5h)
- **Parallel Opportunity**: All can run simultaneously

**Phase 3.2 Completion Criteria**:
- [ ] All 28 tests written
- [ ] All tests run successfully (MUST FAIL with meaningful errors)
- [ ] Test files committed to repository
- [ ] Verification: `npm test` shows 28 new failing tests

---

### Phase 3.3: Core Implementation - 60-70 Hours Remaining

**Status**: 2 in progress (T032-T033)
**Gate**: Cannot proceed until ALL Phase 3.2 tests are failing

#### Authentication Security Implementation (T032-T039) - 15-17 Hours

**High Priority** (Blocks UI/E2E tests):
- **T032**: Rate limiting utility (2h) - **In Progress**
- **T033**: Lockout metadata helpers (2h) - **In Progress**
- **T034**: N+1 query fix in sign-in route (4h) - **Critical Blocker, In Progress**
- **T035**: Lockout status API endpoint (1h)
- **T036**: Rate limit status API endpoint (1h)
- **T037**: Admin clear lockout API endpoint (1h)

**Medium Priority**:
- **T038**: Update sign-in page for async searchParams (1h)
- **T039**: Update all pages for async searchParams (2h)

**Parallel Opportunity**: T032-T033 can run together, T035-T037 can run together after T034

**Sequential Dependencies**:
- T032, T033 → T034 (utilities must exist before sign-in route)
- T034 → T053, T068, T073 (sign-in route blocks UI update and tests)

#### Type Safety & Consolidation Implementation (T040-T053) - 35-43 Hours

**Critical Blocker - Type System**:
- **T040**: Create centralized type index (3h) - **Critical Blocker, In Progress**
- **T041**: Rename duplicate type definitions (2h) - **Blocked by T040**
- **T042**: Migrate all imports to centralized index (3h) - **Blocked by T041**

**Strict Mode Migration** (Largest Single Effort):
- **T043**: Fix null/undefined checks (8h) - **Blocked by T002 config**
- **T044**: Fix implicit any types (6h) - **Can run parallel with T043**
- **T045**: Fix function types and properties (4h) - **Can run parallel with T043**

**Supabase Client Migration**:
- **T046**: Modern browser client (1h)
- **T047**: Modern server component client (1h)
- **T048**: Modern API route client (1h)
- **T049**: Supabase admin client (0.5h)
- **T050**: Delete legacy clients (0.5h) - **Blocked by T046-T049**
- **T051**: Migrate all client imports (4h) - **Blocked by T050, Breaking Change**

**Verification & UI**:
- **T052**: Verify build success with strict mode (1h) - **Blocked by T043-T045**
- **T053**: Update EmailSigninForm for rate limiting UI (2h) - **Blocked by T034**

**Parallel Opportunities**:
- T046-T049 can all run simultaneously (4 different files)
- T043-T045 can run simultaneously (different violation categories)

**Sequential Dependencies**:
- T040 → T041 → T042 (type index → rename → migrate imports)
- T046-T049 → T050 → T051 (modern clients → delete legacy → migrate)
- T043-T045 → T052 (strict mode fixes → build verification)

**Risk Mitigation**:
- **T043-T045**: Budget +20% time for unexpected strict mode violations
- **T051**: Breaking change - commit atomically, test thoroughly before pushing

#### Code Reuse & Refactoring Implementation (T054-T066) - 25-33 Hours

**Shared Utilities Creation**:
- **T054**: Shared API client utility (2h)
- **T055**: Shared form validation schemas (1.5h)
- **T056**: Shared form hooks (1.5h)
- **T057**: Shared data fetching hooks (2h)

**Migration to Shared Code**:
- **T058**: Migrate components to shared API client (4h) - **Blocked by T054**
- **T059**: Migrate forms to shared schemas (3h) - **Blocked by T055**

**Component Size Reduction**:
- **T060**: Identify large components (1h)
- **T061**: Refactor EmailSigninForm <300 lines (3h) - **Blocked by T060**
- **T062**: Refactor PaintMixerWorkspace <300 lines (5h) - **Blocked by T060**
- **T063**: Refactor remaining large components (4h per component) - **Blocked by T060**

**Code Duplication Reduction** (Second-Largest Effort):
- **T064**: Measure duplication baseline (0.5h)
- **T065**: Refactor duplicate patterns (8h) - **Blocked by T054-T057, Largest Task**
- **T066**: Verify duplication reduction target (0.5h) - **Blocked by T065**

**Parallel Opportunities**:
- T054-T057 can all run simultaneously (different files)
- T061-T062 can run simultaneously (different components)

**Sequential Dependencies**:
- T054-T057 → T058-T059, T065 (shared utilities block migrations)
- T060 → T061-T063 (identification blocks refactoring)
- T064 → T065 → T066 (baseline → refactor → verify)

**Risk Mitigation**:
- **T065**: Largest single task (8h) - break into sub-tasks if jscpd identifies >20 duplicate blocks
- **T061-T062**: Complex components - may uncover hidden dependencies

**Phase 3.3 Completion Criteria**:
- [ ] All 35 core tasks complete
- [ ] All Phase 3.2 tests now PASS
- [ ] `npm run build` succeeds with strict mode enabled
- [ ] No TypeScript errors, no ESLint errors
- [ ] Code duplication reduced to 30-35% (from ~60%)

---

### Phase 3.4: Integration - 15-20 Hours

**Status**: Not started
**Gate**: All Phase 3.3 implementation complete, all tests passing

#### Test Coverage & Quality (T067-T071) - 12-14 Hours

**Placeholder Cleanup**:
- **T067**: Convert placeholder tests to .skip() (3h)

**New Unit Tests for Coverage**:
- **T068**: Authentication flow unit tests (4h)
- **T069**: Color science validation tests (3h)
- **T070**: Paint mixing optimization tests (3h)

**Coverage Verification**:
- **T071**: Run full test suite with coverage (1h)

**Parallel Opportunity**: T068-T070 can run simultaneously

**Target**: 90%+ coverage for src/lib/auth/, src/lib/color/, src/lib/mixing/

#### E2E & Performance Testing (T072-T073) - 3-4 Hours

**E2E Infrastructure**:
- **T072**: Configure and run Cypress E2E tests (2h)
  - Seed 10,000 test users for T028
  - Run T012, T028, T029, T030 scenarios

**Performance Validation**:
- **T073**: Run performance regression testing (1h)
  - Authentication <2 seconds
  - Color calculations <500ms
  - UI interactions at 60fps

**Phase 3.4 Completion Criteria**:
- [ ] All 7 integration tasks complete
- [ ] 90%+ test coverage achieved
- [ ] All Cypress E2E tests passing
- [ ] Performance baselines established
- [ ] No placeholder tests remain active

---

### Phase 3.5: Polish - 15-25 Hours

**Status**: Not started
**Gate**: All integration tests passing, coverage targets met

#### Documentation & Quality (T074-T085) - 15-25 Hours

**Accessibility & Compatibility**:
- **T075**: Accessibility audit with axe-core (2h)
- **T076**: Verify Next.js 15 build compatibility (1h)
- **T083**: Verify performance budget with Lighthouse (1h)

**End-to-End Validation**:
- **T077**: Run all 13 quickstart scenarios (6h) - **Most Time-Intensive Polish Task**

**Documentation Updates**:
- **T078**: Update project documentation (3h)
- **T079**: Create database migration documentation (1h)

**Code Quality**:
- **T080**: Remove unused dependencies (1h)
- **T081**: Run ESLint and fix warnings (2h)
- **T082**: Run Prettier formatting (0.5h)

**Final Verification**:
- **T084**: Final build verification (1h)
- **T085**: Create feature summary report (2h)

**Parallel Opportunities**:
- T075, T078, T079, T080, T081, T082, T083, T085 can all run simultaneously

**Sequential Dependencies**:
- T077 (all scenarios) → T084 (final verification) - **Final Gate**

**Phase 3.5 Completion Criteria**:
- [ ] All 12 polish tasks complete
- [ ] All 13 quickstart scenarios pass
- [ ] 90%+ Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- [ ] 0 ESLint warnings
- [ ] Documentation current and accurate
- [ ] Feature summary report published

---

## 4. Resource Allocation Strategy

### Recommended Parallel Agent Configuration

**Phase 3.2 (Tests)**: **4-6 parallel agents**
- Agent 1: Authentication tests (T006-T012) - 7 tests
- Agent 2: Type safety tests (T013-T018) - 6 tests
- Agent 3: Code reuse tests (T019-T024) - 6 tests
- Agent 4: Quality tests (T025-T031) - 7 tests
- **Rationale**: All tests independent, different files, no shared state

**Phase 3.3 (Core)**: **3-4 parallel agents**

**Batch 1** (Week 1 - Auth & Types):
- Agent 1: T032-T034 (rate limiting, lockout, sign-in route) - 8 hours
- Agent 2: T040-T042 (type consolidation) - 8 hours
- Agent 3: T035-T039 (auth API endpoints, searchParams) - 6 hours
- Agent 4: T046-T049 (modern Supabase clients) - 3.5 hours

**Batch 2** (Week 2 - Strict Mode & Shared Utils):
- Agent 1: T043 (null/undefined checks) - 8 hours
- Agent 2: T044 (implicit any types) - 6 hours
- Agent 3: T045 (function types) - 4 hours
- Agent 4: T054-T057 (shared utilities) - 7 hours

**Batch 3** (Week 2-3 - Migrations & Refactoring):
- Agent 1: T050-T051 (Supabase client migration) - 4.5 hours - **Breaking Change, Sequential**
- Agent 2: T058-T059 (component migrations) - 7 hours
- Agent 3: T061 (EmailSigninForm refactor) - 3 hours
- Agent 4: T062 (PaintMixerWorkspace refactor) - 5 hours

**Phase 3.4 (Integration)**: **2-3 parallel agents**
- Agent 1: T068 (auth unit tests) - 4 hours
- Agent 2: T069-T070 (color/mixing tests) - 6 hours
- Agent 3: T067, T072-T073 (cleanup, E2E, performance) - 6 hours

**Phase 3.5 (Polish)**: **4-6 parallel agents**
- Agent 1: T077 (all scenarios validation) - 6 hours - **Sequential, Final Gate**
- Agent 2-6: T075, T078-T083, T085 (all other polish tasks) - **Run together**

### Task Batching for Efficiency

**High-Value Batches** (Complete Together for Incremental Progress):

1. **Authentication Security Complete** (T032-T039): 17 hours
   - Enables T053 (UI update), T068 (unit tests), T072 (E2E tests)

2. **Type System Consolidation** (T040-T042): 8 hours
   - Enables T069-T070 (color/mixing tests), reduces import churn

3. **Strict Mode Migration** (T043-T045, T052): 19 hours
   - Enables T076 (Next.js 15), T084 (final build), closes largest risk

4. **Shared Utilities + Migration** (T054-T059): 14 hours
   - Enables T065 (duplication reduction, 8 hours)

5. **Component Size Reduction** (T060-T063): 13 hours
   - Achieves FR-030 (components <300 lines)

### Automation vs. Manual Work

**Suitable for Automation**:
- T022, T023: Component size and duplication measurement (scripted with find/wc/jscpd)
- T082: Prettier formatting (npm script)
- T081: ESLint auto-fixes (npm run lint -- --fix)
- T071: Coverage reports (npm test -- --coverage)

**Requires Manual Review**:
- T043-T045: Strict mode fixes (context-specific type annotations)
- T061-T063: Component refactoring (architectural decisions)
- T065: Duplicate pattern refactoring (identify logical units)
- T077: Quickstart scenario validation (end-to-end manual testing)

**Hybrid Approach**:
- T041: Rename duplicates (AST search + manual rename decisions)
- T051: Supabase import migration (grep search + manual context fixes)
- T067: Placeholder test conversion (grep search + manual .skip() additions)

---

## 5. Risk Mitigation

### High-Risk Tasks (Require Extra Time/Validation)

#### Risk 1: Strict Mode Violations (T043-T045)
**Estimated**: 13-18 hours | **Buffer**: +20% (3-4 hours)
**Likelihood**: High | **Impact**: High (blocks build)

**Mitigations**:
1. Run `npm run build` incrementally after each fix category
2. Fix one file completely before moving to next
3. Use `@ts-expect-error` only for third-party issues (document with comments)
4. Test at component boundaries after fixes
5. Commit frequently (every 10 fixes) to enable rollback

**Indicators of Trouble**:
- Violations in >50 files (may indicate systemic issue)
- Circular type dependencies
- Third-party library incompatibilities with strict mode

#### Risk 2: Large Component Refactoring (T061-T062)
**Estimated**: 8 hours | **Buffer**: +30% (2-3 hours)
**Likelihood**: Medium | **Impact**: Medium (UI regressions)

**Mitigations**:
1. Write component tests BEFORE refactoring (snapshot tests)
2. Extract one sub-component at a time, test incrementally
3. Keep props interfaces identical during extraction
4. Use feature flags if refactoring introduces instability
5. Validate UI rendering after each extraction

**Indicators of Trouble**:
- State management becomes unclear (prop drilling >3 levels deep)
- Extracted components have >10 props
- Tests fail after extraction

#### Risk 3: Supabase Client Migration (T051)
**Estimated**: 4 hours | **Buffer**: +25% (1 hour)
**Likelihood**: Medium | **Impact**: Critical (breaking change)

**Mitigations**:
1. Create feature branch specifically for this migration
2. Run full test suite after migration (npm test)
3. Test authentication flow manually in dev environment
4. Deploy to staging before merging to main
5. Document rollback procedure (keep legacy clients in git history)

**Indicators of Trouble**:
- Session management breaks (cookies not set)
- RLS policies fail (incorrect client context)
- Server components throw "createClient is not a function"

#### Risk 4: Code Duplication Reduction (T065)
**Estimated**: 8 hours | **Buffer**: +25% (2 hours)
**Likelihood**: Medium | **Impact**: Medium (may introduce bugs)

**Mitigations**:
1. Capture jscpd baseline before starting (T064)
2. Refactor one duplicate block at a time
3. Run tests after each refactoring (incremental validation)
4. Avoid over-abstraction (DRY vs. WET trade-offs)
5. Focus on high-frequency duplicates first (>5 occurrences)

**Indicators of Trouble**:
- Shared utilities have >8 parameters (over-abstraction)
- Tests fail after extraction (logic differences in duplicates)
- Duplication reduction <30% after 6 hours (unrealistic target)

#### Risk 5: E2E Test Infrastructure (T072)
**Estimated**: 2 hours | **Buffer**: +50% (1 hour)
**Likelihood**: Medium | **Impact**: High (blocks validation)

**Mitigations**:
1. Test Cypress installation in isolated environment first
2. Seed test users in staging database, not production
3. Use database transactions for test cleanup
4. Configure CI/CD to run E2E tests in parallel
5. Mock external services (email, payment) for E2E tests

**Indicators of Trouble**:
- Cypress fails to launch (Chrome/Electron issues)
- Database seeding takes >5 minutes for 10K users
- E2E tests flaky (timing-dependent failures)

### Checkpoint Strategy

**Checkpoint 1: Phase 3.2 Complete** (After T031)
- Validation: All 28 tests written and failing
- Gate: Do NOT proceed to Phase 3.3 until ALL tests fail with meaningful errors
- Estimated: After 30-35 hours of test writing

**Checkpoint 2: Authentication Complete** (After T039)
- Validation: T004-T012 tests now passing, E2E auth flow works
- Gate: Sign-in route optimized (<2s at 10K users), rate limiting/lockout functional
- Estimated: After 15-17 hours of Phase 3.3

**Checkpoint 3: Type System Stable** (After T052)
- Validation: `npm run build` succeeds with strict mode, T013-T018 tests passing
- Gate: No TypeScript errors, no ESLint errors, types consolidated
- Estimated: After 43 hours of Phase 3.3

**Checkpoint 4: Code Quality Targets** (After T066)
- Validation: Components <300 lines, duplication 30-35%, shared utilities used
- Gate: T022-T024 tests passing, jscpd report shows 40-50% reduction
- Estimated: After 60-70 hours of Phase 3.3

**Checkpoint 5: Integration Tests Passing** (After T073)
- Validation: 90%+ coverage, E2E tests passing, performance baselines met
- Gate: T025, T028-T031 tests passing, Cypress suite green
- Estimated: After 15-20 hours of Phase 3.4

**Checkpoint 6: Production Ready** (After T084)
- Validation: All 13 quickstart scenarios pass, Lighthouse ≥90, final build succeeds
- Gate: ALL 85 tasks marked [X], T077 validated manually
- Estimated: After 15-25 hours of Phase 3.5

### Testing Strategy Throughout

**Unit Testing** (Continuous):
- Run `npm test -- --watch` during development
- Commit only when related tests pass
- Aim for 1 test per 10 lines of code

**Integration Testing** (Per Checkpoint):
- Run full suite: `npm test` (not --watch)
- Verify coverage: `npm test -- --coverage`
- Check for test leaks (shared state between tests)

**E2E Testing** (Phase 3.4):
- Cypress open: `npx cypress open` (development)
- Cypress run: `npx cypress run` (CI/CD)
- Test in staging environment (not local)

**Performance Testing** (Phase 3.4, 3.5):
- Artillery load tests: `artillery run artillery-auth-load.yml`
- Lighthouse audits: `npx lighthouse http://localhost:3000`
- Performance monitoring: Capture baselines in T031, validate in T073

---

## 6. Success Criteria

### Feature-Level Success (ALL Must Be True)

- [ ] **All 85 tasks marked [X] in tasks.md**
- [ ] **All tests passing**: `npm test` exits 0, no skipped tests (except documented TODOs)
- [ ] **Build succeeds with strict mode**: `npm run build` exits 0, TypeScript strict mode enabled
- [ ] **90%+ test coverage**: Critical paths (auth, color, mixing) ≥90% line/branch/function coverage
- [ ] **Zero ESLint warnings**: `npm run lint` exits 0
- [ ] **Performance targets met**:
  - Authentication <2 seconds at 10,000 user scale
  - Color calculations <500ms
  - UI interactions at 60fps (16.67ms per frame)
- [ ] **Code quality targets met**:
  - All components <300 lines
  - Code duplication reduced to 30-35% (from ~60%)
  - 50% reduction in duplicate blocks (<75 blocks, from ~150)
- [ ] **Accessibility compliance**: 90%+ WCAG 2.1 AA (axe-core automated scan)
- [ ] **All 13 quickstart scenarios validated manually**
- [ ] **Lighthouse scores ≥90**: Performance, Accessibility, Best Practices, SEO
- [ ] **Next.js 15 compatibility**: Application runs without errors on Next.js 15
- [ ] **Documentation updated**: README.md, CLAUDE.md reflect all changes

### Phase-Level Success Criteria

**Phase 3.1 (Setup)**: ✅ COMPLETE
- [X] PostgreSQL atomic counter function deployed
- [X] TypeScript strict mode configured
- [X] Next.js build configuration enforces errors

**Phase 3.2 (Tests)**:
- [ ] 28 tests written (T004-T031)
- [ ] All tests failing with meaningful error messages
- [ ] No false positives (tests that always pass)
- [ ] Test files committed to repository

**Phase 3.3 (Core Implementation)**:
- [ ] 35 core tasks complete (T032-T066)
- [ ] ALL Phase 3.2 tests now passing
- [ ] `npm run build` succeeds
- [ ] No TypeScript/ESLint errors
- [ ] Code quality metrics achieved

**Phase 3.4 (Integration)**:
- [ ] 7 integration tasks complete (T067-T073)
- [ ] 90%+ test coverage achieved
- [ ] All Cypress E2E tests passing
- [ ] Performance baselines established

**Phase 3.5 (Polish)**:
- [ ] 12 polish tasks complete (T074-T085)
- [ ] All quickstart scenarios pass
- [ ] Lighthouse scores ≥90
- [ ] Feature summary report published

### Anti-Goals (DO NOT DO)

- ❌ Skip tests or write tests after implementation (violates TDD)
- ❌ Use `@ts-ignore` instead of `@ts-expect-error` (hides errors)
- ❌ Suppress strict mode errors without documentation
- ❌ Create new components when refactoring would suffice
- ❌ Over-abstract shared utilities (DRY to a fault)
- ❌ Commit broken builds (test before commit)
- ❌ Merge to main without passing CI/CD
- ❌ Deploy to production without staging validation

---

## 7. Appendix: Quick Reference

### Key File Paths

**Configuration**:
- `/home/davistroy/dev/paintmixr/tsconfig.json` (strict mode)
- `/home/davistroy/dev/paintmixr/next.config.js` (build enforcement)
- `/home/davistroy/dev/paintmixr/package.json` (dependencies)

**Type Definitions**:
- `/home/davistroy/dev/paintmixr/src/lib/types/index.ts` (centralized types)

**Authentication**:
- `/home/davistroy/dev/paintmixr/src/app/api/auth/email-signin/route.ts` (sign-in route)
- `/home/davistroy/dev/paintmixr/src/lib/auth/rate-limit.ts` (rate limiting)
- `/home/davistroy/dev/paintmixr/src/lib/auth/metadata-helpers.ts` (lockout helpers)

**Supabase Clients**:
- `/home/davistroy/dev/paintmixr/src/lib/supabase/client.ts` (browser)
- `/home/davistroy/dev/paintmixr/src/lib/supabase/server.ts` (server components)
- `/home/davistroy/dev/paintmixr/src/lib/supabase/route-handler.ts` (API routes)
- `/home/davistroy/dev/paintmixr/src/lib/supabase/admin.ts` (admin operations)

**Shared Utilities**:
- `/home/davistroy/dev/paintmixr/src/lib/api/client.ts` (API client)
- `/home/davistroy/dev/paintmixr/src/lib/forms/schemas.ts` (Zod schemas)
- `/home/davistroy/dev/paintmixr/src/lib/forms/useFormErrors.ts` (form hooks)
- `/home/davistroy/dev/paintmixr/src/lib/hooks/usePagination.ts` (data hooks)

**Database**:
- `/home/davistroy/dev/paintmixr/supabase/migrations/20251002_atomic_lockout_counter.sql`

**Tests**:
- `/home/davistroy/dev/paintmixr/__tests__/contract/` (contract tests)
- `/home/davistroy/dev/paintmixr/__tests__/integration/` (integration tests)
- `/home/davistroy/dev/paintmixr/__tests__/unit/` (unit tests)
- `/home/davistroy/dev/paintmixr/cypress/e2e/` (E2E tests)

### Useful Commands

**Development**:
```bash
npm run dev                    # Start development server
npm run build                  # Production build (verify strict mode)
npm test                       # Run all tests
npm test -- --watch            # Watch mode for development
npm test -- --coverage         # Coverage report
npm run lint                   # ESLint check
npm run lint -- --fix          # Auto-fix ESLint issues
npx prettier --write "src/**/*.{ts,tsx}"  # Format code
```

**Testing**:
```bash
npm test -- __tests__/contract/  # Run contract tests only
npm test -- __tests__/integration/  # Run integration tests only
npx cypress open               # Open Cypress UI
npx cypress run                # Run Cypress headless
artillery run artillery-auth-load.yml  # Load test
npx lighthouse http://localhost:3000 --view  # Performance audit
```

**Code Analysis**:
```bash
jscpd src/ --output=./reports/jscpd-baseline  # Duplication baseline
jscpd src/ --output=./reports/jscpd-final     # Final duplication
find src/components/ -name "*.tsx" -exec wc -l {} \;  # Component sizes
grep -r "fetch(" src/components/  # Find direct fetch calls
grep -r "interface ColorValue" src/  # Find duplicate types
```

**Database**:
```bash
npx supabase migration new atomic_lockout_counter  # Create migration
npx supabase db push  # Apply migrations
npx supabase db reset  # Reset database (staging only)
```

### Task ID Quick Lookup

**Setup**: T001-T003 (Complete)
**Tests**: T004-T031 (2 complete, 13 in progress)
**Core**: T032-T066 (2 in progress)
**Integration**: T067-T073 (Not started)
**Polish**: T074-T085 (Not started)

**Critical Blockers**:
- T034: N+1 query fix (blocks T053, T068, T073)
- T040: Type index (blocks T041, T042)
- T043-T045: Strict mode (blocks T052, T076, T084)
- T054-T057: Shared utilities (blocks T058, T059, T065)

**Highest Effort**:
- T043: Null/undefined checks (8h)
- T065: Duplication refactoring (8h)
- T044: Implicit any types (6h)
- T077: Quickstart scenarios (6h)
- T062: PaintMixerWorkspace refactor (5h)

---

**End of Completion Plan**
**Total Estimated Remaining Effort**: 120-150 hours
**Recommended Timeline**: 3-4 weeks with 3-6 parallel agents
**Next Action**: Complete Phase 3.2 tests (T006-T031) before proceeding to Phase 3.3
