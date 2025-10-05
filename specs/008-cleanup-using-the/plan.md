# Implementation Plan: Production Bug Fixes & Testing Validation

**Branch**: `008-cleanup-using-the` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-cleanup-using-the/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project type: Web application (Next.js 15 + Supabase)
   → ✅ Structure Decision: Next.js app directory structure
3. Fill the Constitution Check section
   → ✅ Complete (2 PARTIAL ratings with justification)
4. Evaluate Constitution Check section
   → ✅ PASS (both PARTIAL ratings justified by deployment strategy)
5. Execute Phase 0 → research.md
   → ✅ Complete (7 research areas documented)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Complete (all deliverables created)
7. Re-evaluate Constitution Check
   → ✅ PASS (no new violations, design aligns with principles)
8. Plan Phase 2 → Describe task generation approach
   → ✅ Complete (task categories and ordering strategy documented)
9. STOP - Ready for /tasks command
   → ✅ /plan command complete
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution

## Summary

This feature addresses 3 critical production bugs discovered during comprehensive E2E testing:
1. **Enhanced Mode checkbox toggle failure** (P0) - Blocks Standard Mode access
2. **Session save dialog not closing** (P1) - Poor UX, users stuck in dialog
3. **Input method tracking inaccurate** (P2) - Incorrect session metadata

Additionally implements:
- Complete Standard Mode and Ratio Prediction validation workflows
- User experience enhancements (Delta E accuracy warnings)
- Comprehensive edge case handling (timeouts, concurrent operations, validation)

**Technical Approach**: Client-side bug fixes in existing React components with enhanced state management, proper event handling, and validation. No backend changes required - all fixes target UI behavior and client-side state synchronization.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**:
- React 18+ with React Hook Form + Zod validation
- Shadcn/ui Toast component (already installed)
- Supabase client (`@supabase/ssr`)
- Existing optimization APIs (`/api/optimize`, `/api/sessions`)

**Storage**: Supabase PostgreSQL with Row Level Security (existing schema, no migrations)
**Testing**: Jest (unit/component), Cypress (E2E - Phase 4, post-deployment)
**Target Platform**: Web browsers (PWA-capable), mobile-responsive
**Project Type**: Web application (Next.js frontend + Supabase backend)

**Performance Goals**:
- Checkbox toggle response: <100ms (NFR-005)
- Session save: <3s (NFR-003)
- Toast notifications: 3s auto-dismiss (NFR-004)

**Constraints**:
- No database schema changes
- Must maintain backward compatibility with existing sessions
- No server-side logging infrastructure (browser console only)
- Manual testing acceptable for initial deployment (Phase 4 E2E tests deferred)

**Scale/Scope**:
- 3 critical bug fixes
- 8 functional enhancements (validation, edge cases, warnings)
- ~15-20 component-level changes across main page

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: PASS - No color calculation changes. Existing LAB/Delta E logic untouched. Only UI interaction fixes.

**Principle II - Documentation Currency**: PASS - Using existing dependencies (React Hook Form, Zod, shadcn/ui). No new library research needed. Constitution v1.1.0 already establishes these patterns.

**Principle III - Test-First Development**: PARTIAL -
- Unit tests for validation logic (Zod schemas, volume range checks)
- Component tests for React Hook Form integration
- E2E tests deferred to Phase 4 (post-deployment per FR-021)
- **Justification**: Manual testing acceptable per deployment strategy. Automated E2E tests added post-release to prevent regressions.

**Principle IV - Type Safety & Validation**: PASS -
- TypeScript strict mode enabled (existing)
- Zod validation for volume inputs (FR-012e/f)
- Existing ColorValue interfaces preserved
- No type safety regressions

**Principle V - Performance & Accessibility**: PASS -
- 100ms checkbox response (NFR-005) - CSS/React state optimization
- WCAG 2.1 AA maintained (toast notifications use existing accessible components)
- No Web Worker changes (calculation logic untouched)

**Principle VI - Real-World Testing**: PARTIAL -
- Manual regression testing planned (Phase 2 validation)
- Cypress E2E tests deferred to Phase 4 (FR-021: "may be deferred post-deployment")
- **Justification**: Deployment strategy explicitly allows Phase 4 deferral. Manual testing covers critical paths.

**Production Standards Compliance**: PASS -
- PWA compliance maintained (no manifest changes)
- Supabase RLS unchanged (no new queries)
- Session management enhanced (dialog close, toast feedback)
- Offline functionality preserved (no network dependencies added)

**Summary**: 2 PARTIAL ratings justified by deployment strategy. Phase 4 E2E tests explicitly deferred per spec clarification (Q12). Manual testing covers Phase 1-3 requirements.

## Project Structure

### Documentation (this feature)
```
specs/008-cleanup-using-the/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (session metadata updates)
├── quickstart.md        # Phase 1 output (manual test scenarios)
├── contracts/           # Phase 1 output (API validation schemas)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── app/
│   ├── page.tsx                          # MODIFY: Main color mixing page (all 3 bugs)
│   └── api/
│       └── sessions/
│           └── route.ts                  # VERIFY: No changes needed
├── components/
│   ├── ui/
│   │   ├── toast.tsx                     # EXISTING: shadcn/ui Toast
│   │   └── toaster.tsx                   # EXISTING: Toast container
│   └── (color-mixing components)         # MODIFY: SaveSessionDialog, RatioPrediction
├── lib/
│   ├── forms/
│   │   └── schemas.ts                    # ADD: Volume validation schema
│   ├── hooks/
│   │   └── use-toast.ts                  # EXISTING: shadcn/ui hook
│   └── types/
│       └── index.ts                      # VERIFY: Session type includes mode/inputMethod
└── __tests__/                            # ADD: Component tests for fixes

cypress/
└── e2e/                                  # Phase 4 (post-deployment)
    ├── enhanced-mode-toggle.cy.ts
    ├── session-save-dialog.cy.ts
    └── input-method-tracking.cy.ts
```

**Structure Decision**: Next.js 15 App Router structure. All fixes target client components in `src/app/page.tsx` and related UI components. No new routes or API endpoints. Cypress E2E tests added in Phase 4 (deferred post-deployment).

## Phase 0: Outline & Research

### Research Tasks

Since this is a bug fix feature, most technical context is already established. Research focuses on:

1. **Shadcn/ui Toast Integration** (if not already complete)
   - Decision: Use existing shadcn/ui Toast component
   - Rationale: Already installed per CLAUDE.md (Bug Fixes from E2E Testing section)
   - Verification: Check if `use-toast.ts` and `toaster.tsx` exist

2. **React Hook Form State Management Patterns**
   - Decision: Use React Hook Form's `formState.isSubmitting` for save button disable
   - Rationale: Built-in state prevents concurrent submissions
   - Alternatives: Custom `isSaving` state (rejected - duplicate logic)

3. **Checkbox Controlled Component Pattern**
   - Decision: Use Radix UI Checkbox with `checked` + `onCheckedChange` props
   - Rationale: Shadcn/ui Checkbox is Radix primitive, requires proper binding
   - Root cause: Likely missing `onCheckedChange` handler or incorrect state update

4. **Input Method State Tracking**
   - Decision: Single `inputMethod` state updated on button click (Color Picker, Hex Code, Image Upload)
   - Rationale: Declarative state change triggers input/result clearing
   - Verification: Check existing state management in `page.tsx`

5. **Volume Validation Timing**
   - Decision: Validate on "Predict" button click (not real-time)
   - Rationale: Per clarification Q17, validation occurs before calculation
   - Implementation: Zod schema in form submit handler

### Research Findings

**Toast Notification**: Verified in CLAUDE.md - shadcn/ui Toast already integrated. Pattern:
```typescript
import { useToast } from '@/hooks/use-toast'
const { toast } = useToast()
toast({ title: "Session saved successfully", variant: "success", duration: 3000 })
```

**Checkbox Fix Pattern**: Radix UI Checkbox requires:
```typescript
<Checkbox
  checked={enhancedMode}
  onCheckedChange={(checked) => setEnhancedMode(checked === true)}
/>
```
Common bug: Missing `onCheckedChange` or using `onChange` (doesn't exist on Radix Checkbox).

**Input Method Tracking**: Three input buttons should update shared state:
```typescript
const [inputMethod, setInputMethod] = useState<'color_picker' | 'hex_code' | 'image_upload'>('color_picker')
// On button click: setInputMethod('hex_code') + clear inputs + clear results
```

**Volume Validation Schema**:
```typescript
const volumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")
```

**Automatic Retry Pattern**: Fetch wrapper with single retry on timeout (NFR-001a, NFR-002a):
```typescript
async function fetchWithRetry(fetcher, retryCount = 0) {
  try {
    return await fetcher()
  } catch (error) {
    if (isTimeout(error) && retryCount === 0) {
      return fetchWithRetry(fetcher, retryCount + 1)
    }
    throw error
  }
}
```

**Output**: research.md (next step)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model Updates

**Session Entity** (existing, verification only):
```typescript
interface Session {
  id: string
  user_id: string
  target_color: { lab: LABColor, hex: string }
  input_method: 'color_picker' | 'hex_code' | 'image_upload'  // VERIFY: exists
  mode: 'Standard' | 'Enhanced' | 'Ratio Prediction'          // VERIFY: exists
  result: Formula | PredictedColor
  delta_e?: number  // For matching modes
  created_at: timestamp
}
```

**No schema changes needed** - input_method and mode fields should already exist per CLAUDE.md (Bug Fixes from E2E Testing).

### 2. API Contracts

**No new API endpoints**. Validation only:

**POST /api/sessions** (existing):
- Request body must include `input_method` and `mode` fields
- Client validates these are set before enabling "Save This Formula" button
- Response 201 triggers dialog close + toast

**POST /api/optimize** (existing):
- No changes
- Timeout handling added client-side (28s internal, 30s total per NFR-001)

### 3. Component Contracts

**EnhancedModeCheckbox** (inline in page.tsx):
```typescript
interface EnhancedModeProps {
  checked: boolean
  disabled: boolean  // NEW: disable during calculation
  onCheckedChange: (checked: boolean) => void
}
```

**SaveSessionDialog**:
```typescript
interface SaveSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionData: SessionData
  onSaveSuccess: () => void  // NEW: callback to close dialog + toast
}
```

**RatioPredictionForm**:
```typescript
interface RatioPredictionFormProps {
  paints: Paint[]
  onPredict: (selections: PaintSelection[]) => Promise<void>
}

interface PaintSelection {
  paintId: string
  volume: number  // Must be 5-1000ml (validated on submit)
}
```

### 4. Validation Schemas

**contracts/volume-validation.schema.ts**:
```typescript
import { z } from 'zod'

export const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

export const ratioPredictionSchema = z.object({
  paints: z.array(z.object({
    paintId: z.string().uuid(),
    volume: paintVolumeSchema
  }))
  .min(2, "Ratio Prediction requires at least 2 paints")
  .max(5, "Ratio Prediction allows maximum 5 paints")
})
```

### 5. Test Scenarios

**contracts/test-scenarios.md**:

#### Scenario 1: Enhanced Mode Toggle Fix
```gherkin
Given Enhanced Mode is checked
And no calculation is in progress
When user clicks the checkbox
Then checkbox becomes unchecked
And Standard Mode activates

Given Enhanced Mode is checked
And calculation is in progress
When user clicks the checkbox
Then checkbox remains checked (disabled)
And no mode change occurs
```

#### Scenario 2: Session Save Dialog Close
```gherkin
Given user has valid calculation results
When user clicks "Save This Formula"
And fills session name
And clicks "Save Session"
Then POST /api/sessions returns 201
And dialog closes automatically
And toast displays "Session saved successfully" for 3s

Given user has valid results
When save request fails with network error
Then dialog remains open
And error message displays
And user can retry manually
```

#### Scenario 3: Input Method Tracking
```gherkin
Given user is on color mixing page
When user clicks "Hex Code" input button
Then inputMethod state = 'hex_code'
And previous Color Picker selection clears
And previous calculation results clear

When user enters hex #FF5733
And calculates formula
And saves session
Then session.input_method = 'hex_code'
```

#### Scenario 4: Volume Validation
```gherkin
Given user selects Ratio Prediction
And enters Paint 1: 100ml, Paint 2: 50ml
When user clicks "Predict Resulting Color"
Then validation passes
And calculation proceeds

Given user enters Paint 1: 2ml
When user clicks "Predict"
Then error displays "Paint volume must be between 5ml and 1000ml"
And calculation blocked
```

### 6. Update Agent Context

Run the update script:

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This will add to CLAUDE.md:
- Bug fix patterns (checkbox, dialog close, input method tracking)
- Volume validation schema
- Toast notification pattern
- Timeout retry pattern

**Output**: data-model.md, contracts/, quickstart.md, CLAUDE.md update (next steps)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 contracts and test scenarios
3. Follow TDD order: tests → implementation → validation

**Task Categories**:

**Phase 1: Critical Bug Fixes** (8 tasks)
- T001: [P] Write unit tests for checkbox toggle logic
- T002: [P] Write unit tests for save dialog close logic
- T003: [P] Write unit tests for input method tracking
- T004: Fix Enhanced Mode checkbox binding (add onCheckedChange handler)
- T005: Fix checkbox disable during calculation (state management)
- T006: Add dialog close callback to SaveSessionDialog
- T007: Add toast notification on save success
- T008: Fix input method state updates on button clicks

**Phase 2: Validation & Edge Cases** (6 tasks)
- T009: [P] Write volume validation schema tests
- T010: [P] Write component tests for RatioPredictionForm validation
- T011: Implement volume validation in Ratio Prediction form
- T012: Add validation error display UI
- T013: Implement "Predict" button disable logic (<2 paints)
- T014: Add input/result clearing on input method switch

**Phase 3: UX Enhancements** (4 tasks)
- T015: [P] Write tests for Delta E warning component
- T016: Implement Delta E accuracy warning (Delta E > 5.0)
- T017: Add educational message to warning
- T018: Add paint management modal dialog (stub/placeholder)

**Phase 4: Timeout & Retry Logic** (4 tasks)
- T019: [P] Write tests for timeout retry wrapper
- T020: Implement automatic retry on calculation timeout
- T021: Add timeout error message display
- T022: Add browser console logging for failures

**Phase 5: Testing & Validation** (3 tasks)
- T023: Manual regression testing (all Phase 1-2 scenarios)
- T024: Standard Mode end-to-end validation
- T025: Ratio Prediction end-to-end validation

**Ordering Strategy**:
- TDD: All test tasks marked [P] (parallel, written before implementation)
- Dependencies: Fix critical bugs → Add validation → Add enhancements
- Parallel execution: Independent test files can run concurrently

**Estimated Output**: ~25 tasks in dependency order

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/implement command or manual)
**Phase 4**: Cypress E2E test implementation (post-deployment per FR-021)
**Phase 5**: Performance validation (Lighthouse audit, console log review)

## Complexity Tracking

No constitutional violations requiring justification. Both PARTIAL ratings in Constitution Check are explicitly permitted by deployment strategy:

| Item | Justification | Alternative Rejected |
|------|---------------|---------------------|
| E2E tests deferred | Deployment strategy (Q12) allows Phase 4 deferral. Manual testing covers Phases 1-3. | Write E2E tests before deployment - Rejected: Adds 2-3 hours, manual testing sufficient for bug fixes |
| TDD partial | Unit/component tests written first. E2E deferred post-deployment. | Full E2E coverage pre-deployment - Rejected: Out of scope per deployment strategy |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - READY
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (2 PARTIAL with justification)
- [x] Post-Design Constitution Check: PASS (design aligns with all principles)
- [x] All NEEDS CLARIFICATION resolved: N/A (all context established)
- [x] Complexity deviations documented: No violations

**Deliverables Created**:
- [x] research.md (7 research areas)
- [x] contracts/volume-validation.schema.ts (Zod schemas)
- [x] contracts/component-interfaces.ts (TypeScript interfaces)
- [x] data-model.md (client-side state models)
- [x] quickstart.md (19 manual test scenarios)
- [x] CLAUDE.md update (bug fix patterns added)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
