/// <reference types="cypress" />

// Custom commands for Paint Mixr testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Select color mode (match or predict)
       */
      selectColorMode(mode: 'match' | 'predict'): Chainable<Element>

      /**
       * Select input method for color
       */
      selectInputMethod(method: 'hex' | 'picker' | 'image'): Chainable<Element>

      /**
       * Enter hex color value
       */
      enterHexColor(hex: string): Chainable<Element>

      /**
       * Set total mixing volume
       */
      setTotalVolume(volume: number): Chainable<Element>

      /**
       * Click calculate button
       */
      clickCalculate(): Chainable<Element>

      /**
       * Wait for color calculation to complete
       */
      waitForCalculation(): Chainable<Element>

      /**
       * Enhanced accuracy optimization commands
       */
      login(): Chainable<void>
      createTestPaintCollection(): Chainable<void>
      cleanupTestData(): Chainable<void>
      checkAccessibility(): Chainable<void>
      waitForOptimizationComplete(): Chainable<void>
      validateColorAccuracy(targetDeltaE: number): Chainable<void>
    }
  }
}

Cypress.Commands.add('selectColorMode', (mode: 'match' | 'predict') => {
  cy.get(`[data-testid="color-mode-${mode}"]`).click()
})

Cypress.Commands.add('selectInputMethod', (method: 'hex' | 'picker' | 'image') => {
  cy.get(`[data-testid="input-method-${method}"]`).click()
})

Cypress.Commands.add('enterHexColor', (hex: string) => {
  cy.get('[data-testid="hex-input"]').clear().type(hex)
})

Cypress.Commands.add('setTotalVolume', (volume: number) => {
  cy.get('[data-testid="volume-input"]').clear().type(volume.toString())
})

Cypress.Commands.add('clickCalculate', () => {
  cy.get('[data-testid="calculate-button"]').click()
})

Cypress.Commands.add('waitForCalculation', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist')
  cy.get('[data-testid="mixing-results"]').should('be.visible')
})

// Enhanced accuracy optimization commands
Cypress.Commands.add('login', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_in: 3600,
      user: {
        id: 'test-user-id',
        email: 'test@example.com'
      }
    }));
  });

  cy.intercept('GET', '/api/auth/user', {
    statusCode: 200,
    body: {
      id: 'test-user-id',
      email: 'test@example.com'
    }
  });
});

Cypress.Commands.add('createTestPaintCollection', () => {
  cy.intercept('GET', '/api/paints/collections', {
    statusCode: 200,
    body: [
      {
        id: 'test-collection-1',
        name: 'Test Collection (2 paints)',
        paints: [
          {
            id: 'test-paint-1',
            name: 'Titanium White',
            brand: 'Test Brand',
            lab_l: 95.0,
            lab_a: -0.5,
            lab_b: 2.8,
            volume_ml: 1000
          },
          {
            id: 'test-paint-2',
            name: 'Ultramarine Blue',
            brand: 'Test Brand',
            lab_l: 32.5,
            lab_a: 15.2,
            lab_b: -58.9,
            volume_ml: 500
          }
        ]
      }
    ]
  });
});

Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: '/api/test/cleanup',
    failOnStatusCode: false
  });
});

Cypress.Commands.add('checkAccessibility', () => {
  cy.injectAxe();
  cy.checkA11y();
});

Cypress.Commands.add('waitForOptimizationComplete', () => {
  cy.get('[data-testid="optimization-results"]', { timeout: 20000 }).should('be.visible');
});

Cypress.Commands.add('validateColorAccuracy', (targetDeltaE: number) => {
  cy.get('[data-testid="result-delta-e"]').should('be.visible');
  cy.get('[data-testid="result-delta-e"]').invoke('text').then((deltaEText) => {
    const deltaE = parseFloat(deltaEText.replace('ΔE: ', ''));
    expect(deltaE).to.be.lessThan(targetDeltaE + 0.1);
  });
});

export {}