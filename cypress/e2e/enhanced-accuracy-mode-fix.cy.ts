// cypress/e2e/enhanced-accuracy-mode-fix.cy.ts

describe('Enhanced Accuracy Mode - Authentication Fix (Issue #1)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')
  })

  it('should calculate optimized formula without 401 error', () => {
    // Enable Enhanced Accuracy Mode (should be checked by default)
    cy.get('[data-testid="enhanced-accuracy-checkbox"]').should('be.checked')

    // Enter test color
    cy.get('[data-testid="hex-input"]').clear().type('#FF5733')
    cy.contains('Calculate Formula').click()

    // Wait for calculation
    cy.contains('Calculating paint formula', { timeout: 15000 }).should('be.visible')

    // Verify NO 401 error message
    cy.contains('API error: 401').should('not.exist')

    // Verify formula displays successfully
    cy.get('[data-testid="formula-result"]', { timeout: 15000 }).should('be.visible')

    // Verify Delta E value shown (enhanced accuracy target ≤ 2.0)
    cy.get('[data-testid="delta-e-value"]').should('exist')
  })

  it('should retry once on transient 401 error', () => {
    // Intercept first optimize request to return 401
    let callCount = 0
    cy.intercept('POST', '/api/optimize', (req) => {
      callCount++
      if (callCount === 1) {
        req.reply({ statusCode: 401, body: { error: 'Unauthorized' } })
      } else {
        req.continue()
      }
    }).as('optimize')

    // Calculate formula
    cy.get('[data-testid="hex-input"]').clear().type('#3498DB')
    cy.contains('Calculate Formula').click()

    // Wait for both requests (initial + retry)
    cy.wait('@optimize')
    cy.wait('@optimize')

    // Verify success after retry
    cy.get('[data-testid="formula-result"]').should('be.visible')
  })
})
