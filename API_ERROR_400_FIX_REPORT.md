# API Error 400 Fix - Enhanced Accuracy Mode

**Date**: 2025-10-04
**Issue**: API error 400 when using Enhanced Accuracy Mode
**Status**: ✅ **FIXED**

---

## Problem Summary

When users enabled Enhanced Accuracy Mode and attempted to calculate a color formula, they received an **HTTP 400 Bad Request** error. This prevented the Enhanced Accuracy Mode from functioning.

---

## Root Cause Analysis

### Issue #1: Request Payload Schema Mismatch

The frontend was sending an incompatible request structure to `/api/optimize`:

**What Frontend Sent** (src/app/page.tsx:61-70):
```typescript
{
  target_color: {
    hex: "#FF5733",
    lab: { l: 50, a: 20, b: 30 }  // lowercase keys
  },
  total_volume_ml: 200,
  algorithm: 'tpe_hybrid',
  target_delta_e: 2.0,
  max_paints: 3
}
```

**What API Expected** (src/app/api/optimize/route.ts:14-61):
```typescript
{
  target_color: {
    L: 50,  // uppercase L
    a: 20,
    b: 30
  },
  optimization_config: {
    algorithm: 'tpe_hybrid',
    target_delta_e: 2.0
  },
  volume_constraints: {
    min_total_volume_ml: number,
    max_total_volume_ml: number,
    max_paint_count: number
  }
}
```

### Key Mismatches:

1. **Color Format**:
   - Frontend sent: `ColorValue` object with `{ hex, lab: { l, a, b } }`
   - API expected: LAB object with `{ L, a, b }` (uppercase L)

2. **Configuration Structure**:
   - Frontend sent: Flat structure with `algorithm`, `target_delta_e`, etc.
   - API expected: Nested `optimization_config` object

3. **Volume Parameters**:
   - Frontend sent: `total_volume_ml` (single value)
   - API expected: `volume_constraints` object with min/max ranges

### Issue #2: Response Format Incompatibility

The API returned a different response structure than what the frontend expected:

**API Response** (src/app/api/optimize/route.ts:258-300):
```typescript
{
  data: {
    achieved_color: { L: 50, a: 20, b: 30 },
    delta_e_achieved: 1.3,
    solution: { total_volume: 200 },
    paint_details: [
      { id, name, brand, volume_ml, percentage }
    ]
  }
}
```

**Frontend Expected** (src/app/page.tsx:102-104):
```typescript
{
  formula: { ... },
  calculated_color: { hex, lab },
  delta_e: 1.3
}
```

---

## Solution Implemented

### Fix #1: Updated Request Payload (src/app/page.tsx:57-80)

Changed from single-format request to conditional format based on mode:

```typescript
const requestBody = enhancedMode
  ? {
      // Enhanced mode expects LAB color with uppercase keys
      target_color: {
        L: color.lab.l,  // Convert lowercase to uppercase
        a: color.lab.a,
        b: color.lab.b,
      },
      optimization_config: {
        algorithm: 'tpe_hybrid',
        target_delta_e: 2.0,
      },
      volume_constraints: {
        min_total_volume_ml: 200,
        max_total_volume_ml: 200,
        max_paint_count: 8,
      },
    }
  : {
      // Standard mode (unchanged)
      target_color: color,
      total_volume_ml: 200,
      optimization_preference: 'accuracy',
    }
```

### Fix #2: Updated Response Handling (src/app/page.tsx:103-140)

Added conditional response parsing:

```typescript
if (enhancedMode) {
  // Enhanced mode response format from /api/optimize
  const data = responseData.data

  // Convert achieved color from LAB format to ColorValue format
  const achievedLab = {
    l: data.achieved_color.L,  // Uppercase L from API
    a: data.achieved_color.a,
    b: data.achieved_color.b,
  }
  const achievedColor: ColorValue = {
    hex: labToHex(achievedLab),  // Convert LAB to hex
    lab: achievedLab,
  }

  // Build formula from paint_details
  const formula: MixingFormula = {
    total_volume_ml: data.solution?.total_volume || 200,
    paint_ratios: data.paint_details.map((paint: any) => ({
      paint_id: paint.id,
      paint_name: paint.name,
      volume_ml: paint.volume_ml,
      percentage: paint.percentage,
    })),
  }

  setFormula(formula)
  setCalculatedColor(achievedColor)
  setDeltaE(data.delta_e_achieved)
} else {
  // Standard mode response format (unchanged)
  setFormula(responseData.formula)
  setCalculatedColor(responseData.calculated_color)
  setDeltaE(responseData.delta_e)
}
```

### Fix #3: Added LAB to Hex Conversion (src/app/page.tsx:6)

Imported existing utility function:
```typescript
import { labToHex } from '@/lib/color-science'
```

### Fix #4: Improved Error Handling (src/app/page.tsx:90-100)

Enhanced error message extraction:
```typescript
const errorMessage = errorData.error?.message ||
                     errorData.message ||
                     `API error: ${response.status}`
```

---

## API Validation Schema

The `/api/optimize` endpoint uses Zod for request validation:

### LABColorSchema (route.ts:14-18):
```typescript
const LABColorSchema = z.object({
  L: z.number().min(0).max(100),    // Uppercase L
  a: z.number().min(-128).max(127),
  b: z.number().min(-128).max(127)
});
```

### VolumeConstraintsSchema (route.ts:20-27):
```typescript
const VolumeConstraintsSchema = z.object({
  min_total_volume_ml: z.number().min(0.1).default(1.0),
  max_total_volume_ml: z.number().min(1).max(10000).default(1000),
  precision_ml: z.number().min(0.1).max(1.0).default(0.1),
  max_paint_count: z.number().min(2).max(20).default(10),
  min_paint_volume_ml: z.number().min(0.1).default(0.5),
  asymmetric_ratios: z.boolean().default(true)
});
```

### OptimizationConfigSchema (route.ts:29-36):
```typescript
const OptimizationConfigSchema = z.object({
  algorithm: z.enum(['differential_evolution', 'tpe_hybrid', 'auto']).default('auto'),
  max_iterations: z.number().min(100).max(10000).default(2000),
  target_delta_e: z.number().min(0.1).max(5.0).default(2.0),
  time_limit_ms: z.number().min(1000).max(30000).default(10000),
  require_color_verification: z.boolean().default(false),
  require_calibration: z.boolean().default(false)
});
```

---

## Testing Instructions

### Manual Test Steps:

1. **Start Dev Server** (should already be running):
   ```bash
   npm run dev
   ```
   Server should be at http://localhost:3002

2. **Sign In**:
   - Email: troy@k4jda.com
   - Password: Edw@rd67

3. **Test Enhanced Accuracy Mode**:
   - Select "Color Matching" mode (should be default)
   - Enable "Enhanced Accuracy Mode" checkbox
   - Verify label shows "(Target ΔE ≤ 2.0)"
   - Enter a hex color (e.g., #FF5733 or #3498DB)
   - Click calculate/submit

4. **Expected Results**:
   - ✅ No "API error: 400" message
   - ✅ No "API error: 401" message
   - ✅ Formula displays with paint ratios
   - ✅ Delta E value shown (should be ≤ 2.0 or best achievable)
   - ✅ Accuracy indicator shows rating
   - ✅ Color comparison displays (target vs achieved)

5. **Verify Data**:
   - Check that volumes have 0.1ml precision (e.g., 32.4ml, not 32ml)
   - Verify asymmetric percentages (not all equal)
   - Confirm Delta E is lower than standard mode would achieve

### Common Test Colors:

- **Red**: #FF5733 (vivid red-orange)
- **Blue**: #3498DB (medium blue)
- **Green**: #2ECC71 (emerald green)
- **Purple**: #9B59B6 (amethyst purple)
- **Beige**: #F5DEB3 (wheat/tan)

---

## Files Modified

1. **src/app/page.tsx** (Enhanced Accuracy Mode component):
   - Line 6: Added `labToHex` import
   - Lines 57-80: Updated request body construction
   - Lines 90-100: Improved error handling
   - Lines 103-140: Added conditional response parsing

---

## API Error Codes Reference

### 400 Bad Request (Fixed)
- **Before**: Validation error due to schema mismatch
- **After**: Request matches expected schema

### Other Possible Errors:
- **401 Unauthorized**: User not authenticated (should redirect to signin)
- **500 Internal Error**: Server-side optimization failure
- **400 INSUFFICIENT_PAINTS**: User has < 2 paints in collection

---

## Additional Improvements

### Recommended Next Steps:

1. **Add Loading State Enhancement**:
   - Show optimization progress (iterations completed)
   - Display estimated time remaining

2. **Add Data Validation**:
   - Validate color is within achievable gamut
   - Check if user has enough paint volume

3. **Add Test Attributes**:
   ```typescript
   <input
     type="checkbox"
     checked={enhancedMode}
     data-testid="enhanced-accuracy-checkbox"  // Add this
   />
   ```

4. **Add User Feedback**:
   - Toast notification on successful calculation
   - Show comparison with standard mode accuracy

---

## Performance Metrics

Based on API route implementation (route.ts:364-379):

- **Target Delta E**: ≤ 2.0
- **Max Optimization Time**: 10,000ms (10 seconds)
- **Typical Optimization Time**: ~3,000ms (3 seconds)
- **Success Rate Target**: 95%
- **Precision**: 0.1ml
- **Max Paint Count**: 20 paints
- **Asymmetric Ratios**: Supported

---

## Known Limitations

1. **Requires at least 2 paints** in user's collection
   - Error message: "At least 2 paints are required for optimization"
   - HTTP 400 with code `INSUFFICIENT_PAINTS`

2. **Maximum volume**: 10,000ml per constraint schema

3. **Color gamut limitations**:
   - Some colors may not be achievable with available paints
   - API will return best achievable match even if > 2.0 Delta E

---

## Verification Checklist

- [x] Request payload matches API schema (LAB with uppercase L)
- [x] Optimization config properly nested
- [x] Volume constraints included
- [x] Response parsing handles nested `data` object
- [x] LAB color converted from uppercase L to lowercase l
- [x] Hex color calculated from LAB
- [x] Formula structure matches MixingFormula interface
- [x] Error messages extracted from nested error object
- [x] TypeScript compilation passes with no errors
- [x] Dev server compiles successfully

---

## Conclusion

The **API error 400** was caused by a schema mismatch between the frontend request and API expectations. The fix involved:

1. Converting ColorValue format to LAB format with uppercase `L`
2. Restructuring request to include `optimization_config` and `volume_constraints`
3. Adding conditional response parsing for enhanced vs standard modes
4. Converting API's uppercase LAB response back to lowercase for internal use
5. Building MixingFormula from paint_details array

**Status**: ✅ **READY FOR TESTING**

The app should now successfully:
- Accept Enhanced Accuracy Mode requests
- Send properly formatted requests to `/api/optimize`
- Parse the API response correctly
- Display formula with precise volumes and Delta E accuracy

---

**Next Action**: Manual testing at http://localhost:3002 with credentials troy@k4jda.com / Edw@rd67
