# Type Consolidation Migration Report
## Feature 005-use-codebase-analysis Phase 3.3
**Date**: 2025-10-02
**Tasks**: T041-T042

---

## T041: Duplicate Type Definitions Found

### 1. ColorValue Interface
**Duplicates**:
- `/src/types/types.ts:8` (OLD - inline lab with lowercase keys)
- `/src/lib/types/index.ts:29` (NEW - LABColor interface)

**Decision**: Keep `/src/lib/types/index.ts` version (proper LABColor interface)

### 2. LABColor Interface
**Duplicates**:
- `/src/types/mixing.ts:12` (OLD - lowercase keys l,a,b)
- `/src/lib/types/index.ts:19` (NEW - uppercase keys L,a,b)
- `/src/lib/color-science.ts:12` (OLD - lowercase keys l,a,b)

**Decision**: Keep `/src/lib/types/index.ts` version (uppercase L matches CIE standard)
**Note**: This requires careful migration - some code uses lowercase, some uppercase

### 3. Paint-Related Interfaces
**Found**:
- `PaintColor` in `/src/types/types.ts:22` (legacy API format)
- `Paint` in `/src/lib/types/index.ts:60` (new centralized format)
- `PaintComponent` in `/src/types/mixing.ts:22` (enhanced mixing format)
- `OptimizationPaint` in `/src/types/mixing.ts:178` (optimization-specific)

**Decision**:
- Keep `Paint` as primary interface in `/src/lib/types/index.ts`
- Keep domain-specific variants: `PaintComponent`, `OptimizationPaint` in mixing.ts
- Migrate `PaintColor` usages to `Paint` or add alias

### 4. VolumeConstraints Interface
**Duplicates**:
- `/src/types/mixing.ts:42` (enhanced format with snake_case)
- `/src/lib/mixing-optimization/constraints.ts:4` (backend optimization)
- `/src/components/dashboard/paint-mixing-dashboard.tsx:35` (UI component)

**Decision**:
- Rename backend version to `OptimizationVolumeConstraints` (already in centralized index)
- Rename UI version to `UIVolumeConstraints` (already in centralized index)
- Keep mixing.ts version for enhanced mixing features

### 5. MixingSession Interface
**Duplicates**:
- `/src/types/types.ts:61` (API session format)
- `/src/lib/types/index.ts:107` (centralized format)
- `/src/types/mixing.ts:260` (UI mixing state)

**Decision**:
- `/src/lib/types/index.ts` is primary for data storage
- `/src/types/mixing.ts` version is for UI state management
- Keep both with clear documentation

---

## T042: Import Migration Plan

### Phase 1: Migrate from `/types/types.ts` (23 files)
Files importing ColorValue, MixingFormula, PaintColor, SessionData:
1. `/src/workers/color-worker.ts`
2. `/src/app/history/page.tsx`
3. `/src/app/page.tsx`
4. `/src/app/api/color-match/route.ts`
5. `/src/app/api/ratio-predict/route.ts`
6. `/src/app/api/image/extract-color/route.ts`
7. `/src/app/api/sessions/route.ts`
8. `/src/app/api/sessions/[id]/route.ts`
9. `/src/hooks/use-image-processing.ts`
10. `/src/hooks/use-sessions.ts`
11. `/src/hooks/use-color-matching.ts`
12. `/src/components/mixing-calculator/AccuracyIndicator.tsx`
13. `/src/components/mixing-calculator/RatioDisplay.tsx`
14. `/src/components/session-manager/SessionCard.tsx`
15. `/src/components/session-manager/SaveForm.tsx`
16. `/src/components/color-display/ColorValue.tsx`
17. `/src/components/color-input/ColorPicker.tsx`
18. `/src/components/color-input/ImageUpload.tsx`
19. `/src/lib/supabase/sessions.ts`
20. `/src/lib/supabase/client.ts`
21. `/src/lib/supabase/admin.ts`
22. `/src/lib/auth/supabase-client.ts`
23. `/src/lib/auth/supabase-server.ts`

### Phase 2: Migrate from `/types/mixing.ts` (6 files)
Files importing LABColor, VolumeConstraints, OptimizationPaint:
1. `/src/lib/mixing-optimization/tpe-hybrid.ts`
2. `/src/lib/mixing-optimization/differential-evolution.ts`
3. `/src/lib/color-science/lab-enhanced.ts`
4. `/src/lib/color-science/kubelka-munk-enhanced.ts`
5. `/src/lib/color-science/delta-e-ciede2000.ts`
6. `/src/components/dashboard/paint-mixing-dashboard.tsx`

### Phase 3: Delete obsolete files
After migration:
- Consider deprecating `/src/types/types.ts` (keep for legacy API types?)
- Consider deprecating `/src/lib/color-science.ts` LABColor (functions stay)
- Keep `/src/types/mixing.ts` for enhanced features

---

## Critical Issues to Address

### Issue 1: LABColor Key Case Inconsistency
- Centralized index uses: `L`, `a`, `b` (uppercase L)
- Old types use: `l`, `a`, `b` (lowercase l)
- **Impact**: Breaking change - need to update all LAB color instantiations

### Issue 2: Database Type Imports
- Many files import `Database` from `/types/types.ts`
- This should likely stay in a database-specific file
- **Decision**: Keep Database type in types.ts or move to database.types.ts

### Issue 3: Component-Specific Prop Types
- Many prop interfaces in types.ts are component-specific
- These should likely stay with components or in types.ts
- **Decision**: Only migrate shared domain types, not UI prop types

---

## Migration Strategy

### Safe Migration Approach:
1. **Start with non-breaking imports**: Migrate files that only import types not LABColor
2. **Fix LABColor case**: Create temporary alias or update instantiations
3. **Verify incrementally**: Build after each batch of migrations
4. **Keep Database types**: Don't migrate Database type (separate concern)
5. **Update tests**: Ensure all tests pass after migration

### Rollback Plan:
- Keep old files until migration complete
- Git commit after each successful phase
- Can revert specific commits if issues arise
