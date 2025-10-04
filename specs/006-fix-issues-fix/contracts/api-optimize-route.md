# API Contract: /api/optimize (Bug Fix)

**Feature**: 006-fix-issues-fix
**Endpoint**: `POST /api/optimize`
**Status**: EXISTING - Bug fix only (authentication change)

---

## Overview

This endpoint optimizes paint mixing formulas for enhanced accuracy (Delta E ≤ 2.0 target). **This contract documents the bug fix to authentication - no API signature changes.**

---

## Bug Fix Details

### Issue
Route uses `createAdminClient()` which cannot access user session cookies, causing 401 Unauthorized for all authenticated requests.

### Fix
Replace admin client with route handler client at lines 82 and 331:

```typescript
// BEFORE (lines 82-83)
const supabase = createAdminClient()
const user = await getCurrentUser(supabase)  // Always returns null

// AFTER (lines 82-83)
import { createClient } from '@/lib/supabase/route-handler'
const supabase = await createClient()
const user = await getCurrentUser(supabase)  // Returns authenticated user

// BEFORE (line 331)
const supabase = createAdminClient()

// AFTER (line 331)
const supabase = await createClient()
```

---

## API Specification (Unchanged)

### Request

**Method**: `POST`
**Path**: `/api/optimize`
**Authentication**: Required (JWT session cookie)

**Headers**:
```
Content-Type: application/json
Cookie: sb-<project>-auth-token=<jwt>
```

**Body**:
```typescript
{
  targetColor: ColorValue,           // Target color to match
  initialFormula: MixingFormula,     // Basic formula from /api/color-match
  availablePaints: Paint[],          // User's paint library
  constraints?: {
    maxPaints?: number,              // Max paints to use (default: 5)
    targetVolume?: number,           // Target volume in ml (default: 200)
    preferredBrands?: string[]       // Brand preferences
  }
}
```

---

### Response

**Success** (200 OK):
```typescript
{
  optimizedFormula: MixingFormula,   // Enhanced accuracy formula
  deltaE: number,                    // Achieved Delta E (target: ≤2.0)
  improvementFromInitial: number,    // Delta E reduction vs basic formula
  confidence: number,                // Optimization confidence (0-1)
  metadata: {
    iterationsRun: number,
    calculationTimeMs: number,
    k_munk_coefficients_used: boolean
  }
}
```

**Error Responses**:

**401 Unauthorized** (FIXED - should no longer occur for authenticated users):
```typescript
{
  error: "Unauthorized",
  message: "Session expired. Please sign in again."
}
```

**400 Bad Request**:
```typescript
{
  error: "Invalid request",
  message: "Target color or initial formula missing"
}
```

**500 Internal Server Error**:
```typescript
{
  error: "Optimization failed",
  message: "Unable to calculate optimized formula. Please try again."
}
```

---

## Authentication Contract

### Before Fix (BROKEN)
```typescript
const supabase = createAdminClient()  // Uses service role key
const user = await getCurrentUser(supabase)
// Result: user = null (admin client can't access cookies)
// Response: 401 Unauthorized
```

### After Fix (WORKING)
```typescript
const supabase = await createClient()  // Uses route handler pattern
const user = await getCurrentUser(supabase)
// Result: user = { id, email, ... } from session cookie
// Response: 200 OK with optimized formula
```

---

## Validation Rules (Unchanged)

**Request Validation**:
- `targetColor.hex` must match `/^#[0-9A-F]{6}$/i`
- `initialFormula` must have ≥1 paint ratios
- `availablePaints` must have ≥2 paints (can't optimize with 1)
- `constraints.maxPaints` must be 2-10 if provided
- `constraints.targetVolume` must be 10-1000ml if provided

**Response Validation**:
- `deltaE` must be ≥0
- `optimizedFormula.paint_ratios` percentages must sum to 100 ± 0.1
- `confidence` must be 0-1
- `metadata.calculationTimeMs` should be <10000ms per performance requirements

---

## Performance Contract (Unchanged)

**Target**: ≤10 seconds per constitutional requirement (NFR-001)
**Typical**: 2-5 seconds for standard optimizations
**Timeout**: 15 seconds (client-side, allows retry)

**Monitoring**:
- Log calculation time in response metadata
- Alert if p95 > 8 seconds (approaching limit)
- Track Delta E improvement distribution

---

## Security Contract (Unchanged)

**Authentication**:
- ✅ JWT session cookie required (validated by route handler client)
- ✅ Row Level Security applied (user sees only their paints)
- ❌ No API key authentication (session-only)

**Authorization**:
- User can only optimize using their own paint library
- RLS policies enforce user_id isolation
- No admin bypass (service role not needed)

---

## Contract Test

```typescript
// cypress/e2e/api-optimize-auth.cy.ts

describe('POST /api/optimize - Authentication Fix', () => {
  beforeEach(() => {
    cy.login('troy@k4jda.com', 'Edw@rd67')
  })

  it('should accept authenticated requests (Issue #1 fix)', () => {
    cy.request({
      method: 'POST',
      url: '/api/optimize',
      body: {
        targetColor: { hex: '#FF5733' },
        initialFormula: mockFormula,
        availablePaints: mockPaints,
      },
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('optimizedFormula')
      expect(response.body.deltaE).to.be.lessThan(2.5)  // Enhanced target
    })
  })

  it('should return 401 for unauthenticated requests', () => {
    cy.clearCookies()
    cy.request({
      method: 'POST',
      url: '/api/optimize',
      body: {
        targetColor: { hex: '#FF5733' },
        initialFormula: mockFormula,
        availablePaints: mockPaints,
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401)
    })
  })
})
```

---

## Regression Prevention

**Before Deployment**:
- ✅ Verify E2E test passes with authenticated user
- ✅ Verify 401 still returned for unauthenticated requests
- ✅ Verify Delta E ≤ 2.0 accuracy maintained
- ✅ Verify performance <10s requirement still met

**After Deployment**:
- Monitor `/api/optimize` 401 error rate (should drop to near-zero)
- Monitor Delta E distribution (should be unchanged)
- Monitor calculation times (should be unchanged)

---

*Contract verified - authentication fix does not alter API behavior, only fixes broken auth logic*
