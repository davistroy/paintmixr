# Implementation Plan: Bug Fixes from E2E Testing

**Branch**: `006-fix-issues-fix` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/006-fix-issues-fix/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
3. Fill Constitution Check section ✓
4. Evaluate Constitution Check → PASS ✓
5. Execute Phase 0 → research.md ✓
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✓
7. Re-evaluate Constitution Check → PASS ✓
8. Plan Phase 2 → Task generation approach ✓
9. STOP - Ready for /tasks command ✓
```

## Summary
This feature addresses 3 critical bugs identified during comprehensive E2E testing: (1) Enhanced Accuracy Mode returning 401 authentication errors due to incorrect Supabase client usage, (2) missing UX feedback after session save operations, and (3) session card navigation timeouts. The technical approach focuses on fixing authentication client patterns, implementing toast notifications for user feedback, and handling unimplemented feature navigation gracefully. **This is a bug fix feature - no new functionality is added.**

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 15.2.33
**Primary Dependencies**: React 18, @supabase/ssr 0.5.2, Radix UI (shadcn/ui), Zod 3.x
**Storage**: Supabase PostgreSQL with Row Level Security
**Testing**: Cypress E2E, Jest unit tests, accessibility testing
**Target Platform**: Web (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (Next.js frontend + Supabase backend)
**Performance Goals**: Existing targets maintained (≤10s Enhanced Accuracy calculations, 60fps UI)
**Constraints**: No new features added, maintain backward compatibility, preserve existing functionality
**Scale/Scope**: 3 bugs across 3 files (optimize route, SaveForm component, SessionCard component)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: PASS - Bug fixes preserve existing color accuracy standards, no changes to color calculations
**Principle II - Documentation Currency**: PASS - Using existing Supabase SSR documentation, shadcn/ui Toast component docs
**Principle III - Test-First Development**: PASS - E2E tests already exist and identify bugs, will add regression tests
**Principle IV - Type Safety & Validation**: PASS - Maintains TypeScript strict mode, no validation changes needed
**Principle V - Performance & Accessibility**: PASS - Toast notifications meet WCAG 2.1 AA (will verify contrast ratios), no performance impact
**Principle VI - Real-World Testing**: PASS - Bugs discovered via Cypress E2E tests, fixes will be validated with same tests

**Production Standards Compliance**: PASS - Fixes improve UX without compromising security, session management, or offline capabilities

*No constitutional violations - bug fixes align with all principles*

## Project Structure

### Documentation (this feature)
```
specs/006-fix-issues-fix/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (IN PROGRESS)
├── research.md          # Phase 0 output (PENDING)
├── data-model.md        # Phase 1 output (PENDING)
├── quickstart.md        # Phase 1 output (PENDING)
├── contracts/           # Phase 1 output (PENDING)
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
src/
├── app/
│   ├── api/
│   │   └── optimize/
│   │       └── route.ts         # FIX: Change admin client to route client
│   └── auth/
│       └── signin/
│           └── page.tsx         # ENHANCE: Show session expiration message
├── components/
│   ├── session-manager/
│   │   ├── SaveForm.tsx         # FIX: Add toast notifications
│   │   └── SessionCard.tsx      # FIX: Handle unimplemented detail view
│   └── ui/
│       ├── toast.tsx            # NEW: shadcn/ui Toast component
│       ├── toaster.tsx          # NEW: Toast provider/container
│       └── use-toast.ts         # NEW: Toast hook
├── lib/
│   └── supabase/
│       └── route-handler.ts     # REFERENCE: Correct client pattern
└── hooks/
    └── use-color-matching.ts    # FIX: Add retry logic for 401 errors

__tests__/
├── e2e/
│   ├── enhanced-accuracy.cy.ts  # NEW: Regression test for Issue #1
│   ├── session-save-ux.cy.ts    # NEW: Regression test for Issue #2
│   └── session-navigation.cy.ts # NEW: Regression test for Issue #3
└── unit/
    └── toast-messages.test.ts   # NEW: Error message translation tests

cypress/
└── e2e/
    └── bug-fixes-006.cy.ts      # NEW: Combined E2E validation
```

**Structure Decision**: Web application structure with Next.js App Router (existing). Bug fixes target specific API routes and React components. No database schema changes required.

## Phase 0: Outline & Research

### Research Tasks

**R1: Supabase Client Patterns in API Routes**
- **Decision**: Use `createClient()` from `@/lib/supabase/route-handler` in API routes
- **Rationale**: Route handler client accesses session cookies via Next.js `cookies()` API, Admin client does not
- **Pattern**: `const supabase = await createClient()` (async) vs `createAdminClient()` (sync)
- **Reference**: Existing implementation in `/src/lib/supabase/route-handler.ts`

**R2: Toast Notification Library Selection**
- **Decision**: shadcn/ui Toast component (Radix UI Toast primitive)
- **Rationale**: Already using shadcn/ui components, consistent design system, accessible by default
- **Installation**: Add `components/ui/toast.tsx`, `components/ui/toaster.tsx`, `hooks/use-toast.ts`
- **Reference**: https://ui.shadcn.com/docs/components/toast

**R3: Error Message Translation Patterns**
- **Decision**: Centralized error mapping utility with user-friendly messages
- **Rationale**: Consistent UX across all error scenarios, easier to maintain
- **Pattern**: Map HTTP status codes and error types to user messages
- **Example**: `401 → "Session expired. Please sign in again."`

**R4: Session Expiration Handling**
- **Decision**: Redirect to `/auth/signin?reason=session_expired` with toast message
- **Rationale**: Clear user communication, preserves navigation context
- **Pattern**: Check for `reason` query param on signin page, display appropriate message

**R5: Retry Logic for Transient Failures**
- **Decision**: Single automatic retry with 500ms delay for 401 errors
- **Rationale**: Handles transient auth token refresh, doesn't create infinite loops
- **Pattern**: Try-catch with retry counter, redirect on second failure

**Output**: See research.md for detailed findings

## Phase 1: Design & Contracts

### Data Model Changes
**No database schema changes required** - bug fixes only modify client-side behavior and API route authentication.

### API Contract Changes
**No API contract changes** - existing endpoints maintain same signatures, only internal authentication logic changes.

### Component Interface Changes

**SaveForm Component Enhancement**
```typescript
interface SaveFormProps {
  // ... existing props unchanged
  onSave: (sessionData: CreateSessionRequest) => Promise<void>
  onSuccess?: () => void  // NEW: Callback after successful save
}
```

**SessionCard Component Enhancement**
```typescript
interface SessionCardProps {
  // ... existing props unchanged
  onDetailClick?: (sessionId: string) => void  // NEW: Optional detail handler
}
```

### Error Message Mapping

**Error Translation Utility** (`src/lib/errors/user-messages.ts`):
```typescript
export function translateApiError(error: ApiError): string {
  const errorMessages: Record<string, string> = {
    '401': 'Session expired. Please sign in again.',
    '500': 'Unable to complete request. Please try again.',
    'NETWORK_ERROR': 'Connection issue. Please check your internet connection.',
    'TIMEOUT': 'Request timed out. Please try again.',
  }
  return errorMessages[error.code] || 'An unexpected error occurred.'
}
```

### Toast Notification Patterns

**Success Messages**:
- Session saved: "Session saved successfully"
- Session deleted: "Session deleted"
- Paint added: "Paint added to library"

**Error Messages**:
- Auth failure: "Session expired. Please sign in again."
- Network failure: "Connection issue. Please check your internet connection."
- Generic error: "Unable to complete request. Please try again."

**Info Messages**:
- Feature not implemented: "Session details view coming soon"

**Output**: See data-model.md and contracts/ for complete specifications

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Setup Tasks**:
   - Install shadcn/ui Toast component dependencies
   - Create toast UI components and hook
   - Create error translation utility

2. **Bug Fix Tasks** (TDD order):
   - Write E2E test for Enhanced Accuracy Mode (should fail initially)
   - Fix `/api/optimize` route authentication (lines 82, 331)
   - Verify E2E test passes
   - Write E2E test for session save UX feedback
   - Add toast notifications to SaveForm component
   - Add auto-close behavior to save dialog
   - Verify E2E test passes
   - Write E2E test for session card navigation
   - Add session detail placeholder handling
   - Verify E2E test passes

3. **Regression Prevention**:
   - Add unit tests for error message translation
   - Add integration tests for retry logic
   - Update existing E2E tests to verify toast messages appear

**Ordering Strategy**:
- [P] indicates parallel execution (independent files)
- Critical fixes first (Enhanced Accuracy Mode)
- Medium priority second (Session save UX)
- Low priority third (Session navigation)
- Each fix follows TDD: test → implement → verify

**Estimated Output**: 18-22 tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run E2E tests from COMPREHENSIVE_E2E_TEST_REPORT.md, verify all 3 bugs fixed)

## Complexity Tracking
*No constitutional violations - this section is not needed*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 21 tasks created
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no violations)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/api-optimize-route.md (Phase 1)
- [x] contracts/component-saveform.md (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
