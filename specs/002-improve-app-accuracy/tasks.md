# Tasks: Enhanced Color Accuracy Optimization

**Input**: Design documents from `/specs/002-improve-app-accuracy/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow
```
1. Load plan.md from feature directory ✓
   → Extract: TypeScript 5.x, Next.js 15+, Supabase, Radix UI, Tailwind CSS
2. Load optional design documents ✓:
   → data-model.md: EnhancedMixingFormula, PrecisionVolumeCalculation, AccuracyOptimizationEngine
   → contracts/: color-optimization-api.yaml → contract tests
   → research.md: Differential Evolution + TPE hybrid optimization
   → quickstart.md: 5 test scenarios for validation
3. Generate tasks by category ✓
4. Apply task rules ✓
5. Number tasks sequentially (T001, T002...) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Project Structure (from plan.md)
- **Single Next.js application** with app router
- **Frontend/Backend**: Integrated in Next.js API routes
- **Testing**: Jest, Cypress E2E, React Testing Library
- **Performance**: Web Workers for <500ms calculations

## Phase 3.1: Setup
- [x] T001 Initialize enhanced color accuracy project dependencies (Differential Evolution libs, enhanced color science packages)
- [x] T002 Configure TypeScript 5.x strict mode with enhanced color mixing types
- [x] T003 [P] Configure linting rules for Web Worker and color calculation modules

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (from contracts/color-optimization-api.yaml)
- [x] T004 [P] Contract test POST /api/v1/color/optimize in __tests__/contract/color-optimize-post.test.ts
- [x] T005 [P] Contract test POST /api/v1/color/optimize/compare in __tests__/contract/color-compare-post.test.ts
- [x] T006 [P] Contract test GET /api/v1/formulas/{id} in __tests__/contract/formulas-get.test.ts
- [x] T007 [P] Contract test GET /api/v1/formulas/{id}/precision-calculation in __tests__/contract/precision-calculation-get.test.ts
- [x] T008 [P] Contract test POST /api/v1/color/validate-accuracy in __tests__/contract/validate-accuracy-post.test.ts

### Integration Tests (from quickstart.md scenarios)
- [x] T009 [P] Integration test professional artist workflow (Scenario 1) in __tests__/integration/professional-artist-workflow.test.ts
- [x] T010 [P] Integration test commercial paint shop workflow (Scenario 2) in __tests__/integration/commercial-paint-shop.test.ts
- [x] T011 [P] Integration test impossible color target handling (Scenario 3) in __tests__/integration/impossible-color-target.test.ts
- [x] T012 [P] Integration test volume constraint conflicts (Scenario 4) in __tests__/integration/volume-constraint-conflicts.test.ts
- [x] T013 [P] Integration test performance regression prevention (Scenario 5) in __tests__/integration/performance-regression.test.ts

### Performance & E2E Tests
- [x] T014 [P] Performance test color optimization <500ms in __tests__/performance/color-optimization.test.ts
- [x] T015 [P] E2E test enhanced accuracy workflow in cypress/e2e/enhanced-accuracy.cy.ts
- [x] T016 [P] Accessibility test WCAG 2.1 AA compliance in __tests__/accessibility/enhanced-mixing-ui.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Enhanced Types & Interfaces (from data-model.md)
- [ ] T017 [P] Enhanced mixing types in src/types/mixing.ts (EnhancedMixingFormula, PaintComponent, VolumeConstraints)
- [ ] T018 [P] Precision calculation types in src/types/precision.ts (PrecisionVolumeCalculation, MeasuredComponent)
- [ ] T019 [P] Optimization engine types in src/types/optimization.ts (AccuracyOptimizationEngine, OptimizationMethod)

### Enhanced Color Science Library
- [ ] T020 [P] Enhanced LAB color utilities in src/lib/color-science/lab-enhanced.ts
- [ ] T021 [P] Kubelka-Munk coefficients with surface corrections in src/lib/color-science/kubelka-munk-enhanced.ts
- [ ] T022 [P] CIEDE2000 Delta E calculations in src/lib/color-science/delta-e-ciede2000.ts

### Optimization Algorithms
- [ ] T023 [P] Differential Evolution optimizer in src/lib/mixing-optimization/differential-evolution.ts
- [ ] T024 [P] TPE hybrid refinement in src/lib/mixing-optimization/tpe-hybrid.ts
- [ ] T025 [P] Constraint handling utilities in src/lib/mixing-optimization/constraints.ts

### Web Worker Implementation
- [ ] T026 Web Worker for color optimization in src/workers/color-optimization.ts
- [ ] T027 Web Worker message handling and fallback in src/lib/mixing-optimization/worker-manager.ts

### Database Models & Supabase Integration
- [ ] T028 [P] Enhanced mixing formula model in src/lib/supabase/enhanced-mixing-formula.ts
- [ ] T029 [P] Precision volume calculation model in src/lib/supabase/precision-volume-calculation.ts
- [ ] T030 [P] Enhanced paint color model in src/lib/supabase/enhanced-paint-color.ts
- [ ] T031 [P] Optimization engine model in src/lib/supabase/accuracy-optimization-engine.ts

### API Route Implementations (from contracts/)
- [ ] T032 POST /api/v1/color/optimize endpoint in src/app/api/v1/color/optimize/route.ts
- [ ] T033 POST /api/v1/color/optimize/compare endpoint in src/app/api/v1/color/optimize/compare/route.ts
- [ ] T034 GET /api/v1/formulas/[id] endpoint in src/app/api/v1/formulas/[id]/route.ts
- [ ] T035 GET /api/v1/formulas/[id]/precision-calculation endpoint in src/app/api/v1/formulas/[id]/precision-calculation/route.ts
- [ ] T036 POST /api/v1/color/validate-accuracy endpoint in src/app/api/v1/color/validate-accuracy/route.ts

## Phase 3.4: Enhanced UI Components

### Enhanced Mixing Calculator Components
- [ ] T037 [P] Enhanced color input with LAB values in src/components/mixing-calculator/enhanced-color-input.tsx
- [ ] T038 [P] Accuracy target selector (≤2.0 vs ≤4.0 Delta E) in src/components/mixing-calculator/accuracy-target-selector.tsx
- [ ] T039 [P] Volume constraints input with validation in src/components/mixing-calculator/volume-constraints-input.tsx
- [ ] T040 [P] Asymmetric mixing results display in src/components/mixing-calculator/asymmetric-results-display.tsx

### Accuracy Visualization Components
- [ ] T041 [P] Delta E comparison chart in src/components/color-display/delta-e-comparison.tsx
- [ ] T042 [P] Precision volume calculator in src/components/color-display/precision-volume-display.tsx
- [ ] T043 [P] Accuracy tier indicator (excellent/good/acceptable) in src/components/color-display/accuracy-tier-badge.tsx

### Enhanced Mixing Calculator Integration
- [ ] T044 Enhanced mixing calculator page in src/app/mixing-calculator/enhanced/page.tsx
- [ ] T045 Optimization progress indicator with Web Worker status in src/components/mixing-calculator/optimization-progress.tsx

## Phase 3.5: Database Migrations & Schema Updates

### Supabase Schema Extensions
- [ ] T046 [P] Enhanced mixing formula table migration in supabase/migrations/add_enhanced_mixing_formulas.sql
- [ ] T047 [P] Precision volume calculation table migration in supabase/migrations/add_precision_calculations.sql
- [ ] T048 [P] Enhanced paint color coefficients migration in supabase/migrations/add_enhanced_paint_coefficients.sql
- [ ] T049 [P] Optimization engine tracking table migration in supabase/migrations/add_optimization_engine.sql

### RLS Policies & Security
- [ ] T050 [P] RLS policies for enhanced formulas in supabase/migrations/rls_enhanced_formulas.sql
- [ ] T051 [P] Performance indexes for accuracy queries in supabase/migrations/indexes_accuracy_optimization.sql

## Phase 3.6: Integration & Polish
- [ ] T052 Connect enhanced optimization to existing paint collection service
- [ ] T053 Implement accuracy comparison middleware for backward compatibility
- [ ] T054 Add performance monitoring and metrics collection
- [ ] T055 Configure error handling and graceful fallbacks for optimization failures

## Phase 3.7: Validation & Final Testing
- [ ] T056 [P] Unit tests for Differential Evolution algorithm in __tests__/unit/differential-evolution.test.ts
- [ ] T057 [P] Unit tests for TPE hybrid refinement in __tests__/unit/tpe-hybrid.test.ts
- [ ] T058 [P] Unit tests for enhanced Kubelka-Munk calculations in __tests__/unit/kubelka-munk-enhanced.test.ts
- [ ] T059 [P] Update API documentation with enhanced accuracy endpoints
- [ ] T060 Run complete E2E test validation from quickstart scenarios
- [ ] T061 Verify WCAG 2.1 AA accessibility compliance with automated testing
- [ ] T062 Performance regression validation with <500ms calculation benchmarks

## Dependencies
```
Setup (T001-T003) → Tests (T004-T016) → Core Implementation (T017-T036)
                                      → UI Components (T037-T045)
                                      → Database (T046-T051)
                                      → Integration (T052-T055)
                                      → Final Validation (T056-T062)

Key Blocking Relationships:
- T017-T019 (types) must complete before T020-T025, T028-T031
- T020-T025 (color science) must complete before T026-T027 (Web Workers)
- T026-T027 (Web Workers) must complete before T032-T036 (API endpoints)
- T028-T031 (models) must complete before T046-T051 (migrations)
- T032-T036 (API) must complete before T037-T045 (UI components)
- All core implementation before T052-T055 (integration)
```

## Parallel Execution Examples

### Launch contract tests (T004-T008) together:
```
Task: "Contract test POST /api/v1/color/optimize in __tests__/contract/color-optimize-post.test.ts"
Task: "Contract test POST /api/v1/color/optimize/compare in __tests__/contract/color-compare-post.test.ts"
Task: "Contract test GET /api/v1/formulas/{id} in __tests__/contract/formulas-get.test.ts"
Task: "Contract test GET /api/v1/formulas/{id}/precision-calculation in __tests__/contract/precision-calculation-get.test.ts"
Task: "Contract test POST /api/v1/color/validate-accuracy in __tests__/contract/validate-accuracy-post.test.ts"
```

### Launch integration tests (T009-T013) together:
```
Task: "Integration test professional artist workflow (Scenario 1) in __tests__/integration/professional-artist-workflow.test.ts"
Task: "Integration test commercial paint shop workflow (Scenario 2) in __tests__/integration/commercial-paint-shop.test.ts"
Task: "Integration test impossible color target handling (Scenario 3) in __tests__/integration/impossible-color-target.test.ts"
Task: "Integration test volume constraint conflicts (Scenario 4) in __tests__/integration/volume-constraint-conflicts.test.ts"
Task: "Integration test performance regression prevention (Scenario 5) in __tests__/integration/performance-regression.test.ts"
```

### Launch type definitions (T017-T019) together:
```
Task: "Enhanced mixing types in src/types/mixing.ts (EnhancedMixingFormula, PaintComponent, VolumeConstraints)"
Task: "Precision calculation types in src/types/precision.ts (PrecisionVolumeCalculation, MeasuredComponent)"
Task: "Optimization engine types in src/types/optimization.ts (AccuracyOptimizationEngine, OptimizationMethod)"
```

## Notes
- [P] tasks = different files, no dependencies between them
- **Critical**: Verify all tests fail before starting implementation (T017+)
- **Performance**: Maintain <500ms calculation requirement throughout
- **Accuracy**: Target Delta E ≤ 2.0 with fallback to ≤ 4.0
- **Compatibility**: Maintain backward compatibility with existing mixing formulas
- **Commit after each task completion** for incremental progress tracking

## Validation Checklist
**GATE: All items must be ✓ before tasks are considered complete**

- [x] All contract endpoints (5) have corresponding tests (T004-T008)
- [x] All data model entities (3) have model creation tasks (T028-T031)
- [x] All quickstart scenarios (5) have integration tests (T009-T013)
- [x] All tests come before implementation (T004-T016 before T017+)
- [x] Parallel tasks are truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path for implementation
- [x] No task modifies same file as another [P] task
- [x] Performance requirements addressed (<500ms calculations, 60fps UI)
- [x] Accessibility requirements included (WCAG 2.1 AA compliance)
- [x] Constitutional principles followed (TDD, type safety, real-world testing)

---
*Tasks generated: 2025-09-29*
*Ready for /implement command execution*