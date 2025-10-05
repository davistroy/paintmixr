# Tasks: Production Bug Fixes & Testing Validation

**Input**: Design documents from `/specs/008-cleanup-using-the/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: Next.js 15, TypeScript 5.x, React 18+, Shadcn/ui
2. Load optional design documents:
   → ✅ data-model.md: 5 client-side state models
   → ✅ contracts/: 2 files (volume-validation.schema.ts, component-interfaces.ts)
   → ✅ research.md: 7 technical patterns
   → ✅ quickstart.md: 19 manual test scenarios
3. Generate tasks by category:
   → Setup: verification only (no new dependencies)
   → Tests: validation schemas, component behavior, integration
   → Core: bug fixes (checkbox, dialog, input tracking)
   → Integration: end-to-end validation workflows
   → Polish: manual testing, accessibility, performance
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T031)
6. Dependencies: Setup → Tests → Fixes → Validation → Polish
7. Parallel execution: 15 test tasks [P], 8 implementation tasks [P]
8. Validation: ✅ All contracts tested, TDD order enforced
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Source code**: `src/` at repository root
- **Tests**: `__tests__/` for Jest, `cypress/e2e/` for E2E
- **Contracts**: Zod schemas in `src/lib/forms/schemas.ts`

---

## Phase 3.1: Setup & Verification
- [x] **T001** Verify shadcn/ui Toast component installed (check `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`, `src/hooks/use-toast.ts` exist)
- [x] **T002** Verify React Hook Form + Zod dependencies in `package.json` (react-hook-form ≥7.0, zod ≥3.0, @hookform/resolvers)
- [x] **T003** Verify existing session schema includes `input_method` and `mode` fields (check `src/lib/types/index.ts`)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Validation Schema Tests
- [x] **T004** [P] Unit test for `paintVolumeSchema` in `__tests__/lib/forms/volume-validation.test.ts`
  - Test valid volumes: 5ml, 100ml, 1000ml
  - Test invalid volumes: 4ml, 1001ml, -10ml, 0ml
  - Test error messages match spec: "Paint volume must be between 5ml and 1000ml"

- [x] **T005** [P] Unit test for `ratioPredictionSchema` in `__tests__/lib/forms/volume-validation.test.ts`
  - Test valid: 2 paints, 5 paints
  - Test invalid: 1 paint, 6 paints
  - Test error messages for paint count constraints

### Component Behavior Tests
- [x] **T006** [P] Component test for Enhanced Mode checkbox toggle in `__tests__/components/EnhancedModeCheckbox.test.tsx`
  - Test checkbox toggles between checked/unchecked states
  - Test `onCheckedChange` callback receives boolean value
  - Test checkbox disabled when `isCalculating = true`
  - Test checkbox enabled when `isCalculating = false`

- [ ] **T007** [P] Component test for SaveSessionDialog in `__tests__/components/SaveSessionDialog.test.tsx`
  - Test dialog opens when `open = true`
  - Test dialog closes when save succeeds (calls `onOpenChange(false)`)
  - Test dialog remains open when save fails
  - Test save button disabled during submission (`isSubmitting = true`)
  - Test toast notification shown on success
  - Test save button disabled when `calculationResult === null` (failed/timed out calculations per FR-003f)

- [ ] **T008** [P] Component test for input method tracking in `__tests__/components/InputMethodButtons.test.tsx`
  - Test switching to Hex Code clears Color Picker state
  - Test switching to Color Picker clears Hex Code state
  - Test switching clears calculation results
  - Test `inputMethod` state updates correctly

- [ ] **T009** [P] Component test for RatioPredictionForm validation in `__tests__/components/RatioPredictionForm.test.tsx`
  - Test "Predict" button disabled with <2 paints
  - Test "Predict" button enabled with ≥2 paints
  - Test volume validation on submit (5ml-1000ml range)
  - Test error display for invalid volumes

- [ ] **T010** [P] Component test for Delta E warning in `__tests__/components/DeltaEWarning.test.tsx`
  - Test warning appears when Delta E > 5.0
  - Test warning hidden when Delta E ≤ 5.0
  - Test warning is non-dismissible (no close button)
  - Test "Manage Paint Collection" link opens modal

### Integration Tests
- [ ] **T011** [P] Integration test for session save workflow in `__tests__/integration/session-save.test.tsx`
  - Test complete flow: calculate → save → dialog close → toast display
  - Test failure handling: network error → dialog stays open → error displayed
  - Test concurrent save prevention (double-click protection)

- [ ] **T012** [P] Integration test for input method end-to-end in `__tests__/integration/input-method-tracking.test.tsx`
  - Test Hex Code input → calculate → save → verify session.input_method = 'hex_code'
  - Test Color Picker → calculate → save → verify session.input_method = 'color_picker'
  - Test input clearing on method switch

- [ ] **T013** [P] Integration test for Standard Mode end-to-end in `__tests__/integration/standard-mode.test.tsx`
  - Test uncheck Enhanced Mode → calculate → verify formula ≤3 paints
  - Test save session → verify session.mode = 'Standard'
  - Test calculation timeout <10s

- [ ] **T014** [P] Integration test for Ratio Prediction end-to-end in `__tests__/integration/ratio-prediction.test.tsx`
  - Test 2-5 paint volume prediction
  - Test volume validation blocks calculation
  - Test predicted color LAB + hex values displayed

### Accessibility & Performance Tests
- [ ] **T015** [P] Accessibility test for toast notifications in `__tests__/accessibility/toast.test.ts`
  - Test ARIA role="status" for success toasts
  - Test ARIA role="alert" for error toasts
  - Test keyboard dismissible (ESC key)
  - Test color contrast ≥ 4.5:1 (WCAG 2.1 AA)

- [ ] **T016** [P] Performance test for checkbox toggle in `__tests__/performance/checkbox.test.ts`
  - Test checkbox state update <100ms (NFR-005)
  - Test no visible lag or UI freeze

- [ ] **T017** [P] Performance test for session save in `__tests__/performance/session-save.test.ts`
  - Test POST /api/sessions completes <3s (NFR-003)
  - Test toast auto-dismiss after 3s (NFR-004)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Bug Fix: Enhanced Mode Checkbox Toggle (FR-001, FR-001a, FR-002)
- [ ] **T018** Fix Enhanced Mode checkbox binding in `src/app/page.tsx`
  - Add `onCheckedChange` handler (replace incorrect `onChange` if present)
  - Bind to `enhancedMode` state
  - Handle `checked` boolean value (ignore 'indeterminate')

- [ ] **T019** Disable checkbox during calculation in `src/app/page.tsx`
  - Add `disabled={isCalculating}` prop to Checkbox component
  - Set `isCalculating = true` when calculation starts
  - Set `isCalculating = false` when calculation completes or fails

### Bug Fix: Session Save Dialog Close (FR-003, FR-004)
- [ ] **T020** Add dialog close on save success in SaveSessionDialog component
  - Import `useToast` hook from `@/hooks/use-toast`
  - Call `onOpenChange(false)` after successful POST /api/sessions
  - Show toast: `{ title: "Session saved successfully", variant: "success", duration: 3000 }`

- [ ] **T021** Handle save failure correctly in SaveSessionDialog component
  - Keep dialog open on network error or 4xx/5xx response
  - Display error message in dialog (use existing error state)
  - Allow user to retry manually (no automatic retry per FR-003c)

- [ ] **T022** Prevent concurrent saves in SaveSessionDialog component
  - Use React Hook Form's `formState.isSubmitting` to disable save button
  - Add loading text: "Saving..." when `isSubmitting = true`
  - Prevent multiple POST requests via button disabled state

### Bug Fix: Input Method Tracking (FR-005, FR-006)
- [ ] **T023** Fix input method state clearing in `src/app/page.tsx`
  - When switching to Hex Code: clear `selectedColor`, `uploadedImage`, `calculationResult`
  - When switching to Color Picker: clear `hexInput`, `uploadedImage`, `calculationResult`
  - When switching to Image Upload: clear `hexInput`, `selectedColor`, `calculationResult`

- [ ] **T024** Verify session metadata includes input method in SaveSessionDialog component
  - Check `sessionData.inputMethod` is set before enabling save button
  - Ensure POST /api/sessions payload includes `input_method` field
  - Verify `mode` field also included ('Standard' | 'Enhanced' | 'Ratio Prediction')

### Enhancement: Volume Validation (FR-012d, FR-012e, FR-012f)
- [ ] **T025** [P] Create volume validation schema in `src/lib/forms/schemas.ts`
  - Copy `paintVolumeSchema` from contracts/volume-validation.schema.ts
  - Copy `ratioPredictionSchema` from contracts/volume-validation.schema.ts
  - Export types: `PaintSelection`, `RatioPredictionForm`

- [ ] **T026** Implement volume validation in RatioPredictionForm component
  - Integrate React Hook Form with Zod resolver
  - Validate on "Predict Resulting Color" button click (not real-time per Q17)
  - Display error messages below volume inputs (per FR-012f message text)

- [ ] **T027** Implement paint count constraints in RatioPredictionForm component
  - Disable "Predict" button when `paints.length < 2` (FR-012c)
  - Validate maximum 5 paints (FR-012b)
  - Show validation error if constraints violated

### Enhancement: Delta E Accuracy Warning (FR-016, FR-017, FR-018)
- [ ] **T028** [P] Implement Delta E warning component
  - Create `<DeltaEWarning>` component using shadcn/ui Alert
  - Show when `calculationResult.deltaE > 5.0`
  - Display message: "Low accuracy due to limited paint collection. More variety improves matching."
  - Make non-dismissible (no close button per FR-016a)

- [ ] **T029** [P] Add paint management modal stub in `src/components/PaintManagementModal.tsx`
  - Create modal dialog overlay using shadcn/ui Dialog component (not navigation per FR-018a)
  - Triggered by "Manage Paint Collection" link in Delta E warning
  - Display placeholder content:
    * Heading: "Paint Collection Management"
    * Body text: "Paint management features coming soon. You can expand your paint collection to improve color matching accuracy."
    * Close button with accessible label
  - Basic styling: centered modal, neutral background, consistent with existing UI
  - Full paint CRUD implementation out of scope for this feature

### Enhancement: Timeout & Retry Logic (NFR-001a, NFR-002a)
- [ ] **T030** [P] Create timeout retry wrapper in `src/lib/api/fetch-with-retry.ts`
  - Implement `fetchWithTimeout()` using AbortController
  - Single automatic retry on timeout (retryCount max 1)
  - Enhanced Mode timeout: 30s (NFR-001)
  - Standard Mode timeout: 10s (NFR-002)
  - Log retries to browser console (NFR-001c, NFR-006)

- [ ] **T031** Integrate timeout retry in calculation calls
  - Replace direct `fetch()` calls with `fetchWithTimeout()` in Enhanced Mode
  - Replace direct `fetch()` calls with `fetchWithTimeout()` in Standard Mode
  - Show error message on 2nd failure: "Calculation timed out after 2 attempts. Please try a different color or mode."

---

## Phase 3.4: Integration & Validation

### Manual Testing (from quickstart.md)
- [ ] **T032** Execute Phase 1 manual tests (8 critical scenarios)
  - Test 1.1: Enhanced Mode checkbox toggle
  - Test 1.2: Checkbox disabled during calculation
  - Test 1.3: Session save dialog close
  - Test 1.4: Session save failure handling
  - Test 1.5: Concurrent save prevention
  - Test 1.6: Input method tracking - Hex Code
  - Test 1.7: Input method tracking - Color Picker
  - Test 1.8: Input clearing on method switch

- [ ] **T033** Execute Phase 2 manual tests (5 validation scenarios)
  - Test 2.1: Standard Mode end-to-end
  - Test 2.2: Ratio Prediction minimum paints
  - Test 2.3: Ratio Prediction maximum paints
  - Test 2.4: Volume validation - invalid low
  - Test 2.5: Volume validation - invalid high

- [ ] **T034** Execute Phase 3 manual tests (2 enhancement scenarios)
  - Test 3.1: Delta E accuracy warning
  - Test 3.2: Paint management modal

### Regression Testing
- [ ] **T035** Regression test: Enhanced Mode still works
  - Test calculation with Enhanced Mode produces ≤5 paint formula
  - Test Delta E target ≤2.0
  - Test session save works correctly

- [ ] **T036** Regression test: Session History still works
  - Navigate to Session History page
  - Verify all saved sessions visible
  - Verify session details display correctly

- [ ] **T037** Regression test: Image Upload UI still works
  - Click Image Upload button
  - Verify file upload UI renders
  - Verify no console errors

---

## Phase 3.5: Polish & E2E Tests (Phase 4 - Post-Deployment)

### Code Quality
- [ ] **T038** [P] Remove code duplication from bug fixes
  - Extract common state clearing logic into helper function
  - Extract toast notification patterns into reusable hook
  - Extract validation error display into shared component

- [ ] **T039** [P] Update component documentation
  - Add JSDoc comments to EnhancedModeCheckbox props
  - Add JSDoc comments to SaveSessionDialog props
  - Add JSDoc comments to RatioPredictionForm props

### E2E Tests (Cypress - Deferred per FR-021)
- [ ] **T040** [P] E2E test for Enhanced Mode toggle in `cypress/e2e/enhanced-mode-toggle.cy.ts`
  - Test checkbox toggle behavior
  - Test checkbox disabled during calculation
  - Test mode description updates

- [ ] **T041** [P] E2E test for session save dialog in `cypress/e2e/session-save-dialog.cy.ts`
  - Test dialog close on success
  - Test dialog stays open on failure
  - Test toast notification appears

- [ ] **T042** [P] E2E test for input method tracking in `cypress/e2e/input-method-tracking.cy.ts`
  - Test all 3 input methods (Hex Code, Color Picker, Image Upload)
  - Test input clearing on method switch
  - Test session metadata records correct input_method

### Performance Validation
- [ ] **T043** Run Lighthouse audit on production deployment
  - Verify Performance score ≥90
  - Verify Accessibility score ≥90 (WCAG 2.1 AA)
  - Verify no regressions from bug fixes

- [ ] **T044** Verify browser console logging (NFR-006)
  - Test timeout errors logged to console
  - Test network errors logged to console
  - Verify no server-side logging infrastructure used

---

## Dependencies

### Sequential Dependencies (must complete in order)
```
Setup (T001-T003)
  ↓
Tests (T004-T017) ← MUST FAIL before implementation
  ↓
Core Fixes (T018-T024)
  ↓
Enhancements (T025-T031)
  ↓
Integration Testing (T032-T037)
  ↓
Polish (T038-T039)
  ↓
E2E Tests (T040-T042) ← Post-deployment
  ↓
Performance (T043-T044)
```

### Within-Phase Dependencies
- **T004-T017**: All tests can run in parallel [P] (different files)
- **T018-T019**: Sequential (same file: `src/app/page.tsx`)
- **T020-T022**: Sequential (same component file)
- **T023-T024**: Sequential (same file: `src/app/page.tsx`)
- **T025-T027**: T025 must complete before T026-T027 (schema dependency)
- **T028-T029**: Parallel [P] (different components)
- **T030-T031**: T030 must complete before T031 (utility dependency)
- **T032-T037**: Sequential (manual testing workflow)
- **T038-T039**: Parallel [P] (different files)
- **T040-T042**: Parallel [P] (different E2E test files)
- **T043-T044**: Sequential (performance audit then logging verification)

---

## Parallel Execution Examples

### Launch All Test Tasks Together (T004-T017)
```bash
# 14 test files can run in parallel - different files, no dependencies
Task: "Unit test paintVolumeSchema in __tests__/lib/forms/volume-validation.test.ts"
Task: "Unit test ratioPredictionSchema in __tests__/lib/forms/volume-validation.test.ts"
Task: "Component test EnhancedModeCheckbox in __tests__/components/EnhancedModeCheckbox.test.tsx"
Task: "Component test SaveSessionDialog in __tests__/components/SaveSessionDialog.test.tsx"
Task: "Component test InputMethodButtons in __tests__/components/InputMethodButtons.test.tsx"
Task: "Component test RatioPredictionForm in __tests__/components/RatioPredictionForm.test.tsx"
Task: "Component test DeltaEWarning in __tests__/components/DeltaEWarning.test.tsx"
Task: "Integration test session save workflow in __tests__/integration/session-save.test.tsx"
Task: "Integration test input method tracking in __tests__/integration/input-method-tracking.test.tsx"
Task: "Integration test Standard Mode in __tests__/integration/standard-mode.test.tsx"
Task: "Integration test Ratio Prediction in __tests__/integration/ratio-prediction.test.tsx"
Task: "Accessibility test toast in __tests__/accessibility/toast.test.ts"
Task: "Performance test checkbox in __tests__/performance/checkbox.test.ts"
Task: "Performance test session save in __tests__/performance/session-save.test.ts"
```

### Launch Enhancement Tasks Together (T028-T030)
```bash
# 3 enhancement tasks - different files
Task: "Implement Delta E warning component"
Task: "Add paint management modal stub"
Task: "Create timeout retry wrapper in src/lib/api/fetch-with-retry.ts"
```

### Launch E2E Tests Together (T040-T042)
```bash
# Post-deployment E2E tests
Task: "E2E test enhanced-mode-toggle in cypress/e2e/enhanced-mode-toggle.cy.ts"
Task: "E2E test session-save-dialog in cypress/e2e/session-save-dialog.cy.ts"
Task: "E2E test input-method-tracking in cypress/e2e/input-method-tracking.cy.ts"
```

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to run in parallel
- **TDD Enforcement**: Tests T004-T017 MUST fail before implementing T018-T031
- **Manual Testing**: T032-T037 follow quickstart.md test scenarios exactly
- **E2E Deferral**: T040-T042 can be deferred post-deployment per FR-021
- **Commit Strategy**: Commit after completing each phase (Setup, Tests, Fixes, etc.)
- **File Conflicts**: Tasks without [P] modify same file (e.g., T018-T019 both modify `src/app/page.tsx`)

---

## Task Generation Rules Applied

1. **From Contracts**:
   - `volume-validation.schema.ts` → T004, T005 (unit tests)
   - `component-interfaces.ts` → T006-T010 (component tests)

2. **From Data Model**:
   - 5 state models → T006-T010 (state behavior tests)
   - Session metadata → T024 (verification task)

3. **From Quickstart Scenarios**:
   - 19 manual test scenarios → T032-T034 (manual testing tasks)
   - 3 regression scenarios → T035-T037 (regression tasks)

4. **From Research Findings**:
   - Toast pattern → T020 (implementation)
   - Checkbox pattern → T018 (fix)
   - Retry pattern → T030-T031 (enhancement)

---

## Validation Checklist
*GATE: Checked before execution*

- [x] All contracts have corresponding tests (T004-T005, T006-T010)
- [x] All state models have behavior tests (T006-T010)
- [x] All tests come before implementation (T004-T017 before T018-T031)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD order enforced: Tests → Fixes → Validation → Polish
- [x] All 19 quickstart scenarios covered in manual tests (T032-T034)
- [x] All 3 critical bugs have fix tasks (T018-T024)
- [x] All enhancements have implementation tasks (T025-T031)

---

**Total Tasks**: 44
**Parallel Test Tasks**: 14 (T004-T017)
**Parallel Enhancement Tasks**: 3 (T028, T029, T030)
**Parallel E2E Tasks**: 3 (T040-T042)
**Manual Testing Tasks**: 6 (T032-T037)
**Sequential Implementation**: 13 (T018-T024, T026-T027, T031)

**Estimated Timeline**:
- Phase 3.1 (Setup): 15 minutes
- Phase 3.2 (Tests): 3-4 hours (parallel execution)
- Phase 3.3 (Implementation): 4-6 hours
- Phase 3.4 (Manual Testing): 2-3 hours
- Phase 3.5 (Polish + E2E): 2-3 hours (E2E post-deployment)
- **Total**: 12-16 hours (excluding E2E deferral)
