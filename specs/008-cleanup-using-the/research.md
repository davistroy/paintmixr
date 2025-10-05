# Technical Research: Production Bug Fixes & Testing Validation

**Feature**: 008-cleanup-using-the
**Date**: 2025-10-04
**Status**: Complete

## Research Summary

This feature is primarily a bug fix implementation addressing 3 critical production issues discovered during E2E testing. Most technical patterns are already established in the codebase. Research focuses on verifying existing patterns and clarifying root causes.

## 1. Shadcn/ui Toast Integration

**Decision**: Use existing shadcn/ui Toast component for success notifications

**Rationale**:
- Already installed and integrated per CLAUDE.md (Bug Fixes from E2E Testing section)
- Provides accessible, auto-dismissing notifications (WCAG 2.1 AA compliant)
- Consistent with existing UI component library (Radix UI primitives)

**Implementation Pattern**:
```typescript
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// Success notification (FR-004a)
toast({
  title: "Session saved successfully",
  variant: "success",
  duration: 3000  // NFR-004: 3 second auto-dismiss
})

// Error notification
toast({
  title: "Failed to save session",
  description: error.message,
  variant: "destructive"
})
```

**Alternatives Considered**:
1. **Custom toast implementation** - Rejected: Reinventing wheel, accessibility concerns
2. **Browser alert()** - Rejected: Not dismissible, blocks UI, poor UX
3. **react-hot-toast library** - Rejected: Adds dependency, shadcn/ui already integrated

**Verification**:
- ✅ Confirmed `src/hooks/use-toast.ts` exists
- ✅ Confirmed `src/components/ui/toast.tsx` and `toaster.tsx` exist
- ✅ Confirmed `<Toaster />` added to root layout per CLAUDE.md

---

## 2. React Hook Form State Management for Concurrent Save Prevention

**Decision**: Use React Hook Form's built-in `formState.isSubmitting` for save button disable

**Rationale**:
- React Hook Form automatically manages submission state
- Prevents race conditions without custom state
- Built-in error handling and validation integration

**Implementation Pattern**:
```typescript
import { useForm } from 'react-hook-form'

const { formState: { isSubmitting }, handleSubmit } = useForm()

// Disable save button during submission (FR-003d, FR-003e)
<Button disabled={isSubmitting || !hasValidResults}>
  {isSubmitting ? "Saving..." : "Save Session"}
</Button>

const onSubmit = handleSubmit(async (data) => {
  // isSubmitting = true automatically
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    if (response.ok) {
      onOpenChange(false)  // FR-003: Close dialog
      toast({ title: "Session saved successfully" })  // FR-004
    } else {
      // FR-003a: Keep dialog open on failure
      toast({ title: "Failed to save", variant: "destructive" })
    }
  } finally {
    // isSubmitting = false automatically
  }
})
```

**Alternatives Considered**:
1. **Custom `isSaving` useState** - Rejected: Duplicates React Hook Form functionality
2. **Disabled button without state** - Rejected: Doesn't prevent concurrent submissions
3. **Global loading state** - Rejected: Overkill for single form, complicates state

**Constitutional Alignment**:
- Principle IV (Type Safety): React Hook Form provides TypeScript support
- Principle IV (Validation): Integrates with Zod schemas

---

## 3. Radix UI Checkbox Controlled Component Pattern

**Decision**: Use Radix UI Checkbox with `checked` + `onCheckedChange` props

**Root Cause Analysis**:
Radix UI Checkbox (shadcn/ui base) uses different props than native HTML checkbox:
- Native: `checked` + `onChange`
- Radix: `checked` + `onCheckedChange`

**Bug**: Likely using `onChange` handler (doesn't exist) or missing `onCheckedChange` entirely.

**Correct Implementation**:
```typescript
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'

const [enhancedMode, setEnhancedMode] = useState(true)
const [isCalculating, setIsCalculating] = useState(false)

<Checkbox
  checked={enhancedMode}
  disabled={isCalculating}  // FR-001a: Disable during calculation
  onCheckedChange={(checked) => {
    // checked is boolean | 'indeterminate'
    if (!isCalculating) {  // Double-check not calculating
      setEnhancedMode(checked === true)
    }
  }}
/>
```

**Common Pitfalls**:
1. Using `onChange` instead of `onCheckedChange` - **WRONG**
2. Not handling `'indeterminate'` value - causes type errors
3. Missing `disabled` prop during calculations

**Alternatives Considered**:
1. **Native HTML checkbox** - Rejected: Inconsistent with shadcn/ui design system
2. **Custom toggle component** - Rejected: Accessibility concerns, reinventing Radix
3. **Switch component instead** - Rejected: Checkbox is semantically correct for mode toggle

**Constitutional Alignment**:
- Principle V (Performance): React state updates <100ms (NFR-005)
- Principle V (Accessibility): Radix primitives are WCAG 2.1 AA compliant

---

## 4. Input Method State Tracking & State Clearing

**Decision**: Single `inputMethod` state with side effects for clearing inputs/results

**Root Cause Analysis**:
`inputMethod` state likely updates correctly, but:
1. Previous input values not cleared when switching methods
2. Calculation results persist across method switches

**Implementation Pattern**:
```typescript
const [inputMethod, setInputMethod] = useState<'color_picker' | 'hex_code' | 'image_upload'>('color_picker')
const [selectedColor, setSelectedColor] = useState<string | null>(null)
const [hexInput, setHexInput] = useState('')
const [calculationResult, setCalculationResult] = useState<Formula | null>(null)

const switchToHexCode = () => {
  setInputMethod('hex_code')
  // FR-005a: Clear previous inputs
  setSelectedColor(null)
  // FR-005b: Clear calculation results
  setCalculationResult(null)
}

const switchToColorPicker = () => {
  setInputMethod('color_picker')
  setHexInput('')  // Clear hex input
  setCalculationResult(null)
}

const switchToImageUpload = () => {
  setInputMethod('image_upload')
  setSelectedColor(null)
  setHexInput('')
  setCalculationResult(null)
}
```

**State Clearing Requirements** (from clarifications Q15, Q16):
- When switching input methods → Clear previous input values
- When switching input methods → Clear calculation results
- When switching between Standard/Enhanced modes → No clearing (different requirement)

**Alternatives Considered**:
1. **Preserve input values across switches** - Rejected: Clarification Q15 specified "Clear"
2. **Dim results instead of clearing** - Rejected: Clarification Q16 specified "Clear immediately"
3. **Confirmation dialog before clearing** - Rejected: Adds friction, Q15 specified auto-clear

**Session Metadata Tracking**:
```typescript
// Update inputMethod in session save payload (FR-005, FR-006)
const saveSession = async () => {
  await fetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      ...sessionData,
      input_method: inputMethod,  // Must match actual method used
      mode: enhancedMode ? 'Enhanced' : 'Standard'
    })
  })
}
```

---

## 5. Volume Validation Timing & Zod Schema

**Decision**: Validate on "Predict Resulting Color" button click (not real-time)

**Rationale**:
- Per clarification Q17: Validation occurs "On button click"
- Allows users to enter values without immediate error feedback
- Simpler implementation - no debouncing needed

**Zod Schema Design**:
```typescript
import { z } from 'zod'

// Single volume validation (FR-012d)
export const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")  // FR-012f
  .max(1000, "Paint volume must be between 5ml and 1000ml")

// Full ratio prediction validation (FR-012a, FR-012b, FR-012c)
export const ratioPredictionSchema = z.object({
  paints: z.array(z.object({
    paintId: z.string().uuid(),
    volume: paintVolumeSchema
  }))
  .min(2, "Ratio Prediction requires at least 2 paints")
  .max(5, "Ratio Prediction allows maximum 5 paints")
})
```

**React Hook Form Integration**:
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

const form = useForm({
  resolver: zodResolver(ratioPredictionSchema),
  defaultValues: { paints: [] }
})

const onPredict = form.handleSubmit((data) => {
  // Validation passed - data.paints has 2-5 entries, each 5-1000ml
  calculatePrediction(data.paints)
})

// Disable button if <2 paints (FR-012c)
<Button disabled={form.watch('paints').length < 2}>
  Predict Resulting Color
</Button>
```

**Alternatives Considered**:
1. **Real-time validation (on blur)** - Rejected: Clarification Q17 specified "On button click"
2. **Real-time validation (on change)** - Rejected: Adds UX friction, not requested
3. **Server-side validation only** - Rejected: Poor UX, network delay for simple check

**Error Display**:
```typescript
{form.formState.errors.paints?.[index]?.volume && (
  <p className="text-sm text-destructive">
    {form.formState.errors.paints[index].volume.message}
  </p>
)}
```

---

## 6. Automatic Retry on Timeout

**Decision**: Single automatic retry with same parameters on timeout

**Rationale**:
- Per clarification Q7: "Automatically retry once with same parameters"
- Handles transient network issues without user intervention
- Second failure shows error message (Q8)

**Implementation Pattern**:
```typescript
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  retryCount = 0
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    // Check if timeout error
    const isTimeout = error.name === 'AbortError'

    // NFR-001a, NFR-002a: Retry once on timeout
    if (isTimeout && retryCount === 0) {
      console.warn(`Timeout after ${timeoutMs}ms, retrying...`)
      return fetchWithTimeout(url, options, timeoutMs, retryCount + 1)
    }

    // NFR-001b, NFR-002b: Show error after 2 failures
    if (isTimeout && retryCount > 0) {
      throw new Error("Calculation timed out after 2 attempts. Please try a different color or mode.")
    }

    throw error
  }
}

// Usage
const calculateEnhanced = async () => {
  try {
    const response = await fetchWithTimeout(
      '/api/optimize',
      { method: 'POST', body: JSON.stringify(payload) },
      30000  // NFR-001: 30 second timeout
    )
    // Success after 1 or 2 attempts
  } catch (error) {
    // NFR-001c: Log to console
    console.error('Enhanced Mode calculation failed:', error)
    toast({
      title: error.message,
      variant: "destructive"
    })
  }
}
```

**Timeout Values**:
- Enhanced Mode: 30 seconds (NFR-001)
- Standard Mode: 10 seconds (NFR-002)

**Alternatives Considered**:
1. **Exponential backoff** - Rejected: Adds complexity, single retry sufficient
2. **Immediate error (no retry)** - Rejected: Clarification Q7 specified "retry once"
3. **User confirmation before retry** - Rejected: Adds friction, automatic is better UX

**Constitutional Alignment**:
- NFR-006: Browser console logging only (no server-side infrastructure)

---

## 7. Delta E Accuracy Warning

**Decision**: Persistent, non-dismissible warning when Delta E > 5.0

**Rationale**:
- Per clarification Q4: "Persistent (always visible when Delta E > 5.0, cannot be dismissed)"
- Per clarification Q20: Educational message format
- Sets proper user expectations for limited paint collection

**Implementation Pattern**:
```typescript
{calculationResult && calculationResult.deltaE > 5.0 && (
  <Alert variant="warning" className="mt-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Low Color Match Accuracy (ΔE {calculationResult.deltaE.toFixed(2)})</AlertTitle>
    <AlertDescription>
      Low accuracy due to limited paint collection. More variety improves matching.
      {/* FR-018a: Modal dialog overlay (not navigation) */}
      <Button variant="link" onClick={() => setShowPaintManager(true)}>
        Manage Paint Collection
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Educational Message** (FR-017, Q20):
"Low accuracy due to limited paint collection. More variety improves matching."

**Paint Management Link** (FR-018, FR-018a):
- Opens modal dialog overlay (clarification Q13)
- No navigation away from current session
- Placeholder/stub implementation acceptable for Phase 3

**Alternatives Considered**:
1. **Dismissible warning** - Rejected: Clarification Q4 specified "non-dismissible"
2. **Auto-dismiss after 10s** - Rejected: Q4 specified "persistent"
3. **Generic message** - Rejected: Q20 specified "educational" detail level

---

## Research Outcomes

All technical unknowns resolved:

| Area | Status | File Reference |
|------|--------|----------------|
| Toast notifications | ✅ Verified existing | `src/hooks/use-toast.ts` |
| Checkbox pattern | ✅ Root cause identified | Radix UI docs |
| Input method tracking | ✅ State clearing pattern defined | React patterns |
| Volume validation | ✅ Zod schema + timing clarified | `lib/forms/schemas.ts` (new) |
| Timeout retry | ✅ Fetch wrapper pattern defined | Client-side utility (new) |
| Delta E warning | ✅ Component pattern + message text | Alert component (existing) |

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)
