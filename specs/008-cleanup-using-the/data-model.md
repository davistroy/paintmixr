# Data Model: Production Bug Fixes & Testing Validation

**Feature**: 008-cleanup-using-the
**Date**: 2025-10-04

## Overview

This feature does **NOT require database schema changes**. All modifications are client-side state management and UI component behavior. This document verifies existing schema compliance and documents client-side state structures.

## Database Entities (Verification Only)

### Session Table (Existing - No Changes)

**Table**: `sessions`

**Schema Verification**:
```sql
-- Expected schema (NO CHANGES)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_color JSONB NOT NULL,  -- { lab: {l,a,b}, hex: string }
  input_method TEXT NOT NULL,   -- FR-005: 'color_picker' | 'hex_code' | 'image_upload'
  mode TEXT NOT NULL,            -- FR-011: 'Standard' | 'Enhanced' | 'Ratio Prediction'
  result JSONB NOT NULL,         -- Formula or PredictedColor
  delta_e NUMERIC,               -- Optional: for matching modes only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (existing, unchanged)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Critical Fields for Bug Fixes**:
- `input_method`: Must be populated correctly (FR-005, FR-006)
- `mode`: Must reflect Standard/Enhanced/Ratio Prediction (FR-011)

**No Migration Required**: Fields already exist per CLAUDE.md documentation.

---

## Client-Side State Models

These TypeScript interfaces define component state structures (not database tables).

### 1. Enhanced Mode State

```typescript
// State for Enhanced Mode checkbox (FR-001, FR-001a, FR-002)
interface EnhancedModeState {
  enhancedMode: boolean          // true = Enhanced, false = Standard
  isCalculating: boolean         // true = calculation in progress, disable checkbox
}

// Initial state
const initialEnhancedState: EnhancedModeState = {
  enhancedMode: true,             // Default to Enhanced Mode
  isCalculating: false
}
```

**State Transitions**:
1. User clicks checkbox (not calculating) → `enhancedMode` toggles
2. User starts calculation → `isCalculating = true`, checkbox disabled
3. Calculation completes → `isCalculating = false`, checkbox enabled
4. User clicks checkbox (calculating) → No change (checkbox disabled)

---

### 2. Input Method State

```typescript
// State for input method tracking (FR-005, FR-005a, FR-005b, FR-006)
interface InputMethodState {
  inputMethod: 'color_picker' | 'hex_code' | 'image_upload'
  selectedColor: string | null    // Color Picker result
  hexInput: string                // Hex Code input
  uploadedImage: File | null      // Image Upload file
  calculationResult: Formula | PredictedColor | null
}

// Initial state
const initialInputState: InputMethodState = {
  inputMethod: 'color_picker',    // Default method
  selectedColor: null,
  hexInput: '',
  uploadedImage: null,
  calculationResult: null
}
```

**State Transitions** (FR-005a, FR-005b):
1. Switch to Hex Code:
   - `inputMethod = 'hex_code'`
   - `selectedColor = null` (clear Color Picker)
   - `calculationResult = null` (clear results)

2. Switch to Color Picker:
   - `inputMethod = 'color_picker'`
   - `hexInput = ''` (clear Hex input)
   - `calculationResult = null` (clear results)

3. Switch to Image Upload:
   - `inputMethod = 'image_upload'`
   - `selectedColor = null`, `hexInput = ''` (clear both)
   - `calculationResult = null` (clear results)

**Metadata Persistence**:
When saving session, `inputMethod` from state → `sessions.input_method` (FR-006)

---

### 3. Session Save State

```typescript
// State for session save dialog (FR-003, FR-003a-f, FR-004)
interface SessionSaveState {
  isDialogOpen: boolean           // Dialog visibility
  isSaving: boolean               // Save operation in progress
  saveError: string | null        // Error message from failed save
}

// React Hook Form state (managed by library)
interface SaveFormState {
  isSubmitting: boolean           // Automatic: true during POST request
  errors: Record<string, any>     // Validation errors
}
```

**State Transitions**:
1. User clicks "Save This Formula":
   - `isDialogOpen = true`

2. User submits form:
   - `isSubmitting = true` (React Hook Form automatic)
   - POST /api/sessions

3. Save succeeds (201):
   - `isDialogOpen = false` (FR-003: close dialog)
   - `isSaving = false`
   - Trigger toast notification (FR-004)

4. Save fails (network error):
   - `isDialogOpen = true` (FR-003a: keep open)
   - `saveError = error.message` (FR-003b: display error)
   - `isSaving = false`
   - User can retry manually (FR-003c: no auto-retry)

5. Concurrent save attempt (FR-003d, FR-003e):
   - Save button disabled while `isSubmitting = true`
   - New save attempts rejected

---

### 4. Ratio Prediction State

```typescript
// State for ratio prediction form (FR-012, FR-012a-f, FR-013-015)
interface RatioPredictionState {
  selectedPaints: Array<{
    paintId: string
    volume: number  // Must be 5-1000ml
  }>
  validationErrors: Map<number, string>  // Paint index → error message
  isPredicting: boolean                   // Calculation in progress
  predictedResult: PredictedColor | null
}

// Validation constraints (from Zod schema)
const volumeConstraints = {
  min: 5,    // FR-012d: minimum 5ml
  max: 1000  // FR-012d: maximum 1000ml
}

const paintCountConstraints = {
  min: 2,    // FR-012a: minimum 2 paints
  max: 5     // FR-012b: maximum 5 paints
}
```

**State Transitions**:
1. User adds paint:
   - `selectedPaints.push({ paintId, volume: 0 })`

2. User enters volume:
   - Update `selectedPaints[index].volume`
   - No real-time validation (Q17: validate on button click)

3. User clicks "Predict" (FR-012e, FR-012f):
   - Validate: `selectedPaints.length >= 2 && <= 5`
   - Validate: All volumes 5-1000ml
   - If invalid: `validationErrors` populated, show error UI
   - If valid: `isPredicting = true`, call API

4. Prediction completes:
   - `isPredicting = false`
   - `predictedResult = result`

**Button Disable Logic** (FR-012c):
- Disable "Predict" button if `selectedPaints.length < 2`

---

### 5. Delta E Warning State

```typescript
// State for accuracy warning (FR-016, FR-016a, FR-017, FR-018, FR-018a)
interface DeltaEWarningState {
  showWarning: boolean            // Delta E > 5.0
  deltaE: number | null           // Actual Delta E value
  showPaintManager: boolean       // Paint management modal
}
```

**State Transitions**:
1. Calculation completes:
   - If `result.deltaE > 5.0`: `showWarning = true`
   - Else: `showWarning = false`

2. User clicks "Manage Paint Collection":
   - `showPaintManager = true` (modal overlay, not navigation)

3. User closes paint manager:
   - `showPaintManager = false`
   - Warning remains visible (FR-016a: non-dismissible)

4. New calculation starts:
   - Warning persists until new result available

---

## Validation Rules

### Input Method Validation

```typescript
// FR-005: Must be one of three values
type InputMethod = 'color_picker' | 'hex_code' | 'image_upload'

// Validation function
function isValidInputMethod(value: string): value is InputMethod {
  return ['color_picker', 'hex_code', 'image_upload'].includes(value)
}
```

### Volume Validation (Zod Schema)

```typescript
import { z } from 'zod'

// FR-012d, FR-012f
const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

// FR-012a, FR-012b, FR-012c
const ratioPredictionSchema = z.object({
  paints: z.array(z.object({
    paintId: z.string().uuid(),
    volume: paintVolumeSchema
  }))
  .min(2, "Ratio Prediction requires at least 2 paints")
  .max(5, "Ratio Prediction allows maximum 5 paints")
})
```

### Mode Validation

```typescript
// FR-011: Must be one of three values
type CalculationMode = 'Standard' | 'Enhanced' | 'Ratio Prediction'

// Mode constraints
const modeConstraints = {
  Standard: { maxPaints: 3, targetDeltaE: 5.0, timeout: 10000 },   // NFR-002
  Enhanced: { maxPaints: 5, targetDeltaE: 2.0, timeout: 30000 },   // NFR-001
  'Ratio Prediction': { minPaints: 2, maxPaints: 5 }               // FR-012a, FR-012b
}
```

---

## State Synchronization

### Session Metadata Completeness Check

Before enabling "Save This Formula" button (FR-003f):

```typescript
interface SessionMetadataCheck {
  hasValidResult: boolean          // calculationResult !== null
  hasInputMethod: boolean          // inputMethod is set
  hasMode: boolean                 // enhancedMode or mode is determined
  isCalculating: boolean           // No active calculation
}

// Button enable logic
const canSaveSession = (state: SessionMetadataCheck): boolean => {
  return state.hasValidResult
    && state.hasInputMethod
    && state.hasMode
    && !state.isCalculating
}
```

---

## Summary

**Database Changes**: None required
**Client State Models**: 5 state structures defined
**Validation Rules**: 3 Zod schemas + type guards
**State Transitions**: Documented for all 5 states

All state structures align with functional requirements and constitutional principles (Type Safety & Validation).
