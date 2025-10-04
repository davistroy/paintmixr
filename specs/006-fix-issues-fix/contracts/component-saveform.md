# Component Contract: SaveForm (UX Enhancement)

**Feature**: 006-fix-issues-fix
**Component**: `src/components/session-manager/SaveForm.tsx`
**Status**: EXISTING - UX enhancement (toast feedback)

---

## Overview

SaveForm component allows users to save mixing sessions. **This contract documents UX enhancements - component API remains backward compatible.**

---

## Bug Fix Details

### Issue #2: Missing Save Feedback
- User saves session successfully (201 Created)
- No success message displayed
- Dialog remains open
- User unsure if save succeeded

### Fix
1. Add toast notification on successful save
2. Auto-close dialog after 500ms delay
3. Show user-friendly error messages on failure

---

## Component API

### Props (Modified)

```typescript
interface SaveFormProps {
  // Existing props (unchanged)
  sessionType: SessionType
  inputMethod: InputMethod
  targetColor?: ColorValue
  calculatedColor?: ColorValue
  deltaE?: number
  formula?: MixingFormula
  onSave: (sessionData: CreateSessionRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  className?: string

  // NEW: Optional success callback
  onSuccess?: () => void  // Called after successful save and toast
}
```

**Backward Compatibility**:
- All existing props unchanged
- `onSuccess` is optional (component works without it)
- Existing implementations continue to function

---

## Behavior Contract

### Save Success Flow

```typescript
// User clicks "Save Session"
await handleSubmit(event) {
  1. Validate form fields (existing)
  2. Call onSave(sessionData)
  3. ✨ NEW: On success
     - Show toast: "Session saved successfully"
     - Wait 500ms
     - Call onSuccess() if provided
     - (Parent closes dialog via onSuccess callback)
}
```

### Save Error Flow

```typescript
// Save fails with API error
catch (error) {
  1. Translate error to user message
  2. ✨ NEW: Show toast with user-friendly message
     - 401 → "Session expired. Please sign in again."
     - 500 → "Unable to complete request. Please try again."
     - Network → "Connection issue. Please check your internet connection."
  3. Keep dialog open
  4. Log technical error to console
}
```

---

## Toast Message Contracts

### Success Toast
```typescript
toast({
  title: "Session saved successfully",
  variant: "success",
  duration: 3000,  // Auto-dismiss after 3 seconds
})
```

**Accessibility**:
- ARIA `role="status"` (polite screen reader announcement)
- Green background (#22C55E)
- Checkmark icon
- Contrast ratio ≥4.5:1 (WCAG 2.1 AA)

### Error Toast
```typescript
toast({
  title: translateApiError(error),  // User-friendly message
  variant: "destructive",
  duration: 5000,  // Longer for errors (allows reading)
})
```

**Accessibility**:
- ARIA `role="alert"` (interrupts screen reader)
- Red background (#EF4444)
- X icon
- Contrast ratio ≥4.5:1 (WCAG 2.1 AA)

---

## Usage Example

### Parent Component (Dashboard)

```typescript
const [isDialogOpen, setIsDialogOpen] = useState(false)
const { toast } = useToast()

async function handleSave(sessionData: CreateSessionRequest) {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

<SaveForm
  sessionType="color_matching"
  inputMethod="hex_input"
  targetColor={targetColor}
  formula={formula}
  onSave={handleSave}
  onCancel={() => setIsDialogOpen(false)}
  onSuccess={() => {
    // Dialog will auto-close after toast appears
    setIsDialogOpen(false)
    // Optionally refresh session list
    refreshSessions()
  }}
/>
```

---

## Validation Rules (Unchanged)

**Form Validation**:
- Session name: Required, 1-100 characters
- Notes: Optional, max 1000 characters
- Image URL: Optional, must be valid URL if provided

**Error Display**:
- Inline errors for validation (unchanged)
- Toast errors for API failures (NEW)

---

## Component Test Contract

```typescript
// __tests__/unit/save-form-toast.test.tsx

describe('SaveForm - Toast Feedback (Issue #2 fix)', () => {
  it('should show success toast and call onSuccess callback', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined)
    const mockOnSuccess = jest.fn()

    render(
      <SaveForm
        sessionType="color_matching"
        inputMethod="hex_input"
        onSave={mockOnSave}
        onCancel={jest.fn()}
        onSuccess={mockOnSuccess}
      />
    )

    // Fill form
    await userEvent.type(screen.getByLabelText(/session name/i), 'Test Session')
    await userEvent.click(screen.getByText(/save session/i))

    // Verify success toast
    await waitFor(() => {
      expect(screen.getByText('Session saved successfully')).toBeInTheDocument()
    })

    // Verify onSuccess called after delay
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('should show error toast on save failure', async () => {
    const mockOnSave = jest.fn().mockRejectedValue(
      new Error('HTTP 500')
    )

    render(
      <SaveForm
        sessionType="color_matching"
        inputMethod="hex_input"
        onSave={mockOnSave}
        onCancel={jest.fn()}
      />
    )

    // Fill form
    await userEvent.type(screen.getByLabelText(/session name/i), 'Test Session')
    await userEvent.click(screen.getByText(/save session/i))

    // Verify error toast
    await waitFor(() => {
      expect(screen.getByText('Unable to complete request. Please try again.')).toBeInTheDocument()
    })

    // Verify dialog stays open (not closed)
    expect(screen.getByText(/save session/i)).toBeInTheDocument()
  })

  it('should translate 401 error to session expired message', async () => {
    const mockOnSave = jest.fn().mockRejectedValue({
      response: { status: 401 }
    })

    render(<SaveForm {...defaultProps} onSave={mockOnSave} />)

    // Fill and submit
    await userEvent.type(screen.getByLabelText(/session name/i), 'Test')
    await userEvent.click(screen.getByText(/save session/i))

    // Verify specific error message
    await waitFor(() => {
      expect(screen.getByText('Session expired. Please sign in again.')).toBeInTheDocument()
    })
  })
})
```

---

## E2E Test Contract

```typescript
// cypress/e2e/session-save-ux.cy.ts

describe('Session Save UX (Issue #2 fix)', () => {
  beforeEach(() => {
    cy.login('troy@k4jda.com', 'Edw@rd67')
    cy.visit('/')
    cy.get('[data-testid="hex-input"]').type('#FF5733')
    cy.get('[data-testid="calculate-button"]').click()
    cy.wait(2000)  // Wait for calculation
  })

  it('should show success toast and close dialog after save', () => {
    // Open save dialog
    cy.contains('Save This Formula').click()

    // Fill form
    cy.get('input[name="customLabel"]').type('E2E Test Session')
    cy.contains('Save Session').click()

    // Verify success toast appears
    cy.contains('Session saved successfully').should('be.visible')

    // Verify dialog closes after delay
    cy.wait(1000)
    cy.contains('Save Mixing Session').should('not.exist')

    // Verify session appears in history
    cy.contains('Session History').click()
    cy.contains('E2E Test Session').should('exist')
  })

  it('should show error toast and keep dialog open on failure', () => {
    // Intercept API and force error
    cy.intercept('POST', '/api/sessions', {
      statusCode: 500,
      body: { error: 'Database error' }
    }).as('saveFail')

    // Open save dialog
    cy.contains('Save This Formula').click()

    // Fill form
    cy.get('input[name="customLabel"]').type('Fail Test')
    cy.contains('Save Session').click()

    // Verify error toast appears
    cy.contains('Unable to complete request. Please try again.').should('be.visible')

    // Verify dialog stays open
    cy.contains('Save Mixing Session').should('exist')
  })
})
```

---

## Accessibility Contract

**Toast Requirements**:
- ✅ Success toast uses `role="status"` (polite)
- ✅ Error toast uses `role="alert"` (assertive)
- ✅ Toasts auto-dismiss (3s success, 5s error)
- ✅ Toasts dismissible via ESC key
- ✅ Color contrast ≥4.5:1 for text
- ✅ Icons not sole indicator (text message primary)

**Focus Management**:
- Focus remains on "Save Session" button during save
- On success, focus returns to parent (dialog closes)
- On error, focus stays on "Save Session" button (dialog open)

---

## Performance Contract

**Rendering**:
- Toast render: <16ms (single React component)
- Dialog animation: 200ms ease-out
- Auto-close delay: 500ms (allows user to see success)

**User Perception**:
- Immediate feedback (toast appears instantly on response)
- Smooth close animation (no jarring transitions)
- Total save-to-close time: ~800ms (save + 500ms + close animation)

---

## Backward Compatibility Checklist

- ✅ Existing props unchanged
- ✅ onSuccess is optional
- ✅ Component works without onSuccess callback
- ✅ No breaking changes to parent components
- ✅ Validation logic unchanged
- ✅ Form submission flow unchanged (only adds toast feedback)

---

*Contract verified - UX enhancement is backward compatible and improves user experience*
