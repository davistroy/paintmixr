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

export {}