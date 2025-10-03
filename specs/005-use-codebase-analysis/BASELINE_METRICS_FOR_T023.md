# Baseline Duplication Metrics for Test T023

**Test File:** `src/lib/codebase-quality/__tests__/duplication-reduction.test.ts`
**Purpose:** Validate that code refactoring reduces duplication by 40-50%

---

## Baseline Data (Pre-Refactoring)

**Measurement Date:** 2025-10-02
**Tool:** jscpd v4.0.5 (strict mode)
**Report Location:** `/home/davistroy/dev/paintmixr/reports/jscpd-baseline.json`

### Key Metrics for Test Assertions

```typescript
const BASELINE_METRICS = {
  // Overall codebase
  totalTokens: 255426,
  duplicatedTokens: 20356,
  tokenDuplicationPercent: 7.97,
  totalCloneBlocks: 201,

  // By file type
  typescript: {
    totalTokens: 163714,
    duplicatedTokens: 17386,
    tokenDuplicationPercent: 10.62,
    cloneBlocks: 172
  },
  tsx: {
    totalTokens: 91593,
    duplicatedTokens: 2970,
    tokenDuplicationPercent: 3.24,
    cloneBlocks: 29
  },

  // By category
  apiRoutes: {
    files: 13,
    cloneBlocks: 161,
    duplicatedTokens: 18035
  },
  libFiles: {
    files: 19,
    cloneBlocks: 177,
    duplicatedTokens: 16399
  },
  testFiles: {
    files: 3,
    cloneBlocks: 86,
    duplicatedTokens: 8914
  }
};

const TARGET_METRICS = {
  tokenDuplicationPercent: 4.5,  // Max 4.5% (down from 7.97%)
  totalCloneBlocks: 100,          // Max 100 blocks (down from 201)
  minReductionPercent: 40         // At least 40% reduction in duplicate tokens
};
```

---

## Expected Test Implementation

```typescript
describe('Code Duplication Reduction', () => {
  it('should reduce overall token duplication to ≤ 4.5%', async () => {
    const report = await runJSCPD('src/');
    const metrics = extractMetrics(report);

    expect(metrics.tokenDuplicationPercent).toBeLessThanOrEqual(4.5);
  });

  it('should reduce clone blocks to ≤ 100', async () => {
    const report = await runJSCPD('src/');
    const metrics = extractMetrics(report);

    expect(metrics.totalCloneBlocks).toBeLessThanOrEqual(100);
  });

  it('should achieve at least 40% reduction in duplicate tokens', async () => {
    const baseline = 20356; // From BASELINE_METRICS
    const report = await runJSCPD('src/');
    const metrics = extractMetrics(report);

    const reduction = baseline - metrics.duplicatedTokens;
    const reductionPercent = (reduction / baseline) * 100;

    expect(reductionPercent).toBeGreaterThanOrEqual(40);
  });

  it('should reduce API route duplication significantly', async () => {
    const report = await runJSCPD('src/app/api/');
    const metrics = extractMetrics(report);

    // API routes should have minimal duplication after refactoring
    expect(metrics.tokenDuplicationPercent).toBeLessThanOrEqual(5);
  });

  it('should reduce repository pattern duplication', async () => {
    const report = await runJSCPD('src/lib/database/repositories/');
    const metrics = extractMetrics(report);

    // Repository files should have ≤20% duplication after refactoring
    expect(metrics.tokenDuplicationPercent).toBeLessThanOrEqual(20);
  });

  it('should reduce test boilerplate duplication', async () => {
    const report = await runJSCPD('src/lib/optimization/__tests__/');
    const metrics = extractMetrics(report);

    // Test files should have ≤30% duplication after refactoring
    expect(metrics.tokenDuplicationPercent).toBeLessThanOrEqual(30);
  });
});
```

---

## Verification Command

```bash
# Run jscpd and generate final report
npx jscpd src/ --mode strict --reporters json,html --output ./reports/jscpd-final

# Compare with baseline
python3 scripts/compare-duplication-reports.py \
  reports/jscpd-baseline.json \
  reports/jscpd-final/jscpd-report.json
```

---

## Top Files to Monitor (Expected Improvement)

| File | Baseline Duplication | Target Duplication | Expected Reduction |
|------|---------------------|--------------------|--------------------|
| `app/api/paints/[id]/route.ts` | 271.4% | <10% | 95% |
| `app/api/sessions/[id]/route.ts` | 96.6% | <10% | 90% |
| `lib/optimization/__tests__/tpe-hybrid.test.ts` | 80.8% | <30% | 63% |
| `app/api/paints/route.ts` | 80.3% | <10% | 88% |
| `lib/database/repositories/enhanced-paint-repository.ts` | 65.1% | <20% | 69% |

---

## Test Data Files

- **Baseline Report:** `reports/jscpd-baseline.json`
- **Final Report:** `reports/jscpd-final/jscpd-report.json` (generated after T063)
- **Comparison Script:** `scripts/compare-duplication-reports.py`

---

**Notes:**
- Baseline is better than initially estimated (7.97% vs 60% in CODEBASE_ANALYSIS_REPORT)
- Initial estimate may have included commented code or measured different metrics
- Current baseline provides more accurate targets for refactoring
