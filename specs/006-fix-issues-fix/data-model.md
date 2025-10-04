# Data Model: Bug Fixes from E2E Testing

**Feature**: 006-fix-issues-fix
**Date**: 2025-10-03
**Scope**: Bug fixes - no database schema changes

---

## Overview

This feature fixes bugs in existing components and API routes. **No database schema modifications are required.** All changes are to client-side TypeScript interfaces and React component props.

---

## Existing Entities (Reference Only)

These entities already exist and are NOT modified by this feature:

### Session
```typescript
interface Session {
  id: string
  user_id: string
  session_type: 'color_matching' | 'ratio_prediction'
  input_method: 'hex_input' | 'color_picker' | 'image_upload' | 'manual_ratios'
  target_color?: ColorValue
  calculated_color?: ColorValue
  delta_e?: number
  formula?: MixingFormula
  custom_label: string
  notes?: string
  image_url?: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}
```

### ColorValue
```typescript
interface ColorValue {
  hex: string  // #RRGGBB format
  lab?: {
    l: number  // Lightness (0-100)
    a: number  // Green-Red (-128 to 127)
    b: number  // Blue-Yellow (-128 to 127)
  }
}
```

### MixingFormula
```typescript
interface MixingFormula {
  paint_ratios: Array<{
    paint_id: string
    paint_name: string
    color_hex: string
    percentage: number  // 0-100
    volume_ml: number
  }>
  total_volume_ml: number
  mixing_order?: string[]
  mixing_tips?: string[]
}
```

---

## New TypeScript Interfaces

### Error Message Mapping

```typescript
// src/lib/errors/user-messages.ts

export interface ApiError {
  status?: number        // HTTP status code (401, 500, etc.)
  code?: string         // Named error code (NETWORK_ERROR, TIMEOUT)
  message?: string      // Technical error message (for console logging)
}

export interface ToastMessage {
  title: string         // User-friendly message
  variant: 'default' | 'success' | 'destructive'
  duration?: number     // Auto-dismiss time in ms (default: 3000)
}
```

**Validation Rules**:
- `status` must be valid HTTP status code (100-599) if provided
- `code` must match predefined error codes if provided
- `message` is optional (for technical logging only)
- `title` is required and must be non-empty
- `variant` determines toast styling and ARIA role
- `duration` defaults to 3000ms for auto-dismiss

**Usage**:
```typescript
const userMessage = translateApiError({
  status: error.response?.status,
  code: error.code,
})
toast({
  title: userMessage,
  variant: 'destructive',
  duration: 5000,
})
```

---

## Modified Component Interfaces

### SaveForm Component Props

**Current (before fix)**:
```typescript
interface SaveFormProps {
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
}
```

**Updated (after fix)**:
```typescript
interface SaveFormProps {
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
  onSuccess?: () => void  // NEW: Callback after successful save
}
```

**Change Summary**:
- Added optional `onSuccess` callback
- Called after `onSave` completes successfully
- Parent component uses this to show toast and close dialog

**Validation**:
- `onSuccess` is optional (maintains backward compatibility)
- No validation required (function type checked by TypeScript)

---

### SessionCard Component Props

**Current (before fix)**:
```typescript
interface SessionCardProps {
  session: Session
  onFavoriteToggle?: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
  className?: string
}
```

**Updated (after fix)**:
```typescript
interface SessionCardProps {
  session: Session
  onFavoriteToggle?: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
  onDetailClick?: (sessionId: string) => void  // NEW: Optional detail handler
  className?: string
}
```

**Change Summary**:
- Added optional `onDetailClick` callback
- If undefined, clicking card shows "Coming soon" toast
- If defined, clicking card calls handler (for future implementation)

**Validation**:
- `onDetailClick` is optional (graceful degradation)
- When undefined, fallback behavior shows toast
- When defined, parent controls navigation

---

## Toast System Types

### useToast Hook

```typescript
// src/hooks/use-toast.ts

interface Toast {
  id: string
  title: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'success' | 'destructive'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'UPDATE_TOAST'; toast: Partial<Toast> & Pick<Toast, 'id'> }
  | { type: 'DISMISS_TOAST'; toastId: string }
  | { type: 'REMOVE_TOAST'; toastId: string }

function toast(props: Omit<Toast, 'id'>): void
function dismiss(toastId: string): void
```

**State Management**:
- Toast state managed via React reducer
- Each toast has unique ID (generated internally)
- Auto-dismiss timer managed per-toast
- Multiple toasts can be active simultaneously

**Accessibility**:
- `variant: 'destructive'` → ARIA `role="alert"` (interrupts screen readers)
- `variant: 'default' | 'success'` → ARIA `role="status"` (polite announcement)

---

## Error Code Constants

```typescript
// src/lib/errors/error-codes.ts

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

export const SUCCESS_MESSAGES = {
  SESSION_SAVED: 'Session saved successfully',
  SESSION_DELETED: 'Session deleted',
  SESSION_UPDATED: 'Session updated successfully',
  PAINT_ADDED: 'Paint added to library',
  PAINT_UPDATED: 'Paint updated successfully',
} as const

export const INFO_MESSAGES = {
  SESSION_DETAIL_COMING_SOON: 'Session details view coming soon',
  FEATURE_IN_DEVELOPMENT: 'This feature is coming soon',
} as const
```

**Type Safety**:
- All message constants are immutable (`as const`)
- TypeScript enforces valid keys at compile time
- No magic strings in component code

---

## State Transitions

### Session Save Flow (with Toast Feedback)

```
Initial State: User viewing calculated formula
    ↓
User clicks "Save This Formula"
    ↓
Save dialog opens (SaveForm component)
    ↓
User fills session name
    ↓
User clicks "Save Session"
    ↓
[Loading state: "Saving..." spinner]
    ↓
┌─────────────────────────────────────┐
│ Success Path                        │
├─────────────────────────────────────┤
│ POST /api/sessions → 201 Created    │
│ Toast: "Session saved successfully" │
│ Wait 500ms                          │
│ Dialog closes                       │
│ User remains on current page        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Error Path                          │
├─────────────────────────────────────┤
│ POST /api/sessions → 4xx/5xx        │
│ Translate error to user message     │
│ Toast: User-friendly error          │
│ Dialog remains open                 │
│ User can retry or cancel            │
└─────────────────────────────────────┘
```

### Enhanced Accuracy Mode Flow (with Retry Logic)

```
Initial State: User enables Enhanced Accuracy Mode checkbox
    ↓
User enters color and clicks "Calculate Formula"
    ↓
[Loading: "Optimizing formula for enhanced accuracy..."]
    ↓
POST /api/color-match → 200 OK (basic formula)
    ↓
POST /api/optimize → ???
    ↓
┌─────────────────────────────────────┐
│ Success Path (First Try)            │
├─────────────────────────────────────┤
│ 200 OK                              │
│ Display optimized formula           │
│ Show Delta E accuracy indicator     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Retry Path (Transient 401)          │
├─────────────────────────────────────┤
│ First request → 401                 │
│ Wait 500ms                          │
│ Retry request → 200 OK              │
│ Display optimized formula           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Failure Path (Expired Session)      │
├─────────────────────────────────────┤
│ First request → 401                 │
│ Wait 500ms                          │
│ Retry request → 401                 │
│ Redirect: /auth/signin?reason=...   │
│ Toast: "Session expired..."         │
└─────────────────────────────────────┘
```

### Session Card Click Flow (Placeholder Handling)

```
Initial State: User viewing session history
    ↓
User clicks session card
    ↓
Check: onDetailClick prop defined?
    ↓
┌─────────────────────────────────────┐
│ Detail View Implemented              │
├─────────────────────────────────────┤
│ onDetailClick(sessionId)            │
│ Navigate to detail view             │
│ (Future implementation)             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Detail View Not Implemented (Now)    │
├─────────────────────────────────────┤
│ onDetailClick undefined             │
│ Toast: "Session details coming soon"│
│ No navigation occurs                │
│ User remains on history page        │
└─────────────────────────────────────┘
```

---

## Validation Rules

### Toast Message Validation

**Required Fields**:
- `title`: Non-empty string (max 200 characters for screen readers)
- `variant`: One of 'default' | 'success' | 'destructive'

**Optional Fields**:
- `description`: Additional details (max 500 characters)
- `duration`: Positive integer (recommended: 3000-7000ms)

**Accessibility**:
- Long messages (>50 words) should use longer duration (5000ms+)
- Destructive toasts should use `role="alert"` (handled by variant)
- Success toasts should use `role="status"` (handled by variant)

---

## Type Guards (No Changes)

Existing type guards remain unchanged:

```typescript
export function isColorValue(value: unknown): value is ColorValue
export function isValidHexColor(hex: string): boolean
export function isLABColor(value: unknown): value is LABColor
```

---

## Summary of Data Model Changes

| Entity/Interface | Change Type | Reason |
|------------------|-------------|--------|
| `SaveFormProps` | Modified | Added `onSuccess` callback for toast feedback |
| `SessionCardProps` | Modified | Added `onDetailClick` for graceful degradation |
| `ApiError` | New | Error translation utility interface |
| `ToastMessage` | New | Toast notification interface |
| `HTTP_STATUS_MESSAGES` | New | Error message constants |
| Database tables | None | No schema changes (bug fixes only) |

---

## Backward Compatibility

All changes are **backward compatible**:

✅ New props are optional (`onSuccess?`, `onDetailClick?`)
✅ Existing components continue to work without changes
✅ No breaking changes to API contracts
✅ No database migrations required

---

*Data model complete - ready for contract generation*
