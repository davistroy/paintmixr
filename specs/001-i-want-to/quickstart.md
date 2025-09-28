# Quickstart Guide: Paint Mixing Color App

**Date**: 2025-09-28
**Purpose**: Integration test scenarios and user workflow validation

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ with pnpm
- Supabase account and project
- Modern web browser with JavaScript enabled

### Environment Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd paintmixr
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development environment
pnpm dev                    # Next.js dev server (localhost:3000)
npx supabase start         # Local Supabase instance
npx supabase db reset      # Initialize database schema
```

### Initial Data Setup
```bash
# Load predefined paint colors
cp data/sample-paints.json public/paint-colors.json

# Generate TypeScript types from Supabase
npx supabase gen types typescript --local > src/types/supabase.ts
```

## 📋 User Workflow Test Scenarios

### Scenario 1: Color Matching via Hex Code
**User Story**: "As an artist, I want to input a specific hex color and get mixing ratios to achieve that color with my available paints."

**Test Steps**:
1. **Navigate** to main application (http://localhost:3000)
2. **Select** "Match Color" mode
3. **Choose** "Hex Code" input method
4. **Enter** hex code: `#FF6B35` (orange-red)
5. **Set** total volume: `200ml`
6. **Click** "Calculate Mixing Ratios"

**Expected Results**:
- ✅ System displays optimal paint ratios (e.g., "Cadmium Red: 120ml, Yellow Ochre: 80ml")
- ✅ Shows achieved color swatch matching input
- ✅ Displays Delta E accuracy score (≤ 4.0 for commercial standard)
- ✅ Provides alternative mixing options if available
- ✅ "Save Session" button becomes enabled

**Validation Points**:
- Color accuracy indicator shows "Excellent" or better (Delta E ≤ 2.0)
- Total mixing volume equals requested 200ml
- All paint ratios are positive numbers
- UI remains responsive throughout calculation

---

### Scenario 2: Color Prediction from Mixing Ratios
**User Story**: "As a paint mixer, I want to input specific paint volumes and see what color I'll get when mixing them."

**Test Steps**:
1. **Navigate** to main application
2. **Select** "Predict Color" mode
3. **Add paint ratios**:
   - Titanium White: 150ml
   - Ultramarine Blue: 30ml
   - Burnt Umber: 20ml
4. **Click** "Predict Resulting Color"

**Expected Results**:
- ✅ System calculates and displays resulting color (light grayish blue)
- ✅ Shows color swatch with hex code
- ✅ Displays total volume (200ml)
- ✅ Shows percentage breakdown of each paint
- ✅ "Save Session" option available

**Validation Points**:
- Color prediction completes within 500ms
- Resulting color is visually consistent with expected blue-gray mixture
- Percentages sum to 100%
- Individual volumes sum to total volume

---

### Scenario 3: Image Color Extraction
**User Story**: "As an artist, I want to upload a photo and extract a specific color to match with my paints."

**Test Steps**:
1. **Select** "Match Color" mode
2. **Choose** "Upload Image" input method
3. **Upload** test image (provide: `test-images/sunset.jpg`)
4. **Click** on orange area of sky at coordinates (approximately center-right)
5. **Confirm** color selection
6. **Set** total volume: `300ml`
7. **Calculate** mixing ratios

**Expected Results**:
- ✅ Image displays in color picker interface
- ✅ Crosshair cursor for precise color selection
- ✅ Selected color updates preview swatch
- ✅ Color extraction completes within 2 seconds
- ✅ Mixing calculation provides orange color ratios
- ✅ Delta E accuracy within acceptable range

**Validation Points**:
- Image uploads successfully (JPEG, PNG, WebP supported)
- Color extraction is pixel-accurate
- UI provides clear visual feedback during processing
- Extracted color matches visual expectation

---

### Scenario 4: Session Management Workflow
**User Story**: "As a regular user, I want to save successful color mixes and recall them later with custom labels."

**Test Steps**:
1. **Complete** any color matching scenario above
2. **Click** "Save Session"
3. **Enter** custom label: "Sunset Orange Mix"
4. **Add** notes: "Perfect for evening sky paintings"
5. **Save** session
6. **Navigate** to "My Sessions" page
7. **Verify** saved session appears
8. **Click** session to view details
9. **Mark** session as favorite
10. **Filter** to show favorites only

**Expected Results**:
- ✅ Session saves with timestamp and label
- ✅ Sessions list shows preview and metadata
- ✅ Session details include all original inputs and results
- ✅ Favorite toggle works correctly
- ✅ Filtering by favorites functions properly
- ✅ Delete session option available

**Validation Points**:
- All session data persists correctly in Supabase
- User can only see their own sessions (RLS working)
- Search and filtering perform efficiently
- Session restoration recreates exact original state

---

### Scenario 5: Mobile Responsive Experience
**User Story**: "As a mobile user, I want to use the color matching app on my phone with touch-optimized interface."

**Test Steps**:
1. **Open** browser dev tools and switch to mobile view (375x667)
2. **Navigate** through all main interfaces
3. **Test** color picker with touch events
4. **Upload** image using mobile camera/gallery
5. **Complete** full color matching workflow

**Expected Results**:
- ✅ All touch targets are minimum 44px
- ✅ Color picker responds to touch gestures
- ✅ Text remains readable at mobile sizes
- ✅ Image upload works with mobile camera
- ✅ Navigation is thumb-friendly
- ✅ Performance remains smooth (60fps interactions)

**Validation Points**:
- No horizontal scrolling required
- All functionality accessible via touch
- Loading states provide clear feedback
- Error messages are mobile-friendly

---

## 🧪 Integration Test Suite

### Automated Test Scenarios
Create these as Cypress E2E tests:

```typescript
// cypress/e2e/color-matching.cy.ts
describe('Color Matching Workflow', () => {
  it('completes hex color matching scenario', () => {
    cy.visit('/');
    cy.selectColorMode('match');
    cy.selectInputMethod('hex');
    cy.enterHexColor('#FF6B35');
    cy.setTotalVolume(200);
    cy.clickCalculate();

    cy.get('[data-testid="mixing-results"]').should('be.visible');
    cy.get('[data-testid="delta-e-score"]').should('contain', 'Δ');
    cy.get('[data-testid="save-session"]').should('be.enabled');
  });
});
```

### Performance Benchmarks
```typescript
// tests/performance/color-calculations.test.ts
describe('Performance Requirements', () => {
  it('color matching completes within 500ms', async () => {
    const start = performance.now();
    await calculateColorMatch(testColorRequest);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('image processing completes within 2s', async () => {
    const start = performance.now();
    await extractImageColor(testImageRequest);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

### Color Accuracy Validation
```typescript
// tests/accuracy/color-science.test.ts
describe('Color Science Accuracy', () => {
  it('delta E calculations match CIE 2000 standard', () => {
    const deltaE = calculateDeltaE(color1, color2, 'cie2000');
    const expected = referenceImplementation(color1, color2);
    expect(Math.abs(deltaE - expected)).toBeLessThan(0.1);
  });

  it('LAB conversions are reversible', () => {
    const rgb = { r: 255, g: 107, b: 53 };
    const lab = rgbToLab(rgb);
    const backToRgb = labToRgb(lab);
    expect(Math.abs(backToRgb.r - rgb.r)).toBeLessThan(1);
  });
});
```

## 📊 Success Criteria Validation

### Functional Requirements Checklist
- [ ] **FR-001**: Predefined paint colors load from JSON ✓
- [ ] **FR-002**: Hex code input accepts valid format ✓
- [ ] **FR-003**: Color picker component functional ✓
- [ ] **FR-004**: Image upload with color selection ✓
- [ ] **FR-005**: Color matching with accuracy rating ✓
- [ ] **FR-006**: Paint ratio input validation ✓
- [ ] **FR-007**: Color prediction from ratios ✓
- [ ] **FR-008**: Session saving with custom labels ✓
- [ ] **FR-009**: Automatic timestamping ✓
- [ ] **FR-010**: Session recall and viewing ✓
- [ ] **FR-011**: Delta E ≤ 4.0 accuracy achieved ✓
- [ ] **FR-012**: Oil paint mixing behavior simulated ✓
- [ ] **FR-013**: Volume range validation (100-1000ml) ✓
- [ ] **FR-014**: Supabase cloud storage integration ✓

### Performance Requirements Checklist
- [ ] Color calculations complete within 500ms
- [ ] Image processing completes within 2 seconds
- [ ] UI maintains 60fps during interactions
- [ ] Application loads within 3 seconds on 3G

### Accessibility Requirements Checklist
- [ ] Color contrast ratios meet WCAG 2.1 AA standards
- [ ] All interactive elements have keyboard navigation
- [ ] Screen reader compatibility verified
- [ ] Touch targets meet 44px minimum requirement

## 🚨 Common Issues & Troubleshooting

### Issue: Color calculations too slow
**Symptoms**: UI freezes during complex color matching
**Solution**: Verify Web Worker implementation for heavy calculations

### Issue: Image upload fails
**Symptoms**: "Upload failed" error on image selection
**Solution**: Check Supabase Storage bucket permissions and CORS settings

### Issue: Inaccurate color matching
**Symptoms**: Delta E scores consistently high (>6.0)
**Solution**: Verify LAB color space conversions and Kubelka-Munk coefficients

### Issue: Sessions not saving
**Symptoms**: "Save failed" error or sessions don't persist
**Solution**: Check Supabase RLS policies and authentication status

## 📈 Metrics & Monitoring

### Key Performance Indicators
- **Color Accuracy**: Average Delta E score across all matches
- **User Engagement**: Sessions saved per user per week
- **Performance**: 95th percentile response times
- **Error Rate**: Failed calculations/predictions per 1000 requests

### Success Metrics Targets
- Color accuracy: >90% of matches achieve Delta E ≤ 4.0
- Performance: >95% of calculations complete within target times
- User satisfaction: >4.5/5 rating for color accuracy
- Session usage: >70% of calculations result in saved sessions

This quickstart guide ensures all functional requirements are testable and provides clear validation criteria for the complete user workflow.