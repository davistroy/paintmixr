# Technical Research: Bug Fixes from E2E Testing

**Feature**: 006-fix-issues-fix
**Date**: 2025-10-03
**Scope**: Bug fixes only - no new features

---

## R1: Supabase Client Patterns in Next.js API Routes

### Problem Statement
The `/api/optimize` route uses `createAdminClient()` which cannot access user session cookies, causing 401 Unauthorized errors even for authenticated users.

### Research Findings

**Admin Client vs Route Handler Client**:
- **Admin Client** (`createAdminClient()`):
  - Uses service role key for elevated permissions
  - Synchronous instantiation
  - **Cannot access HTTP request cookies**
  - Used for admin operations (user metadata updates, RLS bypass)

- **Route Handler Client** (`createClient()` from route-handler.ts):
  - Uses anon key with RLS policies
  - Asynchronous instantiation (awaits cookies())
  - **Accesses session cookies from HTTP request**
  - Used for user-scoped API operations

### Decision
**Use route handler client in all user-facing API routes**

### Implementation Pattern
```typescript
// WRONG (current issue in /api/optimize)
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
const user = await getCurrentUser(supabase)  // Always returns null

// CORRECT
import { createClient } from '@/lib/supabase/route-handler'
const supabase = await createClient()
const user = await getCurrentUser(supabase)  // Returns authenticated user
```

### Affected Files
- `/src/app/api/optimize/route.ts` (lines 82, 331)

### Validation
- Existing E2E tests already verify authenticated requests work
- Fix validated by testing Enhanced Accuracy Mode with authenticated user

---

## R2: Toast Notification System Selection

### Requirements
- Accessible (WCAG 2.1 AA compliant)
- Consistent with existing design system (shadcn/ui + Radix UI)
- Auto-dismiss with manual dismiss option
- Multiple toast types (success, error, info)
- Non-blocking UI (top-right positioning)

### Options Considered

**Option A: shadcn/ui Toast (Radix UI primitive)**
- ✅ Already using shadcn/ui components
- ✅ Accessible by default (ARIA attributes, keyboard navigation)
- ✅ Customizable styling with Tailwind
- ✅ TypeScript support
- ✅ Auto-dismiss configurable
- ❌ Requires manual installation (3 files)

**Option B: react-hot-toast**
- ✅ Popular, lightweight (3.7kb gzipped)
- ✅ Simple API
- ⚠️ Additional dependency
- ⚠️ May conflict with existing design system

**Option C: Custom implementation**
- ✅ Full control
- ❌ More code to maintain
- ❌ Accessibility requires manual implementation
- ❌ Testing burden increases

### Decision
**Use shadcn/ui Toast component (Option A)**

### Rationale
- Consistent with existing component library (no design fragmentation)
- Accessibility built-in (meets constitutional requirements)
- Minimal bundle size impact (Radix UI already included)
- Well-documented, TypeScript-first

### Implementation
1. Install via shadcn CLI: `npx shadcn@latest add toast`
2. Add `<Toaster />` to root layout
3. Use `useToast()` hook in components

```typescript
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

toast({
  title: "Session saved successfully",
  variant: "success",
  duration: 3000,
})
```

### Files to Create
- `/src/components/ui/toast.tsx` (Toast primitive component)
- `/src/components/ui/toaster.tsx` (Toast container/provider)
- `/src/hooks/use-toast.ts` (Toast hook for triggering)

---

## R3: Error Message Translation Strategy

### Problem Statement
Users currently see technical error messages like "API error: 401" or "500 Internal Server Error" which are not user-friendly.

### Requirements
- Translate HTTP status codes to plain language
- Distinguish user errors from system errors
- Maintain technical details for debugging (console logs only)
- Consistent messaging across all components

### Design Pattern

**Centralized Error Utility**:
```typescript
// src/lib/errors/user-messages.ts
export interface ApiError {
  status?: number
  code?: string
  message?: string
}

export function translateApiError(error: ApiError): string {
  // HTTP status code mapping
  if (error.status) {
    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Session expired. Please sign in again.',
      403: 'You don\'t have permission to perform this action.',
      404: 'The requested resource was not found.',
      429: 'Too many requests. Please try again later.',
      500: 'Unable to complete request. Please try again.',
      503: 'Service temporarily unavailable. Please try again later.',
    }
    return statusMessages[error.status] || 'An unexpected error occurred.'
  }

  // Named error codes
  const codeMessages: Record<string, string> = {
    'NETWORK_ERROR': 'Connection issue. Please check your internet connection.',
    'TIMEOUT': 'Request timed out. Please try again.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
  }

  return codeMessages[error.code || ''] || error.message || 'An unexpected error occurred.'
}
```

### Usage Pattern
```typescript
try {
  await saveSession(data)
  toast({ title: "Session saved successfully", variant: "success" })
} catch (error) {
  const userMessage = translateApiError({
    status: error.response?.status,
    code: error.code,
  })
  toast({ title: userMessage, variant: "destructive" })
  console.error('Session save failed:', error)  // Technical details for debugging
}
```

### Message Standards
- **Success**: Positive, brief confirmation ("Session saved successfully")
- **Error**: Actionable guidance ("Session expired. Please sign in again.")
- **Info**: Neutral, informative ("Session details view coming soon")

---

## R4: Retry Logic for Transient Authentication Failures

### Problem Statement
Supabase auth tokens may briefly expire during refresh, causing temporary 401 errors that would succeed on retry.

### Requirements
- Retry once automatically for 401 errors
- Avoid infinite retry loops
- Redirect to login if retry fails
- Transparent to user (no flash of error state)

### Decision
**Single automatic retry with 500ms delay**

### Implementation Pattern
```typescript
async function fetchWithAuthRetry(
  fetcher: () => Promise<Response>,
  retryCount: number = 0
): Promise<Response> {
  try {
    const response = await fetcher()

    if (response.status === 401 && retryCount === 0) {
      // Wait briefly for token refresh
      await new Promise(resolve => setTimeout(resolve, 500))
      return fetchWithAuthRetry(fetcher, retryCount + 1)
    }

    if (response.status === 401 && retryCount > 0) {
      // Second failure - redirect to login
      window.location.href = '/auth/signin?reason=session_expired'
      throw new Error('Session expired')
    }

    return response
  } catch (error) {
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return fetchWithAuthRetry(fetcher, retryCount + 1)
    }
    throw error
  }
}
```

### Rationale
- Single retry handles transient token refresh (common Supabase pattern)
- 500ms delay allows auth token to propagate
- Second failure indicates genuine expiration (redirect to login)
- Network errors also get one retry attempt

---

## R5: Session Expiration Messaging

### Problem Statement
When users are redirected to login due to expired session, they need clear explanation of why they were signed out.

### Decision
**Use query parameter pattern: `/auth/signin?reason=session_expired`**

### Implementation
```typescript
// In signin page component
const searchParams = await props.searchParams
const reason = searchParams?.reason

useEffect(() => {
  if (reason === 'session_expired') {
    toast({
      title: 'Your session has expired. Please sign in again.',
      variant: 'default',
      duration: 5000,
    })
  }
}, [reason])
```

### Rationale
- Clear cause-effect relationship for user
- Query param persists through page load
- Toast message appears after page renders (better UX than inline message)
- Pattern can be extended for other reasons (e.g., `?reason=account_locked`)

---

## R6: Session Detail View Placeholder Handling

### Problem Statement
Session card click currently times out because detail view doesn't exist yet. Need graceful degradation.

### Options Considered

**Option A: Disable click entirely**
- ✅ Simple
- ❌ Poor UX (cards look clickable but aren't)
- ❌ No visual feedback

**Option B: Show toast "Coming soon"**
- ✅ Clear communication
- ✅ Non-intrusive
- ✅ Maintains clickable appearance
- ✅ Easy to remove when detail view implemented

**Option C: Show modal placeholder**
- ⚠️ More intrusive
- ⚠️ Requires more code
- ✅ Could preview session data

### Decision
**Option B: Toast notification with "Session details view coming soon" message**

### Implementation
```typescript
// In SessionCard component
const handleClick = () => {
  if (!onDetailClick) {
    toast({
      title: 'Session details view coming soon',
      variant: 'default',
      duration: 3000,
    })
    return
  }
  onDetailClick(session.id)
}
```

### Rationale
- Minimal code change (one toast call)
- Clear user communication
- Easy to replace with real detail view later
- Maintains consistent interaction pattern

---

## Summary of Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| **Supabase Client** | Route handler client | Accesses session cookies for auth |
| **Toast Library** | shadcn/ui Toast | Consistent with design system, accessible |
| **Error Messages** | Centralized translation utility | Consistent UX, maintainable |
| **Retry Logic** | Single retry with 500ms delay | Handles token refresh, prevents loops |
| **Session Expiration** | Query param + toast message | Clear communication, extensible pattern |
| **Detail View Placeholder** | Toast "Coming soon" | Non-intrusive, easy to replace |

---

## Dependencies

### New Dependencies
- None (shadcn/ui Toast uses existing Radix UI primitives already in project)

### Existing Dependencies (Referenced)
- `@supabase/ssr` v0.5.2 (route handler client)
- `@radix-ui/react-toast` (via shadcn/ui)
- `tailwindcss` (Toast styling)

---

## Performance Impact

### Bundle Size
- shadcn/ui Toast: ~2-3kb gzipped (Radix UI primitives already included)
- Error translation utility: <1kb
- **Total impact**: <4kb

### Runtime Performance
- Toast rendering: <16ms (single React component)
- Error translation: O(1) lookup (hash map)
- Retry logic: Adds 500ms on first 401 (acceptable for UX)

**No performance regression expected** - all changes well within constitutional performance budgets.

---

## Accessibility Considerations

### Toast Component
- ✅ ARIA live region (role="status" or role="alert")
- ✅ Keyboard dismissible (ESC key)
- ✅ Focus management (doesn't trap focus)
- ✅ Color contrast: Will verify ≥4.5:1 for text

### Error Messages
- ✅ Screen reader friendly (plain language)
- ✅ Not relying on color alone (text communicates state)

---

## Testing Strategy

### Unit Tests
- Error message translation (all status codes)
- Toast hook behavior
- Retry logic (success, single retry, double failure)

### Integration Tests
- Session save with toast notification
- Auth failure with retry and redirect
- Session card click placeholder

### E2E Tests (Cypress)
- Enhanced Accuracy Mode (401 fix validation)
- Session save UX (toast appears, dialog closes)
- Session navigation (placeholder message)

---

## Migration Notes

### Breaking Changes
- None (bug fixes only, all changes backward compatible)

### Rollback Plan
If issues arise:
1. Revert `/api/optimize` client change (restore admin client)
2. Remove Toast components (app still functional without notifications)
3. Remove error translation (components handle errors inline)

All changes are additive or non-breaking fixes.

---

*Research complete - ready for Phase 1 design*
