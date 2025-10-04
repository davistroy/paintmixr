# Quickstart: Enhanced Accuracy Mode

**Feature**: 007-enhanced-mode-1
**Date**: 2025-10-04

## Overview

This quickstart guide provides step-by-step validation scenarios for Enhanced Accuracy Mode. Each scenario represents a complete user workflow from the primary user story and acceptance criteria defined in `spec.md`.

---

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Install dependencies
   npm install

   # Run database migrations (if any)
   npm run db:migrate

   # Start development server
   npm run dev
   ```

2. **Test User Account**:
   - Email: `test+enhanced@paintmixr.app`
   - Password: `TestPassword123!`
   - Pre-populated with 15-paint collection

3. **API Endpoint**: `POST /api/optimize`

---

## Scenario 1: Enhanced Mode Success (Delta E ≤ 2.0 Achieved)

**User Story**: Professional painter needs gallery-quality color match for brand identity project

### Steps:

1. **Navigate to Dashboard**
   ```
   URL: http://localhost:3000/
   Action: Click "Enhanced Accuracy Mode" checkbox
   Expected: Checkbox enabled, tooltip shows "Delta E ≤ 2.0 target"
   ```

2. **Select Target Color**
   ```
   Action: Upload color swatch image OR enter LAB values
   Input: L=65, a=18, b=-5 (medium blue-gray)
   Expected: Color preview displays, hex value shown
   ```

3. **Verify Paint Collection**
   ```
   Action: Open "My Paints" tab
   Expected: At least 4 paints visible with K/S coefficients
   Paint Examples:
     - Titanium White (k=0.12, s=0.88, opacity=0.95)
     - Ultramarine Blue (k=0.75, s=0.25, opacity=0.65)
     - Cadmium Yellow (k=0.62, s=0.38, opacity=0.80)
     - Burnt Umber (k=0.85, s=0.15, opacity=0.70)
   ```

4. **Initiate Enhanced Optimization**
   ```
   Action: Click "Find Best Match" button
   Expected:
     - Loading spinner appears
     - Message: "Optimizing... may take up to 30 seconds"
     - Progress indicator NOT shown (< 5 seconds)
   ```

5. **Validate Optimization Result**
   ```
   Expected Response (within 30 seconds):
     Success: true
     Formula:
       - Paint Count: 3-5 paints
       - Delta E: ≤ 2.0
       - Accuracy Rating: "Excellent"
       - Mixing Complexity: "Moderate" or "Complex"
     UI Display:
       - Formula table with paint names, volumes, percentages
       - Color comparison: Target vs. Predicted
       - Delta E badge (green, "Excellent")
       - Kubelka-Munk K/S values shown
   ```

6. **Save Formula**
   ```
   Action: Click "Save to History" button
   Expected: Formula saved to `mixing_history` table
   Verification: Navigate to "History" tab, see saved formula
   ```

### Acceptance Criteria:
- ✅ Delta E ≤ 2.0 achieved
- ✅ Formula uses 3-5 paints
- ✅ Optimization completes within 30 seconds
- ✅ UI displays accuracy rating "Excellent"
- ✅ Kubelka-Munk coefficients visible

---

## Scenario 2: Enhanced Mode Partial Result (Target Not Met)

**User Story**: Painter attempts to match vibrant neon color outside paint gamut

### Steps:

1. **Select Difficult Target Color**
   ```
   Input: L=75, a=95, b=85 (vibrant neon pink, outside typical gamut)
   Action: Enable Enhanced Mode, click "Find Best Match"
   ```

2. **Observe Optimization Process**
   ```
   Expected:
     - Loading spinner appears
     - After 5 seconds: Progress indicator shows
     - Message updates: "Optimizing... 15s elapsed"
     - Continues for up to 30 seconds
   ```

3. **Validate Partial Result**
   ```
   Expected Response:
     Success: true
     Warnings:
       - "Target Delta E ≤ 2.0 not achieved. Best result: Delta E = 4.2"
       - "Consider using different paints or accepting Standard mode result"
     Formula:
       - Paint Count: 4-5 paints
       - Delta E: 2.0-6.0 (best achievable)
       - Accuracy Rating: "Good" or "Acceptable"
       - Convergence Achieved: false
     Metrics:
       - Target Met: false
       - Early Termination: possibly true
   ```

4. **User Decision**
   ```
   UI Options:
     - "Accept This Formula" (use partial result)
     - "Try Standard Mode" (fallback to Delta E ≤ 5.0)
     - "Modify Paint Selection" (add more paints)
   Expected: User can choose fallback strategy
   ```

### Acceptance Criteria:
- ✅ System returns best achievable result (not error)
- ✅ Delta E value clearly displayed (even if > 2.0)
- ✅ Accuracy indicator shows "Good" or "Acceptable"
- ✅ Warning messages guide user to alternatives
- ✅ No 500/504 errors

---

## Scenario 3: Enhanced Mode Timeout Fallback

**User Story**: Large paint collection (80 paints) causes optimization timeout

### Steps:

1. **Setup Large Paint Collection**
   ```
   Precondition: User has 80-100 paints in collection
   Action: Navigate to "My Paints", verify 80+ paints visible
   ```

2. **Initiate Enhanced Optimization**
   ```
   Input: Target color L=50, a=10, b=20
   Action: Enable Enhanced Mode, click "Find Best Match"
   Expected:
     - Optimization starts
     - Progress indicator appears after 5 seconds
     - Shows iteration count and current best Delta E
   ```

3. **Observe Timeout Handling**
   ```
   Expected Behavior (at 28-30 seconds):
     - Optimization stops gracefully
     - Returns best solution found so far
     - Warning: "Optimization timed out after 28 seconds"
     - No 504 error from Vercel
   ```

4. **Validate Graceful Degradation**
   ```
   Expected Response:
     Success: true
     Formula: Best result from 28 seconds of optimization
     Delta E: May or may not meet ≤ 2.0 target
     Metrics:
       - Time Elapsed: ~28000ms
       - Convergence Achieved: false
       - Early Termination: true
       - Improvement Rate: > 0 (shows progress made)
     Warnings:
       - "Partial result - optimization did not complete"
   ```

### Acceptance Criteria:
- ✅ No serverless function 504 timeout errors
- ✅ User receives best solution found (not failure)
- ✅ Clear warning about partial result
- ✅ Metrics show progress made (iterations, improvement rate)
- ✅ UI suggests next steps (reduce paint count, use Standard mode)

---

## Scenario 4: Enhanced Mode with Minimum Paint Count (2 Paints)

**User Story**: New user with only 2 paints attempts Enhanced Mode

### Steps:

1. **Setup Minimal Paint Collection**
   ```
   Paints:
     - Titanium White (k=0.12, s=0.88)
     - Ivory Black (k=0.92, s=0.08)
   Action: Navigate to Dashboard, verify 2 paints in collection
   ```

2. **Enable Enhanced Mode**
   ```
   Action: Check "Enhanced Accuracy Mode" checkbox
   Expected: No warning/blocking (FR-007 allows 2-paint minimum)
   ```

3. **Request Optimization**
   ```
   Input: Target color L=60, a=0, b=0 (neutral gray)
   Action: Click "Find Best Match"
   Expected: Optimization runs successfully
   ```

4. **Validate Limited Gamut Result**
   ```
   Expected Response:
     Success: true
     Formula:
       - Paint Count: 2 (White + Black)
       - Delta E: ≤ 2.0 (achievable for neutral grays)
       - Accuracy Rating: "Excellent" or "Good"
     Warning (if Delta E > 2.0):
       - "Limited paint collection. Consider adding more colors for better results."
   ```

### Acceptance Criteria:
- ✅ System allows Enhanced Mode with 2 paints
- ✅ Optimization completes successfully
- ✅ Result uses both available paints
- ✅ Clear indication if target not achievable with 2 paints
- ✅ No validation errors or crashes

---

## Scenario 5: Standard Mode Fallback (User-Initiated)

**User Story**: User tries Enhanced Mode, result unsatisfactory, switches to Standard Mode

### Steps:

1. **Attempt Enhanced Mode First**
   ```
   Input: Target color L=55, a=35, b=45 (orange-red)
   Result: Delta E = 3.2 (not excellent)
   Warning: "Target not met. Consider Standard mode."
   ```

2. **Switch to Standard Mode**
   ```
   Action: Uncheck "Enhanced Accuracy Mode" checkbox
   Expected: UI updates to show "Delta E ≤ 5.0 target"
   ```

3. **Re-optimize in Standard Mode**
   ```
   Action: Click "Find Best Match" again
   Expected:
     - Faster optimization (< 10 seconds)
     - Uses 2-3 paints only
     - Delta E: 2.0-5.0 range (Standard mode target)
     - Accuracy Rating: "Good" or "Acceptable"
     - Mixing Complexity: "Simple" or "Moderate"
   ```

4. **Compare Results**
   ```
   UI Display:
     - Enhanced Mode Result: 5 paints, Delta E = 3.2
     - Standard Mode Result: 3 paints, Delta E = 4.1
   User Decision:
     - Choose Enhanced (better accuracy, more complex)
     - OR Standard (simpler formula, acceptable accuracy)
   ```

### Acceptance Criteria:
- ✅ Standard Mode remains functional (FR-010)
- ✅ User can toggle between modes
- ✅ Standard Mode uses 2-3 paints max
- ✅ Standard Mode faster than Enhanced
- ✅ Both results saveable to history

---

## Scenario 6: Progress Indicator Thresholds

**User Story**: Visual feedback for optimization taking > 5 seconds

### Steps:

1. **Quick Optimization (< 5 seconds)**
   ```
   Setup: Small paint collection (5 paints), simple target color
   Action: Click "Find Best Match"
   Expected:
     - Loading spinner only
     - No progress bar/iteration counter
     - Completes in < 5 seconds
     - Avoids "flashing" progress indicator
   ```

2. **Medium Optimization (5-15 seconds)**
   ```
   Setup: Medium paint collection (20 paints), moderate target
   Action: Click "Find Best Match"
   Expected:
     - Loading spinner for 0-5 seconds
     - Progress indicator appears at 5-second mark
     - Shows: "Optimizing... 8s elapsed"
     - Updates every 1-2 seconds
     - Completes in 5-15 seconds
   ```

3. **Long Optimization (15-30 seconds)**
   ```
   Setup: Large paint collection (50 paints), complex target
   Action: Click "Find Best Match"
   Expected:
     - Progress indicator appears at 5 seconds
     - Shows: "Optimizing... 18s elapsed, 342 iterations"
     - Current best Delta E updates in real-time
     - Completes at 15-30 seconds
   ```

### Acceptance Criteria:
- ✅ Progress indicator NOT shown for < 5 second optimizations (FR-006)
- ✅ Progress indicator SHOWN after 5 seconds
- ✅ Iteration count and time elapsed displayed
- ✅ Current best Delta E optionally shown
- ✅ Smooth UX without flickering

---

## Integration Test Execution

### Automated Test Suite

Run all scenarios via Cypress E2E tests:

```bash
# Run all Enhanced Mode scenarios
npm run test:e2e -- --spec "cypress/e2e/enhanced-accuracy-mode.cy.ts"

# Run specific scenario
npm run test:e2e -- --spec "cypress/e2e/enhanced-accuracy-mode.cy.ts" --grep "Scenario 1"

# Run with visual recording
npm run test:e2e -- --headed --spec "cypress/e2e/enhanced-accuracy-mode.cy.ts"
```

### Manual Test Checklist

- [ ] Scenario 1: Enhanced Mode Success
- [ ] Scenario 2: Partial Result (Target Not Met)
- [ ] Scenario 3: Timeout Fallback
- [ ] Scenario 4: Minimum Paint Count (2 paints)
- [ ] Scenario 5: Standard Mode Fallback
- [ ] Scenario 6: Progress Indicator Thresholds

### Performance Validation

```bash
# Performance regression tests
npm run test:performance -- --testPathPattern=enhanced-mode

# Verify p95 response time < 30s
npm run test:load -- artillery-enhanced-mode.yml
```

---

## Troubleshooting

### Optimization Times Out with 504 Error

**Symptom**: Vercel returns 504 Gateway Timeout
**Cause**: Serverless function exceeded 30-second `maxDuration`
**Fix**:
1. Verify `app/api/optimize/route.ts` has `export const maxDuration = 30`
2. Check internal timeout set to 28 seconds (2s safety buffer)
3. Confirm Vercel Pro plan (Hobby plan limited to 10s)

### Delta E ≤ 2.0 Never Achieved

**Symptom**: All optimizations return Delta E > 2.0
**Cause**: Paint collection lacks color diversity or target outside gamut
**Fix**:
1. Verify paint collection has diverse hues (reds, blues, yellows, neutrals)
2. Check Kubelka-Munk coefficients are realistic (k+s ≤ 1.2)
3. Test with known-achievable targets (neutral grays, primaries)

### Progress Indicator Not Appearing

**Symptom**: No progress shown even for 20+ second optimizations
**Cause**: Frontend progress polling not implemented OR SSE not connected
**Fix**:
1. Verify frontend has 5-second timer for progress display
2. If using SSE: Check EventSource connection in browser DevTools
3. Confirm API route sends progress updates

---

## Success Criteria

✅ **All 6 scenarios pass without errors**
✅ **Response time p95 < 30 seconds**
✅ **No 504 timeout errors (graceful degradation)**
✅ **Delta E ≤ 2.0 achieved for 85%+ of realistic targets**
✅ **Progress indicators shown correctly (> 5s threshold)**
✅ **Standard Mode remains fully functional**

---

**Based on Spec**: `specs/007-enhanced-mode-1/spec.md` (Acceptance Scenarios)
**Contract Reference**: `specs/007-enhanced-mode-1/contracts/optimize-api.yaml`
