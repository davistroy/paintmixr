# Code Duplication Reduction Plan - Feature 005

## Executive Summary

**Baseline Measurement Date:** 2025-10-02
**Tool:** jscpd v4.0.5 (strict mode)
**Target Reduction:** 40-50% reduction in duplicate tokens

### Baseline Metrics

```
OVERALL CODEBASE:
  Total Lines: 31,745
  Total Tokens: 255,426
  Duplicated Lines: 2,395
  Duplicated Tokens: 20,356
  Total Clone Blocks: 201
  Overall Duplication %: 7.54%
  Token Duplication %: 7.97%

BY FILE TYPE:
  TypeScript: 10.01% line duplication, 10.62% token duplication (172 clones)
  TSX: 4.57% line duplication (29 clones)
  JavaScript: 0% duplication
```

**Note:** The actual baseline (7.97% token duplication) is significantly better than the 60% estimated in the CODEBASE_ANALYSIS_REPORT. The report may have been measuring different metrics or including commented code.

### Reduction Targets

- **Current Token Duplication:** 7.97%
- **Target Token Duplication:** 4.0-4.5% (40-50% reduction)
- **Current Clone Blocks:** 201
- **Target Clone Blocks:** <100

---

## Top Duplication Hotspots

### Critical Files (>100% duplication)

1. **src/app/api/paints/[id]/route.ts**
   - 43 clone blocks
   - 271.4% token duplication
   - 5,323 duplicate tokens
   - **Primary Issues:** Repeated CRUD patterns, error handling, auth checks

2. **src/app/api/sessions/[id]/route.ts**
   - 10 clone blocks
   - 96.6% token duplication
   - 1,598 duplicate tokens
   - **Primary Issues:** Session validation, error responses

3. **src/lib/optimization/__tests__/tpe-hybrid.test.ts**
   - 42 clone blocks
   - 80.8% token duplication
   - **Primary Issues:** Test setup boilerplate

4. **src/app/api/paints/route.ts**
   - 23 clone blocks
   - 80.3% token duplication
   - **Primary Issues:** API route patterns, repository instantiation

5. **src/lib/database/repositories/enhanced-paint-repository.ts**
   - 44 clone blocks
   - 65.1% token duplication
   - **Primary Issues:** Repository method patterns, error handling

### Duplication by Category

```
API Routes: 13 files, 161 clones, 18,035 duplicate tokens
Lib Files: 19 files, 177 clones, 16,399 duplicate tokens
Test Files: 3 files, 86 clones, 8,914 duplicate tokens
```

---

## Duplicate Pattern Analysis

### Pattern 1: API Route Auth & Error Handling (CRITICAL)

**Frequency:** 161 clone blocks across 13 API route files
**Duplicate Tokens:** 18,035

**Duplicate Code Pattern:**
```typescript
// Repeated in EVERY API route
async function getCurrentUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Repeated error handling
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

// Repeated success responses
return NextResponse.json({
  data: result.data,
  meta: {
    retrieved_at: new Date().toISOString(),
    version: result.data.version
  }
});
```

**Files Affected:**
- src/app/api/paints/[id]/route.ts
- src/app/api/paints/route.ts
- src/app/api/sessions/[id]/route.ts
- src/app/api/sessions/route.ts
- src/app/api/collections/[id]/route.ts
- src/app/api/collections/route.ts
- src/app/api/mixing-history/route.ts
- src/app/api/optimize/route.ts
- src/app/api/color-match/route.ts
- src/app/api/ratio-predict/route.ts
- src/app/api/image/extract-color/route.ts

**Refactoring Solution:**
- **T054**: Create `src/lib/api/route-helpers.ts` with:
  - `withAuth()` - Higher-order function for auth middleware
  - `handleValidationError()` - Standardized Zod error responses
  - `createSuccessResponse()` - Standardized success responses
  - `createErrorResponse()` - Standardized error responses

**Expected Reduction:** ~12,000 duplicate tokens (66% of API duplication)

---

### Pattern 2: Supabase Client Initialization

**Frequency:** 7 clone blocks
**Duplicate Tokens:** Not tracked (0 in report, but visible in code)

**Duplicate Code Pattern:**
```typescript
// Repeated in every API route
const supabase = createServerSupabaseClient();
const user = await getCurrentUser(supabase);
```

**Refactoring Solution:**
- Integrated into `withAuth()` helper from T054
- Auth middleware will handle client creation + user retrieval

**Expected Reduction:** Part of Pattern 1 reduction

---

### Pattern 3: Repository Instantiation & Method Patterns

**Frequency:** 44 clone blocks in enhanced-paint-repository.ts
**Duplicate Tokens:** 10,677 (65.1% of file)

**Duplicate Code Pattern:**
```typescript
// Repeated for every repository method
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

**Refactoring Solution:**
- **T057**: Create `src/lib/database/repository-base.ts` with:
  - `BaseRepository` class with generic CRUD methods
  - `executeQuery()` - Wrapper for Supabase queries with error handling
  - `handleDatabaseError()` - Standardized error response
  - Generic methods: `getById()`, `create()`, `update()`, `delete()`
- Refactor `EnhancedPaintRepository` to extend `BaseRepository`

**Expected Reduction:** ~7,000 duplicate tokens (65% of repository duplication)

---

### Pattern 4: Zod Validation Schemas

**Frequency:** 12 clone blocks
**Duplicate Tokens:** Not fully tracked

**Duplicate Code Pattern:**
```typescript
// Repeated UUID validation
const PaintIdSchema = z.string().uuid('Invalid paint ID format');
const SessionIdSchema = z.string().uuid('Invalid session ID format');
const CollectionIdSchema = z.string().uuid('Invalid collection ID format');
```

**Refactoring Solution:**
- **T055**: Create `src/lib/validation/common-schemas.ts` with:
  - `UuidSchema` - Reusable UUID validator
  - `PaginationSchema` - Reusable pagination params
  - `TimestampSchema` - Reusable timestamp validator
  - ID validators: `createIdSchema(entityName: string)`

**Expected Reduction:** ~500 duplicate tokens

---

### Pattern 5: Test Setup Boilerplate

**Frequency:** 86 clone blocks across test files
**Duplicate Tokens:** 8,914

**Duplicate Code Pattern:**
```typescript
// Repeated in tpe-hybrid.test.ts, differential-evolution.test.ts
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

  it('should optimize color', () => {
    const result = optimizer.optimize(mockPaints, targetLab);
    expect(result).toBeDefined();
    expect(result.deltaE).toBeLessThan(5);
  });
});
```

**Refactoring Solution:**
- **T060**: Create `src/lib/optimization/__tests__/test-helpers.ts` with:
  - `createMockPaintPalette()` - Standardized paint fixtures
  - `createOptimizerConfig()` - Default optimizer configurations
  - `assertOptimizationResult()` - Common assertions
  - `setupOptimizer()` - Generic beforeEach setup

**Expected Reduction:** ~6,000 duplicate tokens (67% of test duplication)

---

### Pattern 6: Form Validation (Lower Priority)

**Frequency:** Not heavily duplicated in baseline
**Duplicate Tokens:** <500

**Duplicate Code Pattern:**
```typescript
// React Hook Form + Zod integration
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting }
} = useForm({
  resolver: zodResolver(schema)
});
```

**Refactoring Solution:**
- **T058**: Create shared hooks in `src/hooks/useFormValidation.ts`
- Lower priority - not a major contributor to current duplication

**Expected Reduction:** ~300 duplicate tokens

---

## Refactoring Task Mapping

### Phase 1: API Route Consolidation (T054-T056)
**Impact:** ~12,000 tokens (59% of total duplication)

| Task | Description | Files Affected | Tokens Saved |
|------|-------------|----------------|--------------|
| T054 | Create shared API client & helpers | 13 API routes | ~8,000 |
| T055 | Create shared validation schemas | 10+ routes | ~500 |
| T056 | Migrate API routes to use helpers | All API routes | ~3,500 |

**Key Deliverable:** `src/lib/api/route-helpers.ts` with:
- `withAuth(handler)` - Auth middleware wrapper
- `validateParams(schema, params)` - Centralized validation
- Response builders: `success()`, `error()`, `validationError()`

### Phase 2: Repository Pattern Consolidation (T057)
**Impact:** ~7,000 tokens (34% of total duplication)

| Task | Description | Files Affected | Tokens Saved |
|------|-------------|----------------|--------------|
| T057 | Create BaseRepository class | enhanced-paint-repository.ts | ~7,000 |

**Key Deliverable:** `src/lib/database/repository-base.ts` with:
- Generic CRUD methods
- Standardized error handling
- Type-safe query builders

### Phase 3: Test Utilities (T060-T063)
**Impact:** ~6,000 tokens (29% of total duplication)

| Task | Description | Files Affected | Tokens Saved |
|------|-------------|----------------|--------------|
| T060 | Create test helper utilities | 3 test files | ~6,000 |
| T061 | Migrate tests to use helpers | tpe-hybrid.test.ts | ~3,000 |
| T062 | Migrate tests to use helpers | differential-evolution.test.ts | ~2,500 |
| T063 | Migrate tests to use helpers | kubelka-munk-enhanced.test.ts | ~500 |

**Key Deliverable:** `src/lib/optimization/__tests__/test-helpers.ts`

---

## Verification Strategy (T066)

### Re-run jscpd After Refactoring

```bash
# Generate final report
npx jscpd src/ --mode strict --reporters json,html --output ./reports/jscpd-final

# Compare reports
python3 scripts/compare-duplication-reports.py \
  reports/jscpd-report.json \
  reports/jscpd-final/jscpd-report.json
```

### Success Criteria

✅ **Token Duplication:** ≤ 4.5% (down from 7.97%)
✅ **Clone Blocks:** ≤ 100 (down from 201)
✅ **API Route Duplication:** ≤ 3% per file (currently 80-270%)
✅ **Repository Duplication:** ≤ 20% (currently 65%)
✅ **Test Duplication:** ≤ 30% (currently 60-80%)

### Expected Final Metrics

```
PROJECTED FINAL STATE:
  Total Tokens: 255,426 (unchanged)
  Duplicated Tokens: ~10,000 (down from 20,356)
  Token Duplication %: ~4.0% (down from 7.97%)
  Clone Blocks: ~85 (down from 201)

  REDUCTION: 51% fewer duplicate tokens ✅
```

---

## Implementation Order

### Priority 1: API Routes (Week 1)
1. T054: Create route helpers
2. T055: Create validation schemas
3. T056: Migrate 13 API routes

**Rationale:** Highest impact (59% of duplication), improves code maintainability immediately.

### Priority 2: Repositories (Week 1-2)
4. T057: Create BaseRepository
5. Refactor EnhancedPaintRepository

**Rationale:** Second highest impact (34%), enables future feature development with less boilerplate.

### Priority 3: Tests (Week 2)
6. T060: Create test helpers
7. T061-T063: Migrate test files

**Rationale:** Improves test maintainability, but lower user-facing impact.

### Priority 4: Verification
8. T066: Re-run jscpd and verify targets met
9. Update CODEBASE_ANALYSIS_REPORT with new metrics

---

## Risk Mitigation

### Breaking Changes Risk
- **Mitigation:** Run full test suite after each migration task
- **Validation:** E2E tests must pass before marking task complete

### Performance Risk
- **Mitigation:** Benchmark API response times before/after refactoring
- **Target:** No regression in API performance (<500ms for calculations)

### Type Safety Risk
- **Mitigation:** Maintain strict TypeScript mode, use generics in base classes
- **Validation:** `npm run typecheck` must pass

---

## Files to Create

```
src/lib/api/route-helpers.ts         # T054: Auth + response helpers
src/lib/validation/common-schemas.ts  # T055: Shared Zod schemas
src/lib/database/repository-base.ts   # T057: Generic repository base
src/lib/optimization/__tests__/test-helpers.ts  # T060: Test utilities
```

---

## Baseline Report Location

- **JSON Report:** `/home/davistroy/dev/paintmixr/reports/jscpd-report.json`
- **HTML Report:** `/home/davistroy/dev/paintmixr/reports/html/index.html`
- **Generated:** 2025-10-02

---

## Next Steps

1. ✅ T064: Baseline measurement complete
2. ✅ T065: Duplicate pattern analysis complete
3. ⏭️ T054: Begin API route helper implementation
4. ⏭️ T023: Update duplication test with baseline data

---

## Appendix: Top 10 Duplicate Blocks

1. **27 lines** - Session route auth patterns (sessions/[id]/route.ts:120-147)
2. **32 lines** - Session update logic (sessions/[id]/route.ts:167-198)
3. **28 lines** - Paint CRUD error handling (paints/[id]/route.ts:209-236)
4. **23 lines** - Paint validation (paints/[id]/route.ts:135-157)
5. **16 lines** - Repository error handling (paints/[id]/route.ts:183-198)
6. **15 lines** - Collection validation (collections/[id]/route.ts:41-55)
7. **14 lines** - Test setup (tpe-hybrid.test.ts:212-225)
8. **13 lines** - Optimizer config (differential-evolution.test.ts:240-255)
9. **12 lines** - Error response format (image/extract-color/route.ts:78-89)
10. **11 lines** - Auth helper duplication (optimize/route.ts:59-70)

---

**Report Generated:** 2025-10-02
**Next Review:** After T063 completion (final verification)
