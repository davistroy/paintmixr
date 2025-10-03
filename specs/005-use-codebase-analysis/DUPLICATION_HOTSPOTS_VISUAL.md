# Code Duplication Hotspots - Visual Analysis

**Generated:** 2025-10-02
**Tool:** jscpd v4.0.5 (strict mode)

---

## Top 15 Files by Duplicate Tokens

```
 1. app/api/paints/[id]/route.ts                               5,323 tokens │ ███████████████████████████
 2. lib/optimization/__tests__/tpe-hybrid.test.ts              4,926 tokens │ ████████
 3. lib/optimization/__tests__/differential-evolution.test.ts  3,642 tokens │ ██████
 4. lib/database/repositories/enhanced-paint-repository.ts     3,376 tokens │ ██████
 5. app/api/collections/[id]/route.ts                          2,086 tokens │ ██████
 6. app/api/paints/route.ts                                    2,014 tokens │ ████████
 7. app/api/collections/route.ts                               1,948 tokens │ █████
 8. app/api/mixing-history/route.ts                            1,908 tokens │ █████
 9. app/api/sessions/[id]/route.ts                             1,598 tokens │ █████████
10. lib/database/database.types.ts                             1,252 tokens │ ███
11. app/api/optimize/route.ts                                    774 tokens │ ██
12. app/api/image/extract-color/route.ts                         735 tokens │ ███
13. app/api/sessions/route.ts                                    630 tokens │ ██
14. lib/auth/supabase-server.ts                                  506 tokens │ ███
15. app/api/color-match/route.ts                                 465 tokens │ ██

Legend: Each █ ≈ 10% duplication percentage
```

---

## Duplication Distribution

```
┌─────────────────────────────────────────────────────────────┐
│ API Routes       ████████████████████████████████  66.9%    │
│ Test Files       ████████████████                  33.1%    │
│ Lib Files        (included in API/Test categories)          │
└─────────────────────────────────────────────────────────────┘

  Total Duplicate Tokens: 26,949
```

---

## Refactoring Impact by Task

```
Phase 1: API Routes (T054-T056)
┌────────────────────────────────────────────────────────┐
│ Current Duplication:  18,035 tokens (66.9%)           │
│ Expected Reduction:   12,000 tokens                   │
│ Target Duplication:   ~6,000 tokens                   │
│ Impact:               59% of total duplication        │
└────────────────────────────────────────────────────────┘

Phase 2: Repositories (T057)
┌────────────────────────────────────────────────────────┐
│ Current Duplication:  3,376 tokens (12.5%)            │
│ Expected Reduction:   7,000 tokens                    │
│ Target Duplication:   ~1,000 tokens                   │
│ Impact:               34% of total duplication        │
└────────────────────────────────────────────────────────┘

Phase 3: Tests (T060-T063)
┌────────────────────────────────────────────────────────┐
│ Current Duplication:  8,914 tokens (33.1%)            │
│ Expected Reduction:   6,000 tokens                    │
│ Target Duplication:   ~3,000 tokens                   │
│ Impact:               29% of total duplication        │
└────────────────────────────────────────────────────────┘
```

---

## File-Level Refactoring Targets

### Critical Priority (>100% duplication)

| File | Current % | Target % | Reduction Task |
|------|-----------|----------|----------------|
| `app/api/paints/[id]/route.ts` | 271.4% | <10% | T054-T056 |
| `app/api/sessions/[id]/route.ts` | 96.6% | <10% | T054-T056 |

### High Priority (50-100% duplication)

| File | Current % | Target % | Reduction Task |
|------|-----------|----------|----------------|
| `lib/optimization/__tests__/tpe-hybrid.test.ts` | 80.8% | <30% | T060-T061 |
| `app/api/paints/route.ts` | 80.3% | <10% | T054-T056 |
| `lib/database/repositories/enhanced-paint-repository.ts` | 65.1% | <20% | T057 |
| `app/api/collections/[id]/route.ts` | 61.3% | <10% | T054-T056 |
| `lib/optimization/__tests__/differential-evolution.test.ts` | 60.5% | <30% | T060-T062 |
| `app/api/collections/route.ts` | 55.0% | <10% | T054-T056 |
| `app/api/mixing-history/route.ts` | 54.3% | <10% | T054-T056 |

---

## Duplicate Code Patterns (Most Common)

### Pattern 1: Auth & User Retrieval (12 instances)

```typescript
// Found in: All 13 API routes
async function getCurrentUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

const supabase = createServerSupabaseClient();
const user = await getCurrentUser(supabase);
```

**Solution:** T054 - Create `withAuth()` middleware wrapper

---

### Pattern 2: Validation Error Handling (12 instances)

```typescript
// Found in: All 13 API routes
if (error instanceof z.ZodError) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid X ID',
        details: error.errors
      }
    },
    { status: 400 }
  );
}
```

**Solution:** T054 - Create `handleValidationError()` helper

---

### Pattern 3: Success Response Format (10 instances)

```typescript
// Found in: 10 API routes
return NextResponse.json({
  data: result.data,
  meta: {
    retrieved_at: new Date().toISOString(),
    version: result.data.version
  }
});
```

**Solution:** T054 - Create `createSuccessResponse()` helper

---

### Pattern 4: Repository CRUD Pattern (44 instances)

```typescript
// Found in: enhanced-paint-repository.ts (all methods)
try {
  const { data, error } = await this.supabase
    .from('table_name')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return {
      data: null,
      error: {
        code: 'DATABASE_ERROR',
        message: error.message
      }
    };
  }

  if (!data) {
    return {
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found'
      }
    };
  }

  return { data, error: null };
} catch (err) {
  return {
    data: null,
    error: {
      code: 'UNEXPECTED_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error'
    }
  };
}
```

**Solution:** T057 - Create `BaseRepository` with generic `executeQuery()` method

---

### Pattern 5: Test Setup Boilerplate (86 instances)

```typescript
// Found in: tpe-hybrid.test.ts, differential-evolution.test.ts
const mockPaints = [
  { id: '1', name: 'Red', lab: [50, 80, 60] },
  { id: '2', name: 'Blue', lab: [30, 20, -50] },
  { id: '3', name: 'Yellow', lab: [90, -10, 90] }
];

describe('optimizer test', () => {
  let optimizer: SomeOptimizer;

  beforeEach(() => {
    optimizer = new SomeOptimizer({
      maxIterations: 100,
      populationSize: 20
    });
  });
});
```

**Solution:** T060 - Create test helper utilities

---

## Expected Outcome After Refactoring

```
BEFORE (Baseline):
  Total Tokens: 255,426
  Duplicate Tokens: 20,356 (7.97%)
  Clone Blocks: 201

AFTER (Projected):
  Total Tokens: 255,426 (unchanged)
  Duplicate Tokens: ~10,000 (3.9%)
  Clone Blocks: ~85

REDUCTION:
  Duplicate Tokens: -10,356 (-51%) ✅
  Clone Blocks: -116 (-58%) ✅
```

---

## Verification Checklist

- [ ] T054: API route helpers created
- [ ] T055: Common validation schemas created
- [ ] T056: All 13 API routes migrated
- [ ] T057: BaseRepository created and enhanced-paint-repository refactored
- [ ] T060: Test helper utilities created
- [ ] T061-T063: All 3 test files migrated
- [ ] T066: Re-run jscpd and verify 40-50% reduction achieved

---

**Next Action:** Begin T054 - Create `src/lib/api/route-helpers.ts`
