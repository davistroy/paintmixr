# API Contract: Code Refactoring & Reuse

**Feature**: 005-use-codebase-analysis
**Created**: 2025-10-02
**Purpose**: Define contracts for shared utilities, component refactoring, and code duplication reduction

---

## Contract 1: Shared API Client Utilities

**Module**: `src/lib/api/client.ts`

**Description**: Centralized API client with consistent error handling, request/response typing, and standardized patterns for all HTTP operations.

**Requirements**: FR-028, FR-029

### API Client Interface

```typescript
/**
 * Typed API error class for consistent error handling
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Request options for API client
 */
export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  signal?: AbortSignal // For cancellation
}
```

### Core Functions

**Base Request Handler**:
```typescript
/**
 * Low-level API request with error handling
 * All API calls should use this function
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    })

    const data = await response.json()

    if (!response.ok) {
      throw new APIError(
        response.status,
        data.error || 'unknown_error',
        data.message || 'An error occurred',
        data.details
      )
    }

    return { data: data as T }
  } catch (error) {
    if (error instanceof APIError) {
      return { error: { code: error.code, message: error.message, details: error.details } }
    }
    return { error: { code: 'network_error', message: 'Network request failed' } }
  }
}
```

**Convenience Methods**:
```typescript
/**
 * GET request helper
 */
export async function apiGet<T>(
  endpoint: string,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', signal })
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'POST', body, signal })
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'PUT', body, signal })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
  endpoint: string,
  signal?: AbortSignal
): Promise<APIResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', signal })
}
```

### Usage Pattern

**Component Example**:
```typescript
import { apiPost, APIError } from '@/lib/api/client'
import { useState } from 'react'

function EmailSigninForm() {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (email: string, password: string) => {
    // Use shared API client
    const response = await apiPost<{ redirectTo: string }>(
      '/api/auth/email-signin',
      { email, password }
    )

    if (response.error) {
      // Consistent error handling
      setError(response.error.message)
      return
    }

    // Success handling
    window.location.href = response.data!.redirectTo
  }

  return (
    // ... form UI with error display
  )
}
```

### Error Handling Patterns

**Standard Error Codes** (all components must use):
```typescript
// Authentication errors
'invalid_credentials' // Wrong email/password
'account_locked' // Too many failed attempts
'oauth_precedence' // OAuth-only account
'rate_limited' // Too many requests

// Validation errors
'validation_error' // Invalid input format
'missing_field' // Required field missing

// System errors
'network_error' // Fetch failed
'unknown_error' // Unexpected error
```

**Component Error Display** (consistent pattern):
```typescript
{error && (
  <div className="rounded-md bg-red-50 p-4">
    <p className="text-sm text-red-800">{error}</p>
  </div>
)}
```

---

## Contract 2: Shared Form Utilities

**Module**: `src/lib/forms/`

**Description**: Reusable form validation, error display, and submission handling patterns for React Hook Form integration.

**Requirements**: FR-033, FR-034

### Form Validation Schemas

**Location**: `src/lib/forms/schemas.ts`

```typescript
import { z } from 'zod'

/**
 * Email validation schema (normalized)
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .transform(val => val.toLowerCase().trim())

/**
 * Password validation schema
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Sign-in form schema
 */
export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

/**
 * Volume constraints schema (UI form)
 */
export const volumeConstraintsSchema = z.object({
  minVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  maxVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number'),
  targetVolume: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid number').optional(),
  displayUnit: z.enum(['ml', 'oz', 'gal'])
}).refine(
  data => parseFloat(data.minVolume) < parseFloat(data.maxVolume),
  { message: 'Min volume must be less than max volume', path: ['minVolume'] }
)
```

### Form Error Display Hook

**Location**: `src/lib/forms/useFormErrors.ts`

```typescript
import { FieldErrors } from 'react-hook-form'

/**
 * Extract first error message from React Hook Form errors
 */
export function useFormErrors<T extends Record<string, unknown>>(
  errors: FieldErrors<T>
): string | null {
  const errorKeys = Object.keys(errors) as Array<keyof T>
  if (errorKeys.length === 0) return null

  const firstError = errors[errorKeys[0]]
  return firstError?.message?.toString() || 'Validation error'
}

/**
 * Get error message for specific field
 */
export function getFieldError<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  field: keyof T
): string | null {
  const error = errors[field]
  return error?.message?.toString() || null
}
```

### Form Submission Hook

**Location**: `src/lib/forms/useFormSubmit.ts`

```typescript
import { useState } from 'react'
import { APIResponse } from '@/lib/api/client'

/**
 * Generic form submission handler with loading/error states
 */
export function useFormSubmit<TInput, TOutput>() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (
    data: TInput,
    apiCall: (data: TInput) => Promise<APIResponse<TOutput>>
  ): Promise<TOutput | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiCall(data)

      if (response.error) {
        setError(response.error.message)
        return null
      }

      return response.data!
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearError = () => setError(null)

  return { submit, isSubmitting, error, clearError }
}
```

### Usage Pattern

**Complete Form Component Example**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signinSchema } from '@/lib/forms/schemas'
import { useFormSubmit } from '@/lib/forms/useFormSubmit'
import { apiPost } from '@/lib/api/client'
import { z } from 'zod'

type SigninFormData = z.infer<typeof signinSchema>

function EmailSigninForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema)
  })

  const { submit, isSubmitting, error } = useFormSubmit<
    SigninFormData,
    { redirectTo: string }
  >()

  const onSubmit = async (data: SigninFormData) => {
    const result = await submit(data, (formData) =>
      apiPost('/api/auth/email-signin', formData)
    )

    if (result) {
      window.location.href = result.redirectTo
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Email field with validation error */}
      <div>
        <input {...register('email')} type="email" />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password field with validation error */}
      <div>
        <input {...register('password')} type="password" />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* API error display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit button with loading state */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

---

## Contract 3: Shared Data Fetching Hooks

**Module**: `src/lib/hooks/`

**Description**: Reusable React hooks for common patterns like pagination, filtering, and data fetching.

**Requirements**: FR-031

### Pagination Hook

**Location**: `src/lib/hooks/usePagination.ts`

```typescript
import { useState, useMemo } from 'react'

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
}

export interface PaginationControls {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
}

/**
 * Generic pagination hook with consistent behavior
 */
export function usePagination(
  totalItems: number,
  initialPageSize: number = 20
): PaginationControls {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.ceil(totalItems / pageSize)

  const controls = useMemo(() => ({
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage: (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(validPage)
    },
    nextPage: () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1)
      }
    },
    previousPage: () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    },
    setPageSize: (size: number) => {
      setPageSize(size)
      setCurrentPage(1) // Reset to first page on size change
    }
  }), [currentPage, totalPages, pageSize])

  return controls
}
```

### Filtering Hook

**Location**: `src/lib/hooks/useFilters.ts`

```typescript
import { useState, useMemo } from 'react'

export type FilterValue = string | number | boolean | null

export interface FilterState {
  [key: string]: FilterValue
}

/**
 * Generic filtering hook with type safety
 */
export function useFilters<T extends Record<string, FilterValue>>(
  initialFilters: T
) {
  const [filters, setFilters] = useState<T>(initialFilters)

  const controls = useMemo(() => ({
    filters,
    setFilter: <K extends keyof T>(key: K, value: T[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    clearFilter: <K extends keyof T>(key: K) => {
      setFilters(prev => ({ ...prev, [key]: initialFilters[key] }))
    },
    clearAllFilters: () => {
      setFilters(initialFilters)
    },
    hasActiveFilters: () => {
      return Object.keys(filters).some(
        key => filters[key] !== initialFilters[key as keyof T]
      )
    }
  }), [filters, initialFilters])

  return controls
}
```

### Data Fetching Hook

**Location**: `src/lib/hooks/useDataFetch.ts`

```typescript
import { useState, useEffect } from 'react'
import { apiGet, APIResponse } from '@/lib/api/client'

export interface DataFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic data fetching hook with loading/error states
 */
export function useDataFetch<T>(
  endpoint: string,
  dependencies: unknown[] = []
): DataFetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const response = await apiGet<T>(endpoint)

    if (response.error) {
      setError(response.error.message)
      setData(null)
    } else {
      setData(response.data!)
      setError(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, dependencies) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetchData }
}
```

### Usage Pattern

**Component with Pagination and Filtering**:
```typescript
import { usePagination } from '@/lib/hooks/usePagination'
import { useFilters } from '@/lib/hooks/useFilters'
import { useDataFetch } from '@/lib/hooks/useDataFetch'
import { Paint } from '@/lib/types'

function PaintLibrary() {
  // Filtering
  const { filters, setFilter, clearAllFilters } = useFilters({
    brand: null,
    search: null
  })

  // Data fetching with filters
  const endpoint = `/api/paints?brand=${filters.brand || ''}&search=${filters.search || ''}`
  const { data: paints, loading, error } = useDataFetch<Paint[]>(endpoint, [filters])

  // Pagination (client-side)
  const pagination = usePagination(paints?.length || 0)
  const paginatedPaints = paints?.slice(
    (pagination.currentPage - 1) * 20,
    pagination.currentPage * 20
  )

  return (
    <div>
      {/* Filter controls */}
      <input
        placeholder="Search paints..."
        onChange={e => setFilter('search', e.target.value)}
      />

      {/* Loading/error states */}
      {loading && <p>Loading paints...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Paint list */}
      {paginatedPaints?.map(paint => (
        <div key={paint.id}>{paint.name}</div>
      ))}

      {/* Pagination controls */}
      <div>
        <button
          disabled={!pagination.hasPreviousPage}
          onClick={pagination.previousPage}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button
          disabled={!pagination.hasNextPage}
          onClick={pagination.nextPage}
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

---

## Contract Testing Requirements

### API Client Tests

1. **Error Handling**:
   - Network errors caught and formatted correctly
   - API errors with status codes handled
   - Error codes mapped to APIError class

2. **Request/Response**:
   - Correct HTTP methods used
   - Request body serialized to JSON
   - Response deserialized correctly
   - Headers passed through

### Form Utilities Tests

1. **Validation Schemas**:
   - Email normalization (lowercase + trim)
   - Password strength requirements
   - Volume constraints validated

2. **Form Hooks**:
   - Loading states managed correctly
   - Error states cleared on retry
   - Submission prevented during loading

### Data Fetching Tests

1. **Pagination**:
   - Page boundaries respected (1 to totalPages)
   - Page size changes reset to page 1
   - Navigation disabled at boundaries

2. **Filtering**:
   - Filter state updates correctly
   - Clear filter resets to initial value
   - Active filter detection works

3. **Data Fetching**:
   - Loading state during fetch
   - Error state on failure
   - Refetch triggers new request

---

## Code Duplication Reduction Metrics

**Target**: Reduce overall code duplication by 40-50% as measured by token-based similarity (FR-032)

**Measurement Tool**: jscpd (token-based AST analysis)

**Baseline** (from CODEBASE_ANALYSIS_REPORT):
- Duplicate tokens: ~60% of codebase
- Duplicate blocks: 150+ instances

**Target After Refactoring**:
- Duplicate tokens: 30-35% of codebase
- Duplicate blocks: <75 instances

**Key Areas for Duplication Reduction**:
1. API fetch calls → `apiClient` utilities
2. Form validation → shared Zod schemas
3. Form submission → `useFormSubmit` hook
4. Pagination logic → `usePagination` hook
5. Filtering logic → `useFilters` hook
6. Data fetching → `useDataFetch` hook

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
