# Implementation Tasks: Bug Fixes from E2E Testing

**Feature**: 006-fix-issues-fix
**Branch**: `006-fix-issues-fix`
**Date**: 2025-10-03
**Total Tasks**: 21

---

## Task Overview

This feature fixes 3 critical bugs identified in E2E testing:
1. Enhanced Accuracy Mode 401 authentication error (HIGH priority)
2. Session save UX feedback missing (MEDIUM priority)
3. Session card navigation timeout (LOW priority)

**Execution Strategy**: TDD approach - write tests first, then implement fixes, then verify.

---

## Phase 1: Setup & Dependencies

### T001: Install shadcn/ui Toast Component
**Priority**: HIGH
**Parallel**: No (modifies package.json)
**Dependencies**: None

**Task**:
```bash
npx shadcn@latest add toast
```

**Expected Output**:
- `/src/components/ui/toast.tsx` created
- `/src/components/ui/toaster.tsx` created
- `/src/hooks/use-toast.ts` created
- Updated `package.json` with `@radix-ui/react-toast` dependency

**Verification**:
```bash
# Verify files created
ls -la src/components/ui/toast.tsx
ls -la src/components/ui/toaster.tsx
ls -la src/hooks/use-toast.ts

# Verify TypeScript compiles
npm run build
```

---

### T002: Add Toaster to Root Layout
**Priority**: HIGH
**Parallel**: No (depends on T001)
**Dependencies**: T001
**Files Modified**: `/src/app/layout.tsx`

**Task**:
Add `<Toaster />` component to root layout to enable toast notifications globally.

**Implementation**:
```typescript
// src/app/layout.tsx
import { Toaster } from '@/components/ui/toaster'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />  {/* ADD THIS LINE */}
      </body>
    </html>
  )
}
```

**Verification**:
- No TypeScript errors
- `npm run build` succeeds
- Dev server runs without errors

---

### T003: Create Error Message Translation Utility [P]
**Priority**: HIGH
**Parallel**: Yes (new file, no dependencies)
**Dependencies**: None
**Files Created**: `/src/lib/errors/user-messages.ts`

**Task**:
Create centralized error message translation utility to convert HTTP status codes and error types to user-friendly messages.

**Implementation**:
```typescript
// src/lib/errors/user-messages.ts

export interface ApiError {
  status?: number
  code?: string
  message?: string
}

export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please sign in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  429: 'Too many requests. Please try again later.',
  500: 'Unable to complete request. Please try again.',
  503: 'Service temporarily unavailable. Please try again later.',
}

export const NAMED_ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Connection issue. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
}

export function translateApiError(error: ApiError): string {
  // HTTP status code mapping
  if (error.status) {
    return HTTP_STATUS_MESSAGES[error.status] || 'An unexpected error occurred.'
  }

  // Named error codes
  if (error.code) {
    return NAMED_ERROR_MESSAGES[error.code] || 'An unexpected error occurred.'
  }

  // Fallback to provided message or generic
  return error.message || 'An unexpected error occurred.'
}
```

**Verification**:
- TypeScript compiles without errors
- File exports `translateApiError` function
- All constants properly typed

---

## Phase 2: Tests (TDD - Write Before Implementation)

### T004: Write E2E Test for Enhanced Accuracy Mode [P]
**Priority**: HIGH (Critical fix)
**Parallel**: Yes (new test file)
**Dependencies**: None
**Files Created**: `/cypress/e2e/enhanced-accuracy-mode-fix.cy.ts`

**Task**:
Write Cypress E2E test to verify Enhanced Accuracy Mode works for authenticated users (should fail initially, pass after fix).

**Implementation**:
```typescript
// cypress/e2e/enhanced-accuracy-mode-fix.cy.ts

describe('Enhanced Accuracy Mode - Authentication Fix (Issue #1)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')
  })

  it('should calculate optimized formula without 401 error', () => {
    // Enable Enhanced Accuracy Mode (should be checked by default)
    cy.get('[data-testid="enhanced-accuracy-checkbox"]').should('be.checked')

    // Enter test color
    cy.get('[data-testid="hex-input"]').clear().type('#FF5733')
    cy.contains('Calculate Formula').click()

    // Wait for calculation
    cy.contains('Calculating paint formula', { timeout: 15000 }).should('be.visible')

    // Verify NO 401 error message
    cy.contains('API error: 401').should('not.exist')

    // Verify formula displays successfully
    cy.get('[data-testid="formula-result"]', { timeout: 15000 }).should('be.visible')

    // Verify Delta E value shown (enhanced accuracy target ≤ 2.0)
    cy.get('[data-testid="delta-e-value"]').should('exist')
  })

  it('should retry once on transient 401 error', () => {
    // Intercept first optimize request to return 401
    let callCount = 0
    cy.intercept('POST', '/api/optimize', (req) => {
      callCount++
      if (callCount === 1) {
        req.reply({ statusCode: 401, body: { error: 'Unauthorized' } })
      } else {
        req.continue()
      }
    }).as('optimize')

    // Calculate formula
    cy.get('[data-testid="hex-input"]').clear().type('#3498DB')
    cy.contains('Calculate Formula').click()

    // Wait for both requests (initial + retry)
    cy.wait('@optimize')
    cy.wait('@optimize')

    // Verify success after retry
    cy.get('[data-testid="formula-result"]').should('be.visible')
  })
})
```

**Verification**:
- Test file created
- TypeScript compiles
- `npx cypress run --spec cypress/e2e/enhanced-accuracy-mode-fix.cy.ts` runs (should FAIL initially)

---

### T005: Write E2E Test for Session Save UX [P]
**Priority**: MEDIUM
**Parallel**: Yes (new test file)
**Dependencies**: T002 (Toaster must be installed)
**Files Created**: `/cypress/e2e/session-save-ux-fix.cy.ts`

**Task**:
Write Cypress E2E test to verify session save shows success toast and closes dialog (should fail initially, pass after fix).

**Implementation**:
```typescript
// cypress/e2e/session-save-ux-fix.cy.ts

describe('Session Save UX - Toast Feedback (Issue #2)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')

    // Calculate a formula
    cy.get('[data-testid="hex-input"]').clear().type('#E74C3C')
    cy.contains('Calculate Formula').click()
    cy.get('[data-testid="formula-result"]', { timeout: 15000 }).should('be.visible')
  })

  it('should show success toast and close dialog after save', () => {
    // Open save dialog
    cy.contains('Save This Formula').click()
    cy.contains('Save Mixing Session').should('be.visible')

    // Fill session name
    cy.get('input[name="customLabel"]').type('E2E Test - Session Save UX')

    // Save session
    cy.contains('button', 'Save Session').click()

    // Verify success toast appears
    cy.contains('Session saved successfully', { timeout: 5000 }).should('be.visible')

    // Verify dialog auto-closes
    cy.contains('Save Mixing Session', { timeout: 2000 }).should('not.exist')

    // Verify session in history
    cy.contains('Session History').click()
    cy.contains('E2E Test - Session Save UX').should('exist')
  })

  it('should show error toast and keep dialog open on save failure', () => {
    // Intercept save request to force error
    cy.intercept('POST', '/api/sessions', {
      statusCode: 500,
      body: { error: 'Database error' }
    }).as('saveFail')

    // Open save dialog
    cy.contains('Save This Formula').click()

    // Fill and submit
    cy.get('input[name="customLabel"]').type('Failure Test')
    cy.contains('button', 'Save Session').click()

    // Verify error toast (user-friendly message, not "500")
    cy.contains('Unable to complete request. Please try again.').should('be.visible')

    // Verify dialog stays open
    cy.contains('Save Mixing Session').should('exist')
  })
})
```

**Verification**:
- Test file created
- TypeScript compiles
- `npx cypress run --spec cypress/e2e/session-save-ux-fix.cy.ts` runs (should FAIL initially)

---

### T006: Write E2E Test for Session Navigation [P]
**Priority**: LOW
**Parallel**: Yes (new test file)
**Dependencies**: T002 (Toaster must be installed)
**Files Created**: `/cypress/e2e/session-navigation-fix.cy.ts`

**Task**:
Write Cypress E2E test to verify session card click shows "coming soon" toast instead of timing out.

**Implementation**:
```typescript
// cypress/e2e/session-navigation-fix.cy.ts

describe('Session Navigation - Placeholder Handling (Issue #3)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')

    // Navigate to Session History
    cy.contains('Session History').click()
  })

  it('should show "coming soon" toast when clicking session card', () => {
    // Verify sessions are listed
    cy.get('[data-testid="session-card"]').should('have.length.greaterThan', 0)

    // Click first session card
    cy.get('[data-testid="session-card"]').first().click()

    // Verify toast appears immediately (no 5-second timeout)
    cy.contains('Session details view coming soon', { timeout: 1000 }).should('be.visible')

    // Verify no navigation occurred (still on history page)
    cy.url().should('include', '/history')

    // Verify no error or timeout
    cy.contains('timeout', { matchCase: false }).should('not.exist')
  })

  it('should not timeout or hang when clicking multiple cards', () => {
    // Click multiple cards in succession
    cy.get('[data-testid="session-card"]').eq(0).click()
    cy.contains('Session details view coming soon').should('be.visible')

    cy.get('[data-testid="session-card"]').eq(1).click()
    cy.contains('Session details view coming soon').should('be.visible')

    // Verify page remains responsive (no hanging)
    cy.contains('Session History').should('be.visible')
  })
})
```

**Verification**:
- Test file created
- TypeScript compiles
- `npx cypress run --spec cypress/e2e/session-navigation-fix.cy.ts` runs (should FAIL initially)

---

### T007: Write Unit Tests for Error Message Translation [P]
**Priority**: MEDIUM
**Parallel**: Yes (new test file)
**Dependencies**: T003
**Files Created**: `/__tests__/unit/error-messages.test.ts`

**Task**:
Write Jest unit tests for error message translation utility.

**Implementation**:
```typescript
// __tests__/unit/error-messages.test.ts

import { translateApiError } from '@/lib/errors/user-messages'

describe('Error Message Translation', () => {
  describe('HTTP Status Code Translation', () => {
    it('should translate 401 to session expired message', () => {
      const message = translateApiError({ status: 401 })
      expect(message).toBe('Session expired. Please sign in again.')
    })

    it('should translate 500 to generic error message', () => {
      const message = translateApiError({ status: 500 })
      expect(message).toBe('Unable to complete request. Please try again.')
    })

    it('should translate 404 to not found message', () => {
      const message = translateApiError({ status: 404 })
      expect(message).toBe('The requested resource was not found.')
    })

    it('should return generic message for unknown status code', () => {
      const message = translateApiError({ status: 418 })
      expect(message).toBe('An unexpected error occurred.')
    })
  })

  describe('Named Error Code Translation', () => {
    it('should translate NETWORK_ERROR to connection message', () => {
      const message = translateApiError({ code: 'NETWORK_ERROR' })
      expect(message).toBe('Connection issue. Please check your internet connection.')
    })

    it('should translate TIMEOUT to timeout message', () => {
      const message = translateApiError({ code: 'TIMEOUT' })
      expect(message).toBe('Request timed out. Please try again.')
    })

    it('should return generic message for unknown error code', () => {
      const message = translateApiError({ code: 'UNKNOWN_ERROR' })
      expect(message).toBe('An unexpected error occurred.')
    })
  })

  describe('Priority and Fallback', () => {
    it('should prioritize status code over error code', () => {
      const message = translateApiError({ status: 401, code: 'NETWORK_ERROR' })
      expect(message).toBe('Session expired. Please sign in again.')
    })

    it('should use provided message as fallback', () => {
      const message = translateApiError({ message: 'Custom error message' })
      expect(message).toBe('Custom error message')
    })

    it('should return generic message when no error info provided', () => {
      const message = translateApiError({})
      expect(message).toBe('An unexpected error occurred.')
    })
  })
})
```

**Verification**:
- Test file created
- `npm test -- error-messages.test.ts` runs and PASSES

---

## Phase 3: Core Fixes (Implementation)

### T008: Fix /api/optimize Route Authentication (CRITICAL)
**Priority**: CRITICAL (Issue #1)
**Parallel**: No (modifies shared route file)
**Dependencies**: T004 (test written)
**Files Modified**: `/src/app/api/optimize/route.ts`

**Task**:
Replace admin client with route handler client at lines 82 and 331 to fix 401 authentication errors for Enhanced Accuracy Mode.

**Implementation**:
```typescript
// src/app/api/optimize/route.ts

// Line 1: Update import (remove admin client import)
// REMOVE:
import { createAdminClient } from '@/lib/supabase/admin'

// ADD:
import { createClient } from '@/lib/supabase/route-handler'

// Line 82-83: Replace admin client with route handler client
// BEFORE:
const supabase = createAdminClient()
const user = await getCurrentUser(supabase)

// AFTER:
const supabase = await createClient()  // Note: async!
const user = await getCurrentUser(supabase)

// Line 331: Replace admin client (if exists)
// BEFORE:
const supabase = createAdminClient()

// AFTER:
const supabase = await createClient()
```

**Verification**:
```bash
# TypeScript compiles
npm run build

# E2E test now passes
npx cypress run --spec cypress/e2e/enhanced-accuracy-mode-fix.cy.ts

# Manual test
# 1. Sign in to app
# 2. Enable Enhanced Accuracy Mode
# 3. Enter hex color #FF5733
# 4. Verify NO "API error: 401" appears
# 5. Verify formula displays with Delta E value
```

---

### T009: Add Toast Notifications to SaveForm Component
**Priority**: MEDIUM (Issue #2)
**Parallel**: No (modifies SaveForm component)
**Dependencies**: T002, T003, T005 (Toaster installed, error utility created, test written)
**Files Modified**: `/src/components/session-manager/SaveForm.tsx`

**Task**:
Add toast notifications for success and error states when saving sessions.

**Implementation**:
```typescript
// src/components/session-manager/SaveForm.tsx

// Add imports at top
import { useToast } from '@/hooks/use-toast'
import { translateApiError } from '@/lib/errors/user-messages'

// Inside SaveForm component, add toast hook
const { toast } = useToast()

// Update handleSubmit function (around line 36)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  // ... existing validation code ...

  try {
    const sessionData: CreateSessionRequest = {
      // ... existing code ...
    }

    await onSave(sessionData)

    // NEW: Show success toast
    toast({
      title: 'Session saved successfully',
      variant: 'default',  // Or 'success' if variant exists
      duration: 3000,
    })

    // NEW: Wait 500ms then call onSuccess (parent will close dialog)
    setTimeout(() => {
      if (onSuccess) {
        onSuccess()
      }
    }, 500)

  } catch (err) {
    // NEW: Translate error to user-friendly message
    const userMessage = translateApiError({
      status: (err as any)?.response?.status,
      code: (err as any)?.code,
      message: err instanceof Error ? err.message : undefined,
    })

    // NEW: Show error toast instead of inline error
    toast({
      title: userMessage,
      variant: 'destructive',
      duration: 5000,
    })

    // Also log technical error for debugging
    console.error('Session save failed:', err)

    // Keep inline error as fallback
    setError(userMessage)
  }
}
```

**Props Interface Update**:
```typescript
// Add onSuccess prop to SaveFormProps interface
interface SaveFormProps {
  // ... existing props ...
  onSuccess?: () => void  // NEW: Optional callback after successful save
}
```

**Verification**:
```bash
# TypeScript compiles
npm run build

# E2E test now passes
npx cypress run --spec cypress/e2e/session-save-ux-fix.cy.ts

# Manual test
# 1. Calculate a formula
# 2. Click "Save This Formula"
# 3. Enter session name
# 4. Click "Save Session"
# 5. Verify green success toast appears
# 6. Verify dialog closes after ~500ms
```

---

### T010: Update Parent Component to Use onSuccess Callback
**Priority**: MEDIUM
**Parallel**: No (depends on T009)
**Dependencies**: T009
**Files Modified**: `/src/components/dashboard/paint-mixing-dashboard.tsx` (or wherever SaveForm is used)

**Task**:
Update parent component to pass `onSuccess` callback to SaveForm that closes the dialog.

**Implementation**:
```typescript
// Find where SaveForm is used (likely in dashboard component)
// Add onSuccess callback

const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)

<SaveForm
  // ... existing props ...
  onSave={handleSave}
  onCancel={() => setIsSaveDialogOpen(false)}
  onSuccess={() => {
    // Close dialog after successful save
    setIsSaveDialogOpen(false)
    // Optionally refresh session list
    // refreshSessions()
  }}
/>
```

**Verification**:
- TypeScript compiles
- Dialog closes automatically after session save
- E2E test T005 passes completely

---

### T011: Add Session Expiration Toast to Sign-In Page
**Priority**: MEDIUM
**Parallel**: No (modifies signin page)
**Dependencies**: T002 (Toaster installed)
**Files Modified**: `/src/app/auth/signin/page.tsx`

**Task**:
Add toast notification when user is redirected to signin page due to session expiration.

**Implementation**:
```typescript
// src/app/auth/signin/page.tsx

'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const reason = searchParams?.get('reason')

    if (reason === 'session_expired') {
      toast({
        title: 'Your session has expired. Please sign in again.',
        variant: 'default',
        duration: 5000,
      })
    }
  }, [searchParams, toast])

  // ... rest of component ...
}
```

**Verification**:
- TypeScript compiles
- Navigate to `/auth/signin?reason=session_expired`
- Toast appears with session expired message

---

### T012: Add Retry Logic to Color Matching Hook
**Priority**: MEDIUM
**Parallel**: No (modifies shared hook)
**Dependencies**: T002, T011 (Toaster installed, signin page updated)
**Files Modified**: `/src/hooks/use-color-matching.ts`

**Task**:
Add automatic retry logic for 401 errors (single retry with 500ms delay, then redirect to signin).

**Implementation**:
```typescript
// src/hooks/use-color-matching.ts

async function fetchWithAuthRetry(
  fetcher: () => Promise<Response>,
  retryCount: number = 0
): Promise<Response> {
  try {
    const response = await fetcher()

    if (response.status === 401 && retryCount === 0) {
      // First 401 - wait and retry (handles transient auth token refresh)
      await new Promise(resolve => setTimeout(resolve, 500))
      return fetchWithAuthRetry(fetcher, retryCount + 1)
    }

    if (response.status === 401 && retryCount > 0) {
      // Second 401 - redirect to login
      window.location.href = '/auth/signin?reason=session_expired'
      throw new Error('Session expired')
    }

    return response
  } catch (error) {
    // Network error - retry once
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return fetchWithAuthRetry(fetcher, retryCount + 1)
    }
    throw error
  }
}

// Update Enhanced Accuracy Mode calculation to use retry logic
const calculateEnhancedFormula = async (targetColor: ColorValue) => {
  const response = await fetchWithAuthRetry(() =>
    fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetColor, ... }),
    })
  )

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}
```

**Verification**:
- TypeScript compiles
- E2E test T004 retry scenario passes
- Manual test: Force 401 error via DevTools, verify retry works

---

### T013: Add Placeholder Handler to SessionCard Component
**Priority**: LOW (Issue #3)
**Parallel**: No (modifies SessionCard component)
**Dependencies**: T002, T006 (Toaster installed, test written)
**Files Modified**: `/src/components/session-manager/SessionCard.tsx`

**Task**:
Add click handler to SessionCard that shows "coming soon" toast when detail view is not implemented.

**Implementation**:
```typescript
// src/components/session-manager/SessionCard.tsx

import { useToast } from '@/hooks/use-toast'

interface SessionCardProps {
  session: Session
  onFavoriteToggle?: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
  onDetailClick?: (sessionId: string) => void  // NEW: Optional detail handler
  className?: string
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onFavoriteToggle,
  onDelete,
  onDetailClick,  // NEW
  className,
}) => {
  const { toast } = useToast()

  const handleCardClick = () => {
    if (!onDetailClick) {
      // Detail view not implemented yet - show placeholder toast
      toast({
        title: 'Session details view coming soon',
        variant: 'default',
        duration: 3000,
      })
      return
    }

    // Call parent handler (for future implementation)
    onDetailClick(session.id)
  }

  return (
    <div
      className={`session-card ${className}`}
      onClick={handleCardClick}
      data-testid="session-card"
    >
      {/* ... existing card content ... */}
    </div>
  )
}
```

**Verification**:
```bash
# TypeScript compiles
npm run build

# E2E test now passes
npx cypress run --spec cypress/e2e/session-navigation-fix.cy.ts

# Manual test
# 1. Navigate to Session History
# 2. Click any session card
# 3. Verify toast appears immediately
# 4. Verify no timeout or error
```

---

## Phase 4: Integration & Verification

### T014: Run All E2E Tests to Verify Fixes [P]
**Priority**: HIGH
**Parallel**: Yes (can run in parallel if CI supports)
**Dependencies**: T008, T009, T010, T011, T012, T013 (all fixes implemented)

**Task**:
Run all 3 E2E test files to verify all bug fixes are working.

**Execution**:
```bash
# Run all bug fix E2E tests
npx cypress run --spec 'cypress/e2e/*-fix.cy.ts'

# Or run individually
npx cypress run --spec cypress/e2e/enhanced-accuracy-mode-fix.cy.ts
npx cypress run --spec cypress/e2e/session-save-ux-fix.cy.ts
npx cypress run --spec cypress/e2e/session-navigation-fix.cy.ts
```

**Expected Results**:
- ✅ All tests PASS
- ✅ No 401 errors in Enhanced Accuracy Mode
- ✅ Toast notifications appear for session save
- ✅ Session cards show "coming soon" toast

---

### T015: Run Existing E2E Tests for Regression [P]
**Priority**: HIGH
**Parallel**: Yes (different test suite)
**Dependencies**: T008, T009, T010, T011, T012, T013

**Task**:
Run existing E2E test suite to ensure bug fixes didn't break existing functionality.

**Execution**:
```bash
# Run full E2E test suite
npx cypress run

# Check for any failures
```

**Expected Results**:
- ✅ All existing tests still pass
- ✅ No new failures introduced
- ✅ No console errors

---

### T016: Verify Toast Accessibility [P]
**Priority**: MEDIUM
**Parallel**: Yes (independent verification)
**Dependencies**: T002, T009, T011, T013

**Task**:
Verify toast notifications meet WCAG 2.1 AA accessibility requirements.

**Verification Checklist**:
```bash
# 1. Screen reader test (manual)
# - Enable VoiceOver (Mac) or NVDA (Windows)
# - Trigger success toast
# - Verify: Announces "Session saved successfully"
# - Trigger error toast
# - Verify: Interrupts with error message (role="alert")

# 2. Keyboard test (manual)
# - Trigger toast
# - Press ESC key
# - Verify: Toast dismisses

# 3. Color contrast test (automated)
# - Use axe DevTools or Lighthouse
# - Verify: Text contrast ≥ 4.5:1

# 4. Focus management (manual)
# - Trigger toast
# - Verify: Focus not trapped in toast
# - Verify: Can continue using app normally
```

**Expected Results**:
- ✅ Screen reader announces toast messages
- ✅ ESC key dismisses toasts
- ✅ Color contrast ≥ 4.5:1
- ✅ No focus traps

---

### T017: Performance Verification [P]
**Priority**: MEDIUM
**Parallel**: Yes (independent verification)
**Dependencies**: T008, T009, T012

**Task**:
Verify bug fixes don't introduce performance regressions.

**Verification**:
```bash
# 1. Enhanced Accuracy Mode timing
# - Enable Enhanced Accuracy Mode
# - Calculate formula
# - Verify: Completes within 10 seconds (constitutional requirement)
# - Verify: No additional delay from retry logic

# 2. Toast rendering performance
# - Trigger 10 toasts rapidly
# - Verify: No UI lag or stuttering
# - Verify: Auto-dismiss timing accurate

# 3. Build size impact
npm run build
# - Verify: Bundle size increase < 10kb (toast components)
# - Check: dist/ folder sizes

# 4. Lighthouse performance
# - Run Lighthouse audit
# - Verify: Performance score ≥ 90 (maintained)
```

**Expected Results**:
- ✅ Enhanced Accuracy Mode < 10s
- ✅ No UI lag from toasts
- ✅ Bundle size increase < 10kb
- ✅ Lighthouse Performance ≥ 90

---

## Phase 5: Polish & Documentation

### T018: Add JSDoc Comments to Error Utility [P]
**Priority**: LOW
**Parallel**: Yes (documentation only)
**Dependencies**: T003

**Task**:
Add JSDoc comments to error translation utility for developer documentation.

**Implementation**:
```typescript
// src/lib/errors/user-messages.ts

/**
 * Represents an API error that can be translated to a user-friendly message.
 */
export interface ApiError {
  /** HTTP status code (e.g., 401, 500) */
  status?: number
  /** Named error code (e.g., 'NETWORK_ERROR', 'TIMEOUT') */
  code?: string
  /** Technical error message (for logging, not shown to users) */
  message?: string
}

/**
 * Translates API errors to user-friendly messages.
 *
 * Priority order:
 * 1. HTTP status code (if provided)
 * 2. Named error code (if provided)
 * 3. Error message (if provided)
 * 4. Generic fallback message
 *
 * @param error - The API error to translate
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = translateApiError({ status: 401 })
 * // Returns: "Session expired. Please sign in again."
 * ```
 */
export function translateApiError(error: ApiError): string {
  // ... existing implementation ...
}
```

**Verification**:
- JSDoc appears in IDE autocomplete
- TypeScript compiles without warnings

---

### T019: Update COMPREHENSIVE_E2E_TEST_REPORT.md [P]
**Priority**: LOW
**Parallel**: Yes (documentation only)
**Dependencies**: T014, T015 (all tests passing)

**Task**:
Update E2E test report to mark all 3 bugs as FIXED with verification status.

**Implementation**:
```markdown
# Add to COMPREHENSIVE_E2E_TEST_REPORT.md

## Bug Fixes - Feature 006 (2025-10-03)

### ✅ Issue #1: Enhanced Accuracy Mode - 401 Error (FIXED)
**Status**: RESOLVED
**Fix**: Changed `/api/optimize` route to use route handler client instead of admin client
**Verification**: E2E test `enhanced-accuracy-mode-fix.cy.ts` PASSES
**Deployed**: [deployment URL]

### ✅ Issue #2: Session Save UX Feedback (FIXED)
**Status**: RESOLVED
**Fix**: Added toast notifications and auto-close behavior to SaveForm component
**Verification**: E2E test `session-save-ux-fix.cy.ts` PASSES
**Deployed**: [deployment URL]

### ✅ Issue #3: Session Card Navigation Timeout (FIXED)
**Status**: RESOLVED
**Fix**: Added placeholder toast handler to SessionCard component
**Verification**: E2E test `session-navigation-fix.cy.ts` PASSES
**Deployed**: [deployment URL]

## Regression Testing
- ✅ All existing E2E tests still pass
- ✅ No new console errors
- ✅ Performance maintained (Lighthouse ≥ 90)
- ✅ Accessibility verified (WCAG 2.1 AA)
```

**Verification**:
- Document updated with fix details
- Links to test files correct
- Deployment URL added (after deployment)

---

### T020: Run Final Build and Type Check [P]
**Priority**: HIGH
**Parallel**: Yes (can run alongside other verification)
**Dependencies**: T008-T013 (all code changes complete)

**Task**:
Run final TypeScript type check and production build to ensure no errors.

**Execution**:
```bash
# TypeScript type check
npm run type-check

# Production build
npm run build

# Verify no errors
echo $?  # Should be 0
```

**Expected Results**:
- ✅ No TypeScript errors
- ✅ Build completes successfully
- ✅ No warnings in build output

---

### T021: Verify Quickstart Scenarios [P]
**Priority**: HIGH
**Parallel**: Yes (manual verification)
**Dependencies**: T014, T015 (all tests passing)

**Task**:
Execute all 4 quickstart test scenarios to validate fixes end-to-end.

**Execution**:
Follow `/home/davistroy/dev/paintmixr/specs/006-fix-issues-fix/quickstart.md`:
1. Test Enhanced Accuracy Mode (Scenario 1)
2. Test Session Save Feedback (Scenario 2)
3. Test Session Navigation Placeholder (Scenario 3)
4. Test Error Message Translation (Scenario 4)

**Expected Time**: ~17 minutes

**Expected Results**:
- ✅ All scenarios PASS
- ✅ All acceptance criteria met
- ✅ No regressions observed

---

## Parallel Execution Guide

Tasks marked `[P]` can be executed in parallel. Here are suggested parallel groups:

### Group 1: Setup (Sequential)
```
T001 → T002 → (wait for completion)
```

### Group 2: Test Writing (Parallel)
```bash
# Can run simultaneously
T003 (Error utility)
T004 (E2E test - Enhanced Accuracy)
T005 (E2E test - Session Save)
T006 (E2E test - Session Navigation)
T007 (Unit tests - Error messages)
```

### Group 3: Implementation (Sequential with some parallel)
```
T008 (Fix optimize route) - CRITICAL, do first
T009 (Add toast to SaveForm) - depends on T002, T003
T010 (Update parent component) - depends on T009
T011 (Signin page toast) - can run parallel with T009-T010
T012 (Retry logic) - can run parallel with T009-T010
T013 (SessionCard placeholder) - can run parallel with T009-T012
```

### Group 4: Verification (Parallel)
```bash
# Can run simultaneously
T014 (E2E tests)
T015 (Regression tests)
T016 (Accessibility)
T017 (Performance)
T018 (Documentation)
T019 (Update report)
T020 (Build check)
T021 (Quickstart scenarios)
```

---

## Task Summary

| Phase | Tasks | Parallel | Sequential |
|-------|-------|----------|------------|
| Setup | T001-T003 | 1 | 2 |
| Tests | T004-T007 | 4 | 0 |
| Core Fixes | T008-T013 | 3 | 3 |
| Integration | T014-T017 | 4 | 0 |
| Polish | T018-T021 | 4 | 0 |
| **Total** | **21** | **16** | **5** |

**Estimated Time**:
- Setup: ~10 minutes
- Tests: ~30 minutes (parallel)
- Core Fixes: ~45 minutes
- Integration: ~30 minutes (parallel)
- Polish: ~20 minutes (parallel)
- **Total**: ~2.5 hours with parallel execution

---

## Acceptance Criteria (All Must Pass)

From spec.md:
- ✅ Enhanced Accuracy Mode works without 401 errors (FR-001, FR-002)
- ✅ Success toast appears after session save (FR-005)
- ✅ Save dialog auto-closes after success (FR-006)
- ✅ Error messages are user-friendly (FR-007, FR-012, FR-013)
- ✅ Session card shows "coming soon" toast (FR-010)
- ✅ No timeout on session card clicks (FR-011)
- ✅ All existing features still work (NFR-003)
- ✅ Error messages accessible to non-technical users (NFR-002)

---

*Tasks ready for execution via /implement command or manual execution*
