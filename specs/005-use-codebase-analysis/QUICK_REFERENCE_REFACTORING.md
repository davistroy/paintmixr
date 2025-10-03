# Code Duplication Refactoring - Quick Reference

**Baseline:** 7.97% duplication (20,356 tokens, 201 blocks)
**Target:** ≤4.5% duplication (≤11,500 tokens, ≤100 blocks)
**Reduction Goal:** 40-50% fewer duplicate tokens

---

## Refactoring Tasks at a Glance

| Task | What to Create | Expected Savings | Priority |
|------|----------------|------------------|----------|
| T054 | `lib/api/route-helpers.ts` | 8,000 tokens | 🔥 CRITICAL |
| T055 | `lib/validation/common-schemas.ts` | 500 tokens | ⚡ QUICK WIN |
| T056 | Migrate 13 API routes | 3,500 tokens | 🔥 CRITICAL |
| T057 | `lib/database/repository-base.ts` | 7,000 tokens | 🎯 HIGH |
| T060 | `lib/optimization/__tests__/test-helpers.ts` | 6,000 tokens | 🧪 MEDIUM |
| T061-63 | Migrate 3 test files | Per T060 | 🧪 MEDIUM |
| T066 | Verify 40-50% reduction | Validation | ✅ VERIFY |

---

## T054: API Route Helpers (`lib/api/route-helpers.ts`)

### Create These Functions

```typescript
// 1. Auth Middleware Wrapper (used in ALL 13 routes)
export function withAuth<T>(
  handler: (req: NextRequest, user: User, params: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: T }) => {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    return handler(req, user, context.params);
  };
}

// 2. Validation Error Handler (used in ALL 13 routes)
export function handleValidationError(error: z.ZodError, entityName: string) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid ${entityName}`,
        details: error.errors
      }
    },
    { status: 400 }
  );
}

// 3. Success Response Builder (used in 10 routes)
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>
) {
  return NextResponse.json({
    data,
    meta: {
      retrieved_at: new Date().toISOString(),
      ...meta
    }
  });
}

// 4. Error Response Builder (used in ALL 13 routes)
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500
) {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}
```

### Files to Migrate (13 total)
- `app/api/paints/[id]/route.ts` ⭐ 5,323 tokens
- `app/api/sessions/[id]/route.ts` ⭐ 1,598 tokens
- `app/api/paints/route.ts` ⭐ 2,014 tokens
- `app/api/collections/[id]/route.ts` ⭐ 2,086 tokens
- `app/api/collections/route.ts` ⭐ 1,948 tokens
- `app/api/mixing-history/route.ts` ⭐ 1,908 tokens
- `app/api/sessions/route.ts`
- `app/api/optimize/route.ts`
- `app/api/color-match/route.ts`
- `app/api/ratio-predict/route.ts`
- `app/api/image/extract-color/route.ts`

---

## T055: Common Validation Schemas (`lib/validation/common-schemas.ts`)

### Create These Schemas

```typescript
import { z } from 'zod';

// 1. UUID Validator (used in 11 routes)
export const UuidSchema = z.string().uuid();

// 2. ID Schema Factory (used in 11 routes)
export function createIdSchema(entityName: string) {
  return z.string().uuid(`Invalid ${entityName} ID format`);
}

// 3. Pagination Schema (potential future use)
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// 4. Timestamp Schema (potential future use)
export const TimestampSchema = z.coerce.date();

// Usage:
// const PaintIdSchema = createIdSchema('paint');
// const SessionIdSchema = createIdSchema('session');
// const CollectionIdSchema = createIdSchema('collection');
```

---

## T057: Repository Base Class (`lib/database/repository-base.ts`)

### Create This Base Class

```typescript
export abstract class BaseRepository<T> {
  constructor(protected supabase: SupabaseClient) {}

  // Generic query executor with error handling
  protected async executeQuery<R>(
    queryFn: () => Promise<{ data: R | null; error: PostgrestError | null }>
  ): Promise<{ data: R | null; error: RepositoryError | null }> {
    try {
      const { data, error } = await queryFn();

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
  }

  // Generic CRUD methods
  async getById(id: string, userId: string): Promise<RepositoryResult<T>> {
    return this.executeQuery(() =>
      this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
    );
  }

  abstract get tableName(): string;
}
```

### Files to Refactor
- `lib/database/repositories/enhanced-paint-repository.ts` ⭐ 3,376 tokens

---

## T060: Test Helpers (`lib/optimization/__tests__/test-helpers.ts`)

### Create These Utilities

```typescript
// 1. Mock Paint Palette (used in 86 test blocks)
export function createMockPaintPalette() {
  return [
    { id: '1', name: 'Red', lab: [50, 80, 60] },
    { id: '2', name: 'Blue', lab: [30, 20, -50] },
    { id: '3', name: 'Yellow', lab: [90, -10, 90] }
  ];
}

// 2. Optimizer Config Factory
export function createOptimizerConfig(overrides?: Partial<OptimizerConfig>) {
  return {
    maxIterations: 100,
    populationSize: 20,
    ...overrides
  };
}

// 3. Common Assertions
export function assertOptimizationResult(result: OptimizationResult) {
  expect(result).toBeDefined();
  expect(result.ratios).toBeDefined();
  expect(result.deltaE).toBeLessThan(10);
}

// 4. Generic Setup
export function setupOptimizer<T extends Optimizer>(
  OptimizerClass: new (config: OptimizerConfig) => T,
  config?: Partial<OptimizerConfig>
) {
  return new OptimizerClass(createOptimizerConfig(config));
}
```

### Files to Migrate (3 total)
- `lib/optimization/__tests__/tpe-hybrid.test.ts` ⭐ 4,926 tokens
- `lib/optimization/__tests__/differential-evolution.test.ts` ⭐ 3,642 tokens
- `lib/color-science/__tests__/kubelka-munk-enhanced.test.ts`

---

## Before/After Examples

### API Route - Before (Duplicated)

```typescript
// app/api/paints/[id]/route.ts (271.4% duplication!)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Unauthorized');
    }

    const paintId = PaintIdSchema.parse(params.id);
    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getPaintById(paintId, user.id);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      meta: {
        retrieved_at: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid paint ID',
            details: error.errors
          }
        },
        { status: 400 }
      );
    }
    // ... more error handling
  }
}
```

### API Route - After (Refactored with T054 helpers)

```typescript
// app/api/paints/[id]/route.ts (< 10% duplication ✅)
import { withAuth, handleValidationError, createSuccessResponse } from '@/lib/api/route-helpers';
import { createIdSchema } from '@/lib/validation/common-schemas';

const PaintIdSchema = createIdSchema('paint');

export const GET = withAuth(async (req, user, params) => {
  try {
    const paintId = PaintIdSchema.parse(params.id);
    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getPaintById(paintId, user.id);

    if (result.error) {
      return createErrorResponse(result.error.code, result.error.message);
    }

    return createSuccessResponse(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, 'paint ID');
    }
    throw error;
  }
});
```

**Reduction:** ~30 lines → ~15 lines (50% reduction in this route)

---

## Verification Checklist

After each task, run:

```bash
# Quick check for specific file
npx jscpd src/app/api/paints/[id]/route.ts --mode strict

# Full check after all tasks
npx jscpd src/ --mode strict --reporters json,html --output ./reports/jscpd-final

# Compare with baseline
python3 scripts/compare-duplication-reports.py \
  reports/jscpd-baseline.json \
  reports/jscpd-final/jscpd-report.json
```

---

## Success Criteria (T066)

✅ **Token Duplication:** ≤ 4.5% (currently 7.97%)
✅ **Clone Blocks:** ≤ 100 (currently 201)
✅ **Reduction:** ≥ 40% fewer duplicate tokens
✅ **API Routes:** Each file < 10% duplication (currently 50-270%)
✅ **Repository:** < 20% duplication (currently 65%)
✅ **Tests:** < 30% duplication (currently 60-80%)

---

## Common Pitfalls to Avoid

1. ❌ Don't skip TypeScript type safety in helpers
2. ❌ Don't break existing tests during migration
3. ❌ Don't forget to update imports after creating helpers
4. ❌ Don't change API contracts (keep response formats identical)
5. ❌ Don't remove error handling - maintain same coverage

---

**Quick Links:**
- [Full Plan](./DUPLICATION_REDUCTION_PLAN.md)
- [Visual Analysis](./DUPLICATION_HOTSPOTS_VISUAL.md)
- [Test Data](./BASELINE_METRICS_FOR_T023.md)
- [Baseline Report](../../reports/html/index.html)
