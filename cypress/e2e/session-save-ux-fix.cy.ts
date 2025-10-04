// cypress/e2e/session-save-ux-fix.cy.ts

describe('Session Save UX - Toast Feedback (Issue #2)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.get('input[type="email"]').type('troy@k4jda.com')
    cy.get('input[type="password"]').type('Edw@rd67')
    cy.contains('Sign In').click()
    cy.url().should('not.include', '/auth/signin')

    // Calculate a formula
    cy.get('[data-testid="hex-input"]').clear().type('#E74C3C')
    cy.contains('Calculate Formula').click()
    cy.get('[data-testid="formula-result"]', { timeout: 15000 }).should('be.visible')
  })

  it('should show success toast and close dialog after save', () => {
    // Open save dialog
    cy.contains('Save This Formula').click()
    cy.contains('Save Mixing Session').should('be.visible')

    // Fill session name
    cy.get('input[name="customLabel"]').type('E2E Test - Session Save UX')

    // Save session
    cy.contains('button', 'Save Session').click()

    // Verify success toast appears
    cy.contains('Session saved successfully', { timeout: 5000 }).should('be.visible')

    // Verify dialog auto-closes
    cy.contains('Save Mixing Session', { timeout: 2000 }).should('not.exist')

    // Verify session in history
    cy.contains('Session History').click()
    cy.contains('E2E Test - Session Save UX').should('exist')
  })

  it('should show error toast and keep dialog open on save failure', () => {
    // Intercept save request to force error
    cy.intercept('POST', '/api/sessions', {
      statusCode: 500,
      body: { error: 'Database error' }
    }).as('saveFail')

    // Open save dialog
    cy.contains('Save This Formula').click()

    // Fill and submit
    cy.get('input[name="customLabel"]').type('Failure Test')
    cy.contains('button', 'Save Session').click()

    // Verify error toast (user-friendly message, not "500")
    cy.contains('Unable to complete request. Please try again.').should('be.visible')

    // Verify dialog stays open
    cy.contains('Save Mixing Session').should('exist')
  })
})
