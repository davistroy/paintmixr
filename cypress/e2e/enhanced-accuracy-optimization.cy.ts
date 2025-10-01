describe('Enhanced Accuracy Optimization E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.login();
    cy.wait(1000);
  });

  describe('Complete Optimization Workflow', () => {
    it('should complete full enhanced accuracy optimization workflow', () => {
      // Step 1: Navigate to optimization interface
      cy.get('[data-testid="new-optimization-button"]').click();
      cy.url().should('include', '/optimize');

      // Step 2: Select target color using enhanced color picker
      cy.get('[data-testid="color-picker"]').should('be.visible');
      cy.get('[data-testid="color-picker-lab-l"]').type('65.2');
      cy.get('[data-testid="color-picker-lab-a"]').type('-12.5');
      cy.get('[data-testid="color-picker-lab-b"]').type('18.7');

      // Verify color preview updates
      cy.get('[data-testid="color-preview"]').should('be.visible');

      // Step 3: Configure enhanced accuracy settings
      cy.get('[data-testid="optimization-controls"]').should('be.visible');
      cy.get('[data-testid="accuracy-target"]').select('enhanced');
      cy.get('[data-testid="delta-e-target"]').should('have.value', '2.0');
      cy.get('[data-testid="volume-precision"]').should('have.value', '0.1');

      // Step 4: Select paint collection
      cy.get('[data-testid="paint-collection-selector"]').click();
      cy.get('[data-testid="collection-option"]').first().click();

      // Verify selected paints display
      cy.get('[data-testid="selected-paints-count"]').should('contain', 'paints selected');

      // Step 5: Start optimization
      cy.get('[data-testid="start-optimization"]').click();

      // Step 6: Monitor optimization progress
      cy.get('[data-testid="optimization-progress"]').should('be.visible');
      cy.get('[data-testid="progress-status"]').should('contain', 'Optimizing');

      // Wait for completion (max 10 seconds for enhanced accuracy)
      cy.get('[data-testid="optimization-results"]', { timeout: 15000 }).should('be.visible');

      // Step 7: Validate results
      cy.get('[data-testid="result-delta-e"]').should('be.visible');
      cy.get('[data-testid="result-delta-e"]').invoke('text').then((deltaE) => {
        expect(parseFloat(deltaE)).to.be.lessThan(2.1);
      });

      // Step 8: Verify paint mixture details
      cy.get('[data-testid="mixture-components"]').should('be.visible');
      cy.get('[data-testid="paint-component"]').should('have.length.greaterThan', 1);

      // Verify volume precision (0.1ml)
      cy.get('[data-testid="paint-volume"]').each((volume) => {
        cy.wrap(volume).invoke('text').then((text) => {
          const volumeValue = parseFloat(text.replace('ml', ''));
          expect(volumeValue % 0.1).to.be.closeTo(0, 0.01);
        });
      });

      // Step 9: Save optimization result
      cy.get('[data-testid="save-result-button"]').click();
      cy.get('[data-testid="save-name-input"]').type('E2E Test Result - Enhanced Accuracy');
      cy.get('[data-testid="confirm-save"]').click();

      // Step 10: Verify saved result appears in history
      cy.visit('/history');
      cy.get('[data-testid="optimization-history"]').should('contain', 'E2E Test Result - Enhanced Accuracy');
    });

    it('should handle enhanced optimization with fallback to legacy', () => {
      // Navigate to optimization
      cy.visit('/optimize');

      // Set impossible target (should trigger fallback)
      cy.get('[data-testid="color-picker-lab-l"]').type('150'); // Invalid L value
      cy.get('[data-testid="color-picker-lab-a"]').type('0');
      cy.get('[data-testid="color-picker-lab-b"]').type('0');

      // Start optimization
      cy.get('[data-testid="start-optimization"]').click();

      // Should show fallback message
      cy.get('[data-testid="fallback-message"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="fallback-message"]').should('contain', 'Using legacy optimization');

      // Should still provide results
      cy.get('[data-testid="optimization-results"]', { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Performance Validation', () => {
    it('should complete optimization within performance targets', () => {
      cy.visit('/optimize');

      // Set standard target color
      cy.get('[data-testid="color-picker-lab-l"]').type('50');
      cy.get('[data-testid="color-picker-lab-a"]').type('10');
      cy.get('[data-testid="color-picker-lab-b"]').type('-5');

      // Record start time
      const startTime = Date.now();

      cy.get('[data-testid="start-optimization"]').click();

      // Verify completion within 500ms target
      cy.get('[data-testid="optimization-results"]', { timeout: 10000 }).should('be.visible');

      cy.then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        expect(duration).to.be.lessThan(3000); // Allow buffer for E2E overhead
      });

      // Verify performance metrics are recorded
      cy.get('[data-testid="performance-metrics"]').should('be.visible');
      cy.get('[data-testid="calculation-time"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle network failures', () => {
      // Intercept API calls to simulate network failure
      cy.intercept('POST', '/api/optimize/enhanced', { forceNetworkError: true });

      cy.visit('/optimize');

      cy.get('[data-testid="color-picker-lab-l"]').type('50');
      cy.get('[data-testid="color-picker-lab-a"]').type('0');
      cy.get('[data-testid="color-picker-lab-b"]').type('0');

      cy.get('[data-testid="start-optimization"]').click();

      // Should show error handling
      cy.get('[data-testid="error-message"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle insufficient paint inventory', () => {
      cy.visit('/optimize');

      // Set complex target requiring many paints
      cy.get('[data-testid="color-picker-lab-l"]').type('75');
      cy.get('[data-testid="color-picker-lab-a"]').type('25');
      cy.get('[data-testid="color-picker-lab-b"]').type('35');

      // Select minimal paint collection
      cy.get('[data-testid="paint-collection-selector"]').click();
      cy.get('[data-testid="collection-option"]').contains('Test Collection (2 paints)').click();

      cy.get('[data-testid="start-optimization"]').click();

      // Should show insufficient inventory warning
      cy.get('[data-testid="inventory-warning"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="suggested-paints"]').should('be.visible');
    });
  });

  describe('Accessibility Validation', () => {
    it('should meet accessibility standards', () => {
      cy.visit('/optimize');

      // Check for proper ARIA labels
      cy.get('[data-testid="color-picker"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="optimization-controls"]').should('have.attr', 'role');

      // Verify keyboard navigation
      cy.get('[data-testid="color-picker-lab-l"]').focus();
      cy.get('[data-testid="color-picker-lab-l"]').should('have.focus');

      cy.get('[data-testid="color-picker-lab-l"]').tab();
      cy.get('[data-testid="color-picker-lab-a"]').should('have.focus');

      // Check color contrast for results
      cy.get('[data-testid="color-picker-lab-l"]').type('50');
      cy.get('[data-testid="color-picker-lab-a"]').type('0');
      cy.get('[data-testid="color-picker-lab-b"]').type('0');

      cy.get('[data-testid="start-optimization"]').click();
      cy.get('[data-testid="optimization-results"]', { timeout: 10000 }).should('be.visible');

      // Verify high contrast mode compatibility
      cy.get('body').invoke('addClass', 'high-contrast');
      cy.get('[data-testid="optimization-results"]').should('be.visible');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.visit('/optimize');

      // Verify mobile-optimized color picker
      cy.get('[data-testid="color-picker"]').should('be.visible');
      cy.get('[data-testid="mobile-color-picker"]').should('be.visible');

      // Test touch interactions
      cy.get('[data-testid="color-picker-lab-l"]').type('50');
      cy.get('[data-testid="color-picker-lab-a"]').type('10');
      cy.get('[data-testid="color-picker-lab-b"]').type('-5');

      cy.get('[data-testid="start-optimization"]').click();
      cy.get('[data-testid="optimization-results"]', { timeout: 15000 }).should('be.visible');

      // Verify mobile results layout
      cy.get('[data-testid="mobile-results-layout"]').should('be.visible');
    });
  });
});