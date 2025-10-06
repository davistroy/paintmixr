# Quickstart: Technical Debt Remediation Validation

**Feature**: 010-using-refactor-recommendations
**Purpose**: Step-by-step validation guide for technical debt remediation
**Estimated Time**: 30 minutes

---

## Prerequisites

- [ ] Node.js 20, 22, or 24+ installed (`node -v`)
- [ ] All dependencies installed (`npm install`)
- [ ] Supabase connection pooling configured (`.env.local`)
- [ ] Git branch `010-using-refactor-recommendations` checked out

---

## Phase 1: Type System Consolidation (5 min)

### Validation Steps

1. **Verify centralized types exist**:
   ```bash
   ls -la /home/davistroy/dev/paintmixr/src/lib/types/index.ts
   ```
   ✅ Expected: File exists with all type definitions

2. **Verify legacy types deleted**:
   ```bash
   ls -la /home/davistroy/dev/paintmixr/src/types/
   ```
   ✅ Expected: Directory does not exist or is empty

3. **Verify no import errors**:
   ```bash
   npm run type-check
   ```
   ✅ Expected: Zero TypeScript errors

4. **Verify all imports use @/lib/types**:
   ```bash
   grep -r "from '@/types/types'" src/
   ```
   ✅ Expected: No matches found

### Success Criteria
- [x] All types in `/src/lib/types/index.ts`
- [x] `/src/types/` directory deleted
- [x] Zero TypeScript compilation errors
- [x] All imports use `@/lib/types` alias

---

## Phase 2: Dependency Updates (10 min)

### Validation Steps

1. **Verify React 19 installed**:
   ```bash
   npm list react react-dom @types/react @types/react-dom
   ```
   ✅ Expected:
   - `react@^19.0.0`
   - `react-dom@^19.0.0`
   - `@types/react@^19.0.0`
   - `@types/react-dom@^19.0.0`

2. **Verify Next.js 15 installed**:
   ```bash
   npm list next
   ```
   ✅ Expected: `next@^15.1.8` or higher

3. **Verify Zod 4 installed**:
   ```bash
   npm list zod
   ```
   ✅ Expected: `zod@^4.1.0` or higher

4. **Verify Cypress 15 installed**:
   ```bash
   npm list cypress
   ```
   ✅ Expected: `cypress@^15.3.2` or higher

5. **Run full test suite**:
   ```bash
   npm run test && npm run test:e2e
   ```
   ✅ Expected: All tests pass, no breaking changes

### Success Criteria
- [x] All dependencies updated to target versions
- [x] All tests pass (unit, integration, E2E)
- [x] No breaking changes in production code
- [x] Build succeeds: `npm run build`

---

## Phase 3: Code Refactoring (5 min)

### Validation Steps

1. **Verify page.tsx refactored**:
   ```bash
   wc -l /home/davistroy/dev/paintmixr/src/app/page.tsx
   ```
   ✅ Expected: ≤250 lines (was 684 lines)

2. **Verify repository refactored**:
   ```bash
   wc -l /home/davistroy/dev/paintmixr/src/lib/database/repositories/enhanced-paint-repository.ts
   ```
   ✅ Expected: ≤600 lines (was 1234 lines)

3. **Verify DE algorithm refactored**:
   ```bash
   wc -l /home/davistroy/dev/paintmixr/src/lib/mixing-optimization/differential-evolution.ts
   ```
   ✅ Expected: ≤500 lines (was 1009 lines)

4. **Verify no orphaned Web Workers**:
   ```bash
   ls -la /home/davistroy/dev/paintmixr/src/workers/
   ls -la /home/davistroy/dev/paintmixr/src/lib/workers/
   ```
   ✅ Expected: Directories do not exist

### Success Criteria
- [x] All components under 300 lines
- [x] Oversized files refactored
- [x] Web Worker code deleted
- [x] All tests still pass after refactoring

---

## Phase 4: Performance Optimizations (5 min)

### Validation Steps

1. **Verify SWR installed**:
   ```bash
   npm list swr
   ```
   ✅ Expected: `swr@^2.x.x` installed

2. **Verify Supabase connection pooling configured**:
   ```bash
   grep "pooler.supabase.com" .env.local
   ```
   ✅ Expected: `DATABASE_URL` contains pooler URL with `?pgbouncer=true&connection_limit=1`

3. **Test API response caching**:
   ```bash
   curl -I http://localhost:3000/api/paints | grep "Cache-Control"
   ```
   ✅ Expected: `Cache-Control: private, max-age=300, stale-while-revalidate=60`

4. **Verify performance baselines exist**:
   ```bash
   cat __tests__/performance/baselines.json
   ```
   ✅ Expected: JSON with `colorCalculations`, `optimization`, `database` categories

### Success Criteria
- [x] SWR library integrated
- [x] Connection pooling enabled
- [x] Cache headers present on GET endpoints
- [x] Performance baselines recorded

---

## Phase 5: Security & Observability (5 min)

### Validation Steps

1. **Verify rate limiting on /api/optimize**:
   ```bash
   # Make 6 requests rapidly
   for i in {1..6}; do curl -X POST http://localhost:3000/api/optimize -H "Content-Type: application/json" -d '{}'; done
   ```
   ✅ Expected: 6th request returns `429 Rate limit exceeded`

2. **Verify input sanitization**:
   ```bash
   curl -X POST http://localhost:3000/api/sessions -H "Content-Type: application/json" -d '{"custom_label":"<script>alert(1)</script>"}'
   ```
   ✅ Expected: Label sanitized (HTML tags stripped)

3. **Verify structured logging (Pino)**:
   ```bash
   npm list pino
   ```
   ✅ Expected: `pino@^9.x.x` or `pino@^8.x.x` installed

4. **Verify API version headers**:
   ```bash
   curl -I http://localhost:3000/api/optimize | grep "X-API-Version"
   ```
   ✅ Expected: `X-API-Version: 1.0`

### Success Criteria
- [x] Rate limiting enforced (5 req/min on /api/optimize)
- [x] XSS sanitization active
- [x] Structured logger implemented (Pino)
- [x] API version headers present

---

## Phase 6: API DTO Layer (3 min)

### Validation Steps

1. **Verify DTO types exist**:
   ```bash
   ls -la /home/davistroy/dev/paintmixr/src/lib/api/dtos/
   ```
   ✅ Expected: `paint.dto.ts`, `session.dto.ts`, etc.

2. **Verify mapper functions exist**:
   ```bash
   ls -la /home/davistroy/dev/paintmixr/src/lib/api/mappers/
   ```
   ✅ Expected: `paint-mapper.ts`, `session-mapper.ts`, etc.

3. **Verify API routes use DTOs**:
   ```bash
   grep "toPaintDTO" /home/davistroy/dev/paintmixr/src/app/api/paints/route.ts
   ```
   ✅ Expected: DTO mappers used in API responses

4. **Verify contract tests pass**:
   ```bash
   npm run test -- --testPathPattern=contracts
   ```
   ✅ Expected: All contract tests pass

### Success Criteria
- [x] DTO types defined in `/src/lib/api/dtos/`
- [x] Mapper functions in `/src/lib/api/mappers/`
- [x] API routes return DTOs, not raw database types
- [x] Contract tests validate DTO schemas

---

## Final Validation

### Integration Test Scenario

**Scenario**: Color matching with refactored codebase

1. Start dev server: `npm run dev --turbopack`
2. Navigate to `http://localhost:3000`
3. Select "Color Matching" mode
4. Upload image or pick color
5. Select 3 paints from collection
6. Click "Optimize" (triggers `/api/optimize` with rate limiting)
7. Verify:
   - Response time < 200ms (p95)
   - Delta E displayed
   - Mixing formula shown
   - Session can be saved
   - API version header: `X-API-Version: 1.0`
   - Console shows structured Pino logs

### Performance Regression Test

```bash
npm run test:performance
```

✅ Expected:
- Color calculations p95 < 500ms
- API responses p95 < 200ms
- Database queries p95 < 100ms
- No regressions > 10% from baseline

### Coverage Test

```bash
npm run test:coverage
```

✅ Expected:
- Global coverage ≥ 80%
- Critical paths (auth, color, optimization) ≥ 90%
- No timeout issues (extended timeout + root cause fix per FR-023)

---

## Success Checklist

All phases must pass for feature completion:

- [ ] Phase 1: Type consolidation ✅
- [ ] Phase 2: Dependency updates ✅
- [ ] Phase 3: Code refactoring ✅
- [ ] Phase 4: Performance optimizations ✅
- [ ] Phase 5: Security & observability ✅
- [ ] Phase 6: API DTO layer ✅
- [ ] Integration test passes ✅
- [ ] Performance regression test passes ✅
- [ ] Coverage test passes ✅

---

## Rollback Procedure (if needed)

If critical issues arise:

1. Revert dependency updates:
   ```bash
   git checkout package.json package-lock.json
   npm install
   ```

2. Restore legacy types:
   ```bash
   git checkout src/types/
   ```

3. Revert API changes:
   ```bash
   git checkout src/app/api/
   ```

4. Run tests to confirm stability:
   ```bash
   npm run test && npm run test:e2e
   ```

---

**Total Validation Time**: ~30 minutes
**Prerequisites**: Development environment set up, all dependencies installed
**Next Steps**: If all validations pass, merge to main and deploy to production
