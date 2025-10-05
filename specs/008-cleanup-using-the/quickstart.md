# Quickstart Manual Test Guide: Production Bug Fixes

**Feature**: 008-cleanup-using-the
**Date**: 2025-10-04
**Purpose**: Manual testing scenarios for Phase 1-3 deployment validation

## Prerequisites

- ✅ Application deployed to test environment
- ✅ User account created: `troy@k4jda.com` (or test account)
- ✅ At least 22 paints in database (existing paint collection)
- ✅ Browser DevTools open (Console tab for logging verification)

## Test Environment

**URL**: https://paintmixr.vercel.app/ (or test deployment)
**Browser**: Chrome/Firefox (latest)
**Network**: Stable connection (for timeout testing, disable later)

---

## Phase 1: Critical Bug Fixes

### Test 1.1: Enhanced Mode Checkbox Toggle (FR-001, FR-001a, FR-002)

**Priority**: P0 (Blocker)

**Steps**:
1. Navigate to main color mixing page
2. **Verify**: Enhanced Mode checkbox is checked by default
3. **Verify**: Enhanced Mode description text is visible
4. Click the Enhanced Mode checkbox
5. **Expected**: Checkbox becomes unchecked
6. **Expected**: Enhanced Mode description disappears
7. **Expected**: Standard Mode is now active
8. Click checkbox again
9. **Expected**: Checkbox becomes checked
10. **Expected**: Enhanced Mode reactivates

**Success Criteria**:
- [ ] Checkbox toggles between checked/unchecked states
- [ ] Mode description updates based on checkbox state
- [ ] No console errors during toggle

**Regression Check**:
- Existing Enhanced Mode calculation still works (tested in Test 2.1)

---

### Test 1.2: Checkbox Disabled During Calculation (FR-001a)

**Priority**: P0

**Steps**:
1. **Ensure**: Enhanced Mode is checked
2. Enter hex code: `#1ABC9C`
3. Click "Calculate Formula" (or equivalent button)
4. **Immediately**: Try clicking Enhanced Mode checkbox
5. **Expected**: Checkbox is disabled (grayed out, non-clickable)
6. Wait for calculation to complete (~30 seconds)
7. **Expected**: Checkbox becomes enabled again
8. Click checkbox
9. **Expected**: Checkbox toggles successfully

**Success Criteria**:
- [ ] Checkbox disabled during calculation
- [ ] Checkbox enabled after calculation completes
- [ ] No mode change occurs if clicked while disabled

---

### Test 1.3: Session Save Dialog Close (FR-003, FR-004, FR-004a)

**Priority**: P1 (High)

**Steps**:
1. Complete a color matching calculation (Enhanced Mode, hex `#FF5733`)
2. Click "Save This Formula" button
3. **Verify**: Save session dialog opens
4. Enter session name: "Test Session 1"
5. Click "Save Session" button
6. **Wait**: For API response (should be <3s per NFR-003)
7. **Expected**: Dialog closes automatically
8. **Expected**: Toast notification appears: "Session saved successfully"
9. **Expected**: Toast auto-dismisses after 3 seconds
10. **Verify**: No dialog remains open

**Success Criteria**:
- [ ] Dialog closes after successful save
- [ ] Toast displays "Session saved successfully" (exact text per FR-004a)
- [ ] Toast disappears after 3 seconds (NFR-004)
- [ ] User can continue using app without manual dialog close

**Browser Console Check**:
- No JavaScript errors related to dialog state

---

### Test 1.4: Session Save Failure Handling (FR-003a, FR-003b, FR-003c)

**Priority**: P1

**Steps**:
1. Complete a color matching calculation
2. **Simulate network failure**: Open DevTools → Network tab → Enable "Offline" mode
3. Click "Save This Formula"
4. Dialog opens
5. Enter session name: "Test Offline"
6. Click "Save Session"
7. **Expected**: Save fails (network error)
8. **Expected**: Dialog remains open
9. **Expected**: Error message displayed in dialog
10. **Verify**: NO automatic retry occurs (FR-003c)
11. **Re-enable network**: Disable "Offline" mode
12. Click "Save Session" again (manual retry)
13. **Expected**: Save succeeds, dialog closes, toast appears

**Success Criteria**:
- [ ] Dialog stays open on save failure
- [ ] Error message visible to user
- [ ] No automatic retry (user must click "Save" again)
- [ ] Manual retry works after network restored

---

### Test 1.5: Concurrent Save Prevention (FR-003d, FR-003e)

**Priority**: P2

**Steps**:
1. Complete a color matching calculation
2. Click "Save This Formula"
3. Dialog opens
4. Enter session name: "Concurrent Test"
5. Click "Save Session" button
6. **Immediately**: Try clicking "Save Session" again (rapid double-click)
7. **Expected**: Button is disabled after first click
8. **Expected**: Only ONE POST request to `/api/sessions` (verify in Network tab)
9. Wait for save to complete
10. **Expected**: Dialog closes, toast appears once

**Success Criteria**:
- [ ] Save button disabled during save operation
- [ ] Only one POST request sent (no duplicates)
- [ ] Single toast notification (not multiple)

---

### Test 1.6: Input Method Tracking - Hex Code (FR-005, FR-006)

**Priority**: P2

**Steps**:
1. Navigate to main page
2. Click "Hex Code" input button
3. **Verify**: Hex input field is active
4. Enter hex: `#E74C3C`
5. Click "Calculate Formula"
6. Wait for result
7. Click "Save This Formula"
8. Save session as "Hex Input Test"
9. Navigate to "Session History" page
10. Find "Hex Input Test" session
11. **Expected**: Session card shows "Input: Hex Code"

**Success Criteria**:
- [ ] Session metadata correctly records `input_method = 'hex_code'`
- [ ] Session History displays "Hex Code" (not "Image Upload" or other)

---

### Test 1.7: Input Method Tracking - Color Picker (FR-005, FR-006)

**Steps**:
1. Click "Color Picker" input button
2. Select a preset color (e.g., "Teal")
3. Calculate formula
4. Save session as "Color Picker Test"
5. Check Session History
6. **Expected**: "Input: Color Picker"

**Success Criteria**:
- [ ] Session shows `input_method = 'color_picker'`

---

### Test 1.8: Input Clearing on Method Switch (FR-005a, FR-005b)

**Priority**: P2

**Steps**:
1. **Start**: Color Picker mode
2. Select a color (e.g., "Red")
3. **Verify**: Color preview visible
4. Click "Calculate Formula"
5. **Verify**: Calculation result displayed
6. Click "Hex Code" button (switch methods)
7. **Expected**: Color Picker selection cleared (no preview)
8. **Expected**: Calculation result cleared (no formula visible)
9. Enter hex: `#00FF00`
10. **Verify**: New hex input works correctly

**Success Criteria**:
- [ ] Previous color selection cleared on method switch
- [ ] Calculation results cleared on method switch
- [ ] New input method works independently

**Reverse Test**:
1. Switch from Hex Code → Color Picker
2. **Expected**: Hex input field cleared
3. **Expected**: Results cleared

---

## Phase 2: Validation & Edge Cases

### Test 2.1: Standard Mode End-to-End (FR-007, FR-008, FR-009, FR-010, FR-011)

**Prerequisites**: Test 1.1 passed (checkbox toggle works)

**Steps**:
1. **Uncheck** Enhanced Mode checkbox
2. **Verify**: Standard Mode is active
3. Enter hex: `#FF5733`
4. Start timer (for NFR-002: <10s requirement)
5. Click "Calculate Formula"
6. **Wait**: For calculation to complete
7. **Stop timer**: Record time
8. **Expected**: Calculation completes in <10 seconds
9. **Expected**: Formula contains ≤3 paints (FR-008)
10. **Expected**: Delta E value displayed
11. **Verify**: Delta E ≤ 5.0 OR higher (depending on paint collection)
12. Save session as "Standard Mode Test"
13. Check Session History
14. **Expected**: Session shows "Mode: Standard"

**Success Criteria**:
- [ ] Standard Mode calculation completes <10s (NFR-002)
- [ ] Formula uses maximum 3 paints (FR-008)
- [ ] Delta E target ≤5.0 (FR-009) - best effort with available paints
- [ ] Session metadata records `mode = 'Standard'` (FR-011)
- [ ] Faster than Enhanced Mode (compare with Test 1.3 timing)

---

### Test 2.2: Ratio Prediction - Minimum Paints (FR-012a, FR-012c)

**Steps**:
1. Click "Ratio Prediction" mode
2. **Verify**: "Predict Resulting Color" button is disabled
3. Select Paint 1: "I.H. Red", Volume: 100ml
4. **Verify**: Button still disabled (<2 paints)
5. Select Paint 2: "Gloss White", Volume: 50ml
6. **Verify**: Button becomes enabled (≥2 paints)
7. Click "Predict Resulting Color"
8. **Expected**: Prediction calculation proceeds
9. **Expected**: Resulting color displayed (LAB + hex values)

**Success Criteria**:
- [ ] Button disabled with 0-1 paints (FR-012c)
- [ ] Button enabled with 2+ paints
- [ ] Prediction shows LAB color (FR-013)
- [ ] Prediction shows hex value (FR-014)

---

### Test 2.3: Ratio Prediction - Maximum Paints (FR-012b)

**Steps**:
1. Select 5 paints with volumes:
   - Paint 1: 100ml
   - Paint 2: 75ml
   - Paint 3: 50ml
   - Paint 4: 25ml
   - Paint 5: 10ml
2. Click "Predict"
3. **Expected**: Calculation succeeds
4. Try adding Paint 6
5. **Expected**: Cannot add 6th paint (UI prevents or validation blocks)

**Success Criteria**:
- [ ] Maximum 5 paints allowed (FR-012b)
- [ ] Calculation works with 5 paints

---

### Test 2.4: Volume Validation - Invalid Low (FR-012d, FR-012e, FR-012f)

**Steps**:
1. Select Ratio Prediction mode
2. Select Paint 1: "I.H. Red", Volume: **2ml** (below 5ml minimum)
3. Select Paint 2: "Gloss White", Volume: 50ml
4. Click "Predict Resulting Color"
5. **Expected**: Validation error displays
6. **Expected**: Error message: "Paint volume must be between 5ml and 1000ml"
7. **Expected**: Calculation blocked (no API call)
8. **Verify in DevTools**: No POST request to prediction API
9. Change Paint 1 volume to 5ml
10. Click "Predict" again
11. **Expected**: Validation passes, calculation proceeds

**Success Criteria**:
- [ ] Validation triggers on button click (FR-012e)
- [ ] Correct error message displayed (FR-012f)
- [ ] Calculation prevented with invalid volume
- [ ] Calculation allowed after correction

---

### Test 2.5: Volume Validation - Invalid High (FR-012d, FR-012f)

**Steps**:
1. Select Paint 1: Volume **1500ml** (above 1000ml maximum)
2. Select Paint 2: Volume 50ml
3. Click "Predict"
4. **Expected**: Error: "Paint volume must be between 5ml and 1000ml"
5. **Expected**: Calculation blocked

**Success Criteria**:
- [ ] High volume validation works
- [ ] Same error message as low volume

---

## Phase 3: UX Enhancements

### Test 3.1: Delta E Accuracy Warning (FR-016, FR-016a, FR-017)

**Prerequisites**: Limited paint collection (22 paints) - should produce Delta E > 5.0 for many colors

**Steps**:
1. Use Enhanced Mode
2. Enter hex: `#1ABC9C` (teal - likely high Delta E with limited paints)
3. Calculate formula
4. **Verify**: Delta E value in result
5. **If Delta E > 5.0**:
   - **Expected**: Warning banner appears
   - **Expected**: Warning text: "Low accuracy due to limited paint collection. More variety improves matching."
   - **Try**: Clicking X or close button on warning
   - **Expected**: Warning cannot be dismissed (FR-16a)
6. **If Delta E ≤ 5.0**: Try different color until Delta E > 5.0

**Success Criteria**:
- [ ] Warning appears when Delta E > 5.0 (FR-016)
- [ ] Warning is non-dismissible (FR-016a)
- [ ] Educational message matches spec (FR-017)
- [ ] Warning persists until new calculation

---

### Test 3.2: Paint Management Modal (FR-018, FR-018a)

**Prerequisites**: Test 3.1 passed (warning visible)

**Steps**:
1. **Ensure**: Delta E warning is visible
2. Click "Manage Paint Collection" link in warning
3. **Expected**: Modal dialog opens (overlay)
4. **Expected**: Current page content still visible behind modal (not navigation)
5. Close modal
6. **Expected**: Return to same page state
7. **Expected**: Calculation results still visible
8. **Expected**: Warning still visible

**Success Criteria**:
- [ ] Link opens modal overlay (FR-018a)
- [ ] No navigation away from current session
- [ ] Modal is dismissible (close button works)
- [ ] Paint management UI displays (stub/placeholder acceptable)

---

## Phase 4: Timeout & Retry Logic

### Test 4.1: Automatic Retry on Timeout (NFR-001a, NFR-002a)

**Note**: Difficult to test without modifying API response time. Requires staging environment with artificial delay.

**Steps**:
1. Configure test API to delay response 31 seconds (exceeds 30s timeout)
2. Use Enhanced Mode
3. Enter hex: `#FF0000`
4. Open Browser Console
5. Click "Calculate"
6. **Expected**: First attempt times out after 30s
7. **Expected**: Console log: "Timeout after 30000ms, retrying..."
8. **Expected**: Automatic retry begins immediately
9. **Expected**: Second attempt times out after 30s
10. **Expected**: Error message displayed to user

**Success Criteria**:
- [ ] Automatic retry occurs after first timeout (NFR-001a)
- [ ] Only ONE retry (not multiple)
- [ ] Console logging visible (NFR-001c)

---

### Test 4.2: Timeout Error Message (NFR-001b, NFR-002b)

**Prerequisites**: API configured for timeout (or use offline mode)

**Steps**:
1. Trigger timeout (steps from Test 4.1)
2. After 2 failed attempts:
3. **Expected**: Error message displayed:
   "Calculation timed out after 2 attempts. Please try a different color or mode."
4. **Verify**: Exact message matches spec (NFR-001b/NFR-002b)

**Success Criteria**:
- [ ] Correct error message displayed
- [ ] User can retry manually (no infinite loop)

---

### Test 4.3: Browser Console Logging (NFR-001c, NFR-002c, NFR-006)

**Steps**:
1. Open Browser DevTools → Console tab
2. Trigger various errors:
   - Timeout (from Test 4.1)
   - Network failure (offline mode)
   - Validation failure
3. **Verify**: Console logs appear for each error
4. **Verify**: Log includes error details (timestamp, error message, context)
5. **Verify**: NO server-side logging infrastructure used (NFR-006)

**Success Criteria**:
- [ ] Errors logged to browser console
- [ ] Log format includes useful debugging info
- [ ] No server-side logging dependency

---

## Regression Testing

### Regression 1: Enhanced Mode Still Works

**Steps**:
1. Check Enhanced Mode checkbox
2. Calculate formula with hex `#FF5733`
3. **Expected**: Calculation completes successfully
4. **Expected**: Formula generated (up to 5 paints)
5. **Expected**: Delta E ≤2.0 target (best effort)
6. **Expected**: Session save works

**Success Criteria**:
- [ ] Enhanced Mode functionality unchanged

---

### Regression 2: Session History Still Works

**Steps**:
1. Navigate to Session History page
2. **Expected**: All previously saved sessions visible
3. Click on a session
4. **Expected**: Session details display correctly

**Success Criteria**:
- [ ] Session History unaffected by changes

---

### Regression 3: Image Upload UI Still Works

**Note**: File processing cannot be fully tested via manual UI, but UI should render

**Steps**:
1. Click "Image Upload" button
2. **Expected**: File upload UI appears
3. **Expected**: "Choose File" button clickable

**Success Criteria**:
- [ ] Image Upload UI renders
- [ ] No console errors

---

## Summary Checklist

**Phase 1: Critical Fixes** (Must Pass)
- [ ] Enhanced Mode checkbox toggles (Test 1.1)
- [ ] Checkbox disabled during calculation (Test 1.2)
- [ ] Session save dialog closes (Test 1.3)
- [ ] Save failure handled correctly (Test 1.4)
- [ ] Concurrent saves prevented (Test 1.5)
- [ ] Input method tracking: Hex Code (Test 1.6)
- [ ] Input method tracking: Color Picker (Test 1.7)
- [ ] Input/result clearing on method switch (Test 1.8)

**Phase 2: Validation** (Must Pass)
- [ ] Standard Mode end-to-end (Test 2.1)
- [ ] Ratio Prediction min paints (Test 2.2)
- [ ] Ratio Prediction max paints (Test 2.3)
- [ ] Volume validation: low (Test 2.4)
- [ ] Volume validation: high (Test 2.5)

**Phase 3: Enhancements** (Should Pass)
- [ ] Delta E warning displays (Test 3.1)
- [ ] Paint management modal (Test 3.2)

**Phase 4: Timeout** (Optional - staging only)
- [ ] Automatic retry (Test 4.1)
- [ ] Timeout error message (Test 4.2)
- [ ] Console logging (Test 4.3)

**Regression** (Must Pass)
- [ ] Enhanced Mode works (Regression 1)
- [ ] Session History works (Regression 2)
- [ ] Image Upload UI renders (Regression 3)

**Total Tests**: 19 test scenarios
**Est. Time**: 2-3 hours for complete validation

---

## Deployment Go/No-Go Criteria

**GO**: All Phase 1 and Phase 2 tests pass + Regression tests pass
**NO-GO**: Any P0 or P1 test fails, or regressions detected

**Phase 3**: Nice-to-have, not blocking
**Phase 4**: Post-deployment (E2E automation)
